// The window manager's state. One zustand store so any app can open another,
// and the bar, the shelf and the icons all read the same windows.
import { create } from 'zustand';

export type AppId = 'readme' | 'manifesto' | 'record' | 'mark' | 'drive' | 'people' | 'about' | 'join' | 'flow' | 'trash' | 'note';
export type Rect = { x: number; y: number; w: number; h: number };
export type Win = Rect & { open: boolean; min: boolean; max: boolean; z: number; prev?: Rect; born: number };
export type Mode = 'boot' | 'desk' | 'page' | 'off';

export const BAR = 44;   // menu bar height
export const SHELF = 60; // shelf height

type S = {
  wins: Record<AppId, Win>;
  top: number;
  focus: AppId | null;
  mode: Mode;
  sheet: AppId | null;   // touch: the sheet being looked at, null = the desktop
  toast: { id: number; text: string; sub?: string } | null;
  saver: boolean;
  zoom: { from: DOMRect; to: Rect; id: number } | null;
  chosen: string[];
  set: (p: Partial<S>) => void;
  open: (id: AppId, from?: DOMRect | null) => void;
  close: (id: AppId) => void;
  minimise: (id: AppId) => void;
  toggleMax: (id: AppId) => void;
  raise: (id: AppId) => void;
  place: (id: AppId, r: Partial<Win>) => void;
  say: (text: string, sub?: string) => void;
  layout: (wins: Record<AppId, Win>) => void;
};

const blank = (): Win => ({ x: 80, y: 80, w: 480, h: 360, open: false, min: false, max: false, z: 1, born: 0 });
const ALL: AppId[] = ['readme', 'manifesto', 'record', 'mark', 'drive', 'people', 'about', 'join', 'flow', 'trash', 'note'];
let born = 100, toastN = 0;

export const useOS = create<S>((set, get) => ({
  wins: Object.fromEntries(ALL.map((id) => [id, blank()])) as Record<AppId, Win>,
  top: 10,
  focus: null,
  mode: 'boot',
  sheet: null,
  toast: null,
  saver: false,
  zoom: null,
  chosen: [],
  set: (p) => set(p),
  layout: (wins) => set({ wins }),
  open: (id, from) => {
    const s = get(), w = s.wins[id], z = s.top + 1;
    const was = w.open && !w.min;
    set({
      wins: { ...s.wins, [id]: { ...w, open: true, min: false, z, born: w.open ? w.born : ++born } },
      top: z, focus: id, sheet: id,
      zoom: from && !was ? { from, to: w.max ? { x: 0, y: BAR, w: innerWidth, h: innerHeight - BAR - SHELF } : w, id: Date.now() } : s.zoom,
    });
  },
  close: (id) => {
    const s = get();
    const wins = { ...s.wins, [id]: { ...s.wins[id], open: false, min: false, max: false } };
    const left = ALL.filter((k) => wins[k].open && !wins[k].min).sort((a, b) => wins[b].z - wins[a].z);
    const sheets = ALL.filter((k) => wins[k].open).sort((a, b) => wins[a].born - wins[b].born);
    const i = sheets.length ? Math.min(sheets.length - 1, Math.max(0, sheetsBefore(s, id))) : -1;
    set({ wins, focus: left[0] ?? null, sheet: s.sheet === id ? (i >= 0 ? sheets[i] : null) : s.sheet });
  },
  minimise: (id) => {
    const s = get();
    const wins = { ...s.wins, [id]: { ...s.wins[id], min: true } };
    const left = ALL.filter((k) => wins[k].open && !wins[k].min).sort((a, b) => wins[b].z - wins[a].z);
    set({ wins, focus: left[0] ?? null });
  },
  toggleMax: (id) => {
    const s = get(), w = s.wins[id], z = s.top + 1;
    set({ wins: { ...s.wins, [id]: { ...w, max: !w.max, z } }, top: z, focus: id });
  },
  raise: (id) => {
    const s = get(), w = s.wins[id];
    if (s.focus === id && w.z === s.top) return;
    const z = s.top + 1;
    set({ wins: { ...s.wins, [id]: { ...w, z } }, top: z, focus: id });
  },
  place: (id, r) => {
    const s = get();
    set({ wins: { ...s.wins, [id]: { ...s.wins[id], ...r } } });
  },
  say: (text, sub) => set({ toast: { id: ++toastN, text, sub } }),
}));

function sheetsBefore(s: S, id: AppId) {
  const sheets = ALL.filter((k) => s.wins[k].open).sort((a, b) => s.wins[a].born - s.wins[b].born);
  return sheets.indexOf(id) - 1;
}

export const openSheets = (wins: Record<AppId, Win>) => ALL.filter((k) => wins[k].open).sort((a, b) => wins[a].born - wins[b].born);
export const APP_ORDER = ALL;
