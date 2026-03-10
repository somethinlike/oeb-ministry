/**
 * CommandPalette — fuzzy-search command launcher (Ctrl+Shift+P).
 *
 * Shows all available commands filtered by the current context
 * (workspace vs. global, editor mode, etc.). Displays keyboard
 * shortcuts next to each command based on the active preset.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  COMMANDS,
  type CommandDef,
  type KeybindingPreset,
  type Keybinding,
  PRESET_BINDINGS,
  searchCommands,
  formatBinding,
} from "../lib/commands";

interface CommandPaletteProps {
  /** Whether the user is currently in the workspace reader */
  isWorkspace: boolean;
  /** Whether the user is currently editing an annotation */
  isEditing: boolean;
  /** Active keybinding preset */
  preset: KeybindingPreset;
  /** Execute a command by ID */
  onExecute: (commandId: string) => void;
  /** Close the palette */
  onClose: () => void;
}

export function CommandPalette({
  isWorkspace,
  isEditing,
  preset,
  onExecute,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands by current context
  const availableCommands = COMMANDS.filter((cmd) => {
    if (cmd.workspaceOnly && !isWorkspace) return false;
    if (cmd.editorOnly && !isEditing) return false;
    // Don't show "open palette" in the palette itself
    if (cmd.id === "system.palette") return false;
    return true;
  });

  const filtered = searchCommands(query, availableCommands);

  // Build a lookup for keybindings
  const bindings = PRESET_BINDINGS[preset];
  const bindingMap = new Map<string, string>();
  for (const b of bindings) {
    if (!bindingMap.has(b.commandId)) {
      bindingMap.set(b.commandId, b.key);
    }
  }

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            onExecute(filtered[selectedIndex].id);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, onExecute, onClose],
  );

  function handleItemClick(cmd: CommandDef) {
    onExecute(cmd.id);
    onClose();
  }

  // Group commands by category for display
  const grouped = new Map<string, CommandDef[]>();
  for (const cmd of filtered) {
    const group = grouped.get(cmd.category) ?? [];
    group.push(cmd);
    grouped.set(cmd.category, group);
  }

  const categoryLabels: Record<string, string> = {
    navigation: "Navigation",
    reader: "Reader",
    annotation: "Notes",
    translation: "Translation",
    system: "System",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-overlay/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-edge bg-panel shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="border-b border-edge p-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="w-full bg-transparent text-sm text-heading placeholder:text-faint
                       focus:outline-none"
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto py-2"
          role="listbox"
        >
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No commands found
            </p>
          )}

          {[...grouped.entries()].map(([category, cmds]) => (
            <div key={category}>
              <p className="px-4 py-1 text-xs font-semibold text-faint uppercase tracking-wider">
                {categoryLabels[category] ?? category}
              </p>
              {cmds.map((cmd, i) => {
                // Calculate the flat index for this item
                const flatIndex = filtered.indexOf(cmd);
                const isSelected = flatIndex === selectedIndex;
                const binding = bindingMap.get(cmd.id);

                return (
                  <button
                    key={cmd.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleItemClick(cmd)}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm
                                transition-colors duration-75
                                ${isSelected ? "bg-accent-soft text-heading" : "text-body hover:bg-surface-hover"}`}
                  >
                    <div>
                      <span className="font-medium">{cmd.label}</span>
                      <span className="ml-2 text-xs text-muted">{cmd.description}</span>
                    </div>
                    {binding && (
                      <kbd className="ml-4 shrink-0 rounded border border-edge bg-surface-alt px-1.5 py-0.5
                                      text-xs font-mono text-muted">
                        {formatBinding(binding)}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-edge px-4 py-2 text-xs text-faint flex gap-4">
          <span><kbd className="font-mono">&uarr;&darr;</kbd> navigate</span>
          <span><kbd className="font-mono">&crarr;</kbd> select</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
