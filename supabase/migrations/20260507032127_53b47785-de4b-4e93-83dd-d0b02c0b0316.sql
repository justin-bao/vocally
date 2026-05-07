DROP POLICY IF EXISTS "Public can read song audio" ON storage.objects;

CREATE POLICY "Users list own song-audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-audio' AND auth.uid()::text = (storage.foldername(name))[1]);