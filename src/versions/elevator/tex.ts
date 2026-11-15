// Every surface is drawn here on a canvas: brushed steel, worn brass,
// plaster, stone, the ceiling light and the dial face. Nothing is downloaded.
import * as THREE from 'three';
import { FLOORS } from './lift';

function cv(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function tex(c: HTMLCanvasElement, color = true, rep: [number, number] = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Hairline-brushed steel, vertical grain, with smudges and kick marks. */
export function steel(opts: { wear?: number; tone?: number } = {}) {
  const W = 512, H = 1024, wear = opts.wear ?? 1, tone = opts.tone ?? 150;
  const [c, g] = cv(W, H), [r, h] = cv(W, H);
  g.fillStyle = `rgb(${tone},${tone + 2},${tone + 5})`; g.fillRect(0, 0, W, H);
  h.fillStyle = 'rgb(92,92,92)'; h.fillRect(0, 0, W, H);
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * W, y0 = rnd() * H, len = 60 + rnd() * H * 0.9, a = rnd() * 0.035;
    const light = rnd() > 0.5;
    g.strokeStyle = light ? `rgba(255,255,255,${a})` : `rgba(0,0,10,${a})`;
    g.lineWidth = rnd() < 0.8 ? 1 : 2;
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (rnd() - 0.5) * 2, y0 + len); g.stroke();
    h.strokeStyle = light ? `rgba(0,0,0,${a * 1.4})` : `rgba(255,255,255,${a * 1.6})`;
    h.beginPath(); h.moveTo(x, y0); h.lineTo(x, y0 + len); h.stroke();
    if (y0 + len > H) { g.beginPath(); g.moveTo(x, y0 - H); g.lineTo(x, y0 + len - H); g.stroke(); h.beginPath(); h.moveTo(x, y0 - H); h.lineTo(x, y0 + len - H); h.stroke(); }
  }
  // Smudges where hands go, scuffs where feet go.
  for (let i = 0; i < 26 * wear; i++) {
    const x = rnd() * W, y = H * (0.35 + rnd() * 0.35), rr = 10 + rnd() * 40;
    const gr = h.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    h.fillStyle = gr; h.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < 40 * wear; i++) {
    const x = rnd() * W, y = H * (0.86 + rnd() * 0.13), w = 8 + rnd() * 50;
    g.strokeStyle = `rgba(20,18,16,${0.05 + rnd() * 0.12})`; g.lineWidth = 1 + rnd() * 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + (rnd() - 0.5) * 6); g.stroke();
    h.strokeStyle = 'rgba(255,255,255,0.25)'; h.beginPath(); h.moveTo(x, y); h.lineTo(x + w, y); h.stroke();
  }
  for (let i = 0; i < 18 * wear; i++) {
    const x = rnd() * W, y = rnd() * H, len = 20 + rnd() * 120, ang = (rnd() - 0.5) * 1.4;
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(ang) * len, y + Math.cos(ang) * len); g.stroke();
  }
  return { map: tex(c), rough: tex(r, false) };
}

/** Brass, a little dull at the edges and bright where it is touched. */
export function brass() {
  const W = 512, H = 512;
  const [c, g] = cv(W, H), [r, h] = cv(W, H);
  g.fillStyle = '#b8914f'; g.fillRect(0, 0, W, H);
  h.fillStyle = 'rgb(80,80,80)'; h.fillRect(0, 0, W, H);
  for (let i = 0; i < 2200; i++) {
    const y = rnd() * H, a = rnd() * 0.06;
    g.strokeStyle = rnd() > 0.5 ? `rgba(255,236,190,${a})` : `rgba(60,34,10,${a})`;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + (rnd() - 0.5) * 3); g.stroke();
  }
  for (let i = 0; i < 60; i++) {
    const x = rnd() * W, y = rnd() * H, rr = 20 + rnd() * 70;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(70,52,24,0.16)'); gr.addColorStop(1, 'rgba(70,52,24,0)');
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    const gh = h.createRadialGradient(x, y, 0, x, y, rr);
    gh.addColorStop(0, 'rgba(255,255,255,0.18)'); gh.addColorStop(1, 'rgba(255,255,255,0)');
    h.fillStyle = gh; h.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  return { map: tex(c), rough: tex(r, false) };
}

/** Warm lime plaster for the lobby wall. */
export function plaster() {
  const W = 512, H = 512;
  const [c, g] = cv(W, H);
  g.fillStyle = '#d9c3a0'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W, y = rnd() * H, rr = 6 + rnd() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    const d = rnd() > 0.5;
    gr.addColorStop(0, d ? 'rgba(150,110,70,0.035)' : 'rgba(255,240,215,0.04)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  return tex(c, true, [3, 2]);
}

/** Dark walnut for the lobby wainscot. */
export function walnut() {
  const W = 1024, H = 256;
  const [c, g] = cv(W, H);
  g.fillStyle = '#3a2416'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const y = rnd() * H, a = 0.04 + rnd() * 0.08;
    g.strokeStyle = rnd() > 0.5 ? `rgba(120,76,40,${a})` : `rgba(15,8,4,${a})`;
    g.lineWidth = 1 + rnd() * 3;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= W; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4);
    g.stroke();
  }
  return tex(c, true, [3, 1]);
}

/** Terrazzo: warm chips in a pale ground, polished. */
export function terrazzo(dark = false) {
  const W = 1024, H = 1024;
  const [c, g] = cv(W, H);
  g.fillStyle = dark ? '#2a2724' : '#c9b79b'; g.fillRect(0, 0, W, H);
  const chips = dark ? ['#3b3732', '#47413a', '#1c1a18', '#5a4c3c', '#6b5e4e'] : ['#a58c69', '#e6d8c0', '#8a6f4d', '#5d4a36', '#f2ead9', '#b69b77'];
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * W, y = rnd() * H, s = 1.5 + rnd() * rnd() * 9;
    g.fillStyle = chips[Math.floor(rnd() * chips.length)];
    g.beginPath();
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + rnd(); g.lineTo(x + Math.cos(a) * s * (0.6 + rnd() * 0.6), y + Math.sin(a) * s * (0.6 + rnd() * 0.6)); }
    g.fill();
  }
  return tex(c, true, dark ? [1.4, 1.4] : [2.4, 2.4]);
}

/** The car floor: dark stone tiles, worn pale where people stand. */
export function carFloor(w: number, d: number) {
  const W = 1024, H = 1024;
  const [c, g] = cv(W, H), [r, h] = cv(W, H);
  g.fillStyle = '#24211e'; g.fillRect(0, 0, W, H);
  h.fillStyle = 'rgb(150,150,150)'; h.fillRect(0, 0, W, H);
  for (let i = 0; i < 7000; i++) {
    const x = rnd() * W, y = rnd() * H, s = 1 + rnd() * 3;
    g.fillStyle = `rgba(${rnd() > 0.5 ? '200,190,170' : '0,0,0'},${0.05 + rnd() * 0.1})`; g.fillRect(x, y, s, s);
  }
  // Worn path from the doorway.
  const gr = g.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.6);
  gr.addColorStop(0, 'rgba(120,110,96,0.25)'); gr.addColorStop(1, 'rgba(120,110,96,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const gh = h.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.6);
  gh.addColorStop(0, 'rgba(255,255,255,0.3)'); gh.addColorStop(1, 'rgba(255,255,255,0)');
  h.fillStyle = gh; h.fillRect(0, 0, W, H);
  // Tile joints.
  const nx = Math.max(2, Math.round(w / 0.6)), ny = Math.max(2, Math.round(d / 0.6));
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; h.strokeStyle = 'rgba(255,255,255,0.6)'; h.lineWidth = 3;
  for (let i = 1; i < nx; i++) { const x = (i / nx) * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); h.beginPath(); h.moveTo(x, 0); h.lineTo(x, H); h.stroke(); }
  for (let i = 1; i < ny; i++) { const y = (i / ny) * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); h.beginPath(); h.moveTo(0, y); h.lineTo(W, y); h.stroke(); }
  const m = tex(c), rr = tex(r, false);
  return { map: m, rough: rr };
}

/** The grooved threshold plate. */
export function sill() {
  const W = 512, H = 64;
  const [c, g] = cv(W, H);
  g.fillStyle = '#9a9690'; g.fillRect(0, 0, W, H);
  for (let y = 4; y < H; y += 9) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, y, W, 3); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, y + 3, W, 1); }
  return tex(c, true, [3, 1]);
}

/** The ceiling: a lit panel behind a brass grille. */
export function ceiling() {
  const W = 512, H = 512;
  const [c, g] = cv(W, H);
  const gr = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7);
  gr.addColorStop(0, '#fff6e2'); gr.addColorStop(1, '#ffe2b0');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(70,48,20,0.85)'; g.lineWidth = 6;
  for (let i = 0; i <= 8; i++) { const x = (i / 8) * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(W, x); g.stroke(); }
  return tex(c);
}

/** The dial face: floors round an arc, the lit one glowing. Redrawn when the floor changes. */
export function dialFace() {
  const W = 1024, H = 560;
  const [c, g] = cv(W, H), [e, eg] = cv(W, H);
  const map = tex(c), emit = tex(e);
  map.wrapS = map.wrapT = emit.wrapS = emit.wrapT = THREE.ClampToEdgeWrapping;
  map.repeat.set(1, 1); emit.repeat.set(1, 1);
  const cx = W / 2, cy = H - 40, R = 430;
  const ang = (i: number) => Math.PI * (0.92 - (i / (FLOORS.length - 1)) * 0.84);
  let last = -9;
  const draw = (lit: number) => {
    if (lit === last) return; last = lit;
    g.clearRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2b2117'); gr.addColorStop(1, '#14100b');
    g.fillStyle = gr;
    g.beginPath(); g.arc(cx, cy, R, Math.PI, 0); g.closePath(); g.fill();
    // Engraved ring and ticks.
    g.strokeStyle = '#c9a46a'; g.lineWidth = 5;
    g.beginPath(); g.arc(cx, cy, R - 18, Math.PI, 0); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R - 150, Math.PI, 0); g.stroke();
    for (let i = 0; i <= 50; i++) {
      const a = Math.PI * (0.92 - (i / 50) * 0.84), long = i % 10 === 0;
      g.lineWidth = long ? 4 : 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * (R - 30), cy - Math.sin(a) * (R - 30)); g.lineTo(cx + Math.cos(a) * (R - (long ? 64 : 44)), cy - Math.sin(a) * (R - (long ? 64 : 44))); g.stroke();
    }
    eg.fillStyle = '#000'; eg.fillRect(0, 0, W, H);
    g.textAlign = eg.textAlign = 'center'; g.textBaseline = eg.textBaseline = 'middle';
    FLOORS.forEach((f, i) => {
      const a = ang(i), x = cx + Math.cos(a) * (R - 106), y = cy - Math.sin(a) * (R - 106);
      const on = i === lit;
      g.font = `800 ${on ? 92 : 78}px "Big Shoulders Display Variable", Impact, sans-serif`;
      g.fillStyle = on ? '#ffd27a' : '#c9a46a';
      g.fillText(f.label, x, y);
      if (on) { eg.font = g.font; eg.fillStyle = '#ffb347'; eg.shadowColor = '#ff9a2a'; eg.shadowBlur = 30; eg.fillText(f.label, x, y); eg.shadowBlur = 0; }
    });
    g.fillStyle = '#c9a46a'; g.beginPath(); g.arc(cx, cy, 34, 0, Math.PI * 2); g.fill();
    map.needsUpdate = true; emit.needsUpdate = true;
  };
  return { map, emit, draw, ang };
}
