/**
 * Authentication types — defines auth-related shapes used
 * throughout the app for OAuth sign-in state.
 */

/** The four OAuth providers we support via Supabase Auth. */
export type AuthProvider = "google" | "azure" | "discord" | "github";

/**
 * Simplified auth state exposed to the UI.
 * The full Supabase session object stays in the auth layer —
 * components only see what they need.
 */
export interface AuthState {
  /** Whether the user is currently signed in */
  isAuthenticated: boolean;
  /** The user's display name (from their OAuth provider) */
  displayName: string | null;
  /** The user's email (from their OAuth provider) */
  email: string | null;
  /** The user's avatar URL (from their OAuth provider) */
  avatarUrl: string | null;
  /** Supabase user ID — used for database queries */
  userId: string | null;
}
