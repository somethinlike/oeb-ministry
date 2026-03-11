/**
 * Offline book caching — lets users proactively cache entire Bible books
 * for offline reading.
 *
 * Uses the Cache API directly (same cache as the service worker) so
 * cached chapters are available both through the SW and through this module.
 *
 * The service worker (sw.js) already caches chapters on first visit using
 * a Cache-First strategy with the "oeb-bibles-v1" cache name. This module
 * lets users pre-fill that cache before they need it.
 */

import { BIBLE_BASE_PATH } from "./constants";

/** Must match the cache name in public/sw.js */
const BIBLE_CACHE_NAME = "oeb-bibles-v1";

/**
 * Cache all chapters of a book for offline use.
 *
 * @param translation - e.g., "web"
 * @param bookId - e.g., "jhn"
 * @param chapterCount - total chapters in this book
 * @param onProgress - optional callback with (completed, total)
 * @returns Number of chapters successfully cached
 */
export async function cacheBookOffline(
  translation: string,
  bookId: string,
  chapterCount: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<number> {
  const cache = await caches.open(BIBLE_CACHE_NAME);
  let attempted = 0;
  let cached = 0;

  // Fetch chapters in parallel with a concurrency limit to avoid flooding
  const BATCH_SIZE = 5;
  for (let start = 1; start <= chapterCount; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, chapterCount);
    const batch: Promise<void>[] = [];

    for (let ch = start; ch <= end; ch++) {
      const url = `${BIBLE_BASE_PATH}/${translation}/${bookId}/${ch}.json`;
      batch.push(
        fetch(url)
          .then((response) => {
            if (response.ok) {
              cached++;
              return cache.put(url, response);
            }
            // Non-ok response (404, etc.) — chapter doesn't exist yet
          })
          .catch(() => {
            // Network failure — skip silently
          })
          .then(() => {
            attempted++;
            onProgress?.(attempted, chapterCount);
          }),
      );
    }

    await Promise.all(batch);
  }

  // Return the number of chapters actually stored in cache (not just attempted)
  return cached;
}

/**
 * Check if all chapters of a book are cached.
 */
export async function isBookCached(
  translation: string,
  bookId: string,
  chapterCount: number,
): Promise<boolean> {
  try {
    const cache = await caches.open(BIBLE_CACHE_NAME);
    for (let ch = 1; ch <= chapterCount; ch++) {
      const url = `${BIBLE_BASE_PATH}/${translation}/${bookId}/${ch}.json`;
      const match = await cache.match(url);
      if (!match) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a single chapter is cached.
 */
export async function isChapterCached(
  translation: string,
  bookId: string,
  chapter: number,
): Promise<boolean> {
  try {
    const cache = await caches.open(BIBLE_CACHE_NAME);
    const url = `${BIBLE_BASE_PATH}/${translation}/${bookId}/${chapter}.json`;
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}
