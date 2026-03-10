/**
 * PublicFeed — browse published CC0 annotations from all users.
 *
 * Grandmother Principle:
 * - "Community Notes" not "Public Annotation Feed"
 * - Simple card layout with verse references and author attribution
 * - Search bar for finding specific content
 * - Filters by book (optional)
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  getPublicFeedAnnotations,
  searchPublicAnnotations,
} from "../lib/annotations";
import type { Annotation } from "../types/annotation";
import { BOOK_BY_ID, BOOKS } from "../lib/constants";
import type { BookId } from "../types/bible";

export function PublicFeed() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filterBook, setFilterBook] = useState("");

  // Load initial feed
  useEffect(() => {
    loadFeed();
  }, [filterBook]);

  async function loadFeed() {
    setLoading(true);
    setError(null);
    try {
      const result = await getPublicFeedAnnotations(supabase, {
        book: filterBook || undefined,
        limit: 50,
      });
      setAnnotations(result);
    } catch {
      setError("Couldn't load community notes. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadFeed();
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const result = await searchPublicAnnotations(supabase, searchQuery);
      setAnnotations(result);
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    loadFeed();
  }, [filterBook]);

  function formatVerseRef(annotation: Annotation): string {
    const bookInfo = BOOK_BY_ID.get(annotation.anchor.book);
    const name = bookInfo?.name ?? annotation.anchor.book;
    return annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
      : `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;
  }

  function truncateContent(text: string, maxLen = 200): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trimEnd() + "\u2026";
  }

  // Build a list of books that have at least one entry (for the filter dropdown)
  const uniqueBooks = [...new Set(BOOKS.map((b) => b.id))];

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search community notes..."
            className="flex-1 rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-heading
                       placeholder:text-faint focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent
                       hover:bg-accent-hover disabled:opacity-50
                       focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {isSearching ? "..." : "Search"}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-lg border border-input-border px-3 py-2.5 text-sm text-muted
                         hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Clear
            </button>
          )}
        </form>

        {/* Book filter */}
        <select
          value={filterBook}
          onChange={(e) => setFilterBook(e.target.value)}
          className="rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-heading
                     focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All books</option>
          {uniqueBooks.map((bookId) => {
            const bookInfo = BOOK_BY_ID.get(bookId as BookId);
            return (
              <option key={bookId} value={bookId}>
                {bookInfo?.name ?? bookId}
              </option>
            );
          })}
        </select>
      </div>

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
        <div className="space-y-4" role="status">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-edge p-5">
              <div className="h-4 w-36 rounded bg-edge mb-2" />
              <div className="h-3 w-full rounded bg-edge mb-1" />
              <div className="h-3 w-2/3 rounded bg-edge" />
            </div>
          ))}
          <span className="sr-only">Loading community notes...</span>
        </div>
      )}

      {/* Results */}
      {!loading && annotations.length > 0 && (
        <div className="space-y-4">
          {annotations.map((annotation) => (
            <article
              key={annotation.id}
              className="rounded-lg border border-edge p-5 space-y-2
                         hover:border-accent/50 transition-colors duration-150"
            >
              {/* Verse ref + translation */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-heading">
                  {formatVerseRef(annotation)}
                </h3>
                <span className="text-xs text-muted uppercase">
                  {annotation.translation}
                </span>
              </div>

              {/* Verse text */}
              {annotation.verseText && (
                <blockquote className="border-l-4 border-accent pl-3 text-sm text-muted italic">
                  {truncateContent(annotation.verseText, 150)}
                </blockquote>
              )}

              {/* Note content */}
              <p className="text-sm text-body leading-relaxed">
                {truncateContent(annotation.contentMd)}
              </p>

              {/* Attribution + date */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted">
                  by {annotation.authorDisplayName ?? "Anonymous"}
                </span>
                <span className="text-xs text-faint">
                  {annotation.publishedAt
                    ? new Date(annotation.publishedAt).toLocaleDateString()
                    : new Date(annotation.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Cross-references */}
              {annotation.crossReferences.length > 0 && (
                <p className="text-xs text-muted pt-1">
                  See also:{" "}
                  {annotation.crossReferences.map((ref) => {
                    const refInfo = BOOK_BY_ID.get(ref.book);
                    return ref.verseStart === ref.verseEnd
                      ? `${refInfo?.name ?? ref.book} ${ref.chapter}:${ref.verseStart}`
                      : `${refInfo?.name ?? ref.book} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
                  }).join(", ")}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && annotations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted">
            {searchQuery
              ? "No community notes matched your search."
              : "No community notes yet."}
          </p>
          <p className="text-sm text-faint mt-2">
            {searchQuery
              ? "Try different keywords or clear the search."
              : "Be the first to share a note with the community!"}
          </p>
        </div>
      )}
    </div>
  );
}
