// The cradle's physics and the state the page and the scene share.
// Eight equal steel balls, each a pendulum hung on two taut wires. Contacts are
// solved as equal mass, nearly elastic exchanges along the row, swept forward and
// back until nothing approaches: pull one and one leaves, pull two and two leave.

export const N = 8;
export const R = 0.25;          // ball radius
export const LC = 2.3;          // pivot axis to ball centre
export const TOP = 2.85;        // height of the pivot rails above the stone
export const RAIL_Z = 0.72;     // the two rails, front and back
export const GAP = 0.0006;      // the hair between resting balls
export const PITCH = 2 * R + GAP;
export const G = 98;            // gravity in scene units (one unit is about 10 cm)
export const E = 0.986;         // restitution: steel on steel, a little loss per knock
export const AIR = 0.11;        // air and wire damping: settles over ten seconds or so
export const px = (i: number) => (i - (N - 1) / 2) * PITCH;
export const MAX = 1.25;

type Script = { balls: number[]; from: number[]; to: number; t: number; lift: number; hold: number };

export const rig = {
  th: new Float64Array(N),
  om: new Float64Array(N),
  held: new Uint8Array(N),
  ht: new Float64Array(N),
  script: null as Script | null,
  settle: 0,            // extra damping, eased back to zero
  settleTo: 0,
  impact: 0,            // the hardest knock this frame, for the click
  // shared with the page
  f: 0,                 // scroll position in shots
  shot: -1,             // the last shot that ran its action
  sel: 0,               // keyboard choice
  sound: false,
  soundTouched: false,
  pressed: false,
  onSound: null as null | ((on: boolean) => void),
  onKnock: null as null | ((v: number) => void),
  phone: false,
  focus: false,
};

export function resetRig() {
  rig.th.fill(0); rig.om.fill(0); rig.held.fill(0); rig.ht.fill(0);
  rig.script = null; rig.settle = 0; rig.settleTo = 0; rig.shot = -1; rig.f = 0;
}

/** Pull a group of balls back to an angle, hold a beat, and let go. */
export function pull(balls: number[], to: number, lift = 0.85) {
  if (rig.phone) to *= 0.72;
  for (let i = 0; i < N; i++) rig.held[i] = 0;
  balls.forEach((b) => { rig.held[b] = 1; rig.ht[b] = rig.th[b]; });
  rig.script = { balls, from: balls.map((b) => rig.th[b]), to, t: 0, lift, hold: 0.18 };
}

/** The balls a hand takes when it pulls ball i out to one side. */
export function group(i: number, side: number) {
  const out: number[] = [];
  if (side < 0) for (let k = 0; k <= i; k++) out.push(k);
  else for (let k = i; k < N; k++) out.push(k);
  return out;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function collide() {
  let hardest = 0;
  for (let sweep = 0; sweep < 24; sweep++) {
    let any = false;
    const fwd = sweep % 2 === 0;
    for (let k = 0; k < N - 1; k++) {
      const i = fwd ? k : N - 2 - k, j = i + 1;
      const xi = px(i) + LC * Math.sin(rig.th[i]), xj = px(j) + LC * Math.sin(rig.th[j]);
      const gap = xj - xi - 2 * R;
      if (gap > GAP + 2e-4) continue;
      const ci = Math.cos(rig.th[i]), cj = Math.cos(rig.th[j]);
      const ui = LC * rig.om[i] * ci, uj = LC * rig.om[j] * cj;
      if (ui - uj <= 1e-5) continue;
      const hi = rig.held[i], hj = rig.held[j];
      if (hi && hj) continue;
      let ni = ui, nj = uj;
      if (hi) nj = ui + E * (ui - uj);
      else if (hj) ni = uj - E * (ui - uj);
      else { const m = (ui + uj) / 2, d = (ui - uj) / 2; ni = m - E * d; nj = m + E * d; }
      hardest = Math.max(hardest, ui - uj);
      if (!hi) rig.om[i] = ni / (LC * ci);
      if (!hj) rig.om[j] = nj / (LC * cj);
      any = true;
    }
    if (!any) break;
  }
  // Keep them from sinking into each other.
  for (let i = 0; i < N - 1; i++) {
    const j = i + 1;
    const xi = px(i) + LC * Math.sin(rig.th[i]), xj = px(j) + LC * Math.sin(rig.th[j]);
    const over = 2 * R - (xj - xi);
    if (over <= 0) continue;
    const hi = rig.held[i], hj = rig.held[j];
    if (hi && hj) continue;
    const si = hi ? 0 : hj ? 1 : 0.5, sj = hj ? 0 : hi ? 1 : 0.5;
    if (si) rig.th[i] = Math.asin(Math.max(-0.99, Math.min(0.99, (xi - over * si - px(i)) / LC)));
    if (sj) rig.th[j] = Math.asin(Math.max(-0.99, Math.min(0.99, (xj + over * sj - px(j)) / LC)));
  }
  return hardest;
}

export function step(dt: number) {
  dt = Math.min(dt, 1 / 30);
  const n = Math.max(1, Math.ceil(dt / 0.001)), h = dt / n;
  let hardest = 0;
  for (let s = 0; s < n; s++) {
    rig.settle += (rig.settleTo - rig.settle) * Math.min(1, h * 2);
    const sc = rig.script;
    let calm = 0;
    if (sc) {
      sc.t += h;
      const u = Math.min(1, sc.t / sc.lift), e = ease(u);
      sc.balls.forEach((b, k) => { const nt = sc.from[k] + (sc.to - sc.from[k]) * e; rig.om[b] = (nt - rig.th[b]) / h; rig.ht[b] = nt; });
      calm = 7;
      if (sc.t >= sc.lift + sc.hold) { sc.balls.forEach((b) => { rig.held[b] = 0; rig.om[b] = 0; }); rig.script = null; }
    }
    for (let i = 0; i < N; i++) {
      if (rig.held[i]) { const nt = rig.ht[i]; if (!sc) rig.om[i] = (nt - rig.th[i]) / h * 0.5; rig.th[i] = nt; continue; }
      const c = AIR + rig.settle + calm;
      rig.om[i] += (-(G / LC) * Math.sin(rig.th[i]) - c * rig.om[i]) * h;
      rig.th[i] += rig.om[i] * h;
      if (rig.th[i] > MAX) { rig.th[i] = MAX; rig.om[i] = Math.min(0, rig.om[i]); }
      if (rig.th[i] < -MAX) { rig.th[i] = -MAX; rig.om[i] = Math.max(0, rig.om[i]); }
    }
    hardest = Math.max(hardest, collide());
    for (let i = 0; i < N; i++) if (rig.held[i] && !sc) rig.om[i] = 0;
  }
  rig.impact = hardest;
  return hardest;
}

/* ───────── the click: two short metal partials and a breath of noise ───────── */

let ac: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let lastClick = 0;

export function wakeSound() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ac = new C();
    noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.03), ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
  } catch { ac = null; }
}

export function click(v: number) {
  if (!rig.sound || !ac || !noise) return;
  const now = ac.currentTime;
  if (now - lastClick < 0.035) return;
  lastClick = now;
  const g = Math.min(0.22, 0.03 + v * 0.022);
  const out = ac.createGain(); out.gain.value = g; out.connect(ac.destination);
  for (const [f, d, a] of [[3150, 0.05, 1], [5420, 0.03, 0.5], [8100, 0.018, 0.25]] as const) {
    const o = ac.createOscillator(), e = ac.createGain();
    o.type = 'sine'; o.frequency.value = f * (0.985 + Math.random() * 0.03);
    e.gain.setValueAtTime(a, now); e.gain.exponentialRampToValueAtTime(0.0001, now + d);
    o.connect(e).connect(out); o.start(now); o.stop(now + d + 0.01);
  }
  const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
  s.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 1.4; ng.gain.value = 0.6;
  s.connect(bp).connect(ng).connect(out); s.start(now);
}
