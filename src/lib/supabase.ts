/**
 * Supabase client for browser-side use.
 *
 * This client uses the PUBLIC anon key, which is safe to expose in
 * the browser. RLS policies (not this key) are what protect data.
 *
 * For server-side operations that need elevated permissions,
 * use supabase-server.ts instead.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

// These environment variables are prefixed with PUBLIC_ so Astro
// includes them in the client bundle. They're not secrets —
// the anon key is designed to be public (RLS does the real security).
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Typed Supabase client for browser use.
 * The Database generic gives us autocomplete for table names,
 * column names, and return types on every query.
 *
 * Note: The URL/key may be empty during build-time type checking.
 * At runtime, the client won't function without valid credentials —
 * Supabase calls will fail with auth errors, which is the correct
 * behavior (not a silent failure).
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);
