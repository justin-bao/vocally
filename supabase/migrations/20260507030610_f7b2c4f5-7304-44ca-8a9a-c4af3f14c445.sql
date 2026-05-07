CREATE TABLE public.free_practice_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT,
  duration_sec NUMERIC NOT NULL DEFAULT 0,
  overall_score INTEGER NOT NULL DEFAULT 0,
  pitch_accuracy INTEGER NOT NULL DEFAULT 0,
  breath_control INTEGER NOT NULL DEFAULT 0,
  tone_quality INTEGER NOT NULL DEFAULT 0,
  smoothness INTEGER NOT NULL DEFAULT 0,
  rhythm INTEGER NOT NULL DEFAULT 0,
  what_you_sang TEXT,
  summary TEXT,
  praise JSONB NOT NULL DEFAULT '[]'::jsonb,
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_exercise_suggestion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.free_practice_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own free attempts"
ON public.free_practice_attempts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own free attempts"
ON public.free_practice_attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own free attempts"
ON public.free_practice_attempts FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_free_practice_attempts_user_created
  ON public.free_practice_attempts (user_id, created_at DESC);