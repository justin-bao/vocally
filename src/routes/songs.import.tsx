import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { searchITunes, fetchYouTubeMeta, generateCoachingPlan, type ITunesResult } from "@/server/songs.functions";
import { ArrowLeft, Search, Youtube, Upload, Loader2, Music2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/songs/import")({
  head: () => ({
    meta: [
      { title: "Import a song — Vocally" },
      { name: "description", content: "Search iTunes, paste a YouTube link, or upload an MP3." },
    ],
  }),
  component: ImportSong,
});

type Tab = "search" | "youtube" | "upload";

function ImportSong() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("search");
  const [busy, setBusy] = useState(false);

  // search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ITunesResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  // youtube
  const [ytUrl, setYtUrl] = useState("");

  // upload
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const importAndOpen = async (
    base: {
      source: "itunes" | "youtube" | "upload";
      source_id: string | null;
      title: string;
      artist: string;
      album?: string;
      image_url?: string | null;
      preview_url?: string | null;
      duration_sec?: number;
    },
  ) => {
    if (!user) return;
    setBusy(true);
    try {
      // Generate AI plan in parallel with insert
      const planPromise = generateCoachingPlan({
        data: { title: base.title, artist: base.artist },
      }).catch((e) => {
        console.warn("plan failed", e);
        return null;
      });

      const { data: inserted, error } = await supabase
        .from("songs")
        .insert({
          user_id: user.id,
          source: base.source,
          source_id: base.source_id,
          title: base.title,
          artist: base.artist || null,
          album: base.album || null,
          image_url: base.image_url || null,
          preview_url: base.preview_url || null,
          duration_sec: base.duration_sec ?? null,
          contour_status: "pending",
        })
        .select("id")
        .single();
      if (error || !inserted) throw error || new Error("Insert failed");

      const plan = await planPromise;
      if (plan) {
        await supabase.from("songs").update({ ai_plan: plan }).eq("id", inserted.id);
      }

      toast.success("Song added");
      nav({ to: "/songs/$songId", params: { songId: inserted.id } });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not import song");
    } finally {
      setBusy(false);
    }
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { results: r } = await searchITunes({ data: { query: query.trim(), limit: 10 } });
      setResults(r);
    } catch (e: any) {
      toast.error(e?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const importYouTube = async () => {
    if (!ytUrl.trim()) return;
    setBusy(true);
    try {
      const meta = await fetchYouTubeMeta({ data: { url: ytUrl.trim() } });
      await importAndOpen({
        source: "youtube",
        source_id: meta.source_id,
        title: meta.title,
        artist: meta.artist,
        image_url: meta.image_url,
      });
    } catch (e: any) {
      toast.error(e?.message || "Could not load YouTube link");
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f || !user) return;
    if (!uploadTitle.trim()) { toast.error("Add a title"); return; }
    if (f.size > 25 * 1024 * 1024) { toast.error("File too large (max 25MB)"); return; }
    setBusy(true);
    try {
      const ext = f.name.split(".").pop()?.toLowerCase() || "mp3";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("song-audio").upload(path, f, {
        contentType: f.type || "audio/mpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("song-audio").getPublicUrl(path);
      await importAndOpen({
        source: "upload",
        source_id: path,
        title: uploadTitle.trim(),
        artist: uploadArtist.trim(),
        preview_url: pub.publicUrl,
      });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-sunset pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/songs" className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-base font-black">Import a song</p>
          <div className="w-9" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-6">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-card p-1.5 card-pop">
          {(["search", "youtube", "upload"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl py-2 text-xs font-extrabold uppercase tracking-wide transition ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t === "search" ? "Search" : t === "youtube" ? "YouTube" : "Upload"}
            </button>
          ))}
        </div>

        {tab === "search" && (
          <div className="space-y-3">
            <div className="rounded-3xl bg-card p-4 card-pop">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value.slice(0, 200))}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="Search song or artist…"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  onClick={runSearch}
                  disabled={searching || !query.trim()}
                  className="rounded-xl bg-primary px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-primary-foreground btn-pop disabled:opacity-50"
                >
                  {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Powered by Apple's free iTunes catalog. Songs include a 30-second preview clip used for sing-along practice.
              </p>
            </div>

            <div className="space-y-2">
              {results?.map((r) => (
                <button
                  key={r.source_id}
                  disabled={busy}
                  onClick={() =>
                    importAndOpen({
                      source: "itunes",
                      source_id: r.source_id,
                      title: r.title,
                      artist: r.artist,
                      album: r.album,
                      image_url: r.image_url,
                      preview_url: r.preview_url,
                      duration_sec: r.duration_sec,
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left card-pop disabled:opacity-50"
                >
                  <img src={r.image_url} alt="" className="h-12 w-12 flex-shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-black">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.artist} · {r.album}</p>
                  </div>
                  {!r.preview_url && <span className="text-[10px] font-bold uppercase text-muted-foreground">no preview</span>}
                </button>
              ))}
              {results && results.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No results.</p>
              )}
            </div>
          </div>
        )}

        {tab === "youtube" && (
          <div className="space-y-3">
            <div className="rounded-3xl bg-card p-4 card-pop">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">YouTube link</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border-2 border-border bg-background px-3 py-2">
                <Youtube className="h-4 w-4 text-muted-foreground" />
                <input
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value.slice(0, 500))}
                  placeholder="https://youtu.be/…"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                YouTube doesn't allow direct audio downloads. We pull the title/thumbnail and use the embedded player for sing-along.
              </p>
            </div>
            <button
              onClick={importYouTube}
              disabled={busy || !ytUrl.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-extrabold uppercase tracking-wide text-primary-foreground btn-pop disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5" /> Import & build coach</>}
            </button>
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-3">
            <div className="rounded-3xl bg-card p-4 card-pop">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Audio file</label>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="mt-2 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-extrabold file:uppercase file:text-primary-foreground"
              />
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value.slice(0, 200))}
                  placeholder="Song title"
                  className="rounded-xl border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={uploadArtist}
                  onChange={(e) => setUploadArtist(e.target.value.slice(0, 200))}
                  placeholder="Artist (optional)"
                  className="rounded-xl border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Up to 25 MB. The full track is used for sing-along and pitch extraction.</p>
            </div>
            <button
              onClick={handleUpload}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-extrabold uppercase tracking-wide text-primary-foreground btn-pop disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5" /> Upload & build coach</>}
            </button>
          </div>
        )}

        {busy && tab === "search" && (
          <div className="rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground card-pop">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
            <p className="mt-2">Building your coach…</p>
          </div>
        )}
      </div>
    </main>
  );
}
