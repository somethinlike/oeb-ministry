/**
 * Service Worker — handles offline caching.
 *
 * Caching strategies:
 * - Bible text (static JSON): Cache-First (immutable content, fast reads)
 * - HTML navigation: Network-First (always get fresh HTML with correct asset hashes)
 * - Hashed assets (/_astro/*.js, *.css): Cache-First (content hash = immutable)
 * - Other static assets: Stale-While-Revalidate (show cached, update in background)
 */

const CACHE_NAME = "oeb-v2";
const BIBLE_CACHE = "oeb-bibles-v1";

// App shell files to pre-cache during install.
// Only include static, public pages here — NOT auth-gated routes
// (caching /app/read when unauthenticated would cache an error).
const PRECACHE_URLS = ["/"];

// ── Install: pre-cache the app shell ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  // Activate immediately instead of waiting for existing tabs to close
  self.skipWaiting();
});

// ── Activate: clean up old caches ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== BIBLE_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: route requests to appropriate caching strategy ──
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests (POST/PUT/DELETE go straight to network)
  if (event.request.method !== "GET") return;

  // Only handle requests to our own origin — external URLs (avatar
  // images, third-party CDNs, etc.) should go straight to the network.
  // Without this check, external images get routed through staleWhileRevalidate
  // and break because the SW can't properly cache cross-origin responses.
  if (url.origin !== self.location.origin) return;

  // Never cache auth pages or the callback — these depend on
  // fresh server state and caching them causes redirect loops.
  if (url.pathname.startsWith("/auth/")) return;

  // Don't cache server-rendered app pages during navigation.
  // These depend on auth state and shouldn't be served from cache.
  // (Static assets like JS/CSS bundles ARE cached via the fallthrough below.)
  if (event.request.mode === "navigate" && url.pathname.startsWith("/app/")) return;

  // Bible text files — Cache-First (they never change)
  if (url.pathname.startsWith("/bibles/")) {
    event.respondWith(cacheFirst(event.request, BIBLE_CACHE));
    return;
  }

  // Note: Supabase API calls are external-origin, so they're already
  // skipped by the origin check above. No special handling needed.

  // Navigation requests (HTML pages) — Network-First.
  // This prevents a stale-while-revalidate race condition: after a
  // deployment, hashed asset filenames change (e.g., annotate.ABC123.css
  // becomes annotate.DEF456.css). If we served stale HTML, it would
  // reference the OLD CSS filename which no longer exists → unstyled page.
  // Network-First ensures we always get fresh HTML with correct asset hashes,
  // falling back to cache only when genuinely offline.
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Hashed static assets (/_astro/*.js, /_astro/*.css) — Cache-First.
  // These filenames include a content hash, so they're effectively
  // immutable — if the hash matches, the content is guaranteed correct.
  if (url.pathname.startsWith("/_astro/")) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
    return;
  }

  // Everything else (unhashed static assets) — Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

/**
 * Cache-First: Check cache first, only fetch from network if not cached.
 * Perfect for immutable content like Bible text files.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Stale-While-Revalidate: Return cached version immediately (fast),
 * then fetch a fresh version in the background for next time.
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(CACHE_NAME);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached); // If network fails and we have cache, use it

  // Return cached version immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

/**
 * Network-First: Try the network, fall back to cache if offline.
 * Used for API calls where fresh data is preferred.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503 });
  }
}
