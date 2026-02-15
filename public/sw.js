/**
 * Service Worker — handles offline caching.
 *
 * Caching strategies:
 * - Bible text (static JSON): Cache-First (immutable content, fast reads)
 * - App shell (HTML, CSS, JS): Stale-While-Revalidate (show cached, update in background)
 * - API/Supabase calls: Network-First (always try fresh data, fall back to cache)
 */

const CACHE_NAME = "oeb-v1";
const BIBLE_CACHE = "oeb-bibles-v1";

// App shell files to pre-cache during install
const PRECACHE_URLS = ["/", "/app/read"];

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

  // Bible text files — Cache-First (they never change)
  if (url.pathname.startsWith("/bibles/")) {
    event.respondWith(cacheFirst(event.request, BIBLE_CACHE));
    return;
  }

  // Supabase API calls — Network-First
  if (url.hostname.includes("supabase")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Everything else (app shell) — Stale-While-Revalidate
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
