/**
 * AudioTimingEditor — full-screen modal for creating verse timing maps.
 *
 * Two modes:
 * 1. **Precise Mode** (default): User listens to audio and taps "Mark" as
 *    each verse begins. End times auto-calculated. Review mode lets you
 *    click any verse to seek and fine-tune with +/- 0.1s buttons.
 *
 * 2. **Quick Sync Mode**: User marks only key verses (every Nth), and
 *    unmarked verses get evenly-distributed timestamps between anchors.
 *    Faster for long chapters, less accurate.
 *
 * Keyboard shortcuts:
 * - Space: play/pause
 * - Enter or M: mark current verse
 * - Left/Right arrows: seek ±5s
 * - Shift+Left/Right: seek ±1s
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAudioPlayback } from "../hooks/useAudioPlayback";
import { saveTimingMap, saveAudioBlob } from "../lib/audio-sync";
import type { AudioTimingMap, VerseTiming } from "../types/audio-sync";
import type { Verse, BookId } from "../types/bible";

type EditorMode = "precise" | "quick";
type EditorPhase = "upload" | "marking" | "review";

interface AudioTimingEditorProps {
  /** The verses in the current chapter (from ChapterReader's data) */
  verses: Verse[];
  book: BookId;
  chapter: number;
  /** Called when the editor is closed (saved or cancelled) */
  onClose: () => void;
  /** Called after a timing map is saved, so the parent can reload */
  onSaved?: () => void;
  /** Existing timing map to edit (for re-editing) */
  existingMap?: AudioTimingMap;
}

/**
 * Interpolate timestamps between marked anchor verses.
 * Unmarked verses between two anchors get evenly spaced times.
 */
function interpolateTimings(
  marks: Map<number, number>,
  verses: Verse[],
  totalDuration: number,
): VerseTiming[] {
  if (marks.size === 0) return [];

  const sortedVerseNumbers = verses.map((v) => v.number);
  const result: VerseTiming[] = [];

  // Build sorted list of anchor points (verse number → startTime)
  const anchors = Array.from(marks.entries()).sort((a, b) => a[0] - b[0]);

  for (let i = 0; i < sortedVerseNumbers.length; i++) {
    const verseNum = sortedVerseNumbers[i];
    const mark = marks.get(verseNum);

    if (mark !== undefined) {
      // This verse was explicitly marked
      result.push({ verseNumber: verseNum, startTime: mark, endTime: 0 });
    } else {
      // Find surrounding anchors for interpolation
      let prevAnchor: [number, number] | null = null;
      let nextAnchor: [number, number] | null = null;

      for (const anchor of anchors) {
        if (anchor[0] < verseNum) prevAnchor = anchor;
        if (anchor[0] > verseNum && !nextAnchor) nextAnchor = anchor;
      }

      if (prevAnchor && nextAnchor) {
        // Between two anchors — interpolate
        const prevIdx = sortedVerseNumbers.indexOf(prevAnchor[0]);
        const nextIdx = sortedVerseNumbers.indexOf(nextAnchor[0]);
        const span = nextIdx - prevIdx;
        const position = i - prevIdx;
        const timeDelta = nextAnchor[1] - prevAnchor[1];
        const interpolated = prevAnchor[1] + (timeDelta * position) / span;
        result.push({ verseNumber: verseNum, startTime: interpolated, endTime: 0 });
      } else if (prevAnchor) {
        // After the last anchor — distribute remaining time
        const prevIdx = sortedVerseNumbers.indexOf(prevAnchor[0]);
        const remaining = sortedVerseNumbers.length - prevIdx;
        const position = i - prevIdx;
        const timeDelta = totalDuration - prevAnchor[1];
        const interpolated = prevAnchor[1] + (timeDelta * position) / remaining;
        result.push({ verseNumber: verseNum, startTime: interpolated, endTime: 0 });
      } else if (nextAnchor) {
        // Before the first anchor — distribute leading time
        const nextIdx = sortedVerseNumbers.indexOf(nextAnchor[0]);
        const span = nextIdx + 1;
        const position = i;
        const interpolated = (nextAnchor[1] * position) / span;
        result.push({ verseNumber: verseNum, startTime: interpolated, endTime: 0 });
      }
    }
  }

  // Calculate end times: each verse ends when the next begins,
  // last verse ends at total duration
  for (let i = 0; i < result.length; i++) {
    result[i].endTime =
      i < result.length - 1 ? result[i + 1].startTime : totalDuration;
  }

  return result;
}

export function AudioTimingEditor({
  verses,
  book,
  chapter,
  onClose,
  onSaved,
  existingMap,
}: AudioTimingEditorProps) {
  const [mode, setMode] = useState<EditorMode>("precise");
  const [phase, setPhase] = useState<EditorPhase>(existingMap ? "review" : "upload");
  const [audioTranslation, setAudioTranslation] = useState(
    existingMap?.audioTranslation ?? "",
  );
  const [blobId, setBlobId] = useState(existingMap?.sourceId ?? "");
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  // Marks: verse number → startTime (seconds)
  const [marks, setMarks] = useState<Map<number, number>>(() => {
    if (existingMap) {
      return new Map(existingMap.timings.map((t) => [t.verseNumber, t.startTime]));
    }
    return new Map();
  });

  // In precise mode, track which verse we're about to mark next
  const [nextVerseIndex, setNextVerseIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const playback = useAudioPlayback(audioSrc);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioSrc) URL.revokeObjectURL(audioSrc);
    };
  }, [audioSrc]);

  // Keyboard shortcuts — only active during marking and review phases
  useEffect(() => {
    if (phase === "upload") return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          playback.togglePlay();
          break;
        case "Enter":
        case "m":
        case "M":
          e.preventDefault();
          if (phase === "marking") handleMark();
          break;
        case "ArrowLeft":
          e.preventDefault();
          playback.seek(playback.currentTime - (e.shiftKey ? 1 : 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          playback.seek(playback.currentTime + (e.shiftKey ? 1 : 5));
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, playback, nextVerseIndex]);

  /** Handle MP3 file upload */
  async function handleFileUpload(file: File) {
    // Validate: must be audio
    if (!file.type.startsWith("audio/")) return;

    const id = crypto.randomUUID();
    setBlobId(id);

    // Save blob to IndexedDB
    await saveAudioBlob(id, file);

    // Create object URL for playback
    const url = URL.createObjectURL(file);
    setAudioSrc(url);
    setPhase("marking");
  }

  /** Mark the current verse's start time (precise mode) */
  function handleMark() {
    if (nextVerseIndex >= verses.length) return;

    const verseNum = verses[nextVerseIndex].number;
    setMarks((prev) => {
      const next = new Map(prev);
      next.set(verseNum, playback.currentTime);
      return next;
    });
    setNextVerseIndex((i) => i + 1);

    // If all verses marked, move to review
    if (nextVerseIndex >= verses.length - 1) {
      setPhase("review");
    }
  }

  /** Mark a verse in quick sync mode */
  function handleQuickMark(verseNumber: number) {
    setMarks((prev) => {
      const next = new Map(prev);
      if (next.has(verseNumber)) {
        next.delete(verseNumber); // Toggle off
      } else {
        next.set(verseNumber, playback.currentTime);
      }
      return next;
    });
  }

  /** Fine-tune a verse's start time (review mode) */
  function adjustTiming(verseNumber: number, delta: number) {
    setMarks((prev) => {
      const next = new Map(prev);
      const current = next.get(verseNumber);
      if (current !== undefined) {
        next.set(verseNumber, Math.max(0, current + delta));
      }
      return next;
    });
  }

  /** Save the timing map to IndexedDB */
  async function handleSave() {
    if (marks.size === 0 || !audioTranslation) return;

    setSaving(true);
    try {
      const timings =
        mode === "precise"
          ? buildPreciseTimings()
          : interpolateTimings(marks, verses, playback.duration);

      const timingMap: AudioTimingMap = {
        id: existingMap?.id ?? crypto.randomUUID(),
        audioSource: "mp3",
        sourceId: blobId,
        audioTranslation,
        book,
        chapter,
        timings,
        createdAt: existingMap?.createdAt ?? new Date().toISOString(),
      };

      await saveTimingMap(timingMap);
      onSaved?.();
      onClose();
    } catch {
      // Error saving — stay on the page so user can retry
      setSaving(false);
    }
  }

  /** Build timings array from precise marks (every verse marked) */
  function buildPreciseTimings(): VerseTiming[] {
    const result: VerseTiming[] = [];
    const sortedEntries = Array.from(marks.entries()).sort((a, b) => a[0] - b[0]);

    for (let i = 0; i < sortedEntries.length; i++) {
      const [verseNum, startTime] = sortedEntries[i];
      const endTime =
        i < sortedEntries.length - 1
          ? sortedEntries[i + 1][1]
          : playback.duration;
      result.push({ verseNumber: verseNum, startTime, endTime });
    }
    return result;
  }

  // Format seconds to MM:SS.s
  function formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${parseFloat(secs) < 10 ? "0" : ""}${secs}`;
  }

  // ── Upload Phase ──
  if (phase === "upload") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-label="Audio timing editor"
        aria-modal="true"
      >
        <div className="mx-4 w-full max-w-lg rounded-xl bg-panel p-6 shadow-xl">
          <h2 className="text-xl font-bold text-heading">Add Audio Timing</h2>
          <p className="mt-2 text-sm text-muted">
            Upload an MP3 of this chapter being read aloud. You'll mark where each verse
            starts so the text highlights as it's read.
          </p>

          {/* Translation selector */}
          <label className="mt-4 block">
            <span className="text-sm font-medium text-heading">
              Speaker's translation
            </span>
            <input
              type="text"
              value={audioTranslation}
              onChange={(e) => setAudioTranslation(e.target.value)}
              placeholder="e.g., KJV, NIV, ESV"
              className="mt-1 w-full rounded-lg border border-input-border bg-panel px-3 py-2
                         text-heading placeholder:text-faint
                         focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          {/* Mode selector */}
          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-heading">Sync mode</legend>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-heading">
                <input
                  type="radio"
                  name="sync-mode"
                  value="precise"
                  checked={mode === "precise"}
                  onChange={() => setMode("precise")}
                  className="accent-accent"
                />
                Precise (mark every verse)
              </label>
              <label className="flex items-center gap-2 text-sm text-heading">
                <input
                  type="radio"
                  name="sync-mode"
                  value="quick"
                  checked={mode === "quick"}
                  onChange={() => setMode("quick")}
                  className="accent-accent"
                />
                Quick (mark key verses)
              </label>
            </div>
          </fieldset>

          {/* File upload */}
          <div className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!audioTranslation.trim()}
              className="w-full rounded-lg border-2 border-dashed border-edge px-6 py-8
                         text-center text-muted hover:border-accent hover:text-accent
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-edge
                         disabled:hover:text-muted
                         focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
              </svg>
              Upload MP3
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-input-border px-4 py-2
                       text-sm text-muted hover:bg-surface-hover
                       focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Marking Phase (Precise) ──
  if (phase === "marking" && mode === "precise") {
    const currentVerse = verses[nextVerseIndex];
    const progress = `${marks.size} / ${verses.length}`;

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-panel"
        role="dialog"
        aria-label="Audio timing editor — marking mode"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <h2 className="text-lg font-bold text-heading">
            Mark Verse Starts ({progress})
          </h2>
          <button
            type="button"
            onClick={() => setPhase("review")}
            className="rounded-lg px-3 py-1.5 text-sm text-accent hover:bg-surface-hover
                       focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to Review
          </button>
        </div>

        {/* Current verse display */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {currentVerse ? (
            <>
              <p className="text-sm text-muted mb-2">
                Tap "Mark" when verse {currentVerse.number} begins:
              </p>
              <p className="text-xl text-heading text-center max-w-prose leading-relaxed">
                <sup className="text-sm font-semibold text-faint mr-1">
                  {currentVerse.number}
                </sup>
                {currentVerse.text}
              </p>
            </>
          ) : (
            <p className="text-lg text-accent font-medium">All verses marked!</p>
          )}
        </div>

        {/* Controls */}
        <div className="border-t border-edge px-4 py-4">
          {/* Time display */}
          <p className="text-center text-sm tabular-nums text-muted mb-3">
            {formatTimestamp(playback.currentTime)} / {formatTimestamp(playback.duration)}
          </p>

          <div className="flex items-center justify-center gap-4">
            {/* Seek back 5s */}
            <button
              type="button"
              onClick={() => playback.seek(playback.currentTime - 5)}
              className="rounded-lg border border-input-border px-3 py-2 text-sm text-muted
                         hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Seek back 5 seconds"
            >
              -5s
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={playback.togglePlay}
              className="flex h-12 w-12 items-center justify-center rounded-full
                         bg-accent text-on-accent hover:bg-accent-hover
                         focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={playback.isPlaying ? "Pause" : "Play"}
            >
              {playback.isPlaying ? (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Mark button */}
            <button
              type="button"
              onClick={handleMark}
              disabled={nextVerseIndex >= verses.length}
              className="rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white
                         hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label={
                currentVerse
                  ? `Mark verse ${currentVerse.number} start`
                  : "All verses marked"
              }
            >
              Mark (Enter)
            </button>

            {/* Seek forward 5s */}
            <button
              type="button"
              onClick={() => playback.seek(playback.currentTime + 5)}
              className="rounded-lg border border-input-border px-3 py-2 text-sm text-muted
                         hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Seek forward 5 seconds"
            >
              +5s
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-faint">
            Space = play/pause, Enter/M = mark, arrows = seek ±5s, Shift+arrows = ±1s
          </p>
        </div>
      </div>
    );
  }

  // ── Marking Phase (Quick Sync) ──
  if (phase === "marking" && mode === "quick") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-panel"
        role="dialog"
        aria-label="Audio timing editor — quick sync mode"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <h2 className="text-lg font-bold text-heading">
            Quick Sync ({marks.size} marked)
          </h2>
          <button
            type="button"
            onClick={() => setPhase("review")}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm text-on-accent
                       hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Done Marking
          </button>
        </div>

        {/* Verse list — tap to mark at current time */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-sm text-muted mb-3">
            Play the audio. Tap a verse when you hear it start. Mark at least
            the first, last, and every ~5th verse. The rest will be filled in automatically.
          </p>
          <div className="space-y-1">
            {verses.map((verse) => {
              const isMarked = marks.has(verse.number);
              return (
                <button
                  key={verse.number}
                  type="button"
                  onClick={() => handleQuickMark(verse.number)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors
                    ${isMarked
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                      : "hover:bg-surface-hover text-heading"
                    }
                    focus:outline-none focus:ring-2 focus:ring-ring`}
                  aria-pressed={isMarked}
                >
                  <sup className="text-xs font-semibold text-faint mr-1">{verse.number}</sup>
                  <span className="line-clamp-1">{verse.text}</span>
                  {isMarked && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                      {formatTimestamp(marks.get(verse.number)!)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="border-t border-edge px-4 py-3">
          <p className="text-center text-sm tabular-nums text-muted mb-2">
            {formatTimestamp(playback.currentTime)} / {formatTimestamp(playback.duration)}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => playback.seek(playback.currentTime - 5)}
              className="rounded-lg border border-input-border px-3 py-2 text-sm text-muted
                         hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Seek back 5 seconds"
            >
              -5s
            </button>
            <button
              type="button"
              onClick={playback.togglePlay}
              className="flex h-10 w-10 items-center justify-center rounded-full
                         bg-accent text-on-accent hover:bg-accent-hover
                         focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={playback.isPlaying ? "Pause" : "Play"}
            >
              {playback.isPlaying ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => playback.seek(playback.currentTime + 5)}
              className="rounded-lg border border-input-border px-3 py-2 text-sm text-muted
                         hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Seek forward 5 seconds"
            >
              +5s
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Review Phase ──
  const timingsPreview =
    mode === "precise"
      ? buildPreciseTimings()
      : interpolateTimings(marks, verses, playback.duration);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-panel"
      role="dialog"
      aria-label="Audio timing editor — review mode"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="text-lg font-bold text-heading">Review Timings</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPhase("marking");
              setNextVerseIndex(0);
              setMarks(new Map());
            }}
            className="rounded-lg border border-input-border px-3 py-1.5 text-sm text-muted
                       hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Start Over
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || timingsPreview.length === 0}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-bold text-on-accent
                       hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Timing list with fine-tune controls */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="text-sm text-muted mb-3">
          Click a verse to seek to its start. Use +/- buttons to fine-tune timing.
        </p>
        <div className="space-y-1">
          {timingsPreview.map((timing) => {
            const verse = verses.find((v) => v.number === timing.verseNumber);
            const isExplicitMark = marks.has(timing.verseNumber);
            return (
              <div
                key={timing.verseNumber}
                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-surface-hover"
              >
                {/* Seek to this verse */}
                <button
                  type="button"
                  onClick={() => playback.seek(timing.startTime)}
                  className="flex-1 text-left text-sm text-heading truncate
                             focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label={`Seek to verse ${timing.verseNumber}`}
                >
                  <sup className="text-xs font-semibold text-faint mr-1">
                    {timing.verseNumber}
                  </sup>
                  <span className="line-clamp-1">{verse?.text}</span>
                </button>

                {/* Timestamp */}
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    isExplicitMark ? "text-green-600 dark:text-green-400" : "text-faint"
                  }`}
                >
                  {formatTimestamp(timing.startTime)}
                </span>

                {/* Fine-tune buttons */}
                <button
                  type="button"
                  onClick={() => adjustTiming(timing.verseNumber, -0.1)}
                  disabled={!isExplicitMark}
                  className="rounded border border-input-border px-1.5 py-0.5 text-xs text-muted
                             hover:bg-surface-hover disabled:opacity-30
                             focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Move verse ${timing.verseNumber} start earlier by 0.1 seconds`}
                >
                  -0.1s
                </button>
                <button
                  type="button"
                  onClick={() => adjustTiming(timing.verseNumber, 0.1)}
                  disabled={!isExplicitMark}
                  className="rounded border border-input-border px-1.5 py-0.5 text-xs text-muted
                             hover:bg-surface-hover disabled:opacity-30
                             focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Move verse ${timing.verseNumber} start later by 0.1 seconds`}
                >
                  +0.1s
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Playback controls */}
      <div className="border-t border-edge px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => playback.seek(playback.currentTime - 5)}
            className="rounded-lg border border-input-border px-3 py-2 text-sm text-muted
                       hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Seek back 5 seconds"
          >
            -5s
          </button>
          <button
            type="button"
            onClick={playback.togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full
                       bg-accent text-on-accent hover:bg-accent-hover
                       focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={playback.isPlaying ? "Pause" : "Play"}
          >
            {playback.isPlaying ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => playback.seek(playback.currentTime + 5)}
            className="rounded-lg border border-input-border px-3 py-2 text-sm text-muted
                       hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Seek forward 5 seconds"
          >
            +5s
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-input-border px-3 py-2 text-sm text-muted
                       hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
