// The squeak of a dry marker, through Tone, loaded only when the visitor turns sound on.
type ToneNS = typeof import('tone');
let T: ToneNS | null = null;
let on = false;
let kit: null | { osc: import('tone').Oscillator; g: import('tone').Gain; vib: import('tone').LFO; tap: import('tone').NoiseSynth } = null;
let last = 0;

export async function soundOn() {
  try {
    if (!T) T = await import('tone');
    await T.start();
    if (!kit) {
      const t = T, out = new t.Gain(0.5).toDestination();
      const bp = new t.Filter(2600, 'bandpass').connect(out); bp.Q.value = 6;
      const g = new t.Gain(0).connect(bp);
      const osc = new t.Oscillator(2400, 'sawtooth').connect(g).start();
      const vib = new t.LFO(38, 2200, 2700).start(); vib.connect(osc.frequency);
      const hp = new t.Filter(1500, 'highpass').connect(out);
      const tap = new t.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 } }).connect(hp);
      tap.volume.value = -22;
      kit = { osc, g, vib, tap };
    }
    T.getDestination().mute = false;
    on = true;
  } catch { on = false; }
  return on;
}
export function soundOff() { on = false; if (T) T.getDestination().mute = true; }

/** One squeak: a short, wavering rub. len in seconds, pitch 0..1. */
export function squeak(len = 0.12, pitch = Math.random()) {
  if (!on || !kit || !T) return;
  const now = T.now();
  if (now - last < 0.07) return;
  last = now;
  const lo = 1900 + pitch * 1400;
  kit.vib.min = lo; kit.vib.max = lo + 380 + Math.random() * 300;
  kit.vib.frequency.value = 26 + Math.random() * 30;
  kit.g.gain.cancelScheduledValues(now);
  kit.g.gain.setValueAtTime(0, now);
  kit.g.gain.linearRampToValueAtTime(0.09 + Math.random() * 0.05, now + 0.015);
  kit.g.gain.linearRampToValueAtTime(0.05, now + len * 0.7);
  kit.g.gain.linearRampToValueAtTime(0, now + len);
}
export function tap() { if (on && kit) kit.tap.triggerAttackRelease(0.03); }
