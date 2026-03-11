-- AI Screening Columns
-- Adds screening result storage to annotations and devotional_bibles.
-- AI screening is annotative (non-blocking) — flags content for moderators
-- but does not auto-reject. Human moderators have final authority.

-- Add screening columns to annotations
ALTER TABLE annotations
  ADD COLUMN IF NOT EXISTS ai_screening_passed boolean,
  ADD COLUMN IF NOT EXISTS ai_screening_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_screened_at timestamptz;

-- Add screening columns to devotional_bibles
ALTER TABLE devotional_bibles
  ADD COLUMN IF NOT EXISTS ai_screening_passed boolean,
  ADD COLUMN IF NOT EXISTS ai_screening_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_screened_at timestamptz;

-- Moderators can read screening results (already have SELECT on pending annotations)
-- No new RLS needed — screening columns are on existing tables with existing policies.

-- Index for moderator queue filtering (flagged items first)
CREATE INDEX IF NOT EXISTS idx_annotations_ai_screening
  ON annotations (ai_screening_passed)
  WHERE publish_status = 'pending';
