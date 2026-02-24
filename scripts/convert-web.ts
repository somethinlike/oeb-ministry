/**
 * Converts the World English Bible (WEB) from USFM files into
 * per-chapter JSON files for the app.
 *
 * Source: eBible.org eng-web edition (full canon with deuterocanonical books)
 * The WEB is fully public domain — no copyright restrictions.
 *
 * Input:  data/web/usfm/*eng-web.usfm
 * Output: public/bibles/web/{bookId}/{chapter}.json + manifest.json
 *
 * Run with: npx tsx scripts/convert-web.ts
 *
 * Key difference from OEB converter: WEB USFM includes Strong's
 * concordance numbers embedded in \w tags:
 *   \w word|strong="H1234"\w*
 * These must be stripped to produce clean text.
 *
 * The WEB uses "Yahweh" for God's name (YHWH) rather than "LORD".
 * Our translation toggle system handles this — users can switch
 * between Yahweh and LORD in the reader UI.
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// ── Map from USFM file prefixes to our BookId + display name ──

interface BookMapping {
  filePrefix: string;   // Number prefix in the filename (e.g., "02")
  usfmId: string;       // The \id code in the USFM file (e.g., "GEN")
  bookId: string;       // Our three-letter BookId
  name: string;         // Display name
  testament: "OT" | "DC" | "NT";
}

const BOOK_MAP: BookMapping[] = [
  // ── Old Testament ──
  { filePrefix: "02", usfmId: "GEN", bookId: "gen", name: "Genesis", testament: "OT" },
  { filePrefix: "03", usfmId: "EXO", bookId: "exo", name: "Exodus", testament: "OT" },
  { filePrefix: "04", usfmId: "LEV", bookId: "lev", name: "Leviticus", testament: "OT" },
  { filePrefix: "05", usfmId: "NUM", bookId: "num", name: "Numbers", testament: "OT" },
  { filePrefix: "06", usfmId: "DEU", bookId: "deu", name: "Deuteronomy", testament: "OT" },
  { filePrefix: "07", usfmId: "JOS", bookId: "jos", name: "Joshua", testament: "OT" },
  { filePrefix: "08", usfmId: "JDG", bookId: "jdg", name: "Judges", testament: "OT" },
  { filePrefix: "09", usfmId: "RUT", bookId: "rut", name: "Ruth", testament: "OT" },
  { filePrefix: "10", usfmId: "1SA", bookId: "1sa", name: "1 Samuel", testament: "OT" },
  { filePrefix: "11", usfmId: "2SA", bookId: "2sa", name: "2 Samuel", testament: "OT" },
  { filePrefix: "12", usfmId: "1KI", bookId: "1ki", name: "1 Kings", testament: "OT" },
  { filePrefix: "13", usfmId: "2KI", bookId: "2ki", name: "2 Kings", testament: "OT" },
  { filePrefix: "14", usfmId: "1CH", bookId: "1ch", name: "1 Chronicles", testament: "OT" },
  { filePrefix: "15", usfmId: "2CH", bookId: "2ch", name: "2 Chronicles", testament: "OT" },
  { filePrefix: "16", usfmId: "EZR", bookId: "ezr", name: "Ezra", testament: "OT" },
  { filePrefix: "17", usfmId: "NEH", bookId: "neh", name: "Nehemiah", testament: "OT" },
  { filePrefix: "18", usfmId: "EST", bookId: "est", name: "Esther", testament: "OT" },
  { filePrefix: "19", usfmId: "JOB", bookId: "job", name: "Job", testament: "OT" },
  { filePrefix: "20", usfmId: "PSA", bookId: "psa", name: "Psalms", testament: "OT" },
  { filePrefix: "21", usfmId: "PRO", bookId: "pro", name: "Proverbs", testament: "OT" },
  { filePrefix: "22", usfmId: "ECC", bookId: "ecc", name: "Ecclesiastes", testament: "OT" },
  { filePrefix: "23", usfmId: "SNG", bookId: "sng", name: "Song of Solomon", testament: "OT" },
  { filePrefix: "24", usfmId: "ISA", bookId: "isa", name: "Isaiah", testament: "OT" },
  { filePrefix: "25", usfmId: "JER", bookId: "jer", name: "Jeremiah", testament: "OT" },
  { filePrefix: "26", usfmId: "LAM", bookId: "lam", name: "Lamentations", testament: "OT" },
  { filePrefix: "27", usfmId: "EZK", bookId: "ezk", name: "Ezekiel", testament: "OT" },
  { filePrefix: "28", usfmId: "DAN", bookId: "dan", name: "Daniel", testament: "OT" },
  { filePrefix: "29", usfmId: "HOS", bookId: "hos", name: "Hosea", testament: "OT" },
  { filePrefix: "30", usfmId: "JOL", bookId: "jol", name: "Joel", testament: "OT" },
  { filePrefix: "31", usfmId: "AMO", bookId: "amo", name: "Amos", testament: "OT" },
  { filePrefix: "32", usfmId: "OBA", bookId: "oba", name: "Obadiah", testament: "OT" },
  { filePrefix: "33", usfmId: "JON", bookId: "jon", name: "Jonah", testament: "OT" },
  { filePrefix: "34", usfmId: "MIC", bookId: "mic", name: "Micah", testament: "OT" },
  { filePrefix: "35", usfmId: "NAM", bookId: "nah", name: "Nahum", testament: "OT" },
  { filePrefix: "36", usfmId: "HAB", bookId: "hab", name: "Habakkuk", testament: "OT" },
  { filePrefix: "37", usfmId: "ZEP", bookId: "zep", name: "Zephaniah", testament: "OT" },
  { filePrefix: "38", usfmId: "HAG", bookId: "hag", name: "Haggai", testament: "OT" },
  { filePrefix: "39", usfmId: "ZEC", bookId: "zec", name: "Zechariah", testament: "OT" },
  { filePrefix: "40", usfmId: "MAL", bookId: "mal", name: "Malachi", testament: "OT" },

  // ── Deuterocanonical books ──
  { filePrefix: "41", usfmId: "TOB", bookId: "tob", name: "Tobit", testament: "DC" },
  { filePrefix: "42", usfmId: "JDT", bookId: "jdt", name: "Judith", testament: "DC" },
  { filePrefix: "43", usfmId: "ESG", bookId: "ade", name: "Additions to Esther", testament: "DC" },
  { filePrefix: "45", usfmId: "WIS", bookId: "wis", name: "Wisdom of Solomon", testament: "DC" },
  { filePrefix: "46", usfmId: "SIR", bookId: "sir", name: "Sirach", testament: "DC" },
  { filePrefix: "47", usfmId: "BAR", bookId: "bar", name: "Baruch", testament: "DC" },
  { filePrefix: "52", usfmId: "1MA", bookId: "1ma", name: "1 Maccabees", testament: "DC" },
  { filePrefix: "53", usfmId: "2MA", bookId: "2ma", name: "2 Maccabees", testament: "DC" },
  { filePrefix: "54", usfmId: "1ES", bookId: "1es", name: "1 Esdras", testament: "DC" },
  { filePrefix: "55", usfmId: "MAN", bookId: "pma", name: "Prayer of Manasseh", testament: "DC" },
  { filePrefix: "56", usfmId: "PS2", bookId: "p15", name: "Psalm 151", testament: "DC" },
  { filePrefix: "57", usfmId: "3MA", bookId: "3ma", name: "3 Maccabees", testament: "DC" },
  { filePrefix: "58", usfmId: "2ES", bookId: "2es", name: "2 Esdras", testament: "DC" },
  { filePrefix: "59", usfmId: "4MA", bookId: "4ma", name: "4 Maccabees", testament: "DC" },
  { filePrefix: "66", usfmId: "DAG", bookId: "add", name: "Additions to Daniel", testament: "DC" },

  // ── New Testament ──
  { filePrefix: "70", usfmId: "MAT", bookId: "mat", name: "Matthew", testament: "NT" },
  { filePrefix: "71", usfmId: "MRK", bookId: "mrk", name: "Mark", testament: "NT" },
  { filePrefix: "72", usfmId: "LUK", bookId: "luk", name: "Luke", testament: "NT" },
  { filePrefix: "73", usfmId: "JHN", bookId: "jhn", name: "John", testament: "NT" },
  { filePrefix: "74", usfmId: "ACT", bookId: "act", name: "Acts", testament: "NT" },
  { filePrefix: "75", usfmId: "ROM", bookId: "rom", name: "Romans", testament: "NT" },
  { filePrefix: "76", usfmId: "1CO", bookId: "1co", name: "1 Corinthians", testament: "NT" },
  { filePrefix: "77", usfmId: "2CO", bookId: "2co", name: "2 Corinthians", testament: "NT" },
  { filePrefix: "78", usfmId: "GAL", bookId: "gal", name: "Galatians", testament: "NT" },
  { filePrefix: "79", usfmId: "EPH", bookId: "eph", name: "Ephesians", testament: "NT" },
  { filePrefix: "80", usfmId: "PHP", bookId: "php", name: "Philippians", testament: "NT" },
  { filePrefix: "81", usfmId: "COL", bookId: "col", name: "Colossians", testament: "NT" },
  { filePrefix: "82", usfmId: "1TH", bookId: "1th", name: "1 Thessalonians", testament: "NT" },
  { filePrefix: "83", usfmId: "2TH", bookId: "2th", name: "2 Thessalonians", testament: "NT" },
  { filePrefix: "84", usfmId: "1TI", bookId: "1ti", name: "1 Timothy", testament: "NT" },
  { filePrefix: "85", usfmId: "2TI", bookId: "2ti", name: "2 Timothy", testament: "NT" },
  { filePrefix: "86", usfmId: "TIT", bookId: "tit", name: "Titus", testament: "NT" },
  { filePrefix: "87", usfmId: "PHM", bookId: "phm", name: "Philemon", testament: "NT" },
  { filePrefix: "88", usfmId: "HEB", bookId: "heb", name: "Hebrews", testament: "NT" },
  { filePrefix: "89", usfmId: "JAS", bookId: "jas", name: "James", testament: "NT" },
  { filePrefix: "90", usfmId: "1PE", bookId: "1pe", name: "1 Peter", testament: "NT" },
  { filePrefix: "91", usfmId: "2PE", bookId: "2pe", name: "2 Peter", testament: "NT" },
  { filePrefix: "92", usfmId: "1JN", bookId: "1jn", name: "1 John", testament: "NT" },
  { filePrefix: "93", usfmId: "2JN", bookId: "2jn", name: "2 John", testament: "NT" },
  { filePrefix: "94", usfmId: "3JN", bookId: "3jn", name: "3 John", testament: "NT" },
  { filePrefix: "95", usfmId: "JUD", bookId: "jud", name: "Jude", testament: "NT" },
  { filePrefix: "96", usfmId: "REV", bookId: "rev", name: "Revelation", testament: "NT" },
];

// Files to skip (front matter, glossary — not Bible text)
const SKIP_PREFIXES = new Set(["00", "106"]);

// ── Paths ──
const ROOT = join(import.meta.dirname!, "..");
const SOURCE_DIR = join(ROOT, "data/web/usfm");
const OUTPUT_DIR = join(ROOT, "public/bibles/web");

/**
 * Parse a USFM file into chapters of verses.
 *
 * USFM key tags:
 * - \c {n}       → start of chapter n
 * - \v {n} text  → verse n with its text
 * - \q, \q2, \q3 → poetry indentation (text continues current verse)
 * - \p, \m, \b   → paragraph/margin markers (text continues current verse)
 * - \s, \s2      → section headings (skipped)
 * - \w word|strong="H1234"\w* → word with Strong's number (strip markup, keep word)
 * - \f ... \f*   → footnotes (stripped entirely)
 */
function parseUsfm(
  content: string,
): { chapter: number; verses: { number: number; text: string }[] }[] {
  const chapters: {
    chapter: number;
    verses: { number: number; text: string }[];
  }[] = [];

  let currentChapter = 0;
  let currentVerseNum = 0;
  let currentVerseText = "";

  // Tags that indicate "skip this line entirely"
  const skipTags = new Set([
    "\\id", "\\ide", "\\h", "\\mt", "\\mt1", "\\mt2", "\\mt3",
    "\\rem", "\\s", "\\s1", "\\s2", "\\s3",
    "\\toc1", "\\toc2", "\\toc3",
    "\\ip", "\\is", "\\is1", "\\is2",
    "\\r", "\\d", "\\sp",
    "\\cl", "\\cp",
  ]);

  // Tags that are formatting markers — text after them belongs to current verse
  const continuationTags = new Set([
    "\\p", "\\q", "\\q1", "\\q2", "\\q3",
    "\\m", "\\b", "\\pi", "\\pi2", "\\nb",
    "\\li", "\\li1", "\\li2", "\\li3",
    "\\pm", "\\pmo", "\\pmc",
    "\\qr", "\\qc", "\\qs",
    "\\mi",
  ]);

  function saveCurrentVerse() {
    if (currentVerseNum > 0 && currentChapter > 0) {
      const trimmed = currentVerseText.trim().replace(/\s+/g, " ");
      if (trimmed) {
        const chapterObj = chapters.find((c) => c.chapter === currentChapter);
        if (chapterObj) {
          chapterObj.verses.push({ number: currentVerseNum, text: trimmed });
        }
      }
    }
  }

  const lines = content.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Chapter marker
    if (line.startsWith("\\c ")) {
      saveCurrentVerse();
      currentVerseNum = 0;
      currentVerseText = "";
      currentChapter = parseInt(line.replace("\\c ", ""), 10);
      chapters.push({ chapter: currentChapter, verses: [] });
      continue;
    }

    // Verse marker: \v {number} {text...}
    if (line.startsWith("\\v ")) {
      saveCurrentVerse();

      const withoutTag = line.slice(3);
      const spaceIdx = withoutTag.indexOf(" ");
      if (spaceIdx === -1) {
        currentVerseNum = parseInt(withoutTag, 10);
        currentVerseText = "";
      } else {
        currentVerseNum = parseInt(withoutTag.slice(0, spaceIdx), 10);
        currentVerseText = stripInlineTags(withoutTag.slice(spaceIdx + 1));
      }
      continue;
    }

    // Skip tags
    const firstToken = line.split(" ")[0];
    if (skipTags.has(firstToken)) continue;

    // Continuation tags — text after tag belongs to current verse
    if (continuationTags.has(firstToken)) {
      const afterTag = line.slice(firstToken.length).trim();
      if (afterTag && currentVerseNum > 0) {
        currentVerseText += " " + stripInlineTags(afterTag);
      }
      continue;
    }

    // Any other line — if we're in a verse, append it
    if (currentVerseNum > 0) {
      currentVerseText += " " + stripInlineTags(line);
    }
  }

  // Save the last verse
  saveCurrentVerse();

  return chapters;
}

/**
 * Remove inline USFM tags and Strong's numbers from verse text.
 *
 * The WEB embeds Strong's concordance numbers in word tags:
 *   \w In|strong="H8064"\w*  →  "In"
 *   \w the|strong="H1254"\w*  →  "the"
 *
 * Also strips footnotes (\f ... \f*), cross-refs (\x ... \x*),
 * and other character-level markup (\add, \wj, \it, etc.).
 */
function stripInlineTags(text: string): string {
  return (
    text
      // Remove footnotes: \f ... \f* (including nested tags like \fr, \ft, \fqa)
      .replace(/\\f\s.*?\\f\*/g, "")
      // Remove cross-references: \x ... \x*
      .replace(/\\x\s.*?\\x\*/g, "")
      // Handle \w and \+w tags with Strong's numbers — extract just the word.
      // Two patterns in WEB USFM:
      //   \w word|strong="H1234"\w*           (normal text)
      //   \+w word|strong="G5678"\+w*         (nested inside \wj, \add, etc.)
      .replace(/\\(?:\+)?w\s+([^|\\]+)\|[^\\]*\\(?:\+)?w\*/g, "$1")
      // Handle \w/\+w without attributes
      .replace(/\\(?:\+)?w\s+([^\\]+?)\\(?:\+)?w\*/g, "$1")
      // Remove any remaining closing tags: \tag* or \+tag*
      .replace(/\\(?:\+)?[a-z]+\d?\*/g, "")
      // Remove any remaining opening tags: \tag or \+tag followed by space
      .replace(/\\(?:\+)?[a-z]+\d?\s?/g, " ")
      // Clean up extra spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

function convert() {
  console.log("Converting World English Bible (WEB)...\n");

  const availableFiles = readdirSync(SOURCE_DIR).filter(
    (f) => f.endsWith(".usfm") && !SKIP_PREFIXES.has(f.split("-")[0]),
  );

  const manifestBooks: {
    id: string;
    name: string;
    chapters: number;
    testament: "OT" | "DC" | "NT";
  }[] = [];

  let totalChapters = 0;

  for (const mapping of BOOK_MAP) {
    // Find the USFM file matching this book's prefix
    const usfmFile = availableFiles.find((f) =>
      f.startsWith(`${mapping.filePrefix}-`),
    );

    if (!usfmFile) {
      console.warn(`  MISSING: ${mapping.name} (prefix ${mapping.filePrefix})`);
      continue;
    }

    const sourcePath = join(SOURCE_DIR, usfmFile);
    const content = readFileSync(sourcePath, "utf-8");
    const chapters = parseUsfm(content);

    if (chapters.length === 0) {
      console.warn(`  SKIP: ${mapping.name} — no chapters parsed`);
      continue;
    }

    // Create the output directory for this book
    const bookDir = join(OUTPUT_DIR, mapping.bookId);
    mkdirSync(bookDir, { recursive: true });

    // Write one JSON file per chapter
    for (const chapter of chapters) {
      if (chapter.verses.length === 0) continue;

      const chapterData = {
        translation: "web",
        book: mapping.bookId,
        bookName: mapping.name,
        chapter: chapter.chapter,
        verses: chapter.verses,
      };

      const outPath = join(bookDir, `${chapter.chapter}.json`);
      writeFileSync(outPath, JSON.stringify(chapterData), "utf-8");
      totalChapters++;
    }

    manifestBooks.push({
      id: mapping.bookId,
      name: mapping.name,
      chapters: chapters.filter((c) => c.verses.length > 0).length,
      testament: mapping.testament,
    });

    console.log(
      `  ${mapping.name} → ${mapping.bookId}/ (${chapters.length} chapters)`,
    );
  }

  // Write the manifest
  const manifest = {
    translation: "web",
    name: "World English Bible",
    language: "en",
    license: "Public Domain",
    books: manifestBooks,
  };

  writeFileSync(
    join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );

  console.log(
    `\nDone! ${manifestBooks.length} books, ${totalChapters} chapter files → public/bibles/web/`,
  );
}

convert();
