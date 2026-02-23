/**
 * Tests for denomination-presets — named toggle configurations.
 *
 * Verifies:
 * - Data integrity (every preset has required fields, valid parent refs)
 * - Query helpers (getPresetById, getRootPresets, getChildPresets)
 * - applyPreset merges correctly (partial override, full override)
 * - Hierarchy consistency (children reference existing parents)
 */

import {
  DENOMINATION_PRESETS,
  getPresetById,
  getRootPresets,
  getChildPresets,
  applyPreset,
  type DenominationPreset,
} from "./denomination-presets";
import { TOGGLE_DEFAULTS, type TranslationToggles } from "./translation-toggles";

describe("DENOMINATION_PRESETS data integrity", () => {
  it("has at least 10 presets", () => {
    expect(DENOMINATION_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  it("every preset has an id, name, and description", () => {
    for (const preset of DENOMINATION_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
    }
  });

  it("every preset has a unique id", () => {
    const ids = DENOMINATION_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every child preset references an existing parent", () => {
    const ids = new Set(DENOMINATION_PRESETS.map((p) => p.id));
    for (const preset of DENOMINATION_PRESETS) {
      if (preset.parentId !== null) {
        expect(ids.has(preset.parentId)).toBe(true);
      }
    }
  });

  it("no preset is its own parent", () => {
    for (const preset of DENOMINATION_PRESETS) {
      expect(preset.parentId).not.toBe(preset.id);
    }
  });

  it("toggle values are booleans (not strings or numbers)", () => {
    for (const preset of DENOMINATION_PRESETS) {
      for (const [, value] of Object.entries(preset.toggles)) {
        expect(typeof value).toBe("boolean");
      }
    }
  });
});

describe("getPresetById", () => {
  it("returns the correct preset for a valid id", () => {
    const baptist = getPresetById("baptist");
    expect(baptist).toBeDefined();
    expect(baptist!.name).toBe("Baptist");
  });

  it("returns undefined for an invalid id", () => {
    expect(getPresetById("nonexistent")).toBeUndefined();
  });
});

describe("getRootPresets", () => {
  it("returns only presets with no parent", () => {
    const roots = getRootPresets();
    for (const root of roots) {
      expect(root.parentId).toBeNull();
    }
  });

  it("includes major denominations", () => {
    const roots = getRootPresets();
    const names = roots.map((r) => r.id);
    expect(names).toContain("catholic");
    expect(names).toContain("baptist");
    expect(names).toContain("lutheran");
    expect(names).toContain("reformed");
  });

  it("does not include subcategories", () => {
    const roots = getRootPresets();
    const ids = roots.map((r) => r.id);
    expect(ids).not.toContain("baptist-southern");
    expect(ids).not.toContain("lutheran-lcms");
  });
});

describe("getChildPresets", () => {
  it("returns subcategories for baptist", () => {
    const children = getChildPresets("baptist");
    expect(children.length).toBeGreaterThanOrEqual(2);
    for (const child of children) {
      expect(child.parentId).toBe("baptist");
    }
  });

  it("returns subcategories for lutheran", () => {
    const children = getChildPresets("lutheran");
    expect(children.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty array for a denomination with no subcategories", () => {
    const children = getChildPresets("methodist");
    expect(children).toEqual([]);
  });

  it("returns empty array for a nonexistent parent", () => {
    const children = getChildPresets("nonexistent");
    expect(children).toEqual([]);
  });
});

describe("applyPreset", () => {
  it("overrides specified toggles while keeping unspecified ones", () => {
    const current: TranslationToggles = {
      divineName: true,
      baptism: false,
      assembly: true,
      onlyBegotten: false,
    };
    // Preset that only sets baptism
    const preset: DenominationPreset = {
      id: "test",
      name: "Test",
      parentId: null,
      description: "test",
      toggles: { baptism: true },
    };
    const result = applyPreset(current, preset);
    expect(result.divineName).toBe(true); // kept from current
    expect(result.baptism).toBe(true); // overridden by preset
    expect(result.assembly).toBe(true); // kept from current
    expect(result.onlyBegotten).toBe(false); // kept from current
  });

  it("applies all toggles when preset specifies all of them", () => {
    const current: TranslationToggles = { ...TOGGLE_DEFAULTS };
    const academic = getPresetById("academic")!;
    const result = applyPreset(current, academic);
    // Academic sets everything to true
    expect(result.divineName).toBe(true);
    expect(result.baptism).toBe(true);
    expect(result.assembly).toBe(true);
    expect(result.onlyBegotten).toBe(true);
  });

  it("baptist preset enables immersion", () => {
    const current: TranslationToggles = { ...TOGGLE_DEFAULTS };
    const baptist = getPresetById("baptist")!;
    const result = applyPreset(current, baptist);
    expect(result.baptism).toBe(true);
    expect(result.divineName).toBe(false);
  });

  it("returns a new object, does not mutate current", () => {
    const current: TranslationToggles = { ...TOGGLE_DEFAULTS };
    const baptist = getPresetById("baptist")!;
    const result = applyPreset(current, baptist);
    expect(result).not.toBe(current);
    expect(current.baptism).toBe(false); // original unchanged
  });
});
