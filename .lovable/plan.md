

# Phase 2 — Interview Builder (Recruiter Power Tools)

## Database Migration

Single migration adding all new columns and filtering out soft-deleted templates:

```sql
-- interview_templates
ALTER TABLE public.interview_templates ADD COLUMN department text;
ALTER TABLE public.interview_templates ADD COLUMN intro_video_url text;
ALTER TABLE public.interview_templates ADD COLUMN deadline timestamptz;
ALTER TABLE public.interview_templates ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;

-- questions
ALTER TABLE public.questions ADD COLUMN video_prompt_url text;
ALTER TABLE public.questions ADD COLUMN description text;
ALTER TABLE public.questions ADD COLUMN is_required boolean NOT NULL DEFAULT true;
```

## 2.1 Department Field
- Add department input to `TemplateBuilder.tsx` between title and description
- Show department badge on template cards in `TemplatesList.tsx` and `AdminDashboard.tsx`
- Add department filter dropdown on `TemplatesList.tsx`

## 2.2 Intro/Welcome Video
- Add "Intro Video" section in `TemplateBuilder.tsx` with three options: record in-browser, upload file, or none
- Reuse `MediaRecorder` logic for in-browser recording; upload to `interview-videos` bucket under `intros/{templateId}.webm`
- In `WelcomeScreen.tsx`, if `intro_video_url` exists, show a video player before the "Start" button

## 2.3 Video Question Prompts
- Add optional "Record Video Prompt" button per question card in `TemplateBuilder.tsx`
- Upload to `interview-videos` bucket under `prompts/{questionId}.webm`
- In `QuestionScreen.tsx`, during prep stage, play the recruiter's video prompt alongside question text if `video_prompt_url` is set
- Pass `video_prompt_url` through the Question interface

## 2.4 Interview Deadline / Expiry
- Add date picker for deadline in `TemplateBuilder.tsx` (using existing `Calendar`/`Popover` components)
- In `Interview.tsx`, check deadline before showing welcome screen — if expired, show "This interview has closed" message
- Show expiry badge on template cards in `TemplatesList.tsx`

## 2.5 Template Management Enhancements
- Update `deleteTemplate` in `TemplatesList.tsx` to set `is_deleted = true` (true soft-delete) in addition to `is_active = false`
- Filter out `is_deleted = true` templates from all queries
- Duplicate should also copy `department`, `deadline`, `retakes_allowed`, `redirect_url` fields

## 2.6 Preview Mode
- Add "Preview" button on template cards and in `TemplateBuilder.tsx`
- Opens `/interview/{templateId}?preview=true`
- In `Interview.tsx`, detect `preview` query param — skip submission creation, skip uploads, show "PREVIEW MODE" banner at top
- All recording still works visually but nothing persists

## 2.7 Question Enhancements
- Add `description` textarea and `is_required` toggle per question in `TemplateBuilder.tsx`
- In `QuestionScreen.tsx`, show description below question text in smaller font
- For non-required questions, add a "Skip" button in the candidate flow that moves to next question without recording

## Files to Create
None — all changes are to existing files.

## Files to Modify
- `src/pages/TemplateBuilder.tsx` — department, intro video, deadline picker, video prompts, question description/required, preview button
- `src/pages/TemplatesList.tsx` — department filter/badge, expiry badge, preview button, is_deleted filtering, improved duplicate
- `src/pages/AdminDashboard.tsx` — filter out is_deleted templates
- `src/pages/Interview.tsx` — deadline check, preview mode (skip persistence), pass video_prompt_url/description/is_required
- `src/components/interview/WelcomeScreen.tsx` — intro video player
- `src/components/interview/QuestionScreen.tsx` — video prompt playback, description display, skip button for optional questions

