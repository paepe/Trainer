-- Free Training Session — synthetic subject creation RPC
-- Project: sevenseeds.trainer (xbfszzdyskwdctlqzztl), production
-- Final version after Fase 8 fixes (2026-06-10):
--   1. profiles_role_check did not allow 'free_session_subject' (400 fixed below)
--   2. profiles.id has FK profiles_id_fkey -> auth.users.id ON DELETE CASCADE.
--      A synthetic profile must exist in auth.users; the on_auth_user_created
--      trigger -> handle_new_user() then creates the profiles row from
--      raw_user_meta_data (409 fixed below).

-- 1. Allow the new role value.
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'client'::text, 'trainer'::text, 'studio_admin'::text, 'studio_trainer'::text,
    'internal_trainer'::text, 'technical_coordinator'::text, 'studio_manager'::text,
    'finance'::text, 'moderator'::text, 'ai_system'::text, 'free_session_subject'::text
  ]));

-- 2. Synthetic subject creation RPC.
CREATE OR REPLACE FUNCTION public.create_free_session_subject(p_trainer_id uuid)
RETURNS TABLE (client_id uuid, name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid := gen_random_uuid();
  v_seq    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
  v_name   text;
  v_email  text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_trainer_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_trainer_id AND role = 'trainer') THEN
    RAISE EXCEPTION 'not_a_trainer';
  END IF;

  v_name  := 'Free Session ' || v_seq;
  v_email := 'fs_' || v_seq || '@trainer.fs';

  -- profiles row is created by the on_auth_user_created -> handle_new_user()
  -- trigger, which reads name/role from raw_user_meta_data.
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_sso_user, is_anonymous
  )
  VALUES (
    v_new_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', v_email,
    '', now(), now(), now(),
    '{"provider":"free_session","providers":["free_session"]}',
    jsonb_build_object('name', v_name, 'role', 'free_session_subject'),
    false, true
  );

  INSERT INTO trainer_clients (trainer_id, client_id, status)
  VALUES (p_trainer_id, v_new_id, 'active');

  RETURN QUERY SELECT v_new_id, v_name, v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.create_free_session_subject(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_free_session_subject(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_free_session_subject(uuid) TO authenticated;
