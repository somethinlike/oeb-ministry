/**
 * TranslationToggleMenu — dropdown for word-swap preferences.
 *
 * Shows a "Wording" button in the toolbar. Clicking it opens a popover
 * with toggle switches for common translation disagreements:
 * - God's name: LORD ↔ Yahweh
 * - Baptize ↔ Immerse
 * - Church ↔ Assembly
 * - Only begotten ↔ One and only
 *
 * Grandmother Principle: plain language, no theological jargon in labels.
 * Tier 2 info available via description text under each toggle.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  TOGGLE_INFO,
  type TranslationToggles,
} from "../../lib/translation-toggles";

interface TranslationToggleMenuProps {
  /** Current toggle states */
  toggles: TranslationToggles;
  /** Called when user flips a toggle */
  onToggleChange: (key: keyof TranslationToggles) => void;
}

/** The toggle keys in display order */
const TOGGLE_KEYS: (keyof TranslationToggles)[] = [
  "divineName",
  "baptism",
  "assembly",
  "onlyBegotten",
];

export function TranslationToggleMenu({
  toggles,
  onToggleChange,
}: TranslationToggleMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
      }
    },
    [open],
  );

  // Count how many toggles are active (for badge)
  const activeCount = TOGGLE_KEYS.filter((key) => toggles[key]).length;

  return (
    <div className="relative" ref={menuRef} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-md border border-gray-300
                   bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600
                   hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Word choices"
        title="Choose how certain words are translated"
      >
        {/* Settings/adjustments icon */}
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
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
          />
        </svg>
        <span>Wording</span>
        {/* Active count badge */}
        {activeCount > 0 && (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
            {activeCount}
          </span>
        )}
      </button>

      {/* Dropdown popover */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200
                     bg-white shadow-lg"
          role="menu"
        >
          <div className="p-3 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Word choices
            </p>

            {TOGGLE_KEYS.map((key) => {
              const info = TOGGLE_INFO[key];
              const isOn = toggles[key];
              // Button shows what you'd switch TO:
              // when off (default wording active), button shows the alternate
              // when on (alternate active), button shows the default
              const buttonLabel = isOn ? info.offLabel : info.onLabel;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center gap-3">
                    {/* Toggle button — shows the word you'd switch to */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      onClick={() => onToggleChange(key)}
                      className={`
                        shrink-0 rounded-md px-3 py-1 text-xs font-semibold
                        transition-colors duration-150 focus:outline-none focus:ring-2
                        focus:ring-blue-500 focus:ring-offset-1
                        ${isOn
                          ? "bg-blue-600 text-white border border-blue-600"
                          : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}
                      `}
                      aria-label={`${info.label}: switch to ${buttonLabel}`}
                    >
                      {buttonLabel}
                    </button>
                    <span className="text-sm text-gray-500">
                      {info.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-tight pl-0.5">
                    {info.description}
                  </p>
                </div>
              );
            })}

            {/* Tier 2 hint — denomination presets are coming */}
            <p className="text-[11px] text-gray-400 leading-tight border-t border-gray-100 pt-2 mt-1">
              Denomination presets coming soon — choose your tradition and these will be set automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
