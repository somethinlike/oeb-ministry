/**
 * WorkspaceToolbar — top bar for the workspace view.
 *
 * Shows:
 * - Breadcrumb navigation (Bible / Translation / Book / Chapter)
 * - Undock/dock button (pop out or snap back annotation panel)
 * - Swap sides button (flips reader + sidebar position)
 * - Translation picker dropdown
 *
 * Grandmother Principle: clear breadcrumbs, familiar layout.
 */

import { useWorkspace } from "./WorkspaceProvider";
import { TranslationPicker } from "./TranslationPicker";
import { SUPPORTED_TRANSLATIONS, BOOK_BY_ID } from "../../lib/constants";
import type { BookId } from "../../types/bible";
import type { ReaderLayout, ReaderFont, AnnotationDotStyle } from "../../lib/workspace-prefs";
import { TranslationToggleMenu } from "./TranslationToggleMenu";
import { FontPicker } from "./FontPicker";
import type { TranslationToggles } from "../../lib/translation-toggles";

interface WorkspaceToolbarProps {
  /** Whether the panes are currently swapped */
  swapped: boolean;
  /** Toggle swap state */
  onToggleSwap: () => void;
  /** Whether annotation panel is currently undocked (floating) */
  undocked: boolean;
  /** Pop annotation panel out into a floating window */
  onUndock: () => void;
  /** Snap annotation panel back into the split-pane */
  onDock: () => void;
  /** Current reader text layout mode */
  readerLayout: ReaderLayout;
  /** Toggle between centered and columns layout */
  onToggleReaderLayout: () => void;
  /** Current translation word-swap toggles */
  translationToggles: TranslationToggles;
  /** Called when user flips a word-swap toggle */
  onToggleChange: (key: keyof TranslationToggles) => void;
  /** Current reader font */
  readerFont: ReaderFont;
  /** Called when user picks a different font */
  onFontChange: (font: ReaderFont) => void;
  /** Current annotation dot display style */
  annotationDots: AnnotationDotStyle;
  /** Called when user changes annotation dot style */
  onAnnotationDotsChange: (style: AnnotationDotStyle) => void;
  /** Enter clean view mode (hides toolbar, shows cog in nav) */
  onEnterCleanView: () => void;
}

export function WorkspaceToolbar({
  swapped,
  onToggleSwap,
  undocked,
  onUndock,
  onDock,
  readerLayout,
  onToggleReaderLayout,
  translationToggles,
  onToggleChange,
  readerFont,
  onFontChange,
  annotationDots,
  onAnnotationDotsChange,
  onEnterCleanView,
}: WorkspaceToolbarProps) {
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
      <div className="flex items-center gap-2">
        {/* Clean view — hide toolbar and show only a cog in the nav bar */}
        <button
          type="button"
          onClick={onEnterCleanView}
          className="flex items-center gap-1.5 rounded-md border border-gray-300
                     bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600
                     hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Switch to clean reading view"
          title="Hide toolbar for distraction-free reading"
        >
          {/* Minimize/compress icon */}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
          <span>Focus</span>
        </button>

        {/* Undock / dock toggle — desktop only */}
        <button
          type="button"
          onClick={undocked ? onDock : onUndock}
          className="hidden lg:flex items-center gap-1.5 rounded-md border border-gray-300
                     bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600
                     hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={undocked ? "Dock notes back to sidebar" : "Pop notes out to floating window"}
          title={undocked ? "Dock notes back to sidebar" : "Pop notes out to floating window"}
        >
          {undocked ? (
            // Dock icon — minimize/compress arrows
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
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          ) : (
            // Undock icon — expand/pop-out arrows
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
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          )}
          <span>{undocked ? "Dock" : "Pop out"}</span>
        </button>

        {/* Swap sides button — desktop only, hidden when undocked */}
        {!undocked && (
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
        )}

        {/* Reader layout toggle — switch between centered prose and multi-column */}
        <button
          type="button"
          onClick={onToggleReaderLayout}
          className="flex items-center gap-1.5 rounded-md border border-gray-300
                     bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600
                     hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={readerLayout === "centered" ? "Switch to column layout" : "Switch to centered layout"}
          title={readerLayout === "centered" ? "Switch to column layout" : "Switch to centered layout"}
        >
          {readerLayout === "columns" ? (
            // Single-column / centered icon — lines centered in a box
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
                d="M3.75 6.75h16.5M6 12h12M3.75 17.25h16.5"
              />
            </svg>
          ) : (
            // Multi-column icon — two columns of lines
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
                d="M3.75 6h6.5M3.75 10h6.5M3.75 14h6.5M3.75 18h6.5M13.75 6h6.5M13.75 10h6.5M13.75 14h6.5M13.75 18h6.5"
              />
            </svg>
          )}
          <span>{readerLayout === "centered" ? "Columns" : "Centered"}</span>
        </button>

        {/* Font selector */}
        <FontPicker readerFont={readerFont} onFontChange={onFontChange} />

        {/* Annotation dot style — cycles: blue → subtle → hidden */}
        <button
          type="button"
          onClick={() => {
            const next: AnnotationDotStyle =
              annotationDots === "blue" ? "subtle" : annotationDots === "subtle" ? "hidden" : "blue";
            onAnnotationDotsChange(next);
          }}
          className="flex items-center gap-1.5 rounded-md border border-gray-300
                     bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600
                     hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Note markers: ${annotationDots}. Click to change.`}
          title={`Note markers: ${annotationDots === "blue" ? "Blue dots" : annotationDots === "subtle" ? "Gray dots" : "Hidden"}`}
        >
          {/* Dot icon that reflects the current style */}
          {annotationDots === "hidden" ? (
            // Crossed-out dot — eye-off icon
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            // Circle dot in the appropriate color
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                annotationDots === "subtle" ? "bg-gray-300" : "bg-blue-500"
              }`}
              aria-hidden="true"
            />
          )}
          <span>
            {annotationDots === "blue" ? "Dots" : annotationDots === "subtle" ? "Subtle" : "No dots"}
          </span>
        </button>

        {/* Word-swap toggles (LORD↔Yahweh, baptize↔immerse, etc.) */}
        <TranslationToggleMenu
          toggles={translationToggles}
          onToggleChange={onToggleChange}
        />

        {/* Translation switcher */}
        <TranslationPicker />
      </div>
    </div>
  );
}
