# PRD — Authentication

## Problem

We need a reliable way to identify users so attempts, streaks, and progress
follow them across devices — without making sign-up a barrier to first value.

## Goal

Frictionless sign-up via Google OAuth or email/password, backed by Lovable
Cloud, with row-level security guaranteeing each user only sees their own
data.

## Scope

### In

- Route: `/auth` — email/password and Google OAuth.
- Email verification required before first sign-in (not auto-confirmed).
- Session management via Supabase auth (browser client +
  `auth-middleware.ts`).
- `profiles` row auto-created on signup via DB trigger.
- All user-data tables (`lesson_attempts`, `lesson_progress`,
  `free_practice_attempts`, `songs`, `song_attempts`, `profiles`) protected
  by RLS policies scoped to `auth.uid()`.
- Logged-out users are redirected to `/auth` from any authenticated route.

### Out

- Anonymous accounts.
- Magic links (future).
- SSO providers beyond Google (future).
- Multi-user team / family accounts.

## UX

- Single screen with tabs for Sign in / Sign up.
- Google button is primary above the email form.
- Errors render inline, not as toasts, for accessibility.

## Security

- No roles in v1; every authenticated user has identical permissions on
  their own rows.
- No service-role keys in the client.
- AI Gateway key (`LOVABLE_API_KEY`) only read inside server function
  handlers.

## Success metrics

- Sign-up → first attempt conversion.
- Auth error rate < 1%.
