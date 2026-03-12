/**
 * User profile types — defines the data model for public author profiles.
 *
 * Profiles are optional. When a user creates one, their published content
 * links to /profile/{slug} instead of showing "Anonymous".
 */

/**
 * A public user profile as stored in the database.
 */
export interface UserProfile {
  id: string;
  userId: string;
  /** URL-safe slug for the profile page (/profile/{slug}) */
  slug: string;
  /** Public display name (may differ from OAuth provider name) */
  displayName: string;
  /** Short bio/description (up to 500 chars) */
  bio: string;
  /** Avatar URL (falls back to OAuth avatar if null) */
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data for creating or editing a user profile.
 */
export interface UserProfileFormData {
  slug: string;
  displayName: string;
  bio: string;
}
