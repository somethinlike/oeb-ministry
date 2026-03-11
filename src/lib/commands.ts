/**
 * Command Registry — all actions in the app mapped to IDs.
 *
 * Commands decouple actions from keybindings. A command like "next chapter"
 * has one canonical ID but can be triggered by different keys depending on
 * the active keybinding preset (Default, VSCode, Vim).
 *
 * This module is pure data — no React, no DOM, no side effects.
 */

// ── Command Categories ──

export type CommandCategory =
  | "navigation"
  | "reader"
  | "annotation"
  | "translation"
  | "system";

// ── Command Definition ──

export interface CommandDef {
  id: string;
  label: string;
  /** Tier 1 description for the palette */
  description: string;
  category: CommandCategory;
  /** Only available inside the workspace reader */
  workspaceOnly?: boolean;
  /** Only available when editing an annotation */
  editorOnly?: boolean;
}

// ── All Commands ──

export const COMMANDS: CommandDef[] = [
  // Navigation
  { id: "nav.readBible", label: "Read Bible", description: "Go to the Bible reader", category: "navigation" },
  { id: "nav.myNotes", label: "My Notes", description: "Open your notes", category: "navigation" },
  { id: "nav.community", label: "Community Notes", description: "Browse shared notes", category: "navigation" },
  { id: "nav.settings", label: "Settings", description: "Open settings", category: "navigation" },
  { id: "nav.nextChapter", label: "Next Chapter", description: "Go to the next chapter", category: "navigation", workspaceOnly: true },
  { id: "nav.prevChapter", label: "Previous Chapter", description: "Go to the previous chapter", category: "navigation", workspaceOnly: true },
  { id: "nav.goToVerse", label: "Go to Verse", description: "Jump to a specific verse", category: "navigation", workspaceOnly: true },

  // Reader
  { id: "reader.nextVerse", label: "Next Verse", description: "Select the next verse", category: "reader", workspaceOnly: true },
  { id: "reader.prevVerse", label: "Previous Verse", description: "Select the previous verse", category: "reader", workspaceOnly: true },
  { id: "reader.clearSelection", label: "Clear Selection", description: "Deselect all verses", category: "reader", workspaceOnly: true },
  { id: "reader.toggleLayout", label: "Toggle Layout", description: "Switch between centered and column layout", category: "reader", workspaceOnly: true },
  { id: "reader.focusMode", label: "Focus Mode", description: "Hide the toolbar for clean reading", category: "reader", workspaceOnly: true },
  { id: "reader.cycleDots", label: "Cycle Annotation Dots", description: "Change how annotation markers look", category: "reader", workspaceOnly: true },
  { id: "reader.swap", label: "Swap Sides", description: "Flip reader and notes panel", category: "reader", workspaceOnly: true },
  { id: "reader.undock", label: "Float/Dock Panel", description: "Float the notes panel or snap it back", category: "reader", workspaceOnly: true },

  // Annotations
  { id: "annotation.new", label: "New Note", description: "Write a note on the selected verse", category: "annotation", workspaceOnly: true },
  { id: "annotation.save", label: "Save Note", description: "Save the current note", category: "annotation", editorOnly: true },
  { id: "annotation.delete", label: "Delete Note", description: "Move the current note to the Recycle Bin", category: "annotation", editorOnly: true },
  { id: "annotation.share", label: "Share Note", description: "Share this note with everyone (CC0)", category: "annotation", editorOnly: true },
  { id: "annotation.toggleLock", label: "Toggle Lock", description: "Lock or unlock this note", category: "annotation", editorOnly: true },

  // Translation toggles
  { id: "toggle.divineName", label: "Toggle Divine Name", description: "Switch between LORD and Yahweh", category: "translation", workspaceOnly: true },
  { id: "toggle.baptism", label: "Toggle Baptism", description: "Switch between baptize and immerse", category: "translation", workspaceOnly: true },
  { id: "toggle.assembly", label: "Toggle Assembly", description: "Switch between church and assembly", category: "translation", workspaceOnly: true },
  { id: "toggle.onlyBegotten", label: "Toggle Only Begotten", description: "Switch between only begotten and one and only", category: "translation", workspaceOnly: true },

  // System
  { id: "system.palette", label: "Command Palette", description: "Open this menu", category: "system" },
  { id: "system.search", label: "Search Notes", description: "Search your notes", category: "system" },
  { id: "system.saveOffline", label: "Save Offline", description: "Save this book for offline reading", category: "system", workspaceOnly: true },
  { id: "system.signOut", label: "Sign Out", description: "Sign out of your account", category: "system" },
];

export const COMMAND_MAP = new Map(COMMANDS.map((cmd) => [cmd.id, cmd]));

// ── Keybinding Presets ──

export type KeybindingPreset = "default" | "vscode" | "vim";

/**
 * Keybinding format: "mod+shift+p" where mod = Ctrl on Windows/Linux, Cmd on Mac.
 * Special keys: "mod", "shift", "alt", "escape", "enter", "space", "tab",
 *               "arrowup", "arrowdown", "arrowleft", "arrowright"
 * Letters are lowercase: "a", "b", "p", etc.
 */
export interface Keybinding {
  commandId: string;
  /** The key combo string, e.g. "mod+shift+p" */
  key: string;
  /** If true, only active in vim normal mode */
  vimNormalOnly?: boolean;
}

/** Default keybindings — simple, discoverable */
export const DEFAULT_BINDINGS: Keybinding[] = [
  { commandId: "system.palette", key: "mod+shift+p" },
  { commandId: "system.search", key: "mod+shift+f" },
  { commandId: "annotation.save", key: "mod+s" },
  { commandId: "nav.nextChapter", key: "arrowright" },
  { commandId: "nav.prevChapter", key: "arrowleft" },
  { commandId: "reader.nextVerse", key: "arrowdown" },
  { commandId: "reader.prevVerse", key: "arrowup" },
  { commandId: "reader.clearSelection", key: "escape" },
];

/** VSCode-inspired keybindings */
export const VSCODE_BINDINGS: Keybinding[] = [
  { commandId: "system.palette", key: "mod+shift+p" },
  { commandId: "system.search", key: "mod+shift+f" },
  { commandId: "annotation.save", key: "mod+s" },
  { commandId: "nav.goToVerse", key: "mod+g" },
  { commandId: "nav.nextChapter", key: "alt+arrowright" },
  { commandId: "nav.prevChapter", key: "alt+arrowleft" },
  { commandId: "reader.nextVerse", key: "arrowdown" },
  { commandId: "reader.prevVerse", key: "arrowup" },
  { commandId: "reader.clearSelection", key: "escape" },
  { commandId: "reader.toggleLayout", key: "mod+shift+l" },
  { commandId: "reader.focusMode", key: "mod+shift+m" },
];

/** Vim-inspired keybindings — j/k navigation, : for command mode */
export const VIM_BINDINGS: Keybinding[] = [
  { commandId: "system.palette", key: "mod+shift+p" },
  { commandId: "annotation.save", key: "mod+s" },
  { commandId: "reader.nextVerse", key: "j", vimNormalOnly: true },
  { commandId: "reader.prevVerse", key: "k", vimNormalOnly: true },
  { commandId: "nav.nextChapter", key: "shift+j", vimNormalOnly: true },
  { commandId: "nav.prevChapter", key: "shift+k", vimNormalOnly: true },
  { commandId: "nav.goToVerse", key: "g", vimNormalOnly: true },
  { commandId: "system.search", key: "/", vimNormalOnly: true },
  { commandId: "reader.clearSelection", key: "escape" },
  { commandId: "annotation.new", key: "i", vimNormalOnly: true },
];

export const PRESET_BINDINGS: Record<KeybindingPreset, Keybinding[]> = {
  default: DEFAULT_BINDINGS,
  vscode: VSCODE_BINDINGS,
  vim: VIM_BINDINGS,
};

/** Human-readable preset names */
export const PRESET_LABELS: Record<KeybindingPreset, string> = {
  default: "Default",
  vscode: "VSCode",
  vim: "Vim",
};

// ── Utility: match a keyboard event against a binding string ──

export function matchesBinding(e: KeyboardEvent, binding: string): boolean {
  const parts = binding.toLowerCase().split("+");
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

  let needMod = false;
  let needShift = false;
  let needAlt = false;
  let keyPart = "";

  for (const part of parts) {
    if (part === "mod") needMod = true;
    else if (part === "shift") needShift = true;
    else if (part === "alt") needAlt = true;
    else keyPart = part;
  }

  // Check modifiers
  const modPressed = isMac ? e.metaKey : e.ctrlKey;
  if (needMod && !modPressed) return false;
  if (!needMod && modPressed) return false;
  if (needShift && !e.shiftKey) return false;
  if (!needShift && e.shiftKey && keyPart.length === 1) return false;
  if (needAlt && !e.altKey) return false;
  if (!needAlt && e.altKey) return false;

  // Check the main key
  const eventKey = e.key.toLowerCase();
  if (keyPart === "escape") return eventKey === "escape";
  if (keyPart === "enter") return eventKey === "enter";
  if (keyPart === "space") return eventKey === " ";
  if (keyPart === "tab") return eventKey === "tab";
  if (keyPart.startsWith("arrow")) return eventKey === keyPart;

  return eventKey === keyPart;
}

/**
 * Format a keybinding string for display.
 * "mod+shift+p" → "Ctrl+Shift+P" (or "⌘⇧P" on Mac)
 */
export function formatBinding(binding: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
  const parts = binding.split("+");

  return parts
    .map((part) => {
      switch (part) {
        case "mod": return isMac ? "\u2318" : "Ctrl";
        case "shift": return isMac ? "\u21e7" : "Shift";
        case "alt": return isMac ? "\u2325" : "Alt";
        case "escape": return "Esc";
        case "enter": return "\u21b5";
        case "space": return "Space";
        case "arrowup": return "\u2191";
        case "arrowdown": return "\u2193";
        case "arrowleft": return "\u2190";
        case "arrowright": return "\u2192";
        default: return part.toUpperCase();
      }
    })
    .join(isMac ? "" : "+");
}

// ── Custom keybinding resolution ──

/**
 * Valid non-modifier key names for keybinding strings.
 * Single letters (a-z), digits (0-9), and special keys.
 */
const VALID_KEYS = new Set([
  // Letters
  ..."abcdefghijklmnopqrstuvwxyz".split(""),
  // Digits
  ..."0123456789".split(""),
  // Special keys
  "escape", "enter", "space", "tab", "backspace", "delete",
  "arrowup", "arrowdown", "arrowleft", "arrowright",
  // Punctuation
  "/", ".", ",", ";", "'", "[", "]", "\\", "-", "=", "`",
]);

/** Valid modifier names in keybinding strings. */
const VALID_MODIFIERS = new Set(["mod", "shift", "alt"]);

/**
 * Check whether a key combo string is valid.
 * Valid format: optional modifiers + exactly one key, joined by "+".
 * Examples: "mod+s", "shift+arrowdown", "j", "mod+shift+p"
 */
export function isValidKeyCombo(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  const parts = key.toLowerCase().split("+");
  if (parts.length === 0) return false;

  let hasKey = false;
  const seenModifiers = new Set<string>();

  for (const part of parts) {
    if (VALID_MODIFIERS.has(part)) {
      if (seenModifiers.has(part)) return false; // duplicate modifier
      seenModifiers.add(part);
    } else if (VALID_KEYS.has(part)) {
      if (hasKey) return false; // two non-modifier keys
      hasKey = true;
    } else {
      return false; // unknown part
    }
  }

  return hasKey; // must have at least one non-modifier key
}

/**
 * Resolve effective keybindings: start with a preset, then layer
 * custom overrides on top. An override value of "" unbinds the command.
 */
export function resolveBindings(
  preset: KeybindingPreset,
  customOverrides?: Record<string, string>,
): Keybinding[] {
  // Start with a copy of the preset
  const base = [...PRESET_BINDINGS[preset]];

  if (!customOverrides || Object.keys(customOverrides).length === 0) {
    return base;
  }

  // Build a map of commandId → index for quick lookup
  const indexByCommand = new Map<string, number>();
  base.forEach((b, i) => indexByCommand.set(b.commandId, i));

  for (const [commandId, key] of Object.entries(customOverrides)) {
    // Verify the command actually exists
    if (!COMMAND_MAP.has(commandId)) continue;

    const existingIdx = indexByCommand.get(commandId);

    if (key === "") {
      // Unbind: remove the binding if it exists
      if (existingIdx !== undefined) {
        base[existingIdx] = { commandId, key: "" }; // mark for removal
      }
    } else if (isValidKeyCombo(key)) {
      // Override or add
      if (existingIdx !== undefined) {
        base[existingIdx] = { commandId, key };
      } else {
        base.push({ commandId, key });
      }
    }
    // Invalid key combos are silently skipped
  }

  // Filter out unbound entries (empty key)
  return base.filter((b) => b.key !== "");
}

/**
 * Detect conflicting keybindings (multiple commands on the same key).
 * Returns a Map of key combo → array of command IDs sharing that key.
 * Only includes entries with 2+ commands (actual conflicts).
 */
export function detectConflicts(
  bindings: Keybinding[],
): Map<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const b of bindings) {
    if (!b.key) continue;
    const normalized = b.key.toLowerCase();
    const list = byKey.get(normalized) ?? [];
    list.push(b.commandId);
    byKey.set(normalized, list);
  }

  // Keep only actual conflicts (2+ commands)
  const conflicts = new Map<string, string[]>();
  for (const [key, cmds] of byKey) {
    if (cmds.length > 1) conflicts.set(key, cmds);
  }
  return conflicts;
}

/**
 * Browser-reserved shortcuts that can't be overridden.
 * These are common across Chrome/Firefox/Edge on Windows/Linux.
 */
export const BROWSER_RESERVED_KEYS = new Set([
  "mod+w",     // Close tab
  "mod+t",     // New tab
  "mod+n",     // New window
  "mod+q",     // Quit browser
  "mod+l",     // Focus address bar
  "mod+d",     // Bookmark
  "mod+shift+t", // Reopen closed tab
  "mod+shift+n", // New incognito window
]);

// ── Fuzzy search for command palette ──

export function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Simple substring match + character-by-character fuzzy
  if (t.includes(q)) return true;

  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function searchCommands(query: string, commands: CommandDef[]): CommandDef[] {
  if (!query.trim()) return commands;

  return commands
    .filter((cmd) =>
      fuzzyMatch(query, cmd.label) ||
      fuzzyMatch(query, cmd.description) ||
      fuzzyMatch(query, cmd.id),
    )
    .sort((a, b) => {
      // Exact label match first
      const aLabel = a.label.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
      const bLabel = b.label.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
      return aLabel - bLabel;
    });
}
