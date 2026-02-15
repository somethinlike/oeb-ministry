/**
 * CrossReferencePicker — lets users add related verses to their annotation.
 *
 * Grandmother Principle:
 * - Simple dropdowns for book/chapter/verse (no typing reference format)
 * - "Add related verse" button with clear label
 * - Shows added references as removable tags
 */

import { useState } from "react";
import { BOOKS, BOOK_BY_ID } from "../lib/constants";
import type { BookId } from "../types/bible";

export interface CrossRefEntry {
  book: BookId;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

interface CrossReferencePickerProps {
  /** Currently added cross-references */
  references: CrossRefEntry[];
  /** Called when references change (add or remove) */
  onChange: (references: CrossRefEntry[]) => void;
}

export function CrossReferencePicker({
  references,
  onChange,
}: CrossReferencePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookId>("gen");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerseStart, setSelectedVerseStart] = useState(1);
  const [selectedVerseEnd, setSelectedVerseEnd] = useState(1);

  const bookInfo = BOOK_BY_ID.get(selectedBook);
  const chapters = bookInfo
    ? Array.from({ length: bookInfo.chapters }, (_, i) => i + 1)
    : [];

  function handleAdd() {
    const newRef: CrossRefEntry = {
      book: selectedBook,
      chapter: selectedChapter,
      verseStart: selectedVerseStart,
      verseEnd: selectedVerseEnd,
    };

    // Avoid duplicate references
    const isDuplicate = references.some(
      (r) =>
        r.book === newRef.book &&
        r.chapter === newRef.chapter &&
        r.verseStart === newRef.verseStart &&
        r.verseEnd === newRef.verseEnd,
    );

    if (!isDuplicate) {
      onChange([...references, newRef]);
    }
    setShowPicker(false);
  }

  function handleRemove(index: number) {
    onChange(references.filter((_, i) => i !== index));
  }

  function formatRef(ref: CrossRefEntry): string {
    const book = BOOK_BY_ID.get(ref.book);
    const name = book?.name ?? ref.book;
    return ref.verseStart === ref.verseEnd
      ? `${name} ${ref.chapter}:${ref.verseStart}`
      : `${name} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Related verses (optional)
      </label>

      {/* Added references as tags */}
      {references.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {references.map((ref, index) => (
            <span
              key={`${ref.book}-${ref.chapter}-${ref.verseStart}`}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100
                         px-3 py-1 text-sm text-blue-800"
            >
              {formatRef(ref)}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="ml-1 rounded-full p-0.5 hover:bg-blue-200
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Remove ${formatRef(ref)}`}
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
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
            </span>
          ))}
        </div>
      )}

      {/* Add button / picker */}
      {showPicker ? (
        <div className="space-y-3 rounded-lg border border-gray-200 p-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {/* Book selector */}
            <div>
              <label
                htmlFor="xref-book"
                className="block text-xs text-gray-500 mb-1"
              >
                Book
              </label>
              <select
                id="xref-book"
                value={selectedBook}
                onChange={(e) => {
                  setSelectedBook(e.target.value as BookId);
                  setSelectedChapter(1);
                  setSelectedVerseStart(1);
                  setSelectedVerseEnd(1);
                }}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {BOOKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter selector */}
            <div>
              <label
                htmlFor="xref-chapter"
                className="block text-xs text-gray-500 mb-1"
              >
                Chapter
              </label>
              <select
                id="xref-chapter"
                value={selectedChapter}
                onChange={(e) => {
                  setSelectedChapter(Number(e.target.value));
                  setSelectedVerseStart(1);
                  setSelectedVerseEnd(1);
                }}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {chapters.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {/* Verse start */}
            <div>
              <label
                htmlFor="xref-verse-start"
                className="block text-xs text-gray-500 mb-1"
              >
                From verse
              </label>
              <input
                id="xref-verse-start"
                type="number"
                min={1}
                value={selectedVerseStart}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSelectedVerseStart(v);
                  if (v > selectedVerseEnd) setSelectedVerseEnd(v);
                }}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Verse end */}
            <div>
              <label
                htmlFor="xref-verse-end"
                className="block text-xs text-gray-500 mb-1"
              >
                To verse
              </label>
              <input
                id="xref-verse-end"
                type="number"
                min={selectedVerseStart}
                value={selectedVerseEnd}
                onChange={(e) =>
                  setSelectedVerseEnd(Number(e.target.value))
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="rounded px-4 py-1.5 text-sm text-gray-600
                         hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="rounded border border-dashed border-gray-300 px-4 py-2
                     text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add a related verse
        </button>
      )}
    </div>
  );
}
