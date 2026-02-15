/**
 * Converts KJV 1611 JSON (from aruljohn/Bible-kjv-1611) into
 * per-chapter JSON files for the app.
 *
 * Input:  data/kjv-1611/Bible-kjv-1611-main/{BookName}.json
 * Output: public/bibles/kjv1611/{bookId}/{chapter}.json + manifest.json
 *
 * Run with: npx tsx scripts/convert-kjv1611.ts
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// ── Map from KJV filenames to our BookId + testament ──
// This is the critical mapping table. Each entry connects
// the source book name to our internal three-letter code.

interface BookMapping {
  sourceFile: string;  // Filename in the KJV repo (without .json)
  bookId: string;      // Our three-letter BookId
  testament: "OT" | "DC" | "NT";
}

const BOOK_MAP: BookMapping[] = [
  // Old Testament
  { sourceFile: "Genesis", bookId: "gen", testament: "OT" },
  { sourceFile: "Exodus", bookId: "exo", testament: "OT" },
  { sourceFile: "Leviticus", bookId: "lev", testament: "OT" },
  { sourceFile: "Numbers", bookId: "num", testament: "OT" },
  { sourceFile: "Deuteronomy", bookId: "deu", testament: "OT" },
  { sourceFile: "Joshua", bookId: "jos", testament: "OT" },
  { sourceFile: "Judges", bookId: "jdg", testament: "OT" },
  { sourceFile: "Ruth", bookId: "rut", testament: "OT" },
  { sourceFile: "1 Samuel", bookId: "1sa", testament: "OT" },
  { sourceFile: "2 Samuel", bookId: "2sa", testament: "OT" },
  { sourceFile: "1 Kings", bookId: "1ki", testament: "OT" },
  { sourceFile: "2 Kings", bookId: "2ki", testament: "OT" },
  { sourceFile: "1 Chronicles", bookId: "1ch", testament: "OT" },
  { sourceFile: "2 Chronicles", bookId: "2ch", testament: "OT" },
  { sourceFile: "Ezra", bookId: "ezr", testament: "OT" },
  { sourceFile: "Nehemiah", bookId: "neh", testament: "OT" },
  { sourceFile: "Esther", bookId: "est", testament: "OT" },
  { sourceFile: "Job", bookId: "job", testament: "OT" },
  { sourceFile: "Psalms", bookId: "psa", testament: "OT" },
  { sourceFile: "Proverbs", bookId: "pro", testament: "OT" },
  { sourceFile: "Ecclesiastes", bookId: "ecc", testament: "OT" },
  { sourceFile: "Song of Solomon", bookId: "sng", testament: "OT" },
  { sourceFile: "Isaiah", bookId: "isa", testament: "OT" },
  { sourceFile: "Jeremiah", bookId: "jer", testament: "OT" },
  { sourceFile: "Lamentations", bookId: "lam", testament: "OT" },
  { sourceFile: "Ezekiel", bookId: "ezk", testament: "OT" },
  { sourceFile: "Daniel", bookId: "dan", testament: "OT" },
  { sourceFile: "Hosea", bookId: "hos", testament: "OT" },
  { sourceFile: "Joel", bookId: "jol", testament: "OT" },
  { sourceFile: "Amos", bookId: "amo", testament: "OT" },
  { sourceFile: "Obadiah", bookId: "oba", testament: "OT" },
  { sourceFile: "Jonah", bookId: "jon", testament: "OT" },
  { sourceFile: "Micah", bookId: "mic", testament: "OT" },
  { sourceFile: "Nahum", bookId: "nah", testament: "OT" },
  { sourceFile: "Habakkuk", bookId: "hab", testament: "OT" },
  { sourceFile: "Zephaniah", bookId: "zep", testament: "OT" },
  { sourceFile: "Haggai", bookId: "hag", testament: "OT" },
  { sourceFile: "Zechariah", bookId: "zec", testament: "OT" },
  { sourceFile: "Malachi", bookId: "mal", testament: "OT" },
  // Deuterocanon / Apocrypha
  { sourceFile: "Tobit", bookId: "tob", testament: "DC" },
  { sourceFile: "Judith", bookId: "jdt", testament: "DC" },
  { sourceFile: "Wisdom of Solomon", bookId: "wis", testament: "DC" },
  { sourceFile: "Ecclesiasticus", bookId: "sir", testament: "DC" },
  { sourceFile: "Baruch", bookId: "bar", testament: "DC" },
  { sourceFile: "Letter of Jeremiah", bookId: "lje", testament: "DC" },
  { sourceFile: "Prayer of Azariah", bookId: "aza", testament: "DC" },
  { sourceFile: "Susanna", bookId: "sus", testament: "DC" },
  { sourceFile: "Bel and the Dragon", bookId: "bel", testament: "DC" },
  { sourceFile: "Prayer of Manasseh", bookId: "pma", testament: "DC" },
  { sourceFile: "1 Esdras", bookId: "1es", testament: "DC" },
  { sourceFile: "2 Esdras", bookId: "2es", testament: "DC" },
  { sourceFile: "1 Maccabees", bookId: "1ma", testament: "DC" },
  { sourceFile: "2 Maccabees", bookId: "2ma", testament: "DC" },
  // New Testament
  { sourceFile: "Matthew", bookId: "mat", testament: "NT" },
  { sourceFile: "Mark", bookId: "mrk", testament: "NT" },
  { sourceFile: "Luke", bookId: "luk", testament: "NT" },
  { sourceFile: "John", bookId: "jhn", testament: "NT" },
  { sourceFile: "Acts", bookId: "act", testament: "NT" },
  { sourceFile: "Romans", bookId: "rom", testament: "NT" },
  { sourceFile: "1 Corinthians", bookId: "1co", testament: "NT" },
  { sourceFile: "2 Corinthians", bookId: "2co", testament: "NT" },
  { sourceFile: "Galatians", bookId: "gal", testament: "NT" },
  { sourceFile: "Ephesians", bookId: "eph", testament: "NT" },
  { sourceFile: "Philippians", bookId: "php", testament: "NT" },
  { sourceFile: "Colossians", bookId: "col", testament: "NT" },
  { sourceFile: "1 Thessalonians", bookId: "1th", testament: "NT" },
  { sourceFile: "2 Thessalonians", bookId: "2th", testament: "NT" },
  { sourceFile: "1 Timothy", bookId: "1ti", testament: "NT" },
  { sourceFile: "2 Timothy", bookId: "2ti", testament: "NT" },
  { sourceFile: "Titus", bookId: "tit", testament: "NT" },
  { sourceFile: "Philemon", bookId: "phm", testament: "NT" },
  { sourceFile: "Hebrews", bookId: "heb", testament: "NT" },
  { sourceFile: "James", bookId: "jas", testament: "NT" },
  { sourceFile: "1 Peter", bookId: "1pe", testament: "NT" },
  { sourceFile: "2 Peter", bookId: "2pe", testament: "NT" },
  { sourceFile: "1 John", bookId: "1jn", testament: "NT" },
  { sourceFile: "2 John", bookId: "2jn", testament: "NT" },
  { sourceFile: "3 John", bookId: "3jn", testament: "NT" },
  { sourceFile: "Jude", bookId: "jud", testament: "NT" },
  { sourceFile: "Revelation", bookId: "rev", testament: "NT" },
];

// ── Paths ──
const ROOT = join(import.meta.dirname!, "..");
const SOURCE_DIR = join(ROOT, "data/kjv-1611/Bible-kjv-1611-main");
const OUTPUT_DIR = join(ROOT, "public/bibles/kjv1611");

// ── Source JSON shape (from aruljohn's repo) ──
interface SourceBook {
  book: string;
  "chapter-count": string;
  chapters: {
    chapter: number;
    verses: { verse: number; text: string }[];
  }[];
}

function convert() {
  console.log("Converting KJV 1611...\n");

  // Track what we successfully convert for the manifest
  const manifestBooks: {
    id: string;
    name: string;
    chapters: number;
    testament: "OT" | "DC" | "NT";
  }[] = [];

  let totalChapters = 0;

  for (const mapping of BOOK_MAP) {
    const sourcePath = join(SOURCE_DIR, `${mapping.sourceFile}.json`);

    if (!existsSync(sourcePath)) {
      console.warn(`  SKIP: ${mapping.sourceFile}.json not found`);
      continue;
    }

    // Read and parse the source file
    const raw = readFileSync(sourcePath, "utf-8");
    const sourceBook: SourceBook = JSON.parse(raw);

    // Create the output directory for this book
    const bookDir = join(OUTPUT_DIR, mapping.bookId);
    mkdirSync(bookDir, { recursive: true });

    // Write one JSON file per chapter
    for (const chapter of sourceBook.chapters) {
      const chapterData = {
        translation: "kjv1611",
        book: mapping.bookId,
        bookName: mapping.sourceFile,
        chapter: chapter.chapter,
        verses: chapter.verses.map((v) => ({
          number: v.verse,
          text: v.text,
        })),
      };

      const outPath = join(bookDir, `${chapter.chapter}.json`);
      writeFileSync(outPath, JSON.stringify(chapterData), "utf-8");
      totalChapters++;
    }

    manifestBooks.push({
      id: mapping.bookId,
      name: mapping.sourceFile,
      chapters: sourceBook.chapters.length,
      testament: mapping.testament,
    });

    console.log(
      `  ${mapping.sourceFile} → ${mapping.bookId}/ (${sourceBook.chapters.length} chapters)`,
    );
  }

  // Write the manifest
  const manifest = {
    translation: "kjv1611",
    name: "King James Version (1611)",
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
    `\nDone! ${manifestBooks.length} books, ${totalChapters} chapter files written to public/bibles/kjv1611/`,
  );
}

convert();
