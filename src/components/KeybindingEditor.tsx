/**
 * KeybindingEditor — lets users customize keyboard shortcuts.
 *
 * Renders every command grouped by category. Each row shows the command
 * name, its current key binding (from preset + overrides), and a button
 * to record a new binding. Conflict and browser-reserved warnings are
 * shown inline.
 *
 * Grandmother Principle: labels say "Press any key…" not "Capture
 * KeyboardEvent". Conflicts are called "Already used by…" not
 * "Duplicate binding detected."
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  COMMANDS,
  COMMAND_MAP,
  PRESET_BINDINGS,
  PRESET_LABELS,
  formatBinding,
  isValidKeyCombo,
  resolveBindings,
  detectConflicts,
  BROWSER_RESERVED_KEYS,
  type CommandDef,
  type CommandCategory,
  type KeybindingPreset,
  type Keybinding,
} from "../lib/commands";

// ── Category display order and labels ──

const CATEGORY_ORDER: CommandCategory[] = [
  "navigation",
  "reader",
  "annotation",
  "translation",
  "system",
];

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: "Navigation",
  reader: "Reading",
  annotation: "Notes",
  translation: "Word Choices",
  system: "System",
};

// ── Props ──

interface KeybindingEditorProps {
  preset: KeybindingPreset;
  customOverrides: Record<string, string>;
  /** Called when a single override changes. Parent persists it. */
  onOverrideChange: (commandId: string, key: string) => void;
  /** Called to clear all custom overrides (reset to preset). */
  onResetAll: () => void;
}

export function KeybindingEditor({
  preset,
  customOverrides,
  onOverrideChange,
  onResetAll,
}: KeybindingEditorProps) {
  const resolved = resolveBindings(preset, customOverrides);
  const conflicts = detectConflicts(resolved);
  const hasOverrides = Object.keys(customOverrides).length > 0;

  // Build a lookup: commandId → current key
  const bindingMap = new Map<string, string>();
  for (const b of resolved) {
    bindingMap.set(b.commandId, b.key);
  }

  // Also build: commandId → preset default key (for "modified" indicator)
  const presetMap = new Map<string, string>();
  for (const b of PRESET_BINDINGS[preset]) {
    presetMap.set(b.commandId, b.key);
  }

  // Group commands by category
  const grouped = new Map<CommandCategory, CommandDef[]>();
  for (const cmd of COMMANDS) {
    const list = grouped.get(cmd.category) ?? [];
    list.push(cmd);
    grouped.set(cmd.category, list);
  }

  return (
    <div className="space-y-6">
      {/* Header with reset button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-heading">
            Customize shortcuts
          </p>
          <p className="text-xs text-muted">
            Click any shortcut to change it. Based on {PRESET_LABELS[preset]} preset.
          </p>
        </div>
        {hasOverrides && (
          <button
            type="button"
            onClick={onResetAll}
            className="rounded-lg border border-input-border bg-panel px-3 py-1.5 text-xs font-medium text-muted hover:text-heading hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Reset all to {PRESET_LABELS[preset]}
          </button>
        )}
      </div>

      {/* Category groups */}
      {CATEGORY_ORDER.map((category) => {
        const commands = grouped.get(category);
        if (!commands?.length) return null;

        return (
          <div key={category}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="divide-y divide-edge-soft rounded-lg border border-edge bg-surface">
              {commands.map((cmd) => {
                const currentKey = bindingMap.get(cmd.id) ?? "";
                const presetKey = presetMap.get(cmd.id) ?? "";
                const isModified = customOverrides[cmd.id] !== undefined;

                // Find conflicts for this command's key
                const conflictCommands = currentKey
                  ? conflicts.get(currentKey.toLowerCase())
                  : undefined;
                const hasConflict =
                  conflictCommands && conflictCommands.length > 1;

                return (
                  <KeybindingRow
                    key={cmd.id}
                    command={cmd}
                    currentKey={currentKey}
                    presetKey={presetKey}
                    isModified={isModified}
                    conflictCommands={hasConflict ? conflictCommands : undefined}
                    onKeyChange={(newKey) => onOverrideChange(cmd.id, newKey)}
                    onReset={() => {
                      // Removing the override restores the preset default
                      // We signal this by passing the preset key (or "" if none)
                      onOverrideChange(cmd.id, presetKey);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Tier 2: learn more */}
      <details className="text-xs text-muted">
        <summary className="cursor-pointer hover:text-heading">
          Tips for choosing shortcuts
        </summary>
        <ul className="mt-2 space-y-1 leading-relaxed pl-4 list-disc">
          <li>
            Some browser shortcuts (like Ctrl+W to close a tab) can&apos;t be
            overridden. These are marked if you try to use them.
          </li>
          <li>
            If two commands share the same shortcut, both will be highlighted
            so you can fix the conflict.
          </li>
          <li>
            Press <strong>Escape</strong> while recording to cancel, or
            press <strong>Backspace</strong> to remove a shortcut entirely.
          </li>
        </ul>
      </details>
    </div>
  );
}

// ── Individual row ──

interface KeybindingRowProps {
  command: CommandDef;
  currentKey: string;
  presetKey: string;
  isModified: boolean;
  conflictCommands?: string[];
  onKeyChange: (key: string) => void;
  onReset: () => void;
}

function KeybindingRow({
  command,
  currentKey,
  presetKey,
  isModified,
  conflictCommands,
  onKeyChange,
  onReset,
}: KeybindingRowProps) {
  const [recording, setRecording] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Conflict label (other commands sharing this key)
  const conflictLabel = conflictCommands
    ?.filter((id) => id !== command.id)
    .map((id) => COMMAND_MAP.get(id)?.label ?? id)
    .join(", ");

  // Browser reserved warning
  const isReserved = currentKey
    ? BROWSER_RESERVED_KEYS.has(currentKey.toLowerCase())
    : false;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      role="row"
    >
      {/* Command name + description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-heading truncate">
          {command.label}
          {isModified && (
            <span className="ml-1.5 text-[10px] text-accent font-medium align-middle">
              modified
            </span>
          )}
        </p>
        <p className="text-xs text-muted truncate">{command.description}</p>
      </div>

      {/* Key binding button (click to record) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {recording ? (
          <KeyRecorder
            onCapture={(key) => {
              setRecording(false);
              if (key !== null) {
                onKeyChange(key);
              }
            }}
            buttonRef={buttonRef}
          />
        ) : (
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setRecording(true)}
            className={`
              inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-mono
              min-w-[4rem] transition-colors
              focus:outline-none focus:ring-2 focus:ring-ring
              ${conflictLabel
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-input-border bg-input-bg text-heading hover:bg-surface-hover"
              }
            `}
            aria-label={`Change shortcut for ${command.label}. Currently ${currentKey ? formatBinding(currentKey) : "not set"}`}
          >
            {currentKey ? formatBinding(currentKey) : (
              <span className="text-muted italic">none</span>
            )}
          </button>
        )}

        {/* Reset individual binding */}
        {isModified && !recording && (
          <button
            type="button"
            onClick={onReset}
            className="rounded p-1 text-muted hover:text-heading focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={`Reset ${command.label} to preset default`}
            title="Reset to preset default"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Warnings */}
      {(conflictLabel || isReserved) && !recording && (
        <div className="basis-full pl-0 -mt-1 mb-1">
          {conflictLabel && (
            <p className="text-[11px] text-amber-700" role="alert">
              Already used by: {conflictLabel}
            </p>
          )}
          {isReserved && (
            <p className="text-[11px] text-amber-700" role="alert">
              This is a browser shortcut and may not work as expected
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Key recorder (captures the next keypress) ──

interface KeyRecorderProps {
  /** Called with the captured key combo, or null if cancelled. */
  onCapture: (key: string | null) => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

function KeyRecorder({ onCapture, buttonRef }: KeyRecorderProps) {
  const recorderRef = useRef<HTMLSpanElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels recording
      if (e.key === "Escape" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        onCapture(null);
        return;
      }

      // Backspace removes the binding (unbinds)
      if (e.key === "Backspace" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        onCapture("");
        return;
      }

      // Ignore lone modifier presses
      if (["Control", "Meta", "Shift", "Alt"].includes(e.key)) {
        return;
      }

      // Build the key combo string
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("mod");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");

      // Normalize the key name
      let keyName = e.key.toLowerCase();
      if (keyName === " ") keyName = "space";

      parts.push(keyName);
      const combo = parts.join("+");

      if (isValidKeyCombo(combo)) {
        onCapture(combo);
      }
      // Invalid combos are silently ignored — keep recording
    },
    [onCapture],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  // Click outside cancels recording
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        recorderRef.current &&
        !recorderRef.current.contains(e.target as Node)
      ) {
        onCapture(null);
      }
    }
    // Delay to avoid capturing the click that started recording
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onCapture]);

  return (
    <span
      ref={recorderRef}
      className="inline-flex items-center justify-center rounded-md border-2 border-accent bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent min-w-[4rem] animate-pulse"
      role="status"
      aria-live="polite"
    >
      Press a key&hellip;
    </span>
  );
}
