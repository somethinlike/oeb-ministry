/**
 * AppNav — top navigation bar for authenticated pages.
 *
 * Shows: Bible reader link, My Notes link, user avatar/name, sign out.
 * Mobile responsive: collapses to hamburger menu on small screens.
 * Follows Grandmother Principle: clear labels, large tap targets.
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { AuthState } from "../types/auth";

interface AppNavProps {
  auth: AuthState;
}

export function AppNav({ auth: initialAuth }: AppNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>(initialAuth);

  useEffect(() => {
    // If server already provided full auth data, no need to re-fetch
    if (initialAuth.avatarUrl && initialAuth.displayName) return;

    // Helper to extract auth state from a Supabase user object.
    // Checks both "avatar_url" (deprecated but set by all providers)
    // and "picture" (standard OIDC field) for future-proofing.
    function authFromUser(user: { id: string; email?: string; user_metadata: Record<string, unknown> }): AuthState {
      const meta = user.user_metadata ?? {};
      return {
        isAuthenticated: true,
        displayName: (meta.full_name as string) ?? (meta.name as string) ?? user.email ?? "User",
        email: user.email ?? null,
        avatarUrl: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
        userId: user.id,
      };
    }

    // Listen for auth state changes — fires reliably even if the session
    // isn't ready yet when the component first mounts (common after the
    // PKCE flow redirect).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setAuth(authFromUser(session.user));
        }
      },
    );

    // Also try immediately in case the session is already available.
    // Uses getUser() (not deprecated getSession()) for reliable auth checks.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuth(authFromUser(user));
      }
    }).catch(() => {
      // Supabase call failed (e.g., network error) — stay unauthenticated
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav
      className="border-b border-gray-200 bg-white"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side: Logo + nav links */}
          <div className="flex items-center gap-8">
            <a
              href="/app/read"
              className="text-xl font-bold text-gray-900"
              aria-label="OEB Ministry home"
            >
              OEB Ministry
            </a>

            {/* Desktop nav links — hidden on mobile */}
            <div className="hidden sm:flex sm:gap-4">
              <NavLink href="/app/read" label="Read Bible" />
              <NavLink href="/app/search" label="My Notes" />
              <NavLink href="/translations" label="Translations" />
              <NavLink href="/open-source-theology" label="Our Ethics" />
            </div>
          </div>

          {/* Right side: User info + sign out (authenticated) or Sign in link */}
          <div className="hidden sm:flex sm:items-center sm:gap-4">
            {auth.isAuthenticated ? (
              <>
                <div className="flex items-center gap-2">
                  <UserAvatar avatarUrl={auth.avatarUrl} displayName={auth.displayName} />
                  <span className="text-sm text-gray-700">
                    {auth.displayName}
                  </span>
                </div>
                <a
                  href="/auth/signout"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Sign out
                </a>
              </>
            ) : (
              <a
                href="/auth/signin"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Sign in
              </a>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="sm:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {/* Hamburger / X icon */}
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu — slides open below the nav bar */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200" id="mobile-menu">
          <div className="space-y-1 px-4 py-3">
            <MobileNavLink href="/app/read" label="Read Bible" />
            <MobileNavLink href="/app/search" label="My Notes" />
            <MobileNavLink href="/translations" label="Translations" />
            <MobileNavLink href="/open-source-theology" label="Our Ethics" />
            <hr className="my-2 border-gray-200" />
            {auth.isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2">
                  <UserAvatar avatarUrl={auth.avatarUrl} displayName={auth.displayName} />
                  <span className="text-sm text-gray-700">
                    {auth.displayName}
                  </span>
                </div>
                <MobileNavLink href="/auth/signout" label="Sign out" />
              </>
            ) : (
              <MobileNavLink href="/auth/signin" label="Sign in" />
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/** Desktop navigation link with consistent styling. */
function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {label}
    </a>
  );
}

/** Mobile navigation link — full width, larger tap target. */
function MobileNavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block rounded-lg px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {label}
    </a>
  );
}

/** User avatar with automatic fallback to letter initial if the image fails. */
function UserAvatar({ avatarUrl, displayName }: { avatarUrl: string | null; displayName: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (displayName ?? "U").charAt(0).toUpperCase();

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-8 w-8 rounded-full"
        aria-hidden="true"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
