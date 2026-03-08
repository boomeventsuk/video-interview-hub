-- Phase 7: Team & Access Management

-- 7.1 Org role enum
DO $$ BEGIN
  CREATE TYPE org_role AS ENUM ('owner', 'admin', 'recruiter', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7.2 Org members table
CREATE TABLE IF NOT EXISTS org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role org_role NOT NULL DEFAULT 'viewer',
  invite_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Admins and owners can manage org members
CREATE POLICY "Admins can manage org members"
  ON org_members FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Members can read their own record
CREATE POLICY "Members can read own record"
  ON org_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Anon can read by invite token (for join flow)
CREATE POLICY "Anon can read by invite token"
  ON org_members FOR SELECT
  TO anon, authenticated
  USING (invite_token IS NOT NULL);

-- 7.3 Helper function to check org membership
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND role = _role AND is_active = true
  )
$$;

-- 7.4 Helper to check any active org membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- 7.5 Unique constraint: one user per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_org ON org_members(org_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_email_org ON org_members(org_id, email) WHERE user_id IS NULL;

-- 7.6 Seed: auto-assign existing admin users as org owners
-- (Run once to bootstrap existing single-org setup)
INSERT INTO org_members (org_id, user_id, email, role, joined_at)
SELECT
  o.id,
  ur.user_id,
  COALESCE(p.email, au.email, 'unknown'),
  'owner'::org_role,
  now()
FROM user_roles ur
CROSS JOIN organisations o
LEFT JOIN profiles p ON p.id = ur.user_id
LEFT JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'admin'
ON CONFLICT DO NOTHING;
