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
 * Checks real connectivity by making a cross-origin request.
 * navigator.onLine lies on Android, WSL Chrome, and some service-worker setups.
 *
 * Must be cross-origin because the service worker caches same-origin requests
 * and would return cached responses even when truly offline.
 * Cross-origin requests bypass our service worker entirely.
 */
async function checkConnectivity(): Promise<boolean> {
  try {
    // Cloudflare's DNS — fast, globally available, tiny response.
    // mode: "no-cors" gives an opaque response but the promise resolving
    // means the network actually works. Our service worker skips cross-origin
    // requests, so this tests real network reachability.
    await fetch("https://1.1.1.1", { method: "HEAD", mode: "no-cors" });
    return true;
  } catch {
    return false;
  }
}

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
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
      setIsOnline(false);
      setSyncMessage(null);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // navigator.onLine is unreliable on mobile and service-worker pages.
    // If it says we're offline, verify with a real network request.
    // If the fetch succeeds, we're actually online and navigator lied.
    if (!navigator.onLine) {
      checkConnectivity().then((reachable) => {
        if (reachable) {
          setIsOnline(true);
          triggerSync();
        }
      });
    }

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
