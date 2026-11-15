// One full turn around the subject across the whole page. The subject stands
// opposite the text: the view is shifted, the perspective is not.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { scroll } from '@/lib/scroll';
import { damp, still } from '@/lib/utils';
import { stage } from '@/versions/orbit/stage';

export const view = { x: 0, y: 0, angle: 0, mx: 1, my: 0 };

export function OrbitRig({ radius = 6.4, phoneRadius = 10.8, height = 0.35, lookY = 0, bob = 0.25 }: { radius?: number; phoneRadius?: number; height?: number; lookY?: number; bob?: number }) {
  const first = useRef(true);
  useFrame((state, dt) => {
    const cam = state.camera as PerspectiveCamera;
    const w = state.size.width, h = state.size.height, phone = w <= 820;
    const k = still || first.current ? 1000 : 5;
    first.current = false;
    view.angle = damp(view.angle, scroll.p * Math.PI * 2, k, dt);
    view.x = damp(view.x, phone ? 0 : stage.side * 0.21, k * 0.6, dt);
    view.y = damp(view.y, phone ? 0.25 : 0, k * 0.6, dt);
    view.mx = phone ? 0 : Math.max(-1, Math.min(1, view.x / 0.21)); view.my = phone ? 1 : 0;
    const r = phone ? phoneRadius : radius, a = view.angle + 0.5;
    cam.position.set(Math.sin(a) * r, height + Math.sin(view.angle * 2) * bob, Math.cos(a) * r);
    cam.lookAt(0, lookY, 0);
    cam.setViewOffset(w, h, -view.x * w, view.y * h, w, h);
  });
  return null;
}
