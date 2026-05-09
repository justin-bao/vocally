# PRD — Profile & Skill Breakdown

## Problem

Users want a single place to see "how am I doing overall?" — across lessons,
free practice, and songs — broken down by skill so they know where to focus.

## Goal

A profile page summarizing identity, streak, total attempts, and a skill
breakdown card showing all-time and recent averages per skill, plus the
strongest and weakest skill call-outs.

## Scope

### In

- Route: `/profile`.
- Identity block: avatar, display name, joined date.
- Aggregate stats: total attempts, current streak, last practice date.
- **Skill breakdown** card with one row per skill (pitch, breath, tone,
  smoothness):
  - All-time average
  - Last-5 average
  - Trend delta indicator (▲ / ▼ / •)
  - Progress bar
- Strongest / focus call-out below the rows.
- Data sources combined across `lesson_attempts`, `free_practice_attempts`,
  and `song_attempts`.

### Out

- Editing profile fields beyond display name (v1).
- Public profiles or sharing.
- Achievements / badges (separate future feature).

## Data

- `profiles(id, user_id, display_name, current_streak, last_practice_date)`.
- Aggregate fetched client-side from the three attempt tables on page load.

## Success metrics

- % of users who visit profile within first 3 sessions.
- Correlation between weakest-skill call-out and subsequent lesson choice.
