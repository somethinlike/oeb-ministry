/**
 * User-uploaded Bible translations — IndexedDB CRUD layer.
 *
 * Handles saving, retrieving, and deleting user translations stored
 * in the browser's IndexedDB. User translations have IDs prefixed
 * with "user-" to distinguish them from built-in translations.
 *
 * Data lives in two stores:
 * - "user-translation-manifests" — one record per translation (metadata + book list)
 * - "user-translation-chapters" — individual chapter data (verse text)
 */

import { getDb } from "./idb";
import type {
  UserTranslationManifest,
  StoredUserChapter,
  ParseResult,
  ParsedBook,
} from "../types/user-translation";
import type { BookId, BookInfo, ChapterData } from "../types/bible";
import { BOOK_BY_ID } from "./constants";

/**
 * Check if a translation ID belongs to a user-uploaded translation.
 * User translations always start with "user-".
 */
export function isUserTranslation(translationId: string): boolean {
  return translationId.startsWith("user-");
}

/**
 * Save a fully parsed translation to IndexedDB (merge-aware).
 *
 * Additive merge: new chapters are written via put() (overlapping chapters
 * update, existing ones are untouched). The manifest's book list is then
 * rebuilt from ALL stored chapters for this translation, so previous
 * uploads are never lost.
 *
 * If an existing manifest is found, its identity fields (name, abbreviation,
 * uploadedAt) are preserved so the translation keeps its original metadata.
 *
 * @param manifest - The translation metadata
 * @param parseResult - The parsed books and chapters
 */
export async function saveUserTranslation(
  manifest: UserTranslationManifest,
  parseResult: ParseResult,
): Promise<void> {
  const db = await getDb();

  // 1. Save new chapters — put() is additive (updates overlapping, keeps others)
  const writeTx = db.transaction("user-translation-chapters", "readwrite");
  for (const book of parseResult.books) {
    const builtIn = BOOK_BY_ID.get(book.bookId);
    for (const chapter of book.chapters) {
      const record: StoredUserChapter = {
        translation: manifest.translation,
        book: book.bookId,
        chapter: chapter.chapter,
        bookName: builtIn?.name ?? book.originalName,
        verses: chapter.verses,
      };
      writeTx.store.put(record);
    }
  }
  await writeTx.done;

  // 2. Scan ALL stored chapters for this translation to rebuild the book list
  const readTx = db.transaction("user-translation-chapters", "readonly");
  const index = readTx.store.index("by-translation");
  const allChapters: StoredUserChapter[] = await index.getAll(manifest.translation);
  await readTx.done;

  // 3. Rebuild books array from the full set of chapters (old + new)
  const bookMap = new Map<string, { name: string; maxChapter: number; testament: BookInfo["testament"] }>();
  for (const ch of allChapters) {
    const existing = bookMap.get(ch.book);
    const builtIn = BOOK_BY_ID.get(ch.book as BookId);
    if (!existing) {
      bookMap.set(ch.book, {
        name: builtIn?.name ?? ch.bookName,
        maxChapter: ch.chapter,
        testament: builtIn?.testament ?? "DC",
      });
    } else {
      if (ch.chapter > existing.maxChapter) {
        existing.maxChapter = ch.chapter;
      }
    }
  }

  const books: BookInfo[] = Array.from(bookMap.entries()).map(([id, info]) => ({
    id: id as BookId,
    name: info.name,
    chapters: info.maxChapter,
    testament: info.testament,
  }));

  // 4. Preserve existing manifest metadata on merge
  const existingManifest = await db.get("user-translation-manifests", manifest.translation);
  const fullManifest: UserTranslationManifest = {
    ...(existingManifest ?? manifest),
    books,
  };

  // 5. Save the merged manifest
  await db.put("user-translation-manifests", fullManifest);
}

/**
 * Get all user translation manifests from IndexedDB.
 * Returns an empty array if none exist.
 */
export async function getUserTranslationManifests(): Promise<UserTranslationManifest[]> {
  const db = await getDb();
  return db.getAll("user-translation-manifests");
}

/**
 * Get a single user translation manifest by ID.
 * Returns undefined if not found.
 */
export async function getUserTranslationManifest(
  translationId: string,
): Promise<UserTranslationManifest | undefined> {
  const db = await getDb();
  return db.get("user-translation-manifests", translationId);
}

/**
 * Get chapter data for a user translation, in the same shape
 * as built-in ChapterData so the ChapterReader can use it unchanged.
 *
 * Returns null if the chapter doesn't exist.
 */
export async function getUserTranslationChapter(
  translationId: string,
  book: string,
  chapter: number,
): Promise<ChapterData | null> {
  const db = await getDb();
  const record: StoredUserChapter | undefined = await db.get(
    "user-translation-chapters",
    [translationId, book, chapter],
  );

  if (!record) return null;

  // Convert StoredUserChapter to ChapterData shape
  return {
    translation: record.translation,
    book: record.book as ChapterData["book"],
    bookName: record.bookName,
    chapter: record.chapter,
    verses: record.verses,
  };
}

/**
 * Delete a user translation and all its chapter data from IndexedDB.
 */
export async function deleteUserTranslation(translationId: string): Promise<void> {
  const db = await getDb();

  // Delete all chapters for this translation using the index
  const tx = db.transaction("user-translation-chapters", "readwrite");
  const index = tx.store.index("by-translation");
  let cursor = await index.openCursor(translationId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;

  // Delete the manifest
  await db.delete("user-translation-manifests", translationId);
}
