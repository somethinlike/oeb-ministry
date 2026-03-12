-- Migration: User Profiles
--
-- Adds public profile pages for content authors.
-- Each user can set a URL slug, bio, and display name.
-- Profile is optional — users without one still have their content
-- attributed via author_display_name on annotations/devotionals.
--
-- The slug is the URL-friendly username: /profile/{slug}

-- ╔══════════════════════════════════════╗
-- ║  USER_PROFILES TABLE               ║
-- ╚══════════════════════════════════════╝

CREATE TABLE public.user_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- URL-safe slug: lowercase letters, numbers, hyphens. 3-30 chars.
  slug text NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'),
  -- Public display name (can differ from OAuth provider name)
  display_name text NOT NULL
    CHECK (char_length(display_name) BETWEEN 1 AND 50),
  -- Short author biography
  bio text DEFAULT ''
    CHECK (char_length(bio) <= 500),
  -- Avatar URL (optional — falls back to OAuth avatar)
  avatar_url text DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Fast lookup by slug (the public URL path)
CREATE INDEX idx_user_profiles_slug ON public.user_profiles (slug);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (they're public pages)
CREATE POLICY "Anyone can read profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own profile
CREATE POLICY "Users can create own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
