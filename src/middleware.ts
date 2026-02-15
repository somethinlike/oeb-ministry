/**
 * Astro middleware — runs on EVERY server-rendered request.
 *
 * Creates a Supabase server client and attaches it to locals.
 * Tries to read user session from cookies (set by the browser client).
 *
 * Note: Route protection is handled CLIENT-SIDE by the React auth
 * context, not here. This avoids cookie-sync issues between the
 * browser Supabase client and the server client. RLS policies are
 * the real security boundary — the client-side redirect is just UX.
 */

import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "./lib/supabase-server";

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, request, locals } = context;

  // Create a Supabase client for this specific request
  const supabase = createSupabaseServerClient(
    cookies,
    request.headers.get("cookie"),
  );

  // Try to read the user from cookies. This may be null if the
  // browser client hasn't synced session cookies yet (e.g., right
  // after OAuth callback). That's OK — client-side auth handles it.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  locals.user = user;
  locals.supabase = supabase;

  // No server-side redirects — let all pages render.
  // Client-side auth context handles redirecting unauthenticated
  // users away from /app/* pages.
  return next();
});
