/**
 * UpdatePrompt — gentle notification when a new version is available.
 *
 * Grandmother Principle:
 * - Small, non-intrusive banner
 * - "A new version is available" not "Service worker update detected"
 * - Simple "Refresh" button
 * - Can be dismissed
 */

import { useState, useEffect } from "react";

export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    function handleUpdate() {
      setShowPrompt(true);
    }

    window.addEventListener("sw-update-available", handleUpdate);
    return () =>
      window.removeEventListener("sw-update-available", handleUpdate);
  }, []);

  if (!showPrompt) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-white
                 border border-gray-200 shadow-lg p-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900">
            A new version is available
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Refresh to get the latest improvements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPrompt(false)}
          className="rounded p-1 text-gray-400 hover:text-gray-600
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Dismiss"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm
                   font-medium text-white hover:bg-blue-700
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Refresh now
      </button>
    </div>
  );
}
