import { useEffect, useRef, useState } from "react";
import { detectPitch, freqToNoteName, centsOff, type PitchSample } from "@/lib/pitch";

interface Props {
  active: boolean;           // whether to capture
  onSample: (s: PitchSample) => void;
  onLevel?: (rms: number) => void;
}

export function PitchMeter({ active, onSample, onLevel }: Props) {
  const [currentFreq, setCurrentFreq] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) {
      cleanup();
      setCurrentFreq(null);
      setLevel(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
        startTimeRef.current = performance.now();

        const buf = new Float32Array(analyser.fftSize);
        const tick = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getFloatTimeDomainData(buf);
          let rms = 0;
          for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
          rms = Math.sqrt(rms / buf.length);
          setLevel(rms);
          onLevel?.(rms);

          const { freq, clarity } = detectPitch(buf, ctx.sampleRate);
          setCurrentFreq(freq);
          const t = (performance.now() - startTimeRef.current) / 1000;
          onSample({ time: t, freq, clarity });
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        console.error("Mic error", e);
      }
    })();
    return () => { cancelled = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  return (
    <div className="rounded-2xl bg-card p-4 card-pop">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your pitch</span>
        <span className="font-display text-3xl font-black tabular-nums text-foreground">
          {currentFreq ? freqToNoteName(currentFreq) : "—"}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-pop transition-[width]"
          style={{ width: `${Math.min(100, level * 600)}%` }}
        />
      </div>
    </div>
  );
}

// Visualization showing pitch trajectory vs targets across time
interface VizProps {
  samples: PitchSample[];
  targets: Array<{ freq: number; seconds: number }>;
  totalSeconds: number;
  elapsedSec: number;
}

export function PitchTrack({ samples, targets, totalSeconds, elapsedSec }: VizProps) {
  // Frequency range for vertical axis: pad targets ±5 semitones
  const targetFreqs = targets.map((t) => t.freq);
  const minF = Math.min(...targetFreqs) * Math.pow(2, -5 / 12);
  const maxF = Math.max(...targetFreqs) * Math.pow(2, 5 / 12);

  const W = 600, H = 180;
  const xOf = (t: number) => (t / totalSeconds) * W;
  const yOf = (f: number) => {
    const r = (Math.log(f) - Math.log(minF)) / (Math.log(maxF) - Math.log(minF));
    return H - r * H;
  };

  // Build target rectangles
  let acc = 0;
  const targetRects = targets.map((t) => {
    const x1 = xOf(acc), x2 = xOf(acc + t.seconds);
    acc += t.seconds;
    const semi = 1 / 12; // ±50 cents tolerance shown
    const yHigh = yOf(t.freq * Math.pow(2, semi / 2));
    const yLow = yOf(t.freq * Math.pow(2, -semi / 2));
    return { x1, x2, yLow, yHigh, y: yOf(t.freq), freq: t.freq };
  });

  const points = samples.filter((s) => s.freq && s.time <= totalSeconds);

  return (
    <div className="rounded-2xl bg-card p-3 card-pop">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none">
        {/* target zones */}
        {targetRects.map((r, i) => (
          <g key={i}>
            <rect
              x={r.x1}
              y={r.yHigh}
              width={r.x2 - r.x1}
              height={r.yLow - r.yHigh}
              fill="oklch(0.78 0.17 65 / 0.18)"
              rx={6}
            />
            <line x1={r.x1} y1={r.y} x2={r.x2} y2={r.y} stroke="oklch(0.78 0.17 65)" strokeWidth={2} strokeDasharray="4 3" />
            <text x={r.x1 + 4} y={r.y - 4} fontSize="10" fill="oklch(0.5 0.05 50)" fontWeight="700">
              {freqToNoteName(r.freq)}
            </text>
          </g>
        ))}
        {/* sung pitch dots */}
        {points.map((p, i) => {
          const off = Math.abs(centsOff(p.freq!, nearestTargetFreq(p.time, targets)));
          const color = off < 50 ? "oklch(0.72 0.18 145)" : off < 100 ? "oklch(0.78 0.17 65)" : "oklch(0.62 0.22 25)";
          return <circle key={i} cx={xOf(p.time)} cy={yOf(p.freq!)} r={2.2} fill={color} />;
        })}
        {/* playhead */}
        <line
          x1={xOf(elapsedSec)} y1={0} x2={xOf(elapsedSec)} y2={H}
          stroke="oklch(0.7 0.2 25)" strokeWidth={2}
        />
      </svg>
    </div>
  );
}

function nearestTargetFreq(t: number, targets: Array<{ freq: number; seconds: number }>): number {
  let acc = 0;
  for (const tg of targets) {
    if (t >= acc && t < acc + tg.seconds) return tg.freq;
    acc += tg.seconds;
  }
  return targets[targets.length - 1].freq;
}
