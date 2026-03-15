/**
 * useAudioSync — combines audio playback with verse timing data.
 *
 * This is the bridge between the playback hook (manages audio) and the
 * timing map from IndexedDB (maps timestamps to verse numbers). Each
 * animation frame, it resolves currentTime → activeVerse.
 *
 * Usage:
 *   const { activeVerse, playback, timingMap, ... } = useAudioSync(book, chapter);
 *   // Pass activeVerse to ChapterReader as activeAudioVerse prop
 *   // Pass playback controls to AudioPlayerBar
 */

import { useState, useEffect, useMemo } from "react";
import { useAudioPlayback, type AudioPlaybackControls } from "./useAudioPlayback";
import {
  getTimingMapsForChapter,
  getAudioBlobUrl,
  getActiveVerse,
} from "../lib/audio-sync";
import type { AudioTimingMap } from "../types/audio-sync";

export interface AudioSyncState {
  /** The verse number currently being read, or null */
  activeVerse: number | null;
  /** Full playback controls (play, pause, seek, etc.) */
  playback: AudioPlaybackControls;
  /** All timing maps available for the current chapter */
  availableTimingMaps: AudioTimingMap[];
  /** The currently active timing map (user's selection) */
  activeTimingMap: AudioTimingMap | null;
  /** Select a different timing map by ID */
  selectTimingMap: (id: string) => void;
  /** Whether timing maps are still loading from IndexedDB */
  loading: boolean;
  /** The blob URL for MP3 audio (null for YouTube or if not loaded) */
  audioSrc: string | null;
  /** The YouTube video ID (null for MP3 sources) */
  youtubeVideoId: string | null;
  /** Close/dismiss the audio player */
  close: () => void;
  /** Whether the audio sync is active (a timing map is selected) */
  isActive: boolean;
}

/**
 * Hook that manages audio-text synchronization for a Bible chapter.
 *
 * Loads timing maps from IndexedDB, resolves audio blob URLs,
 * and tracks which verse is being read on each frame.
 *
 * @param book - Current book ID (e.g., "jhn")
 * @param chapter - Current chapter number
 */
export function useAudioSync(book: string, chapter: number): AudioSyncState {
  const [availableTimingMaps, setAvailableTimingMaps] = useState<AudioTimingMap[]>([]);
  const [activeTimingMap, setActiveTimingMap] = useState<AudioTimingMap | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // The playback hook manages the actual audio element (MP3 only)
  const playback = useAudioPlayback(audioSrc);

  // Load timing maps when book/chapter changes
  useEffect(() => {
    let cancelled = false;

    async function loadTimingMaps() {
      setLoading(true);
      try {
        const maps = await getTimingMapsForChapter(book, chapter);
        if (cancelled) return;
        setAvailableTimingMaps(maps);
        // Auto-select the first map if available, otherwise clear
        if (maps.length > 0) {
          setActiveTimingMap(maps[0]);
        } else {
          setActiveTimingMap(null);
        }
      } catch {
        if (!cancelled) {
          setAvailableTimingMaps([]);
          setActiveTimingMap(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTimingMaps();

    return () => {
      cancelled = true;
    };
  }, [book, chapter]);

  // Load audio source when the active timing map changes
  useEffect(() => {
    let cancelled = false;

    // Revoke previous blob URL to free memory
    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
      setAudioSrc(null);
    }
    setYoutubeVideoId(null);

    if (!activeTimingMap) return;

    if (activeTimingMap.audioSource === "mp3") {
      getAudioBlobUrl(activeTimingMap.sourceId).then((url) => {
        if (!cancelled) setAudioSrc(url);
      });
    } else if (activeTimingMap.audioSource === "youtube") {
      // YouTube sources use the video ID directly — no blob to load
      if (!cancelled) setYoutubeVideoId(activeTimingMap.sourceId);
    }

    return () => {
      cancelled = true;
    };
    // audioSrc deliberately omitted — we only want to reload when the map changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimingMap?.id]);

  // Resolve currentTime → activeVerse using the timing map
  // This runs on every render (which happens every RAF tick during playback)
  const activeVerse = useMemo(() => {
    if (!activeTimingMap) return null;
    return getActiveVerse(activeTimingMap.timings, playback.currentTime);
  }, [activeTimingMap, playback.currentTime]);

  function selectTimingMap(id: string) {
    const map = availableTimingMaps.find((m) => m.id === id);
    if (map) setActiveTimingMap(map);
  }

  function close() {
    playback.pause();
    setActiveTimingMap(null);
    setYoutubeVideoId(null);
    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
      setAudioSrc(null);
    }
  }

  return {
    activeVerse,
    playback,
    availableTimingMaps,
    activeTimingMap,
    selectTimingMap,
    loading,
    audioSrc,
    youtubeVideoId,
    close,
    isActive: activeTimingMap !== null,
  };
}
