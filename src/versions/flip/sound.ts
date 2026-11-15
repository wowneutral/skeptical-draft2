// The coin's voice, through tone, only after the visitor turns sound on.
type ToneMod = typeof import('tone');
let T: ToneMod | null = null;
let metal: import('tone').MetalSynth | null = null;
let tick: import('tone').MembraneSynth | null = null;
let last = 0;

export async function enableSound() {
  if (!T) T = await import('tone');
  await T.start();
  if (!metal) {
    metal = new T.MetalSynth({ envelope: { attack: 0.001, decay: 0.9, release: 0.3 }, harmonicity: 8.5, modulationIndex: 20, resonance: 5200, octaves: 1.2 }).toDestination();
    metal.frequency.value = 520; metal.volume.value = -20;
    tick = new T.MembraneSynth({ pitchDecay: 0.004, octaves: 2, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 } }).toDestination();
    tick.volume.value = -14;
  }
}

/** The ping as it leaves the thumb, or the ring as it hits. */
export function ring(vel = 1) {
  if (!metal || !T) return;
  const now = T.now(); if (now - last < 0.02) return; last = now;
  try { metal.triggerAttackRelease('16n', now, vel); } catch { /* overlapping trigger, skip */ }
}
/** One rattle of the rim on the felt. */
export function rattle(rate: number) {
  if (!tick || !T) return;
  const now = T.now(); if (now - last < 0.012) return; last = now;
  try { tick.triggerAttackRelease(380 + rate * 40, '64n', now, 0.5); } catch { /* skip */ }
}
