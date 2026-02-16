/**
 * BottomSheet — mobile annotation panel that slides up from the bottom.
 *
 * Three snap points:
 * - **Peek:** just the drag handle + header visible (~64px)
 * - **Half:** takes up 50% of the viewport
 * - **Full:** takes up ~90% of the viewport (leaves room for the toolbar)
 *
 * Interaction model (car analogy for Ryan):
 * Think of a manual car window. You grab the handle (drag bar) and
 * pull up or push down. When you let go, the window "snaps" to the
 * nearest resting position — it doesn't stay wherever you left it.
 * Velocity matters too: a quick flick up goes to the next snap point
 * even if you haven't dragged that far yet.
 *
 * Uses CSS transform (translateY) for smooth 60fps animation.
 * Pointer events + setPointerCapture for drag tracking.
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

/** Snap point heights */
const SNAP_PEEK = 64;  // px — just the header
const SNAP_HALF = 0.5; // fraction of viewport
const SNAP_FULL = 0.9; // fraction of viewport

type SnapPoint = "peek" | "half" | "full";

interface BottomSheetProps {
  children: ReactNode;
  /** When true, auto-expand from peek to half (e.g., when verses selected) */
  expanded?: boolean;
}

/** Convert a snap point name to a pixel height */
function snapToPixels(snap: SnapPoint, vh: number): number {
  switch (snap) {
    case "peek":
      return SNAP_PEEK;
    case "half":
      return vh * SNAP_HALF;
    case "full":
      return vh * SNAP_FULL;
  }
}

/** Find the nearest snap point for a given height (in px) */
function nearestSnap(heightPx: number, vh: number): SnapPoint {
  const peekDist = Math.abs(heightPx - SNAP_PEEK);
  const halfDist = Math.abs(heightPx - vh * SNAP_HALF);
  const fullDist = Math.abs(heightPx - vh * SNAP_FULL);

  if (peekDist <= halfDist && peekDist <= fullDist) return "peek";
  if (halfDist <= fullDist) return "half";
  return "full";
}

/**
 * Determine snap point based on velocity (quick flick detection).
 * Negative velocity = dragging upward = expanding.
 */
function velocitySnap(
  currentSnap: SnapPoint,
  velocityPy: number,
): SnapPoint | null {
  const FLICK_THRESHOLD = 400; // px/s
  if (Math.abs(velocityPy) < FLICK_THRESHOLD) return null;

  if (velocityPy < 0) {
    if (currentSnap === "peek") return "half";
    if (currentSnap === "half") return "full";
    return null;
  }
  if (currentSnap === "full") return "half";
  if (currentSnap === "half") return "peek";
  return null;
}

export function BottomSheet({ children, expanded = false }: BottomSheetProps) {
  const [snap, setSnap] = useState<SnapPoint>("peek");
  const [sheetHeight, setSheetHeight] = useState(SNAP_PEEK);
  const [isDragging, setIsDragging] = useState(false);
  // Track viewport height for snap calculations (SSR-safe)
  const [vh, setVh] = useState(800);

  // Refs for drag tracking
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const lastPointerY = useRef(0);
  const lastPointerTime = useRef(0);
  const velocityRef = useRef(0);

  // Get actual viewport height on mount + resize
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Auto-expand when `expanded` prop changes (verse selection)
  useEffect(() => {
    if (expanded && snap === "peek") {
      setSnap("half");
      setSheetHeight(snapToPixels("half", vh));
    }
  }, [expanded, vh]);

  // Sync height when snap changes (not during drag)
  useEffect(() => {
    if (!isDragging) {
      setSheetHeight(snapToPixels(snap, vh));
    }
  }, [snap, isDragging, vh]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartHeight.current = sheetHeight;
      lastPointerY.current = e.clientY;
      lastPointerTime.current = Date.now();
      velocityRef.current = 0;
      e.preventDefault();
    },
    [sheetHeight],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      // Calculate velocity (px per second)
      const now = Date.now();
      const dt = now - lastPointerTime.current;
      if (dt > 0) {
        velocityRef.current =
          ((e.clientY - lastPointerY.current) / dt) * 1000;
      }
      lastPointerY.current = e.clientY;
      lastPointerTime.current = now;

      // Dragging up = negative delta = sheet grows
      const deltaY = dragStartY.current - e.clientY;
      const newHeight = Math.max(
        SNAP_PEEK,
        Math.min(vh * SNAP_FULL, dragStartHeight.current + deltaY),
      );
      setSheetHeight(newHeight);
    },
    [isDragging, vh],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // Check for velocity-based snap first (flick gesture)
    const flickSnap = velocitySnap(snap, velocityRef.current);
    if (flickSnap) {
      setSnap(flickSnap);
      setSheetHeight(snapToPixels(flickSnap, vh));
      return;
    }

    // Otherwise snap to the nearest point based on position
    const nearest = nearestSnap(sheetHeight, vh);
    setSnap(nearest);
    setSheetHeight(snapToPixels(nearest, vh));
  }, [isDragging, snap, sheetHeight, vh]);

  // The sheet is positioned at the bottom, then translated up by its height
  const maxHeight = vh * SNAP_FULL;
  const translateY = maxHeight - sheetHeight;

  return (
    <div
      role="dialog"
      aria-label="Your notes"
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 lg:hidden"
      style={{
        height: `${maxHeight}px`,
        transform: `translateY(${translateY}px)`,
        transition: isDragging ? "none" : "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      {/* Drag handle — the "grab bar" at the top */}
      <div
        className="flex-shrink-0 flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Visual pill handle */}
        <div
          className="h-1.5 w-10 rounded-full bg-gray-300"
          aria-hidden="true"
        />
        {/* Header text */}
        <div className="mt-2 flex w-full items-center justify-between px-4">
          <span className="text-sm font-semibold text-gray-700">
            Your Notes
          </span>
          {snap !== "peek" && (
            <button
              type="button"
              onClick={() => {
                setSnap("peek");
                setSheetHeight(SNAP_PEEK);
              }}
              className="text-xs text-gray-500 hover:text-gray-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
              aria-label="Minimize notes panel"
            >
              Minimize
            </button>
          )}
        </div>
      </div>

      {/* Content — scrollable when sheet is expanded */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
