/**
 * HTML export generator — creates a self-contained, beautiful HTML file
 * from annotations with verse text.
 *
 * Design principles:
 * - Self-contained: inline CSS, no external dependencies
 * - Responsive: works on phone, tablet, and desktop
 * - System fonts: renders immediately, no font loading
 * - Clean typography: easy to read and print
 */

import type { Annotation } from "../types/annotation";
import { BOOK_BY_ID } from "./constants";
import type { BookId } from "../types/bible";

/**
 * Generates a complete self-contained HTML document from annotations.
 *
 * Structure: header → table of contents → notes
 */
export function generateNotesHtml(
  annotations: Annotation[],
  verseTexts: (string | null)[],
  translationName: string,
): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const noteCards = annotations
    .map((a, i) => renderNote(a, verseTexts[i], i))
    .join("\n");

  const tocEntries = annotations
    .map((a, i) => {
      const display = verseDisplay(a);
      return `      <li><a href="#note-${i}">${escapeHtml(display)}</a></li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Bible Notes — ${escapeHtml(translationName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #f8f9fa;
      padding: 2rem 1rem;
    }
    .container { max-width: 48rem; margin: 0 auto; }
    header { text-align: center; margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 2px solid #e5e7eb; }
    header h1 { font-size: 1.75rem; font-weight: 700; color: #111827; margin-bottom: 0.25rem; }
    header p { font-size: 0.875rem; color: #6b7280; }
    .toc { margin-bottom: 2.5rem; }
    .toc h2 { font-size: 1.125rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem; }
    .toc ol { padding-left: 1.5rem; }
    .toc li { margin-bottom: 0.25rem; }
    .toc a { color: #2563eb; text-decoration: none; font-size: 0.9rem; }
    .toc a:hover { text-decoration: underline; }
    .note { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1.25rem; }
    .note h3 { font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem; }
    .note h3 a { color: inherit; text-decoration: none; }
    .note blockquote {
      border-left: 3px solid #2563eb;
      padding: 0.75rem 1rem;
      margin: 0.75rem 0;
      background: #eff6ff;
      color: #1e40af;
      font-style: italic;
      border-radius: 0 0.25rem 0.25rem 0;
      line-height: 1.7;
    }
    .note .content { color: #374151; line-height: 1.7; }
    .note .content p { margin-bottom: 0.5rem; }
    .note .content p:last-child { margin-bottom: 0; }
    .note .content strong { font-weight: 600; }
    .note .content em { font-style: italic; }
    .note .content a { color: #2563eb; text-decoration: underline; }
    .note .content ul, .note .content ol { padding-left: 1.5rem; margin-bottom: 0.5rem; }
    .note .meta { font-size: 0.75rem; color: #9ca3af; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid #f3f4f6; }
    .note .cross-refs { font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem; }
    footer { text-align: center; padding-top: 1.5rem; border-top: 2px solid #e5e7eb; margin-top: 1rem; }
    footer p { font-size: 0.75rem; color: #9ca3af; }
    @media print {
      body { background: #fff; padding: 0; }
      .note { break-inside: avoid; border: 1px solid #ccc; }
    }
    @media (max-width: 640px) {
      body { padding: 1rem 0.75rem; }
      .note { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>My Bible Notes</h1>
      <p>${escapeHtml(translationName)} &middot; Exported ${escapeHtml(date)} &middot; ${annotations.length} note${annotations.length !== 1 ? "s" : ""}</p>
    </header>

    <nav class="toc">
      <h2>Table of Contents</h2>
      <ol>
${tocEntries}
      </ol>
    </nav>

${noteCards}

    <footer>
      <p>Exported from OEB Ministry &middot; Your notes, your data</p>
    </footer>
  </div>
</body>
</html>`;
}

/** Render a single note card. */
function renderNote(
  annotation: Annotation,
  verseText: string | null,
  index: number,
): string {
  const display = verseDisplay(annotation);
  const date = formatDateShort(annotation.updatedAt);

  const blockquote = verseText
    ? `      <blockquote>${escapeHtml(verseText)}</blockquote>`
    : "";

  const content = markdownToHtml(annotation.contentMd);

  const crossRefs = annotation.crossReferences.length > 0
    ? `      <div class="cross-refs">See also: ${annotation.crossReferences.map(crossRefDisplay).map(escapeHtml).join(", ")}</div>`
    : "";

  return `    <article class="note" id="note-${index}">
      <h3><a href="#note-${index}">${escapeHtml(display)}</a></h3>
${blockquote}
      <div class="content">${content}</div>
${crossRefs}
      <div class="meta">Last updated ${escapeHtml(date)}</div>
    </article>`;
}

/** Build human-readable verse display string. */
function verseDisplay(annotation: Annotation): string {
  const bookInfo = BOOK_BY_ID.get(annotation.anchor.book as BookId);
  const bookName = bookInfo?.name ?? annotation.anchor.book;
  return annotation.anchor.verseStart === annotation.anchor.verseEnd
    ? `${bookName} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
    : `${bookName} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;
}

/** Build cross-reference display string. */
function crossRefDisplay(ref: { book: string; chapter: number; verseStart: number; verseEnd: number }): string {
  const bookInfo = BOOK_BY_ID.get(ref.book as BookId);
  const bookName = bookInfo?.name ?? ref.book;
  return ref.verseStart === ref.verseEnd
    ? `${bookName} ${ref.chapter}:${ref.verseStart}`
    : `${bookName} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
}

/**
 * Minimal Markdown to HTML converter for note content.
 * Handles: bold, italic, links, unordered/ordered lists, paragraphs.
 * Not a full Markdown parser — just enough for typical note content.
 */
export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const htmlParts: string[] = [];
  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Blank line — close any open list
    if (!trimmed) {
      if (inUl) { htmlParts.push("</ul>"); inUl = false; }
      if (inOl) { htmlParts.push("</ol>"); inOl = false; }
      continue;
    }

    // Unordered list item
    const ulMatch = trimmed.match(/^[-*+]\s+(.*)/);
    if (ulMatch) {
      if (inOl) { htmlParts.push("</ol>"); inOl = false; }
      if (!inUl) { htmlParts.push("<ul>"); inUl = true; }
      htmlParts.push(`<li>${inlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list item
    const olMatch = trimmed.match(/^\d+[.)]\s+(.*)/);
    if (olMatch) {
      if (inUl) { htmlParts.push("</ul>"); inUl = false; }
      if (!inOl) { htmlParts.push("<ol>"); inOl = true; }
      htmlParts.push(`<li>${inlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    // Regular paragraph
    if (inUl) { htmlParts.push("</ul>"); inUl = false; }
    if (inOl) { htmlParts.push("</ol>"); inOl = false; }
    htmlParts.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  }

  // Close any trailing list
  if (inUl) htmlParts.push("</ul>");
  if (inOl) htmlParts.push("</ol>");

  return htmlParts.join("\n");
}

/** Process inline Markdown: bold, italic, links. */
function inlineMarkdown(text: string): string {
  let result = escapeHtml(text);
  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__(.+?)__/g, "<strong>$1</strong>");
  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");
  // Links: [text](url)
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  return result;
}

/** Escape HTML special characters. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format ISO date to short form. */
function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
