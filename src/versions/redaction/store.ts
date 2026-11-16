import { create } from 'zustand';

/** Which bars are lifted, and the two global gestures: flash and classify. */
type S = {
  ids: string[];
  lifted: Record<string, true>;
  nonce: number;
  flash: boolean;
  add: (id: string) => void;
  lift: (id: string) => void;
  classify: () => void;
  declassify: () => void;
  setFlash: (f: boolean) => void;
};

export const useFile = create<S>((set) => ({
  ids: [],
  lifted: {},
  nonce: 0,
  flash: false,
  add: (id) => set((s) => (s.ids.includes(id) ? s : { ids: [...s.ids, id] })),
  lift: (id) => set((s) => (s.lifted[id] ? s : { lifted: { ...s.lifted, [id]: true } })),
  classify: () => set((s) => ({ lifted: {}, nonce: s.nonce + 1 })),
  declassify: () => set((s) => ({ lifted: Object.fromEntries(s.ids.map((i) => [i, true as const])) })),
  setFlash: (flash) => set({ flash }),
}));

export const LEVELS = [
  { word: 'Restricted', at: 0 },
  { word: 'Confidential', at: 0.12 },
  { word: 'Secret', at: 0.35 },
  { word: 'Top secret', at: 0.65 },
  { word: 'Cleared', at: 0.999 },
];

export const useLevel = () =>
  useFile((s) => {
    const f = s.ids.length ? Object.keys(s.lifted).length / s.ids.length : 0;
    let l = 0;
    LEVELS.forEach((v, i) => { if (f >= v.at) l = i; });
    return l;
  });

export const useFrac = () => useFile((s) => (s.ids.length ? Object.keys(s.lifted).length / s.ids.length : 0));
