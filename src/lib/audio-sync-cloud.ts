/**
 * Audio-text sync — Supabase cloud layer.
 *
 * Extends the IndexedDB-only audio-sync.ts with cloud storage:
 * - Save/load timing maps to/from Supabase
 * - Upload/download MP3 audio to/from Supabase Storage
 * - Community sharing for YouTube timing maps
 *
 * Follows the same service module pattern as annotations.ts:
 * every function takes a SupabaseClient as its first argument.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { AudioTimingMap, VerseTiming } from "../types/audio-sync";
import type { BookId } from "../types/bible";

type DbClient = SupabaseClient<Database>;

// ── Type mapping ──

/** Maps a Supabase row to our AudioTimingMap type. */
function rowToTimingMap(row: {
  id: string;
  user_id: string;
  audio_source: string;
  source_id: string;
  audio_translation: string;
  book: string;
  chapter: number;
  timings: unknown;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}): AudioTimingMap & { isShared: boolean; userId: string } {
  return {
    id: row.id,
    audioSource: row.audio_source as "mp3" | "youtube",
    sourceId: row.source_id,
    audioTranslation: row.audio_translation,
    book: row.book as BookId,
    chapter: row.chapter,
    timings: (row.timings ?? []) as VerseTiming[],
    createdAt: row.created_at,
    isShared: row.is_shared,
    userId: row.user_id,
  };
}

// ── Timing Map CRUD (Cloud) ──

/**
 * Save a timing map to Supabase. Creates or updates (upserts) based on
 * the unique constraint (user_id, book, chapter, audio_source, source_id).
 */
export async function saveTimingMapCloud(
  client: DbClient,
  userId: string,
  timingMap: AudioTimingMap,
): Promise<void> {
  const { error } = await (client as any)
    .from("audio_timing_maps")
    .upsert({
      id: timingMap.id,
      user_id: userId,
      audio_source: timingMap.audioSource,
      source_id: timingMap.sourceId,
      audio_translation: timingMap.audioTranslation,
      book: timingMap.book,
      chapter: timingMap.chapter,
      timings: timingMap.timings,
      is_shared: false,
    }, {
      onConflict: "user_id,book,chapter,audio_source,source_id",
    });

  if (error) {
    throw new Error(`Failed to save timing map: ${error.message}`);
  }
}

/**
 * Get all timing maps for a chapter owned by the current user.
 */
export async function getTimingMapsForChapterCloud(
  client: DbClient,
  book: string,
  chapter: number,
): Promise<AudioTimingMap[]> {
  const { data, error } = await (client as any)
    .from("audio_timing_maps")
    .select("*")
    .eq("book", book)
    .eq("chapter", chapter);

  if (error) {
    throw new Error(`Failed to load timing maps: ${error.message}`);
  }

  return (data ?? []).map(rowToTimingMap);
}

/**
 * Get a single timing map by ID.
 */
export async function getTimingMapCloud(
  client: DbClient,
  id: string,
): Promise<(AudioTimingMap & { isShared: boolean; userId: string }) | null> {
  const { data, error } = await (client as any)
    .from("audio_timing_maps")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return rowToTimingMap(data);
}

/**
 * Delete a timing map and its associated audio file (if MP3).
 */
export async function deleteTimingMapCloud(
  client: DbClient,
  userId: string,
  timingMapId: string,
): Promise<void> {
  // First, get the map to check if there's an associated MP3
  const map = await getTimingMapCloud(client, timingMapId);

  if (map && map.audioSource === "mp3") {
    // Delete the audio file from storage
    await client.storage
      .from("bible-audio")
      .remove([map.sourceId]);
  }

  // Delete the timing map row
  const { error } = await (client as any)
    .from("audio_timing_maps")
    .delete()
    .eq("id", timingMapId)
    .eq("user_id", userId); // RLS backup: ensure ownership

  if (error) {
    throw new Error(`Failed to delete timing map: ${error.message}`);
  }
}

// ── Audio Storage (Cloud) ──

/**
 * Upload an MP3 file to the bible-audio bucket.
 * Returns the storage path (used as sourceId in the timing map).
 *
 * Path convention: {user_id}/{book}/{chapter}.mp3
 * This ensures each user's files are isolated and RLS can check ownership.
 */
export async function uploadAudioFile(
  client: DbClient,
  userId: string,
  book: string,
  chapter: number,
  file: Blob,
): Promise<string> {
  const path = `${userId}/${book}/${chapter}.mp3`;

  const { error } = await client.storage
    .from("bible-audio")
    .upload(path, file, {
      contentType: "audio/mpeg",
      upsert: true, // Overwrite if exists (user re-uploads)
    });

  if (error) {
    throw new Error(`Failed to upload audio: ${error.message}`);
  }

  return path;
}

/**
 * Get a signed URL for an audio file in the bible-audio bucket.
 * The URL expires after the specified duration (default: 1 hour).
 *
 * Returns null if the file doesn't exist.
 */
export async function getAudioFileUrl(
  client: DbClient,
  storagePath: string,
  expiresIn: number = 3600,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from("bible-audio")
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Delete an audio file from the bible-audio bucket.
 */
export async function deleteAudioFile(
  client: DbClient,
  storagePath: string,
): Promise<void> {
  const { error } = await client.storage
    .from("bible-audio")
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete audio file: ${error.message}`);
  }
}

// ── Community Sharing (YouTube only) ──

/**
 * Toggle sharing on a YouTube timing map.
 * Only YouTube maps can be shared (MP3s raise copyright concerns).
 * Throws if the map is not a YouTube source.
 */
export async function setTimingMapShared(
  client: DbClient,
  timingMapId: string,
  isShared: boolean,
): Promise<void> {
  // Verify it's a YouTube map before sharing
  const map = await getTimingMapCloud(client, timingMapId);
  if (!map) {
    throw new Error("Timing map not found");
  }
  if (isShared && map.audioSource !== "youtube") {
    throw new Error("Only YouTube timing maps can be shared");
  }

  const { error } = await (client as any)
    .from("audio_timing_maps")
    .update({ is_shared: isShared })
    .eq("id", timingMapId);

  if (error) {
    throw new Error(`Failed to update sharing: ${error.message}`);
  }
}

/**
 * Find shared YouTube timing maps for a chapter from other users.
 * Returns maps that have is_shared = true (community contributions).
 */
export async function getSharedTimingMaps(
  client: DbClient,
  book: string,
  chapter: number,
): Promise<(AudioTimingMap & { isShared: boolean; userId: string })[]> {
  const { data, error } = await (client as any)
    .from("audio_timing_maps")
    .select("*")
    .eq("book", book)
    .eq("chapter", chapter)
    .eq("is_shared", true)
    .eq("audio_source", "youtube");

  if (error) {
    throw new Error(`Failed to load shared timing maps: ${error.message}`);
  }

  return (data ?? []).map(rowToTimingMap);
}

/**
 * Fork a shared timing map — copy it to the current user's collection.
 * The user gets their own editable copy with a new ID.
 * Only works for shared YouTube timing maps.
 */
export async function forkTimingMap(
  client: DbClient,
  userId: string,
  sourceTimingMapId: string,
): Promise<string> {
  const source = await getTimingMapCloud(client, sourceTimingMapId);
  if (!source) {
    throw new Error("Source timing map not found");
  }
  if (!source.isShared) {
    throw new Error("Cannot fork a non-shared timing map");
  }

  // Create a new timing map with the forked data
  const newId = crypto.randomUUID();
  const forked: AudioTimingMap = {
    id: newId,
    audioSource: source.audioSource,
    sourceId: source.sourceId,
    audioTranslation: source.audioTranslation,
    book: source.book,
    chapter: source.chapter,
    timings: source.timings,
    createdAt: new Date().toISOString(),
  };

  await saveTimingMapCloud(client, userId, forked);
  return newId;
}

/**
 * Check if any shared timing maps exist for a chapter.
 * Used to show an "Audio available" indicator without loading full data.
 */
export async function hasSharedTimingMaps(
  client: DbClient,
  book: string,
  chapter: number,
): Promise<boolean> {
  const { count, error } = await (client as any)
    .from("audio_timing_maps")
    .select("id", { count: "exact", head: true })
    .eq("book", book)
    .eq("chapter", chapter)
    .eq("is_shared", true)
    .eq("audio_source", "youtube");

  if (error) return false;
  return (count ?? 0) > 0;
}
