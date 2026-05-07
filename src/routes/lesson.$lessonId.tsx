import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getLesson } from "@/lib/lessons";
import { PitchMeter, PitchTrack } from "@/components/pitch-meter";
import { TonePlayer } from "@/lib/tone-player";
import { scorePitchAttempt, type PitchSample } from "@/lib/pitch";
import { analyzeSinging } from "@/server/voice-analysis.functions";
import { ArrowLeft, Mic, Play, RotateCcw, Square, Sparkles, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lesson/$lessonId")({
  head: ({ params }) => {
    const lesson = getLesson(params.lessonId);
    return {
      meta: [
        { title: `${lesson?.title ?? "Lesson"} — Vocally` },
        { name: "description", content: lesson?.subtitle ?? "Practice singing with Vocally." },
      ],
    };
  },
  component: LessonPage,
});

type Phase = "intro" | "listening" | "ready" | "recording" | "analyzing" | "done";

interface AIResult {
  overall_score: number;
  breath_control: number;
  tone_quality: number;
  smoothness: number;
  summary: string;
  praise: string[];
  tips: string[];
}

function LessonPage() {
  const { lessonId } = Route.useParams();
  const lesson = getLesson(lessonId);
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [phase, setPhase] = useState<Phase>("intro");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [samples, setSamples] = useState<PitchSample[]>([]);
  const [pitchScore, setPitchScore] = useState<number | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const samplesRef = useRef<PitchSample[]>([]);
  const tonePlayer = useRef<TonePlayer>(new TonePlayer());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const playheadInterval = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    return () => {
      tonePlayer.current.close();
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (playheadInterval.current) clearInterval(playheadInterval.current);
    };
  }, []);

  if (!lesson) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-black">Lesson not found</h1>
          <Link to="/journey" className="mt-4 inline-block text-primary hover:underline">Back to journey</Link>
        </div>
      </main>
    );
  }

  const totalSec = lesson.targets.reduce((a, b) => a + b.seconds, 0);

  const handleListen = async () => {
    setPhase("listening");
    await tonePlayer.current.playSequence(lesson.targets);
    setTimeout(() => setPhase("ready"), totalSec * 1000 + 200);
  };

  const handleStartRecording = async () => {
    samplesRef.current = [];
    setSamples([]);
    setElapsedSec(0);
    setPhase("recording");

    // Start media recorder for AI analysis
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      });
      recStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recChunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && recChunksRef.current.push(e.data);
      rec.start();
      recorderRef.current = rec;
    } catch (e) {
      toast.error("Microphone permission needed");
      setPhase("ready");
      return;
    }

    // Playhead animation
    const begin = performance.now();
    playheadInterval.current = window.setInterval(() => {
      const t = (performance.now() - begin) / 1000;
      setElapsedSec(t);
      if (t >= totalSec) handleStopRecording();
    }, 50);
  };

  const handleStopRecording = async () => {
    if (playheadInterval.current) { clearInterval(playheadInterval.current); playheadInterval.current = null; }
    setPhase("analyzing");

    // Score pitch
    const { score } = scorePitchAttempt(samplesRef.current, lesson.targets);
    setPitchScore(score);

    // Stop & gather audio
    const rec = recorderRef.current;
    if (!rec) return;
    const audioBlob: Blob = await new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: rec.mimeType });
        resolve(blob);
      };
      if (rec.state !== "inactive") rec.stop();
      else resolve(new Blob(recChunksRef.current, { type: rec.mimeType }));
    });
    recStreamRef.current?.getTracks().forEach((t) => t.stop());

    // To base64 (strip data URL prefix). Convert webm to wav if possible — Gemini accepts wav/mp3.
    // Simpler: send the webm as-is by re-encoding to wav using OfflineAudioContext.
    let base64 = "";
    let mimeType = "audio/wav";
    try {
      const wavBlob = await blobToWav(audioBlob);
      base64 = await blobToBase64(wavBlob);
    } catch (e) {
      console.warn("WAV conversion failed, sending raw", e);
      base64 = await blobToBase64(audioBlob);
      mimeType = audioBlob.type.includes("wav") ? "audio/wav" : "audio/mp3";
    }

    try {
      const ai = await analyzeSinging({
        data: {
          audioBase64: base64,
          mimeType,
          lessonTitle: lesson.title,
          focus: lesson.focus,
          instructions: lesson.instructions,
        },
      });
      setAiResult(ai);

      // Save to DB
      const overall = Math.round((score + ai.overall_score) / 2);
      const stars = overall >= 90 ? 3 : overall >= 70 ? 2 : overall >= 50 ? 1 : 0;
      if (user) {
        await supabase.from("lesson_attempts").insert({
          user_id: user.id,
          lesson_id: lesson.id,
          pitch_score: score,
          ai_score: ai.overall_score,
          overall_score: overall,
          ai_feedback: ai as any,
        });

        // Upsert progress with per-lesson attempt count + streak tracking
        const today = new Date().toISOString().slice(0, 10);
        const { data: existing } = await supabase
          .from("lesson_progress")
          .select("best_score, stars, attempts_count, current_streak, best_streak, last_attempt_date")
          .eq("user_id", user.id)
          .eq("lesson_id", lesson.id)
          .maybeSingle();

        if (existing) {
          const last = existing.last_attempt_date;
          const y = new Date(); y.setDate(y.getDate() - 1);
          const yStr = y.toISOString().slice(0, 10);
          let lessonStreak = existing.current_streak ?? 0;
          if (last === today) {
            // already counted today, keep streak
            if (!lessonStreak) lessonStreak = 1;
          } else if (last === yStr) {
            lessonStreak = lessonStreak + 1;
          } else {
            lessonStreak = 1;
          }
          const bestStreak = Math.max(existing.best_streak ?? 0, lessonStreak);
          const isBest = overall > existing.best_score;
          await supabase
            .from("lesson_progress")
            .update({
              best_score: isBest ? overall : existing.best_score,
              stars: Math.max(existing.stars, stars),
              completed: true,
              attempts_count: (existing.attempts_count ?? 0) + 1,
              current_streak: lessonStreak,
              best_streak: bestStreak,
              last_attempt_date: today,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("lesson_id", lesson.id);
        } else {
          await supabase.from("lesson_progress").insert({
            user_id: user.id,
            lesson_id: lesson.id,
            best_score: overall,
            stars,
            completed: true,
            attempts_count: 1,
            current_streak: 1,
            best_streak: 1,
            last_attempt_date: today,
          });
        }

        // Update streak
        const { data: prof } = await supabase
          .from("profiles")
          .select("last_practice_date, current_streak")
          .eq("id", user.id)
          .maybeSingle();
        if (prof) {
          const last = prof.last_practice_date;
          let streak = prof.current_streak ?? 0;
          if (last === today) {
            // already counted today
          } else {
            const y = new Date(); y.setDate(y.getDate() - 1);
            const yStr = y.toISOString().slice(0, 10);
            streak = last === yStr ? streak + 1 : 1;
          }
          await supabase.from("profiles").update({ last_practice_date: today, current_streak: streak }).eq("id", user.id);
        }
      }
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || "AI analysis failed");
    } finally {
      setPhase("done");
    }
  };

  const handleRetry = () => {
    setPhase("intro");
    setSamples([]);
    setPitchScore(null);
    setAiResult(null);
    setAiError(null);
    setElapsedSec(0);
    samplesRef.current = [];
  };

  const captureSample = (s: PitchSample) => {
    samplesRef.current.push(s);
    // throttle UI updates
    if (samplesRef.current.length % 2 === 0) setSamples([...samplesRef.current]);
  };

  return (
    <main className="min-h-screen bg-gradient-sunset pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/journey" className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{lesson.unit}</p>
            <p className="font-display text-base font-black">{lesson.title}</p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-6">
        {/* Instructions */}
        <div className="rounded-3xl bg-card p-5 card-pop">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
            <Sparkles className="h-3.5 w-3.5" /> Today's exercise
          </div>
          <h1 className="mt-2 font-display text-2xl font-black">{lesson.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lesson.subtitle}</p>
          <p className="mt-3 text-sm leading-relaxed">{lesson.instructions}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {lesson.focus.map((f) => (
              <span key={f} className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">{f}</span>
            ))}
          </div>
        </div>

        {/* Pitch track viz */}
        {(phase === "recording" || phase === "ready" || phase === "listening") && (
          <PitchTrack
            samples={samples}
            targets={lesson.targets}
            totalSeconds={totalSec}
            elapsedSec={elapsedSec}
          />
        )}

        {phase === "recording" && (
          <PitchMeter active onSample={captureSample} />
        )}

        {/* Phase-specific actions */}
        {phase === "intro" && (
          <div className="space-y-3">
            <button
              onClick={handleListen}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 font-extrabold uppercase tracking-wide text-background btn-pop"
              style={{ boxShadow: "0 4px 0 0 oklch(0.18 0.05 35)" }}
            >
              <Play className="h-5 w-5" /> Hear the target
            </button>
            <button
              onClick={handleStartRecording}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
            >
              <Mic className="h-5 w-5" /> Skip — I'm ready to sing
            </button>
          </div>
        )}

        {phase === "listening" && (
          <div className="rounded-2xl bg-card p-6 text-center card-pop">
            <p className="font-display text-lg font-bold">🎵 Listening to the reference…</p>
            <p className="mt-1 text-sm text-muted-foreground">Memorize the pitch.</p>
          </div>
        )}

        {phase === "ready" && (
          <button
            onClick={handleStartRecording}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-5 text-lg font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
          >
            <Mic className="h-6 w-6" /> Start singing
          </button>
        )}

        {phase === "recording" && (
          <button
            onClick={handleStopRecording}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-6 py-5 text-lg font-extrabold uppercase tracking-wide text-secondary-foreground btn-pop-secondary"
          >
            <Square className="h-5 w-5 fill-current" /> Stop ({Math.max(0, totalSec - elapsedSec).toFixed(1)}s)
          </button>
        )}

        {phase === "analyzing" && (
          <div className="rounded-3xl bg-card p-8 text-center card-pop">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 font-display text-lg font-black">Your AI coach is listening…</p>
            <p className="mt-1 text-sm text-muted-foreground">Analyzing pitch, breath, and tone.</p>
          </div>
        )}

        {phase === "done" && (
          <ResultsView
            pitchScore={pitchScore ?? 0}
            ai={aiResult}
            aiError={aiError}
            onRetry={handleRetry}
            onContinue={() => nav({ to: "/journey" })}
          />
        )}
      </div>
    </main>
  );
}

function ResultsView({
  pitchScore, ai, aiError, onRetry, onContinue,
}: { pitchScore: number; ai: AIResult | null; aiError: string | null; onRetry: () => void; onContinue: () => void; }) {
  const overall = ai ? Math.round((pitchScore + ai.overall_score) / 2) : pitchScore;
  const stars = overall >= 90 ? 3 : overall >= 70 ? 2 : overall >= 50 ? 1 : 0;
  const headline = stars === 3 ? "Stunning!" : stars === 2 ? "Great work!" : stars === 1 ? "Nice try!" : "Keep practicing!";

  return (
    <div className="space-y-4">
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
        <h2 className="mt-4 font-display text-3xl font-black">{headline}</h2>
        <p className="mt-1 text-5xl font-black tabular-nums text-primary">{overall}</p>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">overall score</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ScoreChip label="Pitch" value={pitchScore} />
        <ScoreChip label="Breath" value={ai?.breath_control ?? 0} muted={!ai} />
        <ScoreChip label="Tone" value={ai?.tone_quality ?? 0} muted={!ai} />
        <ScoreChip label="Smooth" value={ai?.smoothness ?? 0} muted={!ai} />
      </div>

      {ai && (
        <div className="rounded-3xl bg-card p-5 card-pop">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI coach feedback
          </div>
          <p className="mt-2 font-display text-base font-bold">{ai.summary}</p>

          <div className="mt-4 space-y-1">
            {ai.praise.map((p, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm">
                <span>✨</span><span>{p}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1">
            {ai.tips.map((t, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-accent/60 px-3 py-2 text-sm">
                <span>💡</span><span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {aiError && (
        <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          AI coach unavailable: {aiError}. Your pitch score was still saved.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-4 font-extrabold uppercase tracking-wide text-foreground card-pop"
        >
          <RotateCcw className="h-5 w-5" /> Try again
        </button>
        <button
          onClick={onContinue}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-success px-5 py-4 font-extrabold uppercase tracking-wide text-success-foreground btn-pop-success"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ScoreChip({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`rounded-2xl bg-card p-3 text-center card-pop ${muted ? "opacity-50" : ""}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
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

// Decode any audio blob and re-encode as 16-bit PCM WAV (mono, 16kHz) for AI analysis
async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  ctx.close();

  const targetRate = 16000;
  // Resample by averaging into target length
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

  // Encode WAV
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
