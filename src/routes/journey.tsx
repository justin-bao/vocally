import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LESSONS, UNITS } from "@/lib/lessons";
import { recommendLesson, type AttemptScores } from "@/lib/recommend";
import { Mic, LogOut, Star, Lock, Check, Flame, Music, ChevronRight, UserRound, Sparkles } from "lucide-react";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Your singing journey — Vocally" },
      { name: "description", content: "Your personal singing learning path with progress tracking." },
    ],
  }),
  component: Journey,
});

interface ProgressRow {
  lesson_id: string;
  best_score: number;
  completed: boolean;
  stars: number;
}

function Journey() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [profile, setProfile] = useState<{ display_name: string | null; current_streak: number } | null>(null);
  const [attempts, setAttempts] = useState<AttemptScores[]>([]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prog }, { data: prof }, { data: atts }] = await Promise.all([
        supabase.from("lesson_progress").select("lesson_id, best_score, completed, stars").eq("user_id", user.id),
        supabase.from("profiles").select("display_name, current_streak").eq("id", user.id).maybeSingle(),
        supabase.from("lesson_attempts")
          .select("lesson_id, pitch_score, overall_score, ai_feedback, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      const map: Record<string, ProgressRow> = {};
      (prog || []).forEach((p) => (map[p.lesson_id] = p as ProgressRow));
      setProgress(map);
      setProfile(prof || { display_name: null, current_streak: 0 });
      setAttempts((atts || []) as unknown as AttemptScores[]);
    })();
  }, [user]);

  const recommendation = useMemo(() => {
    const progressList = Object.values(progress).map((p) => ({
      lesson_id: p.lesson_id, completed: p.completed, best_score: p.best_score,
    }));
    return recommendLesson(attempts, progressList);
  }, [attempts, progress]);

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Loading…</div>;
  }

  // Determine first uncompleted lesson (the "current" node)
  const completedSet = new Set(Object.values(progress).filter((p) => p.completed).map((p) => p.lesson_id));
  let foundCurrent = false;
  const lessonsByUnit = UNITS.map((u) => ({
    ...u,
    lessons: LESSONS.filter((l) => l.unit === u.name),
  }));

  return (
    <main className="min-h-screen bg-gradient-sunset pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Mic className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-black">Vocally</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="flex items-center gap-1 rounded-full bg-secondary/15 px-3 py-1 text-sm font-bold text-secondary transition hover:bg-secondary/25"
              title="View profile"
            >
              <Flame className="h-4 w-4" /> {profile?.current_streak ?? 0}
            </Link>
            <Link
              to="/profile"
              className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
              title="My profile"
              aria-label="My profile"
            >
              <UserRound className="h-4 w-4" />
            </Link>
            <button
              onClick={() => { signOut(); nav({ to: "/" }); }}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero greeting */}
      <section className="mx-auto max-w-2xl px-5 pt-6">
        <div className="flex items-center gap-4 rounded-3xl bg-card p-5 card-pop">
          <img src={mascot} alt="" width={72} height={72} className="h-[72px] w-[72px] flex-shrink-0" />
          <div>
            <h1 className="font-display text-2xl font-black">
              Hey {profile?.display_name || "singer"}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Pick up where you left off. Your voice is waiting.
            </p>
          </div>
        </div>

        <Link
          to="/practice"
          className="mt-4 flex items-center gap-4 rounded-3xl bg-secondary p-5 text-secondary-foreground btn-pop-secondary transition hover:scale-[1.01]"
        >
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-secondary-foreground/15">
            <Music className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-black leading-tight">Free practice</p>
            <p className="text-xs opacity-90">Sing anything — get instant AI coach feedback</p>
          </div>
          <ChevronRight className="h-5 w-5 opacity-80" />
        </Link>

        <Link
          to="/songs"
          className="mt-3 flex items-center gap-4 rounded-3xl bg-accent p-5 card-pop transition hover:scale-[1.01]"
        >
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-foreground/10">
            <Music className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-black leading-tight">My songs</p>
            <p className="text-xs text-muted-foreground">Import a track and get a song-specific coach</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <Link
          to="/history"
          className="mt-3 flex items-center justify-between rounded-2xl bg-card px-5 py-3 card-pop transition hover:scale-[1.01]"
        >
          <span className="font-display text-sm font-black">Practice history</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>

      {/* Units & lesson nodes */}
      <div className="mx-auto max-w-2xl space-y-10 px-5 pt-10">
        {lessonsByUnit.map((unit) => {
          const total = unit.lessons.length;
          const doneCount = unit.lessons.filter((l) => completedSet.has(l.id)).length;
          const pct = total ? Math.round((doneCount / total) * 100) : 0;
          const nextLesson = unit.lessons.find((l) => !completedSet.has(l.id));
          const unitComplete = total > 0 && doneCount === total;
          return (
          <section key={unit.name}>
            <div className="mb-4 rounded-3xl bg-card p-5 card-pop">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{unit.icon}</span>
                <div className="flex-1">
                  <h2 className="font-display text-xl font-black leading-tight">{unit.name}</h2>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {doneCount} / {total} lessons · {pct}%
                  </p>
                </div>
                {unitComplete && (
                  <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-black text-success">
                    Complete
                  </span>
                )}
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {nextLesson ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary/10 p-3">
                  <div className="flex-1 min-w-0 pl-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Up next</p>
                    <p className="truncate font-display text-sm font-black">{nextLesson.title}</p>
                  </div>
                  <Link
                    to="/lesson/$lessonId"
                    params={{ lessonId: nextLesson.id }}
                    className="flex flex-shrink-0 items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground btn-pop transition hover:scale-[1.02]"
                  >
                    {doneCount > 0 ? "Resume" : "Start"}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">🎉 You finished every lesson in this unit.</p>
              )}
            </div>
            <div className="space-y-4">
              {unit.lessons.map((lesson, i) => {
                const p = progress[lesson.id];
                const done = p?.completed;
                const isCurrent = !done && !foundCurrent;
                if (isCurrent) foundCurrent = true;
                const locked = !done && !isCurrent;
                // Zigzag offset
                const offset = i % 2 === 0 ? "ml-0" : "ml-auto mr-0";
                return (
                  <div key={lesson.id} className={`flex w-fit items-center gap-4 ${offset}`}>
                    <LessonNode
                      lessonId={lesson.id}
                      title={lesson.title}
                      subtitle={lesson.subtitle}
                      stars={p?.stars ?? 0}
                      locked={locked}
                      done={!!done}
                      isCurrent={isCurrent}
                      reverse={i % 2 !== 0}
                    />
                  </div>
                );
              })}
            </div>
          </section>
          );
        })}

        <div className="rounded-3xl bg-accent p-6 text-center card-pop">
          <p className="font-display text-lg font-bold">More units coming soon 🎤</p>
          <p className="mt-1 text-sm text-muted-foreground">Master the starter path to unlock advanced training.</p>
        </div>
      </div>
    </main>
  );
}

function LessonNode({
  lessonId, title, subtitle, stars, locked, done, isCurrent, reverse,
}: {
  lessonId: string; title: string; subtitle: string; stars: number;
  locked: boolean; done: boolean; isCurrent: boolean; reverse: boolean;
}) {
  const Inner = (
    <div className={`flex items-center gap-4 ${reverse ? "flex-row-reverse" : ""}`}>
      <div className="relative">
        {isCurrent && <span className="absolute inset-0 -z-0 animate-pulse-ring rounded-full bg-primary/40" />}
        <div
          className={`relative grid h-20 w-20 place-items-center rounded-full text-2xl font-black ${
            locked
              ? "bg-muted text-muted-foreground"
              : done
                ? "bg-success text-success-foreground btn-pop-success"
                : "bg-primary text-primary-foreground btn-pop"
          }`}
        >
          {locked ? <Lock className="h-7 w-7" /> : done ? <Check className="h-9 w-9" strokeWidth={3} /> : <Mic className="h-8 w-8" />}
        </div>
      </div>
      <div className={`max-w-[180px] ${reverse ? "text-right" : ""}`}>
        <p className="font-display text-base font-black leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {(done || stars > 0) && (
          <div className={`mt-1 flex gap-0.5 ${reverse ? "justify-end" : ""}`}>
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                className={`h-4 w-4 ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (locked) return <div className="opacity-60">{Inner}</div>;
  return (
    <Link to="/lesson/$lessonId" params={{ lessonId }} className="transition hover:scale-[1.02]">
      {Inner}
    </Link>
  );
}
