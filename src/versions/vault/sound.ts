// Sound is off until the visitor turns it on. Tone loads on that first press.
import { vault } from './stage';

type T = typeof import('tone');
let kit: null | { tick: InstanceType<T['NoiseSynth']>; clunk: InstanceType<T['MembraneSynth']>; thud: InstanceType<T['NoiseSynth']> } = null;
let loading: Promise<void> | null = null;

export async function enableSound() {
  if (kit) return;
  if (!loading) loading = (async () => {
    const Tone = await import('tone');
    await Tone.start();
    const hp = new Tone.Filter(3200, 'highpass').toDestination();
    const tick = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.018, sustain: 0 }, volume: -16 }).connect(hp);
    const lp = new Tone.Filter(500, 'lowpass').toDestination();
    const thud = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.002, decay: 0.16, sustain: 0 }, volume: -4 }).connect(lp);
    const clunk = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 3, envelope: { attack: 0.001, decay: 0.35, sustain: 0 }, volume: -6 }).toDestination();
    kit = { tick, clunk, thud };
  })();
  await loading;
}

let lastTick = 0;
export function tick() {
  if (!vault.sound || !kit) return;
  const now = performance.now(); if (now - lastTick < 22) return; lastTick = now;
  try { kit.tick.triggerAttackRelease(0.012); } catch { /* a tick dropped is fine */ }
}
export function clunk() {
  if (!vault.sound || !kit) return;
  try { kit.clunk.triggerAttackRelease('A0', 0.2); kit.thud.triggerAttackRelease(0.12); } catch { /* fine */ }
}
