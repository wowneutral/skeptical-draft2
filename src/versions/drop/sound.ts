// Sound, through Tone. Nothing is loaded and no audio context exists until the
// visitor turns the sound on; after that every event in the game has a voice.
import type { Sfx } from './engine';

type ToneNS = typeof import('tone');
type Kit = {
  blip: import('tone').PolySynth;
  pad: import('tone').PolySynth;
  thud: import('tone').MembraneSynth;
  hiss: import('tone').NoiseSynth;
  saw: import('tone').MonoSynth;
};

let T: ToneNS | null = null;
let kit: Kit | null = null;
let on = false;
let lastAt = 0;

const SCALE = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7'];
const ROOTS = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4'];

function build(t: ToneNS): Kit {
  const out = new t.Gain(0.55).toDestination();
  const comp = new t.Compressor(-16, 4).connect(out);
  const echo = new t.FeedbackDelay(0.14, 0.26).connect(comp);
  echo.wet.value = 0.22;
  const blip = new t.PolySynth(t.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.11, sustain: 0, release: 0.09 } }).connect(echo);
  blip.volume.value = -9;
  const pad = new t.PolySynth(t.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.08, release: 0.5 } });
  const lp = new t.Filter(1400, 'lowpass').connect(echo);
  pad.connect(lp); pad.volume.value = -19;
  const thud = new t.MembraneSynth({ pitchDecay: 0.09, octaves: 6, envelope: { attack: 0.001, decay: 0.55, sustain: 0, release: 0.2 } }).connect(comp);
  thud.volume.value = -3;
  const hp = new t.Filter(2200, 'lowpass').connect(comp);
  const hiss = new t.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.05 } }).connect(hp);
  hiss.volume.value = -13;
  const saw = new t.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { Q: 2, type: 'lowpass' }, envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 0.2 }, filterEnvelope: { attack: 0.005, decay: 0.25, sustain: 0.1, release: 0.2, baseFrequency: 160, octaves: 3 } }).connect(comp);
  saw.volume.value = -15;
  return { blip, pad, thud, hiss, saw };
}

/** Turn the sound on. Must be called from a click or a key press. */
export async function soundOn(): Promise<boolean> {
  try {
    if (!T) T = await import('tone');
    await T.start();
    if (!kit) kit = build(T);
    T.getDestination().mute = false;
    on = true;
    play('catch', 3);
  } catch { on = false; }
  return on;
}

export function soundOff() {
  on = false;
  if (T) T.getDestination().mute = true;
}

export function play(name: Sfx, n = 0) {
  if (!on || !T || !kit) return;
  try {
    // Two voices of one synth may not start on the same instant, so every call lands a hair after the last.
    const at = Math.max(T.now() + 0.005, lastAt + 0.012);
    lastAt = at;
    const k = kit;
    const arp = (notes: string[], step: number, len = 0.09, vel = 0.8) => notes.forEach((note, i) => k.blip.triggerAttackRelease(note, len, at + i * step, vel));
    switch (name) {
      case 'start': arp(['C4', 'G4', 'C5', 'E5'], 0.06); break;
      case 'tick': k.blip.triggerAttackRelease('G6', 0.03, at, 0.14); break;
      case 'catch': k.blip.triggerAttackRelease(SCALE[Math.min(SCALE.length - 1, Math.max(0, n - 1))], 0.08, at, 0.8); break;
      case 'clean': {
        const i = Math.min(SCALE.length - 1, Math.max(0, n - 1));
        k.blip.triggerAttackRelease(SCALE[i], 0.08, at, 0.85);
        k.blip.triggerAttackRelease(T.Frequency(SCALE[i]).transpose(7).toNote(), 0.1, at + 0.05, 0.6);
        break;
      }
      case 'drop':
        k.thud.triggerAttackRelease('C1', 0.5, at);
        k.hiss.triggerAttackRelease(0.2, at);
        k.saw.triggerAttackRelease('A2', 0.42, at);
        k.saw.frequency.rampTo(T.Frequency('D1').toFrequency(), 0.38, at + 0.02);
        lastAt = at + 0.46;
        break;
      case 'wave': {
        const root = ROOTS[Math.min(ROOTS.length - 1, n)];
        k.pad.triggerAttackRelease([root, T.Frequency(root).transpose(7).toNote(), T.Frequency(root).transpose(12).toNote()], 0.7, at, 0.7);
        arp([T.Frequency(root).transpose(24).toNote(), T.Frequency(root).transpose(31).toNote()], 0.11, 0.1, 0.5);
        break;
      }
      case 'clear': if (n) arp(['E5', 'G5', 'C6', 'E6'], 0.05); else k.blip.triggerAttackRelease('E4', 0.16, at, 0.5); break;
      case 'life': arp(['E6', 'A6', 'E7'], 0.07); break;
      case 'pause': k.blip.triggerAttackRelease('G4', 0.06, at, 0.4); break;
      case 'lost':
        ['A3', 'F3', 'D3', 'A2'].forEach((note, i) => k.pad.triggerAttackRelease(note, 0.5, at + i * 0.26, 0.8));
        break;
      case 'won': arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.075, 0.14); break;
      default: break;
    }
  } catch { /* a missed note is not worth a console error */ }
}
