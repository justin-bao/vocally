// Lesson catalog for Vocaly — singing journey
// Each lesson has a target: either holding a pitch (Hz/note) or a sequence

export type LessonType = "hum" | "sustain" | "pitch-match" | "scale" | "interval" | "melody";

export interface Lesson {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  type: LessonType;
  unit: string;
  durationSec: number;
  // Target sequence: each step is a note name + duration in seconds
  targets: Array<{ note: string; freq: number; seconds: number }>;
  // What the AI should focus on
  focus: string[];
  instructions: string;
}

// Note frequencies (equal temperament, A4 = 440)
const N = (note: string, freq: number) => ({ note, freq });

// Comfortable range for beginners (mid range)
const C4 = N("C4", 261.63);
const D4 = N("D4", 293.66);
const E4 = N("E4", 329.63);
const F4 = N("F4", 349.23);
const G4 = N("G4", 392.0);
const A4 = N("A4", 440.0);
const B4 = N("B4", 493.88);
const C5 = N("C5", 523.25);

const sec = (n: typeof C4, s: number) => ({ ...n, seconds: s });

export const LESSONS: Lesson[] = [
  {
    id: "warmup-breath",
    order: 1,
    title: "Breath Foundations",
    subtitle: "The diaphragm hum",
    type: "hum",
    unit: "Fundamentals",
    durationSec: 8,
    targets: [sec(C4, 8)],
    focus: ["breath control", "steady airflow", "relaxed posture"],
    instructions:
      "Stand tall. Take a slow breath into your belly. Hum a comfortable low note for 8 seconds. Keep it steady — no shaking, no fading.",
  },
  {
    id: "humming-glide",
    order: 2,
    title: "The Hum Glide",
    subtitle: "Smooth transitions",
    type: "sustain",
    unit: "Fundamentals",
    durationSec: 6,
    targets: [sec(C4, 3), sec(E4, 3)],
    focus: ["smoothness", "glide control", "no breaks"],
    instructions:
      "Hum from a low note up to a higher note. Slide smoothly — no jumps. Feel the resonance in your chest, then your face.",
  },
  {
    id: "pitch-match-1",
    order: 3,
    title: "Pitch Match: Easy",
    subtitle: "Match the note",
    type: "pitch-match",
    unit: "Pitch Training",
    durationSec: 4,
    targets: [sec(A4, 4)],
    focus: ["pitch accuracy", "ear training", "sustained tone"],
    instructions:
      "Listen to the reference note, then sing it on 'ah' for 4 seconds. Try to lock onto the exact pitch.",
  },
  {
    id: "pitch-match-2",
    order: 4,
    title: "Pitch Match: Three Notes",
    subtitle: "Hit each one",
    type: "pitch-match",
    unit: "Pitch Training",
    durationSec: 9,
    targets: [sec(C4, 3), sec(E4, 3), sec(G4, 3)],
    focus: ["pitch transitions", "accuracy", "intonation"],
    instructions:
      "Sing each note clearly on 'ah'. Pause between notes if you need to. Aim for the center of each pitch.",
  },
  {
    id: "scale-major",
    order: 5,
    title: "C Major Scale",
    subtitle: "Do re mi up",
    type: "scale",
    unit: "Pitch Training",
    durationSec: 12,
    targets: [
      sec(C4, 1.5), sec(D4, 1.5), sec(E4, 1.5), sec(F4, 1.5),
      sec(G4, 1.5), sec(A4, 1.5), sec(B4, 1.5), sec(C5, 1.5),
    ],
    focus: ["scale accuracy", "even spacing", "vowel consistency"],
    instructions:
      "Sing the major scale on 'ah'. Keep each note the same length and volume. Don't rush.",
  },
  {
    id: "sustain-long",
    order: 6,
    title: "The Long Hold",
    subtitle: "12-second sustain",
    type: "sustain",
    unit: "Control & Expression",
    durationSec: 12,
    targets: [sec(G4, 12)],
    focus: ["breath endurance", "tone steadiness", "no wavering"],
    instructions:
      "Sing a single note for 12 seconds straight. Stay relaxed. Manage your breath — don't push at the end.",
  },
  {
    id: "interval-fifth",
    order: 7,
    title: "The Perfect Fifth",
    subtitle: "Twinkle twinkle…",
    type: "interval",
    unit: "Control & Expression",
    durationSec: 8,
    targets: [sec(C4, 2), sec(C4, 2), sec(G4, 2), sec(G4, 2)],
    focus: ["interval accuracy", "leap control", "consistency"],
    instructions:
      "Two low notes, then two high notes — a perfect fifth apart. Don't undershoot the leap up.",
  },
  {
    id: "melody-simple",
    order: 8,
    title: "First Melody",
    subtitle: "Put it all together",
    type: "melody",
    unit: "Control & Expression",
    durationSec: 12,
    targets: [
      sec(C4, 1.5), sec(D4, 1.5), sec(E4, 1.5), sec(C4, 1.5),
      sec(E4, 1.5), sec(C4, 1.5), sec(E4, 3),
    ],
    focus: ["pitch accuracy", "phrasing", "expression", "breath control"],
    instructions:
      "Sing this short phrase on 'la'. Focus on smoothness between notes and confident pitch placement.",
  },
];

export const getLesson = (id: string) => LESSONS.find((l) => l.id === id);

export const UNITS = [
  { name: "Fundamentals", color: "primary", icon: "🌱" },
  { name: "Pitch Training", color: "secondary", icon: "🎯" },
  { name: "Control & Expression", color: "success", icon: "✨" },
];
