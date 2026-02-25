/**
 * TranslationPicker — custom dropdown to switch Bible translations.
 *
 * Shows abbreviation + full name (e.g., "OEB — Open English Bible (US)").
 *
 * Responsive behavior:
 * - Desktop (md+): Trigger shows abbreviation + full name, dropdown
 *   matches trigger width, longer names truncate with ellipsis.
 * - Mobile (< md): Trigger shows abbreviation only ("OEB"), dropdown
 *   expands wider to show as much of the full names as possible.
 *
 * Includes:
 * - ⓘ info icon linking to /translations (TranslationInfoIcon)
 * - First-open popup nudging users to learn about translations
 *
 * Grandmother Principle: clear labels, obvious selected state, gentle guidance.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import { SUPPORTED_TRANSLATIONS } from "../../lib/constants";
import { TranslationInfoIcon } from "./TranslationInfoIcon";
import { TranslationFirstOpenPopup } from "./TranslationFirstOpenPopup";

interface TranslationPickerProps {
  /** When true, always show abbreviation only (used in compact popover contexts) */
  compact?: boolean;
}

export function TranslationPicker({ compact = false }: TranslationPickerProps) {
  const { translation, switchTranslation } = useWorkspace();
  const [open, setOpen] = useState(false);
  // Track whether the user has interacted at least once (for first-open popup)
  const [hasOpened, setHasOpened] = useState(false);
  const hasFiredRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentTranslation = SUPPORTED_TRANSLATIONS.find(
    (t) => t.id === translation,
  );

  // ── Open/close logic ──

  function handleTriggerClick() {
    // Fire first-open popup on the very first interaction
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      setHasOpened(true);
    }
    setOpen((prev) => !prev);
  }

  function handleSelect(id: string) {
    if (id !== translation) {
      switchTranslation(id);
    }
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Close on outside click (same pattern as TranslationToggleMenu)
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [open],
  );

  return (
    <div className="relative flex items-center gap-2">
      {/* Custom dropdown container */}
      <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
        {/* Trigger button — sized to current selection's text */}
        <button
          ref={triggerRef}
          type="button"
          onClick={handleTriggerClick}
          className="flex items-center gap-1.5 rounded-md border border-gray-300
                     bg-white px-3 py-1.5 text-sm font-medium text-gray-700
                     hover:bg-gray-50 focus:border-blue-500 focus:outline-none
                     focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Choose a Bible translation"
        >
          {/* Abbreviation always visible */}
          <span className="font-semibold">
            {currentTranslation?.abbreviation ?? translation}
          </span>
          {/* Full name hidden on small screens or in compact mode */}
          {!compact && (
            <span className="hidden md:inline text-gray-500">
              — {currentTranslation?.name ?? translation}
            </span>
          )}
          {/* Chevron indicator */}
          <svg
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>

        {/* Dropdown panel */}
        {open && (
          <ul
            className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-gray-200
                       bg-white shadow-lg overflow-hidden
                       w-full min-w-[18rem]"
            role="listbox"
            aria-label="Bible translations"
          >
            {SUPPORTED_TRANSLATIONS.map((t) => {
              const isSelected = t.id === translation;
              return (
                <li
                  key={t.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(t.id);
                    }
                  }}
                  tabIndex={0}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer
                    truncate
                    ${isSelected
                      ? "bg-blue-50 text-blue-900 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                    }
                    focus:outline-none focus:bg-blue-50`}
                >
                  <span className="font-semibold shrink-0">
                    {t.abbreviation}
                  </span>
                  <span className="text-gray-500 truncate">
                    — {t.name}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TranslationInfoIcon />

      {/* Progressive-dismissal popup — shows on first interaction */}
      <TranslationFirstOpenPopup triggerOpen={hasOpened} />
    </div>
  );
}
