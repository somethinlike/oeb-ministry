import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isUserTranslation,
  saveUserTranslation,
  getUserTranslationManifests,
  getUserTranslationManifest,
  getUserTranslationChapter,
  deleteUserTranslation,
} from "./user-translations";
import type { UserTranslationManifest, ParseResult } from "../types/user-translation";

// ── Mock IndexedDB via the idb module ──
// The real getDb() returns an idb-wrapped IndexedDB connection.
// In jsdom there's no IndexedDB, so we mock the entire module and
// wire up a fake DB object with the methods user-translations.ts calls.

vi.mock("./idb", () => ({
  getDb: vi.fn(),
}));

// We also need to mock BOOK_BY_ID from constants so the module can
// look up built-in book metadata without loading the full constants file.
vi.mock("./constants", () => {
  const books = [
    { id: "gen", name: "Genesis", chapters: 50, testament: "OT" },
    { id: "mat", name: "Matthew", chapters: 28, testament: "NT" },
    { id: "jhn", name: "John", chapters: 21, testament: "NT" },
  ];
  return {
    BOOKS: books,
    BOOK_BY_ID: new Map(books.map((b) => [b.id, b])),
  };
});

import { getDb } from "./idb";

// ── Helpers: build mock DB and test fixtures ──

/**
 * Creates a fresh mock DB with all the methods user-translations.ts uses.
 *
 * saveUserTranslation opens multiple transactions:
 * 1. readwrite on chapters (put new chapters)
 * 2. readonly on chapters (scan all chapters via by-translation index)
 * 3. db.get for existing manifest check
 * 4. db.put for manifest save
 *
 * The mock tracks written chapters in _txPuts and serves them back
 * through the index.getAll() call in the read transaction.
 */
function createMockDb() {
  // Storage for the transaction's put calls (simulates chapter store contents)
  const txPuts: unknown[] = [];

  // Chapters already in the "database" before this save — set by tests for merge scenarios
  let preExistingChapters: unknown[] = [];

  const createWriteStore = () => ({
    put: vi.fn((value: unknown) => {
      txPuts.push(value);
      return Promise.resolve();
    }),
    index: vi.fn(),
  });

  const createReadStore = () => ({
    put: vi.fn(),
    index: vi.fn(() => ({
      // Return pre-existing chapters merged with newly written ones
      getAll: vi.fn(() => Promise.resolve([...preExistingChapters, ...txPuts])),
      openCursor: vi.fn().mockResolvedValue(null),
    })),
  });

  // Track transaction calls so tests can inspect
  const writeStore = createWriteStore();
  const readStore = createReadStore();
  let txCallCount = 0;

  return {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn((_storeName: string, mode?: string) => {
      txCallCount++;
      // First transaction is readwrite (save chapters), second is readonly (scan)
      const store = mode === "readwrite" ? writeStore : readStore;
      return { store, done: Promise.resolve() };
    }),
    // Expose internals for assertions
    _txPuts: txPuts,
    _txWriteStore: writeStore,
    _txReadStore: readStore,
    _setPreExistingChapters: (chapters: unknown[]) => {
      preExistingChapters = chapters;
    },
    get _txCallCount() { return txCallCount; },
  };
}

/** A minimal manifest for testing. */
function createTestManifest(
  overrides: Partial<UserTranslationManifest> = {},
): UserTranslationManifest {
  return {
    translation: "user-nrsv",
    name: "NRSV",
    abbreviation: "NRSV",
    language: "en",
    license: "Personal use",
    books: [],
    uploadedAt: "2026-03-14T12:00:00Z",
    originalFilename: "nrsv.epub",
    fileType: "epub",
    ...overrides,
  };
}

/** A minimal parse result with one book containing one chapter. */
function createTestParseResult(): ParseResult {
  return {
    books: [
      {
        bookId: "jhn",
        originalName: "The Gospel of John",
        chapters: [
          {
            chapter: 1,
            verses: [
              { number: 1, text: "In the beginning was the Word." },
              { number: 2, text: "He was with God in the beginning." },
            ],
          },
          {
            chapter: 2,
            verses: [
              { number: 1, text: "On the third day a wedding took place." },
            ],
          },
        ],
      },
    ],
    warnings: [],
  };
}

// ── Tests ──

let mockDb: ReturnType<typeof createMockDb>;

beforeEach(() => {
  vi.clearAllMocks();
  mockDb = createMockDb();
  vi.mocked(getDb).mockResolvedValue(mockDb as any);
});

describe("isUserTranslation", () => {
  it('returns true for IDs starting with "user-"', () => {
    expect(isUserTranslation("user-nrsv")).toBe(true);
    expect(isUserTranslation("user-kjv-custom")).toBe(true);
    expect(isUserTranslation("user-")).toBe(true);
  });

  it("returns false for built-in translation IDs", () => {
    expect(isUserTranslation("web")).toBe(false);
    expect(isUserTranslation("oeb-us")).toBe(false);
    expect(isUserTranslation("drb")).toBe(false);
  });

  it('returns false for IDs that contain "user-" but not at the start', () => {
    expect(isUserTranslation("my-user-translation")).toBe(false);
    expect(isUserTranslation("xuser-nrsv")).toBe(false);
  });
});

describe("saveUserTranslation", () => {
  it("stores the manifest with computed book list to the manifests store", async () => {
    const manifest = createTestManifest();
    const parseResult = createTestParseResult();

    await saveUserTranslation(manifest, parseResult);

    // The manifest should be put into "user-translation-manifests"
    expect(mockDb.put).toHaveBeenCalledWith(
      "user-translation-manifests",
      expect.objectContaining({
        translation: "user-nrsv",
        name: "NRSV",
        // books should be computed from parseResult, using BOOK_BY_ID lookups
        books: [
          {
            id: "jhn",
            name: "John", // from BOOK_BY_ID, not the original "The Gospel of John"
            chapters: 2, // 2 chapters in the parse result
            testament: "NT",
          },
        ],
      }),
    );
  });

  it("falls back to originalName when bookId is not in BOOK_BY_ID", async () => {
    const manifest = createTestManifest();
    // Use a bookId that's NOT in our mocked BOOK_BY_ID
    const parseResult: ParseResult = {
      books: [
        {
          bookId: "tob" as any, // Tobit — not in our mock
          originalName: "Tobit",
          chapters: [{ chapter: 1, verses: [{ number: 1, text: "Test." }] }],
        },
      ],
      warnings: [],
    };

    await saveUserTranslation(manifest, parseResult);

    expect(mockDb.put).toHaveBeenCalledWith(
      "user-translation-manifests",
      expect.objectContaining({
        books: [
          {
            id: "tob",
            name: "Tobit", // fallback to originalName
            chapters: 1,
            testament: "DC", // fallback testament for unknown books
          },
        ],
      }),
    );
  });

  it("stores each chapter in the chapters store via a transaction", async () => {
    const manifest = createTestManifest();
    const parseResult = createTestParseResult();

    await saveUserTranslation(manifest, parseResult);

    // Should open readwrite transaction for saving chapters
    expect(mockDb.transaction).toHaveBeenCalledWith(
      "user-translation-chapters",
      "readwrite",
    );

    // Should also open readonly transaction for scanning all chapters
    expect(mockDb.transaction).toHaveBeenCalledWith(
      "user-translation-chapters",
      "readonly",
    );

    // Two chapters in John should produce two puts on the write transaction store
    expect(mockDb._txWriteStore.put).toHaveBeenCalledTimes(2);

    // First chapter
    expect(mockDb._txWriteStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        translation: "user-nrsv",
        book: "jhn",
        chapter: 1,
        bookName: "John",
        verses: [
          { number: 1, text: "In the beginning was the Word." },
          { number: 2, text: "He was with God in the beginning." },
        ],
      }),
    );

    // Second chapter
    expect(mockDb._txWriteStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        translation: "user-nrsv",
        book: "jhn",
        chapter: 2,
        bookName: "John",
        verses: [
          { number: 1, text: "On the third day a wedding took place." },
        ],
      }),
    );
  });

  it("stores multiple books when parseResult contains several", async () => {
    const manifest = createTestManifest();
    const parseResult: ParseResult = {
      books: [
        {
          bookId: "gen",
          originalName: "Genesis",
          chapters: [
            { chapter: 1, verses: [{ number: 1, text: "In the beginning." }] },
          ],
        },
        {
          bookId: "mat",
          originalName: "Matthew",
          chapters: [
            { chapter: 1, verses: [{ number: 1, text: "The book of the genealogy." }] },
          ],
        },
      ],
      warnings: [],
    };

    await saveUserTranslation(manifest, parseResult);

    // Manifest should list both books
    expect(mockDb.put).toHaveBeenCalledWith(
      "user-translation-manifests",
      expect.objectContaining({
        books: expect.arrayContaining([
          expect.objectContaining({ id: "gen", name: "Genesis" }),
          expect.objectContaining({ id: "mat", name: "Matthew" }),
        ]),
      }),
    );

    // Two chapter records total (one per book)
    expect(mockDb._txWriteStore.put).toHaveBeenCalledTimes(2);
  });

  it("merges new books into existing translation without removing old ones", async () => {
    const manifest = createTestManifest();

    // Simulate Genesis already being in the database from a previous upload
    mockDb._setPreExistingChapters([
      { translation: "user-nrsv", book: "gen", chapter: 1, bookName: "Genesis", verses: [{ number: 1, text: "In the beginning." }] },
      { translation: "user-nrsv", book: "gen", chapter: 2, bookName: "Genesis", verses: [{ number: 1, text: "Thus the heavens." }] },
    ]);

    // New upload contains only John
    const parseResult = createTestParseResult(); // John ch 1-2
    await saveUserTranslation(manifest, parseResult);

    // Manifest should contain BOTH Genesis (from pre-existing) and John (from new upload)
    expect(mockDb.put).toHaveBeenCalledWith(
      "user-translation-manifests",
      expect.objectContaining({
        books: expect.arrayContaining([
          expect.objectContaining({ id: "gen", name: "Genesis", chapters: 2 }),
          expect.objectContaining({ id: "jhn", name: "John", chapters: 2 }),
        ]),
      }),
    );
  });

  it("preserves existing manifest metadata on merge", async () => {
    // Simulate an existing manifest already in the DB
    const existingManifest = createTestManifest({
      name: "My NRSV Bible",
      abbreviation: "NRSV",
      uploadedAt: "2026-01-01T00:00:00Z",
      originalFilename: "nrsv-ot.txt",
    });
    mockDb.get.mockResolvedValue(existingManifest);

    // New upload with different name/abbreviation — should be ignored on merge
    const newManifest = createTestManifest({
      name: "NRSV Second Upload",
      abbreviation: "NRSV2",
      uploadedAt: "2026-03-19T00:00:00Z",
    });
    const parseResult = createTestParseResult();
    await saveUserTranslation(newManifest, parseResult);

    // Manifest should preserve existing identity fields
    expect(mockDb.put).toHaveBeenCalledWith(
      "user-translation-manifests",
      expect.objectContaining({
        name: "My NRSV Bible",
        abbreviation: "NRSV",
        uploadedAt: "2026-01-01T00:00:00Z",
        originalFilename: "nrsv-ot.txt",
      }),
    );
  });

  it("uses max chapter number for book entry in manifest", async () => {
    const manifest = createTestManifest();

    // Pre-existing: Genesis chapters 1, 3, 5 (non-contiguous)
    mockDb._setPreExistingChapters([
      { translation: "user-nrsv", book: "gen", chapter: 1, bookName: "Genesis", verses: [] },
      { translation: "user-nrsv", book: "gen", chapter: 3, bookName: "Genesis", verses: [] },
      { translation: "user-nrsv", book: "gen", chapter: 5, bookName: "Genesis", verses: [] },
    ]);

    // New upload: Genesis chapter 50
    const parseResult: ParseResult = {
      books: [{
        bookId: "gen",
        originalName: "Genesis",
        chapters: [{ chapter: 50, verses: [{ number: 1, text: "Final chapter." }] }],
      }],
      warnings: [],
    };

    await saveUserTranslation(manifest, parseResult);

    // Genesis should have chapters: 50 (the max chapter number found)
    expect(mockDb.put).toHaveBeenCalledWith(
      "user-translation-manifests",
      expect.objectContaining({
        books: expect.arrayContaining([
          expect.objectContaining({ id: "gen", chapters: 50 }),
        ]),
      }),
    );
  });
});

describe("getUserTranslationManifests", () => {
  it("returns all manifests from the manifests store", async () => {
    const manifests = [
      createTestManifest({ translation: "user-nrsv" }),
      createTestManifest({ translation: "user-esv", name: "ESV" }),
    ];
    mockDb.getAll.mockResolvedValue(manifests);

    const result = await getUserTranslationManifests();

    expect(mockDb.getAll).toHaveBeenCalledWith("user-translation-manifests");
    expect(result).toEqual(manifests);
    expect(result).toHaveLength(2);
  });

  it("returns an empty array when no manifests exist", async () => {
    mockDb.getAll.mockResolvedValue([]);

    const result = await getUserTranslationManifests();

    expect(result).toEqual([]);
  });
});

describe("getUserTranslationManifest", () => {
  it("returns a manifest for a known translation ID", async () => {
    const manifest = createTestManifest({ translation: "user-nrsv" });
    mockDb.get.mockResolvedValue(manifest);

    const result = await getUserTranslationManifest("user-nrsv");

    expect(mockDb.get).toHaveBeenCalledWith(
      "user-translation-manifests",
      "user-nrsv",
    );
    expect(result).toEqual(manifest);
  });

  it("returns undefined for an unknown translation ID", async () => {
    mockDb.get.mockResolvedValue(undefined);

    const result = await getUserTranslationManifest("user-nonexistent");

    expect(result).toBeUndefined();
  });
});

describe("getUserTranslationChapter", () => {
  it("returns chapter data in ChapterData shape when the chapter exists", async () => {
    const storedChapter = {
      translation: "user-nrsv",
      book: "jhn",
      chapter: 3,
      bookName: "John",
      verses: [
        { number: 16, text: "For God so loved the world." },
        { number: 17, text: "For God did not send his Son to condemn." },
      ],
    };
    mockDb.get.mockResolvedValue(storedChapter);

    const result = await getUserTranslationChapter("user-nrsv", "jhn", 3);

    // Should query with the composite key [translation, book, chapter]
    expect(mockDb.get).toHaveBeenCalledWith(
      "user-translation-chapters",
      ["user-nrsv", "jhn", 3],
    );

    // Result should match ChapterData shape
    expect(result).toEqual({
      translation: "user-nrsv",
      book: "jhn",
      bookName: "John",
      chapter: 3,
      verses: [
        { number: 16, text: "For God so loved the world." },
        { number: 17, text: "For God did not send his Son to condemn." },
      ],
    });
  });

  it("returns null when the chapter does not exist", async () => {
    mockDb.get.mockResolvedValue(undefined);

    const result = await getUserTranslationChapter("user-nrsv", "jhn", 99);

    expect(result).toBeNull();
  });

  it("returns null for a completely unknown translation", async () => {
    mockDb.get.mockResolvedValue(undefined);

    const result = await getUserTranslationChapter("user-fake", "gen", 1);

    expect(result).toBeNull();
  });
});

describe("deleteUserTranslation", () => {
  it("deletes all chapters via cursor then deletes the manifest", async () => {
    // Set up cursor that iterates twice then stops
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const cursor2 = {
      delete: deleteFn,
      continue: vi.fn().mockResolvedValue(null), // no more records
    };
    const cursor1 = {
      delete: deleteFn,
      continue: vi.fn().mockResolvedValue(cursor2),
    };

    const mockIndex = {
      openCursor: vi.fn().mockResolvedValue(cursor1),
    };
    mockDb._txWriteStore.index.mockReturnValue(mockIndex);

    await deleteUserTranslation("user-nrsv");

    // Should open a readwrite transaction on the chapters store
    expect(mockDb.transaction).toHaveBeenCalledWith(
      "user-translation-chapters",
      "readwrite",
    );

    // Should look up the "by-translation" index
    expect(mockDb._txWriteStore.index).toHaveBeenCalledWith("by-translation");

    // Should open a cursor for the given translation ID
    expect(mockIndex.openCursor).toHaveBeenCalledWith("user-nrsv");

    // Should delete both cursor records
    expect(deleteFn).toHaveBeenCalledTimes(2);

    // Should delete the manifest from the manifests store
    expect(mockDb.delete).toHaveBeenCalledWith(
      "user-translation-manifests",
      "user-nrsv",
    );
  });

  it("handles deletion when no chapters exist (cursor is null)", async () => {
    const mockIndex = {
      openCursor: vi.fn().mockResolvedValue(null),
    };
    mockDb._txWriteStore.index.mockReturnValue(mockIndex);

    await deleteUserTranslation("user-empty");

    // Should still attempt to open the cursor
    expect(mockIndex.openCursor).toHaveBeenCalledWith("user-empty");

    // Should still delete the manifest even if no chapters existed
    expect(mockDb.delete).toHaveBeenCalledWith(
      "user-translation-manifests",
      "user-empty",
    );
  });
});
