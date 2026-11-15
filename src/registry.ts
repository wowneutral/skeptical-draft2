// Every version, in order. The first twelve are listed in content.ts; any
// folder under src/versions with a meta.ts and an index.tsx adds itself here,
// so a new version never has to touch a shared file. A folder whose meta.ts
// fails to load is skipped, so one broken draft cannot take the app down.
import type { ComponentType } from 'react';
import { VERSIONS, type Version } from './content';

const metas = import.meta.glob<Version>('./versions/*/meta.ts', { import: 'default' });
const pages: Record<string, (() => Promise<{ default: ComponentType }>) | undefined> = import.meta.glob<{ default: ComponentType }>('./versions/*/index.tsx');

const settled = await Promise.allSettled(
  Object.entries(metas).map(async ([path, load]) => ({ meta: await load(), load: pages[path.replace('meta.ts', 'index.tsx')] })),
);
const taken = new Set(VERSIONS.map((v) => v.slug));
const extra = settled
  .flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  .filter((v) => v.load !== undefined && v.meta && typeof v.meta.slug === 'string' && typeof v.meta.n === 'number' && !taken.has(v.meta.slug));

export const ALL: Version[] = [...VERSIONS, ...extra.map((v) => v.meta)].sort((a, b) => a.n - b.n);
export const EXTRA_PAGES = extra.map((v) => ({ slug: v.meta.slug, load: v.load! }));
