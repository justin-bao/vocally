import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { generateDailyPractice } from "@/server/daily-practice.functions";
import { ArrowLeft, Sparkles, Loader2, Mic, RefreshCw, Calendar, Flame, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Practice — Vocally" },
      { name: "description", content: "A fresh personalized vocal warmup based on your progress." },
    ],
  }),
  component: DailyPractice,
});

interface DailyPrompt {
  title: string;
  focus_skill: "pitch" | "breath" | "tone" | "smoothness" | "mixed";
  prompt: string;
  steps: string[];
  estimated_seconds: number;
  encouragement: string;
}

const STORAGE_KEY = "vocally:daily-practice";
const todayKey = () => new Date().toISOString().slice(0, 10);

const SKILL_COLOR: Record<DailyPrompt["focus_skill"], string> = {
  pitch: "bg-primary text-primary-foreground",
  breath: "bg-secondary text-secondary-foreground",
  tone: "bg-success text-success-foreground",
  smoothness: "bg-accent text-foreground",
  mixed: "bg-muted text-foreground",
};

function DailyPractice() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [prompt, setPrompt] = useState<DailyPrompt | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  // Load cached prompt for today
  useEffect(() => {
    if (!user) return;
    const cacheKey = `${STORAGE_KEY}:${user.id}:${todayKey()}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { prompt: DailyPrompt; at: string };
        setPrompt(parsed.prompt);
        setGeneratedAt(parsed.at);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const buildContext = useMemo(
    () => async () => {
      if (!user) throw new Error("Not signed in");
      const [{ data: prog }, { data: prof }, { data: free }, { data: lessonAtts }] = await Promise.all([
        supabase
          .from("lesson_progress")
          .select("lesson_id, completed")
          .eq("user_id", user.id)
          .eq("completed", true),
        supabase.from("profiles").select("current_streak").eq("id", user.id).maybeSingle(),
        supabase
          .from("free_practice_attempts")
          .select("pitch_accuracy, breath_control, tone_quality, smoothness, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("lesson_attempts")
          .select("pitch_score, ai_feedback, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const sums = { pitch: 0, breath: 0, tone: 0, smoothness: 0 };
      const counts = { pitch: 0, breath: 0, tone: 0, smoothness: 0 };
      const push = (k: keyof typeof sums, v: unknown) => {
        if (typeof v === "number" && v > 0) {
          sums[k] += v;
          counts[k] += 1;
        }
      };
      (free || []).forEach((a) => {
        push("pitch", a.pitch_accuracy);
        push("breath", a.breath_control);
        push("tone", a.tone_quality);
        push("smoothness", a.smoothness);
      });
      (lessonAtts || []).forEach((a) => {
        const fb = (a.ai_feedback || {}) as { breath_control?: number; tone_quality?: number; smoothness?: number };
        push("pitch", a.pitch_score);
        push("breath", fb.breath_control);
        push("tone", fb.tone_quality);
        push("smoothness", fb.smoothness);
      });
      const avg = (k: keyof typeof sums) => (counts[k] ? Math.round(sums[k] / counts[k]) : null);
      const skills = {
        pitch: avg("pitch"),
        breath: avg("breath"),
        tone: avg("tone"),
        smoothness: avg("smoothness"),
      };
      const scored = Object.entries(skills).filter(([, v]) => v != null) as [string, number][];
      const weakestSkill = scored.length ? [...scored].sort((a, b) => a[1] - b[1])[0][0] : undefined;

      return {
        completedLessons: (prog || []).map((p) => p.lesson_id),
        skills,
        weakestSkill,
        streak: prof?.current_streak ?? 0,
        seed: `${todayKey()}-${Math.floor(Math.random() * 1000)}`,
        currentStreak: prof?.current_streak ?? 0,
      };
    },
    [user],
  );

  const generate = async (force = false) => {
    if (!user || generating) return;
    if (!force && prompt) return;
    setGenerating(true);
    setError(null);
    try {
      const ctx = await buildContext();
      setStreak(ctx.currentStreak);
      const result = await generateDailyPractice({
        data: {
          completedLessons: ctx.completedLessons,
          skills: ctx.skills,
          weakestSkill: ctx.weakestSkill,
          streak: ctx.streak,
          seed: ctx.seed,
        },
      });
      setPrompt(result);
      const at = new Date().toISOString();
      setGeneratedAt(at);
      const cacheKey = `${STORAGE_KEY}:${user.id}:${todayKey()}`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ prompt: result, at }));
      } catch {
        // ignore
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate prompt";
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Refresh streak alongside cached prompt
  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("current_streak")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setStreak(data?.current_streak ?? 0));
  }, [user]);

  // Auto-generate on first visit if no cache
  useEffect(() => {
    if (!user || prompt || generating) return;
    void generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading || !user) {
    return <LoadingScreen label="Warming up…" />;
  }

  return (
    <main className="min-h-screen bg-gradient-sunset pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/journey" className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Today</p>
            <p className="font-display text-base font-black">Daily Practice</p>
          </div>
          <button
            onClick={() => generate(true)}
            disabled={generating}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="Regenerate"
            title="Regenerate prompt"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-6">
        <div className="rounded-3xl bg-card p-5 card-pop">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
            <Sparkles className="h-3.5 w-3.5" /> Personalized warmup
          </div>
          <h1 className="mt-2 font-display text-2xl font-black">Your daily refresher</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A short, fresh prompt based on what you've practiced. Built to keep your skills sharp.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-bold text-muted-foreground">
              <Calendar className="h-3 w-3" /> {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </span>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-1 font-bold text-secondary">
                <Flame className="h-3 w-3" /> {streak} day streak
              </span>
            )}
          </div>
        </div>

        {generating && !prompt && (
          <div className="rounded-3xl bg-card p-8 text-center card-pop">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 font-display text-lg font-black">Designing your warmup…</p>
            <p className="mt-1 text-sm text-muted-foreground">Looking at your recent skills and lessons.</p>
          </div>
        )}

        {error && !prompt && (
          <div className="rounded-3xl bg-destructive/10 p-5 text-destructive card-pop">
            <p className="font-display font-black">Couldn't generate today's prompt</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={() => generate(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-destructive-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </button>
          </div>
        )}

        {prompt && (
          <>
            <div className="rounded-3xl bg-card p-5 card-pop">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Today's exercise</p>
                  <h2 className="mt-1 font-display text-2xl font-black leading-tight">{prompt.title}</h2>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${SKILL_COLOR[prompt.focus_skill]}`}
                >
                  {prompt.focus_skill}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-foreground">{prompt.prompt}</p>

              <div className="mt-4 rounded-2xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Target className="h-3.5 w-3.5" /> Steps
                </div>
                <ol className="mt-2 space-y-2">
                  {prompt.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2.5 text-sm">
                      <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                ~{prompt.estimated_seconds}s · {prompt.encouragement}
              </p>
            </div>

            <Link
              to="/practice"
              search={{ prompt: prompt.prompt, title: prompt.title }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-5 text-lg font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
            >
              <Mic className="h-6 w-6" /> Start daily practice
            </Link>

            <button
              onClick={() => generate(true)}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground hover:bg-muted/70 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Generate a different prompt
            </button>

            {generatedAt && (
              <p className="text-center text-[10px] text-muted-foreground">
                Generated {new Date(generatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
