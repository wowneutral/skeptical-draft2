// Draft chrome, not part of any design: step between the seven versions.
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { ALL as VERSIONS } from '@/registry';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTransition } from './Transition';

export function Switcher() {
  const { pathname } = useLocation();
  const { go } = useTransition();
  const i = VERSIONS.findIndex((v) => pathname === `/${v.slug}` || pathname.startsWith(`/${v.slug}/`) || pathname.startsWith(`/${v.slug}-`));
  const prev = VERSIONS[(i - 1 + VERSIONS.length) % VERSIONS.length], next = VERSIONS[(i + 1) % VERSIONS.length];

  useEffect(() => {
    if (i < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
      if (e.key === '[') go(`/${prev.slug}`);
      if (e.key === ']') go(`/${next.slug}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, prev, next, go]);

  if (i < 0) return null;
  const btn = 'grid size-9 place-items-center rounded-md text-white/90 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white';
  return (
    <TooltipProvider delayDuration={200}>
      <nav aria-label="Draft versions" className="fixed bottom-3 left-3 z-[150] flex items-center gap-0.5 rounded-lg bg-black/70 p-1 font-sans text-[13px] text-white shadow-lg backdrop-blur-md" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <Tooltip><TooltipTrigger asChild><button className={btn} onClick={() => go('/')} aria-label="All versions"><LayoutGrid size={16} /></button></TooltipTrigger><TooltipContent side="top">All versions</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><button className={btn} onClick={() => go(`/${prev.slug}`)} aria-label={`Previous: ${prev.name}`}><ChevronLeft size={16} /></button></TooltipTrigger><TooltipContent side="top">{prev.name} <kbd className="ml-1 opacity-60">[</kbd></TooltipContent></Tooltip>
        <span className="px-1.5 tabular-nums" aria-current="page">{i + 1} / {VERSIONS.length}</span>
        <Tooltip><TooltipTrigger asChild><button className={btn} onClick={() => go(`/${next.slug}`)} aria-label={`Next: ${next.name}`}><ChevronRight size={16} /></button></TooltipTrigger><TooltipContent side="top">{next.name} <kbd className="ml-1 opacity-60">]</kbd></TooltipContent></Tooltip>
      </nav>
    </TooltipProvider>
  );
}
