-- pgTAP adversarial RLS tests: cross_references table
--
-- Tests every RLS policy on public.cross_references with ALLOW and DENY cases.
-- Cross-references inherit access from their parent annotation, so all
-- policies check ownership/publicity via a join to annotations.
--
-- Policies under test:
--   1. "Users can read cross-refs for own annotations"
--   2. "Anyone can read cross-refs for public annotations"
--   3. "Users can create cross-refs for own annotations"
--   4. "Users can update cross-refs for own annotations"
--   5. "Users can delete cross-refs for own annotations"
--
-- Roles tested: anon, authenticated (owner), authenticated (non-owner)

BEGIN;

SELECT * FROM no_plan();

-- ══════════════════════════════════════
-- SETUP: Create test fixtures
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

-- User A: private annotation with a cross-reference
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md, is_public)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'oeb', 'john', 3, 16, 16,
  'Private annotation with cross-ref',
  false
);

INSERT INTO public.cross_references (id, annotation_id, book, chapter, verse_start, verse_end)
VALUES (
  'aaaa1111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'romans', 5, 8, 8
);

-- User A: public annotation with a cross-reference
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md, is_public, publish_status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'oeb', 'romans', 5, 8, 8,
  'Public annotation with cross-ref',
  true, 'approved'
);

INSERT INTO public.cross_references (id, annotation_id, book, chapter, verse_start, verse_end)
VALUES (
  'aaaa2222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'john', 3, 16, 16
);

-- User B: private annotation with a cross-reference
INSERT INTO public.annotations (id, user_id, translation, book, chapter, verse_start, verse_end, content_md, is_public)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'oeb', 'genesis', 1, 1, 1,
  'User B private annotation with cross-ref',
  false
);

INSERT INTO public.cross_references (id, annotation_id, book, chapter, verse_start, verse_end)
VALUES (
  'bbbb3333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  'psalms', 19, 1, 1
);


-- ══════════════════════════════════════
-- SELECT TESTS
-- ══════════════════════════════════════

-- ── Policy: "Users can read cross-refs for own annotations" ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM public.cross_references WHERE id = 'aaaa1111-1111-1111-1111-111111111111')::integer,
  1,
  'ALLOW: User A can read cross-ref on their own private annotation'
);

SELECT is(
  (SELECT count(*) FROM public.cross_references WHERE id = 'aaaa2222-2222-2222-2222-222222222222')::integer,
  1,
  'ALLOW: User A can read cross-ref on their own public annotation'
);

-- ── DENY: User A cannot read cross-refs on User B's private annotation ──

SELECT is(
  (SELECT count(*) FROM public.cross_references WHERE id = 'bbbb3333-3333-3333-3333-333333333333')::integer,
  0,
  'DENY: User A CANNOT read cross-ref on User B private annotation'
);

-- ── User B can read cross-refs on public annotation (anyone can) ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM public.cross_references WHERE id = 'aaaa2222-2222-2222-2222-222222222222')::integer,
  1,
  'ALLOW: User B can read cross-ref on User A public annotation'
);

-- ── DENY: User B cannot read cross-refs on User A's private annotation ──

SELECT is(
  (SELECT count(*) FROM public.cross_references WHERE id = 'aaaa1111-1111-1111-1111-111111111111')::integer,
  0,
  'DENY: User B CANNOT read cross-ref on User A private annotation'
);

-- ── Policy: "Anyone can read cross-refs for public annotations" ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM public.cross_references WHERE id = 'aaaa2222-2222-2222-2222-222222222222')::integer,
  1,
  'ALLOW: Anon CAN read cross-ref on public annotation'
);

-- ── DENY: Anon cannot read cross-refs on private annotations ──

SELECT is(
  (SELECT count(*) FROM public.cross_references WHERE id = 'aaaa1111-1111-1111-1111-111111111111')::integer,
  0,
  'DENY: Anon CANNOT read cross-ref on User A private annotation'
);

SELECT is(
  (SELECT count(*) FROM public.cross_references WHERE id = 'bbbb3333-3333-3333-3333-333333333333')::integer,
  0,
  'DENY: Anon CANNOT read cross-ref on User B private annotation'
);

-- Anon sees only public cross-refs in full scan
SELECT is(
  (SELECT count(*) FROM public.cross_references)::integer,
  1,
  'DENY: Anon full table scan returns only the 1 public cross-ref'
);


-- ══════════════════════════════════════
-- INSERT TESTS
-- ══════════════════════════════════════

-- ── Policy: "Users can create cross-refs for own annotations" ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$INSERT INTO public.cross_references (annotation_id, book, chapter, verse_start, verse_end)
    VALUES ('11111111-1111-1111-1111-111111111111', 'ephesians', 2, 8, 9)$$,
  'ALLOW: User A can insert cross-ref on their own annotation'
);

-- ── DENY: User A cannot insert cross-ref on User B's annotation ──

SELECT throws_ok(
  $$INSERT INTO public.cross_references (annotation_id, book, chapter, verse_start, verse_end)
    VALUES ('33333333-3333-3333-3333-333333333333', 'malachi', 3, 6, 6)$$,
  NULL,
  NULL,
  'DENY: User A CANNOT insert cross-ref on User B annotation'
);

-- ── DENY: Anonymous user cannot insert any cross-reference ──

SELECT set_anon();

SELECT throws_ok(
  $$INSERT INTO public.cross_references (annotation_id, book, chapter, verse_start, verse_end)
    VALUES ('22222222-2222-2222-2222-222222222222', 'mark', 1, 1, 1)$$,
  NULL,
  NULL,
  'DENY: Anon CANNOT insert cross-ref (unauthenticated write blocked)'
);


-- ══════════════════════════════════════
-- UPDATE TESTS
-- ══════════════════════════════════════

-- ── Policy: "Users can update cross-refs for own annotations" ──

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$UPDATE public.cross_references SET verse_end = 9
    WHERE id = 'aaaa1111-1111-1111-1111-111111111111'$$,
  'ALLOW: User A can update cross-ref on their own annotation'
);

-- ── DENY: User A cannot update cross-ref on User B's annotation ──

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.cross_references SET verse_end = 99
    WHERE id = 'bbbb3333-3333-3333-3333-333333333333' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: User A CANNOT update cross-ref on User B annotation (zero rows affected)'
);

-- ── DENY: User B cannot update cross-ref on User A's private annotation ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.cross_references SET verse_end = 99
    WHERE id = 'aaaa1111-1111-1111-1111-111111111111' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: User B CANNOT update cross-ref on User A private annotation (zero rows affected)'
);

-- ── DENY: Anonymous user cannot update any cross-reference ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    UPDATE public.cross_references SET verse_end = 99
    WHERE id = 'aaaa2222-2222-2222-2222-222222222222' RETURNING 1
  ) AS updated)::integer,
  0,
  'DENY: Anon CANNOT update cross-ref on public annotation (zero rows affected)'
);


-- ══════════════════════════════════════
-- DELETE TESTS
-- ══════════════════════════════════════

-- ── DENY: User B cannot delete cross-ref on User A's annotation ──

SELECT set_auth_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.cross_references WHERE id = 'aaaa1111-1111-1111-1111-111111111111' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: User B CANNOT delete cross-ref on User A private annotation'
);

-- ── DENY: Anonymous user cannot delete any cross-reference ──

SELECT set_anon();

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.cross_references WHERE id = 'aaaa2222-2222-2222-2222-222222222222' RETURNING 1
  ) AS deleted)::integer,
  0,
  'DENY: Anon CANNOT delete any cross-reference'
);

-- ── ALLOW: User A can delete cross-ref on their own annotation ──

SELECT clear_auth();
INSERT INTO public.cross_references (id, annotation_id, book, chapter, verse_start, verse_end)
VALUES (
  'aaaa9999-9999-9999-9999-999999999999',
  '11111111-1111-1111-1111-111111111111',
  'luke', 15, 11, 32
);

SELECT set_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*) FROM (
    DELETE FROM public.cross_references WHERE id = 'aaaa9999-9999-9999-9999-999999999999' RETURNING 1
  ) AS deleted)::integer,
  1,
  'ALLOW: User A can delete cross-ref on their own annotation'
);


-- ══════════════════════════════════════
-- DONE
-- ══════════════════════════════════════

SELECT * FROM finish();
ROLLBACK;
