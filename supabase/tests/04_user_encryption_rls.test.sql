-- pgTAP adversarial RLS tests: user_encryption table
--
-- Tests every RLS policy on public.user_encryption with ALLOW and DENY cases.
-- This table stores per-user encryption metadata (PBKDF2 salt, iteration count,
-- recovery code hash, verification blob). It is STRICTLY private — no user
-- should ever see another user's encryption state.
--
-- Policies under test:
--   1. "Users can read own encryption"
--   2. "Users can insert own encryption"
--   3. "Users can update own encryption"
--   4. "Users can delete own encryption"
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

-- User A encryption state (realistic fake data)
INSERT INTO public.user_encryption (
  id, user_id, key_salt, iterations, recovery_code_hash,
  recovery_wrapped_key, recovery_key_salt,
  verification_ciphertext, verification_iv
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'dGVzdF9zYWx0X2Zvcl91c2VyX2E=',       -- base64 salt
  600000,
  'abc123def456hash',                       -- SHA-256 of recovery code
  'wrapped_key_ciphertext_user_a',          -- AES-wrapped key
  'cmVjb3Zlcnlfc2FsdF91c2VyX2E=',         -- recovery salt
  'verification_ciphertext_user_a',         -- verification blob
  'dmVyaWZfaXZfdXNlcl9h'                   -- verification IV
);

-- User B encryption state
INSERT INTO public.user_encryption (
  id, user_id, key_salt, iterations, recovery_code_hash,
  recovery_wrapped_key, recovery_key_salt,
  verification_ciphertext, verification_iv
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'dGVzdF9zYWx0X2Zvcl91c2VyX2I=',
  600000,
  'xyz789ghi012hash',
  'wrapped_key_ciphertext_user_b',
  'cmVjb3Zlcnlfc2FsdF91c2VyX2I=',
  'verification_ciphertext_user_b',
  'dmVyaWZfaXZfdXNlcl9i'
);


-- ══════════════════════════════════════
-- SELECT TESTS
-- ══════════════════════════════════════

-- ── ALLOW: User A can read own encryption state ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM public.user_encryption WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::integer,
  1,
  'ALLOW: User A can read their own encryption state'
);

SELECT is(
  (SELECT iterations FROM public.user_encryption WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  600000,
  'ALLOW: User A sees correct iteration count in their encryption state'
);

-- ── DENY: User A CANNOT read User B's encryption state ──
-- This is CRITICAL — encryption metadata leaking across users would
-- compromise the entire encryption model.

SELECT is(
  (SELECT count(*) FROM public.user_encryption WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')::integer,
  0,
  'DENY: User A CANNOT read User B encryption state (CRITICAL: key metadata isolation)'
);

-- Full table scan should only return own row
SELECT is(
  (SELECT count(*) FROM public.user_encryption)::integer,
  1,
  'DENY: User A full table scan returns only their own encryption row'
);

-- ── DENY: Anon cannot read any encryption state ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM public.user_encryption)::integer,
  0,
  'DENY: Anon CANNOT read any encryption state'
);


-- ══════════════════════════════════════
-- INSERT TESTS
-- ══════════════════════════════════════

-- ── ALLOW: User can insert their own encryption state ──

SELECT clear_auth();
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'user_d@test.com', '{}'::jsonb, 'authenticated', 'authenticated');

SELECT set_auth_user('dddddddd-dddd-dddd-dddd-dddddddddddd');

SELECT lives_ok(
  $$INSERT INTO public.user_encryption (
      user_id, key_salt, iterations, recovery_code_hash,
      recovery_wrapped_key, recovery_key_salt,
      verification_ciphertext, verification_iv
    ) VALUES (
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'bmV3X3NhbHQ=', 600000, 'new_recovery_hash',
      'new_wrapped_key', 'bmV3X3JlY19zYWx0',
      'new_verification', 'bmV3X2l2'
    )$$,
  'ALLOW: User D can insert their own encryption state'
);

-- ── DENY: User cannot insert encryption state for another user ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT throws_ok(
  $$INSERT INTO public.user_encryption (
      user_id, key_salt, iterations, recovery_code_hash,
      recovery_wrapped_key, recovery_key_salt,
      verification_ciphertext, verification_iv
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'aGFja19zYWx0', 600000, 'fake_hash',
      'fake_wrapped_key', 'ZmFrZV9yZWNfc2FsdA==',
      'fake_verification', 'ZmFrZV9pdg=='
    )$$,
  NULL,
  NULL,
  'DENY: User A CANNOT insert encryption state with User B user_id'
);

-- ── DENY: Anon cannot insert encryption state ──

SELECT set_anon();

SELECT throws_ok(
  $$INSERT INTO public.user_encryption (
      user_id, key_salt, iterations, recovery_code_hash,
      recovery_wrapped_key, recovery_key_salt,
      verification_ciphertext, verification_iv
    ) VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'YW5vbl9zYWx0', 600000, 'anon_hash',
      'anon_wrapped_key', 'YW5vbl9yZWNfc2FsdA==',
      'anon_verification', 'YW5vbl9pdg=='
    )$$,
  NULL,
  NULL,
  'DENY: Anon CANNOT insert encryption state (unauthenticated write blocked)'
);


-- ══════════════════════════════════════
-- UPDATE TESTS
-- ══════════════════════════════════════

-- ── ALLOW: User A can update their own encryption state ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$UPDATE public.user_encryption SET iterations = 700000
    WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'ALLOW: User A can update their own encryption state (iterations upgrade)'
);

SELECT is(
  (SELECT iterations FROM public.user_encryption WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  700000,
  'ALLOW: User A update persisted (iterations = 700000)'
);

-- ── DENY: User A cannot update User B's encryption state ──

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.user_encryption SET iterations = 1
    WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: User A CANNOT update User B encryption state (zero rows affected)'
);

-- Verify User B's state is untouched
SELECT clear_auth();
SELECT is(
  (SELECT iterations FROM public.user_encryption WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  600000,
  'VERIFY: User B encryption iterations unchanged after User A tampering attempt'
);

-- ── DENY: Anon cannot update encryption state ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.user_encryption SET iterations = 1
    WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Anon CANNOT update encryption state (zero rows affected)'
);


-- ══════════════════════════════════════
-- DELETE TESTS
-- ══════════════════════════════════════

-- ── DENY: User A cannot delete User B's encryption state ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.user_encryption WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: User A CANNOT delete User B encryption state'
);

-- ── DENY: Anon cannot delete encryption state ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.user_encryption WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Anon CANNOT delete encryption state'
);

-- ── ALLOW: User A can delete their own encryption state (disable encryption) ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.user_encryption WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING 1
  ) AS deleted)::integer,
  1,
  'ALLOW: User A can delete their own encryption state (disable encryption)'
);


-- ══════════════════════════════════════
-- DONE
-- ══════════════════════════════════════

SELECT * FROM finish();
ROLLBACK;
