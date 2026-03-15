/**
 * useAudioPlayback — wraps the HTML5 <audio> element API in a React hook.
 *
 * Provides play/pause/seek/rate/volume controls and smooth currentTime
 * tracking via requestAnimationFrame (not the timeupdate event, which
 * only fires ~4x/sec and feels jerky for verse highlighting).
 *
 * The hook manages the <audio> element lifecycle: creates it on mount,
 * cleans up on unmount. The element is never rendered to the DOM — it's
 * headless (no visible controls).
 */

import { useState, useEffect, useRef, useCallback } from "react";

export interface AudioPlaybackControls {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total audio duration in seconds (0 until metadata loads) */
  duration: number;
  /** Current playback speed (e.g., 1.0, 1.5, 2.0) */
  playbackRate: number;
  /** Current volume (0–1) */
  volume: number;
  /** Whether audio has loaded and is ready to play */
  isReady: boolean;
  /** Start or resume playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Toggle play/pause */
  togglePlay: () => void;
  /** Seek to a specific time in seconds */
  seek: (time: number) => void;
  /** Set playback speed (0.25–4.0, browser-supported range) */
  setRate: (rate: number) => void;
  /** Set volume (0–1) */
  setVolume: (vol: number) => void;
}

/**
 * Hook that creates and controls a headless <audio> element.
 *
 * @param src - Audio source URL (object URL from IndexedDB blob, or any URL).
 *              Pass null/undefined to create the hook without loading audio.
 * @returns Playback state and control functions.
 */
export function useAudioPlayback(src: string | null | undefined): AudioPlaybackControls {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isReady, setIsReady] = useState(false);

  // Create the audio element and wire up events
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // When metadata loads, we know the duration
    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      setIsReady(true);
    });

    // Sync state if playback ends naturally
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration);
    });

    // Handle errors gracefully — just mark as not ready
    audio.addEventListener("error", () => {
      setIsReady(false);
    });

    return () => {
      // Clean up: pause, cancel RAF, release element
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      audioRef.current = null;
    };
  }, []);

  // Update source when src changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (src) {
      audio.src = src;
      audio.load();
      setIsReady(false);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    } else {
      audio.removeAttribute("src");
      setIsReady(false);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  }, [src]);

  // requestAnimationFrame loop for smooth currentTime tracking.
  // Only runs while playing — pausing cancels the loop.
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    function tick() {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;
    audio.play().catch(() => {
      // Browser may block autoplay — user interaction required
      setIsPlaying(false);
    });
    setIsPlaying(true);
  }, [isReady]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(time, audio.duration || 0));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const setRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0.25, Math.min(4, rate));
    audio.playbackRate = clamped;
    setPlaybackRate(clamped);
  }, []);

  const setVolumeHandler = useCallback((vol: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(1, vol));
    audio.volume = clamped;
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
