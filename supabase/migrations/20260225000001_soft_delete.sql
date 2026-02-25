-- Migration: Add soft-delete support for annotations
--
-- Adds a deleted_at column to enable a "Recycle Bin" feature.
-- When NULL: annotation is active (normal state)
-- When set: annotation is in the recycle bin (soft-deleted)
-- Permanent deletion removes the row entirely.
--
-- No RLS changes needed — existing user_id = auth.uid() policy
-- covers both active and deleted annotations. The application
-- layer filters active vs. deleted via queries.

alter table public.annotations
  add column deleted_at timestamptz default null;

-- Partial index for fast recycle bin queries.
-- Only indexes rows where deleted_at IS NOT NULL (the small subset
-- of soft-deleted annotations), so zero overhead on normal queries.
create index idx_annotations_deleted
  on public.annotations(user_id, deleted_at)
  where deleted_at is not null;
