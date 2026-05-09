# PRD — AI Voice Analysis

## Problem

Pitch alone doesn't capture what makes singing sound good. Users need feedback
on breath control, tone quality, and smoothness — the things a human coach
would mention.

## Goal

Run every recording through a multimodal model and return structured,
actionable feedback in under 15 seconds, in a kind-but-honest voice.

## Scope

### In

- Server function: `analyzeSinging` (`src/server/voice-analysis.functions.ts`).
- Calls Lovable AI Gateway with `google/gemini-2.5-flash` and a tool-call
  schema enforcing structured JSON.
- Returned shape:
  ```ts
  {
    overall_score: 0..100,
    breath_control: 0..100,
    tone_quality: 0..100,
    smoothness: 0..100,
    summary: string,
    praise: string[1..2],
    tips: string[2..4],
  }
  ```
- Audio sent as base64 input_audio (wav or mp3, up to ~11MB).
- Used by lesson player, free practice, daily practice, and songs.

### Out

- Live streaming feedback during recording.
- Non-English coaching (v1 ships English).
- Voice cloning or identifying the user.

## Prompt principles

- Always ground feedback in the lesson context (title, focus, instructions).
- 0–100 scoring across all skills, with each praise and tip kept short and
  specific.
- Encouraging tone: praise first, then 2–4 tips.

## Reliability

- Hard input validation via Zod (`InputSchema`).
- Distinguish 429 (rate limit), 402 (credits), and other failures with
  user-readable messages.
- Never persist a partial AI result; either full structured object or none.

## Success metrics

- p95 latency < 30s.
- < 1% malformed responses (JSON parse failures).
- User-reported "feedback was helpful" in qualitative research.
