-- Add verse_text column to annotations.
-- Stores the actual Bible verse text at the time the annotation was created,
-- enabling exports to include the verse even when offline.
ALTER TABLE public.annotations ADD COLUMN verse_text text DEFAULT NULL;
