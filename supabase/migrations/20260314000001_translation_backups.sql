-- Migration: Add encrypted backup storage for user-uploaded Bible translations
--
-- Creates two tables for storing encrypted copies of user-uploaded Bibles
-- in Supabase as a "personal backup system." Users can restore their
-- translations on a new device or after clearing browser data.
--
-- Design decisions:
-- - Manifests (metadata) are stored plaintext — not copyrightable content.
-- - Chapter verse data is encrypted client-side (AES-256-GCM) before upload,
--   using the same encryption key as private annotations.
-- - Strict RLS: users can ONLY access their own rows. No cross-user access.
-- - No distribution capability — this is a personal backup, not a sharing system.
-- - Two tables (not one blob) to allow granular restore and avoid large row sizes.
-- - user_id is denormalized on the chapters table for RLS performance (no joins).

-- ── translation_backups: one row per backed-up translation ──

CREATE TABLE public.translation_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner: cascades on account deletion
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Translation identifier (matches IndexedDB key, e.g., "user-nrsvue")
  translation_id text NOT NULL,

  -- Manifest metadata (plaintext — not copyrightable)
  name text NOT NULL,
  abbreviation text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  license text NOT NULL DEFAULT 'Personal use',
  books jsonb NOT NULL DEFAULT '[]',       -- BookInfo[] as JSON array
  original_filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('epub', 'text')),

  -- When the user originally uploaded the file (from IndexedDB manifest)
  uploaded_at timestamptz NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- One backup per translation per user
  CONSTRAINT translation_backups_unique UNIQUE (user_id, translation_id)
);

COMMENT ON TABLE public.translation_backups IS 'Personal backup of user-uploaded Bible translation metadata. Content is in translation_backup_chapters.';
COMMENT ON COLUMN public.translation_backups.translation_id IS 'Matches the IndexedDB key (e.g., "user-nrsvue"). Always starts with "user-".';
COMMENT ON COLUMN public.translation_backups.books IS 'BookInfo[] array — book IDs, names, chapter counts, testaments.';

-- Index for fast lookup by user (the only query pattern)
CREATE INDEX idx_translation_backups_user_id ON public.translation_backups(user_id);

-- Auto-update updated_at on row changes
CREATE TRIGGER translation_backups_updated_at
  BEFORE UPDATE ON public.translation_backups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ── translation_backup_chapters: encrypted chapter data ──

CREATE TABLE public.translation_backup_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to the parent backup manifest (cascades on backup deletion)
  backup_id uuid NOT NULL REFERENCES public.translation_backups(id) ON DELETE CASCADE,

  -- Denormalized owner for RLS performance (avoids join to translation_backups)
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Chapter identity
  book text NOT NULL,
  chapter integer NOT NULL,
  book_name text NOT NULL,

  -- Encrypted verse data: JSON.stringify(verses) → AES-256-GCM → base64
  encrypted_verses text NOT NULL,

  -- AES-GCM initialization vector (base64, 12 bytes). Unique per chapter.
  encryption_iv text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- One chapter per book per backup
  CONSTRAINT backup_chapters_unique UNIQUE (backup_id, book, chapter)
);

COMMENT ON TABLE public.translation_backup_chapters IS 'Encrypted verse data for user-uploaded Bible translation backups. Each row is one chapter, encrypted with the user''s AES-256-GCM key.';
COMMENT ON COLUMN public.translation_backup_chapters.encrypted_verses IS 'AES-256-GCM ciphertext (base64) of JSON.stringify(Verse[]). Decrypted client-side only.';
COMMENT ON COLUMN public.translation_backup_chapters.encryption_iv IS 'AES-GCM IV (base64, 12 bytes). Unique per encryption operation — reuse breaks security.';

-- Indexes for fast chapter retrieval and RLS performance
CREATE INDEX idx_backup_chapters_backup_id ON public.translation_backup_chapters(backup_id);
CREATE INDEX idx_backup_chapters_user_id ON public.translation_backup_chapters(user_id);

-- ── Row Level Security: translation_backups ──

ALTER TABLE public.translation_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own translation backups"
  ON public.translation_backups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own translation backups"
  ON public.translation_backups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own translation backups"
  ON public.translation_backups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own translation backups"
  ON public.translation_backups FOR DELETE
  USING (auth.uid() = user_id);

-- ── Row Level Security: translation_backup_chapters ──

ALTER TABLE public.translation_backup_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own backup chapters"
  ON public.translation_backup_chapters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backup chapters"
  ON public.translation_backup_chapters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backup chapters"
  ON public.translation_backup_chapters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backup chapters"
  ON public.translation_backup_chapters FOR DELETE
  USING (auth.uid() = user_id);
