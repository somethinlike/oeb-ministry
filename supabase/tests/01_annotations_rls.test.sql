-- pgTAP adversarial RLS tests: annotations table
--
-- Tests every RLS policy on public.annotations with ALLOW and DENY cases.
-- Policies under test:
--   1. "Users can read own annotations" (authenticated, own data)
--   2. "Anyone can read public annotations" (authenticated + anon)
--   3. "Users can create own annotations" (authenticated, own user_id)
--   4. "Users can update own annotations" (authenticated, own data)
--   5. "Users can delete own annotations" (authenticated, own data)
--   6. "Moderators can read pending annotations" (moderator role)
--   7. "Moderators can update annotation publish status" (moderator role)
--
-- Roles tested: anon, authenticated (owner), authenticated (non-owner), moderator

BEGIN;

-- Load pgTAP
SELECT * FROM no_plan();

-- ══════════════════════════════════════
-- SETUP: Create test fixtures
-- ══════════════════════════════════════

-- Create helper functions (inline, since we can't \i in pgTAP)
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

-- Create two test users in auth.users
-- User A: the annotation owner
-- User B: another authenticated user (adversary for cross-user tests)
-- User C: a moderator
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_a@test.com', '{}'::jsonb, 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_b@test.com', '{}'::jsonb, 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'moderator@test.com', '{}'::jsonb, 'authenticated', 'authenticated');

-- Give User C the moderator role
INSERT INTO public.user_roles (user_id, role)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'moderator');

-- Create test annotations as service role (bypasses RLS)
-- User A's private annotation
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md, is_public)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'oeb', 'john', 3, 16, 16,
  'This is User A private note on John 3:16',
  false
);

-- User A's public annotation
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md, is_public, publish_status, published_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'oeb', 'romans', 5, 8, 8,
  'This is User A public note on Romans 5:8',
  true, 'approved', now()
);

-- User B's private annotation
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md, is_public)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'oeb', 'genesis', 1, 1, 1,
  'This is User B private note on Genesis 1:1',
  false
);

-- User A's pending annotation (awaiting moderator review)
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md, is_public, publish_status)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'oeb', 'psalms', 23, 1, 1,
  'The Lord is my shepherd — pending review',
  false, 'pending'
);


-- ══════════════════════════════════════
-- SELECT TESTS
-- ══════════════════════════════════════

-- ── Policy: "Users can read own annotations" ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '11111111-1111-1111-1111-111111111111')::integer,
  1,
  'ALLOW: User A can read their own private annotation'
);

SELECT is(
  (SELECT content_md FROM public.annotations WHERE id = '11111111-1111-1111-1111-111111111111'),
  'This is User A private note on John 3:16',
  'ALLOW: User A sees correct content of their own private annotation'
);

SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '22222222-2222-2222-2222-222222222222')::integer,
  1,
  'ALLOW: User A can read their own public annotation'
);

-- ── DENY: User B cannot read User A's private annotation ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '11111111-1111-1111-1111-111111111111')::integer,
  0,
  'DENY: User B CANNOT read User A private annotation (cross-user privacy violation)'
);

-- User B can still read User A's PUBLIC annotation
SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '22222222-2222-2222-2222-222222222222')::integer,
  1,
  'ALLOW: User B can read User A public annotation'
);

-- User B can read their own private annotation
SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '33333333-3333-3333-3333-333333333333')::integer,
  1,
  'ALLOW: User B can read their own private annotation'
);

-- ── DENY: Anonymous user cannot read private annotations ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '11111111-1111-1111-1111-111111111111')::integer,
  0,
  'DENY: Anon CANNOT read User A private annotation'
);

SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '33333333-3333-3333-3333-333333333333')::integer,
  0,
  'DENY: Anon CANNOT read User B private annotation'
);

-- ── Policy: "Anyone can read public annotations" ──

SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '22222222-2222-2222-2222-222222222222')::integer,
  1,
  'ALLOW: Anon CAN read public annotation'
);

SELECT is(
  (SELECT content_md FROM public.annotations WHERE id = '22222222-2222-2222-2222-222222222222'),
  'This is User A public note on Romans 5:8',
  'ALLOW: Anon sees correct content of public annotation'
);

-- Anon only sees public annotations, not private ones
SELECT is(
  (SELECT count(*) FROM public.annotations WHERE is_public = false)::integer,
  0,
  'DENY: Anon sees zero private annotations in full table scan'
);


-- ══════════════════════════════════════
-- INSERT TESTS
-- ══════════════════════════════════════

-- ── Policy: "Users can create own annotations" ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$INSERT INTO public.annotations (user_id, translation, book, chapter, verse_start, verse_end, content_md)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'oeb', 'matthew', 5, 3, 3, 'Blessed are the poor in spirit')$$,
  'ALLOW: User A can insert annotation with their own user_id'
);

-- ── DENY: User A cannot insert annotation with User B's user_id ──

SELECT throws_ok(
  $$INSERT INTO public.annotations (user_id, translation, book, chapter, verse_start, verse_end, content_md)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'oeb', 'matthew', 5, 4, 4, 'Impersonation attempt')$$,
  NULL,
  NULL,
  'DENY: User A CANNOT insert annotation with User B user_id (impersonation blocked)'
);

-- ── DENY: Anonymous user cannot insert anything ──

SELECT set_anon();

SELECT throws_ok(
  $$INSERT INTO public.annotations (user_id, translation, book, chapter, verse_start, verse_end, content_md)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'oeb', 'matthew', 5, 5, 5, 'Anon write attempt')$$,
  NULL,
  NULL,
  'DENY: Anon CANNOT insert any annotation (unauthenticated write blocked)'
);


-- ══════════════════════════════════════
-- UPDATE TESTS
-- ══════════════════════════════════════

-- ── Policy: "Users can update own annotations" ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$UPDATE public.annotations SET content_md = 'Updated by owner' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'ALLOW: User A can update their own annotation'
);

SELECT is(
  (SELECT content_md FROM public.annotations WHERE id = '11111111-1111-1111-1111-111111111111'),
  'Updated by owner',
  'ALLOW: User A update actually persisted'
);

-- ── DENY: User A cannot update User B's annotation ──

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.annotations SET content_md = 'Tampered by A' WHERE id = '33333333-3333-3333-3333-333333333333' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: User A CANNOT update User B annotation (zero rows affected)'
);

-- Verify User B's annotation was not tampered with
SELECT clear_auth();
SELECT is(
  (SELECT content_md FROM public.annotations WHERE id = '33333333-3333-3333-3333-333333333333'),
  'This is User B private note on Genesis 1:1',
  'VERIFY: User B annotation content unchanged after User A update attempt'
);

-- ── DENY: User A cannot change user_id on their own annotation (ownership hijack) ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT throws_ok(
  $$UPDATE public.annotations SET user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  NULL,
  NULL,
  'DENY: User A CANNOT change user_id on own annotation (ownership hijack blocked)'
);

-- ── DENY: Anonymous user cannot update anything ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.annotations SET content_md = 'Anon tamper' WHERE id = '22222222-2222-2222-2222-222222222222' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Anon CANNOT update public annotation (zero rows affected)'
);


-- ══════════════════════════════════════
-- DELETE TESTS
-- ══════════════════════════════════════

-- ── DENY: User B cannot delete User A's annotation ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.annotations WHERE id = '22222222-2222-2222-2222-222222222222' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: User B CANNOT delete User A annotation (zero rows deleted)'
);

-- ── DENY: Anonymous user cannot delete anything ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.annotations WHERE id = '22222222-2222-2222-2222-222222222222' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Anon CANNOT delete any annotation (zero rows deleted)'
);

-- ── ALLOW: User A can delete their own annotation ──
-- (Use a separate annotation to avoid breaking other tests)

SELECT clear_auth();
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'oeb', 'revelation', 1, 1, 1,
  'Expendable annotation for delete test'
);

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.annotations WHERE id = '55555555-5555-5555-5555-555555555555' RETURNING 1
  ) AS deleted)::integer,
  1,
  'ALLOW: User A can delete their own annotation'
);


-- ══════════════════════════════════════
-- MODERATOR TESTS
-- ══════════════════════════════════════

-- ── Policy: "Moderators can read pending annotations" ──

SELECT set_auth_user('cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '44444444-4444-4444-4444-444444444444')::integer,
  1,
  'ALLOW: Moderator can read pending annotation'
);

-- ── DENY: Non-moderator (User B) cannot read pending annotations they do not own ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM public.annotations WHERE id = '44444444-4444-4444-4444-444444444444')::integer,
  0,
  'DENY: Non-moderator User B CANNOT read pending annotation by User A'
);

-- ── Policy: "Moderators can update annotation publish status" ──

SELECT set_auth_user('cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT lives_ok(
  $$UPDATE public.annotations SET publish_status = 'approved', is_public = true, published_at = now()
    WHERE id = '44444444-4444-4444-4444-444444444444'$$,
  'ALLOW: Moderator can approve pending annotation (update publish_status)'
);

-- ── DENY: Non-moderator cannot update publish_status on someone else's annotation ──

-- First, reset the annotation to pending for the next test
SELECT clear_auth();
UPDATE public.annotations SET publish_status = 'pending', is_public = false, published_at = NULL
WHERE id = '44444444-4444-4444-4444-444444444444';

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.annotations SET publish_status = 'approved', is_public = true
    WHERE id = '44444444-4444-4444-4444-444444444444' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Non-moderator CANNOT update publish_status on another user annotation'
);


-- ══════════════════════════════════════
-- DONE
-- ══════════════════════════════════════

SELECT * FROM finish();
ROLLBACK;
