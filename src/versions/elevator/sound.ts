// The lift's sounds, made with Tone. Nothing loads until the visitor asks.
type ToneNS = typeof import('tone');
let T: ToneNS | null = null;
let kit: {
  bell: import('tone').PolySynth<import('tone').FMSynth>;
  hum: import('tone').Oscillator; humGain: import('tone').Gain;
  rumble: import('tone').Noise; rumbleGain: import('tone').Gain;
  ring: import('tone').MetalSynth;
  click: import('tone').MembraneSynth;
  door: import('tone').NoiseSynth;
} | null = null;
let on = false;

function build(t: ToneNS) {
  const out = new t.Gain(0.7).toDestination();
  const verb = new t.Reverb({ decay: 1.6, wet: 0.25 }).connect(out);
  const bell = new t.PolySynth(t.FMSynth, { harmonicity: 3.01, modulationIndex: 6, envelope: { attack: 0.002, decay: 1.4, sustain: 0, release: 1.2 }, modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0, release: 0.3 } }).connect(verb);
  bell.volume.value = -12;
  const lp = new t.Filter(180, 'lowpass').connect(out);
  const humGain = new t.Gain(0).connect(lp);
  const hum = new t.Oscillator(55, 'sawtooth').connect(humGain);
  const rumbleGain = new t.Gain(0).connect(lp);
  const rumble = new t.Noise('brown').connect(rumbleGain);
  hum.start(); rumble.start();
  const ring = new t.MetalSynth({ envelope: { attack: 0.001, decay: 0.08, release: 0.02 }, harmonicity: 5.1, modulationIndex: 20, resonance: 3200, octaves: 1.2 }).connect(verb);
  ring.volume.value = -22;
  const click = new t.MembraneSynth({ pitchDecay: 0.01, octaves: 3, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 } }).connect(out);
  click.volume.value = -14;
  const df = new t.Filter(600, 'lowpass').connect(out);
  const door = new t.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.15, decay: 0.6, sustain: 0, release: 0.3 } }).connect(df);
  door.volume.value = -20;
  return { bell, hum, humGain, rumble, rumbleGain, ring, click, door };
}

export async function soundOn() {
  try {
    if (!T) T = await import('tone');
    await T.start();
    if (!kit) kit = build(T);
    T.getDestination().mute = false;
    on = true;
  } catch { on = false; }
  return on;
}
export function soundOff() { on = false; if (T) T.getDestination().mute = true; }
export const soundIs = () => on;

export function chime(up = true) {
  if (!on || !kit || !T) return;
  const now = T.now();
  const [a, b] = up ? ['E5', 'C5'] : ['C5', 'A4'];
  kit.bell.triggerAttackRelease(a, 0.6, now, 0.6);
  kit.bell.triggerAttackRelease(b, 0.9, now + 0.32, 0.5);
}
export function alarm() {
  if (!on || !kit || !T) return;
  const now = T.now();
  for (let i = 0; i < 14; i++) kit.ring.triggerAttackRelease('C6', 0.05, now + i * 0.055, 0.6);
}
export function click() { if (on && kit && T) kit.click.triggerAttackRelease('A2', 0.05, T.now(), 0.5); }
export function doorSound() { if (on && kit && T) kit.door.triggerAttackRelease(1.0, T.now(), 0.5); }
/** Call every frame with the car's speed; the motor follows it. */
export function motor(v: number) {
  if (!on || !kit) return;
  const s = Math.min(1, Math.abs(v) / 2);
  kit.humGain.gain.rampTo(s * 0.22, 0.12);
  kit.rumbleGain.gain.rampTo(s * 0.35, 0.12);
  kit.hum.frequency.rampTo(48 + s * 20, 0.12);
}
