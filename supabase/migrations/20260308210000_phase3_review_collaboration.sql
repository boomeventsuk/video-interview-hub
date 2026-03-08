-- Phase 3: Review & Collaboration

-- 3.1 Ratings table (multi-reviewer ratings per submission)
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  star_rating integer NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(submission_id, reviewer_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ratings"
  ON ratings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Public can insert ratings (for share link anonymous ratings)
CREATE POLICY "Anyone can insert ratings without reviewer_id"
  ON ratings FOR INSERT
  TO anon
  WITH CHECK (reviewer_id IS NULL);

CREATE POLICY "Anyone can read ratings"
  ON ratings FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3.4 Share links table
CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage share links"
  ON share_links FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active share links by token"
  ON share_links FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 3.5 Add user_agent to submissions for device/browser info
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_agent text;

-- 3.6 Expanded status workflow
-- Add new status values and status change tracking
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status_history jsonb DEFAULT '[]'::jsonb;

-- Add index for share link token lookups
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token) WHERE is_active = true;
