/**
 * Tests for annotation batch operations (Phase 3.2).
 *
 * Verifies:
 * - batchSoftDeleteAnnotations: no-op for empty, calls .update().in() for batch
 * - batchRestoreAnnotations: same pattern, sets deleted_at to null
 * - batchPermanentlyDeleteAnnotations: calls .delete().in() for batch
 * - batchSubmitForPublishing: skips encrypted, sanitizes content, returns counts
 * - hasDeletedAnnotations: lightweight COUNT query
 */

import { describe, it, expect, vi } from "vitest";
import {
  batchSoftDeleteAnnotations,
  batchRestoreAnnotations,
  batchPermanentlyDeleteAnnotations,
  batchSubmitForPublishing,
  hasDeletedAnnotations,
} from "./annotations";

// ── Mock helpers ──

type DbClient = Parameters<typeof batchSoftDeleteAnnotations>[0];

/**
 * Creates a mock for: client.from("annotations").update(data).in("id", ids)
 * The .in() call is the terminal — it returns { error }.
 */
function mockUpdateIn(error: Error | null = null) {
  const updateArg = { value: undefined as unknown };
  const inArgs = { value: undefined as unknown[] };

  const inFn = vi.fn((...args: unknown[]) => {
    inArgs.value = args;
    return Promise.resolve({ error });
  });
  const updateFn = vi.fn((data: unknown) => {
    updateArg.value = data;
    return { in: inFn };
  });
  const fromFn = vi.fn(() => ({ update: updateFn }));

  return {
    client: { from: fromFn } as unknown as DbClient,
    fromFn,
    updateFn,
    inFn,
    updateArg,
    inArgs,
  };
}

/**
 * Creates a mock for: client.from("annotations").delete().in("id", ids)
 */
function mockDeleteIn(error: Error | null = null) {
  const inFn = vi.fn(() => Promise.resolve({ error }));
  const deleteFn = vi.fn(() => ({ in: inFn }));
  const fromFn = vi.fn(() => ({ delete: deleteFn }));

  return {
    client: { from: fromFn } as unknown as DbClient,
    fromFn,
    deleteFn,
    inFn,
  };
}

/**
 * Creates a mock for hasDeletedAnnotations:
 *   client.from("annotations").select("id", { count, head })
 *     .eq("user_id", ...).not("deleted_at", ...).limit(1)
 * Terminal = limit() → resolves { count, error }
 */
function mockCountQuery(count: number | null, error: Error | null = null) {
  const limitFn = vi.fn(() => Promise.resolve({ count, error }));
  const notFn = vi.fn(() => ({ limit: limitFn }));
  const eqFn = vi.fn(() => ({ not: notFn }));
  const selectFn = vi.fn(() => ({ eq: eqFn }));
  const fromFn = vi.fn(() => ({ select: selectFn }));

  return { client: { from: fromFn } as unknown as DbClient };
}

/**
 * Creates a mock for batchSubmitForPublishing:
 *   First call: .from("annotations").select("id, content_md, is_encrypted").in("id", ids)
 *   Subsequent calls: .from("annotations").update({...}).eq("id", id)
 */
function mockBatchPublish(
  fetchResult: { data: unknown[] | null; error: Error | null },
  updateError: Error | null = null,
) {
  const updateArgs: unknown[] = [];
  let callCount = 0;

  const fromFn = vi.fn(() => {
    callCount++;
    if (callCount === 1) {
      // First call = select + in (fetch annotations)
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve(fetchResult)),
        })),
      };
    }
    // Subsequent calls = update + eq (per-annotation submit)
    return {
      update: vi.fn((data: unknown) => {
        updateArgs.push(data);
        return {
          eq: vi.fn(() => Promise.resolve({ error: updateError })),
        };
      }),
    };
  });

  return {
    client: { from: fromFn } as unknown as DbClient,
    fromFn,
    updateArgs,
  };
}

// ── batchSoftDeleteAnnotations ──

describe("batchSoftDeleteAnnotations", () => {
  it("does nothing when given an empty array", async () => {
    const { client, fromFn } = mockUpdateIn();
    await batchSoftDeleteAnnotations(client, []);
    expect(fromFn).not.toHaveBeenCalled();
  });

  it("calls update with deleted_at timestamp for all IDs", async () => {
    const { client, fromFn, updateArg, inArgs } = mockUpdateIn();
    await batchSoftDeleteAnnotations(client, ["id-1", "id-2", "id-3"]);

    expect(fromFn).toHaveBeenCalledWith("annotations");

    // Verify deleted_at is a valid ISO timestamp
    const data = updateArg.value as { deleted_at: string };
    expect(data.deleted_at).toBeTruthy();
    expect(new Date(data.deleted_at).toISOString()).toBe(data.deleted_at);

    // Verify .in() was called with correct IDs
    expect(inArgs.value).toEqual(["id", ["id-1", "id-2", "id-3"]]);
  });

  it("throws on database error", async () => {
    const { client } = mockUpdateIn(new Error("DB down"));
    await expect(
      batchSoftDeleteAnnotations(client, ["id-1"]),
    ).rejects.toThrow("Failed to delete annotations");
  });
});

// ── batchRestoreAnnotations ──

describe("batchRestoreAnnotations", () => {
  it("does nothing when given an empty array", async () => {
    const { client, fromFn } = mockUpdateIn();
    await batchRestoreAnnotations(client, []);
    expect(fromFn).not.toHaveBeenCalled();
  });

  it("calls update with deleted_at = null for all IDs", async () => {
    const { client, updateArg, inArgs } = mockUpdateIn();
    await batchRestoreAnnotations(client, ["id-1", "id-2"]);

    expect(updateArg.value).toEqual({ deleted_at: null });
    expect(inArgs.value).toEqual(["id", ["id-1", "id-2"]]);
  });

  it("throws on database error", async () => {
    const { client } = mockUpdateIn(new Error("DB down"));
    await expect(
      batchRestoreAnnotations(client, ["id-1"]),
    ).rejects.toThrow("Failed to restore annotations");
  });
});

// ── batchPermanentlyDeleteAnnotations ──

describe("batchPermanentlyDeleteAnnotations", () => {
  it("does nothing when given an empty array", async () => {
    const { client, fromFn } = mockDeleteIn();
    await batchPermanentlyDeleteAnnotations(client, []);
    expect(fromFn).not.toHaveBeenCalled();
  });

  it("calls delete().in() for all IDs", async () => {
    const { client, fromFn, inFn } = mockDeleteIn();
    await batchPermanentlyDeleteAnnotations(client, ["id-1", "id-2"]);

    expect(fromFn).toHaveBeenCalledWith("annotations");
    expect(inFn).toHaveBeenCalled();
  });

  it("throws on database error", async () => {
    const { client } = mockDeleteIn(new Error("DB down"));
    await expect(
      batchPermanentlyDeleteAnnotations(client, ["id-1"]),
    ).rejects.toThrow("Failed to permanently delete annotations");
  });
});

// ── batchSubmitForPublishing ──

describe("batchSubmitForPublishing", () => {
  it("returns zeros for an empty array", async () => {
    const { client, fromFn } = mockBatchPublish({ data: [], error: null });
    const result = await batchSubmitForPublishing(client, [], "Author");
    expect(result).toEqual({ submitted: 0, skippedEncrypted: 0 });
    expect(fromFn).not.toHaveBeenCalled();
  });

  it("submits non-encrypted annotations and skips encrypted ones", async () => {
    const annotations = [
      { id: "a1", content_md: "Good note", is_encrypted: false },
      { id: "a2", content_md: "Secret note", is_encrypted: true },
      { id: "a3", content_md: "Another note", is_encrypted: false },
    ];

    const { client } = mockBatchPublish({ data: annotations, error: null });
    const result = await batchSubmitForPublishing(client, ["a1", "a2", "a3"], "Ryan");

    expect(result.submitted).toBe(2);
    expect(result.skippedEncrypted).toBe(1);
  });

  it("returns all skipped when all annotations are encrypted", async () => {
    const annotations = [
      { id: "a1", content_md: "secret", is_encrypted: true },
      { id: "a2", content_md: "also secret", is_encrypted: true },
    ];

    const { client } = mockBatchPublish({ data: annotations, error: null });
    const result = await batchSubmitForPublishing(client, ["a1", "a2"], "Ryan");

    expect(result.submitted).toBe(0);
    expect(result.skippedEncrypted).toBe(2);
  });

  it("sanitizes content before submitting (strips dangerous HTML)", async () => {
    const annotations = [
      {
        id: "a1",
        content_md: "Good <script>alert('xss')</script> note",
        is_encrypted: false,
      },
    ];

    const { client, updateArgs } = mockBatchPublish({ data: annotations, error: null });
    await batchSubmitForPublishing(client, ["a1"], "Ryan");

    // The update should contain sanitized content (script tag stripped)
    expect(updateArgs.length).toBe(1);
    const updateData = updateArgs[0] as { content_md: string; publish_status: string };
    expect(updateData.content_md).not.toContain("<script>");
    expect(updateData.content_md).toContain("Good");
    expect(updateData.content_md).toContain("note");
    expect(updateData.publish_status).toBe("pending");
  });

  it("sets author_display_name on each submitted annotation", async () => {
    const annotations = [
      { id: "a1", content_md: "My note", is_encrypted: false },
    ];

    const { client, updateArgs } = mockBatchPublish({ data: annotations, error: null });
    await batchSubmitForPublishing(client, ["a1"], "TestAuthor");

    const updateData = updateArgs[0] as { author_display_name: string };
    expect(updateData.author_display_name).toBe("TestAuthor");
  });

  it("throws when the initial fetch fails", async () => {
    const { client } = mockBatchPublish({ data: null, error: new Error("fetch error") });

    await expect(
      batchSubmitForPublishing(client, ["a1"], "Ryan"),
    ).rejects.toThrow("Failed to fetch annotations");
  });

  it("throws when a per-annotation update fails", async () => {
    const annotations = [
      { id: "a1", content_md: "Note", is_encrypted: false },
    ];

    const { client } = mockBatchPublish(
      { data: annotations, error: null },
      new Error("update failed"),
    );

    await expect(
      batchSubmitForPublishing(client, ["a1"], "Ryan"),
    ).rejects.toThrow("Failed to submit annotation a1");
  });
});

// ── hasDeletedAnnotations ──

describe("hasDeletedAnnotations", () => {
  it("returns true when user has soft-deleted annotations", async () => {
    const { client } = mockCountQuery(3);
    const result = await hasDeletedAnnotations(client, "user-1");
    expect(result).toBe(true);
  });

  it("returns false when user has no soft-deleted annotations", async () => {
    const { client } = mockCountQuery(0);
    const result = await hasDeletedAnnotations(client, "user-1");
    expect(result).toBe(false);
  });

  it("returns false on database error (graceful degradation)", async () => {
    const { client } = mockCountQuery(null, new Error("DB error"));
    const result = await hasDeletedAnnotations(client, "user-1");
    expect(result).toBe(false);
  });
});
