/**
 * Offline annotation store using IndexedDB.
 *
 * When the user is offline, annotations are saved here first.
 * When connectivity returns, the sync engine pushes them to Supabase.
 *
 * Uses the `idb` library for a promise-based IndexedDB API that's
 * much nicer to work with than the raw callback-based API.
 */

import { openDB, type IDBPDatabase } from "idb";

/** A cross-reference stored alongside an annotation in IndexedDB. */
export interface OfflineCrossReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

/** The shape of an annotation in IndexedDB (mirrors the Supabase row). */
export interface OfflineAnnotation {
  /** Local UUID (matches Supabase ID if synced, otherwise client-generated) */
  id: string;
  userId: string;
  translation: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  contentMd: string;
  isPublic: boolean;
  /** Cross-references stored with the annotation for offline support */
  crossReferences: OfflineCrossReference[];
  createdAt: string;
  updatedAt: string;
  /** Tracks sync status: "synced" | "pending_create" | "pending_update" | "pending_delete" */
  syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete";
}

/** A queued sync operation — what needs to happen when we go back online. */
export interface SyncQueueItem {
  id: string;
  operation: "create" | "update" | "delete";
  annotationId: string;
  /** The annotation data (for create/update operations) */
  data?: Omit<OfflineAnnotation, "syncStatus">;
  /** When this operation was queued */
  queuedAt: string;
}

const DB_NAME = "oeb-ministry";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

/** Opens (or creates) the IndexedDB database. Reuses the connection. */
function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // Fresh install — create both stores
          const store = db.createObjectStore("annotations", { keyPath: "id" });
          store.createIndex("by-chapter", ["translation", "book", "chapter"]);
          store.createIndex("by-sync-status", "syncStatus");
          db.createObjectStore("sync-queue", { keyPath: "id" });
        }
        // v2: OfflineAnnotation now includes crossReferences field.
        // No structural change — existing records get crossReferences: []
        // via the ?? [] default in getLocalAnnotationsForChapter().
      },
    });
  }
  return dbPromise;
}

// ── Annotation CRUD (local) ──

/** Saves an annotation to the local store. */
export async function saveAnnotationLocally(
  annotation: OfflineAnnotation,
): Promise<void> {
  const db = await getDb();
  await db.put("annotations", annotation);
}

/** Gets all annotations for a specific chapter from the local store. */
export async function getLocalAnnotationsForChapter(
  translation: string,
  book: string,
  chapter: number,
): Promise<OfflineAnnotation[]> {
  const db = await getDb();
  const raw = await db.getAllFromIndex("annotations", "by-chapter", [
    translation,
    book,
    chapter,
  ]);
  // Normalize: records from DB version 1 lack crossReferences
  return raw.map((r: OfflineAnnotation) => ({
    ...r,
    crossReferences: r.crossReferences ?? [],
  }));
}

/** Gets all annotations with pending sync operations. */
export async function getPendingAnnotations(): Promise<OfflineAnnotation[]> {
  const db = await getDb();
  const pending: OfflineAnnotation[] = [];
  // Check each pending status type
  for (const status of ["pending_create", "pending_update", "pending_delete"] as const) {
    const items = await db.getAllFromIndex("annotations", "by-sync-status", status);
    pending.push(...items);
  }
  return pending;
}

/** Deletes an annotation from the local store. */
export async function deleteAnnotationLocally(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("annotations", id);
}

// ── Sync queue ──

/** Adds an operation to the sync queue. */
export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDb();
  await db.put("sync-queue", item);
}

/** Gets all items in the sync queue, ordered by when they were queued. */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const items = await db.getAll("sync-queue");
  return items.sort(
    (a, b) =>
      new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime(),
  );
}

/** Removes a processed item from the sync queue. */
export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("sync-queue", id);
}

/** Clears the entire sync queue (used after a full sync). */
export async function clearSyncQueue(): Promise<void> {
  const db = await getDb();
  await db.clear("sync-queue");
}
