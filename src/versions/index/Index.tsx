// The front door: seven versions, one row each. Clicking one plays the dither cover.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda';
import '@fontsource/bodoni-moda/400-italic.css';
import '@fontsource-variable/instrument-sans';
import './index.css';
import { ALL as VERSIONS } from '@/registry';
import { Split, useRise } from '@/lib/motion';
import { useVersion } from '@/lib/version';
import { Go } from '@/components/Transition';

type Status = { updated: string; done: number; total: number; building: string[]; latest?: string; note?: string };

// Only the phone preview ships a status.json beside the page; on localhost the fetch fails and nothing shows.
function useStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}status.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Status | null) => { if (j && typeof j.done === 'number') setStatus(j); })
      .catch(() => {});
  }, []);
  return status;
}

export default function Index() {
  useVersion('index');
  const root = useRef<HTMLDivElement>(null);
  useRise(root);
  const status = useStatus();
  return (
    <div className="vi" ref={root}>
      <header>
        <p className="mark">skeptical</p>
        <Split as="h1" on="load" delay={0.5}>{`Draft 2, ${VERSIONS.length} ways.`}</Split>
        <p data-rise>One project, one route per version. None of them is deployed. The copy is the live site’s in every one.</p>
        {status && (
          <div className="vi-status" role="status">
            <p><strong>{status.done} of {status.total}</strong> new versions done{status.latest ? <>. Newest: <em>{status.latest}</em></> : null}.</p>
            {status.building.length > 0 && <p>Building now: {status.building.join(', ')}.</p>}
            {status.note && <p>{status.note}</p>}
            <p className="vi-status-time">Updated {status.updated}. Refresh to check again.</p>
          </div>
        )}
      </header>
      <main>
        <ol>
          {VERSIONS.map((v) => (
            <li key={v.slug} data-rise>
              <Go to={`/${v.slug}`}>
                <span className="thumb" style={{ background: v.color }}><img src={`${import.meta.env.BASE_URL}thumbs/${v.slug}.jpg`} alt="" width={640} height={400} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></span>
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
      <footer><p>Versions 1 and 2 follow the live site’s rules. Everything after version 2 starts from nothing: new fonts, colours and layouts. Facts and privacy rules are the same everywhere. Use [ and ] to step between versions.</p></footer>
    </div>
  );
}
