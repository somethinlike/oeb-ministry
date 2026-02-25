/**
 * Test helpers for workspace component tests.
 *
 * Provides a mock WorkspaceProvider that lets tests control the context
 * values without needing real Supabase connections or URL routing.
 *
 * Usage:
 *   render(<YourComponent />, { wrapper: createMockProvider({ book: "jhn" }) });
 */

import { createContext, type ReactNode } from "react";
import type { WorkspaceContextValue } from "../../types/workspace";
import type { Annotation } from "../../types/annotation";

/** Factory for creating test annotations with sensible defaults */
export function makeAnnotation(
  overrides: Partial<Annotation> = {},
): Annotation {
  return {
    id: "ann-1",
    userId: "user-1",
    translation: "kjv1611",
    anchor: {
      book: "jhn" as Annotation["anchor"]["book"],
      chapter: 3,
      verseStart: 16,
      verseEnd: 16,
    },
    contentMd: "For God so loved the world...",
    isPublic: false,
    crossReferences: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    deletedAt: null,
    ...overrides,
  };
}

/** Default mock context values — everything in a stable, testable state */
export function defaultMockContext(
  overrides: Partial<WorkspaceContextValue> = {},
): WorkspaceContextValue {
  return {
    translation: "kjv1611",
    book: "jhn",
    chapter: 3,
    selection: null,
    annotations: [],
    annotationsLoading: false,
    sidebarView: "list",
    editingAnnotation: null,
    userId: "user-1",
    navigateChapter: vi.fn(),
    switchTranslation: vi.fn(),
    setSelection: vi.fn(),
    startNewAnnotation: vi.fn(),
    editAnnotation: vi.fn(),
    onAnnotationSaved: vi.fn(),
    onAnnotationDeleted: vi.fn(),
    showAnnotationList: vi.fn(),
    ...overrides,
  };
}
