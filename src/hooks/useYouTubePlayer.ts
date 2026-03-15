/**
 * useYouTubePlayer — wraps the YouTube IFrame Player API in the same
 * interface as useAudioPlayback (AudioPlaybackControls).
 *
 * This abstraction means the rest of the audio-sync system doesn't care
 * whether audio comes from a local MP3 or a YouTube video — same controls,
 * same currentTime tracking, same verse highlighting.
 *
 * Uses youtube-nocookie.com for privacy-enhanced mode (no tracking cookies
 * until the user actually plays the video).
 *
 * The YouTube IFrame API is loaded lazily — the <script> tag is only
 * injected when this hook first needs it. Multiple instances share
 * the same API script.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { AudioPlaybackControls } from "./useAudioPlayback";

// ── YouTube IFrame API type declarations ──
// The YouTube API creates a global `YT` object. These types cover
// the subset of the API we actually use.

interface YTPlayerOptions {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayerInstance }) => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  getPlayerState(): number;
  getAvailablePlaybackRates(): number[];
  destroy(): void;
}

// Player state constants from the YouTube API
const YT_UNSTARTED = -1;
const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_BUFFERING = 3;
const YT_CUED = 5;

// ── YouTube API loader ──
// Only one <script> tag per page, shared across all hook instances.

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;

  // If the API is already loaded (e.g., from a previous session)
  if (typeof window !== "undefined" && (window as any).YT?.Player) {
    apiLoadPromise = Promise.resolve();
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise<void>((resolve) => {
    // The YouTube API calls this global function when ready
    (window as any).onYouTubeIframeAPIReady = () => resolve();

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });

  return apiLoadPromise;
}

// ── URL parsing ──

/**
 * Extract a YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://youtube-nocookie.com/embed/VIDEO_ID
 * - Just the video ID itself (11 chars)
 *
 * Returns null if the input doesn't match any known format.
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim();

  // Direct video ID (11 alphanumeric + dash + underscore characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    // youtube.com/watch?v=ID
    if (
      (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") &&
      url.pathname === "/watch"
    ) {
      return url.searchParams.get("v");
    }

    // youtu.be/ID (short links)
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1); // remove leading /
      return id || null;
    }

    // youtube.com/embed/ID or youtube-nocookie.com/embed/ID
    if (
      (url.hostname === "www.youtube.com" ||
        url.hostname === "youtube.com" ||
        url.hostname === "www.youtube-nocookie.com" ||
        url.hostname === "youtube-nocookie.com") &&
      url.pathname.startsWith("/embed/")
    ) {
      return url.pathname.split("/")[2] || null;
    }
  } catch {
    // Not a valid URL — not a video ID either
  }

  return null;
}

// ── YouTube speed options ──
// YouTube only supports specific playback rates
export const YOUTUBE_SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/**
 * Hook that creates and controls a YouTube IFrame player.
 *
 * Returns the same AudioPlaybackControls interface as useAudioPlayback,
 * so the sync controller doesn't need to know the audio source type.
 *
 * @param videoId - YouTube video ID (11 chars). Pass null to disable.
 * @param containerId - DOM element ID where the player iframe will be mounted.
 */
export function useYouTubePlayer(
  videoId: string | null,
  containerId: string,
): AudioPlaybackControls {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const rafRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isReady, setIsReady] = useState(false);

  // Load the YouTube API and create the player
  useEffect(() => {
    if (!videoId) {
      setIsReady(false);
      return;
    }

    let destroyed = false;

    async function init() {
      await loadYouTubeApi();
      if (destroyed) return;

      const YT = (window as any).YT;
      if (!YT?.Player) return;

      const player = new YT.Player(containerId, {
        videoId,
        playerVars: {
          // Privacy-enhanced mode is set via the origin domain,
          // but we also disable related videos and annotations
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3, // hide annotations
          playsinline: 1, // inline on mobile
        },
        events: {
          onReady: (event: { target: YTPlayerInstance }) => {
            if (destroyed) return;
            playerRef.current = event.target;
            setDuration(event.target.getDuration());
            setVolume(event.target.getVolume() / 100);
            setIsReady(true);
          },
          onStateChange: (event: { data: number }) => {
            if (destroyed) return;
            switch (event.data) {
              case YT_PLAYING:
                setIsPlaying(true);
                break;
              case YT_PAUSED:
              case YT_ENDED:
              case YT_CUED:
                setIsPlaying(false);
                if (event.data === YT_ENDED) {
                  const p = playerRef.current;
                  if (p) setCurrentTime(p.getDuration());
                }
                break;
              case YT_BUFFERING:
                // Keep current playing state during buffering
                break;
            }
          },
          onError: () => {
            if (!destroyed) setIsReady(false);
          },
        },
      } as YTPlayerOptions);
    }

    init();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Player may already be destroyed
        }
        playerRef.current = null;
      }
      setIsReady(false);
      setIsPlaying(false);
    };
  }, [videoId, containerId]);

  // RAF loop for smooth currentTime tracking while playing
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    function tick() {
      const player = playerRef.current;
      if (player) {
        setCurrentTime(player.getCurrentTime());
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const state = player.getPlayerState();
    if (state === YT_PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const player = playerRef.current;
    if (!player) return;
    const clamped = Math.max(0, Math.min(time, player.getDuration() || 0));
    player.seekTo(clamped, true);
    setCurrentTime(clamped);
  }, []);

  const setRate = useCallback((rate: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.setPlaybackRate(rate);
    setPlaybackRate(rate);
  }, []);

  const setVolumeHandler = useCallback((vol: number) => {
    const player = playerRef.current;
    if (!player) return;
    const clamped = Math.max(0, Math.min(1, vol));
    // YouTube API uses 0–100 for volume
    player.setVolume(clamped * 100);
    setVolume(clamped);
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isReady,
    play,
    pause,
    togglePlay,
    seek,
    setRate,
    setVolume: setVolumeHandler,
  };
}
