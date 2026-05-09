# PRD — Daily Practice

## Problem

Habit is the hardest part. Users say they want to practice daily but don't
know what to do in 60 seconds, and "open-ended" feels like a chore.

## Goal

Generate a fresh, personalized 60-second warmup every day based on the user's
progress and weakest skill, and make starting it one tap away.

## Scope

### In

- Route: `/daily`.
- Server function `generateDailyPractice`
  (`src/server/daily-practice.functions.ts`) that calls Lovable AI with
  context: completed lessons, recent skill averages, weakest skill, streak.
- Returns `{ title, skill_focus, instructions, steps[] }`.
- Cached in `localStorage` (`vocally:daily-practice`) for the day so it's
  consistent across reloads. Manual "Regenerate" overrides cache.
- "Start practice" CTA deep-links into `/practice?prompt=...&title=...` so the
  existing free-practice recorder is reused.
- Entry card on `/journey` above free practice.

### Out

- Push notifications / reminders (future).
- Multi-day workout plans.
- Saving daily prompts as their own entity.

## UX

- Hero card with title, skill focus pill, plain-language instructions.
- Numbered steps for the 60s breakdown.
- Single primary CTA ("Start"). Secondary: "Regenerate".

## Data

- No new tables. Reuses `free_practice_attempts` for resulting recordings.
- `localStorage` key per day (date-stamped) for caching.

## Success metrics

- % of DAU that complete the daily prompt.
- 7-day streak rate.
- Lift in WAU vs. control.
