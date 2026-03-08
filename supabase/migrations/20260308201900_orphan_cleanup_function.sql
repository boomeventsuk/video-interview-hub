-- Function to find orphaned submission_answers (where parent submission is
-- older than 90 days and rejected, or where the video_url references a
-- non-existent submission).
-- This returns a list of storage paths that should be cleaned up.
-- Actual blob deletion must happen via Supabase Storage API (edge function).

CREATE OR REPLACE FUNCTION public.get_orphaned_video_paths()
RETURNS TABLE(storage_path text, answer_id uuid, submission_id uuid, reason text)
LANGUAGE sql SECURITY DEFINER
AS $$
  -- Answers linked to rejected submissions older than 90 days
  SELECT
    sa.video_url AS storage_path,
    sa.id AS answer_id,
    sa.submission_id,
    'rejected_over_90_days' AS reason
  FROM public.submission_answers sa
  JOIN public.submissions s ON s.id = sa.submission_id
  WHERE sa.video_url IS NOT NULL
    AND s.status = 'rejected'
    AND s.created_at < NOW() - INTERVAL '90 days'

  UNION ALL

  -- Answers whose parent submission no longer exists (orphaned FK)
  SELECT
    sa.video_url AS storage_path,
    sa.id AS answer_id,
    sa.submission_id,
    'orphaned_submission' AS reason
  FROM public.submission_answers sa
  LEFT JOIN public.submissions s ON s.id = sa.submission_id
  WHERE sa.video_url IS NOT NULL
    AND s.id IS NULL;
$$;
