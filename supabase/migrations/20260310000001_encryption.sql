-- Migration: Add encryption support to annotations
--
-- Adds three columns to annotations for per-annotation encryption metadata,
-- and creates a user_encryption table for per-user encryption state.
--
-- Design decisions:
-- - encryption_iv and encryption_salt are stored as text (base64) not bytea,
--   to avoid hex encoding headaches in the TypeScript layer.
-- - is_encrypted defaults to false — existing annotations are unaffected.
-- - user_encryption stores the PBKDF2 salt, iteration count, verification blob,
--   and recovery code hash. The actual encryption key never touches the server.
-- - recovery_wrapped_key stores the encryption key wrapped (encrypted) with a
--   key derived from the recovery code, enabling password-free recovery.

-- ── Annotation encryption columns ──

ALTER TABLE public.annotations
  ADD COLUMN is_encrypted boolean NOT NULL DEFAULT false,
  ADD COLUMN encryption_iv text DEFAULT NULL,
  ADD COLUMN encryption_salt text DEFAULT NULL;

COMMENT ON COLUMN public.annotations.is_encrypted IS 'Whether content_md contains AES-256-GCM ciphertext (base64)';
COMMENT ON COLUMN public.annotations.encryption_iv IS 'AES-GCM initialization vector (base64, 12 bytes). Unique per encryption operation.';
COMMENT ON COLUMN public.annotations.encryption_salt IS 'Legacy/reserved. Per-user salt is in user_encryption table.';

-- ── User encryption state ──

CREATE TABLE public.user_encryption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner: one row per user, cascades on account deletion
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- PBKDF2 salt for deriving the encryption key from the passphrase (base64, 16 bytes)
  key_salt text NOT NULL,

  -- PBKDF2 iteration count (stored so we can upgrade without breaking existing keys)
  iterations integer NOT NULL DEFAULT 600000,

  -- SHA-256 hash of the recovery code (hex string). The raw code is never stored.
  recovery_code_hash text NOT NULL,

  -- The encryption key wrapped (encrypted) with a key derived from the recovery code.
  -- Enables unlocking data with the recovery code if the passphrase is forgotten.
  recovery_wrapped_key text NOT NULL,

  -- Salt used to derive the recovery wrapping key (separate from key_salt)
  recovery_key_salt text NOT NULL,

  -- Verification blob: a known plaintext encrypted with the user's key.
  -- Used to verify the passphrase is correct without decrypting an actual annotation.
  verification_ciphertext text NOT NULL,
  verification_iv text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- One encryption setup per user
  CONSTRAINT user_encryption_user_id_unique UNIQUE (user_id)
);

-- Index for fast lookup by user (the only query pattern)
CREATE INDEX idx_user_encryption_user_id ON public.user_encryption(user_id);

-- Auto-update updated_at on row changes
CREATE TRIGGER user_encryption_updated_at
  BEFORE UPDATE ON public.user_encryption
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ── Row Level Security ──

ALTER TABLE public.user_encryption ENABLE ROW LEVEL SECURITY;

-- Users can read their own encryption state
CREATE POLICY "Users can read own encryption"
  ON public.user_encryption FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own encryption state
CREATE POLICY "Users can insert own encryption"
  ON public.user_encryption FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own encryption state (passphrase change, recovery reset)
CREATE POLICY "Users can update own encryption"
  ON public.user_encryption FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own encryption state (disable encryption)
CREATE POLICY "Users can delete own encryption"
  ON public.user_encryption FOR DELETE
  USING (auth.uid() = user_id);
