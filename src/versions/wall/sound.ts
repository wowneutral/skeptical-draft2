// Tiny WebAudio voices: a pin going into cork, a string that holds, a string
// that snaps. No context exists until the visitor first presses something.
let ctx: AudioContext | null = null;
let on = true;
let armed = false;
let lastThud = 0;

export const setSound = (v: boolean) => { on = v; };

if (typeof window !== 'undefined') {
  const arm = () => { armed = true; };
  window.addEventListener('pointerdown', arm, { once: true, capture: true });
  window.addEventListener('keydown', arm, { once: true, capture: true });
}

function ac() {
  if (!on || !armed) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function noise(c: AudioContext, len: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  const s = c.createBufferSource();
  s.buffer = b;
  return s;
}

export function thud(v = 1) {
  const now = performance.now();
  if (now - lastThud < 60) return;
  lastThud = now;
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.25);
  const n = noise(c, 0.05), f = c.createBiquadFilter(), ng = c.createGain();
  f.type = 'bandpass'; f.frequency.value = 1800; ng.gain.value = 0.18 * v;
  n.connect(f).connect(ng).connect(c.destination); n.start(t);
}

export function ping(big: boolean) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  (big ? [523.25, 783.99] : [659.25]).forEach((fq, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = fq;
    g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5);
    o.connect(g).connect(c.destination); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55);
  });
  thud(0.6);
}

export function snap() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const n = noise(c, 0.12), f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'highpass'; f.frequency.value = 2400; g.gain.value = 0.25;
  n.connect(f).connect(g).connect(c.destination); n.start(t);
  const o = c.createOscillator(), og = c.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.3);
  og.gain.setValueAtTime(0.06, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(og).connect(c.destination); o.start(t); o.stop(t + 0.35);
}
