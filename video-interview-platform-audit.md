# Video Interview Platform — Hireflix Benchmark & Build Audit

> **Purpose:** Use this document to (1) extract everything from the current Lovable build, (2) benchmark against Hireflix's feature set, and (3) generate a prioritised action plan for Claude Code.

---

## Part 1 — Hireflix Platform Architecture (The Benchmark)

### 1.1 Core Data Model

| Entity | Description |
|--------|-------------|
| **Organisation / Account** | Top-level tenant. Holds branding, domain settings, billing, team members. |
| **Team Member** | User within an org. Roles: Admin, Recruiter, Viewer. Unlimited seats on all plans. |
| **Position** | A job opening. Contains: title, department, description, intro video (optional), ordered list of questions, settings (think time, answer time limit, retakes allowed, deadline). Acts as a reusable template. |
| **Question** | Belongs to a Position. Fields: text prompt, optional video prompt (recruiter-recorded), think time (seconds), max answer duration (seconds), order index. |
| **Interview (Candidate Submission)** | Created when a candidate is invited or clicks a public link. Links to a Position. Contains: candidate info (name, email, phone), status (invited / started / completed / expired), submission timestamps, individual answer recordings. |
| **Answer** | Belongs to an Interview. Fields: video recording URL, duration, question reference, transcript (auto-generated). |
| **Rating / Review** | A team member's assessment of an Interview. Fields: star rating (1–5), written notes, reviewer identity. Multiple ratings per interview. |
| **Share Link** | Secure, no-login-required link to view a specific candidate's interview. Used for hiring manager / client review. |

### 1.2 User Flows

#### A. Recruiter Flow

```
1. Sign up / Log in
2. Dashboard → see all Positions (jobs) with candidate counts and statuses
3. Create Position
   a. Add title, department, description
   b. Record or upload intro video (optional welcome message)
   c. Add questions (text + optional video prompt per question)
   d. Set per-question think time and max answer duration
   e. Configure settings: retakes allowed (yes/no/limited), deadline, language
   f. Set branding: logo, colours, custom domain
   g. Save → generates unique interview link + embed code
4. Invite Candidates
   a. Manual: enter name + email → sends email/SMS invite with link
   b. Bulk: CSV upload of candidates
   c. Public link: share on job boards, social media, career page
   d. ATS integration: auto-trigger from applicant tracking system
5. Monitor Progress
   a. Dashboard shows: invited / started / completed / expired counts
   b. Real-time notifications when interviews are completed
6. Review Submissions
   a. Watch videos at 1x, 1.5x, 2x speed
   b. Read auto-generated transcripts
   c. Rate candidate (star rating + notes)
   d. Filter/sort candidates by rating, date, status
   e. Mark as shortlisted / rejected
7. Collaborate
   a. Share interview via secure link (no login required for viewer)
   b. Team members add their own ratings and notes
   c. Side-by-side candidate comparison
8. Export / Integrate
   a. Export candidate data (CSV)
   b. Push status updates to ATS via API/Zapier
```

#### B. Candidate Flow

```
1. Receive invite (email/SMS) or click public link
2. Landing page: see company branding, position title, intro video
3. Click "Start Interview"
4. Device check: camera + microphone permissions, preview
5. For each question:
   a. See question text (and optional recruiter video)
   b. Think time countdown (if configured)
   c. Recording begins — timer shows elapsed / remaining
   d. Submit answer → move to next question
   e. Option to retake (if allowed by recruiter)
6. Final screen: "Interview complete — thank you" confirmation
7. Optional: redirect to custom URL (career page, next steps)
```

**Critical UX points (what makes Hireflix best-in-class):**
- No candidate login or account creation required
- No app download — runs entirely in-browser
- Mobile-responsive (works on phone, tablet, desktop)
- Multi-language support (15+ languages)
- Minimal clicks from link → first answer (≤3 screens)

### 1.3 Pages & Navigation Structure

| Page / Section | Purpose |
|----------------|---------|
| **Dashboard** | Overview of all positions, stats, recent activity |
| **Positions List** | All job openings with status, candidate count, date |
| **Position Detail** | Question builder, settings, invite candidates, view submissions |
| **Candidate List** (per position) | Table/cards of all candidates with status, rating, date |
| **Candidate Detail** | Video player, transcript, rating panel, notes, share button |
| **Interview Preview** | What the candidate will see (test your own interview) |
| **Templates** | Saved question sets for reuse across positions |
| **Team Settings** | Invite/manage team members, roles |
| **Branding Settings** | Logo, colours, custom domain, email templates |
| **Integrations** | ATS connections, API keys, Zapier/Make webhooks |
| **Account / Billing** | Plan, usage stats, payment |
| **Analytics** | Completion rates, average response times, funnel metrics |

### 1.4 Technical Architecture

| Layer | Hireflix Approach |
|-------|-------------------|
| **API** | GraphQL (api.hireflix.com) |
| **Auth** | API key or JWT bearer token |
| **Video Storage** | Cloud-hosted, streamed on demand |
| **Video Recording** | Browser-based (MediaRecorder API) — no plugins |
| **Transcription** | Auto-generated per answer |
| **Notifications** | Email + SMS (customisable templates) |
| **Integrations** | Native: Greenhouse, Lever, Workable, BambooHR, SmartRecruiters, Ashby, JazzHR, Teamtailor, Recruitee, 50skills. Generic: Zapier, Make, API |
| **Custom Domains** | CNAME-based subdomain (e.g., interview.yourcompany.com) |
| **Multi-tenancy** | Organisation-scoped with unlimited team members |

---

## Part 2 — Lovable Extraction Prompt

> **Copy-paste the prompt below into Lovable's chat to extract a full snapshot of your current build.**

---

### PROMPT FOR LOVABLE

```
I need a complete technical export of this project. Please provide ALL of the following in a single markdown document:

1. PROJECT STRUCTURE
   - Full file/folder tree of the entire project
   - List every route/page and what component renders it
   - List all environment variables used

2. DATA MODEL
   - Every database table/collection with all fields, types, and relationships
   - Any Supabase/Firebase schema, RLS policies, or storage buckets
   - All TypeScript/JavaScript interfaces and types

3. PAGES & COMPONENTS
   For every page and major component, list:
   - File path
   - Purpose/description
   - Props it accepts
   - State it manages
   - API calls it makes
   - Child components it renders

4. API & BACKEND
   - All API routes/endpoints (REST or serverless functions)
   - All Supabase queries (select, insert, update, delete)
   - Authentication flow (sign up, log in, password reset, OAuth)
   - Any edge functions or server-side logic

5. BUSINESS LOGIC
   - How interviews are created (full flow)
   - How candidates receive and complete interviews
   - How video recording works (which API/library)
   - How videos are stored and retrieved
   - How ratings/reviews work
   - How team collaboration works
   - How notifications/emails are sent

6. STYLING & BRANDING
   - CSS framework used (Tailwind, etc.)
   - Theme/design tokens (colours, fonts, spacing)
   - Responsive breakpoints
   - Any branding customisation features built

7. INTEGRATIONS & THIRD-PARTY SERVICES
   - List every external service, SDK, or API used
   - Auth provider details
   - Video/media service details
   - Email/notification service details

8. CURRENT STATE & KNOWN GAPS
   - What features are fully working?
   - What features are partially built?
   - What features are placeholder/stubbed?
   - What is completely missing?
   - Any known bugs or issues?

Format the entire output as a single markdown document with clear headers. Include actual code snippets for key logic (video recording, auth, data queries). Be exhaustive — I need to hand this to another developer who has never seen the project.
```

---

## Part 3 — Gap Analysis Framework (for Claude Code)

Once you have the Lovable export, Claude Code should assess the build against each item below. Score each: ✅ Done | 🟡 Partial | ❌ Missing.

### 3.1 Core Infrastructure

| # | Requirement | Hireflix Standard | Score |
|---|------------|-------------------|-------|
| 1 | Authentication (email + password, OAuth) | Full auth with magic links | |
| 2 | Multi-tenant organisation model | Org → team members → positions → interviews | |
| 3 | Role-based access (Admin, Recruiter, Viewer) | Three distinct roles | |
| 4 | Responsive design (mobile-first) | Excellent mobile candidate experience | |
| 5 | Database schema (positions, questions, interviews, answers, ratings) | Normalised relational model | |

### 3.2 Position / Interview Builder

| # | Requirement | Hireflix Standard | Score |
|---|------------|-------------------|-------|
| 6 | Create position with title, description, department | Yes | |
| 7 | Add/reorder/delete questions | Drag-and-drop ordering | |
| 8 | Record video question prompts | In-browser recording | |
| 9 | Text-only question option | Yes | |
| 10 | Set think time per question | Configurable (seconds) | |
| 11 | Set max answer duration per question | Configurable (seconds) | |
| 12 | Allow/disallow retakes | Toggle per position | |
| 13 | Set interview deadline/expiry | Date-based | |
| 14 | Record/upload intro video | Welcome video per position | |
| 15 | Preview interview as candidate | Full preview mode | |
| 16 | Save as template for reuse | Template library | |

### 3.3 Candidate Invitation

| # | Requirement | Hireflix Standard | Score |
|---|------------|-------------------|-------|
| 17 | Manual invite (name + email) | Yes, triggers email | |
| 18 | Bulk invite (CSV upload) | Yes | |
| 19 | Public shareable link | Unique per position | |
| 20 | Email invite templates (customisable) | Branded templates | |
| 21 | SMS invites | Yes | |
| 22 | Automated reminders | Configurable follow-ups | |
| 23 | Candidate status tracking (invited/started/completed/expired) | Real-time dashboard | |

### 3.4 Candidate Recording Experience

| # | Requirement | Hireflix Standard | Score |
|---|------------|-------------------|-------|
| 24 | No login required for candidates | Zero-friction entry | |
| 25 | Device/browser check (camera + mic) | Pre-interview setup screen | |
| 26 | In-browser video recording (MediaRecorder API) | Native browser, no plugins | |
| 27 | Think time countdown display | Visual countdown | |
| 28 | Recording timer (elapsed + remaining) | Dual timer display | |
| 29 | Retake functionality | Per-question retake button | |
| 30 | Progress indicator (question X of Y) | Progress bar | |
| 31 | Completion confirmation screen | Thank-you page + optional redirect | |
| 32 | Mobile-responsive recording | Full mobile support | |
| 33 | Graceful error handling (connection loss, camera fail) | Recovery flows | |

### 3.5 Review & Collaboration

| # | Requirement | Hireflix Standard | Score |
|---|------------|-------------------|-------|
| 34 | Video playback (per answer) | Inline player | |
| 35 | Playback speed (1x, 1.5x, 2x) | Yes | |
| 36 | Auto-generated transcripts | Per answer | |
| 37 | Star rating system | 1–5 stars per interview | |
| 38 | Written notes/comments | Per interview | |
| 39 | Multiple reviewers per candidate | Unlimited team ratings | |
| 40 | Share interview via secure link (no login) | One-click share link | |
| 41 | Filter/sort candidates (by rating, status, date) | Full filtering | |
| 42 | Shortlist / reject workflow | Status progression | |
| 43 | Side-by-side candidate comparison | Visual comparison | |

### 3.6 Branding & Customisation

| # | Requirement | Hireflix Standard | Score |
|---|------------|-------------------|-------|
| 44 | Custom logo on candidate-facing pages | Yes | |
| 45 | Custom colour scheme | Brand colours | |
| 46 | Custom domain (CNAME) | interview.yourcompany.com | |
| 47 | Branded email templates | Customisable | |
| 48 | Custom redirect URL after completion | Configurable | |
| 49 | Multi-language support | 15+ languages | |

### 3.7 Analytics & Reporting

| # | Requirement | Hireflix Standard | Score |
|---|------------|-------------------|-------|
| 50 | Interview completion rates | Per position | |
| 51 | Average response times | Per question | |
| 52 | Candidate funnel metrics | Invited → started → completed | |
| 53 | Export data (CSV) | Full export | |

### 3.8 Integrations & API

| # | Requirement | Hireflix Standard | Score |
|---|------------|-------------------|-------|
| 54 | REST or GraphQL API | GraphQL | |
| 55 | Webhook notifications | On interview completion | |
| 56 | Zapier/Make integration | Yes | |
| 57 | ATS integrations (at least webhook-based) | 10+ native integrations | |
| 58 | Embeddable interview widget | Embed code for career pages | |

---

## Part 4 — Claude Code Action Plan Template

Once the Lovable export is pasted and scored against Part 3, use this structure to build the implementation plan:

### Priority Tiers

**P0 — Launch Blockers (must work before any user touches it)**
- Authentication and org setup
- Position/question builder (at least text questions)
- Candidate recording flow (camera, timer, submission)
- Video storage and playback
- Basic candidate list with status tracking

**P1 — Core Value (what makes it useful, not just functional)**
- Rating and notes system
- Team collaboration (share links, multiple reviewers)
- Email invitations with templates
- Candidate filtering and sorting
- Transcription (can use Whisper API or similar)

**P2 — Competitive Parity (matching Hireflix's standard)**
- Video question prompts (recruiter records questions)
- Bulk invite via CSV
- Public interview links
- Analytics dashboard
- Branding customisation (logo, colours)
- Playback speed control
- Template library

**P3 — Differentiation (where you beat Hireflix)**
- AI-powered candidate insights / summary
- Sentiment analysis on answers
- Custom scoring rubrics (beyond star ratings)
- Interview scheduling integration
- Advanced analytics with benchmarking
- White-label / multi-tenant SaaS model

### Claude Code Assessment Prompt

```
I'm building a one-way video interview platform (like Hireflix) using Lovable.
Below is the full technical export of my current build.

Please:
1. Read through the entire codebase export
2. Score each item in the Gap Analysis (Part 3 of the benchmark document) as ✅ Done, 🟡 Partial, or ❌ Missing
3. For each ❌ or 🟡 item, provide:
   - What specifically is missing or incomplete
   - The technical approach to implement it
   - Estimated complexity (S/M/L)
   - Dependencies on other items
4. Generate a prioritised implementation roadmap grouped by P0/P1/P2/P3
5. Flag any architectural issues that would block scaling
6. Identify any security concerns (especially around video storage, auth, data privacy)

Here is the codebase export:

[PASTE LOVABLE EXPORT HERE]
```

---

## Part 5 — Quick Reference: What Good Looks Like

### The 5-Second Test (Candidate Experience)
A candidate should be able to go from clicking a link to recording their first answer in under 60 seconds, with zero account creation, zero downloads, and a clear understanding of what's expected.

### The Recruiter Test
A recruiter should be able to create a position, add 5 questions, and send their first invite in under 5 minutes.

### The Collaboration Test
A hiring manager should be able to watch a candidate's full interview, rate them, and leave notes without creating an account — just by clicking a shared link.

---

*Document generated: 8 March 2026*
*Benchmark source: Hireflix (hireflix.com) — feature analysis from public documentation, reviews, and API docs.*
