/**
 * Annotation export — dual-format (HTML + Markdown) with verse text.
 *
 * Export produces a single zip containing:
 * - My Notes.html — self-contained, beautiful, works in any browser
 * - notes/*.md — structured Markdown files for Obsidian/Logseq
 *
 * Data ownership principle: users can always take their data with them.
 */

import type { Annotation } from "../types/annotation";
import type { TranslationToggles } from "./translation-toggles";
import { applyTranslationToggles } from "./translation-toggles";
import { BOOK_BY_ID, BIBLE_BASE_PATH } from "./constants";
import type { BookId } from "../types/bible";
import type { ChapterData } from "../types/bible";
import { extractVerseText } from "./verse-text";
import { generateNotesHtml } from "./export-html";

/** Everything the export engine needs to produce a zip. */
export interface ExportContext {
  annotations: Annotation[];
  translationId: string;
  translationName: string;
  toggles: TranslationToggles;
}

/**
 * Resolves the verse text for an annotation, applying translation toggles.
 *
 * Priority:
 * 1. If annotation has stored verseText AND same translation → use it
 * 2. Otherwise → fetch from static JSON and extract
 * 3. Returns null if all attempts fail
 *
 * Caches fetched chapters in the provided Map to avoid duplicate fetches.
 */
export async function resolveVerseText(
  annotation: Annotation,
  translationId: string,
  toggles: TranslationToggles,
  chapterCache: Map<string, ChapterData | null>,
): Promise<string | null> {
  // If annotation has stored verse text and matches the export translation, use it
  if (annotation.verseText && annotation.translation === translationId) {
    return applyTranslationToggles(annotation.verseText, toggles);
  }

  // Otherwise fetch from static JSON
  const cacheKey = `${translationId}:${annotation.anchor.book}:${annotation.anchor.chapter}`;

  if (!chapterCache.has(cacheKey)) {
    try {
      const url = `${BIBLE_BASE_PATH}/${translationId}/${annotation.anchor.book}/${annotation.anchor.chapter}.json`;
      const response = await fetch(url);
      if (response.ok) {
        chapterCache.set(cacheKey, (await response.json()) as ChapterData);
      } else {
        chapterCache.set(cacheKey, null);
      }
    } catch {
      chapterCache.set(cacheKey, null);
    }
  }

  const chapterData = chapterCache.get(cacheKey);
  if (!chapterData) return null;

  const raw = extractVerseText(
    chapterData,
    annotation.anchor.verseStart,
    annotation.anchor.verseEnd,
  );
  if (!raw) return null;

  return applyTranslationToggles(raw, toggles);
}

/**
 * Converts a single annotation to Markdown with YAML frontmatter.
 *
 * New format: human-readable frontmatter, verse text as blockquote.
 */
export function annotationToMarkdown(
  annotation: Annotation,
  verseText: string | null,
  translationName: string,
): string {
  const bookInfo = BOOK_BY_ID.get(annotation.anchor.book as BookId);
  const bookName = bookInfo?.name ?? annotation.anchor.book;

  const verseDisplay =
    annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${bookName} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
      : `${bookName} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;

  // Human-readable dates
  const created = formatDate(annotation.createdAt);
  const updated = formatDate(annotation.updatedAt);

  // YAML frontmatter — clean, human-readable
  const frontmatter: string[] = [
    "---",
    `verse: "${verseDisplay}"`,
    `translation: "${translationName}"`,
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

  frontmatter.push(`created: "${created}"`);
  frontmatter.push(`updated: "${updated}"`);
  frontmatter.push("---");

  // Body: verse text as blockquote, then user's note
  const parts: string[] = [frontmatter.join("\n"), ""];

  if (verseText) {
    parts.push(`> ${verseText}`, "");
  }

  parts.push(annotation.contentMd, "");

  return parts.join("\n");
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
 * Creates a dual-format ZIP: My Notes.html + notes/*.md files.
 * Returns a Blob that can be downloaded.
 */
export async function exportAnnotationsAsZip(
  context: ExportContext,
): Promise<Blob> {
  const { annotations, translationId, translationName, toggles } = context;

  // Dynamic import — only load JSZip when the user actually exports
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Resolve verse text for all annotations (with chapter caching)
  const chapterCache = new Map<string, ChapterData | null>();
  const verseTexts = await Promise.all(
    annotations.map((a) => resolveVerseText(a, translationId, toggles, chapterCache)),
  );

  // Generate HTML file
  const html = generateNotesHtml(annotations, verseTexts, translationName);
  zip.file("My Notes.html", html);

  // Generate Markdown files in notes/ folder
  const notesFolder = zip.folder("notes")!;
  const usedNames = new Map<string, number>();

  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    let filename = annotationFilename(annotation);

    // Handle duplicate filenames
    const count = usedNames.get(filename) ?? 0;
    if (count > 0) {
      const base = filename.replace(".md", "");
      filename = `${base}-${count + 1}.md`;
    }
    usedNames.set(annotationFilename(annotation), count + 1);

    notesFolder.file(
      filename,
      annotationToMarkdown(annotation, verseTexts[i], translationName),
    );
  }

  return zip.generateAsync({ type: "blob" });
}

/** Format an ISO date string to a human-readable date. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
