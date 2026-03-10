/**
 * PublishedNotes — shows the user's publicly shared (CC0) annotations.
 *
 * Grandmother Principle:
 * - Simple list of published notes
 * - Links to the annotation editor for viewing/editing
 * - Clear empty state when nothing is published yet
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getPublishedAnnotations } from "../lib/annotations";
import type { Annotation } from "../types/annotation";
import type { AuthState } from "../types/auth";
import { BOOK_BY_ID } from "../lib/constants";
import type { BookId } from "../types/bible";

interface PublishedNotesProps {
  auth: AuthState;
}

export function PublishedNotes({ auth }: PublishedNotesProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublished();
  }, []);

  async function loadPublished() {
    setLoading(true);
    setError(null);
    try {
      const result = await getPublishedAnnotations(supabase, auth.userId!);
      setAnnotations(result);
    } catch {
      setError("Couldn't load your published notes. Please try again.");
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
            <div key={i} className="animate-pulse rounded-lg border border-edge p-4">
              <div className="h-4 w-32 rounded bg-edge mb-2" />
              <div className="h-3 w-full rounded bg-edge" />
            </div>
          ))}
          <span className="sr-only">Loading published notes...</span>
        </div>
      )}

      {/* Results */}
      {!loading && annotations.length > 0 && (
        <div className="space-y-3">
          {annotations.map((annotation) => (
            <a
              key={annotation.id}
              href={`/app/annotate?t=${annotation.translation}&b=${annotation.anchor.book}&c=${annotation.anchor.chapter}&vs=${annotation.anchor.verseStart}&ve=${annotation.anchor.verseEnd}&id=${annotation.id}`}
              className="block rounded-lg border border-edge p-4
                         hover:border-accent hover:bg-accent-soft
                         focus:outline-none focus:ring-2 focus:ring-ring
                         transition-colors duration-150"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-heading">
                  {formatVerseRef(annotation)}
                </span>
                <span className="text-xs text-faint">
                  {new Date(annotation.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-muted line-clamp-2">
                {annotation.contentMd}
              </p>
            </a>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && annotations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted">
            You haven&apos;t published any notes yet.
          </p>
          <a
            href="/app/search"
            className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 font-medium text-on-accent
                       hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Back to My Notes
          </a>
        </div>
      )}
    </div>
  );
}
