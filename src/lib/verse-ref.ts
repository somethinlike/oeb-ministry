/**
 * Verse reference parsing and formatting utilities.
 *
 * Canonical format: "translation:book:chapter:verse"
 * Examples: "oeb-us:jhn:3:16", "web:gen:1:1"
 *
 * These functions convert between the string format (used in URLs, database
 * records, and cross-references) and the VerseRef object (used in code).
 */

import type { BookId, VerseRef } from "../types/bible";
import { BOOK_BY_ID, VALID_BOOK_IDS } from "./constants";

/** Result of parsing a verse ref — either success with data, or failure with a reason. */
export type ParseResult =
  | { ok: true; ref: VerseRef }
  | { ok: false; error: string };

/**
 * Parses a canonical verse reference string into a VerseRef object.
 *
 * @example
 * parseVerseRef("oeb-us:jhn:3:16")
 * // → { ok: true, ref: { translation: "oeb-us", book: "jhn", chapter: 3, verse: 16 } }
 *
 * parseVerseRef("bad-input")
 * // → { ok: false, error: "Expected format translation:book:chapter:verse" }
 */
export function parseVerseRef(input: string): ParseResult {
  // Trim whitespace to be forgiving of copy-paste sloppiness
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    return { ok: false, error: "Verse reference cannot be empty" };
  }

  const parts = trimmed.split(":");

  if (parts.length !== 4) {
    return {
      ok: false,
      error: "Expected format translation:book:chapter:verse",
    };
  }

  const [translation, book, chapterStr, verseStr] = parts;

  // Validate translation isn't empty
  if (!translation) {
    return { ok: false, error: "Translation cannot be empty" };
  }

  // Validate book ID exists in our canon
  if (!VALID_BOOK_IDS.has(book)) {
    return { ok: false, error: `Unknown book "${book}"` };
  }

  // Parse chapter number — must be a positive integer
  const chapter = Number(chapterStr);
  if (!Number.isInteger(chapter) || chapter < 1) {
    return { ok: false, error: "Chapter must be a positive integer" };
  }

  // Parse verse number — must be a positive integer
  const verse = Number(verseStr);
  if (!Number.isInteger(verse) || verse < 1) {
    return { ok: false, error: "Verse must be a positive integer" };
  }

  // Validate chapter is within the book's range
  const bookInfo = BOOK_BY_ID.get(book as BookId);
  if (bookInfo && chapter > bookInfo.chapters) {
    return {
      ok: false,
      error: `${bookInfo.name} only has ${bookInfo.chapters} chapters`,
    };
  }

  return {
    ok: true,
    ref: {
      translation,
      book: book as BookId,
      chapter,
      verse,
    },
  };
}

/**
 * Formats a VerseRef object into the canonical string format.
 *
 * @example
 * formatVerseRef({ translation: "oeb-us", book: "jhn", chapter: 3, verse: 16 })
 * // → "oeb-us:jhn:3:16"
 */
export function formatVerseRef(ref: VerseRef): string {
  return `${ref.translation}:${ref.book}:${ref.chapter}:${ref.verse}`;
}

/**
 * Returns a human-readable display string for a verse reference.
 * Used in the UI where users see "John 3:16" instead of "oeb-us:jhn:3:16".
 *
 * @example
 * displayVerseRef({ translation: "oeb-us", book: "jhn", chapter: 3, verse: 16 })
 * // → "John 3:16"
 */
export function displayVerseRef(ref: VerseRef): string {
  const bookInfo = BOOK_BY_ID.get(ref.book);
  const bookName = bookInfo?.name ?? ref.book;
  return `${bookName} ${ref.chapter}:${ref.verse}`;
}

/**
 * Checks whether a string is a valid book ID.
 * Useful for validating user input or URL parameters.
 */
export function isValidBookId(id: string): id is BookId {
  return VALID_BOOK_IDS.has(id);
}
