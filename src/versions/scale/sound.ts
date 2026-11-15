// Two sounds, both made here: a brass ping when the beam crosses level, and a
// soft thunk when a weight lands. Silent until the visitor turns sound on.
import { S } from './sim';

let ctx: AudioContext | null = null;
function ac() {
  if (!S.sound) return null;
  if (!ctx) { try { ctx = new AudioContext(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export const sound = {
  wake() { ac(); },
  level() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    [523.25, 1046.5, 1568, 2637].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f * (1 + i * 0.002);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16 / (i + 1), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6 / (i * 0.5 + 1));
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 3);
    });
  },
  land(m: number) {
    const c = ac(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(180 / Math.sqrt(m), t); o.frequency.exponentialRampToValueAtTime(60, t + 0.18);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.min(0.3, 0.12 * m), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.35);
    const o2 = c.createOscillator(), g2 = c.createGain();
    o2.type = 'sine'; o2.frequency.value = 1900 + Math.random() * 400;
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.03, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o2.connect(g2).connect(c.destination); o2.start(t); o2.stop(t + 0.55);
  },
};
