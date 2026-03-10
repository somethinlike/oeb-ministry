/**
 * EncryptionProvider — manages the in-memory encryption key lifecycle.
 *
 * The derived CryptoKey lives in React state for the duration of the
 * browser session. On page reload, the user re-enters their passphrase
 * (browser credential managers auto-fill it, so this is near-instant
 * for users who saved it).
 *
 * Key lifecycle:
 * 1. User opens app → EncryptionProvider checks if they have encryption set up
 * 2. If yes → shows unlock prompt on first attempt to read/write a locked note
 * 3. User enters passphrase → key derived → stored in state → session unlocked
 * 4. User clicks "Lock" or closes tab → key cleared from memory
 *
 * The CryptoKey is **never** persisted to localStorage or IndexedDB.
 * This is by design — the key exists only in volatile memory.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { Database } from "../types/database";
import {
  deriveKey,
  verifyPassphrase,
  base64ToUint8,
  uint8ToBase64,
  generateSalt,
  generateRecoveryCode,
  hashRecoveryCode,
  createVerificationBlob,
  deriveExtractableKey,
  deriveWrappingKey,
  wrapKey,
  DEFAULT_ITERATIONS,
} from "../lib/crypto";

// ── Types ──

type EncryptionRow = Database["public"]["Tables"]["user_encryption"]["Row"];

export interface EncryptionContextValue {
  /** Whether the user has encryption set up (has a row in user_encryption) */
  hasEncryption: boolean;
  /** Whether we've finished checking Supabase for encryption state */
  isLoaded: boolean;
  /** Whether the key is currently in memory (user entered passphrase this session) */
  isUnlocked: boolean;
  /** The derived CryptoKey (null until user enters passphrase) */
  cryptoKey: CryptoKey | null;
  /** Unlock with passphrase (returning user). Returns false if wrong passphrase. */
  unlock: (passphrase: string) => Promise<boolean>;
  /** Lock (clear key from memory) */
  lock: () => void;
  /**
   * Set up encryption for the first time.
   * Returns the recovery code (shown once, never stored).
   * Returns null if setup failed.
   */
  setupEncryption: (passphrase: string) => Promise<string | null>;
  /** User's email — passed to credential manager forms so they index the passphrase correctly */
  userEmail: string | null;
}

const EncryptionContext = createContext<EncryptionContextValue>({
  hasEncryption: false,
  isLoaded: false,
  isUnlocked: false,
  cryptoKey: null,
  unlock: async () => false,
  lock: () => {},
  setupEncryption: async () => null,
  userEmail: null,
});

/** Hook to access encryption state from any component inside the provider. */
export function useEncryption(): EncryptionContextValue {
  return useContext(EncryptionContext);
}

// ── Provider ──

interface EncryptionProviderProps {
  userId: string | null;
  /** User's email for credential manager integration */
  userEmail?: string | null;
  children: ReactNode;
}

export function EncryptionProvider({ userId, userEmail = null, children }: EncryptionProviderProps) {
  const [encryptionRow, setEncryptionRow] = useState<EncryptionRow | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  // Fetch encryption state from Supabase on mount
  useEffect(() => {
    if (!userId) {
      setIsLoaded(true);
      return;
    }

    // Wrap in Promise.resolve() because Supabase returns PromiseLike (no .catch)
    Promise.resolve(
      supabase
        .from("user_encryption")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    )
      .then(({ data }) => {
        setEncryptionRow(data ?? null);
        setIsLoaded(true);
      })
      .catch(() => {
        // Network error — user can still use unencrypted features
        setIsLoaded(true);
      });
  }, [userId]);

  /** Derive key from passphrase and verify against the stored verification blob. */
  const unlock = useCallback(
    async (passphrase: string): Promise<boolean> => {
      if (!encryptionRow) return false;

      try {
        const salt = base64ToUint8(encryptionRow.key_salt);
        const key = await deriveKey(passphrase, salt, encryptionRow.iterations);

        // Verify against the stored verification blob
        const vCiphertext = base64ToUint8(encryptionRow.verification_ciphertext);
        const vIv = base64ToUint8(encryptionRow.verification_iv);
        const isValid = await verifyPassphrase(key, vCiphertext, vIv);

        if (isValid) {
          setCryptoKey(key);
          return true;
        }

        return false;
      } catch {
        return false;
      }
    },
    [encryptionRow],
  );

  /** Clear the key from memory. */
  const lock = useCallback(() => {
    setCryptoKey(null);
  }, []);

  /**
   * First-time encryption setup.
   * Derives the key, creates verification blob, wraps key for recovery,
   * saves everything to Supabase. Returns the recovery code (shown once).
   */
  const setupEncryption = useCallback(
    async (passphrase: string): Promise<string | null> => {
      if (!userId) return null;

      try {
        // 1. Generate salts
        const keySalt = generateSalt();
        const recoveryKeySalt = generateSalt();

        // 2. Derive the encryption key (non-extractable for daily use)
        const key = await deriveKey(passphrase, keySalt, DEFAULT_ITERATIONS);

        // 3. Derive an extractable copy for wrapping (then discard it)
        const extractableKey = await deriveExtractableKey(passphrase, keySalt, DEFAULT_ITERATIONS);

        // 4. Generate recovery code and derive wrapping key from it
        const recoveryCode = generateRecoveryCode();
        const recoveryHash = await hashRecoveryCode(recoveryCode);
        const wrappingKey = await deriveWrappingKey(recoveryCode, recoveryKeySalt, DEFAULT_ITERATIONS);

        // 5. Wrap the extractable key for recovery
        const wrappedKey = await wrapKey(extractableKey, wrappingKey);

        // 6. Create verification blob
        const verification = await createVerificationBlob(key);

        // 7. Save to Supabase
        const row = {
          user_id: userId,
          key_salt: uint8ToBase64(keySalt),
          iterations: DEFAULT_ITERATIONS,
          recovery_code_hash: recoveryHash,
          recovery_wrapped_key: uint8ToBase64(wrappedKey),
          recovery_key_salt: uint8ToBase64(recoveryKeySalt),
          verification_ciphertext: uint8ToBase64(verification.ciphertext),
          verification_iv: uint8ToBase64(verification.iv),
        };

        const { data, error } = await supabase
          .from("user_encryption")
          .insert(row)
          .select()
          .single();

        if (error || !data) {
          console.error("Failed to save encryption setup:", error?.message);
          return null;
        }

        // 8. Update local state
        setEncryptionRow(data);
        setCryptoKey(key);

        // 9. Return recovery code (shown to user once, never stored)
        return recoveryCode;
      } catch (err) {
        console.error("Encryption setup failed:", err);
        return null;
      }
    },
    [userId],
  );

  const value: EncryptionContextValue = {
    hasEncryption: encryptionRow !== null,
    isLoaded,
    isUnlocked: cryptoKey !== null,
    cryptoKey,
    unlock,
    lock,
    setupEncryption,
    userEmail,
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
}
