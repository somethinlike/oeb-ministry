/**
 * SettingsPage — user preferences with Supabase-backed sync.
 *
 * Six sections:
 * 1. Account (read-only) — avatar, name, email, OAuth provider
 * 2. Public Profile — slug, display name, bio (client-only, after sync)
 * 3. Reading — font picker, annotation dot style
 * 4. Word Choices — denomination preset + individual toggles
 * 5. Default Translation — translation picker
 * 6. Your Data — export button
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
import { SUPPORTED_TRANSLATIONS, DEFAULT_TRANSLATION, BOOKS } from "../lib/constants";
import {
  COLOR_MODES,
  COLOR_THEMES,
  type ColorTheme,
  applyTheme,
} from "../lib/theme";
import { PRESET_LABELS, PRESET_BINDINGS, type KeybindingPreset } from "../lib/commands";
import { KeybindingEditor } from "./KeybindingEditor";
import { ExportButton } from "./ExportButton";
import { OfflineDownloads } from "./OfflineDownloads";
import { EncryptionProvider, useEncryption } from "./EncryptionProvider";
import { EncryptionSetup } from "./EncryptionSetup";
import { ProfileEditor } from "./ProfileEditor";
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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-medium text-on-accent">
              {(auth.displayName ?? "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-base font-medium text-heading">{auth.displayName}</p>
            {auth.email && (
              <p className="text-sm text-muted">{auth.email}</p>
            )}
            {providers.length > 0 && (
              <div className="mt-1 flex gap-2">
                {providers.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-body"
                  >
                    {PROVIDER_LABELS[p] ?? p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Public Profile ── */}
      {synced && auth.userId && (
        <Section title="Public Profile">
          <p className="text-sm text-muted mb-4">
            Create a public page to showcase the notes and devotionals you&rsquo;ve shared with the community.
          </p>
          <ProfileEditor
            userId={auth.userId}
            defaultDisplayName={auth.displayName ?? ""}
          />
        </Section>
      )}

      {/* ── Appearance ── */}
      <Section title="Appearance">
        {/* Color mode: System / Light / Dark */}
        <SettingRow label="Color mode" description="Choose light, dark, or follow your system setting">
          <div className="flex gap-1 rounded-lg border border-input-border bg-surface-alt p-1">
            {COLOR_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  updatePref({ colorMode: m.value });
                  applyTheme(m.value, prefs.colorTheme ?? "default");
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  (prefs.colorMode ?? "system") === m.value
                    ? "bg-accent text-on-accent shadow-sm"
                    : "text-muted hover:text-heading hover:bg-surface-hover"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Denomination theme */}
        <SettingRow label="Theme" description="Color accent inspired by Christian traditions">
          <select
            value={prefs.colorTheme ?? "default"}
            onChange={(e) => {
              const theme = e.target.value as ColorTheme;
              updatePref({ colorTheme: theme });
              applyTheme(prefs.colorMode ?? "system", theme);
            }}
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-heading focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {COLOR_THEMES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </SettingRow>
      </Section>

      {/* ── Reading ── */}
      <Section title="Reading">
        {/* Font picker */}
        <SettingRow label="Reader font" description="Font used for Bible text in the reader">
          <select
            value={prefs.readerFont ?? "system"}
            onChange={(e) => updatePref({ readerFont: e.target.value as ReaderFont })}
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-heading focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-heading focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-heading focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="centered">Centered column</option>
            <option value="columns">Multi-column</option>
          </select>
        </SettingRow>

        {/* Keyboard shortcuts preset */}
        <SettingRow label="Keyboard shortcuts" description="Choose a shortcut style that fits how you work">
          <select
            value={prefs.keybindingPreset ?? "default"}
            onChange={(e) => updatePref({ keybindingPreset: e.target.value as KeybindingPreset })}
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-heading focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {(Object.entries(PRESET_LABELS) as [KeybindingPreset, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ),
            )}
          </select>
        </SettingRow>

        {/* Custom keybinding editor — client-only to avoid SSR hydration mismatch.
             The editor uses localStorage-dependent state that differs server/client. */}
        {synced && (
          <details className="pt-2">
            <summary className="cursor-pointer text-xs text-accent hover:text-accent-hover font-medium">
              Customize individual shortcuts&hellip;
            </summary>
            <div className="mt-4">
              <KeybindingEditor
                preset={prefs.keybindingPreset ?? "default"}
                customOverrides={prefs.customKeybindings ?? {}}
                onOverrideChange={(commandId, key) => {
                  const activePreset = prefs.keybindingPreset ?? "default";
                  const presetKey = PRESET_BINDINGS[activePreset]?.find(
                    (b) => b.commandId === commandId,
                  )?.key ?? "";
                  const current = { ...(prefs.customKeybindings ?? {}) };
                  if (key === presetKey) {
                    delete current[commandId];
                  } else {
                    current[commandId] = key;
                  }
                  updatePref({ customKeybindings: Object.keys(current).length > 0 ? current : undefined });
                }}
                onResetAll={() => updatePref({ customKeybindings: undefined })}
              />
            </div>
          </details>
        )}
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
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-heading focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-heading focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
                  <p className="text-sm font-medium text-heading">{info.label}</p>
                  <p className="text-xs text-muted">{info.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  onClick={() => handleToggleChange(key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    isOn ? "bg-accent" : "bg-switch-off"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-on-accent shadow ring-0 transition-transform duration-200 ease-in-out ${
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
            className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-heading focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SUPPORTED_TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.abbreviation} — {t.name}
              </option>
            ))}
          </select>
        </SettingRow>
      </Section>

      {/* ── Offline Reading ── */}
      <Section title="Offline Reading">
        <OfflineDownloads />
      </Section>

      {/* ── Your Data ── */}
      <Section title="Your Data">
        <SettingRow
          label="Download your notes"
          description="Export your notes as a zip with an HTML file and Markdown files, including verse text"
        >
          <ExportButton userId={auth.userId ?? undefined} />
        </SettingRow>
      </Section>

      {/* ── Security (Advanced) ──
          Wrapped in its own EncryptionProvider since settings lives outside the workspace.
          Grandmother Principle: this section lives at the bottom — most users never scroll here. */}
      {auth.userId && (
        <EncryptionProvider userId={auth.userId} userEmail={auth.email}>
          <SecuritySection />
        </EncryptionProvider>
      )}
    </div>
  );
}

// ── Helper components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-heading">{title}</h3>
      <div className="rounded-lg border border-edge bg-panel p-4 sm:p-6">
        {children}
      </div>
    </section>
  );
}

/**
 * SecuritySection — encryption setup, lives at the bottom of settings.
 * Must be rendered inside an EncryptionProvider.
 *
 * Two states:
 * 1. Not set up → "Set up note locking" button → opens EncryptionSetup wizard
 * 2. Already set up → shows status + lock toggle info
 */
function SecuritySection() {
  const { hasEncryption, isLoaded, isUnlocked, lock } = useEncryption();
  const [showSetup, setShowSetup] = useState(false);

  // Don't render until we know the encryption state
  if (!isLoaded) return null;

  return (
    <>
      <Section title="Security">
        {hasEncryption ? (
          // Already set up — show status
          <div className="space-y-4">
            <SettingRow
              label="Note locking"
              description="Your notes can be locked with your passphrase"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                <svg
                  className="h-3 w-3"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Enabled
              </span>
            </SettingRow>
            <p className="text-xs text-muted leading-relaxed">
              Use the &ldquo;Lock this note&rdquo; button when writing a note to
              scramble it so only you can read it. Locked notes show a padlock
              icon in your notes list.
            </p>
            {isUnlocked && (
              <button
                type="button"
                onClick={lock}
                className="rounded-lg border border-input-border bg-panel px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Lock now (clear passphrase from memory)
              </button>
            )}
          </div>
        ) : (
          // Not set up — offer to enable
          <div className="space-y-3">
            <p className="text-sm text-body leading-relaxed">
              Lock individual notes so only you can read them — not even we can
              see what you write. You&apos;ll create a passphrase that your browser
              can save for you.
            </p>
            <details className="text-xs text-muted">
              <summary className="cursor-pointer hover:text-heading">
                How does it work?
              </summary>
              <p className="mt-2 leading-relaxed">
                Your notes are scrambled on your device before they leave. The
                passphrase creates a unique key stored only in your browser&apos;s
                memory. Without the passphrase, the scrambled text is unreadable —
                even by us.
              </p>
            </details>
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Set up note locking
            </button>
          </div>
        )}
      </Section>

      {/* Setup wizard modal */}
      {showSetup && (
        <EncryptionSetup
          onComplete={() => setShowSetup(false)}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3 first:pt-0 last:pb-0 border-b border-edge-soft last:border-0">
      <div>
        <p className="text-sm font-medium text-heading">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
