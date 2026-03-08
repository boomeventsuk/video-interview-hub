

# Phase 0 — Critical Bug Fixes

This is a large, multi-phase specification. I will implement **Phase 0 only** (critical bug fixes), then confirm completion before proceeding to Phase 1. Here is the plan for Phase 0:

## 0.1 Fix /admin/templates route (404)
- Create new page `src/pages/TemplatesList.tsx` — a dedicated templates list page with search, create/edit/delete/duplicate actions
- Add route `/admin/templates` in `App.tsx` pointing to this page (wrapped in `ProtectedRoute`)
- Update `AdminLayout.tsx` nav item for "Templates" to link to `/admin/templates`

## 0.2 Fix destructive question save logic
- Database migration: add `is_deleted boolean DEFAULT false` column to `questions` table
- Rewrite `handleSave` in `TemplateBuilder.tsx` to use upsert strategy:
  - Track which question IDs came from the database vs newly created
  - UPDATE existing questions in-place
  - INSERT new questions
  - For removed questions: check if they have linked `submission_answers`; if yes, set `is_deleted = true`; if no, hard delete
- Filter out `is_deleted = true` questions when loading

## 0.3 Safari/iOS video recording support
- In `Interview.tsx`, add MIME type detection function that tries `video/webm;codecs=vp9` → `video/webm` → `video/mp4` → error message
- Use detected MIME type when creating `MediaRecorder` and `Blob`
- Use correct file extension based on MIME type
- Show clear unsupported browser message if no MIME type works

## 0.4 Video file size limits
- After recording stops in `Interview.tsx`, check blob size against 100MB limit
- If exceeded, show error toast and offer re-record
- Database migration or storage policy isn't directly settable via code, but we'll enforce client-side

## 0.5 Mobile admin sidebar
- Rewrite `AdminLayout.tsx` to use a responsive pattern:
  - Desktop (≥768px): existing collapsible sidebar
  - Mobile (<768px): hamburger button in a top header bar, sidebar opens as a sheet/drawer overlay, closes on nav click or outside tap
- Use the existing `useIsMobile` hook and shadcn Sheet component

## 0.6 Orphaned video cleanup
- Create edge function `supabase/functions/cleanup-videos/index.ts` that:
  - Lists all files in `interview-videos` bucket
  - Checks each against `submission_answers.video_url`
  - Deletes orphaned files and files for rejected submissions older than 90 days
- Add config in `supabase/config.toml` with `verify_jwt = false`
- Can be triggered manually or via cron

## Database Migration (single migration)
```sql
ALTER TABLE public.questions ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;
```

## Files to Create
- `src/pages/TemplatesList.tsx`
- `supabase/functions/cleanup-videos/index.ts`

## Files to Modify
- `src/App.tsx` — add `/admin/templates` route
- `src/pages/TemplateBuilder.tsx` — upsert save logic, filter deleted questions
- `src/pages/Interview.tsx` — MIME detection, file size check
- `src/components/AdminLayout.tsx` — mobile responsive sidebar
- `supabase/config.toml` — cleanup-videos function config

