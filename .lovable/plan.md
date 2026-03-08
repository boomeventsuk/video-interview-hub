

# Fix: Assign Admin Role to Your Account

## The Problem
You've signed up and can log in, but the `user_roles` table is empty -- no one has been assigned the "admin" role yet. The app's protected route checks for this role and blocks access.

## The Fix
Run a single database migration to insert the admin role for your user account (`hello@boomevents.co.uk`). This is a one-line SQL insert that maps your user ID to the `admin` role.

## Technical Details
- Insert a row into `public.user_roles` linking user ID `ca52516d-589d-4354-8c44-e9c532380e5c` (your account) to the `admin` role
- After this, refreshing the `/admin` page will grant you full dashboard access

