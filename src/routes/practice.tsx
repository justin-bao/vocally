import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFreePractice } from "@/server/free-practice.functions";
import { ArrowLeft, Mic, Square, RotateCcw, Sparkles, Loader2, Star, Music, Play, Pause, Send } from "lucide-react";
import { toast } from "sonner";
import { bumpStreak } from "@/lib/streak";

export const Route = createFileRoute("/practice")({
  validateSearch: (search: Record<string, unknown>) => ({
    prompt: typeof search.prompt === "string" ? search.prompt.slice(0, 800) : undefined,
    title: typeof search.title === "string" ? search.title.slice(0, 80) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Free practice — Vocally" },
      { name: "description", content: "Sing freely and get instant AI vocal coach feedback." },
    ],
  }),
  component: PracticePage,
});

type Phase = "setup" | "recording" | "review" | "analyzing" | "done";

interface FreeResult {
  overall_score: number;
  pitch_accuracy: number;
  breath_control: number;
  tone_quality: number;
  smoothness: number;
  rhythm: number;
  what_you_sang: string;
  summary: string;
  praise: string[];
  tips: string[];
  next_exercise_suggestion: string;
}

const MAX_SECONDS = 60;

function PracticePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [phase, setPhase] = useState<Phase>("setup");
  const [description, setDescription] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<FreeResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [peaks, setPeaks] = useState<number[] | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (tickRef.current) clearInterval(tickRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
      audioBlobRef.current = null;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.start();
      recorderRef.current = rec;
      startedAtRef.current = performance.now();
      setElapsed(0);
      setPhase("recording");

      tickRef.current = window.setInterval(() => {
        const t = (performance.now() - startedAtRef.current) / 1000;
        setElapsed(t);
        if (t >= MAX_SECONDS) stopRecording();
      }, 100);
    } catch {
      toast.error("Microphone permission needed");
    }
  };

  const stopRecording = async () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }

    const rec = recorderRef.current;
    if (!rec) { setPhase("setup"); return; }
    const finalDuration = (performance.now() - startedAtRef.current) / 1000;

    const audioBlob: Blob = await new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType }));
      if (rec.state !== "inactive") rec.stop();
      else resolve(new Blob(chunksRef.current, { type: rec.mimeType }));
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());

    audioBlobRef.current = audioBlob;
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    setRecordedDuration(finalDuration);
    setPlaybackTime(0);
    setIsPlaying(false);
    setPeaks(null);
    setPhase("review");
    computePeaks(audioBlob).then(setPeaks).catch((e: unknown) => console.warn("peaks failed", e));
  };

  const togglePlayback = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (el.paused) el.play(); else el.pause();
  };

  const submitForAnalysis = async () => {
    const audioBlob = audioBlobRef.current;
    if (!audioBlob) return;
    setPhase("analyzing");

    let base64 = "";
    let mimeType = "audio/wav";
    try {
      const wavBlob = await blobToWav(audioBlob);
      base64 = await blobToBase64(wavBlob);
    } catch (e) {
      console.warn("WAV conversion failed, sending raw", e);
      base64 = await blobToBase64(audioBlob);
      mimeType = "audio/mp3";
    }

    try {
      const ai = await analyzeFreePractice({
        data: {
          audioBase64: base64,
          mimeType,
          description: description.trim(),
          durationSec: recordedDuration,
        },
      });
      setResult(ai);
      if (user) {
        const { error: insErr } = await supabase.from("free_practice_attempts").insert({
          user_id: user.id,
          description: description.trim() || null,
          duration_sec: recordedDuration,
          overall_score: ai.overall_score,
          pitch_accuracy: ai.pitch_accuracy,
          breath_control: ai.breath_control,
          tone_quality: ai.tone_quality,
          smoothness: ai.smoothness,
          rhythm: ai.rhythm,
          what_you_sang: ai.what_you_sang,
          summary: ai.summary,
          praise: ai.praise,
          tips: ai.tips,
          next_exercise_suggestion: ai.next_exercise_suggestion,
        });
        if (insErr) console.error("Failed to save practice attempt", insErr);
        else { toast.success("Saved to your history"); void bumpStreak(user.id); }
      }
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || "AI analysis failed");
    } finally {
      setPhase("done");
    }
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    audioBlobRef.current = null;
    setPhase("setup");
    setResult(null);
    setAiError(null);
    setElapsed(0);
    setRecordedDuration(0);
    setPlaybackTime(0);
    setIsPlaying(false);
    chunksRef.current = [];
  };

  const stars = result ? (result.overall_score >= 90 ? 3 : result.overall_score >= 70 ? 2 : result.overall_score >= 50 ? 1 : 0) : 0;

  return (
    <main className="min-h-screen bg-gradient-sunset pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/journey" className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Free Mode</p>
            <p className="font-display text-base font-black">Sing Anything</p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-6">
        <div className="rounded-3xl bg-card p-5 card-pop">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
            <Music className="h-3.5 w-3.5" /> Free practice
          </div>
          <h1 className="mt-2 font-display text-2xl font-black">Sing whatever you want</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Optionally tell your coach what you're working on, hit record, and get instant feedback.
          </p>
        </div>

        {phase === "setup" && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-card p-5 card-pop">
              <label htmlFor="desc" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                What are you singing? <span className="text-muted-foreground/60 normal-case">(optional)</span>
              </label>
              <textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 800))}
                placeholder="e.g. The chorus of 'Someone Like You' by Adele, or a C major scale, or just warming up my chest voice…"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border-2 border-border bg-background p-3 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/800</p>
            </div>

            <button
              onClick={startRecording}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-5 text-lg font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
            >
              <Mic className="h-6 w-6" /> Start recording
            </button>
            <p className="text-center text-xs text-muted-foreground">Up to {MAX_SECONDS} seconds per take</p>
          </div>
        )}

        {phase === "recording" && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-card p-8 text-center card-pop">
              <div className="relative mx-auto h-24 w-24">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/40" />
                <div className="relative grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Mic className="h-10 w-10" />
                </div>
              </div>
              <p className="mt-5 font-display text-3xl font-black tabular-nums">{elapsed.toFixed(1)}s</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">recording…</p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (elapsed / MAX_SECONDS) * 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={stopRecording}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-6 py-5 text-lg font-extrabold uppercase tracking-wide text-secondary-foreground btn-pop-secondary"
            >
              <Square className="h-5 w-5 fill-current" /> Stop recording
            </button>
          </div>
        )}

        {phase === "review" && audioUrl && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-card p-6 card-pop">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Listen back</p>
              <p className="mt-1 font-display text-lg font-black">Review your take</p>

              <audio
                ref={audioElRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => { setIsPlaying(false); setPlaybackTime(recordedDuration); }}
                onTimeUpdate={(e) => setPlaybackTime((e.target as HTMLAudioElement).currentTime)}
                className="hidden"
              />

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={togglePlayback}
                  className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground btn-pop"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current translate-x-0.5" />}
                </button>
                <div className="flex-1">
                  <Waveform
                    peaks={peaks}
                    progress={recordedDuration ? Math.min(1, playbackTime / recordedDuration) : 0}
                    onSeek={(p) => {
                      const el = audioElRef.current;
                      if (el && recordedDuration) el.currentTime = p * recordedDuration;
                    }}
                  />
                  <div className="mt-1 flex justify-between text-xs font-bold tabular-nums text-muted-foreground">
                    <span>{playbackTime.toFixed(1)}s</span>
                    <span>{recordedDuration.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startRecording}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-4 font-extrabold uppercase tracking-wide text-foreground card-pop"
              >
                <RotateCcw className="h-5 w-5" /> Re-record
              </button>
              <button
                onClick={submitForAnalysis}
                className="flex flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
              >
                <Send className="h-5 w-5" /> Get feedback
              </button>
            </div>
          </div>
        )}

        {phase === "analyzing" && (
          <div className="rounded-3xl bg-card p-8 text-center card-pop">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 font-display text-lg font-black">Your AI coach is listening…</p>
            <p className="mt-1 text-sm text-muted-foreground">Analyzing pitch, breath, tone, and rhythm.</p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4">
            {result && (
              <>
                <div className="rounded-3xl bg-card p-7 text-center card-pop">
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3].map((n) => (
                      <Star
                        key={n}
                        className={`h-12 w-12 transition ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground/25"}`}
                        strokeWidth={2}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-5xl font-black tabular-nums text-primary">{result.overall_score}</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">overall score</p>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  <ScoreChip label="Pitch" value={result.pitch_accuracy} />
                  <ScoreChip label="Breath" value={result.breath_control} />
                  <ScoreChip label="Tone" value={result.tone_quality} />
                  <ScoreChip label="Smooth" value={result.smoothness} />
                  <ScoreChip label="Rhythm" value={result.rhythm} />
                </div>

                <div className="rounded-3xl bg-card p-5 card-pop">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                    <Sparkles className="h-3.5 w-3.5" /> AI coach feedback
                  </div>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">What I heard</p>
                  <p className="mt-1 text-sm italic text-foreground/80">{result.what_you_sang}</p>
                  <p className="mt-3 font-display text-base font-bold">{result.summary}</p>

                  <div className="mt-4 space-y-1">
                    {result.praise.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm">
                        <span>✨</span><span>{p}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 space-y-1">
                    {result.tips.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-xl bg-accent/60 px-3 py-2 text-sm">
                        <span>💡</span><span>{t}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-secondary/15 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-secondary">Try next</p>
                    <p className="mt-1 text-sm">{result.next_exercise_suggestion}</p>
                  </div>
                </div>
              </>
            )}

            {aiError && (
              <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
                AI coach unavailable: {aiError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (audioUrl) URL.revokeObjectURL(audioUrl);
                  setAudioUrl(null);
                  audioBlobRef.current = null;
                  setResult(null);
                  setAiError(null);
                  setPlaybackTime(0);
                  setIsPlaying(false);
                  setRecordedDuration(0);
                  await startRecording();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
              >
                <Mic className="h-5 w-5" /> Record again
              </button>
              <Link
                to="/journey"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-success px-5 py-4 font-extrabold uppercase tracking-wide text-success-foreground btn-pop-success"
              >
                Done
              </Link>
            </div>
            <button
              onClick={reset}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-muted-foreground card-pop"
            >
              <RotateCcw className="h-4 w-4" /> Edit description
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center card-pop">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

const PEAK_BARS = 56;

function Waveform({ peaks, progress, onSeek }: { peaks: number[] | null; progress: number; onSeek: (p: number) => void }) {
  const loading = peaks === null;
  const bars = peaks ?? new Array(PEAK_BARS).fill(0.15);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onSeek(p);
      }}
      className="relative flex h-12 w-full items-center gap-[2px] rounded-xl bg-muted/40 px-2"
      aria-label={loading ? "Generating waveform" : "Audio waveform — click to seek"}
      aria-busy={loading}
    >
      {bars.map((v, i) => {
        const played = !loading && i / bars.length < progress;
        const h = Math.max(8, Math.round(v * 100));
        return (
          <span
            key={i}
            className={`flex-1 rounded-full transition-colors ${
              loading
                ? "animate-pulse bg-muted-foreground/25"
                : played
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
            }`}
            style={{
              height: `${h}%`,
              animationDelay: loading ? `${i * 30}ms` : undefined,
            }}
          />
        );
      })}
      {loading && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Generating waveform
        </span>
      )}
    </button>
  );
}

async function computePeaks(blob: Blob): Promise<number[]> {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx: typeof AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
  const ctx = new Ctx();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  ctx.close();
  const channel = decoded.getChannelData(0);
  const buckets = PEAK_BARS;
  const size = Math.floor(channel.length / buckets) || 1;
  const out: number[] = [];
  let max = 0;
  for (let b = 0; b < buckets; b++) {
    let peak = 0;
    const start = b * size;
    const end = Math.min(channel.length, start + size);
    for (let i = start; i < end; i++) {
      const v = Math.abs(channel[i]);
      if (v > peak) peak = v;
    }
    out.push(peak);
    if (peak > max) max = peak;
  }
  const norm = max > 0 ? max : 1;
  return out.map((v) => Math.min(1, v / norm));
}

// ---------- audio helpers ----------
async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  ctx.close();

  const targetRate = 16000;
  const ratio = decoded.sampleRate / targetRate;
  const outLen = Math.floor(decoded.length / ratio);
  const channel = decoded.getChannelData(0);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0;
    for (let j = start; j < end; j++) sum += channel[j];
    out[i] = sum / Math.max(1, end - start);
  }

  const buffer = new ArrayBuffer(44 + out.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + out.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, out.length * 2, true);
  let off = 44;
  for (let i = 0; i < out.length; i++) {
    const s = Math.max(-1, Math.min(1, out[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}
