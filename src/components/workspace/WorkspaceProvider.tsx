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
 *
 * Annotation loading strategy:
 * - Online: fetch from Supabase, cache in IndexedDB, merge with pending local edits
 * - Offline: load from IndexedDB cache (populated by previous online fetches + offline saves)
 * - After sync: refetch from Supabase when "oeb-sync-complete" event fires
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
import {
  getLocalAnnotationsForChapter,
  saveAnnotationLocally,
  type OfflineAnnotation,
} from "../../lib/offline-store";
import { BOOK_BY_ID } from "../../lib/constants";
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

// ── Conversion helpers between Supabase Annotation and IndexedDB OfflineAnnotation ──

/** Converts a Supabase Annotation → OfflineAnnotation for IndexedDB caching. */
function annotationToOffline(ann: Annotation): OfflineAnnotation {
  return {
    id: ann.id,
    userId: ann.userId,
    translation: ann.translation,
    book: ann.anchor.book,
    chapter: ann.anchor.chapter,
    verseStart: ann.anchor.verseStart,
    verseEnd: ann.anchor.verseEnd,
    contentMd: ann.contentMd,
    isPublic: ann.isPublic,
    crossReferences: ann.crossReferences.map((ref) => ({
      book: ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      verseEnd: ref.verseEnd,
    })),
    createdAt: ann.createdAt,
    updatedAt: ann.updatedAt,
    syncStatus: "synced",
  };
}

/** Converts an OfflineAnnotation → Annotation for the UI. */
function offlineToAnnotation(off: OfflineAnnotation): Annotation {
  return {
    id: off.id,
    userId: off.userId,
    translation: off.translation,
    anchor: {
      book: off.book as BookId,
      chapter: off.chapter,
      verseStart: off.verseStart,
      verseEnd: off.verseEnd,
    },
    contentMd: off.contentMd,
    isPublic: off.isPublic,
    crossReferences: (off.crossReferences ?? []).map((ref, i) => ({
      id: `local-${off.id}-xref-${i}`,
      annotationId: off.id,
      book: ref.book as BookId,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      verseEnd: ref.verseEnd,
    })),
    createdAt: off.createdAt,
    updatedAt: off.updatedAt,
  };
}

/**
 * Merges server annotations with pending local changes.
 * Server data is the base; local pending ops overlay on top.
 *
 * - synced      → already in server results, skip
 * - pending_create → not on server yet, add
 * - pending_update → server has stale data, replace with local
 * - pending_delete → user deleted locally, remove
 */
function mergeAnnotations(
  server: Annotation[],
  local: OfflineAnnotation[],
): Annotation[] {
  const result = new Map<string, Annotation>();

  // Start with server annotations
  for (const ann of server) {
    result.set(ann.id, ann);
  }

  // Overlay local pending changes
  for (const localAnn of local) {
    switch (localAnn.syncStatus) {
      case "synced":
        // Already represented by server data
        break;
      case "pending_create":
        // Not on server yet — add to results
        result.set(localAnn.id, offlineToAnnotation(localAnn));
        break;
      case "pending_update":
        // On server with stale data — replace with local version
        result.set(localAnn.id, offlineToAnnotation(localAnn));
        break;
      case "pending_delete":
        // User deleted locally — remove from results
        result.delete(localAnn.id);
        break;
    }
  }

  // Sort by verse start (matches existing behavior)
  return Array.from(result.values()).sort(
    (a, b) => a.anchor.verseStart - b.anchor.verseStart,
  );
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

  // ── Load annotations: Supabase → IndexedDB cache → merge with pending edits ──
  useEffect(() => {
    if (!userId) {
      setAnnotations([]);
      return;
    }

    let cancelled = false;
    setAnnotationsLoading(true);

    async function loadAnnotations() {
      let serverAnnotations: Annotation[] | null = null;

      // Step 1: Always try Supabase first — navigator.onLine is unreliable
      // on mobile and service-worker pages. If the fetch fails, we fall
      // through to IndexedDB below.
      try {
        serverAnnotations = await getAnnotationsForChapter(
          supabase,
          userId!,
          translation,
          book,
          chapter,
        );
      } catch (err) {
        console.error("Failed to load annotations from Supabase:", err);
        // Fall through to IndexedDB
      }

      if (cancelled) return;

      // Step 2: Got server data → cache it and merge with pending local edits
      if (serverAnnotations !== null) {
        // Cache each server annotation in IndexedDB (non-blocking, fire-and-forget)
        for (const ann of serverAnnotations) {
          saveAnnotationLocally(annotationToOffline(ann)).catch(() => {
            // Caching failure is non-fatal
          });
        }

        // Check for any pending local edits that haven't synced yet
        try {
          const localAnnotations = await getLocalAnnotationsForChapter(
            translation,
            book,
            chapter,
          );
          const hasPending = localAnnotations.some(
            (a) => a.syncStatus !== "synced",
          );

          if (!cancelled) {
            // Only run the merge if there are pending local edits;
            // otherwise just use server data directly (common case)
            setAnnotations(
              hasPending
                ? mergeAnnotations(serverAnnotations, localAnnotations)
                : serverAnnotations,
            );
            setAnnotationsLoading(false);
          }
        } catch {
          // IndexedDB query failed — just use server data
          if (!cancelled) {
            setAnnotations(serverAnnotations);
            setAnnotationsLoading(false);
          }
        }
        return;
      }

      // Step 3: Fully offline — load from IndexedDB only
      try {
        const localAnnotations = await getLocalAnnotationsForChapter(
          translation,
          book,
          chapter,
        );
        // Filter out pending_delete, convert the rest to Annotation type
        const visible = localAnnotations
          .filter((a) => a.syncStatus !== "pending_delete")
          .map(offlineToAnnotation);

        if (!cancelled) {
          setAnnotations(visible);
          setAnnotationsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load annotations from IndexedDB:", err);
        if (!cancelled) {
          setAnnotations([]);
          setAnnotationsLoading(false);
        }
      }
    }

    loadAnnotations();

    return () => {
      cancelled = true;
    };
  }, [userId, translation, book, chapter]);

  // ── Refetch annotations after sync completes ──
  // When ConnectionStatus runs processSync() and the sync engine dispatches
  // "oeb-sync-complete", we refetch from Supabase to get the authoritative
  // server state (with real IDs, timestamps, etc.).
  const refetchAnnotations = useCallback(() => {
    if (!userId) return;
    setAnnotationsLoading(true);
    getAnnotationsForChapter(supabase, userId, translation, book, chapter)
      .then((result) => {
        setAnnotations(result);
        // Re-cache the fresh server data
        for (const ann of result) {
          saveAnnotationLocally(annotationToOffline(ann)).catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Failed to refetch annotations after sync:", err);
      })
      .finally(() => {
        setAnnotationsLoading(false);
      });
  }, [userId, translation, book, chapter]);

  useEffect(() => {
    function handleSyncComplete() {
      refetchAnnotations();
    }
    window.addEventListener("oeb-sync-complete", handleSyncComplete);
    return () => {
      window.removeEventListener("oeb-sync-complete", handleSyncComplete);
    };
  }, [refetchAnnotations]);

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
