/**
 * Plain text Bible parser.
 *
 * Parses .txt files containing Bible text in common formats:
 *
 * Format 1: "Book Chapter:Verse text" (one verse per line)
 *   Genesis 1:1 In the beginning God created the heavens and the earth.
 *   Genesis 1:2 And the earth was without form...
 *
 * Format 2: Book headers + "Chapter N" markers + verse-per-line
 *   Genesis
 *   Chapter 1
 *   1 In the beginning God created the heavens and the earth.
 *   2 And the earth was without form...
 *
 * The parser auto-detects which format is being used.
 */

import type { ParseResult, ParsedBook, ParsedChapter } from "../types/user-translation";
import type { BookId, Verse } from "../types/bible";
import { resolveBookName } from "./book-name-aliases";

/**
 * Regex for Format 1: "Book Chapter:Verse text"
 * Captures: [bookName] [chapter]:[verse] [text]
 *
 * The book name can include numbers and spaces (e.g., "1 Samuel", "Song of Solomon").
 * We greedily match the book name up to the last occurrence of a digit:digit pattern.
 */
const FORMAT1_REGEX = /^(.+?)\s+(\d+):(\d+)\s+(.+)$/;

/**
 * Regex for chapter headers in Format 2: "Chapter N" or "CHAPTER N"
 */
const CHAPTER_HEADER_REGEX = /^chapter\s+(\d+)$/i;

/**
 * Regex for verse lines in Format 2: starts with verse number
 */
const VERSE_LINE_REGEX = /^(\d+)\s+(.+)$/;

/**
 * Parse a plain text Bible file.
 *
 * Auto-detects the format by checking the first few non-empty lines.
 * Returns a ParseResult with books, chapters, and verses, plus any
 * warnings about lines that couldn't be parsed.
 */
export async function parseTextBible(file: File): Promise<ParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);

  // Detect format by checking first few content lines
  const format = detectFormat(lines);

  if (format === "format1") {
    return parseFormat1(lines);
  }
  return parseFormat2(lines);
}

/**
 * Detect which format the file uses by checking the first few non-empty lines.
 */
function detectFormat(lines: string[]): "format1" | "format2" {
  // Check the first 10 non-empty lines for Format 1 patterns
  let format1Matches = 0;
  let checked = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (checked >= 10) break;
    checked++;

    if (FORMAT1_REGEX.test(trimmed)) {
      format1Matches++;
    }
  }

  // If most lines match Format 1, use it
  return format1Matches >= checked / 2 ? "format1" : "format2";
}

/**
 * Parse Format 1: "Book Chapter:Verse text" (one verse per line)
 */
function parseFormat1(lines: string[]): ParseResult {
  const warnings: string[] = [];
  // Group verses by book → chapter
  const bookMap = new Map<BookId, Map<number, Verse[]>>();
  const bookOriginalNames = new Map<BookId, string>();

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const match = trimmed.match(FORMAT1_REGEX);
    if (!match) {
      // Only warn for lines that look like they should be verse content
      if (trimmed.length > 5) {
        warnings.push(`Line ${i + 1}: Could not parse "${trimmed.slice(0, 60)}..."`);
      }
      continue;
    }

    const [, rawBookName, chapterStr, verseStr, text] = match;
    const bookId = resolveBookName(rawBookName);

    if (!bookId) {
      warnings.push(`Line ${i + 1}: Unknown book "${rawBookName}"`);
      continue;
    }

    const chapter = parseInt(chapterStr, 10);
    const verseNum = parseInt(verseStr, 10);

    if (!bookMap.has(bookId)) {
      bookMap.set(bookId, new Map());
      bookOriginalNames.set(bookId, rawBookName.trim());
    }

    const chapters = bookMap.get(bookId)!;
    if (!chapters.has(chapter)) {
      chapters.set(chapter, []);
    }
    chapters.get(chapter)!.push({ number: verseNum, text: text.trim() });
  }

  return buildResult(bookMap, bookOriginalNames, warnings);
}

/**
 * Parse Format 2: Book headers + "Chapter N" markers + verse-per-line
 */
function parseFormat2(lines: string[]): ParseResult {
  const warnings: string[] = [];
  const bookMap = new Map<BookId, Map<number, Verse[]>>();
  const bookOriginalNames = new Map<BookId, string>();

  let currentBookId: BookId | null = null;
  let currentBookName = "";
  let currentChapter = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Check for chapter header
    const chapterMatch = trimmed.match(CHAPTER_HEADER_REGEX);
    if (chapterMatch) {
      currentChapter = parseInt(chapterMatch[1], 10);
      continue;
    }

    // Check for verse line (starts with a number)
    const verseMatch = trimmed.match(VERSE_LINE_REGEX);
    if (verseMatch && currentBookId && currentChapter > 0) {
      const verseNum = parseInt(verseMatch[1], 10);
      const text = verseMatch[2].trim();

      if (!bookMap.has(currentBookId)) {
        bookMap.set(currentBookId, new Map());
        bookOriginalNames.set(currentBookId, currentBookName);
      }

      const chapters = bookMap.get(currentBookId)!;
      if (!chapters.has(currentChapter)) {
        chapters.set(currentChapter, []);
      }
      chapters.get(currentChapter)!.push({ number: verseNum, text });
      continue;
    }

    // Try to resolve as a book name (a line that's just a book name)
    const bookId = resolveBookName(trimmed);
    if (bookId) {
      currentBookId = bookId;
      currentBookName = trimmed;
      currentChapter = 0; // Reset chapter for new book
      continue;
    }

    // If we have an active book/chapter context, this might be a verse
    // without a number (continuation or alternate format) — skip quietly
    if (!currentBookId && trimmed.length > 3) {
      // Only warn about unrecognized lines before any book is identified
      warnings.push(`Line ${i + 1}: Could not parse "${trimmed.slice(0, 60)}"`);
    }
  }

  return buildResult(bookMap, bookOriginalNames, warnings);
}

/**
 * Convert the intermediate book map into a ParseResult.
 */
function buildResult(
  bookMap: Map<BookId, Map<number, Verse[]>>,
  bookOriginalNames: Map<BookId, string>,
  warnings: string[],
): ParseResult {
  const books: ParsedBook[] = [];

  for (const [bookId, chapterMap] of bookMap) {
    const chapters: ParsedChapter[] = [];
    // Sort chapters numerically
    const sortedChapters = [...chapterMap.entries()].sort((a, b) => a[0] - b[0]);

    for (const [chapterNum, verses] of sortedChapters) {
      // Sort verses numerically
      verses.sort((a, b) => a.number - b.number);
      chapters.push({ chapter: chapterNum, verses });
    }

    books.push({
      bookId,
      originalName: bookOriginalNames.get(bookId) ?? bookId,
      chapters,
    });
  }

  return { books, warnings };
}
