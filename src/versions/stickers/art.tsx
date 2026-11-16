// Every sticker on the page, drawn as SVG. Sizes are in "u" (one hundredth of the lid's width);
// each viewBox is ten units per u. The white die-cut edge is the shape drawn first, stroked wide.
import { useId, type ReactNode } from 'react';
import marks from '@/lib/marks.json';
import { DRIVE, HERO, JOIN, MANIFESTO, PEOPLE, RECORD, FOOTER } from '@/content';

export type Sec = 'hero' | 'lines' | 'record' | 'drive' | 'people' | 'ways';
export type Def = { id: string; sec: Sec; w: number; h: number; label: string; art: () => ReactNode; start?: [number, number, number]; tilt: number; lift?: boolean };

// One accent. Everything else is ink and bone, like a print shop run with two drums.
const RED = '#ff4a2e', INK = '#141414', BONE = '#efe9dc';
export const C = { red: RED, yellow: BONE, blue: INK, pink: RED, green: BONE, black: INK, cream: BONE, paper: '#e6dfcf' };
// Two faces only: Anton for the shout, Bodoni for the voice (italic for anything handwritten).
const SERIF = "'Bodoni Moda Variable', 'Bodoni Moda', serif";
const F = { anton: 'Anton, sans-serif', bebas: 'Anton, sans-serif', abril: SERIF, syne: "'Bodoni Moda Variable', serif", marker: "'Bodoni Moda Variable', Didot, serif" };
const M = 10; // die-cut inset in viewBox units

/* ---------- shapes ---------- */
const rr = (W: number, H: number, r: number, m = M) => {
  const x0 = m, y0 = m, x1 = W - m, y1 = H - m;
  return `M${x0 + r},${y0}H${x1 - r}Q${x1},${y0} ${x1},${y0 + r}V${y1 - r}Q${x1},${y1} ${x1 - r},${y1}H${x0 + r}Q${x0},${y1} ${x0},${y1 - r}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}Z`;
};
const circ = (cx: number, cy: number, r: number) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
const star = (cx: number, cy: number, ro: number, ri: number, n: number, rot = 0) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (Math.PI * i) / n, r = i % 2 ? ri : ro;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1);
  }
  return d + 'Z';
};
const scallop = (cx: number, cy: number, r: number, n: number, bump: number) => {
  let d = '';
  for (let i = 0; i <= n * 6; i++) {
    const a = (Math.PI * 2 * i) / (n * 6);
    const rr2 = r + bump * Math.pow(Math.abs(Math.cos((a * n) / 2)), 0.6);
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr2).toFixed(1) + ',' + (cy + Math.sin(a) * rr2).toFixed(1);
  }
  return d + 'Z';
};
const bubble = (W: number, H: number, side: 'l' | 'r') => {
  const x0 = M, y0 = M, x1 = W - M, y1 = H - M - 40, r = 40;
  const tail = side === 'r' ? `H${x1 - 70}L${x1 - 40},${H - M}L${x1 - 130},${y1}` : `H${x0 + 130}L${x0 + 40},${H - M}L${x0 + 70},${y1}`;
  return `M${x0 + r},${y0}H${x1 - r}Q${x1},${y0} ${x1},${y0 + r}V${y1 - r}Q${x1},${y1} ${x1 - r},${y1}${tail}H${x0 + r}Q${x0},${y1} ${x0},${y1 - r}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}Z`;
};
const ticket = (W: number, H: number, n = 26) => {
  const x0 = M, y0 = M, x1 = W - M, y1 = H - M, cy = H / 2;
  return `M${x0},${y0}H${x1}V${cy - n}A${n},${n} 0 0,0 ${x1},${cy + n}V${y1}H${x0}V${cy + n}A${n},${n} 0 0,0 ${x0},${cy - n}Z`;
};
const arrow = (W: number, H: number) => { const x0 = M, y0 = M, x1 = W - M, y1 = H - M, p = (y1 - y0) / 2; return `M${x0 + 14},${y0}H${x1 - p}L${x1},${H / 2}L${x1 - p},${y1}H${x0 + 14}Q${x0},${y1} ${x0},${y1 - 14}V${y0 + 14}Q${x0},${y0} ${x0 + 14},${y0}Z`; };
const folder = (W: number, H: number) => { const x0 = M, y0 = M + 34, x1 = W - M, y1 = H - M; return `M${x0 + 16},${y0 - 34}H${x0 + 96}L${x0 + 122},${y0}H${x1 - 16}Q${x1},${y0} ${x1},${y0 + 16}V${y1 - 16}Q${x1},${y1} ${x1 - 16},${y1}H${x0 + 16}Q${x0},${y1} ${x0},${y1 - 16}V${y0 - 18}Q${x0},${y0 - 34} ${x0 + 16},${y0 - 34}Z`; };
const tape = (W: number, H: number) => {
  const x0 = M, y0 = M, x1 = W - M, y1 = H - M, n = 7, s = (y1 - y0) / n;
  let r = `M${x0},${y0}H${x1}`;
  for (let i = 0; i < n; i++) r += `L${x1 - (i % 2 ? 0 : 12)},${y0 + s * (i + 0.5)}L${x1},${y0 + s * (i + 1)}`;
  r += `H${x0}`;
  for (let i = n - 1; i >= 0; i--) r += `L${x0 + (i % 2 ? 0 : 12)},${y0 + s * (i + 0.5)}L${x0},${y0 + s * i}`;
  return r + 'Z';
};
const hex = (W: number, H: number) => { const cx = W / 2, cy = H / 2, r = Math.min(W / 2, H / 2) - M; let d = ''; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r * 1.0).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1); } return d + 'Z'; };
const shield = (W: number, H: number) => { const x0 = M, x1 = W - M, y0 = M, y1 = H - M; return `M${x0},${y0 + 20}Q${W / 2},${y0 - 6} ${x1},${y0 + 20}V${H * 0.52}Q${x1},${y1 - 50} ${W / 2},${y1}Q${x0},${y1 - 50} ${x0},${H * 0.52}Z`; };
const pennant = (W: number, H: number) => `M${M},${M + 8}Q${M},${M} ${M + 10},${M}L${W - M},${H / 2}L${M + 10},${H - M}Q${M},${H - M} ${M},${H - M - 8}Z`;
const rosette = (W: number) => { const cx = W / 2, cy = W / 2; return scallop(cx, cy, W / 2 - M - 18, 14, 16); };

/* ---------- pieces ---------- */
type SvgP = { W: number; H: number; d: string; children: ReactNode; extra?: string; edge?: number; under?: ReactNode };
function Svg({ W, H, d, children, extra, edge = 2 * M, under }: SvgP) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="art" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`c${uid}`}><path d={d} />{extra && <path d={extra} />}</clipPath>
        <linearGradient id={`g${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {under}
      <path d={d} fill="#fff" stroke="#fff" strokeWidth={edge} strokeLinejoin="round" />
      {extra && <path d={extra} fill="#fff" stroke="#fff" strokeWidth={edge} strokeLinejoin="round" />}
      <g clipPath={`url(#c${uid})`}>
        {children}
        <rect className="gloss" x={-W * 0.6} y={-H} width={W * 0.32} height={H * 3} fill={`url(#g${uid})`} style={{ transform: `translateX(calc(var(--mx, 0.5) * ${Math.round(W * 1.6)}px)) skewX(-24deg)` }} />
        <rect className="sheen" x="0" y="0" width={W} height={H * 0.42} fill="#fff" opacity="0.07" />
      </g>
    </svg>
  );
}
type TP = { x: number; y: number; s: number; f: string; c: string; w?: number; a?: 'middle' | 'start' | 'end'; ls?: number; wt?: number; children: ReactNode; rot?: number };
const T = ({ x, y, s, f, c, w, a = 'middle', ls, wt, children, rot }: TP) => (
  <text x={x} y={y} fontSize={s} fontFamily={f} fill={c} textAnchor={a} letterSpacing={ls} fontWeight={wt ?? (f === F.anton ? undefined : 800)} fontStyle={f === F.marker ? 'italic' : undefined}
    {...(w ? { textLength: w, lengthAdjust: 'spacingAndGlyphs' } : {})} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}>{children}</text>
);
const Q = ({ x, y, h, c, roman }: { x: number; y: number; h: number; c: string; roman?: boolean }) => {
  const m = roman ? marks.roman : marks.italic, k = h / m.h;
  return <path d={m.d} fill={c} transform={`translate(${x} ${y}) scale(${k})`} />;
};
const Lock = ({ x, y, s, c }: { x: number; y: number; s: number; c: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-7,-2V-7a7,7 0 0,1 14,0V-2" fill="none" stroke={c} strokeWidth="3.2" />
    <rect x="-10" y="-2" width="20" height="16" rx="2.5" fill={c} />
  </g>
);
const stripes = (W: number, H: number, c1: string, c2: string, step = 36) => {
  const out: ReactNode[] = [<rect key="b" width={W} height={H} fill={c1} />];
  for (let x = -H; x < W + H; x += step * 2) out.push(<path key={x} d={`M${x},${H}L${x + H},0H${x + H + step}L${x + step},${H}Z`} fill={c2} />);
  return out;
};
const dots = (W: number, H: number, c: string, gap = 22, r = 2.2) => {
  const out: ReactNode[] = [];
  for (let y = gap / 2; y < H; y += gap) for (let x = (y / gap) % 2 ? gap : gap / 2; x < W; x += gap) out.push(<circle key={x + '_' + y} cx={x} cy={y} r={r} fill={c} />);
  return <g opacity="0.22">{out}</g>;
};

/* ---------- the stickers ---------- */
const up = (s: string) => s.toUpperCase();
const DR = DRIVE.items;
const folderColors = [C.black, C.red, C.cream, C.black, C.red, C.cream, C.black];

function Holo() {
  return (
    <div className="holo" aria-hidden="true">
      <div className="holo-foil" />
      <svg viewBox="-470 -800 940 1600" className="holo-q" aria-hidden="true" focusable="false"><path d={marks.italic.d} fill={C.black} /></svg>
    </div>
  );
}

export const DEFS: Def[] = [
  /* hero: these start on the lid */
  {
    id: 'name', sec: 'hero', w: 58, h: 19, tilt: -3, label: 'Skeptical', start: [0.38, 0.19, -5],
    art: () => (
      <svg viewBox="0 0 580 190" className="art" aria-hidden="true" focusable="false">
        <text x="290" y="146" fontSize="150" fontFamily={F.abril} fontWeight={900} fontStyle="italic" textAnchor="middle" textLength={520} lengthAdjust="spacingAndGlyphs" fill="#fff" stroke="#fff" strokeWidth="44" strokeLinejoin="round">Skeptical</text>
        <text x="290" y="146" fontSize="150" fontFamily={F.abril} fontWeight={900} fontStyle="italic" textAnchor="middle" textLength={520} lengthAdjust="spacingAndGlyphs" fill={C.black} paintOrder="stroke">Skeptical</text>
      </svg>
    ),
  },
  { id: 'q', sec: 'hero', w: 27, h: 27, tilt: 6, label: 'The question mark, holographic', start: [0.85, 0.25, 9], art: () => <Holo /> },
  {
    id: 'p1', sec: 'hero', w: 44, h: 22, tilt: 2, label: HERO.pitch[0], start: [0.27, 0.66, 3], lift: true,
    art: () => (
      <Svg W={440} H={220} d={rr(440, 220, 22)}>
        <rect width="440" height="220" fill={C.black} />
        {dots(440, 220, C.cream, 18, 1.6)}
        <T x={220} y={88} s={62} f={F.anton} c={C.cream} w={360}>AN INDEPENDENT</T>
        <T x={220} y={188} s={104} f={F.anton} c={C.yellow} w={360}>LD TEAM.</T>
      </Svg>
    ),
  },
  {
    id: 'p2', sec: 'hero', w: 40, h: 25, tilt: -4, label: HERO.pitch[1], start: [0.73, 0.7, -5],
    art: () => (
      <Svg W={400} H={250} d={bubble(400, 250, 'r')}>
        <rect width="400" height="250" fill={C.blue} />
        <T x={196} y={98} s={64} f={F.marker} wt={800} c={C.cream} w={300}>Coaches who</T>
        <T x={196} y={172} s={72} f={F.anton} c={C.red} w={320}>STILL COMPETE.</T>
      </Svg>
    ),
  },
  {
    id: 'free', sec: 'hero', w: 27, h: 27, tilt: 8, label: HERO.statement[0],
    art: () => (
      <Svg W={270} H={270} d={star(135, 135, 125, 100, 16, 0.1)}>
        <rect width="270" height="270" fill={C.red} />
        <g transform="rotate(-10 135 135)">
          <T x={135} y={142} s={96} f={F.anton} c={C.black} w={170}>FREE</T>
          <T x={135} y={190} s={40} f={F.anton} c={C.black} w={150}>TO JOIN.</T>
        </g>
      </Svg>
    ),
  },
  {
    id: 'private', sec: 'hero', w: 40, h: 17, tilt: -5, label: HERO.statement[1],
    art: () => (
      <Svg W={400} H={170} d={rr(400, 170, 10)}>
        <rect width="400" height="170" fill={C.cream} />
        <rect x="24" y="24" width="352" height="122" fill="none" stroke={C.red} strokeWidth="8" />
        <rect x="36" y="36" width="328" height="98" fill="none" stroke={C.red} strokeWidth="3" />
        <T x={200} y={82} s={44} f={F.bebas} c={C.red} w={250} ls={4}>THE PREP STAYS</T>
        <T x={200} y={124} s={42} f={F.anton} c={C.red} w={290}>PRIVATE.</T>
      </Svg>
    ),
  },
  {
    id: 'everyone', sec: 'hero', w: 26, h: 26, tilt: 4, label: HERO.statement[2],
    art: () => {
      const R = 84;
      return (
        <Svg W={260} H={260} d={circ(130, 130, 120)}>
          <rect width="260" height="260" fill={C.green} />
          <circle cx="130" cy="130" r="58" fill={C.black} />
          <path id="ring-ev" d={`M130,${130 - R}a${R},${R} 0 1,1 -0.1,0`} fill="none" />
          <text fontSize="30" fontFamily={F.bebas} fill={C.black} letterSpacing="3"><textPath href="#ring-ev" textLength={2 * Math.PI * R - 6}>EVERYONE CONTRIBUTES. EVERYONE CONTRIBUTES.</textPath></text>
          <Q x={130} y={132} h={88} c={C.green} />
        </Svg>
      );
    },
  },
  {
    id: 'door1', sec: 'hero', w: 38, h: 12, tilt: -2, label: HERO.doors[0].label,
    art: () => (
      <Svg W={380} H={120} d={arrow(380, 120)}>
        <rect width="380" height="120" fill={C.pink} />
        <T x={170} y={80} s={52} f={F.bebas} c={C.black} w={270} ls={2}>{up(HERO.doors[0].label)}</T>
      </Svg>
    ),
  },
  {
    id: 'door2', sec: 'hero', w: 32, h: 12, tilt: 3, label: HERO.doors[1].label,
    art: () => (
      <Svg W={320} H={120} d={arrow(320, 120)}>
        <rect width="320" height="120" fill={C.yellow} />
        <T x={142} y={80} s={52} f={F.bebas} c={C.black} w={214} ls={2}>{up(HERO.doors[1].label)}</T>
      </Svg>
    ),
  },
  /* the four lines */
  {
    id: 'm1', sec: 'lines', w: 40, h: 22, tilt: -3, label: MANIFESTO[0],
    art: () => (
      <Svg W={400} H={220} d={ticket(400, 220)}>
        <rect width="400" height="220" fill={C.yellow} />
        <line x1="54" x2="346" y1="58" y2="58" stroke={C.black} strokeWidth="3" strokeDasharray="10 8" />
        <T x={200} y={48} s={24} f={F.syne} wt={700} c={C.black} w={270}>WE’RE AN INDEPENDENT ENTRY.</T>
        <T x={200} y={128} s={70} f={F.anton} c={C.black} w={280}>NO SCHOOL,</T>
        <T x={200} y={192} s={70} f={F.anton} c={C.red} w={220}>NO FEE.</T>
      </Svg>
    ),
  },
  {
    id: 'm2', sec: 'lines', w: 29, h: 29, tilt: 5, label: MANIFESTO[1],
    art: () => (
      <Svg W={290} H={290} d={scallop(145, 145, 112, 12, 16)}>
        <rect width="290" height="290" fill={C.pink} />
        <circle cx="145" cy="145" r="96" fill="none" stroke={C.black} strokeWidth="3" strokeDasharray="4 7" />
        <T x={145} y={176} s={170} f={F.abril} c={C.black}>8</T>
        <T x={145} y={210} s={26} f={F.bebas} c={C.black} w={150} ls={2}>EIGHT OF US RIGHT NOW.</T>
        <T x={145} y={84} s={20} f={F.syne} wt={700} c={C.black} w={150}>TWO COACHES, BOTH</T>
        <T x={145} y={104} s={20} f={F.syne} wt={700} c={C.black} w={130}>STILL COMPETING.</T>
      </Svg>
    ),
  },
  {
    id: 'm3', sec: 'lines', w: 50, h: 15, tilt: -7, label: MANIFESTO[2],
    art: () => (
      <Svg W={500} H={150} d={tape(500, 150)}>
        <rect width="500" height="150" fill={C.paper} />
        {dots(500, 150, '#a08f5c', 9, 1.1)}
        <T x={250} y={66} s={40} f={F.marker} c={C.black} w={360}>We write the prep,</T>
        <T x={250} y={116} s={34} f={F.marker} c={C.black} w={430}>we frontline it, and it stays in the drive.</T>
      </Svg>
    ),
  },
  {
    id: 'm4', sec: 'lines', w: 40, h: 26, tilt: 4, label: MANIFESTO[3],
    art: () => (
      <Svg W={400} H={260} d={bubble(400, 260, 'l')}>
        <rect width="400" height="260" fill={C.red} />
        <T x={200} y={64} s={28} f={F.syne} wt={800} c={C.cream} w={300}>YES, THE NAME IS A POSITION.</T>
        <T x={200} y={130} s={60} f={F.anton} c={C.cream} w={300}>NO, YOU DON’T</T>
        <T x={200} y={192} s={60} f={F.anton} c={C.black} w={300}>HAVE TO RUN IT.</T>
      </Svg>
    ),
  },
  /* the record */
  {
    id: 'rule', sec: 'record', w: 38, h: 22, tilt: -4, label: RECORD.rule,
    art: () => (
      <Svg W={380} H={220} d={rr(380, 220, 8)}>
        <rect width="380" height="220" fill={C.cream} />
        <rect x="26" y="26" width="328" height="168" rx="6" fill="none" stroke={C.blue} strokeWidth="7" />
        <g transform="rotate(-4 190 110)">
          <T x={190} y={88} s={46} f={F.bebas} c={C.blue} w={250} ls={3}>BREAKS AND</T>
          <T x={190} y={140} s={52} f={F.anton} c={C.blue} w={280}>SPEAKER AWARDS</T>
          <T x={190} y={180} s={34} f={F.bebas} c={C.blue} w={90} ls={4}>ONLY.</T>
        </g>
      </Svg>
    ),
  },
  {
    id: 'shong', sec: 'record', w: 28, h: 38, tilt: -6, label: `${RECORD.results[0].who}, ${RECORD.results[0].what}`,
    art: () => (
      <Svg W={280} H={380} d={rosette(280)} extra={`M84,220L56,370L104,340L130,372L144,230ZM196,220L224,370L176,340L150,372L136,230Z`}>
        <rect width="280" height="380" fill={C.red} />
        <path d="M84,220L56,370L104,340L130,372L144,230Z" fill={C.yellow} /><path d="M196,220L224,370L176,340L150,372L136,230Z" fill={C.yellow} />
        <path d={rosette(280)} fill={C.red} />
        <circle cx="140" cy="140" r="86" fill={C.cream} />
        <circle cx="140" cy="140" r="78" fill="none" stroke={C.red} strokeWidth="3" />
        <T x={140} y={126} s={48} f={F.anton} c={C.red} w={120}>NOVICE</T>
        <T x={140} y={168} s={40} f={F.anton} c={C.black} w={140}>CHAMPION</T>
        <T x={140} y={198} s={22} f={F.bebas} c={C.black} ls={3}>{up(RECORD.results[0].who)}</T>
      </Svg>
    ),
  },
  {
    id: 'nina', sec: 'record', w: 28, h: 38, tilt: 5, label: `${RECORD.results[1].who}, ${RECORD.results[1].what}`,
    art: () => (
      <Svg W={280} H={380} d={rosette(280)} extra={`M84,220L56,370L104,340L130,372L144,230ZM196,220L224,370L176,340L150,372L136,230Z`}>
        <rect width="280" height="380" fill={C.blue} />
        <path d="M84,220L56,370L104,340L130,372L144,230Z" fill={C.pink} /><path d="M196,220L224,370L176,340L150,372L136,230Z" fill={C.pink} />
        <path d={rosette(280)} fill={C.blue} />
        <circle cx="140" cy="140" r="86" fill={C.cream} />
        <circle cx="140" cy="140" r="78" fill="none" stroke={C.blue} strokeWidth="3" />
        <T x={140} y={112} s={26} f={F.bebas} c={C.blue} w={120} ls={2}>MIDDLE SCHOOL</T>
        <T x={140} y={160} s={44} f={F.anton} c={C.black} w={140}>SEMIFINALIST</T>
        <T x={140} y={196} s={22} f={F.bebas} c={C.blue} ls={3}>{up(RECORD.results[1].who)}</T>
      </Svg>
    ),
  },
  {
    id: 'event', sec: 'record', w: 48, h: 19, tilt: 3, label: `${RECORD.when}, ${RECORD.name}, ${RECORD.where}`,
    art: () => (
      <Svg W={480} H={190} d={ticket(480, 190, 22)}>
        <rect width="480" height="190" fill={C.black} />
        <line x1="372" x2="372" y1="20" y2="170" stroke={C.cream} strokeWidth="3" strokeDasharray="6 8" opacity="0.6" />
        <T x={42} y={56} s={30} f={F.bebas} c={C.yellow} a="start" ls={3}>{up(RECORD.when)}</T>
        <T x={42} y={104} s={42} f={F.anton} c={C.cream} a="start" w={310}>NATIONAL SPEECH & DEBATE</T>
        <T x={42} y={146} s={42} f={F.anton} c={C.cream} a="start" w={250}>SEASON OPENER</T>
        <T x={42} y={174} s={22} f={F.bebas} c={C.pink} a="start" ls={2}>{up(RECORD.where)}</T>
        <Q x={424} y={96} h={92} c={C.yellow} />
      </Svg>
    ),
  },
  /* the drive: seven closed folders and one tape */
  ...DR.map((it, i): Def => ({
    id: 'f' + i, sec: 'drive', w: 24, h: 18, tilt: [-5, 4, -2, 6, -4, 3, -6][i], label: `${it.term}: ${it.text}`,
    art: () => {
      const bg = folderColors[i], ink = bg === C.black || bg === C.blue || bg === C.red ? C.cream : C.black;
      const len = it.term.length;
      return (
        <Svg W={240} H={180} d={folder(240, 180)}>
          <rect width="240" height="180" fill={bg} />
          <rect x="10" y="44" width="240" height="6" fill={C.black} opacity="0.18" />
          <T x={120} y={len > 7 ? 128 : 136} s={len > 7 ? 56 : 82} f={F.bebas} c={ink} w={len > 7 ? 190 : Math.min(190, 40 * len + 20)} ls={1}>{up(it.term)}</T>
          <Lock x={204} y={30} s={0.9} c={ink === C.cream ? C.cream : C.black} />
          <T x={20} y={162} s={16} f={F.syne} wt={700} c={ink} a="start" ls={1}>{'0' + (i + 1)}</T>
        </Svg>
      );
    },
  })),
  {
    id: 'caution', sec: 'drive', w: 54, h: 10, tilt: -3, label: 'None of it is public.',
    art: () => (
      <Svg W={540} H={100} d={rr(540, 100, 4)}>
        {stripes(540, 100, C.yellow, C.black, 30)}
        <rect x="100" y="18" width="340" height="64" fill={C.black} />
        <T x={270} y={66} s={46} f={F.bebas} c={C.yellow} w={300} ls={3}>NONE OF IT IS PUBLIC.</T>
      </Svg>
    ),
  },
  /* the people */
  ...PEOPLE.coaches.map((c, i): Def => ({
    id: 'coach' + i, sec: 'people', w: 38, h: 25, tilt: i ? 4 : -4, label: `${c.name}, ${c.role}`,
    art: () => (
      <Svg W={380} H={250} d={rr(380, 250, 22)}>
        <rect width="380" height="250" fill={i ? C.blue : C.red} />
        <rect x="26" y="86" width="328" height="132" rx="8" fill={C.cream} />
        <T x={190} y={66} s={46} f={F.anton} c={C.cream} w={i ? 300 : 220} ls={2}>{up(c.role)}</T>
        <T x={190} y={i ? 172 : 176} s={i ? 50 : 62} f={F.marker} c={C.black} w={i ? 300 : 270} rot={-3}>{c.name}</T>
      </Svg>
    ),
  })),
  {
    id: 'count', sec: 'people', w: 26, h: 28, tilt: 7, label: PEOPLE.count,
    art: () => (
      <Svg W={260} H={280} d={hex(260, 280)}>
        <rect width="260" height="280" fill={C.yellow} />
        {dots(260, 280, C.black, 20, 2)}
        <T x={130} y={122} s={70} f={F.anton} c={C.black} w={150}>EIGHT</T>
        <T x={130} y={168} s={44} f={F.anton} c={C.red} w={160}>DEBATERS</T>
        <T x={130} y={202} s={30} f={F.bebas} c={C.black} w={120} ls={2}>RIGHT NOW.</T>
      </Svg>
    ),
  },
  /* the three ways in, and the bumper */
  {
    id: 'compete', sec: 'ways', w: 42, h: 20, tilt: -4, label: `${JOIN.paths[0].name}: ${JOIN.paths[0].line}`,
    art: () => (
      <Svg W={420} H={200} d={pennant(420, 200)}>
        <rect width="420" height="200" fill={C.red} />
        <T x={40} y={110} s={92} f={F.anton} c={C.cream} a="start" w={250}>COMPETE</T>
        <T x={44} y={146} s={26} f={F.syne} wt={800} c={C.black} a="start" w={220}>{up(JOIN.paths[0].line)}</T>
      </Svg>
    ),
  },
  {
    id: 'lecture', sec: 'ways', w: 28, h: 28, tilt: 6, label: `${JOIN.paths[1].name}: ${JOIN.paths[1].line}`,
    art: () => (
      <Svg W={280} H={280} d={star(140, 140, 130, 112, 22)}>
        <rect width="280" height="280" fill={C.blue} />
        <circle cx="140" cy="140" r="96" fill="none" stroke={C.cream} strokeWidth="3" />
        <T x={140} y={150} s={66} f={F.anton} c={C.cream} w={170}>LECTURE</T>
        <T x={140} y={194} s={34} f={F.marker} c={C.red} w={130}>{JOIN.paths[1].line}</T>
      </Svg>
    ),
  },
  {
    id: 'coachway', sec: 'ways', w: 24, h: 29, tilt: -3, label: `${JOIN.paths[2].name}: ${JOIN.paths[2].line}`,
    art: () => (
      <Svg W={240} H={290} d={shield(240, 290)}>
        <rect width="240" height="290" fill={C.black} />
        <path d={shield(240, 290)} fill="none" stroke={C.yellow} strokeWidth="10" transform="translate(120 145) scale(0.86) translate(-120 -145)" />
        <T x={120} y={126} s={72} f={F.anton} c={C.yellow} w={150}>COACH</T>
        <T x={120} y={168} s={30} f={F.bebas} c={C.cream} w={120} ls={2}>{up(JOIN.paths[2].line)}</T>
        <Q x={120} y={214} h={52} c={C.cream} />
      </Svg>
    ),
  },
  {
    id: 'bumper', sec: 'ways', w: 74, h: 12, tilt: 2, label: FOOTER.line,
    art: () => <Bumper />,
  },
];

export function Bumper() {
  return (
    <Svg W={740} H={120} d={rr(740, 120, 14)}>
      <rect width="740" height="120" fill={C.cream} />
      <rect x="10" y="10" width="110" height="100" fill={C.black} />
      <Q x={65} y={60} h={80} c={C.red} />
      <T x={290} y={80} s={56} f={F.anton} c={C.red} w={320}>THE PREP IS PRIVATE.</T>
      <T x={590} y={80} s={56} f={F.anton} c={C.black} w={250}>THIS PAGE ISN’T.</T>
    </Svg>
  );
}
