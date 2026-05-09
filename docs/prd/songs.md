# PRD — Songs Library & Coaching

## Problem

Most beginners are motivated by a specific song they want to sing well. The
lesson curriculum can't anticipate every song, but AI can analyze any song
and coach against it.

## Goal

Let users import any song, get a coaching plan (key, range, tricky phrases,
breath spots), and record attempts that are scored and tracked over time.

## Scope

### In

- Routes: `/songs` (library), `/songs/import`, `/songs/$songId`.
- Import sources: iTunes search, YouTube link, MP3 upload.
- AI-generated coaching plan stored on the `songs` row.
- Two recording modes:
  - **Sing-along** (with backing track)
  - **A cappella**
- Per-song attempt history with scores and timestamps.
- Best score, recent attempts (last 3) shown on library cards.
- Attempts saved to `song_attempts` table.

### Out

- Lyrics display / synced lyrics (future).
- Auto-pitch-correction or playback adjustments.
- Sharing recordings publicly.

## UX

- Empty library shows a 3-step onboarding (Import → Plan → Record).
- Library card shows artwork, title, artist, source, best score, and a
  horizontal strip of recent attempt chips.
- Song detail page shows the coaching plan, mode toggle, recorder, and full
  history.

## Data

- `songs(id, user_id, title, artist, image_url, source, plan jsonb,
  audio_url, created_at)`
- `song_attempts(id, user_id, song_id, mode, overall_score, pitch_accuracy,
  breath_control, tone_quality, smoothness, ai_feedback jsonb, created_at)`

## Success metrics

- % of users who import at least 1 song in week 1.
- Average attempts per song.
- 7-day retention for users who import vs. don't.
