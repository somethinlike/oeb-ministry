/**
 * RecycleBin — shows soft-deleted annotations with restore/permanent-delete actions.
 *
 * Grandmother Principle:
 * - "Restore" not "Undelete" or "Revert soft-delete"
 * - "Delete forever" with confirmation before irreversible action
 * - Clear empty state: "Your recycle bin is empty"
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  getDeletedAnnotations,
  restoreAnnotation,
  permanentlyDeleteAnnotation,
  batchRestoreAnnotations,
  batchPermanentlyDeleteAnnotations,
} from "../lib/annotations";
import type { Annotation } from "../types/annotation";
import type { AuthState } from "../types/auth";
import { BOOK_BY_ID } from "../lib/constants";
import type { BookId } from "../types/bible";

interface RecycleBinProps {
  auth: AuthState;
}

export function RecycleBin({ auth }: RecycleBinProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  useEffect(() => {
    loadDeleted();
  }, []);

  async function loadDeleted() {
    setLoading(true);
    setError(null);
    try {
      const result = await getDeletedAnnotations(supabase, auth.userId!);
      setAnnotations(result);
    } catch {
      setError("Couldn't load your deleted notes. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    setActionInProgress(id);
    setError(null);
    try {
      await restoreAnnotation(supabase, id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      setError("Couldn't restore this note. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handlePermanentDelete(id: string) {
    setActionInProgress(id);
    setError(null);
    try {
      await permanentlyDeleteAnnotation(supabase, id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setConfirmDeleteId(null);
    } catch {
      setError("Couldn't delete this note. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  }

  function formatVerseRef(annotation: Annotation): string {
    const bookInfo = BOOK_BY_ID.get(annotation.anchor.book);
    const name = bookInfo?.name ?? annotation.anchor.book;
    return annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
      : `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(annotations.map((a) => a.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  }

  async function handleBulkRestore() {
    const ids = Array.from(selectedIds);
    setBulkActionInProgress(true);
    setError(null);
    try {
      await batchRestoreAnnotations(supabase, ids);
      setAnnotations((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
    } catch {
      setError("Couldn't restore notes. Please try again.");
    } finally {
      setBulkActionInProgress(false);
    }
  }

  async function handleBulkPermanentDelete() {
    const ids = Array.from(selectedIds);
    setBulkActionInProgress(true);
    setError(null);
    try {
      await batchPermanentlyDeleteAnnotations(supabase, ids);
      setAnnotations((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
    } catch {
      setError("Couldn't delete notes. Please try again.");
    } finally {
      setBulkActionInProgress(false);
    }
  }

  return (
    <div>
      {/* Error */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3" role="status">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-gray-200 p-4">
              <div className="h-4 w-32 rounded bg-gray-200 mb-2" />
              <div className="h-3 w-full rounded bg-gray-200" />
            </div>
          ))}
          <span className="sr-only">Loading deleted notes...</span>
        </div>
      )}

      {/* Results */}
      {!loading && annotations.length > 0 && (
        <>
          {/* Select All */}
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === annotations.length}
                onChange={() =>
                  selectedIds.size === annotations.length ? deselectAll() : selectAll()
                }
                className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                aria-label="Select all deleted notes"
              />
              Select all
            </label>
            {selectedIds.size > 0 && (
              <span className="text-sm text-gray-500">
                {selectedIds.size} selected
              </span>
            )}
          </div>

          <div className="space-y-3">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className={`flex items-start gap-3 rounded-lg border p-4
                           transition-colors duration-150
                           ${selectedIds.has(annotation.id)
                             ? "border-blue-300 bg-blue-50"
                             : "border-gray-200"}`}
              >
                <label className="flex items-center pt-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(annotation.id)}
                    onChange={() => toggleSelection(annotation.id)}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                    aria-label={`Select ${formatVerseRef(annotation)}`}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {formatVerseRef(annotation)}
                    </span>
                    <span className="text-xs text-gray-400">
                      Deleted {annotation.deletedAt
                        ? new Date(annotation.deletedAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {annotation.contentMd}
                  </p>

                  {/* Individual actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore(annotation.id)}
                      disabled={actionInProgress === annotation.id}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600
                                 hover:bg-blue-50 disabled:opacity-50
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {actionInProgress === annotation.id ? "Restoring..." : "Restore"}
                    </button>

                    {confirmDeleteId === annotation.id ? (
                      <>
                        <span className="text-sm text-red-600">Delete forever?</span>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(annotation.id)}
                          disabled={actionInProgress === annotation.id}
                          className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white
                                     hover:bg-red-700 disabled:opacity-50
                                     focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          {actionInProgress === annotation.id ? "Deleting..." : "Yes, delete forever"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded px-3 py-1.5 text-sm text-gray-600
                                     hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(annotation.id)}
                        disabled={actionInProgress === annotation.id}
                        className="rounded-lg px-3 py-1.5 text-sm text-red-600
                                   hover:bg-red-50 disabled:opacity-50
                                   focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Delete forever
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && annotations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">
            Your recycle bin is empty.
          </p>
          <a
            href="/app/search"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Back to My Notes
          </a>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          className="sticky bottom-0 z-10 mt-4 -mx-4 border-t border-gray-200
                     bg-white/95 backdrop-blur px-4 py-3"
          role="toolbar"
          aria-label="Bulk actions"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.size} note{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={deselectAll}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600
                           hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkRestore}
                disabled={bulkActionInProgress}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600
                           hover:bg-blue-50 disabled:opacity-50
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {bulkActionInProgress ? "Restoring..." : `Restore (${selectedIds.size})`}
              </button>

              {confirmBulkDelete ? (
                <>
                  <span className="text-sm text-red-600">Delete forever?</span>
                  <button
                    type="button"
                    onClick={handleBulkPermanentDelete}
                    disabled={bulkActionInProgress}
                    className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white
                               hover:bg-red-700 disabled:opacity-50
                               focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {bulkActionInProgress
                      ? "Deleting..."
                      : `Yes, delete ${selectedIds.size} forever`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(false)}
                    className="rounded px-3 py-1.5 text-sm text-gray-600
                               hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  disabled={bulkActionInProgress}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-600
                             hover:bg-red-50 disabled:opacity-50
                             focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete forever ({selectedIds.size})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
