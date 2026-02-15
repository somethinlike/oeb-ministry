/**
 * Service worker registration.
 *
 * Registers the service worker and handles updates gracefully.
 * The actual caching logic is in /public/sw.js.
 */

export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // Check for updates periodically (every 60 minutes)
    setInterval(
      () => {
        registration.update();
      },
      60 * 60 * 1000,
    );

    // Handle updates — notify the user when a new version is available
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // New version available — dispatch a custom event that
          // the UpdatePrompt component listens for
          window.dispatchEvent(new CustomEvent("sw-update-available"));
        }
      });
    });
  } catch (error) {
    console.error("Service worker registration failed:", error);
  }
}
