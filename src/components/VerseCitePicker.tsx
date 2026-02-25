/**
 * VerseCitePicker — popover for inserting verse citations into notes.
 *
 * Lets users pick a verse from their annotation's anchor or cross-references,
 * optionally trim the text (adding ellipsis), and insert a styled Markdown
 * blockquote into the editor.
 *
 * Output format (standard Markdown — "Humble Materials" principle):
 *   > **Genesis 1:3** — ...God said, "Let there be light," and there was light.
 *
 * Popover pattern matches TranslationToggleMenu: outside-click + Escape to close.
 *
 * Grandmother Principle: word-by-word trimming instead of character sliders.
 * Each click removes one word. Preview shows exactly what will be inserted.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { loadChapter } from "../lib/bible-loader";
import { BOOK_BY_ID } from "../lib/constants";
import {
  applyTranslationToggles,
  loadTranslationToggles,
} from "../lib/translation-toggles";
import type { BookId } from "../types/bible";
import type { CrossRefEntry } from "./CrossReferencePicker";

/** A verse with its display text and location info. */
interface CitableVerse {
  book: BookId;
  chapter: number;
  number: number;
  text: string;
  /** Human-readable label, e.g., "Genesis 1:3" or "Romans 5:8" */
  label: string;
}

interface VerseCitePickerProps {
  /** Anchor verse location */
  anchorBook: BookId;
  anchorChapter: number;
  anchorVerseStart: number;
  anchorVerseEnd: number;
  /** Cross-references from the annotation */
  crossReferences: CrossRefEntry[];
  /** Current translation ID for loading verse text */
  translation: string;
  /** Called with the final Markdown blockquote string */
  onCite: (markdown: string) => void;
}

/**
 * Build the Markdown citation string.
 *
 * Exported for unit testing — the rest of the component is UI.
 */
export function buildCitation(
  label: string,
  fullText: string,
  trimFromStart: number,
  trimFromEnd: number,
): string {
  const words = fullText.split(/\s+/);
  const end = trimFromEnd > 0 ? words.length - trimFromEnd : words.length;
  const trimmed = words.slice(trimFromStart, end).join(" ");

  const leading = trimFromStart > 0 ? "..." : "";
  const trailing = trimFromEnd > 0 ? "..." : "";

  return `> **${label}** \u2014 ${leading}${trimmed}${trailing}`;
}

export function VerseCitePicker({
  anchorBook,
  anchorChapter,
  anchorVerseStart,
  anchorVerseEnd,
  crossReferences,
  translation,
  onCite,
}: VerseCitePickerProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Verse data loaded on open
  const [anchorVerses, setAnchorVerses] = useState<CitableVerse[]>([]);
  const [relatedVerses, setRelatedVerses] = useState<CitableVerse[]>([]);
  const [loading, setLoading] = useState(false);

  // Trim mode state
  const [selected, setSelected] = useState<CitableVerse | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(null);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        setSelected(null);
      }
    },
    [open],
  );

  // Load verse text when popover opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    const toggles = loadTranslationToggles();
    const bookName = BOOK_BY_ID.get(anchorBook)?.name ?? anchorBook;

    // Collect unique chapter keys to fetch
    const chaptersToFetch = new Map<string, { book: BookId; chapter: number }>();
    chaptersToFetch.set(`${anchorBook}:${anchorChapter}`, {
      book: anchorBook,
      chapter: anchorChapter,
    });
    for (const ref of crossReferences) {
      const key = `${ref.book}:${ref.chapter}`;
      if (!chaptersToFetch.has(key)) {
        chaptersToFetch.set(key, { book: ref.book, chapter: ref.chapter });
      }
    }

    Promise.all(
      Array.from(chaptersToFetch.values()).map(async ({ book, chapter }) => {
        const data = await loadChapter(translation, book, chapter);
        return { book, chapter, data };
      }),
    ).then((results) => {
      if (cancelled) return;

      // Build a lookup: "book:chapter" → verses array
      const verseLookup = new Map<string, { number: number; text: string }[]>();
      for (const { book, chapter, data } of results) {
        if (data) {
          verseLookup.set(
            `${book}:${chapter}`,
            data.verses.map((v) => ({
              number: v.number,
              text: applyTranslationToggles(v.text, toggles),
            })),
          );
        }
      }

      // Build anchor verses
      const anchorChapterVerses = verseLookup.get(`${anchorBook}:${anchorChapter}`) ?? [];
      const anchors: CitableVerse[] = anchorChapterVerses
        .filter((v) => v.number >= anchorVerseStart && v.number <= anchorVerseEnd)
        .map((v) => ({
          book: anchorBook,
          chapter: anchorChapter,
          number: v.number,
          text: v.text,
          label: `${bookName} ${anchorChapter}:${v.number}`,
        }));

      // Build related verses from cross-references
      const related: CitableVerse[] = [];
      for (const ref of crossReferences) {
        const refBookName = BOOK_BY_ID.get(ref.book)?.name ?? ref.book;
        const chapterVerses = verseLookup.get(`${ref.book}:${ref.chapter}`) ?? [];
        for (const v of chapterVerses) {
          if (v.number >= ref.verseStart && v.number <= ref.verseEnd) {
            related.push({
              book: ref.book,
              chapter: ref.chapter,
              number: v.number,
              text: v.text,
              label: `${refBookName} ${ref.chapter}:${v.number}`,
            });
          }
        }
      }

      setAnchorVerses(anchors);
      setRelatedVerses(related);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, anchorBook, anchorChapter, anchorVerseStart, anchorVerseEnd, crossReferences, translation]);

  function handleSelectVerse(verse: CitableVerse) {
    setSelected(verse);
    setTrimStart(0);
    setTrimEnd(0);
  }

  function handleInsert() {
    if (!selected) return;
    const markdown = buildCitation(selected.label, selected.text, trimStart, trimEnd);
    onCite(markdown);
    setOpen(false);
    setSelected(null);
  }

  // Word count for the selected verse (used to cap trim values)
  const selectedWords = selected ? selected.text.split(/\s+/) : [];
  const maxTrim = Math.max(0, selectedWords.length - 1);

  return (
    <div className="relative" ref={popoverRef} onKeyDown={handleKeyDown}>
      {/* Cite toolbar button — matches the existing toolbar button style */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded px-2.5 py-1.5 text-sm font-bold text-gray-600
                   hover:bg-gray-100 hover:text-gray-900
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Cite a verse"
        aria-expanded={open}
        aria-haspopup="true"
        title="Cite a verse"
      >
        {/* Book + quote icon — small SVG */}
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
          />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-gray-200
                     bg-white shadow-lg"
          role="dialog"
          aria-label="Cite a verse"
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500" role="status">
              Loading verses...
            </div>
          ) : selected ? (
            /* ── Trim mode ── */
            <div className="p-3 space-y-3">
              {/* Header with back button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Back to verse list"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-gray-700">
                  {selected.label}
                </span>
              </div>

              {/* Full verse text */}
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-md p-2">
                {selected.text}
              </p>

              {/* Trim controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTrimStart((prev) => Math.min(prev + 1, maxTrim - trimEnd))}
                  disabled={trimStart + trimEnd >= maxTrim}
                  className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Trim one word from the start"
                >
                  Trim start
                </button>
                {trimStart > 0 && (
                  <button
                    type="button"
                    onClick={() => setTrimStart((prev) => Math.max(0, prev - 1))}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600
                               hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Undo trim from start"
                  >
                    + Start
                  </button>
                )}

                <div className="flex-1" />

                {trimEnd > 0 && (
                  <button
                    type="button"
                    onClick={() => setTrimEnd((prev) => Math.max(0, prev - 1))}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600
                               hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Undo trim from end"
                  >
                    End +
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTrimEnd((prev) => Math.min(prev + 1, maxTrim - trimStart))}
                  disabled={trimStart + trimEnd >= maxTrim}
                  className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Trim one word from the end"
                >
                  Trim end
                </button>
              </div>

              {/* Reset — only shown when something has been trimmed */}
              {(trimStart > 0 || trimEnd > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(0);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800
                             focus:outline-none focus:underline"
                >
                  Reset to full text
                </button>
              )}

              {/* Live preview */}
              <div className="rounded-md border-l-[3px] border-blue-500 bg-blue-50 px-3 py-2">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-blue-700">{selected.label}</span>
                  {" \u2014 "}
                  {trimStart > 0 && "..."}
                  {selectedWords.slice(trimStart, selectedWords.length - trimEnd).join(" ")}
                  {trimEnd > 0 && "..."}
                </p>
              </div>

              {/* Insert button */}
              <button
                type="button"
                onClick={handleInsert}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white
                           hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Insert citation
              </button>
            </div>
          ) : (
            /* ── Verse list ── */
            <div className="max-h-64 overflow-y-auto">
              {/* Anchor verses */}
              {anchorVerses.length > 0 && (
                <div>
                  <p className="sticky top-0 bg-white px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Your verses
                  </p>
                  {anchorVerses.map((v) => (
                    <button
                      key={`${v.book}:${v.chapter}:${v.number}`}
                      type="button"
                      onClick={() => handleSelectVerse(v)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50
                                 focus:outline-none focus:bg-blue-50"
                    >
                      <span className="font-semibold text-blue-600">
                        {v.number}
                      </span>{" "}
                      <span className="text-gray-600 line-clamp-2">
                        {v.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Related verses from cross-references */}
              {relatedVerses.length > 0 && (
                <div>
                  <p className="sticky top-0 bg-white px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Related verses
                  </p>
                  {relatedVerses.map((v) => (
                    <button
                      key={`${v.book}:${v.chapter}:${v.number}`}
                      type="button"
                      onClick={() => handleSelectVerse(v)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50
                                 focus:outline-none focus:bg-blue-50"
                    >
                      <span className="font-semibold text-blue-600">
                        {v.label}
                      </span>{" "}
                      <span className="text-gray-600 line-clamp-2">
                        {v.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state — no verses loaded */}
              {anchorVerses.length === 0 && relatedVerses.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-400">
                  <p>Verse text isn't available right now.</p>
                  <p className="mt-1">You can type a citation manually using the Quote button.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
