/**
 * ReaderSettingsPopover — settings panel for clean view mode.
 *
 * When the toolbar is hidden in clean view, this popover appears
 * from a cog button in the chapter navigation bar. Contains all
 * the same controls as WorkspaceToolbar: layout, font, dots,
 * wording toggles, and translation picker.
 *
 * Uses the same popover pattern as TranslationToggleMenu:
 * outside-click and Escape to close.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { TranslationToggleMenu } from "./TranslationToggleMenu";
import { TranslationPicker } from "./TranslationPicker";
import type { ReaderLayout, ReaderFont, AnnotationDotStyle } from "../../lib/workspace-prefs";
import type { TranslationToggles } from "../../lib/translation-toggles";
import { getOrderedFontOptions } from "../../lib/reader-fonts";

export interface ReaderSettingsProps {
  readerLayout: ReaderLayout;
  onToggleReaderLayout: () => void;
  readerFont: ReaderFont;
  onFontChange: (font: ReaderFont) => void;
  annotationDots: AnnotationDotStyle;
  onAnnotationDotsChange: (style: AnnotationDotStyle) => void;
  translationToggles: TranslationToggles;
  onToggleChange: (key: keyof TranslationToggles) => void;
  onExitCleanView: () => void;
}

export function ReaderSettingsPopover(props: ReaderSettingsProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const orderedFonts = useMemo(() => getOrderedFontOptions(), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
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

  return (
    <div className="relative" ref={popoverRef} onKeyDown={handleKeyDown}>
      {/* Cog trigger button — matches nav button styling */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-300 p-2
                   text-gray-600 hover:bg-gray-50
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Reading settings"
        title="Reading settings"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </button>

      {/* Settings popover */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200
                     bg-white shadow-lg"
          role="menu"
        >
          <div className="p-3 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Reading settings
            </p>

            {/* Layout toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Layout</span>
              <button
                type="button"
                onClick={props.onToggleReaderLayout}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs
                           font-medium text-gray-600 hover:bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {props.readerLayout === "centered" ? "Centered" : "Columns"}
              </button>
            </div>

            {/* Font picker — inline select matching label/control pattern */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Font</span>
              <select
                value={props.readerFont}
                onChange={(e) => props.onFontChange(e.target.value as ReaderFont)}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs
                           font-medium text-gray-600
                           focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Choose a reading font"
              >
                {orderedFonts.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Annotation dots */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Note markers</span>
              <button
                type="button"
                onClick={() => {
                  const next: AnnotationDotStyle =
                    props.annotationDots === "blue" ? "subtle" : props.annotationDots === "subtle" ? "hidden" : "blue";
                  props.onAnnotationDotsChange(next);
                }}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white
                           px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {props.annotationDots === "hidden" ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      props.annotationDots === "subtle" ? "bg-gray-300" : "bg-blue-500"
                    }`}
                    aria-hidden="true"
                  />
                )}
                {props.annotationDots === "blue" ? "Blue" : props.annotationDots === "subtle" ? "Subtle" : "Hidden"}
              </button>
            </div>

            {/* Wording toggles */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Wording</span>
              <TranslationToggleMenu
                toggles={props.translationToggles}
                onToggleChange={props.onToggleChange}
              />
            </div>

            {/* Translation picker — compact mode shows abbreviation only */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Translation</span>
              <TranslationPicker compact />
            </div>

            {/* Divider + show toolbar button */}
            <div className="border-t border-gray-100 pt-2">
              <button
                type="button"
                onClick={() => {
                  props.onExitCleanView();
                  setOpen(false);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md
                           border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium
                           text-gray-600 hover:bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {/* Expand/maximize icon */}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                Show toolbar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
