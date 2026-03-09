
-- Allow service role to delete evaluations for re-runs
CREATE POLICY "Admins can delete evaluations"
  ON public.ai_evaluations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
