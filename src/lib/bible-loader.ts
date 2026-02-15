/**
 * Bible text loader — fetches chapter data and translation manifests
 * from the static JSON files in /public/bibles/.
 *
 * These files are generated once by the download script and served
 * as static assets. No runtime API dependency = works offline.
 */

import type { ChapterData, TranslationManifest, BookId } from "../types/bible";
import { BIBLE_BASE_PATH } from "./constants";

/**
 * Loads a single chapter of Bible text from static JSON.
 *
 * @param translation - e.g., "oeb-us" or "web"
 * @param book - three-letter book ID, e.g., "jhn"
 * @param chapter - chapter number, e.g., 3
 * @returns The chapter data, or null if the file doesn't exist
 *
 * @example
 * const chapter = await loadChapter("oeb-us", "jhn", 3);
 * // chapter.verses[0].text → "For God so loved the world..."
 */
export async function loadChapter(
  translation: string,
  book: BookId,
  chapter: number,
): Promise<ChapterData | null> {
  const url = `${BIBLE_BASE_PATH}/${translation}/${book}/${chapter}.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as ChapterData;
  } catch {
    // Network error or invalid JSON — return null so the UI
    // can show a friendly "chapter not available" message
    return null;
  }
}

/**
 * Loads the translation manifest, which lists all available books
 * and their chapter counts. Used to build the book/chapter navigation
 * without needing to load every chapter file.
 *
 * @param translation - e.g., "oeb-us" or "web"
 * @returns The manifest, or null if the translation doesn't exist
 */
export async function loadManifest(
  translation: string,
): Promise<TranslationManifest | null> {
  const url = `${BIBLE_BASE_PATH}/${translation}/manifest.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as TranslationManifest;
  } catch {
    return null;
  }
}
