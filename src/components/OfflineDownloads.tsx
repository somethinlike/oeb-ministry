/**
 * OfflineDownloads — Settings UI for saving Bible translations offline.
 *
 * Shows each supported translation with a download button. Downloads cache
 * all chapters into the Cache API (same cache the service worker uses),
 * so the Bible text is available without an internet connection.
 *
 * Grandmother Principle:
 * - Tier 1: "Save for offline reading" with a simple download button
 * - Tier 2: Progress bar during download, size estimate
 * - Status shows "Saved" / "Not saved" with clear icons
 */

import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_TRANSLATIONS, BOOKS } from "../lib/constants";
import { cacheBookOffline, isBookCached } from "../lib/offline-books";
import type { BookInfo } from "../types/bible";

/** Estimated average chapter size in KB (JSON text) */
const AVG_CHAPTER_KB = 4;

interface TranslationStatus {
  /** How many books are fully cached */
  cachedBooks: number;
  /** Total books in this translation */
  totalBooks: number;
  /** Whether we're currently downloading */
  downloading: boolean;
  /** Download progress: 0 to 1 */
  progress: number;
  /** Whether check is still loading */
  checking: boolean;
}

/**
 * Get the list of books available for a translation by fetching its manifest.
 * Falls back to the full BOOKS list filtered by testament if manifest fails.
 */
async function getBooksForTranslation(translationId: string): Promise<BookInfo[]> {
  try {
    const res = await fetch(`/bibles/${translationId}/manifest.json`);
    if (res.ok) {
      const manifest = await res.json();
      return manifest.books ?? [];
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: use the constant BOOKS list (includes all books —
  // some may not exist for this translation, but cacheBookOffline
  // handles missing chapters gracefully)
  const translation = SUPPORTED_TRANSLATIONS.find((t) => t.id === translationId);
  if (translation && !translation.hasApocrypha) {
    return BOOKS.filter((b) => b.testament !== "DC");
  }
  return [...BOOKS];
}

export function OfflineDownloads() {
  const [statuses, setStatuses] = useState<Record<string, TranslationStatus>>({});

  // Check cache status for each translation on mount
  useEffect(() => {
    let cancelled = false;

    async function checkAll() {
      for (const t of SUPPORTED_TRANSLATIONS) {
        if (cancelled) return;

        // Mark as checking
        setStatuses((prev) => ({
          ...prev,
          [t.id]: { cachedBooks: 0, totalBooks: 0, downloading: false, progress: 0, checking: true },
        }));

        const books = await getBooksForTranslation(t.id);
        let cached = 0;

        for (const book of books) {
          if (cancelled) return;
          const isCached = await isBookCached(t.id, book.id, book.chapters);
          if (isCached) cached++;
        }

        if (!cancelled) {
          setStatuses((prev) => ({
            ...prev,
            [t.id]: { cachedBooks: cached, totalBooks: books.length, downloading: false, progress: 0, checking: false },
          }));
        }
      }
    }

    checkAll();
    return () => { cancelled = true; };
  }, []);

  const handleDownload = useCallback(async (translationId: string) => {
    setStatuses((prev) => ({
      ...prev,
      [translationId]: { ...prev[translationId], downloading: true, progress: 0 },
    }));

    const books = await getBooksForTranslation(translationId);
    let totalChapters = 0;
    for (const b of books) totalChapters += b.chapters;

    let completedChapters = 0;
    let cachedBooks = 0;

    for (const book of books) {
      const result = await cacheBookOffline(
        translationId,
        book.id,
        book.chapters,
        (completed) => {
          const current = completedChapters + completed;
          setStatuses((prev) => ({
            ...prev,
            [translationId]: {
              ...prev[translationId],
              progress: current / totalChapters,
            },
          }));
        },
      );

      completedChapters += book.chapters;
      if (result === book.chapters) cachedBooks++;
    }

    setStatuses((prev) => ({
      ...prev,
      [translationId]: {
        cachedBooks,
        totalBooks: books.length,
        downloading: false,
        progress: 1,
        checking: false,
      },
    }));
  }, []);

  const handleRemove = useCallback(async (translationId: string) => {
    try {
      const cache = await caches.open("oeb-bibles-v1");
      const keys = await cache.keys();
      const prefix = `/bibles/${translationId}/`;
      let deleted = 0;

      for (const req of keys) {
        const url = new URL(req.url);
        if (url.pathname.startsWith(prefix)) {
          await cache.delete(req);
          deleted++;
        }
      }

      setStatuses((prev) => ({
        ...prev,
        [translationId]: {
          ...prev[translationId],
          cachedBooks: 0,
          progress: 0,
        },
      }));
    } catch {
      // Cache API unavailable — silently ignore
    }
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-body leading-relaxed">
        Save Bible translations to your device so you can read without an
        internet connection. Chapters you&apos;ve already visited are saved
        automatically — this downloads everything at once.
      </p>

      <div className="space-y-3">
        {SUPPORTED_TRANSLATIONS.map((t) => {
          const status = statuses[t.id];
          const isFullyCached = status && !status.checking && status.cachedBooks === status.totalBooks && status.totalBooks > 0;
          const isPartial = status && !status.checking && status.cachedBooks > 0 && status.cachedBooks < status.totalBooks;
          const totalChapters = status?.totalBooks
            ? BOOKS.filter((b) => {
                if (!t.hasApocrypha && b.testament === "DC") return false;
                return true;
              }).reduce((sum, b) => sum + b.chapters, 0)
            : 0;
          const estimatedMB = ((totalChapters * AVG_CHAPTER_KB) / 1024).toFixed(1);

          return (
            <div
              key={t.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-edge-soft p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-heading truncate">
                    {t.abbreviation} — {t.name}
                  </p>
                  {isFullyCached && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 shrink-0">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </span>
                  )}
                  {isPartial && (
                    <span className="text-xs text-muted shrink-0">
                      {status.cachedBooks}/{status.totalBooks} books
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {t.license} · ~{estimatedMB} MB
                </p>

                {/* Progress bar during download */}
                {status?.downloading && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-surface-hover overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${Math.round(status.progress * 100)}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(status.progress * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Downloading ${t.name}`}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                {status?.downloading ? (
                  <span className="text-xs text-muted py-2 px-3">
                    {Math.round(status.progress * 100)}%
                  </span>
                ) : isFullyCached ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(t.id)}
                    className="rounded-lg border border-input-border bg-panel px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover hover:text-heading focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDownload(t.id)}
                    disabled={status?.checking}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    {status?.checking ? "Checking..." : isPartial ? "Download remaining" : "Save offline"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <details className="text-xs text-muted">
        <summary className="cursor-pointer hover:text-heading">
          How does offline reading work?
        </summary>
        <p className="mt-2 leading-relaxed">
          Bible text is saved in your browser&apos;s storage. When you visit
          a chapter, your browser loads the saved copy instead of downloading
          it again. This works even without an internet connection. Your notes
          are also saved locally and sync back when you reconnect.
        </p>
      </details>
    </div>
  );
}
