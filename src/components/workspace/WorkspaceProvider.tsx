/**
 * WorkspaceProvider — React context that manages all shared state
 * for the split-pane Bible reader + annotation sidebar.
 *
 * Think of this like a switchboard: when the user taps a verse,
 * switches chapters, or saves an annotation, the state change
 * flows through here so all workspace components stay in sync.
 *
 * URL is the source of truth for navigation (translation/book/chapter).
 * Selection and sidebar state are ephemeral (lost on page reload).
 * Annotations are fetched from Supabase whenever the chapter changes.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { VerseSelection } from "../../lib/verse-selection";
import type { Annotation } from "../../types/annotation";
import type {
  WorkspaceContextValue,
  SidebarView,
} from "../../types/workspace";
import { supabase } from "../../lib/supabase";
import { getAnnotationsForChapter } from "../../lib/annotations";
import { BOOK_BY_ID, SUPPORTED_TRANSLATIONS } from "../../lib/constants";
import type { BookId } from "../../types/bible";

/** The context itself — components read from this */
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Hook for child components to access workspace state + actions.
 * Throws if used outside a WorkspaceProvider (catches bugs early).
 */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}

interface WorkspaceProviderProps {
  /** Initial translation from URL */
  translation: string;
  /** Initial book from URL */
  book: string;
  /** Initial chapter from URL */
  chapter: number;
  /** Authenticated user ID (from server-side auth check) */
  userId: string | null;
  children: ReactNode;
}

export function WorkspaceProvider({
  translation: initialTranslation,
  book: initialBook,
  chapter: initialChapter,
  userId,
  children,
}: WorkspaceProviderProps) {
  const [translation, setTranslation] = useState(initialTranslation);
  const [book, setBook] = useState(initialBook);
  const [chapter, setChapter] = useState(initialChapter);
  const [selection, setSelection] = useState<VerseSelection | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationsLoading, setAnnotationsLoading] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>("list");
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(
    null,
  );

  // ── Fetch annotations whenever the chapter changes ──
  useEffect(() => {
    if (!userId) {
      setAnnotations([]);
      return;
    }

    let cancelled = false;
    setAnnotationsLoading(true);

    getAnnotationsForChapter(supabase, userId, translation, book, chapter)
      .then((result) => {
        if (!cancelled) {
          setAnnotations(result);
          setAnnotationsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load annotations:", err);
        if (!cancelled) {
          setAnnotations([]);
          setAnnotationsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, translation, book, chapter]);

  // ── Navigation: update URL via pushState (no full page reload) ──
  const navigateChapter = useCallback(
    (newChapter: number) => {
      setChapter(newChapter);
      setSelection(null);
      setSidebarView("list");
      setEditingAnnotation(null);
      // Update URL without full page reload
      const newPath = `/app/read/${translation}/${book}/${newChapter}`;
      window.history.pushState({}, "", newPath);
    },
    [translation, book],
  );

  const switchTranslation = useCallback(
    (newTranslation: string) => {
      // Check if current book exists in the new translation's manifest.
      // If not, navigate to the translation's book picker instead.
      const bookInfo = BOOK_BY_ID.get(book as BookId);

      setTranslation(newTranslation);
      setSelection(null);
      setSidebarView("list");
      setEditingAnnotation(null);

      if (bookInfo) {
        // Optimistically keep the same book/chapter. If the chapter doesn't
        // exist in the new translation, ChapterReader will show an error
        // and the user can pick a different one.
        const newPath = `/app/read/${newTranslation}/${book}/${chapter}`;
        window.history.pushState({}, "", newPath);
      } else {
        // Book doesn't exist — go to book picker for this translation
        window.location.href = `/app/read/${newTranslation}`;
      }
    },
    [book, chapter],
  );

  // ── Annotation sidebar actions ──
  const startNewAnnotation = useCallback(() => {
    setEditingAnnotation(null);
    setSidebarView("editor");
  }, []);

  const editAnnotation = useCallback((annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setSidebarView("editor");
  }, []);

  const onAnnotationSaved = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => {
      // If updating an existing annotation, replace it in the list
      const existingIndex = prev.findIndex((a) => a.id === annotation.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = annotation;
        return next;
      }
      // New annotation — add to list, sorted by verse start
      return [...prev, annotation].sort(
        (a, b) => a.anchor.verseStart - b.anchor.verseStart,
      );
    });
    setSidebarView("list");
    setEditingAnnotation(null);
  }, []);

  const onAnnotationDeleted = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setSidebarView("list");
    setEditingAnnotation(null);
  }, []);

  const showAnnotationList = useCallback(() => {
    setSidebarView("list");
    setEditingAnnotation(null);
  }, []);

  const contextValue: WorkspaceContextValue = {
    // State
    translation,
    book,
    chapter,
    selection,
    annotations,
    annotationsLoading,
    sidebarView,
    editingAnnotation,
    userId,
    // Actions
    navigateChapter,
    switchTranslation,
    setSelection,
    startNewAnnotation,
    editAnnotation,
    onAnnotationSaved,
    onAnnotationDeleted,
    showAnnotationList,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}
