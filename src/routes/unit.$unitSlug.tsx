import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LESSONS, UNITS } from "@/lib/lessons";
import { ArrowLeft, Check, ChevronRight, List, Lock, Mic, Search, Star, Trophy, Flame, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const slugifyUnit = (name: string) =>
  name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const Route = createFileRoute("/unit/$unitSlug")({
  head: ({ params }) => {
    const unit = UNITS.find((u) => slugifyUnit(u.name) === params.unitSlug);
    return {
      meta: [
        { title: `${unit?.name ?? "Unit"} — Vocally` },
        { name: "description", content: `Lessons, scores, and recent attempts in ${unit?.name ?? "this unit"}.` },
      ],
    };
  },
  component: UnitDetails,
});

interface ProgressRow {
  lesson_id: string;
  best_score: number;
  completed: boolean;
  stars: number;
  attempts_count: number | null;
  best_streak: number | null;
  current_streak: number | null;
}

interface AttemptRow {
  id: string;
  lesson_id: string;
  overall_score: number;
  pitch_score: number | null;
  ai_feedback: { breath_control?: number; tone_quality?: number; smoothness?: number } | null;
  created_at: string;
}

type MetricKey = "pitch" | "breath" | "tone" | "smooth";
const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "pitch", label: "Pitch", color: "hsl(var(--primary))" },
  { key: "breath", label: "Breath", color: "hsl(var(--secondary))" },
  { key: "tone", label: "Tone", color: "hsl(var(--success))" },
  { key: "smooth", label: "Smooth", color: "hsl(var(--accent))" },
];

function metricValue(a: AttemptRow, key: MetricKey): number | null {
  if (key === "pitch") return a.pitch_score ?? null;
  if (key === "breath") return a.ai_feedback?.breath_control ?? null;
  if (key === "tone") return a.ai_feedback?.tone_quality ?? null;
  return a.ai_feedback?.smoothness ?? null;
}

function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const w = 80;
  const h = 24;
  const valid = values.map((v, i) => ({ v, i })).filter((p) => p.v != null) as { v: number; i: number }[];
  if (valid.length === 0) {
    return <div className="h-6 w-20 rounded bg-muted/50" />;
  }
  const stepX = values.length > 1 ? w / (values.length - 1) : 0;
  const points = valid.map((p) => `${(p.i * stepX).toFixed(1)},${(h - (p.v / 100) * h).toFixed(1)}`).join(" ");
  const last = valid[valid.length - 1];
  const lastX = last.i * stepX;
  const lastY = h - (last.v / 100) * h;
  const first = valid[0].v;
  const delta = last.v - first;
  return (
    <div className="flex items-center gap-1.5">
      <svg width={w} height={h} className="overflow-visible">
        {valid.length > 1 && <polyline fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={points} />}
        <circle cx={lastX} cy={lastY} r={2} fill={color} />
      </svg>
      <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color }}>{last.v}</span>
      {valid.length > 1 && (
        <span className={`text-[9px] font-bold ${delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"}{Math.abs(delta)}
        </span>
      )}
    </div>
  );
}

function UnitDetails() {
  const { unitSlug } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const unit = useMemo(() => UNITS.find((u) => slugifyUnit(u.name) === unitSlug), [unitSlug]);
  const lessons = useMemo(() => (unit ? LESSONS.filter((l) => l.unit === unit.name) : []), [unit]);

  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [attemptsByLesson, setAttemptsByLesson] = useState<Record<string, AttemptRow[]>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "todo">("all");
  const [minBest, setMinBest] = useState(0);
  const [sortBy, setSortBy] = useState<"default" | "recent" | "best">("default");
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  const filteredLessons = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = lessons.filter((l) => {
      const p = progress[l.id];
      if (statusFilter === "done" && !p?.completed) return false;
      if (statusFilter === "todo" && p?.completed) return false;
      if (minBest > 0 && (p?.best_score ?? 0) < minBest) return false;
      if (q) {
        const hay = `${l.title} ${l.subtitle ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sortBy === "recent") {
      list = [...list].sort((a, b) => {
        const ta = attemptsByLesson[a.id]?.[0]?.created_at ?? "";
        const tb = attemptsByLesson[b.id]?.[0]?.created_at ?? "";
        return tb.localeCompare(ta);
      });
    } else if (sortBy === "best") {
      list = [...list].sort((a, b) => (progress[b.id]?.best_score ?? 0) - (progress[a.id]?.best_score ?? 0));
    }
    return list;
  }, [lessons, progress, attemptsByLesson, query, statusFilter, minBest, sortBy]);

  const filtersActive = query !== "" || statusFilter !== "all" || minBest > 0 || sortBy !== "default";

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user || lessons.length === 0) return;
    const ids = lessons.map((l) => l.id);
    (async () => {
      const [{ data: prog }, { data: atts }] = await Promise.all([
        supabase
          .from("lesson_progress")
          .select("lesson_id, best_score, completed, stars, attempts_count, best_streak, current_streak")
          .eq("user_id", user.id)
          .in("lesson_id", ids),
        supabase
          .from("lesson_attempts")
          .select("id, lesson_id, overall_score, pitch_score, ai_feedback, created_at")
          .eq("user_id", user.id)
          .in("lesson_id", ids)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      const pmap: Record<string, ProgressRow> = {};
      (prog || []).forEach((p) => (pmap[p.lesson_id] = p as ProgressRow));
      setProgress(pmap);
      const amap: Record<string, AttemptRow[]> = {};
      (atts || []).forEach((a) => {
        const list = amap[a.lesson_id] || (amap[a.lesson_id] = []);
        list.push(a as AttemptRow);
      });
      setAttemptsByLesson(amap);
    })();
  }, [user, lessons]);

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Loading…</div>;
  }

  if (!unit) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <p className="font-display text-xl font-black">Unit not found</p>
          <Link to="/journey" className="mt-4 inline-block text-sm text-primary underline">
            Back to journey
          </Link>
        </div>
      </main>
    );
  }

  const total = lessons.length;
  const doneCount = lessons.filter((l) => progress[l.id]?.completed).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const nextLesson = lessons.find((l) => !progress[l.id]?.completed);
  const avgBest = total
    ? Math.round(
        lessons.reduce((acc, l) => acc + (progress[l.id]?.best_score ?? 0), 0) / total,
      )
    : 0;

  return (
    <main className="min-h-screen bg-gradient-sunset pb-20">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
          <Link
            to="/journey"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex flex-1 items-center gap-2 truncate">
            <span className="text-xl">{unit.icon}</span>
            <span className="truncate font-display text-lg font-black">{unit.name}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 pt-6">
        <div className="rounded-3xl bg-card p-5 card-pop">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Unit progress</p>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="font-display text-3xl font-black">{pct}%</p>
            <p className="text-sm text-muted-foreground">{doneCount} / {total} lessons</p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Avg best</p>
              <p className="font-display text-xl font-black">{avgBest}</p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Lessons left</p>
              <p className="font-display text-xl font-black">{Math.max(0, total - doneCount)}</p>
            </div>
          </div>
          {nextLesson ? (
            <Link
              to="/lesson/$lessonId"
              params={{ lessonId: nextLesson.id }}
              className="mt-4 flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-primary-foreground btn-pop transition hover:scale-[1.01]"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                  {doneCount > 0 ? "Resume unit" : "Start unit"}
                </p>
                <p className="font-display text-sm font-black">{nextLesson.title}</p>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">🎉 You finished every lesson in this unit.</p>
          )}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-2xl space-y-3 px-5">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">All lessons</p>
          <p className="text-[10px] font-bold text-muted-foreground">
            {filteredLessons.length} / {lessons.length}
          </p>
        </div>

        <div className="rounded-3xl bg-card p-3 card-pop space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lessons…"
              className="h-10 w-full rounded-2xl bg-muted pl-9 pr-9 text-sm font-medium outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-background"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</p>
            <div className="flex gap-1.5">
              {([
                { k: "all", label: "All" },
                { k: "done", label: "Completed" },
                { k: "todo", label: "Not yet" },
              ] as const).map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setStatusFilter(opt.k)}
                  className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    statusFilter === opt.k
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Min best score</p>
              <p className="font-mono text-xs font-bold tabular-nums">{minBest}</p>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minBest}
              onChange={(e) => setMinBest(Number(e.target.value))}
              className="mt-1 w-full accent-primary"
            />
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sort by</p>
            <div className="flex gap-1.5">
              {([
                { k: "default", label: "Order" },
                { k: "recent", label: "Most recent" },
                { k: "best", label: "Best score" },
              ] as const).map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setSortBy(opt.k)}
                  className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    sortBy === opt.k
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setMinBest(0);
                setSortBy("default");
              }}
              className="w-full rounded-xl bg-muted/60 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
            >
              Reset filters
            </button>
          )}
        </div>

        {filteredLessons.length === 0 ? (
          <div className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground card-pop">
            No lessons match your filters.
          </div>
        ) : null}
        {filteredLessons.map((lesson) => {
          const p = progress[lesson.id];
          const done = !!p?.completed;
          const stars = p?.stars ?? 0;
          const best = p?.best_score ?? 0;
          const tries = p?.attempts_count ?? 0;
          const streak = p?.best_streak ?? 0;
          const recent = attemptsByLesson[lesson.id] || [];
          const isLocked = !done && lessons.findIndex((l) => l.id === lesson.id) > lessons.findIndex((l) => !progress[l.id]?.completed);
          return (
            <Link
              key={lesson.id}
              to="/lesson/$lessonId"
              params={{ lessonId: lesson.id }}
              className="block rounded-3xl bg-card p-4 card-pop transition hover:scale-[1.005]"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl ${
                    done
                      ? "bg-success text-success-foreground"
                      : isLocked
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground"
                  }`}
                >
                  {done ? <Check className="h-5 w-5" strokeWidth={3} /> : isLocked ? <Lock className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-base font-black leading-tight">{lesson.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{lesson.subtitle}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((n) => (
                        <Star
                          key={n}
                          className={`h-3.5 w-3.5 ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Trophy className="h-3 w-3" /> Best <b className="text-foreground">{best}</b>
                    </span>
                    <span className="text-muted-foreground">
                      Tries <b className="text-foreground">{tries}</b>
                    </span>
                    {streak > 0 && (
                      <span className="flex items-center gap-1 text-secondary">
                        <Flame className="h-3 w-3" /> {streak}
                      </span>
                    )}
                  </div>
                  {recent.length > 0 && (
                    <>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {recent.map((a) => (
                          <span
                            key={a.id}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground"
                            title={new Date(a.created_at).toLocaleString()}
                          >
                            {new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {a.overall_score}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 rounded-2xl bg-muted/40 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Last {recent.length} attempts
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {METRICS.map((m) => {
                            const series = [...recent].reverse().map((a) => metricValue(a, m.key));
                            return (
                              <div key={m.key} className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground">{m.label}</span>
                                <Sparkline values={series} color={m.color} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
