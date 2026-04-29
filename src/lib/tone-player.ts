// Plays target tones using Web Audio API (sine wave with envelope)
export class TonePlayer {
  private ctx: AudioContext | null = null;

  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  async playSequence(targets: Array<{ freq: number; seconds: number }>, onProgress?: (t: number) => void) {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();

    const startTime = ctx.currentTime + 0.1;
    let t = startTime;
    targets.forEach((tg) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = tg.freq;
      // envelope
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
      gain.gain.setValueAtTime(0.18, t + tg.seconds - 0.05);
      gain.gain.linearRampToValueAtTime(0, t + tg.seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + tg.seconds + 0.02);
      t += tg.seconds;
    });

    const total = targets.reduce((a, b) => a + b.seconds, 0);
    if (onProgress) {
      const begin = performance.now();
      const interval = setInterval(() => {
        const elapsed = (performance.now() - begin) / 1000;
        onProgress(elapsed);
        if (elapsed >= total) clearInterval(interval);
      }, 50);
    }
    return total;
  }

  close() {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
