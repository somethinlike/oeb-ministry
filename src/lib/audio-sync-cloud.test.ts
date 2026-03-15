import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveTimingMapCloud,
  getTimingMapsForChapterCloud,
  getTimingMapCloud,
  deleteTimingMapCloud,
  uploadAudioFile,
  getAudioFileUrl,
  setTimingMapShared,
  getSharedTimingMaps,
  forkTimingMap,
  hasSharedTimingMaps,
} from "./audio-sync-cloud";
import type { AudioTimingMap } from "../types/audio-sync";

// ── Mock Supabase Client ──
// Build a fake client that mimics the Supabase query builder chain
// (.from().select().eq().single() etc.)

function createMockClient() {
  const storageResults = {
    upload: vi.fn().mockResolvedValue({ error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: "https://signed.url/audio.mp3" },
      error: null,
    }),
    remove: vi.fn().mockResolvedValue({ error: null }),
  };

  // Chainable query builder mock
  function createChain(resolveWith: unknown = { data: null, error: null }) {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(resolveWith),
      // Terminal — resolves when awaited without .single()
      then: (resolve: (v: unknown) => void) => resolve(resolveWith),
    };
    return chain;
  }

  let currentChain = createChain();

  const client = {
    from: vi.fn(() => currentChain),
    storage: {
      from: vi.fn(() => storageResults),
    },
    // Test helpers
    _setChainResult: (result: unknown) => {
      currentChain = createChain(result);
    },
    _getChain: () => currentChain,
    _storage: storageResults,
  };

  return client as any;
}

function createTestTimingMap(
  overrides: Partial<AudioTimingMap> = {},
): AudioTimingMap {
  return {
    id: "test-map-1",
    audioSource: "youtube",
    sourceId: "dQw4w9WgXcQ",
    audioTranslation: "kjv",
    book: "jhn" as AudioTimingMap["book"],
    chapter: 3,
    timings: [
      { verseNumber: 1, startTime: 0, endTime: 5 },
      { verseNumber: 2, startTime: 5, endTime: 10 },
    ],
    createdAt: "2026-03-15T12:00:00Z",
    ...overrides,
  };
}

let client: ReturnType<typeof createMockClient>;

beforeEach(() => {
  vi.clearAllMocks();
  client = createMockClient();
});

// ── Timing Map CRUD ──

describe("saveTimingMapCloud", () => {
  it("upserts the timing map to the audio_timing_maps table", async () => {
    client._setChainResult({ data: null, error: null });

    const map = createTestTimingMap();
    await saveTimingMapCloud(client, "user-123", map);

    expect(client.from).toHaveBeenCalledWith("audio_timing_maps");
    const chain = client._getChain();
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "test-map-1",
        user_id: "user-123",
        audio_source: "youtube",
        source_id: "dQw4w9WgXcQ",
        book: "jhn",
        chapter: 3,
      }),
      expect.objectContaining({
        onConflict: "user_id,book,chapter,audio_source,source_id",
      }),
    );
  });

  it("throws on Supabase error", async () => {
    client._setChainResult({
      data: null,
      error: { message: "constraint violation" },
    });

    await expect(
      saveTimingMapCloud(client, "user-123", createTestTimingMap()),
    ).rejects.toThrow("Failed to save timing map");
  });
});

describe("getTimingMapsForChapterCloud", () => {
  it("queries by book and chapter", async () => {
    const row = {
      id: "map-1",
      user_id: "user-123",
      audio_source: "youtube",
      source_id: "abc123",
      audio_translation: "kjv",
      book: "jhn",
      chapter: 3,
      timings: [{ verseNumber: 1, startTime: 0, endTime: 5 }],
      is_shared: false,
      created_at: "2026-03-15T12:00:00Z",
      updated_at: "2026-03-15T12:00:00Z",
    };
    client._setChainResult({ data: [row], error: null });

    const result = await getTimingMapsForChapterCloud(client, "jhn", 3);

    expect(result).toHaveLength(1);
    expect(result[0].book).toBe("jhn");
    expect(result[0].chapter).toBe(3);
    expect(result[0].audioSource).toBe("youtube");
  });
});

describe("deleteTimingMapCloud", () => {
  it("deletes the timing map row", async () => {
    // getTimingMapCloud returns null (no associated MP3)
    client._setChainResult({ data: null, error: null });

    await deleteTimingMapCloud(client, "user-123", "map-1");

    // Should call .from("audio_timing_maps").delete()
    expect(client.from).toHaveBeenCalledWith("audio_timing_maps");
  });
});

// ── Audio Storage ──

describe("uploadAudioFile", () => {
  it("uploads to the correct path in the bible-audio bucket", async () => {
    const blob = new Blob(["audio"], { type: "audio/mpeg" });

    const path = await uploadAudioFile(client, "user-123", "jhn", 3, blob);

    expect(path).toBe("user-123/jhn/3.mp3");
    expect(client.storage.from).toHaveBeenCalledWith("bible-audio");
    expect(client._storage.upload).toHaveBeenCalledWith(
      "user-123/jhn/3.mp3",
      blob,
      expect.objectContaining({
        contentType: "audio/mpeg",
        upsert: true,
      }),
    );
  });

  it("throws on upload error", async () => {
    client._storage.upload.mockResolvedValue({
      error: { message: "bucket full" },
    });

    await expect(
      uploadAudioFile(
        client,
        "user-123",
        "jhn",
        3,
        new Blob(["x"]),
      ),
    ).rejects.toThrow("Failed to upload audio");
  });
});

describe("getAudioFileUrl", () => {
  it("returns a signed URL for the audio file", async () => {
    const url = await getAudioFileUrl(client, "user-123/jhn/3.mp3");

    expect(url).toBe("https://signed.url/audio.mp3");
    expect(client._storage.createSignedUrl).toHaveBeenCalledWith(
      "user-123/jhn/3.mp3",
      3600,
    );
  });

  it("returns null on error", async () => {
    client._storage.createSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const url = await getAudioFileUrl(client, "nonexistent/path.mp3");
    expect(url).toBeNull();
  });
});

// ── Community Sharing ──

describe("setTimingMapShared", () => {
  it("rejects sharing an MP3 timing map", async () => {
    const mp3Row = {
      id: "map-1",
      user_id: "user-123",
      audio_source: "mp3",
      source_id: "blob-1",
      audio_translation: "kjv",
      book: "jhn",
      chapter: 3,
      timings: [],
      is_shared: false,
      created_at: "2026-03-15T12:00:00Z",
      updated_at: "2026-03-15T12:00:00Z",
    };
    client._setChainResult({ data: mp3Row, error: null });

    await expect(
      setTimingMapShared(client, "map-1", true),
    ).rejects.toThrow("Only YouTube timing maps can be shared");
  });
});

describe("hasSharedTimingMaps", () => {
  it("returns true when shared maps exist", async () => {
    client._setChainResult({ count: 3, error: null });

    const result = await hasSharedTimingMaps(client, "jhn", 3);
    expect(result).toBe(true);
  });

  it("returns false when no shared maps exist", async () => {
    client._setChainResult({ count: 0, error: null });

    const result = await hasSharedTimingMaps(client, "gen", 1);
    expect(result).toBe(false);
  });

  it("returns false on error", async () => {
    client._setChainResult({ count: null, error: { message: "fail" } });

    const result = await hasSharedTimingMaps(client, "jhn", 3);
    expect(result).toBe(false);
  });
});
