/**
 * ConnectionStatus — shows a banner when offline and syncs when back online.
 *
 * Grandmother Principle:
 * - Simple yellow/green banner at the top of the screen
 * - "You're offline — your changes will be saved when you reconnect"
 * - "Back online — saving your changes..." with a brief success message
 * - No technical jargon about IndexedDB or sync queues
 */

import { useState, useEffect } from "react";
import { processSync } from "../lib/sync-engine";

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      // Trigger sync when we come back online
      triggerSync();
    }

    function handleOffline() {
      setIsOnline(false);
      setSyncMessage(null);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function triggerSync() {
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
  }

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
