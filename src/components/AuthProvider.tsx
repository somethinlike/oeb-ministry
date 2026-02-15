/**
 * AuthProvider — React context for auth state in interactive islands.
 *
 * Wraps React components that need to know about the current user.
 * The initial auth state comes from the server (Astro passes it as props),
 * and this context keeps it available throughout the React component tree.
 *
 * This avoids every component needing to call Supabase directly to check
 * if the user is logged in.
 */

import { createContext, useContext, useMemo } from "react";
import type { AuthState } from "../types/auth";
import type { ReactNode } from "react";

// The context starts as undefined — if a component tries to use auth
// outside of the provider, we throw a helpful error (see useAuth below).
const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthProviderProps {
  /** Auth state from the server, passed down as props from Astro */
  initialAuth: AuthState;
  children: ReactNode;
}

export function AuthProvider({ initialAuth, children }: AuthProviderProps) {
  // Memoize so child re-renders don't create a new context value
  // every time (which would cause unnecessary re-renders down the tree).
  const value = useMemo(() => initialAuth, [initialAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state from any component inside an AuthProvider.
 *
 * @example
 * function MyComponent() {
 *   const { isAuthenticated, displayName } = useAuth();
 *   return <p>Hello, {displayName}</p>;
 * }
 */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider. " +
        "Wrap your component tree with <AuthProvider>.",
    );
  }
  return context;
}
