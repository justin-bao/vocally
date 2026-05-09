# PRD — Unit Details

## Problem

As users accumulate attempts, the per-lesson view inside a unit becomes
crowded. Users need to find specific lessons, see what's improving, and dig
into individual attempt history without leaving the page.

## Goal

A single unit page that supports search, filtering, trend visualization, and
deep inspection of attempt history through a modal.

## Scope

### In

- Route: `/unit/$unitSlug`.
- **Search**: free-text filter on lesson title and focus tags.
- **Filters**:
  - Completion status (all / completed / not completed)
  - Minimum best score (0–100 slider)
  - Most recent attempt window (any / last 7 days / last 30 days)
- **Mini trend chart** per lesson: last 5 attempts across pitch, breath,
  tone, smoothness — shown as a sparkline/series.
- **Attempts modal**: tap a lesson to see all recent attempts with timestamp,
  overall score, and per-skill scores.
- **Per-skill filters in modal**: pill toggles (Overall / Pitch / Breath /
  Tone / Smooth) and a max-score slider to surface low-performing attempts.
- "Reset" button when any modal filter is active.

### Out

- Cross-unit comparison.
- Editing or deleting attempts (history is immutable).
- Exporting attempt data.

## UX

- Filters live in a sticky toolbar at the top of the lesson list.
- Sparklines render inline on each lesson card so the user can scan trends.
- Modal is full-screen on mobile, dialog on desktop. Empty state when no
  attempts match filters.

## Data

- Reads from `lesson_attempts`, joined to `lesson_progress` for completion
  and best-score state. No new tables.

## Success metrics

- % of unit-page visitors who open the attempts modal.
- % of users who use a filter at least once.
- Time-on-page (signal of engagement, not a goal).
