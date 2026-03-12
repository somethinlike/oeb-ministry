/**
 * DevotionalForm — create or edit a devotional bible collection.
 *
 * Grandmother Principle:
 * - "Create a devotional" not "Instantiate collection"
 * - "Original" = "All notes are yours — one voice"
 * - "Assembled" = "Curate notes from you and the community"
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { createDevotionalBible, updateDevotionalBible, getDevotionalBible } from "../lib/devotional-bibles";
import { SUPPORTED_TRANSLATIONS } from "../lib/constants";
import type { AuthState } from "../types/auth";
import type { DevotionalBibleType } from "../types/devotional-bible";

interface DevotionalFormProps {
  auth: AuthState;
  /** If provided, we're editing an existing devotional (loaded client-side). */
  devotionalId?: string;
}

export function DevotionalForm({ auth, devotionalId }: DevotionalFormProps) {
  const isEditing = !!devotionalId;
  const defaultTranslation = SUPPORTED_TRANSLATIONS.find((t) => t.isDefault)?.id ?? "web";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [translation, setTranslation] = useState<string>(defaultTranslation);
  const [type, setType] = useState<DevotionalBibleType>("original");
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  // Load existing devotional data when editing
  useEffect(() => {
    if (!devotionalId) return;

    getDevotionalBible(supabase, devotionalId)
      .then((data) => {
        if (!data) {
          window.location.href = "/app/devotionals";
          return;
        }
        setTitle(data.title);
        setDescription(data.description ?? "");
        setTranslation(data.translation);
        setType(data.type);
      })
      .catch(() => {
        setError("Couldn't load this devotional.");
      })
      .finally(() => {
        setLoadingExisting(false);
      });
  }, [devotionalId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please give your devotional a title.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing && devotionalId) {
        await updateDevotionalBible(supabase, devotionalId, {
          title: title.trim(),
          description: description.trim(),
          translation,
          type,
        });
        window.location.href = `/app/devotionals/${devotionalId}`;
      } else {
        const bible = await createDevotionalBible(supabase, auth.userId!, {
          title: title.trim(),
          description: description.trim(),
          translation,
          type,
        });
        window.location.href = `/app/devotionals/${bible.id}`;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingExisting) {
    return (
      <div className="space-y-4" role="status">
        <div className="animate-pulse h-8 w-48 rounded bg-edge" />
        <div className="animate-pulse h-12 w-full rounded bg-edge" />
        <div className="animate-pulse h-24 w-full rounded bg-edge" />
        <span className="sr-only">Loading devotional...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back link */}
      <a
        href={isEditing ? `/app/devotionals/${devotionalId}` : "/app/devotionals"}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-heading transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </a>

      <h2 className="text-2xl font-bold text-heading">
        {isEditing ? "Edit devotional" : "Create a new devotional"}
      </h2>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Type toggle */}
      <fieldset>
        <legend className="block text-sm font-medium text-heading mb-2">
          Type
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <TypeOption
            id="type-original"
            value="original"
            label="Original"
            description="All notes are yours — one voice"
            selected={type === "original"}
            onChange={() => setType("original")}
          />
          <TypeOption
            id="type-assembled"
            value="assembled"
            label="Assembled"
            description="Curate notes from you and the community"
            selected={type === "assembled"}
            onChange={() => setType("assembled")}
          />
        </div>
      </fieldset>

      {/* Title */}
      <div>
        <label htmlFor="dev-title" className="block text-sm font-medium text-heading mb-1">
          Title
        </label>
        <input
          id="dev-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Romans Study"
          maxLength={200}
          className="w-full rounded-lg border border-input-border px-4 py-3 text-lg
                     focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="dev-description" className="block text-sm font-medium text-heading mb-1">
          Description <span className="text-faint">(optional)</span>
        </label>
        <textarea
          id="dev-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief summary of this devotional's purpose"
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-input-border px-4 py-3
                     focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Translation */}
      <div>
        <label htmlFor="dev-translation" className="block text-sm font-medium text-heading mb-1">
          Bible translation
        </label>
        <select
          id="dev-translation"
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="w-full rounded-lg border border-input-border bg-panel px-4 py-3
                     focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {SUPPORTED_TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbreviation} — {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="rounded-lg bg-accent px-6 py-3 font-medium text-on-accent
                     hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {saving ? "Saving..." : isEditing ? "Save changes" : "Create devotional"}
        </button>
        <a
          href={isEditing ? `/app/devotionals/${devotionalId}` : "/app/devotionals"}
          className="rounded-lg border border-input-border px-6 py-3 font-medium text-body
                     hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function TypeOption({
  id,
  value,
  label,
  description,
  selected,
  onChange,
}: {
  id: string;
  value: string;
  label: string;
  description: string;
  selected: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer flex-col rounded-lg border p-4 transition-colors
                  ${selected ? "border-accent bg-accent-soft" : "border-edge hover:border-accent"}`}
    >
      <input
        type="radio"
        id={id}
        name="devotional-type"
        value={value}
        checked={selected}
        onChange={onChange}
        className="sr-only"
      />
      <span className="font-medium text-heading">{label}</span>
      <span className="mt-1 text-sm text-muted">{description}</span>
    </label>
  );
}
