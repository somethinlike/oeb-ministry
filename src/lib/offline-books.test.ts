import { describe, it, expect, vi, beforeEach } from "vitest";
import { cacheBookOffline, isBookCached, isChapterCached } from "./offline-books";

// Mock the Cache API
const mockCache = {
  put: vi.fn().mockResolvedValue(undefined),
  match: vi.fn(),
};

const mockCaches = {
  open: vi.fn().mockResolvedValue(mockCache),
};

// Install mock
vi.stubGlobal("caches", mockCaches);

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockCaches.open.mockResolvedValue(mockCache);
});

describe("cacheBookOffline", () => {
  it("fetches all chapters and puts them in cache", async () => {
    mockFetch.mockResolvedValue({ ok: true, clone: () => ({ ok: true }) });

    const result = await cacheBookOffline("web", "jhn", 3);

    expect(result).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenCalledWith("/bibles/web/jhn/1.json");
    expect(mockFetch).toHaveBeenCalledWith("/bibles/web/jhn/2.json");
    expect(mockFetch).toHaveBeenCalledWith("/bibles/web/jhn/3.json");
    expect(mockCache.put).toHaveBeenCalledTimes(3);
  });

  it("calls progress callback", async () => {
    mockFetch.mockResolvedValue({ ok: true, clone: () => ({ ok: true }) });
    const progress = vi.fn();

    await cacheBookOffline("web", "jhn", 3, progress);

    expect(progress).toHaveBeenCalledWith(1, 3);
    expect(progress).toHaveBeenCalledWith(2, 3);
    expect(progress).toHaveBeenCalledWith(3, 3);
  });

  it("handles fetch failures gracefully", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, clone: () => ({ ok: true }) })
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ ok: true, clone: () => ({ ok: true }) });

    const result = await cacheBookOffline("web", "jhn", 3);

    // All 3 complete (even with failure), but only 2 put in cache
    expect(result).toBe(3);
    expect(mockCache.put).toHaveBeenCalledTimes(2);
  });
});

describe("isBookCached", () => {
  it("returns true when all chapters are cached", async () => {
    mockCache.match.mockResolvedValue(new Response("{}"));

    const result = await isBookCached("web", "jhn", 3);

    expect(result).toBe(true);
    expect(mockCache.match).toHaveBeenCalledTimes(3);
  });

  it("returns false when any chapter is missing", async () => {
    mockCache.match
      .mockResolvedValueOnce(new Response("{}"))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(new Response("{}"));

    const result = await isBookCached("web", "jhn", 3);

    expect(result).toBe(false);
  });

  it("returns false when cache API throws", async () => {
    mockCaches.open.mockRejectedValueOnce(new Error("cache error"));

    const result = await isBookCached("web", "jhn", 3);

    expect(result).toBe(false);
  });
});

describe("isChapterCached", () => {
  it("returns true when chapter is cached", async () => {
    mockCache.match.mockResolvedValue(new Response("{}"));

    const result = await isChapterCached("web", "jhn", 3);

    expect(result).toBe(true);
    expect(mockCache.match).toHaveBeenCalledWith("/bibles/web/jhn/3.json");
  });

  it("returns false when chapter is not cached", async () => {
    mockCache.match.mockResolvedValue(undefined);

    const result = await isChapterCached("web", "jhn", 3);

    expect(result).toBe(false);
  });
});
