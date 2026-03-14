/**
 * Tests for the plain text Bible parser.
 *
 * Covers both supported formats:
 * - Format 1: "Book Chapter:Verse text" (one verse per line)
 * - Format 2: Book headers + "Chapter N" markers + verse-per-line
 *
 * Also covers auto-detection, sorting, and error/edge cases.
 */

import { describe, it, expect } from "vitest";
import { parseTextBible } from "./text-parser";

// ── Helpers ──

/**
 * Create a File object from a string, simulating a .txt upload.
 *
 * jsdom's File implementation doesn't support the modern Blob `.text()`
 * method, so we polyfill it by reading through a FileReader. This
 * mirrors what real browsers do — the parser calls `file.text()`.
 */
function makeFile(content: string, name = "test.txt"): File {
  const file = new File([content], name, { type: "text/plain" });

  // Polyfill .text() for jsdom — it supports arrayBuffer via FileReader
  // but not the convenience .text() method.
  if (typeof file.text !== "function") {
    (file as any).text = () => Promise.resolve(content);
  }

  return file;
}

// ── Format 1: "Book Chapter:Verse text" ──

describe("Format 1 — Book Chapter:Verse text", () => {
  it("parses basic single-book, single-chapter verses", async () => {
    const input = [
      "Genesis 1:1 In the beginning God created the heavens and the earth.",
      "Genesis 1:2 And the earth was without form and void.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    expect(result.books).toHaveLength(1);
    expect(result.books[0].bookId).toBe("gen");
    expect(result.books[0].originalName).toBe("Genesis");
    expect(result.books[0].chapters).toHaveLength(1);
    expect(result.books[0].chapters[0].chapter).toBe(1);
    expect(result.books[0].chapters[0].verses).toHaveLength(2);
    expect(result.books[0].chapters[0].verses[0]).toEqual({
      number: 1,
      text: "In the beginning God created the heavens and the earth.",
    });
    expect(result.books[0].chapters[0].verses[1]).toEqual({
      number: 2,
      text: "And the earth was without form and void.",
    });
    expect(result.warnings).toHaveLength(0);
  });

  it("handles multiple books (Genesis + Exodus)", async () => {
    const input = [
      "Genesis 1:1 In the beginning God created the heavens and the earth.",
      "Exodus 1:1 These are the names of the sons of Israel.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    expect(result.books).toHaveLength(2);

    const genesis = result.books.find((b) => b.bookId === "gen");
    const exodus = result.books.find((b) => b.bookId === "exo");

    expect(genesis).toBeDefined();
    expect(genesis!.originalName).toBe("Genesis");
    expect(genesis!.chapters[0].verses[0].text).toBe(
      "In the beginning God created the heavens and the earth.",
    );

    expect(exodus).toBeDefined();
    expect(exodus!.originalName).toBe("Exodus");
    expect(exodus!.chapters[0].verses[0].text).toBe(
      "These are the names of the sons of Israel.",
    );
  });

  it("handles multiple chapters within the same book", async () => {
    const input = [
      "Genesis 1:1 In the beginning God created the heavens and the earth.",
      "Genesis 1:2 And the earth was without form and void.",
      "Genesis 2:1 Thus the heavens and the earth were completed.",
      "Genesis 2:2 And on the seventh day God rested.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    expect(result.books).toHaveLength(1);
    expect(result.books[0].chapters).toHaveLength(2);

    const ch1 = result.books[0].chapters.find((c) => c.chapter === 1);
    const ch2 = result.books[0].chapters.find((c) => c.chapter === 2);

    expect(ch1).toBeDefined();
    expect(ch1!.verses).toHaveLength(2);
    expect(ch2).toBeDefined();
    expect(ch2!.verses).toHaveLength(2);
  });

  it("warns about unknown book names instead of silently dropping them", async () => {
    const input = [
      "Genesis 1:1 In the beginning God created the heavens and the earth.",
      "Madeupbook 1:1 This book does not exist.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    // Genesis should parse fine
    expect(result.books).toHaveLength(1);
    expect(result.books[0].bookId).toBe("gen");

    // The unknown book should generate a warning
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.some((w) => w.includes("Madeupbook"))).toBe(true);
  });

  it("ignores empty lines without generating warnings", async () => {
    const input = [
      "",
      "Genesis 1:1 In the beginning God created the heavens and the earth.",
      "",
      "",
      "Genesis 1:2 And the earth was without form and void.",
      "",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    expect(result.books).toHaveLength(1);
    expect(result.books[0].chapters[0].verses).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
  });
});

// ── Format 2: Book header + Chapter header + verse lines ──

describe("Format 2 — Book header + Chapter N + verse lines", () => {
  it("parses book header, chapter header, and numbered verse lines", async () => {
    const input = [
      "Genesis",
      "Chapter 1",
      "1 In the beginning God created the heavens and the earth.",
      "2 And the earth was without form and void.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    expect(result.books).toHaveLength(1);
    expect(result.books[0].bookId).toBe("gen");
    expect(result.books[0].originalName).toBe("Genesis");
    expect(result.books[0].chapters).toHaveLength(1);
    expect(result.books[0].chapters[0].chapter).toBe(1);
    expect(result.books[0].chapters[0].verses).toHaveLength(2);
    expect(result.books[0].chapters[0].verses[0]).toEqual({
      number: 1,
      text: "In the beginning God created the heavens and the earth.",
    });
    expect(result.books[0].chapters[0].verses[1]).toEqual({
      number: 2,
      text: "And the earth was without form and void.",
    });
  });

  it("handles multiple books and chapters", async () => {
    const input = [
      "Genesis",
      "Chapter 1",
      "1 In the beginning God created the heavens and the earth.",
      "Chapter 2",
      "1 Thus the heavens and the earth were completed.",
      "Exodus",
      "Chapter 1",
      "1 These are the names of the sons of Israel.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    expect(result.books).toHaveLength(2);

    const genesis = result.books.find((b) => b.bookId === "gen");
    const exodus = result.books.find((b) => b.bookId === "exo");

    expect(genesis).toBeDefined();
    expect(genesis!.chapters).toHaveLength(2);
    expect(genesis!.chapters[0].chapter).toBe(1);
    expect(genesis!.chapters[0].verses[0].text).toBe(
      "In the beginning God created the heavens and the earth.",
    );
    expect(genesis!.chapters[1].chapter).toBe(2);
    expect(genesis!.chapters[1].verses[0].text).toBe(
      "Thus the heavens and the earth were completed.",
    );

    expect(exodus).toBeDefined();
    expect(exodus!.chapters).toHaveLength(1);
    expect(exodus!.chapters[0].verses[0].text).toBe(
      "These are the names of the sons of Israel.",
    );
  });

  it("ignores lines that appear before any book is identified", async () => {
    const input = [
      "Some random preamble text that is not a book name",
      "Genesis",
      "Chapter 1",
      "1 In the beginning God created the heavens and the earth.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    // The preamble should not produce a book — only Genesis should appear
    expect(result.books).toHaveLength(1);
    expect(result.books[0].bookId).toBe("gen");

    // The unrecognized preamble line should generate a warning
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.some((w) => w.includes("preamble"))).toBe(true);
  });
});

// ── Auto-detection ──

describe("Auto-detection — chooses correct format based on content", () => {
  it("detects Format 1 when lines match 'Book Chapter:Verse text' pattern", async () => {
    const input = [
      "Genesis 1:1 In the beginning God created the heavens and the earth.",
      "Genesis 1:2 And the earth was without form and void.",
      "Genesis 1:3 And God said, Let there be light.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    // If it detected Format 1 correctly, we get a single book with one chapter
    expect(result.books).toHaveLength(1);
    expect(result.books[0].bookId).toBe("gen");
    expect(result.books[0].chapters[0].verses).toHaveLength(3);
  });

  it("detects Format 2 when lines use book headers and chapter markers", async () => {
    const input = [
      "Genesis",
      "Chapter 1",
      "1 In the beginning God created the heavens and the earth.",
      "2 And the earth was without form and void.",
      "3 And God said, Let there be light.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    // If it detected Format 2 correctly, we get a single book with one chapter
    expect(result.books).toHaveLength(1);
    expect(result.books[0].bookId).toBe("gen");
    expect(result.books[0].chapters[0].verses).toHaveLength(3);
  });
});

// ── Sorting ──

describe("Sorting — verses and chapters ordered numerically", () => {
  it("sorts verses numerically within a chapter even if file order is jumbled", async () => {
    // Deliberately out of order: verse 3, then 1, then 2
    const input = [
      "Genesis 1:3 And God said, Let there be light.",
      "Genesis 1:1 In the beginning God created the heavens and the earth.",
      "Genesis 1:2 And the earth was without form and void.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    const verses = result.books[0].chapters[0].verses;
    expect(verses[0].number).toBe(1);
    expect(verses[1].number).toBe(2);
    expect(verses[2].number).toBe(3);
  });

  it("sorts chapters numerically within a book even if file order is jumbled", async () => {
    // Deliberately out of order: chapter 3, then 1, then 2
    const input = [
      "Genesis 3:1 Now the serpent was more cunning.",
      "Genesis 1:1 In the beginning God created the heavens and the earth.",
      "Genesis 2:1 Thus the heavens and the earth were completed.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    const chapters = result.books[0].chapters;
    expect(chapters[0].chapter).toBe(1);
    expect(chapters[1].chapter).toBe(2);
    expect(chapters[2].chapter).toBe(3);
  });
});

// ── Edge cases ──

describe("Edge cases — unparseable and degenerate input", () => {
  it("returns empty books array for completely unparseable content", async () => {
    const input = [
      "This is not Bible text at all.",
      "Just some random sentences.",
      "Nothing here matches any format.",
    ].join("\n");

    const result = await parseTextBible(makeFile(input));

    expect(result.books).toHaveLength(0);
    // Should have warnings about the unparseable lines
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
