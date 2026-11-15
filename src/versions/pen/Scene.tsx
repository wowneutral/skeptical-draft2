// The pen. One retractable gel pen, built from lathe profiles: a chrome nose,
// a knurled metal grip, a clear barrel with the refill, its ink and spring
// inside, a lacquered cap, a chrome clip and an ink-coloured plunger.
// The canvas is a clear sheet of glass over the page: the pen floats above the
// paper and throws its own soft shadow onto it. Everything the pen does is a
// pose (centre, angle in the paper, tilt, roll, size) driven by springs, or by
// a little hand-rolled physics when it is spun or dropped.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { INKS, rig } from './rig';
import { clamp, isPhone, still } from '@/lib/utils';

const HALF = 7, R = 0.55, UNIT = 100, FOV = 20;
const TAU = Math.PI * 2;
const wrap = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

type Pose = { x: number; y: number; z: number; phi: number; th: number; psi: number; s: number };
const KEYS = ['x', 'y', 'z', 'phi', 'th', 'psi', 's'] as const;

/* ───────────────────────── materials and textures ───────────────────────── */

function knurlTexture() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!, im = g.createImageData(S, S);
  const tri = (x: number) => 1 - 2 * Math.abs((x - Math.floor(x)) - 0.5);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, f = Math.min(tri(u + v), tri(u - v));
    const val = Math.round(255 * Math.pow(f, 0.8));
    im.data.set([val, val, val, 255], (y * S + x) * 4);
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 14); t.anisotropy = 4;
  return t;
}

function glintTexture() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.12, 'rgba(255,250,235,0.85)'); r.addColorStop(0.4, 'rgba(255,240,210,0.15)'); r.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = r; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[S, 2.5], [2.5, S * 0.7]]) { const l = g.createLinearGradient(0, 0, S, 0); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,0.8)'); l.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect((S - w) / 2, (S - h) / 2, w, h); }
  return new THREE.CanvasTexture(c);
}

function makeMats() {
  const knurl = knurlTexture();
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#e8e6e1', metalness: 1, roughness: 0.1, envMapIntensity: 1.5, clearcoat: 0.4 });
  const grip = new THREE.MeshPhysicalMaterial({ color: '#4a4b4f', metalness: 0.95, roughness: 0.42, bumpMap: knurl, bumpScale: 2.2, roughnessMap: knurl, envMapIntensity: 1.35 });
  const lacquer = new THREE.MeshPhysicalMaterial({ color: '#2b2c30', metalness: 0.2, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.13, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.8, depthWrite: false, specularIntensity: 1 });
  const glassBack = new THREE.MeshPhysicalMaterial({ color: '#d9dde2', roughness: 0.1, transparent: true, opacity: 0.06, side: THREE.BackSide, depthWrite: false, envMapIntensity: 1.2 });
  const tube = new THREE.MeshPhysicalMaterial({ color: '#f4f4f4', roughness: 0.15, transparent: true, opacity: 0.4, clearcoat: 1, depthWrite: false, envMapIntensity: 1.6 });
  const ink = new THREE.MeshPhysicalMaterial({ color: INKS[0].c, emissive: INKS[0].c, emissiveIntensity: 0.45, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 });
  const plunger = new THREE.MeshPhysicalMaterial({ color: INKS[0].c, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 });
  const ghost = new THREE.MeshBasicMaterial({ color: '#2a2a2c', transparent: true, opacity: 0, depthWrite: false });
  return { chrome, grip, lacquer, glass, glassBack, tube, ink, plunger, ghost, knurl };
}
type Mats = ReturnType<typeof makeMats>;

const lathe = (pts: [number, number][], seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

function clipParts(M: { chrome: THREE.Material }) {
  const g = new THREE.Group();
  const strip = new THREE.Mesh(new RoundedBoxGeometry(0.08, 3.05, 0.34, 3, 0.035), M.chrome);
  strip.position.set(0.735, 3.02, 0); strip.rotation.z = -0.022;
  const bridge = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.11, 0.34, 3, 0.04), M.chrome);
  bridge.position.set(0.63, 4.53, 0);
  g.add(strip, bridge);
  return g;
}

function springGeometry() {
  const pts: THREE.Vector3[] = [];
  const turns = 9, y0 = -1.95, y1 = -0.55;
  for (let i = 0; i <= turns * 24; i++) { const t = i / (turns * 24), a = t * turns * TAU; pts.push(new THREE.Vector3(Math.cos(a) * 0.24, y0 + (y1 - y0) * t, Math.sin(a) * 0.24)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, 0.026, 6, false);
}

/** The whole pen, centred, its axis along +y (nib at -7, plunger at +7). */
function buildPen(M: Mats) {
  const root = new THREE.Group();
  const add = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = root, order = 0) => { const mesh = new THREE.Mesh(g, m); mesh.renderOrder = order; parent.add(mesh); return mesh; };
  // The refill moves as one: tip, ball, tube, ink.
  const refill = new THREE.Group(); root.add(refill);
  add(lathe([[0, -7.02], [0.035, -7.0], [0.05, -6.96], [0.07, -6.9], [0.1, -6.7], [0.13, -6.5], [0.13, -6.2]], 24), M.chrome, refill);
  const ball = add(new THREE.SphereGeometry(0.05, 16, 12), M.chrome, refill); ball.position.y = -6.98;
  add(new THREE.CylinderGeometry(0.17, 0.17, 10.1, 24, 1, true).translate(0, -0.95, 0), M.tube, refill, 2);
  const inkCol = add(new THREE.CylinderGeometry(0.13, 0.13, 1, 20).translate(0, 0.5, 0), M.ink, refill, 1);
  inkCol.position.y = -5.9;
  // Nose and grip.
  add(lathe([[0.12, -6.72], [0.16, -6.62], [0.22, -6.42], [0.31, -6.1], [0.4, -5.72], [0.46, -5.42], [0.49, -5.26], [0.5, -5.2]]), M.chrome);
  add(lathe([[0.49, -5.2], [0.512, -5.16], [0.515, -5.05], [0.515, -2.4], [0.512, -2.29], [0.49, -2.25]], 56), M.grip);
  add(lathe([[0.49, -2.25], [0.53, -2.22], [0.54, -2.1], [0.53, -1.99], [0.5, -1.96]], 48), M.chrome);
  // Clear barrel.
  add(new THREE.CylinderGeometry(0.55, 0.55, 6.5, 48, 1, true).translate(0, 1.2, 0), M.glassBack, root, 3);
  add(new THREE.CylinderGeometry(0.55, 0.55, 6.5, 48, 1, true).translate(0, 1.2, 0), M.glass, root, 4);
  add(springGeometry(), M.chrome);
  // Top ring, cap, clip.
  add(lathe([[0.5, 4.38], [0.555, 4.4], [0.57, 4.5], [0.555, 4.62], [0.5, 4.64]], 48), M.chrome);
  add(lathe([[0.5, 4.64], [0.552, 4.66], [0.55, 5.6], [0.535, 6.05], [0.5, 6.26], [0.44, 6.33], [0.34, 6.35], [0, 6.35]], 48), M.lacquer);
  const clip = clipParts(M); root.add(clip);
  const bulb = add(new THREE.SphereGeometry(0.1, 20, 14), M.chrome); bulb.position.set(0.66, 1.52, 0); bulb.scale.set(0.9, 1.3, 1.5);
  // The plunger, the button that clicks.
  const plunger = new THREE.Group(); root.add(plunger);
  add(lathe([[0.25, 5.9], [0.3, 6.0], [0.3, 6.62], [0.285, 6.78], [0.24, 6.88], [0.15, 6.95], [0, 6.97]], 40), M.plunger, plunger);
  return { root, refill, inkCol, plunger, clip };
}

function ghostGeometry() {
  return lathe([[0, -7], [0.14, -6.7], [0.48, -5.3], [0.52, -5], [0.55, -2], [0.55, 6.2], [0.4, 6.4], [0.3, 6.5], [0.28, 6.9], [0, 7]], 20);
}

/* ───────────────────────── the soft shadow ───────────────────────── */

const shadowShader = {
  uniforms: { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uR: { value: 0.3 }, uL: { value: new THREE.Vector2(0.5, -0.62) }, uK: { value: 1 } },
  vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `
    uniform vec3 uA; uniform vec3 uB; uniform float uR; uniform vec2 uL; uniform float uK; varying vec2 vP;
    float cap(vec2 p, vec2 a, vec2 b, float ha, float hb, float blur0, float blurK, float dens, float fall){
      vec2 ab = b - a; float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
      float h = mix(ha, hb, t); float d = length(p - (a + ab * t)) - uR * (1.0 + h * 0.15);
      float bl = blur0 + h * blurK; return (1.0 - smoothstep(-bl, bl, d)) * dens / (1.0 + h * fall);
    }
    void main(){
      float ha = max(uA.z, 0.0), hb = max(uB.z, 0.0);
      float k = cap(vP, uA.xy + uL * ha, uB.xy + uL * hb, ha, hb, 0.02 * uK, 0.42, 0.5, 0.55);
      float a = cap(vP, uA.xy, uB.xy, ha, hb, 0.08 * uK, 0.7, 0.3, 1.4);
      float s = 1.0 - (1.0 - k) * (1.0 - a);
      gl_FragColor = vec4(0.13, 0.11, 0.08, s);
    }`,
};

/* ───────────────────────── the rig ───────────────────────── */

function Pen() {
  const { camera, size, gl } = useThree();
  const M = useMemo(makeMats, []);
  const pen = useMemo(() => buildPen(M), [M]);
  const ghosts = useMemo(() => { const g = ghostGeometry(); return Array.from({ length: 7 }, () => { const m = new THREE.Mesh(g, M.ghost.clone()); m.visible = false; m.renderOrder = 5; return m; }); }, [M]);
  const glint = useMemo(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false })); s.renderOrder = 10; return s; }, []);
  const shadowMat = useMemo(() => new THREE.ShaderMaterial({ ...shadowShader, uniforms: THREE.UniformsUtils.clone(shadowShader.uniforms), transparent: true, depthWrite: false, depthTest: false }), []);
  const shadow = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);

  const st = useRef({
    P: { x: 3, y: 6, z: 3, phi: rad(130), th: 0.2, psi: 0, s: 0.5 } as Pose,
    V: { x: 0, y: 0, z: 0, phi: 0, th: 0, psi: 0, s: 0 } as Pose,
    mode: 'follow' as 'follow' | 'flat' | 'around' | 'drop',
    w: 0, vz: 0, wth: 0, wphi: 0, wpsi: 0, restT: 0, t: 0,
    phiOff: 0, thWind: 0, psiOff: 0, pivot: new THREE.Vector3(),
    refY: 0, refV: 0, plY: 0, plV: 0, ink: -1, inkC: new THREE.Color(INKS[0].c), level: 1,
    lastWant: 'hold' as string, restClicked: false, first: true, landT: 0,
  });

  useEffect(() => () => { M.knurl.dispose(); }, [M]);
  useEffect(() => { gl.setClearColor(0x000000, 0); }, [gl]);

  const D = () => (size.height / UNIT / 2) / Math.tan(rad(FOV / 2));
  const toWorld = (px: number, py: number, z: number) => { const d = D(), k = (d - z) / d; return [((px - size.width / 2) / UNIT) * k, ((size.height / 2 - py) / UNIT) * k] as const; };
  const dirOf = (phi: number, th: number) => new THREE.Vector3(Math.cos(th) * Math.cos(phi), Math.cos(th) * Math.sin(phi), Math.sin(th));
  const tmpQ = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
  const ZA = new THREE.Vector3(0, 0, 1), XA = new THREE.Vector3(1, 0, 0), YA = new THREE.Vector3(0, 1, 0);
  const quatOf = (p: Pose, out: THREE.Quaternion) => out.copy(qa.setFromAxisAngle(ZA, p.phi - Math.PI / 2)).multiply(qb.setFromAxisAngle(XA, p.th)).multiply(qc.setFromAxisAngle(YA, p.psi));
  const project = (v: THREE.Vector3) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * size.width, (-p.y * 0.5 + 0.5) * size.height] as const; };

  useFrame((state, delta) => {
    const S = st.current, P = S.P, V = S.V;
    const cam = camera as THREE.PerspectiveCamera;
    const d = D();
    if (Math.abs(cam.position.z - d) > 1e-3 || cam.fov !== FOV) { cam.fov = FOV; cam.position.set(0, 0, d); cam.near = 1; cam.far = d + 40; cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); }
    const dt = Math.min(delta, 1 / 10);
    S.t += dt;
    const t = state.clock.elapsedTime;

    // Commands from the page.
    while (rig.cmds.length) {
      const c = rig.cmds.shift()!;
      if (c.t === 'click') { rig.retracted = !rig.retracted; S.plV -= 9; rig.on.click(rig.retracted); continue; }
      if (rig.want === 'write' || rig.want === 'draw') continue;
      if (c.trick === 'flat') { S.mode = 'flat'; S.w = c.power * c.dir; }
      else if (c.trick === 'around') { S.mode = 'around'; S.w = c.power * c.dir; S.pivot.set(P.x, P.y, P.z); }
      else { S.mode = 'drop'; S.vz = 3; S.wth = (Math.random() < 0.5 ? -1 : 1) * 2.2; S.wphi = (S.mode === 'drop' ? S.wphi : 0) + (Math.random() - 0.5) * 3; S.wpsi = 0; S.restT = 0; }
    }
    const busy = rig.want === 'write' || rig.want === 'draw';
    if (busy && S.mode !== 'follow') {
      if (S.mode === 'around') S.thWind = Math.round(P.th / TAU) * TAU;
      S.mode = 'follow';
    }

    // Targets.
    const T: Pose = { ...P };
    const h = rig.hold;
    if (rig.want === 'write' || rig.want === 'draw') {
      const s = rig.nib.len / UNIT / (2 * HALF);
      const lift = rig.nib.lift / UNIT;
      const [nx, ny] = toWorld(rig.nib.x, rig.nib.y, lift);
      const phi = rad(-36) + (rig.want === 'draw' ? 0 : Math.sin(t * 2.3) * 0.03), th = rad(52) + Math.sin(t * 1.7) * 0.02;
      const dv = dirOf(phi, th);
      Object.assign(T, { x: nx + dv.x * HALF * s, y: ny + dv.y * HALF * s, z: lift + dv.z * HALF * s, phi, th, psi: -1.25, s });
    } else if (rig.want === 'rest') {
      const s = rig.rest.len / UNIT / (2 * HALF);
      const [x, y] = toWorld(rig.rest.x, rig.rest.y, R * s);
      Object.assign(T, { x, y, z: R * s * 1.05, phi: rad(rig.rest.ang), th: 0.012, psi: -Math.PI / 2 + 0.25, s });
    } else {
      const s = h.len / UNIT / (2 * HALF);
      const idle = still ? 0 : h.idle;
      const z = h.z / UNIT + Math.sin(t * 0.9) * 0.08 * idle;
      const [x, y] = toWorld(h.x, h.y, z);
      Object.assign(T, { x, y, z, phi: rad(h.ang) + Math.sin(t * 0.21) * 0.22 * idle + S.phiOff, th: 0.2 + Math.sin(t * 0.47) * 0.07 * idle + S.thWind, psi: t * 0.42 * idle + S.psiOff, s });
    }
    // Angles take the short way round.
    T.phi = P.phi + wrap(T.phi - P.phi);
    if (rig.want !== 'hold') T.psi = P.psi + wrap(T.psi - P.psi);
    S.phiOff *= Math.exp(-0.5 * dt);

    const spring = (k: number, z: number, keys: readonly (keyof Pose)[] = KEYS) => {
      const c = 2 * Math.sqrt(k) * z;
      const n = 3, h2 = dt / n;
      for (let i = 0; i < n; i++) for (const key of keys) { V[key] += (k * (T[key] - P[key]) - c * V[key]) * h2; P[key] += V[key] * h2; }
    };

    if (S.mode === 'flat') {
      P.phi += S.w * dt;
      S.w *= Math.exp(-0.42 * dt);
      const wob = Math.min(1, Math.abs(S.w) / 16);
      T.th = 0.16 + 0.26 * wob * Math.sin(S.t * 6.5);
      T.psi = P.psi + S.w * 0.18 * dt;
      T.phi = P.phi; V.phi = 0;
      spring(70, 0.7, ['x', 'y', 'z', 'th', 's']);
      P.psi += S.w * 0.2 * dt;
      rig.on.whoosh(Math.abs(S.w));
      if (Math.abs(S.w) < 1.1) { S.mode = 'follow'; S.phiOff = wrap(P.phi - (rad(h.ang) + Math.sin(t * 0.21) * 0.22 * h.idle)); V.phi = S.w; }
    } else if (S.mode === 'around') {
      P.th += S.w * dt;
      S.w *= Math.exp(-0.5 * dt);
      const lift = HALF * T.s * 0.85 + 0.5;
      const a = HALF * T.s * 0.32;
      const dv = dirOf(P.phi, P.th);
      const tx = T.x + dv.x * a, ty = T.y + dv.y * a, tz = T.z + lift + dv.z * a;
      const k = 1 - Math.exp(-14 * dt);
      P.x += (tx - P.x) * k; P.y += (ty - P.y) * k; P.z += (tz - P.z) * k;
      P.phi += wrap(T.phi - P.phi) * (1 - Math.exp(-2 * dt));
      P.s += (T.s - P.s) * k;
      rig.on.whoosh(Math.abs(S.w) * 0.8);
      if (Math.abs(S.w) < 3.2) {
        // Catch it: finish the turn it is in.
        S.thWind = (S.w > 0 ? Math.ceil((P.th - 0.2) / TAU) : Math.floor((P.th - 0.2) / TAU)) * TAU;
        V.th = S.w; V.x = V.y = V.z = 0; S.mode = 'follow';
      }
    } else if (S.mode === 'drop') {
      const G = 34, r = R * P.s;
      S.vz -= G * dt; P.z += S.vz * dt;
      P.th += S.wth * dt; P.phi += S.wphi * dt; P.psi += S.wpsi * dt;
      const reach = Math.abs(Math.sin(P.th)) * HALF * P.s + r * Math.cos(P.th);
      const low = P.z - reach;
      if (low <= 0) {
        P.z -= low;
        if (S.vz < -0.4) {
          const hit = -S.vz;
          S.vz = hit * 0.3;
          S.wth = -Math.sign(Math.sin(P.th) || 1) * hit / (HALF * P.s) * 1.25 + (Math.random() - 0.5) * 0.6;
          S.wphi += (Math.random() - 0.5) * hit * 0.9;
          S.wpsi += (Math.random() - 0.5) * hit * 7;
          if (S.t - S.landT > 0.06) { rig.on.land(clamp(hit / 8)); S.landT = S.t; }
        } else S.vz = Math.max(0, S.vz);
        if (Math.abs(Math.sin(P.th)) < 0.08) { S.wth *= Math.exp(-10 * dt); P.th += (Math.round(P.th / Math.PI) * Math.PI - P.th) * (1 - Math.exp(-10 * dt)); }
        // Rolling: the pen travels sideways as it turns about its own axis.
        const v = S.wpsi * r;
        P.x += -Math.sin(P.phi) * v * dt; P.y += Math.cos(P.phi) * v * dt;
        S.wpsi *= Math.exp(-1.0 * dt); S.wphi *= Math.exp(-3.5 * dt);
        const hw = size.width / UNIT / 2 - 0.6, hh = size.height / UNIT / 2 - 0.6;
        if (Math.abs(P.x) > hw) { P.x = Math.sign(P.x) * hw; S.wpsi *= -0.5; }
        if (Math.abs(P.y) > hh) { P.y = Math.sign(P.y) * hh; S.wpsi *= -0.5; }
        if (Math.abs(S.vz) < 0.3 && Math.abs(S.wpsi) < 0.7) S.restT += dt; else S.restT = 0;
      }
      if (S.restT > 1.1 || S.t > 30) {
        // Picked back up.
        S.mode = 'follow'; S.phiOff = wrap(P.phi - (rad(h.ang) + Math.sin(t * 0.21) * 0.22 * h.idle)); S.thWind = Math.round(P.th / TAU) * TAU;
        if (Math.abs(wrap(P.th)) > 1.5) S.thWind = Math.round((P.th - Math.PI) / TAU) * TAU + Math.PI * 0;
        V.x = V.y = V.z = V.th = V.phi = V.psi = 0;
      }
    } else {
      // Follow: springs with a little overshoot. Once the nib has arrived at the paper, it is held there exactly.
      if (rig.want !== S.lastWant) { rig.arrived = false; }
      if (S.first) { Object.assign(P, T, { x: T.x + 4, y: T.y + 5, z: T.z + 4, phi: T.phi + 0.8 }); S.first = false; }
      if ((rig.want === 'write' && rig.arrived) || rig.want === 'draw' && rig.nib.lift < 40 && Math.hypot(P.x - T.x, P.y - T.y) < 0.4) {
        const k = rig.want === 'draw' ? 1 - Math.exp(-40 * dt) : 1;
        for (const key of KEYS) { P[key] += (T[key] - P[key]) * k; V[key] = 0; }
      } else {
        spring(rig.want === 'write' || rig.want === 'draw' ? 110 : 55, rig.want === 'write' ? 0.82 : 0.62);
      }
      if (S.thWind && Math.abs(P.th - T.th) < 0.02) { P.th -= S.thWind; S.thWind = 0; }
      if (rig.want === 'write' && !rig.arrived) {
        const nib = new THREE.Vector3(P.x, P.y, P.z).addScaledVector(dirOf(P.phi, P.th), -HALF * P.s);
        const [sx, sy] = project(nib);
        if (Math.hypot(sx - rig.nib.x, sy - rig.nib.y) < 5 && Math.abs(P.s - T.s) < T.s * 0.03) rig.arrived = true;
      }
    }
    S.lastWant = rig.want;
    if (rig.want === 'write' && rig.retracted && rig.arrived === false && !S.restClicked) { rig.cmds.push({ t: 'click' }); S.restClicked = true; }
    if (rig.want !== 'write') S.restClicked = false;
    // At the end the pen is put down and clicked shut.
    if (rig.want === 'rest' && !rig.retracted && Math.abs(P.z - T.z) < 0.05 && Math.abs(wrap(P.phi - T.phi)) < 0.05) rig.cmds.push({ t: 'click' });

    // Apply the pose.
    const g = group.current!;
    g.position.set(P.x, P.y, P.z);
    quatOf(P, g.quaternion);
    g.scale.setScalar(P.s);

    // Refill and plunger.
    const refT = rig.retracted ? 0.78 : 0, plT = rig.retracted ? 0.34 : 0;
    S.refV += (240 * (refT - S.refY) - 22 * S.refV) * dt; S.refY += S.refV * dt;
    S.plV += (420 * (plT - S.plY) - 18 * S.plV) * dt; S.plY += S.plV * dt;
    pen.refill.position.y = S.refY; pen.plunger.position.y = S.plY;
    // Ink colour and level.
    if (S.ink !== rig.ink) { S.ink = rig.ink; }
    S.inkC.lerp(new THREE.Color(INKS[rig.ink].c), 1 - Math.exp(-8 * dt));
    M.ink.color.copy(S.inkC); M.ink.emissive.copy(S.inkC); M.plunger.color.copy(S.inkC);
    S.level += (rig.level[rig.ink] - S.level) * (1 - Math.exp(-3 * dt));
    pen.inkCol.scale.y = 9.3 * S.level;

    // Motion blur: ghosts fanned back along the spin.
    const sp = S.mode === 'flat' || S.mode === 'around' ? Math.abs(S.w) : 0;
    const amt = clamp((sp - 7) / 14);
    ghosts.forEach((m, i) => {
      m.visible = amt > 0.01;
      if (!m.visible) return;
      const u = (i + 1) / (ghosts.length + 1);
      const Q: Pose = { ...P };
      if (S.mode === 'flat') Q.phi -= S.w * u * 0.07;
      else { Q.th -= S.w * u * 0.07; const a = HALF * P.s * 0.32; const d0 = dirOf(P.phi, P.th), d1 = dirOf(Q.phi, Q.th); Q.x += (d1.x - d0.x) * a; Q.y += (d1.y - d0.y) * a; Q.z += (d1.z - d0.z) * a; }
      m.position.set(Q.x, Q.y, Q.z); quatOf(Q, m.quaternion); m.scale.setScalar(P.s);
      (m.material as THREE.MeshBasicMaterial).opacity = amt * 0.22 * (1 - u);
    });

    // The clip's glint: bright when its face turns to the key light.
    const n = new THREE.Vector3(1, 0, 0).applyQuaternion(g.quaternion);
    const half = new THREE.Vector3(-0.45, 0.5, 1.6).normalize();
    const gl1 = Math.pow(Math.max(0, n.dot(half)), 18);
    const tip = new THREE.Vector3(0.8, 3.6, 0).multiplyScalar(1).applyQuaternion(g.quaternion).multiplyScalar(P.s).add(g.position);
    glint.position.copy(tip).add(new THREE.Vector3(0, 0, 0.3));
    glint.scale.setScalar(P.s * 3.4 * (0.4 + gl1));
    (glint.material as THREE.SpriteMaterial).opacity = gl1 * 0.95;

    // Shadow: the two ends of the axis, dropped to the paper.
    const dv = dirOf(P.phi, P.th);
    const A = new THREE.Vector3(P.x, P.y, P.z).addScaledVector(dv, -HALF * P.s), B = new THREE.Vector3(P.x, P.y, P.z).addScaledVector(dv, HALF * P.s);
    const sm = shadowMat.uniforms;
    sm.uA.value.set(A.x, A.y, A.z - R * P.s * 0.2); sm.uB.value.set(B.x, B.y, B.z - R * P.s);
    sm.uR.value = R * P.s * 0.92; sm.uK.value = Math.max(0.6, P.s * 2);
    if (shadow.current) shadow.current.scale.set(size.width / UNIT * 1.2, size.height / UNIT * 1.2, 1);

    // Tell the page where the pen is.
    const [cx, cy] = project(new THREE.Vector3(P.x, P.y, P.z));
    const [tx, ty] = project(A), [ex, ey] = project(B);
    Object.assign(rig.screen, { cx, cy, tx, ty, ex, ey, len: Math.hypot(ex - tx, ey - ty), busy: S.mode !== 'follow' });
  });

  return (
    <>
      <mesh ref={shadow} renderOrder={-1} material={shadowMat}><planeGeometry args={[1, 1]} /></mesh>
      <group ref={group}><primitive object={pen.root} /></group>
      {ghosts.map((m, i) => <primitive key={i} object={m} />)}
      <primitive object={glint} />
    </>
  );
}

export default function Scene() {
  const low = isPhone();
  return (
    <Canvas
      className="pn-gl"
      dpr={low ? [1, 1.4] : [1, 1.6]}
      gl={{ alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, position: [0, 0, 30], near: 1, far: 80 }}
      frameloop={still ? 'demand' : 'always'}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[-5, 6, 10]} intensity={1.6} color="#fff6e8" />
      <directionalLight position={[6, -4, 3]} intensity={0.5} color="#dfe6ff" />
      <Environment resolution={low ? 128 : 256} frames={1}>
        <Lightformer form="rect" intensity={6} color="#fff6ea" position={[-6, 5, 9]} scale={[10, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[9, -2, 5]} scale={[2, 14, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color="#f1ece0" position={[0, 0, -9]} scale={[40, 40, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={2.5} color="#ffffff" position={[3, 7, 7]} scale={2.2} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, -9, 6]} scale={[14, 1.4, 1]} target={[0, 0, 0]} />
      </Environment>
      <Pen />
    </Canvas>
  );
}
