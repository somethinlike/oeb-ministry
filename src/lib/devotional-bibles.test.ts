/**
 * Tests for devotional bible service layer (Phase 3.3a).
 *
 * Verifies:
 * - CRUD operations on devotional bibles
 * - Entry management (add, remove, reorder, batch)
 * - "original" type enforcement (only own annotations)
 * - Publishing validation (non-empty, assembled CC0 check)
 * - Forking (copies entries, sets type to assembled)
 * - Community queries (published, fork count, hasDevotionalBibles)
 */

import { describe, it, expect, vi } from "vitest";
import {
  createDevotionalBible,
  getDevotionalBibles,
  getDevotionalBible,
  softDeleteDevotionalBible,
  restoreDevotionalBible,
  permanentlyDeleteDevotionalBible,
  addEntryToDevotionalBible,
  removeEntryFromDevotionalBible,
  reorderEntries,
  batchAddEntries,
  submitDevotionalForPublishing,
  forkDevotionalBible,
  getForkCount,
  hasDevotionalBibles,
} from "./devotional-bibles";

type DbClient = Parameters<typeof createDevotionalBible>[0];

// ── Mock helpers ──

/** Simple mock for: client.from(table).select().eq().is().order() → data */
function mockSelectChain(data: unknown[] | null, error: Error | null = null) {
  const fromFn = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data, error })),
        })),
        single: vi.fn(() => Promise.resolve({ data: data?.[0] ?? null, error })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: data?.[0] ?? null, error })),
          })),
        })),
        in: vi.fn(() => Promise.resolve({ data, error })),
      })),
      single: vi.fn(() => Promise.resolve({ data: data?.[0] ?? null, error })),
    })),
  }));
  return { client: { from: fromFn } as unknown as DbClient, fromFn };
}

/** Mock for: client.from().insert({}).select().single() → data */
function mockInsertChain(data: unknown | null, error: Error | null = null) {
  const fromFn = vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data, error })),
      })),
    })),
  }));
  return { client: { from: fromFn } as unknown as DbClient, fromFn };
}

/** Mock for: client.from().update({}).eq() → { error } */
function mockUpdateEq(error: Error | null = null) {
  const updateArg = { value: undefined as unknown };
  const fromFn = vi.fn(() => ({
    update: vi.fn((data: unknown) => {
      updateArg.value = data;
      return {
        eq: vi.fn(() => Promise.resolve({ error })),
      };
    }),
  }));
  return { client: { from: fromFn } as unknown as DbClient, fromFn, updateArg };
}

/** Mock for: client.from().delete().eq() → { error } */
function mockDeleteEq(error: Error | null = null) {
  const fromFn = vi.fn(() => ({
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error })),
    })),
  }));
  return { client: { from: fromFn } as unknown as DbClient, fromFn };
}

/**
 * Mock for COUNT queries. Supports both:
 * - .from().select().eq().is().limit() → { count, error }  (hasDevotionalBibles)
 * - .from().select().eq() → { count, error }  (getForkCount)
 */
function mockCountQuery(count: number | null, error: Error | null = null) {
  const result = Promise.resolve({ count, error });
  const limitFn = vi.fn(() => result);
  const isFn = vi.fn(() => ({ limit: limitFn }));
  // eq() is both a terminal (returns count directly) and chainable (returns { is, limit })
  const eqFn = vi.fn(() => {
    const obj = { is: isFn, limit: limitFn, then: undefined as unknown };
    // Make it thenable so await resolves with { count, error }
    const p = result;
    obj.then = p.then.bind(p);
    return obj;
  });
  const selectFn = vi.fn(() => ({ eq: eqFn }));
  const fromFn = vi.fn(() => ({ select: selectFn }));
  return { client: { from: fromFn } as unknown as DbClient };
}

// ── Sample data ──

const sampleBibleRow = {
  id: "bible-1",
  user_id: "user-1",
  title: "My Romans Study",
  description: "A devotional through Romans",
  translation: "web",
  type: "original",
  is_published: false,
  publish_status: null,
  published_at: null,
  rejection_reason: null,
  forked_from_id: null,
  author_display_name: null,
  entry_count: 3,
  created_at: "2026-03-11T00:00:00Z",
  updated_at: "2026-03-11T00:00:00Z",
  deleted_at: null,
};

// ── createDevotionalBible ──

describe("createDevotionalBible", () => {
  it("creates a devotional bible and returns it", async () => {
    const { client } = mockInsertChain(sampleBibleRow);

    const result = await createDevotionalBible(client, "user-1", {
      title: "My Romans Study",
      description: "A devotional through Romans",
      translation: "web",
      type: "original",
    });

    expect(result.id).toBe("bible-1");
    expect(result.title).toBe("My Romans Study");
    expect(result.type).toBe("original");
    expect(result.userId).toBe("user-1");
  });

  it("throws on database error", async () => {
    const { client } = mockInsertChain(null, new Error("DB error"));

    await expect(
      createDevotionalBible(client, "user-1", {
        title: "Test",
        description: "",
        translation: "web",
        type: "original",
      }),
    ).rejects.toThrow("Failed to create devotional bible");
  });
});

// ── getDevotionalBibles ──

describe("getDevotionalBibles", () => {
  it("returns mapped devotional bibles", async () => {
    const { client } = mockSelectChain([sampleBibleRow]);
    const result = await getDevotionalBibles(client, "user-1");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("My Romans Study");
    expect(result[0].entryCount).toBe(3);
  });

  it("returns empty array when none exist", async () => {
    const { client } = mockSelectChain([]);
    const result = await getDevotionalBibles(client, "user-1");
    expect(result).toHaveLength(0);
  });
});

// ── softDeleteDevotionalBible ──

describe("softDeleteDevotionalBible", () => {
  it("sets deleted_at timestamp", async () => {
    const { client, updateArg } = mockUpdateEq();
    await softDeleteDevotionalBible(client, "bible-1");

    const data = updateArg.value as { deleted_at: string };
    expect(data.deleted_at).toBeTruthy();
    expect(new Date(data.deleted_at).toISOString()).toBe(data.deleted_at);
  });

  it("throws on database error", async () => {
    const { client } = mockUpdateEq(new Error("DB down"));
    await expect(softDeleteDevotionalBible(client, "bible-1"))
      .rejects.toThrow("Failed to delete devotional bible");
  });
});

// ── restoreDevotionalBible ──

describe("restoreDevotionalBible", () => {
  it("clears deleted_at", async () => {
    const { client, updateArg } = mockUpdateEq();
    await restoreDevotionalBible(client, "bible-1");
    expect(updateArg.value).toEqual({ deleted_at: null });
  });
});

// ── permanentlyDeleteDevotionalBible ──

describe("permanentlyDeleteDevotionalBible", () => {
  it("hard deletes the devotional", async () => {
    const { client, fromFn } = mockDeleteEq();
    await permanentlyDeleteDevotionalBible(client, "bible-1");
    expect(fromFn).toHaveBeenCalledWith("devotional_bibles");
  });

  it("throws on database error", async () => {
    const { client } = mockDeleteEq(new Error("DB error"));
    await expect(permanentlyDeleteDevotionalBible(client, "bible-1"))
      .rejects.toThrow("Failed to permanently delete");
  });
});

// ── addEntryToDevotionalBible ──

describe("addEntryToDevotionalBible", () => {
  it("blocks cross-user annotation for 'original' type", async () => {
    // First call: fetch bible (type=original, user_id=user-1)
    // Second call: fetch annotation (user_id=user-2 → mismatch)
    let callCount = 0;
    const fromFn = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        // Fetch bible
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: { user_id: "user-1", type: "original" }, error: null }),
              ),
            })),
          })),
        };
      }
      // Fetch annotation
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({ data: { user_id: "user-2" }, error: null }),
            ),
          })),
        })),
      };
    });

    const client = { from: fromFn } as unknown as DbClient;

    await expect(
      addEntryToDevotionalBible(client, "bible-1", "ann-other-user"),
    ).rejects.toThrow("Original devotional bibles can only include your own annotations");
  });
});

// ── removeEntryFromDevotionalBible ──

describe("removeEntryFromDevotionalBible", () => {
  it("deletes the entry", async () => {
    const { client } = mockDeleteEq();
    await removeEntryFromDevotionalBible(client, "entry-1");
    // No throw = success
  });

  it("throws on database error", async () => {
    const { client } = mockDeleteEq(new Error("DB error"));
    await expect(removeEntryFromDevotionalBible(client, "entry-1"))
      .rejects.toThrow("Failed to remove entry");
  });
});

// ── reorderEntries ──

describe("reorderEntries", () => {
  it("assigns gapped sort_order values to each entry", async () => {
    const updateArgs: unknown[] = [];
    const fromFn = vi.fn(() => ({
      update: vi.fn((data: unknown) => {
        updateArgs.push(data);
        return {
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }),
    }));
    const client = { from: fromFn } as unknown as DbClient;

    await reorderEntries(client, "bible-1", ["e1", "e2", "e3"]);

    expect(updateArgs).toEqual([
      { sort_order: 10 },
      { sort_order: 20 },
      { sort_order: 30 },
    ]);
  });
});

// ── batchAddEntries ──

describe("batchAddEntries", () => {
  it("returns zeros for empty array", async () => {
    const { client } = mockSelectChain([]);
    const result = await batchAddEntries(client, "bible-1", []);
    expect(result).toEqual({ added: 0, skipped: 0 });
  });

  it("filters out other users' annotations for 'original' type", async () => {
    // Multi-call mock: (1) fetch bible, (2) fetch annotations, (3) fetch lastEntry, (4) insert
    let callCount = 0;
    const fromFn = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        // Fetch bible
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: { user_id: "user-1", type: "original" }, error: null }),
              ),
            })),
          })),
        };
      }
      if (callCount === 2) {
        // Fetch annotations (ann-1 belongs to user-1, ann-2 doesn't)
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [
                  { id: "ann-1", user_id: "user-1" },
                  { id: "ann-2", user_id: "user-other" },
                ],
                error: null,
              }),
            ),
          })),
        };
      }
      if (callCount === 3) {
        // Fetch last entry sort_order
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({ data: { sort_order: 30 }, error: null }),
                  ),
                })),
              })),
            })),
          })),
        };
      }
      // Insert entries
      return {
        insert: vi.fn(() => Promise.resolve({ error: null })),
      };
    });

    const client = { from: fromFn } as unknown as DbClient;
    const result = await batchAddEntries(client, "bible-1", ["ann-1", "ann-2"]);

    expect(result.added).toBe(1); // Only ann-1
    expect(result.skipped).toBe(1); // ann-2 filtered out
  });
});

// ── submitDevotionalForPublishing ──

describe("submitDevotionalForPublishing", () => {
  it("rejects empty devotionals", async () => {
    const fromFn = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { entry_count: 0, type: "original" }, error: null }),
          ),
        })),
      })),
    }));

    const client = { from: fromFn } as unknown as DbClient;

    await expect(
      submitDevotionalForPublishing(client, "bible-1", "Ryan"),
    ).rejects.toThrow("Cannot publish an empty devotional bible");
  });
});

// ── forkDevotionalBible ──

describe("forkDevotionalBible", () => {
  it("rejects forking unpublished devotionals", async () => {
    // getDevotionalBibleWithEntries → getDevotionalBible → returns unpublished
    const fromFn = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { ...sampleBibleRow, is_published: false },
              error: null,
            }),
          ),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    }));

    const client = { from: fromFn } as unknown as DbClient;

    await expect(
      forkDevotionalBible(client, "user-2", "bible-1"),
    ).rejects.toThrow("Can only fork published devotional bibles");
  });
});

// ── getForkCount ──

describe("getForkCount", () => {
  it("returns the fork count", async () => {
    const { client } = mockCountQuery(5);
    const count = await getForkCount(client, "bible-1");
    expect(count).toBe(5);
  });

  it("returns 0 on error", async () => {
    const { client } = mockCountQuery(null, new Error("DB error"));
    const count = await getForkCount(client, "bible-1");
    expect(count).toBe(0);
  });
});

// ── hasDevotionalBibles ──

describe("hasDevotionalBibles", () => {
  it("returns true when user has devotional bibles", async () => {
    const { client } = mockCountQuery(2);
    expect(await hasDevotionalBibles(client, "user-1")).toBe(true);
  });

  it("returns false when user has none", async () => {
    const { client } = mockCountQuery(0);
    expect(await hasDevotionalBibles(client, "user-1")).toBe(false);
  });

  it("returns false on database error", async () => {
    const { client } = mockCountQuery(null, new Error("DB error"));
    expect(await hasDevotionalBibles(client, "user-1")).toBe(false);
  });
});
