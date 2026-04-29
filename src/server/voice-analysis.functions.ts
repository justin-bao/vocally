// AI voice analysis via Lovable AI Gateway (Gemini multimodal audio)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  audioBase64: z.string().min(100).max(15_000_000), // up to ~11 MB base64
  mimeType: z.string().min(3).max(50),
  lessonTitle: z.string().min(1).max(200),
  focus: z.array(z.string().min(1).max(60)).min(1).max(8),
  instructions: z.string().min(1).max(800),
});

export const analyzeSinging = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an encouraging professional vocal coach evaluating a beginner singer.
You will receive an audio recording of a student's attempt at a singing exercise.

Lesson: "${data.lessonTitle}"
Instructions given to student: "${data.instructions}"
Specific aspects to evaluate: ${data.focus.join(", ")}.

Return ONLY structured feedback via the provided tool. Be kind but honest.
Score from 0-100. For breath_control, tone_quality, and smoothness, also score 0-100 each.
Tips should be 2-4 short actionable items (under 18 words each).
Praise should be 1-2 specific things the student did well.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_vocal_evaluation",
          description: "Submit structured singing evaluation",
          parameters: {
            type: "object",
            properties: {
              overall_score: { type: "number", minimum: 0, maximum: 100 },
              breath_control: { type: "number", minimum: 0, maximum: 100 },
              tone_quality: { type: "number", minimum: 0, maximum: 100 },
              smoothness: { type: "number", minimum: 0, maximum: 100 },
              summary: { type: "string", description: "1-sentence overall summary" },
              praise: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 2 },
              tips: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
            },
            required: ["overall_score", "breath_control", "tone_quality", "smoothness", "summary", "praise", "tips"],
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
            { type: "text", text: "Please evaluate this singing attempt." },
            {
              type: "input_audio",
              input_audio: { data: data.audioBase64, format: data.mimeType.includes("wav") ? "wav" : "mp3" },
            },
          ],
        },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "submit_vocal_evaluation" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) {
      throw new Error("Rate limit reached. Try again in a moment.");
    }
    if (resp.status === 402) {
      throw new Error("AI credits exhausted. Add credits to continue.");
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      throw new Error("Voice analysis failed. Please try again.");
    }

    const json = (await resp.json()) as any;
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      throw new Error("No evaluation returned by AI.");
    }
    const evaluation = JSON.parse(call.function.arguments);
    return evaluation as {
      overall_score: number;
      breath_control: number;
      tone_quality: number;
      smoothness: number;
      summary: string;
      praise: string[];
      tips: string[];
    };
  });
