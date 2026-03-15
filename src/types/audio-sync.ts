/**
 * Audio-text sync types — defines data structures for the follow-along
 * Bible reader feature.
 *
 * Sync happens at the verse level, not word level. Verse numbers are
 * universal across translations, so a timing map created from a KJV
 * audio recording works even when the reader shows NRSVue text.
 *
 * Data lives in IndexedDB (Phase 1). Supabase storage comes in Phase 3.
 */

import type { BookId } from "./bible";

/**
 * Timing data for a single verse — when it starts and ends in the audio.
 * Times are in seconds (fractional, e.g. 45.2).
 */
export interface VerseTiming {
  verseNumber: number;
  /** Seconds from audio start when this verse begins being read */
  startTime: number;
  /** Seconds from audio start when this verse ends (next verse begins or audio ends) */
  endTime: number;
}

/**
 * A complete timing map linking audio to Bible text for one chapter.
 * The timings array is sorted by verseNumber (ascending).
 */
export interface AudioTimingMap {
  /** Unique ID for this timing map (crypto.randomUUID) */
  id: string;
  /** Where the audio comes from: local MP3 upload or YouTube video */
  audioSource: "mp3" | "youtube";
  /**
   * Source identifier:
   * - For MP3: the ID key in the audio-blobs store
   * - For YouTube: the video ID (e.g. "dQw4w9WgXcQ")
   */
  sourceId: string;
  /** Which translation the audio was recorded in (e.g. "kjv", "oeb-us") */
  audioTranslation: string;
  /** Bible book this timing map covers */
  book: BookId;
  /** Chapter number */
  chapter: number;
  /** Sorted array of verse timing entries */
  timings: VerseTiming[];
  /** ISO timestamp of when this timing map was created */
  createdAt: string;
}

/**
 * Live playback state — tracks what the audio player is doing right now.
 * This is ephemeral (React state), not persisted.
 */
export interface AudioPlaybackState {
  isPlaying: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total audio duration in seconds */
  duration: number;
  /** Playback speed multiplier (0.5, 0.75, 1, 1.25, 1.5, 2) */
  playbackRate: number;
  /** Volume level 0–1 */
  volume: number;
  /** The verse number currently being read, or null if before/after all timings */
  activeVerse: number | null;
}
