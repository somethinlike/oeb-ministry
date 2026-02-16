/**
 * FloatingPanel — draggable floating window for the annotation sidebar.
 *
 * When the user "undocks" the annotation panel, it pops out of the
 * split-pane into this free-floating window. Think of it like
 * tearing a tab out of a browser — same content, independent position.
 *
 * Drag mechanics:
 * - Grab the header bar to drag the whole panel
 * - Uses pointer events + setPointerCapture (same pattern as the divider)
 * - Position is clamped to keep the panel fully inside the viewport
 * - Default position: top-right corner with some margin
 *
 * Accessibility:
 * - role="dialog" so screen readers announce it properly
 * - aria-label describes what it is
 * - Header has a re-dock button to snap it back into the split-pane
 */

import { useState, useRef, useCallback, type ReactNode } from "react";

interface FloatingPanelProps {
  /** Panel content (AnnotationSidebar) */
  children: ReactNode;
  /** Called when user clicks the dock button */
  onDock: () => void;
}

/** Default size and position */
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 520;
const MARGIN = 16;

export function FloatingPanel({ children, onDock }: FloatingPanelProps) {
  // Position state — starts in the top-right area of the viewport
  const [pos, setPos] = useState(() => ({
    x: typeof window !== "undefined"
      ? window.innerWidth - DEFAULT_WIDTH - MARGIN
      : MARGIN,
    y: MARGIN + 60, // below the nav bar
  }));

  // Track the offset between mouse and panel corner during drag
  const dragOffset = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  /** Clamp position so the panel stays fully inside the viewport */
  const clampPosition = useCallback(
    (x: number, y: number) => ({
      x: Math.max(0, Math.min(x, window.innerWidth - DEFAULT_WIDTH)),
      y: Math.max(0, Math.min(y, window.innerHeight - DEFAULT_HEIGHT)),
    }),
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Record where the user grabbed relative to the panel's top-left.
      // This prevents the panel from "jumping" to the cursor position.
      dragOffset.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      e.preventDefault();
    },
    [pos.x, pos.y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPos(clampPosition(newX, newY));
    },
    [clampPosition],
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Your notes (floating)"
      className="fixed z-40 flex flex-col rounded-lg border border-gray-300 bg-white shadow-xl"
      style={{
        left: pos.x,
        top: pos.y,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
      }}
    >
      {/* Draggable header bar */}
      <div
        className="flex items-center justify-between rounded-t-lg border-b border-gray-200
                   bg-gray-50 px-3 py-2 cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className="text-sm font-semibold text-gray-700">Your Notes</span>
        <button
          type="button"
          onClick={onDock}
          className="flex items-center gap-1 rounded-md border border-gray-300
                     bg-white px-2 py-1 text-xs font-medium text-gray-600
                     hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Dock notes panel back into the sidebar"
          title="Dock back to sidebar"
        >
          {/* Dock icon — arrow pointing into a box */}
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
            />
          </svg>
          <span>Dock</span>
        </button>
      </div>

      {/* Panel content — scrollable */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
