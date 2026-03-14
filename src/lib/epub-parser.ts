/**
 * EPUB Bible parser.
 *
 * Parses .epub files containing Bible text. EPUBs are ZIP archives
 * containing XHTML content files. This parser:
 *
 * 1. Unzips with JSZip (dynamically imported to keep bundle small)
 * 2. Reads container.xml to find the OPF (package) file
 * 3. Reads the OPF spine to get content file order
 * 4. Parses each XHTML content file looking for verse structure
 * 5. Maps book names to BookIds via the book-name-aliases module
 *
 * Verse detection strategies (tried in order):
 * - <sup> or <span class="verse"> elements with verse numbers
 * - Leading digit patterns at the start of text nodes
 * - Paragraph-per-verse with embedded verse numbers
 */

import type { ParseResult, ParsedBook, ParsedChapter } from "../types/user-translation";
import type { BookId, Verse } from "../types/bible";
import { resolveBookName } from "./book-name-aliases";

/**
 * Parse an EPUB Bible file.
 *
 * Dynamically imports JSZip (already in dependencies) to avoid
 * loading the zip library until the user actually uploads an EPUB.
 */
export async function parseEpub(file: File): Promise<ParseResult> {
  // Dynamic import — JSZip is only needed when parsing EPUBs
  const JSZip = (await import("jszip")).default;

  const zip = await JSZip.loadAsync(file);
  const warnings: string[] = [];

  // Step 1: Find the OPF file via container.xml
  const containerXml = await readZipFile(zip, "META-INF/container.xml");
  if (!containerXml) {
    return { books: [], warnings: ["Could not find META-INF/container.xml in EPUB"] };
  }

  const opfPath = extractOpfPath(containerXml);
  if (!opfPath) {
    return { books: [], warnings: ["Could not find OPF path in container.xml"] };
  }

  // Step 2: Read the OPF to get the spine (ordered content file list)
  const opfContent = await readZipFile(zip, opfPath);
  if (!opfContent) {
    return { books: [], warnings: [`Could not read OPF file: ${opfPath}`] };
  }

  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
  const contentFiles = extractSpineFiles(opfContent, opfDir);

  if (contentFiles.length === 0) {
    return { books: [], warnings: ["No content files found in EPUB spine"] };
  }

  // Step 3: Parse each content file for Bible text
  const bookMap = new Map<BookId, Map<number, Verse[]>>();
  const bookOriginalNames = new Map<BookId, string>();

  for (const filePath of contentFiles) {
    const xhtml = await readZipFile(zip, filePath);
    if (!xhtml) continue;

    parseXhtmlContent(xhtml, bookMap, bookOriginalNames);
  }

  // Build result from accumulated data
  const books: ParsedBook[] = [];
  for (const [bookId, chapterMap] of bookMap) {
    const chapters: ParsedChapter[] = [];
    const sortedChapters = [...chapterMap.entries()].sort((a, b) => a[0] - b[0]);

    for (const [chapterNum, verses] of sortedChapters) {
      verses.sort((a, b) => a.number - b.number);
      chapters.push({ chapter: chapterNum, verses });
    }

    books.push({
      bookId,
      originalName: bookOriginalNames.get(bookId) ?? bookId,
      chapters,
    });
  }

  if (books.length === 0) {
    warnings.push("No Bible books could be identified in this EPUB");
  }

  return { books, warnings };
}

// ── Internal helpers ──

/** Read a file from the ZIP archive as text. */
async function readZipFile(zip: any, path: string): Promise<string | null> {
  const entry = zip.file(path);
  if (!entry) return null;
  return entry.async("string");
}

/** Extract the OPF file path from container.xml. */
function extractOpfPath(containerXml: string): string | null {
  // Look for: <rootfile full-path="OEBPS/content.opf" .../>
  const match = containerXml.match(/full-path="([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Extract ordered content file paths from the OPF file.
 *
 * Reads the manifest (id → href mapping) and spine (ordered id list),
 * then resolves to full paths relative to the ZIP root.
 */
function extractSpineFiles(opfContent: string, opfDir: string): string[] {
  // Build manifest map: id → href
  const manifestMap = new Map<string, string>();
  const itemRegex = /<item\s[^>]*>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(opfContent)) !== null) {
    const tag = itemMatch[0];
    const idMatch = tag.match(/id="([^"]+)"/);
    const hrefMatch = tag.match(/href="([^"]+)"/);
    const mediaMatch = tag.match(/media-type="([^"]+)"/);

    if (idMatch && hrefMatch && mediaMatch) {
      // Only include XHTML content files
      const mediaType = mediaMatch[1];
      if (mediaType.includes("xhtml") || mediaType.includes("html")) {
        manifestMap.set(idMatch[1], hrefMatch[1]);
      }
    }
  }

  // Read spine order
  const spineIds: string[] = [];
  const itemrefRegex = /<itemref\s[^>]*idref="([^"]+)"[^>]*\/>/g;
  let spineMatch;
  while ((spineMatch = itemrefRegex.exec(opfContent)) !== null) {
    spineIds.push(spineMatch[1]);
  }

  // Resolve to full paths
  return spineIds
    .map((id) => {
      const href = manifestMap.get(id);
      if (!href) return null;
      // Decode URI-encoded paths and resolve relative to OPF directory
      return opfDir + decodeURIComponent(href);
    })
    .filter((p): p is string => p !== null);
}

/**
 * Parse XHTML content looking for Bible text structure.
 *
 * Uses DOMParser to parse the XHTML, then looks for:
 * 1. Book name in headings (h1, h2, h3)
 * 2. Chapter numbers in headings or special elements
 * 3. Verse numbers in <sup>, <span class="verse">, or leading digits
 */
function parseXhtmlContent(
  xhtml: string,
  bookMap: Map<BookId, Map<number, Verse[]>>,
  bookOriginalNames: Map<BookId, string>,
): void {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xhtml, "text/html");

  let currentBookId: BookId | null = null;
  let currentBookName = "";
  let currentChapter = 0;

  // Check title element for book name
  const titleEl = doc.querySelector("title");
  if (titleEl) {
    const titleBookId = resolveBookName(titleEl.textContent?.trim() ?? "");
    if (titleBookId) {
      currentBookId = titleBookId;
      currentBookName = titleEl.textContent?.trim() ?? "";
    }
  }

  // Walk through the document body looking for structure
  const body = doc.body;
  if (!body) return;

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.currentNode;

  while (node) {
    const el = node as Element;
    const tagName = el.tagName?.toLowerCase();

    // Check headings for book names and chapter numbers
    if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
      const text = el.textContent?.trim() ?? "";

      // Try as chapter header: "Chapter 1", "CHAPTER 1", "1" (standalone number)
      const chapterMatch = text.match(/^(?:chapter\s+)?(\d+)$/i);
      if (chapterMatch && currentBookId) {
        currentChapter = parseInt(chapterMatch[1], 10);
        node = walker.nextNode();
        continue;
      }

      // Try as book name
      const bookId = resolveBookName(text);
      if (bookId) {
        currentBookId = bookId;
        currentBookName = text;
        currentChapter = 0;
        node = walker.nextNode();
        continue;
      }

      // Try "Book Chapter" format in headings (e.g., "Genesis 1")
      const bookChapterMatch = text.match(/^(.+?)\s+(\d+)$/);
      if (bookChapterMatch) {
        const bId = resolveBookName(bookChapterMatch[1]);
        if (bId) {
          currentBookId = bId;
          currentBookName = bookChapterMatch[1];
          currentChapter = parseInt(bookChapterMatch[2], 10);
          node = walker.nextNode();
          continue;
        }
      }
    }

    // Check paragraphs and divs for verse content
    if ((tagName === "p" || tagName === "div" || tagName === "span") && currentBookId && currentChapter > 0) {
      const verses = extractVersesFromElement(el);
      if (verses.length > 0) {
        if (!bookMap.has(currentBookId)) {
          bookMap.set(currentBookId, new Map());
          bookOriginalNames.set(currentBookId, currentBookName);
        }
        const chapters = bookMap.get(currentBookId)!;
        if (!chapters.has(currentChapter)) {
          chapters.set(currentChapter, []);
        }
        const existing = chapters.get(currentChapter)!;
        for (const v of verses) {
          // Avoid duplicates (some EPUBs have overlapping elements)
          if (!existing.some((e) => e.number === v.number)) {
            existing.push(v);
          }
        }
      }
    }

    node = walker.nextNode();
  }
}

/**
 * Extract verse numbers and text from an element.
 *
 * Looks for verse markers in several formats:
 * - <sup>1</sup> verse text
 * - <span class="verse">1</span> verse text
 * - <span class="v">1</span> verse text
 * - Leading digit at start of text: "1 In the beginning..."
 */
function extractVersesFromElement(el: Element): Verse[] {
  const verses: Verse[] = [];

  // Strategy 1: Look for <sup> or <span class="verse/v"> children
  const markers = el.querySelectorAll("sup, span.verse, span.v, span.versenum");
  if (markers.length > 0) {
    for (const marker of markers) {
      const numText = marker.textContent?.trim() ?? "";
      const verseNum = parseInt(numText, 10);
      if (isNaN(verseNum) || verseNum < 1) continue;

      // Get text after this marker until the next marker
      let text = "";
      let sibling = marker.nextSibling;
      while (sibling) {
        if (sibling.nodeType === Node.TEXT_NODE) {
          text += sibling.textContent;
        } else if (sibling.nodeType === Node.ELEMENT_NODE) {
          const sibEl = sibling as Element;
          // Stop if we hit another verse marker
          if (
            sibEl.tagName?.toLowerCase() === "sup" ||
            sibEl.classList?.contains("verse") ||
            sibEl.classList?.contains("v") ||
            sibEl.classList?.contains("versenum")
          ) {
            break;
          }
          text += sibEl.textContent;
        }
        sibling = sibling.nextSibling;
      }

      const trimmedText = text.trim();
      if (trimmedText) {
        verses.push({ number: verseNum, text: trimmedText });
      }
    }
    return verses;
  }

  // Strategy 2: Check if the whole paragraph starts with a verse number
  const fullText = el.textContent?.trim() ?? "";
  const leadingMatch = fullText.match(/^(\d+)\s+(.+)/);
  if (leadingMatch) {
    const verseNum = parseInt(leadingMatch[1], 10);
    if (verseNum > 0 && verseNum < 200) {
      verses.push({ number: verseNum, text: leadingMatch[2].trim() });
    }
  }

  return verses;
}
