/**
 * Logos Bible Software format parser.
 *
 * Parses Bible text copied from Logos desktop app. This format has:
 * - Book names in ALL CAPS on their own line (e.g., "GENESIS", "1 SAMUEL")
 * - Section headings in Title Case (e.g., "Six Days of Creation")
 * - Chapter numbers at the start of paragraphs, doubling as verse 1
 * - Verse numbers inline within paragraphs (e.g., "... 2 text 3 text ...")
 * - Poetry indented with spaces
 * - Footnote markers like ",,*" or ",*"
 *
 * The parser handles multiple files concatenated together (OT + NT + Apocrypha).
 */

import type { ParseResult, ParsedBook, ParsedChapter } from "../types/user-translation";
import type { BookId, Verse } from "../types/bible";
import { resolveBookName } from "./book-name-aliases";

/**
 * Known book names that appear in ALL CAPS in Logos output.
 * Used to distinguish book headers from section headings.
 * Includes the "The ... according to" prefix Logos uses for Gospels.
 */
const LOGOS_BOOK_PATTERNS: [RegExp, string][] = [
  // Gospels with prefix like "The Gospel according to\nMATTHEW"
  // We handle the ALL CAPS name directly
  [/^GENESIS$/i, "Genesis"],
  [/^EXODUS$/i, "Exodus"],
  [/^LEVITICUS$/i, "Leviticus"],
  [/^NUMBERS$/i, "Numbers"],
  [/^DEUTERONOMY$/i, "Deuteronomy"],
  [/^JOSHUA$/i, "Joshua"],
  [/^JUDGES$/i, "Judges"],
  [/^RUTH$/i, "Ruth"],
  [/^1 SAMUEL$/i, "1 Samuel"],
  [/^2 SAMUEL$/i, "2 Samuel"],
  [/^1 KINGS$/i, "1 Kings"],
  [/^2 KINGS$/i, "2 Kings"],
  [/^1 CHRONICLES$/i, "1 Chronicles"],
  [/^2 CHRONICLES$/i, "2 Chronicles"],
  [/^EZRA$/i, "Ezra"],
  [/^NEHEMIAH$/i, "Nehemiah"],
  [/^ESTHER$/i, "Esther"],
  [/^JOB$/i, "Job"],
  [/^THE PSALMS$/i, "Psalms"],
  [/^PSALMS$/i, "Psalms"],
  [/^PROVERBS$/i, "Proverbs"],
  [/^ECCLESIASTES$/i, "Ecclesiastes"],
  [/^SONG OF SONGS$/i, "Song of Songs"],
  [/^ISAIAH$/i, "Isaiah"],
  [/^JEREMIAH$/i, "Jeremiah"],
  [/^LAMENTATIONS$/i, "Lamentations"],
  [/^EZEKIEL$/i, "Ezekiel"],
  [/^DANIEL$/i, "Daniel"],
  [/^HOSEA$/i, "Hosea"],
  [/^JOEL$/i, "Joel"],
  [/^AMOS$/i, "Amos"],
  [/^OBADIAH$/i, "Obadiah"],
  [/^JONAH$/i, "Jonah"],
  [/^MICAH$/i, "Micah"],
  [/^NAHUM$/i, "Nahum"],
  [/^HABAKKUK$/i, "Habakkuk"],
  [/^ZEPHANIAH$/i, "Zephaniah"],
  [/^HAGGAI$/i, "Haggai"],
  [/^ZECHARIAH$/i, "Zechariah"],
  [/^MALACHI$/i, "Malachi"],
  // NT
  [/^MATTHEW$/i, "Matthew"],
  [/^MARK$/i, "Mark"],
  [/^LUKE$/i, "Luke"],
  [/^JOHN$/i, "John"],
  [/^ACTS$/i, "Acts"],
  [/^ROMANS$/i, "Romans"],
  [/^1 CORINTHIANS$/i, "1 Corinthians"],
  [/^2 CORINTHIANS$/i, "2 Corinthians"],
  [/^GALATIANS$/i, "Galatians"],
  [/^EPHESIANS$/i, "Ephesians"],
  [/^PHILIPPIANS$/i, "Philippians"],
  [/^COLOSSIANS$/i, "Colossians"],
  [/^1 THESSALONIANS$/i, "1 Thessalonians"],
  [/^2 THESSALONIANS$/i, "2 Thessalonians"],
  [/^1 TIMOTHY$/i, "1 Timothy"],
  [/^2 TIMOTHY$/i, "2 Timothy"],
  [/^TITUS$/i, "Titus"],
  [/^PHILEMON$/i, "Philemon"],
  [/^HEBREWS$/i, "Hebrews"],
  [/^JAMES$/i, "James"],
  [/^1 PETER$/i, "1 Peter"],
  [/^2 PETER$/i, "2 Peter"],
  [/^1 JOHN$/i, "1 John"],
  [/^2 JOHN$/i, "2 John"],
  [/^3 JOHN$/i, "3 John"],
  [/^JUDE$/i, "Jude"],
  [/^REVELATION$/i, "Revelation"],
  // Deuterocanon / Apocrypha
  [/^TOBIT$/i, "Tobit"],
  [/^JUDITH$/i, "Judith"],
  [/^WISDOM$/i, "Wisdom"],
  [/^WISDOM OF SOLOMON$/i, "Wisdom"],
  [/^SIRACH$/i, "Sirach"],
  [/^ECCLESIASTICUS$/i, "Sirach"],
  [/^BARUCH$/i, "Baruch"],
  [/^1 MACCABEES$/i, "1 Maccabees"],
  [/^2 MACCABEES$/i, "2 Maccabees"],
  [/^3 MACCABEES$/i, "3 Maccabees"],
  [/^4 MACCABEES$/i, "4 Maccabees"],
  [/^1 ESDRAS$/i, "1 Esdras"],
  [/^2 ESDRAS$/i, "2 Esdras"],
  [/^PRAYER OF MANASSEH$/i, "Prayer of Manasseh"],
  [/^PSALM 151$/i, "Psalm 151"],
  [/^ADDITIONS TO ESTHER$/i, "Additions to Esther"],
  [/^LETTER OF JEREMIAH$/i, "Letter of Jeremiah"],
  [/^PRAYER OF AZARIAH$/i, "Prayer of Azariah"],
  [/^SUSANNA$/i, "Susanna"],
  [/^BEL AND THE DRAGON$/i, "Bel and the Dragon"],
];

/**
 * Check if a line is a Logos-format book header.
 * Returns the human-readable book name if matched, null otherwise.
 */
function matchBookHeader(line: string): string | null {
  // Normalize: trim, strip carriage returns, replace non-breaking spaces with regular spaces
  const trimmed = line.trim().replace(/\r/g, "").replace(/\u00A0/g, " ");
  for (const [pattern, name] of LOGOS_BOOK_PATTERNS) {
    if (pattern.test(trimmed)) return name;
  }
  return null;
}

/**
 * Check if a line is a section heading (not a book header, not verse text).
 * Section headings are typically Title Case, don't start with a digit,
 * and don't contain inline verse numbers.
 */
function isSectionHeading(line: string): boolean {
  // Starts with a digit → verse/chapter text, not a heading
  if (/^\d/.test(line)) return false;
  // Indented (poetry) → verse text, not a heading
  if (/^\s{2,}/.test(line)) return false;
  // Starts with a quote → verse continuation (but parenthetical labels are headings)
  if (/^["'"']/.test(line)) return false;
  // Parenthetical book dividers like "(Psalms 1–41)" are headings
  if (/^\([A-Z]/.test(line)) return true;
  // Starts with lowercase letter → verse continuation, not a heading
  if (/^[a-z]/.test(line)) return false;
  // Contains any digit followed by space → likely verse text with inline numbers
  // (e.g., "Part B of verse four. 5 Fifth verse.")
  if (/\d\s/.test(line)) return false;
  // Very long lines are probably verse text, not headings
  if (line.length > 120) return false;
  // Logos front matter lines
  if (/^The Old Testament$/i.test(line)) return true;
  if (/^The New Testament$/i.test(line)) return true;
  if (/^The Gospel according to$/i.test(line)) return true;
  if (/^The (First |Second |Third )?Letter of/i.test(line)) return true;
  if (/^The (First |Second |Third )?Letter to/i.test(line)) return true;
  if (/^The Acts of the Apostles$/i.test(line)) return true;
  if (/^New Revised Standard Version/i.test(line)) return true;
  // Otherwise: if short, no digits, not indented → likely a heading
  return true;
}

/**
 * Clean footnote markers and other Logos artifacts from verse text.
 */
function cleanText(text: string): string {
  return text
    .replace(/,,\*/g, "") // Logos footnote marker
    .replace(/,\*/g, "")  // Alternate footnote marker
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Extract verses from a block of text by finding sequential inline numbers.
 *
 * Given text like: "In the beginning God created... 2 the earth was... 3 Then God said..."
 * Returns: [{number: 1, text: "In the beginning..."}, {number: 2, text: "the earth was..."}, ...]
 *
 * @param text - The raw text block (may span multiple lines)
 * @param startVerse - The verse number to assign to the first chunk (usually 1)
 */
function extractVerses(text: string, startVerse: number): Verse[] {
  const verses: Verse[] = [];
  let remaining = text;
  let currentVerse = startVerse;

  // If text starts with the startVerse number (e.g., "1 Happy are those..."),
  // strip it — it's the verse number, not content (common in Psalms poetry)
  const leadingVerseNum = remaining.match(new RegExp(`^${startVerse}\\s`));
  if (leadingVerseNum) {
    remaining = remaining.slice(leadingVerseNum[0].length);
  }

  while (remaining) {
    const nextVerse = currentVerse + 1;
    // Look for the next verse number as a standalone number
    // Pattern: space + number + space, where the number is the next expected verse
    const pattern = new RegExp(`\\s${nextVerse}\\s`);
    const match = remaining.match(pattern);

    if (!match || match.index === undefined) {
      // No more verse splits — rest is current verse
      const cleaned = cleanText(remaining);
      if (cleaned) verses.push({ number: currentVerse, text: cleaned });
      break;
    }

    // Everything before the match is the current verse
    const verseText = cleanText(remaining.slice(0, match.index));
    if (verseText) {
      verses.push({ number: currentVerse, text: verseText });
    }

    // Move past the verse number (keep the text after it)
    remaining = remaining.slice(match.index + match[0].length);
    currentVerse = nextVerse;
  }

  return verses;
}

/**
 * Parse a Logos-format Bible file.
 *
 * Handles the copy-paste format from Logos Bible Software where:
 * - Books are identified by ALL CAPS headers
 * - Chapters start at paragraph boundaries with the chapter number
 * - Verses are numbered inline within paragraphs
 */
export async function parseLogosBible(file: File): Promise<ParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);

  const books: ParsedBook[] = [];
  const warnings: string[] = [];

  // Current parsing state
  let currentBookName: string | null = null;
  let currentBookId: BookId | null = null;
  let currentChapter = 0;
  let expectedNextChapter = 1;
  let chapterText = ""; // accumulated text for current chapter
  let chapters: ParsedChapter[] = [];
  let afterBreak = true; // did we just pass a blank line or heading?
  // Tracks "The First/Second/Third Letter..." prefix for numbered NT books
  let pendingNumberPrefix: string | null = null;

  function flushChapter() {
    if (currentChapter > 0 && chapterText.trim()) {
      const verses = extractVerses(chapterText.trim(), 1);
      if (verses.length > 0) {
        chapters.push({ chapter: currentChapter, verses });
      }
    }
    chapterText = "";
  }

  function flushBook() {
    if (currentBookId && currentBookName && chapters.length > 0) {
      books.push({
        bookId: currentBookId,
        originalName: currentBookName,
        chapters: [...chapters],
      });
    }
    chapters = [];
    currentChapter = 0;
    expectedNextChapter = 1;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    // Normalize: trim, strip carriage returns, replace non-breaking spaces
    const trimmed = raw.trim().replace(/\r/g, "").replace(/\u00A0/g, " ");

    // Blank line
    if (!trimmed) {
      afterBreak = true;
      continue;
    }

    // Detect "The First/Second/Third Letter..." prefix for numbered NT books
    // These appear on a line before the ALL CAPS book name
    const numPrefixMatch = trimmed.match(/^The (First|Second|Third) (Letter|Epistle)/i);
    if (numPrefixMatch) {
      const ordinal = numPrefixMatch[1].toLowerCase();
      pendingNumberPrefix = ordinal === "first" ? "1" : ordinal === "second" ? "2" : "3";
      afterBreak = true;
      continue;
    }

    // Check for book header — if we have a pending number prefix, try combined first
    let bookName: string | null = null;
    if (pendingNumberPrefix) {
      const combined = pendingNumberPrefix + " " + trimmed;
      bookName = matchBookHeader(combined);
    }
    if (!bookName) {
      bookName = matchBookHeader(trimmed);
    }
    if (bookName) {
      pendingNumberPrefix = null;
      flushChapter();
      flushBook();
      currentBookName = bookName;
      currentBookId = resolveBookName(bookName);
      if (!currentBookId) {
        warnings.push(`Unknown book: "${bookName}"`);
      }
      afterBreak = true;
      continue;
    }
    pendingNumberPrefix = null; // Clear if not used on next meaningful line

    // Skip lines before the first book
    if (!currentBookId) continue;

    // Check for "Psalm N" chapter headers BEFORE section heading check
    // (Psalms uses explicit chapter labels that look like headings)
    const psalmMatch = trimmed.match(/^Psalm\s+(\d+)$/i);
    if (psalmMatch && currentBookId === "psa") {
      const num = parseInt(psalmMatch[1], 10);
      flushChapter();
      currentChapter = num;
      expectedNextChapter = num + 1;
      chapterText = "";
      afterBreak = true;
      continue;
    }

    // Check for section heading (after psalm check, before chapter detection)
    if (isSectionHeading(trimmed)) {
      afterBreak = true;
      continue;
    }

    // Content line — check for new chapter
    const leadingNum = trimmed.match(/^(\d+)\s/);
    if (leadingNum && afterBreak) {
      const num = parseInt(leadingNum[1], 10);
      if (num === expectedNextChapter) {
        // Heuristic: if we've only accumulated a tiny amount of text in the
        // current chapter, the number is more likely a verse continuation
        // than a new chapter (e.g., Lamentations where each verse is a
        // separate paragraph). Require at least 2 inline verse splits before
        // treating a paragraph-starting number as a new chapter.
        const hasEnoughContent = chapterText.length > 200
          || /\s\d+\s/.test(chapterText); // has at least one inline verse number
        if (hasEnoughContent || currentChapter === 0) {
          // New chapter detected
          flushChapter();
          currentChapter = num;
          expectedNextChapter = num + 1;
          chapterText = trimmed.slice(leadingNum[0].length);
          afterBreak = false;
          continue;
        }
      }
    }

    // Regular text — append to current chapter text
    if (currentChapter > 0) {
      // Add a space before appending (unless it's poetry that should be joined)
      chapterText += " " + trimmed;
    }
    afterBreak = false;
  }

  // Flush remaining
  flushChapter();
  flushBook();

  if (books.length === 0) {
    warnings.push("No Bible books found. Make sure the file contains ALL CAPS book headers (e.g., GENESIS, MATTHEW).");
  }

  return { books, warnings };
}

/**
 * Detect whether a file is in Logos format by checking the first N lines
 * for ALL CAPS book headers.
 */
export function isLogosFormat(lines: string[]): boolean {
  // Check first 100 non-blank lines for an ALL CAPS book header.
  // Must be ALL CAPS to distinguish from Format 2 which uses Title Case.
  let checked = 0;
  for (const line of lines) {
    const trimmed = line.trim().replace(/\r/g, "").replace(/\u00A0/g, " ");
    if (!trimmed) continue;
    // Only match if the line is ALL CAPS (at least the letter characters)
    const letters = trimmed.replace(/[^a-zA-Z]/g, "");
    if (letters.length > 0 && letters === letters.toUpperCase() && matchBookHeader(trimmed)) {
      return true;
    }
    checked++;
    if (checked > 100) break;
  }
  return false;
}
