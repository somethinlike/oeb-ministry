/**
 * Bible Download Script
 *
 * Downloads Bible text from bible-api.com and converts it to our
 * chapter-level JSON schema in /public/bibles/.
 *
 * Usage: npx tsx scripts/download-bible.ts [translation]
 * Example: npx tsx scripts/download-bible.ts oeb-us
 *
 * Features:
 * - Rate-limited (15 requests per 30 seconds) to be respectful to the API
 * - Resumable: skips chapters that already have JSON files
 * - Handles missing books gracefully (OEB doesn't have all 66 books)
 * - Generates a manifest.json for each translation
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// ── Types for the bible-api.com response ──

interface BibleApiVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleApiResponse {
  reference: string;
  verses: BibleApiVerse[];
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

// ── Our output types (matching src/types/bible.ts) ──

interface ChapterOutput {
  translation: string;
  book: string;
  bookName: string;
  chapter: number;
  verses: { number: number; text: string }[];
}

interface BookEntry {
  id: string;
  name: string;
  chapters: number;
  testament: "OT" | "NT";
}

interface ManifestOutput {
  translation: string;
  name: string;
  language: string;
  license: string;
  books: BookEntry[];
}

// ── Book definitions with bible-api.com naming ──
// bible-api.com uses full book names in the URL path

const BOOKS_CONFIG: {
  id: string;
  apiName: string;
  displayName: string;
  chapters: number;
  testament: "OT" | "NT";
}[] = [
  // Old Testament
  { id: "gen", apiName: "Genesis", displayName: "Genesis", chapters: 50, testament: "OT" },
  { id: "exo", apiName: "Exodus", displayName: "Exodus", chapters: 40, testament: "OT" },
  { id: "lev", apiName: "Leviticus", displayName: "Leviticus", chapters: 27, testament: "OT" },
  { id: "num", apiName: "Numbers", displayName: "Numbers", chapters: 36, testament: "OT" },
  { id: "deu", apiName: "Deuteronomy", displayName: "Deuteronomy", chapters: 34, testament: "OT" },
  { id: "jos", apiName: "Joshua", displayName: "Joshua", chapters: 24, testament: "OT" },
  { id: "jdg", apiName: "Judges", displayName: "Judges", chapters: 21, testament: "OT" },
  { id: "rut", apiName: "Ruth", displayName: "Ruth", chapters: 4, testament: "OT" },
  { id: "1sa", apiName: "1 Samuel", displayName: "1 Samuel", chapters: 31, testament: "OT" },
  { id: "2sa", apiName: "2 Samuel", displayName: "2 Samuel", chapters: 24, testament: "OT" },
  { id: "1ki", apiName: "1 Kings", displayName: "1 Kings", chapters: 22, testament: "OT" },
  { id: "2ki", apiName: "2 Kings", displayName: "2 Kings", chapters: 25, testament: "OT" },
  { id: "1ch", apiName: "1 Chronicles", displayName: "1 Chronicles", chapters: 29, testament: "OT" },
  { id: "2ch", apiName: "2 Chronicles", displayName: "2 Chronicles", chapters: 36, testament: "OT" },
  { id: "ezr", apiName: "Ezra", displayName: "Ezra", chapters: 10, testament: "OT" },
  { id: "neh", apiName: "Nehemiah", displayName: "Nehemiah", chapters: 13, testament: "OT" },
  { id: "est", apiName: "Esther", displayName: "Esther", chapters: 10, testament: "OT" },
  { id: "job", apiName: "Job", displayName: "Job", chapters: 42, testament: "OT" },
  { id: "psa", apiName: "Psalms", displayName: "Psalms", chapters: 150, testament: "OT" },
  { id: "pro", apiName: "Proverbs", displayName: "Proverbs", chapters: 31, testament: "OT" },
  { id: "ecc", apiName: "Ecclesiastes", displayName: "Ecclesiastes", chapters: 12, testament: "OT" },
  { id: "sng", apiName: "Song of Solomon", displayName: "Song of Solomon", chapters: 8, testament: "OT" },
  { id: "isa", apiName: "Isaiah", displayName: "Isaiah", chapters: 66, testament: "OT" },
  { id: "jer", apiName: "Jeremiah", displayName: "Jeremiah", chapters: 52, testament: "OT" },
  { id: "lam", apiName: "Lamentations", displayName: "Lamentations", chapters: 5, testament: "OT" },
  { id: "ezk", apiName: "Ezekiel", displayName: "Ezekiel", chapters: 48, testament: "OT" },
  { id: "dan", apiName: "Daniel", displayName: "Daniel", chapters: 12, testament: "OT" },
  { id: "hos", apiName: "Hosea", displayName: "Hosea", chapters: 14, testament: "OT" },
  { id: "jol", apiName: "Joel", displayName: "Joel", chapters: 3, testament: "OT" },
  { id: "amo", apiName: "Amos", displayName: "Amos", chapters: 9, testament: "OT" },
  { id: "oba", apiName: "Obadiah", displayName: "Obadiah", chapters: 1, testament: "OT" },
  { id: "jon", apiName: "Jonah", displayName: "Jonah", chapters: 4, testament: "OT" },
  { id: "mic", apiName: "Micah", displayName: "Micah", chapters: 7, testament: "OT" },
  { id: "nah", apiName: "Nahum", displayName: "Nahum", chapters: 3, testament: "OT" },
  { id: "hab", apiName: "Habakkuk", displayName: "Habakkuk", chapters: 3, testament: "OT" },
  { id: "zep", apiName: "Zephaniah", displayName: "Zephaniah", chapters: 3, testament: "OT" },
  { id: "hag", apiName: "Haggai", displayName: "Haggai", chapters: 2, testament: "OT" },
  { id: "zec", apiName: "Zechariah", displayName: "Zechariah", chapters: 14, testament: "OT" },
  { id: "mal", apiName: "Malachi", displayName: "Malachi", chapters: 4, testament: "OT" },
  // New Testament
  { id: "mat", apiName: "Matthew", displayName: "Matthew", chapters: 28, testament: "NT" },
  { id: "mrk", apiName: "Mark", displayName: "Mark", chapters: 16, testament: "NT" },
  { id: "luk", apiName: "Luke", displayName: "Luke", chapters: 24, testament: "NT" },
  { id: "jhn", apiName: "John", displayName: "John", chapters: 21, testament: "NT" },
  { id: "act", apiName: "Acts", displayName: "Acts", chapters: 28, testament: "NT" },
  { id: "rom", apiName: "Romans", displayName: "Romans", chapters: 16, testament: "NT" },
  { id: "1co", apiName: "1 Corinthians", displayName: "1 Corinthians", chapters: 16, testament: "NT" },
  { id: "2co", apiName: "2 Corinthians", displayName: "2 Corinthians", chapters: 13, testament: "NT" },
  { id: "gal", apiName: "Galatians", displayName: "Galatians", chapters: 6, testament: "NT" },
  { id: "eph", apiName: "Ephesians", displayName: "Ephesians", chapters: 6, testament: "NT" },
  { id: "php", apiName: "Philippians", displayName: "Philippians", chapters: 4, testament: "NT" },
  { id: "col", apiName: "Colossians", displayName: "Colossians", chapters: 4, testament: "NT" },
  { id: "1th", apiName: "1 Thessalonians", displayName: "1 Thessalonians", chapters: 5, testament: "NT" },
  { id: "2th", apiName: "2 Thessalonians", displayName: "2 Thessalonians", chapters: 3, testament: "NT" },
  { id: "1ti", apiName: "1 Timothy", displayName: "1 Timothy", chapters: 6, testament: "NT" },
  { id: "2ti", apiName: "2 Timothy", displayName: "2 Timothy", chapters: 4, testament: "NT" },
  { id: "tit", apiName: "Titus", displayName: "Titus", chapters: 3, testament: "NT" },
  { id: "phm", apiName: "Philemon", displayName: "Philemon", chapters: 1, testament: "NT" },
  { id: "heb", apiName: "Hebrews", displayName: "Hebrews", chapters: 13, testament: "NT" },
  { id: "jas", apiName: "James", displayName: "James", chapters: 5, testament: "NT" },
  { id: "1pe", apiName: "1 Peter", displayName: "1 Peter", chapters: 5, testament: "NT" },
  { id: "2pe", apiName: "2 Peter", displayName: "2 Peter", chapters: 3, testament: "NT" },
  { id: "1jn", apiName: "1 John", displayName: "1 John", chapters: 5, testament: "NT" },
  { id: "2jn", apiName: "2 John", displayName: "2 John", chapters: 1, testament: "NT" },
  { id: "3jn", apiName: "3 John", displayName: "3 John", chapters: 1, testament: "NT" },
  { id: "jud", apiName: "Jude", displayName: "Jude", chapters: 1, testament: "NT" },
  { id: "rev", apiName: "Revelation", displayName: "Revelation", chapters: 22, testament: "NT" },
];

// ── Translation metadata ──

const TRANSLATIONS: Record<string, { name: string; license: string }> = {
  "oeb-us": { name: "Open English Bible (US)", license: "CC0 / Public Domain" },
  "web": { name: "World English Bible", license: "Public Domain" },
};

// ── Rate limiter ──

const RATE_LIMIT_REQUESTS = 15;
const RATE_LIMIT_WINDOW_MS = 30_000;
let requestTimestamps: number[] = [];

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  // Remove timestamps older than the rate limit window
  requestTimestamps = requestTimestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );

  // If we're at the limit, wait until the oldest request falls out of the window
  if (requestTimestamps.length >= RATE_LIMIT_REQUESTS) {
    const oldestTimestamp = requestTimestamps[0];
    const waitTime = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp) + 100; // +100ms buffer
    console.log(`  ⏳ Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  requestTimestamps.push(Date.now());
  return fetch(url);
}

// ── Main download logic ──

async function downloadTranslation(translationId: string): Promise<void> {
  const translationMeta = TRANSLATIONS[translationId];
  if (!translationMeta) {
    console.error(`Unknown translation: ${translationId}`);
    console.error(`Available: ${Object.keys(TRANSLATIONS).join(", ")}`);
    process.exit(1);
  }

  const outputBase = join(process.cwd(), "public", "bibles", translationId);
  const successfulBooks: BookEntry[] = [];
  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  console.log(`\n📖 Downloading ${translationMeta.name} (${translationId})`);
  console.log(`   Output: ${outputBase}\n`);

  for (const book of BOOKS_CONFIG) {
    const bookDir = join(outputBase, book.id);
    let bookHasChapters = false;

    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      const outputPath = join(bookDir, `${chapter}.json`);

      // Skip if file already exists (resumable downloads)
      if (existsSync(outputPath)) {
        skippedCount++;
        bookHasChapters = true;
        continue;
      }

      // Build the API URL — bible-api.com uses "Book Chapter" format
      const apiBookName = encodeURIComponent(book.apiName);
      const url = `https://bible-api.com/${apiBookName}+${chapter}?translation=${translationId}`;

      try {
        const response = await rateLimitedFetch(url);

        if (!response.ok) {
          // 404 means this translation doesn't have this book (common for OEB)
          if (response.status === 404) {
            console.log(`  ⚠️  ${book.displayName} ${chapter} — not available`);
            failedCount++;
            continue;
          }
          console.error(`  ❌ ${book.displayName} ${chapter} — HTTP ${response.status}`);
          failedCount++;
          continue;
        }

        const data = (await response.json()) as BibleApiResponse;

        // Convert to our schema
        const chapterData: ChapterOutput = {
          translation: translationId,
          book: book.id,
          bookName: book.displayName,
          chapter,
          verses: data.verses.map((v) => ({
            number: v.verse,
            text: v.text.trim(),
          })),
        };

        // Write the chapter file
        mkdirSync(bookDir, { recursive: true });
        writeFileSync(outputPath, JSON.stringify(chapterData, null, 2));
        downloadedCount++;
        bookHasChapters = true;

        console.log(
          `  ✅ ${book.displayName} ${chapter} (${chapterData.verses.length} verses)`,
        );
      } catch (error) {
        console.error(
          `  ❌ ${book.displayName} ${chapter} — ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        failedCount++;
      }
    }

    // Track books that have at least one chapter downloaded
    if (bookHasChapters) {
      // Count actual chapter files to get accurate chapter count
      let actualChapters = 0;
      for (let c = 1; c <= book.chapters; c++) {
        if (existsSync(join(bookDir, `${c}.json`))) {
          actualChapters++;
        }
      }
      successfulBooks.push({
        id: book.id,
        name: book.displayName,
        chapters: actualChapters,
        testament: book.testament,
      });
    }
  }

  // Write the manifest
  const manifest: ManifestOutput = {
    translation: translationId,
    name: translationMeta.name,
    language: "en",
    license: translationMeta.license,
    books: successfulBooks,
  };

  mkdirSync(outputBase, { recursive: true });
  writeFileSync(
    join(outputBase, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  console.log(`\n📊 Summary for ${translationId}:`);
  console.log(`   Downloaded: ${downloadedCount} chapters`);
  console.log(`   Skipped (existing): ${skippedCount} chapters`);
  console.log(`   Failed/unavailable: ${failedCount} chapters`);
  console.log(`   Books in manifest: ${successfulBooks.length}`);
  console.log(`   Manifest written to: ${join(outputBase, "manifest.json")}\n`);
}

// ── CLI entry point ──

const translationArg = process.argv[2];

if (!translationArg) {
  console.log("Usage: npx tsx scripts/download-bible.ts <translation>");
  console.log(`Available translations: ${Object.keys(TRANSLATIONS).join(", ")}`);
  process.exit(0);
}

downloadTranslation(translationArg);
