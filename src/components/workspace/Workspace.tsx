/**
 * Workspace — the top-level split-pane Bible reader + annotation sidebar.
 *
 * This is the "desk" where reading and annotating happen side by side.
 *
 * Layout:
 * - Desktop (≥1024px): CSS grid split — reader 60%, sidebar 40%
 * - Mobile (<1024px): single column, reader only (sidebar via floating
 *   action in standalone ChapterReader mode — Phase 4 adds bottom sheet)
 *
 * The workspace wraps everything in WorkspaceProvider so all child
 * components share state through React Context.
 */

import { WorkspaceProvider } from "./WorkspaceProvider";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import { ReaderPane } from "./ReaderPane";
import { AnnotationSidebar } from "./AnnotationSidebar";

interface WorkspaceProps {
  translation: string;
  book: string;
  chapter: number;
  userId: string | null;
}

export function Workspace({
  translation,
  book,
  chapter,
  userId,
}: WorkspaceProps) {
  return (
    <WorkspaceProvider
      translation={translation}
      book={book}
      chapter={chapter}
      userId={userId}
    >
      <div className="flex flex-col h-[calc(100vh-8rem)] rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Toolbar: breadcrumbs + translation picker */}
        <WorkspaceToolbar />

        {/* Split pane: reader left, annotations right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[3fr_2fr] min-h-0">
          {/* Reader pane — always visible */}
          <ReaderPane />

          {/* Annotation sidebar — hidden on mobile for now (Phase 4) */}
          <div className="hidden lg:block min-h-0 overflow-hidden">
            <AnnotationSidebar />
          </div>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
