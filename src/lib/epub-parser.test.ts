import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseEpub } from "./epub-parser";

// Mock JSZip — the parser dynamically imports it and calls JSZip.loadAsync(file)
vi.mock("jszip", () => ({
  default: {
    loadAsync: vi.fn(),
  },
}));

// ── Fixture data ──

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

/** OPF referencing a single XHTML content file */
function makeOpf(items: { id: string; href: string }[]): string {
  const manifestItems = items
    .map((item) => `<item id="${item.id}" href="${item.href}" media-type="application/xhtml+xml"/>`)
    .join("\n    ");
  const spineItems = items.map((item) => `<itemref idref="${item.id}"/>`).join("\n    ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`;
}

const SINGLE_FILE_OPF = makeOpf([{ id: "ch1", href: "chapter1.xhtml" }]);

/** Genesis 1:1-2 with <sup> verse markers */
const GENESIS_XHTML = `<html><body>
<h1>Genesis</h1>
<h2>Chapter 1</h2>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
<p><sup>2</sup> And the earth was without form and void.</p>
</body></html>`;

/** Exodus 1:1-2 with leading-digit verse format (no <sup>) */
const EXODUS_LEADING_DIGITS_XHTML = `<html><body>
<h1>Exodus</h1>
<h2>Chapter 1</h2>
<p>1 Now these are the names of the children of Israel.</p>
<p>2 Reuben, Simeon, Levi, and Judah.</p>
</body></html>`;

/** "Book Chapter" format in a single heading (e.g., "Genesis 1") */
const BOOK_CHAPTER_HEADING_XHTML = `<html><body>
<h2>Exodus 3</h2>
<p><sup>1</sup> Now Moses was keeping the flock of Jethro his father-in-law.</p>
<p><sup>2</sup> And the angel of the LORD appeared to him in a flame of fire.</p>
</body></html>`;

// ── Test helpers ──

/**
 * Build a mock ZIP object matching the interface JSZip.loadAsync returns.
 * The parser calls zip.file(path) to get an entry, then entry.async("string")
 * to read the content. Returns null for missing paths (just like real JSZip).
 */
function mockZip(files: Record<string, string>) {
  return {
    file: (path: string) => {
      const content = files[path];
      if (!content) return null;
      return { async: () => Promise.resolve(content) };
    },
  };
}

/** Configure the JSZip mock to return a specific zip structure. */
async function setMockZip(files: Record<string, string>) {
  const JSZip = (await import("jszip")).default;
  (JSZip.loadAsync as ReturnType<typeof vi.fn>).mockResolvedValue(mockZip(files));
}

/** Convenience: a File object for the mock (content is irrelevant since JSZip is mocked). */
function dummyFile(): File {
  return new File([""], "test.epub", { type: "application/epub+zip" });
}

// ── Tests ──

describe("parseEpub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("minimal EPUB parsing (container.xml -> OPF -> XHTML)", () => {
    it("parses a complete EPUB with one book, one chapter, and two verses", async () => {
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": GENESIS_XHTML,
      });

      const result = await parseEpub(dummyFile());

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

    it("returns no warnings for a well-formed EPUB", async () => {
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": GENESIS_XHTML,
      });

      const result = await parseEpub(dummyFile());
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("book name detection in headings", () => {
    it("finds book names in <h1> elements", async () => {
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": GENESIS_XHTML,
      });

      const result = await parseEpub(dummyFile());
      expect(result.books[0].bookId).toBe("gen");
      expect(result.books[0].originalName).toBe("Genesis");
    });

    it("finds book names in <h2> elements via 'Book Chapter' format", async () => {
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": BOOK_CHAPTER_HEADING_XHTML,
      });

      const result = await parseEpub(dummyFile());
      expect(result.books[0].bookId).toBe("exo");
      expect(result.books[0].originalName).toBe("Exodus");
    });
  });

  describe("chapter number detection", () => {
    it("extracts chapter number from 'Chapter N' headings", async () => {
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": GENESIS_XHTML,
      });

      const result = await parseEpub(dummyFile());
      expect(result.books[0].chapters[0].chapter).toBe(1);
    });

    it("extracts chapter number from 'Book Chapter' combined headings", async () => {
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": BOOK_CHAPTER_HEADING_XHTML,
      });

      const result = await parseEpub(dummyFile());
      // "Exodus 3" should yield chapter 3
      expect(result.books[0].chapters[0].chapter).toBe(3);
    });
  });

  describe("verse extraction from <sup> elements", () => {
    it("extracts verse numbers and text from <sup> markers", async () => {
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": GENESIS_XHTML,
      });

      const result = await parseEpub(dummyFile());
      const verses = result.books[0].chapters[0].verses;

      expect(verses[0].number).toBe(1);
      expect(verses[0].text).toContain("In the beginning");
      expect(verses[1].number).toBe(2);
      expect(verses[1].text).toContain("without form");
    });

    it("handles multiple <sup> markers within a single paragraph", async () => {
      const multiVerseP = `<html><body>
<h1>Genesis</h1>
<h2>Chapter 2</h2>
<p><sup>1</sup> Thus the heavens and the earth were finished.<sup>2</sup> And on the seventh day God finished his work.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": multiVerseP,
      });

      const result = await parseEpub(dummyFile());
      const verses = result.books[0].chapters[0].verses;

      expect(verses).toHaveLength(2);
      expect(verses[0]).toEqual({
        number: 1,
        text: "Thus the heavens and the earth were finished.",
      });
      expect(verses[1]).toEqual({
        number: 2,
        text: "And on the seventh day God finished his work.",
      });
    });
  });

  describe("verse extraction from leading digits in paragraphs", () => {
    it("detects verses from paragraphs starting with a digit followed by text", async () => {
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": EXODUS_LEADING_DIGITS_XHTML,
      });

      const result = await parseEpub(dummyFile());
      const verses = result.books[0].chapters[0].verses;

      expect(verses).toHaveLength(2);
      expect(verses[0]).toEqual({
        number: 1,
        text: "Now these are the names of the children of Israel.",
      });
      expect(verses[1]).toEqual({
        number: 2,
        text: "Reuben, Simeon, Levi, and Judah.",
      });
    });
  });

  describe("'Book Chapter' format in headings", () => {
    it("parses 'Genesis 1' as book=Genesis, chapter=1", async () => {
      const bookChapterXhtml = `<html><body>
<h2>Genesis 1</h2>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": bookChapterXhtml,
      });

      const result = await parseEpub(dummyFile());
      expect(result.books[0].bookId).toBe("gen");
      expect(result.books[0].chapters[0].chapter).toBe(1);
    });

    it("parses '1 Corinthians 13' correctly (numbered book with chapter)", async () => {
      const corinthiansXhtml = `<html><body>
<h2>1 Corinthians 13</h2>
<p><sup>1</sup> If I speak in the tongues of men and of angels, but have not love, I am a noisy gong.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": corinthiansXhtml,
      });

      const result = await parseEpub(dummyFile());
      expect(result.books[0].bookId).toBe("1co");
      expect(result.books[0].chapters[0].chapter).toBe(13);
    });
  });

  describe("warning: container.xml is missing", () => {
    it("returns a warning and no books when container.xml is absent", async () => {
      // ZIP has no META-INF/container.xml
      await setMockZip({});

      const result = await parseEpub(dummyFile());

      expect(result.books).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("container.xml");
    });
  });

  describe("warning: OPF file is missing", () => {
    it("returns a warning when the OPF path from container.xml cannot be read", async () => {
      // container.xml points to an OPF that doesn't exist in the ZIP
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        // OEBPS/content.opf is missing
      });

      const result = await parseEpub(dummyFile());

      expect(result.books).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("OPF");
    });
  });

  describe("warning: no books found", () => {
    it("returns a warning when XHTML contains no recognizable Bible structure", async () => {
      const emptyXhtml = `<html><body><p>Just some random text, no Bible structure here.</p></body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": emptyXhtml,
      });

      const result = await parseEpub(dummyFile());

      expect(result.books).toHaveLength(0);
      expect(result.warnings.some((w) => w.includes("No Bible books"))).toBe(true);
    });
  });

  describe("multiple books across multiple XHTML files", () => {
    it("parses two books from two separate XHTML files in spine order", async () => {
      const twoFileOpf = makeOpf([
        { id: "gen", href: "genesis.xhtml" },
        { id: "exo", href: "exodus.xhtml" },
      ]);

      const genesisXhtml = `<html><body>
<h1>Genesis</h1>
<h2>Chapter 1</h2>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
</body></html>`;

      const exodusXhtml = `<html><body>
<h1>Exodus</h1>
<h2>Chapter 1</h2>
<p><sup>1</sup> Now these are the names of the children of Israel.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": twoFileOpf,
        "OEBPS/genesis.xhtml": genesisXhtml,
        "OEBPS/exodus.xhtml": exodusXhtml,
      });

      const result = await parseEpub(dummyFile());

      expect(result.books).toHaveLength(2);
      expect(result.books[0].bookId).toBe("gen");
      expect(result.books[0].originalName).toBe("Genesis");
      expect(result.books[0].chapters[0].verses[0].text).toContain("In the beginning");
      expect(result.books[1].bookId).toBe("exo");
      expect(result.books[1].originalName).toBe("Exodus");
      expect(result.books[1].chapters[0].verses[0].text).toContain("names of the children");
    });

    it("handles multiple chapters within a single XHTML file", async () => {
      const twoChapterXhtml = `<html><body>
<h1>Genesis</h1>
<h2>Chapter 1</h2>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
<h2>Chapter 2</h2>
<p><sup>1</sup> Thus the heavens and the earth were finished.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": twoChapterXhtml,
      });

      const result = await parseEpub(dummyFile());

      expect(result.books).toHaveLength(1);
      expect(result.books[0].chapters).toHaveLength(2);
      expect(result.books[0].chapters[0].chapter).toBe(1);
      expect(result.books[0].chapters[1].chapter).toBe(2);
    });

    it("handles two books within the same XHTML file", async () => {
      const twoBooksOneFile = `<html><body>
<h1>Genesis</h1>
<h2>Chapter 1</h2>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
<h1>Exodus</h1>
<h2>Chapter 1</h2>
<p><sup>1</sup> Now these are the names of the children of Israel.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": twoBooksOneFile,
      });

      const result = await parseEpub(dummyFile());

      expect(result.books).toHaveLength(2);
      expect(result.books[0].bookId).toBe("gen");
      expect(result.books[1].bookId).toBe("exo");
    });
  });

  describe("edge cases", () => {
    it("skips XHTML files that are missing from the ZIP (gracefully)", async () => {
      // Spine references chapter1.xhtml but the file doesn't exist in the ZIP
      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        // OEBPS/chapter1.xhtml is missing
      });

      const result = await parseEpub(dummyFile());

      // Should not throw — just produces no books and a warning
      expect(result.books).toHaveLength(0);
      expect(result.warnings.some((w) => w.includes("No Bible books"))).toBe(true);
    });

    it("returns a warning when container.xml has no full-path attribute", async () => {
      const badContainer = `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

      await setMockZip({
        "META-INF/container.xml": badContainer,
      });

      const result = await parseEpub(dummyFile());

      expect(result.books).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("OPF path");
    });

    it("returns a warning when the OPF spine is empty", async () => {
      const emptySpineOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest></manifest>
  <spine></spine>
</package>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": emptySpineOpf,
      });

      const result = await parseEpub(dummyFile());

      expect(result.books).toHaveLength(0);
      expect(result.warnings.some((w) => w.includes("No content files"))).toBe(true);
    });

    it("sorts chapters numerically even if encountered out of order", async () => {
      const outOfOrderXhtml = `<html><body>
<h1>Genesis</h1>
<h2>Chapter 3</h2>
<p><sup>1</sup> Now the serpent was more crafty than any other beast.</p>
<h2>Chapter 1</h2>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
<h2>Chapter 2</h2>
<p><sup>1</sup> Thus the heavens and the earth were finished.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": outOfOrderXhtml,
      });

      const result = await parseEpub(dummyFile());
      const chapters = result.books[0].chapters;

      expect(chapters[0].chapter).toBe(1);
      expect(chapters[1].chapter).toBe(2);
      expect(chapters[2].chapter).toBe(3);
    });

    it("sorts verses numerically within a chapter", async () => {
      const outOfOrderVerses = `<html><body>
<h1>Genesis</h1>
<h2>Chapter 1</h2>
<p><sup>3</sup> And God said, Let there be light.</p>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
<p><sup>2</sup> And the earth was without form and void.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": outOfOrderVerses,
      });

      const result = await parseEpub(dummyFile());
      const verses = result.books[0].chapters[0].verses;

      expect(verses[0].number).toBe(1);
      expect(verses[1].number).toBe(2);
      expect(verses[2].number).toBe(3);
    });

    it("does not create duplicate verses when EPUB has overlapping elements", async () => {
      // Two paragraphs both claim verse 1 — only the first should be kept
      const dupeXhtml = `<html><body>
<h1>Genesis</h1>
<h2>Chapter 1</h2>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
<p><sup>2</sup> And the earth was without form and void.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": dupeXhtml,
      });

      const result = await parseEpub(dummyFile());
      const verses = result.books[0].chapters[0].verses;

      // Should deduplicate: only one verse 1
      const verse1Count = verses.filter((v) => v.number === 1).length;
      expect(verse1Count).toBe(1);
      expect(verses).toHaveLength(2);
    });

    it("ignores <sup> elements with non-numeric content", async () => {
      const nonNumericSup = `<html><body>
<h1>Genesis</h1>
<h2>Chapter 1</h2>
<p><sup>a</sup> This is a footnote marker, not a verse.</p>
<p><sup>1</sup> In the beginning God created the heavens and the earth.</p>
</body></html>`;

      await setMockZip({
        "META-INF/container.xml": CONTAINER_XML,
        "OEBPS/content.opf": SINGLE_FILE_OPF,
        "OEBPS/chapter1.xhtml": nonNumericSup,
      });

      const result = await parseEpub(dummyFile());
      const verses = result.books[0].chapters[0].verses;

      // Only verse 1 should be extracted — "a" is not a valid verse number
      expect(verses).toHaveLength(1);
      expect(verses[0].number).toBe(1);
    });
  });
});
