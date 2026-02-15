-- Migration 001: Annotations table
--
-- This is the core table for user-created verse-anchored notes.
-- Each annotation is tied to a specific verse (or verse range) in a
-- specific Bible translation. Annotations can be private or public (CC0).
--
-- Full-text search is built in via a generated tsvector column so
-- users can search their notes without needing a separate search engine.

-- Enable the pgcrypto extension for gen_random_uuid()
create extension if not exists "pgcrypto";

create table public.annotations (
  id uuid primary key default gen_random_uuid(),

  -- Owner: ties to Supabase Auth's auth.users table
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Which Bible translation this annotation is anchored to
  translation text not null,

  -- Verse anchor: which verse(s) this note is attached to
  book text not null,
  chapter integer not null check (chapter > 0),
  verse_start integer not null check (verse_start > 0),
  verse_end integer not null check (verse_end >= verse_start),

  -- The annotation content in Markdown format
  content_md text not null default '',

  -- Public = CC0 licensed, visible to everyone
  -- Private = only the author can see it
  is_public boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Full-text search column: auto-generated from content_md
  -- Uses 'english' text search config for stemming/stop words
  search_vector tsvector generated always as (
    to_tsvector('english', content_md)
  ) stored
);

-- Index for fast lookups by owner (most common query pattern)
create index idx_annotations_user_id on public.annotations(user_id);

-- Index for finding annotations by verse location
create index idx_annotations_verse on public.annotations(translation, book, chapter);

-- Index for full-text search (GIN index is optimized for tsvector)
create index idx_annotations_search on public.annotations using gin(search_vector);

-- Index for listing public annotations
create index idx_annotations_public on public.annotations(is_public) where is_public = true;

-- Auto-update the updated_at timestamp whenever a row changes.
-- This trigger fires BEFORE update so the new timestamp is saved
-- with the rest of the updated data.
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger annotations_updated_at
  before update on public.annotations
  for each row
  execute function public.update_updated_at();
