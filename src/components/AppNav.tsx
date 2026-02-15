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
  // Temporary debug state — will remove once avatar issue is diagnosed
  const [debugInfo, setDebugInfo] = useState<string>("loading...");

  useEffect(() => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setAuth(authFromUser(session.user));
          const meta = session.user.user_metadata ?? {};
          setDebugInfo(`event: ${_event} | avatar_url: ${meta.avatar_url ?? "MISSING"} | picture: ${meta.picture ?? "MISSING"} | keys: ${Object.keys(meta).join(", ")}`);
        }
      },
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuth(authFromUser(session.user));
        const meta = session.user.user_metadata ?? {};
        setDebugInfo(`getSession | avatar_url: ${meta.avatar_url ?? "MISSING"} | picture: ${meta.picture ?? "MISSING"} | keys: ${Object.keys(meta).join(", ")}`);
      } else {
        setDebugInfo("getSession returned no user");
      }
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
            </div>
          </div>

          {/* Right side: User info + sign out */}
          <div className="hidden sm:flex sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <UserAvatar avatarUrl={auth.avatarUrl} displayName={auth.displayName} />
              <span className="text-sm text-gray-700">
                {auth.displayName}
              </span>
            </div>
            {/* TEMPORARY DEBUG — remove after avatar issue is fixed */}
            <div className="flex flex-col text-xs text-red-500">
              <span className="max-w-xs truncate">{debugInfo}</span>
              {auth.avatarUrl && (
                <span>img test: <img src={auth.avatarUrl} className="inline h-6 w-6" referrerPolicy="no-referrer" /> | raw url: <a href={auth.avatarUrl} target="_blank" className="underline text-blue-500">click to test</a></span>
              )}
            </div>
            <a
              href="/auth/signout"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sign out
            </a>
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
            <hr className="my-2 border-gray-200" />
            <div className="flex items-center gap-2 px-3 py-2">
              <UserAvatar avatarUrl={auth.avatarUrl} displayName={auth.displayName} />
              <span className="text-sm text-gray-700">
                {auth.displayName}
              </span>
            </div>
            <MobileNavLink href="/auth/signout" label="Sign out" />
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
