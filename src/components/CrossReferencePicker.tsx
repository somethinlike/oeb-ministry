/**
 * CrossReferencePicker — lets users add related verses to their annotation.
 *
 * Grandmother Principle:
 * - Simple dropdowns for book/chapter/verse (no typing reference format)
 * - "Add related verse" button with clear label
 * - Shows added references as removable tags
 * - Removed references turn red with "+" so the user can restore them
 * - Prevents adding the anchor verse as a related verse (with explanation)
 */

import { useState, useEffect, useCallback } from "react";
import { BOOKS, BOOK_BY_ID } from "../lib/constants";
import type { BookId } from "../types/bible";

/** A removed ref with a timestamp for 48-hour expiry */
interface RemovedRefRecord {
  ref: CrossRefEntry;
  removedAt: number; // Unix timestamp (ms)
}

const REMOVED_REFS_KEY = "oeb-removed-crossrefs";
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

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
  /** Anchor verse info — prevents duplicating the note's own verse */
  anchorBook?: BookId;
  anchorChapter?: number;
  anchorVerseStart?: number;
  anchorVerseEnd?: number;
}

export function CrossReferencePicker({
  references,
  onChange,
  anchorBook,
  anchorChapter,
  anchorVerseStart,
  anchorVerseEnd,
}: CrossReferencePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookId>("gen");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerseStart, setSelectedVerseStart] = useState(1);
  const [selectedVerseEnd, setSelectedVerseEnd] = useState(1);
  // Recently removed refs — persisted to localStorage for 48 hours
  const [removedRefs, setRemovedRefs] = useState<RemovedRefRecord[]>([]);
  // Warning message when the user tries to add the anchor verse
  const [anchorWarning, setAnchorWarning] = useState<string | null>(null);

  // Build a storage key scoped to this annotation's anchor verse
  const storageKey = anchorBook
    ? `${REMOVED_REFS_KEY}:${anchorBook}:${anchorChapter}:${anchorVerseStart}:${anchorVerseEnd}`
    : REMOVED_REFS_KEY;

  /** Load removed refs from localStorage, filtering out expired entries */
  const loadRemovedRefs = useCallback((): RemovedRefRecord[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const records: RemovedRefRecord[] = JSON.parse(raw);
      const now = Date.now();
      // Keep only entries younger than 48 hours
      return records.filter((r) => now - r.removedAt < FORTY_EIGHT_HOURS_MS);
    } catch {
      return [];
    }
  }, [storageKey]);

  /** Save removed refs to localStorage */
  function saveRemovedRefs(records: RemovedRefRecord[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(records));
    } catch {
      // localStorage full or unavailable — silently degrade
    }
  }

  // Load persisted removed refs on mount
  useEffect(() => {
    const loaded = loadRemovedRefs();
    setRemovedRefs(loaded);
    // Clean up expired entries in storage
    saveRemovedRefs(loaded);
  }, [loadRemovedRefs]);

  const bookInfo = BOOK_BY_ID.get(selectedBook);
  const chapters = bookInfo
    ? Array.from({ length: bookInfo.chapters }, (_, i) => i + 1)
    : [];

  /** Check if a ref matches another (same book/chapter/verses) */
  function refsMatch(a: CrossRefEntry, b: CrossRefEntry): boolean {
    return (
      a.book === b.book &&
      a.chapter === b.chapter &&
      a.verseStart === b.verseStart &&
      a.verseEnd === b.verseEnd
    );
  }

  /** Check if a reference overlaps with the anchor verse */
  function isAnchorVerse(ref: CrossRefEntry): boolean {
    if (!anchorBook || !anchorChapter || !anchorVerseStart || !anchorVerseEnd) {
      return false;
    }
    return (
      ref.book === anchorBook &&
      ref.chapter === anchorChapter &&
      ref.verseStart === anchorVerseStart &&
      ref.verseEnd === anchorVerseEnd
    );
  }

  function handleAdd() {
    const newRef: CrossRefEntry = {
      book: selectedBook,
      chapter: selectedChapter,
      verseStart: selectedVerseStart,
      verseEnd: selectedVerseEnd,
    };

    // Block adding the anchor verse as a cross-reference
    if (isAnchorVerse(newRef)) {
      setAnchorWarning(`${formatRef(newRef)} is already anchored to this note.`);
      return;
    }

    // Block adding a reference that's already in the list
    const isDuplicate = references.some((r) => refsMatch(r, newRef));
    if (isDuplicate) {
      setAnchorWarning(`${formatRef(newRef)} is already added as a related verse.`);
      return;
    }

    // Clear any previous warning
    setAnchorWarning(null);

    // If restoring a previously removed ref, remove it from the removed list
    const updatedRemoved = removedRefs.filter((r) => !refsMatch(r.ref, newRef));
    setRemovedRefs(updatedRemoved);
    saveRemovedRefs(updatedRemoved);
    onChange([...references, newRef]);
    setShowPicker(false);
  }

  function handleRemove(index: number) {
    const removed = references[index];
    // Add to removed list with a timestamp for 48-hour expiry
    const record: RemovedRefRecord = { ref: removed, removedAt: Date.now() };
    const updatedRemoved = [...removedRefs, record];
    setRemovedRefs(updatedRemoved);
    saveRemovedRefs(updatedRemoved);
    onChange(references.filter((_, i) => i !== index));
  }

  function handleRestore(ref: CrossRefEntry) {
    // Move from removed back to active references
    const updatedRemoved = removedRefs.filter((r) => !refsMatch(r.ref, ref));
    setRemovedRefs(updatedRemoved);
    saveRemovedRefs(updatedRemoved);
    onChange([...references, ref]);
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

      {/* Added references as tags, followed by removed refs (red, restorable) */}
      {/* Filter removed refs to exclude any already in the active list */}
      {(() => {
        const visibleRemoved = removedRefs.filter(
          (r) => !references.some((active) => refsMatch(active, r.ref)),
        );
        return (references.length > 0 || visibleRemoved.length > 0) ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Active references */}
          {references.map((ref, index) => (
            <span
              key={`active-${ref.book}-${ref.chapter}-${ref.verseStart}`}
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

          {/* Removed references — red with "+" to restore, persisted for 48h */}
          {visibleRemoved.map((record) => (
            <span
              key={`removed-${record.ref.book}-${record.ref.chapter}-${record.ref.verseStart}`}
              className="inline-flex items-center gap-1 rounded-full bg-red-100
                         px-3 py-1 text-sm text-red-800"
            >
              {formatRef(record.ref)}
              <button
                type="button"
                onClick={() => handleRestore(record.ref)}
                className="ml-1 rounded-full p-0.5 hover:bg-red-200
                           focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label={`Restore ${formatRef(record.ref)}`}
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
                    d="M12 6v12M6 12h12"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : null;
      })()}

      {/* Anchor verse warning */}
      {anchorWarning && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 mb-3"
          role="alert"
        >
          {anchorWarning}
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
                  setAnchorWarning(null);
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
                  setAnchorWarning(null);
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
                  setAnchorWarning(null);
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
                onChange={(e) => {
                  setSelectedVerseEnd(Number(e.target.value));
                  setAnchorWarning(null);
                }}
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
              onClick={() => {
                setShowPicker(false);
                setAnchorWarning(null);
              }}
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
