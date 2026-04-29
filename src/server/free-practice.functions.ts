// Free practice voice analysis via Lovable AI Gateway (Gemini multimodal audio)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  audioBase64: z.string().min(100).max(15_000_000),
  mimeType: z.string().min(3).max(50),
  description: z.string().trim().max(800).optional().default(""),
  durationSec: z.number().min(0).max(600).optional().default(0),
});

export const analyzeFreePractice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ctxLine = data.description
      ? `The student described their goal as: "${data.description}". Use this as context when evaluating.`
      : `The student did not provide a description — listen openly and infer what they were attempting (e.g. a song, scale, vocal exercise, vowel sustain, etc.).`;

    const systemPrompt = `You are an encouraging, perceptive professional vocal coach.
You will receive an audio recording of a singer practicing freely (no fixed exercise).
${ctxLine}

Provide warm, specific, actionable feedback. Be kind but honest.
Score everything 0-100. Praise: 1-3 specific things they did well. Tips: 2-5 concrete short actionable items (under 22 words each).
"what_you_sang" should be a 1-2 sentence description of what you actually heard.
Return ONLY structured feedback via the provided tool.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_free_practice_evaluation",
          description: "Submit structured free practice singing evaluation",
          parameters: {
            type: "object",
            properties: {
              overall_score: { type: "number", minimum: 0, maximum: 100 },
              pitch_accuracy: { type: "number", minimum: 0, maximum: 100 },
              breath_control: { type: "number", minimum: 0, maximum: 100 },
              tone_quality: { type: "number", minimum: 0, maximum: 100 },
              smoothness: { type: "number", minimum: 0, maximum: 100 },
              rhythm: { type: "number", minimum: 0, maximum: 100 },
              what_you_sang: { type: "string" },
              summary: { type: "string", description: "1-2 sentence overall summary" },
              praise: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
              tips: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
              next_exercise_suggestion: { type: "string", description: "One short suggestion for what to practice next." },
            },
            required: [
              "overall_score", "pitch_accuracy", "breath_control", "tone_quality",
              "smoothness", "rhythm", "what_you_sang", "summary", "praise", "tips", "next_exercise_suggestion",
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
              text: `Please evaluate this ${data.durationSec ? `${Math.round(data.durationSec)}-second ` : ""}free singing practice.`,
            },
            {
              type: "input_audio",
              input_audio: { data: data.audioBase64, format: data.mimeType.includes("wav") ? "wav" : "mp3" },
            },
          ],
        },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "submit_free_practice_evaluation" } },
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
      throw new Error("Voice analysis failed. Please try again.");
    }

    const json = (await resp.json()) as any;
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("No evaluation returned by AI.");
    return JSON.parse(call.function.arguments) as {
      overall_score: number;
      pitch_accuracy: number;
      breath_control: number;
      tone_quality: number;
      smoothness: number;
      rhythm: number;
      what_you_sang: string;
      summary: string;
      praise: string[];
      tips: string[];
      next_exercise_suggestion: string;
    };
  });
