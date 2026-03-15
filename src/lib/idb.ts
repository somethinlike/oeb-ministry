/**
 * Centralized IndexedDB setup for the OEB Ministry app.
 *
 * All object stores are defined here so upgrades happen in one place.
 * Other modules import `getDb()` to get a connection.
 *
 * Stores:
 * - "annotations" — offline annotation storage (v1)
 * - "sync-queue" — pending sync operations (v1)
 * - "user-translation-manifests" — metadata for user-uploaded Bibles (v5)
 * - "user-translation-chapters" — chapter data for user-uploaded Bibles (v5)
 * - "audio-timing-maps" — verse timing data for audio-text sync (v6)
 * - "audio-blobs" — raw MP3 audio files as Blobs (v6)
 */

import { openDB, type IDBPDatabase } from "idb";

export const DB_NAME = "oeb-ministry";
export const DB_VERSION = 6;

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Opens (or creates) the IndexedDB database. Reuses the connection.
 *
 * The upgrade callback handles all schema migrations. Each version
 * block creates new stores or indexes. Fields added to existing stores
 * are handled by normalization on read (see offline-store.ts).
 */
export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1: Core annotation + sync stores
        if (oldVersion < 1) {
          const store = db.createObjectStore("annotations", { keyPath: "id" });
          store.createIndex("by-chapter", ["translation", "book", "chapter"]);
          store.createIndex("by-sync-status", "syncStatus");
          db.createObjectStore("sync-queue", { keyPath: "id" });
        }
        // v2: crossReferences field added. Defaults to [] via normalize.
        // v3: deletedAt field added. Defaults to null via normalize.
        // v4: isEncrypted + encryptionIv fields added. Defaults via normalize.

        // v5: User-uploaded Bible translations
        if (oldVersion < 5) {
          // Manifest store — one record per uploaded translation
          db.createObjectStore("user-translation-manifests", {
            keyPath: "translation",
          });

          // Chapter store — verse data, keyed by [translation, book, chapter]
          const chapterStore = db.createObjectStore("user-translation-chapters", {
            keyPath: ["translation", "book", "chapter"],
          });
          // Index to quickly get all chapters for a given translation
          // (used when deleting a translation)
          chapterStore.createIndex("by-translation", "translation");
        }

        // v6: Audio-text sync stores
        if (oldVersion < 6) {
          // Timing maps — one per chapter per audio source (~1KB each)
          const timingStore = db.createObjectStore("audio-timing-maps", {
            keyPath: "id",
          });
          // Look up timing maps by book+chapter (for loading when reader navigates)
          timingStore.createIndex("by-chapter", ["book", "chapter"]);

          // Audio blobs — raw MP3 files (~5MB each), kept separate from
          // timing maps so querying metadata never loads megabytes of audio
          db.createObjectStore("audio-blobs", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Reset the cached DB promise. Used in tests to force a fresh connection
 * after clearing/deleting the database.
 */
export function resetDbPromise(): void {
  dbPromise = null;
}
