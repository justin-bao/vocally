// Pitch detection using autocorrelation (YIN-lite)
// Real-time mic-driven pitch tracking for the lesson player.

export interface PitchSample {
  time: number; // seconds since start
  freq: number | null; // Hz, or null if no clear pitch
  clarity: number; // 0-1
}

export function freqToNoteName(freq: number): string {
  if (!freq || freq <= 0) return "—";
  const n = 12 * Math.log2(freq / 440) + 69; // MIDI
  const midi = Math.round(n);
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const name = names[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function centsOff(freq: number, target: number): number {
  if (!freq || !target) return 0;
  return 1200 * Math.log2(freq / target);
}

// Autocorrelation pitch detector
export function detectPitch(buf: Float32Array, sampleRate: number): { freq: number | null; clarity: number } {
  const SIZE = buf.length;
  // RMS check
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return { freq: null, clarity: 0 };

  // Trim leading/trailing silence
  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  const trimmed = buf.slice(r1, r2);
  const T = trimmed.length;

  // Autocorrelation
  const c = new Array(T).fill(0);
  for (let i = 0; i < T; i++) {
    for (let j = 0; j < T - i; j++) {
      c[i] += trimmed[j] * trimmed[j + i];
    }
  }

  // Find first dip then highest peak after
  let d = 0;
  while (d < T - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < T; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  if (T0 <= 0) return { freq: null, clarity: 0 };

  // Parabolic interpolation
  const x1 = c[T0 - 1] || 0, x2 = c[T0], x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  const freq = sampleRate / T0;
  if (freq < 60 || freq > 1200) return { freq: null, clarity: 0 };

  const clarity = Math.min(1, maxval / (c[0] || 1));
  return { freq, clarity };
}

// Score pitch accuracy across the lesson timeline
export function scorePitchAttempt(
  samples: PitchSample[],
  targets: Array<{ freq: number; seconds: number }>
): { score: number; perTarget: Array<{ target: number; avgFreq: number; centsOff: number; hitRate: number }> } {
  // Build target timeline
  let t = 0;
  const targetWindows = targets.map((tg) => {
    const window = { start: t, end: t + tg.seconds, freq: tg.freq };
    t += tg.seconds;
    return window;
  });

  const perTarget = targetWindows.map((w) => {
    const inWindow = samples.filter((s) => s.time >= w.start && s.time < w.end && s.freq);
    if (inWindow.length === 0) return { target: w.freq, avgFreq: 0, centsOff: 9999, hitRate: 0 };
    const freqs = inWindow.map((s) => s.freq!) as number[];
    const avg = freqs.reduce((a, b) => a + b, 0) / freqs.length;
    const cents = centsOff(avg, w.freq);
    // hit rate: fraction of samples within ±50 cents
    const hits = inWindow.filter((s) => Math.abs(centsOff(s.freq!, w.freq)) < 50).length;
    return { target: w.freq, avgFreq: avg, centsOff: cents, hitRate: hits / inWindow.length };
  });

  // Score: average hit rate, weighted, mapped to 0-100
  const avgHit = perTarget.reduce((a, b) => a + b.hitRate, 0) / Math.max(1, perTarget.length);
  const score = Math.round(avgHit * 100);
  return { score, perTarget };
}
