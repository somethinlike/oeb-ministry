/**
 * WorkspaceToolbar — top bar for the workspace view.
 *
 * Shows:
 * - Breadcrumb navigation (Bible / Translation / Book / Chapter)
 * - Translation picker dropdown
 *
 * Grandmother Principle: clear breadcrumbs, familiar layout.
 */

import { useWorkspace } from "./WorkspaceProvider";
import { TranslationPicker } from "./TranslationPicker";
import { SUPPORTED_TRANSLATIONS, BOOK_BY_ID } from "../../lib/constants";
import type { BookId } from "../../types/bible";

export function WorkspaceToolbar() {
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

      {/* Translation switcher */}
      <TranslationPicker />
    </div>
  );
}
