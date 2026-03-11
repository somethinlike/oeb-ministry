/**
 * KeyboardManager — global keyboard event handler.
 *
 * Responsibilities:
 * 1. Listens for keydown events on the document
 * 2. Matches against the active keybinding preset
 * 3. Dispatches commands to the registered handler
 * 4. Manages vim mode state (normal/insert) when vim preset is active
 * 5. Detects keyboard-heavy usage patterns and suggests shortcuts
 *
 * This component wraps the entire app (or the authenticated layout).
 * It uses a "command executor" callback pattern — the parent provides
 * the function that actually runs commands based on the current context.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  type KeybindingPreset,
  PRESET_BINDINGS,
  matchesBinding,
  resolveBindings,
} from "../lib/commands";
import { CommandPalette } from "./CommandPalette";

// ── Vim Mode ──

export type VimMode = "normal" | "insert";

interface KeyboardContextValue {
  /** Active keybinding preset */
  preset: KeybindingPreset;
  /** Current vim mode (only meaningful when preset is "vim") */
  vimMode: VimMode;
  /** Whether the command palette is open */
  paletteOpen: boolean;
  /** Open the command palette */
  openPalette: () => void;
}

const KeyboardContext = createContext<KeyboardContextValue>({
  preset: "default",
  vimMode: "normal",
  paletteOpen: false,
  openPalette: () => {},
});

export function useKeyboard(): KeyboardContextValue {
  return useContext(KeyboardContext);
}

// ── Provider ──

interface KeyboardManagerProps {
  /** Active keybinding preset (from user preferences) */
  preset: KeybindingPreset;
  /** Custom keybinding overrides (commandId → key combo) */
  customKeybindings?: Record<string, string>;
  /** Whether we're inside the workspace reader */
  isWorkspace: boolean;
  /** Whether an annotation is being edited */
  isEditing: boolean;
  /** Execute a command by ID. Return true if handled. */
  onCommand: (commandId: string) => boolean;
  children: ReactNode;
}

export function KeyboardManager({
  preset,
  customKeybindings,
  isWorkspace,
  isEditing,
  onCommand,
  children,
}: KeyboardManagerProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [vimMode, setVimMode] = useState<VimMode>("normal");

  // Vim mode: enter insert mode when editing starts, return to normal on Escape
  useEffect(() => {
    if (preset !== "vim") return;
    if (isEditing) {
      setVimMode("insert");
    }
  }, [isEditing, preset]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  // Resolve effective bindings: preset + custom overrides (memoized)
  const bindings = useMemo(
    () => resolveBindings(preset, customKeybindings),
    [preset, customKeybindings],
  );

  // ── Global keydown handler ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in inputs, textareas, or contenteditable
      // UNLESS it's a global shortcut (Ctrl+Shift+P, Ctrl+S, Escape)
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Palette toggle — always active
      if (matchesBinding(e, "mod+shift+p")) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      // Close palette on Escape
      if (paletteOpen && e.key === "Escape") {
        e.preventDefault();
        setPaletteOpen(false);
        return;
      }

      // Don't process other shortcuts while palette is open
      if (paletteOpen) return;

      // Vim mode: Escape returns to normal mode
      if (preset === "vim" && e.key === "Escape") {
        setVimMode("normal");
        // Don't prevent default — let the workspace handle Escape too
      }

      // Don't process keyboard shortcuts while typing in inputs
      // (except Ctrl+S for save and Escape)
      if (isInputFocused) {
        for (const binding of bindings) {
          if (matchesBinding(e, binding.key)) {
            // Only allow mod-key combos (Ctrl+S, etc.) through when in an input
            if (binding.key.includes("mod+")) {
              e.preventDefault();
              onCommand(binding.commandId);
              return;
            }
          }
        }
        return;
      }

      // Match against resolved keybindings (preset + custom overrides)
      for (const binding of bindings) {
        // Vim normal-only bindings are skipped in insert mode
        if (binding.vimNormalOnly && preset === "vim" && vimMode !== "normal") {
          continue;
        }

        if (matchesBinding(e, binding.key)) {
          e.preventDefault();

          // Special handling: vim "i" enters insert mode
          if (preset === "vim" && binding.commandId === "annotation.new") {
            setVimMode("insert");
          }

          onCommand(binding.commandId);
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [preset, bindings, vimMode, paletteOpen, onCommand]);

  // ── Keybind detection (passive) ──
  useKeybindDetector(preset);

  const value: KeyboardContextValue = {
    preset,
    vimMode,
    paletteOpen,
    openPalette,
  };

  return (
    <KeyboardContext.Provider value={value}>
      {children}

      {/* Vim mode indicator */}
      {preset === "vim" && (
        <div
          className="fixed bottom-4 left-4 z-40 rounded-lg border border-edge bg-panel px-3 py-1.5
                     text-xs font-mono text-heading shadow-sm"
          aria-live="polite"
        >
          {vimMode === "normal" ? "NORMAL" : "INSERT"}
        </div>
      )}

      {/* Command palette */}
      {paletteOpen && (
        <CommandPalette
          isWorkspace={isWorkspace}
          isEditing={isEditing}
          preset={preset}
          onExecute={onCommand}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </KeyboardContext.Provider>
  );
}

// ── Keybind Detector ──

/**
 * Passively watches for keyboard patterns that suggest the user is
 * comfortable with keyboard shortcuts. If detected, shows a one-time
 * toast suggesting they try a keybinding preset.
 *
 * Detection patterns:
 * - j/k pressed outside of an input (vim habit)
 * - Ctrl+Shift+P attempted (power user)
 * - Repeated arrow key navigation (keyboard navigator)
 */
function useKeybindDetector(currentPreset: KeybindingPreset) {
  useEffect(() => {
    // Don't detect if user already has a non-default preset
    if (currentPreset !== "default") return;

    // Don't detect if we already prompted
    if (localStorage.getItem("oeb-keybind-detected") === "true") return;

    let score = 0;
    const THRESHOLD = 3;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) return;

      // j/k outside input → vim habit
      if (e.key === "j" || e.key === "k") score += 2;
      // : outside input → vim command mode attempt
      if (e.key === ":") score += 3;
      // Ctrl+P or Ctrl+Shift+P → power user
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") score += 2;

      if (score >= THRESHOLD) {
        localStorage.setItem("oeb-keybind-detected", "true");
        // Dispatch a custom event that the toast component can listen to
        window.dispatchEvent(
          new CustomEvent("oeb-keybind-hint", {
            detail: { message: "You can customize keyboard shortcuts in Settings." },
          }),
        );
        document.removeEventListener("keydown", handleKeyDown);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentPreset]);
}

/**
 * KeybindHintToast — shows a non-intrusive toast when keyboard habits
 * are detected. Dismisses after 8 seconds or on click.
 */
export function KeybindHintToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function handleHint(e: Event) {
      const detail = (e as CustomEvent).detail;
      setMessage(detail.message);
      setVisible(true);

      // Auto-dismiss after 8 seconds
      setTimeout(() => setVisible(false), 8000);
    }

    window.addEventListener("oeb-keybind-hint", handleHint);
    return () => window.removeEventListener("oeb-keybind-hint", handleHint);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4
                 rounded-lg border border-edge bg-panel p-4 shadow-lg max-w-sm"
      role="status"
    >
      <div className="flex items-start gap-3">
        <svg className="h-5 w-5 text-accent shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-heading">
            Keyboard shortcuts available
          </p>
          <p className="text-xs text-muted mt-1">{message}</p>
          <a
            href="/app/settings"
            className="text-xs text-accent underline hover:text-accent-hover mt-1 inline-block"
          >
            Go to Settings
          </a>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="shrink-0 text-muted hover:text-heading focus:outline-none"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
