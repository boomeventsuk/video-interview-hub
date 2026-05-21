-- Seed the TSDP School & Community Session Leader video interview template.
-- This keeps the database-backed /interview/:templateId route aligned with
-- the dedicated /tsdp-session-leader candidate route.

DO $$
DECLARE
  admin_user_id uuid;
  template_uuid uuid := '8d42b52e-32a8-4d25-9b97-cd40b738969f';
BEGIN
  SELECT user_id
  INTO admin_user_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    SELECT admin_id
    INTO admin_user_id
    FROM public.interview_templates
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot seed TSDP interview template without an existing admin user or template owner';
  END IF;

  INSERT INTO public.interview_templates (
    id,
    admin_id,
    title,
    description,
    department,
    is_active,
    retakes_allowed,
    redirect_url,
    intro_video_url,
    is_deleted
  )
  VALUES (
    template_uuid,
    admin_user_id,
    'TSDP School & Community Session Leader',
    'Some jobs look good on paper. This one looks good on people''s faces. The Silent Disco Project CIC uses music and wireless headphones to bring joy, movement and connection to schools, care homes, SEND groups and community settings across Northamptonshire. This is a quick one-way video interview with one intro question and four short questions. Candidates get one minute to think and one minute to answer each question.',
    'The Silent Disco Project CIC',
    true,
    0,
    'https://www.thesilentdiscoproject.co.uk/jobs',
    null,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    department = EXCLUDED.department,
    is_active = EXCLUDED.is_active,
    retakes_allowed = EXCLUDED.retakes_allowed,
    redirect_url = EXCLUDED.redirect_url,
    intro_video_url = EXCLUDED.intro_video_url,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = now();

  INSERT INTO public.questions (
    id,
    template_id,
    question_text,
    order_index,
    prep_time_seconds,
    recording_duration_seconds,
    description,
    is_required,
    video_prompt_url,
    is_deleted
  )
  VALUES
    (
      'e142cf9a-916c-4abc-bd56-7ba89bb6ae23',
      template_uuid,
      'Quick intro: your name, where you are based, and what you are doing at the moment.',
      0,
      60,
      60,
      null,
      true,
      null,
      false
    ),
    (
      '6cffd77e-3afb-45b8-9bff-b88538bdb2de',
      template_uuid,
      'What interested you in the School & Community Session Leader role with The Silent Disco Project?',
      1,
      60,
      60,
      null,
      true,
      null,
      false
    ),
    (
      '11e4acfd-bc5a-4a8a-89f4-2aec7e4a0552',
      template_uuid,
      'Tell us about a time you led, supported or encouraged a group of people, especially children, older adults, SEND groups or a community setting.',
      2,
      60,
      60,
      null,
      true,
      null,
      false
    ),
    (
      'd09c260d-fd0d-4269-aa57-c6d48420c585',
      template_uuid,
      'How would you create a warm, inclusive atmosphere for a group who may be nervous, shy or have mixed needs?',
      3,
      60,
      60,
      null,
      true,
      null,
      false
    ),
    (
      '5c1f2a9f-7241-42c2-a77c-6bb9a2f9ce90',
      template_uuid,
      'This is freelance, ad hoc work across Northamptonshire. What is your availability like for evenings, weekends, Fridays or summer dates, and how would you reliably get to sessions with equipment?',
      4,
      60,
      60,
      null,
      true,
      null,
      false
    )
  ON CONFLICT (id) DO UPDATE
  SET
    question_text = EXCLUDED.question_text,
    order_index = EXCLUDED.order_index,
    prep_time_seconds = EXCLUDED.prep_time_seconds,
    recording_duration_seconds = EXCLUDED.recording_duration_seconds,
    description = EXCLUDED.description,
    is_required = EXCLUDED.is_required,
    video_prompt_url = EXCLUDED.video_prompt_url,
    is_deleted = EXCLUDED.is_deleted;
END $$;
