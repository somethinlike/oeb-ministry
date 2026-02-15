/**
 * SignInForm — four large OAuth provider buttons.
 *
 * Follows the Grandmother Principle:
 * - Large, clearly labeled buttons with provider icons
 * - One action per button — click to sign in
 * - No confusing OAuth jargon — just "Sign in with Google"
 * - Keyboard accessible with visible focus indicators
 */

import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { AuthProvider } from "../types/auth";

interface SignInFormProps {
  returnUrl: string;
}

/** Maps our provider IDs to Supabase's expected provider names. */
const PROVIDER_CONFIG: {
  id: AuthProvider;
  label: string;
  supabaseProvider: "google" | "azure" | "discord" | "github";
  // Using SVG paths for icons to avoid external dependencies
  iconPath: string;
  bgColor: string;
  hoverColor: string;
  textColor: string;
}[] = [
  {
    id: "google",
    label: "Sign in with Google",
    supabaseProvider: "google",
    iconPath:
      "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
    bgColor: "bg-white",
    hoverColor: "hover:bg-gray-50",
    textColor: "text-gray-700",
  },
  {
    id: "github",
    label: "Sign in with GitHub",
    supabaseProvider: "github",
    iconPath:
      "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
    bgColor: "bg-gray-900",
    hoverColor: "hover:bg-gray-800",
    textColor: "text-white",
  },
  // Microsoft/Azure — disabled until Azure App Registration is configured
  // {
  //   id: "azure",
  //   label: "Sign in with Microsoft",
  //   supabaseProvider: "azure",
  //   iconPath:
  //     "M3 3h8.5v8.5H3V3zm9.5 0H21v8.5h-8.5V3zM3 12.5h8.5V21H3v-8.5zm9.5 0H21V21h-8.5v-8.5z",
  //   bgColor: "bg-blue-600",
  //   hoverColor: "hover:bg-blue-700",
  //   textColor: "text-white",
  // },
  {
    id: "discord",
    label: "Sign in with Discord",
    supabaseProvider: "discord",
    iconPath:
      "M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z",
    bgColor: "bg-indigo-600",
    hoverColor: "hover:bg-indigo-700",
    textColor: "text-white",
  },
];

export function SignInForm({ returnUrl }: SignInFormProps) {
  const [loading, setLoading] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(provider: (typeof PROVIDER_CONFIG)[number]) {
    setLoading(provider.id);
    setError(null);

    // Build the callback URL, ensuring we always use "localhost" (not
    // "127.0.0.1") because WSL2 only forwards localhost to the VM.
    const origin = window.location.origin.replace("127.0.0.1", "localhost");

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: provider.supabaseProvider,
      options: {
        // After OAuth, Supabase redirects here with auth tokens.
        // The callback page detects the tokens and sets the session.
        redirectTo: `${origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`,
      },
    });

    if (authError) {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
    // If successful, the browser redirects to the OAuth provider's page
    // so we don't need to do anything else here.
  }

  return (
    <div className="space-y-3" role="group" aria-label="Sign in options">
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {PROVIDER_CONFIG.map((provider) => (
        <button
          key={provider.id}
          onClick={() => handleSignIn(provider)}
          disabled={loading !== null}
          className={`
            flex w-full items-center justify-center gap-3 rounded-lg
            ${provider.bgColor} ${provider.hoverColor} ${provider.textColor}
            px-6 py-4 text-lg font-medium
            border border-gray-200 shadow-sm
            transition-colors duration-150
            focus:outline-none focus:ring-4 focus:ring-blue-300
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label={provider.label}
        >
          {/* Provider icon */}
          <svg
            className="h-6 w-6 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d={provider.iconPath} />
          </svg>

          {/* Button text */}
          <span>
            {loading === provider.id ? "Connecting..." : provider.label}
          </span>
        </button>
      ))}

      <p className="mt-6 text-center text-sm text-gray-500">
        By signing in, you agree to use this tool respectfully and in
        accordance with Christ&apos;s ethics.
      </p>
    </div>
  );
}
