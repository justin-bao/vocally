# Vocally — Product Vision

## One-line thesis

Vocally is a pocket vocal coach that turns singing practice into a daily,
measurable, and encouraging habit — so anyone who has always wanted to sing
better can actually improve, without lessons, theory, or judgment.

## Who it's for

- **Aspiring beginners** who can't afford or access a vocal coach and feel
  self-conscious singing in front of others.
- **Hobby singers** who already sing in the shower, the car, or at karaoke and
  want structured, honest feedback to level up.
- **Returning singers** (former choir kids, lapsed musicians) who want a
  low-friction way to rebuild range, breath, and tone.
- **Song learners** working on a specific song and wanting targeted help with
  the hard phrases, key, and breath spots.

It is **not** built for:

- Trained vocalists preparing for auditions or performances.
- Music theory study or sight-reading practice.
- Songwriting or production workflows.

## What we believe

1. **Feedback beats theory.** Beginners improve fastest when they hear what
   they did and get one or two specific things to try next — not when they
   read about head voice.
2. **Short and daily wins.** A 60-second prompt every day beats an hour once a
   week. Streaks, stars, and bite-sized lessons keep people coming back.
3. **Multimodal AI is the unlock.** Real audio analysis (pitch + tone +
   breath + smoothness) on every attempt is what previously required a human
   coach. We can now do it in seconds.
4. **Encouragement is non-negotiable.** Singing is vulnerable. Every piece of
   feedback names something the user did well before suggesting what to fix.

## What the app helps users do

| Job to be done | How Vocally solves it |
|---|---|
| "Tell me if I'm in tune." | Real-time pitch detection + per-attempt pitch score |
| "Tell me what to actually work on." | AI breaks each attempt into pitch / breath / tone / smoothness, plus tips |
| "Show me I'm getting better." | Per-skill trends, streaks, stars, best scores, history |
| "Give me something to do today." | Daily Practice generates a personalized 60-second warmup |
| "Help me with this song." | Import any song, get a coaching plan, record sing-along or a cappella |
| "What should I try next?" | Recommendation engine points to the lesson that targets the user's weakest skill |

## Core feature areas

Each has its own PRD in `docs/prd/`:

- [Lesson Journey](./prd/lesson-journey.md)
- [Lesson Player & Scoring](./prd/lesson-player.md)
- [AI Voice Analysis](./prd/ai-voice-analysis.md)
- [Free Practice](./prd/free-practice.md)
- [Daily Practice](./prd/daily-practice.md)
- [Songs Library & Coaching](./prd/songs.md)
- [Unit Details (Search, Filters, Attempts Modal, Trends)](./prd/unit-details.md)
- [Profile & Skill Breakdown](./prd/profile-skill-breakdown.md)
- [Recommendations](./prd/recommendations.md)
- [Streaks & Progress](./prd/streaks-progress.md)
- [Authentication](./prd/authentication.md)

## North-star metric

**Weekly active practicing users** — users who complete at least 3 attempts
(lesson, daily, free, or song) in a 7-day window. This captures both habit
(returning) and progress (actually singing).

## Guardrails

- Latency on AI feedback < 15s p50, < 30s p95.
- Every score is paired with at least one praise and one tip.
- No leaderboard, no public profiles, no social comparisons in v1 — practice
  must feel safe.
