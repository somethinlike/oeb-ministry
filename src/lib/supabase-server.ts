/**
 * Server-side Supabase client for Astro SSR.
 *
 * This client reads/writes auth cookies so sessions persist across
 * page loads. It's used in:
 * - Astro middleware (to check if the user is logged in)
 * - Server-side page rendering (to fetch user-specific data)
 * - API endpoints (to verify auth before database operations)
 *
 * NEVER use this client on the browser side — it accesses cookies
 * directly through Astro's request/response objects.
 */

import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { Database } from "../types/database";

/**
 * Creates a Supabase client that's wired into Astro's cookie system.
 * Each request gets its own client instance (don't share between requests).
 *
 * @param cookies - Astro's cookie helper from the request context
 * @param cookieHeader - The raw Cookie header string from the request
 */
export function createSupabaseServerClient(
  cookies: AstroCookies,
  cookieHeader: string | null,
) {
  return createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // Read all cookies from the incoming request
        getAll() {
          // parseCookieHeader returns an array of { name, value } pairs
          // which matches the GetAllCookies return type
          return parseCookieHeader(cookieHeader ?? "") as {
            name: string;
            value: string;
          }[];
        },
        // Write cookies back to the response (for session refresh, etc.)
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, {
              // Start with Supabase's own options, then override
              // the ones we need to control.
              ...options,
              path: "/",
              httpOnly: true,
              sameSite: "lax",
              // MUST come after ...options so we override Supabase's
              // default of secure:true. On local dev (HTTP), secure
              // cookies are silently rejected by the browser, which
              // completely breaks auth.
              secure: import.meta.env.PROD,
            });
          });
        },
      },
    },
  );
}
