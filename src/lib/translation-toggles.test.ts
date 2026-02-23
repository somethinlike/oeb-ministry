/**
 * Tests for translation-toggles — word-swap preferences for Bible text.
 *
 * Verifies:
 * - Returns sensible defaults when nothing is stored
 * - Reads and validates stored toggle values
 * - Handles corrupt/invalid data gracefully
 * - Merges partial updates with existing preferences
 * - Text transform applies correct replacements per toggle
 * - Case preservation works correctly
 * - Word boundaries prevent partial matches
 */

import {
  loadTranslationToggles,
  saveTranslationToggles,
  applyTranslationToggles,
  TOGGLE_DEFAULTS,
  type TranslationToggles,
} from "./translation-toggles";

// ── Load / Save Tests ──

describe("loadTranslationToggles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when nothing is stored", () => {
    expect(loadTranslationToggles()).toEqual(TOGGLE_DEFAULTS);
  });

  it("reads valid stored values", () => {
    localStorage.setItem(
      "oeb-translation-toggles",
      JSON.stringify({
        divineName: true,
        baptism: true,
        assembly: false,
        onlyBegotten: true,
      }),
    );
    expect(loadTranslationToggles()).toEqual({
      divineName: true,
      baptism: true,
      assembly: false,
      onlyBegotten: true,
    });
  });

  it("returns defaults for corrupt JSON", () => {
    localStorage.setItem("oeb-translation-toggles", "not-json!!!");
    expect(loadTranslationToggles()).toEqual(TOGGLE_DEFAULTS);
  });

  it("fills missing fields with defaults", () => {
    localStorage.setItem(
      "oeb-translation-toggles",
      JSON.stringify({ divineName: true }),
    );
    const toggles = loadTranslationToggles();
    expect(toggles.divineName).toBe(true);
    expect(toggles.baptism).toBe(false);
    expect(toggles.assembly).toBe(false);
    expect(toggles.onlyBegotten).toBe(false);
  });

  it("rejects non-boolean values", () => {
    localStorage.setItem(
      "oeb-translation-toggles",
      JSON.stringify({
        divineName: "yes",
        baptism: 1,
        assembly: null,
        onlyBegotten: "true",
      }),
    );
    expect(loadTranslationToggles()).toEqual(TOGGLE_DEFAULTS);
  });
});

describe("saveTranslationToggles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves a full set of toggles", () => {
    const toggles: TranslationToggles = {
      divineName: true,
      baptism: true,
      assembly: true,
      onlyBegotten: true,
    };
    saveTranslationToggles(toggles);
    const stored = JSON.parse(
      localStorage.getItem("oeb-translation-toggles")!,
    );
    expect(stored).toEqual(toggles);
  });

  it("merges partial updates with existing preferences", () => {
    saveTranslationToggles({ divineName: true });
    saveTranslationToggles({ baptism: true });
    const toggles = loadTranslationToggles();
    expect(toggles.divineName).toBe(true);
    expect(toggles.baptism).toBe(true);
    expect(toggles.assembly).toBe(false);
    expect(toggles.onlyBegotten).toBe(false);
  });

  it("does not throw when localStorage is unavailable", () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => saveTranslationToggles({ divineName: true })).not.toThrow();
    localStorage.setItem = originalSetItem;
  });
});

// ── Text Transform Tests ──

describe("applyTranslationToggles", () => {
  const allOff: TranslationToggles = { ...TOGGLE_DEFAULTS };

  it("returns text unchanged when all toggles are off", () => {
    const text = "The LORD said unto the church, baptize the only begotten Son.";
    expect(applyTranslationToggles(text, allOff)).toBe(text);
  });

  it("returns empty string for empty input", () => {
    const allOn: TranslationToggles = {
      divineName: true,
      baptism: true,
      assembly: true,
      onlyBegotten: true,
    };
    expect(applyTranslationToggles("", allOn)).toBe("");
  });

  it("returns text unchanged when no matching words exist", () => {
    const toggles: TranslationToggles = {
      ...allOff,
      divineName: true,
      baptism: true,
    };
    expect(applyTranslationToggles("Jesus wept.", toggles)).toBe(
      "Jesus wept.",
    );
  });

  // ── Divine Name ──

  describe("divineName toggle", () => {
    const toggles: TranslationToggles = { ...allOff, divineName: true };

    it("replaces LORD (all caps) with Yahweh", () => {
      expect(
        applyTranslationToggles("The LORD is my shepherd.", toggles),
      ).toBe("The Yahweh is my shepherd.");
    });

    it("does NOT replace Lord (mixed case)", () => {
      expect(applyTranslationToggles("The Lord is good.", toggles)).toBe(
        "The Lord is good.",
      );
    });

    it("does NOT replace lord (lowercase)", () => {
      expect(
        applyTranslationToggles("He is lord of the harvest.", toggles),
      ).toBe("He is lord of the harvest.");
    });

    it("replaces multiple occurrences", () => {
      expect(
        applyTranslationToggles(
          "The LORD said to the LORD of hosts.",
          toggles,
        ),
      ).toBe("The Yahweh said to the Yahweh of hosts.");
    });
  });

  // ── Baptism ──

  describe("baptism toggle", () => {
    const toggles: TranslationToggles = { ...allOff, baptism: true };

    it("replaces baptize with immerse", () => {
      expect(
        applyTranslationToggles("I baptize you with water.", toggles),
      ).toBe("I immerse you with water.");
    });

    it("replaces baptized with immersed", () => {
      expect(
        applyTranslationToggles("He was baptized in the Jordan.", toggles),
      ).toBe("He was immersed in the Jordan.");
    });

    it("replaces baptizing with immersing", () => {
      expect(
        applyTranslationToggles("John was baptizing in the river.", toggles),
      ).toBe("John was immersing in the river.");
    });

    it("replaces baptism with immersion", () => {
      expect(
        applyTranslationToggles("The baptism of Jesus.", toggles),
      ).toBe("The immersion of Jesus.");
    });

    it("replaces baptisms with immersions", () => {
      expect(
        applyTranslationToggles("Various baptisms and washings.", toggles),
      ).toBe("Various immersions and washings.");
    });

    it("replaces Baptizer with Immerser (title case)", () => {
      expect(
        applyTranslationToggles("John the Baptizer came.", toggles),
      ).toBe("John the Immerser came.");
    });

    it("preserves title case", () => {
      expect(
        applyTranslationToggles("Baptize them in the name.", toggles),
      ).toBe("Immerse them in the name.");
    });

    it("handles KJV archaic form: baptizeth", () => {
      expect(
        applyTranslationToggles(
          "he that sent me to baptizeth with water",
          toggles,
        ),
      ).toBe("he that sent me to immerseth with water");
    });

    it("handles KJV archaic form: baptizest", () => {
      expect(
        applyTranslationToggles("Why baptizest thou then?", toggles),
      ).toBe("Why immersest thou then?");
    });
  });

  // ── Assembly ──

  describe("assembly toggle", () => {
    const toggles: TranslationToggles = { ...allOff, assembly: true };

    it("replaces church with assembly", () => {
      expect(
        applyTranslationToggles("Tell it to the church.", toggles),
      ).toBe("Tell it to the assembly.");
    });

    it("replaces churches with assemblies", () => {
      expect(
        applyTranslationToggles("The seven churches of Asia.", toggles),
      ).toBe("The seven assemblies of Asia.");
    });

    it("preserves title case for Church", () => {
      expect(
        applyTranslationToggles("The Church in Ephesus.", toggles),
      ).toBe("The Assembly in Ephesus.");
    });

    it("does NOT match inside compound words like churchyard", () => {
      // Word boundaries prevent matching inside other words
      expect(
        applyTranslationToggles("The churchyard was empty.", toggles),
      ).toBe("The churchyard was empty.");
    });
  });

  // ── Only Begotten ──

  describe("onlyBegotten toggle", () => {
    const toggles: TranslationToggles = { ...allOff, onlyBegotten: true };

    it("replaces 'only begotten' with 'one and only'", () => {
      expect(
        applyTranslationToggles(
          "He gave his only begotten Son.",
          toggles,
        ),
      ).toBe("He gave his one and only Son.");
    });

    it("preserves title case", () => {
      expect(
        applyTranslationToggles(
          "Only begotten of the Father.",
          toggles,
        ),
      ).toBe("One and only of the Father.");
    });

    it("does NOT replace 'only' or 'begotten' individually", () => {
      expect(
        applyTranslationToggles(
          "The only way. The first begotten.",
          toggles,
        ),
      ).toBe("The only way. The first begotten.");
    });
  });

  // ── Multiple Toggles Active ──

  describe("multiple toggles active simultaneously", () => {
    it("applies all active toggles to the same text", () => {
      const toggles: TranslationToggles = {
        divineName: true,
        baptism: true,
        assembly: true,
        onlyBegotten: true,
      };
      const input =
        "The LORD said to the church: baptize in the name of the only begotten Son.";
      const expected =
        "The Yahweh said to the assembly: immerse in the name of the one and only Son.";
      expect(applyTranslationToggles(input, toggles)).toBe(expected);
    });
  });
});
