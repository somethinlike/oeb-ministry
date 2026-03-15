-- Audio-text sync: timing maps and storage for follow-along Bible reading.
--
-- Stores verse-level timing data that maps audio timestamps to verse numbers.
-- A timing map says "verse 16 starts at 45.2s" — this works across translations
-- because verse numbers are universal. An MP3 recorded in KJV can sync to
-- text displayed in NRSVue.
--
-- Two components:
-- 1. audio_timing_maps table — verse timing metadata (~1KB per chapter)
-- 2. bible-audio storage bucket — raw MP3 files (~5MB each, private)
--
-- YouTube sources don't need storage (the video lives on YouTube).
-- Only MP3 timing maps have associated files in the bucket.

-- ── Table: audio_timing_maps ──

CREATE TABLE public.audio_timing_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner — cascades on account deletion
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Audio source: 'mp3' (file in bible-audio bucket) or 'youtube' (external video)
  audio_source text NOT NULL CHECK (audio_source IN ('mp3', 'youtube')),

  -- For MP3: storage path in bible-audio bucket (e.g., "{user_id}/{book}/{chapter}.mp3")
  -- For YouTube: the video ID (e.g., "dQw4w9WgXcQ")
  source_id text NOT NULL,

  -- Which translation the audio was recorded in (e.g., "kjv", "oeb-us")
  audio_translation text NOT NULL,

  -- What chapter this timing map covers
  book text NOT NULL,
  chapter integer NOT NULL CHECK (chapter > 0),

  -- The actual timing data: array of {verseNumber, startTime, endTime}
  -- Stored as JSONB for flexibility and query-ability
  timings jsonb NOT NULL DEFAULT '[]',

  -- Community sharing (Phase 3.3) — YouTube-only, opt-in
  -- When true, other users can see and fork this timing map
  is_shared boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- A user can only have one timing map per chapter per audio source
  -- (e.g., one KJV MP3 timing for John 3, one YouTube timing for John 3)
  CONSTRAINT audio_timing_maps_unique
    UNIQUE (user_id, book, chapter, audio_source, source_id)
);

COMMENT ON TABLE public.audio_timing_maps IS
  'Verse-level timing data for audio-text synchronization. Maps audio timestamps to verse numbers so the reader can highlight text as it is read aloud.';

COMMENT ON COLUMN public.audio_timing_maps.timings IS
  'JSONB array of {verseNumber: number, startTime: number, endTime: number}. Times in seconds. Sorted by verseNumber ascending.';

COMMENT ON COLUMN public.audio_timing_maps.is_shared IS
  'Community sharing flag. Only YouTube timing maps can be shared (MP3s raise copyright concerns). When true, other authenticated users can view and fork this timing map.';

-- Indexes: user lookups (most common), then chapter browsing, then shared discovery
CREATE INDEX idx_audio_timing_maps_user
  ON public.audio_timing_maps(user_id);

CREATE INDEX idx_audio_timing_maps_chapter
  ON public.audio_timing_maps(book, chapter);

CREATE INDEX idx_audio_timing_maps_shared
  ON public.audio_timing_maps(book, chapter, is_shared)
  WHERE is_shared = true;

-- Auto-update updated_at on modification
CREATE TRIGGER audio_timing_maps_updated_at
  BEFORE UPDATE ON public.audio_timing_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ── RLS Policies ──

ALTER TABLE public.audio_timing_maps ENABLE ROW LEVEL SECURITY;

-- Users can read their own timing maps
CREATE POLICY "Users can read own timing maps"
  ON public.audio_timing_maps FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create timing maps for themselves
CREATE POLICY "Users can create own timing maps"
  ON public.audio_timing_maps FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own timing maps
CREATE POLICY "Users can update own timing maps"
  ON public.audio_timing_maps FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own timing maps
CREATE POLICY "Users can delete own timing maps"
  ON public.audio_timing_maps FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can read shared YouTube timing maps from other users
-- (community discovery — only YouTube, never MP3s)
CREATE POLICY "Authenticated users can read shared timing maps"
  ON public.audio_timing_maps FOR SELECT
  TO authenticated
  USING (
    is_shared = true
    AND audio_source = 'youtube'
  );

-- ── Storage Bucket: bible-audio ──
-- Private bucket for user-uploaded MP3 files.
-- Path convention: {user_id}/{book}/{chapter}.mp3
-- 50MB limit, audio/mpeg only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bible-audio',
  'bible-audio',
  false,         -- private: requires auth
  52428800,      -- 50MB in bytes
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/x-mpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own audio files.
-- Path must start with their user ID.

CREATE POLICY "Users can upload own audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bible-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bible-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bible-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
