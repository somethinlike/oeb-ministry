/**
 * Devotional Bible data access layer.
 *
 * All Supabase queries for devotional bible collections go through
 * this module. Same pattern as annotations.ts — every function takes
 * a Supabase client as its first argument for browser/server flexibility.
 *
 * Business rules enforced here (not in RLS):
 * - "original" type: only the owner's annotations can be added
 * - "assembled" type: referenced annotations must be public (CC0)
 * - Publishing requires at least one entry
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type {
  DevotionalBible,
  DevotionalBibleEntry,
  DevotionalBibleFormData,
  DevotionalBibleWithEntries,
  DevotionalBibleType,
} from "../types/devotional-bible";

type DbClient = SupabaseClient<Database>;

// Sort order gap between entries (allows insertions without renumbering)
const SORT_ORDER_GAP = 10;

// ---------------------------------------------------------------------------
// Row → Type mappers
// ---------------------------------------------------------------------------

/** Maps a database row to our DevotionalBible type. */
function rowToDevotionalBible(
  row: Database["public"]["Tables"]["devotional_bibles"]["Row"],
): DevotionalBible {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    translation: row.translation,
    type: row.type as DevotionalBibleType,
    isPublished: row.is_published,
    publishStatus: row.publish_status as DevotionalBible["publishStatus"],
    publishedAt: row.published_at,
    rejectionReason: row.rejection_reason,
    forkedFromId: row.forked_from_id,
    authorDisplayName: row.author_display_name,
    entryCount: row.entry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** Maps a database row to our DevotionalBibleEntry type. */
function rowToEntry(
  row: Database["public"]["Tables"]["devotional_bible_entries"]["Row"],
): DevotionalBibleEntry {
  return {
    id: row.id,
    devotionalBibleId: row.devotional_bible_id,
    annotationId: row.annotation_id,
    sortOrder: row.sort_order,
    addedAt: row.added_at,
  };
}

// ---------------------------------------------------------------------------
// CRUD — Devotional Bibles
// ---------------------------------------------------------------------------

/**
 * Fetches all non-deleted devotional bibles for a user.
 * Ordered by most recently updated first.
 */
export async function getDevotionalBibles(
  client: DbClient,
  userId: string,
): Promise<DevotionalBible[]> {
  const { data, error } = await client
    .from("devotional_bibles")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to load devotional bibles: ${error.message}`);
  return (data ?? []).map(rowToDevotionalBible);
}

/**
 * Fetches a single devotional bible by ID.
 */
export async function getDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
): Promise<DevotionalBible | null> {
  const { data, error } = await client
    .from("devotional_bibles")
    .select("*")
    .eq("id", devotionalBibleId)
    .single();

  if (error || !data) return null;
  return rowToDevotionalBible(data);
}

/**
 * Fetches a devotional bible with all its entries, ordered by sort_order.
 */
export async function getDevotionalBibleWithEntries(
  client: DbClient,
  devotionalBibleId: string,
): Promise<DevotionalBibleWithEntries | null> {
  const bible = await getDevotionalBible(client, devotionalBibleId);
  if (!bible) return null;

  const { data: entries, error } = await client
    .from("devotional_bible_entries")
    .select("*")
    .eq("devotional_bible_id", devotionalBibleId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Failed to load entries: ${error.message}`);

  return {
    ...bible,
    entries: (entries ?? []).map(rowToEntry),
  };
}

/**
 * Creates a new devotional bible collection.
 */
export async function createDevotionalBible(
  client: DbClient,
  userId: string,
  formData: DevotionalBibleFormData,
): Promise<DevotionalBible> {
  const { data, error } = await client
    .from("devotional_bibles")
    .insert({
      user_id: userId,
      title: formData.title,
      description: formData.description,
      translation: formData.translation,
      type: formData.type,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create devotional bible: ${error?.message ?? "Unknown error"}`);
  }

  return rowToDevotionalBible(data);
}

/**
 * Updates a devotional bible's metadata (title, description, etc.).
 */
export async function updateDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
  formData: Partial<DevotionalBibleFormData>,
): Promise<DevotionalBible> {
  const updateData: Database["public"]["Tables"]["devotional_bibles"]["Update"] = {};
  if (formData.title !== undefined) updateData.title = formData.title;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.translation !== undefined) updateData.translation = formData.translation;
  if (formData.type !== undefined) updateData.type = formData.type;

  const { data, error } = await client
    .from("devotional_bibles")
    .update(updateData)
    .eq("id", devotionalBibleId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update devotional bible: ${error?.message ?? "Unknown error"}`);
  }

  return rowToDevotionalBible(data);
}

/**
 * Soft-deletes a devotional bible (moves to recycle bin).
 */
export async function softDeleteDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
): Promise<void> {
  const { error } = await client
    .from("devotional_bibles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", devotionalBibleId);

  if (error) throw new Error(`Failed to delete devotional bible: ${error.message}`);
}

/**
 * Restores a soft-deleted devotional bible from the recycle bin.
 */
export async function restoreDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
): Promise<void> {
  const { error } = await client
    .from("devotional_bibles")
    .update({ deleted_at: null })
    .eq("id", devotionalBibleId);

  if (error) throw new Error(`Failed to restore devotional bible: ${error.message}`);
}

/**
 * Permanently deletes a devotional bible and all its entries (FK cascade).
 */
export async function permanentlyDeleteDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
): Promise<void> {
  const { error } = await client
    .from("devotional_bibles")
    .delete()
    .eq("id", devotionalBibleId);

  if (error) throw new Error(`Failed to permanently delete devotional bible: ${error.message}`);
}

// ---------------------------------------------------------------------------
// CRUD — Entries
// ---------------------------------------------------------------------------

/**
 * Adds an annotation to a devotional bible collection.
 *
 * For "original" type devotionals, verifies the annotation belongs to the
 * same user who owns the devotional. This is a business rule, not an RLS
 * policy — RLS handles who can read/write, not content constraints.
 */
export async function addEntryToDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
  annotationId: string,
  sortOrder?: number,
): Promise<DevotionalBibleEntry> {
  // Fetch the devotional to check type + ownership
  const { data: bible, error: bibleError } = await client
    .from("devotional_bibles")
    .select("user_id, type")
    .eq("id", devotionalBibleId)
    .single();

  if (bibleError || !bible) {
    throw new Error(`Devotional bible not found: ${bibleError?.message ?? "Unknown error"}`);
  }

  // For "original" type, verify annotation ownership
  if (bible.type === "original") {
    const { data: annotation, error: annError } = await client
      .from("annotations")
      .select("user_id")
      .eq("id", annotationId)
      .single();

    if (annError || !annotation) {
      throw new Error(`Annotation not found: ${annError?.message ?? "Unknown error"}`);
    }

    if (annotation.user_id !== bible.user_id) {
      throw new Error(
        "Original devotional bibles can only include your own annotations.",
      );
    }
  }

  // Auto-assign sort_order to end if not provided
  let order = sortOrder;
  if (order === undefined) {
    const { data: lastEntry } = await client
      .from("devotional_bible_entries")
      .select("sort_order")
      .eq("devotional_bible_id", devotionalBibleId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    order = (lastEntry?.sort_order ?? 0) + SORT_ORDER_GAP;
  }

  const { data, error } = await client
    .from("devotional_bible_entries")
    .insert({
      devotional_bible_id: devotionalBibleId,
      annotation_id: annotationId,
      sort_order: order,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to add entry: ${error?.message ?? "Unknown error"}`);
  }

  // entry_count is auto-incremented by the Postgres trigger
  return rowToEntry(data);
}

/**
 * Removes an entry from a devotional bible.
 * entry_count is auto-decremented by the Postgres trigger.
 */
export async function removeEntryFromDevotionalBible(
  client: DbClient,
  entryId: string,
): Promise<void> {
  const { error } = await client
    .from("devotional_bible_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw new Error(`Failed to remove entry: ${error.message}`);
}

/**
 * Reorders entries within a devotional bible.
 * Assigns gapped sort_order values (10, 20, 30...) based on the provided
 * array order. This normalizes gaps and avoids collisions.
 */
export async function reorderEntries(
  client: DbClient,
  devotionalBibleId: string,
  orderedEntryIds: string[],
): Promise<void> {
  // Update each entry's sort_order in parallel
  await Promise.all(
    orderedEntryIds.map(async (entryId, index) => {
      const { error } = await client
        .from("devotional_bible_entries")
        .update({ sort_order: (index + 1) * SORT_ORDER_GAP })
        .eq("id", entryId)
        .eq("devotional_bible_id", devotionalBibleId);

      if (error) throw new Error(`Failed to reorder entry ${entryId}: ${error.message}`);
    }),
  );
}

/**
 * Adds multiple annotations to a devotional bible at once.
 * For "original" type, filters out annotations that don't belong to the owner.
 * Returns the count of entries actually added.
 */
export async function batchAddEntries(
  client: DbClient,
  devotionalBibleId: string,
  annotationIds: string[],
): Promise<{ added: number; skipped: number }> {
  if (annotationIds.length === 0) return { added: 0, skipped: 0 };

  // Fetch the devotional to check type + ownership
  const { data: bible, error: bibleError } = await client
    .from("devotional_bibles")
    .select("user_id, type")
    .eq("id", devotionalBibleId)
    .single();

  if (bibleError || !bible) {
    throw new Error(`Devotional bible not found: ${bibleError?.message ?? "Unknown error"}`);
  }

  let validIds = annotationIds;

  // For "original" type, filter to only the owner's annotations
  if (bible.type === "original") {
    const { data: annotations, error: annError } = await client
      .from("annotations")
      .select("id, user_id")
      .in("id", annotationIds);

    if (annError) throw new Error(`Failed to fetch annotations: ${annError.message}`);

    validIds = (annotations ?? [])
      .filter((a) => a.user_id === bible.user_id)
      .map((a) => a.id);
  }

  if (validIds.length === 0) {
    return { added: 0, skipped: annotationIds.length };
  }

  // Get current max sort_order
  const { data: lastEntry } = await client
    .from("devotional_bible_entries")
    .select("sort_order")
    .eq("devotional_bible_id", devotionalBibleId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const startOrder = (lastEntry?.sort_order ?? 0) + SORT_ORDER_GAP;

  // Insert all entries in one batch
  const { error } = await client
    .from("devotional_bible_entries")
    .insert(
      validIds.map((annotationId, index) => ({
        devotional_bible_id: devotionalBibleId,
        annotation_id: annotationId,
        sort_order: startOrder + index * SORT_ORDER_GAP,
      })),
    );

  if (error) throw new Error(`Failed to add entries: ${error.message}`);

  // entry_count auto-updated by Postgres trigger (one trigger per row)
  return {
    added: validIds.length,
    skipped: annotationIds.length - validIds.length,
  };
}

// ---------------------------------------------------------------------------
// Publishing pipeline
// ---------------------------------------------------------------------------

/**
 * Submits a devotional bible for CC0 publishing review.
 * Validates:
 * - Has at least one entry
 * - For "assembled" type: all referenced annotations are public (CC0)
 */
export async function submitDevotionalForPublishing(
  client: DbClient,
  devotionalBibleId: string,
  authorDisplayName: string,
): Promise<void> {
  // Fetch the devotional
  const { data: bible, error: bibleError } = await client
    .from("devotional_bibles")
    .select("entry_count, type")
    .eq("id", devotionalBibleId)
    .single();

  if (bibleError || !bible) {
    throw new Error(`Devotional bible not found: ${bibleError?.message ?? "Unknown error"}`);
  }

  if (bible.entry_count === 0) {
    throw new Error("Cannot publish an empty devotional bible. Add at least one annotation.");
  }

  // For "assembled" type, verify all referenced annotations are public
  if (bible.type === "assembled") {
    const { data: entries } = await client
      .from("devotional_bible_entries")
      .select("annotation_id")
      .eq("devotional_bible_id", devotionalBibleId);

    if (entries && entries.length > 0) {
      const annotationIds = entries.map((e) => e.annotation_id);
      const { data: annotations } = await client
        .from("annotations")
        .select("id, is_public")
        .in("id", annotationIds);

      const nonPublic = (annotations ?? []).filter((a) => !a.is_public);
      if (nonPublic.length > 0) {
        throw new Error(
          `${nonPublic.length} annotation${nonPublic.length !== 1 ? "s are" : " is"} not yet public. ` +
          "All annotations in an assembled devotional must be CC0 before publishing.",
        );
      }
    }
  }

  // AI screening: screen the devotional's title + description for flags
  const { data: fullBible } = await client
    .from("devotional_bibles")
    .select("title, description")
    .eq("id", devotionalBibleId)
    .single();

  const { screenContentRules } = await import("./ai-screening");
  const contentToScreen = [fullBible?.title, fullBible?.description].filter(Boolean).join("\n\n");
  const screening = screenContentRules(contentToScreen);

  const { error } = await client
    .from("devotional_bibles")
    .update({
      publish_status: "pending",
      author_display_name: authorDisplayName,
      ai_screening_passed: screening.passed,
      ai_screening_flags: screening.flags,
      ai_screened_at: screening.screenedAt,
    })
    .eq("id", devotionalBibleId);

  if (error) throw new Error(`Failed to submit for publishing: ${error.message}`);
}

/**
 * Retracts a published or pending devotional bible back to private.
 */
export async function retractDevotionalFromPublishing(
  client: DbClient,
  devotionalBibleId: string,
): Promise<void> {
  const { error } = await client
    .from("devotional_bibles")
    .update({
      is_published: false,
      publish_status: null,
      published_at: null,
      rejection_reason: null,
    })
    .eq("id", devotionalBibleId);

  if (error) throw new Error(`Failed to retract devotional bible: ${error.message}`);
}

/**
 * Approves a devotional bible for CC0 publishing (moderator action).
 */
export async function approveDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
  moderatorId: string,
  reason?: string,
): Promise<void> {
  const { error: updateError } = await client
    .from("devotional_bibles")
    .update({
      is_published: true,
      publish_status: "approved",
      published_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", devotionalBibleId);

  if (updateError) throw new Error(`Failed to approve devotional bible: ${updateError.message}`);

  await client.from("moderation_log").insert({
    devotional_bible_id: devotionalBibleId,
    moderator_id: moderatorId,
    action: "approved",
    reason: reason ?? null,
  });
}

/**
 * Rejects a devotional bible with feedback (moderator action).
 */
export async function rejectDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
  moderatorId: string,
  reason: string,
): Promise<void> {
  const { error: updateError } = await client
    .from("devotional_bibles")
    .update({
      is_published: false,
      publish_status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", devotionalBibleId);

  if (updateError) throw new Error(`Failed to reject devotional bible: ${updateError.message}`);

  await client.from("moderation_log").insert({
    devotional_bible_id: devotionalBibleId,
    moderator_id: moderatorId,
    action: "rejected",
    reason,
  });
}

// ---------------------------------------------------------------------------
// Forking
// ---------------------------------------------------------------------------

/**
 * Creates a copy of a published devotional bible for the current user.
 * Forks are always "assembled" type — even if the source was "original" —
 * because the new owner may want to add their own or others' CC0 annotations.
 */
export async function forkDevotionalBible(
  client: DbClient,
  userId: string,
  sourceDevotionalBibleId: string,
): Promise<DevotionalBible> {
  // Fetch the source devotional
  const source = await getDevotionalBibleWithEntries(client, sourceDevotionalBibleId);
  if (!source) throw new Error("Source devotional bible not found.");

  if (!source.isPublished || source.publishStatus !== "approved") {
    throw new Error("Can only fork published devotional bibles.");
  }

  // Create the fork
  const { data: newBible, error: createError } = await client
    .from("devotional_bibles")
    .insert({
      user_id: userId,
      title: `${source.title} (fork)`,
      description: source.description,
      translation: source.translation,
      type: "assembled", // Forks are always assembled
      forked_from_id: sourceDevotionalBibleId,
    })
    .select()
    .single();

  if (createError || !newBible) {
    throw new Error(`Failed to fork devotional bible: ${createError?.message ?? "Unknown error"}`);
  }

  // Copy all entries preserving sort_order
  if (source.entries.length > 0) {
    const { error: entriesError } = await client
      .from("devotional_bible_entries")
      .insert(
        source.entries.map((entry) => ({
          devotional_bible_id: newBible.id,
          annotation_id: entry.annotationId,
          sort_order: entry.sortOrder,
        })),
      );

    if (entriesError) {
      // Clean up the orphaned devotional if entries failed
      await client.from("devotional_bibles").delete().eq("id", newBible.id);
      throw new Error(`Failed to copy entries during fork: ${entriesError.message}`);
    }
  }

  // entry_count auto-updated by Postgres trigger
  // Re-fetch to get accurate entry_count
  const result = await getDevotionalBible(client, newBible.id);
  return result!;
}

// ---------------------------------------------------------------------------
// Community / Browse
// ---------------------------------------------------------------------------

/**
 * Fetches published devotional bibles for the community page.
 * Supports pagination and optional translation filter.
 */
export async function getPublishedDevotionalBibles(
  client: DbClient,
  options?: {
    translation?: string;
    limit?: number;
    offset?: number;
  },
): Promise<DevotionalBible[]> {
  let query = client
    .from("devotional_bibles")
    .select("*")
    .eq("is_published", true)
    .eq("publish_status", "approved")
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  if (options?.translation) {
    query = query.eq("translation", options.translation);
  }

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load published devotional bibles: ${error.message}`);
  return (data ?? []).map(rowToDevotionalBible);
}

/**
 * Counts how many times a devotional bible has been forked (social proof).
 */
export async function getForkCount(
  client: DbClient,
  devotionalBibleId: string,
): Promise<number> {
  const { count, error } = await client
    .from("devotional_bibles")
    .select("id", { count: "exact", head: true })
    .eq("forked_from_id", devotionalBibleId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Checks if the user has any devotional bibles (for nav menu display).
 * Lightweight COUNT query — no row data transferred.
 */
export async function hasDevotionalBibles(
  client: DbClient,
  userId: string,
): Promise<boolean> {
  const { count, error } = await client
    .from("devotional_bibles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .limit(1);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Fetches pending devotional bibles for the moderation queue.
 * Only accessible to moderators (enforced by RLS).
 */
export async function getPendingDevotionalBibles(
  client: DbClient,
): Promise<DevotionalBible[]> {
  const { data, error } = await client
    .from("devotional_bibles")
    .select("*")
    .eq("publish_status", "pending")
    .is("deleted_at", null)
    .order("updated_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(`Failed to load pending devotional bibles: ${error.message}`);
  return (data ?? []).map(rowToDevotionalBible);
}
