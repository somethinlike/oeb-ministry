/**
 * AuthGuard — client-side auth protection for /app/* pages.
 *
 * Checks if the user is signed in using the browser Supabase client.
 * If not, redirects to the sign-in page. If yes, renders children.
 *
 * This replaces server-side middleware redirects, which had cookie-sync
 * issues between the browser and server Supabase clients. RLS policies
 * remain the real security boundary — this is just UX.
 */

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { AuthState } from "../types/auth";
import type { User } from "@supabase/supabase-js";

interface AuthGuardProps {
  /** Auth state from the server (may be null if cookies haven't synced) */
  serverAuth: AuthState | null;
  children: ReactNode;
}

/** Converts a Supabase User object to our simplified AuthState. */
function userToAuthState(user: User): AuthState {
  return {
    isAuthenticated: true,
    displayName: user.user_metadata?.full_name ?? user.email ?? "User",
    email: user.email ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    userId: user.id,
  };
}

export function AuthGuard({ serverAuth, children }: AuthGuardProps) {
  // Start with server auth if available, otherwise null (loading)
  const [auth, setAuth] = useState<AuthState | null>(serverAuth);
  const [checking, setChecking] = useState(!serverAuth);

  useEffect(() => {
    // If the server already confirmed auth, no need to check client-side
    if (serverAuth?.isAuthenticated) {
      return;
    }

    // Server didn't have auth — check client-side (browser Supabase client
    // may have the session in cookies even if the server couldn't read them)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuth(userToAuthState(user));
      } else {
        // Not authenticated — redirect to sign-in
        const returnUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/auth/signin?returnUrl=${returnUrl}`;
      }
      setChecking(false);
    });
  }, [serverAuth]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!auth?.isAuthenticated) {
    // Still waiting for redirect
    return null;
  }

  return <>{children}</>;
}

/** Hook for child components to access the auth state. */
export { userToAuthState };
