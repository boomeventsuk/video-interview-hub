# InterviewPro — World-Class Build Specification

> **Instructions for Lovable:** This document describes every feature, fix, and improvement needed to bring InterviewPro to production-grade, world-class standard — matching and exceeding Hireflix (the market leader in one-way video interviews). Work through each phase in order. Do not skip ahead. After each phase, confirm what was completed before moving to the next.

---

## PHASE 0 — Critical Bug Fixes

Fix these before touching anything else. They affect stability and trust.

### 0.1 Fix the /admin/templates route (404)
- Currently, `/admin/templates` returns a 404 because only `/admin/templates/:id` is routed.
- Add a `/admin/templates` route that renders a dedicated Templates List page showing all templates with create/edit/delete/duplicate actions.
- Redirect from AdminDashboard "Edit" buttons should still work.

### 0.2 Fix destructive question save logic
- Currently, saving a template deletes ALL questions then re-inserts them. This breaks foreign key references from existing `submission_answers`.
- Change to an upsert strategy:
  - **Existing questions** (have an `id`): UPDATE in place.
  - **New questions** (no `id`): INSERT.
  - **Removed questions** (were in DB but not in the current list): only DELETE if they have zero linked `submission_answers`. If they have answers, soft-delete (add `is_deleted boolean DEFAULT false` column) or warn the admin.

### 0.3 Safari/iOS video recording support
- `MediaRecorder` with `video/webm` is not supported on Safari/iOS.
- Add MIME type detection: try `video/webm;codecs=vp9` → `video/webm` → `video/mp4` → show a clear error message if none are supported.
- Test that the recording flow works on iPhone Safari and iPad Safari.

### 0.4 Video file size limits
- Add a client-side check: if the recorded Blob exceeds 100 MB, show an error and ask the candidate to re-record with a shorter answer.
- Add a Supabase storage policy limiting file size to 150 MB as a backend safety net.

### 0.5 Mobile admin sidebar
- The sidebar currently breaks on mobile viewports.
- Convert to a responsive drawer: collapsed by default on mobile, opens as an overlay when hamburger icon is tapped, closes on navigation or outside tap.

### 0.6 Orphaned video cleanup
- Add a database function or edge function that runs daily (or on-demand) to:
  - Find videos in storage where the linked `submission_answers.video_url` no longer exists, or where the parent submission is older than 90 days and status is `rejected`.
  - Delete orphaned blobs.

---

## PHASE 1 — Candidate Experience (Make It Flawless)

The candidate flow is the single most important thing. Every interaction must feel polished, trustworthy, and effortless.

### 1.1 Device & Browser Check Screen
- After the candidate enters their name and email and clicks "Start", show a **setup screen** before any questions:
  - Request camera + microphone permissions.
  - Show a live video preview so the candidate can see themselves.
  - Show audio level indicator (simple bar that moves with mic input).
  - Show detected browser and whether it's supported.
  - "Everything looks good" green indicator + "Begin Interview" button.
  - If permissions are denied, show clear instructions on how to enable them.

### 1.2 Progress Indicator
- Show a clear progress bar and text: **"Question 2 of 5"** at the top of every question screen.
- Progress bar should fill proportionally.

### 1.3 Think Time Improvements
- Show the question text prominently during think time.
- Show a circular countdown timer (the existing ProgressRing is good).
- Add a **"I'm Ready — Start Recording"** button so candidates can skip remaining think time.
- Below the countdown, show subtle helper text: "Take a moment to gather your thoughts."

### 1.4 Recording Experience Improvements
- Show **two timers**: elapsed time (counting up) and remaining time (counting down from max duration).
- When 80% of time is used, change the remaining timer colour to amber.
- When 95% of time is used, change to red with a gentle pulse.
- Auto-stop recording when time runs out (already likely working, but verify).
- Show a prominent **red recording indicator** (pulsing dot + "Recording") so there's no doubt.

### 1.5 Retake Functionality
- Add `retakes_allowed` field to `interview_templates` (integer, default: 1, options: 0 = no retakes, 1, 2, 3, unlimited).
- After a candidate records an answer, show two buttons:
  - **"Next Question →"** (submits the recording, moves on)
  - **"Retake"** (if retakes remain) — discards the recording, returns to think time for that question.
- Show retake count: "Retake 1 of 2 remaining".
- When no retakes remain, only show "Next Question →".

### 1.6 Completion Screen
- Show a professional confirmation: "Your interview has been submitted successfully."
- Show a summary: template title, number of questions answered, date/time submitted.
- Add optional custom redirect: if the admin set a `redirect_url` on the template, show "Continue →" button that navigates there after 5 seconds (with countdown).
- If no redirect, show company branding and a static thank-you message.

### 1.7 Error Handling & Recovery
- **Camera lost mid-recording**: Pause recording, show "Camera disconnected — please check your device" with a retry button. If reconnected, offer to continue or retake.
- **Network error on upload**: Retry upload 3 times with exponential backoff. If all fail, save the blob to IndexedDB and show "Your recording is saved locally. Please check your connection and click 'Retry Upload'."
- **Browser tab closed accidentally**: Use `beforeunload` event to warn "Your interview progress will be lost."
- **Unsupported browser**: Show a clear message with recommended browsers (Chrome, Firefox, Edge, Safari 14.1+).

### 1.8 Accessibility
- All buttons must have proper `aria-labels`.
- Keyboard navigation must work throughout the flow.
- Colour contrast must meet WCAG AA.
- Screen reader support for timer countdowns (periodic `aria-live` announcements).

---

## PHASE 2 — Interview Builder (Recruiter Power Tools)

### 2.1 Department Field
- Add `department` (text, nullable) to `interview_templates`.
- Show as an input field in TemplateBuilder between title and description.
- Show on dashboard template cards and allow filtering by department.

### 2.2 Intro/Welcome Video
- Add `intro_video_url` (text, nullable) to `interview_templates`.
- In TemplateBuilder, add an "Intro Video" section:
  - Option 1: Record a welcome video in-browser (reuse MediaRecorder logic).
  - Option 2: Upload a video file.
  - Option 3: No intro video.
- In the candidate flow, show the intro video on the welcome screen before "Start Interview". Candidate watches it, then proceeds.

### 2.3 Video Question Prompts
- Add `video_prompt_url` (text, nullable) to `questions`.
- In TemplateBuilder, each question card gets an optional "Record Video Prompt" button.
- Admin records a short video explaining the question (in-browser recording, same as candidate).
- In the candidate flow, during think time for that question, play the recruiter's video prompt alongside the question text.

### 2.4 Interview Deadline / Expiry
- Add `deadline` (timestamptz, nullable) to `interview_templates`.
- In TemplateBuilder, add a date picker for "Interview closes on".
- In the candidate flow: if the deadline has passed, show "This interview has closed" instead of the welcome screen.
- On the dashboard, show a badge on expired templates.

### 2.5 Template Management
- **Duplicate template**: Button on each template card → creates a copy with " (Copy)" appended to the title, all questions duplicated, new UUID.
- **Delete template**: Button with confirmation modal. Warn if submissions exist ("This template has X submissions. Deleting will archive them."). Soft-delete (set `is_active = false` and `is_deleted = true`) rather than hard delete.
- **Template library page**: Dedicated `/admin/templates` page with search, filter by department, sort by date/name, grid/list toggle.

### 2.6 Preview Mode
- Add a "Preview" button on each template card and in TemplateBuilder.
- Opens the full candidate flow in a modal or new tab with a banner: "PREVIEW MODE — No data will be saved."
- All recording and submission logic is disabled; candidate sees exactly what they'll see but nothing persists.

### 2.7 Question Enhancements
- **Question description/helper text**: Add optional `description` (text, nullable) to questions. Shown below the question text in smaller font during the candidate flow.
- **Required vs optional**: Add `is_required` (boolean, default true). Optional questions get a "Skip" button in the candidate flow.

---

## PHASE 3 — Review & Collaboration (Where Decisions Happen)

### 3.1 Ratings System
Create a new `ratings` table:

```
ratings
├── id: uuid (PK)
├── submission_id: uuid (FK → submissions)
├── reviewer_id: uuid (FK → auth.users)
├── star_rating: integer (1–5)
├── notes: text (nullable)
├── created_at: timestamptz
└── updated_at: timestamptz
```

- RLS: authenticated users with admin role can CRUD their own ratings, read all ratings.
- **UI in SubmissionsReview**: Below each candidate's video answers, show:
  - Star rating input (1–5 clickable stars).
  - Notes textarea.
  - "Save Rating" button.
  - If the current user already rated, show their rating with an "Edit" option.
  - Show all ratings from other team members (avatar + stars + notes) in a collapsible section.
- **Average rating**: Calculate and display on the submissions list.

### 3.2 Candidate Filtering & Sorting
In SubmissionsReview, add a toolbar above the candidate list:
- **Search**: Text search on applicant name and email.
- **Filter by status**: Multi-select dropdown (New, Reviewed, Shortlisted, Rejected).
- **Filter by template**: Dropdown of all templates.
- **Sort by**: Date (newest/oldest), Average rating (highest/lowest), Name (A-Z/Z-A).
- **Bulk actions**: Select multiple → change status, export selected.

### 3.3 Playback Speed Control
- Add speed control buttons to all video players: **0.5x, 1x, 1.5x, 2x**.
- Remember the selected speed across videos within the same review session (React state).
- Show current speed as a badge on the video player.

### 3.4 Secure Share Links
- Create a `share_links` table:

```
share_links
├── id: uuid (PK)
├── submission_id: uuid (FK → submissions)
├── token: text (unique, generated)
├── created_by: uuid (FK → auth.users)
├── expires_at: timestamptz (nullable)
├── is_active: boolean (default true)
├── created_at: timestamptz
```

- Add a "Share" button on each submission → generates a unique token URL: `/review/:token`.
- Create a new public page `/review/:token` that shows:
  - Candidate name, template title, submission date.
  - All video answers with playback.
  - A rating form (optional — the viewer can rate without an account, stored with `reviewer_id = null` and a display name input).
  - No access to other candidates or admin features.
- Share links expire after 30 days by default (configurable).

### 3.5 Submission Detail Improvements
- Show submission metadata: date, time to complete, device/browser info (store `user_agent` on submission creation).
- Show per-answer metadata: recording duration, file size.
- Add a "Notes" section (free-text, per-submission, separate from ratings).
- Add keyboard shortcuts: `→` next answer, `←` previous answer, `space` play/pause, `r` rate.

### 3.6 Status Workflow Enhancement
- Expand statuses: `new` → `in_review` → `shortlisted` / `rejected` / `on_hold`.
- Add status change timestamps (when did it move to each status?).
- Show status history on submission detail.
- Allow custom status labels (admin can rename/add statuses in settings — P3 feature, stub the data model now).

---

## PHASE 4 — Invitation & Communication System

### 4.1 Email Infrastructure
- Set up a Supabase edge function for sending emails via **Resend** (or Postmark — whichever Lovable supports best).
- Create an `email_log` table to track all sent emails (recipient, template, status, sent_at).

### 4.2 Manual Candidate Invite
- In the template detail or submissions page, add an "Invite Candidate" button.
- Modal: enter candidate name + email → creates a `submissions` record with status `invited` → sends email with the interview link.
- Email contains: company name, position title, deadline (if set), and a prominent "Start Interview" button linking to `/interview/:templateId?submission=:submissionId`.
- When candidate clicks the link, pre-populate their name and email from the submission record (skip the info form).

### 4.3 Bulk Invite (CSV Upload)
- Add a "Bulk Invite" button → file upload accepting `.csv`.
- CSV format: `name,email` (with optional header row).
- Parse, validate emails, show preview table with row count.
- On confirm: create submissions for all, send emails in batch.
- Show progress and results (X sent, Y failed with reasons).

### 4.4 Automated Reminders
- Add `reminder_days` (integer array, nullable) to templates (e.g., [3, 7] = remind after 3 and 7 days).
- Supabase scheduled function (cron) checks for `invited` submissions past reminder thresholds → sends reminder email.
- Track reminders sent in `email_log` to avoid duplicates.

### 4.5 Candidate Status Tracking
- Expand submission statuses to include: `invited`, `email_opened`, `started`, `completed`, `expired`.
- Update status automatically:
  - `invited` → set on creation/invite.
  - `started` → set when candidate loads the first question.
  - `completed` → set when all answers are submitted.
  - `expired` → set by cron job when deadline passes and status is still `invited` or `started`.
- Show these statuses with colour-coded badges on the dashboard.

---

## PHASE 5 — Branding & Customisation

### 5.1 Organisation Settings Page
- Create `/admin/settings` page with tabs: General, Branding, Team, Notifications.
- **General**: Company name, company website, default timezone.
- Store in a new `organisations` table (for now, single-org — just one row).

### 5.2 Branding Settings
- **Logo upload**: Upload company logo → stored in Supabase storage `branding` bucket → displayed on:
  - Candidate interview pages (top of screen).
  - Email templates.
  - Share link review pages.
- **Colour scheme**: Primary colour picker → applied to candidate-facing buttons, progress bars, headers.
- **Accent colour**: Secondary colour picker for highlights.
- Store as `branding_config` JSONB column on `organisations`.

### 5.3 Candidate-Facing Theming
- Apply branding dynamically to the Interview page:
  - Logo in the header.
  - Primary colour for buttons, progress bar, highlights.
  - Company name in the welcome text.
- Use CSS custom properties so theming is a matter of setting `--brand-primary`, `--brand-accent`, `--brand-logo-url`.

### 5.4 Custom Completion Redirect
- Already spec'd in Phase 1.6 — ensure it works with branding applied.

---

## PHASE 6 — Analytics & Insights

### 6.1 Analytics Dashboard
- Create `/admin/analytics` page showing:
  - **Completion funnel**: Invited → Started → Completed → Reviewed → Shortlisted (visual funnel chart).
  - **Completion rate**: % of invited candidates who completed, per template and overall.
  - **Average time to complete**: From invite to submission.
  - **Average answer duration**: Per question across all candidates.
  - **Device breakdown**: Desktop vs mobile vs tablet (from stored user-agent).
  - **Time-of-day heatmap**: When do candidates complete their interviews?
- Use Recharts for all visualisations.
- Date range filter (last 7 days, 30 days, 90 days, custom).

### 6.2 Per-Template Analytics
- On each template detail page, show:
  - Completion rate for that template.
  - Drop-off point (which question do candidates abandon on most?).
  - Average rating of completed candidates.

### 6.3 CSV Export
- "Export" button on submissions page → downloads CSV with:
  - Candidate name, email, template, status, date submitted, average rating, individual question ratings, video URLs.
- Also allow exporting analytics data.

---

## PHASE 7 — Team & Access Management (Foundation for Scale)

### 7.1 Team Members
Create an `organisations` table and `org_members` table:

```
organisations
├── id: uuid (PK)
├── name: text
├── branding_config: jsonb
├── created_at: timestamptz

org_members
├── id: uuid (PK)
├── org_id: uuid (FK → organisations)
├── user_id: uuid (FK → auth.users)
├── role: enum ('owner', 'admin', 'recruiter', 'viewer')
├── invited_at: timestamptz
├── joined_at: timestamptz (nullable)
```

- **Owner**: Full access, can manage billing and delete org.
- **Admin**: Can create templates, invite candidates, review, manage team.
- **Recruiter**: Can create templates, invite candidates, review. Cannot manage team.
- **Viewer**: Can only view submissions and leave ratings. Read-only.

### 7.2 Team Invite Flow
- In Settings > Team, show current members with roles.
- "Invite Team Member" → enter email + select role → sends invite email.
- Invited user signs up / logs in → auto-added to the org.

### 7.3 RLS Migration
- Add `org_id` to `interview_templates`, `submissions`, `submission_answers`, `ratings`, `share_links`.
- Update all RLS policies to scope by `org_id` (user must be a member of the org that owns the resource).
- This is a significant migration — ensure backward compatibility with existing data.

---

## PHASE 8 — Polish & Professional Finish

### 8.1 Loading States
- Add skeleton loaders for:
  - Dashboard template cards.
  - Submissions list.
  - Video player (show thumbnail or placeholder while loading).
  - All data-fetching pages.
- Use shadcn/ui `Skeleton` component.

### 8.2 Empty States
- Every list page needs a designed empty state:
  - Templates: "Create your first interview template" with illustration and CTA.
  - Submissions: "No candidates yet — share your interview link to get started."
  - Ratings: "Be the first to rate this candidate."

### 8.3 Toast Notifications
- Use the existing toast system consistently:
  - Success: template saved, candidate invited, rating submitted.
  - Error: save failed, upload failed, permission denied.
  - Info: interview link copied to clipboard.

### 8.4 Confirmation Modals
- All destructive actions need confirmation:
  - Delete template, delete question, reject candidate, revoke share link.
- Use shadcn/ui `AlertDialog`.

### 8.5 Keyboard Shortcuts
- `Ctrl/Cmd + N`: New template.
- `Ctrl/Cmd + S`: Save current template.
- `→` / `←`: Navigate between candidate answers in review.
- `Space`: Play/pause video.
- `1-5`: Quick-rate candidate.

### 8.6 Responsive Polish
- Test and fix every page at these breakpoints: 375px (phone), 768px (tablet), 1024px (laptop), 1440px (desktop).
- The candidate flow must be flawless on mobile — this is where most candidates will complete interviews.

### 8.7 Performance
- Lazy-load video players (don't load all videos at once in submissions review).
- Paginate submissions list (20 per page with load-more or pagination).
- Add `loading="lazy"` to all images.
- Consider video thumbnail generation (first frame) for faster list rendering.

### 8.8 Security Hardening
- **Make the video storage bucket private.** Generate signed URLs (with 1-hour expiry) server-side for authenticated playback. This is critical — currently anyone with a video URL can view it.
- Add rate limiting on submission creation (prevent spam).
- Sanitise all user inputs (candidate name, email, notes).
- Add CSP headers.
- Ensure no sensitive data in client-side console logs.

---

## DATA MODEL SUMMARY (All New Tables & Columns)

### New Columns on Existing Tables

```sql
-- interview_templates
ALTER TABLE interview_templates ADD COLUMN department text;
ALTER TABLE interview_templates ADD COLUMN intro_video_url text;
ALTER TABLE interview_templates ADD COLUMN deadline timestamptz;
ALTER TABLE interview_templates ADD COLUMN retakes_allowed integer DEFAULT 1;
ALTER TABLE interview_templates ADD COLUMN redirect_url text;
ALTER TABLE interview_templates ADD COLUMN is_deleted boolean DEFAULT false;

-- questions
ALTER TABLE questions ADD COLUMN video_prompt_url text;
ALTER TABLE questions ADD COLUMN description text;
ALTER TABLE questions ADD COLUMN is_required boolean DEFAULT true;
ALTER TABLE questions ADD COLUMN is_deleted boolean DEFAULT false;

-- submissions
ALTER TABLE submissions ADD COLUMN user_agent text;
ALTER TABLE submissions ADD COLUMN started_at timestamptz;
ALTER TABLE submissions ADD COLUMN completed_at timestamptz;
ALTER TABLE submissions ADD COLUMN invited_by uuid REFERENCES auth.users;
```

### New Tables

```sql
CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES submissions ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES auth.users,
  reviewer_name text, -- for anonymous share-link reviewers
  star_rating integer CHECK (star_rating BETWEEN 1 AND 5) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES submissions ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users NOT NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  timezone text DEFAULT 'Europe/London',
  branding_config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organisations ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  role text CHECK (role IN ('owner', 'admin', 'recruiter', 'viewer')) NOT NULL,
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  UNIQUE (org_id, user_id)
);

CREATE TABLE email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  template_name text NOT NULL,
  subject text,
  status text DEFAULT 'sent',
  metadata jsonb DEFAULT '{}',
  sent_at timestamptz DEFAULT now()
);
```

### New Routes

| Path | Component | Auth |
|------|-----------|------|
| `/admin/templates` | TemplatesList | Admin |
| `/admin/analytics` | AnalyticsDashboard | Admin |
| `/admin/settings` | Settings (tabs: General, Branding, Team, Notifications) | Admin |
| `/review/:token` | ShareLinkReview | Public (token-validated) |

---

## QUALITY BENCHMARKS

Before each phase is considered complete, verify:

1. **No console errors** on any page.
2. **Mobile responsive** — test at 375px width.
3. **Loading states** — no blank screens during data fetching.
4. **Error states** — graceful handling of network failures.
5. **Accessibility** — keyboard navigable, proper ARIA labels, sufficient contrast.
6. **Consistent UI** — all new elements use shadcn/ui components and the existing design system.
7. **Data integrity** — RLS policies correctly scope all new tables.

---

*Build this in phases. Confirm completion of each phase before starting the next. World-class means every detail matters.*
