# TSDP School & Community Session Leader Interview

Created: 2026-05-21 14:21 BST

## Candidate Links
- Dedicated TSDP route: https://tsdp-video-interview-hub.netlify.app/tsdp-session-leader
- Database-backed template route: https://tsdp-video-interview-hub.netlify.app/interview/8d42b52e-32a8-4d25-9b97-cd40b738969f

## Result Emails
- TSDP School & Community Session Leader submissions send to `hello@thesilentdiscoproject.co.uk`.
- The existing Boombastic Event Assistant route remains unchanged and sends to `hello@boomevents.co.uk`.
- Supabase, Resend and the `interview-videos` storage bucket are shared infrastructure. The role-specific parts are the route, copy, questions, storage folder, template department, recipient address and email subject/heading.

## Supabase
- Template ID: `8d42b52e-32a8-4d25-9b97-cd40b738969f`
- Department: `The Silent Disco Project CIC`
- Migration applied: `20260521123000_tsdp_session_leader_template.sql`
- Five required questions, each with 60 seconds prep and 60 seconds recording.
- Dedicated route stores videos under `tsdp-session-leader/` and creates `submissions` / `submission_answers` records against the TSDP template.

## Deployment
- Netlify project: `tsdp-video-interview-hub`
- Production deploy: `6a0f06f3bb95b36465df18d1`
- Production URL: https://tsdp-video-interview-hub.netlify.app
