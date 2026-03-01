/**
 * SettingsPage — user preferences with Supabase-backed sync.
 *
 * Five sections:
 * 1. Account (read-only) — avatar, name, email, OAuth provider
 * 2. Reading — font picker, annotation dot style
 * 3. Word Choices — denomination preset + individual toggles
 * 4. Default Translation — translation picker
 * 5. Your Data — export button
 *
 * Preferences save to localStorage instantly (offline-safe) and
 * fire-and-forget sync to Supabase (roaming across devices).
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  loadLocalPreferences,
  savePreferencesToLocalStorage,
  saveRemotePreferences,
  syncPreferences,
  type UserPreferences,
} from "../lib/preference-sync";
import { FONT_OPTIONS } from "../lib/reader-fonts";
import type { ReaderFont, ReaderLayout, AnnotationDotStyle } from "../lib/workspace-prefs";
import {
  TOGGLE_INFO,
  type TranslationToggles,
} from "../lib/translation-toggles";
import {
  getRootPresets,
  getChildPresets,
  getPresetById,
} from "../lib/denomination-presets";
import { SUPPORTED_TRANSLATIONS, DEFAULT_TRANSLATION } from "../lib/constants";
import { ExportButton } from "./ExportButton";
import type { AuthState } from "../types/auth";

interface SettingsPageProps {
  auth: AuthState;
  /** OAuth providers connected to this account (e.g. ["google"]) */
  providers: string[];
}

/** Provider display names */
const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  azure: "Microsoft",
  discord: "Discord",
  github: "GitHub",
};

export function SettingsPage({ auth, providers }: SettingsPageProps) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadLocalPreferences());
  const [synced, setSynced] = useState(false);

  // On mount: sync localStorage ↔ Supabase
  useEffect(() => {
    if (!auth.userId) return;
    syncPreferences(supabase, auth.userId).then((merged) => {
      setPrefs(merged);
      setSynced(true);
    }).catch(() => {
      setSynced(true);
    });
  }, [auth.userId]);

  /** Update a single preference: instant localStorage + async Supabase. */
  function updatePref(patch: Partial<UserPreferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferencesToLocalStorage(next);

    if (auth.userId) {
      saveRemotePreferences(supabase, auth.userId, next).catch(() => {
        // Fire-and-forget — localStorage already updated
      });
    }
  }

  // Determine current denomination preset match
  const currentPresetId = prefs.denominationPreset ?? "";
  const currentPreset = currentPresetId ? getPresetById(currentPresetId) : undefined;

  // Check if current toggles match the selected preset (for "Custom" detection)
  function togglesMatchPreset(presetId: string): boolean {
    const preset = getPresetById(presetId);
    if (!preset) return false;
    const toggleKeys: (keyof TranslationToggles)[] = ["divineName", "baptism", "assembly", "onlyBegotten"];
    return toggleKeys.every((k) => {
      if (preset.toggles[k] === undefined) return true;
      return prefs[k] === preset.toggles[k];
    });
  }

  const isCustom = currentPresetId && !togglesMatchPreset(currentPresetId);

  function handlePresetChange(presetId: string) {
    if (!presetId) {
      updatePref({ denominationPreset: undefined });
      return;
    }
    const preset = getPresetById(presetId);
    if (!preset) return;

    updatePref({
      denominationPreset: presetId,
      ...(preset.toggles.divineName !== undefined && { divineName: preset.toggles.divineName }),
      ...(preset.toggles.baptism !== undefined && { baptism: preset.toggles.baptism }),
      ...(preset.toggles.assembly !== undefined && { assembly: preset.toggles.assembly }),
      ...(preset.toggles.onlyBegotten !== undefined && { onlyBegotten: preset.toggles.onlyBegotten }),
    });
  }

  function handleToggleChange(key: keyof TranslationToggles) {
    updatePref({ [key]: !prefs[key] });
    // If the user manually changes a toggle, the preset label becomes "Custom"
    // (we don't clear the preset ID — just show "Custom" in the UI)
  }

  const rootPresets = getRootPresets();
  const children = currentPreset && !currentPreset.parentId
    ? getChildPresets(currentPreset.id)
    : currentPreset?.parentId
      ? getChildPresets(currentPreset.parentId)
      : [];

  return (
    <div className="space-y-8">
      {/* ── Account ── */}
      <Section title="Account">
        <div className="flex items-center gap-4">
          {auth.avatarUrl ? (
            <img
              src={auth.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-medium text-white">
              {(auth.displayName ?? "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-base font-medium text-gray-900">{auth.displayName}</p>
            {auth.email && (
              <p className="text-sm text-gray-500">{auth.email}</p>
            )}
            {providers.length > 0 && (
              <div className="mt-1 flex gap-2">
                {providers.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {PROVIDER_LABELS[p] ?? p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Reading ── */}
      <Section title="Reading">
        {/* Font picker */}
        <SettingRow label="Reader font" description="Font used for Bible text in the reader">
          <select
            value={prefs.readerFont ?? "system"}
            onChange={(e) => updatePref({ readerFont: e.target.value as ReaderFont })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </SettingRow>

        {/* Annotation dots */}
        <SettingRow label="Annotation dots" description="How verse annotation indicators appear">
          <select
            value={prefs.annotationDots ?? "blue"}
            onChange={(e) => updatePref({ annotationDots: e.target.value as AnnotationDotStyle })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="blue">Blue dots</option>
            <option value="subtle">Subtle (gray)</option>
            <option value="hidden">Hidden</option>
          </select>
        </SettingRow>

        {/* Reader layout */}
        <SettingRow label="Reader layout" description="How Bible text is arranged on screen">
          <select
            value={prefs.readerLayout ?? "centered"}
            onChange={(e) => updatePref({ readerLayout: e.target.value as ReaderLayout })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="centered">Centered column</option>
            <option value="columns">Multi-column</option>
          </select>
        </SettingRow>
      </Section>

      {/* ── Word Choices ── */}
      <Section title="Word Choices">
        {/* Denomination preset */}
        <SettingRow
          label="Denomination preset"
          description="Applies word choices typical for your tradition"
        >
          <select
            value={isCustom ? "" : (currentPresetId || "")}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">
              {isCustom ? "Custom" : "Choose a tradition..."}
            </option>
            {rootPresets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </SettingRow>

        {/* Subcategory picker (if applicable) */}
        {children.length > 0 && (
          <SettingRow
            label="Subcategory"
            description={`Specific tradition within ${currentPreset?.parentId ? getPresetById(currentPreset.parentId)?.name : currentPreset?.name}`}
          >
            <select
              value={currentPreset?.parentId ? currentPresetId : ""}
              onChange={(e) => {
                if (e.target.value) handlePresetChange(e.target.value);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">General</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </SettingRow>
        )}

        {/* Individual toggles */}
        <div className="mt-4 space-y-3">
          {(Object.keys(TOGGLE_INFO) as (keyof TranslationToggles)[]).map((key) => {
            const info = TOGGLE_INFO[key];
            const isOn = !!prefs[key];
            return (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{info.label}</p>
                  <p className="text-xs text-gray-500">{info.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  onClick={() => handleToggleChange(key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isOn ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                      isOn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Default Translation ── */}
      <Section title="Default Translation">
        <SettingRow
          label="Default translation"
          description="Which translation opens when you start reading"
        >
          <select
            value={prefs.defaultTranslation ?? DEFAULT_TRANSLATION}
            onChange={(e) => updatePref({ defaultTranslation: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SUPPORTED_TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.abbreviation} — {t.name}
              </option>
            ))}
          </select>
        </SettingRow>
      </Section>

      {/* ── Your Data ── */}
      <Section title="Your Data">
        <SettingRow
          label="Download your notes"
          description="Export all your annotations as Markdown files in a zip"
        >
          <ExportButton userId={auth.userId ?? undefined} />
        </SettingRow>
      </Section>
    </div>
  );
}

// ── Helper components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3 first:pt-0 last:pb-0 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
