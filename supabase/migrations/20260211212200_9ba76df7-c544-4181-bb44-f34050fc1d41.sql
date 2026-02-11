
-- Tighten submission insert: require template_id references an active template
DROP POLICY "Public can create submissions" ON public.submissions;
CREATE POLICY "Public can create submissions" ON public.submissions
  FOR INSERT TO anon
  WITH CHECK (
    applicant_name IS NOT NULL AND applicant_name <> '' AND
    applicant_email IS NOT NULL AND applicant_email <> '' AND
    EXISTS (SELECT 1 FROM public.interview_templates t WHERE t.id = template_id AND t.is_active = true)
  );

-- Tighten answer insert: require submission exists
DROP POLICY "Public can create answers" ON public.submission_answers;
CREATE POLICY "Public can create answers" ON public.submission_answers
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id)
  );
