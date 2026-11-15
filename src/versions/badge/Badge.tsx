// Version 9: a tournament badge on a lanyard (React Bits Lanyard) that you
// can grab and swing. The faces of the badge are drawn here, in the browser.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/bodoni-moda/400-italic.css';
import './badge.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { Split, useRise } from '@/lib/motion';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import MARKS from '@/lib/marks.json';
import Lanyard from '@/components/bits/Lanyard';

const W = 640, H = 900;
/** The two faces of the badge, as images. Nothing on them that is not on the site. */
async function drawBadge() {
  await Promise.all([document.fonts.load('italic 400 96px "Bodoni Moda"'), document.fonts.load('600 30px "Schibsted Grotesk Variable"'), document.fonts.load('400 22px "IBM Plex Mono"')]);
  const make = (paint: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement('canvas'); c.width = W; c.height = H; paint(c.getContext('2d')!); return c.toDataURL('image/png'); };
  const front = make((g) => {
    g.fillStyle = '#050505'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f0f0ec'; g.textBaseline = 'alphabetic';
    g.font = 'italic 400 104px "Bodoni Moda"'; g.fillText('skeptical', 52, 176);
    g.fillRect(52, 214, W - 104, 2);
    g.font = '400 22px "IBM Plex Mono"'; g.fillText('INDEPENDENT LINCOLN-DOUGLAS', 52, 258);
    const m = MARKS.italic, k = 380 / m.h;
    g.save(); g.translate(W / 2 + 10, 520); g.scale(k, k); g.fill(new Path2D(m.d)); g.restore();
    g.fillRect(52, 770, W - 104, 2);
    g.font = '400 22px "IBM Plex Mono"'; g.fillText('DEBATER', 52, 812); g.fillText('2026-27', W - 52 - g.measureText('2026-27').width, 812);
    g.fillStyle = '#8f8f8a'; g.fillText('NAME', 52, 852); g.fillRect(132, 852, W - 184, 1.5);
  });
  const back = make((g) => {
    g.fillStyle = '#f0f0ec'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#050505'; g.font = '600 58px "Schibsted Grotesk Variable"';
    HERO.statement.forEach((line, i) => {
      const words = line.split(' '); let row = '', y = 150 + i * 220;
      for (const w of words) { if (g.measureText(`${row} ${w}`).width > W - 104 && row) { g.fillText(row, 52, y); y += 64; row = w; } else row = row ? `${row} ${w}` : w; }
      g.fillText(row, 52, y);
    });
    g.fillRect(52, 770, W - 104, 2);
    g.font = '400 22px "IBM Plex Mono"'; g.fillText(SITE.email.toUpperCase(), 52, 812);
  });
  return { front, back };
}

const A = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;

export default function Badge() {
  useVersion('badge');
  const root = useRef<HTMLDivElement>(null);
  useRise(root);
  const [faces, setFaces] = useState<{ front: string; back: string } | null>(null);
  const [phone, setPhone] = useState(() => window.innerWidth <= 860);
  useEffect(() => {
    let on = true;
    drawBadge().then((f) => { if (on) setFaces(f); });
    const r = () => setPhone(window.innerWidth <= 860);
    window.addEventListener('resize', r);
    return () => { on = false; window.removeEventListener('resize', r); };
  }, []);

  return (
    <div className="vg" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the top">skeptical</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>
      <div className="hang" aria-hidden="true">
        {faces && <Lanyard frontImage={faces.front} backImage={faces.back} imageFit="cover" finish="glossy" orientation="portrait" cornerRadius={0.06} size={phone ? 0.5 : 0.56} anchor="center" strapLength={phone ? 0.55 : 0.8} strapColor="#e8422e" strapWidth={0.11} metal="silver" breeze={still ? 0 : 0.35} interactive={!still} intro={!still} />}
        {!coarse && <p className="hint">Grab it.</p>}
      </div>

      <main id="main">
        <section className="hero" id="top" aria-label={SITE.heading}>
          <Split as="h1" on="load" delay={0.5}>{HERO.pitch.join(' ')}</Split>
          <p className="lede" data-rise>{HERO.statement.join(' ')}</p>
          <p className="doors" data-rise>{HERO.doors.map((d, i) => <A key={d.href} href={d.href} className={i ? 'btn alt' : 'btn'}>{d.label}</A>)}</p>
        </section>

        <section aria-label="How the team works">
          <ol className="says">{MANIFESTO.map((m) => <li data-rise key={m}>{m}</li>)}</ol>
        </section>

        <section id="record">
          <p className="tab">{RECORD.when} / {RECORD.name} / {RECORD.where}</p>
          <Split as="h2">{RECORD.title}</Split>
          <p className="lede" data-rise>{RECORD.rule}</p>
          <div className="stubs">
            {RECORD.results.map((r) => <article className="stub" data-rise key={r.who}><p className="tab">{r.who}</p><h3>{r.what}</h3><p>{r.more}</p></article>)}
          </div>
          <p data-rise><A href={RECORD.more.href}>{RECORD.more.label}</A></p>
        </section>

        <section id="drive">
          <p className="tab">Access: a link from a coach</p>
          <Split as="h2">{DRIVE.title}</Split>
          <p className="lede" data-rise>{DRIVE.lead}</p>
          <dl className="kit">{DRIVE.items.map((d) => <div data-rise key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}</dl>
          <p data-rise><A href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
        </section>

        <section id="people">
          <p className="tab">{PEOPLE.count}</p>
          <Split as="h2">{PEOPLE.title}</Split>
          <div className="stubs">
            {PEOPLE.coaches.map((c) => <article className="stub" data-rise key={c.name}><p className="tab">{c.role}</p><h3>{c.name}</h3><p>{c.bio}</p></article>)}
          </div>
          <p data-rise><A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
        </section>

        <section id="join">
          <p className="tab">{JOIN.lead}</p>
          <Split as="h2">{JOIN.title}</Split>
          <ul className="ways">
            {JOIN.paths.map((p) => <li data-rise key={p.id}><a href={p.href} rel="noopener"><b>{p.name}</b><span>{p.line} {p.text[0]}</span><i aria-hidden="true">&rarr;</i></a></li>)}
          </ul>
          <p data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>. {JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
        </section>

        <footer>
          <p className="line">{FOOTER.line}</p>
          <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <small>Draft 2, version 9. Not the live site.</small>
        </footer>
      </main>
    </div>
  );
}
