/**
 * AppNav — top navigation bar for authenticated pages.
 *
 * Shows: Bible reader link, My Notes link (with optional dropdown), user avatar/name, sign out.
 * Mobile responsive: collapses to hamburger menu on small screens.
 * Follows Grandmother Principle: clear labels, large tap targets.
 *
 * "My Notes" transforms into an expandable dropdown when the user has
 * deleted notes (Recycle Bin) or published notes. When neither exists,
 * it stays as a simple link.
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import {
  hasDeletedAnnotations,
  hasPublishedAnnotations,
} from "../lib/annotations";
import type { AuthState } from "../types/auth";

interface AppNavProps {
  auth: AuthState;
}

export function AppNav({ auth: initialAuth }: AppNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>(initialAuth);
  const [notesMenuOpen, setNotesMenuOpen] = useState(false);
  const [hasDeleted, setHasDeleted] = useState(false);
  const [hasPublished, setHasPublished] = useState(false);

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

  // Check if the user has deleted or published notes (for the dropdown menu).
  // Two lightweight COUNT queries — sub-millisecond, no row data transferred.
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.userId) return;

    hasDeletedAnnotations(supabase, auth.userId).then(setHasDeleted).catch(() => {});
    hasPublishedAnnotations(supabase, auth.userId).then(setHasPublished).catch(() => {});
  }, [auth.isAuthenticated, auth.userId]);

  const needsNotesMenu = hasDeleted || hasPublished;

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
              aria-label="Open Bible Ministry home"
            >
              Open Bible Ministry
            </a>

            {/* Desktop nav links — hidden on mobile */}
            <div className="hidden sm:flex sm:gap-4">
              <NavLink href="/app/read" label="Read Bible" />
              {needsNotesMenu ? (
                <NotesDropdown
                  open={notesMenuOpen}
                  onToggle={() => setNotesMenuOpen((prev) => !prev)}
                  onClose={() => setNotesMenuOpen(false)}
                  hasDeleted={hasDeleted}
                  hasPublished={hasPublished}
                />
              ) : (
                <NavLink href="/app/search" label="My Notes" />
              )}
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
            {hasDeleted && (
              <MobileNavLink href="/app/recycle-bin" label="Recycle Bin" indent />
            )}
            {hasPublished && (
              <MobileNavLink href="/app/published" label="My Published Notes" indent />
            )}
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

/** Desktop "My Notes" dropdown — shows sub-links for Recycle Bin and Published Notes. */
function NotesDropdown({
  open,
  onToggle,
  onClose,
  hasDeleted,
  hasPublished,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  hasDeleted: boolean;
  hasPublished: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={open}
        aria-haspopup="true"
      >
        My Notes
        <svg
          className={`h-4 w-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50"
          role="menu"
        >
          <DropdownLink href="/app/search" label="My Notes" />
          {hasDeleted && <DropdownLink href="/app/recycle-bin" label="Recycle Bin" />}
          {hasPublished && <DropdownLink href="/app/published" label="My Published Notes" />}
        </div>
      )}
    </div>
  );
}

/** A single link inside the desktop dropdown menu. */
function DropdownLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      role="menuitem"
      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:bg-gray-100"
    >
      {label}
    </a>
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
function MobileNavLink({ href, label, indent }: { href: string; label: string; indent?: boolean }) {
  return (
    <a
      href={href}
      className={`block rounded-lg py-3 text-base font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        indent ? "pl-8 pr-3 text-sm text-gray-500" : "px-3"
      }`}
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
