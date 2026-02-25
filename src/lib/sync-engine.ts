/**
 * Sync engine — processes the offline queue when connectivity returns.
 *
 * Strategy: last-write-wins (simplest conflict resolution).
 * When the user comes back online, we push local changes to Supabase
 * in chronological order. If there's a conflict (e.g., the annotation
 * was also modified on another device), the most recent write wins.
 *
 * This is simple and good enough for v1. If users report data loss
 * from conflicts, we can upgrade to a more sophisticated strategy.
 */

import { supabase } from "./supabase";
import {
  getSyncQueue,
  removeFromSyncQueue,
  saveAnnotationLocally,
  deleteAnnotationLocally,
  type SyncQueueItem,
} from "./offline-store";

/** Result of processing the sync queue. */
export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

/**
 * Processes all pending sync operations.
 * Call this when the browser goes from offline → online.
 */
export async function processSync(): Promise<SyncResult> {
  const queue = await getSyncQueue();

  const result: SyncResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const item of queue) {
    result.processed++;

    try {
      await processItem(item);
      await removeFromSyncQueue(item.id);
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push(
        `Failed to sync ${item.operation} for annotation ${item.annotationId}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  }

  // Notify the workspace to refetch annotations after sync completes.
  // Follows the same CustomEvent pattern as register-sw.ts ("sw-update-available").
  if (result.processed > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("oeb-sync-complete", { detail: result }),
    );
  }

  return result;
}

/** Processes a single sync queue item. */
async function processItem(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case "create": {
      if (!item.data) throw new Error("Missing data for create operation");

      const { error } = await supabase.from("annotations").insert({
        id: item.data.id,
        user_id: item.data.userId,
        translation: item.data.translation,
        book: item.data.book,
        chapter: item.data.chapter,
        verse_start: item.data.verseStart,
        verse_end: item.data.verseEnd,
        content_md: item.data.contentMd,
        is_public: item.data.isPublic,
      });

      if (error) throw new Error(error.message);

      // Sync cross-references if any were saved offline
      const crossRefs = item.data.crossReferences ?? [];
      if (crossRefs.length > 0) {
        const { error: refError } = await supabase
          .from("cross_references")
          .insert(
            crossRefs.map((ref) => ({
              annotation_id: item.data!.id,
              book: ref.book,
              chapter: ref.chapter,
              verse_start: ref.verseStart,
              verse_end: ref.verseEnd,
            })),
          );
        if (refError) {
          // Cross-ref failure is non-fatal — the annotation itself is saved
          console.error("Failed to sync cross-references:", refError.message);
        }
      }

      // Update local copy to "synced" status
      await saveAnnotationLocally({
        ...item.data,
        crossReferences: crossRefs,
        syncStatus: "synced",
      });
      break;
    }

    case "update": {
      if (!item.data) throw new Error("Missing data for update operation");

      const { error } = await supabase
        .from("annotations")
        .update({
          translation: item.data.translation,
          book: item.data.book,
          chapter: item.data.chapter,
          verse_start: item.data.verseStart,
          verse_end: item.data.verseEnd,
          content_md: item.data.contentMd,
        })
        .eq("id", item.annotationId);

      if (error) throw new Error(error.message);

      // Replace cross-references: delete old ones, insert new ones
      // (same pattern as updateAnnotation in annotations.ts)
      const crossRefs = item.data.crossReferences ?? [];
      await supabase
        .from("cross_references")
        .delete()
        .eq("annotation_id", item.annotationId);

      if (crossRefs.length > 0) {
        const { error: refError } = await supabase
          .from("cross_references")
          .insert(
            crossRefs.map((ref) => ({
              annotation_id: item.annotationId,
              book: ref.book,
              chapter: ref.chapter,
              verse_start: ref.verseStart,
              verse_end: ref.verseEnd,
            })),
          );
        if (refError) {
          console.error("Failed to sync cross-references:", refError.message);
        }
      }

      await saveAnnotationLocally({
        ...item.data,
        crossReferences: crossRefs,
        syncStatus: "synced",
      });
      break;
    }

    case "delete": {
      // Soft-delete: set deleted_at instead of removing the row.
      // Cross-references are preserved so they survive a restore.
      const { error } = await supabase
        .from("annotations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", item.annotationId);

      if (error) throw new Error(error.message);

      // Remove from local IndexedDB — the server has the soft-deleted record;
      // the Recycle Bin page queries Supabase directly.
      await deleteAnnotationLocally(item.annotationId);
      break;
    }
  }
}
