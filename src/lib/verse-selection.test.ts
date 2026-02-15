import { describe, it, expect } from "vitest";
import { updateSelection, isVerseSelected } from "./verse-selection";

describe("updateSelection", () => {
  it("selects a verse when nothing is selected", () => {
    const result = updateSelection(null, 5);
    expect(result).toEqual({ start: 5, end: 5 });
  });

  it("deselects when tapping the same single verse", () => {
    const result = updateSelection({ start: 5, end: 5 }, 5);
    expect(result).toBeNull();
  });

  it("extends to a forward range when a second verse is tapped after", () => {
    const result = updateSelection({ start: 3, end: 3 }, 7);
    expect(result).toEqual({ start: 3, end: 7 });
  });

  it("extends to a backward range when a second verse is tapped before", () => {
    // User taps verse 10, then verse 5 → range should be 5-10
    const result = updateSelection({ start: 10, end: 10 }, 5);
    expect(result).toEqual({ start: 5, end: 10 });
  });

  it("starts fresh when tapping while a range is active", () => {
    const result = updateSelection({ start: 3, end: 7 }, 12);
    expect(result).toEqual({ start: 12, end: 12 });
  });

  it("handles verse 1 correctly", () => {
    const result = updateSelection(null, 1);
    expect(result).toEqual({ start: 1, end: 1 });
  });

  it("creates range from verse 1 to any verse", () => {
    const result = updateSelection({ start: 1, end: 1 }, 25);
    expect(result).toEqual({ start: 1, end: 25 });
  });
});

describe("isVerseSelected", () => {
  it("returns false when nothing is selected", () => {
    expect(isVerseSelected(null, 5)).toBe(false);
  });

  it("returns true for a single selected verse", () => {
    expect(isVerseSelected({ start: 5, end: 5 }, 5)).toBe(true);
  });

  it("returns false for a non-selected verse", () => {
    expect(isVerseSelected({ start: 5, end: 5 }, 6)).toBe(false);
  });

  it("returns true for verses within a range", () => {
    const selection = { start: 3, end: 7 };
    expect(isVerseSelected(selection, 3)).toBe(true);
    expect(isVerseSelected(selection, 5)).toBe(true);
    expect(isVerseSelected(selection, 7)).toBe(true);
  });

  it("returns false for verses outside a range", () => {
    const selection = { start: 3, end: 7 };
    expect(isVerseSelected(selection, 2)).toBe(false);
    expect(isVerseSelected(selection, 8)).toBe(false);
  });
});
