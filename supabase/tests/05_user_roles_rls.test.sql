-- pgTAP adversarial RLS tests: user_roles table
--
-- Tests every RLS policy on public.user_roles with ALLOW and DENY cases.
-- user_roles only has a SELECT policy — users can check their own roles.
-- There are NO insert/update/delete policies, meaning only the service
-- role (server-side) can manage role assignments.
--
-- Policies under test:
--   1. "Users can read own roles" (authenticated, own user_id)
--
-- Implicit denials (no policy exists):
--   - No INSERT policy → authenticated users cannot self-assign roles
--   - No UPDATE policy → users cannot escalate privileges
--   - No DELETE policy → users cannot remove moderation from themselves/others
--
-- Roles tested: anon, authenticated (own roles), authenticated (other user's roles)

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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'regular@test.com', '{}'::jsonb, 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'moderator@test.com', '{}'::jsonb, 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin@test.com', '{}'::jsonb, 'authenticated', 'authenticated');

-- User B is a moderator, User C is an admin
INSERT INTO public.user_roles (user_id, role) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'moderator'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin');


-- ══════════════════════════════════════
-- SELECT TESTS
-- ══════════════════════════════════════

-- ── ALLOW: Moderator can see their own role ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM public.user_roles WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')::integer,
  1,
  'ALLOW: Moderator can read their own role'
);

SELECT is(
  (SELECT role FROM public.user_roles WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'moderator',
  'ALLOW: Moderator sees correct role value'
);

-- ── ALLOW: Admin can see their own role ──

SELECT set_auth_user('cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT is(
  (SELECT role FROM public.user_roles WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'admin',
  'ALLOW: Admin can read their own role'
);

-- ── DENY: Regular user sees no roles (they have none) ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM public.user_roles)::integer,
  0,
  'DENY: Regular user sees zero roles in full table scan (has no roles, cannot see others)'
);

-- ── DENY: Moderator cannot see admin's role ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM public.user_roles WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc')::integer,
  0,
  'DENY: Moderator CANNOT read admin role (cross-user role enumeration blocked)'
);

-- Full table scan only returns own roles
SELECT is(
  (SELECT count(*) FROM public.user_roles)::integer,
  1,
  'DENY: Moderator full table scan returns only their own 1 role'
);

-- ── DENY: Anon cannot see any roles ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM public.user_roles)::integer,
  0,
  'DENY: Anon CANNOT read any user roles'
);


-- ══════════════════════════════════════
-- INSERT TESTS (no policy exists — all should fail)
-- ══════════════════════════════════════

-- ── DENY: Regular user cannot self-assign moderator role ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT throws_ok(
  $$INSERT INTO public.user_roles (user_id, role)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'moderator')$$,
  NULL,
  NULL,
  'DENY: Regular user CANNOT self-assign moderator role (privilege escalation blocked)'
);

SELECT throws_ok(
  $$INSERT INTO public.user_roles (user_id, role)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin')$$,
  NULL,
  NULL,
  'DENY: Regular user CANNOT self-assign admin role (privilege escalation blocked)'
);

-- ── DENY: Moderator cannot assign roles to others ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT throws_ok(
  $$INSERT INTO public.user_roles (user_id, role)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'moderator')$$,
  NULL,
  NULL,
  'DENY: Moderator CANNOT assign roles to other users'
);

-- ── DENY: Anon cannot insert roles ──

SELECT set_anon();

SELECT throws_ok(
  $$INSERT INTO public.user_roles (user_id, role)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin')$$,
  NULL,
  NULL,
  'DENY: Anon CANNOT insert user roles (unauthenticated write blocked)'
);


-- ══════════════════════════════════════
-- UPDATE TESTS (no policy exists — all should fail)
-- ══════════════════════════════════════

-- ── DENY: Moderator cannot escalate to admin ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.user_roles SET role = 'admin'
    WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Moderator CANNOT escalate own role to admin (zero rows affected)'
);

-- ── DENY: Regular user cannot update any roles ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.user_roles SET role = 'admin'
    WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Regular user CANNOT update moderator role to admin'
);


-- ══════════════════════════════════════
-- DELETE TESTS (no policy exists — all should fail)
-- ══════════════════════════════════════

-- ── DENY: Moderator cannot delete their own role ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.user_roles WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Moderator CANNOT delete their own role'
);

-- ── DENY: Regular user cannot delete moderator role ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.user_roles WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Regular user CANNOT delete moderator role'
);

-- ── DENY: Anon cannot delete any roles ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.user_roles WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Anon CANNOT delete any user roles'
);


-- ══════════════════════════════════════
-- DONE
-- ══════════════════════════════════════

SELECT * FROM finish();
ROLLBACK;
