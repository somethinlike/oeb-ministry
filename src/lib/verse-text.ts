/**
 * Verse text extraction — pulls the actual Bible text for a verse range
 * from already-loaded chapter data.
 *
 * Pure function: no network calls, no side effects.
 */

import type { ChapterData } from "../types/bible";

/**
 * Extracts and concatenates verse texts for a given range from chapter data.
 *
 * @param chapterData - The loaded chapter (array of verses)
 * @param verseStart - First verse number in the range
 * @param verseEnd - Last verse number in the range (same as start for single verse)
 * @returns The concatenated verse text, or null if no matching verses found
 *
 * @example
 * const text = extractVerseText(chapter, 16, 18);
 * // "16 For God so loved the world... 17 For God sent... 18 Those who..."
 */
export function extractVerseText(
  chapterData: ChapterData,
  verseStart: number,
  verseEnd: number,
): string | null {
  const verses = chapterData.verses.filter(
    (v) => v.number >= verseStart && v.number <= verseEnd,
  );

  if (verses.length === 0) return null;

  return verses.map((v) => v.text).join(" ");
}
