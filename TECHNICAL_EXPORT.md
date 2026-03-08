# InterviewPro — Complete Technical Export

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
    │   └── ui/                    # ~40 shadcn/ui primitives
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

### `src/pages/Index.tsx` — Public Landing Page
- **Purpose**: Marketing page with hero section and 3 feature cards
- **Props**: None
- **State**: None
- **API calls**: None
- **Children**: Framer Motion wrappers, Lucide icons, `Link` to `/login`

### `src/pages/Login.tsx` — Authentication
- **Purpose**: Sign in / sign up form for admin users
- **Props**: None
- **State**: `email`, `password`, `isLoading`, `isSignUp`
- **API calls**: `useAuth().signIn(email, password)`, `useAuth().signUp(email, password)`
- **Children**: `Input`, `Label`, Lucide icons
- **Post-login redirect**: `/admin`

### `src/pages/AdminDashboard.tsx` — Admin Home
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

### `src/pages/TemplateBuilder.tsx` — Create/Edit Templates
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

### `src/pages/SubmissionsReview.tsx` — Review Submissions
- **Purpose**: Two-panel view: submission list (left) + detail with videos (right)
- **Props**: None (uses `useSearchParams` for `?template=` filter)
- **State**: `submissions[]`, `selected`, `answers[]`, `loading`
- **API calls**:
  - Load: `supabase.from("submissions").select("*, interview_templates(title)").order("created_at", { ascending: false })`
  - Load answers: `supabase.from("submission_answers").select("*, questions(question_text)").eq("submission_id", sub.id)`
  - Update status: `supabase.from("submissions").update({ status }).eq("id", subId)`
- **Children**: `AdminLayout`, `<video>` elements, status `<select>` dropdown

### `src/pages/Interview.tsx` — Candidate Recording Flow
- **Purpose**: Full candidate-facing interview experience (welcome → info → prep → recording → complete)
- **Props**: None (uses `useParams().templateId`)
- **State**: `templateTitle`, `templateDesc`, `questions[]`, `loading`, `notFound`, `stage`, `name`, `email`, `currentQ`, `timer`, `submissionId`
- **Refs**: `videoRef`, `mediaRecorderRef`, `chunksRef`, `streamRef`, `timerRef`
- **API calls**: Load template, load questions, create submission, upload video, get public URL, save answer
- **Children**: `Input`, `Label`, `ProgressRing` (inline SVG), Framer `AnimatePresence`

### `src/components/ProtectedRoute.tsx` — Route Guard
- **Purpose**: Checks auth state + admin role, redirects to `/login` or shows "Access Denied"
- **Props**: `{ children: React.ReactNode }`
- **State**: `isAdmin: boolean | null`
- **API calls**: `checkIsAdmin()` → `supabase.rpc('has_role', {...})`

### `src/components/AdminLayout.tsx` — Admin Shell
- **Purpose**: Collapsible sidebar with nav links + sign out + main content area
- **Props**: `{ children: React.ReactNode }`
- **State**: `collapsed: boolean`

### `src/hooks/useAuth.ts` — Auth Hook
```typescript
export function useAuth() {
  // Returns: { user, session, loading, signIn, signUp, signOut }
}
```

### `src/lib/supabase-helpers.ts` — Admin Check
```typescript
export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.rpc('has_role', {
    _user_id: user.id, _role: 'admin'
  });
  return !!data;
}
```

---

## 4. API & BACKEND

### Authentication Flow
1. **Sign up**: `supabase.auth.signUp({ email, password })` — sends confirmation email
2. **Sign in**: `supabase.auth.signInWithPassword({ email, password })`
3. **Session**: localStorage, auto-refresh enabled
4. **Admin check**: `has_role` RPC (SECURITY DEFINER)
5. **Sign out**: `supabase.auth.signOut()`
6. **No password reset or OAuth implemented**

### Edge Functions
**None exist yet.**

---

## 5. BUSINESS LOGIC

### Video Recording Implementation
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
mr.ondataavailable = (e) => chunks.push(e.data);
mr.onstop = () => {
  const blob = new Blob(chunks, { type: "video/webm" });
  supabase.storage.from("interview-videos").upload(fileName, blob);
};
mr.start();
```

### Video Storage
- **Bucket**: `interview-videos` (public)
- **Path**: `{submissionId}/{questionId}.webm`
- **Playback**: Native `<video>` element in SubmissionsReview

### Status Workflow
`new` → `reviewed` → `shortlisted` / `rejected`

### Not Implemented
- AI video analysis, email notifications, team collaboration, password reset, OAuth

---

## 6. STYLING & BRANDING

- **Tailwind CSS v3.4** + `tailwindcss-animate` + **shadcn/ui**
- **Fonts**: Inter (body), Space Grotesk (display) via Google Fonts
- **Theme**: Dark glassmorphism (`--background: 228 25% 8%`, `--primary: 250 85% 65%`, `--accent: 200 90% 55%`)
- **Custom classes**: `.glass-card`, `.gradient-text`, `.glow-button`, `.mesh-gradient`
- **No branding customisation features**

---

## 7. INTEGRATIONS

| Service | Purpose |
|---|---|
| Supabase (Lovable Cloud) | Database, Auth, Storage, RLS |
| Google Fonts CDN | Inter + Space Grotesk |
| Browser MediaRecorder API | Video recording |
| Framer Motion | Animations |

---

## 8. CURRENT STATE & KNOWN GAPS

### Fully Working
- Admin auth + role-based access
- Template CRUD with drag-reorder questions
- Shareable interview links
- Timed prep + recording flow
- Video upload + playback
- Submission status workflow
- Dark glassmorphism theme

### Missing
- AI video analysis (Gemini 2.5 Flash)
- Job specification field
- Password reset / OAuth
- Email notifications
- Template deletion UI
- Mobile admin sidebar
- Loading skeletons
- Search/sort on submissions

### Known Issues
- `/admin/templates` route 404s (only `/admin/templates/:id` exists)
- Questions re-inserted on save (breaks FK if answers exist)
- No Safari/iOS MediaRecorder fallback
- No video file size limits
- No orphaned video cleanup
