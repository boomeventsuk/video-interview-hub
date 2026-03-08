-- Phase 5: Branding & Customisation

-- Organisations table (single-org for now)
CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Company',
  website text,
  timezone text DEFAULT 'Europe/London',
  branding_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage organisations"
  ON organisations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read organisations"
  ON organisations FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert default org row
INSERT INTO organisations (name) VALUES ('My Company') ON CONFLICT DO NOTHING;
