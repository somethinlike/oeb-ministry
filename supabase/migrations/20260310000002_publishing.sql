-- Migration: Publishing Pipeline
--
-- Adds the moderation workflow for CC0 publishing:
-- 1. publish_status column on annotations (pending → approved/rejected)
-- 2. user_roles table (moderator/admin designation)
-- 3. moderation_log table (accountability trail)
-- 4. RLS policies for moderators to review and approve/reject
--
-- Relationship between is_public and publish_status:
-- - is_public remains the "visible to others" flag (existing RLS policy uses it)
-- - publish_status tracks the moderation workflow
-- - When a moderator approves: is_public = true, publish_status = 'approved'
-- - When a user retracts: is_public = false, publish_status = null
-- - Both are set atomically in the service layer

-- ╔══════════════════════════════════════╗
-- ║  ANNOTATIONS — PUBLISHING COLUMNS   ║
-- ╚══════════════════════════════════════╝

ALTER TABLE public.annotations
  ADD COLUMN publish_status text DEFAULT NULL
    CHECK (publish_status IS NULL OR publish_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN published_at timestamptz DEFAULT NULL,
  ADD COLUMN rejection_reason text DEFAULT NULL,
  ADD COLUMN author_display_name text DEFAULT NULL;

-- Fast lookup for moderation queue (pending) and public feed (approved)
CREATE INDEX idx_annotations_publish_status
  ON public.annotations (publish_status)
  WHERE publish_status IS NOT NULL;

-- Migrate any existing is_public annotations to approved status
UPDATE public.annotations
SET publish_status = 'approved', published_at = updated_at
WHERE is_public = true;

-- ╔══════════════════════════════════════╗
-- ║  USER_ROLES TABLE                   ║
-- ╚══════════════════════════════════════╝

CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('moderator', 'admin')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can check their own roles (needed for UI to show moderator features)
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ╔══════════════════════════════════════╗
-- ║  MODERATION_LOG TABLE               ║
-- ╚══════════════════════════════════════╝

CREATE TABLE public.moderation_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  annotation_id uuid REFERENCES public.annotations(id) ON DELETE CASCADE NOT NULL,
  moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'flagged', 'removed')),
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

-- Moderators can read all moderation logs
CREATE POLICY "Moderators can read moderation logs"
  ON public.moderation_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  );

-- Moderators can create log entries
CREATE POLICY "Moderators can insert moderation logs"
  ON public.moderation_log FOR INSERT
  TO authenticated
  WITH CHECK (
    moderator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  );

-- Annotation owners can read moderation actions on their own notes
-- (so they can see "rejected" with a reason and revise)
CREATE POLICY "Users can read moderation logs for own annotations"
  ON public.moderation_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.annotations
      WHERE annotations.id = moderation_log.annotation_id
        AND annotations.user_id = auth.uid()
    )
  );

-- ╔══════════════════════════════════════╗
-- ║  ANNOTATION RLS — MODERATOR ACCESS  ║
-- ╚══════════════════════════════════════╝

-- Moderators can read pending annotations (for the review queue)
CREATE POLICY "Moderators can read pending annotations"
  ON public.annotations FOR SELECT
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

-- Moderators can update publish_status on pending annotations
-- (approve or reject — the service layer sets is_public accordingly)
CREATE POLICY "Moderators can update annotation publish status"
  ON public.annotations FOR UPDATE
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
