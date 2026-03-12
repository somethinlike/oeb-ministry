/**
 * Tests for user-profiles — public author profile CRUD + slug validation.
 *
 * Verifies:
 * - Slug validation (format, length, reserved words, consecutive hyphens)
 * - getProfileByUserId / getProfileBySlug / isSlugAvailable
 * - createProfile / updateProfile / deleteProfile
 * - Error handling (duplicate slug, empty display name)
 * - Published content queries (annotations + devotionals by user)
 */

import {
  validateSlug,
  getProfileByUserId,
  getProfileBySlug,
  isSlugAvailable,
  createProfile,
  updateProfile,
  deleteProfile,
  getPublishedAnnotationsByUser,
  getPublishedDevotionalsByUser,
} from "./user-profiles";

// ── Mock Supabase client ──

function mockClient(options: {
  selectData?: Record<string, unknown> | Record<string, unknown>[] | null;
  selectError?: Error | null;
  insertData?: Record<string, unknown> | null;
  insertError?: { code?: string; message?: string } | null;
  updateData?: Record<string, unknown> | null;
  updateError?: { code?: string; message?: string } | null;
  deleteError?: Error | null;
} = {}) {
  const maybeSingleFn = vi.fn().mockResolvedValue({
    data: Array.isArray(options.selectData) ? options.selectData[0] : (options.selectData ?? null),
    error: options.selectError ?? null,
  });
  const singleFn = vi.fn().mockResolvedValue({
    data: options.insertData ?? options.updateData ?? null,
    error: options.insertError ?? options.updateError ?? null,
  });
  const limitFn = vi.fn().mockResolvedValue({
    data: Array.isArray(options.selectData) ? options.selectData : [],
    error: options.selectError ?? null,
  });
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
  const isFn = vi.fn().mockReturnValue({ order: orderFn, eq: vi.fn().mockReturnValue({ order: orderFn, is: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: orderFn }) }) }) });

  const eqFn: any = vi.fn().mockReturnValue({
    maybeSingle: maybeSingleFn,
    select: vi.fn().mockReturnValue({ single: singleFn }),
    eq: vi.fn().mockReturnValue({
      maybeSingle: maybeSingleFn,
      is: isFn,
      eq: vi.fn().mockReturnValue({ is: isFn }),
      order: orderFn,
    }),
    is: isFn,
    order: orderFn,
  });

  const selectFn = vi.fn().mockReturnValue({
    eq: eqFn,
    single: singleFn,
  });
  const insertFn = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: singleFn }) });
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: singleFn }) }) });
  const deleteFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: options.deleteError ?? null }),
  });

  return {
    from: vi.fn().mockReturnValue({
      select: selectFn,
      insert: insertFn,
      update: updateFn,
      delete: deleteFn,
    }),
  } as any;
}

const profileRow = {
  id: "profile-1",
  user_id: "user-1",
  slug: "john-doe",
  display_name: "John Doe",
  bio: "A passionate Bible student",
  avatar_url: null,
  created_at: "2026-03-11T00:00:00Z",
  updated_at: "2026-03-11T00:00:00Z",
};

// ── validateSlug ──

describe("validateSlug", () => {
  it("accepts valid slugs", () => {
    expect(validateSlug("john-doe")).toBeNull();
    expect(validateSlug("user123")).toBeNull();
    expect(validateSlug("abc")).toBeNull();
    expect(validateSlug("a-b-c-d-e-f")).toBeNull();
  });

  it("rejects slugs shorter than 3 characters", () => {
    expect(validateSlug("ab")).toBe("Must be at least 3 characters");
    expect(validateSlug("a")).toBe("Must be at least 3 characters");
  });

  it("rejects slugs longer than 30 characters", () => {
    expect(validateSlug("a".repeat(31))).toBe("Must be 30 characters or fewer");
  });

  it("rejects slugs with uppercase letters", () => {
    const result = validateSlug("John");
    expect(result).not.toBeNull();
  });

  it("rejects slugs starting or ending with hyphen", () => {
    expect(validateSlug("-abc")).not.toBeNull();
    expect(validateSlug("abc-")).not.toBeNull();
  });

  it("rejects slugs with special characters", () => {
    expect(validateSlug("john_doe")).not.toBeNull();
    expect(validateSlug("john.doe")).not.toBeNull();
    expect(validateSlug("john doe")).not.toBeNull();
  });

  it("rejects consecutive hyphens", () => {
    expect(validateSlug("john--doe")).toBe("Cannot contain consecutive hyphens");
  });

  it("rejects reserved slugs", () => {
    expect(validateSlug("admin")).toBe("This name is reserved");
    expect(validateSlug("settings")).toBe("This name is reserved");
    expect(validateSlug("community")).toBe("This name is reserved");
    expect(validateSlug("profile")).toBe("This name is reserved");
  });

  it("allows non-reserved similar slugs", () => {
    expect(validateSlug("admin1")).toBeNull();
    expect(validateSlug("my-settings")).toBeNull();
  });
});

// ── getProfileByUserId ──

describe("getProfileByUserId", () => {
  it("returns profile when found", async () => {
    const client = mockClient({ selectData: profileRow });
    const result = await getProfileByUserId(client, "user-1");
    expect(result).not.toBeNull();
    expect(result!.slug).toBe("john-doe");
    expect(result!.displayName).toBe("John Doe");
    expect(result!.bio).toBe("A passionate Bible student");
  });

  it("returns null when no profile exists", async () => {
    const client = mockClient({ selectData: null });
    const result = await getProfileByUserId(client, "user-1");
    expect(result).toBeNull();
  });

  it("throws on database error", async () => {
    const client = mockClient({ selectError: new Error("DB error") });
    await expect(getProfileByUserId(client, "user-1")).rejects.toThrow("DB error");
  });
});

// ── getProfileBySlug ──

describe("getProfileBySlug", () => {
  it("returns profile when slug matches", async () => {
    const client = mockClient({ selectData: profileRow });
    const result = await getProfileBySlug(client, "john-doe");
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-1");
  });

  it("returns null when slug not found", async () => {
    const client = mockClient({ selectData: null });
    const result = await getProfileBySlug(client, "unknown");
    expect(result).toBeNull();
  });
});

// ── isSlugAvailable ──

describe("isSlugAvailable", () => {
  it("returns true when slug is not taken", async () => {
    const client = mockClient({ selectData: null });
    const result = await isSlugAvailable(client, "new-slug");
    expect(result).toBe(true);
  });

  it("returns false when slug is taken by another user", async () => {
    const client = mockClient({ selectData: { id: "other-profile" } });
    const result = await isSlugAvailable(client, "taken-slug");
    expect(result).toBe(false);
  });
});

// ── createProfile ──

describe("createProfile", () => {
  it("creates a profile with valid data", async () => {
    const client = mockClient({ insertData: profileRow });
    const result = await createProfile(client, "user-1", {
      slug: "john-doe",
      displayName: "John Doe",
      bio: "A passionate Bible student",
    });
    expect(result.slug).toBe("john-doe");
    expect(result.displayName).toBe("John Doe");
  });

  it("rejects invalid slug", async () => {
    const client = mockClient();
    await expect(
      createProfile(client, "user-1", { slug: "ab", displayName: "Test", bio: "" }),
    ).rejects.toThrow("Invalid slug");
  });

  it("rejects empty display name", async () => {
    const client = mockClient();
    await expect(
      createProfile(client, "user-1", { slug: "valid-slug", displayName: "  ", bio: "" }),
    ).rejects.toThrow("Display name is required");
  });

  it("throws on duplicate slug", async () => {
    const client = mockClient({
      insertError: { code: "23505", message: "duplicate key value violates unique constraint on slug" },
    });
    await expect(
      createProfile(client, "user-1", { slug: "taken-slug", displayName: "Test", bio: "" }),
    ).rejects.toThrow("already taken");
  });
});

// ── updateProfile ──

describe("updateProfile", () => {
  it("updates profile fields", async () => {
    const updated = { ...profileRow, display_name: "Jane Doe" };
    const client = mockClient({ updateData: updated });
    const result = await updateProfile(client, "user-1", { displayName: "Jane Doe" });
    expect(result.displayName).toBe("Jane Doe");
  });

  it("validates slug on update", async () => {
    const client = mockClient();
    await expect(
      updateProfile(client, "user-1", { slug: "ab" }),
    ).rejects.toThrow("Invalid slug");
  });

  it("rejects empty display name on update", async () => {
    const client = mockClient();
    await expect(
      updateProfile(client, "user-1", { displayName: "" }),
    ).rejects.toThrow("Display name is required");
  });
});

// ── deleteProfile ──

describe("deleteProfile", () => {
  it("deletes without error", async () => {
    const client = mockClient();
    await expect(deleteProfile(client, "user-1")).resolves.toBeUndefined();
  });
});

// ── getPublishedAnnotationsByUser ──

describe("getPublishedAnnotationsByUser", () => {
  it("returns published annotations array", async () => {
    const annotations = [
      { id: "ann-1", book: "john", chapter: 3, verse_start: 16, verse_end: 16, content_md: "Note" },
    ];
    const client = mockClient({ selectData: annotations });
    const result = await getPublishedAnnotationsByUser(client, "user-1");
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws on database error", async () => {
    const client = mockClient({ selectError: new Error("DB error") });
    await expect(getPublishedAnnotationsByUser(client, "user-1")).rejects.toThrow("DB error");
  });
});

// ── getPublishedDevotionalsByUser ──

describe("getPublishedDevotionalsByUser", () => {
  it("returns published devotionals array", async () => {
    const devotionals = [
      { id: "dev-1", title: "My Study", type: "original", entry_count: 5 },
    ];
    const client = mockClient({ selectData: devotionals });
    const result = await getPublishedDevotionalsByUser(client, "user-1");
    expect(Array.isArray(result)).toBe(true);
  });
});
