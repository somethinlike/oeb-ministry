import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  backupTranslation,
  listBackups,
  restoreTranslation,
  deleteBackup,
  getBackupStatus,
} from "./translation-backup";
import type { UserTranslationManifest, StoredUserChapter } from "../types/user-translation";

// ── Mock crypto module ──
// We mock encrypt/decrypt to avoid needing real Web Crypto in Node/jsdom.
// The mock roundtrips: encrypt wraps the plaintext in a known format,
// decrypt unwraps it. This lets us verify the service correctly serializes
// verse data and passes it through the crypto layer.

const MOCK_IV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

vi.mock("./crypto", () => ({
  encryptContent: vi.fn(async (plaintext: string) => ({
    // Prefix with "ENC:" so we can verify the plaintext was passed correctly
    ciphertext: new TextEncoder().encode("ENC:" + plaintext),
    iv: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  })),
  decryptContent: vi.fn(async (ciphertext: Uint8Array) => {
    const decoded = new TextDecoder().decode(ciphertext);
    // Strip the "ENC:" prefix to get back the original plaintext
    return decoded.startsWith("ENC:") ? decoded.slice(4) : decoded;
  }),
  uint8ToBase64: vi.fn((bytes: Uint8Array) => {
    // Simple base64 for test
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }),
  base64ToUint8: vi.fn((b64: string) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }),
}));

// ── Test fixtures ──

const TEST_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TEST_BACKUP_ID = "11111111-1111-1111-1111-111111111111";

function makeManifest(overrides?: Partial<UserTranslationManifest>): UserTranslationManifest {
  return {
    translation: "user-nrsvue",
    name: "NRSVUE",
    abbreviation: "NRSVUE",
    language: "en",
    license: "Personal use",
    books: [{ id: "gen", name: "Genesis", chapters: 50, testament: "OT" as const }],
    uploadedAt: "2026-03-14T00:00:00Z",
    originalFilename: "NRSVUE.epub",
    fileType: "epub" as const,
    ...overrides,
  };
}

function makeChapter(overrides?: Partial<StoredUserChapter>): StoredUserChapter {
  return {
    translation: "user-nrsvue",
    book: "gen",
    chapter: 1,
    bookName: "Genesis",
    verses: [
      { number: 1, text: "In the beginning God created the heavens and the earth." },
      { number: 2, text: "The earth was formless and empty." },
    ],
    ...overrides,
  };
}

// ── Tests ──

// We need a mock CryptoKey. Since we mock the crypto module, the actual
// CryptoKey object is never used — we just need something truthy.
const mockCryptoKey = {} as CryptoKey;

describe("translation-backup", () => {
  describe("backupTranslation", () => {
    it("encrypts chapters and uploads to Supabase", async () => {
      const manifest = makeManifest();
      const chapters = [makeChapter(), makeChapter({ chapter: 2 })];

      // The mock client needs to return a backup ID from the upsert
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === "translation_backups") {
            return {
              upsert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: { id: TEST_BACKUP_ID },
                      error: null,
                    }),
                  ),
                })),
              })),
            };
          }
          if (table === "translation_backup_chapters") {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() =>
                  Promise.resolve({ error: null }),
                ),
              })),
              insert: vi.fn(() =>
                Promise.resolve({ error: null }),
              ),
            };
          }
          return {};
        }),
      };

      await backupTranslation(
        mockClient as unknown as Parameters<typeof backupTranslation>[0],
        TEST_USER_ID,
        manifest,
        chapters,
        mockCryptoKey,
      );

      // Verify upsert was called for the manifest
      expect(mockClient.from).toHaveBeenCalledWith("translation_backups");
      // Verify chapter insert was called
      expect(mockClient.from).toHaveBeenCalledWith("translation_backup_chapters");
    });

    it("throws on manifest save failure", async () => {
      const mockClient = {
        from: vi.fn(() => ({
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: { message: "DB error" },
                }),
              ),
            })),
          })),
        })),
      };

      await expect(
        backupTranslation(
          mockClient as unknown as Parameters<typeof backupTranslation>[0],
          TEST_USER_ID,
          makeManifest(),
          [makeChapter()],
          mockCryptoKey,
        ),
      ).rejects.toThrow("Backup manifest save failed");
    });
  });

  describe("listBackups", () => {
    it("returns mapped backup manifests", async () => {
      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: TEST_BACKUP_ID,
                      translation_id: "user-nrsvue",
                      name: "NRSVUE",
                      abbreviation: "NRSVUE",
                      language: "en",
                      license: "Personal use",
                      books: [],
                      original_filename: "NRSVUE.epub",
                      file_type: "epub",
                      uploaded_at: "2026-03-14T00:00:00Z",
                      created_at: "2026-03-14T00:00:00Z",
                    },
                  ],
                  error: null,
                }),
              ),
            })),
          })),
        })),
      };

      const backups = await listBackups(
        mockClient as unknown as Parameters<typeof listBackups>[0],
        TEST_USER_ID,
      );

      expect(backups).toHaveLength(1);
      expect(backups[0].translationId).toBe("user-nrsvue");
      expect(backups[0].name).toBe("NRSVUE");
      expect(backups[0].fileType).toBe("epub");
    });

    it("returns empty array when no backups exist", async () => {
      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({ data: [], error: null }),
              ),
            })),
          })),
        })),
      };

      const backups = await listBackups(
        mockClient as unknown as Parameters<typeof listBackups>[0],
        TEST_USER_ID,
      );

      expect(backups).toHaveLength(0);
    });
  });

  describe("restoreTranslation", () => {
    it("decrypts chapters and returns IndexedDB-ready shapes", async () => {
      const verses = [{ number: 1, text: "In the beginning" }];
      const versesJson = JSON.stringify(verses);

      // Encrypt mock: "ENC:" + plaintext -> base64
      const { uint8ToBase64 } = await import("./crypto");
      const encryptedB64 = uint8ToBase64(new TextEncoder().encode("ENC:" + versesJson));
      const ivB64 = uint8ToBase64(MOCK_IV);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === "translation_backups") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(function (this: unknown) { return this ?? arguments; }).bind({
                  eq: vi.fn(() => ({
                    single: vi.fn(() =>
                      Promise.resolve({
                        data: {
                          id: TEST_BACKUP_ID,
                          translation_id: "user-nrsvue",
                          name: "NRSVUE",
                          abbreviation: "NRSVUE",
                          language: "en",
                          license: "Personal use",
                          books: [{ id: "gen", name: "Genesis", chapters: 50, testament: "OT" }],
                          original_filename: "NRSVUE.epub",
                          file_type: "epub",
                          uploaded_at: "2026-03-14T00:00:00Z",
                        },
                        error: null,
                      }),
                    ),
                  })),
                }),
              })),
            };
          }
          if (table === "translation_backup_chapters") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(function () {
                  return {
                    eq: vi.fn(() => ({
                      order: vi.fn(() => ({
                        order: vi.fn(() =>
                          Promise.resolve({
                            data: [
                              {
                                book: "gen",
                                chapter: 1,
                                book_name: "Genesis",
                                encrypted_verses: encryptedB64,
                                encryption_iv: ivB64,
                              },
                            ],
                            error: null,
                          }),
                        ),
                      })),
                    })),
                  };
                }),
              })),
            };
          }
          return {};
        }),
      };

      const result = await restoreTranslation(
        mockClient as unknown as Parameters<typeof restoreTranslation>[0],
        TEST_USER_ID,
        TEST_BACKUP_ID,
        mockCryptoKey,
      );

      // Manifest should have correct shape
      expect(result.manifest.translation).toBe("user-nrsvue");
      expect(result.manifest.name).toBe("NRSVUE");
      expect(result.manifest.books).toHaveLength(1);

      // Chapters should be decrypted
      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0].book).toBe("gen");
      expect(result.chapters[0].chapter).toBe(1);
      expect(result.chapters[0].verses).toEqual(verses);
    });
  });

  describe("deleteBackup", () => {
    it("calls delete with correct filters", async () => {
      const deleteEq2 = vi.fn(() => Promise.resolve({ error: null }));
      const deleteEq1 = vi.fn(() => ({ eq: deleteEq2 }));
      const mockClient = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: deleteEq1,
          })),
        })),
      };

      await deleteBackup(
        mockClient as unknown as Parameters<typeof deleteBackup>[0],
        TEST_USER_ID,
        TEST_BACKUP_ID,
      );

      expect(mockClient.from).toHaveBeenCalledWith("translation_backups");
      expect(deleteEq1).toHaveBeenCalledWith("id", TEST_BACKUP_ID);
      expect(deleteEq2).toHaveBeenCalledWith("user_id", TEST_USER_ID);
    });

    it("throws on delete failure", async () => {
      const mockClient = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({ error: { message: "Not found" } }),
              ),
            })),
          })),
        })),
      };

      await expect(
        deleteBackup(
          mockClient as unknown as Parameters<typeof deleteBackup>[0],
          TEST_USER_ID,
          TEST_BACKUP_ID,
        ),
      ).rejects.toThrow("Failed to delete backup");
    });
  });

  describe("getBackupStatus", () => {
    it("returns a map of backed-up translation IDs", async () => {
      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: TEST_BACKUP_ID,
                      translation_id: "user-nrsvue",
                      name: "NRSVUE",
                      abbreviation: "NRSVUE",
                      language: "en",
                      license: "Personal use",
                      books: [],
                      original_filename: "NRSVUE.epub",
                      file_type: "epub",
                      uploaded_at: "2026-03-14T00:00:00Z",
                      created_at: "2026-03-14T00:00:00Z",
                    },
                  ],
                  error: null,
                }),
              ),
            })),
          })),
        })),
      };

      const status = await getBackupStatus(
        mockClient as unknown as Parameters<typeof getBackupStatus>[0],
        TEST_USER_ID,
        ["user-nrsvue", "user-kjv"],
      );

      expect(status.has("user-nrsvue")).toBe(true);
      expect(status.has("user-kjv")).toBe(false);
      expect(status.get("user-nrsvue")?.name).toBe("NRSVUE");
    });

    it("returns empty map for empty input", async () => {
      const mockClient = {} as Parameters<typeof getBackupStatus>[0];
      const status = await getBackupStatus(mockClient, TEST_USER_ID, []);
      expect(status.size).toBe(0);
    });
  });
});
