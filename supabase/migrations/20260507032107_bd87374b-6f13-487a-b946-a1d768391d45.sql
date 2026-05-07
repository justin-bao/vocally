-- Helper function (create first so triggers can reference it)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Songs
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  image_url TEXT,
  preview_url TEXT,
  duration_sec NUMERIC,
  ai_plan JSONB,
  pitch_contour JSONB,
  contour_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own songs" ON public.songs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own songs" ON public.songs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own songs" ON public.songs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own songs" ON public.songs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_songs_user_created ON public.songs (user_id, created_at DESC);

CREATE TRIGGER update_songs_updated_at
BEFORE UPDATE ON public.songs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Song attempts
CREATE TABLE public.song_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  duration_sec NUMERIC NOT NULL DEFAULT 0,
  overall_score INTEGER NOT NULL DEFAULT 0,
  pitch_accuracy INTEGER NOT NULL DEFAULT 0,
  rhythm INTEGER NOT NULL DEFAULT 0,
  breath_control INTEGER NOT NULL DEFAULT 0,
  tone_quality INTEGER NOT NULL DEFAULT 0,
  smoothness INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  praise JSONB NOT NULL DEFAULT '[]'::jsonb,
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.song_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own song attempts" ON public.song_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own song attempts" ON public.song_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own song attempts" ON public.song_attempts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_song_attempts_song_created ON public.song_attempts (song_id, created_at DESC);

-- Storage bucket for uploaded song audio
INSERT INTO storage.buckets (id, name, public) VALUES ('song-audio', 'song-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read song audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-audio');

CREATE POLICY "Users upload to own song-audio folder"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'song-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own song-audio files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'song-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own song-audio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'song-audio' AND auth.uid()::text = (storage.foldername(name))[1]);