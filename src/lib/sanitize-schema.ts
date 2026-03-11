/**
 * Custom HTML sanitization for OEB Ministry.
 *
 * Two layers of defense:
 * 1. Render-time: rehype-sanitize with this schema strips dangerous HTML
 *    every time markdown is rendered in the browser (editor preview,
 *    community notes, etc.).
 * 2. Publish-time: sanitizeMarkdownForPublishing() strips dangerous raw
 *    HTML from the markdown source text before it's stored as public
 *    content. Defense-in-depth — even if a render bug bypasses layer 1,
 *    the stored content is already clean.
 *
 * Safe HTML allowlist (from CLAUDE.md):
 *   <mark>, <details>, <summary>, <sup>, <sub>, <abbr>, <blockquote>,
 *   <table>, <thead>, <tbody>, <tr>, <th>, <td>, <br>, <hr>
 *
 * Always stripped:
 *   <script>, <iframe>, <object>, <embed>, <form>, <input>, <style>,
 *   on* event attributes, javascript: URLs
 */

import { defaultSchema } from "rehype-sanitize";
import type { Options as SanitizeOptions } from "rehype-sanitize";

/**
 * Custom sanitize schema extending GitHub's default.
 *
 * The default schema already includes most tags we need (details, summary,
 * sup, sub, blockquote, table family, br, hr). We add:
 * - <mark> for highlighting passages
 * - <abbr> for abbreviations (with title attribute for hover definitions)
 *
 * We remove <input> from the default (CLAUDE.md says strip it — GFM task
 * list checkboxes aren't needed in Bible study notes).
 */
export const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [
    // Keep all default tags except <input>
    ...(defaultSchema.tagNames ?? []).filter((tag) => tag !== "input"),
    // Add safe tags not in the default schema
    "mark",
    "abbr",
  ],
  attributes: {
    ...defaultSchema.attributes,
    // Allow title on <abbr> for hover definitions (e.g., <abbr title="Old Testament">OT</abbr>)
    abbr: [...(defaultSchema.attributes?.abbr ?? []), "title"],
    // Remove the input attribute config since we stripped the tag
    input: undefined as never,
  },
};

// ---------------------------------------------------------------------------
// Publish-boundary sanitization (defense-in-depth)
// ---------------------------------------------------------------------------

/**
 * HTML tags that must never appear in published content.
 * These are stripped from raw markdown source at the publish boundary.
 */
const DANGEROUS_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "style",
  "link",
  "meta",
  "base",
  "applet",
  "frame",
  "frameset",
];

/**
 * Strips dangerous HTML from raw markdown content before publishing.
 *
 * This runs at the publish boundary (submitForPublishing) as a second
 * line of defense. The primary sanitization happens at render time via
 * rehype-sanitize — this function ensures the stored markdown itself
 * is clean of known-dangerous elements.
 *
 * What it does:
 * 1. Removes opening and closing tags for dangerous elements
 * 2. Strips on* event attributes (onclick, onerror, etc.)
 * 3. Neutralizes javascript: URLs in href/src attributes
 */
export function sanitizeMarkdownForPublishing(markdown: string): string {
  let result = markdown;

  // Strip dangerous tags — opening tags (with any attributes) and closing tags
  for (const tag of DANGEROUS_TAGS) {
    const opening = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
    const closing = new RegExp(`</${tag}\\s*>`, "gi");
    result = result.replace(opening, "");
    result = result.replace(closing, "");
  }

  // Strip on* event attributes from any remaining HTML tags
  // Matches: onclick="...", onerror='...', onload=something
  result = result.replace(
    /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi,
    "",
  );

  // Neutralize javascript: URLs in href/src attributes
  // Replaces the dangerous URL with an empty string
  result = result.replace(
    /(href|src)\s*=\s*["']?\s*javascript:[^"'>\s]*/gi,
    '$1=""',
  );

  return result;
}
