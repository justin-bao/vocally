import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Music2, Trash2, Search, Mic, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/songs/")({
  head: () => ({
    meta: [
      { title: "My songs — Vocally" },
      { name: "description", content: "Your imported songs and per-song coaching." },
    ],
  }),
  component: SongsList,
});

interface SongRow {
  id: string;
  title: string;
  artist: string | null;
  image_url: string | null;
  source: string;
  created_at: string;
}

interface AttemptRow {
  id: string;
  song_id: string;
  overall_score: number;
  mode: string;
  created_at: string;
}

function SongsList() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [songs, setSongs] = useState<SongRow[] | null>(null);
  const [attemptsBySong, setAttemptsBySong] = useState<Record<string, AttemptRow[]>>({});

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, artist, image_url, source, created_at")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    const songRows = (data as SongRow[]) ?? [];
    setSongs(songRows);

    if (songRows.length > 0) {
      const { data: attempts } = await supabase
        .from("song_attempts")
        .select("id, song_id, overall_score, mode, created_at")
        .in("song_id", songRows.map((s) => s.id))
        .order("created_at", { ascending: false });
      const map: Record<string, AttemptRow[]> = {};
      (attempts ?? []).forEach((a) => {
        const arr = map[a.song_id] ?? (map[a.song_id] = []);
        if (arr.length < 3) arr.push(a as AttemptRow);
      });
      setAttemptsBySong(map);
    } else {
      setAttemptsBySong({});
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this song from your library?")) return;
    const { error } = await supabase.from("songs").delete().eq("id", id);
    if (error) toast.error("Couldn't remove song");
    else { toast.success("Removed"); void load(); }
  };

  return (
    <main className="min-h-screen bg-gradient-sunset pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/journey" className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-base font-black">My songs</p>
          <Link to="/songs/import" className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground btn-pop">
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-3 px-5 pt-6">
        {songs === null && (
          <div className="rounded-3xl bg-card p-6 text-center text-muted-foreground card-pop">Loading…</div>
        )}
        {songs && songs.length === 0 && (
          <div className="rounded-3xl bg-card p-8 text-center card-pop">
            <Music2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-black">Build your library</p>
            <p className="mt-1 text-sm text-muted-foreground">Import a song to start coaching.</p>
            <Link
              to="/songs/import"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-extrabold uppercase tracking-wide text-primary-foreground btn-pop"
            >
              <Plus className="h-4 w-4" /> Import a song
            </Link>
          </div>
        )}
        {songs?.map((s) => {
          const recent = attemptsBySong[s.id] ?? [];
          const best = recent.length ? Math.max(...recent.map((a) => a.overall_score)) : null;
          return (
            <div key={s.id} className="rounded-3xl bg-card p-3 card-pop">
              <div className="flex items-center gap-3">
                <Link to="/songs/$songId" params={{ songId: s.id }} className="flex flex-1 items-center gap-3">
                  {s.image_url ? (
                    <img src={s.image_url} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-xl bg-muted">
                      <Music2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-black">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.artist || "—"} · {sourceLabel(s.source)}</p>
                  </div>
                </Link>
                {best !== null && (
                  <div className="flex flex-col items-end pr-1">
                    <p className="font-display text-lg font-black tabular-nums text-primary leading-none">{best}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">best</p>
                  </div>
                )}
                <button
                  onClick={() => remove(s.id)}
                  className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {recent.length > 0 && (
                <Link
                  to="/songs/$songId"
                  params={{ songId: s.id }}
                  className="mt-2 flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-muted/40 px-2 py-2"
                >
                  {recent.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-background px-2 py-1"
                      title={`${a.mode === "sing_along" ? "Sing-along" : "A cappella"} · ${new Date(a.created_at).toLocaleString()}`}
                    >
                      <span className="font-display text-sm font-black tabular-nums text-primary">{a.overall_score}</span>
                      <span className="text-[10px] text-muted-foreground">{relativeTime(a.created_at)}</span>
                    </div>
                  ))}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sourceLabel(s: string) {
  switch (s) {
    case "itunes": return "iTunes";
    case "youtube": return "YouTube";
    case "upload": return "Upload";
    default: return s;
  }
}
