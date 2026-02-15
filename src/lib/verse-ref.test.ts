import { describe, it, expect } from "vitest";
import {
  parseVerseRef,
  formatVerseRef,
  displayVerseRef,
  isValidBookId,
} from "./verse-ref";

describe("parseVerseRef", () => {
  it("parses a valid NT verse reference", () => {
    const result = parseVerseRef("oeb-us:jhn:3:16");
    expect(result).toEqual({
      ok: true,
      ref: { translation: "oeb-us", book: "jhn", chapter: 3, verse: 16 },
    });
  });

  it("parses a valid OT verse reference", () => {
    const result = parseVerseRef("web:gen:1:1");
    expect(result).toEqual({
      ok: true,
      ref: { translation: "web", book: "gen", chapter: 1, verse: 1 },
    });
  });

  it("handles uppercase input by normalizing to lowercase", () => {
    const result = parseVerseRef("OEB-US:JHN:3:16");
    expect(result).toEqual({
      ok: true,
      ref: { translation: "oeb-us", book: "jhn", chapter: 3, verse: 16 },
    });
  });

  it("trims whitespace", () => {
    const result = parseVerseRef("  oeb-us:jhn:3:16  ");
    expect(result).toEqual({
      ok: true,
      ref: { translation: "oeb-us", book: "jhn", chapter: 3, verse: 16 },
    });
  });

  it("rejects empty string", () => {
    const result = parseVerseRef("");
    expect(result).toEqual({
      ok: false,
      error: "Verse reference cannot be empty",
    });
  });

  it("rejects whitespace-only string", () => {
    const result = parseVerseRef("   ");
    expect(result).toEqual({
      ok: false,
      error: "Verse reference cannot be empty",
    });
  });

  it("rejects wrong number of parts (too few)", () => {
    const result = parseVerseRef("oeb-us:jhn:3");
    expect(result).toEqual({
      ok: false,
      error: "Expected format translation:book:chapter:verse",
    });
  });

  it("rejects wrong number of parts (too many)", () => {
    const result = parseVerseRef("oeb-us:jhn:3:16:extra");
    expect(result).toEqual({
      ok: false,
      error: "Expected format translation:book:chapter:verse",
    });
  });

  it("rejects unknown book ID", () => {
    const result = parseVerseRef("oeb-us:xyz:1:1");
    expect(result).toEqual({
      ok: false,
      error: 'Unknown book "xyz"',
    });
  });

  it("rejects non-numeric chapter", () => {
    const result = parseVerseRef("oeb-us:jhn:abc:1");
    expect(result).toEqual({
      ok: false,
      error: "Chapter must be a positive integer",
    });
  });

  it("rejects zero chapter", () => {
    const result = parseVerseRef("oeb-us:jhn:0:1");
    expect(result).toEqual({
      ok: false,
      error: "Chapter must be a positive integer",
    });
  });

  it("rejects negative chapter", () => {
    const result = parseVerseRef("oeb-us:jhn:-1:1");
    expect(result).toEqual({
      ok: false,
      error: "Chapter must be a positive integer",
    });
  });

  it("rejects non-numeric verse", () => {
    const result = parseVerseRef("oeb-us:jhn:3:abc");
    expect(result).toEqual({
      ok: false,
      error: "Verse must be a positive integer",
    });
  });

  it("rejects zero verse", () => {
    const result = parseVerseRef("oeb-us:jhn:3:0");
    expect(result).toEqual({
      ok: false,
      error: "Verse must be a positive integer",
    });
  });

  it("rejects chapter exceeding book's total chapters", () => {
    // John has 21 chapters, chapter 99 should fail
    const result = parseVerseRef("oeb-us:jhn:99:1");
    expect(result).toEqual({
      ok: false,
      error: "John only has 21 chapters",
    });
  });

  it("accepts the last chapter of a book", () => {
    // Revelation has 22 chapters
    const result = parseVerseRef("oeb-us:rev:22:1");
    expect(result.ok).toBe(true);
  });

  it("rejects decimal chapter", () => {
    const result = parseVerseRef("oeb-us:jhn:3.5:1");
    expect(result).toEqual({
      ok: false,
      error: "Chapter must be a positive integer",
    });
  });
});

describe("formatVerseRef", () => {
  it("formats a VerseRef into canonical string", () => {
    const result = formatVerseRef({
      translation: "oeb-us",
      book: "jhn",
      chapter: 3,
      verse: 16,
    });
    expect(result).toBe("oeb-us:jhn:3:16");
  });

  it("handles single-chapter books", () => {
    const result = formatVerseRef({
      translation: "web",
      book: "phm",
      chapter: 1,
      verse: 1,
    });
    expect(result).toBe("web:phm:1:1");
  });
});

describe("displayVerseRef", () => {
  it("shows a human-readable format with full book name", () => {
    const result = displayVerseRef({
      translation: "oeb-us",
      book: "jhn",
      chapter: 3,
      verse: 16,
    });
    expect(result).toBe("John 3:16");
  });

  it("shows numbered book names correctly", () => {
    const result = displayVerseRef({
      translation: "web",
      book: "1co",
      chapter: 13,
      verse: 4,
    });
    expect(result).toBe("1 Corinthians 13:4");
  });

  it("shows OT book names correctly", () => {
    const result = displayVerseRef({
      translation: "oeb-us",
      book: "psa",
      chapter: 23,
      verse: 1,
    });
    expect(result).toBe("Psalms 23:1");
  });
});

describe("isValidBookId", () => {
  it("returns true for valid book IDs", () => {
    expect(isValidBookId("gen")).toBe(true);
    expect(isValidBookId("rev")).toBe(true);
    expect(isValidBookId("jhn")).toBe(true);
  });

  it("returns false for invalid book IDs", () => {
    expect(isValidBookId("xyz")).toBe(false);
    expect(isValidBookId("")).toBe(false);
    expect(isValidBookId("john")).toBe(false); // Full name, not ID
  });
});
