/**
 * Annotation export — converts annotations to Markdown files
 * with YAML frontmatter for portability.
 *
 * Export format is designed to be consumable by:
 * - Note-taking apps (Obsidian, Logseq)
 * - AI agents (structured frontmatter)
 * - Any text editor (it's just Markdown)
 *
 * Data ownership principle: users can always take their data with them.
 */

import type { Annotation } from "../types/annotation";
import { BOOK_BY_ID } from "./constants";
import type { BookId } from "../types/bible";

/**
 * Converts a single annotation to a Markdown string with YAML frontmatter.
 *
 * Output format:
 * ```
 * ---
 * verse: "John 3:16"
 * verse_ref: "oeb-us:jhn:3:16"
 * translation: "oeb-us"
 * book: "jhn"
 * chapter: 3
 * verse_start: 16
 * verse_end: 16
 * cross_references:
 *   - "Romans 5:8"
 * created: "2026-02-14T12:00:00Z"
 * updated: "2026-02-14T12:00:00Z"
 * ---
 *
 * Annotation content here...
 * ```
 */
export function annotationToMarkdown(annotation: Annotation): string {
  const bookInfo = BOOK_BY_ID.get(annotation.anchor.book as BookId);
  const bookName = bookInfo?.name ?? annotation.anchor.book;

  // Build the human-readable verse reference
  const verseDisplay =
    annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${bookName} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
      : `${bookName} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;

  // Build the canonical verse reference
  const verseRef =
    annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${annotation.translation}:${annotation.anchor.book}:${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
      : `${annotation.translation}:${annotation.anchor.book}:${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;

  // YAML frontmatter lines
  const frontmatter: string[] = [
    "---",
    `verse: "${verseDisplay}"`,
    `verse_ref: "${verseRef}"`,
    `translation: "${annotation.translation}"`,
    `book: "${annotation.anchor.book}"`,
    `chapter: ${annotation.anchor.chapter}`,
    `verse_start: ${annotation.anchor.verseStart}`,
    `verse_end: ${annotation.anchor.verseEnd}`,
  ];

  // Add cross-references if any
  if (annotation.crossReferences.length > 0) {
    frontmatter.push("cross_references:");
    for (const ref of annotation.crossReferences) {
      const refBook = BOOK_BY_ID.get(ref.book as BookId);
      const refName = refBook?.name ?? ref.book;
      const refDisplay =
        ref.verseStart === ref.verseEnd
          ? `${refName} ${ref.chapter}:${ref.verseStart}`
          : `${refName} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
      frontmatter.push(`  - "${refDisplay}"`);
    }
  }

  frontmatter.push(`created: "${annotation.createdAt}"`);
  frontmatter.push(`updated: "${annotation.updatedAt}"`);
  frontmatter.push("---");

  return frontmatter.join("\n") + "\n\n" + annotation.contentMd + "\n";
}

/**
 * Generates a safe filename for an annotation export.
 * Example: "John_3_16.md" or "John_3_16-18.md"
 */
export function annotationFilename(annotation: Annotation): string {
  const bookInfo = BOOK_BY_ID.get(annotation.anchor.book as BookId);
  const bookName = (bookInfo?.name ?? annotation.anchor.book).replace(
    /\s+/g,
    "_",
  );

  const verseRange =
    annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${annotation.anchor.verseStart}`
      : `${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;

  return `${bookName}_${annotation.anchor.chapter}_${verseRange}.md`;
}

/**
 * Creates a ZIP file containing all annotations as Markdown files.
 * Returns a Blob that can be downloaded.
 */
export async function exportAnnotationsAsZip(
  annotations: Annotation[],
): Promise<Blob> {
  // Dynamic import — only load JSZip when the user actually exports
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Track filenames to avoid collisions (append -2, -3, etc.)
  const usedNames = new Map<string, number>();

  for (const annotation of annotations) {
    let filename = annotationFilename(annotation);

    // Handle duplicate filenames (multiple annotations on same verse)
    const count = usedNames.get(filename) ?? 0;
    if (count > 0) {
      const base = filename.replace(".md", "");
      filename = `${base}-${count + 1}.md`;
    }
    usedNames.set(annotationFilename(annotation), count + 1);

    zip.file(filename, annotationToMarkdown(annotation));
  }

  return zip.generateAsync({ type: "blob" });
}
