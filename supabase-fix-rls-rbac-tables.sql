-- Enable Row Level Security (RLS) on roles, permissions, and role_permissions tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to make migration idempotent)
DROP POLICY IF EXISTS "anyone can select roles" ON public.roles;
DROP POLICY IF EXISTS "anyone can select permissions" ON public.permissions;
DROP POLICY IF EXISTS "anyone can select role_permissions" ON public.role_permissions;

-- Create policies to allow anyone to read these tables
CREATE POLICY "anyone can select roles" ON public.roles
  FOR SELECT USING (true);

CREATE POLICY "anyone can select permissions" ON public.permissions
  FOR SELECT USING (true);

CREATE POLICY "anyone can select role_permissions" ON public.role_permissions
  FOR SELECT USING (true);
