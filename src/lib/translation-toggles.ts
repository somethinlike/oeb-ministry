/**
 * Translation toggles — user-controllable word swaps that modify
 * Bible verse text at render time.
 *
 * Different Christian traditions prefer different English renderings
 * of key Greek/Hebrew terms. Rather than forcing one philosophy,
 * we let readers toggle between common alternatives.
 *
 * Each toggle is a boolean: false = traditional wording, true = alternate.
 * Persistence: localStorage key "oeb-translation-toggles"
 * Pattern: mirrors workspace-prefs.ts — interface, DEFAULTS, load, save.
 */

const STORAGE_KEY = "oeb-translation-toggles";

/** Each boolean: false = traditional wording, true = alternate (literal) wording */
export interface TranslationToggles {
  /** LORD ↔ Yahweh (Hebrew YHWH — God's covenant name) */
  divineName: boolean;
  /** baptize/baptism ↔ immerse/immersion (Greek baptizo = "immerse") */
  baptism: boolean;
  /** church ↔ assembly (Greek ekklesia = "assembly/gathering") */
  assembly: boolean;
  /** "only begotten" ↔ "one and only" (Greek monogenes = "unique/one-of-a-kind") */
  onlyBegotten: boolean;
}

export const TOGGLE_DEFAULTS: TranslationToggles = {
  divineName: false,
  baptism: false,
  assembly: false,
  onlyBegotten: false,
};

/** Human-readable metadata for the toggle settings UI */
export const TOGGLE_INFO: Record<
  keyof TranslationToggles,
  { label: string; offLabel: string; onLabel: string; description: string }
> = {
  divineName: {
    label: "God's name",
    offLabel: "LORD",
    onLabel: "Yahweh",
    description:
      "In the Old Testament, God's name (YHWH) is traditionally shown as LORD in all capitals.",
  },
  baptism: {
    label: "Baptize or immerse",
    offLabel: "Baptize",
    onLabel: "Immerse",
    description:
      "The Greek word baptizo literally means \"to immerse\" or \"to dip.\"",
  },
  assembly: {
    label: "Church or assembly",
    offLabel: "Church",
    onLabel: "Assembly",
    description:
      "The Greek word ekklesia meant \"assembly\" or \"gathering\" — it was not originally a religious word.",
  },
  onlyBegotten: {
    label: "Only begotten",
    offLabel: "Only begotten",
    onLabel: "One and only",
    description:
      "The Greek word monogenes is debated — it may mean \"only begotten\" or \"one of a kind.\"",
  },
};

// ── Load / Save ──

export function loadTranslationToggles(): TranslationToggles {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...TOGGLE_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<TranslationToggles>;
    return {
      divineName:
        typeof parsed.divineName === "boolean"
          ? parsed.divineName
          : TOGGLE_DEFAULTS.divineName,
      baptism:
        typeof parsed.baptism === "boolean"
          ? parsed.baptism
          : TOGGLE_DEFAULTS.baptism,
      assembly:
        typeof parsed.assembly === "boolean"
          ? parsed.assembly
          : TOGGLE_DEFAULTS.assembly,
      onlyBegotten:
        typeof parsed.onlyBegotten === "boolean"
          ? parsed.onlyBegotten
          : TOGGLE_DEFAULTS.onlyBegotten,
    };
  } catch {
    return { ...TOGGLE_DEFAULTS };
  }
}

export function saveTranslationToggles(
  prefs: Partial<TranslationToggles>,
): void {
  try {
    const current = loadTranslationToggles();
    const merged: TranslationToggles = {
      divineName: prefs.divineName ?? current.divineName,
      baptism: prefs.baptism ?? current.baptism,
      assembly: prefs.assembly ?? current.assembly,
      onlyBegotten: prefs.onlyBegotten ?? current.onlyBegotten,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Storage unavailable — silently ignore
  }
}

// ── Text Transform ──

/**
 * Apply active translation toggles to verse text.
 *
 * Pure function — takes a string and toggle state, returns transformed string.
 * Only runs replacements for toggles that are true. If all are false, returns
 * the text unchanged (fast path).
 */
export function applyTranslationToggles(
  text: string,
  toggles: TranslationToggles,
): string {
  // Fast path — no toggles active
  if (
    !toggles.divineName &&
    !toggles.baptism &&
    !toggles.assembly &&
    !toggles.onlyBegotten
  ) {
    return text;
  }

  let result = text;

  if (toggles.divineName) {
    // Replace all-caps LORD with Yahweh.
    // In English Bibles, "LORD" (all caps) specifically marks the Hebrew
    // tetragrammaton (YHWH). Regular "Lord" (mixed case) translates the
    // Hebrew "Adonai" and should NOT be swapped.
    //
    // Known edge case: "JESUS IS LORD" (Romans 10:9 etc.) will match
    // because it's rendered in all-caps in some translations. This is
    // an inherent limitation of text-level replacement — distinguishing
    // tetragrammaton-LORD from emphasis-LORD would need per-verse metadata.
    result = result.replace(/\bLORD\b/g, "Yahweh");
  }

  if (toggles.baptism) {
    result = replaceWord(result, "baptize", "immerse");
    result = replaceWord(result, "baptized", "immersed");
    result = replaceWord(result, "baptizing", "immersing");
    result = replaceWord(result, "baptism", "immersion");
    result = replaceWord(result, "baptisms", "immersions");
    result = replaceWord(result, "baptizer", "immerser");
    // KJV archaic forms
    result = replaceWord(result, "baptizeth", "immerseth");
    result = replaceWord(result, "baptizest", "immersest");
  }

  if (toggles.assembly) {
    // Order matters: "churches" before "church" to avoid partial replacement
    result = replaceWord(result, "churches", "assemblies");
    result = replaceWord(result, "church", "assembly");
  }

  if (toggles.onlyBegotten) {
    // Multi-word phrase replacement (case-preserving on first letter)
    result = replacePhrase(result, "only begotten", "one and only");
  }

  return result;
}

/**
 * Replace a word with case preservation and word boundaries.
 *
 * Handles three cases:
 * - ALL CAPS: BAPTIZE → IMMERSE
 * - Title Case: Baptize → Immerse
 * - lowercase: baptize → immerse
 */
function replaceWord(text: string, from: string, to: string): string {
  // Build a case-insensitive regex with word boundaries
  const regex = new RegExp(`\\b${escapeRegex(from)}\\b`, "gi");
  return text.replace(regex, (match) => preserveCase(match, to));
}

/**
 * Replace a multi-word phrase with case preservation on the first letter.
 */
function replacePhrase(text: string, from: string, to: string): string {
  const regex = new RegExp(escapeRegex(from), "gi");
  return text.replace(regex, (match) => preserveCase(match, to));
}

/** Escape special regex characters in a literal string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match the replacement's capitalization to the original word's pattern.
 *
 * - "BAPTIZE" → "IMMERSE" (all caps)
 * - "Baptize" → "Immerse" (title case)
 * - "baptize" → "immerse" (lowercase)
 */
function preserveCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement.toLowerCase();
}
