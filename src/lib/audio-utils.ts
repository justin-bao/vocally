// Browser audio utilities: WAV downsample + base64 + waveform peaks + pitch contour.
import { detectPitch } from "@/lib/pitch";

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function decodeAudio(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  ctx.close();
  return decoded;
}

export async function blobToWav(blob: Blob, targetRate = 16000): Promise<Blob> {
  const decoded = await decodeAudio(blob);
  const ratio = decoded.sampleRate / targetRate;
  const outLen = Math.floor(decoded.length / ratio);
  const channel = decoded.getChannelData(0);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0;
    for (let j = start; j < end; j++) sum += channel[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return floatToWavBlob(out, targetRate);
}

function floatToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export async function computePeaksFromBlob(blob: Blob, buckets = 56): Promise<number[]> {
  const decoded = await decodeAudio(blob);
  return computePeaks(decoded.getChannelData(0), buckets);
}

export function computePeaks(channel: Float32Array, buckets: number): number[] {
  const size = Math.floor(channel.length / buckets) || 1;
  const out: number[] = [];
  let max = 0;
  for (let b = 0; b < buckets; b++) {
    let peak = 0;
    const start = b * size;
    const end = Math.min(channel.length, start + size);
    for (let i = start; i < end; i++) {
      const v = Math.abs(channel[i]);
      if (v > peak) peak = v;
    }
    out.push(peak);
    if (peak > max) max = peak;
  }
  const norm = max > 0 ? max : 1;
  return out.map((v) => Math.min(1, v / norm));
}

export interface ContourPoint {
  t: number; // seconds
  hz: number; // 0 if unvoiced
}

/** Build a coarse pitch contour from any audio URL or blob, ~10 frames/sec. */
export async function extractPitchContour(source: string | Blob): Promise<ContourPoint[]> {
  const blob = typeof source === "string" ? await (await fetch(source)).blob() : source;
  const decoded = await decodeAudio(blob);
  const sr = decoded.sampleRate;
  const channel = decoded.getChannelData(0);
  const window = Math.floor(sr * 0.05); // 50ms
  const hop = Math.floor(sr * 0.1); // 100ms
  const out: ContourPoint[] = [];
  const frame = new Float32Array(window);
  for (let i = 0; i + window < channel.length; i += hop) {
    for (let j = 0; j < window; j++) frame[j] = channel[i + j];
    const det = detectPitch(frame, sr);
    out.push({ t: i / sr, hz: det.freq ?? 0 });
  }
  return out;
}
