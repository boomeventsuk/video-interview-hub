
-- Add rating column to submission_answers (1-5 stars, nullable = not yet rated)
ALTER TABLE public.submission_answers ADD COLUMN rating smallint;

-- Add reviewer_notes to submissions
ALTER TABLE public.submissions ADD COLUMN reviewer_notes text;

-- Add overall_rating to submissions (computed average, cached)
ALTER TABLE public.submissions ADD COLUMN overall_rating numeric(2,1);
