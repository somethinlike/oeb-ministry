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

      // Update local copy to "synced" status
      await saveAnnotationLocally({ ...item.data, syncStatus: "synced" });
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

      await saveAnnotationLocally({ ...item.data, syncStatus: "synced" });
      break;
    }

    case "delete": {
      const { error } = await supabase
        .from("annotations")
        .delete()
        .eq("id", item.annotationId);

      if (error) throw new Error(error.message);

      await deleteAnnotationLocally(item.annotationId);
      break;
    }
  }
}
