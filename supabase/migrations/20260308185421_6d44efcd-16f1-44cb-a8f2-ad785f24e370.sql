
-- interview_templates new columns
ALTER TABLE public.interview_templates ADD COLUMN department text;
ALTER TABLE public.interview_templates ADD COLUMN intro_video_url text;
ALTER TABLE public.interview_templates ADD COLUMN deadline timestamptz;
ALTER TABLE public.interview_templates ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;

-- questions new columns
ALTER TABLE public.questions ADD COLUMN video_prompt_url text;
ALTER TABLE public.questions ADD COLUMN description text;
ALTER TABLE public.questions ADD COLUMN is_required boolean NOT NULL DEFAULT true;
