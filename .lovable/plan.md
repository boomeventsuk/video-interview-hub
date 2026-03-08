

# InterviewPro -- Complete Technical Export

---

## 1. PROJECT STRUCTURE

### File/Folder Tree

```text
/
├── .env                          # Auto-generated environment variables
├── .gitignore
├── .lovable/plan.md              # Lovable project plan
├── bun.lock / bun.lockb
├── components.json               # shadcn/ui config
├── eslint.config.js
├── index.html                    # Vite HTML entry
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.ts            # Tailwind theme + plugins
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts                # Vite config (port 8080, @/ alias)
├── vitest.config.ts
├── public/
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── supabase/
│   ├── config.toml               # project_id = "imqqdrkrxvmuovqjjscl"
│   └── migrations/
│       ├── 20260211212151_..sql   # Full schema creation
│       └── 20260211212200_..sql   # Tightened RLS policies
└── src/
    ├── main.tsx                   # React root mount
    ├── App.tsx                    # Router + providers
    ├── App.css                    # (empty/unused)
    ├── index.css                  # Tailwind + CSS variables + custom classes
    ├── vite-env.d.ts
    ├── components/
    │   ├── AdminLayout.tsx        # Sidebar layout shell
    │   ├── NavLink.tsx            # Wrapper around react-router NavLink
    │   ├── ProtectedRoute.tsx     # Auth + admin role guard
    │   └── ui/                    # ~40 shadcn/ui primitives (button, input, dialog, etc.)
    ├── hooks/
    │   ├── useAuth.ts             # Auth state + signIn/signUp/signOut
    │   ├── use-mobile.tsx         # Mobile breakpoint hook
    │   └── use-toast.ts           # Toast hook
    ├── integrations/supabase/
    │   ├── client.ts              # Auto-generated Supabase client
    │   └── types.ts               # Auto-generated DB types
    ├── lib/
    │   ├── utils.ts               # cn() helper
    │   └── supabase-helpers.ts    # checkIsAdmin(), getCurrentUser()
    ├── pages/
    │   ├── Index.tsx              # Public landing page
    │   ├── Login.tsx              # Auth form (sign in / sign up)
    │   ├── AdminDashboard.tsx     # Template list + stats
    │   ├── TemplateBuilder.tsx    # Create/edit interview templates
    │   ├── SubmissionsReview.tsx  # Review candidate submissions
    │   ├── Interview.tsx          # Candidate-facing recording flow
    │   └── NotFound.tsx           # 404 page
    └── test/
        ├── setup.ts
        └── example.test.ts
```

### Routes

| Path | Component | Auth Required |
|---|---|---|
| `/` | `Index` | No |
| `/login` | `Login` | No |
| `/admin` | `AdminDashboard` (wrapped in `ProtectedRoute`) | Admin |
| `/admin/templates/:id` | `TemplateBuilder` (wrapped in `ProtectedRoute`) | Admin |
| `/admin/submissions` | `SubmissionsReview` (wrapped in `ProtectedRoute`) | Admin |
| `/interview/:templateId` | `Interview` | No (public) |
| `*` | `NotFound` | No |

### Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

Backend secrets (available in edge functions):
- `LOVABLE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

---

## 2. DATA MODEL

### Database Tables

#### `user_roles`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (PK) | No | `gen_random_uuid()` |
| `user_id` | uuid (FK -> auth.users) | No | -- |
| `role` | enum `app_role` ('admin','user') | No | -- |
- Unique constraint on `(user_id, role)`

#### `profiles`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (PK) | No | `gen_random_uuid()` |
| `user_id` | uuid (FK -> auth.users, UNIQUE) | No | -- |
| `email` | text | No | -- |
| `full_name` | text | Yes | -- |
| `created_at` | timestamptz | No | `now()` |
- Auto-populated via trigger `on_auth_user_created` -> `handle_new_user()`

#### `interview_templates`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (PK) | No | `gen_random_uuid()` |
| `admin_id` | uuid (FK -> auth.users) | No | -- |
| `title` | text | No | -- |
| `description` | text | Yes | `''` |
| `is_active` | boolean | No | `true` |
| `created_at` | timestamptz | No | `now()` |
| `updated_at` | timestamptz | No | `now()` (auto-updated via trigger) |

#### `questions`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (PK) | No | `gen_random_uuid()` |
| `template_id` | uuid (FK -> interview_templates, CASCADE) | No | -- |
| `question_text` | text | No | -- |
| `order_index` | integer | No | `0` |
| `prep_time_seconds` | integer | No | `30` |
| `recording_duration_seconds` | integer | No | `120` |
| `created_at` | timestamptz | No | `now()` |

#### `submissions`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (PK) | No | `gen_random_uuid()` |
| `template_id` | uuid (FK -> interview_templates, CASCADE) | No | -- |
| `applicant_name` | text | No | -- |
| `applicant_email` | text | No | -- |
| `status` | text | No | `'new'` |
| `created_at` | timestamptz | No | `now()` |
| `updated_at` | timestamptz | No | `now()` (auto-updated via trigger) |

#### `submission_answers`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (PK) | No | `gen_random_uuid()` |
| `submission_id` | uuid (FK -> submissions, CASCADE) | No | -- |
| `question_id` | uuid (FK -> questions, CASCADE) | No | -- |
| `video_url` | text | Yes | -- |
| `created_at` | timestamptz | No | `now()` |

### RLS Policies Summary

| Table | Policy | Command | Role | Logic |
|---|---|---|---|---|
| `user_roles` | Admins can view roles | SELECT | authenticated | `has_role(auth.uid(), 'admin')` |
| `profiles` | Users can view own profile | SELECT | authenticated | `auth.uid() = user_id` |
| `profiles` | Users can update own profile | UPDATE | authenticated | `auth.uid() = user_id` |
| `interview_templates` | Admins manage templates | ALL | authenticated | `has_role(auth.uid(), 'admin')` |
| `interview_templates` | Public can view active templates | SELECT | anon | `is_active = true` |
| `questions` | Admins manage questions | ALL | authenticated | `has_role(auth.uid(), 'admin')` |
| `questions` | Public can view questions | SELECT | anon | template is active |
| `submissions` | Public can create submissions | INSERT | anon | name/email not empty + template active |
| `submissions` | Admins can view submissions | SELECT | authenticated | `has_role(auth.uid(), 'admin')` |
| `submissions` | Admins can update submissions | UPDATE | authenticated | `has_role(auth.uid(), 'admin')` |
| `submission_answers` | Public can create answers | INSERT | anon | submission exists |
| `submission_answers` | Admins can view answers | SELECT | authenticated | `has_role(auth.uid(), 'admin')` |

### Storage Buckets

| Bucket | Public | Policies |
|---|---|---|
| `interview-videos` | Yes | Anyone can upload/view; admins can delete |

### Database Functions

```sql
-- Check if user has a role (SECURITY DEFINER, bypasses RLS)
public.has_role(_user_id uuid, _role app_role) -> boolean

-- Auto-create profile on signup (trigger on auth.users INSERT)
public.handle_new_user() -> trigger

-- Auto-update updated_at column (trigger on templates/submissions UPDATE)
public.update_updated_at_column() -> trigger
```

### TypeScript Interfaces (from page files)

```typescript
// TemplateBuilder.tsx & Interview.tsx
interface Question {
  id: string;
  question_text: string;
  order_index: number;
  prep_time_seconds: number;
  recording_duration_seconds: number;
}

// AdminDashboard.tsx
interface Template {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  question_count: number;
  submission_count: number;
}

// SubmissionsReview.tsx
interface Submission {
  id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  created_at: string;
  template_title: string;
  template_id: string;
}

interface Answer {
  id: string;
  question_text: string;
  video_url: string | null;
}

// Interview.tsx
type Stage = "welcome" | "info" | "prep" | "recording" | "complete";
```

---

## 3. PAGES & COMPONENTS

### `src/pages/Index.tsx` -- Public Landing Page
- **Purpose**: Marketing page with hero section and 3 feature cards
- **Props**: None
- **State**: None
- **API calls**: None
- **Children**: Framer Motion wrappers, Lucide icons, `Link` to `/login`

### `src/pages/Login.tsx` -- Authentication
- **Purpose**: Sign in / sign up form for admin users
- **Props**: None
- **State**: `email`, `password`, `isLoading`, `isSignUp`
- **API calls**: `useAuth().signIn(email, password)`, `useAuth().signUp(email, password)`
- **Children**: `Input`, `Label`, Lucide icons
- **Post-login redirect**: `/admin`

### `src/pages/AdminDashboard.tsx` -- Admin Home
- **Purpose**: Shows stats (template count, submission count, active count) and template cards
- **Props**: None (wrapped in `AdminLayout`)
- **State**: `templates[]`, `totalSubmissions`, `loading`
- **API calls**:
  ```typescript
  supabase.from("interview_templates")
    .select("*, questions(id), submissions(id)")
    .order("created_at", { ascending: false });
  ```
- **Children**: `AdminLayout`, stat cards, template cards with Edit/Share/Review actions

### `src/pages/TemplateBuilder.tsx` -- Create/Edit Templates
- **Purpose**: Form for template title/description/active toggle + drag-reorderable question list
- **Props**: None (uses `useParams().id`)
- **State**: `title`, `description`, `isActive`, `questions[]`, `saving`, `loading`
- **API calls**:
  - Load: `supabase.from("interview_templates").select("*").eq("id", id)`
  - Load questions: `supabase.from("questions").select("*").eq("template_id", id).order("order_index")`
  - Save new: `supabase.from("interview_templates").insert({...}).select("id").single()`
  - Save existing: `supabase.from("interview_templates").update({...}).eq("id", id)`
  - Delete questions: `supabase.from("questions").delete().eq("template_id", id)`
  - Insert questions: `supabase.from("questions").insert(questionRows)`
- **Children**: `AdminLayout`, `Input`, `Textarea`, `Switch`, `Label`, Framer `Reorder.Group`

### `src/pages/SubmissionsReview.tsx` -- Review Submissions
- **Purpose**: Two-panel view: submission list (left) + detail with videos (right)
- **Props**: None (uses `useSearchParams` for `?template=` filter)
- **State**: `submissions[]`, `selected`, `answers[]`, `loading`
- **API calls**:
  - Load: `supabase.from("submissions").select("*, interview_templates(title)").order("created_at", { ascending: false })`
  - Load answers: `supabase.from("submission_answers").select("*, questions(question_text)").eq("submission_id", sub.id)`
  - Update status: `supabase.from("submissions").update({ status }).eq("id", subId)`
- **Children**: `AdminLayout`, `<video>` elements, status `<select>` dropdown

### `src/pages/Interview.tsx` -- Candidate Recording Flow
- **Purpose**: Full candidate-facing interview experience (welcome -> info -> prep -> recording -> complete)
- **Props**: None (uses `useParams().templateId`)
- **State**: `templateTitle`, `templateDesc`, `questions[]`, `loading`, `notFound`, `stage`, `name`, `email`, `currentQ`, `timer`, `submissionId`
- **Refs**: `videoRef` (HTMLVideoElement), `mediaRecorderRef`, `chunksRef` (Blob[]), `streamRef` (MediaStream), `timerRef`
- **API calls**:
  - Load template: `supabase.from("interview_templates").select("*").eq("id", templateId).eq("is_active", true).maybeSingle()`
  - Load questions: `supabase.from("questions").select("*").eq("template_id", templateId).order("order_index")`
  - Create submission: `supabase.from("submissions").insert({...}).select("id").single()`
  - Upload video: `supabase.storage.from("interview-videos").upload(fileName, blob)`
  - Get public URL: `supabase.storage.from("interview-videos").getPublicUrl(fileName)`
  - Save answer: `supabase.from("submission_answers").insert({...})`
- **Children**: `Input`, `Label`, `ProgressRing` (inline SVG component), Framer `AnimatePresence`

### `src/components/ProtectedRoute.tsx` -- Route Guard
- **Purpose**: Checks auth state + admin role, redirects to `/login` or shows "Access Denied"
- **Props**: `{ children: React.ReactNode }`
- **State**: `isAdmin: boolean | null`
- **API calls**: `checkIsAdmin()` (calls `supabase.rpc('has_role', {...})`)

### `src/components/AdminLayout.tsx` -- Admin Shell
- **Purpose**: Collapsible sidebar with nav links + sign out + main content area
- **Props**: `{ children: React.ReactNode }`
- **State**: `collapsed: boolean`
- **Nav items**: Dashboard (`/admin`), Templates (`/admin/templates`), Submissions (`/admin/submissions`)

### `src/components/NavLink.tsx` -- NavLink Wrapper
- **Purpose**: Thin wrapper around react-router's `NavLink` with `activeClassName` support
- **Props**: `className`, `activeClassName`, `pendingClassName`, standard NavLink props

### `src/hooks/useAuth.ts` -- Auth Hook
```typescript
export function useAuth() {
  // Returns: { user, session, loading, signIn, signUp, signOut }
  // Uses supabase.auth.onAuthStateChange + supabase.auth.getSession
  // signIn: supabase.auth.signInWithPassword
  // signUp: supabase.auth.signUp (with emailRedirectTo)
  // signOut: supabase.auth.signOut
}
```

### `src/lib/supabase-helpers.ts` -- Admin Check
```typescript
export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });
  return !!data;
}
```

---

## 4. API & BACKEND

### Supabase Queries (all client-side via `@supabase/supabase-js`)

| Operation | Table | Method | Where Used |
|---|---|---|---|
| SELECT templates + joins | `interview_templates` | `.select("*, questions(id), submissions(id)")` | AdminDashboard |
| SELECT single template | `interview_templates` | `.select("*").eq("id", id)` | TemplateBuilder, Interview |
| INSERT template | `interview_templates` | `.insert({...}).select("id").single()` | TemplateBuilder |
| UPDATE template | `interview_templates` | `.update({...}).eq("id", id)` | TemplateBuilder |
| SELECT questions | `questions` | `.select("*").eq("template_id", id).order("order_index")` | TemplateBuilder, Interview |
| DELETE questions | `questions` | `.delete().eq("template_id", id)` | TemplateBuilder |
| INSERT questions | `questions` | `.insert(questionRows)` | TemplateBuilder |
| INSERT submission | `submissions` | `.insert({...}).select("id").single()` | Interview |
| SELECT submissions | `submissions` | `.select("*, interview_templates(title)")` | SubmissionsReview |
| UPDATE submission status | `submissions` | `.update({ status }).eq("id", subId)` | SubmissionsReview |
| INSERT answer | `submission_answers` | `.insert({...})` | Interview |
| SELECT answers | `submission_answers` | `.select("*, questions(question_text)").eq("submission_id", id)` | SubmissionsReview |
| UPLOAD video | `storage/interview-videos` | `.upload(fileName, blob)` | Interview |
| GET public URL | `storage/interview-videos` | `.getPublicUrl(fileName)` | Interview |
| RPC has_role | `user_roles` | `.rpc('has_role', {...})` | supabase-helpers |

### Authentication Flow
1. **Sign up**: `supabase.auth.signUp({ email, password })` -- sends confirmation email (email auto-confirm is OFF)
2. **Sign in**: `supabase.auth.signInWithPassword({ email, password })`
3. **Session persistence**: localStorage, auto-refresh enabled
4. **Auth state**: `supabase.auth.onAuthStateChange` in `useAuth` hook
5. **Admin check**: `has_role` RPC (SECURITY DEFINER function)
6. **Sign out**: `supabase.auth.signOut()`
7. **No password reset flow implemented**
8. **No OAuth implemented**

### Edge Functions
**None exist yet.** There are no files under `supabase/functions/`.

---

## 5. BUSINESS LOGIC

### Interview Creation Flow
1. Admin logs in at `/login`
2. Navigates to `/admin` dashboard
3. Clicks "New Template" -> goes to `/admin/templates/new`
4. Fills in title, description, active toggle
5. Adds questions with prep time (seconds) and recording duration (seconds)
6. Drag-reorders questions via Framer Motion `Reorder`
7. Clicks "Save Template" -> inserts template + questions to DB
8. Copies shareable link: `{origin}/interview/{templateId}`

### Candidate Interview Flow
1. Candidate opens `/interview/{templateId}`
2. Sees welcome screen with template title, description, question count
3. Clicks "Begin Interview" -> enters name + email
4. Clicks "Start Interview" -> creates `submissions` row, requests camera/mic access
5. **For each question**:
   - **Prep phase**: Shows question text, countdown timer (configurable per question), camera preview
   - **Recording phase**: MediaRecorder captures `video/webm`, countdown timer, "REC" indicator, "Finish Early" button
   - On recording stop: Blob uploaded to `interview-videos/{submissionId}/{questionId}.webm`, public URL saved to `submission_answers`
6. After final question -> "Interview Complete" screen

### Video Recording Implementation
```typescript
// Camera access
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

// Recording
const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
mr.ondataavailable = (e) => chunks.push(e.data);
mr.onstop = () => {
  const blob = new Blob(chunks, { type: "video/webm" });
  // Upload to Supabase Storage
  supabase.storage.from("interview-videos").upload(fileName, blob);
};
mr.start();

// Auto-stop via setInterval countdown
// Manual stop via "Finish Early" button -> mr.stop()
```

### Video Storage & Retrieval
- **Storage**: Supabase Storage bucket `interview-videos` (public)
- **Path pattern**: `{submissionId}/{questionId}.webm`
- **Retrieval**: `supabase.storage.from("interview-videos").getPublicUrl(path)` -> stored in `submission_answers.video_url`
- **Playback**: Native `<video>` element with `controls` attribute in SubmissionsReview

### Ratings/Reviews
- Status-based workflow only: `new` -> `reviewed` -> `shortlisted` / `rejected`
- Changed via `<select>` dropdown on submission detail panel
- **No scoring, no comments, no AI analysis implemented**

### Team Collaboration
- **Not implemented.** Single admin model. All admins see all templates/submissions via RLS.

### Notifications/Emails
- **Not implemented.** No email notifications to candidates or admins. Only Supabase Auth's built-in confirmation email on signup.

---

## 6. STYLING & BRANDING

### CSS Framework
- **Tailwind CSS v3.4** with `tailwindcss-animate` plugin
- **shadcn/ui** component library (~40 components in `src/components/ui/`)

### Theme / Design Tokens (CSS Variables)

| Token | HSL Value | Description |
|---|---|---|
| `--background` | `228 25% 8%` | Dark background |
| `--foreground` | `220 20% 95%` | Light text |
| `--primary` | `250 85% 65%` | Purple/violet |
| `--accent` | `200 90% 55%` | Blue/cyan |
| `--destructive` | `0 75% 55%` | Red |
| `--success` | `150 70% 45%` | Green |
| `--warning` | `38 90% 55%` | Amber |
| `--radius` | `0.75rem` | Border radius base |

### Fonts
- **Body**: Inter (300-800 weights)
- **Headings/Display**: Space Grotesk (400-700 weights)
- Loaded via Google Fonts CDN in `index.css`

### Custom Utility Classes
- `.glass-card` -- Glassmorphism card (blur + translucent bg + glow shadow)
- `.glass-card-hover` -- Glass card with hover lift + glow
- `.gradient-text` -- Primary-to-accent gradient text
- `.gradient-border` -- Gradient border via CSS mask
- `.glow-button` -- Gradient button with glow shadow
- `.mesh-gradient` -- Multi-radial gradient background
- `.stat-glow` -- Glowing text shadow for stats
- `.animate-float` -- Floating animation (6s loop)

### Responsive Breakpoints
Standard Tailwind: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1400px container)

### Branding Customization
- **Not implemented.** Hardcoded "InterviewPro" brand name. No white-labeling or tenant customization.

---

## 7. INTEGRATIONS & THIRD-PARTY SERVICES

| Service | Purpose | Integration |
|---|---|---|
| **Supabase** (via Lovable Cloud) | Database, Auth, Storage, RLS | `@supabase/supabase-js` v2.95 |
| **Google Fonts CDN** | Inter + Space Grotesk fonts | CSS `@import` |
| **Browser MediaRecorder API** | Video recording | Native `navigator.mediaDevices.getUserMedia` + `MediaRecorder` |
| **Framer Motion** | Animations/transitions | `framer-motion` v12 |

**No other external APIs, SDKs, or services are integrated.**

---

## 8. CURRENT STATE & KNOWN GAPS

### Fully Working
- Admin authentication (email/password sign in + sign up with email verification)
- Admin role-based access control via `has_role` RPC
- Interview template CRUD (create, edit, delete questions, reorder, activate/deactivate)
- Shareable interview links
- Candidate info capture (name + email)
- Timed prep + recording flow with camera preview
- Video recording (WebM) and upload to storage
- Video playback in submission review
- Submission status workflow (new/reviewed/shortlisted/rejected)
- Collapsible admin sidebar navigation
- Dark glassmorphism UI theme

### Partially Built
- **Landing page**: Basic hero + 3 feature cards, no pricing/social proof/testimonials
- **Submissions filtering**: Only `?template=` query param filter, no search/sort/date filter

### Placeholder/Stubbed
- None

### Completely Missing
- **AI video analysis** (planned with Gemini 2.5 Flash, not yet built)
- **Job specification field** on templates (discussed, not implemented)
- **Password reset flow**
- **OAuth providers** (Google, etc.)
- **Email notifications** (candidate confirmation, admin alerts)
- **Team collaboration** (multiple admins, workspaces, roles beyond admin/user)
- **Template deletion** (no delete button in UI)
- **Candidate retake/re-record** ability
- **Mobile-responsive admin sidebar** (fixed sidebar, no hamburger menu on mobile)
- **Loading skeletons** (uses plain "Loading..." text)
- **Error boundaries**
- **Search/sort on submissions list**
- **Analytics/reporting dashboard**
- **Branding/white-labeling**
- **Edge functions** (none exist)
- **Rate limiting** on public interview endpoints
- **GDPR/data retention** controls

### Known Issues
- Admin sidebar nav item "Templates" links to `/admin/templates` which has no dedicated page (would 404; only `/admin/templates/:id` exists)
- Questions are deleted and re-inserted on save (loses original UUIDs, could break existing `submission_answers` FK references if answers exist)
- No validation that candidate email is a real email (just HTML `type="email"`)
- No maximum file size check on video uploads
- MediaRecorder `mimeType: "video/webm"` may not be supported on Safari/iOS (no fallback)
- No cleanup of orphaned videos in storage if interview is abandoned mid-flow

