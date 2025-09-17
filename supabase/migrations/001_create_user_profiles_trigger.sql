-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  current_workspace_id uuid,
  default_workspace_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workspaces table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workspace_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_profiles_current_workspace_id_fkey'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_current_workspace_id_fkey
    FOREIGN KEY (current_workspace_id) REFERENCES public.workspaces(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_profiles_default_workspace_id_fkey'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_default_workspace_id_fkey
    FOREIGN KEY (default_workspace_id) REFERENCES public.workspaces(id);
  END IF;
END $$;

-- Create function to handle new user signup
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

  -- Create user profile
  INSERT INTO public.user_profiles (id, auth_user_id, email, full_name)
  VALUES (new_profile_id, NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  -- Create default workspace
  INSERT INTO public.workspaces (id, name, owner_id)
  VALUES (new_workspace_id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Workspace'), new_profile_id);

  -- Add user as workspace member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, new_profile_id, 'owner');

  -- Update profile with workspace
  UPDATE public.user_profiles
  SET current_workspace_id = new_workspace_id,
      default_workspace_id = new_workspace_id
  WHERE id = new_profile_id;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Create basic RLS policies for workspaces
CREATE POLICY "Users can view their workspaces" ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.user_profiles up ON up.id = wm.user_id
      WHERE wm.workspace_id = workspaces.id
      AND up.auth_user_id = auth.uid()
    )
  );

-- Create basic RLS policies for workspace_members
CREATE POLICY "Users can view workspace members" ON public.workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = workspace_members.user_id
      AND up.auth_user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;