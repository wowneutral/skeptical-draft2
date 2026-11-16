// Chiptune and footsteps through tone, loaded only when someone asks for sound.
type ToneT = typeof import('tone');
let T: ToneT | null = null;
let parts: { dispose: () => void }[] = [];
let lead: any, bass: any, step: any, blip: any, fx: any;
export let soundIsOn = false;

export async function soundOn() {
  T = T ?? (await import('tone'));
  await T.start();
  const t = T;
  lead = new t.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.005, decay: 0.12, sustain: 0.15, release: 0.12 }, volume: -22 }).toDestination();
  bass = new t.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.2 }, volume: -16 }).toDestination();
  step = new t.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }, volume: -20 }).toDestination();
  blip = new t.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 }, volume: -30 }).toDestination();
  fx = new t.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.002, decay: 0.15, sustain: 0, release: 0.05 }, volume: -18 }).toDestination();
  // A slow night tune in A minor, eight bars that loop.
  const mel = ['A4', null, 'C5', 'E5', null, 'D5', 'C5', null, 'B4', null, 'G4', 'B4', null, 'A4', null, null,
    'A4', null, 'C5', 'E5', null, 'G5', 'F5', 'E5', 'D5', null, 'B4', 'C5', null, 'A4', null, null];
  const bs = ['A2', 'A2', 'F2', 'F2', 'C3', 'C3', 'G2', 'G2'];
  const s1 = new t.Sequence((time, n) => { if (n) lead.triggerAttackRelease(n, '16n', time); }, mel, '8n');
  const s2 = new t.Sequence((time, n) => { bass.triggerAttackRelease(n, '2n', time); }, bs, '2n');
  t.getTransport().bpm.value = 92;
  s1.start(0); s2.start(0); t.getTransport().start();
  parts = [s1, s2, lead, bass, step, blip, fx];
  soundIsOn = true;
}
export function soundOff() {
  soundIsOn = false;
  if (!T) return;
  T.getTransport().stop(); T.getTransport().cancel();
  parts.forEach((p) => p.dispose()); parts = [];
}
export function sfx(n: 'step' | 'door' | 'bump' | 'blip' | 'get' | 'buzz' | 'key') {
  if (!soundIsOn || !T) return;
  const now = T.now();
  try {
    if (n === 'step') step.triggerAttackRelease('32n', now);
    else if (n === 'blip') blip.triggerAttackRelease('E6', '64n', now);
    else if (n === 'door') fx.triggerAttackRelease('C4', '16n', now);
    else if (n === 'bump') fx.triggerAttackRelease('C3', '16n', now);
    else if (n === 'key') fx.triggerAttackRelease('A5', '64n', now);
    else if (n === 'buzz') { fx.triggerAttackRelease('F2', '8n', now); fx.triggerAttackRelease('E2', '8n', now + 0.16); }
    else if (n === 'get') { fx.triggerAttackRelease('C5', '32n', now); fx.triggerAttackRelease('G5', '32n', now + 0.08); fx.triggerAttackRelease('C6', '16n', now + 0.16); }
  } catch { /* overlapping triggers are harmless */ }
}
