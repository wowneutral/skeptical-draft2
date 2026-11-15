import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { TransitionProvider } from '@/components/Transition';
import { Switcher } from '@/components/Switcher';

const Index = lazy(() => import('@/versions/index/Index'));
const Head = lazy(() => import('@/versions/head/Head'));
const Statue = lazy(() => import('@/versions/statue/Statue'));
const Question = lazy(() => import('@/versions/question/Question'));
const Flow = lazy(() => import('@/versions/flow/Flow'));
const Cards = lazy(() => import('@/versions/cards/Cards'));
const Ladder = lazy(() => import('@/versions/ladder/Ladder'));
const Blocks = lazy(() => import('@/versions/blocks/Blocks'));

export default function App() {
  return (
    <BrowserRouter>
      <TransitionProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/head" element={<Head />} />
            <Route path="/statue" element={<Statue />} />
            <Route path="/question" element={<Question />} />
            <Route path="/flow" element={<Flow />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/ladder" element={<Ladder />} />
            <Route path="/blocks" element={<Blocks />} />
            <Route path="*" element={<Index />} />
          </Routes>
        </Suspense>
        <Switcher />
      </TransitionProvider>
    </BrowserRouter>
  );
}
