
-- Add missing columns to submissions table that the code references
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS invited_by UUID;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;
