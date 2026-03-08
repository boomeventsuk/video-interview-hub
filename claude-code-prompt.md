# InterviewPro → Hireflix Parity — Claude Code Implementation Brief

> **Context:** I'm building a one-way video interview platform called InterviewPro using Lovable (React + Supabase + Tailwind/shadcn). The goal is feature parity with Hireflix. Below is the gap analysis I've already scored, followed by the full technical export. I need you to implement the fixes and features in priority order.

---

## GAP ANALYSIS — Scored Against Hireflix

### 3.1 Core Infrastructure

| # | Requirement | Score | Notes |
|---|------------|-------|-------|
| 1 | Authentication (email + password, OAuth) | 🟡 | Email/password works. No OAuth, no password reset, no magic links. |
| 2 | Multi-tenant organisation model | ❌ | Single-admin model only. No org/team structure. All admins share one flat space. |
| 3 | Role-based access (Admin, Recruiter, Viewer) | 🟡 | Only `admin` and `user` roles exist. No recruiter or viewer distinction. |
| 4 | Responsive design (mobile-first) | 🟡 | Candidate flow is responsive. Admin sidebar breaks on mobile (known issue). |
| 5 | Database schema (positions, questions, interviews, answers, ratings) | 🟡 | Core tables exist (templates, questions, submissions, answers). No ratings table, no team/org tables. |

### 3.2 Position / Interview Builder

| # | Requirement | Score | Notes |
|---|------------|-------|-------|
| 6 | Create position with title, description, department | 🟡 | Title + description exist. No department field. |
| 7 | Add/reorder/delete questions | ✅ | Drag-reorder with Framer Motion. Delete works. |
| 8 | Record video question prompts | ❌ | Text-only questions. No recruiter video recording. |
| 9 | Text-only question option | ✅ | This is all that exists currently. |
| 10 | Set think time per question | ✅ | `prep_time_seconds` field, default 30s. |
| 11 | Set max answer duration per question | ✅ | `recording_duration_seconds` field, default 120s. |
| 12 | Allow/disallow retakes | ❌ | No retake setting or functionality. |
| 13 | Set interview deadline/expiry | ❌ | No deadline/expiry field or enforcement. |
| 14 | Record/upload intro video | ❌ | No intro/welcome video feature. |
| 15 | Preview interview as candidate | ❌ | No preview mode — admin must open the public link. |
| 16 | Save as template for reuse | 🟡 | Templates exist but no "duplicate template" or template library. |

### 3.3 Candidate Invitation

| # | Requirement | Score | Notes |
|---|------------|-------|-------|
| 17 | Manual invite (name + email) | ❌ | No invite system. Candidate self-enters name/email on the interview page. |
| 18 | Bulk invite (CSV upload) | ❌ | Not implemented. |
| 19 | Public shareable link | ✅ | `/interview/:templateId` works as public link. |
| 20 | Email invite templates (customisable) | ❌ | No email system at all. |
| 21 | SMS invites | ❌ | Not implemented. |
| 22 | Automated reminders | ❌ | Not implemented. |
| 23 | Candidate status tracking | 🟡 | Status field exists (`new` → `reviewed` → `shortlisted`/`rejected`). No real-time dashboard tracking of invited/started/completed/expired. |

### 3.4 Candidate Recording Experience

| # | Requirement | Score | Notes |
|---|------------|-------|-------|
| 24 | No login required for candidates | ✅ | Anon access via RLS. Candidates just enter name + email. |
| 25 | Device/browser check (camera + mic) | 🟡 | getUserMedia is called but no explicit setup/test screen. |
| 26 | In-browser video recording (MediaRecorder API) | ✅ | Working with video/webm. |
| 27 | Think time countdown display | ✅ | Prep stage with countdown timer. |
| 28 | Recording timer (elapsed + remaining) | 🟡 | Timer exists but unclear if it shows both elapsed AND remaining. |
| 29 | Retake functionality | ❌ | Not implemented. |
| 30 | Progress indicator (question X of Y) | 🟡 | Needs verification — likely partial. |
| 31 | Completion confirmation screen | ✅ | "Complete" stage exists in the flow. |
| 32 | Mobile-responsive recording | 🟡 | Should work but no Safari/iOS fallback (known issue). |
| 33 | Graceful error handling (connection loss, camera fail) | ❌ | No error recovery flows. |

### 3.5 Review & Collaboration

| # | Requirement | Score | Notes |
|---|------------|-------|-------|
| 34 | Video playback (per answer) | ✅ | Native `<video>` elements in SubmissionsReview. |
| 35 | Playback speed (1x, 1.5x, 2x) | ❌ | Not implemented. |
| 36 | Auto-generated transcripts | ❌ | Not implemented. |
| 37 | Star rating system | ❌ | No ratings table or UI. |
| 38 | Written notes/comments | ❌ | No notes field or UI. |
| 39 | Multiple reviewers per candidate | ❌ | No team/reviewer model. |
| 40 | Share interview via secure link (no login) | ❌ | No share-link generation for reviewers. |
| 41 | Filter/sort candidates (by rating, status, date) | ❌ | Listed as missing in export. Basic list only. |
| 42 | Shortlist / reject workflow | 🟡 | Status dropdown exists (new → reviewed → shortlisted/rejected). No bulk actions. |
| 43 | Side-by-side candidate comparison | ❌ | Not implemented. |

### 3.6 Branding & Customisation

| # | Requirement | Score | Notes |
|---|------------|-------|-------|
| 44 | Custom logo on candidate-facing pages | ❌ | Hardcoded branding. |
| 45 | Custom colour scheme | ❌ | Fixed dark theme. |
| 46 | Custom domain (CNAME) | ❌ | Not applicable at this stage. |
| 47 | Branded email templates | ❌ | No email system. |
| 48 | Custom redirect URL after completion | ❌ | Not implemented. |
| 49 | Multi-language support | ❌ | English only. |

### 3.7 Analytics & Reporting

| # | Requirement | Score | Notes |
|---|------------|-------|-------|
| 50 | Interview completion rates | ❌ | Only raw submission count shown. |
| 51 | Average response times | ❌ | Not tracked. |
| 52 | Candidate funnel metrics | ❌ | No funnel tracking. |
| 53 | Export data (CSV) | ❌ | Not implemented. |

### 3.8 Integrations & API

| # | Requirement | Score | Notes |
|---|------------|-------|-------|
| 54 | REST or GraphQL API | ❌ | No external API. Direct Supabase client calls only. |
| 55 | Webhook notifications | ❌ | Not implemented. |
| 56 | Zapier/Make integration | ❌ | Not implemented. |
| 57 | ATS integrations | ❌ | Not implemented. |
| 58 | Embeddable interview widget | ❌ | Not implemented. |

---

## SCORE SUMMARY

| Rating | Count | Percentage |
|--------|-------|-----------|
| ✅ Done | 10 | 17% |
| 🟡 Partial | 13 | 22% |
| ❌ Missing | 35 | 60% |

**Current build maturity: ~28% of Hireflix feature parity.**

The good news: the hardest part (video recording + Supabase auth + basic CRUD) is working. The gaps are mostly features that build on top of this foundation.

---

## KNOWN BUGS TO FIX FIRST

These are from the export's "Known Issues" section — fix before adding features:

1. **`/admin/templates` route 404s** — only `/admin/templates/:id` exists. Need a templates list page or redirect.
2. **Questions re-inserted on save** — delete-then-reinsert breaks FK references if answers already exist. Must upsert instead.
3. **No Safari/iOS MediaRecorder fallback** — Safari support is critical for mobile candidates. Need polyfill or fallback.
4. **No video file size limits** — candidates could upload enormous files. Add client-side size check.
5. **No orphaned video cleanup** — abandoned interviews leave orphan blobs in storage.
6. **Mobile admin sidebar broken** — needs responsive drawer/overlay.

---

## PRIORITISED IMPLEMENTATION ROADMAP

### P0 — Fix Bugs + Launch Blockers
*Do these first. Nothing else matters if these are broken.*

| Task | Items | Complexity |
|------|-------|-----------|
| Fix /admin/templates route | #bug1 | S |
| Fix question upsert logic | #bug2 | M |
| Add Safari/iOS recording fallback | #bug3 | M |
| Add video file size limits | #bug4 | S |
| Fix mobile admin sidebar | #bug6 | S |
| Add device/browser check screen before recording | #25 | M |
| Add proper error handling for camera/connection failures | #33 | M |
| Add clear progress indicator (question X of Y) | #30 | S |
| Verify recording timer shows elapsed + remaining | #28 | S |

### P1 — Core Value Features
*What makes it actually useful for hiring.*

| Task | Items | Complexity |
|------|-------|-----------|
| **Ratings & notes** — add `ratings` table (star 1-5 + text note + reviewer_id per submission), build rating UI in SubmissionsReview | #37, #38 | M |
| **Candidate filtering & sorting** — filter by status, sort by date/rating in SubmissionsReview | #41 | M |
| **Retake functionality** — add `retakes_allowed` (int) to templates, implement retake button in candidate flow | #12, #29 | M |
| **Playback speed control** — add 1x/1.5x/2x buttons to video player | #35 | S |
| **Share interview link** — generate secure token-based URL that shows a read-only view of a candidate's submission (no login required) | #40 | M |
| **Interview deadline/expiry** — add `deadline` field to templates, enforce in candidate flow, show expired status | #13 | S |
| **Department field** — add to interview_templates schema and builder UI | #6 | S |
| **Custom redirect URL** — add `redirect_url` field to templates, redirect candidate after completion | #48 | S |
| **Duplicate template** — add "Duplicate" action to template cards | #16 | S |

### P2 — Competitive Parity
*Matching what Hireflix offers.*

| Task | Items | Complexity |
|------|-------|-----------|
| **Email invitation system** — Supabase edge function + Resend/Postmark for sending invite emails with branded templates | #17, #20, #22 | L |
| **Bulk invite (CSV)** — upload CSV of candidates, create submissions, send emails | #18 | M |
| **Intro/welcome video** — add optional video upload to template builder, show before questions | #14 | M |
| **Video question prompts** — allow recruiter to record video per question (reuse MediaRecorder logic) | #8 | M |
| **Auto-transcription** — Supabase edge function calling Whisper API or Deepgram on upload | #36 | L |
| **Analytics dashboard** — completion rates, avg response times, funnel metrics | #50, #51, #52 | L |
| **CSV export** — export submission data as CSV | #53 | S |
| **Preview mode** — let admin preview interview as if they were a candidate | #15 | M |
| **Branding** — logo upload, colour picker, apply to candidate-facing pages | #44, #45 | M |
| **Password reset + OAuth** — Supabase auth supports both, just needs UI | #1 | M |
| **Multiple reviewers** — extend ratings to support multiple team members reviewing same candidate | #39 | M |

### P3 — Differentiation
*Where you go beyond Hireflix.*

| Task | Items | Complexity |
|------|-------|-----------|
| **AI candidate insights** — Gemini 2.5 Flash analysis of video answers (sentiment, confidence, key themes) | export mentions this | L |
| **Organisation/team model** — multi-tenant with org → team members → roles (Admin/Recruiter/Viewer) | #2, #3 | L |
| **Side-by-side comparison** — compare two candidates' answers to the same question | #43 | L |
| **Webhook + API** — REST API endpoints for external integrations | #54, #55 | L |
| **Embeddable widget** — iframe/embed code for career pages | #58 | M |
| **Multi-language** — i18n framework for candidate-facing pages | #49 | L |
| **Zapier/Make integration** — trigger on interview completion | #56 | M |

---

## ARCHITECTURAL CONCERNS

1. **Question save strategy is destructive** — deleting and re-inserting questions breaks FK references from existing answers. Switch to upsert: update existing, insert new, delete removed. This is the most urgent fix.

2. **Public storage bucket** — `interview-videos` is public. Anyone with the URL can view any video. For a real product, switch to signed URLs: make the bucket private, generate short-lived signed URLs server-side for authenticated playback.

3. **No org/team model** — currently all admins share the same space. For multi-client use, you'll need an `organisations` table with `org_id` on every major table and RLS scoped by org membership.

4. **Anon insert on submissions** — the RLS allows any anonymous user to create submissions and upload videos. Add rate limiting (Supabase edge function or RLS with IP tracking) to prevent abuse.

5. **No video processing pipeline** — videos are stored as raw webm blobs. For production, consider: transcoding to MP4 (broader playback support), thumbnail generation, and compression.

6. **No cleanup for abandoned sessions** — if a candidate starts but doesn't finish, partial uploads remain forever. Add a scheduled cleanup job.

---

## FULL TECHNICAL EXPORT

Below is the complete codebase export from Lovable for reference:

[PASTE THE CONTENTS OF TECHNICAL_EXPORT.md HERE]

---

## INSTRUCTIONS FOR CLAUDE CODE

1. Start with the **P0 bug fixes** — work through each one, test, confirm working.
2. Then implement **P1 features** in the order listed (ratings first — that's the biggest gap for usability).
3. Address the **architectural concerns** as you encounter them (especially the question upsert fix and video bucket security).
4. For each change, explain what you're doing and why before writing code.
5. After completing each priority tier, give me a summary of what's done and what's next.
6. Flag anything that needs a decision from me before proceeding (e.g., which email provider, which transcription API).
