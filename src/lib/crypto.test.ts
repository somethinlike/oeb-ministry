/**
 * Tests for the client-side encryption module.
 *
 * Covers: key derivation, encrypt/decrypt roundtrip, wrong-key rejection,
 * key wrapping (recovery), verification blobs, recovery codes, base64 helpers.
 */

import { describe, it, expect } from "vitest";
import {
  deriveKey,
  deriveWrappingKey,
  deriveExtractableKey,
  encryptContent,
  decryptContent,
  wrapKey,
  unwrapKey,
  createVerificationBlob,
  verifyPassphrase,
  generateSalt,
  generateRecoveryCode,
  hashRecoveryCode,
  uint8ToBase64,
  base64ToUint8,
  DEFAULT_ITERATIONS,
} from "./crypto";

// Use fewer iterations in tests for speed — 1000 instead of 600k.
// The crypto is identical; PBKDF2 iterations only affect derivation time.
const TEST_ITERATIONS = 1000;

// ── Key Derivation ──

describe("deriveKey", () => {
  it("produces a CryptoKey from passphrase + salt", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test-passphrase", salt, TEST_ITERATIONS);

    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    expect(key.extractable).toBe(false);
    expect(key.usages).toContain("encrypt");
    expect(key.usages).toContain("decrypt");
  });

  it("same passphrase + same salt = functionally equivalent key", async () => {
    const salt = generateSalt();
    const keyA = await deriveKey("same-passphrase", salt, TEST_ITERATIONS);
    const keyB = await deriveKey("same-passphrase", salt, TEST_ITERATIONS);

    // Can't compare keys directly (non-extractable), so verify via roundtrip:
    // encrypt with keyA, decrypt with keyB
    const { ciphertext, iv } = await encryptContent("roundtrip test", keyA);
    const decrypted = await decryptContent(ciphertext, keyB, iv);
    expect(decrypted).toBe("roundtrip test");
  });

  it("different passphrase = different key (decrypt fails)", async () => {
    const salt = generateSalt();
    const keyA = await deriveKey("passphrase-A", salt, TEST_ITERATIONS);
    const keyB = await deriveKey("passphrase-B", salt, TEST_ITERATIONS);

    const { ciphertext, iv } = await encryptContent("secret text", keyA);
    await expect(decryptContent(ciphertext, keyB, iv)).rejects.toThrow();
  });

  it("different salt = different key (decrypt fails)", async () => {
    const saltA = generateSalt();
    const saltB = generateSalt();
    const keyA = await deriveKey("same-passphrase", saltA, TEST_ITERATIONS);
    const keyB = await deriveKey("same-passphrase", saltB, TEST_ITERATIONS);

    const { ciphertext, iv } = await encryptContent("secret text", keyA);
    await expect(decryptContent(ciphertext, keyB, iv)).rejects.toThrow();
  });

  it("exports DEFAULT_ITERATIONS as 600000+", () => {
    expect(DEFAULT_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });
});

// ── Encrypt / Decrypt Roundtrip ──

describe("encryptContent / decryptContent", () => {
  let key: CryptoKey;

  beforeAll(async () => {
    const salt = generateSalt();
    key = await deriveKey("roundtrip-test", salt, TEST_ITERATIONS);
  });

  it("encrypts and decrypts a simple string", async () => {
    const { ciphertext, iv } = await encryptContent("Hello, world!", key);
    const decrypted = await decryptContent(ciphertext, key, iv);
    expect(decrypted).toBe("Hello, world!");
  });

  it("ciphertext differs from plaintext", async () => {
    const { ciphertext } = await encryptContent("Hello, world!", key);
    const plaintextBytes = new TextEncoder().encode("Hello, world!");

    // Ciphertext is longer (includes auth tag) and different content
    expect(ciphertext.length).toBeGreaterThan(plaintextBytes.length);
    expect(ciphertext).not.toEqual(plaintextBytes);
  });

  it("produces different ciphertext on each call (random IV)", async () => {
    const result1 = await encryptContent("same text", key);
    const result2 = await encryptContent("same text", key);

    // IVs should differ
    expect(result1.iv).not.toEqual(result2.iv);
    // Ciphertext should differ (because IV differs)
    expect(result1.ciphertext).not.toEqual(result2.ciphertext);
  });

  it("handles empty string", async () => {
    const { ciphertext, iv } = await encryptContent("", key);
    const decrypted = await decryptContent(ciphertext, key, iv);
    expect(decrypted).toBe("");
  });

  it("handles very long content (10,000+ characters)", async () => {
    const longText = "A".repeat(10_000);
    const { ciphertext, iv } = await encryptContent(longText, key);
    const decrypted = await decryptContent(ciphertext, key, iv);
    expect(decrypted).toBe(longText);
    expect(decrypted.length).toBe(10_000);
  });

  it("handles Unicode (Greek, Hebrew)", async () => {
    const unicode = "Ἐν ἀρχῇ ἦν ὁ λόγος — בְּרֵאשִׁית בָּרָא אֱלֹהִים";
    const { ciphertext, iv } = await encryptContent(unicode, key);
    const decrypted = await decryptContent(ciphertext, key, iv);
    expect(decrypted).toBe(unicode);
  });

  it("handles emoji content", async () => {
    const emoji = "🙏 ✝️ 📖 🕊️";
    const { ciphertext, iv } = await encryptContent(emoji, key);
    const decrypted = await decryptContent(ciphertext, key, iv);
    expect(decrypted).toBe(emoji);
  });
});

// ── Wrong-Key Rejection ──

describe("wrong-key rejection", () => {
  it("rejects decryption with the wrong key", async () => {
    const salt = generateSalt();
    const correctKey = await deriveKey("correct", salt, TEST_ITERATIONS);
    const wrongKey = await deriveKey("wrong", salt, TEST_ITERATIONS);

    const { ciphertext, iv } = await encryptContent("secret", correctKey);
    await expect(decryptContent(ciphertext, wrongKey, iv)).rejects.toThrow();
  });

  it("rejects decryption with wrong IV", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test", salt, TEST_ITERATIONS);

    const { ciphertext } = await encryptContent("secret", key);
    const wrongIv = crypto.getRandomValues(new Uint8Array(12));

    await expect(decryptContent(ciphertext, key, wrongIv)).rejects.toThrow();
  });

  it("rejects corrupted ciphertext", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test", salt, TEST_ITERATIONS);

    const { ciphertext, iv } = await encryptContent("secret", key);

    // Flip a byte in the ciphertext
    const corrupted = new Uint8Array(ciphertext);
    corrupted[0] ^= 0xff;

    await expect(decryptContent(corrupted, key, iv)).rejects.toThrow();
  });
});

// ── Key Wrapping (Recovery Code Flow) ──

describe("key wrapping", () => {
  it("wraps and unwraps a key successfully", async () => {
    const salt = generateSalt();
    const recoverySalt = generateSalt();

    // The extractable key (what gets wrapped)
    const extractableKey = await deriveExtractableKey("passphrase", salt, TEST_ITERATIONS);

    // The wrapping key (derived from recovery code)
    const wrappingKey = await deriveWrappingKey("ABCD-EFGH-JKLM", recoverySalt, TEST_ITERATIONS);

    // Wrap the encryption key
    const wrapped = await wrapKey(extractableKey, wrappingKey);
    expect(wrapped.length).toBeGreaterThan(0);

    // Unwrap it
    const unwrapped = await unwrapKey(wrapped, wrappingKey);
    expect(unwrapped.type).toBe("secret");
    expect(unwrapped.extractable).toBe(false);

    // Verify the unwrapped key works: encrypt with original, decrypt with unwrapped
    const { ciphertext, iv } = await encryptContent("recovery test", extractableKey);
    const decrypted = await decryptContent(ciphertext, unwrapped, iv);
    expect(decrypted).toBe("recovery test");
  });

  it("rejects unwrapping with wrong wrapping key", async () => {
    const salt = generateSalt();
    const extractableKey = await deriveExtractableKey("passphrase", salt, TEST_ITERATIONS);

    const correctWrappingKey = await deriveWrappingKey("correct-code", generateSalt(), TEST_ITERATIONS);
    const wrongWrappingKey = await deriveWrappingKey("wrong-code", generateSalt(), TEST_ITERATIONS);

    const wrapped = await wrapKey(extractableKey, correctWrappingKey);
    await expect(unwrapKey(wrapped, wrongWrappingKey)).rejects.toThrow();
  });
});

// ── Verification Blob ──

describe("verification blob", () => {
  it("verifies correct passphrase", async () => {
    const salt = generateSalt();
    const key = await deriveKey("my-passphrase", salt, TEST_ITERATIONS);

    const { ciphertext, iv } = await createVerificationBlob(key);
    const isValid = await verifyPassphrase(key, ciphertext, iv);

    expect(isValid).toBe(true);
  });

  it("rejects wrong passphrase (returns false, does not throw)", async () => {
    const salt = generateSalt();
    const correctKey = await deriveKey("correct", salt, TEST_ITERATIONS);
    const wrongKey = await deriveKey("wrong", salt, TEST_ITERATIONS);

    const { ciphertext, iv } = await createVerificationBlob(correctKey);
    const isValid = await verifyPassphrase(wrongKey, ciphertext, iv);

    expect(isValid).toBe(false);
  });
});

// ── Salt & IV Generation ──

describe("generateSalt", () => {
  it("returns 16 bytes", () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it("produces different values on each call", () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a).not.toEqual(b);
  });
});

describe("encryptContent IV", () => {
  it("produces a 12-byte IV", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test", salt, TEST_ITERATIONS);
    const { iv } = await encryptContent("test", key);
    expect(iv.length).toBe(12);
  });
});

// ── Recovery Code ──

describe("generateRecoveryCode", () => {
  it("produces correct format (6 groups of 4 chars)", () => {
    const code = generateRecoveryCode();
    const groups = code.split("-");

    expect(groups.length).toBe(6);
    groups.forEach((group) => {
      expect(group.length).toBe(4);
      // Each char should be from the allowed alphabet (A-Z minus I,O + 2-9)
      expect(group).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    });
  });

  it("produces different codes on each call", () => {
    const a = generateRecoveryCode();
    const b = generateRecoveryCode();
    expect(a).not.toBe(b);
  });
});

describe("hashRecoveryCode", () => {
  it("produces a 64-character hex string (SHA-256)", async () => {
    const hash = await hashRecoveryCode("AB3K-9F2M-X7PQ-4R8N-C5HJ-W6TL");
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic (same input = same hash)", async () => {
    const code = "AB3K-9F2M-X7PQ-4R8N-C5HJ-W6TL";
    const hash1 = await hashRecoveryCode(code);
    const hash2 = await hashRecoveryCode(code);
    expect(hash1).toBe(hash2);
  });

  it("different codes produce different hashes", async () => {
    const hash1 = await hashRecoveryCode("AAAA-BBBB-CCCC-DDDD-EEEE-FFFF");
    const hash2 = await hashRecoveryCode("XXXX-YYYY-ZZZZ-2222-3333-4444");
    expect(hash1).not.toBe(hash2);
  });
});

// ── Base64 Helpers ──

describe("uint8ToBase64 / base64ToUint8", () => {
  it("roundtrips a byte array", () => {
    const original = new Uint8Array([0, 1, 127, 128, 255]);
    const b64 = uint8ToBase64(original);
    const restored = base64ToUint8(b64);
    expect(restored).toEqual(original);
  });

  it("roundtrips an empty array", () => {
    const original = new Uint8Array([]);
    const b64 = uint8ToBase64(original);
    const restored = base64ToUint8(b64);
    expect(restored).toEqual(original);
  });

  it("roundtrips a salt (16 bytes)", () => {
    const salt = generateSalt();
    const b64 = uint8ToBase64(salt);
    const restored = base64ToUint8(b64);
    expect(restored).toEqual(salt);
  });

  it("produces valid base64 string", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const b64 = uint8ToBase64(bytes);
    expect(b64).toBe("SGVsbG8="); // known base64 for "Hello"
  });
});
