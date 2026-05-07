ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_goal_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS daily_goal_takes integer NOT NULL DEFAULT 1;