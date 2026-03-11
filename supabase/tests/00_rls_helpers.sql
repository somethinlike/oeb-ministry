-- Helper functions for pgTAP RLS tests
--
-- These utilities simulate Supabase Auth contexts by setting the
-- request.jwt.claims GUC that Supabase uses to implement auth.uid().
-- Each test file sources this to avoid duplication.
--
-- Pattern:
--   SELECT set_auth_user(some_uuid)  → authenticated as that user
--   SELECT set_anon()                → anonymous (no auth)
--   SELECT clear_auth()              → reset to default (service role)

-- Simulate an authenticated user by setting the JWT claims GUC.
-- Supabase's auth.uid() reads from request.jwt.claims->>'sub'.
CREATE OR REPLACE FUNCTION set_auth_user(uid uuid)
RETURNS void AS $$
BEGIN
  -- Set the role to authenticated (matches Supabase's RLS role grants)
  PERFORM set_config('role', 'authenticated', true);
  -- Set the JWT claims so auth.uid() returns this user's ID
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text,
    true
  );
END;
$$ LANGUAGE plpgsql;

-- Simulate an anonymous (unauthenticated) request.
-- Supabase uses the 'anon' role for unauthenticated access.
CREATE OR REPLACE FUNCTION set_anon()
RETURNS void AS $$
BEGIN
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$$ LANGUAGE plpgsql;

-- Reset to the default postgres/service role (bypasses RLS).
-- Used between tests to set up fixture data.
CREATE OR REPLACE FUNCTION clear_auth()
RETURNS void AS $$
BEGIN
  RESET role;
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$ LANGUAGE plpgsql;
