/**
 * AnnotationSearch — search interface for the user's annotations.
 *
 * Shows recent annotations by default, with a search bar for
 * full-text search using Postgres tsvector.
 *
 * Grandmother Principle:
 * - Simple search bar
 * - Results as readable cards with verse reference
 * - "No notes yet" prompt for new users
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { searchAnnotations, batchSoftDeleteAnnotations, hasDeletedAnnotations } from "../lib/annotations";
import type { Annotation } from "../types/annotation";
import type { AuthState } from "../types/auth";
import { BOOK_BY_ID } from "../lib/constants";
import type { BookId } from "../types/bible";

interface AnnotationSearchProps {
  auth: AuthState;
}

export function AnnotationSearch({ auth }: AnnotationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [hasDeleted, setHasDeleted] = useState(false);

  // Load recent annotations on mount
  useEffect(() => {
    loadRecent();
  }, []);

  // Check if recycle bin has items (lightweight COUNT query)
  useEffect(() => {
    if (!auth.userId) return;
    hasDeletedAnnotations(supabase, auth.userId).then(setHasDeleted).catch(() => {});
  }, [auth.userId]);

  async function loadRecent() {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const { data, error: dbError } = await supabase
        .from("annotations")
        .select("*")
        .eq("user_id", auth.userId!)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (dbError) throw dbError;

      setResults(
        (data ?? []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          translation: row.translation,
          anchor: {
            book: row.book as BookId,
            chapter: row.chapter,
            verseStart: row.verse_start,
            verseEnd: row.verse_end,
          },
          contentMd: row.content_md,
          isPublic: row.is_public,
          crossReferences: [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
        })),
      );
    } catch {
      setError("Couldn't load your notes. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!query.trim()) {
      loadRecent();
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedIds(new Set());

    try {
      const found = await searchAnnotations(supabase, auth.userId!, query);
      setResults(found);
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
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
    setSelectedIds(new Set(results.map((a) => a.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleBulkSoftDelete() {
    const ids = Array.from(selectedIds);
    setBulkActionInProgress(true);
    setError(null);
    try {
      await batchSoftDeleteAnnotations(supabase, ids);
      setResults((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
      setHasDeleted(true);
    } catch {
      setError("Couldn't move notes to Recycle Bin. Please try again.");
    } finally {
      setBulkActionInProgress(false);
    }
  }

  return (
    <div>
      {/* Search bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex gap-2 mb-6"
        role="search"
      >
        <label htmlFor="annotation-search" className="sr-only">
          Search your notes
        </label>
        <input
          id="annotation-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your notes..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-lg
                     focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Search
        </button>
      </form>

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
          <span className="sr-only">Loading notes...</span>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          {/* Select All */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === results.length}
                  onChange={() =>
                    selectedIds.size === results.length ? deselectAll() : selectAll()
                  }
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                  aria-label="Select all notes"
                />
                Select all
              </label>
              {hasDeleted && (
                <a
                  href="/app/recycle-bin"
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-600 transition-colors"
                  title="Recycle Bin"
                  aria-label="Open Recycle Bin"
                >
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
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </a>
              )}
            </div>
            {selectedIds.size > 0 && (
              <span className="text-sm text-gray-500">
                {selectedIds.size} selected
              </span>
            )}
          </div>

          <div className="space-y-3">
            {results.map((annotation) => (
              <div
                key={annotation.id}
                className={`flex items-start gap-3 rounded-lg border p-4
                           transition-colors duration-150
                           ${selectedIds.has(annotation.id)
                             ? "border-blue-300 bg-blue-50"
                             : "border-gray-200 hover:border-blue-300"}`}
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
                <a
                  href={`/app/annotate?t=${annotation.translation}&b=${annotation.anchor.book}&c=${annotation.anchor.chapter}&vs=${annotation.anchor.verseStart}&ve=${annotation.anchor.verseEnd}&id=${annotation.id}`}
                  className="flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {formatVerseRef(annotation)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(annotation.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {annotation.contentMd}
                  </p>
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !query && (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">
            You haven&apos;t written any notes yet.
          </p>
          <a
            href="/app/read"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Start reading
          </a>
        </div>
      )}

      {/* No search results */}
      {!loading && results.length === 0 && query && (
        <p className="text-center text-gray-500 py-8">
          No notes match &quot;{query}&quot;
        </p>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          className="sticky bottom-0 z-10 mt-4 -mx-4 border-t border-gray-200
                     bg-white/95 backdrop-blur px-4 py-3
                     flex items-center justify-between"
          role="toolbar"
          aria-label="Bulk actions"
        >
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
              onClick={handleBulkSoftDelete}
              disabled={bulkActionInProgress}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600
                         hover:bg-red-50 disabled:opacity-50
                         focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {bulkActionInProgress
                ? "Moving..."
                : `Move to Recycle Bin (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
