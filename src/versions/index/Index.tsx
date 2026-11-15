// The front door: seven versions, one row each. Clicking one plays the dither cover.
import { useRef } from 'react';
import '@fontsource-variable/bodoni-moda';
import '@fontsource/bodoni-moda/400-italic.css';
import '@fontsource-variable/instrument-sans';
import './index.css';
import { VERSIONS } from '@/content';
import { Split, useRise } from '@/lib/motion';
import { useVersion } from '@/lib/version';
import { Go } from '@/components/Transition';

export default function Index() {
  useVersion('index');
  const root = useRef<HTMLDivElement>(null);
  useRise(root);
  return (
    <div className="vi" ref={root}>
      <header>
        <p className="mark">skeptical</p>
        <Split as="h1" on="load" delay={0.5}>Draft 2, twelve ways.</Split>
        <p data-rise>One project, one route per version. None of them is deployed. The copy is the live site’s in all twelve.</p>
      </header>
      <main>
        <ol>
          {VERSIONS.map((v) => (
            <li key={v.slug} data-rise>
              <Go to={`/${v.slug}`}>
                <span className="thumb" style={{ background: v.color }}><img src={`/thumbs/${v.slug}.jpg`} alt="" width={640} height={400} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></span>
                <span className="txt">
                  <span className="num">{v.n}</span>
                  <h2><span>{v.name}</span></h2>
                  <p>{v.text}</p>
                  <p className="kind">{v.kind}.</p>
                </span>
              </Go>
            </li>
          ))}
        </ol>
      </main>
      <footer><p>Versions 1 and 2 follow the live site’s rules. Versions 3 to 12 start from nothing: new fonts, colours and layouts. Facts and privacy rules are the same everywhere. Use [ and ] to step between versions.</p></footer>
    </div>
  );
}
