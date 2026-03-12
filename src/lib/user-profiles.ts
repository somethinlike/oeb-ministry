/**
 * User profile service — CRUD for public author profiles.
 *
 * Each user can optionally create a profile with a URL slug,
 * display name, and bio. This enables /profile/{slug} pages
 * and author links in community feeds.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { UserProfile, UserProfileFormData } from "../types/user-profile";

type DbClient = SupabaseClient<Database>;

/** Maps a database row to our UserProfile type. */
function mapRow(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    slug: row.slug as string,
    displayName: row.display_name as string,
    bio: (row.bio as string) ?? "",
    avatarUrl: (row.avatar_url as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Slug Validation ──

/** Reserved slugs that can't be used as profile URLs. */
const RESERVED_SLUGS = new Set([
  "admin", "moderator", "settings", "community", "search",
  "read", "profile", "auth", "api", "app", "help", "about",
  "new", "edit", "delete", "devotionals", "moderation",
  "signin", "signout", "callback", "recycle-bin",
]);

/**
 * Validates a slug string against format and reservation rules.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateSlug(slug: string): string | null {
  if (slug.length < 3) return "Must be at least 3 characters";
  if (slug.length > 30) return "Must be 30 characters or fewer";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return "Use lowercase letters, numbers, and hyphens. Must start and end with a letter or number.";
  }
  if (/--/.test(slug)) return "Cannot contain consecutive hyphens";
  if (RESERVED_SLUGS.has(slug)) return "This name is reserved";
  return null;
}

// ── Read Operations ──

/** Fetch a profile by user ID. Returns null if the user has no profile. */
export async function getProfileByUserId(
  client: DbClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await (client as any)
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data);
}

/** Fetch a profile by slug (for public profile pages). Returns null if not found. */
export async function getProfileBySlug(
  client: DbClient,
  slug: string,
): Promise<UserProfile | null> {
  const { data, error } = await (client as any)
    .from("user_profiles")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data);
}

/** Check if a slug is already taken. */
export async function isSlugAvailable(
  client: DbClient,
  slug: string,
  excludeUserId?: string,
): Promise<boolean> {
  const query = (client as any)
    .from("user_profiles")
    .select("id")
    .eq("slug", slug.toLowerCase());

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  if (!data) return true;

  // If we're checking for the current user's own slug, it's "available"
  if (excludeUserId) {
    const profile = await getProfileByUserId(client, excludeUserId);
    if (profile && profile.slug === slug.toLowerCase()) return true;
  }

  return false;
}

// ── Write Operations ──

/** Create a new user profile. */
export async function createProfile(
  client: DbClient,
  userId: string,
  formData: UserProfileFormData,
): Promise<UserProfile> {
  const slugError = validateSlug(formData.slug);
  if (slugError) throw new Error(`Invalid slug: ${slugError}`);

  if (!formData.displayName.trim()) {
    throw new Error("Display name is required");
  }

  const { data, error } = await (client as any)
    .from("user_profiles")
    .insert({
      user_id: userId,
      slug: formData.slug.toLowerCase(),
      display_name: formData.displayName.trim(),
      bio: formData.bio.trim().slice(0, 500),
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation on slug
    if (error.code === "23505" && error.message?.includes("slug")) {
      throw new Error("This profile URL is already taken");
    }
    throw error;
  }
  return mapRow(data);
}

/** Update an existing user profile. */
export async function updateProfile(
  client: DbClient,
  userId: string,
  formData: Partial<UserProfileFormData>,
): Promise<UserProfile> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.slug !== undefined) {
    const slugError = validateSlug(formData.slug);
    if (slugError) throw new Error(`Invalid slug: ${slugError}`);
    updates.slug = formData.slug.toLowerCase();
  }

  if (formData.displayName !== undefined) {
    if (!formData.displayName.trim()) {
      throw new Error("Display name is required");
    }
    updates.display_name = formData.displayName.trim();
  }

  if (formData.bio !== undefined) {
    updates.bio = formData.bio.trim().slice(0, 500);
  }

  const { data, error } = await (client as any)
    .from("user_profiles")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505" && error.message?.includes("slug")) {
      throw new Error("This profile URL is already taken");
    }
    throw error;
  }
  return mapRow(data);
}

/** Delete a user profile. */
export async function deleteProfile(
  client: DbClient,
  userId: string,
): Promise<void> {
  const { error } = await (client as any)
    .from("user_profiles")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Batch-fetch profile slugs for a set of user IDs.
 * Returns a map of userId → slug for users who have profiles.
 * Used by community feeds to link author names to their profile pages.
 */
export async function getProfileSlugsForUsers(
  client: DbClient,
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  // Deduplicate
  const unique = [...new Set(userIds)];

  const { data, error } = await (client as any)
    .from("user_profiles")
    .select("user_id, slug")
    .in("user_id", unique);

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.user_id, row.slug);
  }
  return map;
}

// ── Public Content Queries ──

/**
 * Get a user's published annotations (for their profile page).
 * Only returns approved, non-deleted, non-encrypted annotations.
 */
export async function getPublishedAnnotationsByUser(
  client: DbClient,
  userId: string,
  options: { limit?: number } = {},
): Promise<unknown[]> {
  const limit = options.limit ?? 50;

  const { data, error } = await (client as any)
    .from("annotations")
    .select("id, book, chapter, verse_start, verse_end, content_md, author_display_name, published_at")
    .eq("user_id", userId)
    .eq("is_public", true)
    .eq("publish_status", "approved")
    .is("deleted_at", null)
    .eq("is_encrypted", false)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Get a user's published devotional bibles (for their profile page).
 * Only returns approved, non-deleted devotionals.
 */
export async function getPublishedDevotionalsByUser(
  client: DbClient,
  userId: string,
  options: { limit?: number } = {},
): Promise<unknown[]> {
  const limit = options.limit ?? 20;

  const { data, error } = await (client as any)
    .from("devotional_bibles")
    .select("id, title, description, translation, type, author_display_name, entry_count, published_at")
    .eq("user_id", userId)
    .eq("is_published", true)
    .eq("publish_status", "approved")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
