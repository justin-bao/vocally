// Song import: search iTunes, fetch YouTube oEmbed metadata, and generate AI coaching plans.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- iTunes search (free, no auth) ----------
const SearchSchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(20).optional().default(10),
});

export interface ITunesResult {
  source_id: string;
  title: string;
  artist: string;
  album: string;
  image_url: string;
  preview_url: string | null;
  duration_sec: number;
}

export const searchITunes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchSchema.parse(input))
  .handler(async ({ data }): Promise<{ results: ITunesResult[] }> => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      data.query
    )}&entity=song&limit=${data.limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("iTunes search failed");
    const json = (await res.json()) as { results: any[] };
    const results: ITunesResult[] = (json.results || []).map((r) => ({
      source_id: String(r.trackId),
      title: r.trackName ?? "Untitled",
      artist: r.artistName ?? "Unknown artist",
      album: r.collectionName ?? "",
      image_url: (r.artworkUrl100 as string)?.replace("100x100", "300x300") ?? "",
      preview_url: r.previewUrl ?? null,
      duration_sec: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 0,
    }));
    return { results };
  });

// ---------- YouTube oEmbed metadata ----------
const YouTubeSchema = z.object({
  url: z.string().trim().url().max(500),
});

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

export const fetchYouTubeMeta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => YouTubeSchema.parse(input))
  .handler(async ({ data }) => {
    const videoId = extractYouTubeId(data.url);
    if (!videoId) throw new Error("Could not parse YouTube URL");
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) throw new Error("Could not fetch YouTube metadata");
    const json = (await res.json()) as { title: string; author_name: string; thumbnail_url: string };
    return {
      source_id: videoId,
      title: json.title,
      artist: json.author_name,
      image_url: json.thumbnail_url,
      // Direct audio downloads aren't possible; sing-along uses an embed instead.
      preview_url: null as string | null,
      embed_url: `https://www.youtube.com/embed/${videoId}`,
    };
  });

// ---------- AI coaching plan generation ----------
const PlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).optional().default(""),
});

export interface CoachingPlan {
  song_summary: string;
  vocal_range: string;
  estimated_key: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  difficulty_reason: string;
  tricky_phrases: string[];
  breath_spots: string[];
  technique_focus: string[];
  warmup_suggestion: string;
}

export const generateCoachingPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PlanSchema.parse(input))
  .handler(async ({ data }): Promise<CoachingPlan> => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_coaching_plan",
          description: "Coaching plan for a singer learning a specific song",
          parameters: {
            type: "object",
            properties: {
              song_summary: { type: "string", description: "1-2 sentence vibe/feel summary" },
              vocal_range: { type: "string", description: "Approximate range, e.g. 'A3 to E5'" },
              estimated_key: { type: "string", description: "Best-guess musical key" },
              difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
              difficulty_reason: { type: "string" },
              tricky_phrases: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
              breath_spots: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
              technique_focus: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
              warmup_suggestion: { type: "string" },
            },
            required: [
              "song_summary", "vocal_range", "estimated_key", "difficulty",
              "difficulty_reason", "tricky_phrases", "breath_spots",
              "technique_focus", "warmup_suggestion",
            ],
            additionalProperties: false,
          },
        },
      },
    ];

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a master vocal coach. Given a song title and artist, produce a practical coaching plan for an amateur singer. Be specific. If you don't know the song, infer reasonable values from the title/artist style. Keep every list item under 22 words.",
        },
        {
          role: "user",
          content: `Build a coaching plan for: "${data.title}"${data.artist ? ` by ${data.artist}` : ""}.`,
        },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "submit_coaching_plan" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    if (resp.status === 402) throw new Error("AI credits exhausted.");
    if (!resp.ok) {
      console.error("AI plan error", resp.status, await resp.text());
      throw new Error("Could not build coaching plan.");
    }

    const json = (await resp.json()) as any;
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No coaching plan returned.");
    return JSON.parse(args) as CoachingPlan;
  });

// ---------- AI scoring of a song attempt ----------
const AttemptSchema = z.object({
  audioBase64: z.string().min(100).max(15_000_000),
  mimeType: z.string().min(3).max(50),
  songTitle: z.string().trim().min(1).max(200),
  songArtist: z.string().trim().max(200).optional().default(""),
  mode: z.enum(["sing_along", "a_cappella"]),
  durationSec: z.number().min(0).max(600).optional().default(0),
  planSummary: z.string().trim().max(2000).optional().default(""),
});

export interface SongAttemptResult {
  overall_score: number;
  pitch_accuracy: number;
  rhythm: number;
  breath_control: number;
  tone_quality: number;
  smoothness: number;
  summary: string;
  praise: string[];
  tips: string[];
}

export const analyzeSongAttempt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AttemptSchema.parse(input))
  .handler(async ({ data }): Promise<SongAttemptResult> => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const modeNote =
      data.mode === "sing_along"
        ? "The singer was singing along to the original track, so backing audio may bleed in."
        : "The singer performed a cappella with no backing track.";

    const systemPrompt = `You are an encouraging, perceptive professional vocal coach.
You will receive an audio recording of a singer performing "${data.songTitle}"${data.songArtist ? ` by ${data.songArtist}` : ""}.
${modeNote}
${data.planSummary ? `Coaching plan context: ${data.planSummary}` : ""}

Score 0-100 each. Praise: 1-3 specific items. Tips: 2-5 concrete short items (<22 words each).
Be kind but honest. Return ONLY structured feedback via the provided tool.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_song_evaluation",
          description: "Structured singing evaluation for a specific song attempt",
          parameters: {
            type: "object",
            properties: {
              overall_score: { type: "number", minimum: 0, maximum: 100 },
              pitch_accuracy: { type: "number", minimum: 0, maximum: 100 },
              rhythm: { type: "number", minimum: 0, maximum: 100 },
              breath_control: { type: "number", minimum: 0, maximum: 100 },
              tone_quality: { type: "number", minimum: 0, maximum: 100 },
              smoothness: { type: "number", minimum: 0, maximum: 100 },
              summary: { type: "string" },
              praise: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
              tips: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
            },
            required: [
              "overall_score", "pitch_accuracy", "rhythm", "breath_control",
              "tone_quality", "smoothness", "summary", "praise", "tips",
            ],
            additionalProperties: false,
          },
        },
      },
    ];

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please evaluate this ${data.durationSec ? `${Math.round(data.durationSec)}-second ` : ""}take of "${data.songTitle}".`,
            },
            {
              type: "input_audio",
              input_audio: { data: data.audioBase64, format: data.mimeType.includes("wav") ? "wav" : "mp3" },
            },
          ],
        },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "submit_song_evaluation" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    if (resp.status === 402) throw new Error("AI credits exhausted.");
    if (!resp.ok) {
      console.error("AI song-attempt error", resp.status, await resp.text());
      throw new Error("Voice analysis failed. Please try again.");
    }

    const json = (await resp.json()) as any;
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No evaluation returned.");
    return JSON.parse(args) as SongAttemptResult;
  });
