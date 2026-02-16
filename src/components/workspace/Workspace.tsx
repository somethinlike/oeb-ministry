/**
 * Workspace — the top-level split-pane Bible reader + annotation sidebar.
 *
 * This is the "desk" where reading and annotating happen side by side.
 *
 * Layout:
 * - Desktop (≥1024px): resizable split-pane with draggable divider.
 *   Default 60/40. User can drag to resize (30–70% range).
 *   Swap button flips reader to the right side.
 * - Mobile (<1024px): single column, reader only (Phase 4 adds bottom sheet)
 *
 * Split ratio and side preference persist to localStorage.
 */

import { useState, useRef, useCallback } from "react";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import { ReaderPane } from "./ReaderPane";
import { AnnotationSidebar } from "./AnnotationSidebar";
import { SplitPaneDivider } from "./SplitPaneDivider";
import {
  loadWorkspacePrefs,
  saveWorkspacePrefs,
} from "../../lib/workspace-prefs";

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
  // Load persisted preferences (split ratio + swapped sides)
  const [prefs] = useState(() => loadWorkspacePrefs());
  const [splitRatio, setSplitRatio] = useState(prefs.splitRatio);
  const [swapped, setSwapped] = useState(prefs.swapped);

  // Ref to the split container — divider needs it to calculate ratio
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback((ratio: number) => {
    setSplitRatio(ratio);
  }, []);

  const handleResizeEnd = useCallback((ratio: number) => {
    setSplitRatio(ratio);
    saveWorkspacePrefs({ splitRatio: ratio });
  }, []);

  const toggleSwap = useCallback(() => {
    setSwapped((prev) => {
      const next = !prev;
      saveWorkspacePrefs({ swapped: next });
      return next;
    });
  }, []);

  // Build CSS grid template from the split ratio.
  // The divider gets a fixed 8px (0.5rem) column.
  const readerFr = `${splitRatio}fr`;
  const sidebarFr = `${1 - splitRatio}fr`;
  const gridTemplate = swapped
    ? `${sidebarFr} 0.5rem ${readerFr}`
    : `${readerFr} 0.5rem ${sidebarFr}`;

  // Determine which pane goes first based on swap state
  const leftPane = swapped ? <AnnotationSidebar /> : <ReaderPane />;
  const rightPane = swapped ? <ReaderPane /> : <AnnotationSidebar />;

  return (
    <WorkspaceProvider
      translation={translation}
      book={book}
      chapter={chapter}
      userId={userId}
    >
      <div className="flex flex-col h-[calc(100vh-8rem)] rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Toolbar: breadcrumbs + swap button + translation picker */}
        <WorkspaceToolbar swapped={swapped} onToggleSwap={toggleSwap} />

        {/* Split pane with draggable divider */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 grid grid-cols-1"
          style={{
            // Only apply split layout on desktop (lg+).
            // CSS media query in style isn't possible, so we use
            // the lg: classes for visibility and this inline style
            // for the grid template on desktop.
          }}
        >
          {/* Mobile: single column, reader only */}
          <div className="lg:hidden min-h-0 overflow-hidden">
            <ReaderPane />
          </div>

          {/* Desktop: split pane with divider — hidden on mobile */}
          <div
            className="hidden lg:grid min-h-0"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="min-h-0 overflow-hidden">
              {leftPane}
            </div>
            <SplitPaneDivider
              containerRef={containerRef}
              onResize={handleResize}
              onResizeEnd={handleResizeEnd}
            />
            <div className="min-h-0 overflow-hidden">
              {rightPane}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
