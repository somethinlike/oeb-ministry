import { describe, it, expect } from "vitest";
import { extractVerseText } from "./verse-text";
import type { ChapterData } from "../types/bible";

function makeChapterData(verses: { number: number; text: string }[]): ChapterData {
  return {
    translation: "oeb-us",
    book: "jhn",
    bookName: "John",
    chapter: 3,
    verses,
  };
}

describe("extractVerseText", () => {
  const chapter = makeChapterData([
    { number: 14, text: "Just as Moses lifted up the serpent in the wilderness," },
    { number: 15, text: "so must the Son of Man be lifted up," },
    { number: 16, text: "so that everyone who believes in him may have eternal life." },
    { number: 17, text: "For God sent his Son into the world," },
    { number: 18, text: "not to judge the world, but that the world might be saved through him." },
  ]);

  it("extracts a single verse", () => {
    const result = extractVerseText(chapter, 16, 16);
    expect(result).toBe(
      "so that everyone who believes in him may have eternal life.",
    );
  });

  it("extracts a verse range", () => {
    const result = extractVerseText(chapter, 16, 18);
    expect(result).toBe(
      "so that everyone who believes in him may have eternal life. For God sent his Son into the world, not to judge the world, but that the world might be saved through him.",
    );
  });

  it("returns null when no verses match", () => {
    const result = extractVerseText(chapter, 99, 100);
    expect(result).toBeNull();
  });

  it("handles a range that partially overlaps", () => {
    const result = extractVerseText(chapter, 17, 20);
    expect(result).toBe(
      "For God sent his Son into the world, not to judge the world, but that the world might be saved through him.",
    );
  });

  it("works with a single-verse chapter", () => {
    const singleVerse = makeChapterData([
      { number: 1, text: "The only verse." },
    ]);
    expect(extractVerseText(singleVerse, 1, 1)).toBe("The only verse.");
  });

  it("handles empty chapter", () => {
    const empty = makeChapterData([]);
    expect(extractVerseText(empty, 1, 5)).toBeNull();
  });
});
