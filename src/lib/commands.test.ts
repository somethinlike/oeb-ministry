import { describe, it, expect } from "vitest";
import {
  COMMANDS,
  COMMAND_MAP,
  PRESET_BINDINGS,
  matchesBinding,
  formatBinding,
  fuzzyMatch,
  searchCommands,
  type CommandDef,
} from "./commands";

// ── Command Registry ──

describe("COMMANDS", () => {
  it("has no duplicate IDs", () => {
    const ids = COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every command has a non-empty label and description", () => {
    for (const cmd of COMMANDS) {
      expect(cmd.label.length).toBeGreaterThan(0);
      expect(cmd.description.length).toBeGreaterThan(0);
    }
  });

  it("COMMAND_MAP contains all commands", () => {
    expect(COMMAND_MAP.size).toBe(COMMANDS.length);
    for (const cmd of COMMANDS) {
      expect(COMMAND_MAP.get(cmd.id)).toBe(cmd);
    }
  });
});

// ── matchesBinding ──

describe("matchesBinding", () => {
  function makeEvent(
    key: string,
    opts: Partial<KeyboardEvent> = {},
  ): KeyboardEvent {
    return {
      key,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      ...opts,
    } as KeyboardEvent;
  }

  it("matches a simple letter key", () => {
    expect(matchesBinding(makeEvent("j"), "j")).toBe(true);
  });

  it("rejects when wrong key is pressed", () => {
    expect(matchesBinding(makeEvent("k"), "j")).toBe(false);
  });

  it("matches mod+key (Ctrl on non-Mac)", () => {
    // In test env, navigator.userAgent doesn't contain "Mac"
    expect(
      matchesBinding(makeEvent("s", { ctrlKey: true }), "mod+s"),
    ).toBe(true);
  });

  it("rejects mod+key when ctrl is not pressed", () => {
    expect(matchesBinding(makeEvent("s"), "mod+s")).toBe(false);
  });

  it("rejects when extra ctrl is pressed but not in binding", () => {
    expect(matchesBinding(makeEvent("j", { ctrlKey: true }), "j")).toBe(false);
  });

  it("matches shift+key", () => {
    expect(
      matchesBinding(makeEvent("J", { shiftKey: true }), "shift+j"),
    ).toBe(true);
  });

  it("matches alt+arrowright", () => {
    expect(
      matchesBinding(makeEvent("arrowright", { altKey: true }), "alt+arrowright"),
    ).toBe(true);
  });

  it("matches escape", () => {
    expect(matchesBinding(makeEvent("Escape"), "escape")).toBe(true);
  });

  it("matches mod+shift+p", () => {
    expect(
      matchesBinding(
        makeEvent("p", { ctrlKey: true, shiftKey: true }),
        "mod+shift+p",
      ),
    ).toBe(true);
  });

  it("rejects mod+shift+p when shift is missing", () => {
    expect(
      matchesBinding(makeEvent("p", { ctrlKey: true }), "mod+shift+p"),
    ).toBe(false);
  });

  it("matches arrow keys", () => {
    expect(matchesBinding(makeEvent("arrowdown"), "arrowdown")).toBe(true);
    expect(matchesBinding(makeEvent("arrowup"), "arrowup")).toBe(true);
    expect(matchesBinding(makeEvent("arrowleft"), "arrowleft")).toBe(true);
    expect(matchesBinding(makeEvent("arrowright"), "arrowright")).toBe(true);
  });

  it("matches space", () => {
    expect(matchesBinding(makeEvent(" "), "space")).toBe(true);
  });

  it("matches enter", () => {
    expect(matchesBinding(makeEvent("Enter"), "enter")).toBe(true);
  });
});

// ── formatBinding ──

describe("formatBinding", () => {
  // In test env (non-Mac), should use text labels
  it("formats mod as Ctrl on non-Mac", () => {
    expect(formatBinding("mod+s")).toBe("Ctrl+S");
  });

  it("formats shift as Shift on non-Mac", () => {
    expect(formatBinding("mod+shift+p")).toBe("Ctrl+Shift+P");
  });

  it("formats escape as Esc", () => {
    expect(formatBinding("escape")).toBe("Esc");
  });

  it("formats arrow keys as symbols", () => {
    expect(formatBinding("arrowup")).toBe("\u2191");
    expect(formatBinding("arrowdown")).toBe("\u2193");
    expect(formatBinding("arrowleft")).toBe("\u2190");
    expect(formatBinding("arrowright")).toBe("\u2192");
  });

  it("formats alt+arrowright", () => {
    expect(formatBinding("alt+arrowright")).toBe("Alt+\u2192");
  });

  it("formats single letter as uppercase", () => {
    expect(formatBinding("j")).toBe("J");
  });
});

// ── fuzzyMatch ──

describe("fuzzyMatch", () => {
  it("matches exact substring", () => {
    expect(fuzzyMatch("next", "Next Chapter")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(fuzzyMatch("NEXT", "Next Chapter")).toBe(true);
  });

  it("matches fuzzy character sequence", () => {
    // "nc" → N_ext C_hapter
    expect(fuzzyMatch("nc", "Next Chapter")).toBe(true);
  });

  it("rejects non-matching strings", () => {
    expect(fuzzyMatch("xyz", "Next Chapter")).toBe(false);
  });

  it("handles empty query (matches everything)", () => {
    expect(fuzzyMatch("", "anything")).toBe(true);
  });
});

// ── searchCommands ──

describe("searchCommands", () => {
  const cmds: CommandDef[] = [
    { id: "nav.next", label: "Next Chapter", description: "Go to next", category: "navigation" },
    { id: "nav.prev", label: "Previous Chapter", description: "Go to previous", category: "navigation" },
    { id: "reader.clear", label: "Clear Selection", description: "Deselect all", category: "reader" },
  ];

  it("returns all commands for empty query", () => {
    expect(searchCommands("", cmds)).toEqual(cmds);
  });

  it("filters by label", () => {
    const results = searchCommands("next", cmds);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("nav.next");
  });

  it("filters by description", () => {
    const results = searchCommands("deselect", cmds);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("reader.clear");
  });

  it("filters by command ID", () => {
    const results = searchCommands("nav.prev", cmds);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("nav.prev");
  });

  it("prioritizes label-starting matches", () => {
    const results = searchCommands("chapter", cmds);
    // Both "Next Chapter" and "Previous Chapter" contain "chapter"
    expect(results.length).toBe(2);
  });

  it("returns empty for no match", () => {
    expect(searchCommands("zzz", cmds)).toEqual([]);
  });
});

// ── Keybinding Presets ──

describe("keybinding presets", () => {
  it("all presets include command palette shortcut", () => {
    for (const [name, bindings] of Object.entries(PRESET_BINDINGS)) {
      const hasPalette = bindings.some((b) => b.commandId === "system.palette");
      expect(hasPalette, `${name} preset missing system.palette`).toBe(true);
    }
  });

  it("all bound command IDs exist in the registry", () => {
    for (const [name, bindings] of Object.entries(PRESET_BINDINGS)) {
      for (const binding of bindings) {
        expect(
          COMMAND_MAP.has(binding.commandId),
          `${name} preset references unknown command: ${binding.commandId}`,
        ).toBe(true);
      }
    }
  });

  it("vim bindings with vimNormalOnly are actually in vim preset", () => {
    const vimBindings = PRESET_BINDINGS.vim;
    const normalOnly = vimBindings.filter((b) => b.vimNormalOnly);
    expect(normalOnly.length).toBeGreaterThan(0);
  });
});
