/**
 * AnnotationSidebar — the right pane of the workspace.
 *
 * Shows either:
 * - ChapterAnnotationList (default: all notes for current chapter)
 * - AnnotationPanel (when user selects verses and clicks "Write a note",
 *   or clicks an existing annotation to edit it)
 *
 * Switches between these views based on workspace state.
 */

import { useWorkspace } from "./WorkspaceProvider";
import { ChapterAnnotationList } from "./ChapterAnnotationList";
import { AnnotationPanel } from "../AnnotationPanel";

interface AnnotationSidebarProps {
  /** Hide the "Your Notes" header — used inside FloatingPanel which has its own title bar */
  hideHeader?: boolean;
}

export function AnnotationSidebar({ hideHeader = false }: AnnotationSidebarProps) {
  const {
    translation,
    book,
    chapter,
    selection,
    sidebarView,
    editingAnnotation,
    userId,
    onAnnotationSaved,
    onAnnotationDeleted,
    showAnnotationList,
  } = useWorkspace();

  // If not authenticated, the list view handles showing a sign-in prompt
  if (!userId) {
    return (
      <div className="h-full bg-white">
        <ChapterAnnotationList hideHeader={hideHeader} />
      </div>
    );
  }

  // ── Editor view ──
  if (sidebarView === "editor") {
    // Determine verse range for the editor
    const verseStart = editingAnnotation
      ? editingAnnotation.anchor.verseStart
      : selection?.start ?? 1;
    const verseEnd = editingAnnotation
      ? editingAnnotation.anchor.verseEnd
      : selection?.end ?? verseStart;

    return (
      <div className="h-full bg-white overflow-y-auto">
        {/* Back button to return to list */}
        <div className="border-b border-gray-200 px-4 py-2">
          <button
            type="button"
            onClick={showAnnotationList}
            className="text-sm text-gray-500 hover:text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
          >
            &larr; Back to notes
          </button>
        </div>
        <div className="p-4">
          <AnnotationPanel
            userId={userId}
            translation={translation}
            book={book}
            chapter={chapter}
            verseStart={verseStart}
            verseEnd={verseEnd}
            existing={editingAnnotation}
            onSaved={onAnnotationSaved}
            onDeleted={onAnnotationDeleted}
          />
        </div>
      </div>
    );
  }

  // ── Default: list view ──
  return (
    <div className="h-full bg-white">
      <ChapterAnnotationList hideHeader={hideHeader} />
    </div>
  );
}
