/**
 * ProfileEditor — settings panel for creating/editing the user's public profile.
 *
 * Grandmother Principle:
 * - "Your public page" not "Profile configuration"
 * - Clear preview of what the URL will look like
 * - Simple form: name, short bio, URL
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  getProfileByUserId,
  createProfile,
  updateProfile,
  deleteProfile,
  validateSlug,
  isSlugAvailable,
} from "../lib/user-profiles";
import type { UserProfile } from "../types/user-profile";

interface ProfileEditorProps {
  userId: string;
  /** Fallback display name from OAuth (pre-fills create form) */
  defaultDisplayName: string;
}

export function ProfileEditor({ userId, defaultDisplayName }: ProfileEditorProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [bio, setBio] = useState("");

  // Slug validation state
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load existing profile on mount
  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const existing = await getProfileByUserId(supabase, userId);
      if (existing) {
        setProfile(existing);
        setSlug(existing.slug);
        setDisplayName(existing.displayName);
        setBio(existing.bio);
      }
    } catch {
      // No profile yet — that's fine
    } finally {
      setLoading(false);
    }
  }

  // Debounced slug availability check via useEffect
  // Fires whenever `slug` changes (including pre-fill from existing profile)
  useEffect(() => {
    if (slug.length < 3) {
      setSlugError(null);
      setSlugAvailable(null);
      return;
    }

    const validationError = validateSlug(slug);
    if (validationError) {
      setSlugError(validationError);
      setSlugAvailable(null);
      return;
    }

    setSlugError(null);
    setCheckingSlug(true);

    const timer = setTimeout(async () => {
      try {
        const available = await isSlugAvailable(supabase, slug, userId);
        setSlugAvailable(available);
        if (!available) {
          setSlugError("This URL is already taken");
        }
      } catch {
        setSlugError("Couldn't check availability");
      } finally {
        setCheckingSlug(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      setCheckingSlug(false);
    };
  }, [slug, userId]);

  function handleSlugChange(value: string) {
    // Auto-format: lowercase, replace spaces/underscores with hyphens
    const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-");
    setSlug(formatted);
    setSlugAvailable(null);
    setSlugError(null);
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      if (profile) {
        // Update existing profile
        const updated = await updateProfile(supabase, userId, {
          slug,
          displayName,
          bio,
        });
        setProfile(updated);
        setSuccess("Profile updated");
      } else {
        // Create new profile
        const created = await createProfile(supabase, userId, {
          slug,
          displayName,
          bio,
        });
        setProfile(created);
        setSuccess("Profile created! Your page is now live.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setSaving(true);
    try {
      await deleteProfile(supabase, userId);
      setProfile(null);
      setSlug("");
      setDisplayName(defaultDisplayName);
      setBio("");
      setConfirmDelete(false);
      setSuccess("Profile removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-24 rounded bg-muted/20 animate-pulse" />;
  }

  const canSave =
    slug.length >= 3 &&
    !slugError &&
    displayName.trim().length > 0 &&
    !checkingSlug &&
    !saving;

  return (
    <div className="space-y-4">
      {/* Slug / URL field */}
      <div>
        <label htmlFor="profile-slug" className="block text-sm font-medium text-heading mb-1">
          Your profile URL
        </label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted">/profile/</span>
          <input
            id="profile-slug"
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="your-name"
            maxLength={30}
            className="flex-1 rounded border border-edge bg-surface px-2 py-1.5 text-sm text-heading
                       focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        {slugError && (
          <p className="text-xs text-red-500 mt-1">{slugError}</p>
        )}
        {checkingSlug && (
          <p className="text-xs text-muted mt-1">Checking availability...</p>
        )}
        {slugAvailable === true && !slugError && slug.length >= 3 && (
          <p className="text-xs text-green-600 mt-1">Available!</p>
        )}
      </div>

      {/* Display name */}
      <div>
        <label htmlFor="profile-name" className="block text-sm font-medium text-heading mb-1">
          Display name
        </label>
        <input
          id="profile-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          maxLength={50}
          className="w-full rounded border border-edge bg-surface px-2 py-1.5 text-sm text-heading
                     focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="profile-bio" className="block text-sm font-medium text-heading mb-1">
          Short bio
          <span className="text-xs text-muted font-normal ml-1">(optional, {500 - bio.length} characters left)</span>
        </label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          placeholder="A few words about yourself..."
          rows={3}
          maxLength={500}
          className="w-full rounded border border-edge bg-surface px-2 py-1.5 text-sm text-heading
                     resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      {/* Error / success messages */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">{success}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-on-accent
                     hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {saving ? "Saving..." : profile ? "Save changes" : "Create profile"}
        </button>

        {profile && (
          <a
            href={`/profile/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:text-accent-hover underline"
          >
            View your page
          </a>
        )}

        {profile && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-500 hover:text-red-600 ml-auto"
          >
            Remove profile
          </button>
        )}

        {confirmDelete && (
          <div className="flex items-center gap-2 ml-auto text-sm">
            <span className="text-muted">Remove your public page?</span>
            <button
              onClick={handleDelete}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-red-500 hover:text-red-600 font-medium"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
