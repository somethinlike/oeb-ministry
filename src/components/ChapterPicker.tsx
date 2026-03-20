/**
 * ChapterPicker — grid of chapter numbers for a selected book.
 *
 * Grandmother Principle:
 * - Large numbered buttons in a simple grid
 * - Book name shown as a header so user knows where they are
 * - Easy to tap on mobile
 * - "Save book offline" button at the top
 */

import { useState, useEffect } from "react";
import { BOOK_BY_ID } from "../lib/constants";
import type { BookId, BookInfo } from "../types/bible";
import {
  cacheBookOffline,
  isBookCached,
  isChapterCached,
} from "../lib/offline-books";
import { isUserTranslation, getUserTranslationManifest } from "../lib/user-translations";
import { useHydrated } from "../hooks/useHydrated";

interface ChapterPickerProps {
  translation: string;
  book: string;
}

export function ChapterPicker({ translation, book }: ChapterPickerProps) {
  const hydrated = useHydrated();
  const builtInBookInfo = BOOK_BY_ID.get(book as BookId);
  // For user translations, book info comes from IndexedDB
  const [userBookInfo, setUserBookInfo] = useState<BookInfo | null>(null);
  const [bookCached, setBookCached] = useState<boolean | null>(null);
  const [caching, setCaching] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [chapterStates, setChapterStates] = useState<Map<number, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Load book info from IndexedDB manifest for user translations
  useEffect(() => {
    if (!isUserTranslation(translation)) return;
    getUserTranslationManifest(translation)
      .then((manifest) => {
        const found = manifest?.books.find((b) => b.id === book);
        setUserBookInfo(found ?? null);
      })
      .catch(() => setUserBookInfo(null));
  }, [translation, book]);

  const bookInfo = isUserTranslation(translation) ? userBookInfo : builtInBookInfo;
  const chapterCount = bookInfo?.chapters ?? 0;

  // Check cache state on mount (runs only when bookInfo is available)
  useEffect(() => {
    if (!chapterCount || typeof caches === "undefined") return;

    isBookCached(translation, book, chapterCount).then(setBookCached);

    const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);
    Promise.all(
      chapters.map(async (ch) => {
        const cached = await isChapterCached(translation, book, ch);
        return [ch, cached] as [number, boolean];
      }),
    ).then((results) => {
      setChapterStates(new Map(results));
    });
  }, [translation, book, chapterCount]);

  // ── Early returns AFTER all hooks ──

  if (!bookInfo) {
    // Still loading for user translations, or genuinely not found
    if (isUserTranslation(translation)) {
      return <p className="text-muted">Loading book info...</p>;
    }
    return <p className="text-muted">Book not found.</p>;
  }

  const chapters = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1);

  /** Re-check which chapters are actually in the cache. */
  async function refreshChapterStates() {
    const results = await Promise.all(
      chapters.map(async (ch) => {
        const isCached = await isChapterCached(translation, book, ch);
        return [ch, isCached] as [number, boolean];
      }),
    );
    const stateMap = new Map(results);
    setChapterStates(stateMap);
    // Book is fully cached only if every chapter is present
    setBookCached(results.every(([, c]) => c));
  }

  async function handleSaveBookOffline() {
    if (caching || bookCached) return;

    setError(null);
    setCaching(true);
    setProgress({ completed: 0, total: bookInfo!.chapters });

    try {
      const chaptersStored = await cacheBookOffline(
        translation, book, bookInfo!.chapters, (completed, total) => {
          setProgress({ completed, total });
        },
      );
      if (chaptersStored === 0) {
        setError("This book isn't available yet in this translation");
      }
      // Re-check the real cache state instead of optimistically marking all as cached
      await refreshChapterStates();
    } catch {
      setError("Something went wrong. Try again?");
    } finally {
      setCaching(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-heading">
          {bookInfo.name}
        </h2>
        {/* Save book offline button */}
        {hydrated && typeof caches !== "undefined" && (
          <button
            type="button"
            onClick={handleSaveBookOffline}
            disabled={caching || bookCached === true}
            className="flex items-center gap-1.5 rounded-lg border border-input-border bg-panel px-3 py-1.5
                       text-xs font-medium text-muted hover:bg-surface-alt
                       focus:outline-none focus:ring-2 focus:ring-ring
                       disabled:opacity-60 disabled:cursor-default"
            aria-label={bookCached ? `${bookInfo.name} saved offline` : `Save ${bookInfo.name} for offline reading`}
          >
            {caching ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-75" />
                </svg>
                <span>Saving {progress.completed}/{progress.total}...</span>
              </>
            ) : bookCached ? (
              <>
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Saved offline</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <span>Save book offline</span>
              </>
            )}
          </button>
        )}
      </div>
      {/* Error message — shown when no chapters could be saved */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}
      <p className="mb-6 text-muted">
        Choose a chapter to start reading.
      </p>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
        {chapters.map((ch) => {
          const isCached = chapterStates.get(ch);
          return (
            <a
              key={ch}
              href={`/app/read/${translation}/${book}/${ch}`}
              className="relative flex h-12 w-full items-center justify-center rounded-lg
                         border border-edge bg-panel font-medium text-body
                         hover:border-accent hover:bg-accent-soft hover:text-accent
                         focus:outline-none focus:ring-2 focus:ring-ring
                         transition-colors duration-150"
              aria-label={`${bookInfo.name} chapter ${ch}${isCached ? " (saved offline)" : ""}`}
            >
              {ch}
              {isCached && (
                <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-green-400" aria-hidden="true" />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
