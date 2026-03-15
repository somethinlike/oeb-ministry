import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveTimingMap,
  getTimingMapsForChapter,
  getTimingMap,
  deleteTimingMap,
  saveAudioBlob,
  getAudioBlob,
  getAudioBlobUrl,
  getActiveVerse,
} from "./audio-sync";
import type { AudioTimingMap, VerseTiming } from "../types/audio-sync";

// ── Mock IndexedDB ──
// Same pattern as user-translations.test.ts — mock getDb() to return
// a fake DB object with the methods audio-sync.ts actually calls.

vi.mock("./idb", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./idb";

// ── Helpers ──

/** Creates a fresh mock DB with all methods audio-sync.ts uses. */
function createMockDb() {
  return {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
  };
}

/** A minimal timing map for testing. */
function createTestTimingMap(
  overrides: Partial<AudioTimingMap> = {},
): AudioTimingMap {
  return {
    id: "test-timing-1",
    audioSource: "mp3",
    sourceId: "blob-1",
    audioTranslation: "kjv",
    book: "jhn" as AudioTimingMap["book"],
    chapter: 3,
    timings: [
      { verseNumber: 1, startTime: 0, endTime: 5 },
      { verseNumber: 2, startTime: 5, endTime: 10 },
      { verseNumber: 3, startTime: 10, endTime: 15 },
    ],
    createdAt: "2026-03-15T12:00:00Z",
    ...overrides,
  };
}

// ── Setup ──

let mockDb: ReturnType<typeof createMockDb>;

beforeEach(() => {
  vi.clearAllMocks();
  mockDb = createMockDb();
  vi.mocked(getDb).mockResolvedValue(mockDb as any);
});

// ── Timing Map CRUD Tests ──

describe("saveTimingMap", () => {
  it("puts the timing map into the audio-timing-maps store", async () => {
    const timingMap = createTestTimingMap();

    await saveTimingMap(timingMap);

    expect(mockDb.put).toHaveBeenCalledWith("audio-timing-maps", timingMap);
  });

  it("overwrites an existing timing map with the same ID", async () => {
    const original = createTestTimingMap();
    const updated = createTestTimingMap({
      timings: [{ verseNumber: 1, startTime: 0, endTime: 20 }],
    });

    await saveTimingMap(original);
    await saveTimingMap(updated);

    // put() is called twice — the second call overwrites
    expect(mockDb.put).toHaveBeenCalledTimes(2);
    expect(mockDb.put).toHaveBeenLastCalledWith("audio-timing-maps", updated);
  });
});

describe("getTimingMapsForChapter", () => {
  it("queries the by-chapter index with [book, chapter]", async () => {
    const maps = [
      createTestTimingMap({ id: "map-1" }),
      createTestTimingMap({ id: "map-2", audioSource: "youtube", sourceId: "abc123" }),
    ];
    mockDb.getAllFromIndex.mockResolvedValue(maps);

    const result = await getTimingMapsForChapter("jhn", 3);

    expect(mockDb.getAllFromIndex).toHaveBeenCalledWith(
      "audio-timing-maps",
      "by-chapter",
      ["jhn", 3],
    );
    expect(result).toEqual(maps);
    expect(result).toHaveLength(2);
  });

  it("returns an empty array when no timing maps exist for the chapter", async () => {
    mockDb.getAllFromIndex.mockResolvedValue([]);

    const result = await getTimingMapsForChapter("gen", 1);

    expect(result).toEqual([]);
  });
});

describe("getTimingMap", () => {
  it("returns a timing map for a known ID", async () => {
    const timingMap = createTestTimingMap();
    mockDb.get.mockResolvedValue(timingMap);

    const result = await getTimingMap("test-timing-1");

    expect(mockDb.get).toHaveBeenCalledWith("audio-timing-maps", "test-timing-1");
    expect(result).toEqual(timingMap);
  });

  it("returns undefined for an unknown ID", async () => {
    mockDb.get.mockResolvedValue(undefined);

    const result = await getTimingMap("nonexistent");

    expect(result).toBeUndefined();
  });
});

describe("deleteTimingMap", () => {
  it("deletes the timing map and its associated MP3 blob", async () => {
    const timingMap = createTestTimingMap({ audioSource: "mp3", sourceId: "blob-1" });
    mockDb.get.mockResolvedValue(timingMap);

    await deleteTimingMap("test-timing-1");

    // Should look up the timing map first to find the blob
    expect(mockDb.get).toHaveBeenCalledWith("audio-timing-maps", "test-timing-1");
    // Should delete the blob
    expect(mockDb.delete).toHaveBeenCalledWith("audio-blobs", "blob-1");
    // Should delete the timing map
    expect(mockDb.delete).toHaveBeenCalledWith("audio-timing-maps", "test-timing-1");
  });

  it("does not attempt blob deletion for YouTube sources", async () => {
    const timingMap = createTestTimingMap({
      audioSource: "youtube",
      sourceId: "dQw4w9WgXcQ",
    });
    mockDb.get.mockResolvedValue(timingMap);

    await deleteTimingMap("test-timing-1");

    // Should delete the timing map but NOT the blob store
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(mockDb.delete).toHaveBeenCalledWith("audio-timing-maps", "test-timing-1");
  });

  it("handles deletion of a nonexistent timing map gracefully", async () => {
    mockDb.get.mockResolvedValue(undefined);

    await deleteTimingMap("nonexistent");

    // Should still attempt the delete (idempotent)
    expect(mockDb.delete).toHaveBeenCalledWith("audio-timing-maps", "nonexistent");
  });
});

// ── Audio Blob CRUD Tests ──

describe("saveAudioBlob", () => {
  it("stores the blob with the given ID in the audio-blobs store", async () => {
    const blob = new Blob(["fake audio data"], { type: "audio/mpeg" });

    await saveAudioBlob("blob-1", blob);

    expect(mockDb.put).toHaveBeenCalledWith("audio-blobs", {
      id: "blob-1",
      blob,
    });
  });
});

describe("getAudioBlob", () => {
  it("returns the Blob when a record exists", async () => {
    const blob = new Blob(["audio"], { type: "audio/mpeg" });
    mockDb.get.mockResolvedValue({ id: "blob-1", blob });

    const result = await getAudioBlob("blob-1");

    expect(mockDb.get).toHaveBeenCalledWith("audio-blobs", "blob-1");
    expect(result).toBe(blob);
  });

  it("returns undefined when no record exists", async () => {
    mockDb.get.mockResolvedValue(undefined);

    const result = await getAudioBlob("nonexistent");

    expect(result).toBeUndefined();
  });
});

describe("getAudioBlobUrl", () => {
  it("returns an object URL for an existing blob", async () => {
    const blob = new Blob(["audio"], { type: "audio/mpeg" });
    mockDb.get.mockResolvedValue({ id: "blob-1", blob });

    // Mock URL.createObjectURL since jsdom doesn't implement it
    const mockUrl = "blob:http://localhost/fake-uuid";
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue(mockUrl);

    const result = await getAudioBlobUrl("blob-1");

    expect(result).toBe(mockUrl);
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);

    createObjectURLSpy.mockRestore();
  });

  it("returns null when no blob exists", async () => {
    mockDb.get.mockResolvedValue(undefined);

    const result = await getAudioBlobUrl("nonexistent");

    expect(result).toBeNull();
  });
});

// ── getActiveVerse Tests ──
// This is the hot-path function called ~60x/sec during playback.
// Thorough edge case coverage is critical.

describe("getActiveVerse", () => {
  // Standard timings: verses 1-5, each 10 seconds long
  const standardTimings: VerseTiming[] = [
    { verseNumber: 1, startTime: 0, endTime: 10 },
    { verseNumber: 2, startTime: 10, endTime: 20 },
    { verseNumber: 3, startTime: 20, endTime: 30 },
    { verseNumber: 4, startTime: 30, endTime: 40 },
    { verseNumber: 5, startTime: 40, endTime: 50 },
  ];

  it("returns null for empty timings array", () => {
    expect(getActiveVerse([], 5)).toBeNull();
  });

  it("returns null when currentTime is before the first verse", () => {
    const timings: VerseTiming[] = [
      { verseNumber: 1, startTime: 2, endTime: 10 },
    ];
    expect(getActiveVerse(timings, 1)).toBeNull();
    expect(getActiveVerse(timings, 0)).toBeNull();
  });

  it("returns null when currentTime is after the last verse ends", () => {
    expect(getActiveVerse(standardTimings, 50)).toBeNull();
    expect(getActiveVerse(standardTimings, 100)).toBeNull();
  });

  it("returns the correct verse at the start of each verse", () => {
    expect(getActiveVerse(standardTimings, 0)).toBe(1);
    expect(getActiveVerse(standardTimings, 10)).toBe(2);
    expect(getActiveVerse(standardTimings, 20)).toBe(3);
    expect(getActiveVerse(standardTimings, 30)).toBe(4);
    expect(getActiveVerse(standardTimings, 40)).toBe(5);
  });

  it("returns the correct verse in the middle of each verse", () => {
    expect(getActiveVerse(standardTimings, 5)).toBe(1);
    expect(getActiveVerse(standardTimings, 15)).toBe(2);
    expect(getActiveVerse(standardTimings, 25)).toBe(3);
    expect(getActiveVerse(standardTimings, 35)).toBe(4);
    expect(getActiveVerse(standardTimings, 45)).toBe(5);
  });

  it("returns the correct verse just before a verse boundary", () => {
    // At 9.999s, we're still in verse 1 (endTime is exclusive)
    expect(getActiveVerse(standardTimings, 9.999)).toBe(1);
    expect(getActiveVerse(standardTimings, 19.999)).toBe(2);
    expect(getActiveVerse(standardTimings, 49.999)).toBe(5);
  });

  it("handles a single verse correctly", () => {
    const singleVerse: VerseTiming[] = [
      { verseNumber: 16, startTime: 45.2, endTime: 52.8 },
    ];
    expect(getActiveVerse(singleVerse, 45.2)).toBe(16);
    expect(getActiveVerse(singleVerse, 48)).toBe(16);
    expect(getActiveVerse(singleVerse, 52.7)).toBe(16);
    expect(getActiveVerse(singleVerse, 52.8)).toBeNull();
    expect(getActiveVerse(singleVerse, 44)).toBeNull();
  });

  it("handles non-contiguous verse numbers (e.g., quick sync with gaps)", () => {
    // Quick sync might only have every 5th verse marked
    const sparseTimings: VerseTiming[] = [
      { verseNumber: 1, startTime: 0, endTime: 25 },
      { verseNumber: 5, startTime: 25, endTime: 50 },
      { verseNumber: 10, startTime: 50, endTime: 75 },
    ];
    expect(getActiveVerse(sparseTimings, 12)).toBe(1);
    expect(getActiveVerse(sparseTimings, 37)).toBe(5);
    expect(getActiveVerse(sparseTimings, 60)).toBe(10);
  });

  it("handles fractional timestamps with sub-second precision", () => {
    const preciseTimings: VerseTiming[] = [
      { verseNumber: 1, startTime: 0.123, endTime: 3.456 },
      { verseNumber: 2, startTime: 3.456, endTime: 7.891 },
    ];
    expect(getActiveVerse(preciseTimings, 0.123)).toBe(1);
    expect(getActiveVerse(preciseTimings, 0.122)).toBeNull();
    expect(getActiveVerse(preciseTimings, 3.456)).toBe(2);
    expect(getActiveVerse(preciseTimings, 3.455)).toBe(1);
  });

  it("handles gaps between verses (where no verse is being read)", () => {
    // Audio might have a pause between verses
    const gappedTimings: VerseTiming[] = [
      { verseNumber: 1, startTime: 0, endTime: 10 },
      { verseNumber: 2, startTime: 12, endTime: 20 }, // 2-second gap
    ];
    expect(getActiveVerse(gappedTimings, 5)).toBe(1);
    expect(getActiveVerse(gappedTimings, 11)).toBeNull(); // in the gap
    expect(getActiveVerse(gappedTimings, 15)).toBe(2);
  });

  it("handles currentTime of exactly 0", () => {
    expect(getActiveVerse(standardTimings, 0)).toBe(1);
  });

  it("handles negative currentTime", () => {
    expect(getActiveVerse(standardTimings, -1)).toBeNull();
  });

  it("performs correctly with large timing arrays (binary search efficiency)", () => {
    // Simulate a long chapter with 176 verses (Psalm 119)
    const manyTimings: VerseTiming[] = Array.from({ length: 176 }, (_, i) => ({
      verseNumber: i + 1,
      startTime: i * 3,
      endTime: (i + 1) * 3,
    }));

    // First verse
    expect(getActiveVerse(manyTimings, 0)).toBe(1);
    // Middle verse (verse 88 starts at 261s)
    expect(getActiveVerse(manyTimings, 262)).toBe(88);
    // Last verse (verse 176 starts at 525s)
    expect(getActiveVerse(manyTimings, 526)).toBe(176);
    // Past the end
    expect(getActiveVerse(manyTimings, 528)).toBeNull();
  });
});
