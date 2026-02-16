/**
 * WorkspaceToolbar — top bar for the workspace view.
 *
 * Shows:
 * - Breadcrumb navigation (Bible / Translation / Book / Chapter)
 * - Swap sides button (flips reader + sidebar position)
 * - Translation picker dropdown
 *
 * Grandmother Principle: clear breadcrumbs, familiar layout.
 */

import { useWorkspace } from "./WorkspaceProvider";
import { TranslationPicker } from "./TranslationPicker";
import { SUPPORTED_TRANSLATIONS, BOOK_BY_ID } from "../../lib/constants";
import type { BookId } from "../../types/bible";

interface WorkspaceToolbarProps {
  /** Whether the panes are currently swapped */
  swapped: boolean;
  /** Toggle swap state */
  onToggleSwap: () => void;
}

export function WorkspaceToolbar({ swapped, onToggleSwap }: WorkspaceToolbarProps) {
  const { translation, book, chapter } = useWorkspace();

  const translationInfo = SUPPORTED_TRANSLATIONS.find(
    (t) => t.id === translation,
  );
  const bookInfo = BOOK_BY_ID.get(book as BookId);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 rounded-t-lg">
      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
          <li>
            <a
              href="/app/read"
              className="hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
            >
              Bible
            </a>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <a
              href={`/app/read/${translation}`}
              className="hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
            >
              {translationInfo?.name ?? translation}
            </a>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <a
              href={`/app/read/${translation}/${book}`}
              className="hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
            >
              {bookInfo?.name ?? book}
            </a>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <span className="font-medium text-gray-900 px-1">
              Chapter {chapter}
            </span>
          </li>
        </ol>
      </nav>

      {/* Right-side actions */}
      <div className="flex items-center gap-3">
        {/* Swap sides button — desktop only */}
        <button
          type="button"
          onClick={onToggleSwap}
          className="hidden lg:flex items-center gap-1.5 rounded-md border border-gray-300
                     bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600
                     hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={swapped ? "Move Bible text to the left" : "Move Bible text to the right"}
          title={swapped ? "Move Bible text to the left" : "Move Bible text to the right"}
        >
          {/* Two-column swap icon */}
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <span>Swap</span>
        </button>

        {/* Translation switcher */}
        <TranslationPicker />
      </div>
    </div>
  );
}
