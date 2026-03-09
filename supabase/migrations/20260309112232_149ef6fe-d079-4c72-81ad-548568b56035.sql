
-- Allow anon to update submissions (for candidates updating their own during interview)
CREATE POLICY "Anon can update own submissions"
  ON public.submissions FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to read own submission by ID (for pre-fill from invitation)
CREATE POLICY "Anon can read own submission"
  ON public.submissions FOR SELECT TO anon
  USING (true);
