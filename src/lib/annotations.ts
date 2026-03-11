/**
 * Annotation data access layer.
 *
 * All Supabase queries for annotations and cross-references go through
 * this module. This keeps database logic in one place and makes it
 * easy to add offline support later (Phase 7).
 *
 * Every function takes a Supabase client as its first argument instead
 * of importing a global one — this lets us use either the browser client
 * or the server client depending on context.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { Annotation, AnnotationFormData } from "../types/annotation";
import type { BookId } from "../types/bible";
import { sanitizeMarkdownForPublishing } from "./sanitize-schema";

type DbClient = SupabaseClient<Database>;

/** Maps a database row to our Annotation type. */
function rowToAnnotation(
  row: Database["public"]["Tables"]["annotations"]["Row"],
  crossRefs: Database["public"]["Tables"]["cross_references"]["Row"][] = [],
): Annotation {
  return {
    id: row.id,
    userId: row.user_id,
    translation: row.translation,
    anchor: {
      book: row.book as BookId,
      chapter: row.chapter,
      verseStart: row.verse_start,
      verseEnd: row.verse_end,
    },
    contentMd: row.content_md,
    isPublic: row.is_public,
    isEncrypted: row.is_encrypted,
    encryptionIv: row.encryption_iv ?? null,
    publishStatus: row.publish_status ?? null,
    publishedAt: row.published_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    authorDisplayName: row.author_display_name ?? null,
    crossReferences: crossRefs.map((ref) => ({
      id: ref.id,
      annotationId: ref.annotation_id,
      book: ref.book as BookId,
      chapter: ref.chapter,
      verseStart: ref.verse_start,
      verseEnd: ref.verse_end,
    })),
    verseText: row.verse_text ?? null,
    aiScreeningPassed: (row as Record<string, unknown>).ai_screening_passed as boolean | null ?? null,
    aiScreeningFlags: (row as Record<string, unknown>).ai_screening_flags as unknown[] | null ?? null,
    aiScreenedAt: (row as Record<string, unknown>).ai_screened_at as string | null ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * Fetches annotations for a specific chapter that belong to the current user.
 * Used in the ChapterReader to show annotation indicators on verses.
 */
export async function getAnnotationsForChapter(
  client: DbClient,
  userId: string,
  translation: string,
  book: string,
  chapter: number,
): Promise<Annotation[]> {
  // Fetch annotations
  const { data: annotations, error } = await client
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .eq("translation", translation)
    .eq("book", book)
    .eq("chapter", chapter)
    .is("deleted_at", null)
    .order("verse_start", { ascending: true });

  if (error) throw new Error(`Failed to load annotations: ${error.message}`);
  if (!annotations?.length) return [];

  // Fetch cross-references for all annotations in one query
  const annotationIds = annotations.map((a) => a.id);
  const { data: crossRefs } = await client
    .from("cross_references")
    .select("*")
    .in("annotation_id", annotationIds);

  // Group cross-references by annotation ID for efficient lookup
  const crossRefsByAnnotation = new Map<string, typeof crossRefs>();
  for (const ref of crossRefs ?? []) {
    const existing = crossRefsByAnnotation.get(ref.annotation_id) ?? [];
    existing.push(ref);
    crossRefsByAnnotation.set(ref.annotation_id, existing);
  }

  return annotations.map((row) =>
    rowToAnnotation(row, crossRefsByAnnotation.get(row.id) ?? []),
  );
}

/**
 * Fetches a single annotation by ID, including its cross-references.
 */
export async function getAnnotation(
  client: DbClient,
  annotationId: string,
): Promise<Annotation | null> {
  const { data: row, error } = await client
    .from("annotations")
    .select("*")
    .eq("id", annotationId)
    .single();

  if (error || !row) return null;

  const { data: crossRefs } = await client
    .from("cross_references")
    .select("*")
    .eq("annotation_id", annotationId);

  return rowToAnnotation(row, crossRefs ?? []);
}

/**
 * Creates a new annotation with optional cross-references.
 * Uses a transaction-like pattern: creates the annotation first,
 * then inserts cross-references.
 */
export async function createAnnotation(
  client: DbClient,
  userId: string,
  formData: AnnotationFormData,
): Promise<Annotation> {
  // Insert the annotation
  const { data: row, error } = await client
    .from("annotations")
    .insert({
      user_id: userId,
      translation: formData.translation,
      book: formData.anchor.book,
      chapter: formData.anchor.chapter,
      verse_start: formData.anchor.verseStart,
      verse_end: formData.anchor.verseEnd,
      content_md: formData.contentMd,
      verse_text: formData.verseText ?? null,
      is_encrypted: formData.isEncrypted ?? false,
      encryption_iv: formData.encryptionIv ?? null,
    })
    .select()
    .single();

  if (error || !row) {
    throw new Error(`Failed to create annotation: ${error?.message ?? "Unknown error"}`);
  }

  // Insert cross-references if any
  let crossRefs: Database["public"]["Tables"]["cross_references"]["Row"][] = [];
  if (formData.crossReferences.length > 0) {
    const { data: refs, error: refError } = await client
      .from("cross_references")
      .insert(
        formData.crossReferences.map((ref) => ({
          annotation_id: row.id,
          book: ref.book,
          chapter: ref.chapter,
          verse_start: ref.verseStart,
          verse_end: ref.verseEnd,
        })),
      )
      .select();

    if (refError) {
      console.error("Failed to create cross-references:", refError.message);
    }
    crossRefs = refs ?? [];
  }

  return rowToAnnotation(row, crossRefs);
}

/**
 * Updates an existing annotation's content and cross-references.
 * Replaces all cross-references (delete old ones, insert new ones).
 */
export async function updateAnnotation(
  client: DbClient,
  annotationId: string,
  formData: Partial<AnnotationFormData>,
): Promise<Annotation> {
  // Build the update object — only include fields that were provided
  const updateData: Database["public"]["Tables"]["annotations"]["Update"] = {};
  if (formData.contentMd !== undefined) updateData.content_md = formData.contentMd;
  if (formData.verseText !== undefined) updateData.verse_text = formData.verseText;
  if (formData.isEncrypted !== undefined) updateData.is_encrypted = formData.isEncrypted;
  if (formData.encryptionIv !== undefined) updateData.encryption_iv = formData.encryptionIv;
  if (formData.anchor) {
    updateData.book = formData.anchor.book;
    updateData.chapter = formData.anchor.chapter;
    updateData.verse_start = formData.anchor.verseStart;
    updateData.verse_end = formData.anchor.verseEnd;
  }

  const { data: row, error } = await client
    .from("annotations")
    .update(updateData)
    .eq("id", annotationId)
    .select()
    .single();

  if (error || !row) {
    throw new Error(`Failed to update annotation: ${error?.message ?? "Unknown error"}`);
  }

  // Replace cross-references if provided
  let crossRefs: Database["public"]["Tables"]["cross_references"]["Row"][] = [];
  if (formData.crossReferences !== undefined) {
    // Delete existing cross-references
    await client
      .from("cross_references")
      .delete()
      .eq("annotation_id", annotationId);

    // Insert new ones
    if (formData.crossReferences.length > 0) {
      const { data: refs } = await client
        .from("cross_references")
        .insert(
          formData.crossReferences.map((ref) => ({
            annotation_id: annotationId,
            book: ref.book,
            chapter: ref.chapter,
            verse_start: ref.verseStart,
            verse_end: ref.verseEnd,
          })),
        )
        .select();

      crossRefs = refs ?? [];
    }
  } else {
    // Fetch existing cross-references if not replacing
    const { data: refs } = await client
      .from("cross_references")
      .select("*")
      .eq("annotation_id", annotationId);
    crossRefs = refs ?? [];
  }

  return rowToAnnotation(row, crossRefs);
}

/**
 * Soft-deletes an annotation by setting deleted_at.
 * The annotation moves to the Recycle Bin instead of being permanently removed.
 * Cross-references are preserved (not cascade-deleted) so they survive a restore.
 */
export async function softDeleteAnnotation(
  client: DbClient,
  annotationId: string,
): Promise<void> {
  const { error } = await client
    .from("annotations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", annotationId);

  if (error) {
    throw new Error(`Failed to delete annotation: ${error.message}`);
  }
}

/**
 * Restores a soft-deleted annotation from the Recycle Bin.
 */
export async function restoreAnnotation(
  client: DbClient,
  annotationId: string,
): Promise<void> {
  const { error } = await client
    .from("annotations")
    .update({ deleted_at: null })
    .eq("id", annotationId);

  if (error) {
    throw new Error(`Failed to restore annotation: ${error.message}`);
  }
}

/**
 * Permanently deletes an annotation and its cross-references (cascade).
 * Used from the Recycle Bin — this is irreversible.
 */
export async function permanentlyDeleteAnnotation(
  client: DbClient,
  annotationId: string,
): Promise<void> {
  const { error } = await client
    .from("annotations")
    .delete()
    .eq("id", annotationId);

  if (error) {
    throw new Error(`Failed to permanently delete annotation: ${error.message}`);
  }
}

/**
 * Fetches soft-deleted annotations for the Recycle Bin.
 * Ordered by deletion date (most recently deleted first).
 */
export async function getDeletedAnnotations(
  client: DbClient,
  userId: string,
): Promise<Annotation[]> {
  const { data, error } = await client
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Failed to load deleted annotations: ${error.message}`);
  return (data ?? []).map((row) => rowToAnnotation(row));
}

/**
 * Fetches published (is_public = true) annotations for the user.
 * Only returns active annotations (not soft-deleted).
 */
export async function getPublishedAnnotations(
  client: DbClient,
  userId: string,
): Promise<Annotation[]> {
  const { data, error } = await client
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .eq("is_public", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Failed to load published annotations: ${error.message}`);
  return (data ?? []).map((row) => rowToAnnotation(row));
}

/**
 * Checks if the user has any soft-deleted annotations (for NavBar menu).
 * Uses a COUNT query with head: true — no row data transferred.
 */
export async function hasDeletedAnnotations(
  client: DbClient,
  userId: string,
): Promise<boolean> {
  const { count, error } = await client
    .from("annotations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .limit(1);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Checks if the user has any published annotations (for NavBar menu).
 * Uses a COUNT query with head: true — no row data transferred.
 */
export async function hasPublishedAnnotations(
  client: DbClient,
  userId: string,
): Promise<boolean> {
  const { count, error } = await client
    .from("annotations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_public", true)
    .is("deleted_at", null)
    .limit(1);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Full-text search across the user's annotations.
 * Uses Postgres tsvector for fast, language-aware search.
 */
export async function searchAnnotations(
  client: DbClient,
  userId: string,
  query: string,
): Promise<Annotation[]> {
  // Convert the search query to tsquery format.
  // Split words and join with & (AND) for stricter matching.
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" & ");

  if (!tsQuery) return [];

  // Exclude encrypted annotations — their content is ciphertext,
  // so full-text search against them would return meaningless matches.
  const { data: annotations, error } = await client
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .eq("is_encrypted", false)
    .textSearch("search_vector", tsQuery)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Search failed: ${error.message}`);

  return (annotations ?? []).map((row) => rowToAnnotation(row));
}

// ---------------------------------------------------------------------------
// Publishing pipeline
// ---------------------------------------------------------------------------

/**
 * Submits an annotation for CC0 publishing review.
 * Sets publish_status to 'pending' — a moderator will approve or reject.
 * Encrypted annotations cannot be published (content would be ciphertext).
 *
 * Defense-in-depth: sanitizes the markdown content before storing it as
 * pending. Strips dangerous HTML tags, event attributes, and javascript:
 * URLs so the stored content is clean even if a render-time bug bypasses
 * rehype-sanitize.
 */
export async function submitForPublishing(
  client: DbClient,
  annotationId: string,
  authorDisplayName: string,
): Promise<void> {
  // Fetch the current content so we can sanitize it at the publish boundary
  const { data: annotation, error: fetchError } = await client
    .from("annotations")
    .select("content_md, is_encrypted")
    .eq("id", annotationId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch annotation: ${fetchError.message}`);

  // Encrypted content is ciphertext — publishing it would be nonsensical
  if (annotation.is_encrypted) {
    throw new Error("Cannot publish encrypted annotations. Unlock the note first.");
  }

  // Sanitize markdown content before it enters the public pipeline
  const sanitizedContent = sanitizeMarkdownForPublishing(annotation.content_md);

  // AI screening: annotate the submission with flags for moderators
  const { screenContentRules } = await import("./ai-screening");
  const screening = screenContentRules(sanitizedContent);

  const { error } = await client
    .from("annotations")
    .update({
      content_md: sanitizedContent,
      publish_status: "pending",
      author_display_name: authorDisplayName,
      ai_screening_passed: screening.passed,
      ai_screening_flags: screening.flags,
      ai_screened_at: screening.screenedAt,
    })
    .eq("id", annotationId);

  if (error) throw new Error(`Failed to submit for publishing: ${error.message}`);
}

/**
 * Batch-submits multiple annotations for CC0 publishing review.
 * Skips encrypted annotations (they can't be published as ciphertext).
 * Sanitizes each annotation's content at the publish boundary.
 *
 * Returns the count of annotations actually submitted (excluding encrypted ones).
 */
export async function batchSubmitForPublishing(
  client: DbClient,
  annotationIds: string[],
  authorDisplayName: string,
): Promise<{ submitted: number; skippedEncrypted: number }> {
  if (annotationIds.length === 0) return { submitted: 0, skippedEncrypted: 0 };

  // Fetch content and encryption status for all selected annotations
  const { data: annotations, error: fetchError } = await client
    .from("annotations")
    .select("id, content_md, is_encrypted")
    .in("id", annotationIds);

  if (fetchError) throw new Error(`Failed to fetch annotations: ${fetchError.message}`);

  // Separate publishable from encrypted
  const publishable = (annotations ?? []).filter((a) => !a.is_encrypted);
  const skippedEncrypted = (annotations ?? []).length - publishable.length;

  if (publishable.length === 0) return { submitted: 0, skippedEncrypted };

  // Sanitize, screen, and submit each one (Supabase doesn't support per-row updates
  // in batch, so we run them in parallel for speed)
  const { screenContentRules } = await import("./ai-screening");
  await Promise.all(
    publishable.map(async (a) => {
      const sanitizedContent = sanitizeMarkdownForPublishing(a.content_md);
      const screening = screenContentRules(sanitizedContent);
      const { error } = await client
        .from("annotations")
        .update({
          content_md: sanitizedContent,
          publish_status: "pending",
          author_display_name: authorDisplayName,
          ai_screening_passed: screening.passed,
          ai_screening_flags: screening.flags,
          ai_screened_at: screening.screenedAt,
        })
        .eq("id", a.id);
      if (error) throw new Error(`Failed to submit annotation ${a.id}: ${error.message}`);
    }),
  );

  return { submitted: publishable.length, skippedEncrypted };
}

/**
 * Retracts a published or pending annotation back to private.
 * Clears all publishing state.
 */
export async function retractFromPublishing(
  client: DbClient,
  annotationId: string,
): Promise<void> {
  const { error } = await client
    .from("annotations")
    .update({
      is_public: false,
      publish_status: null,
      published_at: null,
      rejection_reason: null,
    })
    .eq("id", annotationId);

  if (error) throw new Error(`Failed to retract annotation: ${error.message}`);
}

/**
 * Fetches annotations pending moderation review.
 * Only accessible to users with the 'moderator' or 'admin' role (enforced by RLS).
 */
export async function getPendingAnnotations(
  client: DbClient,
): Promise<Annotation[]> {
  const { data, error } = await client
    .from("annotations")
    .select("*")
    .eq("publish_status", "pending")
    .is("deleted_at", null)
    .order("updated_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(`Failed to load pending annotations: ${error.message}`);
  return (data ?? []).map((row) => rowToAnnotation(row));
}

/**
 * Approves an annotation for CC0 publishing.
 * Sets is_public = true and publish_status = 'approved'.
 * Also creates a moderation log entry.
 */
export async function approveAnnotation(
  client: DbClient,
  annotationId: string,
  moderatorId: string,
  reason?: string,
): Promise<void> {
  const { error: updateError } = await client
    .from("annotations")
    .update({
      is_public: true,
      publish_status: "approved",
      published_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", annotationId);

  if (updateError) throw new Error(`Failed to approve annotation: ${updateError.message}`);

  // Log the moderation action
  await client.from("moderation_log").insert({
    annotation_id: annotationId,
    moderator_id: moderatorId,
    action: "approved",
    reason: reason ?? null,
  });
}

/**
 * Rejects an annotation with feedback.
 * The author can see the reason and revise their note.
 */
export async function rejectAnnotation(
  client: DbClient,
  annotationId: string,
  moderatorId: string,
  reason: string,
): Promise<void> {
  const { error: updateError } = await client
    .from("annotations")
    .update({
      is_public: false,
      publish_status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", annotationId);

  if (updateError) throw new Error(`Failed to reject annotation: ${updateError.message}`);

  await client.from("moderation_log").insert({
    annotation_id: annotationId,
    moderator_id: moderatorId,
    action: "rejected",
    reason,
  });
}

/**
 * Removes a published annotation (moderator action).
 * Reverts to private and logs the removal.
 */
export async function removePublishedAnnotation(
  client: DbClient,
  annotationId: string,
  moderatorId: string,
  reason: string,
): Promise<void> {
  const { error } = await client
    .from("annotations")
    .update({
      is_public: false,
      publish_status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", annotationId);

  if (error) throw new Error(`Failed to remove annotation: ${error.message}`);

  await client.from("moderation_log").insert({
    annotation_id: annotationId,
    moderator_id: moderatorId,
    action: "removed",
    reason,
  });
}

/**
 * Fetches all published CC0 annotations for the public feed.
 * No userId filter — returns all approved public annotations.
 */
export async function getPublicFeedAnnotations(
  client: DbClient,
  options?: { book?: string; chapter?: number; limit?: number; offset?: number },
): Promise<Annotation[]> {
  let query = client
    .from("annotations")
    .select("*")
    .eq("is_public", true)
    .eq("publish_status", "approved")
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  if (options?.book) query = query.eq("book", options.book);
  if (options?.chapter) query = query.eq("chapter", options.chapter);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load public feed: ${error.message}`);
  return (data ?? []).map((row) => rowToAnnotation(row));
}

/**
 * Full-text search across all public CC0 annotations.
 */
export async function searchPublicAnnotations(
  client: DbClient,
  query: string,
): Promise<Annotation[]> {
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" & ");

  if (!tsQuery) return [];

  const { data, error } = await client
    .from("annotations")
    .select("*")
    .eq("is_public", true)
    .eq("publish_status", "approved")
    .is("deleted_at", null)
    .eq("is_encrypted", false)
    .textSearch("search_vector", tsQuery)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Public search failed: ${error.message}`);
  return (data ?? []).map((row) => rowToAnnotation(row));
}

/**
 * Checks if the user has the moderator or admin role.
 */
export async function checkIsModerator(
  client: DbClient,
  userId: string,
): Promise<boolean> {
  const { count, error } = await client
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("role", ["moderator", "admin"])
    .limit(1);

  if (error) return false;
  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Batch operations (multi-select)
// ---------------------------------------------------------------------------

/** Soft-deletes multiple annotations at once. */
export async function batchSoftDeleteAnnotations(
  client: DbClient,
  annotationIds: string[],
): Promise<void> {
  if (annotationIds.length === 0) return;
  const { error } = await client
    .from("annotations")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", annotationIds);
  if (error) throw new Error(`Failed to delete annotations: ${error.message}`);
}

/** Restores multiple soft-deleted annotations at once. */
export async function batchRestoreAnnotations(
  client: DbClient,
  annotationIds: string[],
): Promise<void> {
  if (annotationIds.length === 0) return;
  const { error } = await client
    .from("annotations")
    .update({ deleted_at: null })
    .in("id", annotationIds);
  if (error) throw new Error(`Failed to restore annotations: ${error.message}`);
}

/** Permanently deletes multiple annotations at once (irreversible). */
export async function batchPermanentlyDeleteAnnotations(
  client: DbClient,
  annotationIds: string[],
): Promise<void> {
  if (annotationIds.length === 0) return;
  const { error } = await client
    .from("annotations")
    .delete()
    .in("id", annotationIds);
  if (error) throw new Error(`Failed to permanently delete annotations: ${error.message}`);
}
