-- Migration 002: Cross-references table
--
-- Links an annotation to related verses elsewhere in the Bible.
-- Example: A note on John 3:16 might reference Romans 5:8.
-- This creates a web of connected scripture passages.

create table public.cross_references (
  id uuid primary key default gen_random_uuid(),

  -- Which annotation this cross-reference belongs to
  annotation_id uuid not null references public.annotations(id) on delete cascade,

  -- The referenced verse location
  book text not null,
  chapter integer not null check (chapter > 0),
  verse_start integer not null check (verse_start > 0),
  verse_end integer not null check (verse_end >= verse_start),

  created_at timestamptz not null default now()
);

-- Fast lookup: "which cross-references does this annotation have?"
create index idx_cross_refs_annotation on public.cross_references(annotation_id);

-- Reverse lookup: "which annotations reference this verse?"
create index idx_cross_refs_verse on public.cross_references(book, chapter);
