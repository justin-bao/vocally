import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Mic } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Vocaly" },
      { name: "description", content: "Sign in or create your free Vocaly account to start singing." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/journey" });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/journey`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome to Vocaly!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/journey" });
      if (r.error) throw r.error;
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-sunset px-4 py-10">
      <Link to="/" className="mx-auto flex max-w-md items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Mic className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <span className="font-display text-2xl font-black">Vocaly</span>
      </Link>

      <div className="mx-auto mt-8 max-w-md rounded-3xl bg-card p-7 card-pop">
        <h1 className="font-display text-3xl font-black">
          {mode === "login" ? "Welcome back" : "Start singing"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Sign in to continue your journey." : "Create a free account in seconds."}
        </p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-border bg-background px-5 py-3 font-bold text-foreground card-pop disabled:opacity-60"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          OR
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Input value={name} onChange={setName} placeholder="Display name" type="text" />
          )}
          <Input value={email} onChange={setEmail} placeholder="Email" type="email" required />
          <Input value={password} onChange={setPassword} placeholder="Password" type="password" required minLength={6} />
          <button
            disabled={busy}
            className="w-full rounded-2xl bg-primary px-5 py-3 font-extrabold uppercase tracking-wide text-primary-foreground btn-pop disabled:opacity-60"
          >
            {busy ? "..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-bold text-primary hover:underline"
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}

function Input({
  value, onChange, placeholder, type, required, minLength,
}: { value: string; onChange: (v: string) => void; placeholder: string; type: string; required?: boolean; minLength?: number; }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      required={required}
      minLength={minLength}
      className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary"
    />
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
