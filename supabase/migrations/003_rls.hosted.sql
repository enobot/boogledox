-- Hosted PostgreSQL only. Local PGlite startup skips *.hosted.sql.
-- Apply this file in the Supabase SQL editor after 001 and 002.
-- It does not create auth.uid(). Supabase Auth provides that function.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.prevent_document_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'document ownership cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NEW.revision IS DISTINCT FROM OLD.revision + 1 THEN
    RAISE EXCEPTION 'stale revision' USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_identity_guard ON public.documents;
CREATE TRIGGER documents_identity_guard
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_document_identity_change();

CREATE OR REPLACE FUNCTION public.caller_can_view(target_document text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.documents AS visible_document
    WHERE visible_document.id = target_document
      AND (
        visible_document.owner_id = (SELECT auth.uid())::text
        OR EXISTS (
          SELECT 1
          FROM public.document_permissions AS permission
          WHERE permission.document_id = visible_document.id
            AND permission.user_id = (SELECT auth.uid())::text
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_owns(target_document text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.documents AS owned_document
    WHERE owned_document.id = target_document
      AND owned_document.owner_id = (SELECT auth.uid())::text
  );
$$;

CREATE OR REPLACE FUNCTION public.save_document(
  target_id text,
  next_title text,
  next_content jsonb,
  expected_revision integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor text := (SELECT auth.uid())::text;
  visible boolean;
  editable boolean;
  updated public.documents%ROWTYPE;
BEGIN
  IF actor IS NULL OR actor = '' THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF next_title IS NULL
    OR char_length(btrim(next_title)) < 1
    OR char_length(btrim(next_title)) > 200 THEN
    RAISE EXCEPTION 'invalid title' USING ERRCODE = '22023';
  END IF;

  IF next_content IS NULL
    OR jsonb_typeof(next_content) <> 'object'
    OR next_content->>'type' IS DISTINCT FROM 'doc'
    OR octet_length(next_content::text) > 1000000 THEN
    RAISE EXCEPTION 'invalid content' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.documents AS visible_document
    WHERE visible_document.id = target_id
      AND (
        visible_document.owner_id = actor
        OR EXISTS (
          SELECT 1
          FROM public.document_permissions AS permission
          WHERE permission.document_id = visible_document.id
            AND permission.user_id = actor
        )
      )
  ) INTO visible;

  SELECT EXISTS (
    SELECT 1
    FROM public.documents AS editable_document
    WHERE editable_document.id = target_id
      AND (
        editable_document.owner_id = actor
        OR EXISTS (
          SELECT 1
          FROM public.document_permissions AS permission
          WHERE permission.document_id = editable_document.id
            AND permission.user_id = actor
            AND permission.role = 'editor'
        )
      )
  ) INTO editable;

  IF NOT visible THEN
    RAISE EXCEPTION 'not found' USING ERRCODE = '42501';
  END IF;

  IF NOT editable THEN
    RAISE EXCEPTION 'read only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.documents
  SET title = btrim(next_title),
      content = next_content,
      revision = revision + 1,
      updated_at = NOW()
  WHERE id = target_id
    AND revision = expected_revision
  RETURNING * INTO updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'stale revision' USING ERRCODE = '40001';
  END IF;

  RETURN jsonb_build_object(
    'id', updated.id,
    'ownerId', updated.owner_id,
    'title', updated.title,
    'content', updated.content,
    'revision', updated.revision,
    'createdAt', updated.created_at,
    'updatedAt', updated.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_document_access(
  target_document text,
  target_email text,
  target_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor text := (SELECT auth.uid())::text;
  account public.profiles%ROWTYPE;
BEGIN
  IF actor IS NULL OR actor = '' THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.caller_can_view(target_document) THEN
    RAISE EXCEPTION 'not found' USING ERRCODE = '42501';
  END IF;

  IF NOT public.current_user_owns(target_document) THEN
    RAISE EXCEPTION 'only the owner' USING ERRCODE = '42501';
  END IF;

  IF target_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'invalid permission' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO account
  FROM public.profiles
  WHERE lower(email) = lower(btrim(target_email));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown account' USING ERRCODE = 'P0002';
  END IF;

  IF account.id = actor THEN
    RAISE EXCEPTION 'duplicate share' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.document_permissions (document_id, user_id, role)
  VALUES (target_document, account.id, target_role);

  RETURN jsonb_build_object(
    'userId', account.id,
    'email', account.email,
    'displayName', account.display_name,
    'role', target_role
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'duplicate share' USING ERRCODE = '23505';
END;
$$;

CREATE OR REPLACE FUNCTION public.change_document_access(
  target_document text,
  target_user text,
  target_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account public.profiles%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.caller_can_view(target_document) THEN
    RAISE EXCEPTION 'not found' USING ERRCODE = '42501';
  END IF;

  IF NOT public.current_user_owns(target_document) THEN
    RAISE EXCEPTION 'only the owner' USING ERRCODE = '42501';
  END IF;

  IF target_user = (SELECT auth.uid())::text THEN
    RAISE EXCEPTION 'invalid permission' USING ERRCODE = '22023';
  END IF;

  IF target_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'invalid permission' USING ERRCODE = '22023';
  END IF;

  UPDATE public.document_permissions
  SET role = target_role
  WHERE document_id = target_document
    AND user_id = target_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not shared' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO account FROM public.profiles WHERE id = target_user;

  RETURN jsonb_build_object(
    'userId', account.id,
    'email', account.email,
    'displayName', account.display_name,
    'role', target_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_document_access(
  target_document text,
  target_user text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF target_user = (SELECT auth.uid())::text THEN
    RAISE EXCEPTION 'invalid permission' USING ERRCODE = '22023';
  END IF;

  IF NOT public.caller_can_view(target_document) THEN
    RAISE EXCEPTION 'not found' USING ERRCODE = '42501';
  END IF;

  IF NOT public.current_user_owns(target_document) THEN
    RAISE EXCEPTION 'only the owner' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.document_permissions
  WHERE document_id = target_document
    AND user_id = target_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not shared' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.documents FROM PUBLIC;
REVOKE ALL ON public.document_permissions FROM PUBLIC;
REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON FUNCTION public.caller_can_view(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_owns(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_document(text, text, jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_document_access(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.change_document_access(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_document_access(text, text) FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.documents TO authenticated;
GRANT SELECT ON public.document_permissions TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.caller_can_view(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_owns(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_document(text, text, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_document_access(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_document_access(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_document_access(text, text) TO authenticated;

DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
  FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.document_permissions AS permission
      WHERE permission.document_id = documents.id
        AND permission.user_id = (SELECT auth.uid())::text
    )
  );

DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())::text
    AND revision = 1
    AND jsonb_typeof(content) = 'object'
    AND content->>'type' = 'doc'
  );

DROP POLICY IF EXISTS permissions_select ON public.document_permissions;
CREATE POLICY permissions_select ON public.document_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())::text
    OR public.current_user_owns(document_id)
  );

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
