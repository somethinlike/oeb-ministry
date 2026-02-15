/**
 * ChapterReader — the core Bible reading component.
 *
 * Renders verses with:
 * - Tap-to-select verse highlighting (tap one, tap another for range)
 * - "Write a note" button when verses are selected
 * - Previous/next chapter navigation
 * - Annotation indicators on verses that have notes
 *
 * Grandmother Principle:
 * - Clean, readable text with good line spacing
 * - Verse numbers are subtle but visible
 * - Selection is visually obvious (blue highlight)
 * - "Write a note" appears right where the user is looking
 */

import { useState, useEffect } from "react";
import type { ChapterData, BookId } from "../types/bible";
import {
  updateSelection,
  isVerseSelected,
  type VerseSelection,
} from "../lib/verse-selection";
import { BOOK_BY_ID, BIBLE_BASE_PATH } from "../lib/constants";

interface ChapterReaderProps {
  translation: string;
  book: string;
  chapter: number;
}

export function ChapterReader({
  translation,
  book,
  chapter,
}: ChapterReaderProps) {
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<VerseSelection | null>(null);

  const bookInfo = BOOK_BY_ID.get(book as BookId);

  // Fetch chapter data from static JSON files
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelection(null);

    fetch(`${BIBLE_BASE_PATH}/${translation}/${book}/${chapter}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Chapter not available");
        return res.json();
      })
      .then((data: ChapterData) => {
        setChapterData(data);
        setLoading(false);
      })
      .catch(() => {
        setError(
          "This chapter isn't available yet. Try a different chapter or translation.",
        );
        setLoading(false);
      });
  }, [translation, book, chapter]);

  function handleVerseClick(verseNumber: number) {
    setSelection((current) => updateSelection(current, verseNumber));
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading chapter">
        {/* Skeleton lines that mimic verse text */}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex gap-2 animate-pulse">
            <div className="h-4 w-6 rounded bg-gray-200" />
            <div className="h-4 flex-1 rounded bg-gray-200" />
          </div>
        ))}
        <span className="sr-only">Loading chapter text...</span>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
        role="alert"
      >
        <p className="text-lg text-amber-800">{error}</p>
        <a
          href={`/app/read/${translation}/${book}`}
          className="mt-4 inline-block rounded-lg bg-amber-600 px-6 py-2 font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          Pick a different chapter
        </a>
      </div>
    );
  }

  if (!chapterData) return null;

  // Build selection display text for the "Write a note" button
  const selectionLabel = selection
    ? selection.start === selection.end
      ? `${bookInfo?.name} ${chapter}:${selection.start}`
      : `${bookInfo?.name} ${chapter}:${selection.start}-${selection.end}`
    : "";

  return (
    <div>
      {/* Chapter header */}
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        {chapterData.bookName} {chapterData.chapter}
      </h2>

      {/* Verse text */}
      <article
        className="max-w-prose text-lg leading-relaxed text-gray-800"
        aria-label={`${chapterData.bookName} chapter ${chapterData.chapter}`}
      >
        {chapterData.verses.map((verse) => {
          const selected = isVerseSelected(selection, verse.number);
          return (
            <span
              key={verse.number}
              role="button"
              tabIndex={0}
              onClick={() => handleVerseClick(verse.number)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleVerseClick(verse.number);
                }
              }}
              className={`
                inline cursor-pointer rounded px-0.5 transition-colors duration-100
                ${selected ? "bg-blue-100 text-blue-900" : "hover:bg-gray-100"}
                focus:outline-none focus:ring-2 focus:ring-blue-400
              `}
              aria-label={`Verse ${verse.number}: ${verse.text}`}
              aria-pressed={selected}
            >
              {/* Verse number — superscript, subtle */}
              <sup className="mr-0.5 text-xs font-semibold text-gray-400 select-none">
                {verse.number}
              </sup>
              {verse.text}{" "}
            </span>
          );
        })}
      </article>

      {/* "Write a note" floating action — appears when verses are selected */}
      {selection && (
        <div
          className="fixed bottom-6 left-1/2 z-10 -translate-x-1/2
                     rounded-full bg-blue-600 px-6 py-3 text-white shadow-lg
                     flex items-center gap-3 animate-in"
          role="status"
          aria-live="polite"
        >
          <span className="text-sm font-medium">{selectionLabel}</span>
          <a
            href={`/app/annotate?t=${translation}&b=${book}&c=${chapter}&vs=${selection.start}&ve=${selection.end}`}
            className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-blue-600
                       hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Write a note
          </a>
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="ml-1 rounded-full p-1 hover:bg-blue-700
                       focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Clear selection"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Chapter navigation — previous/next buttons */}
      <nav
        className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6"
        aria-label="Chapter navigation"
      >
        {chapter > 1 ? (
          <a
            href={`/app/read/${translation}/${book}/${chapter - 1}`}
            className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700
                       hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            &larr; Chapter {chapter - 1}
          </a>
        ) : (
          <div /> /* Spacer for flex layout */
        )}

        {bookInfo && chapter < bookInfo.chapters ? (
          <a
            href={`/app/read/${translation}/${book}/${chapter + 1}`}
            className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700
                       hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Chapter {chapter + 1} &rarr;
          </a>
        ) : (
          <div />
        )}
      </nav>
    </div>
  );
}
