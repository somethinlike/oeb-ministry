import { describe, it, expect, vi } from "vitest";
import { screenContentRules, screenAndStore } from "./ai-screening";

describe("screenContentRules", () => {
  // ── Clean content ──

  it("passes clean theological content with no flags", () => {
    const result = screenContentRules(
      "The Gospel of John opens with a profound theological statement about the divine Logos.",
    );
    expect(result.passed).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it("passes normal Bible study notes", () => {
    const result = screenContentRules(
      "Romans 8:28 reminds us that all things work together for good for those who love God.",
    );
    expect(result.passed).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  // ── Profanity detection ──

  it("flags explicit profanity as high severity", () => {
    const result = screenContentRules("This is a fucking test");
    expect(result.passed).toBe(false);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].type).toBe("profanity");
    expect(result.flags[0].severity).toBe("high");
  });

  it("flags slurs as high severity", () => {
    const result = screenContentRules("He called him a faggot");
    expect(result.passed).toBe(false);
    expect(result.flags.some((f) => f.severity === "high")).toBe(true);
  });

  it("flags mild profanity as low severity", () => {
    const result = screenContentRules("That was a damn good sermon");
    expect(result.passed).toBe(true); // Low severity doesn't fail
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].severity).toBe("low");
  });

  it("does not flag words that contain profanity substrings", () => {
    // "class" contains "ass", "scunthorpe" contains a slur
    const result = screenContentRules(
      "The class discussed the passage about Thessalonians.",
    );
    expect(result.flags).toHaveLength(0);
  });

  it("is case-insensitive for profanity", () => {
    const result = screenContentRules("SHIT happens");
    expect(result.passed).toBe(false);
    expect(result.flags[0].type).toBe("profanity");
  });

  it("detects multiple profane words", () => {
    const result = screenContentRules("What the fuck is this bullshit");
    expect(result.flags.filter((f) => f.severity === "high").length).toBeGreaterThanOrEqual(2);
  });

  // ── Theological flags ──

  it("flags exclusive predestination language", () => {
    const result = screenContentRules(
      "Predestination is what teaches that only the elect few will be saved.",
    );
    expect(result.flags.some((f) => f.type === "theology")).toBe(true);
    expect(result.flags[0].severity).toBe("medium");
  });

  it("flags once-saved-always-saved without repentance", () => {
    const result = screenContentRules(
      "Once saved always saved means you can live however you want.",
    );
    expect(result.flags.some((f) => f.type === "theology")).toBe(true);
  });

  it("flags denial of sin", () => {
    const result = screenContentRules("Sin is an illusion created by the church.");
    expect(result.flags.some((f) => f.type === "theology")).toBe(true);
  });

  it("flags religious universalism", () => {
    const result = screenContentRules("All religions lead to God in their own way.");
    expect(result.flags.some((f) => f.type === "theology")).toBe(true);
  });

  it("flags dismissal of scriptural authority", () => {
    const result = screenContentRules("The Bible is just a book written by men.");
    expect(result.flags.some((f) => f.type === "theology")).toBe(true);
  });

  it("does not flag legitimate theological discussion", () => {
    // Talking ABOUT predestination without advocating it
    const result = screenContentRules(
      "Calvin's doctrine of predestination has been debated for centuries.",
    );
    expect(result.flags.filter((f) => f.type === "theology")).toHaveLength(0);
  });

  it("does not flag the word 'hell' in eschatological context", () => {
    const result = screenContentRules(
      "Jesus spoke about hell more than any other biblical figure.",
    );
    // "hell" is not in the profanity list (only damn is mild)
    expect(result.flags).toHaveLength(0);
  });

  // ── Spam detection ──

  it("flags content with URLs", () => {
    const result = screenContentRules("Check out https://spam-site.com for more info");
    expect(result.flags.some((f) => f.type === "spam")).toBe(true);
  });

  it("flags excessive repeated characters", () => {
    const result = screenContentRules("Amennnnnnnnnnnnnn");
    expect(result.flags.some((f) => f.type === "spam")).toBe(true);
  });

  // ── Edge cases ──

  it("handles empty content", () => {
    const result = screenContentRules("");
    expect(result.passed).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it("handles very long content", () => {
    const longContent = "The Lord is my shepherd. ".repeat(1000);
    const result = screenContentRules(longContent);
    expect(result.passed).toBe(true);
  });

  it("includes screenedAt timestamp", () => {
    const before = new Date().toISOString();
    const result = screenContentRules("Test");
    const after = new Date().toISOString();
    expect(result.screenedAt >= before).toBe(true);
    expect(result.screenedAt <= after).toBe(true);
  });

  // ── Passed logic ──

  it("passed is true when only low/medium flags exist", () => {
    const result = screenContentRules("That was a damn good point https://example.com");
    expect(result.passed).toBe(true); // damn = low, URL = medium
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it("passed is false when any high-severity flag exists", () => {
    const result = screenContentRules("What the fuck");
    expect(result.passed).toBe(false);
  });
});

describe("screenAndStore", () => {
  it("screens content and updates the record", async () => {
    const updateData: Record<string, unknown> = {};
    const eqArgs: { col: string; val: string } = { col: "", val: "" };

    const mockClient = {
      from: vi.fn(() => ({
        update: vi.fn((data: Record<string, unknown>) => {
          Object.assign(updateData, data);
          return {
            eq: vi.fn((col: string, val: string) => {
              eqArgs.col = col;
              eqArgs.val = val;
              return Promise.resolve({ error: null });
            }),
          };
        }),
      })),
    };

    const result = await screenAndStore(
      mockClient,
      "annotations",
      "test-id-123",
      "Clean theological content about grace.",
    );

    expect(result.passed).toBe(true);
    expect(result.flags).toHaveLength(0);
    expect(mockClient.from).toHaveBeenCalledWith("annotations");
    expect(updateData.ai_screening_passed).toBe(true);
    expect(updateData.ai_screening_flags).toEqual([]);
    expect(updateData.ai_screened_at).toBeDefined();
    expect(eqArgs.col).toBe("id");
    expect(eqArgs.val).toBe("test-id-123");
  });

  it("stores flags when content has issues", async () => {
    const updateData: Record<string, unknown> = {};

    const mockClient = {
      from: vi.fn(() => ({
        update: vi.fn((data: Record<string, unknown>) => {
          Object.assign(updateData, data);
          return {
            eq: vi.fn(() => Promise.resolve({ error: null })),
          };
        }),
      })),
    };

    const result = await screenAndStore(
      mockClient,
      "annotations",
      "test-id-456",
      "This is fucking terrible",
    );

    expect(result.passed).toBe(false);
    expect(updateData.ai_screening_passed).toBe(false);
    expect((updateData.ai_screening_flags as unknown[]).length).toBeGreaterThan(0);
  });

  it("works with devotional_bibles table", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    };

    await screenAndStore(
      mockClient,
      "devotional_bibles",
      "dev-id-789",
      "A study of Romans",
    );

    expect(mockClient.from).toHaveBeenCalledWith("devotional_bibles");
  });
});
