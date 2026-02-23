/**
 * Tests for workspace-prefs — localStorage persistence for layout preferences.
 *
 * Verifies:
 * - Returns sensible defaults when nothing is stored
 * - Reads and validates stored values
 * - Clamps split ratio to safe bounds (0.3–0.7)
 * - Handles corrupt/invalid data gracefully
 * - Merges partial updates with existing preferences
 */

import { loadWorkspacePrefs, saveWorkspacePrefs } from "./workspace-prefs";

describe("loadWorkspacePrefs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when nothing is stored", () => {
    const prefs = loadWorkspacePrefs();
    expect(prefs).toEqual({
      splitRatio: 0.6,
      swapped: false,
      undocked: false,
      readerLayout: "centered",
      readerFont: "system",
    });
  });

  it("reads valid stored preferences", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ splitRatio: 0.45, swapped: true, undocked: true, readerLayout: "columns", readerFont: "verdana" }),
    );
    const prefs = loadWorkspacePrefs();
    expect(prefs).toEqual({
      splitRatio: 0.45,
      swapped: true,
      undocked: true,
      readerLayout: "columns",
      readerFont: "verdana",
    });
  });

  it("clamps split ratio below minimum to 0.3", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ splitRatio: 0.1 }),
    );
    expect(loadWorkspacePrefs().splitRatio).toBe(0.3);
  });

  it("clamps split ratio above maximum to 0.7", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ splitRatio: 0.95 }),
    );
    expect(loadWorkspacePrefs().splitRatio).toBe(0.7);
  });

  it("returns defaults for corrupt JSON", () => {
    localStorage.setItem("oeb-workspace-prefs", "not-json!!!");
    const prefs = loadWorkspacePrefs();
    expect(prefs).toEqual({
      splitRatio: 0.6,
      swapped: false,
      undocked: false,
      readerLayout: "centered",
      readerFont: "system",
    });
  });

  it("fills missing fields with defaults", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ swapped: true }),
    );
    const prefs = loadWorkspacePrefs();
    expect(prefs.splitRatio).toBe(0.6);
    expect(prefs.swapped).toBe(true);
    expect(prefs.undocked).toBe(false);
  });

  it("rejects non-boolean swapped values", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ swapped: "yes" }),
    );
    expect(loadWorkspacePrefs().swapped).toBe(false);
  });

  it("rejects non-boolean undocked values", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ undocked: 1 }),
    );
    expect(loadWorkspacePrefs().undocked).toBe(false);
  });

  it("rejects invalid readerLayout values", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ readerLayout: "newspaper" }),
    );
    expect(loadWorkspacePrefs().readerLayout).toBe("centered");
  });

  it("defaults readerLayout when missing from stored prefs", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ splitRatio: 0.5 }),
    );
    expect(loadWorkspacePrefs().readerLayout).toBe("centered");
  });

  it("reads valid readerFont value", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ readerFont: "georgia" }),
    );
    expect(loadWorkspacePrefs().readerFont).toBe("georgia");
  });

  it("rejects invalid readerFont values", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ readerFont: "comic-sans" }),
    );
    expect(loadWorkspacePrefs().readerFont).toBe("system");
  });

  it("defaults readerFont when missing from stored prefs (backward compat)", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ splitRatio: 0.5, readerLayout: "columns" }),
    );
    expect(loadWorkspacePrefs().readerFont).toBe("system");
  });
});

describe("saveWorkspacePrefs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves a full set of preferences", () => {
    saveWorkspacePrefs({ splitRatio: 0.5, swapped: true, undocked: true, readerLayout: "columns", readerFont: "verdana" });
    const stored = JSON.parse(
      localStorage.getItem("oeb-workspace-prefs")!,
    );
    expect(stored).toEqual({
      splitRatio: 0.5,
      swapped: true,
      undocked: true,
      readerLayout: "columns",
      readerFont: "verdana",
    });
  });

  it("merges partial updates with existing preferences", () => {
    saveWorkspacePrefs({ splitRatio: 0.4 });
    saveWorkspacePrefs({ swapped: true });
    const prefs = loadWorkspacePrefs();
    expect(prefs.splitRatio).toBe(0.4);
    expect(prefs.swapped).toBe(true);
    expect(prefs.undocked).toBe(false);
  });

  it("clamps split ratio on save", () => {
    saveWorkspacePrefs({ splitRatio: 0.1 });
    expect(loadWorkspacePrefs().splitRatio).toBe(0.3);

    saveWorkspacePrefs({ splitRatio: 0.99 });
    expect(loadWorkspacePrefs().splitRatio).toBe(0.7);
  });

  it("does not throw when localStorage is unavailable", () => {
    // Simulate storage being full or unavailable
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => saveWorkspacePrefs({ splitRatio: 0.5 })).not.toThrow();
    localStorage.setItem = originalSetItem;
  });
});
