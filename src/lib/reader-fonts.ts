/**
 * Reader font options — system/web-safe fonts for Bible reading.
 *
 * Fonts are categorized by screen type:
 * - Sans-serif: large x-height, wide spacing — better for mobile/small screens
 * - Serif: traditional book typography — better for extended reading on desktop
 *
 * Only system/web-safe fonts (no web font downloads) because this is
 * an offline-first PWA. Every font listed here is pre-installed on
 * virtually all devices.
 */

import type { ReaderFont } from "./workspace-prefs";

export interface FontOption {
  key: ReaderFont;
  /** User-facing name shown in the dropdown */
  label: string;
  /** CSS font-family value with fallback chain */
  family: string;
  /** Used for viewport-aware ordering (sans first on mobile, serif first on desktop) */
  category: "sans" | "serif";
}

/** All available font options */
export const FONT_OPTIONS: readonly FontOption[] = [
  { key: "system",    label: "System Default", family: "system-ui, -apple-system, sans-serif",                       category: "sans" },
  { key: "verdana",   label: "Verdana",        family: "Verdana, Geneva, sans-serif",                                category: "sans" },
  { key: "trebuchet", label: "Trebuchet",       family: "'Trebuchet MS', Helvetica, sans-serif",                      category: "sans" },
  { key: "georgia",   label: "Georgia",         family: "Georgia, 'Times New Roman', serif",                          category: "serif" },
  { key: "charter",   label: "Charter",         family: "'Bitstream Charter', 'Book Antiqua', Georgia, serif",        category: "serif" },
  { key: "palatino",  label: "Palatino",        family: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif",       category: "serif" },
];

/**
 * Get the CSS font-family string for a given font key.
 * Returns the system default stack if the key is not found (defensive).
 */
export function getFontFamily(key: ReaderFont): string {
  return FONT_OPTIONS.find((f) => f.key === key)?.family ?? FONT_OPTIONS[0].family;
}

/**
 * Get font options ordered by viewport type.
 *
 * Mobile (< 1024px): sans-serif first — larger x-height and wider spacing
 * read better on small screens.
 * Desktop (>= 1024px): serif first — traditional book typography is better
 * for extended reading on large displays.
 *
 * Uses window.matchMedia matching the project's lg: breakpoint (1024px).
 */
export function getOrderedFontOptions(): FontOption[] {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 1023px)").matches;

  const sans = FONT_OPTIONS.filter((f) => f.category === "sans");
  const serif = FONT_OPTIONS.filter((f) => f.category === "serif");

  return isMobile ? [...sans, ...serif] : [...serif, ...sans];
}
