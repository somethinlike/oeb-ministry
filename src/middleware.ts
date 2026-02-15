/**
 * Astro middleware — runs on EVERY server-rendered request.
 *
 * Responsibilities:
 * 1. Creates a Supabase client with cookie-based auth
 * 2. Refreshes the user's session (so they don't get logged out unexpectedly)
 * 3. Attaches user info to Astro.locals (available in all pages/layouts)
 * 4. Protects /app/* routes — redirects unauthenticated users to sign-in
 */

import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "./lib/supabase-server";

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, request, redirect, locals, url } = context;

  // Create a Supabase client for this specific request
  const supabase = createSupabaseServerClient(
    cookies,
    request.headers.get("cookie"),
  );

  // Refresh the session — this also validates the JWT token.
  // If the session is expired, Supabase handles the refresh automatically.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Attach auth info to locals so pages/components can access it
  // without making another Supabase call.
  locals.user = user;
  locals.supabase = supabase;

  // ── Route protection ──
  // Any route under /app/ requires authentication.
  // Public pages (landing, auth pages) are accessible to everyone.
  const isProtectedRoute = url.pathname.startsWith("/app");
  const isAuthenticated = !!user;

  if (isProtectedRoute && !isAuthenticated) {
    // Remember where they were trying to go so we can redirect back after sign-in
    const returnUrl = encodeURIComponent(url.pathname);
    return redirect(`/auth/signin?returnUrl=${returnUrl}`);
  }

  return next();
});
