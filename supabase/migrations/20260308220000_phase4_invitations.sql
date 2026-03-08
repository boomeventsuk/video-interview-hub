-- Phase 4: Invitation & Communication

-- Email log table
CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text,
  template_type text NOT NULL, -- 'invite', 'reminder', 'share'
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message text,
  submission_id uuid REFERENCES submissions(id) ON DELETE SET NULL,
  template_id uuid REFERENCES interview_templates(id) ON DELETE SET NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email log"
  ON email_log FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add reminder_days to templates
ALTER TABLE interview_templates ADD COLUMN IF NOT EXISTS reminder_days integer[] DEFAULT '{}';

-- Add invited_by to submissions for tracking who sent the invite
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add invited_at timestamp
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS invited_at timestamptz;

-- Add started_at for tracking when candidate starts
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Add completed_at for tracking when candidate finishes
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Index for reminder cron queries
CREATE INDEX IF NOT EXISTS idx_submissions_invited_status
  ON submissions(status, invited_at) WHERE status = 'invited';
