/**
 * AudioPlayerBar — compact transport controls for audio-text sync.
 *
 * Sits at the bottom of the reader pane. Provides:
 * - Play/pause button
 * - Seekable progress bar
 * - Time display (current / total)
 * - Speed selector (0.5x–2x)
 * - Volume control
 * - Translation label when audio ≠ reading translation
 * - Close button
 *
 * Receives all state and callbacks from the parent (no internal state).
 * Follows the Grandmother Principle: large tap targets, clear icons, no jargon.
 */

import type { AudioPlaybackControls } from "../hooks/useAudioPlayback";

/** Default MP3 speed options — browser-native, no external libraries needed */
const MP3_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** YouTube-specific speed options (limited by the YouTube API) */
const YOUTUBE_SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

interface AudioPlayerBarProps {
  playback: AudioPlaybackControls;
  /** The translation the audio was recorded in (e.g., "KJV") */
  audioTranslation?: string;
  /** The translation currently displayed in the reader (e.g., "NRSVue") */
  readerTranslation?: string;
  /** Called when the user clicks the close/dismiss button */
  onClose: () => void;
  /** Audio source type — changes available speed options */
  audioSource?: "mp3" | "youtube";
  /** Slot for a compact YouTube video embed next to the controls */
  videoSlot?: React.ReactNode;
}

/** Format seconds into MM:SS display */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayerBar({
  playback,
  audioTranslation,
  readerTranslation,
  onClose,
  audioSource = "mp3",
  videoSlot,
}: AudioPlayerBarProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isReady,
    togglePlay,
    seek,
    setRate,
    setVolume,
  } = playback;

  // Show translation mismatch label when audio ≠ reader translation
  const showTranslationLabel =
    audioTranslation &&
    readerTranslation &&
    audioTranslation !== readerTranslation;

  // Progress as 0–100 for the range input
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-edge bg-panel shadow-lg"
      role="region"
      aria-label="Audio player"
    >
      {/* Translation mismatch banner */}
      {showTranslationLabel && (
        <div className="border-b border-edge bg-surface-alt px-4 py-1 text-center text-xs text-muted">
          Audio: {audioTranslation.toUpperCase()} / Reading:{" "}
          {readerTranslation.toUpperCase()}
        </div>
      )}

      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2">
        {/* Compact video embed slot (YouTube mode) */}
        {videoSlot}

        {/* Play/Pause button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={!isReady}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                     bg-accent text-on-accent hover:bg-accent-hover
                     disabled:opacity-40 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            // Pause icon (two vertical bars)
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            // Play icon (triangle)
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Time display: current / total */}
        <span className="shrink-0 text-xs tabular-nums text-muted w-20 text-center">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Seekable progress bar */}
        <label className="flex flex-1 items-center gap-2">
          <span className="sr-only">Seek audio position</span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressPercent}
            onChange={(e) => {
              const percent = parseFloat(e.target.value);
              seek((percent / 100) * duration);
            }}
            disabled={!isReady}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-edge
                       accent-accent disabled:cursor-not-allowed disabled:opacity-40
                       [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-accent"
            aria-label="Audio progress"
          />
        </label>

        {/* Speed selector */}
        <label className="shrink-0">
          <span className="sr-only">Playback speed</span>
          <select
            value={playbackRate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="rounded border border-input-border bg-panel px-1.5 py-1 text-xs
                       text-heading focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Playback speed"
          >
            {(audioSource === "youtube" ? YOUTUBE_SPEED_OPTIONS : MP3_SPEED_OPTIONS).map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </label>

        {/* Volume control */}
        <label className="hidden sm:flex shrink-0 items-center gap-1.5">
          <span className="sr-only">Volume</span>
          {/* Volume icon */}
          <svg
            className="h-4 w-4 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            {volume === 0 ? (
              // Muted icon
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-3.15a.75.75 0 011.28.53v13.74a.75.75 0 01-1.28.53L6.75 14.25H3.75a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h3z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-3.15a.75.75 0 011.28.53v12.74a.75.75 0 01-1.28.53l-4.72-3.15H3.75a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h3z" />
            )}
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-edge accent-accent
                       [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-accent"
            aria-label="Volume"
          />
        </label>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                     text-muted hover:bg-surface-hover hover:text-heading
                     focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Close audio player"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
