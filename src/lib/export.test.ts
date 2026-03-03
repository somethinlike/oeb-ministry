import { describe, it, expect } from "vitest";
import { annotationToMarkdown, annotationFilename } from "./export";
import type { Annotation } from "../types/annotation";

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "test-id",
    userId: "user-1",
    translation: "oeb-us",
    anchor: {
      book: "jhn",
      chapter: 3,
      verseStart: 16,
      verseEnd: 16,
    },
    contentMd: "For God so loved the world.",
    isPublic: false,
    crossReferences: [],
    verseText: null,
    createdAt: "2026-02-14T12:00:00Z",
    updatedAt: "2026-02-14T12:00:00Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("annotationToMarkdown", () => {
  it("generates valid YAML frontmatter with single verse", () => {
    const md = annotationToMarkdown(
      makeAnnotation(),
      null,
      "Open English Bible (US)",
    );

    expect(md).toContain("---");
    expect(md).toContain('verse: "John 3:16"');
    expect(md).toContain('translation: "Open English Bible (US)"');
    expect(md).toContain("For God so loved the world.");
  });

  it("handles verse ranges", () => {
    const md = annotationToMarkdown(
      makeAnnotation({
        anchor: { book: "jhn", chapter: 3, verseStart: 16, verseEnd: 18 },
      }),
      null,
      "Open English Bible (US)",
    );

    expect(md).toContain('verse: "John 3:16-18"');
  });

  it("includes cross-references", () => {
    const md = annotationToMarkdown(
      makeAnnotation({
        crossReferences: [
          {
            id: "ref-1",
            annotationId: "test-id",
            book: "rom",
            chapter: 5,
            verseStart: 8,
            verseEnd: 8,
          },
          {
            id: "ref-2",
            annotationId: "test-id",
            book: "1jn",
            chapter: 4,
            verseStart: 9,
            verseEnd: 10,
          },
        ],
      }),
      null,
      "Open English Bible (US)",
    );

    expect(md).toContain("cross_references:");
    expect(md).toContain('  - "Romans 5:8"');
    expect(md).toContain('  - "1 John 4:9-10"');
  });

  it("includes human-readable timestamps", () => {
    const md = annotationToMarkdown(
      makeAnnotation(),
      null,
      "Open English Bible (US)",
    );

    // Should be formatted as "February 14, 2026" not ISO
    expect(md).toContain('created: "February 14, 2026"');
    expect(md).toContain('updated: "February 14, 2026"');
  });

  it("includes verse text as blockquote when provided", () => {
    const md = annotationToMarkdown(
      makeAnnotation(),
      "For God so loved the world that he gave his one and only Son.",
      "Open English Bible (US)",
    );

    expect(md).toContain(
      "> For God so loved the world that he gave his one and only Son.",
    );
  });

  it("omits blockquote when verse text is null", () => {
    const md = annotationToMarkdown(
      makeAnnotation(),
      null,
      "Open English Bible (US)",
    );

    expect(md).not.toContain("> ");
  });

  it("uses full translation name instead of ID", () => {
    const md = annotationToMarkdown(
      makeAnnotation(),
      null,
      "World English Bible",
    );

    expect(md).toContain('translation: "World English Bible"');
    expect(md).not.toContain("oeb-us");
  });

  it("ends with a newline", () => {
    const md = annotationToMarkdown(
      makeAnnotation(),
      null,
      "Open English Bible (US)",
    );
    expect(md.endsWith("\n")).toBe(true);
  });
});

describe("annotationFilename", () => {
  it("generates filename for single verse", () => {
    const result = annotationFilename(makeAnnotation());
    expect(result).toBe("John_3_16.md");
  });

  it("generates filename for verse range", () => {
    const result = annotationFilename(
      makeAnnotation({
        anchor: { book: "jhn", chapter: 3, verseStart: 16, verseEnd: 18 },
      }),
    );
    expect(result).toBe("John_3_16-18.md");
  });

  it("handles numbered books", () => {
    const result = annotationFilename(
      makeAnnotation({
        anchor: { book: "1co", chapter: 13, verseStart: 4, verseEnd: 4 },
      }),
    );
    expect(result).toBe("1_Corinthians_13_4.md");
  });

  it("handles multi-word book names", () => {
    const result = annotationFilename(
      makeAnnotation({
        anchor: { book: "sng", chapter: 1, verseStart: 1, verseEnd: 1 },
      }),
    );
    expect(result).toBe("Song_of_Solomon_1_1.md");
  });
});
