// Synthesised sound effects via Web Audio API — no audio files needed.

let ctx: AudioContext | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

export function isSoundEnabled() {
  return enabled;
}

function blip(opts: {
  freq: number;
  type?: OscillatorType;
  duration?: number;
  gain?: number;
  sweepTo?: number;
}) {
  if (!enabled) return;
  const context = ac();
  if (!context) return;

  const now = context.currentTime;
  const dur = opts.duration ?? 0.08;
  const osc = context.createOscillator();
  const g = context.createGain();

  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, now);
  if (opts.sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, now + dur);
  }

  const peak = opts.gain ?? 0.06;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(g);
  g.connect(context.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export const sfx = {
  key() {
    blip({ freq: 420, type: "square", duration: 0.03, gain: 0.025 });
  },
  miss() {
    blip({ freq: 180, type: "sawtooth", duration: 0.12, gain: 0.05, sweepTo: 90 });
  },
  correct() {
    blip({ freq: 660, type: "triangle", duration: 0.09, gain: 0.06, sweepTo: 990 });
  },
  perfect() {
    blip({ freq: 880, type: "triangle", duration: 0.12, gain: 0.07, sweepTo: 1320 });
    setTimeout(() => blip({ freq: 1320, type: "triangle", duration: 0.1, gain: 0.05 }), 70);
  },
  timeup() {
    blip({ freq: 220, type: "sawtooth", duration: 0.25, gain: 0.06, sweepTo: 70 });
  },
  levelup() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => blip({ freq: f, type: "triangle", duration: 0.12, gain: 0.06 }), i * 80)
    );
  },
  countdown() {
    blip({ freq: 500, type: "sine", duration: 0.1, gain: 0.05 });
  },
  go() {
    blip({ freq: 800, type: "triangle", duration: 0.2, gain: 0.07, sweepTo: 1200 });
  },
  gameover() {
    [400, 300, 200, 120].forEach((f, i) =>
      setTimeout(() => blip({ freq: f, type: "sawtooth", duration: 0.18, gain: 0.06 }), i * 110)
    );
  },
};
