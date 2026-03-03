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
import type { BookId } from "../types/bible";
import {
  cacheBookOffline,
  isBookCached,
  isChapterCached,
} from "../lib/offline-books";

interface ChapterPickerProps {
  translation: string;
  book: string;
}

export function ChapterPicker({ translation, book }: ChapterPickerProps) {
  const bookInfo = BOOK_BY_ID.get(book as BookId);
  const [bookCached, setBookCached] = useState<boolean | null>(null);
  const [caching, setCaching] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [chapterStates, setChapterStates] = useState<Map<number, boolean>>(new Map());

  if (!bookInfo) {
    return <p className="text-gray-500">Book not found.</p>;
  }

  const chapters = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1);

  // Check cache state on mount
  useEffect(() => {
    if (typeof caches === "undefined") return;

    isBookCached(translation, book, bookInfo.chapters).then(setBookCached);

    // Check individual chapters
    Promise.all(
      chapters.map(async (ch) => {
        const cached = await isChapterCached(translation, book, ch);
        return [ch, cached] as [number, boolean];
      }),
    ).then((results) => {
      setChapterStates(new Map(results));
    });
  }, [translation, book, bookInfo.chapters]);

  async function handleSaveBookOffline() {
    if (caching || bookCached) return;

    setCaching(true);
    setProgress({ completed: 0, total: bookInfo!.chapters });

    try {
      await cacheBookOffline(translation, book, bookInfo!.chapters, (completed, total) => {
        setProgress({ completed, total });
      });
      setBookCached(true);
      // Update all chapter states to cached
      const allCached = new Map<number, boolean>();
      chapters.forEach((ch) => allCached.set(ch, true));
      setChapterStates(allCached);
    } catch {
      // Silently fail
    } finally {
      setCaching(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {bookInfo.name}
        </h2>
        {/* Save book offline button */}
        {typeof caches !== "undefined" && (
          <button
            type="button"
            onClick={handleSaveBookOffline}
            disabled={caching || bookCached === true}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5
                       text-xs font-medium text-gray-600 hover:bg-gray-50
                       focus:outline-none focus:ring-2 focus:ring-blue-500
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
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
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
      <p className="mb-6 text-gray-600">
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
                         border border-gray-200 bg-white font-medium text-gray-700
                         hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500
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
