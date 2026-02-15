/**
 * Converts OEB USFM files (from openenglishbible/Open-English-Bible)
 * into per-chapter JSON files for the app.
 *
 * Uses the DEVELOPMENT set (artifacts/us/usfm/) which has more books
 * than the release set. The OEB OT is still incomplete — missing books
 * are simply omitted from the manifest.
 *
 * Input:  data/oeb/Open-English-Bible-master/.../artifacts/us/usfm/*.usfm
 * Output: public/bibles/oeb-us/{bookId}/{chapter}.json + manifest.json
 *
 * Run with: npx tsx scripts/convert-oeb.ts
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  REMINDER: Check for OEB updates monthly!           │
 * │  The OEB OT is a work in progress. New books get    │
 * │  added periodically. Re-download from:              │
 * │  github.com/openenglishbible/Open-English-Bible     │
 * │  and re-run this script when updates arrive.        │
 * │  Last checked: 2026-02-14                           │
 * └─────────────────────────────────────────────────────┘
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// ── Map from USFM \id codes to our BookId + display name ──

interface BookMapping {
  usfmId: string;      // The \id code in the USFM file (e.g., "GEN")
  filePrefix: string;   // The number prefix in the filename (e.g., "01")
  bookId: string;       // Our three-letter BookId
  name: string;         // Display name
  testament: "OT" | "DC" | "NT";
}

const BOOK_MAP: BookMapping[] = [
  // Old Testament
  { usfmId: "GEN", filePrefix: "01", bookId: "gen", name: "Genesis", testament: "OT" },
  { usfmId: "EXO", filePrefix: "02", bookId: "exo", name: "Exodus", testament: "OT" },
  { usfmId: "LEV", filePrefix: "03", bookId: "lev", name: "Leviticus", testament: "OT" },
  { usfmId: "NUM", filePrefix: "04", bookId: "num", name: "Numbers", testament: "OT" },
  { usfmId: "DEU", filePrefix: "05", bookId: "deu", name: "Deuteronomy", testament: "OT" },
  { usfmId: "JOS", filePrefix: "06", bookId: "jos", name: "Joshua", testament: "OT" },
  { usfmId: "JDG", filePrefix: "07", bookId: "jdg", name: "Judges", testament: "OT" },
  { usfmId: "RUT", filePrefix: "08", bookId: "rut", name: "Ruth", testament: "OT" },
  { usfmId: "1SA", filePrefix: "09", bookId: "1sa", name: "1 Samuel", testament: "OT" },
  { usfmId: "2SA", filePrefix: "10", bookId: "2sa", name: "2 Samuel", testament: "OT" },
  { usfmId: "1KI", filePrefix: "11", bookId: "1ki", name: "1 Kings", testament: "OT" },
  { usfmId: "2KI", filePrefix: "12", bookId: "2ki", name: "2 Kings", testament: "OT" },
  { usfmId: "1CH", filePrefix: "13", bookId: "1ch", name: "1 Chronicles", testament: "OT" },
  { usfmId: "2CH", filePrefix: "14", bookId: "2ch", name: "2 Chronicles", testament: "OT" },
  { usfmId: "EZR", filePrefix: "15", bookId: "ezr", name: "Ezra", testament: "OT" },
  { usfmId: "NEH", filePrefix: "16", bookId: "neh", name: "Nehemiah", testament: "OT" },
  { usfmId: "EST", filePrefix: "17", bookId: "est", name: "Esther", testament: "OT" },
  { usfmId: "JOB", filePrefix: "18", bookId: "job", name: "Job", testament: "OT" },
  { usfmId: "PSA", filePrefix: "19", bookId: "psa", name: "Psalms", testament: "OT" },
  { usfmId: "PRO", filePrefix: "20", bookId: "pro", name: "Proverbs", testament: "OT" },
  { usfmId: "ECC", filePrefix: "21", bookId: "ecc", name: "Ecclesiastes", testament: "OT" },
  { usfmId: "SNG", filePrefix: "22", bookId: "sng", name: "Song of Songs", testament: "OT" },
  { usfmId: "ISA", filePrefix: "23", bookId: "isa", name: "Isaiah", testament: "OT" },
  { usfmId: "JER", filePrefix: "24", bookId: "jer", name: "Jeremiah", testament: "OT" },
  { usfmId: "LAM", filePrefix: "25", bookId: "lam", name: "Lamentations", testament: "OT" },
  { usfmId: "EZK", filePrefix: "26", bookId: "ezk", name: "Ezekiel", testament: "OT" },
  { usfmId: "DAN", filePrefix: "27", bookId: "dan", name: "Daniel", testament: "OT" },
  { usfmId: "HOS", filePrefix: "28", bookId: "hos", name: "Hosea", testament: "OT" },
  { usfmId: "JOL", filePrefix: "29", bookId: "jol", name: "Joel", testament: "OT" },
  { usfmId: "AMO", filePrefix: "30", bookId: "amo", name: "Amos", testament: "OT" },
  { usfmId: "OBA", filePrefix: "31", bookId: "oba", name: "Obadiah", testament: "OT" },
  { usfmId: "JON", filePrefix: "32", bookId: "jon", name: "Jonah", testament: "OT" },
  { usfmId: "MIC", filePrefix: "33", bookId: "mic", name: "Micah", testament: "OT" },
  { usfmId: "NAM", filePrefix: "34", bookId: "nah", name: "Nahum", testament: "OT" },
  { usfmId: "HAB", filePrefix: "35", bookId: "hab", name: "Habakkuk", testament: "OT" },
  { usfmId: "ZEP", filePrefix: "36", bookId: "zep", name: "Zephaniah", testament: "OT" },
  { usfmId: "HAG", filePrefix: "37", bookId: "hag", name: "Haggai", testament: "OT" },
  { usfmId: "ZEC", filePrefix: "38", bookId: "zec", name: "Zechariah", testament: "OT" },
  { usfmId: "MAL", filePrefix: "39", bookId: "mal", name: "Malachi", testament: "OT" },
  // New Testament
  { usfmId: "MAT", filePrefix: "40", bookId: "mat", name: "Matthew", testament: "NT" },
  { usfmId: "MRK", filePrefix: "41", bookId: "mrk", name: "Mark", testament: "NT" },
  { usfmId: "LUK", filePrefix: "42", bookId: "luk", name: "Luke", testament: "NT" },
  { usfmId: "JHN", filePrefix: "43", bookId: "jhn", name: "John", testament: "NT" },
  { usfmId: "ACT", filePrefix: "44", bookId: "act", name: "Acts", testament: "NT" },
  { usfmId: "ROM", filePrefix: "45", bookId: "rom", name: "Romans", testament: "NT" },
  { usfmId: "1CO", filePrefix: "46", bookId: "1co", name: "1 Corinthians", testament: "NT" },
  { usfmId: "2CO", filePrefix: "47", bookId: "2co", name: "2 Corinthians", testament: "NT" },
  { usfmId: "GAL", filePrefix: "48", bookId: "gal", name: "Galatians", testament: "NT" },
  { usfmId: "EPH", filePrefix: "49", bookId: "eph", name: "Ephesians", testament: "NT" },
  { usfmId: "PHP", filePrefix: "50", bookId: "php", name: "Philippians", testament: "NT" },
  { usfmId: "COL", filePrefix: "51", bookId: "col", name: "Colossians", testament: "NT" },
  { usfmId: "1TH", filePrefix: "52", bookId: "1th", name: "1 Thessalonians", testament: "NT" },
  { usfmId: "2TH", filePrefix: "53", bookId: "2th", name: "2 Thessalonians", testament: "NT" },
  { usfmId: "1TI", filePrefix: "54", bookId: "1ti", name: "1 Timothy", testament: "NT" },
  { usfmId: "2TI", filePrefix: "55", bookId: "2ti", name: "2 Timothy", testament: "NT" },
  { usfmId: "TIT", filePrefix: "56", bookId: "tit", name: "Titus", testament: "NT" },
  { usfmId: "PHM", filePrefix: "57", bookId: "phm", name: "Philemon", testament: "NT" },
  { usfmId: "HEB", filePrefix: "58", bookId: "heb", name: "Hebrews", testament: "NT" },
  { usfmId: "JAS", filePrefix: "59", bookId: "jas", name: "James", testament: "NT" },
  { usfmId: "1PE", filePrefix: "60", bookId: "1pe", name: "1 Peter", testament: "NT" },
  { usfmId: "2PE", filePrefix: "61", bookId: "2pe", name: "2 Peter", testament: "NT" },
  { usfmId: "1JN", filePrefix: "62", bookId: "1jn", name: "1 John", testament: "NT" },
  { usfmId: "2JN", filePrefix: "63", bookId: "2jn", name: "2 John", testament: "NT" },
  { usfmId: "3JN", filePrefix: "64", bookId: "3jn", name: "3 John", testament: "NT" },
  { usfmId: "JUD", filePrefix: "65", bookId: "jud", name: "Jude", testament: "NT" },
  { usfmId: "REV", filePrefix: "66", bookId: "rev", name: "Revelation", testament: "NT" },
];

// ── Paths ──
const ROOT = join(import.meta.dirname!, "..");
const SOURCE_DIR = join(
  ROOT,
  "data/oeb/Open-English-Bible-master/Open-English-Bible-master/artifacts/us/usfm",
);
const OUTPUT_DIR = join(ROOT, "public/bibles/oeb-us");

/**
 * Parse a USFM file into chapters of verses.
 *
 * USFM is a markup format for Bible text. The key tags we care about:
 * - \c {n}       → start of chapter n
 * - \v {n} text  → verse n with its text
 * - \q, \q2, \q3 → poetry indentation (text continues the current verse)
 * - \p, \m, \b   → paragraph/margin markers (text continues the current verse)
 * - \s, \s2      → section headings (we skip these)
 * - \rem          → comments (we skip these)
 *
 * Everything between one \v tag and the next (or \c) is part of that verse.
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

  // Tags that indicate "skip this line entirely" (not verse content)
  const skipTags = new Set([
    "\\id",
    "\\ide",
    "\\h",
    "\\mt",
    "\\mt2",
    "\\mt3",
    "\\rem",
    "\\s",
    "\\s2",
    "\\toc1",
    "\\toc2",
    "\\toc3",
  ]);

  // Tags that are formatting markers — the text after them (if any)
  // belongs to the current verse
  const continuationTags = new Set([
    "\\p",
    "\\q",
    "\\q2",
    "\\q3",
    "\\m",
    "\\b",
    "\\pi",
    "\\pi2",
    "\\nb",
    "\\li",
    "\\li2",
  ]);

  function saveCurrentVerse() {
    if (currentVerseNum > 0 && currentChapter > 0) {
      const trimmed = currentVerseText.trim().replace(/\s+/g, " ");
      if (trimmed) {
        const chapterObj = chapters.find(
          (c) => c.chapter === currentChapter,
        );
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

    // Check for chapter marker
    if (line.startsWith("\\c ")) {
      // Save any in-progress verse before starting a new chapter
      saveCurrentVerse();
      currentVerseNum = 0;
      currentVerseText = "";
      currentChapter = parseInt(line.replace("\\c ", ""), 10);
      chapters.push({ chapter: currentChapter, verses: [] });
      continue;
    }

    // Check for verse marker: \v {number} {text...}
    if (line.startsWith("\\v ")) {
      // Save previous verse
      saveCurrentVerse();

      // Parse verse number and text from this line
      const withoutTag = line.slice(3); // remove "\v "
      const spaceIdx = withoutTag.indexOf(" ");
      if (spaceIdx === -1) {
        // Just a verse number with no text on this line
        currentVerseNum = parseInt(withoutTag, 10);
        currentVerseText = "";
      } else {
        currentVerseNum = parseInt(withoutTag.slice(0, spaceIdx), 10);
        currentVerseText = stripInlineTags(withoutTag.slice(spaceIdx + 1));
      }
      continue;
    }

    // Check if this is a tag we should skip entirely
    const firstToken = line.split(" ")[0];
    if (skipTags.has(firstToken)) continue;

    // Check if this is a continuation tag (paragraph/poetry marker)
    // Any text after the tag belongs to the current verse
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

  // Don't forget the last verse in the file
  saveCurrentVerse();

  return chapters;
}

/**
 * Remove inline USFM tags like \add ...\add*, \wj ...\wj*, \f ...\f*
 * These are character-level formatting that we strip for plain text output.
 */
function stripInlineTags(text: string): string {
  return (
    text
      // Remove footnotes: \f ... \f*
      .replace(/\\f\s.*?\\f\*/g, "")
      // Remove cross-references: \x ... \x*
      .replace(/\\x\s.*?\\x\*/g, "")
      // Remove character styling tags: \add, \wj, \it, etc.
      // Opening tag: \tag (text continues)
      // Closing tag: \tag*
      .replace(/\\[a-z]+\d?\*/g, "")
      .replace(/\\[a-z]+\d?\s?/g, " ")
      // Clean up extra spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

function convert() {
  console.log("Converting OEB (US, development set)...\n");

  // Find which USFM files actually exist in the source directory
  const availableFiles = readdirSync(SOURCE_DIR).filter(
    (f) => f.endsWith(".usfm") && !f.startsWith("00-"),
  );

  const manifestBooks: {
    id: string;
    name: string;
    chapters: number;
    testament: "OT" | "DC" | "NT";
  }[] = [];

  let totalChapters = 0;

  for (const mapping of BOOK_MAP) {
    // Find the matching USFM file by its prefix number
    const usfmFile = availableFiles.find((f) =>
      f.startsWith(`${mapping.filePrefix}-`),
    );

    if (!usfmFile) {
      // This book isn't in the OEB yet — that's expected for incomplete OT
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

    // Merge duplicate chapters — some USFM files have duplicate \c markers
    // (the OEB development USFM has alternate translations for some chapters).
    // We keep the version with the most verses for each chapter number.
    const mergedChapters = new Map<
      number,
      { number: number; text: string }[]
    >();
    for (const chapter of chapters) {
      const existing = mergedChapters.get(chapter.chapter);
      if (!existing || chapter.verses.length > existing.length) {
        mergedChapters.set(chapter.chapter, chapter.verses);
      }
    }

    // Write one JSON file per chapter, skipping empty chapters
    const writtenChapters: number[] = [];
    for (const [chapterNum, verses] of mergedChapters) {
      if (verses.length === 0) continue;

      const chapterData = {
        translation: "oeb-us",
        book: mapping.bookId,
        bookName: mapping.name,
        chapter: chapterNum,
        verses,
      };

      const outPath = join(bookDir, `${chapterNum}.json`);
      writeFileSync(outPath, JSON.stringify(chapterData), "utf-8");
      writtenChapters.push(chapterNum);
    }

    totalChapters += writtenChapters.length;

    manifestBooks.push({
      id: mapping.bookId,
      name: mapping.name,
      chapters: writtenChapters.length,
      testament: mapping.testament,
    });

    console.log(
      `  ${mapping.name} → ${mapping.bookId}/ (${writtenChapters.length} chapters)`,
    );
  }

  // Write the manifest
  const manifest = {
    translation: "oeb-us",
    name: "Open English Bible (US)",
    language: "en",
    license: "CC0 / Public Domain",
    // Flag so the UI knows some books are missing
    incomplete: true,
    lastUpdated: "2026-02-14",
    books: manifestBooks,
  };

  writeFileSync(
    join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );

  console.log(
    `\nDone! ${manifestBooks.length} books, ${totalChapters} chapter files written to public/bibles/oeb-us/`,
  );
  console.log(
    "\n📋 REMINDER: Check github.com/openenglishbible/Open-English-Bible",
  );
  console.log("   monthly for new book releases. Re-run this script after updating.\n");
}

convert();
