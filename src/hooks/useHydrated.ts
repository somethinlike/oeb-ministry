/**
 * useHydrated — returns `true` only after React hydration is complete.
 *
 * WHY THIS EXISTS:
 * Astro renders components on the server (SSR) where browser APIs like
 * `window`, `localStorage`, `caches`, and `navigator` don't exist. React
 * then "hydrates" the server HTML on the client, and the first client
 * render MUST produce identical HTML to what the server sent. If it
 * doesn't, React throws a hydration mismatch error and re-renders the
 * entire component tree from scratch — which is why pages sometimes
 * need multiple refreshes to load correctly.
 *
 * HOW TO USE:
 *   const hydrated = useHydrated();
 *
 *   // Gate browser-only JSX:
 *   {hydrated && <OfflineButton />}
 *
 *   // Gate browser-only state initialization:
 *   const width = hydrated ? window.innerWidth : 0;
 *
 * The hook returns `false` during SSR and on the first client render
 * (the hydration pass), then flips to `true` on the next tick.
 * This guarantees the hydration render matches the server.
 */

import { useState, useEffect } from "react";

/** Singleton so every component shares the same post-hydration signal */
let hydrated = false;

export function useHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(hydrated);

  useEffect(() => {
    hydrated = true;
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
