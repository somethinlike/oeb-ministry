/**
 * Theme system — manages color mode (light/dark) and denomination accent themes.
 *
 * Two independent axes:
 * - **Color mode**: "system" (auto-detect), "light", or "dark"
 * - **Color theme**: "default" (blue), "lutheran" (red), "catholic" (purple), "orthodox" (green)
 *
 * The anti-flash script in BaseLayout.astro reads these from localStorage
 * and applies the right CSS classes before first paint. This module provides
 * the runtime API for changing themes after page load.
 *
 * CSS custom properties in global.css define the actual colors for each
 * combination. Tailwind @theme maps them to utility classes (bg-surface,
 * text-heading, etc.) so components use semantic tokens instead of hardcoded
 * gray-900 / blue-600 / white classes.
 */

// ── Types ──

export type ColorMode = "system" | "light" | "dark";
export type ColorTheme = "default" | "lutheran" | "catholic" | "orthodox";

// ── Constants ──

export const COLOR_MODE_KEY = "oeb-color-mode";
export const COLOR_THEME_KEY = "oeb-color-theme";

export const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const COLOR_THEMES: { value: ColorTheme; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Blue accent, neutral tones" },
  { value: "lutheran", label: "Lutheran", description: "Deep red accent, warm tones — Luther's rose" },
  { value: "catholic", label: "Catholic", description: "Royal purple accent, ivory tones — liturgical" },
  { value: "orthodox", label: "Orthodox", description: "Forest green accent, parchment tones — Byzantine" },
];

// ── Read from localStorage ──

export function getColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(COLOR_MODE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage unavailable
  }
  return "system";
}

export function getColorTheme(): ColorTheme {
  try {
    const stored = localStorage.getItem(COLOR_THEME_KEY);
    if (stored === "default" || stored === "lutheran" || stored === "catholic" || stored === "orthodox") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "default";
}

// ── Apply to DOM ──

/** Resolve whether dark mode is active based on mode preference + system setting. */
export function isDarkActive(mode: ColorMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  // "system" — check OS preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Apply the current theme to the document. Call this after changing
 * colorMode or colorTheme to update the DOM immediately.
 */
export function applyTheme(mode: ColorMode, theme: ColorTheme): void {
  const html = document.documentElement;

  // Dark mode class
  html.classList.toggle("dark", isDarkActive(mode));

  // Denomination theme data attribute
  if (theme === "default") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", theme);
  }
}

// ── Save + apply in one step ──

export function setColorMode(mode: ColorMode): void {
  try {
    localStorage.setItem(COLOR_MODE_KEY, mode);
  } catch {
    // Storage unavailable
  }
  applyTheme(mode, getColorTheme());
}

export function setColorTheme(theme: ColorTheme): void {
  try {
    localStorage.setItem(COLOR_THEME_KEY, theme);
  } catch {
    // Storage unavailable
  }
  applyTheme(getColorMode(), theme);
}

/**
 * Listen for OS dark mode changes when mode is "system".
 * Returns a cleanup function to remove the listener.
 */
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  function handleChange() {
    const mode = getColorMode();
    if (mode === "system") {
      applyTheme(mode, getColorTheme());
    }
  }

  mq.addEventListener("change", handleChange);
  return () => mq.removeEventListener("change", handleChange);
}
