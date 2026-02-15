import { describe, it, expect } from "vitest";
import { getHealthStatus } from "./health";

describe("getHealthStatus", () => {
  it("returns ok status", () => {
    const result = getHealthStatus();
    expect(result.status).toBe("ok");
  });

  it("returns a recent timestamp", () => {
    const before = Date.now();
    const result = getHealthStatus();
    const after = Date.now();

    // Timestamp should be between the before and after snapshots
    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });
});
