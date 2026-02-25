/**
 * ChapterReader — the core Bible reading component.
 *
 * Renders verses with:
 * - Tap-to-select verse highlighting (tap one, tap another for range)
 * - "Write a note" button when verses are selected (standalone mode)
 * - Previous/next chapter navigation
 * - Annotation indicators on verses that have notes
 *
 * Supports two modes:
 * - **Standalone** (no callbacks): manages its own selection state,
 *   navigates via <a href> links. Used by /app/annotate.
 * - **Workspace** (callbacks provided): selection is controlled externally,
 *   navigation fires callbacks. Used by the split-pane workspace.
 *
 * Grandmother Principle:
 * - Clean, readable text with good line spacing
 * - Verse numbers are subtle but visible
 * - Selection is visually obvious (blue highlight)
 * - "Write a note" appears right where the user is looking
 */

import { useState, useEffect } from "react";
import type { ChapterData, BookId } from "../types/bible";
import {
  updateSelection,
  isVerseSelected,
  type VerseSelection,
} from "../lib/verse-selection";
import { BOOK_BY_ID, BIBLE_BASE_PATH } from "../lib/constants";
import type { ReaderLayout, ReaderFont, AnnotationDotStyle } from "../lib/workspace-prefs";
import { getFontFamily } from "../lib/reader-fonts";
import {
  applyTranslationToggles,
  loadTranslationToggles,
  TOGGLE_DEFAULTS,
  type TranslationToggles,
} from "../lib/translation-toggles";
import { ReaderSettingsPopover, type ReaderSettingsProps } from "./workspace/ReaderSettingsPopover";

/**
 * Detect placeholder verses in work-in-progress translations.
 * The OEB uses "{ }" or "{}" for verses not yet translated.
 */
function isPlaceholderVerse(text: string): boolean {
  const stripped = text.replace(/[{}\s]/g, "");
  return stripped.length === 0;
}

interface ChapterReaderProps {
  translation: string;
  book: string;
  chapter: number;
  /** Workspace mode: externally controlled selection */
  selection?: VerseSelection | null;
  /** Workspace mode: called when user taps a verse */
  onVerseSelect?: (selection: VerseSelection | null) => void;
  /** Workspace mode: called for prev/next chapter navigation */
  onNavigateChapter?: (chapter: number) => void;
  /** Set of verse numbers that have annotations (shows dot indicators) */
  annotatedVerses?: Set<number>;
  /** Text layout: "centered" for max-width prose, "columns" for full-width multi-column */
  readerLayout?: ReaderLayout;
  /** Word-swap toggle preferences (in standalone mode, reads from localStorage if not provided) */
  translationToggles?: TranslationToggles;
  /** Reading font preference (workspace mode passes this; standalone uses browser default) */
  readerFont?: ReaderFont;
  /** How annotation dots display next to verse numbers. Default "blue" */
  annotationDots?: AnnotationDotStyle;
  /** Whether clean view is active (hides toolbar, shows cog in nav) */
  cleanView?: boolean;
  /** Settings callbacks for the cog popover in clean view */
  settingsProps?: ReaderSettingsProps;
}

export function ChapterReader({
  translation,
  book,
  chapter,
  selection: externalSelection,
  onVerseSelect,
  onNavigateChapter,
  annotatedVerses,
  readerLayout = "centered",
  translationToggles,
  readerFont,
  annotationDots = "blue",
  cleanView = false,
  settingsProps,
}: ChapterReaderProps) {
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Internal selection state — only used in standalone mode
  const [internalSelection, setInternalSelection] =
    useState<VerseSelection | null>(null);

  // Resolve toggle prefs — workspace mode passes them as a prop,
  // standalone mode reads from localStorage
  const resolvedToggles = translationToggles ?? loadTranslationToggles();

  // Compute CSS font-family from the font key (undefined in standalone → browser default)
  const fontFamily = readerFont ? getFontFamily(readerFont) : undefined;

  // In workspace mode, selection comes from props; standalone uses local state
  const isWorkspaceMode = onVerseSelect !== undefined;
  const selection = isWorkspaceMode ? (externalSelection ?? null) : internalSelection;

  const bookInfo = BOOK_BY_ID.get(book as BookId);

  // Fetch chapter data from static JSON files
  useEffect(() => {
    setLoading(true);
    setError(null);
    // Clear internal selection on chapter change (standalone mode only)
    if (!isWorkspaceMode) setInternalSelection(null);

    fetch(`${BIBLE_BASE_PATH}/${translation}/${book}/${chapter}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Chapter not available");
        return res.json();
      })
      .then((data: ChapterData) => {
        setChapterData(data);
        setLoading(false);
      })
      .catch(() => {
        setError(
          "This chapter isn't available yet. Try a different chapter or translation.",
        );
        setLoading(false);
      });
  }, [translation, book, chapter]);

  function handleVerseClick(verseNumber: number) {
    const newSelection = updateSelection(selection, verseNumber);
    if (isWorkspaceMode) {
      onVerseSelect!(newSelection);
    } else {
      setInternalSelection(newSelection);
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading chapter">
        {/* Skeleton lines that mimic verse text */}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex gap-2 animate-pulse">
            <div className="h-4 w-6 rounded bg-gray-200" />
            <div className="h-4 flex-1 rounded bg-gray-200" />
          </div>
        ))}
        <span className="sr-only">Loading chapter text...</span>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    const isOEB = translation === "oeb-us";
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
        role="alert"
      >
        <p className="text-lg text-amber-800">{error}</p>
        {/* OEB-specific explanation — the OEB is still being translated,
            so missing chapters are expected. Link to their project. */}
        {isOEB && (
          <p className="mt-3 text-sm text-amber-700">
            The Open English Bible is a free, open-source translation that's still in progress.
            Some books and chapters haven't been translated yet.{" "}
            <a
              href="https://openenglishbible.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-amber-900"
            >
              Visit their project
            </a>{" "}
            to learn more or contribute.
          </p>
        )}
        <a
          href={`/app/read/${translation}/${book}`}
          className="mt-4 inline-block rounded-lg bg-amber-600 px-6 py-2 font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          Pick a different chapter
        </a>
      </div>
    );
  }

  if (!chapterData) return null;

  // Build selection display text for the "Write a note" button
  const selectionLabel = selection
    ? selection.start === selection.end
      ? `${bookInfo?.name} ${chapter}:${selection.start}`
      : `${bookInfo?.name} ${chapter}:${selection.start}-${selection.end}`
    : "";

  // In column mode, CSS columns handles multi-column layout.
  // "columns: auto 20rem" means the browser creates as many columns
  // as fit, each at least 20rem (~320px) wide. On small screens
  // that naturally results in 1 column, on wide screens 2-4+.
  const isColumns = readerLayout === "columns";

  // Shared nav button styling — compact on small screens, with text label on md+
  const navBtnClass =
    "flex items-center gap-1.5 rounded-lg border border-gray-300 p-2 md:px-3 md:py-2 text-gray-600 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500";

  /** Render a prev/next navigation element (button in workspace mode, <a> in standalone) */
  function NavButton({
    direction,
    targetChapter,
  }: {
    direction: "prev" | "next";
    targetChapter: number;
  }) {
    const isPrev = direction === "prev";
    const arrow = isPrev ? (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    ) : (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    );

    // Text label shown on md+ screens, hidden on small
    const textLabel = (
      <span className="hidden md:inline text-sm">
        Chapter {targetChapter}
      </span>
    );

    const ariaLabel = `Go to chapter ${targetChapter}`;

    // Content order: prev shows [← Chapter N], next shows [Chapter N →]
    const content = isPrev ? (
      <>{arrow}{textLabel}</>
    ) : (
      <>{textLabel}{arrow}</>
    );

    // Workspace mode: callback button. Standalone: <a> link.
    if (onNavigateChapter) {
      return (
        <button
          type="button"
          onClick={() => onNavigateChapter(targetChapter)}
          className={navBtnClass}
          aria-label={ariaLabel}
        >
          {content}
        </button>
      );
    }
    return (
      <a
        href={`/app/read/${translation}/${book}/${targetChapter}`}
        className={navBtnClass}
        aria-label={ariaLabel}
      >
        {content}
      </a>
    );
  }

  const hasPrev = chapter > 1;
  const hasNext = bookInfo ? chapter < bookInfo.chapters : false;

  return (
    <div>
      {/* Chapter header with integrated navigation.
           Normal: 3-column grid [prev] [title] [next].
           Clean view: 4-column grid [prev] [title] [cog] [next].
           In centered mode, match the article's max-w-prose centering. */}
      <nav
        className={`mb-6 grid items-center gap-2 ${
          cleanView ? "grid-cols-[auto_1fr_auto_auto]" : "grid-cols-[auto_1fr_auto]"
        } ${isColumns ? "" : "mx-auto max-w-prose"}`}
        style={fontFamily ? { fontFamily } : undefined}
        aria-label="Chapter navigation"
      >
        {/* Left cell — prev button or empty spacer */}
        <div>
          {hasPrev && <NavButton direction="prev" targetChapter={chapter - 1} />}
        </div>

        {/* Center cell — chapter title, always centered */}
        <h2 className="text-2xl font-bold text-gray-900 text-center min-w-0 truncate">
          {chapterData.bookName} {chapterData.chapter}
        </h2>

        {/* Cog button — only in clean view */}
        {cleanView && settingsProps && (
          <ReaderSettingsPopover {...settingsProps} />
        )}

        {/* Right cell — next button or empty spacer */}
        <div>
          {hasNext && <NavButton direction="next" targetChapter={chapter + 1} />}
        </div>
      </nav>

      {/* Verse text */}
      <article
        className={
          isColumns
            ? "text-lg leading-relaxed text-gray-800"
            : "mx-auto max-w-prose text-lg leading-relaxed text-gray-800"
        }
        style={{
          ...(isColumns ? { columns: "auto 20rem", columnGap: "2rem" } : {}),
          ...(fontFamily ? { fontFamily } : {}),
        }}
        aria-label={`${chapterData.bookName} chapter ${chapterData.chapter}`}
      >
        {chapterData.verses.map((verse) => {
          const selected = isVerseSelected(selection, verse.number);
          const hasAnnotation = annotatedVerses?.has(verse.number) ?? false;
          const placeholder = isPlaceholderVerse(verse.text);
          // Apply word-swap toggles (LORD↔Yahweh, baptize↔immerse, etc.)
          const displayText = placeholder
            ? verse.text
            : applyTranslationToggles(verse.text, resolvedToggles);
          return (
            <span
              key={verse.number}
              role="button"
              tabIndex={0}
              onClick={() => handleVerseClick(verse.number)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleVerseClick(verse.number);
                }
              }}
              className={`
                inline cursor-pointer rounded px-0.5 transition-colors duration-100
                ${selected ? "bg-blue-100 text-blue-900" : "hover:bg-gray-100"}
                focus:outline-none focus:ring-2 focus:ring-blue-400
              `}
              aria-label={`Verse ${verse.number}: ${placeholder ? "verse not yet translated" : displayText}${hasAnnotation ? " (has note)" : ""}`}
              aria-pressed={selected}
            >
              {/* Verse number — superscript, subtle */}
              <sup className="mr-0.5 text-xs font-semibold text-gray-400 select-none">
                {verse.number}
                {/* Annotation dot indicator */}
                {hasAnnotation && annotationDots !== "hidden" && (
                  <span
                    className={`ml-0.5 inline-block h-1.5 w-1.5 rounded-full align-super ${
                      annotationDots === "subtle" ? "bg-gray-300" : "bg-blue-500"
                    }`}
                    aria-hidden="true"
                    title="Has a note"
                  />
                )}
              </sup>
              {/* Detect placeholder verses — the OEB (a work in progress)
                  uses "{ }" for untranslated verses. Show an ⓘ icon that
                  links to the OEB project so users can learn more. */}
              {placeholder ? (
                <a
                  href="https://openenglishbible.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="This verse hasn't been translated yet. The Open English Bible is a free, open-source translation still in progress — visit their site to learn more or contribute."
                  className="inline-flex items-center text-blue-400 hover:text-blue-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Verse not yet translated — visit the Open English Bible project"
                >
                  {/* Info circle icon (ⓘ) */}
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                  </svg>
                </a>
              ) : (
                displayText
              )}{" "}
            </span>
          );
        })}
      </article>

      {/* "Write a note" floating action — only in standalone mode */}
      {selection && !isWorkspaceMode && (
        <div
          className="fixed bottom-6 left-1/2 z-10 -translate-x-1/2
                     rounded-full bg-blue-600 px-6 py-3 text-white shadow-lg
                     flex items-center gap-3 animate-in"
          role="status"
          aria-live="polite"
        >
          <span className="text-sm font-medium">{selectionLabel}</span>
          <a
            href={`/app/annotate?t=${translation}&b=${book}&c=${chapter}&vs=${selection.start}&ve=${selection.end}`}
            className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-blue-600
                       hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Write a note
          </a>
          <button
            type="button"
            onClick={() => setInternalSelection(null)}
            className="ml-1 rounded-full p-1 hover:bg-blue-700
                       focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Clear selection"
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
      )}

    </div>
  );
}
