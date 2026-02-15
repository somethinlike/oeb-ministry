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
import { searchAnnotations } from "../lib/annotations";
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

  // Load recent annotations on mount
  useEffect(() => {
    loadRecent();
  }, []);

  async function loadRecent() {
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from("annotations")
        .select("*")
        .eq("user_id", auth.userId!)
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
        <div className="space-y-3">
          {results.map((annotation) => (
            <a
              key={annotation.id}
              href={`/app/annotate?t=${annotation.translation}&b=${annotation.anchor.book}&c=${annotation.anchor.chapter}&vs=${annotation.anchor.verseStart}&ve=${annotation.anchor.verseEnd}&id=${annotation.id}`}
              className="block rounded-lg border border-gray-200 p-4
                         hover:border-blue-300 hover:bg-blue-50
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition-colors duration-150"
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
          ))}
        </div>
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
    </div>
  );
}
