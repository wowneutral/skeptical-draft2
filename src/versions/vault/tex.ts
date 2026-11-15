// Every surface of the vault is drawn here on a canvas: spun steel, engraved
// lettering, fingerprints, brushed brass. Nothing is downloaded.
import * as THREE from 'three';
import { HERO, PEOPLE, RECORD, SITE } from '@/content';

export const SERIF = '"Bodoni Moda Variable", "Bodoni Moda", serif';
export const SANS = '"Hanken Grotesk Variable", "Hanken Grotesk", sans-serif';

function pad(w: number, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}
function rng(seed: number) { let s = seed % 2147483647; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function tex(c: HTMLCanvasElement, color = false, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}

/** Characters set around a circle, tops outward, reading clockwise, spaced to fill the turn exactly. */
function ring(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, px: number, start = -Math.PI / 2) {
  g.font = `600 ${px}px ${SERIF}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const ws = [...text].map((ch) => g.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0);
  const k = (Math.PI * 2 * r) / total;
  let a = start;
  [...text].forEach((ch, i) => {
    const w = ws[i] * k, mid = a + w / 2 / r;
    g.save(); g.translate(cx + r * Math.cos(mid), cy + r * Math.sin(mid)); g.rotate(mid + Math.PI / 2);
    g.fillText(ch, 0, 0); g.restore();
    a += w / r;
  });
}

export const RIM_TEXT = `${SITE.name.toUpperCase()}  ✦  ${HERO.statement[1].toUpperCase().replace(/\.$/, '')}  ✦  ${HERO.statement[0].toUpperCase().replace(/\.$/, '')}  ✦  ${HERO.statement[2].toUpperCase().replace(/\.$/, '')}  ✦  `;

/** The door's face: spun steel with a lettered rim. UVs are planar over radius R. */
export function doorMaps(S: number, R: number, lettered = true) {
  const k = S / 2 / R, c = S / 2, rnd = rng(7);
  const [cc, g] = pad(S); // colour
  const [rc, h] = pad(S); // G roughness, B metalness
  const [bc, b] = pad(S); // bump
  // Base steel, a little warmer at the centre where the lamp has yellowed the oil.
  let gr = g.createRadialGradient(c, c * 0.9, 0, c, c, c);
  gr.addColorStop(0, '#c4c0b8'); gr.addColorStop(0.7, '#a9a69f'); gr.addColorStop(1, '#8f8c86');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  h.fillStyle = 'rgb(0,74,255)'; h.fillRect(0, 0, S, S);
  b.fillStyle = '#808080'; b.fillRect(0, 0, S, S);
  // Lathe rings: thousands of concentric scratches.
  for (let i = 0; i < 2200; i++) {
    const r = rnd() * c, a0 = rnd() * Math.PI * 2, len = 0.6 + rnd() * 5;
    const v = rnd() < 0.5 ? 255 : 0, al = 0.03 + rnd() * 0.08;
    g.strokeStyle = `rgba(${v},${v},${v},${al * 0.5})`; g.lineWidth = rnd() * 1.6 + 0.4;
    g.beginPath(); g.arc(c, c, r, a0, a0 + len); g.stroke();
    h.strokeStyle = `rgba(0,${rnd() < 0.5 ? 40 : 130},255,${al})`; h.lineWidth = g.lineWidth;
    h.beginPath(); h.arc(c, c, r, a0, a0 + len); h.stroke();
    b.strokeStyle = `rgba(${v},${v},${v},${al * 0.8})`; b.lineWidth = g.lineWidth;
    b.beginPath(); b.arc(c, c, r, a0, a0 + len); b.stroke();
  }
  // Grime in the low corner and wear where hands go: around the dial and the wheel.
  const blot = (x: number, y: number, r: number, col: string, ctx: CanvasRenderingContext2D) => {
    const q = ctx.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col); q.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = q; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  for (let i = 0; i < 40; i++) blot(c + (rnd() - 0.5) * S * 0.9, c + S * 0.2 + rnd() * S * 0.3, 40 + rnd() * 160, 'rgba(40,32,20,0.10)', g);
  // Fingerprints: little ellipses of ridges, rougher than the steel around them.
  const print = (x: number, y: number, s: number, rot: number) => {
    for (const ctx of [h, g]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      for (let j = 0; j < 11; j++) {
        ctx.strokeStyle = ctx === h ? 'rgba(0,150,255,0.22)' : 'rgba(70,60,45,0.07)'; ctx.lineWidth = s * 0.035;
        ctx.beginPath(); ctx.ellipse(0, 0, s * (0.15 + j * 0.06), s * (0.22 + j * 0.085), 0, Math.PI * (0.1 + rnd() * 0.2), Math.PI * (1.9 + rnd() * 0.1)); ctx.stroke();
      }
      ctx.restore();
    }
  };
  const P = (x: number, y: number) => [c + x * k, c - y * k] as const;
  if (lettered) {
  for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI * 2, rr = 0.55 + rnd() * 0.2; const [x, y] = P(Math.cos(a) * rr, 0.55 + Math.sin(a) * rr); print(x, y, k * (0.09 + rnd() * 0.05), rnd() * 6); }
  for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI * 2, rr = 0.75 + rnd() * 0.15; const [x, y] = P(Math.cos(a) * rr, -0.85 + Math.sin(a) * rr); print(x, y, k * (0.09 + rnd() * 0.05), rnd() * 6); }
  // A turned groove ring and the rim band.
  for (const [r0, r1] of [[1.28, 1.34], [1.62, 1.66]] as const) {
    g.strokeStyle = 'rgba(30,28,25,0.55)'; g.lineWidth = (r1 - r0) * k; g.beginPath(); g.arc(c, c, ((r0 + r1) / 2) * k, 0, Math.PI * 2); g.stroke();
  }
  // The engraving: the name and the statement, cut into the rim.
  const px = 0.15 * k, rr = 1.83 * k;
  g.fillStyle = 'rgba(255,250,240,0.35)'; ring(g, RIM_TEXT, c + 1.5, c + 2, rr, px);
  g.fillStyle = '#1d1b18'; ring(g, RIM_TEXT, c, c, rr, px);
  h.fillStyle = 'rgb(0,170,60)'; ring(h, RIM_TEXT, c, c, rr, px);
  b.fillStyle = '#000'; ring(b, RIM_TEXT, c, c, rr, px);
  // Tick marks between the rim band edges.
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, r0 = 1.97 * k, r1 = (i % 5 ? 1.99 : 2.0) * k;
    for (const [ctx, col] of [[g, '#2a2824'], [b, '#202020']] as const) {
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); ctx.stroke();
    }
  }
  }
  // Direction field for anisotropy: the highlight runs radially across spun metal.
  const A = 256, [ac, an] = pad(A), im = an.createImageData(A, A);
  for (let y = 0; y < A; y++) for (let x = 0; x < A; x++) {
    const dx = x - A / 2 + 0.5, dy = -(y - A / 2 + 0.5), l = Math.hypot(dx, dy) || 1;
    const i = (y * A + x) * 4; im.data[i] = (dx / l) * 127 + 128; im.data[i + 1] = (dy / l) * 127 + 128; im.data[i + 2] = 255; im.data[i + 3] = 255;
  }
  an.putImageData(im, 0, 0);
  return { map: tex(cc, true), orm: tex(rc), bump: tex(bc), aniso: tex(ac, false, 1) };
}

/** The dial: brass, a hundred divisions, a knurled edge, and the brand's question mark at the centre. */
export function dialMaps(S: number, R: number) {
  const k = S / 2 / R, c = S / 2, rnd = rng(11);
  const [cc, g] = pad(S), [rc, h] = pad(S), [bc, b] = pad(S);
  const gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0, '#e2c27e'); gr.addColorStop(0.8, '#c99c4a'); gr.addColorStop(1, '#a87b33');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  h.fillStyle = 'rgb(0,60,255)'; h.fillRect(0, 0, S, S);
  b.fillStyle = '#808080'; b.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const r = rnd() * c, a0 = rnd() * 7, v = rnd() < 0.5 ? 255 : 0;
    g.strokeStyle = `rgba(${v},${v * 0.8},${v * 0.5},0.05)`; g.lineWidth = 1; g.beginPath(); g.arc(c, c, r, a0, a0 + 1 + rnd() * 4); g.stroke();
    h.strokeStyle = `rgba(0,${v ? 110 : 30},255,0.1)`; h.beginPath(); h.arc(c, c, r, a0, a0 + 1 + rnd() * 4); h.stroke();
  }
  const ink = (ctx: CanvasRenderingContext2D, col: string) => {
    ctx.fillStyle = col; ctx.strokeStyle = col;
    for (let n = 0; n < 100; n++) {
      const a = -Math.PI / 2 + n * ((Math.PI * 2) / 100), long = n % 10 === 0, mid = n % 5 === 0;
      const r0 = (long ? 0.33 : mid ? 0.355 : 0.37) * k, r1 = 0.405 * k;
      ctx.lineWidth = (long ? 0.012 : 0.007) * k;
      ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); ctx.stroke();
      if (long) {
        ctx.save(); ctx.translate(c + Math.cos(a) * 0.27 * k, c + Math.sin(a) * 0.27 * k); ctx.rotate(a + Math.PI / 2);
        ctx.font = `700 ${0.075 * k}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 0, 0); ctx.restore();
      }
    }
    ctx.font = `italic 600 ${0.26 * k}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', c, c + 0.01 * k);
  };
  ink(g, '#1a140b'); ink(h, 'rgb(0,200,40)'); ink(b, '#101010');
  // Knurling around the edge: the side of the dial samples this ring.
  for (let i = 0; i < 240; i++) {
    const a = (i / 240) * Math.PI * 2;
    for (const [ctx, col] of [[b, i % 2 ? '#ffffff' : '#000000'], [g, i % 2 ? 'rgba(255,230,180,0.25)' : 'rgba(40,25,5,0.35)']] as const) {
      ctx.strokeStyle = col; ctx.lineWidth = (Math.PI * 2 * c) / 480;
      ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * 0.43 * k, c + Math.sin(a) * 0.43 * k); ctx.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); ctx.stroke();
    }
  }
  return { map: tex(cc, true), orm: tex(rc), bump: tex(bc) };
}

/** Long horizontal brushing, for box fronts, plates and the frame. */
export function brushed(S: number, seed = 3, tone = '#9a9893') {
  const rnd = rng(seed), [cc, g] = pad(S), [rc, h] = pad(S);
  g.fillStyle = tone; g.fillRect(0, 0, S, S);
  h.fillStyle = 'rgb(0,90,255)'; h.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * S - 60, y = rnd() * S, w = 30 + rnd() * 260, v = rnd() < 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${0.02 + rnd() * 0.05})`; g.fillRect(x, y, w, 1);
    h.fillStyle = `rgba(0,${v ? 160 : 40},255,${0.05 + rnd() * 0.1})`; h.fillRect(x, y, w, 1);
  }
  for (let i = 0; i < 14; i++) {
    const x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 80, q = g.createRadialGradient(x, y, 0, x, y, r);
    q.addColorStop(0, 'rgba(30,24,16,0.12)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const map = tex(cc, true), orm = tex(rc);
  for (const t of [map, orm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return { map, orm };
}

/** The wall: dark troweled plaster, scuffed. */
export function wallMap(S: number) {
  const rnd = rng(5), [cc, g] = pad(S);
  g.fillStyle = '#26262a'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) {
    const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 30, v = rnd() < 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${0.015 + rnd() * 0.03})`; g.beginPath(); g.ellipse(x, y, r * 2, r * 0.6, rnd() * 3, 0, Math.PI * 2); g.fill();
  }
  const t = tex(cc, true); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** An engraved brass plate: lines of text, centred or left, with screws drawn in the corners. */
type Line = { t: string; px: number; font?: 'serif' | 'sans'; w?: number; it?: boolean; gap?: number };
export function plate(W: number, H: number, lines: Line[], seed = 1, steel = false) {
  const rnd = rng(seed), [cc, g] = pad(W, H), [bc, b] = pad(W, H), [rc, h] = pad(W, H);
  const gr = g.createLinearGradient(0, 0, W, H);
  if (steel) { gr.addColorStop(0, '#b8b6b0'); gr.addColorStop(1, '#8d8b86'); } else { gr.addColorStop(0, '#d9b469'); gr.addColorStop(0.55, '#c39443'); gr.addColorStop(1, '#a57932'); }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  b.fillStyle = '#808080'; b.fillRect(0, 0, W, H);
  h.fillStyle = 'rgb(0,80,255)'; h.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * W - 40, y = rnd() * H, w = 20 + rnd() * 200, v = rnd() < 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v * 0.9},${v * 0.7},0.04)`; g.fillRect(x, y, w, 1);
    h.fillStyle = `rgba(0,${v ? 150 : 40},255,0.08)`; h.fillRect(x, y, w, 1);
  }
  // Tarnish at the edges.
  const e = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, steel ? 'rgba(20,18,15,0.35)' : 'rgba(60,35,5,0.4)'); g.fillStyle = e; g.fillRect(0, 0, W, H);
  const total = lines.reduce((a, l) => a + l.px * 1.25 + (l.gap ?? 0), 0);
  let y = (H - total) / 2;
  for (const l of lines) {
    y += (l.gap ?? 0) + l.px * 0.62;
    const f = `${l.it ? 'italic ' : ''}${l.w ?? 600} ${l.px}px ${l.font === 'sans' ? SANS : SERIF}`;
    for (const [ctx, col, dx] of [[g, 'rgba(255,240,210,0.4)', 1.5], [g, steel ? '#1c1b19' : '#2a1a05', 0], [b, '#000', 0], [h, 'rgb(0,190,60)', 0]] as const) {
      ctx.font = f; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col;
      if ('letterSpacing' in ctx && l.font === 'sans') (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(l.px * 0.16)}px`;
      ctx.fillText(l.t, W / 2 + dx, y + dx);
      if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
    }
    y += l.px * 0.63;
  }
  const m = Math.min(W, H) * 0.07;
  for (const [x, yy] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]) {
    const q = g.createRadialGradient(x - 3, yy - 3, 1, x, yy, m * 0.35); q.addColorStop(0, '#f3e2b8'); q.addColorStop(1, '#5d4317');
    g.fillStyle = q; g.beginPath(); g.arc(x, yy, m * 0.35, 0, 7); g.fill();
    g.strokeStyle = '#3a2808'; g.lineWidth = m * 0.07; g.beginPath(); const a = rnd() * 3; g.moveTo(x - Math.cos(a) * m * 0.3, yy - Math.sin(a) * m * 0.3); g.lineTo(x + Math.cos(a) * m * 0.3, yy + Math.sin(a) * m * 0.3); g.stroke();
  }
  return { map: tex(cc, true), bump: tex(bc), orm: tex(rc) };
}

export const recordPlates = () => RECORD.results.map((r, i) => plate(1024, 600, [
  { t: `${RECORD.when}  ·  ${RECORD.where}`.toUpperCase(), px: 30, font: 'sans', w: 600 },
  { t: r.what, px: 92, gap: 30, w: 700 },
  { t: r.who, px: 64, it: true, gap: 12, w: 500 },
  { t: r.more, px: 36, font: 'sans', w: 500, gap: 24 },
], 20 + i));

export const keyTags = () => PEOPLE.coaches.map((c, i) => plate(512, 300, [
  { t: c.name, px: 62, w: 700 },
  { t: c.role.toUpperCase(), px: 30, font: 'sans', gap: 20, w: 600 },
], 40 + i));
