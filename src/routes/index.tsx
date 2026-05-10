import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import mascot from "@/assets/mascot.png";
import { Mic, Sparkles, Trophy, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vocally — Learn to sing, one lesson at a time" },
      { name: "description", content: "Bite-sized singing lessons with real-time pitch feedback and AI vocal coaching. Start free." },
      { property: "og:title", content: "Vocally — Learn to sing" },
      { property: "og:description", content: "Real-time pitch + AI voice coaching. Start your singing journey today." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) nav({ to: "/journey" });
  }, [user, loading, nav]);

  // Avoid flashing the marketing landing while we know (or are about to know)
  // the user is signed in and we're redirecting to /journey.
  if (loading || user) {
    return <LoadingScreen label="Tuning up…" />;
  }

  return (
    <main className="min-h-screen bg-gradient-sunset">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground btn-pop-sm">
            <Mic className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl font-black text-foreground">Vocally</span>
        </div>
        <Link
          to="/auth"
          className="rounded-2xl bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:opacity-90"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-2 md:items-center md:py-20">
        <div className="order-2 md:order-1">
          <h1 className="font-display text-5xl font-black leading-[1.05] text-foreground md:text-6xl">
            Find your voice.
            <br />
            <span className="text-secondary">One note at a time.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Vocally is the playful way to learn singing. Real-time pitch feedback, AI vocal coaching,
            and bite-sized lessons that actually fit into your day.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-2xl bg-primary px-7 py-4 text-base font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
            >
              Get started — free
            </Link>
            <Link
              to="/auth"
              className="rounded-2xl border-2 border-foreground/15 bg-card px-7 py-4 text-base font-extrabold uppercase tracking-wide text-foreground card-pop"
            >
              I have an account
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 text-sm">
            <Feature icon={<Activity className="h-5 w-5" />} label="Live pitch" />
            <Feature icon={<Sparkles className="h-5 w-5" />} label="AI coach" />
            <Feature icon={<Trophy className="h-5 w-5" />} label="Earn stars" />
          </div>
        </div>

        <div className="order-1 grid place-items-center md:order-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl" />
            <img
              src={mascot}
              alt="Vocally the singing songbird mascot"
              width={420}
              height={420}
              className="relative animate-wobble drop-shadow-xl"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-3xl bg-card p-8 card-pop md:p-10">
          <h2 className="font-display text-3xl font-black text-foreground">How it works</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <Step n="1" title="Pick a lesson" body="Start at the beginning or jump into your next challenge on the journey map." />
            <Step n="2" title="Sing into your mic" body="Watch your pitch in real time as you match the target notes." />
            <Step n="3" title="Get AI feedback" body="A vocal coach scores your breath, tone, and smoothness — every attempt." />
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 pb-10 text-center text-sm text-muted-foreground">
        Built with ♥ for new singers.
      </footer>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-card/60 p-3 text-foreground">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">{icon}</div>
      <span className="text-xs font-bold">{label}</span>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-pop text-base font-black text-primary-foreground btn-pop">
        {n}
      </div>
      <h3 className="mt-3 font-display text-xl font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
