/**
 * AudioProvider — React context for audio-text sync state.
 *
 * Sibling to WorkspaceProvider (not nested inside it). Audio state is
 * independent of annotation/workspace state so the two features don't
 * tangle. Works in both workspace and standalone reader modes.
 *
 * Provides:
 * - activeVerse (which verse is being read right now)
 * - playback controls (play, pause, seek, rate, volume)
 * - timing map management (load, select, close)
 * - timing editor open/close state
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import { useAudioSync, type AudioSyncState } from "../hooks/useAudioSync";

interface AudioContextValue extends AudioSyncState {
  /** Whether the timing editor modal is open */
  isEditorOpen: boolean;
  /** Open the timing editor */
  openEditor: () => void;
  /** Close the timing editor */
  closeEditor: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

interface AudioProviderProps {
  book: string;
  chapter: number;
  children: ReactNode;
}

export function AudioProvider({ book, chapter, children }: AudioProviderProps) {
  const audioSync = useAudioSync(book, chapter);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const value: AudioContextValue = {
    ...audioSync,
    isEditorOpen,
    openEditor: () => setIsEditorOpen(true),
    closeEditor: () => setIsEditorOpen(false),
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

/**
 * Hook to access audio sync state from any component under AudioProvider.
 * Throws if used outside the provider (fail-fast for wiring mistakes).
 */
export function useAudioContext(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error("useAudioContext must be used within an AudioProvider");
  }
  return ctx;
}
