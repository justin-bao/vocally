import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LESSONS } from "@/lib/lessons";
import { ArrowLeft, Flame, Star, Mic, Music2, Trophy, Calendar, Sparkles, LogOut } from "lucide-react";
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

interface Profile {
  display_name: string | null;
  current_streak: number;
  last_practice_date: string | null;
  created_at: string;
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
}

function Profile() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agg, setAgg] = useState<Aggregates | null>(null);

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
      supabase.from("profiles").select("display_name, current_streak, last_practice_date, created_at").eq("id", user!.id).maybeSingle(),
      supabase.from("free_practice_attempts").select("overall_score, duration_sec, created_at").eq("user_id", user!.id),
      supabase.from("song_attempts").select("overall_score, duration_sec, created_at").eq("user_id", user!.id),
      supabase.from("lesson_attempts").select("overall_score, created_at").eq("user_id", user!.id),
      supabase.from("lesson_progress").select("lesson_id, stars, completed").eq("user_id", user!.id),
      supabase.from("songs").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    ]);

    setProfile((profRes.data as Profile) ?? null);

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

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Loading…</div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yStr = y.toISOString().slice(0, 10);
  const streakActive = profile?.last_practice_date === today || profile?.last_practice_date === yStr;
  const streak = profile?.current_streak ?? 0;
  const practicedToday = profile?.last_practice_date === today;
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
          <div className="min-w-0">
            <p className="font-display text-2xl font-black truncate">
              {profile?.display_name || user.email?.split("@")[0] || "Singer"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            {profile?.created_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Singing since {new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
              </p>
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

        {/* Activity heatmap (last 14 days) */}
        {agg && (
          <div className="rounded-3xl bg-card p-5 card-pop">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Last 14 days
            </div>
            <div className="mt-3 flex items-end gap-1 h-16">
              {agg.recentDays.map((d) => {
                const h = d.count > 0 ? Math.max(15, (d.count / maxDay) * 100) : 8;
                const isToday = d.date === today;
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
