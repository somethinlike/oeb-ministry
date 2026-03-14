import { describe, it, expect } from "vitest";
import { parseLogosBible, isLogosFormat } from "./logos-parser";

// Helper to create a fake File from text
function makeFile(text: string): File {
  return { text: async () => text } as unknown as File;
}

describe("logos-parser", () => {
  describe("isLogosFormat", () => {
    it("detects Logos format by ALL CAPS book header", () => {
      const lines = ["The Old Testament", "", "", "GENESIS", "", "1 In the beginning..."];
      expect(isLogosFormat(lines)).toBe(true);
    });

    it("returns false for Format 1 (Book Chapter:Verse)", () => {
      const lines = ["Genesis 1:1 In the beginning God created the heavens and the earth."];
      expect(isLogosFormat(lines)).toBe(false);
    });
  });

  describe("parseLogosBible", () => {
    it("parses a single book with one chapter", async () => {
      const text = [
        "GENESIS",
        "",
        "Six Days of Creation",
        "",
        "1 In the beginning God created the heavens and the earth. 2 The earth was formless. 3 God said let there be light.",
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      expect(result.books).toHaveLength(1);
      expect(result.books[0].originalName).toBe("Genesis");
      expect(result.books[0].chapters).toHaveLength(1);
      expect(result.books[0].chapters[0].chapter).toBe(1);
      expect(result.books[0].chapters[0].verses).toHaveLength(3);
      expect(result.books[0].chapters[0].verses[0].number).toBe(1);
      expect(result.books[0].chapters[0].verses[0].text).toContain("In the beginning");
    });

    it("detects chapter transitions at paragraph boundaries", async () => {
      const text = [
        "GENESIS",
        "",
        "1 First verse of chapter one. 2 Second verse.",
        "",
        "2 First verse of chapter two. 2 Second verse of ch2. 3 Third verse.",
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      expect(result.books[0].chapters).toHaveLength(2);
      expect(result.books[0].chapters[0].chapter).toBe(1);
      expect(result.books[0].chapters[0].verses).toHaveLength(2);
      expect(result.books[0].chapters[1].chapter).toBe(2);
      expect(result.books[0].chapters[1].verses).toHaveLength(3);
    });

    it("handles multiple books", async () => {
      const text = [
        "GENESIS",
        "",
        "1 In the beginning. 2 The earth was formless.",
        "",
        "EXODUS",
        "",
        "1 These are the names. 2 Reuben, Simeon.",
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      expect(result.books).toHaveLength(2);
      expect(result.books[0].originalName).toBe("Genesis");
      expect(result.books[1].originalName).toBe("Exodus");
    });

    it("handles numbered book names (1 SAMUEL)", async () => {
      const text = [
        "1 SAMUEL",
        "",
        "1 There was a certain man. 2 He had two wives.",
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      expect(result.books).toHaveLength(1);
      expect(result.books[0].originalName).toBe("1 Samuel");
    });

    it("handles THE PSALMS as book name", async () => {
      const text = [
        "THE PSALMS",
        "",
        "1 Happy are those who do not follow the advice of the wicked. 2 But their delight is in the law.",
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      expect(result.books).toHaveLength(1);
      expect(result.books[0].bookId).toBe("psa");
    });

    it("strips section headings from output", async () => {
      const text = [
        "GENESIS",
        "",
        "The Beginning",
        "",
        "1 In the beginning. 2 Second verse.",
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      expect(result.books[0].chapters[0].verses[0].text).not.toContain("The Beginning");
    });

    it("includes verse continuation text after section headings", async () => {
      const text = [
        "GENESIS",
        "",
        "1 First verse. 2 Second verse. 3 Third verse.",
        "4 Part A of verse four.",
        "",
        "Another Account",
        "",
        "Part B of verse four. 5 Fifth verse.",
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      const ch1 = result.books[0].chapters[0];
      // Verse 4 should contain both parts
      const v4 = ch1.verses.find(v => v.number === 4);
      expect(v4?.text).toContain("Part A");
      // Verse 5 should exist
      const v5 = ch1.verses.find(v => v.number === 5);
      expect(v5?.text).toContain("Fifth verse");
    });

    it("cleans Logos footnote markers", async () => {
      const text = [
        "MATTHEW",
        "",
        '1 An account of the genealogy,,* of Jesus. 2 Abraham was the father.',
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      expect(result.books[0].chapters[0].verses[0].text).not.toContain(",,*");
      expect(result.books[0].chapters[0].verses[0].text).toContain("genealogy");
    });

    it("handles poetry (indented lines) as verse content", async () => {
      const text = [
        "GENESIS",
        "",
        "1 Then the man said,",
        '    "This at last is bone of my bones',
        '    and flesh of my flesh."',
        "2 Therefore a man leaves his father.",
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      const v1 = result.books[0].chapters[0].verses[0];
      expect(v1.text).toContain("bone of my bones");
      expect(v1.text).toContain("flesh of my flesh");
    });

    it("skips front matter before first book", async () => {
      const text = [
        "The Old Testament",
        "",
        "Copyright notice here.",
        "",
        "GENESIS",
        "",
        "1 In the beginning.",
        "",
      ].join("\n");

      const result = await parseLogosBible(makeFile(text));
      expect(result.books).toHaveLength(1);
      expect(result.books[0].chapters[0].verses[0].text).toBe("In the beginning.");
    });
  });
});
