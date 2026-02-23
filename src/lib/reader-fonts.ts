/**
 * Reader font options — open-source fonts bundled for Bible reading.
 *
 * All fonts are SIL Open Font License and self-hosted via fontsource.
 * WOFF2 variable font files are bundled by Vite and cached by the
 * service worker — no external requests, works fully offline.
 *
 * Fonts are categorized by screen type:
 * - Sans-serif: large x-height, wide spacing — better for mobile/small screens
 * - Serif: traditional book typography — better for extended reading on desktop
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
  { key: "system",       label: "System Default",  family: "system-ui, -apple-system, sans-serif",                          category: "sans" },
  { key: "inter",        label: "Inter",            family: "'Inter Variable', Inter, system-ui, sans-serif",                category: "sans" },
  { key: "source-sans",  label: "Source Sans",      family: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif", category: "sans" },
  { key: "literata",     label: "Literata",         family: "'Literata Variable', Literata, Georgia, serif",                 category: "serif" },
  { key: "source-serif", label: "Source Serif",     family: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif",   category: "serif" },
  { key: "lora",         label: "Lora",             family: "'Lora Variable', Lora, Georgia, serif",                         category: "serif" },
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
