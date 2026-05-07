// Generates a personalized "Daily Practice" prompt via Lovable AI.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  completedLessons: z.array(z.string()).max(200).default([]),
  skills: z
    .object({
      pitch: z.number().min(0).max(100).nullable(),
      breath: z.number().min(0).max(100).nullable(),
      tone: z.number().min(0).max(100).nullable(),
      smoothness: z.number().min(0).max(100).nullable(),
    })
    .partial()
    .default({}),
  weakestSkill: z.string().optional(),
  streak: z.number().min(0).max(10000).default(0),
  seed: z.string().max(60).default(""),
});

export const generateDailyPractice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const skillLines = Object.entries(data.skills)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => `- ${k}: ${v}/100`)
      .join("\n") || "- (no scored takes yet)";

    const completedLine = data.completedLessons.length
      ? data.completedLessons.slice(0, 30).join(", ")
      : "(none yet)";

    const systemPrompt = `You are an expert vocal coach designing a single, focused 60-second daily warmup/refresher for a student.
The goal: a quick, fun, achievable exercise that revisits skills they've already practiced and gently nudges their weakest area.
Tone: warm, energizing, specific. Avoid jargon the student wouldn't know.
Constraints:
- The exercise must be doable in 30-60 seconds, with a single mic take.
- Use only their own voice (no instruments, no backing track).
- Be concrete: name the vowel/syllable, the rough pitch range (low/mid/high or "comfortable middle"), and the shape (sustain, slide, scale, arpeggio, etc.).
- Variety: change it from typical defaults. The seed below should noticeably alter the result.
Return ONLY structured output via the provided tool.`;

    const userPrompt = `Student snapshot:
- Day seed: ${data.seed || "today"}
- Current streak: ${data.streak} day(s)
- Recent skill averages:
${skillLines}
${data.weakestSkill ? `- Weakest skill flagged: ${data.weakestSkill}` : ""}
- Completed lesson IDs (recent topics they've practiced): ${completedLine}

Design today's daily practice prompt.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_daily_prompt",
          description: "Submit today's daily practice prompt",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short catchy title, max 6 words" },
              focus_skill: {
                type: "string",
                enum: ["pitch", "breath", "tone", "smoothness", "mixed"],
                description: "Which skill this exercise refreshes most",
              },
              prompt: {
                type: "string",
                description: "1-2 sentence description of WHAT to sing — used as the practice take's description",
              },
              steps: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 5,
                description: "Short step-by-step bullets (under 18 words each)",
              },
              estimated_seconds: { type: "number", minimum: 20, maximum: 90 },
              encouragement: { type: "string", description: "One short encouraging line" },
            },
            required: ["title", "focus_skill", "prompt", "steps", "estimated_seconds", "encouragement"],
            additionalProperties: false,
          },
        },
      },
    ];

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "submit_daily_prompt" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      throw new Error("Daily prompt generation failed. Please try again.");
    }

    const json = (await resp.json()) as any;
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("No prompt returned by AI.");
    return JSON.parse(call.function.arguments) as {
      title: string;
      focus_skill: "pitch" | "breath" | "tone" | "smoothness" | "mixed";
      prompt: string;
      steps: string[];
      estimated_seconds: number;
      encouragement: string;
    };
  });
