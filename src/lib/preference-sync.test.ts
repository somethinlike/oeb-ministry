/**
 * Tests for preference-sync — Supabase ↔ localStorage bridge.
 *
 * Verifies:
 * - loadLocalPreferences assembles from 3 localStorage keys
 * - savePreferencesToLocalStorage distributes to correct keys
 * - validatePreferences strips invalid JSONB data
 * - syncPreferences merge logic (remote wins, first-sync seeds)
 * - Error handling (network failures, corrupt data)
 */

import {
  loadLocalPreferences,
  savePreferencesToLocalStorage,
  validatePreferences,
  fetchRemotePreferences,
  saveRemotePreferences,
  syncPreferences,
  type UserPreferences,
} from "./preference-sync";

// ── Mock Supabase client ──

function mockClient(options: {
  selectData?: { preferences: unknown } | null;
  selectError?: Error | null;
  upsertError?: Error | null;
} = {}) {
  const upsertFn = vi.fn().mockResolvedValue({ error: options.upsertError ?? null });
  const eqFn = vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.selectData !== undefined ? options.selectData : null,
      error: options.selectError ?? null,
    }),
  });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

  return {
    from: vi.fn().mockReturnValue({
      select: selectFn,
      upsert: upsertFn,
    }),
    _upsertFn: upsertFn,
    _selectFn: selectFn,
  } as unknown as ReturnType<typeof mockClient>;
}

// ── loadLocalPreferences ──

describe("loadLocalPreferences", () => {
  beforeEach(() => localStorage.clear());

  it("returns empty-like defaults when nothing is stored", () => {
    const prefs = loadLocalPreferences();
    expect(prefs.readerFont).toBe("system");
    expect(prefs.annotationDots).toBe("blue");
    expect(prefs.readerLayout).toBe("centered");
    expect(prefs.divineName).toBe(false);
    expect(prefs.baptism).toBe(false);
    expect(prefs.assembly).toBe(false);
    expect(prefs.onlyBegotten).toBe(false);
    expect(prefs.defaultTranslation).toBeUndefined();
    expect(prefs.denominationPreset).toBeUndefined();
  });

  it("reads workspace prefs (readerFont, annotationDots, readerLayout)", () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ readerFont: "lora", annotationDots: "subtle", readerLayout: "columns" }),
    );
    const prefs = loadLocalPreferences();
    expect(prefs.readerFont).toBe("lora");
    expect(prefs.annotationDots).toBe("subtle");
    expect(prefs.readerLayout).toBe("columns");
  });

  it("reads translation toggles", () => {
    localStorage.setItem(
      "oeb-translation-toggles",
      JSON.stringify({ divineName: true, baptism: true, assembly: false, onlyBegotten: true }),
    );
    const prefs = loadLocalPreferences();
    expect(prefs.divineName).toBe(true);
    expect(prefs.baptism).toBe(true);
    expect(prefs.assembly).toBe(false);
    expect(prefs.onlyBegotten).toBe(true);
  });

  it("reads user-prefs key (defaultTranslation, denominationPreset)", () => {
    localStorage.setItem(
      "oeb-user-prefs",
      JSON.stringify({ defaultTranslation: "kjv1611", denominationPreset: "baptist" }),
    );
    const prefs = loadLocalPreferences();
    expect(prefs.defaultTranslation).toBe("kjv1611");
    expect(prefs.denominationPreset).toBe("baptist");
  });
});

// ── savePreferencesToLocalStorage ──

describe("savePreferencesToLocalStorage", () => {
  beforeEach(() => localStorage.clear());

  it("distributes roaming prefs to the correct localStorage keys", () => {
    const prefs: UserPreferences = {
      readerFont: "inter",
      annotationDots: "hidden",
      readerLayout: "columns",
      divineName: true,
      baptism: false,
      assembly: true,
      onlyBegotten: false,
      defaultTranslation: "dra",
      denominationPreset: "catholic",
    };
    savePreferencesToLocalStorage(prefs);

    const workspace = JSON.parse(localStorage.getItem("oeb-workspace-prefs")!);
    expect(workspace.readerFont).toBe("inter");
    expect(workspace.annotationDots).toBe("hidden");
    expect(workspace.readerLayout).toBe("columns");

    const toggles = JSON.parse(localStorage.getItem("oeb-translation-toggles")!);
    expect(toggles.divineName).toBe(true);
    expect(toggles.assembly).toBe(true);

    const userPrefs = JSON.parse(localStorage.getItem("oeb-user-prefs")!);
    expect(userPrefs.defaultTranslation).toBe("dra");
    expect(userPrefs.denominationPreset).toBe("catholic");
  });

  it("roundtrips customKeybindings through localStorage", () => {
    const prefs: UserPreferences = {
      keybindingPreset: "default",
      customKeybindings: { "annotation.save": "mod+enter" },
    };
    savePreferencesToLocalStorage(prefs);
    const loaded = loadLocalPreferences();
    expect(loaded.customKeybindings).toEqual({ "annotation.save": "mod+enter" });
  });

  it("preserves workspace-only fields (splitRatio, swapped, etc.)", () => {
    // Pre-populate with workspace layout prefs
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ splitRatio: 0.45, swapped: true, undocked: true, cleanView: true }),
    );

    savePreferencesToLocalStorage({ readerFont: "literata" });

    const workspace = JSON.parse(localStorage.getItem("oeb-workspace-prefs")!);
    expect(workspace.splitRatio).toBe(0.45);
    expect(workspace.swapped).toBe(true);
    expect(workspace.undocked).toBe(true);
    expect(workspace.cleanView).toBe(true);
    expect(workspace.readerFont).toBe("literata");
  });
});

// ── validatePreferences ──

describe("validatePreferences", () => {
  it("returns empty object for null/undefined input", () => {
    expect(validatePreferences(null)).toEqual({});
    expect(validatePreferences(undefined)).toEqual({});
  });

  it("returns empty object for non-object input", () => {
    expect(validatePreferences("string")).toEqual({});
    expect(validatePreferences(42)).toEqual({});
  });

  it("accepts valid preferences", () => {
    const result = validatePreferences({
      readerFont: "lora",
      annotationDots: "subtle",
      readerLayout: "columns",
      divineName: true,
      baptism: false,
      defaultTranslation: "web",
      denominationPreset: "catholic",
    });
    expect(result.readerFont).toBe("lora");
    expect(result.annotationDots).toBe("subtle");
    expect(result.readerLayout).toBe("columns");
    expect(result.divineName).toBe(true);
    expect(result.baptism).toBe(false);
    expect(result.defaultTranslation).toBe("web");
    expect(result.denominationPreset).toBe("catholic");
  });

  it("strips invalid font values", () => {
    const result = validatePreferences({ readerFont: "comic-sans" });
    expect(result.readerFont).toBeUndefined();
  });

  it("strips invalid dot style values", () => {
    const result = validatePreferences({ annotationDots: "rainbow" });
    expect(result.annotationDots).toBeUndefined();
  });

  it("strips invalid layout values", () => {
    const result = validatePreferences({ readerLayout: "newspaper" });
    expect(result.readerLayout).toBeUndefined();
  });

  it("strips non-boolean toggle values", () => {
    const result = validatePreferences({ divineName: "yes", baptism: 1 });
    expect(result.divineName).toBeUndefined();
    expect(result.baptism).toBeUndefined();
  });

  it("accepts valid customKeybindings", () => {
    const result = validatePreferences({
      customKeybindings: { "annotation.save": "mod+enter", "reader.nextVerse": "n" },
    });
    expect(result.customKeybindings).toEqual({
      "annotation.save": "mod+enter",
      "reader.nextVerse": "n",
    });
  });

  it("strips customKeybindings with invalid command IDs", () => {
    const result = validatePreferences({
      customKeybindings: { "fake.command": "mod+s" },
    });
    expect(result.customKeybindings).toBeUndefined();
  });

  it("strips customKeybindings with invalid key combos", () => {
    const result = validatePreferences({
      customKeybindings: { "annotation.save": "banana" },
    });
    expect(result.customKeybindings).toBeUndefined();
  });

  it("allows empty string to unbind in customKeybindings", () => {
    const result = validatePreferences({
      customKeybindings: { "annotation.save": "" },
    });
    expect(result.customKeybindings).toEqual({ "annotation.save": "" });
  });

  it("strips non-object customKeybindings", () => {
    expect(validatePreferences({ customKeybindings: "nope" }).customKeybindings).toBeUndefined();
    expect(validatePreferences({ customKeybindings: 42 }).customKeybindings).toBeUndefined();
    expect(validatePreferences({ customKeybindings: [1, 2] }).customKeybindings).toBeUndefined();
  });
});

// ── fetchRemotePreferences ──

describe("fetchRemotePreferences", () => {
  it("returns null when no row exists", async () => {
    const client = mockClient({ selectData: null });
    const result = await fetchRemotePreferences(client as any, "user-1");
    expect(result).toBeNull();
  });

  it("returns validated preferences from Supabase", async () => {
    const client = mockClient({
      selectData: { preferences: { readerFont: "lora", divineName: true } },
    });
    const result = await fetchRemotePreferences(client as any, "user-1");
    expect(result).toEqual({ readerFont: "lora", divineName: true });
  });

  it("throws on Supabase error", async () => {
    const client = mockClient({ selectError: new Error("DB error") });
    await expect(fetchRemotePreferences(client as any, "user-1")).rejects.toThrow("DB error");
  });
});

// ── syncPreferences ──

describe("syncPreferences", () => {
  beforeEach(() => localStorage.clear());

  it("seeds Supabase from localStorage on first sync (no remote row)", async () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ readerFont: "inter" }),
    );
    const client = mockClient({ selectData: null });
    const result = await syncPreferences(client as any, "user-1");
    expect(result.readerFont).toBe("inter");
    // Should have called upsert to seed
    expect((client as any).from).toHaveBeenCalled();
  });

  it("remote wins on merge when remote row exists", async () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ readerFont: "inter", annotationDots: "subtle" }),
    );
    const client = mockClient({
      selectData: { preferences: { readerFont: "lora" } },
    });
    const result = await syncPreferences(client as any, "user-1");
    // Remote override
    expect(result.readerFont).toBe("lora");
    // Local fills gap (not in remote)
    expect(result.annotationDots).toBe("subtle");
  });

  it("falls back to local on network error", async () => {
    localStorage.setItem(
      "oeb-workspace-prefs",
      JSON.stringify({ readerFont: "literata" }),
    );
    const client = mockClient({ selectError: new Error("Network error") });
    const result = await syncPreferences(client as any, "user-1");
    expect(result.readerFont).toBe("literata");
  });
});
