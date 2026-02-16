/**
 * Workspace types — defines the shared state for the split-pane
 * Bible reader + annotation sidebar.
 *
 * The workspace is the "desk" where users read and annotate in one view.
 * State flows through React Context so all child components stay in sync.
 */

import type { BookId } from "./bible";
import type { Annotation } from "./annotation";
import type { VerseSelection } from "../lib/verse-selection";

/** Which view the annotation sidebar is currently showing */
export type SidebarView = "list" | "editor";

/** Full workspace state — shared via WorkspaceContext */
export interface WorkspaceState {
  /** Current Bible translation ID (e.g., "kjv1611") */
  translation: string;
  /** Current book ID (e.g., "jhn") */
  book: string;
  /** Current chapter number */
  chapter: number;
  /** Currently selected verse range, if any */
  selection: VerseSelection | null;
  /** Annotations for the current chapter (fetched from Supabase) */
  annotations: Annotation[];
  /** Whether annotations are currently loading */
  annotationsLoading: boolean;
  /** What the sidebar is showing right now */
  sidebarView: SidebarView;
  /** The annotation being edited (null = creating new) */
  editingAnnotation: Annotation | null;
  /** Authenticated user ID (needed for annotation CRUD) */
  userId: string | null;
}

/** Actions the workspace components can dispatch */
export interface WorkspaceActions {
  /** Navigate to a different chapter (updates URL via pushState) */
  navigateChapter: (chapter: number) => void;
  /** Switch to a different translation */
  switchTranslation: (translationId: string) => void;
  /** Update verse selection (from ChapterReader taps) */
  setSelection: (selection: VerseSelection | null) => void;
  /** Switch sidebar to the editor for a new annotation */
  startNewAnnotation: () => void;
  /** Switch sidebar to the editor for an existing annotation */
  editAnnotation: (annotation: Annotation) => void;
  /** Called after an annotation is saved — updates the list in-place */
  onAnnotationSaved: (annotation: Annotation) => void;
  /** Called after an annotation is deleted — removes from the list */
  onAnnotationDeleted: (id: string) => void;
  /** Switch sidebar back to the annotation list */
  showAnnotationList: () => void;
}

/** Combined context value — state + actions */
export interface WorkspaceContextValue extends WorkspaceState, WorkspaceActions {}
