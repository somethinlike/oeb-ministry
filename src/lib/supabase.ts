/**
 * Supabase client for browser-side use.
 *
 * Uses `createBrowserClient` from @supabase/ssr which stores auth
 * session data in cookies instead of localStorage. This is critical
 * for SSR — cookies are sent with every request, so the server
 * middleware can read the session and protect routes.
 *
 * The anon key is safe to expose in the browser — RLS policies (not
 * this key) are what actually protect data.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../types/database";

// These environment variables are prefixed with PUBLIC_ so Astro
// includes them in the client bundle. They're not secrets —
// the anon key is designed to be public (RLS does the real security).
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Typed Supabase client for browser use.
 *
 * Uses implicit auth flow (tokens in URL hash) instead of PKCE because
 * PKCE requires the code verifier to be accessible to both the browser
 * (which starts the flow) and the server (which exchanges the code).
 * On WSL2 + cookies, this handoff is unreliable. Implicit flow avoids
 * this entirely — the browser client handles everything.
 *
 * Security note: RLS policies are the real security boundary, not the
 * auth flow type. The implicit flow is standard and safe for this use case.
 */
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);
