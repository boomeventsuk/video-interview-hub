CREATE POLICY "Admins can insert submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));