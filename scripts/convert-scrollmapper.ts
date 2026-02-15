/**
 * Converts Bible translations from the scrollmapper/bible_databases
 * JSON format into per-chapter JSON files for the app.
 *
 * Input:  data/scrollmapper/bible_databases-master/formats/json/{ID}.json
 * Output: public/bibles/{id}/{bookId}/{chapter}.json + manifest.json
 *
 * Run with: npx tsx scripts/convert-scrollmapper.ts
 *
 * To add more translations, add an entry to the TRANSLATIONS array below.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// ── Which translations to convert ──
// Add entries here to convert more translations from scrollmapper.
// The `id` becomes the folder name under public/bibles/.

interface TranslationConfig {
  sourceFile: string;   // Filename in scrollmapper's json/ folder (without .json)
  id: string;           // Our internal translation ID
  name: string;         // Display name
  license: string;      // License string
  hasApocrypha: boolean; // For sorting in the translation picker
}

const TRANSLATIONS: TranslationConfig[] = [
  {
    sourceFile: "DRC",
    id: "dra",
    name: "Douay-Rheims American Edition",
    license: "Public Domain",
    hasApocrypha: true,
  },
];

// ── Map from scrollmapper book names to our BookId ──
// Scrollmapper uses full names (sometimes with Roman numerals).
// This maps every known name to our three-letter code + testament.

const BOOK_NAME_MAP: Record<string, { bookId: string; testament: "OT" | "DC" | "NT" }> = {
  // Old Testament
  "Genesis": { bookId: "gen", testament: "OT" },
  "Exodus": { bookId: "exo", testament: "OT" },
  "Leviticus": { bookId: "lev", testament: "OT" },
  "Numbers": { bookId: "num", testament: "OT" },
  "Deuteronomy": { bookId: "deu", testament: "OT" },
  "Joshua": { bookId: "jos", testament: "OT" },
  "Judges": { bookId: "jdg", testament: "OT" },
  "Ruth": { bookId: "rut", testament: "OT" },
  "I Samuel": { bookId: "1sa", testament: "OT" },
  "II Samuel": { bookId: "2sa", testament: "OT" },
  "I Kings": { bookId: "1ki", testament: "OT" },
  "II Kings": { bookId: "2ki", testament: "OT" },
  "I Chronicles": { bookId: "1ch", testament: "OT" },
  "II Chronicles": { bookId: "2ch", testament: "OT" },
  "Ezra": { bookId: "ezr", testament: "OT" },
  "Nehemiah": { bookId: "neh", testament: "OT" },
  "Esther": { bookId: "est", testament: "OT" },
  "Job": { bookId: "job", testament: "OT" },
  "Psalms": { bookId: "psa", testament: "OT" },
  "Proverbs": { bookId: "pro", testament: "OT" },
  "Ecclesiastes": { bookId: "ecc", testament: "OT" },
  "Song of Solomon": { bookId: "sng", testament: "OT" },
  "Isaiah": { bookId: "isa", testament: "OT" },
  "Jeremiah": { bookId: "jer", testament: "OT" },
  "Lamentations": { bookId: "lam", testament: "OT" },
  "Ezekiel": { bookId: "ezk", testament: "OT" },
  "Daniel": { bookId: "dan", testament: "OT" },
  "Hosea": { bookId: "hos", testament: "OT" },
  "Joel": { bookId: "jol", testament: "OT" },
  "Amos": { bookId: "amo", testament: "OT" },
  "Obadiah": { bookId: "oba", testament: "OT" },
  "Jonah": { bookId: "jon", testament: "OT" },
  "Micah": { bookId: "mic", testament: "OT" },
  "Nahum": { bookId: "nah", testament: "OT" },
  "Habakkuk": { bookId: "hab", testament: "OT" },
  "Zephaniah": { bookId: "zep", testament: "OT" },
  "Haggai": { bookId: "hag", testament: "OT" },
  "Zechariah": { bookId: "zec", testament: "OT" },
  "Malachi": { bookId: "mal", testament: "OT" },
  // Deuterocanon / Apocrypha
  "Tobit": { bookId: "tob", testament: "DC" },
  "Judith": { bookId: "jdt", testament: "DC" },
  "Wisdom": { bookId: "wis", testament: "DC" },
  "Wisdom of Solomon": { bookId: "wis", testament: "DC" },
  "Sirach": { bookId: "sir", testament: "DC" },
  "Ecclesiasticus": { bookId: "sir", testament: "DC" },
  "Baruch": { bookId: "bar", testament: "DC" },
  "I Maccabees": { bookId: "1ma", testament: "DC" },
  "II Maccabees": { bookId: "2ma", testament: "DC" },
  "I Esdras": { bookId: "1es", testament: "DC" },
  "II Esdras": { bookId: "2es", testament: "DC" },
  "Prayer of Manasses": { bookId: "pma", testament: "DC" },
  "Additional Psalm": { bookId: "p15", testament: "DC" },
  // Note: DRC has Esther with 16 chapters (includes Greek additions)
  // and Daniel with 14 chapters (includes additions). We map these to
  // the main book IDs since the additions are integrated into the chapters.
  // New Testament
  "Matthew": { bookId: "mat", testament: "NT" },
  "Mark": { bookId: "mrk", testament: "NT" },
  "Luke": { bookId: "luk", testament: "NT" },
  "John": { bookId: "jhn", testament: "NT" },
  "Acts": { bookId: "act", testament: "NT" },
  "Romans": { bookId: "rom", testament: "NT" },
  "I Corinthians": { bookId: "1co", testament: "NT" },
  "II Corinthians": { bookId: "2co", testament: "NT" },
  "Galatians": { bookId: "gal", testament: "NT" },
  "Ephesians": { bookId: "eph", testament: "NT" },
  "Philippians": { bookId: "php", testament: "NT" },
  "Colossians": { bookId: "col", testament: "NT" },
  "I Thessalonians": { bookId: "1th", testament: "NT" },
  "II Thessalonians": { bookId: "2th", testament: "NT" },
  "I Timothy": { bookId: "1ti", testament: "NT" },
  "II Timothy": { bookId: "2ti", testament: "NT" },
  "Titus": { bookId: "tit", testament: "NT" },
  "Philemon": { bookId: "phm", testament: "NT" },
  "Hebrews": { bookId: "heb", testament: "NT" },
  "James": { bookId: "jas", testament: "NT" },
  "I Peter": { bookId: "1pe", testament: "NT" },
  "II Peter": { bookId: "2pe", testament: "NT" },
  "I John": { bookId: "1jn", testament: "NT" },
  "II John": { bookId: "2jn", testament: "NT" },
  "III John": { bookId: "3jn", testament: "NT" },
  "Jude": { bookId: "jud", testament: "NT" },
  "Revelation of John": { bookId: "rev", testament: "NT" },
  "Revelation": { bookId: "rev", testament: "NT" },
};

// Books we intentionally skip (not in our canon support yet)
const SKIP_BOOKS = new Set(["Laodiceans"]);

// ── Paths ──
const ROOT = join(import.meta.dirname!, "..");
const SOURCE_DIR = join(
  ROOT,
  "data/scrollmapper/bible_databases-master/formats/json",
);

// ── Source JSON shape (from scrollmapper) ──
interface SourceData {
  translation: string;
  books: {
    name: string;
    chapters: {
      chapter: number;
      verses: { verse: number; text: string }[];
    }[];
  }[];
}

function convertTranslation(config: TranslationConfig) {
  const sourcePath = join(SOURCE_DIR, `${config.sourceFile}.json`);

  if (!existsSync(sourcePath)) {
    console.error(`  ERROR: ${config.sourceFile}.json not found`);
    return;
  }

  console.log(`\nConverting ${config.name} (${config.sourceFile})...`);

  const raw = readFileSync(sourcePath, "utf-8");
  const sourceData: SourceData = JSON.parse(raw);

  const outputDir = join(ROOT, "public/bibles", config.id);

  const manifestBooks: {
    id: string;
    name: string;
    chapters: number;
    testament: "OT" | "DC" | "NT";
  }[] = [];

  let totalChapters = 0;

  for (const book of sourceData.books) {
    // Skip books we don't support
    if (SKIP_BOOKS.has(book.name)) {
      console.log(`  SKIP: ${book.name} (not in supported canon)`);
      continue;
    }

    const mapping = BOOK_NAME_MAP[book.name];
    if (!mapping) {
      console.warn(`  UNKNOWN: "${book.name}" — no mapping defined, skipping`);
      continue;
    }

    // Create book directory
    const bookDir = join(outputDir, mapping.bookId);
    mkdirSync(bookDir, { recursive: true });

    // Write one JSON file per chapter
    for (const chapter of book.chapters) {
      const chapterData = {
        translation: config.id,
        book: mapping.bookId,
        bookName: book.name,
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
      name: book.name,
      chapters: book.chapters.length,
      testament: mapping.testament,
    });

    console.log(
      `  ${book.name} → ${mapping.bookId}/ (${book.chapters.length} chapters)`,
    );
  }

  // Write manifest
  const manifest = {
    translation: config.id,
    name: config.name,
    language: "en",
    license: config.license,
    books: manifestBooks,
  };

  writeFileSync(
    join(outputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );

  console.log(
    `\nDone! ${manifestBooks.length} books, ${totalChapters} chapter files → public/bibles/${config.id}/`,
  );
}

// ── Run ──
for (const config of TRANSLATIONS) {
  convertTranslation(config);
}
