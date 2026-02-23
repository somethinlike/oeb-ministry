/**
 * ReaderPane — wraps ChapterReader for the workspace layout.
 *
 * Connects ChapterReader to the workspace context by passing
 * callback props instead of letting it navigate via <a href>.
 * Also computes the annotatedVerses set so ChapterReader can
 * show dot indicators on verses that have notes.
 */

import { useMemo } from "react";
import { ChapterReader } from "../ChapterReader";
import { useWorkspace } from "./WorkspaceProvider";
import type { ReaderLayout, ReaderFont } from "../../lib/workspace-prefs";
import type { TranslationToggles } from "../../lib/translation-toggles";

interface ReaderPaneProps {
  /** Text layout mode — "centered" (max-width prose) or "columns" (full-width multi-column) */
  readerLayout?: ReaderLayout;
  /** Word-swap toggle preferences */
  translationToggles?: TranslationToggles;
  /** Reader font for Bible text */
  readerFont?: ReaderFont;
}

export function ReaderPane({ readerLayout = "centered", translationToggles, readerFont }: ReaderPaneProps) {
  const {
    translation,
    book,
    chapter,
    selection,
    annotations,
    setSelection,
    navigateChapter,
  } = useWorkspace();

  // Build a Set of verse numbers that have annotations.
  // An annotation covers verseStart through verseEnd, so we
  // expand each range into individual verse numbers.
  const annotatedVerses = useMemo(() => {
    const verses = new Set<number>();
    for (const ann of annotations) {
      for (let v = ann.anchor.verseStart; v <= ann.anchor.verseEnd; v++) {
        verses.add(v);
      }
    }
    return verses;
  }, [annotations]);

  return (
    <div className="h-full overflow-y-auto overscroll-contain p-4 lg:p-6">
      <ChapterReader
        translation={translation}
        book={book}
        chapter={chapter}
        selection={selection}
        onVerseSelect={setSelection}
        onNavigateChapter={navigateChapter}
        annotatedVerses={annotatedVerses}
        readerLayout={readerLayout}
        translationToggles={translationToggles}
        readerFont={readerFont}
      />
    </div>
  );
}
