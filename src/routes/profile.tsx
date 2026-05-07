import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LESSONS } from "@/lib/lessons";
import { ArrowLeft, Flame, Star, Mic, Music2, Trophy, Calendar, Sparkles, LogOut, Target, Pencil, Check, X, Award, Lock } from "lucide-react";
import { toast } from "sonner";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Vocally" },
      { name: "description", content: "Your singing progress, streak, and aggregate stats." },
    ],
  }),
  component: Profile,
});

const STREAK_MILESTONES: { days: number; label: string; emoji: string }[] = [
  { days: 3, label: "Spark", emoji: "✨" },
  { days: 7, label: "Week", emoji: "🔥" },
  { days: 14, label: "Fortnight", emoji: "🎯" },
  { days: 30, label: "Monthly", emoji: "🏅" },
  { days: 60, label: "Devoted", emoji: "💎" },
  { days: 100, label: "Centurion", emoji: "👑" },
];

interface Profile {
  display_name: string | null;
  current_streak: number;
  last_practice_date: string | null;
  created_at: string;
  daily_goal_minutes: number;
  daily_goal_takes: number;
}

interface TodayProgress {
  minutes: number;
  takes: number;
}

interface Aggregates {
  totalAttempts: number;
  totalMinutes: number;
  avgScore: number | null;
  bestScore: number | null;
  lessonsCompleted: number;
  totalStars: number;
  songsLibrary: number;
  daysActive: number;
  freeAttempts: number;
  songAttempts: number;
  lessonAttempts: number;
  recentDays: { date: string; count: number }[];
  skills: {
    pitch: { avg: number | null; recent: number | null; count: number };
    breath: { avg: number | null; recent: number | null; count: number };
    tone: { avg: number | null; recent: number | null; count: number };
    smoothness: { avg: number | null; recent: number | null; count: number };
  };
}

function Profile() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agg, setAgg] = useState<Aggregates | null>(null);
  const [today, setToday] = useState<TodayProgress>({ minutes: 0, takes: 0 });
  const [editGoal, setEditGoal] = useState(false);
  const [draftMin, setDraftMin] = useState(5);
  const [draftTakes, setDraftTakes] = useState(1);
  const [savingGoal, setSavingGoal] = useState(false);
  const [editName, setEditName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    const [profRes, freeRes, songRes, lessonRes, progressRes, songsRes] = await Promise.all([
      supabase.from("profiles").select("display_name, current_streak, last_practice_date, created_at, daily_goal_minutes, daily_goal_takes").eq("id", user!.id).maybeSingle(),
      supabase.from("free_practice_attempts").select("overall_score, duration_sec, created_at").eq("user_id", user!.id),
      supabase.from("song_attempts").select("overall_score, duration_sec, created_at").eq("user_id", user!.id),
      supabase.from("lesson_attempts").select("overall_score, created_at").eq("user_id", user!.id),
      supabase.from("lesson_progress").select("lesson_id, stars, completed").eq("user_id", user!.id),
      supabase.from("songs").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    ]);

    setProfile((profRes.data as Profile) ?? null);
    if (profRes.data) {
      setDraftMin((profRes.data as Profile).daily_goal_minutes ?? 5);
      setDraftTakes((profRes.data as Profile).daily_goal_takes ?? 1);
      setDraftName((profRes.data as Profile).display_name ?? "");
    }

    const free = freeRes.data ?? [];
    const songs = songRes.data ?? [];
    const lessons = lessonRes.data ?? [];
    const progress = progressRes.data ?? [];

    const allWithScore = [
      ...free.map((a) => ({ score: a.overall_score, dur: Number(a.duration_sec) || 0, at: a.created_at })),
      ...songs.map((a) => ({ score: a.overall_score, dur: Number(a.duration_sec) || 0, at: a.created_at })),
      ...lessons.map((a) => ({ score: a.overall_score, dur: 0, at: a.created_at })),
    ];

    const totalAttempts = allWithScore.length;
    const totalSeconds = allWithScore.reduce((acc, a) => acc + a.dur, 0);
    const avgScore = totalAttempts ? Math.round(allWithScore.reduce((acc, a) => acc + a.score, 0) / totalAttempts) : null;
    const bestScore = totalAttempts ? Math.max(...allWithScore.map((a) => a.score)) : null;

    const completed = progress.filter((p) => p.completed);
    const totalStars = progress.reduce((acc, p) => acc + (p.stars ?? 0), 0);

    // Activity for last 14 days
    const days: { date: string; count: number }[] = [];
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const counts = new Map<string, number>();
    allWithScore.forEach((a) => {
      const k = dayKey(new Date(a.at));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      days.push({ date: k, count: counts.get(k) ?? 0 });
    }
    const daysActive = Array.from(counts.values()).filter((n) => n > 0).length;

    // Today progress
    const todayKey = dayKey(new Date());
    let todayMinutes = 0;
    let todayTakes = 0;
    allWithScore.forEach((a) => {
      if (dayKey(new Date(a.at)) === todayKey) {
        todayTakes += 1;
        todayMinutes += (a.dur || 0) / 60;
      }
    });
    setToday({ minutes: Math.round(todayMinutes * 10) / 10, takes: todayTakes });

    setAgg({
      totalAttempts,
      totalMinutes: Math.round(totalSeconds / 60),
      avgScore,
      bestScore,
      lessonsCompleted: completed.length,
      totalStars,
      songsLibrary: songsRes.count ?? 0,
      daysActive,
      freeAttempts: free.length,
      songAttempts: songs.length,
      lessonAttempts: lessons.length,
      recentDays: days,
    });
  };

  const saveGoal = async () => {
    if (!user) return;
    const min = Math.max(1, Math.min(120, Math.round(draftMin)));
    const takes = Math.max(1, Math.min(20, Math.round(draftTakes)));
    setSavingGoal(true);
    const { error } = await supabase
      .from("profiles")
      .update({ daily_goal_minutes: min, daily_goal_takes: takes })
      .eq("id", user.id);
    setSavingGoal(false);
    if (error) {
      toast.error("Couldn't save goal");
      return;
    }
    setProfile((p) => (p ? { ...p, daily_goal_minutes: min, daily_goal_takes: takes } : p));
    setEditGoal(false);
    toast.success("Goal updated");
  };

  const saveName = async () => {
    if (!user) return;
    const name = draftName.trim().slice(0, 60);
    if (!name) {
      toast.error("Name can't be empty");
      return;
    }
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", user.id);
    setSavingName(false);
    if (error) {
      toast.error("Couldn't save name");
      return;
    }
    setProfile((p) => (p ? { ...p, display_name: name } : p));
    setEditName(false);
    toast.success("Name updated");
  };
  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Loading…</div>;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yStr = y.toISOString().slice(0, 10);
  const streakActive = profile?.last_practice_date === todayStr || profile?.last_practice_date === yStr;
  const streak = profile?.current_streak ?? 0;
  const practicedToday = profile?.last_practice_date === todayStr;
  const totalLessons = LESSONS.length;

  const maxDay = agg ? Math.max(1, ...agg.recentDays.map((d) => d.count)) : 1;

  return (
    <main className="min-h-screen bg-gradient-sunset pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/journey" className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-base font-black">My profile</p>
          <button
            onClick={() => { signOut(); nav({ to: "/" }); }}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-5 pt-6">
        {/* Identity */}
        <div className="flex items-center gap-4 rounded-3xl bg-card p-5 card-pop">
          <img src={mascot} alt="" width={72} height={72} className="h-[72px] w-[72px] flex-shrink-0" />
          <div className="min-w-0 flex-1">
            {!editName ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="font-display text-2xl font-black truncate">
                    {profile?.display_name || user.email?.split("@")[0] || "Singer"}
                  </p>
                  <button
                    onClick={() => {
                      setDraftName(profile?.display_name ?? "");
                      setEditName(true);
                    }}
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Edit display name"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                {profile?.created_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Singing since {new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Display name</label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={60}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveName();
                    if (e.key === "Escape") setEditName(false);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-display text-lg font-bold focus:border-primary focus:outline-none"
                  placeholder="Your name"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void saveName()}
                    disabled={savingName}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Save
                  </button>
                  <button
                    onClick={() => setEditName(false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm font-bold text-foreground"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Streak hero */}
        <div className={`relative overflow-hidden rounded-3xl p-5 card-pop ${streakActive ? "bg-secondary text-secondary-foreground" : "bg-card"}`}>
          <div className="flex items-center gap-4">
            <div className={`grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl ${streakActive ? "bg-secondary-foreground/15" : "bg-muted"}`}>
              <Flame className={`h-9 w-9 ${streakActive ? "" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-display text-4xl font-black leading-none tabular-nums">{streak}</p>
              <p className="mt-1 text-sm font-bold">
                {streak === 0
                  ? "Start your streak today"
                  : streak === 1
                    ? "day · keep it going!"
                    : "day streak 🔥"}
              </p>
            </div>
          </div>

          {!practicedToday && (
            <div className={`mt-4 rounded-2xl p-3 text-sm font-bold ${streakActive ? "bg-secondary-foreground/10" : "bg-primary/10 text-primary"}`}>
              {streakActive
                ? "You sang yesterday — practice today to keep your streak alive."
                : "Practice today to start a new streak."}
              <Link
                to="/practice"
                className={`mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${streakActive ? "bg-secondary-foreground text-secondary" : "bg-primary text-primary-foreground"}`}
              >
                <Mic className="h-3.5 w-3.5" /> Practice now
              </Link>
            </div>
          )}
          {practicedToday && (
            <p className="mt-3 text-sm font-bold">✓ Practiced today — streak secured.</p>
          )}
        </div>

        {/* Daily goal */}
        {profile && (() => {
          const goalMin = profile.daily_goal_minutes ?? 5;
          const goalTakes = profile.daily_goal_takes ?? 1;
          const minPct = Math.min(100, (today.minutes / goalMin) * 100);
          const takesPct = Math.min(100, (today.takes / goalTakes) * 100);
          const minHit = today.minutes >= goalMin;
          const takesHit = today.takes >= goalTakes;
          const allHit = minHit && takesHit;
          return (
            <div className="rounded-3xl bg-card p-5 card-pop">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Target className="h-3.5 w-3.5" /> Today's goal
                </div>
                {!editGoal ? (
                  <button
                    onClick={() => setEditGoal(true)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-muted"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditGoal(false); setDraftMin(goalMin); setDraftTakes(goalTakes); }}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                      aria-label="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={saveGoal}
                      disabled={savingGoal}
                      className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                      aria-label="Save"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {!editGoal ? (
                <>
                  {allHit && (
                    <p className="mt-3 rounded-2xl bg-success/15 p-3 text-sm font-bold text-success">
                      🎉 Goal reached! Great work today.
                    </p>
                  )}
                  <div className="mt-3 space-y-3">
                    <GoalBar label="Minutes sung" current={today.minutes} goal={goalMin} pct={minPct} hit={minHit} unit="min" />
                    <GoalBar label="Takes recorded" current={today.takes} goal={goalTakes} pct={takesPct} hit={takesHit} />
                  </div>
                </>
              ) : (
                <div className="mt-4 space-y-4">
                  <GoalEditor label="Minutes per day" value={draftMin} onChange={setDraftMin} min={1} max={60} unit="min" />
                  <GoalEditor label="Takes per day" value={draftTakes} onChange={setDraftTakes} min={1} max={10} />
                </div>
              )}
            </div>
          );
        })()}


        {agg && (
          <div className="rounded-3xl bg-card p-5 card-pop">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Last 14 days
            </div>
            <div className="mt-3 flex items-end gap-1 h-16">
              {agg.recentDays.map((d) => {
                const h = d.count > 0 ? Math.max(15, (d.count / maxDay) * 100) : 8;
                const isToday = d.date === todayStr;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center justify-end gap-1"
                    title={`${d.date}: ${d.count} ${d.count === 1 ? "session" : "sessions"}`}
                  >
                    <div
                      className={`w-full rounded-md transition ${
                        d.count === 0
                          ? "bg-muted"
                          : isToday
                            ? "bg-secondary"
                            : "bg-primary"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {agg.daysActive} active {agg.daysActive === 1 ? "day" : "days"} overall
            </p>
          </div>
        )}

        {/* Stats grid */}
        {agg && (
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={<Trophy className="h-4 w-4" />} label="Best score" value={agg.bestScore ?? "—"} tone="primary" />
            <Stat icon={<Sparkles className="h-4 w-4" />} label="Avg score" value={agg.avgScore ?? "—"} tone="accent" />
            <Stat icon={<Mic className="h-4 w-4" />} label="Total takes" value={agg.totalAttempts} tone="card" />
            <Stat icon={<Calendar className="h-4 w-4" />} label="Minutes sung" value={agg.totalMinutes} tone="card" />
            <Stat
              icon={<Star className="h-4 w-4" />}
              label="Stars earned"
              value={`${agg.totalStars} / ${totalLessons * 3}`}
              tone="card"
            />
            <Stat
              icon={<Music2 className="h-4 w-4" />}
              label="Songs in library"
              value={agg.songsLibrary}
              tone="card"
            />
          </div>
        )}

        {/* Breakdown */}
        {agg && (
          <div className="rounded-3xl bg-card p-5 card-pop">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Breakdown</p>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Lessons completed" value={`${agg.lessonsCompleted} / ${totalLessons}`} />
              <Row label="Lesson attempts" value={agg.lessonAttempts} />
              <Row label="Free practice takes" value={agg.freeAttempts} />
              <Row label="Song takes" value={agg.songAttempts} />
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="rounded-3xl bg-card p-5 card-pop">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Award className="h-3.5 w-3.5" /> Achievements
            </div>
            <p className="text-xs font-bold text-muted-foreground tabular-nums">
              {STREAK_MILESTONES.filter((m) => streak >= m.days).length} / {STREAK_MILESTONES.length}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Streak milestones unlocked by consistent daily practice.</p>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {STREAK_MILESTONES.map((m) => {
              const unlocked = streak >= m.days;
              return (
                <div
                  key={m.days}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition ${
                    unlocked ? "bg-secondary/15 ring-1 ring-secondary/40" : "bg-muted/40"
                  }`}
                  title={unlocked ? `${m.label} — unlocked` : `Reach a ${m.days}-day streak`}
                >
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl text-xl ${
                      unlocked ? "bg-gradient-to-br from-secondary to-primary text-secondary-foreground shadow-md" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {unlocked ? m.emoji : <Lock className="h-4 w-4" />}
                  </div>
                  <p className={`font-display text-sm font-black leading-none ${unlocked ? "" : "text-muted-foreground"}`}>
                    {m.days}d
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-wide leading-tight ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                    {m.label}
                  </p>
                </div>
              );
            })}
          </div>
          {(() => {
            const next = STREAK_MILESTONES.find((m) => streak < m.days);
            if (!next) {
              return (
                <p className="mt-4 rounded-2xl bg-success/15 p-3 text-sm font-bold text-success">
                  🏆 All streak badges earned — you're a legend.
                </p>
              );
            }
            const remaining = next.days - streak;
            return (
              <p className="mt-4 text-xs font-bold text-muted-foreground">
                {remaining} more {remaining === 1 ? "day" : "days"} to unlock <span className="text-foreground">{next.label}</span>.
              </p>
            );
          })()}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/history"
            className="rounded-2xl bg-card p-4 text-center card-pop transition hover:scale-[1.01]"
          >
            <p className="font-display text-sm font-black">Practice history</p>
            <p className="mt-1 text-xs text-muted-foreground">All your takes</p>
          </Link>
          <Link
            to="/songs"
            className="rounded-2xl bg-card p-4 text-center card-pop transition hover:scale-[1.01]"
          >
            <p className="font-display text-sm font-black">My songs</p>
            <p className="mt-1 text-xs text-muted-foreground">Coached library</p>
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number | string; tone: "primary" | "accent" | "card" }) {
  const cls =
    tone === "primary" ? "bg-primary text-primary-foreground"
      : tone === "accent" ? "bg-accent text-foreground"
        : "bg-card text-foreground";
  return (
    <div className={`rounded-2xl p-4 card-pop ${cls}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-80">
        {icon} {label}
      </div>
      <p className="mt-2 font-display text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display font-black tabular-nums">{value}</span>
    </div>
  );
}

function GoalBar({
  label, current, goal, pct, hit, unit,
}: { label: string; current: number; goal: number; pct: number; hit: boolean; unit?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold text-muted-foreground">{label}</span>
        <span className={`font-display font-black tabular-nums ${hit ? "text-success" : ""}`}>
          {current}{unit ? ` ${unit}` : ""} / {goal}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${hit ? "bg-success" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GoalEditor({
  label, value, onChange, min, max, unit,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; unit?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-display text-lg font-black tabular-nums">
          {value}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-primary"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

