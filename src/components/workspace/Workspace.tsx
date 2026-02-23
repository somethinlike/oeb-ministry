/**
 * Workspace — the top-level split-pane Bible reader + annotation sidebar.
 *
 * This is the "desk" where reading and annotating happen side by side.
 *
 * Layout modes (desktop ≥1024px):
 * - **Docked:** resizable split-pane (reader + sidebar) with draggable divider
 * - **Undocked:** reader fills full width, sidebar floats as a draggable window
 *
 * Mobile (<1024px): full-screen reader + bottom sheet for annotations
 *
 * Split ratio, side preference, and dock state persist to localStorage.
 */

import { useState, useRef, useCallback } from "react";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceProvider";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import { ReaderPane } from "./ReaderPane";
import { AnnotationSidebar } from "./AnnotationSidebar";
import { SplitPaneDivider } from "./SplitPaneDivider";
import { FloatingPanel } from "./FloatingPanel";
import { BottomSheet } from "./BottomSheet";
import {
  loadWorkspacePrefs,
  saveWorkspacePrefs,
  type ReaderLayout,
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
  // Load persisted preferences (split ratio + swapped sides + undocked)
  const [prefs] = useState(() => loadWorkspacePrefs());
  const [splitRatio, setSplitRatio] = useState(prefs.splitRatio);
  const [swapped, setSwapped] = useState(prefs.swapped);
  const [undocked, setUndocked] = useState(prefs.undocked);
  const [readerLayout, setReaderLayout] = useState<ReaderLayout>(prefs.readerLayout);

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

  const handleUndock = useCallback(() => {
    setUndocked(true);
    saveWorkspacePrefs({ undocked: true });
  }, []);

  const handleDock = useCallback(() => {
    setUndocked(false);
    saveWorkspacePrefs({ undocked: false });
  }, []);

  const toggleReaderLayout = useCallback(() => {
    setReaderLayout((prev) => {
      const next: ReaderLayout = prev === "centered" ? "columns" : "centered";
      saveWorkspacePrefs({ readerLayout: next });
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
  const readerPane = <ReaderPane readerLayout={readerLayout} />;
  const leftPane = swapped ? <AnnotationSidebar /> : readerPane;
  const rightPane = swapped ? readerPane : <AnnotationSidebar />;

  return (
    <WorkspaceProvider
      translation={translation}
      book={book}
      chapter={chapter}
      userId={userId}
    >
      <div className="flex flex-col h-[calc(100vh-8rem)] rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Toolbar: breadcrumbs + undock/swap + translation picker */}
        <WorkspaceToolbar
          swapped={swapped}
          onToggleSwap={toggleSwap}
          undocked={undocked}
          onUndock={handleUndock}
          onDock={handleDock}
          readerLayout={readerLayout}
          onToggleReaderLayout={toggleReaderLayout}
        />

        {/* Split pane area */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0"
        >
          {/* Mobile: full-screen reader + bottom sheet for annotations */}
          <div className="lg:hidden h-full min-h-0 overflow-hidden">
            <ReaderPane readerLayout={readerLayout} />
            <MobileBottomSheet />
          </div>

          {/* Desktop: docked split-pane OR full-width reader (when undocked) */}
          {undocked ? (
            // Undocked: reader takes full width
            <div className="hidden lg:block h-full min-h-0 overflow-hidden">
              <ReaderPane readerLayout={readerLayout} />
            </div>
          ) : (
            // Docked: split pane with divider
            <div
              className="hidden lg:grid h-full min-h-0"
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
          )}
        </div>
      </div>

      {/* Floating annotation panel — rendered outside the main container */}
      {undocked && (
        <div className="hidden lg:block">
          <FloatingPanel onDock={handleDock}>
            <AnnotationSidebar />
          </FloatingPanel>
        </div>
      )}
    </WorkspaceProvider>
  );
}

/**
 * MobileBottomSheet — small wrapper that reads workspace context
 * to know when to auto-expand (on verse selection).
 * Needs to be a separate component because it uses useWorkspace(),
 * which requires being inside WorkspaceProvider.
 */
function MobileBottomSheet() {
  const { selection } = useWorkspace();
  return (
    <BottomSheet expanded={selection !== null}>
      <AnnotationSidebar />
    </BottomSheet>
  );
}
