

# Video Interview Platform — Futuristic World-Class Design

A sleek, futuristic Hireflix-style platform with glassmorphism, gradient accents, smooth animations, and a premium feel throughout.

## Design Language
- **Dark theme** as default with deep navy/charcoal backgrounds and subtle gradients
- **Glassmorphism** cards with frosted-glass effects and soft borders
- **Neon/gradient accents** — vibrant blue-to-purple gradients for CTAs, progress indicators, and active states
- **Smooth micro-animations** — fade-ins, scale transitions, and subtle parallax effects
- **Modern typography** — clean sans-serif with generous spacing
- **Glowing UI elements** — soft box-shadows and ring effects on interactive elements

## 1. Admin Login
- Centered login card with glassmorphic styling over an animated gradient background
- Email/password auth via Supabase
- Subtle floating particles or mesh gradient animation in the background

## 2. Admin Dashboard
- Sidebar navigation with icon-only collapse mode
- Overview cards showing interview count, total submissions, and recent activity with glowing stat numbers
- Interview template list as sleek cards with gradient borders and hover lift effects
- Quick actions: create new template, copy share link, view submissions

## 3. Interview Template Builder
- Step-by-step builder with a visual progress bar
- Drag-and-drop question reordering
- Each question card shows prep time and recording duration with circular indicators
- Live preview of the applicant experience
- One-click shareable link generation with copy-to-clipboard animation

## 4. Applicant Interview Experience (Public, No Login)
- Full-screen immersive dark UI — no distractions
- Animated welcome screen with interview title and a glowing "Begin" button
- Name/email capture on a minimal, elegant form
- Per-question flow:
  - Question text fades in with a large, animated countdown ring for prep time
  - Webcam preview with a pulsing recording indicator
  - Smooth auto-transition between questions with progress dots
  - Recording timer as a sleek circular progress ring
- Futuristic "Interview Complete" screen with a success animation

## 5. Submission Review (Admin)
- Grid/list view of applicants with avatar placeholders and status badges
- Video player with question text overlay for context
- Status workflow: New → Reviewed → Shortlisted → Rejected with color-coded pill badges
- Filter and sort by date, status, or interview template

## 6. Video Recording & Storage
- Browser-based webcam recording (MediaRecorder API)
- Videos uploaded to Supabase Storage with progress indicator
- Linked to applicant info, interview template, and individual questions

## Backend (Supabase via Lovable Cloud)
- **Auth**: Admin email/password login
- **Database**: Interview templates, questions (with prep/recording times), submissions, applicant info, review statuses
- **Storage**: Video file buckets
- **RLS**: Admin-only for templates/reviews; public insert-only for applicant submissions

