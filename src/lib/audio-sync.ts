/**
 * Audio-text sync — IndexedDB CRUD layer for timing maps and audio blobs.
 *
 * Follows the same service module pattern as user-translations.ts:
 * named exports, pure functions, getDb() for database access.
 *
 * Two stores:
 * - "audio-timing-maps" — verse timing data (~1KB per chapter)
 * - "audio-blobs" — raw MP3 Blob objects (~5MB each)
 *
 * Blobs are stored separately so querying timing metadata never
 * accidentally loads megabytes of audio data.
 */

import { getDb } from "./idb";
import type { AudioTimingMap, VerseTiming } from "../types/audio-sync";

// ── Timing Map CRUD ──

/**
 * Save or update a timing map in IndexedDB.
 * Uses put() so existing records with the same ID are overwritten.
 */
export async function saveTimingMap(timingMap: AudioTimingMap): Promise<void> {
  const db = await getDb();
  await db.put("audio-timing-maps", timingMap);
}

/**
 * Get all timing maps for a given book and chapter.
 * A chapter can have multiple timing maps (different audio sources/translations).
 * Returns an empty array if none exist.
 */
export async function getTimingMapsForChapter(
  book: string,
  chapter: number,
): Promise<AudioTimingMap[]> {
  const db = await getDb();
  // Uses the "by-chapter" compound index: [book, chapter]
  return db.getAllFromIndex("audio-timing-maps", "by-chapter", [book, chapter]);
}

/**
 * Get a single timing map by its unique ID.
 * Returns undefined if not found.
 */
export async function getTimingMap(
  id: string,
): Promise<AudioTimingMap | undefined> {
  const db = await getDb();
  return db.get("audio-timing-maps", id);
}

/**
 * Delete a timing map by ID. Also deletes the associated audio blob
 * if the map references an MP3 source (sourceId matches a blob key).
 */
export async function deleteTimingMap(id: string): Promise<void> {
  const db = await getDb();

  // Check if there's an associated blob to clean up
  const timingMap = await db.get("audio-timing-maps", id);
  if (timingMap && timingMap.audioSource === "mp3") {
    await db.delete("audio-blobs", timingMap.sourceId);
  }

  await db.delete("audio-timing-maps", id);
}

// ── Audio Blob CRUD ──

/**
 * Save an MP3 audio file as a Blob in IndexedDB.
 * The ID should match the sourceId field in the corresponding timing map.
 */
export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put("audio-blobs", { id, blob });
}

/**
 * Get a raw audio Blob by ID.
 * Returns the Blob, or undefined if not found.
 */
export async function getAudioBlob(id: string): Promise<Blob | undefined> {
  const db = await getDb();
  const record = await db.get("audio-blobs", id);
  return record?.blob;
}

/**
 * Get an object URL for an audio blob, suitable for an <audio> element's src.
 * The caller must revoke the URL via URL.revokeObjectURL() when done.
 * Returns null if no blob exists for the given ID.
 */
export async function getAudioBlobUrl(id: string): Promise<string | null> {
  const blob = await getAudioBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

// ── Active Verse Lookup ──

/**
 * Find which verse is being read at a given playback time.
 *
 * Uses binary search on the sorted timings array for O(log n) performance.
 * This gets called on every animation frame during playback (~60x/sec),
 * so it needs to be fast.
 *
 * @param timings - Sorted array of verse timings (by startTime)
 * @param currentTime - Current playback position in seconds
 * @returns The verse number being read, or null if before/after all timings
 */
export function getActiveVerse(
  timings: VerseTiming[],
  currentTime: number,
): number | null {
  if (timings.length === 0) return null;

  // Before the first verse starts
  if (currentTime < timings[0].startTime) return null;

  // After the last verse ends
  const lastTiming = timings[timings.length - 1];
  if (currentTime >= lastTiming.endTime) return null;

  // Binary search: find the last timing whose startTime <= currentTime
  let low = 0;
  let high = timings.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (timings[mid].startTime <= currentTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // high now points to the last timing with startTime <= currentTime
  const candidate = timings[high];

  // Verify we're within this verse's time range
  if (currentTime >= candidate.startTime && currentTime < candidate.endTime) {
    return candidate.verseNumber;
  }

  return null;
}
