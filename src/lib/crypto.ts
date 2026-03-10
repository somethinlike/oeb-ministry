/**
 * Client-side encryption module — AES-256-GCM via Web Crypto API.
 *
 * This module handles all cryptographic operations for annotation locking.
 * No npm dependencies — uses only the browser's built-in Web Crypto API.
 *
 * Key concepts:
 * - **Passphrase** → PBKDF2 → **CryptoKey** (derived once per session)
 * - **CryptoKey** + random IV → AES-GCM encrypt/decrypt per annotation
 * - **Recovery code** → PBKDF2 → **wrapping key** → unwraps the real key
 *
 * The CryptoKey is non-extractable: even with JS execution context,
 * an attacker cannot read the raw key bytes from memory.
 *
 * OWASP 2023 recommends 600,000+ PBKDF2 iterations with SHA-256.
 */

// ── Constants ──

/** PBKDF2 iteration count for new setups (OWASP 2023 minimum) */
export const DEFAULT_ITERATIONS = 600_000;

/** Salt size in bytes (128 bits, per OWASP recommendation) */
const SALT_BYTES = 16;

/** AES-GCM IV size in bytes (96 bits, per NIST SP 800-38D) */
const IV_BYTES = 12;

/** Known plaintext for passphrase verification (encrypted during setup) */
const VERIFICATION_PLAINTEXT = "oeb-verify-v1";

/** Recovery code format: 6 groups of 4 chars from this alphabet */
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_GROUPS = 6;
const RECOVERY_GROUP_LEN = 4;

// ── Key Derivation ──

/**
 * Derive an AES-256-GCM encryption key from a passphrase using PBKDF2.
 *
 * The returned CryptoKey is non-extractable — it can be used for
 * encrypt/decrypt but its raw bytes cannot be read back. This is a
 * Web Crypto security feature.
 *
 * @param passphrase - User's passphrase (or recovery code for recovery flow)
 * @param salt - Random salt (stored in user_encryption table)
 * @param iterations - PBKDF2 iteration count (stored alongside salt)
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  // Import the passphrase as raw key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false, // not extractable
    ["deriveKey"],
  );

  // Derive AES-256-GCM key from the passphrase material
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable — cannot read raw key bytes
    ["encrypt", "decrypt"],
  );
}

/**
 * Derive a wrapping key from a passphrase. Used for key wrapping
 * (recovery code flow). The only difference from deriveKey is the
 * usages: "wrapKey" and "unwrapKey" instead of "encrypt"/"decrypt".
 */
export async function deriveWrappingKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

// ── Encrypt / Decrypt ──

/**
 * Encrypt a plaintext string with AES-256-GCM.
 *
 * Generates a random 12-byte IV per call. AES-GCM requires a unique IV
 * for every encryption with the same key — reusing an IV completely
 * breaks the security guarantee. Random generation makes collisions
 * astronomically unlikely (2^96 possible IVs).
 *
 * @returns The ciphertext bytes and the IV used (both needed for decryption)
 */
export async function encryptContent(
  plaintext: string,
  key: CryptoKey,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoded,
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    iv,
  };
}

/**
 * Decrypt AES-256-GCM ciphertext back to a plaintext string.
 *
 * Throws if the key or IV is wrong, or if the ciphertext is corrupted.
 * AES-GCM includes an authentication tag — tampered data is rejected,
 * not silently decrypted to garbage.
 */
export async function decryptContent(
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );

  return new TextDecoder().decode(decrypted);
}

// ── Key Wrapping (for recovery codes) ──

/**
 * Wrap (encrypt) the user's encryption key with a wrapping key.
 *
 * Used during encryption setup: the encryption key is wrapped with
 * a key derived from the recovery code. This way, the recovery code
 * can unlock the data even if the passphrase is forgotten.
 *
 * AES-KW (Key Wrap) is purpose-built for wrapping keys — it adds
 * integrity protection so a corrupted wrapped key is detected.
 *
 * Note: The encryption key must be created as extractable for wrapping
 * to work. We derive a separate extractable copy just for this operation.
 */
export async function wrapKey(
  keyToWrap: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<Uint8Array> {
  const wrapped = await crypto.subtle.wrapKey(
    "raw",
    keyToWrap,
    wrappingKey,
    "AES-KW",
  );

  return new Uint8Array(wrapped);
}

/**
 * Unwrap (decrypt) a previously wrapped encryption key.
 *
 * Used during recovery: the recovery code derives the wrapping key,
 * which unwraps the actual encryption key.
 */
export async function unwrapKey(
  wrappedKey: Uint8Array,
  unwrappingKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    "raw",
    wrappedKey as BufferSource,
    unwrappingKey,
    "AES-KW",
    { name: "AES-GCM", length: 256 },
    false, // non-extractable result
    ["encrypt", "decrypt"],
  );
}

/**
 * Derive an extractable encryption key — used only during setup
 * so the key can be wrapped for recovery. After wrapping, this key
 * is discarded and a non-extractable version is derived for actual use.
 */
export async function deriveExtractableKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // extractable — needed for wrapKey
    ["encrypt", "decrypt"],
  );
}

// ── Verification ──

/**
 * Create a verification blob during encryption setup.
 *
 * Encrypts a known constant string with the user's key. On future
 * passphrase entry, we decrypt this blob to verify the passphrase
 * is correct — faster and simpler than trying to decrypt an actual
 * annotation.
 */
export async function createVerificationBlob(
  key: CryptoKey,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  return encryptContent(VERIFICATION_PLAINTEXT, key);
}

/**
 * Verify a passphrase by attempting to decrypt the verification blob.
 *
 * Returns true if the passphrase is correct, false otherwise.
 * Never throws — wrong passphrase is a normal control flow, not an error.
 */
export async function verifyPassphrase(
  key: CryptoKey,
  verificationCiphertext: Uint8Array,
  verificationIv: Uint8Array,
): Promise<boolean> {
  try {
    const decrypted = await decryptContent(verificationCiphertext, key, verificationIv);
    return decrypted === VERIFICATION_PLAINTEXT;
  } catch {
    // Decryption failure = wrong key
    return false;
  }
}

// ── Random Generation ──

/** Generate a random salt for PBKDF2 (16 bytes / 128 bits). */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

/**
 * Generate a cryptographically random recovery code.
 *
 * Format: 6 groups of 4 characters separated by hyphens.
 * Example: AB3K-9F2M-X7PQ-4R8N-C5HJ-W6TL
 *
 * Uses a 32-character alphabet (A-Z minus I, O, 0, 1 to avoid confusion)
 * = 5 bits per character × 24 characters = ~120 bits of entropy.
 */
export function generateRecoveryCode(): string {
  const totalChars = RECOVERY_GROUPS * RECOVERY_GROUP_LEN;
  const randomBytes = crypto.getRandomValues(new Uint8Array(totalChars));

  const chars: string[] = [];
  for (let i = 0; i < totalChars; i++) {
    // Map each random byte to an alphabet index (modulo bias is negligible
    // at 256 / 32 = exactly 8, so there's actually zero bias here)
    chars.push(RECOVERY_ALPHABET[randomBytes[i] % RECOVERY_ALPHABET.length]);
  }

  // Split into groups: AB3K-9F2M-X7PQ-...
  const groups: string[] = [];
  for (let i = 0; i < totalChars; i += RECOVERY_GROUP_LEN) {
    groups.push(chars.slice(i, i + RECOVERY_GROUP_LEN).join(""));
  }

  return groups.join("-");
}

/**
 * Hash a recovery code with SHA-256 for server-side storage.
 *
 * The raw recovery code is shown once and never stored. Only the hash
 * goes to Supabase — used to verify the code during recovery.
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = new Uint8Array(hashBuffer);

  // Convert to hex string
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Base64 Helpers ──
// Used to serialize Uint8Array ↔ string for storage in Supabase text
// columns and IndexedDB. We use base64 instead of Postgres bytea to
// avoid hex encoding headaches in the TypeScript layer.

/** Convert a Uint8Array to a base64 string. */
export function uint8ToBase64(bytes: Uint8Array): string {
  // Build a binary string from the byte array, then btoa() it
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert a base64 string back to a Uint8Array. */
export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
