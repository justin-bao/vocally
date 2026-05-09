# PRD — Lesson Journey

## Problem

Beginners don't know where to start or what order to learn vocal skills in.
Open-ended practice apps cause decision fatigue and dropout.

## Goal

Give every user a clear, visual, gamified path through the foundational
vocal skills, with locked progression so they can't skip ahead and miss
prerequisites.

## Users & jobs to be done

- New user: "Where do I begin?"
- Returning user: "What's next, and how far have I come?"

## Scope

### In

- A scrollable journey map at `/journey` showing units → lessons.
- Each lesson card shows title, focus tags, locked/unlocked state, completion
  state, and earned stars (0–3).
- Locked lessons require the previous lesson to be completed.
- Entry tiles for **Daily Practice**, **Free Practice**, and **My Songs**.
- Streak counter and best-score summary at the top.
- Drill-in to a unit page (`/unit/$unitSlug`) for unit-level overview.

### Out

- Custom user-created learning paths.
- Branching curricula or A/B lesson trees.
- Social features (sharing progress, friends).

## UX

- Mobile-first, vertical map. Each lesson is a tappable card.
- Locked lessons render dimmed with a lock icon and don't navigate.
- Stars animate on first earn.
- The "next" lesson is visually highlighted (recommended).

## Data

- `lessons` static catalog in `src/lib/lessons.ts` (id, title, subtitle, focus,
  unit, order, target tones, instructions).
- `lesson_progress` table: `lesson_id`, `user_id`, `best_score`, `completed`,
  `stars`.

## Success metrics

- % of new users who complete lesson 1 within first session.
- % of users who reach lesson 5 within first 7 days.
- Bounce rate on `/journey` < 30%.

## Open questions

- Should we let advanced users "test out" of a unit?
- Do we want unit-level achievements distinct from per-lesson stars?
