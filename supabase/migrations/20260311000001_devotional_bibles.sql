-- Migration: Devotional Bible Collections
--
-- The headline feature of v3: users curate annotations into devotional
-- bible collections — overlaid on a base translation.
--
-- Two types:
-- - "original": all annotations belong to the owner (one theological voice)
-- - "assembled": mix of own + public CC0 annotations from others (forkable)
--
-- Tables:
-- 1. devotional_bibles — collection metadata (title, type, publishing state)
-- 2. devotional_bible_entries — join table linking collections to annotations
--
-- Also modifies moderation_log to support devotional bible moderation.

-- ╔══════════════════════════════════════╗
-- ║  DEVOTIONAL_BIBLES TABLE            ║
-- ╚══════════════════════════════════════╝

CREATE TABLE public.devotional_bibles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  translation text NOT NULL,
  type text NOT NULL CHECK (type IN ('original', 'assembled')),
  is_published boolean NOT NULL DEFAULT false,
  publish_status text DEFAULT NULL
    CHECK (publish_status IS NULL OR publish_status IN ('pending', 'approved', 'rejected')),
  published_at timestamptz DEFAULT NULL,
  rejection_reason text DEFAULT NULL,
  forked_from_id uuid DEFAULT NULL REFERENCES public.devotional_bibles(id) ON DELETE SET NULL,
  author_display_name text DEFAULT NULL,
  entry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz DEFAULT NULL
);

-- Indexes for common query patterns
CREATE INDEX idx_devotional_bibles_user_id
  ON public.devotional_bibles (user_id);

CREATE INDEX idx_devotional_bibles_published
  ON public.devotional_bibles (is_published, publish_status)
  WHERE is_published = true;

CREATE INDEX idx_devotional_bibles_deleted
  ON public.devotional_bibles (user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_devotional_bibles_forked_from
  ON public.devotional_bibles (forked_from_id)
  WHERE forked_from_id IS NOT NULL;

-- Reuse the existing update_updated_at() trigger function from annotations
CREATE TRIGGER devotional_bibles_updated_at
  BEFORE UPDATE ON public.devotional_bibles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ╔══════════════════════════════════════╗
-- ║  DEVOTIONAL_BIBLE_ENTRIES TABLE     ║
-- ╚══════════════════════════════════════╝

CREATE TABLE public.devotional_bible_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  devotional_bible_id uuid REFERENCES public.devotional_bibles(id) ON DELETE CASCADE NOT NULL,
  annotation_id uuid REFERENCES public.annotations(id) ON DELETE CASCADE NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(devotional_bible_id, annotation_id)
);

-- Fetch entries in order for a devotional
CREATE INDEX idx_devotional_entries_bible_id
  ON public.devotional_bible_entries (devotional_bible_id, sort_order);

-- "Which devotionals include this annotation?" lookups
CREATE INDEX idx_devotional_entries_annotation_id
  ON public.devotional_bible_entries (annotation_id);

-- ╔══════════════════════════════════════════════╗
-- ║  ENTRY_COUNT TRIGGER (auto-sync)            ║
-- ╚══════════════════════════════════════════════╝

-- Keeps devotional_bibles.entry_count accurate even when annotations
-- are permanently deleted (FK cascade removes entries but the app
-- layer wouldn't know to decrement).

CREATE OR REPLACE FUNCTION update_devotional_entry_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.devotional_bibles
      SET entry_count = entry_count + 1
      WHERE id = NEW.devotional_bible_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.devotional_bibles
      SET entry_count = entry_count - 1
      WHERE id = OLD.devotional_bible_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER devotional_entry_count_sync
  AFTER INSERT OR DELETE ON public.devotional_bible_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_devotional_entry_count();

-- ╔══════════════════════════════════════════════╗
-- ║  MODERATION_LOG — ADD DEVOTIONAL SUPPORT    ║
-- ╚══════════════════════════════════════════════╝

-- Make annotation_id nullable (was NOT NULL) so the log can track
-- both annotation and devotional bible moderation actions.
ALTER TABLE public.moderation_log
  ALTER COLUMN annotation_id DROP NOT NULL;

-- Add devotional_bible_id FK
ALTER TABLE public.moderation_log
  ADD COLUMN devotional_bible_id uuid DEFAULT NULL
    REFERENCES public.devotional_bibles(id) ON DELETE CASCADE;

-- Exactly one of annotation_id or devotional_bible_id must be set
ALTER TABLE public.moderation_log
  ADD CONSTRAINT moderation_log_exactly_one_target
    CHECK (
      (annotation_id IS NOT NULL AND devotional_bible_id IS NULL)
      OR (annotation_id IS NULL AND devotional_bible_id IS NOT NULL)
    );

-- ╔══════════════════════════════════════════════╗
-- ║  RLS — DEVOTIONAL_BIBLES                    ║
-- ╚══════════════════════════════════════════════╝

ALTER TABLE public.devotional_bibles ENABLE ROW LEVEL SECURITY;

-- Users can read their own devotional bibles (including unpublished)
CREATE POLICY "Users can read own devotional bibles"
  ON public.devotional_bibles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Anyone can read published & approved devotional bibles
CREATE POLICY "Anyone can read published devotional bibles"
  ON public.devotional_bibles FOR SELECT
  TO authenticated, anon
  USING (is_published = true AND publish_status = 'approved');

-- Users can create devotional bibles for themselves
CREATE POLICY "Users can create own devotional bibles"
  ON public.devotional_bibles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own devotional bibles
CREATE POLICY "Users can update own devotional bibles"
  ON public.devotional_bibles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own devotional bibles
CREATE POLICY "Users can delete own devotional bibles"
  ON public.devotional_bibles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Moderators can read pending devotional bibles (review queue)
CREATE POLICY "Moderators can read pending devotional bibles"
  ON public.devotional_bibles FOR SELECT
  TO authenticated
  USING (
    publish_status = 'pending'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  );

-- Moderators can update publish_status on devotional bibles
CREATE POLICY "Moderators can update devotional bible publish status"
  ON public.devotional_bibles FOR UPDATE
  TO authenticated
  USING (
    publish_status IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  );

-- ╔══════════════════════════════════════════════╗
-- ║  RLS — DEVOTIONAL_BIBLE_ENTRIES              ║
-- ╚══════════════════════════════════════════════╝

ALTER TABLE public.devotional_bible_entries ENABLE ROW LEVEL SECURITY;

-- Users can read entries for their own devotional bibles
CREATE POLICY "Users can read entries for own devotional bibles"
  ON public.devotional_bible_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.devotional_bibles
      WHERE devotional_bibles.id = devotional_bible_entries.devotional_bible_id
        AND devotional_bibles.user_id = auth.uid()
    )
  );

-- Anyone can read entries for published devotional bibles
CREATE POLICY "Anyone can read entries for published devotional bibles"
  ON public.devotional_bible_entries FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.devotional_bibles
      WHERE devotional_bibles.id = devotional_bible_entries.devotional_bible_id
        AND devotional_bibles.is_published = true
        AND devotional_bibles.publish_status = 'approved'
    )
  );

-- Users can add entries to their own devotional bibles
CREATE POLICY "Users can insert entries for own devotional bibles"
  ON public.devotional_bible_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.devotional_bibles
      WHERE devotional_bibles.id = devotional_bible_entries.devotional_bible_id
        AND devotional_bibles.user_id = auth.uid()
    )
  );

-- Users can update entries in their own devotional bibles (reordering)
CREATE POLICY "Users can update entries for own devotional bibles"
  ON public.devotional_bible_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.devotional_bibles
      WHERE devotional_bibles.id = devotional_bible_entries.devotional_bible_id
        AND devotional_bibles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.devotional_bibles
      WHERE devotional_bibles.id = devotional_bible_entries.devotional_bible_id
        AND devotional_bibles.user_id = auth.uid()
    )
  );

-- Users can remove entries from their own devotional bibles
CREATE POLICY "Users can delete entries for own devotional bibles"
  ON public.devotional_bible_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.devotional_bibles
      WHERE devotional_bibles.id = devotional_bible_entries.devotional_bible_id
        AND devotional_bibles.user_id = auth.uid()
    )
  );

-- ╔══════════════════════════════════════════════════════════╗
-- ║  MODERATION_LOG RLS — DEVOTIONAL BIBLE ENTRIES          ║
-- ╚══════════════════════════════════════════════════════════╝

-- Devotional bible owners can read moderation actions on their collections
CREATE POLICY "Users can read moderation logs for own devotional bibles"
  ON public.moderation_log FOR SELECT
  TO authenticated
  USING (
    devotional_bible_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.devotional_bibles
      WHERE devotional_bibles.id = moderation_log.devotional_bible_id
        AND devotional_bibles.user_id = auth.uid()
    )
  );
