ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS attempts_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_date date;

CREATE INDEX IF NOT EXISTS idx_lesson_attempts_user_lesson_created
  ON public.lesson_attempts (user_id, lesson_id, created_at DESC);