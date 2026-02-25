/**
 * ConnectionStatus — shows a banner when offline and syncs when back online.
 *
 * Grandmother Principle:
 * - Simple yellow/green banner at the top of the screen
 * - "You're offline — your changes will be saved when you reconnect"
 * - "Back online — saving your changes..." with a brief success message
 * - No technical jargon about IndexedDB or sync queues
 *
 * Note: navigator.onLine is unreliable on mobile devices and service-worker
 * pages — it can return false even when the device has internet. We verify
 * with a real network request before showing the offline banner.
 */

import { useState, useEffect, useCallback } from "react";
import { processSync } from "../lib/sync-engine";

/**
 * Checks real connectivity by making cross-origin requests.
 * navigator.onLine lies on Android, WSL Chrome, and some service-worker setups.
 *
 * Must be cross-origin because the service worker caches same-origin requests
 * and would return cached responses even when truly offline.
 * Cross-origin requests bypass our service worker entirely.
 *
 * Tries multiple endpoints because some mobile carriers block direct IP access
 * (e.g., 1.1.1.1) and some networks block specific DNS providers.
 */
async function checkConnectivity(): Promise<boolean> {
  // Try multiple endpoints — if ANY succeed, we're online.
  // mode: "no-cors" gives opaque responses but the promise resolving
  // means the network actually works.
  const endpoints = [
    "https://dns.google/resolve?name=example.com&type=A",
    "https://1.1.1.1",
    "https://www.google.com/generate_204",
  ];

  try {
    await Promise.any(
      endpoints.map((url) =>
        fetch(url, { method: "HEAD", mode: "no-cors" }),
      ),
    );
    return true;
  } catch {
    // All endpoints failed — genuinely offline
    return false;
  }
}

export function ConnectionStatus() {
  // Always assume online initially. navigator.onLine is unreliable on Android,
  // WSL Chrome, and service-worker pages — it returns false even with internet.
  // We verify with real network requests before ever showing the offline banner.
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage("Saving your changes...");

    try {
      const result = await processSync();

      if (result.processed === 0) {
        setSyncMessage(null);
      } else if (result.failed === 0) {
        setSyncMessage("All changes saved!");
        // Clear the success message after 3 seconds
        setTimeout(() => setSyncMessage(null), 3000);
      } else {
        setSyncMessage(
          `Saved ${result.succeeded} changes. ${result.failed} couldn't be saved — try again later.`,
        );
      }
    } catch {
      setSyncMessage("Couldn't save your changes. We'll try again later.");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      triggerSync();
    }

    function handleOffline() {
      // Don't trust the offline event blindly — verify with a real request.
      // navigator.onLine and its events lie on Android, WSL Chrome, etc.
      checkConnectivity().then((reachable) => {
        if (reachable) {
          // Browser lied — we're actually online. Ignore the event.
          return;
        }
        // Genuinely offline — show the banner
        setIsOnline(false);
        setSyncMessage(null);
      });
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync]);

  // Don't render anything when online and there's no sync message
  if (isOnline && !syncMessage) return null;

  return (
    <div
      className={`px-4 py-2 text-center text-sm font-medium ${
        isOnline
          ? syncing
            ? "bg-blue-50 text-blue-700"
            : "bg-green-50 text-green-700"
          : "bg-amber-50 text-amber-700"
      }`}
      role="status"
      aria-live="polite"
    >
      {!isOnline && "You're offline — your changes will be saved when you reconnect."}
      {isOnline && syncMessage}
    </div>
  );
}
