/**
 * Preference sync — bridges localStorage (instant, offline-safe) with
 * Supabase (roaming across devices).
 *
 * Reading preferences roam: readerFont, annotationDots, readerLayout,
 * translation toggles (4 booleans), defaultTranslation, denominationPreset.
 *
 * Workspace layout stays local: splitRatio, swapped, undocked, cleanView.
 * These are device-specific ergonomics — a phone's layout shouldn't override
 * a desktop's split ratio.
 *
 * localStorage keys preserved for backward compat:
 * - "oeb-workspace-prefs" (readerFont, annotationDots, readerLayout + layout fields)
 * - "oeb-translation-toggles" (divineName, baptism, assembly, onlyBegotten)
 * - "oeb-user-prefs" (defaultTranslation, denominationPreset)
 */

import { loadWorkspacePrefs, saveWorkspacePrefs } from "./workspace-prefs";
import type { ReaderFont, ReaderLayout, AnnotationDotStyle } from "./workspace-prefs";
import { loadTranslationToggles, saveTranslationToggles } from "./translation-toggles";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

// ── Types ──

/** The subset of preferences that roam across devices via Supabase. */
export interface UserPreferences {
  // From workspace-prefs (reading preferences only)
  readerFont?: ReaderFont;
  annotationDots?: AnnotationDotStyle;
  readerLayout?: ReaderLayout;

  // From translation-toggles
  divineName?: boolean;
  baptism?: boolean;
  assembly?: boolean;
  onlyBegotten?: boolean;

  // New fields (stored in "oeb-user-prefs" localStorage key)
  defaultTranslation?: string;
  denominationPreset?: string;
}

const USER_PREFS_STORAGE_KEY = "oeb-user-prefs";

/** Valid font keys for validation */
const VALID_FONTS = new Set(["system", "inter", "source-sans", "literata", "source-serif", "lora"]);
/** Valid dot style keys */
const VALID_DOT_STYLES = new Set(["blue", "subtle", "hidden"]);
/** Valid layout keys */
const VALID_LAYOUTS = new Set(["centered", "columns"]);

// ── localStorage helpers ──

/** Load user-prefs-only localStorage key (defaultTranslation, denominationPreset). */
function loadUserPrefsStorage(): { defaultTranslation?: string; denominationPreset?: string } {
  try {
    const raw = localStorage.getItem(USER_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      defaultTranslation: typeof parsed.defaultTranslation === "string" ? parsed.defaultTranslation : undefined,
      denominationPreset: typeof parsed.denominationPreset === "string" ? parsed.denominationPreset : undefined,
    };
  } catch {
    return {};
  }
}

/** Save user-prefs-only localStorage key. */
function saveUserPrefsStorage(prefs: { defaultTranslation?: string; denominationPreset?: string }): void {
  try {
    const current = loadUserPrefsStorage();
    const merged = {
      ...current,
      ...prefs,
    };
    localStorage.setItem(USER_PREFS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Storage unavailable — silently ignore
  }
}

/**
 * Load all roaming preferences from localStorage.
 * Assembles from 3 localStorage keys into a unified object.
 */
export function loadLocalPreferences(): UserPreferences {
  const workspace = loadWorkspacePrefs();
  const toggles = loadTranslationToggles();
  const userPrefs = loadUserPrefsStorage();

  return {
    readerFont: workspace.readerFont,
    annotationDots: workspace.annotationDots,
    readerLayout: workspace.readerLayout,
    divineName: toggles.divineName,
    baptism: toggles.baptism,
    assembly: toggles.assembly,
    onlyBegotten: toggles.onlyBegotten,
    defaultTranslation: userPrefs.defaultTranslation,
    denominationPreset: userPrefs.denominationPreset,
  };
}

/**
 * Save roaming preferences back to localStorage.
 * Distributes to the 3 localStorage keys. Preserves workspace-only
 * fields (splitRatio, swapped, undocked, cleanView) that aren't in UserPreferences.
 */
export function savePreferencesToLocalStorage(prefs: UserPreferences): void {
  // Workspace prefs — only update roaming fields, preserve layout fields
  saveWorkspacePrefs({
    readerFont: prefs.readerFont,
    annotationDots: prefs.annotationDots,
    readerLayout: prefs.readerLayout,
  });

  // Translation toggles
  saveTranslationToggles({
    divineName: prefs.divineName,
    baptism: prefs.baptism,
    assembly: prefs.assembly,
    onlyBegotten: prefs.onlyBegotten,
  });

  // User prefs (new key)
  saveUserPrefsStorage({
    defaultTranslation: prefs.defaultTranslation,
    denominationPreset: prefs.denominationPreset,
  });
}

// ── Supabase helpers ──

/**
 * Validate and clean JSONB preferences from Supabase.
 * Strips invalid values so bad data in the DB can't break the UI.
 */
export function validatePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;

  const result: UserPreferences = {};

  if (typeof obj.readerFont === "string" && VALID_FONTS.has(obj.readerFont)) {
    result.readerFont = obj.readerFont as ReaderFont;
  }
  if (typeof obj.annotationDots === "string" && VALID_DOT_STYLES.has(obj.annotationDots)) {
    result.annotationDots = obj.annotationDots as AnnotationDotStyle;
  }
  if (typeof obj.readerLayout === "string" && VALID_LAYOUTS.has(obj.readerLayout)) {
    result.readerLayout = obj.readerLayout as ReaderLayout;
  }
  if (typeof obj.divineName === "boolean") result.divineName = obj.divineName;
  if (typeof obj.baptism === "boolean") result.baptism = obj.baptism;
  if (typeof obj.assembly === "boolean") result.assembly = obj.assembly;
  if (typeof obj.onlyBegotten === "boolean") result.onlyBegotten = obj.onlyBegotten;
  if (typeof obj.defaultTranslation === "string") result.defaultTranslation = obj.defaultTranslation;
  if (typeof obj.denominationPreset === "string") result.denominationPreset = obj.denominationPreset;

  return result;
}

/** Fetch preferences from Supabase. Returns null if no row exists. */
export async function fetchRemotePreferences(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<UserPreferences | null> {
  const { data, error } = await client
    .from("user_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return validatePreferences(data.preferences);
}

/** Upsert preferences to Supabase. */
export async function saveRemotePreferences(
  client: SupabaseClient<Database>,
  userId: string,
  prefs: UserPreferences,
): Promise<void> {
  const { error } = await client
    .from("user_preferences")
    .upsert(
      { user_id: userId, preferences: prefs as Record<string, unknown> },
      { onConflict: "user_id" },
    );

  if (error) throw error;
}

// ── Sync ──

/**
 * Sync preferences between localStorage and Supabase.
 *
 * Strategy: remote wins (so changes on another device take effect),
 * except on first sync when no Supabase row exists — seeds from localStorage.
 *
 * Returns the merged preferences that were applied.
 */
export async function syncPreferences(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<UserPreferences> {
  const local = loadLocalPreferences();

  let remote: UserPreferences | null;
  try {
    remote = await fetchRemotePreferences(client, userId);
  } catch {
    // Network error — use local preferences, don't block the UI
    return local;
  }

  if (remote === null) {
    // First sync — seed Supabase from localStorage
    try {
      await saveRemotePreferences(client, userId, local);
    } catch {
      // Failed to seed — not critical, will retry next sync
    }
    return local;
  }

  // Merge: remote wins for fields that exist in remote,
  // local fills in any fields remote doesn't have
  const merged: UserPreferences = { ...local, ...remote };

  // Write merged result to both stores
  savePreferencesToLocalStorage(merged);
  try {
    await saveRemotePreferences(client, userId, merged);
  } catch {
    // Failed to write back — local is already updated, not critical
  }

  return merged;
}
