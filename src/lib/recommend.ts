// Recommends the next lesson based on the user's weakest recent attempts.
import { LESSONS, type Lesson } from "./lessons";

export type Skill = "pitch" | "breath" | "tone" | "smoothness";

export interface AttemptScores {
  lesson_id: string;
  pitch_score: number;
  ai_feedback: {
    pitch?: number;
    breath_control?: number;
    tone_quality?: number;
    smoothness?: number;
  } | null;
  overall_score: number;
}

export interface Progress {
  lesson_id: string;
  completed: boolean;
  best_score: number;
}

export interface Recommendation {
  lesson: Lesson;
  weakestSkill: Skill;
  weakestScore: number;
  reason: string;
  averages: Record<Skill, number>;
  sampleSize: number;
}

// Map a skill to the lesson focus keywords that train it.
const SKILL_KEYWORDS: Record<Skill, string[]> = {
  pitch: ["pitch", "intonation", "interval", "ear", "scale", "leap"],
  breath: ["breath", "support", "endurance", "airflow", "dynamic"],
  tone: ["tone", "resonance", "vowel", "chest", "head voice", "vibrato"],
  smoothness: ["smooth", "legato", "glide", "phrasing", "transitions", "register"],
};

const SKILL_LABEL: Record<Skill, string> = {
  pitch: "pitch accuracy",
  breath: "breath support",
  tone: "tone quality",
  smoothness: "smoothness",
};

function scoreLessonForSkill(lesson: Lesson, skill: Skill): number {
  const text = [...lesson.focus, lesson.subtitle, lesson.title].join(" ").toLowerCase();
  return SKILL_KEYWORDS[skill].reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
}

export function recommendLesson(
  attempts: AttemptScores[],
  progress: Progress[],
): Recommendation | null {
  if (attempts.length === 0) {
    // Fall back to first not-completed lesson
    const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));
    const next = LESSONS.find((l) => !completedIds.has(l.id));
    if (!next) return null;
    return {
      lesson: next,
      weakestSkill: "pitch",
      weakestScore: 0,
      reason: "Start here — you haven't recorded an attempt yet.",
      averages: { pitch: 0, breath: 0, tone: 0, smoothness: 0 },
      sampleSize: 0,
    };
  }

  // Take last 10 attempts and average each skill
  const recent = attempts.slice(0, 10);
  const sums = { pitch: 0, breath: 0, tone: 0, smoothness: 0 };
  const counts = { pitch: 0, breath: 0, tone: 0, smoothness: 0 };
  for (const a of recent) {
    if (a.pitch_score > 0) {
      sums.pitch += a.pitch_score;
      counts.pitch += 1;
    }
    const f = a.ai_feedback;
    if (f) {
      if (typeof f.pitch === "number") {
        sums.pitch += f.pitch;
        counts.pitch += 1;
      }
      if (typeof f.breath_control === "number") {
        sums.breath += f.breath_control;
        counts.breath += 1;
      }
      if (typeof f.tone_quality === "number") {
        sums.tone += f.tone_quality;
        counts.tone += 1;
      }
      if (typeof f.smoothness === "number") {
        sums.smoothness += f.smoothness;
        counts.smoothness += 1;
      }
    }
  }
  const averages: Record<Skill, number> = {
    pitch: counts.pitch ? Math.round(sums.pitch / counts.pitch) : 100,
    breath: counts.breath ? Math.round(sums.breath / counts.breath) : 100,
    tone: counts.tone ? Math.round(sums.tone / counts.tone) : 100,
    smoothness: counts.smoothness ? Math.round(sums.smoothness / counts.smoothness) : 100,
  };

  const skills: Skill[] = ["pitch", "breath", "tone", "smoothness"];
  const weakestSkill = skills.reduce((a, b) => (averages[a] <= averages[b] ? a : b));
  const weakestScore = averages[weakestSkill];

  const progressMap = new Map(progress.map((p) => [p.lesson_id, p]));

  // Pick the lesson that best trains the weakest skill.
  // Prefer: high keyword match, not completed, lower best_score, earlier order.
  const candidates = LESSONS
    .map((l) => {
      const match = scoreLessonForSkill(l, weakestSkill);
      const p = progressMap.get(l.id);
      const completed = !!p?.completed;
      const best = p?.best_score ?? 0;
      // Composite: keyword match dominates, then incomplete, then weaker performance
      const rank =
        match * 1000 + (completed ? 0 : 200) + Math.max(0, 100 - best) - l.order * 0.1;
      return { lesson: l, match, rank };
    })
    .filter((c) => c.match > 0)
    .sort((a, b) => b.rank - a.rank);

  const top = candidates[0]?.lesson ?? LESSONS.find((l) => !progressMap.get(l.id)?.completed) ?? LESSONS[0];

  const reason = `Your ${SKILL_LABEL[weakestSkill]} averaged ${weakestScore} across your last ${recent.length} attempt${recent.length === 1 ? "" : "s"}. This lesson targets ${weakestSkill === "pitch" ? "pitch precision" : weakestSkill === "breath" ? "breath support" : weakestSkill === "tone" ? "tone quality" : "smooth transitions"}.`;

  return {
    lesson: top,
    weakestSkill,
    weakestScore,
    reason,
    averages,
    sampleSize: recent.length,
  };
}

export const SKILL_LABELS = SKILL_LABEL;
