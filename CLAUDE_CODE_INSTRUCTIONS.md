# How to Get Claude Code Working on InterviewPro

## Step 1 — Add the planning docs to your repo

Download these 3 files and add them to the root of your repo:

- `IMPLEMENTATION_PLAN.md` — the phased build spec (8 phases)
- `HIREFLIX_BENCHMARK.md` — the Hireflix feature analysis + gap framework
- `GAP_ANALYSIS.md` — the scored 58-item audit of your current build

You can do this via GitHub's web interface (Add file → Upload files) or via terminal:

```bash
cd video-interview-hub
# copy the 3 files into the repo root
git add IMPLEMENTATION_PLAN.md HIREFLIX_BENCHMARK.md GAP_ANALYSIS.md
git commit -m "Add implementation plan, benchmark and gap analysis"
git push origin main
```

## Step 2 — Open Claude Code

Open your terminal and navigate to where you want to work:

```bash
claude
```

## Step 3 — Give Claude Code this prompt

Copy and paste this entire prompt into Claude Code:

---

```
Clone https://github.com/boomeventsuk/video-interview-hub and set up the project.

This is a one-way video interview platform (like Hireflix) built with React, Supabase, Tailwind CSS, and shadcn/ui via Lovable.

There are 3 planning documents in the repo root:
- IMPLEMENTATION_PLAN.md — the phased build spec. This is your primary instruction set.
- GAP_ANALYSIS.md — scored audit showing what's done, partial, and missing.
- HIREFLIX_BENCHMARK.md — the feature target we're building towards.

Your job:
1. Read all 3 documents thoroughly.
2. Read the full codebase to understand the current state.
3. Start with Phase 0 (Critical Bug Fixes) from IMPLEMENTATION_PLAN.md.
4. Work through each fix one at a time. For each:
   - Explain what you're changing and why
   - Make the change
   - Commit with a clear message
5. When Phase 0 is complete, stop and give me a summary before moving to Phase 1.
6. Flag anything that needs a decision from me (e.g., which email provider, API keys, etc.)

Important rules:
- Create a feature branch for each phase (e.g., phase-0-bug-fixes, phase-1-candidate-experience)
- Commit frequently with descriptive messages
- Do NOT modify the Supabase migration files directly — create new migration files for schema changes
- Test that the TypeScript compiles without errors after each change
- Keep the existing shadcn/ui + Tailwind design system — don't introduce new UI frameworks
```

---

## After Phase 0

When Claude Code finishes Phase 0 and gives you the summary, just say:

```
Good. Start Phase 1 — Candidate Experience. Same approach:
read the spec, work through each item, commit frequently,
flag decisions.
```

Repeat for each phase (0 through 8).

## If you need to restart a session

If Claude Code loses context or you start a new session, use:

```
cd video-interview-hub (or wherever your repo is)
Read IMPLEMENTATION_PLAN.md, GAP_ANALYSIS.md, and the current
state of the codebase. I'm working through the phased build.
Tell me which phases appear to be complete based on the code,
and pick up where we left off.
```

## Tips

- **One phase at a time.** Don't let it jump ahead.
- **Review the commits** after each phase before saying "continue."
- **Merge feature branches** into main after reviewing each phase, so Lovable stays in sync.
- **If Lovable auto-deploys from main**, consider using a `develop` branch as the working branch and only merging to main when you're happy.
