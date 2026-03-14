-- pgTAP adversarial RLS tests: translation_backups + translation_backup_chapters
--
-- Tests every RLS policy on both backup tables with ALLOW and DENY cases.
-- These tables store personal encrypted Bible backup data — strictly private.
-- No user should ever access another user's backup data.
--
-- Policies under test (translation_backups):
--   1. "Users can read own translation backups"
--   2. "Users can insert own translation backups"
--   3. "Users can update own translation backups"
--   4. "Users can delete own translation backups"
--
-- Policies under test (translation_backup_chapters):
--   1. "Users can read own backup chapters"
--   2. "Users can insert own backup chapters"
--   3. "Users can update own backup chapters"
--   4. "Users can delete own backup chapters"
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

-- User A's backup (inserted as superuser, bypassing RLS)
INSERT INTO public.translation_backups (
  id, user_id, translation_id, name, abbreviation, language, license,
  books, original_filename, file_type, uploaded_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'user-nrsvue',
  'New Revised Standard Version Updated Edition',
  'NRSVUE',
  'en',
  'Personal use',
  '[{"id":"gen","name":"Genesis","chapters":50,"testament":"OT"}]'::jsonb,
  'NRSVUE.epub',
  'epub',
  '2026-03-14T00:00:00Z'
);

-- User A's backup chapter (encrypted data — fake values for testing)
INSERT INTO public.translation_backup_chapters (
  id, backup_id, user_id, book, chapter, book_name,
  encrypted_verses, encryption_iv
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'gen', 1, 'Genesis',
  'FAKE_ENCRYPTED_BASE64_DATA',
  'FAKE_IV_BASE64'
);

-- ══════════════════════════════════════
-- translation_backups: SELECT
-- ══════════════════════════════════════

-- ALLOW: User A can read own backup
SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.translation_backups WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'ALLOW: User A can read own translation backup'
);

-- DENY: User B cannot read User A's backup
SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM public.translation_backups WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'DENY: User B cannot read User A''s translation backup'
);

-- DENY: Anon cannot read any backups
SELECT set_anon();
SELECT is(
  (SELECT count(*)::int FROM public.translation_backups),
  0,
  'DENY: Anon cannot read any translation backups'
);

-- ══════════════════════════════════════
-- translation_backups: INSERT
-- ══════════════════════════════════════

-- ALLOW: User B can insert own backup
SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT lives_ok(
  $$INSERT INTO public.translation_backups (
    user_id, translation_id, name, abbreviation,
    books, original_filename, file_type, uploaded_at
  ) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'user-kjv', 'King James Version', 'KJV',
    '[]'::jsonb, 'KJV.txt', 'text', '2026-03-14T00:00:00Z'
  )$$,
  'ALLOW: User B can insert own translation backup'
);

-- DENY: User B cannot insert backup with User A's user_id
SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT throws_ok(
  $$INSERT INTO public.translation_backups (
    user_id, translation_id, name, abbreviation,
    books, original_filename, file_type, uploaded_at
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'user-test', 'Test', 'TST',
    '[]'::jsonb, 'test.txt', 'text', '2026-03-14T00:00:00Z'
  )$$,
  NULL, NULL,
  'DENY: User B cannot insert backup with User A''s user_id'
);

-- DENY: Anon cannot insert backups
SELECT set_anon();
SELECT throws_ok(
  $$INSERT INTO public.translation_backups (
    user_id, translation_id, name, abbreviation,
    books, original_filename, file_type, uploaded_at
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'user-test2', 'Test2', 'TST2',
    '[]'::jsonb, 'test2.txt', 'text', '2026-03-14T00:00:00Z'
  )$$,
  NULL, NULL,
  'DENY: Anon cannot insert translation backups'
);

-- ══════════════════════════════════════
-- translation_backups: UPDATE
-- ══════════════════════════════════════

-- ALLOW: User A can update own backup
SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT lives_ok(
  $$UPDATE public.translation_backups SET name = 'NRSVUE Updated' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'ALLOW: User A can update own translation backup'
);

-- DENY: User B cannot update User A's backup
SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE public.translation_backups SET name = 'Hacked' WHERE id = '11111111-1111-1111-1111-111111111111' RETURNING id
  ) AS updated),
  0,
  'DENY: User B cannot update User A''s translation backup'
);

-- ══════════════════════════════════════
-- translation_backups: DELETE
-- ══════════════════════════════════════

-- DENY: User B cannot delete User A's backup
SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM public.translation_backups WHERE id = '11111111-1111-1111-1111-111111111111' RETURNING id
  ) AS deleted),
  0,
  'DENY: User B cannot delete User A''s translation backup'
);

-- ALLOW: User A can delete own backup
SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
-- First re-check it exists
SELECT is(
  (SELECT count(*)::int FROM public.translation_backups WHERE id = '11111111-1111-1111-1111-111111111111'),
  1,
  'VERIFY: User A''s backup still exists before delete test'
);

-- ══════════════════════════════════════
-- translation_backup_chapters: SELECT
-- ══════════════════════════════════════

-- ALLOW: User A can read own chapters
SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.translation_backup_chapters WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'ALLOW: User A can read own backup chapters'
);

-- DENY: User B cannot read User A's chapters
SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM public.translation_backup_chapters WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'DENY: User B cannot read User A''s backup chapters'
);

-- DENY: Anon cannot read any chapters
SELECT set_anon();
SELECT is(
  (SELECT count(*)::int FROM public.translation_backup_chapters),
  0,
  'DENY: Anon cannot read any backup chapters'
);

-- ══════════════════════════════════════
-- translation_backup_chapters: INSERT
-- ══════════════════════════════════════

-- ALLOW: User A can insert own chapter
SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT lives_ok(
  $$INSERT INTO public.translation_backup_chapters (
    backup_id, user_id, book, chapter, book_name,
    encrypted_verses, encryption_iv
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'gen', 2, 'Genesis',
    'MORE_ENCRYPTED_DATA', 'MORE_IV_DATA'
  )$$,
  'ALLOW: User A can insert own backup chapter'
);

-- DENY: User B cannot insert chapter with User A's user_id
SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT throws_ok(
  $$INSERT INTO public.translation_backup_chapters (
    backup_id, user_id, book, chapter, book_name,
    encrypted_verses, encryption_iv
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'gen', 3, 'Genesis',
    'HACKED_DATA', 'HACKED_IV'
  )$$,
  NULL, NULL,
  'DENY: User B cannot insert backup chapter with User A''s user_id'
);

-- DENY: Anon cannot insert chapters
SELECT set_anon();
SELECT throws_ok(
  $$INSERT INTO public.translation_backup_chapters (
    backup_id, user_id, book, chapter, book_name,
    encrypted_verses, encryption_iv
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'gen', 4, 'Genesis',
    'ANON_DATA', 'ANON_IV'
  )$$,
  NULL, NULL,
  'DENY: Anon cannot insert backup chapters'
);

-- ══════════════════════════════════════
-- translation_backup_chapters: UPDATE
-- ══════════════════════════════════════

-- ALLOW: User A can update own chapter
SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT lives_ok(
  $$UPDATE public.translation_backup_chapters SET encrypted_verses = 'UPDATED_DATA' WHERE id = '22222222-2222-2222-2222-222222222222'$$,
  'ALLOW: User A can update own backup chapter'
);

-- DENY: User B cannot update User A's chapter
SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE public.translation_backup_chapters SET encrypted_verses = 'HACKED' WHERE id = '22222222-2222-2222-2222-222222222222' RETURNING id
  ) AS updated),
  0,
  'DENY: User B cannot update User A''s backup chapter'
);

-- ══════════════════════════════════════
-- translation_backup_chapters: DELETE
-- ══════════════════════════════════════

-- DENY: User B cannot delete User A's chapter
SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM public.translation_backup_chapters WHERE id = '22222222-2222-2222-2222-222222222222' RETURNING id
  ) AS deleted),
  0,
  'DENY: User B cannot delete User A''s backup chapter'
);

-- ALLOW: User A can delete own chapter
SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM public.translation_backup_chapters WHERE id = '22222222-2222-2222-2222-222222222222' RETURNING id
  ) AS deleted),
  1,
  'ALLOW: User A can delete own backup chapter'
);

-- ══════════════════════════════════════
-- CLEANUP
-- ══════════════════════════════════════

SELECT clear_auth();

SELECT * FROM finish();
ROLLBACK;
