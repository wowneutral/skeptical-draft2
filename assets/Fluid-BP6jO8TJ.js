import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{a as t,d as n,l as r,n as i,o as a,t as o}from"./jsx-runtime-BAJ4K1lj.js";import{a as s,s as c,t as l}from"./react-three-fiber.esm-DZF78O6x.js";import{Ar as u,L as d,Li as f,Rn as p,Tn as m,ga as h,io as g,jr as _,no as v,pr as y,ro as b,tr as x}from"./three.core-BF58tRDi.js";import{t as S}from"./ContactShadows-BqlZoyBu.js";import{t as C}from"./Environment-Dnmuokyo.js";import{t as w}from"./Lightformer-C8-2AUF3.js";import{t as T}from"./marks-Ce1ST7vc.js";import{t as E}from"./store-D7VQ-wOd.js";var D=e(n(),1),O=o(),k=.115,A={x:0,y:0,on:!1};function j(){let e=document.createElement(`canvas`);e.width=e.height=256;let t=e.getContext(`2d`);t.fillStyle=`#000`,t.fillRect(0,0,256,256);let n=T.italic,r=189.44/n.h;t.filter=`blur(5px)`,t.setTransform(r,0,0,r,132,128),t.fillStyle=`#fff`,t.fill(new Path2D(n.d));let i=new d(e);return i.colorSpace=``,i.minFilter=p,i.magFilter=p,i.generateMipmaps=!1,i}var M=`
uniform vec4 uP[10];
uniform vec3 uHand;
uniform vec3 uLean;
uniform vec2 uVel;
uniform sampler2D uGlyph;
uniform float uGlyphS;
uniform float uFront;
uniform float uSpace;
varying float vSpike;
varying vec2 vLocal;

float fieldAt(vec2 p) {
  vec2 d = p - uHand.xy;
  float f = uHand.z * exp(-dot(d, d) / 0.13);
  for (int i = 0; i < 10; i++) {
    vec2 e = p - uP[i].xy;
    f += uP[i].z * exp(-dot(e, e) / (uP[i].w * uP[i].w));
  }
  vec2 l = p - uLean.xy;
  f += uLean.z * exp(-dot(l, l) / 0.16);
  vec2 uv = p * 0.5 + 0.5;
  float down = 1.0 - uv.y;
  float shown = 1.0 - smoothstep(uFront - 0.06, uFront + 0.015, down);
  f += texture2D(uGlyph, uv).r * uGlyphS * shown * 1.15;
  return f * smoothstep(1.0, 0.8, length(p));
}

float spikeAt(vec2 p, float f) {
  vec2 q = p / uSpace;
  vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(q, s) - 0.5 * s;
  vec2 b = mod(q - 0.5 * s, s) - 0.5 * s;
  vec2 l = dot(a, a) < dot(b, b) ? a : b;
  float amp = smoothstep(0.16, 0.85, f);
  float base = 0.44 + 0.1 * amp;
  float c = clamp(1.0 - length(l) / base, 0.0, 1.0);
  return pow(c, 2.8) * amp * (0.15 + 0.1 * min(f, 1.6));
}

float heightAt(vec2 p, out float spike, out float f) {
  f = fieldAt(p);
  spike = spikeAt(p, f);
  return 0.045 * min(f, 1.6) + spike;
}
`,N=`
vec2 P = position.xy;
float sp0, f0, sp1, f1, sp2, f2, sp3, f3, sp4, f4;
float e = 0.0035;
float h0 = heightAt(P, sp0, f0);
float hx1 = heightAt(P + vec2(e, 0.0), sp1, f1);
float hx0 = heightAt(P - vec2(e, 0.0), sp2, f2);
float hy1 = heightAt(P + vec2(0.0, e), sp3, f3);
float hy0 = heightAt(P - vec2(0.0, e), sp4, f4);
vec3 objectNormal = normalize(vec3(-(hx1 - hx0) / (2.0 * e), -(hy1 - hy0) / (2.0 * e), 1.0));
vec2 grad = vec2(f1 - f2, f3 - f4) / (2.0 * e);
vec2 tilt = grad / (length(grad) + 2.0) * 0.4 - uVel * 0.6;
vSpike = sp0;
vLocal = P;
vec3 displaced = vec3(P + tilt * sp0, h0);
`;function P({segs:e}){let n=(0,D.useMemo)(j,[]),a=(0,D.useMemo)(()=>({uP:{value:Array.from({length:10},()=>new g(0,0,0,.2))},uHand:{value:new b},uLean:{value:new b},uVel:{value:new v},uGlyph:{value:n},uGlyphS:{value:0},uFront:{value:0},uSpace:{value:.068}}),[n]),o=(0,D.useMemo)(()=>{let e=new y({color:`#050505`,roughness:.035,metalness:0,clearcoat:1,clearcoatRoughness:.02,specularIntensity:.6,ior:1.5,envMapIntensity:.95});return e.onBeforeCompile=e=>{Object.assign(e.uniforms,a),e.vertexShader=M+e.vertexShader.replace(`#include <beginnormal_vertex>`,N).replace(`#include <begin_vertex>`,`vec3 transformed = displaced;`),e.fragmentShader=`varying float vSpike;
varying vec2 vLocal;
`+e.fragmentShader.replace(`#include <clipping_planes_fragment>`,`#include <clipping_planes_fragment>
if (length(vLocal) > 1.0) discard;`)},e},[a]),l=(0,D.useMemo)(()=>new _(2.02,2.02,e,e),[e]),{camera:d}=c(),p=(0,D.useMemo)(()=>new f,[]),m=(0,D.useMemo)(()=>new u(new b(0,1,0),-.115),[]),h=(0,D.useMemo)(()=>new b,[]),x=(0,D.useMemo)(()=>new v,[]),S=(0,D.useRef)({hx:0,hz:0,hvx:0,hvz:0,hs:0,hsv:0,lx:0,lz:0,ls:0,pts:Array.from({length:10},()=>({x:0,z:0,s:0,r:.22})),g:0,front:0,t:0,vx:0,vz:0}),C=(e,t)=>(x.set(e/window.innerWidth*2-1,-(t/window.innerHeight)*2+1),p.setFromCamera(x,d),p.ray.intersectPlane(m,h)?{x:h.x,z:h.z}:null);return s((e,n)=>{let o=Math.min(n,.1),s=S.current;if(s.t+=o,r)return;let c=s.hx,l=s.hz,u=0,f=E.hand;if(f.seen)c=f.x,l=f.z,u=f.on;else if(A.on&&(x.set(A.x,A.y),p.setFromCamera(x,d),p.ray.intersectPlane(m,h))){let e=Math.hypot(h.x,h.z);c=h.x,l=h.z,u=i((1.75-e)/.6)}let g=i((s.t-.9)/2.6);g>0&&g<1&&u<.1&&(c=-1.1+2.2*g,l=.25-.5*g,u=Math.sin(Math.PI*g)*1.05);let _=9.5,v=Math.max(1,Math.ceil(o/(1/120))),y=o/v;for(let e=0;e<v;e++){let e=55*(c-s.hx)-_*s.hvx,t=55*(l-s.hz)-_*s.hvz;s.hvx+=e*y,s.hvz+=t*y,s.hx+=s.hvx*y,s.hz+=s.hvz*y;let n=38*(u-s.hs)-6.5*s.hsv;s.hsv+=n*y,s.hs=Math.max(0,s.hs+s.hsv*y)}s.vx=t(s.vx,i(s.hvx*.12,-.5,.5),6,o),s.vz=t(s.vz,i(s.hvz*.12,-.5,.5),6,o);for(let e=0;e<10;e++){let n=s.pts[e],r=E.pts[e];r.s>.01&&(n.x=t(n.x,r.x,4,o),n.z=t(n.z,r.z,4,o),n.r=t(n.r,r.r,4,o)),n.s=t(n.s,r.s,r.s>n.s?2.6:3.4,o),a.uP.value[e].set(n.x,-n.z,n.s,n.r)}let b=E.lean,w=0;if(b.s>0){let e=C(b.x,b.z);if(e){let n=Math.hypot(e.x,e.z)||1,r=Math.min(n,.78);s.lx=t(s.lx,e.x/n*r,5,o),s.lz=t(s.lz,e.z/n*r,5,o),w=b.s}}s.ls=t(s.ls,w,w>s.ls?3:4,o),s.g=t(s.g,E.glyphOn,E.glyphOn>s.g?2.2:2.8,o),s.front=t(s.front,E.glyph,5,o),a.uHand.value.set(s.hx,-s.hz,s.hs),a.uVel.value.set(s.vx,-s.vz),a.uLean.value.set(s.lx,-s.lz,s.ls*1.1),a.uGlyphS.value=s.g,a.uFront.value=s.front*1.08}),(0,O.jsx)(`mesh`,{geometry:l,material:o,"rotation-x":-Math.PI/2,"position-y":k,frustumCulled:!1})}function F(){let e=(0,D.useMemo)(()=>{let e=[[0,.07],[.6,.07],[.92,.075],[1,.09],[1.05,.13],[1.085,.18],[1.11,.205],[1.14,.212],[1.17,.2],[1.185,.175],[1.18,.13],[1.155,.07],[1.1,.025],[.98,.006],[.84,0]].map(([e,t])=>new v(e,t)),t=new h(e).getPoints(90);t.push(new v(1e-4,0));let n=new m(t,160);return n.computeVertexNormals(),n},[]);return(0,O.jsx)(`mesh`,{geometry:e,castShadow:!0,receiveShadow:!0,children:(0,O.jsx)(`meshPhysicalMaterial`,{color:`#efe9dd`,roughness:.42,clearcoat:.7,clearcoatRoughness:.16,sheen:.3,sheenColor:`#fff7ea`})})}function I(){let{camera:e,size:n}=c(),i=e,a=(0,D.useRef)({side:E.side,top:E.top,ready:!1}),o=(0,D.useRef)(0),l=c(e=>e.scene);return s((e,s)=>{let c=Math.min(s,.1),u=a.current,d=!u.ready;u.ready=!0,u.side=d||r?E.side:t(u.side,E.side,2.6,c),u.top=d||r?E.top:t(u.top,E.top,2.2,c);let f=n.width<=820,p=n.width/n.height,m=x.degToRad(27+43*u.top),h=2.5/(f?.9:.55-.12*u.side)/Math.min(p,1.7)/(2*Math.tan(x.degToRad(i.fov/2)));i.position.set(0,Math.sin(m)*h,Math.cos(m)*h),i.lookAt(0,.08,0);let g=f?.5:.5+.22*u.side,_=f?.64-.14*u.side:.63-.08*u.side;i.setViewOffset(n.width,n.height,-(g-.5)*n.width,-(_-.5)*n.height,n.width,n.height),i.updateProjectionMatrix(),o.current=r?E.strip:t(o.current,E.strip,3,c),l.environmentRotation.set(o.current*.6,0,.12-o.current*.24),l.backgroundRotation.copy(l.environmentRotation)}),null}function L(){(0,D.useEffect)(()=>{let e=(e,t)=>{A.x=e/window.innerWidth*2-1,A.y=-(t/window.innerHeight)*2+1,A.on=!0},t=t=>{(t.pointerType===`mouse`||t.pointerType===`pen`)&&e(t.clientX,t.clientY)},n=t=>{let n=t.touches[0];n&&e(n.clientX,n.clientY)},r=()=>{A.on=!1},i=e=>{e.relatedTarget||(A.on=!1)};return window.addEventListener(`pointermove`,t,{passive:!0}),window.addEventListener(`touchstart`,n,{passive:!0}),window.addEventListener(`touchmove`,n,{passive:!0}),window.addEventListener(`touchend`,r,{passive:!0}),window.addEventListener(`touchcancel`,r,{passive:!0}),document.addEventListener(`mouseout`,i),window.addEventListener(`blur`,r),()=>{window.removeEventListener(`pointermove`,t),window.removeEventListener(`touchstart`,n),window.removeEventListener(`touchmove`,n),window.removeEventListener(`touchend`,r),window.removeEventListener(`touchcancel`,r),document.removeEventListener(`mouseout`,i),window.removeEventListener(`blur`,r)}},[])}function R(){let e=c(e=>e.invalidate);return(0,D.useEffect)(()=>{if(!r)return;let t=()=>e();return window.addEventListener(`scroll`,t,{passive:!0}),window.addEventListener(`resize`,t),()=>{window.removeEventListener(`scroll`,t),window.removeEventListener(`resize`,t)}},[e]),null}function z({onReady:e}){let t=(0,D.useRef)(0);return s(()=>{t.current++,t.current===3&&e()}),null}function B({onReady:e}){L();let t=a();return(0,O.jsxs)(l,{dpr:[1,1.6],frameloop:r?`demand`:`always`,gl:{antialias:!0,alpha:!0,powerPreference:`high-performance`},camera:{fov:18,near:.5,far:80,position:[0,3,10]},shadows:{type:1},style:{touchAction:`pan-y`,pointerEvents:`none`},onCreated:({gl:e})=>{e.toneMapping=6,e.toneMappingExposure=1.05},children:[(0,O.jsx)(I,{}),(0,O.jsx)(F,{}),(0,O.jsx)(P,{segs:t?260:400}),(0,O.jsx)(S,{position:[0,.001,0],scale:4.2,blur:2.2,opacity:.62,far:1.2,resolution:512,frames:1,color:`#2b2418`}),(0,O.jsx)(S,{position:[0,.002,0],scale:2.8,blur:.7,opacity:.5,far:.25,resolution:512,frames:1,color:`#1b160e`}),(0,O.jsx)(`directionalLight`,{position:[1.5,6,2],intensity:1.6,color:`#fff8ee`}),(0,O.jsx)(`hemisphereLight`,{args:[`#fffaf0`,`#b8b0a0`,.7]}),(0,O.jsx)(`ambientLight`,{intensity:.25,color:`#efe8da`}),(0,O.jsxs)(C,{resolution:256,frames:1,children:[(0,O.jsxs)(`mesh`,{scale:40,children:[(0,O.jsx)(`sphereGeometry`,{args:[1,32,16]}),(0,O.jsx)(`meshBasicMaterial`,{color:`#0d0c0a`,side:1})]}),(0,O.jsx)(w,{form:`rect`,intensity:4,color:`#fffaf0`,position:[0,9,0],"rotation-x":Math.PI/2,scale:[4.2,4.2,1]}),(0,O.jsx)(w,{form:`rect`,intensity:7,color:`#ffffff`,position:[0,5.5,-8],scale:[26,.5,1]}),(0,O.jsx)(w,{form:`rect`,intensity:3.2,color:`#fff6ea`,position:[-9,3,2],"rotation-y":Math.PI/2,scale:[1.2,10,1]}),(0,O.jsx)(w,{form:`rect`,intensity:1.1,color:`#e8e4da`,position:[0,2,14],"rotation-y":Math.PI,scale:[40,8,1]}),(0,O.jsx)(w,{form:`rect`,intensity:1.6,color:`#fff8ee`,position:[6,5,6],"rotation-y":-Math.PI/4,scale:[3,3,1]})]}),(0,O.jsx)(R,{}),(0,O.jsx)(z,{onReady:e})]})}export{B as default};