// Question marks drifting upward where the prompt had forge sparks. They stay
// on the subject's side of the frame so they never cross the text.
import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import MARKS from '@/lib/marks.json';
import { scroll } from '@/lib/scroll';
import { still } from '@/lib/utils';

export function Marks({ count = 90, show, mask }: { count?: number; show: { reveal: number }; mask: { x: number; y: number } }) {
  const { size, viewport } = useThree();
  const { geometry, material } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d')!, m = MARKS.italic, k = (128 * 0.8) / m.h;
    ctx.translate(64, 64); ctx.scale(k, k); ctx.fillStyle = '#fff'; ctx.fill(new Path2D(m.d));
    const map = new THREE.CanvasTexture(c);
    let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const pos = new Float32Array(count * 3), seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, r = 1.7 + rnd() * 1.5;
      pos.set([Math.cos(a) * r, rnd() * 6 - 3, Math.sin(a) * r], i * 3); seed[i] = rnd();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uMap: { value: map }, uT: { value: 0 }, uScale: { value: 1 }, uShow: { value: 0 }, uMask: { value: new THREE.Vector2(1, 0) } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uT, uScale, uShow; uniform vec2 uMask; varying float vA; varying float vRot;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + uT * (0.05 + aSeed * 0.09) + 3.0, 6.0) - 3.0;
          p.x += sin(uT * 0.3 + aSeed * 40.0) * 0.08;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * (0.45 + aSeed) / -mv.z;
          vA = (0.22 + 0.6 * fract(aSeed * 7.3)) * smoothstep(3.0, 2.1, abs(p.y)) * uShow;
          vA *= smoothstep(-0.12, 0.3, dot(gl_Position.xy / gl_Position.w, uMask));
          vRot = floor(fract(aSeed * 13.7) * 4.0) * 1.5708 * step(0.62, fract(aSeed * 5.1));
        }`,
      fragmentShader: /* glsl */ `
        precision mediump float; uniform sampler2D uMap; varying float vA; varying float vRot;
        void main(){
          vec2 uv = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot);
          uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) + 0.5;
          float a = texture2D(uMap, uv).a * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(pow(vec3(240.0, 240.0, 236.0) / 255.0, vec3(2.2)), a);
        }`,
    });
    return { geometry, material };
  }, [count]);
  useFrame((state) => {
    const u = material.uniforms;
    u.uT.value = (still ? 0 : state.clock.elapsedTime) + scroll.p * 16;
    u.uShow.value = show.reveal;
    u.uScale.value = 200 * viewport.dpr * (size.height / 900);
    u.uMask.value.set(mask.x, mask.y);
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
