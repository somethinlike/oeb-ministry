/**
 * Tests for reader-fonts — font data and viewport-aware ordering.
 *
 * Verifies:
 * - getFontFamily returns correct CSS stack for each key
 * - getFontFamily falls back to system default for invalid keys
 * - getOrderedFontOptions returns all fonts
 * - Mobile viewport orders sans-serif first
 * - Desktop viewport orders serif first
 */

import { getFontFamily, getOrderedFontOptions, FONT_OPTIONS } from "./reader-fonts";

describe("FONT_OPTIONS", () => {
  it("contains 6 font options", () => {
    expect(FONT_OPTIONS).toHaveLength(6);
  });

  it("every option has key, label, family, and category", () => {
    for (const font of FONT_OPTIONS) {
      expect(font.key).toBeTruthy();
      expect(font.label).toBeTruthy();
      expect(font.family).toBeTruthy();
      expect(["sans", "serif"]).toContain(font.category);
    }
  });
});

describe("getFontFamily", () => {
  it("returns the Verdana stack for 'verdana'", () => {
    expect(getFontFamily("verdana")).toBe("Verdana, Geneva, sans-serif");
  });

  it("returns the system stack for 'system'", () => {
    expect(getFontFamily("system")).toContain("system-ui");
  });

  it("returns the Georgia stack for 'georgia'", () => {
    expect(getFontFamily("georgia")).toContain("Georgia");
  });

  it("returns the Charter stack for 'charter'", () => {
    expect(getFontFamily("charter")).toContain("Bitstream Charter");
  });

  it("returns the Palatino stack for 'palatino'", () => {
    expect(getFontFamily("palatino")).toContain("Palatino");
  });

  it("returns the Trebuchet stack for 'trebuchet'", () => {
    expect(getFontFamily("trebuchet")).toContain("Trebuchet MS");
  });

  it("returns the system default for an unknown key", () => {
    // Cast to bypass type checking — simulates corrupt localStorage data
    const result = getFontFamily("comic-sans" as any);
    expect(result).toContain("system-ui");
  });
});

describe("getOrderedFontOptions", () => {
  beforeEach(() => {
    // Provide a default matchMedia mock — individual tests can override
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("returns all 6 font options", () => {
    const ordered = getOrderedFontOptions();
    expect(ordered).toHaveLength(6);
  });

  it("on mobile (narrow viewport), lists sans-serif fonts first", () => {
    // Mock a narrow viewport
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 1023px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const ordered = getOrderedFontOptions();
    // First 3 should be sans, last 3 should be serif
    expect(ordered[0].category).toBe("sans");
    expect(ordered[1].category).toBe("sans");
    expect(ordered[2].category).toBe("sans");
    expect(ordered[3].category).toBe("serif");
    expect(ordered[4].category).toBe("serif");
    expect(ordered[5].category).toBe("serif");
  });

  it("on desktop (wide viewport), lists serif fonts first", () => {
    // Mock a wide viewport
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false, // max-width: 1023px does NOT match on desktop
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const ordered = getOrderedFontOptions();
    // First 3 should be serif, last 3 should be sans
    expect(ordered[0].category).toBe("serif");
    expect(ordered[1].category).toBe("serif");
    expect(ordered[2].category).toBe("serif");
    expect(ordered[3].category).toBe("sans");
    expect(ordered[4].category).toBe("sans");
    expect(ordered[5].category).toBe("sans");
  });

  it("preserves order within each category", () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const ordered = getOrderedFontOptions();
    const sansKeys = ordered.filter((f) => f.category === "sans").map((f) => f.key);
    const serifKeys = ordered.filter((f) => f.category === "serif").map((f) => f.key);
    expect(sansKeys).toEqual(["system", "verdana", "trebuchet"]);
    expect(serifKeys).toEqual(["georgia", "charter", "palatino"]);
  });
});
