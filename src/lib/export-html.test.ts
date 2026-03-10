import { describe, it, expect } from "vitest";
import { generateNotesHtml, markdownToHtml } from "./export-html";
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
    contentMd: "A great verse about love.",
    isPublic: false,
    isEncrypted: false,
    encryptionIv: null,
    crossReferences: [],
    verseText: null,
    publishStatus: null,
    publishedAt: null,
    rejectionReason: null,
    authorDisplayName: null,
    createdAt: "2026-02-14T12:00:00Z",
    updatedAt: "2026-02-14T12:00:00Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("generateNotesHtml", () => {
  it("generates valid HTML with doctype and structure", () => {
    const html = generateNotesHtml(
      [makeAnnotation()],
      ["For God so loved the world."],
      "Open English Bible (US)",
    );

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<head>");
    expect(html).toContain("<body>");
  });

  it("includes the translation name in the title", () => {
    const html = generateNotesHtml(
      [makeAnnotation()],
      [null],
      "World English Bible",
    );

    expect(html).toContain("World English Bible");
    expect(html).toContain("<title>My Bible Notes");
  });

  it("generates table of contents with links", () => {
    const html = generateNotesHtml(
      [
        makeAnnotation(),
        makeAnnotation({
          id: "test-2",
          anchor: { book: "rom", chapter: 5, verseStart: 8, verseEnd: 8 },
        }),
      ],
      [null, null],
      "OEB",
    );

    expect(html).toContain("Table of Contents");
    expect(html).toContain('href="#note-0"');
    expect(html).toContain('href="#note-1"');
    expect(html).toContain("John 3:16");
    expect(html).toContain("Romans 5:8");
  });

  it("includes verse text in blockquotes", () => {
    const html = generateNotesHtml(
      [makeAnnotation()],
      ["For God so loved the world."],
      "OEB",
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain("For God so loved the world.");
    expect(html).toContain("</blockquote>");
  });

  it("omits blockquote when verse text is null", () => {
    const html = generateNotesHtml(
      [makeAnnotation()],
      [null],
      "OEB",
    );

    expect(html).not.toContain("<blockquote>");
  });

  it("includes inline CSS (self-contained)", () => {
    const html = generateNotesHtml(
      [makeAnnotation()],
      [null],
      "OEB",
    );

    expect(html).toContain("<style>");
    // Should not reference external stylesheets
    expect(html).not.toContain('rel="stylesheet"');
    expect(html).not.toContain("@import");
  });

  it("includes cross-references when present", () => {
    const html = generateNotesHtml(
      [
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
          ],
        }),
      ],
      [null],
      "OEB",
    );

    expect(html).toContain("See also:");
    expect(html).toContain("Romans 5:8");
  });

  it("shows note count in header", () => {
    const html = generateNotesHtml(
      [makeAnnotation(), makeAnnotation({ id: "test-2" })],
      [null, null],
      "OEB",
    );

    expect(html).toContain("2 notes");
  });

  it("uses singular 'note' for single annotation", () => {
    const html = generateNotesHtml(
      [makeAnnotation()],
      [null],
      "OEB",
    );

    expect(html).toContain("1 note");
    expect(html).not.toContain("1 notes");
  });

  it("escapes HTML in user content", () => {
    const html = generateNotesHtml(
      [makeAnnotation({ contentMd: "Test <script>alert('xss')</script>" })],
      [null],
      "OEB",
    );

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("markdownToHtml", () => {
  it("wraps plain text in paragraphs", () => {
    expect(markdownToHtml("Hello world")).toContain("<p>Hello world</p>");
  });

  it("converts bold markdown", () => {
    const result = markdownToHtml("This is **bold** text");
    expect(result).toContain("<strong>bold</strong>");
  });

  it("converts italic markdown", () => {
    const result = markdownToHtml("This is *italic* text");
    expect(result).toContain("<em>italic</em>");
  });

  it("converts unordered lists", () => {
    const result = markdownToHtml("- Item one\n- Item two");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>Item one</li>");
    expect(result).toContain("<li>Item two</li>");
    expect(result).toContain("</ul>");
  });

  it("converts ordered lists", () => {
    const result = markdownToHtml("1. First\n2. Second");
    expect(result).toContain("<ol>");
    expect(result).toContain("<li>First</li>");
    expect(result).toContain("<li>Second</li>");
    expect(result).toContain("</ol>");
  });

  it("converts links", () => {
    const result = markdownToHtml("See [example](https://example.com)");
    expect(result).toContain('<a href="https://example.com">example</a>');
  });

  it("escapes HTML in input", () => {
    const result = markdownToHtml("<b>not bold</b>");
    expect(result).not.toContain("<b>");
    expect(result).toContain("&lt;b&gt;");
  });
});
