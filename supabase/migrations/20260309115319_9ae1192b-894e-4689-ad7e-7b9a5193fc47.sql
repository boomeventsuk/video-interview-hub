
-- AI evaluation results table
CREATE TABLE public.ai_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 1 AND 10),
  summary TEXT NOT NULL,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  concerns TEXT[] NOT NULL DEFAULT '{}',
  recommendation TEXT NOT NULL,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(submission_id)
);

-- RLS
ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view evaluations"
  ON public.ai_evaluations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert evaluations"
  ON public.ai_evaluations FOR INSERT TO anon, authenticated
  WITH CHECK (true);
