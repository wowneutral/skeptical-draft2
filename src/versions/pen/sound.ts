// Sound, through Tone, loaded only when the visitor turns it on.
// A click for the plunger, a whoosh for a spin, a clatter when it lands, a scratch while it writes.
type ToneNS = typeof import('tone');
let T: ToneNS | null = null;
let on = false;
let kit: null | {
  tick: import('tone').MembraneSynth; snap: import('tone').NoiseSynth; clack: import('tone').MetalSynth;
  wind: import('tone').Noise; windF: import('tone').Filter; windG: import('tone').Gain;
  scr: import('tone').Noise; scrG: import('tone').Gain;
} = null;
let last = 0;

export async function soundOn() {
  try {
    if (!T) T = await import('tone');
    await T.start();
    if (!kit) {
      const t = T, out = new t.Gain(0.7).toDestination();
      const hp = new t.Filter(1800, 'highpass').connect(out);
      const tick = new t.MembraneSynth({ pitchDecay: 0.008, octaves: 4, envelope: { attack: 0.0005, decay: 0.05, sustain: 0, release: 0.02 } }).connect(out);
      tick.volume.value = -8;
      const snap = new t.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.0005, decay: 0.025, sustain: 0, release: 0.01 } }).connect(hp);
      snap.volume.value = -10;
      const clack = new t.MetalSynth({ envelope: { attack: 0.001, decay: 0.09, release: 0.02 }, harmonicity: 3.1, modulationIndex: 14, resonance: 2600, octaves: 1.2 }).connect(out);
      clack.frequency.value = 340; clack.volume.value = -20;
      const windF = new t.Filter(900, 'bandpass').connect(out); windF.Q.value = 1.4;
      const windG = new t.Gain(0).connect(windF);
      const wind = new t.Noise('pink').connect(windG).start();
      const sf = new t.Filter(3200, 'bandpass').connect(out); sf.Q.value = 0.8;
      const scrG = new t.Gain(0).connect(sf);
      const scr = new t.Noise('white').connect(scrG).start();
      kit = { tick, snap, clack, wind, windF, windG, scr, scrG };
    }
    T.getDestination().mute = false;
    on = true;
  } catch { on = false; }
  return on;
}
export function soundOff() { on = false; if (T) T.getDestination().mute = true; }

const at = () => { const n = Math.max(T!.now() + 0.004, last + 0.01); last = n; return n; };

export function click(retracted: boolean) {
  if (!on || !kit || !T) return;
  try {
    const a = at();
    kit.snap.triggerAttackRelease(0.02, a);
    kit.tick.triggerAttackRelease(retracted ? 'C6' : 'G6', 0.03, a);
    kit.snap.triggerAttackRelease(0.015, a + 0.045);
    kit.tick.triggerAttackRelease(retracted ? 'G5' : 'D6', 0.02, a + 0.045, 0.6);
    last = a + 0.05;
  } catch { /* a missed click is not worth an error */ }
}
export function land(hard: number) {
  if (!on || !kit || !T) return;
  try { const a = at(); kit.clack.triggerAttackRelease(0.06, a, 0.25 + hard * 0.75); kit.tick.triggerAttackRelease('A3', 0.04, a, 0.3 + hard * 0.5); } catch { /* */ }
}
export function whoosh(w: number) {
  if (!on || !kit || !T) return;
  try {
    const g = Math.min(0.5, Math.max(0, (w - 3) / 40));
    kit.windG.gain.rampTo(g, 0.06);
    kit.windF.frequency.rampTo(500 + w * 60, 0.06);
  } catch { /* */ }
}
export function scratch(down: boolean) {
  if (!on || !kit || !T) return;
  try { kit.scrG.gain.rampTo(down ? 0.05 : 0, 0.04); } catch { /* */ }
}
