
-- Create organisations table
CREATE TABLE public.organisations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  website TEXT,
  timezone TEXT DEFAULT 'Europe/London',
  branding_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view organisations"
  ON public.organisations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert organisations"
  ON public.organisations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update organisations"
  ON public.organisations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow anon to read organisations (for branding on public pages)
CREATE POLICY "Anon can view organisations"
  ON public.organisations FOR SELECT TO anon USING (true);

-- Create org_members table
CREATE TABLE public.org_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invite_token UUID DEFAULT gen_random_uuid(),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, email)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view org_members"
  ON public.org_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert org_members"
  ON public.org_members FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update org_members"
  ON public.org_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow anon to read org_members (for invite token lookup)
CREATE POLICY "Anon can view org_members by invite_token"
  ON public.org_members FOR SELECT TO anon USING (invite_token IS NOT NULL);

CREATE POLICY "Anon can update org_members"
  ON public.org_members FOR UPDATE TO anon USING (invite_token IS NOT NULL) WITH CHECK (true);

-- Create share_links table
CREATE TABLE public.share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage share_links"
  ON public.share_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon can view active share_links"
  ON public.share_links FOR SELECT TO anon USING (is_active = true);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  star_rating INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ratings"
  ON public.ratings FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view ratings"
  ON public.ratings FOR SELECT TO authenticated USING (true);
