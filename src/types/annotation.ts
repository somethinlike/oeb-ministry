/**
 * Annotation types — defines the data model for user-created
 * verse-anchored notes stored in Supabase.
 */

import type { BookId } from "./bible";

/**
 * Points an annotation to a specific verse or range of verses.
 * A single annotation can anchor to "John 3:16" or "John 3:16-18".
 */
export interface VerseAnchor {
  book: BookId;
  chapter: number;
  verseStart: number;
  verseEnd: number; // Same as verseStart for a single verse
}

/**
 * Links an annotation to a related verse elsewhere in the Bible.
 * Example: An annotation on John 3:16 might cross-reference Romans 5:8.
 */
export interface CrossReference {
  id: string;
  annotationId: string;
  book: BookId;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

/**
 * A complete annotation as stored in the database.
 * Annotations are Markdown notes anchored to Bible verses.
 */
export interface Annotation {
  id: string;
  userId: string;
  /** The Bible translation this annotation is attached to */
  translation: string;
  /** Which verse(s) this annotation is anchored to */
  anchor: VerseAnchor;
  /** The annotation content in Markdown format */
  contentMd: string;
  /** Whether this annotation is publicly visible (CC0 licensed) */
  isPublic: boolean;
  /** Related verses that this annotation references */
  crossReferences: CrossReference[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data when creating or editing an annotation.
 * Subset of Annotation — IDs and timestamps are server-generated.
 */
export interface AnnotationFormData {
  translation: string;
  anchor: VerseAnchor;
  contentMd: string;
  crossReferences: Omit<CrossReference, "id" | "annotationId">[];
}
