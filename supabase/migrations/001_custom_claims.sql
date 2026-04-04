-- Create a trigger to insert a row in public.users when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, auth_user_id, email, name, role, branch_id, created_at, updated_at)
  VALUES (
    gen_random_uuid()::text,
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'staff'),
    COALESCE(NEW.raw_user_meta_data ->> 'branch_id', ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Custom access token hook: injects user_role and branch_id into JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_branch_id text;
BEGIN
  -- Get the user's role and branch from public.users
  SELECT u.role, u.branch_id
  INTO user_role, user_branch_id
  FROM public.users u
  WHERE u.auth_user_id = (event ->> 'user_id')::text;

  claims := event -> 'claims';

  IF user_role IS NOT NULL THEN
    -- Set custom claims
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{branch_id}', to_jsonb(user_branch_id));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"staff"');
    claims := jsonb_set(claims, '{branch_id}', '""');
  END IF;

  -- Update the claims in the event
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant necessary permissions for the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.users TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
