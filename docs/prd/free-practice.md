# PRD — Free Practice

## Problem

Structured lessons are great, but sometimes users just want to sing what they
want and get feedback. Without a free mode, the app feels like homework.

## Goal

Let users record any singing — humming, scales, a chorus they're working on —
describe what they were going for, and receive structured AI feedback.

## Scope

### In

- Route: `/practice`.
- Optional text description / prompt of what the user is attempting.
- Mic recording with the same capture pipeline as lessons.
- AI analysis via free-practice server function — same structured output
  (overall, breath, tone, smoothness, praise, tips).
- Saved to `free_practice_attempts` table for history and skill aggregation.
- Accepts `?prompt=...&title=...` search params so other features (e.g. Daily
  Practice) can deep-link into a pre-filled session.

### Out

- Pitch-target scoring (no target melody).
- Background music.
- Sharing recordings.

## UX

- Text area is optional and collapsed by default; a placeholder suggests
  "What were you going for?".
- Same record/stop/replay UI as the lesson player.
- Result page shows praise and tips; "Practice again" resets the form.

## Data

- `free_practice_attempts(id, user_id, description, overall_score,
  pitch_accuracy, breath_control, tone_quality, smoothness,
  ai_feedback jsonb, created_at)`

## Success metrics

- Free-practice attempts per WAU.
- % of users who use free practice in addition to lessons.
