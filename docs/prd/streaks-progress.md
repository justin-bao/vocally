# PRD — Streaks & Progress

## Problem

Singing improvement is invisible day to day. Users churn because they can't
feel they're making progress.

## Goal

Make progress visible with streaks (habit), stars (mastery per lesson), and
best scores (peak performance) — surfaced everywhere the user looks.

## Scope

### In

- **Streak**: consecutive days with at least one saved attempt.
  Logic in `src/lib/streak.ts`. Stored on `profiles.current_streak` and
  `profiles.last_practice_date`.
- **Stars** (0–3): earned per lesson based on `best_score` thresholds.
  Stored on `lesson_progress.stars`.
- **Best score**: `lesson_progress.best_score`, updated on every attempt if
  higher.
- **History**: `/history` route showing chronological attempts across
  lessons, free practice, and songs.

### Out

- Streak freezes / forgiveness.
- League / weekly resets.
- Notifications (separate growth feature).

## UX

- Streak chip in the journey header with flame icon.
- Stars rendered on every lesson card.
- History page is a flat reverse-chronological list with type badges
  (Lesson / Free / Song).

## Data

- `profiles`, `lesson_progress`, `lesson_attempts`,
  `free_practice_attempts`, `song_attempts`.

## Success metrics

- Streak length distribution (median, p90).
- D7 / D30 retention.
- % of users with at least one 3-star lesson.
