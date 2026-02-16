/**
 * TranslationPicker — dropdown to switch Bible translations.
 *
 * Shows all supported translations in a native <select> for accessibility.
 * Preserves current book/chapter when possible (if the book exists in
 * the new translation). If not, falls back to the book picker.
 *
 * Includes:
 * - ⓘ info icon linking to /translations (TranslationInfoIcon)
 * - First-open popup nudging users to learn about translations
 *
 * Grandmother Principle: plain dropdown, clear labels, gentle guidance.
 */

import { useState, useRef } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import { SUPPORTED_TRANSLATIONS } from "../../lib/constants";
import { TranslationInfoIcon } from "./TranslationInfoIcon";
import { TranslationFirstOpenPopup } from "./TranslationFirstOpenPopup";

export function TranslationPicker() {
  const { translation, switchTranslation } = useWorkspace();
  // Track whether the user has interacted with the select at least once
  const [hasOpened, setHasOpened] = useState(false);
  const hasFiredRef = useRef(false);

  function handleFirstFocus() {
    // Only trigger the popup on the very first focus of this session
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      setHasOpened(true);
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      <label
        htmlFor="translation-picker"
        className="text-sm font-medium text-gray-600 whitespace-nowrap"
      >
        Translation
      </label>
      <select
        id="translation-picker"
        value={translation}
        onChange={(e) => switchTranslation(e.target.value)}
        onFocus={handleFirstFocus}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm
                   font-medium text-gray-700
                   focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Choose a Bible translation"
      >
        {SUPPORTED_TRANSLATIONS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <TranslationInfoIcon />

      {/* Progressive-dismissal popup — shows on first interaction */}
      <TranslationFirstOpenPopup triggerOpen={hasOpened} />
    </div>
  );
}
