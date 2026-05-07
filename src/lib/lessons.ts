// Lesson catalog for Vocally — singing journey
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
const A3 = N("A3", 220.0);
const B3 = N("B3", 246.94);
const C4 = N("C4", 261.63);
const D4 = N("D4", 293.66);
const E4 = N("E4", 329.63);
const F4 = N("F4", 349.23);
const G4 = N("G4", 392.0);
const A4 = N("A4", 440.0);
const B4 = N("B4", 493.88);
const C5 = N("C5", 523.25);
const D5 = N("D5", 587.33);
const E5 = N("E5", 659.25);
const F5 = N("F5", 698.46);
const G5 = N("G5", 783.99);

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
  {
    id: "scale-descending",
    order: 9,
    title: "Descending Scale",
    subtitle: "C major coming down",
    type: "scale",
    unit: "Pitch Training",
    durationSec: 12,
    targets: [
      sec(C5, 1.5), sec(B4, 1.5), sec(A4, 1.5), sec(G4, 1.5),
      sec(F4, 1.5), sec(E4, 1.5), sec(D4, 1.5), sec(C4, 1.5),
    ],
    focus: ["pitch accuracy", "support on descent", "tone consistency"],
    instructions:
      "Sing the major scale downward on 'ah'. Keep your tone bright — don't let the lower notes get breathy.",
  },
  {
    id: "interval-octave",
    order: 10,
    title: "The Octave Leap",
    subtitle: "Low to high",
    type: "interval",
    unit: "Pitch Training",
    durationSec: 8,
    targets: [sec(C4, 2), sec(C5, 2), sec(C4, 2), sec(C5, 2)],
    focus: ["large leaps", "pitch accuracy", "support"],
    instructions:
      "Alternate between a low note and the same note one octave up. Hit the top note cleanly without straining.",
  },
  {
    id: "arpeggio-major",
    order: 11,
    title: "Major Arpeggio",
    subtitle: "1-3-5-8 climb",
    type: "scale",
    unit: "Pitch Training",
    durationSec: 10,
    targets: [sec(C4, 2), sec(E4, 2), sec(G4, 2), sec(C5, 2), sec(G4, 1), sec(E4, 1)],
    focus: ["interval accuracy", "smooth ascent", "chord shape"],
    instructions:
      "Sing a major arpeggio up and partly back down. Feel the chord under each note — root, third, fifth, octave.",
  },
  {
    id: "vibrato-intro",
    order: 12,
    title: "Gentle Vibrato",
    subtitle: "Let the note breathe",
    type: "sustain",
    unit: "Control & Expression",
    durationSec: 10,
    targets: [sec(A4, 10)],
    focus: ["vibrato", "tone quality", "relaxation"],
    instructions:
      "Hold the note. After 3 seconds of straight tone, let a gentle, even vibrato emerge. Don't force the wobble.",
  },
  {
    id: "dynamic-swell",
    order: 13,
    title: "Crescendo Swell",
    subtitle: "Soft to loud",
    type: "sustain",
    unit: "Control & Expression",
    durationSec: 10,
    targets: [sec(G4, 10)],
    focus: ["dynamic control", "breath support", "even pitch"],
    instructions:
      "Start the note very softly. Smoothly grow louder over 10 seconds without changing pitch. Then taper if you have breath.",
  },
  {
    id: "range-stretch-low",
    order: 14,
    title: "Low Range Stretch",
    subtitle: "Down to A3",
    type: "scale",
    unit: "Range & Power",
    durationSec: 10,
    targets: [sec(D4, 2), sec(C4, 2), sec(B3, 2), sec(A3, 4)],
    focus: ["chest resonance", "pitch on low notes", "relaxation"],
    instructions:
      "Step down into your low range. Keep your throat open — don't push. End with a relaxed sustained low note.",
  },
  {
    id: "range-stretch-high",
    order: 15,
    title: "High Range Stretch",
    subtitle: "Up to F5/G5",
    type: "scale",
    unit: "Range & Power",
    durationSec: 12,
    targets: [sec(C5, 2), sec(D5, 2), sec(E5, 2), sec(F5, 2), sec(G5, 4)],
    focus: ["head voice", "support", "no straining"],
    instructions:
      "Climb gently into the upper range on 'ah' or 'ee'. Stay light and lifted — don't shout the top note.",
  },
  {
    id: "siren-glide",
    order: 16,
    title: "Sirens",
    subtitle: "Smooth full-range glide",
    type: "sustain",
    unit: "Range & Power",
    durationSec: 10,
    targets: [sec(C4, 2.5), sec(C5, 2.5), sec(C4, 2.5), sec(C5, 2.5)],
    focus: ["register transitions", "smooth glide", "no breaks"],
    instructions:
      "Glide smoothly from low to high and back, like a siren. Cross your registers without any pop or break.",
  },
  {
    id: "melody-happy-birthday",
    order: 17,
    title: "Happy Birthday",
    subtitle: "Sing it cleanly",
    type: "melody",
    unit: "Songs & Phrasing",
    durationSec: 14,
    targets: [
      sec(C4, 0.75), sec(C4, 0.75), sec(D4, 1.5), sec(C4, 1.5), sec(F4, 1.5), sec(E4, 3),
      sec(C4, 0.75), sec(C4, 0.75), sec(D4, 1.5), sec(C4, 1.5), sec(G4, 1.5), sec(F4, 3),
    ],
    focus: ["familiar melody", "rhythm", "pitch accuracy"],
    instructions:
      "Sing 'Happy Birthday' on 'la' or with the words. Keep the rhythm steady and the pitches centered.",
  },
  {
    id: "phrase-legato",
    order: 18,
    title: "Legato Phrase",
    subtitle: "One smooth line",
    type: "melody",
    unit: "Songs & Phrasing",
    durationSec: 12,
    targets: [
      sec(E4, 1.5), sec(F4, 1.5), sec(G4, 1.5), sec(A4, 1.5),
      sec(G4, 1.5), sec(F4, 1.5), sec(E4, 3),
    ],
    focus: ["legato", "phrasing", "breath planning"],
    instructions:
      "Sing the whole phrase on 'ah' in one breath. No gaps between notes — connect them like a single ribbon.",
  },
];

export const getLesson = (id: string) => LESSONS.find((l) => l.id === id);

export const UNITS = [
  { name: "Fundamentals", color: "primary", icon: "🌱" },
  { name: "Pitch Training", color: "secondary", icon: "🎯" },
  { name: "Control & Expression", color: "success", icon: "✨" },
  { name: "Range & Power", color: "primary", icon: "🚀" },
  { name: "Songs & Phrasing", color: "secondary", icon: "🎶" },
];
