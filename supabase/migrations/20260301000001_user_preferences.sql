-- Migration: User preferences table
--
-- Stores per-user reading preferences as a JSONB column so new
-- preference fields can be added without schema migrations.
-- One row per user. Preferences sync from localStorage on login
-- and roam across devices via Supabase.
--
-- Fields stored in preferences JSONB:
--   readerFont, annotationDots, readerLayout,
--   divineName, baptism, assembly, onlyBegotten,
--   defaultTranslation, denominationPreset
--
-- Workspace layout fields (splitRatio, swapped, undocked, cleanView)
-- stay in localStorage only — they're device-specific ergonomics.

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),

  -- Owner: one row per user, cascades on account deletion
  user_id uuid not null references auth.users(id) on delete cascade,

  -- All preferences in a single JSONB column — easy to extend
  preferences jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Enforce one row per user
  constraint user_preferences_user_id_unique unique (user_id)
);

-- Index for fast lookup by user (the only query pattern)
create index idx_user_preferences_user_id on public.user_preferences(user_id);

-- Auto-update updated_at on row changes (reuses existing trigger function)
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row
  execute function public.update_updated_at();

-- ── Row Level Security ──
alter table public.user_preferences enable row level security;

-- Users can read their own preferences
create policy "Users can read own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

-- Users can insert their own preferences
create policy "Users can insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

-- Users can update their own preferences
create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

-- Users can delete their own preferences
create policy "Users can delete own preferences"
  on public.user_preferences for delete
  using (auth.uid() = user_id);
