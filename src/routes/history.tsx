import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Music, Sparkles, Star } from "lucide-react";
import { SkeletonList } from "@/components/skeletons";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Practice history — Vocally" },
      { name: "description", content: "Your free practice attempts and AI coach feedback over time." },
    ],
  }),
  component: HistoryPage,
});

interface Attempt {
  id: string;
  created_at: string;
  description: string | null;
  duration_sec: number;
  overall_score: number;
  pitch_accuracy: number;
  breath_control: number;
  tone_quality: number;
  smoothness: number;
  rhythm: number;
  what_you_sang: string | null;
  summary: string | null;
  praise: string[];
  tips: string[];
  next_exercise_suggestion: string | null;
}

function HistoryPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Attempt[] | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("free_practice_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) console.error(error);
      setItems((data as unknown as Attempt[]) ?? []);
    })();
  }, [user]);

  return (
    <main className="min-h-screen bg-gradient-sunset pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/journey" className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your history</p>
            <p className="font-display text-base font-black">Free practice</p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-5 pt-6">
        {items === null && (
          <div className="rounded-3xl bg-card p-6 text-center text-muted-foreground card-pop animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-bounce-dot" />
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-bounce-dot [animation-delay:150ms]" />
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-bounce-dot [animation-delay:300ms]" />
              <span className="ml-2 text-sm font-bold uppercase tracking-wide">Loading…</span>
            </div>
          </div>
        )}
        {items && items.length === 0 && (
          <div className="rounded-3xl bg-card p-8 text-center card-pop">
            <Music className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-black">No practice yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your free practice attempts will appear here.</p>
            <Link
              to="/practice"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
            >
              Start practicing
            </Link>
          </div>
        )}
        {items?.map((a) => {
          const stars = a.overall_score >= 90 ? 3 : a.overall_score >= 70 ? 2 : a.overall_score >= 50 ? 1 : 0;
          const date = new Date(a.created_at);
          return (
            <div key={a.id} className="rounded-3xl bg-card p-5 card-pop">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {Math.round(a.duration_sec)}s
                  </p>
                  {a.description && (
                    <p className="mt-1 truncate font-display text-base font-bold">{a.description}</p>
                  )}
                  {!a.description && a.what_you_sang && (
                    <p className="mt-1 line-clamp-2 text-sm italic text-foreground/80">{a.what_you_sang}</p>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <p className="font-display text-3xl font-black tabular-nums text-primary">{a.overall_score}</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((n) => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-1.5 text-center">
                <Mini label="Pitch" v={a.pitch_accuracy} />
                <Mini label="Breath" v={a.breath_control} />
                <Mini label="Tone" v={a.tone_quality} />
                <Mini label="Smooth" v={a.smoothness} />
                <Mini label="Rhythm" v={a.rhythm} />
              </div>

              {a.summary && (
                <p className="mt-3 text-sm text-foreground/85">{a.summary}</p>
              )}

              {(a.praise?.length || a.tips?.length) && (
                <div className="mt-3 space-y-1">
                  {a.praise?.map((p, i) => (
                    <div key={`p${i}`} className="flex items-start gap-2 rounded-xl bg-success/10 px-3 py-1.5 text-sm">
                      <span>✨</span><span>{p}</span>
                    </div>
                  ))}
                  {a.tips?.map((t, i) => (
                    <div key={`t${i}`} className="flex items-start gap-2 rounded-xl bg-accent/60 px-3 py-1.5 text-sm">
                      <span>💡</span><span>{t}</span>
                    </div>
                  ))}
                </div>
              )}

              {a.next_exercise_suggestion && (
                <div className="mt-3 rounded-2xl bg-secondary/15 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-secondary">
                    <Sparkles className="h-3 w-3" /> Try next
                  </p>
                  <p className="mt-1 text-sm">{a.next_exercise_suggestion}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Mini({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-xl bg-muted/50 px-1 py-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-black tabular-nums">{v}</p>
    </div>
  );
}
