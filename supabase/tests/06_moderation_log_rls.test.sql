-- pgTAP adversarial RLS tests: moderation_log table
--
-- Tests every RLS policy on public.moderation_log with ALLOW and DENY cases.
-- The moderation_log provides an accountability trail for publishing decisions.
-- Access is restricted to moderators/admins AND annotation owners (for their own annotations).
--
-- Policies under test:
--   1. "Moderators can read moderation logs" (moderator/admin role)
--   2. "Moderators can insert moderation logs" (moderator/admin, own moderator_id)
--   3. "Users can read moderation logs for own annotations" (annotation owner)
--
-- Implicit denials (no policy exists):
--   - No UPDATE policy → logs are immutable (append-only accountability trail)
--   - No DELETE policy → logs cannot be destroyed
--   - No INSERT for regular users → only moderators can log actions
--
-- Roles tested: anon, authenticated (regular user), authenticated (annotation owner),
--               moderator, admin

BEGIN;

SELECT * FROM no_plan();

-- ══════════════════════════════════════
-- SETUP
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION set_auth_user(uid uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text,
    true
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_anon()
RETURNS void AS $$
BEGIN
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clear_auth()
RETURNS void AS $$
BEGIN
  RESET role;
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$ LANGUAGE plpgsql;

-- Test users
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'author@test.com', '{}'::jsonb, 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bystander@test.com', '{}'::jsonb, 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'moderator@test.com', '{}'::jsonb, 'authenticated', 'authenticated'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'admin@test.com', '{}'::jsonb, 'authenticated', 'authenticated');

-- Role assignments
INSERT INTO public.user_roles (user_id, role) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'moderator'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'admin');

-- User A's annotation (the one being moderated)
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md, is_public, publish_status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'oeb', 'john', 3, 16, 16,
  'Submitted for review',
  false, 'pending'
);

-- User B's annotation (for testing cross-user log access)
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md, is_public, publish_status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'oeb', 'romans', 8, 28, 28,
  'Another pending annotation',
  false, 'pending'
);

-- Moderation log entries (created by service role for test setup)
INSERT INTO public.moderation_log (id, annotation_id, moderator_id, action, reason)
VALUES
  -- Log entry for User A's annotation
  ('aaaa1111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'approved', 'Theologically sound'),
  -- Log entry for User B's annotation
  ('bbbb2222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'rejected', 'Contains unsupported theological claims');


-- ══════════════════════════════════════
-- SELECT TESTS
-- ══════════════════════════════════════

-- ── Policy: "Moderators can read moderation logs" ──

SELECT set_auth_user('cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT is(
  (SELECT count(*) FROM public.moderation_log)::integer,
  2,
  'ALLOW: Moderator can read ALL moderation log entries'
);

SELECT is(
  (SELECT action FROM public.moderation_log WHERE id = 'aaaa1111-1111-1111-1111-111111111111'),
  'approved',
  'ALLOW: Moderator sees correct action in log entry'
);

-- ── ALLOW: Admin can also read all moderation logs ──

SELECT set_auth_user('dddddddd-dddd-dddd-dddd-dddddddddddd');

SELECT is(
  (SELECT count(*) FROM public.moderation_log)::integer,
  2,
  'ALLOW: Admin can read ALL moderation log entries'
);

-- ── Policy: "Users can read moderation logs for own annotations" ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM public.moderation_log WHERE annotation_id = '11111111-1111-1111-1111-111111111111')::integer,
  1,
  'ALLOW: Annotation author (User A) can read moderation log for their own annotation'
);

SELECT is(
  (SELECT reason FROM public.moderation_log WHERE annotation_id = '11111111-1111-1111-1111-111111111111'),
  'Theologically sound',
  'ALLOW: Annotation author sees rejection/approval reason'
);

-- ── DENY: Author cannot see moderation logs for OTHER users' annotations ──

SELECT is(
  (SELECT count(*) FROM public.moderation_log WHERE annotation_id = '22222222-2222-2222-2222-222222222222')::integer,
  0,
  'DENY: User A CANNOT read moderation log for User B annotation'
);

-- User A only sees logs for their own annotations
SELECT is(
  (SELECT count(*) FROM public.moderation_log)::integer,
  1,
  'DENY: User A full table scan returns only log entries for their own annotations'
);

-- ── DENY: User B can see their own logs but not User A's ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM public.moderation_log WHERE annotation_id = '22222222-2222-2222-2222-222222222222')::integer,
  1,
  'ALLOW: User B can read moderation log for their own annotation'
);

SELECT is(
  (SELECT count(*) FROM public.moderation_log WHERE annotation_id = '11111111-1111-1111-1111-111111111111')::integer,
  0,
  'DENY: User B CANNOT read moderation log for User A annotation'
);

-- ── DENY: Anon cannot read any moderation logs ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM public.moderation_log)::integer,
  0,
  'DENY: Anon CANNOT read any moderation logs'
);


-- ══════════════════════════════════════
-- INSERT TESTS
-- ══════════════════════════════════════

-- ── Policy: "Moderators can insert moderation logs" ──

SELECT set_auth_user('cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT lives_ok(
  $$INSERT INTO public.moderation_log (annotation_id, moderator_id, action, reason)
    VALUES (
      '22222222-2222-2222-2222-222222222222',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'flagged', 'Needs further review'
    )$$,
  'ALLOW: Moderator can insert a moderation log entry (own moderator_id)'
);

-- ── ALLOW: Admin can also insert moderation logs ──

SELECT set_auth_user('dddddddd-dddd-dddd-dddd-dddddddddddd');

SELECT lives_ok(
  $$INSERT INTO public.moderation_log (annotation_id, moderator_id, action, reason)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'removed', 'Escalated review — removed pending admin decision'
    )$$,
  'ALLOW: Admin can insert a moderation log entry'
);

-- ── DENY: Moderator cannot insert log with another moderator's ID (impersonation) ──

SELECT set_auth_user('cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT throws_ok(
  $$INSERT INTO public.moderation_log (annotation_id, moderator_id, action, reason)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'approved', 'Impersonating the admin'
    )$$,
  NULL,
  NULL,
  'DENY: Moderator CANNOT insert log with another moderator ID (impersonation blocked)'
);

-- ── DENY: Regular user cannot insert moderation logs ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT throws_ok(
  $$INSERT INTO public.moderation_log (annotation_id, moderator_id, action, reason)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'approved', 'Self-approving my own content'
    )$$,
  NULL,
  NULL,
  'DENY: Regular user CANNOT insert moderation log (not a moderator)'
);

-- ── DENY: Anon cannot insert moderation logs ──

SELECT set_anon();

SELECT throws_ok(
  $$INSERT INTO public.moderation_log (annotation_id, moderator_id, action, reason)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'approved', 'Anon impersonating moderator'
    )$$,
  NULL,
  NULL,
  'DENY: Anon CANNOT insert moderation log (unauthenticated write blocked)'
);


-- ══════════════════════════════════════
-- UPDATE TESTS (no policy exists — logs are immutable)
-- ══════════════════════════════════════

-- ── DENY: Moderator cannot update existing log entries (immutability) ──

SELECT set_auth_user('cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.moderation_log SET reason = 'Tampered reason'
    WHERE id = 'aaaa1111-1111-1111-1111-111111111111' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Moderator CANNOT update moderation log entries (logs are immutable)'
);

-- ── DENY: Admin cannot update log entries either ──

SELECT set_auth_user('dddddddd-dddd-dddd-dddd-dddddddddddd');

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.moderation_log SET action = 'rejected'
    WHERE id = 'aaaa1111-1111-1111-1111-111111111111' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Admin CANNOT update moderation log entries (logs are immutable)'
);

-- ── DENY: Regular user cannot update log entries ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.moderation_log SET reason = 'Changed the reason'
    WHERE annotation_id = '11111111-1111-1111-1111-111111111111' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Regular user CANNOT update moderation log entries'
);


-- ══════════════════════════════════════
-- DELETE TESTS (no policy exists — logs cannot be destroyed)
-- ══════════════════════════════════════

-- ── DENY: Moderator cannot delete log entries ──

SELECT set_auth_user('cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.moderation_log WHERE id = 'aaaa1111-1111-1111-1111-111111111111' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Moderator CANNOT delete moderation log entries (accountability preserved)'
);

-- ── DENY: Admin cannot delete log entries ──

SELECT set_auth_user('dddddddd-dddd-dddd-dddd-dddddddddddd');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.moderation_log WHERE id = 'aaaa1111-1111-1111-1111-111111111111' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Admin CANNOT delete moderation log entries (accountability preserved)'
);

-- ── DENY: Annotation author cannot delete log entries for their annotation ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.moderation_log WHERE annotation_id = '11111111-1111-1111-1111-111111111111' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Annotation author CANNOT delete moderation logs for their own annotation'
);

-- ── DENY: Anon cannot delete any log entries ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.moderation_log WHERE id = 'aaaa1111-1111-1111-1111-111111111111' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Anon CANNOT delete any moderation log entries'
);


-- ══════════════════════════════════════
-- DONE
-- ══════════════════════════════════════

SELECT * FROM finish();
ROLLBACK;
