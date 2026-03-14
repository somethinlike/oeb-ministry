/**
 * Types for user-uploaded Bible translations.
 *
 * Users can upload their own Bible translations (EPUB or plain text)
 * which get parsed and stored in IndexedDB. These types define the
 * shape of that data at every stage: parsed input, stored manifest,
 * and stored chapter data.
 *
 * User translations are identified by a "user-" prefix on the ID
 * (e.g., "user-nrsvue") to avoid collision with built-in translations.
 */

import type { BookId, BookInfo, Verse } from "./bible";

/**
 * Manifest for a user-uploaded translation, stored in IndexedDB.
 * Extends the same shape as built-in TranslationManifest so the
 * UI can treat them uniformly where possible.
 */
export interface UserTranslationManifest {
  /** Translation ID — always starts with "user-" (e.g., "user-nrsvue") */
  translation: string;
  /** User-chosen display name (e.g., "NRSVUE") */
  name: string;
  /** Short abbreviation for the picker (e.g., "NRSV") */
  abbreviation: string;
  /** ISO language code (defaults to "en") */
  language: string;
  /** License info (user-provided or "Personal use") */
  license: string;
  /** Books available in this translation */
  books: BookInfo[];
  /** When the user uploaded this translation */
  uploadedAt: string;
  /** Original filename of the uploaded file */
  originalFilename: string;
  /** What kind of file was uploaded */
  fileType: "epub" | "text";
}

/**
 * A single parsed chapter — the intermediate format between
 * parsing and storing in IndexedDB.
 */
export interface ParsedChapter {
  chapter: number;
  verses: Verse[];
}

/**
 * A parsed book — contains all chapters found for one book.
 */
export interface ParsedBook {
  /** Resolved BookId (e.g., "jhn") */
  bookId: BookId;
  /** The original book name as found in the file */
  originalName: string;
  /** Chapters in order */
  chapters: ParsedChapter[];
}

/**
 * The result of parsing an uploaded Bible file.
 * Contains all the books/chapters found, plus any warnings
 * about content that couldn't be parsed.
 */
export interface ParseResult {
  /** Successfully parsed books */
  books: ParsedBook[];
  /** Warnings about content that was skipped or couldn't be resolved */
  warnings: string[];
}

/**
 * The shape of a chapter stored in IndexedDB's user-translation-chapters store.
 * Composite key: [translation, book, chapter].
 */
export interface StoredUserChapter {
  /** Translation ID (e.g., "user-nrsvue") */
  translation: string;
  /** BookId (e.g., "jhn") */
  book: string;
  /** Chapter number */
  chapter: number;
  /** The book's display name (e.g., "John") */
  bookName: string;
  /** Verse data — same shape as ChapterData.verses */
  verses: Verse[];
}
