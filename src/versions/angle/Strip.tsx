import { useEffect, useRef, useState } from 'react';
import { register, type Spec } from './engine';
import { still } from '@/lib/utils';

type Props = Spec & { className?: string };

/** One lenticular strip. Press it to turn it over and read it from the other side. */
export function Strip({ className = '', ...spec }: Props) {
  const el = useRef<HTMLButtonElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const api = useRef<ReturnType<typeof register> | null>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (!el.current || !cv.current) return;
    api.current = register(el.current, cv.current, spec);
    return () => api.current?.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.a, spec.b]);
  return (
    <div className={`strip-w ${className}`}>
      <button
        ref={el}
        type="button"
        className={`strip look-${spec.look}`}
        aria-pressed={over}
        aria-label={`Turn over: ${spec.a}`}
        onClick={() => { if (api.current) setOver(api.current.toggle()); }}
      >
        <canvas ref={cv} aria-hidden="true" />
      </button>
      {still && <p className="rb" aria-hidden="true">{spec.b}</p>}
    </div>
  );
}
