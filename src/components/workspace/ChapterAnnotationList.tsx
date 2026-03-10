/**
 * ChapterAnnotationList — shows all annotations for the current chapter.
 *
 * Each annotation card shows:
 * - Verse reference (e.g., "John 3:16-18")
 * - Preview of the annotation content
 * - Edit button
 *
 * Grandmother Principle: simple list with clear actions.
 */

import { useWorkspace } from "./WorkspaceProvider";
import { BOOK_BY_ID } from "../../lib/constants";
import type { BookId } from "../../types/bible";
import type { Annotation } from "../../types/annotation";

interface ChapterAnnotationListProps {
  /** Hide the "Your Notes" header — used when FloatingPanel already shows a title bar */
  hideHeader?: boolean;
}

export function ChapterAnnotationList({ hideHeader = false }: ChapterAnnotationListProps) {
  const {
    book,
    chapter,
    annotations,
    annotationsLoading,
    selection,
    editAnnotation,
    startNewAnnotation,
    userId,
  } = useWorkspace();

  const bookInfo = BOOK_BY_ID.get(book as BookId);

  if (!userId) {
    return (
      <div className="p-4 text-center text-muted">
        <p>Sign in to create and view your notes.</p>
      </div>
    );
  }

  if (annotationsLoading) {
    return (
      <div className="space-y-3 p-4" role="status" aria-label="Loading notes">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-edge p-3">
            <div className="h-4 w-24 rounded bg-edge mb-2" />
            <div className="h-3 w-full rounded bg-edge" />
          </div>
        ))}
        <span className="sr-only">Loading your notes...</span>
      </div>
    );
  }

  /** Format a verse reference for display */
  function verseLabel(ann: Annotation): string {
    const name = bookInfo?.name ?? book;
    return ann.anchor.verseStart === ann.anchor.verseEnd
      ? `${name} ${chapter}:${ann.anchor.verseStart}`
      : `${name} ${chapter}:${ann.anchor.verseStart}-${ann.anchor.verseEnd}`;
  }

  /** Truncate annotation content for preview */
  function preview(content: string, maxLength = 120): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trimEnd() + "...";
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with "Write a note" button — hidden inside FloatingPanel which has its own title */}
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <h3 className="text-sm font-semibold text-body">
            Your Notes
            {annotations.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-faint">
                ({annotations.length})
              </span>
            )}
          </h3>
          {selection && (
            <button
              type="button"
              onClick={startNewAnnotation}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent
                         hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Write a note
            </button>
          )}
        </div>
      )}

      {/* Annotation list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {annotations.length === 0 ? (
          <div className="text-center py-8 text-faint">
            <p className="text-sm">No notes for this chapter yet.</p>
            <p className="text-xs mt-1">
              Select verses to start writing.
            </p>
          </div>
        ) : (
          annotations.map((ann) => (
            <button
              key={ann.id}
              type="button"
              onClick={() => editAnnotation(ann)}
              className="w-full rounded-lg border border-edge bg-panel p-3 text-left
                         hover:border-accent hover:bg-accent-soft
                         focus:outline-none focus:ring-2 focus:ring-ring
                         transition-colors duration-150"
              aria-label={`Edit note for ${verseLabel(ann)}`}
            >
              <p className="text-xs font-semibold text-accent mb-1">
                {verseLabel(ann)}
              </p>
              <p className="text-sm text-muted leading-snug">
                {preview(ann.contentMd)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
