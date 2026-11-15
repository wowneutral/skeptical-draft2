// The quiet background of version 1: contour lines of a slow wave field, and
// the prompt's five hairlines with a dot travelling down each as you scroll.
import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { still } from '@/lib/utils';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uT, uShow, uP, uDpr, uPhone;
vec3 lin(vec3 c){ return pow(c / 255.0, vec3(2.2)); }
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float f = sin(p.x * 2.1 + uT) + sin(p.y * 2.9 - uT * 0.7 + sin(p.x * 1.6 + uT * 0.4)) + sin((p.x + p.y) * 1.7 + uT * 0.5);
  float g = f * 2.2;
  float line = abs(fract(g) - 0.5) / max(fwidth(g), 1e-4);
  float ink = 1.0 - clamp(line - 0.15, 0.0, 1.0);
  float edge = smoothstep(0.15, 0.95, length(p * vec2(0.8, 1.0)));
  vec3 bg = lin(vec3(5.0)), rule = lin(vec3(38.0, 38.0, 36.0)), paper = lin(vec3(240.0, 240.0, 236.0));
  vec3 col = mix(bg, rule, ink * (0.25 + 0.75 * edge) * uShow);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (uPhone > 0.5 && (i == 1 || i == 3)) continue;
    float lx = (0.1 + 0.2 * fi) * uRes.x;
    col = mix(col, rule, (1.0 - smoothstep(0.5 * uDpr, 1.0 * uDpr, abs(gl_FragCoord.x - lx))) * 0.7 * uShow);
    float ty = 1.0 - fract(uP * (1.4 + 0.55 * fi) + 0.21 * fi);
    float dd = distance(gl_FragCoord.xy, vec2(lx, ty * uRes.y));
    col = mix(col, paper, (1.0 - smoothstep(1.8 * uDpr, 2.8 * uDpr, dd)) * uShow);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export function Field({ show }: { show: { reveal: number } }) {
  const { size, viewport } = useThree();
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: FRAG, depthTest: false, depthWrite: false,
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 }, uShow: { value: 0 }, uP: { value: 0 }, uDpr: { value: 1 }, uPhone: { value: 0 } },
  }), []);
  useFrame((state) => {
    const u = material.uniforms;
    u.uRes.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
    u.uDpr.value = viewport.dpr;
    u.uPhone.value = size.width <= 820 ? 1 : 0;
    u.uT.value = (still ? 0 : state.clock.elapsedTime * 0.035) + scroll.p * 5;
    u.uShow.value = show.reveal;
    u.uP.value = scroll.p;
  });
  return <mesh frustumCulled={false} renderOrder={-10} material={material}><planeGeometry args={[2, 2]} /></mesh>;
}
