-- pgTAP adversarial RLS tests: user_preferences table
--
-- Tests every RLS policy on public.user_preferences with ALLOW and DENY cases.
-- user_preferences is strictly private — no public access, no cross-user access.
--
-- Policies under test:
--   1. "Users can read own preferences"
--   2. "Users can insert own preferences"
--   3. "Users can update own preferences"
--   4. "Users can delete own preferences"
--
-- NOTE: These policies use bare USING (auth.uid() = user_id) without
-- a TO role qualifier, which means they implicitly apply to all roles.
-- However, anon will never match auth.uid() = user_id, so the effect
-- is the same: anon is blocked on all operations.
--
-- Roles tested: anon, authenticated (owner), authenticated (non-owner)

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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_a@test.com', '{}'::jsonb, 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_b@test.com', '{}'::jsonb, 'authenticated', 'authenticated');

-- User A preferences
INSERT INTO public.user_preferences (id, user_id, preferences)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '{"readerFont": "serif", "defaultTranslation": "oeb"}'::jsonb
);

-- User B preferences
INSERT INTO public.user_preferences (id, user_id, preferences)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '{"readerFont": "sans-serif", "defaultTranslation": "kjv"}'::jsonb
);


-- ══════════════════════════════════════
-- SELECT TESTS
-- ══════════════════════════════════════

-- ── ALLOW: User A can read own preferences ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM public.user_preferences WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::integer,
  1,
  'ALLOW: User A can read their own preferences'
);

SELECT is(
  (SELECT preferences->>'readerFont' FROM public.user_preferences WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'serif',
  'ALLOW: User A sees correct preference values'
);

-- ── DENY: User A cannot read User B's preferences ──

SELECT is(
  (SELECT count(*) FROM public.user_preferences WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')::integer,
  0,
  'DENY: User A CANNOT read User B preferences (cross-user privacy violation)'
);

-- ── DENY: User A full table scan only shows their own row ──

SELECT is(
  (SELECT count(*) FROM public.user_preferences)::integer,
  1,
  'DENY: User A full table scan returns only their own row (not both users)'
);

-- ── DENY: Anon cannot read any preferences ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM public.user_preferences)::integer,
  0,
  'DENY: Anon CANNOT read any user preferences'
);


-- ══════════════════════════════════════
-- INSERT TESTS
-- ══════════════════════════════════════

-- ── ALLOW: User can insert their own preferences ──
-- (Need a new user since A and B already have rows due to UNIQUE constraint)

SELECT clear_auth();
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'user_d@test.com', '{}'::jsonb, 'authenticated', 'authenticated');

SELECT set_auth_user('dddddddd-dddd-dddd-dddd-dddddddddddd');

SELECT lives_ok(
  $$INSERT INTO public.user_preferences (user_id, preferences)
    VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '{"readerFont": "monospace"}'::jsonb)$$,
  'ALLOW: User D can insert their own preferences'
);

-- ── DENY: User cannot insert preferences with another user's ID ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT throws_ok(
  $$INSERT INTO public.user_preferences (user_id, preferences)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{"readerFont": "cursive"}'::jsonb)$$,
  NULL,
  NULL,
  'DENY: User A CANNOT insert preferences with User B user_id'
);

-- ── DENY: Anon cannot insert preferences ──

SELECT set_anon();

SELECT throws_ok(
  $$INSERT INTO public.user_preferences (user_id, preferences)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"readerFont": "cursive"}'::jsonb)$$,
  NULL,
  NULL,
  'DENY: Anon CANNOT insert any preferences (unauthenticated write blocked)'
);


-- ══════════════════════════════════════
-- UPDATE TESTS
-- ══════════════════════════════════════

-- ── ALLOW: User A can update their own preferences ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$UPDATE public.user_preferences
    SET preferences = '{"readerFont": "monospace", "defaultTranslation": "oeb"}'::jsonb
    WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'ALLOW: User A can update their own preferences'
);

-- ── DENY: User A cannot update User B's preferences ──

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.user_preferences
    SET preferences = '{"hacked": true}'::jsonb
    WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: User A CANNOT update User B preferences (zero rows affected)'
);

-- Verify User B's preferences are untouched
SELECT clear_auth();
SELECT is(
  (SELECT preferences->>'readerFont' FROM public.user_preferences WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'sans-serif',
  'VERIFY: User B preferences unchanged after User A update attempt'
);

-- ── DENY: Anon cannot update any preferences ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.user_preferences
    SET preferences = '{"hacked": true}'::jsonb
    WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Anon CANNOT update any preferences (zero rows affected)'
);


-- ══════════════════════════════════════
-- DELETE TESTS
-- ══════════════════════════════════════

-- ── DENY: User A cannot delete User B's preferences ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.user_preferences WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: User A CANNOT delete User B preferences'
);

-- ── DENY: Anon cannot delete any preferences ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.user_preferences WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Anon CANNOT delete any preferences'
);

-- ── ALLOW: User A can delete their own preferences ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.user_preferences WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING 1
  ) AS deleted)::integer,
  1,
  'ALLOW: User A can delete their own preferences'
);


-- ══════════════════════════════════════
-- DONE
-- ══════════════════════════════════════

SELECT * FROM finish();
ROLLBACK;
