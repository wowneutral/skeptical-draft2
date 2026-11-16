// The wax: renderer, the heat state, and a CPU copy of the shape so the
// pointer knows where it touches and the beads know where to stop.
import * as THREE from 'three';
import { buildField, g2, toHalf, W, H, type Field } from './sdf';
import { frag, vert } from './shader';

const HALF = 0.105, RR = 0.03;
const BG = [0x0e / 255, 0x0c / 255, 0x0a / 255];
const sm = (t: number) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

type Dent = { x: number; y: number; z: number; a: number; beads: number; late: boolean };
type Bead = { ax: number; ay: number; az: number; r: number; y: number; stop: number; v: number; late?: boolean; preset?: { m0: number } };

export type Wax = {
  setMelt(target: number, rewind: number): void;
  resize(): void;
  pointer(x: number, y: number, inside: boolean): boolean; // returns: over the wax
  press(x: number, y: number): boolean;
  pressAt(rx: number, ry: number): void;
  release(): void;
  keyPoint(): { x: number; y: number };
  moveKey(dx: number, dy: number): void;
  onOpen?: () => void;
  dispose(): void;
};

export function makeWax(canvas: HTMLCanvasElement, opts: { still: boolean; phone: boolean }): Wax {
  const F: Field = buildField();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(new THREE.Color().setRGB(BG[0], BG[1], BG[2], THREE.SRGBColorSpace));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const half = new Uint16Array(W * H);
  for (let i = 0; i < W * H; i++) half[i] = toHalf(F.data[i]);
  const tex = new THREE.DataTexture(half, W, H, THREE.RedFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.flipY = false; tex.generateMipmaps = false; tex.needsUpdate = true;

  const dents: Dent[] = [];
  const beads: Bead[] = [];
  const v4 = (n: number) => Array.from({ length: n }, () => new THREE.Vector4());
  const U = {
    uTex: { value: tex }, uRes: { value: new THREE.Vector2(1, 1) },
    uCam: { value: new THREE.Vector3() }, uCX: { value: new THREE.Vector3() }, uCY: { value: new THREE.Vector3() }, uCZ: { value: new THREE.Vector3() },
    uTan: { value: 0.14 }, uShift: { value: new THREE.Vector2() },
    uBase: { value: F.base }, uOffX: { value: F.offX },
    uMelt: { value: 0 }, uLean: { value: 0 }, uPool: { value: 0 }, uCool: { value: 0 }, uLamp: { value: opts.still ? 1 : 0 }, uHandK: { value: 0 },
    uPoolC: { value: new THREE.Vector2(F.dotX, 0) }, uHand: { value: new THREE.Vector3(0, 0.8, 0.6) },
    uDent: { value: v4(6) }, uBA: { value: v4(10) }, uBB: { value: v4(10) },
    uBg: { value: new THREE.Vector3(BG[0], BG[1], BG[2]) }, uEdge: { value: 0.08 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: U, depthTest: false, depthWrite: false });
  const scene = new THREE.Scene();
  const cam = new THREE.Camera();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  // a long lens, a little above the stone
  const eye = new THREE.Vector3(2.1, 1.75, 7.3), look = new THREE.Vector3(0.02, 0.78, 0);
  const cz = new THREE.Vector3(), cx = new THREE.Vector3(), cy = new THREE.Vector3();
  const aim = () => {
    cz.subVectors(look, eye).normalize(); cx.crossVectors(cz, new THREE.Vector3(0, 1, 0)).normalize(); cy.crossVectors(cx, cz);
    U.uCam.value.copy(eye); U.uCX.value.copy(cx); U.uCY.value.copy(cy); U.uCZ.value.copy(cz);
  };
  aim();

  let w = 1, h = 1, dirty = true;
  const resize = () => {
    const r = canvas.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    const dpr = Math.min(window.devicePixelRatio || 1, opts.phone ? 1.6 : 1.3);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    U.uRes.value.set(Math.round(w * dpr), Math.round(h * dpr));
    // keep the whole mark and its pool in frame at any aspect
    const asp = w / h;
    U.uTan.value = 0.168 * Math.max(1, 0.92 / asp);
    U.uEdge.value = opts.phone ? 0.05 : 0.08;
    dirty = true;
  };

  // ---- the CPU copy of the shape ----
  const S = { melt: 0, lean: 0, pool: 0, scale: 1 };
  function warp(px: number, py: number, pz: number) {
    const m = S.melt, y = Math.max(py, 0), sp = Math.exp(-y * 6);
    let qx = px / (1 + m * 1.3 * sp), qz = pz / (1 + m * 2.6 * sp);
    qx -= S.lean * y * y; qz -= S.lean * 0.55 * y * y;
    const m2 = m * m;
    let qy = y * (1 + 9 * m2 * m2 * m) + (1.0 * m2 + 14 * m2 * m2 * m2 * m) * y * y + Math.min(py, 0);
    let rr = RR + m * 0.03;
    for (const d of dents) {
      const a0 = d.a * (d.late ? 1 : S.scale); if (a0 < 0.001) continue;
      const dx = qx - d.x, dy = qy - d.y, f = Math.exp(-(dx * dx + dy * dy) * 14), below = sm((0.45 - (d.y - qy)) / 0.5), a = a0 * f;
      qy += a * 0.24 * below; qx = d.x + (qx - d.x) / (1 + a * 0.35); qz /= 1 + a * 0.45; rr += a * 0.035;
    }
    return { qx, qy, qz, rr };
  }
  function dist(px: number, py: number, pz: number) {
    const { qx, qy, qz, rr } = warp(px, py, pz);
    const d2 = g2(F, qx, qy) + rr, wz = Math.abs(qz) - HALF + rr;
    const d = (Math.min(Math.max(d2, wz), 0) + Math.hypot(Math.max(d2, 0), Math.max(wz, 0)) - rr) * 0.62;
    const pcx = px - U.uPoolC.value.x, pcz = pz - U.uPoolC.value.y, t = 0.006 + S.pool * 0.03;
    const dp = Math.hypot(Math.max(Math.hypot(pcx, pcz) - Math.max(S.pool - t, 0), 0), py) - t;
    return Math.min(d, dp);
  }
  /** Ray from a canvas pixel: returns the world hit on the wax, or null. */
  function ray(x: number, y: number) {
    const asp = w / h, nx = (x / w) * 2 - 1, ny = 1 - (y / h) * 2, tn = U.uTan.value;
    const rd = new THREE.Vector3().copy(cz).addScaledVector(cx, nx * tn * asp).addScaledVector(cy, ny * tn).normalize();
    return rd;
  }
  function pick(x: number, y: number) {
    const rd = ray(x, y); let t = 5.5;
    for (let i = 0; i < 140; i++) {
      const px = eye.x + rd.x * t, py = eye.y + rd.y * t, pz = eye.z + rd.z * t;
      if (py < -0.02) return null;
      const d = dist(px, py, pz);
      if (d < 0.002) return { px, py, pz, ...warp(px, py, pz) };
      t += Math.max(d, 0.004); if (t > 10) return null;
    }
    return null;
  }
  function handAt(x: number, y: number) {
    const rd = ray(x, y), zp = 0.5, t = (zp - eye.z) / rd.z;
    U.uHand.value.set(eye.x + rd.x * t, Math.max(0.05, eye.y + rd.y * t), zp);
  }

  // ---- beads: they run down the front face of the cold shape and stop where it ends ----
  function runLength(x: number, y: number) {
    let l = 0;
    while (l < 0.42 && y - l > 0.03 && g2(F, x, y - l - 0.03) < -0.012) l += 0.005;
    return l;
  }
  // a few beads that belong to the slow melt of the whole mark
  const seeds: [number, number][] = [];
  {
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 400 && seeds.length < 4; k++) {
      const x = (rnd() - 0.5) * 0.9, y = 0.45 + rnd() * F.height * 0.6;
      if (g2(F, x, y) < -0.04 && seeds.every(([a, b]) => Math.hypot(a - x, b - y) > 0.22) && runLength(x, y) > 0.12) seeds.push([x, y]);
    }
    seeds.forEach(([x, y], i) => beads.push({ ax: x, ay: y, az: HALF + 0.002, r: 0.026 + (i % 2) * 0.008, y, stop: runLength(x, y), v: 0, preset: { m0: 0.12 + i * 0.07 } }));
  }
  function spawn(d: Dent) {
    const live = beads.filter((b) => !b.preset);
    if (live.length >= 6) beads.splice(beads.indexOf(live[0]), 1);
    const x = d.x + (Math.random() - 0.5) * 0.06, y = d.y - 0.03;
    if (g2(F, x, y) > -0.01) return;
    beads.push({ ax: x, ay: y, az: Math.sign(d.z || 1) * (HALF + 0.004), r: 0.028 + Math.random() * 0.012, y, stop: Math.max(0.02, runLength(x, y)), v: 0.05, late: d.late });
  }

  // ---- state from outside ----
  let meltT = 0, rewind = 0, hold: Dent | null = null, handK = 0, handT = 0, lamp = opts.still ? 1 : 0, keyP = { x: 0, y: 0 };
  {
    // the keyboard's spot starts in the thick of the hook
    let best = 0, bx = 0, by = F.height * 0.7;
    for (let y = F.height * 0.45; y < F.height * 0.95; y += 0.02) for (let x = -0.4; x < 0.4; x += 0.02) { const d = -g2(F, x, y); if (d > best) { best = d; bx = x; by = y; } }
    keyP = { x: bx, y: by };
  }
  let opened = opts.still;
  const t0 = performance.now();

  function upload() {
    U.uMelt.value = S.melt; U.uLean.value = S.lean; U.uPool.value = S.pool;
    U.uPoolC.value.set(F.dotX + S.lean * 0.5, S.lean * 0.35);
    for (let i = 0; i < 6; i++) { const d = dents[i]; U.uDent.value[i].set(d ? d.x : 0, d ? d.y : 0, d ? d.z : 0, d ? d.a * (d.late ? 1 : S.scale) : 0); }
    for (let i = 0; i < 10; i++) {
      const b = beads[i], A = U.uBA.value[i], B = U.uBB.value[i];
      if (!b) { B.w = 0; continue; }
      let len: number;
      if (b.preset) len = b.stop * sm((S.melt - b.preset.m0) / 0.16);
      else len = (b.ay - b.y) * (b.late ? 1 : S.scale);
      const k = b.preset || b.late ? 1 : S.scale;
      const on = (b.preset ? S.melt > b.preset.m0 + 0.03 : k > 0.02) ? 1 : 0;
      A.set(b.ax, b.ay, b.az, b.r * Math.max(0.3, k));
      B.set(b.ax + Math.sin(b.ay * 40) * len * 0.05, b.ay - Math.max(len, 0.004), b.az, on);
    }
  }

  let raf = 0, last = performance.now();
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(0.5, (now - last) / 1000); last = now;
    let moving = false;
    if (!opened) {
      const k = Math.min(1, (now - t0 - 250) / 1900);
      lamp = k <= 0 ? 0 : 1 - Math.pow(1 - k, 3);
      moving = true;
      if (k >= 1) { opened = true; api.onOpen?.(); }
      U.uLamp.value = lamp;
    }
    if (!opts.still) {
      // the whole mark follows the scroll slowly, like something with weight
      const lam = meltT < S.melt ? 1.5 : 1.1, nm = S.melt + (meltT - S.melt) * (1 - Math.exp(-lam * dt));
      if (Math.abs(nm - S.melt) > 1e-5) { S.melt = nm; moving = true; }
      const ns = 1 - sm(rewind);
      if (Math.abs(ns - S.scale) > 1e-4) { S.scale += (ns - S.scale) * (1 - Math.exp(-3 * dt)); moving = true; }
      S.lean = 0.34 * sm(S.melt / 0.6) ;
      // once time has run all the way back, the old heat is gone for good
      if (S.scale < 0.01) {
        for (let i = dents.length - 1; i >= 0; i--) if (!dents[i].late && dents[i] !== hold) dents.splice(i, 1);
        for (let i = beads.length - 1; i >= 0; i--) if (!beads[i].preset && !beads[i].late) beads.splice(i, 1);
      }
      if (rewind < 0.05) { for (const d of dents) d.late = false; for (const b of beads) b.late = false; }
      const dentHeat = dents.reduce((s, d) => s + d.a * (d.late ? 1 : S.scale), 0);
      S.pool = 0.95 * Math.pow(S.melt, 1.15) + Math.min(0.22, dentHeat * 0.05) + 0.02 * sm(S.melt * 6);
      U.uCool.value = sm(rewind);
      if (hold) {
        hold.a += dt * 0.6 * Math.max(0.12, 1 - hold.a / 1.8);
        const n = hold.a > 1.0 ? 3 : hold.a > 0.6 ? 2 : hold.a > 0.2 ? 1 : 0;
        while (hold.beads < n) { hold.beads++; spawn(hold); }
        moving = true;
      }
      for (const b of beads) {
        if (b.preset) continue;
        const run = b.ay - b.y;
        if (run < b.stop) {
          // slow and heavy, slowing as it cools
          b.v = 0.012 + 0.07 * (1 - run / b.stop);
          b.y = Math.max(b.ay - b.stop, b.y - b.v * dt);
          moving = true;
        }
      }
      const hk = handK + (handT - handK) * (1 - Math.exp(-6 * dt));
      if (Math.abs(hk - handK) > 1e-4) { handK = hk; moving = true; }
      U.uHandK.value = handK;
    }
    if (moving || dirty) {
      upload();
      renderer.render(scene, cam);
      dirty = false;
    }
  };

  const api: Wax = {
    setMelt(target, rw) { if (opts.still) return; meltT = target; rewind = rw; },
    resize,
    pointer(x, y, inside) {
      if (opts.still) return false;
      handAt(x, y);
      handT = hold ? 1 : inside ? 0.32 : 0;
      dirty = true;
      if (hold) {
        const p = pick(x, y);
        if (p) {
          const near = dents.find((d) => Math.hypot(d.x - p.qx, d.y - p.qy) < 0.12);
          if (near && near !== hold) { hold = near; }
          else if (!near) { const d = addDent(p.qx, p.qy, p.qz); hold = d; }
        }
        return true;
      }
      return inside && !!pick(x, y);
    },
    press(x, y) {
      if (opts.still) return false;
      const p = pick(x, y); if (!p) return false;
      const near = dents.find((d) => Math.hypot(d.x - p.qx, d.y - p.qy) < 0.12);
      hold = near ?? addDent(p.qx, p.qy, p.qz);
      handAt(x, y); handT = 1; return true;
    },
    pressAt(rx, ry) {
      if (opts.still) return;
      const near = dents.find((d) => Math.hypot(d.x - rx, d.y - ry) < 0.08);
      hold = near ?? addDent(rx, ry, HALF);
      U.uHand.value.set(rx, ry, 0.5); handT = 1;
    },
    release() { hold = null; handT = 0.0; },
    keyPoint: () => keyP,
    moveKey(dx, dy) {
      const nx = keyP.x + dx, ny = keyP.y + dy;
      if (g2(F, nx, ny) < -0.01) keyP = { x: nx, y: ny };
    },
    dispose() { cancelAnimationFrame(raf); renderer.dispose(); tex.dispose(); mat.dispose(); },
  };
  function addDent(x: number, y: number, z: number) {
    if (dents.length >= 6) { dents.sort((a, b) => a.a - b.a); dents.shift(); }
    const d = { x, y, z, a: 0, beads: 0, late: rewind > 0.4 }; dents.push(d); return d;
  }
  resize();
  raf = requestAnimationFrame(frame);
  return api;
}
