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
  /**
   * The annotation content in Markdown format.
   * When `isEncrypted` is true, this contains base64-encoded AES-256-GCM
   * ciphertext instead of plaintext Markdown.
   */
  contentMd: string;
  /** Whether this annotation is publicly visible (CC0 licensed) */
  isPublic: boolean;
  /** Whether contentMd is encrypted (client-side AES-256-GCM) */
  isEncrypted: boolean;
  /** AES-GCM initialization vector (base64). Present when isEncrypted is true. */
  encryptionIv: string | null;
  /** Publishing workflow status: null (private), 'pending', 'approved', 'rejected' */
  publishStatus: string | null;
  /** When the annotation was approved for public display */
  publishedAt: string | null;
  /** Moderator's reason for rejecting (shown to the author) */
  rejectionReason: string | null;
  /** Display name of the author (for public feed attribution) */
  authorDisplayName: string | null;
  /** Related verses that this annotation references */
  crossReferences: CrossReference[];
  /** The Bible verse text at the time the annotation was saved */
  verseText: string | null;
  /** AI screening result: true if no high-severity flags. Null when not yet screened. */
  aiScreeningPassed?: boolean | null;
  /** AI screening flags (profanity, theology, spam) for moderator context */
  aiScreeningFlags?: unknown[] | null;
  /** When the AI screening was performed */
  aiScreenedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** When set, this annotation is in the recycle bin (soft-deleted) */
  deletedAt: string | null;
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
  /** The Bible verse text to store with this annotation */
  verseText?: string;
  /** When true, contentMd contains encrypted ciphertext (base64) */
  isEncrypted?: boolean;
  /** AES-GCM IV for this annotation (base64). Required when isEncrypted is true. */
  encryptionIv?: string | null;
}
