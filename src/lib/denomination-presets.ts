/**
 * Denomination presets — named toggle configurations for different
 * Christian traditions.
 *
 * Each preset maps to a set of translation toggle values. Presets
 * support hierarchy: a denomination can have subcategories (e.g.,
 * "Baptist" → "Southern Baptist", "Reformed Baptist").
 *
 * Design decisions:
 * - `toggles` is Partial<TranslationToggles> — a preset only sets
 *   the toggles it has an opinion on. Unset toggles keep the user's
 *   current value. This matters for subcategories that share most
 *   settings with their parent but differ on one toggle.
 * - Hierarchy uses `parentId` (flat list with parent references)
 *   rather than nested children arrays. Simpler to query and serialize.
 * - This is the data foundation. The preset picker UI comes later
 *   when denomination-specific annotation sets land (v2/v3).
 *
 * Toggle reference (false = traditional, true = alternate):
 *   divineName:   false = LORD,           true = Yahweh
 *   baptism:      false = baptize,        true = immerse
 *   assembly:     false = church,          true = assembly
 *   onlyBegotten: false = only begotten,  true = one and only
 */

import type { TranslationToggles } from "./translation-toggles";

export interface DenominationPreset {
  /** Unique identifier (kebab-case) */
  id: string;
  /** Display name */
  name: string;
  /** Parent preset ID for subcategories (null = root denomination) */
  parentId: string | null;
  /** Brief description of this denomination's translation preferences */
  description: string;
  /** Toggle values this preset sets. Partial — unset toggles keep user's current value. */
  toggles: Partial<TranslationToggles>;
}

/**
 * Initial denomination presets.
 *
 * These represent well-established positions on the toggle words.
 * The list will grow with community input — additions should be
 * reviewed for accuracy before shipping.
 *
 * Sources for toggle positions:
 * - baptize vs immerse: follows each tradition's sacramental theology
 * - LORD vs Yahweh: nearly universal as LORD except academic/messianic
 * - church vs assembly: nearly universal as church except Brethren/Restorationist
 * - only begotten vs one and only: KJV-tradition vs NIV-tradition split
 */
export const DENOMINATION_PRESETS: readonly DenominationPreset[] = [
  // ── Catholic / Orthodox ──
  {
    id: "catholic",
    name: "Catholic",
    parentId: null,
    description: "Traditional Catholic wording (Douay-Rheims tradition)",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: false },
  },
  {
    id: "orthodox",
    name: "Eastern Orthodox",
    parentId: null,
    description: "Traditional Orthodox wording",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: false },
  },

  // ── Lutheran ──
  {
    id: "lutheran",
    name: "Lutheran",
    parentId: null,
    description: "Traditional Lutheran wording",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: false },
  },
  {
    id: "lutheran-lcms",
    name: "LCMS (Missouri Synod)",
    parentId: "lutheran",
    description: "Conservative Lutheran — traditional wording throughout",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: false },
  },
  {
    id: "lutheran-elca",
    name: "ELCA",
    parentId: "lutheran",
    description: "Mainline Lutheran — modern phrasing where available",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: true },
  },

  // ── Baptist ──
  {
    id: "baptist",
    name: "Baptist",
    parentId: null,
    description: "Baptist tradition — emphasizes immersion as the mode of baptism",
    toggles: { divineName: false, baptism: true, assembly: false, onlyBegotten: false },
  },
  {
    id: "baptist-southern",
    name: "Southern Baptist",
    parentId: "baptist",
    description: "Southern Baptist Convention — KJV-tradition wording, immersion",
    toggles: { divineName: false, baptism: true, assembly: false, onlyBegotten: false },
  },
  {
    id: "baptist-reformed",
    name: "Reformed Baptist",
    parentId: "baptist",
    description: "Reformed Baptist — Calvinist theology, immersion, traditional language",
    toggles: { divineName: false, baptism: true, assembly: false, onlyBegotten: false },
  },
  {
    id: "baptist-independent",
    name: "Independent Baptist",
    parentId: "baptist",
    description: "Independent/Fundamental Baptist — strict KJV-tradition wording",
    toggles: { divineName: false, baptism: true, assembly: false, onlyBegotten: false },
  },

  // ── Reformed / Presbyterian ──
  {
    id: "reformed",
    name: "Reformed / Presbyterian",
    parentId: null,
    description: "Reformed tradition — traditional wording",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: false },
  },

  // ── Methodist ──
  {
    id: "methodist",
    name: "Methodist",
    parentId: null,
    description: "Wesleyan-Methodist tradition",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: false },
  },

  // ── Anglican / Episcopal ──
  {
    id: "anglican",
    name: "Anglican / Episcopal",
    parentId: null,
    description: "Anglican tradition — Book of Common Prayer wording",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: false },
  },

  // ── Pentecostal / Charismatic ──
  {
    id: "pentecostal",
    name: "Pentecostal / Charismatic",
    parentId: null,
    description: "Pentecostal tradition",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: false },
  },
  {
    id: "assemblies-of-god",
    name: "Assemblies of God",
    parentId: "pentecostal",
    description: "Assemblies of God — uses 'assembly' for ekklesia",
    toggles: { divineName: false, baptism: false, assembly: true, onlyBegotten: false },
  },

  // ── Non-denominational / Modern Evangelical ──
  {
    id: "non-denominational",
    name: "Non-denominational",
    parentId: null,
    description: "Modern evangelical — NIV-style contemporary wording",
    toggles: { divineName: false, baptism: false, assembly: false, onlyBegotten: true },
  },

  // ── Academic / Literal ──
  {
    id: "academic",
    name: "Academic / Literal",
    parentId: null,
    description: "Scholarly — uses the most literal rendering of Greek and Hebrew terms",
    toggles: { divineName: true, baptism: true, assembly: true, onlyBegotten: true },
  },
];

// ── Query helpers ──

/** Get a preset by its ID. Returns undefined if not found. */
export function getPresetById(id: string): DenominationPreset | undefined {
  return DENOMINATION_PRESETS.find((p) => p.id === id);
}

/** Get all root-level denominations (no parent). */
export function getRootPresets(): DenominationPreset[] {
  return DENOMINATION_PRESETS.filter((p) => p.parentId === null);
}

/** Get all subcategories of a given parent denomination. */
export function getChildPresets(parentId: string): DenominationPreset[] {
  return DENOMINATION_PRESETS.filter((p) => p.parentId === parentId);
}

/**
 * Apply a preset's toggle values to existing toggles.
 *
 * Returns a new toggles object with the preset's values merged in.
 * Only overrides toggles the preset specifies — unset toggles keep
 * the current value. This lets subcategories inherit most settings
 * from their parent while overriding specific toggles.
 */
export function applyPreset(
  current: TranslationToggles,
  preset: DenominationPreset,
): TranslationToggles {
  return {
    ...current,
    ...preset.toggles,
  };
}
