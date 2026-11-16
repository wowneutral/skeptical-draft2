// The censor's question mark, drawn from the live site's own mark.
import marks from '@/lib/marks.json';

export function Q({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-470 -770 940 1540" aria-hidden="true" focusable="false">
      <path d={marks.italic.d} fill="currentColor" />
    </svg>
  );
}
