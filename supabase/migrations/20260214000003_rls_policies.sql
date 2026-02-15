-- Migration 003: Row Level Security policies
--
-- RLS is the REAL security boundary. Client-side checks are for UX only.
-- These policies ensure:
-- 1. Users can only CRUD their own annotations
-- 2. Public annotations are readable by everyone (including anonymous)
-- 3. Cross-references inherit access from their parent annotation
-- 4. Anonymous users cannot write anything

-- ╔══════════════════════════════════════╗
-- ║  ANNOTATIONS TABLE POLICIES         ║
-- ╚══════════════════════════════════════╝

alter table public.annotations enable row level security;

-- SELECT: Users see their own annotations + all public ones
create policy "Users can read own annotations"
  on public.annotations for select
  to authenticated
  using (user_id = auth.uid());

create policy "Anyone can read public annotations"
  on public.annotations for select
  to authenticated, anon
  using (is_public = true);

-- INSERT: Only authenticated users, and only for themselves
create policy "Users can create own annotations"
  on public.annotations for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: Only the owner can edit their annotations
create policy "Users can update own annotations"
  on public.annotations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: Only the owner can delete their annotations
create policy "Users can delete own annotations"
  on public.annotations for delete
  to authenticated
  using (user_id = auth.uid());

-- ╔══════════════════════════════════════╗
-- ║  CROSS-REFERENCES TABLE POLICIES    ║
-- ╚══════════════════════════════════════╝

alter table public.cross_references enable row level security;

-- SELECT: Cross-references are visible if the parent annotation is visible.
-- We check both "user owns the annotation" and "annotation is public".
create policy "Users can read cross-refs for own annotations"
  on public.cross_references for select
  to authenticated
  using (
    exists (
      select 1 from public.annotations
      where annotations.id = cross_references.annotation_id
        and annotations.user_id = auth.uid()
    )
  );

create policy "Anyone can read cross-refs for public annotations"
  on public.cross_references for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.annotations
      where annotations.id = cross_references.annotation_id
        and annotations.is_public = true
    )
  );

-- INSERT: Only if the user owns the parent annotation
create policy "Users can create cross-refs for own annotations"
  on public.cross_references for insert
  to authenticated
  with check (
    exists (
      select 1 from public.annotations
      where annotations.id = cross_references.annotation_id
        and annotations.user_id = auth.uid()
    )
  );

-- UPDATE: Only if the user owns the parent annotation
create policy "Users can update cross-refs for own annotations"
  on public.cross_references for update
  to authenticated
  using (
    exists (
      select 1 from public.annotations
      where annotations.id = cross_references.annotation_id
        and annotations.user_id = auth.uid()
    )
  );

-- DELETE: Only if the user owns the parent annotation
create policy "Users can delete cross-refs for own annotations"
  on public.cross_references for delete
  to authenticated
  using (
    exists (
      select 1 from public.annotations
      where annotations.id = cross_references.annotation_id
        and annotations.user_id = auth.uid()
    )
  );
