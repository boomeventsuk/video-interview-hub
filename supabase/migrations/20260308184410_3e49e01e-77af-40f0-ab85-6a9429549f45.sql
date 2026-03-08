
ALTER TABLE public.interview_templates ADD COLUMN retakes_allowed integer NOT NULL DEFAULT 1;
ALTER TABLE public.interview_templates ADD COLUMN redirect_url text;
