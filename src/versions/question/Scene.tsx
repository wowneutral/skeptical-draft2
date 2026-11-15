// Version 3's stage: a glass question mark. The big headings are real DOM
// text, drawn again in WebGL at exactly the same place, so the glass can bend
// them as it passes in front.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial, Text } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import fontUrl from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-800-normal.woff?url';
import MARKS from '@/lib/marks.json';
import { scroll } from '@/lib/scroll';
import { clamp, coarse, damp, lerp, smooth, still } from '@/lib/utils';

export const qstage = { ready: false, reveal: 0 };
/** Per-heading reveal state, written by the page's GSAP tweens and read here every frame. */
export const glFx = new Map<HTMLElement, { o: number; y: number }>();
const CAM_Z = 10, TEXT_Z = -1.2, FOV = 30;
const HALF = (z: number) => Math.tan((FOV / 2) * Math.PI / 180) * (CAM_Z - z);

/** A dim field of slow colour behind everything: what the glass has to refract when no type is near. */
function Aurora() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uT: { value: 0 }, uShow: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: /* glsl */ `
      precision highp float; varying vec2 vUv; uniform float uT, uShow, uAspect;
      vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
      float blob(vec2 p, vec2 c, float r){ return smoothstep(r, 0.0, distance(p, c)); }
      void main(){
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        vec3 col = lin(vec3(0.027, 0.024, 0.043));
        col += lin(vec3(1.0, 0.24, 0.5)) * blob(p, vec2(-0.75 + sin(uT * 0.7) * 0.2, 0.35 + cos(uT * 0.5) * 0.2), 0.8) * 0.035;
        col += lin(vec3(0.16, 0.29, 1.0)) * blob(p, vec2(0.75 + cos(uT * 0.6) * 0.2, -0.3 + sin(uT * 0.8) * 0.2), 0.9) * 0.05;
        col += lin(vec3(1.0, 0.48, 0.18)) * blob(p, vec2(0.1 + sin(uT * 0.4) * 0.5, -0.7), 0.6) * 0.022;
        gl_FragColor = vec4(col * uShow, 1.0);
      }`,
  }), []);
  useFrame((state) => {
    material.uniforms.uT.value = (still ? 2 : state.clock.elapsedTime * 0.12) + scroll.p * 6;
    material.uniforms.uShow.value = qstage.reveal;
    material.uniforms.uAspect.value = state.size.width / state.size.height;
  });
  return <mesh frustumCulled={false} renderOrder={-10} material={material}><planeGeometry args={[2, 2]} /></mesh>;
}

type Line = { el: HTMLElement; text: string; size: number; spacing: number; color: string };

/** Every element marked data-gl is drawn again here, glued to its DOM box. */
function SyncedText() {
  const { size } = useThree();
  const [lines, setLines] = useState<Line[]>([]);
  const refs = useRef<(THREE.Object3D | null)[]>([]);
  useEffect(() => {
    const read = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('.vq [data-gl]'));
      setLines(els.map((el) => {
        const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
        return { el, text: el.textContent ?? '', size: fs, spacing: (parseFloat(cs.letterSpacing) || 0) / fs, color: el.dataset.gl || '#f3f0ea' };
      }));
    };
    read();
    document.fonts.ready.then(read);
    const t = setTimeout(read, 600);
    return () => clearTimeout(t);
  }, [size.width, size.height]);
  useFrame(() => {
    const px = (2 * HALF(TEXT_Z)) / size.height;
    lines.forEach((l, i) => {
      const o = refs.current[i]; if (!o) return;
      const r = l.el.getBoundingClientRect();
      o.visible = r.bottom > -80 && r.top < size.height + 80;
      if (!o.visible) return;
      const fx = glFx.get(l.el);
      o.position.set((r.left - size.width / 2) * px, -(r.top + r.height / 2 - size.height / 2 + (fx ? fx.y * l.size : 0)) * px, TEXT_Z);
      (o as unknown as { fillOpacity: number }).fillOpacity = (fx ? fx.o : 1) * qstage.reveal;
    });
  });
  const px = (2 * HALF(TEXT_Z)) / size.height;
  return (
    <>
      {lines.map((l, i) => (
        <Text key={`${i}-${l.text}-${l.size}`} ref={(o: THREE.Object3D | null) => { refs.current[i] = o; }} font={fontUrl} fontSize={l.size * px} letterSpacing={l.spacing}
          lineHeight={1} anchorX="left" anchorY="middle" color={l.color} sdfGlyphSize={128} whiteSpace="nowrap" material-toneMapped={false}>
          {l.text}
        </Text>
      ))}
    </>
  );
}

// Where the mark stands for each section: x, y in half-widths and half-heights; s as a share of the viewport height.
type Key = { x: number; y: number; s: number; ry: number; rz: number; rx: number };
const KEYS: Record<string, Key> = {
  hero: { x: 0.58, y: 0.3, s: 0.82, ry: -0.5, rz: 0.1, rx: 0.05 },
  why: { x: -0.05, y: 0.0, s: 1.05, ry: 1.2, rz: -0.25, rx: 0.2 },
  record: { x: 0.55, y: 0.05, s: 0.8, ry: 2.6, rz: 0.12, rx: -0.1 },
  drive: { x: -0.6, y: -0.1, s: 0.7, ry: 4.2, rz: -0.3, rx: 0.25 },
  people: { x: 0.0, y: 0.1, s: 0.9, ry: 5.6, rz: 0.18, rx: -0.12 },
  join: { x: 0.5, y: 0.2, s: 0.5, ry: Math.PI * 2, rz: 0, rx: 0 },
};
const PHONE: Record<string, Key> = {
  hero: { x: 0.25, y: 0.5, s: 0.44, ry: -0.5, rz: 0.1, rx: 0.05 },
  why: { x: 1.2, y: -0.25, s: 0.8, ry: 1.2, rz: -0.25, rx: 0.2 },
  record: { x: 1.15, y: 0.2, s: 0.62, ry: 2.6, rz: 0.12, rx: -0.1 },
  drive: { x: 1.1, y: 0.4, s: 0.5, ry: 4.2, rz: -0.3, rx: 0.25 },
  people: { x: 1.15, y: -0.2, s: 0.66, ry: 5.6, rz: 0.18, rx: -0.12 },
  join: { x: 0.6, y: 0.2, s: 0.4, ry: Math.PI * 2, rz: 0, rx: 0 },
};

/** A sky nobody sees directly: violet dusk, a hot horizon, hard white strips. The glass reflects it and bends it. */
function makeSky() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  ([[0, '#0a0618'], [0.2, '#24167a'], [0.4, '#6a35ff'], [0.5, '#ff5a96'], [0.57, '#ff9a4d'], [0.66, '#34186a'], [1, '#07040f']] as [number, string][]).forEach(([t, col]) => grad.addColorStop(t, col));
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  const side = g.createLinearGradient(0, 0, 1024, 0);
  ([[0, 'rgba(50,90,255,0.8)'], [0.3, 'rgba(50,90,255,0)'], [0.62, 'rgba(255,70,130,0)'], [0.8, 'rgba(255,70,130,0.55)'], [1, 'rgba(50,90,255,0.8)']] as [number, string][]).forEach(([t, col]) => side.addColorStop(t, col));
  g.fillStyle = side; g.fillRect(0, 60, 1024, 330);
  g.fillStyle = '#ffffff';
  [[90, 70, 150, 26], [420, 40, 240, 18], [760, 96, 120, 30], [300, 330, 30, 120], [880, 300, 22, 150], [610, 180, 16, 110]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Mark({ sky }: { sky: THREE.Texture }) {
  const rig = useRef<THREE.Group>(null), hook = useRef<THREE.Mesh>(null), dot = useRef<THREE.Mesh>(null);
  const phone = useThree((s) => s.size.width <= 760);
  const parts = useMemo(() => {
    const d = MARKS.roman.d, cut = d.indexOf('M', 1);
    const solid = (path: string) => {
      const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`);
      const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
      const geo = new THREE.ExtrudeGeometry(shapes, { depth: 250, bevelEnabled: true, bevelThickness: 52, bevelSize: 36, bevelSegments: 12, curveSegments: 32 });
      geo.translate(0, 0, -125);
      return geo;
    };
    const hookGeo = solid(d.slice(0, cut)), dotGeo = solid(d.slice(cut));
    dotGeo.computeBoundingBox();
    const box = dotGeo.boundingBox!, c = box.getCenter(new THREE.Vector3());
    dotGeo.translate(-c.x, -c.y, 0);
    return { hookGeo, dotGeo, dotC: c, dotD: box.max.x - box.min.x };
  }, []);
  const st = useRef({ x: 0, y: 0, s: 0.2, ry: -2.6, rz: 0, rx: 0, t: 0, px: 0, py: 0, first: true });
  const ptr = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (coarse || still) return;
    const move = (e: PointerEvent) => { ptr.current.x = e.clientX / window.innerWidth - 0.5; ptr.current.y = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useFrame((state, dt) => {
    const secs = Array.from(document.querySelectorAll<HTMLElement>('.vq section[data-key]'));
    const slot = document.querySelector<HTMLElement>('.vq .dot-slot');
    if (!secs.length || !rig.current || !hook.current || !dot.current) return;
    const w = state.size.width, h = state.size.height, T = phone ? PHONE : KEYS;
    // Blend between the two sections nearest the middle of the screen.
    const mid = window.scrollY + h / 2;
    let a = secs[0], b = secs[0], k = 0;
    for (let i = 0; i < secs.length; i++) {
      const c = secs[i].offsetTop + secs[i].offsetHeight / 2;
      if (mid >= c) { a = secs[i]; b = secs[Math.min(secs.length - 1, i + 1)]; const c2 = b.offsetTop + b.offsetHeight / 2; k = c2 > c ? clamp((mid - c) / (c2 - c)) : 0; }
    }
    const e = smooth(k), A = T[a.dataset.key!], B = T[b.dataset.key!], s = st.current;
    const joinT = b.dataset.key === 'join' && a.dataset.key !== 'join' ? smooth(clamp((k - 0.35) / 0.6)) : a.dataset.key === 'join' ? 1 : 0;
    const lam = still || s.first ? 1000 : 4.5; s.first = false;
    (['x', 'y', 's', 'ry', 'rz', 'rx'] as const).forEach((p) => { s[p] = damp(s[p], lerp(A[p], B[p], e), lam, dt); });
    s.t = damp(s.t, joinT, lam, dt);
    s.px = damp(s.px, ptr.current.x, 3, dt); s.py = damp(s.py, ptr.current.y, 3, dt);

    const halfH = HALF(0), halfW = halfH * (w / h), intro = qstage.reveal;
    let scale = (s.s * lerp(0.55, 1, intro) * 2 * halfH) / MARKS.roman.h;
    let x = s.x * halfW, y = s.y * halfH;
    const t = s.t;
    if (t > 0.001 && slot) {
      // Into "Join": the mark shrinks until its dot is exactly the full stop, and sits where the full stop goes.
      const r = slot.getBoundingClientRect();
      const kSlot = ((r.width / h) * 2 * halfH) / parts.dotD;
      const sx = ((r.left + r.width / 2) / w * 2 - 1) * halfW, sy = -((r.top + r.height / 2) / h * 2 - 1) * halfH;
      const kk = lerp(scale, kSlot, t);
      x = lerp(x, sx - parts.dotC.x * kk, t); y = lerp(y, sy + parts.dotC.y * kk, t); scale = kk;
    }
    rig.current.position.set(x, y, 0);
    rig.current.scale.setScalar(scale);
    rig.current.rotation.set((s.rx + s.py * 0.3) * (1 - t), s.ry + (1 - intro) * -2.2 + s.px * 0.4 * (1 - t), s.rz * (1 - t));
    hook.current.scale.setScalar(Math.max(0.0001, 1 - smooth(clamp(t * 1.5))));
    hook.current.position.y = -t * 900; hook.current.rotation.z = t * 1.2; hook.current.visible = t < 0.98;
    dot.current.rotation.y = -s.ry * t;
  });

  const glass = { transmission: 1, thickness: 1.6, roughness: 0.03, ior: 1.38, chromaticAberration: 0.7, anisotropicBlur: 0.2, distortion: 0.3, distortionScale: 0.3, temporalDistortion: still ? 0 : 0.08, samples: phone ? 3 : 6, resolution: phone ? 384 : 768, color: '#ffffff', clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.25, background: sky, backside: !phone, backsideThickness: 0.6 };
  return (
    <group ref={rig}>
      <group scale={[1, -1, 1]}>
        <mesh ref={hook} geometry={parts.hookGeo}><MeshTransmissionMaterial {...glass} /></mesh>
        <group position={[parts.dotC.x, parts.dotC.y, 0]}>
          <mesh ref={dot} geometry={parts.dotGeo}><MeshTransmissionMaterial {...glass} /></mesh>
        </group>
      </group>
    </group>
  );
}

export default function QuestionScene() {
  const sky = useMemo(makeSky, []);
  return (
    <Canvas dpr={[1, 1.6]} camera={{ fov: FOV, near: 0.1, far: 60, position: [0, 0, CAM_Z] }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <Aurora />
      <SyncedText />
      <Mark sky={sky} />
      <Environment map={sky} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.9} intensity={0.35} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
