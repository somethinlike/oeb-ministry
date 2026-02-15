/**
 * Astro middleware — runs on EVERY server-rendered request.
 *
 * Creates a Supabase server client and attempts to read the user
 * session from cookies. If it can't (malformed cookies, encoding
 * errors, etc.), it gracefully falls back to null — client-side
 * auth handles the rest.
 *
 * Route protection is client-side (AppLayout script + AuthGuard).
 * RLS policies are the real security boundary.
 */

import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "./lib/supabase-server";

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, request, locals } = context;

  // Default to no auth — client-side will check independently
  locals.user = null;
  locals.supabase = null;

  try {
    const supabase = createSupabaseServerClient(
      cookies,
      request.headers.get("cookie"),
    );
    locals.supabase = supabase;

    // Try to read user from session cookies. This can fail if the
    // browser client's cookies use a different encoding than the
    // server client expects (e.g., Invalid UTF-8 sequence errors).
    const { data } = await supabase.auth.getUser();
    locals.user = data.user;
  } catch {
    // Any error (network, cookie parsing, UTF-8 decode) — just
    // treat as unauthenticated. Client-side auth handles it.
    locals.user = null;
  }

  return next();
});
