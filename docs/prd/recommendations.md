# PRD — Recommendations

## Problem

After a few sessions, users don't know which lesson to do next. Picking
randomly wastes practice time on areas they've already mastered.

## Goal

Recommend the single next lesson that targets the user's weakest skill,
based on their last 10 attempts, with a plain-language reason.

## Scope

### In

- Pure function: `recommendLesson(attempts, progress)` in
  `src/lib/recommend.ts`.
- Computes per-skill averages over the last 10 attempts (pitch, breath, tone,
  smoothness). Picks the lowest as "weakest".
- Scores every lesson against the weakest skill using a keyword map
  (`SKILL_KEYWORDS`) over `lesson.focus + subtitle + title`.
- Composite ranking favors keyword match → not yet completed → lower best
  score → earlier order.
- Fallback for new users: first not-yet-completed lesson, with a "Start here"
  reason.
- Returns `{ lesson, weakestSkill, weakestScore, reason, averages,
  sampleSize }`.

### Out

- ML-based personalization.
- Server-side recommendation API.
- Multi-lesson sequenced plans.

## UX

- The recommended lesson is surfaced on `/journey` and on the profile page.
- The reason string is shown alongside the card so users know why.

## Success metrics

- Click-through rate on recommended lesson card.
- % of recommended lessons that result in a saved attempt.
