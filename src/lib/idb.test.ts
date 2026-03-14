import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the "idb" module ────────────────────────────────────────────
// jsdom does not provide IndexedDB, so we intercept `openDB` and
// capture the upgrade callback that idb.ts passes to it. This lets us
// invoke the callback ourselves with a fake `db` object whose
// createObjectStore / createIndex calls we can spy on.

/** Simulated index created by store.createIndex() */
interface FakeIndex {
  name: string;
  keyPath: string | string[];
}

/** Simulated object store created by db.createObjectStore() */
interface FakeStore {
  name: string;
  options: IDBObjectStoreParameters;
  indexes: FakeIndex[];
  createIndex: ReturnType<typeof vi.fn>;
}

/** Simulated IDBPDatabase returned by openDB */
interface FakeDb {
  objectStoreNames: string[];
  stores: Map<string, FakeStore>;
  createObjectStore: ReturnType<typeof vi.fn>;
}

// The upgrade callback that idb.ts registers. Captured by the mock.
let capturedUpgrade: ((db: FakeDb, oldVersion: number) => void) | undefined;

// The fake database returned by the mocked openDB
let fakeDb: FakeDb;

/** Build a fresh FakeDb and wire up createObjectStore to track stores. */
function buildFakeDb(): FakeDb {
  const stores = new Map<string, FakeStore>();

  const db: FakeDb = {
    objectStoreNames: [],
    stores,
    createObjectStore: vi.fn((name: string, options: IDBObjectStoreParameters) => {
      const store: FakeStore = {
        name,
        options,
        indexes: [],
        createIndex: vi.fn((indexName: string, keyPath: string | string[]) => {
          store.indexes.push({ name: indexName, keyPath });
        }),
      };
      stores.set(name, store);
      db.objectStoreNames.push(name);
      return store;
    }),
  };

  return db;
}

vi.mock("idb", () => ({
  openDB: vi.fn(
    (
      _name: string,
      _version: number,
      options?: { upgrade?: (db: FakeDb, oldVersion: number) => void },
    ) => {
      capturedUpgrade = options?.upgrade;
      return Promise.resolve(fakeDb);
    },
  ),
}));

// ── Import the module under test AFTER the mock is registered ────────
import { DB_NAME, DB_VERSION, getDb, resetDbPromise } from "./idb";

beforeEach(() => {
  // Fresh database for each test so store/index assertions are isolated
  fakeDb = buildFakeDb();
  capturedUpgrade = undefined;

  // Reset the cached promise inside idb.ts so each test starts clean
  resetDbPromise();

  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────

describe("idb constants", () => {
  it('exports DB_NAME as "oeb-ministry"', () => {
    expect(DB_NAME).toBe("oeb-ministry");
  });

  it("exports DB_VERSION as 5", () => {
    expect(DB_VERSION).toBe(5);
  });
});

describe("getDb", () => {
  it("calls openDB with the correct name, version, and an upgrade callback", async () => {
    const { openDB } = await import("idb");
    await getDb();

    expect(openDB).toHaveBeenCalledWith(DB_NAME, DB_VERSION, expect.objectContaining({
      upgrade: expect.any(Function),
    }));
  });

  it("returns the database object produced by openDB", async () => {
    const db = await getDb();
    expect(db).toBe(fakeDb);
  });

  it("caches the connection — subsequent calls return the same promise", async () => {
    const first = getDb();
    const second = getDb();

    // Same promise reference, not just same resolved value
    expect(first).toBe(second);
  });
});

describe("upgrade callback (fresh install, oldVersion = 0)", () => {
  /** Run the upgrade as if creating the database from scratch. */
  function runFreshUpgrade(): void {
    // Trigger getDb so the mock captures the upgrade callback
    getDb();
    if (!capturedUpgrade) throw new Error("upgrade callback was not captured");
    capturedUpgrade(fakeDb, 0);
  }

  it('creates the "annotations" object store with keyPath "id"', () => {
    runFreshUpgrade();
    const store = fakeDb.stores.get("annotations");
    expect(store).toBeDefined();
    expect(store!.options.keyPath).toBe("id");
  });

  it('creates the "sync-queue" object store with keyPath "id"', () => {
    runFreshUpgrade();
    const store = fakeDb.stores.get("sync-queue");
    expect(store).toBeDefined();
    expect(store!.options.keyPath).toBe("id");
  });

  it('creates the "user-translation-manifests" store with keyPath "translation"', () => {
    runFreshUpgrade();
    const store = fakeDb.stores.get("user-translation-manifests");
    expect(store).toBeDefined();
    expect(store!.options.keyPath).toBe("translation");
  });

  it('creates the "user-translation-chapters" store with compound keyPath', () => {
    runFreshUpgrade();
    const store = fakeDb.stores.get("user-translation-chapters");
    expect(store).toBeDefined();
    expect(store!.options.keyPath).toEqual(["translation", "book", "chapter"]);
  });

  it("creates exactly four object stores for a fresh install", () => {
    runFreshUpgrade();
    expect(fakeDb.stores.size).toBe(4);
    expect(fakeDb.objectStoreNames).toEqual(
      expect.arrayContaining([
        "annotations",
        "sync-queue",
        "user-translation-manifests",
        "user-translation-chapters",
      ]),
    );
  });

  it('creates "by-chapter" index on annotations with compound key [translation, book, chapter]', () => {
    runFreshUpgrade();
    const store = fakeDb.stores.get("annotations")!;
    const idx = store.indexes.find((i) => i.name === "by-chapter");
    expect(idx).toBeDefined();
    expect(idx!.keyPath).toEqual(["translation", "book", "chapter"]);
  });

  it('creates "by-sync-status" index on annotations keyed by "syncStatus"', () => {
    runFreshUpgrade();
    const store = fakeDb.stores.get("annotations")!;
    const idx = store.indexes.find((i) => i.name === "by-sync-status");
    expect(idx).toBeDefined();
    expect(idx!.keyPath).toBe("syncStatus");
  });

  it('creates "by-translation" index on user-translation-chapters keyed by "translation"', () => {
    runFreshUpgrade();
    const store = fakeDb.stores.get("user-translation-chapters")!;
    const idx = store.indexes.find((i) => i.name === "by-translation");
    expect(idx).toBeDefined();
    expect(idx!.keyPath).toBe("translation");
  });
});

describe("upgrade callback (incremental upgrade from v1 to v5)", () => {
  it("does not recreate v1 stores when upgrading from v1", () => {
    getDb();
    if (!capturedUpgrade) throw new Error("upgrade callback was not captured");
    capturedUpgrade(fakeDb, 1);

    // v1 stores should NOT be created (they already exist)
    expect(fakeDb.stores.has("annotations")).toBe(false);
    expect(fakeDb.stores.has("sync-queue")).toBe(false);

    // v5 stores SHOULD be created
    expect(fakeDb.stores.has("user-translation-manifests")).toBe(true);
    expect(fakeDb.stores.has("user-translation-chapters")).toBe(true);
  });

  it("skips v5 stores when upgrading from v5 (no-op upgrade)", () => {
    getDb();
    if (!capturedUpgrade) throw new Error("upgrade callback was not captured");
    capturedUpgrade(fakeDb, 5);

    // No stores should be created — database is already at v5
    expect(fakeDb.stores.size).toBe(0);
  });
});

describe("resetDbPromise", () => {
  it("clears the cached promise so getDb() opens a fresh connection", async () => {
    const { openDB } = await import("idb");

    // First call — opens a connection
    await getDb();
    expect(openDB).toHaveBeenCalledTimes(1);

    // Reset, then call again — should open a NEW connection
    resetDbPromise();
    await getDb();
    expect(openDB).toHaveBeenCalledTimes(2);
  });
});
