import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router';
import { TransitionProvider } from '@/components/Transition';
import { Switcher } from '@/components/Switcher';
import { EXTRA_PAGES } from '@/registry';

const Index = lazy(() => import('@/versions/index/Index'));
const Head = lazy(() => import('@/versions/head/Head'));
const Head3D = lazy(() => import('@/versions/head/Head3D'));
const Statue = lazy(() => import('@/versions/statue/Statue'));
const Question = lazy(() => import('@/versions/question/Question'));
const Flow = lazy(() => import('@/versions/flow/Flow'));
const Cards = lazy(() => import('@/versions/cards/Cards'));
const Ladder = lazy(() => import('@/versions/ladder/Ladder'));
const Blocks = lazy(() => import('@/versions/blocks/Blocks'));
const Board = lazy(() => import('@/versions/board/Board'));
const Badge = lazy(() => import('@/versions/badge/Badge'));
const Terminal = lazy(() => import('@/versions/terminal/Terminal'));
const Spread = lazy(() => import('@/versions/spread/Spread'));
const Metal = lazy(() => import('@/versions/metal/Metal'));

const EXTRA = EXTRA_PAGES.map((p) => ({ slug: p.slug, Page: lazy(p.load) }));

// VITE_HASH builds a copy that works from any static host (the phone preview): routes live after the #.
const Router = import.meta.env.VITE_HASH ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <TransitionProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/head" element={<Head />} />
            <Route path="/head-3d" element={<Head3D />} />
            <Route path="/statue" element={<Statue />} />
            <Route path="/question" element={<Question />} />
            <Route path="/flow" element={<Flow />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/ladder" element={<Ladder />} />
            <Route path="/blocks" element={<Blocks />} />
            <Route path="/board" element={<Board />} />
            <Route path="/badge" element={<Badge />} />
            <Route path="/terminal" element={<Terminal />} />
            <Route path="/spread" element={<Spread />} />
            <Route path="/metal" element={<Metal />} />
            {EXTRA.map(({ slug, Page }) => <Route key={slug} path={`/${slug}`} element={<Page />} />)}
            <Route path="*" element={<Index />} />
          </Routes>
        </Suspense>
        <Switcher />
      </TransitionProvider>
    </Router>
  );
}
