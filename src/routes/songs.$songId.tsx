import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSongAttempt } from "@/server/songs.functions";
import { blobToBase64, blobToWav } from "@/lib/audio-utils";
import { ArrowLeft, Mic, Square, Loader2, Play, Pause, Star, Sparkles, Music2, Youtube } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/songs/$songId")({
  head: () => ({ meta: [{ title: "Song coach — Vocally" }] }),
  component: SongDetail,
});

interface Song {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  image_url: string | null;
  preview_url: string | null;
  source: string;
  source_id: string | null;
  duration_sec: number | null;
  ai_plan: any;
}

interface Attempt {
  id: string;
  mode: string;
  duration_sec: number;
  overall_score: number;
  pitch_accuracy: number;
  rhythm: number;
  breath_control: number;
  tone_quality: number;
  smoothness: number;
  summary: string | null;
  praise: string[];
  tips: string[];
  created_at: string;
}

type Phase = "idle" | "recording" | "analyzing";

function SongDetail() {
  const { songId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [song, setSong] = useState<Song | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [mode, setMode] = useState<"sing_along" | "a_cappella">("sing_along");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isPlayingRef, setIsPlayingRef] = useState(false);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const refAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, songId]);

  useEffect(() => {
    return () => {
      if (recRef.current?.state === "recording") recRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const load = async () => {
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("songs").select("*").eq("id", songId).maybeSingle(),
      supabase.from("song_attempts").select("*").eq("song_id", songId).order("created_at", { ascending: false }).limit(20),
    ]);
    setSong((s as unknown as Song) ?? null);
    setAttempts((a as unknown as Attempt[]) ?? []);
  };

  const toggleRef = () => {
    const el = refAudioRef.current;
    if (!el) return;
    if (el.paused) el.play(); else el.pause();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.start();
      recRef.current = rec;
      startedAtRef.current = performance.now();
      setElapsed(0);
      setPhase("recording");
      if (mode === "sing_along" && refAudioRef.current && song?.preview_url) {
        refAudioRef.current.currentTime = 0;
        void refAudioRef.current.play();
      }
      tickRef.current = window.setInterval(() => {
        const t = (performance.now() - startedAtRef.current) / 1000;
        setElapsed(t);
        if (t >= 90) stopRecording();
      }, 100);
    } catch {
      toast.error("Microphone permission needed");
    }
  };

  const stopRecording = async () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    refAudioRef.current?.pause();
    setPhase("analyzing");
    const rec = recRef.current;
    if (!rec || !song || !user) { setPhase("idle"); return; }
    const finalDur = (performance.now() - startedAtRef.current) / 1000;
    const blob: Blob = await new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType }));
      if (rec.state !== "inactive") rec.stop();
      else resolve(new Blob(chunksRef.current, { type: rec.mimeType }));
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());

    let base64 = ""; let mimeType = "audio/wav";
    try { base64 = await blobToBase64(await blobToWav(blob)); }
    catch { base64 = await blobToBase64(blob); mimeType = "audio/mp3"; }

    try {
      const ai = await analyzeSongAttempt({
        data: {
          audioBase64: base64,
          mimeType,
          songTitle: song.title,
          songArtist: song.artist || "",
          mode,
          durationSec: finalDur,
          planSummary: song.ai_plan?.song_summary || "",
        },
      });
      const { error } = await supabase.from("song_attempts").insert({
        user_id: user.id,
        song_id: song.id,
        mode,
        duration_sec: finalDur,
        overall_score: ai.overall_score,
        pitch_accuracy: ai.pitch_accuracy,
        rhythm: ai.rhythm,
        breath_control: ai.breath_control,
        tone_quality: ai.tone_quality,
        smoothness: ai.smoothness,
        summary: ai.summary,
        praise: ai.praise,
        tips: ai.tips,
      });
      if (error) console.error(error);
      else { toast.success("Saved"); void bumpStreak(user.id); }
      await load();
    } catch (e: any) {
      console.error(e);
      setAiError(e?.message || "AI analysis failed");
    } finally {
      setPhase("idle");
    }
  };

  if (!song) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Loading…</div>;
  }

  const plan = song.ai_plan as any;
  const ytEmbed = song.source === "youtube" && song.source_id
    ? `https://www.youtube.com/embed/${song.source_id}`
    : null;

  return (
    <main className="min-h-screen bg-gradient-sunset pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/songs" className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-base font-black truncate max-w-[60%]">{song.title}</p>
          <div className="w-9" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-6">
        <div className="flex items-center gap-4 rounded-3xl bg-card p-4 card-pop">
          {song.image_url ? (
            <img src={song.image_url} alt="" className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover" />
          ) : (
            <div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-2xl bg-muted">
              <Music2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-xl font-black leading-tight">{song.title}</p>
            <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
          </div>
        </div>

        {plan && (
          <div className="rounded-3xl bg-card p-5 card-pop">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Coaching plan
            </div>
            <p className="mt-2 font-display text-base font-bold">{plan.song_summary}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Mini label="Key" v={plan.estimated_key} />
              <Mini label="Range" v={plan.vocal_range} />
              <Mini label="Level" v={plan.difficulty} />
            </div>
            <Section title="Focus on">{plan.technique_focus?.map((t: string, i: number) => <Tag key={i} tone="primary">{t}</Tag>)}</Section>
            <Section title="Tricky phrases">{plan.tricky_phrases?.map((t: string, i: number) => <Tag key={i} tone="accent">{t}</Tag>)}</Section>
            <Section title="Breath spots">{plan.breath_spots?.map((t: string, i: number) => <Tag key={i} tone="secondary">{t}</Tag>)}</Section>
            {plan.warmup_suggestion && (
              <div className="mt-3 rounded-2xl bg-secondary/15 p-3 text-sm">
                <span className="font-bold">Warmup:</span> {plan.warmup_suggestion}
              </div>
            )}
          </div>
        )}

        {ytEmbed ? (
          <div className="overflow-hidden rounded-3xl bg-card card-pop">
            <iframe
              src={ytEmbed}
              title={song.title}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : song.preview_url ? (
          <div className="rounded-3xl bg-card p-4 card-pop">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reference track</p>
            <audio
              ref={refAudioRef}
              src={song.preview_url}
              onPlay={() => setIsPlayingRef(true)}
              onPause={() => setIsPlayingRef(false)}
              onEnded={() => setIsPlayingRef(false)}
              className="hidden"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={toggleRef}
                className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground btn-pop"
                aria-label={isPlayingRef ? "Pause" : "Play"}
              >
                {isPlayingRef ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current translate-x-0.5" />}
              </button>
              <p className="text-sm text-muted-foreground">Listen to the reference, then record your take.</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl bg-card p-4 card-pop">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Practice mode</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["sing_along", "a_cappella"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={m === "sing_along" && !song.preview_url && !ytEmbed}
                className={`rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition disabled:opacity-40 ${
                  mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {m === "sing_along" ? "Sing along" : "A cappella"}
              </button>
            ))}
          </div>
          {mode === "sing_along" && ytEmbed && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Youtube className="mt-0.5 h-3 w-3" /> Press play on the YouTube video, then start recording.
            </p>
          )}

          <div className="mt-4">
            {phase === "idle" && (
              <button
                onClick={startRecording}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
              >
                <Mic className="h-5 w-5" /> Start recording
              </button>
            )}
            {phase === "recording" && (
              <button
                onClick={stopRecording}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-4 font-extrabold uppercase tracking-wide text-secondary-foreground btn-pop-secondary"
              >
                <Square className="h-5 w-5 fill-current" /> Stop · {elapsed.toFixed(1)}s
              </button>
            )}
            {phase === "analyzing" && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-muted px-5 py-4 text-sm font-bold text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Coach is listening…
              </div>
            )}
          </div>
          {aiError && (
            <p className="mt-2 rounded-xl bg-destructive/10 p-2 text-xs text-destructive">{aiError}</p>
          )}
        </div>

        <div>
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent takes</p>
          {attempts.length === 0 && (
            <div className="rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground card-pop">No takes yet.</div>
          )}
          <div className="space-y-2">
            {attempts.map((a) => {
              const stars = a.overall_score >= 90 ? 3 : a.overall_score >= 70 ? 2 : a.overall_score >= 50 ? 1 : 0;
              return (
                <div key={a.id} className="rounded-2xl bg-card p-4 card-pop">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {new Date(a.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })} · {a.mode === "sing_along" ? "Sing-along" : "A cappella"} · {Math.round(a.duration_sec)}s
                      </p>
                      {a.summary && <p className="mt-1 text-sm">{a.summary}</p>}
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="font-display text-2xl font-black tabular-nums text-primary">{a.overall_score}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((n) => (
                          <Star key={n} className={`h-3 w-3 ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1 text-center">
                    <Mini label="Pitch" v={a.pitch_accuracy} />
                    <Mini label="Rhythm" v={a.rhythm} />
                    <Mini label="Breath" v={a.breath_control} />
                    <Mini label="Tone" v={a.tone_quality} />
                    <Mini label="Smooth" v={a.smoothness} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function Mini({ label, v }: { label: string; v: number | string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-1 py-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-black tabular-nums truncate">{v}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: "primary" | "secondary" | "accent" }) {
  const cls = tone === "primary" ? "bg-primary/15 text-primary" : tone === "secondary" ? "bg-secondary/20 text-secondary" : "bg-accent/60 text-foreground";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{children}</span>;
}
