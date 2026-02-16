/**
 * SplitPaneDivider — draggable handle between reader and annotation panes.
 *
 * Uses pointer events + setPointerCapture for reliable drag tracking.
 * This approach works on both mouse and touch without separate handlers.
 *
 * How it works (car analogy for Ryan):
 * - setPointerCapture is like locking the steering wheel to one lane —
 *   once you grab the divider, all pointer movement goes to it, even
 *   if your mouse drifts over other elements. Releasing unlocks it.
 * - The divider reports its position as a ratio (0.3–0.7) relative to
 *   the container width. The parent uses this ratio to set CSS grid columns.
 */

import { useCallback, useRef } from "react";

interface SplitPaneDividerProps {
  /** Called continuously while dragging, with the new split ratio */
  onResize: (ratio: number) => void;
  /** Called once when dragging ends (for persisting to localStorage) */
  onResizeEnd: (ratio: number) => void;
  /** Reference to the container element for calculating relative position */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function SplitPaneDivider({
  onResize,
  onResizeEnd,
  containerRef,
}: SplitPaneDividerProps) {
  const draggingRef = useRef(false);

  const calculateRatio = useCallback(
    (clientX: number): number => {
      const container = containerRef.current;
      if (!container) return 0.6;
      const rect = container.getBoundingClientRect();
      // Convert mouse X to a 0–1 ratio relative to the container
      const raw = (clientX - rect.left) / rect.width;
      // Clamp to 30%–70% to prevent collapsing either pane
      return Math.min(0.7, Math.max(0.3, raw));
    },
    [containerRef],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // "Lock" the pointer to this element — all future pointer events
      // go here, even if the user moves outside the divider
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      // Prevent text selection while dragging
      e.preventDefault();
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const ratio = calculateRatio(e.clientX);
      onResize(ratio);
    },
    [calculateRatio, onResize],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const ratio = calculateRatio(e.clientX);
      onResizeEnd(ratio);
    },
    [calculateRatio, onResizeEnd],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panes"
      tabIndex={0}
      className="hidden lg:flex items-center justify-center w-2 cursor-col-resize
                 bg-gray-100 hover:bg-blue-100 active:bg-blue-200
                 transition-colors duration-100 select-none flex-shrink-0"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => {
        // Keyboard support: arrow keys nudge the divider by 2%
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const container = containerRef.current;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          // Get current ratio from the first grid column
          const style = getComputedStyle(container);
          const cols = style.gridTemplateColumns.split(" ");
          const firstColPx = parseFloat(cols[0]);
          const currentRatio = firstColPx / rect.width;
          const nudge = e.key === "ArrowLeft" ? -0.02 : 0.02;
          const newRatio = Math.min(0.7, Math.max(0.3, currentRatio + nudge));
          onResize(newRatio);
          onResizeEnd(newRatio);
        }
      }}
    >
      {/* Visual grip dots */}
      <div className="flex flex-col gap-1" aria-hidden="true">
        <div className="h-1 w-1 rounded-full bg-gray-400" />
        <div className="h-1 w-1 rounded-full bg-gray-400" />
        <div className="h-1 w-1 rounded-full bg-gray-400" />
      </div>
    </div>
  );
}
