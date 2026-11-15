import { WORLDS, NINTH, RING } from './stage';

/** The system as a flat drawing, for a browser without WebGL. */
export function SkyDiagram() {
  const S = 9;
  return (
    <svg className="diagram" viewBox="-380 -380 760 760" role="img" aria-label="Two stars, eight worlds, a dark ring of seven, and one empty orbit">
      {WORLDS.map((w, i) => <circle key={i} r={w.a * S} className="orb" />)}
      <circle r={NINTH * S} className="ninth" />
      <circle r={RING * S * 0.98} className="ringd" />
      <circle cx={-11} r={10} className="sa" /><circle cx={16} r={7} className="sb" />
      {WORLDS.map((w, i) => { const t = i * 2.39; return <circle key={'p' + i} cx={Math.cos(t) * w.a * S} cy={Math.sin(t) * w.a * S} r={3 + w.r * 7} className="pl" style={{ fill: w.c1 }} />; })}
    </svg>
  );
}
