/**
 * Devotional Bible types — defines the data model for user-curated
 * collections of annotations overlaid on a Bible translation.
 *
 * Two types:
 * - "original": every annotation belongs to the owner (one theological voice)
 * - "assembled": curated from the public CC0 pool + own annotations (forkable)
 */

/** Whether this is an author's own work or a curated collection. */
export type DevotionalBibleType = "original" | "assembled";

/** Moderation workflow state for published devotional bibles. */
export type DevotionalBiblePublishStatus = "pending" | "approved" | "rejected";

/**
 * A devotional bible collection as stored in the database.
 * Contains metadata about the collection — entries are stored separately.
 */
export interface DevotionalBible {
  id: string;
  userId: string;
  /** Human-readable name ("My Romans Study", "Daily Bread Devotional") */
  title: string;
  /** Brief summary of the devotional's purpose or scope */
  description: string;
  /** Base Bible translation this devotional is built on */
  translation: string;
  /** Whether all annotations are the owner's ("original") or mixed ("assembled") */
  type: DevotionalBibleType;
  /** Whether this devotional is visible to others */
  isPublished: boolean;
  /** Moderation workflow: null (private), 'pending', 'approved', 'rejected' */
  publishStatus: DevotionalBiblePublishStatus | null;
  /** When the devotional was approved for public display */
  publishedAt: string | null;
  /** Moderator's reason for rejecting (shown to the author) */
  rejectionReason: string | null;
  /** If this is a fork, points to the source devotional */
  forkedFromId: string | null;
  /** Display name of the author (for public listings) */
  authorDisplayName: string | null;
  /** Number of annotations in this collection (denormalized for display) */
  entryCount: number;
  createdAt: string;
  updatedAt: string;
  /** When set, this devotional is in the recycle bin (soft-deleted) */
  deletedAt: string | null;
}

/**
 * A single entry in a devotional bible — links an annotation to the collection.
 */
export interface DevotionalBibleEntry {
  id: string;
  devotionalBibleId: string;
  annotationId: string;
  /** Ordering within the collection (gapped integers: 10, 20, 30...) */
  sortOrder: number;
  /** When this entry was added to the collection */
  addedAt: string;
}

/**
 * Form data when creating or editing a devotional bible.
 * IDs and timestamps are server-generated.
 */
export interface DevotionalBibleFormData {
  title: string;
  description: string;
  translation: string;
  type: DevotionalBibleType;
}

/**
 * A devotional bible with its entries loaded.
 * Used when viewing/editing the full collection.
 */
export interface DevotionalBibleWithEntries extends DevotionalBible {
  entries: DevotionalBibleEntry[];
}
