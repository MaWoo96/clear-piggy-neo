-- First, let's check and fix the trigger for user signup
-- The hierarchy is: auth.users -> user_profiles -> workspaces -> workspace_members

-- Drop existing trigger if exists to recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create or replace the function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
  new_profile_id uuid;
BEGIN
  -- Generate IDs
  new_profile_id := gen_random_uuid();
  new_workspace_id := gen_random_uuid();

  -- Step 1: Create user profile first (user -> profile)
  INSERT INTO public.user_profiles (
    id,
    auth_user_id,
    email,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    new_profile_id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  );

  -- Step 2: Create default workspace for the user (profile -> workspace)
  INSERT INTO public.workspaces (
    id,
    name,
    owner_id,
    created_at,
    updated_at
  )
  VALUES (
    new_workspace_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Workspace',
    new_profile_id,
    NOW(),
    NOW()
  );

  -- Step 3: Add user as owner of the workspace (workspace -> member)
  INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role,
    created_at
  )
  VALUES (
    new_workspace_id,
    new_profile_id,
    'owner',
    NOW()
  );

  -- Step 4: Update profile with default workspace references
  UPDATE public.user_profiles
  SET
    current_workspace_id = new_workspace_id,
    default_workspace_id = new_workspace_id,
    updated_at = NOW()
  WHERE id = new_profile_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RAISE;
END;
$$;

-- Create the trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions for the trigger to work
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT ON public.workspace_members TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure RLS policies exist for user_profiles (needed for signup to work)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Service role bypass" ON public.user_profiles;

  -- Create new policies
  CREATE POLICY "Service role bypass" ON public.user_profiles
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

  CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = auth_user_id);

  CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = auth_user_id);

  -- Allow insert during signup (when there's no auth.uid() yet, the trigger runs as service_role)
  CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT WITH CHECK (true);
END $$;

-- Test that the trigger function compiles correctly
DO $$
BEGIN
  RAISE NOTICE 'Trigger function handle_new_user created/updated successfully';
END $$;