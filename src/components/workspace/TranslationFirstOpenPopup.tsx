/**
 * TranslationFirstOpenPopup — progressive-dismissal callout.
 *
 * Shows a friendly message the first time a user interacts with the
 * translation picker. Each click-away (or Escape press) fades the
 * popup slightly:
 *   - 0 dismissals: opacity 100%
 *   - 1 dismissal:  opacity 90%
 *   - 2 dismissals: opacity 80%
 *   - 3 dismissals: popup disappears permanently (localStorage)
 *
 * This follows the Grandmother Principle: a gentle nudge, not an
 * intrusive modal. No focus trap — the popup is informational only.
 */

import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "oeb-translation-info-dismissed";

/** Check if the popup was permanently dismissed in a previous session. */
function isDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // localStorage unavailable (SSR, privacy mode, etc.)
    return false;
  }
}

/** Permanently mark the popup as dismissed. */
function persistDismissal(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Silently ignore — user will just see it again next visit
  }
}

interface TranslationFirstOpenPopupProps {
  /** Whether the popup should be visible (controlled by parent) */
  triggerOpen: boolean;
}

export function TranslationFirstOpenPopup({
  triggerOpen,
}: TranslationFirstOpenPopupProps) {
  const [visible, setVisible] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  // Show the popup when triggered, but only if not already permanently dismissed
  useEffect(() => {
    if (triggerOpen && !isDismissed() && dismissCount < 3) {
      setVisible(true);
    }
  }, [triggerOpen, dismissCount]);

  // Handle a single dismissal step
  const handleDismiss = useCallback(() => {
    const nextCount = dismissCount + 1;
    setDismissCount(nextCount);
    if (nextCount >= 3) {
      setVisible(false);
      persistDismissal();
    }
  }, [dismissCount]);

  // Listen for click-outside and Escape key when visible
  useEffect(() => {
    if (!visible) return;

    function handleMouseDown(event: MouseEvent) {
      // Click outside the popup counts as a dismissal
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        handleDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleDismiss();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, handleDismiss]);

  if (!visible) return null;

  // Progressive opacity: 100% → 90% → 80% based on dismiss count
  const opacityClass =
    dismissCount === 0
      ? "opacity-100"
      : dismissCount === 1
        ? "opacity-90"
        : "opacity-80";

  return (
    <div
      ref={popupRef}
      role="status"
      aria-live="polite"
      className={`absolute top-full left-0 right-0 mt-2 z-40
                  rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-md
                  transition-opacity duration-300
                  ${opacityClass}`}
    >
      <p className="text-sm text-blue-800 leading-relaxed">
        Each Bible translation has its own story.{" "}
        <a
          href="/translations"
          className="font-semibold text-blue-700 underline hover:text-blue-900
                     focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          Visit our Translations page
        </a>{" "}
        to learn more.
      </p>
    </div>
  );
}
