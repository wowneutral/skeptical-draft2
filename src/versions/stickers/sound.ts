// The slap: a short pink-noise smack over a low thump, made with tone, loaded on first use.
type Tone = typeof import('tone');
let T: Tone | null = null;
let loading: Promise<void> | null = null;
let on = true;
let last = 0;
let noise: import('tone').NoiseSynth | null = null;
let thump: import('tone').MembraneSynth | null = null;
let hiss: import('tone').NoiseSynth | null = null;

export const setSound = (v: boolean) => { on = v; };
function load() {
  if (loading) return loading;
  (window as unknown as { TONE_SILENCE_LOGGING: boolean }).TONE_SILENCE_LOGGING = true;
  loading = import('tone').then(async (t) => {
    T = t;
    await t.start();
    const lp = new t.Filter(2600, 'lowpass').toDestination();
    noise = new t.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.02 }, volume: -10 }).connect(lp);
    thump = new t.MembraneSynth({ pitchDecay: 0.02, octaves: 3, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 }, volume: -14 }).toDestination();
    const hp = new t.Filter(3200, 'highpass').toDestination();
    hiss = new t.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.03, decay: 0.12, sustain: 0, release: 0.02 }, volume: -26 }).connect(hp);
  }).catch(() => { /* no audio, no problem */ });
  return loading;
}
const at = () => { if (!T) return 0; const t = Math.max(T.now() + 0.005, last + 0.035); last = t; return t; };
export function slapSound() {
  if (!on) return;
  void load().then(() => { try { const t = at(); noise?.triggerAttackRelease(0.06, t); thump?.triggerAttackRelease('G1', 0.08, t); } catch { /* ignore */ } });
}
export function peelSound() {
  if (!on) return;
  void load().then(() => { try { hiss?.triggerAttackRelease(0.14, at()); } catch { /* ignore */ } });
}
