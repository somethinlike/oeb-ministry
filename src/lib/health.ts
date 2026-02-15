/**
 * Simple health check utility. Used as the first smoke test to confirm
 * the test infrastructure (Vitest) is wired up correctly.
 */

export interface HealthStatus {
  status: "ok" | "error";
  timestamp: number;
}

/** Returns the current health status with a Unix timestamp. */
export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    timestamp: Date.now(),
  };
}
