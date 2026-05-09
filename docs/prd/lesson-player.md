# PRD — Lesson Player & Scoring

## Problem

Users need a focused, guided environment to perform a single exercise, hear
the target tone, sing it back, and get a score they trust.

## Goal

Provide a low-friction recording experience that combines target-tone
playback, real-time pitch visualization, and a deterministic pitch score —
which is then enriched with AI feedback.

## Scope

### In

- Route: `/lesson/$lessonId`.
- Playback of target tones via Web Audio (`src/lib/tone-player.ts`).
- Microphone capture and real-time pitch detection
  (`src/lib/pitch.ts`, autocorrelation-based).
- Pitch-track visualization comparing user pitch vs. target.
- Deterministic `pitch_score` based on % of target-note hit time.
- AI analysis call after recording stops — adds `breath_control`,
  `tone_quality`, `smoothness`, `summary`, `praise[]`, `tips[]`.
- Combined `overall_score` saved to `lesson_attempts`.
- `lesson_progress` upserted with new `best_score`, `completed`, `stars`.

### Out

- Multi-track recording.
- Manual score editing.
- Live AI feedback during the recording.

## UX

- Big primary record button. Tap to start, tap to stop.
- After stop: pitch score appears immediately; AI feedback appears within
  ~10–15s with a loading shimmer.
- Praise and tips render as separate cards (green vs. amber) so the user reads
  the praise first.
- Retry CTA always visible after a result.

## Data

- `lesson_attempts(id, user_id, lesson_id, pitch_score, ai_score,
  overall_score, ai_feedback jsonb, created_at)`
- `lesson_progress(user_id, lesson_id, best_score, completed, stars)`

## Edge cases

- Mic permission denied → inline help with a retry button.
- AI rate-limited (429) → toast: "Try again in a moment", pitch score still
  saved.
- AI credits exhausted (402) → toast asking to add credits; attempt saved
  without AI feedback.

## Success metrics

- % of started recordings that complete and are saved.
- p50 / p95 AI latency.
- % of attempts that earn at least 1 star.
