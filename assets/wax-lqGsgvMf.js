import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{c as t,d as n,l as r,n as i,o as a,t as o}from"./jsx-runtime-BAJ4K1lj.js";import{t as s}from"./gsap-Dm7UF3sG.js";/* empty css             */import{F as c,Qi as l,Rn as u,U as d,V as f,Wn as p,Yt as m,ar as h,ea as g,ft as _,io as v,jr as y,no as b,ro as x,ta as ee,zi as te}from"./three.core-BF58tRDi.js";/* empty css                    *//* empty css                       */import{a as S,c as C,i as w,l as T,n as E,o as D,r as O,s as k,t as A}from"./content-D8DUqlkw.js";import{t as j}from"./marks-Ce1ST7vc.js";import"./scroll-CIxM5NtI.js";import{n as M,t as N}from"./motion-66kFq4QZ.js";import{t as P}from"./version-O83IIjLl.js";import{o as ne}from"./three.module-ChJkI3a6.js";var F=e(n(),1),I=-560,L=-840,R=1120,z=1680,B=1e3;function V(e,t,n,r,i){let a=0;r[0]=0,i[0]=-1/0,i[1]=1/0;for(let n=1;n<t;n++){let t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);for(;t<=i[a];)a--,t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);a++,r[a]=n,i[a]=t,i[a+1]=1/0}a=0;for(let o=0;o<t;o++){for(;i[a+1]<o;)a++;n[o]=(o-r[a])*(o-r[a])+e[r[a]]}}function H(e){let t=new Float64Array(600),n=new Float64Array(600),r=new Int32Array(600),i=new Float64Array(601);for(let a=0;a<400;a++){for(let n=0;n<600;n++)t[n]=e[n*400+a];V(t,600,n,r,i);for(let t=0;t<600;t++)e[t*400+a]=n[t]}for(let a=0;a<600;a++){for(let n=0;n<400;n++)t[n]=e[a*400+n];V(t,400,n,r,i);for(let t=0;t<400;t++)e[a*400+t]=Math.sqrt(n[t])}}function re(){let e=document.createElement(`canvas`);e.width=400,e.height=600;let t=e.getContext(`2d`,{willReadFrequently:!0}),n=400/R;t.setTransform(n,0,0,n,560*n,840*n),t.fillStyle=`#fff`,t.fill(new Path2D(j.roman.d));let r=t.getImageData(0,0,400,600).data,i=0x56bc75e2d63100000,a=new Float64Array(24e4),o=new Float64Array(24e4),s=400,c=0,l=600,u=0,d=new Float32Array(24e4);for(let e=0;e<24e4;e++){let t=r[e*4+3]/255;d[e]=t;let n=t>.5;if(o[e]=n?0:i,a[e]=n?i:0,n){let t=e%400,n=e/400|0;t<s&&(s=t),t>c&&(c=t),n<l&&(l=n),n>u&&(u=n)}}H(o),H(a);let f=new Float32Array(24e4),p=R/400/B;for(let e=0;e<24e4;e++){let t=o[e]>0?o[e]-.5:-(a[e]-.5),n=Math.abs(t)<1.2?.5-d[e]:t;f[e]=n*p}let m=(u+1)/n+L,h=(s+c+1)/2/n+I,g=0,_=0,v=u-(u-l)*.12;for(let e=Math.floor(v);e<=u;e++)for(let t=s;t<=c;t++)d[e*400+t]>.5&&(g+=t,_++);let y=((_?g/_:(s+c)/2)/n+I-h)/B;return{data:f,base:m,offX:h,height:(u-l+1)/n/B,dotX:y}}function U(e,t,n){let r=t*B+e.offX,i=e.base-n*B,a=(r-I)/R,o=(i-L)/z,s=Math.min(.998,Math.max(.002,a)),c=Math.min(.998,Math.max(.002,o)),l=s*400-.5,u=c*600-.5,d=Math.max(0,Math.floor(l)),f=Math.max(0,Math.floor(u)),p=Math.min(399,d+1),m=Math.min(599,f+1),h=l-d,g=u-f,_=e.data,v=_[f*400+d]*(1-h)+_[f*400+p]*h,y=_[m*400+d]*(1-h)+_[m*400+p]*h;return v*(1-g)+y*g+Math.hypot((a-s)*R/B,(o-c)*z/B)}function ie(e){let t=new Float32Array(1),n=new Int32Array(t.buffer);t[0]=e;let r=n[0],i=r>>16&32768,a=(r>>23&255)-127+15,o=r&8388607;return a<=0?i:a>=31?i|31744:i|a<<10|o>>13}var ae=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,oe=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec3 uCam, uCX, uCY, uCZ;
uniform float uTan;
uniform vec2 uShift;
uniform float uBase, uOffX;
uniform float uMelt, uLean, uPool, uCool, uLamp, uHandK;
uniform vec2 uPoolC;
uniform vec3 uHand;
uniform vec4 uDent[6];
uniform vec4 uBA[10];
uniform vec4 uBB[10];
uniform vec3 uBg;
uniform float uEdge;

const float HALF = 0.105;
const float RR = 0.03;

float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

float g2(vec2 p) {
  vec2 f = vec2(p.x * 1000.0 + uOffX, uBase - p.y * 1000.0);
  vec2 uv = (f - vec2(-560.0, -840.0)) / vec2(1120.0, 1680.0);
  vec2 c = clamp(uv, 0.002, 0.998);
  float d = texture2D(uTex, c).r;
  return d + length((uv - c) * vec2(1.12, 1.68));
}

// heat in, shape out: where the point at p would have been in the cold mark
vec3 warp(vec3 p, out float heat, out float rr) {
  float m = uMelt;
  float y = max(p.y, 0.0);
  vec3 q = p;
  float sp = exp(-y * 6.0);
  q.x = q.x / (1.0 + m * 1.3 * sp);
  q.z = q.z / (1.0 + m * 2.6 * sp);
  q.x -= uLean * y * y;
  q.z -= uLean * 0.55 * y * y;
  float m2 = m * m;
  q.y = y * (1.0 + 9.0 * m2 * m2 * m) + (1.0 * m2 + 14.0 * m2 * m2 * m2 * m) * y * y + min(p.y, 0.0);
  heat = m;
  rr = RR + m * 0.03;
  for (int i = 0; i < 6; i++) {
    vec4 d = uDent[i];
    if (d.w < 0.001) continue;
    vec2 dd = q.xy - d.xy;
    float f = exp(-dot(dd, dd) * 14.0);
    float below = smoothstep(0.45, -0.05, d.y - q.y);
    float a = d.w * f;
    q.y += a * 0.24 * below;
    q.x = d.x + (q.x - d.x) / (1.0 + a * 0.35);
    q.z /= 1.0 + a * 0.45;
    rr += a * 0.035;
    heat += a;
  }
  return q;
}

float wax(vec3 p, out float heat) {
  float rr;
  vec3 q = warp(p, heat, rr);
  float d2 = g2(q.xy) + rr;
  vec2 w = vec2(d2, abs(q.z) - HALF + rr);
  float d = min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - rr;
  for (int i = 0; i < 10; i++) {
    vec4 a = uBA[i]; vec4 b = uBB[i];
    if (b.w < 0.5) continue;
    vec3 pa = q - a.xyz; vec3 ba = b.xyz - a.xyz;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float db = length(pa - ba * h) - a.w * mix(0.6, 1.0, h * h);
    d = smin(d, db, 0.03);
  }
  d *= 0.62;
  vec2 pc = p.xz - uPoolC;
  float ang = atan(pc.y, pc.x);
  float R = uPool * (1.0 + 0.07 * sin(3.0 * ang + 1.3) + 0.045 * sin(5.0 * ang + 4.1) + 0.02 * sin(9.0 * ang + 0.7));
  float t = 0.006 + uPool * 0.03;
  float dp = length(vec2(max(length(pc) - max(R - t, 0.0), 0.0), p.y)) - t;
  return smin(d, dp, 0.05 + 0.1 * uMelt);
}

float waxd(vec3 p) { float h; return wax(p, h); }

vec3 normal(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.0032;
  return normalize(e.xyy * waxd(p + e.xyy) + e.yyx * waxd(p + e.yyx) + e.yxy * waxd(p + e.yxy) + e.xxx * waxd(p + e.xxx));
}

float shadow(vec3 ro, vec3 rd, float k) {
  float res = 1.0, t = 0.015;
  for (int i = 0; i < 30; i++) {
    float h = waxd(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.012, 0.18);
    if (res < 0.003 || t > 3.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float occ(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.025 * float(i * i) * 0.6;
    o += (h - waxd(p + n * h)) * s;
    s *= 0.62;
  }
  return clamp(1.0 - 2.4 * o, 0.0, 1.0);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return noise(p) * 0.5 + noise(p * 2.13 + 7.1) * 0.27 + noise(p * 4.7 + 1.3) * 0.15 + noise(p * 11.0) * 0.08; }

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  vec2 frag = gl_FragCoord.xy / uRes;
  vec2 ndc = frag * 2.0 - 1.0 + uShift;
  float asp = uRes.x / uRes.y;
  vec3 ro = uCam;
  vec3 rd = normalize(uCZ + ndc.x * uTan * asp * uCX + ndc.y * uTan * uCY);

  // the lamp: warm, high, front left; at Join it cools
  vec3 LP = vec3(-3.1, 3.3, 1.5);
  vec3 spotDir = normalize(vec3(0.05, 0.45, 0.0) - LP);
  vec3 keyCol = mix(vec3(1.0, 0.79, 0.57), vec3(0.82, 0.88, 1.0), uCool) * mix(3.2, 2.7, uCool) * uLamp;
  vec3 rimCol = vec3(0.32, 0.42, 0.62) * 0.55 * uLamp;
  vec3 RD = normalize(vec3(2.4, 1.5, -2.6));
  vec3 handCol = vec3(1.0, 0.55, 0.26) * uHandK * 0.9;

  // floor and box
  float tf = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  vec3 bmin = vec3(-1.6, -0.05, -1.6), bmax = vec3(1.6, 1.95, 1.6);
  vec3 ia = (bmin - ro) / rd, ib = (bmax - ro) / rd;
  vec3 tmin3 = min(ia, ib), tmax3 = max(ia, ib);
  float t0 = max(max(tmin3.x, tmin3.y), tmin3.z), t1 = min(min(tmax3.x, tmax3.y), tmax3.z);
  float hit = -1.0;
  if (t1 > max(t0, 0.0)) {
    float t = max(t0, 0.0);
    float tend = min(t1, tf + 0.02);
    for (int i = 0; i < 110; i++) {
      float h = waxd(ro + rd * t);
      if (h < 0.0006 * t) { hit = t; break; }
      t += h;
      if (t > tend) break;
    }
  }

  vec3 col = vec3(0.0);
  float vis = 0.0;
  if (hit > 0.0) {
    vec3 p = ro + rd * hit;
    float heat; wax(p, heat);
    vec3 n = normal(p);
    vec3 v = -rd;
    vec3 l = normalize(LP - p);
    vec3 lv = LP - p;
    float spot = smoothstep(0.84, 0.97, dot(-l, spotDir)) * 20.0 / dot(lv, lv);
    float sh = shadow(p + n * 0.006, l, 7.0);
    float ao = occ(p, n);
    float hh = clamp(heat * 1.2, 0.0, 1.0);
    vec3 alb = vec3(0.80, 0.76, 0.67) * mix(0.8, 1.0, hh);
    // wax lets light wrap past the terminator, red furthest
    float ndl = dot(n, l);
    vec3 wrapW = vec3(0.48, 0.30, 0.2);
    vec3 diff = clamp((vec3(ndl) + wrapW) / (1.0 + wrapW), 0.0, 1.0);
    diff *= mix(vec3(1.0), vec3(sh), vec3(0.78, 0.86, 0.9));
    // thin edges glow warm
    float d1 = -waxd(p - n * 0.045), d2 = -waxd(p - n * 0.11);
    float thin = clamp(1.0 - (d1 / 0.045 * 0.5 + d2 / 0.11 * 0.5), 0.0, 1.0);
    float back = pow(clamp(dot(v, -l) * 0.6 + 0.55, 0.0, 1.0), 2.0);
    vec3 sss = vec3(1.0, 0.5, 0.2) * thin * (0.4 + 1.1 * back) * mix(0.6, 1.0, sh);
    // satin: a broad soft highlight that tightens where the wax is warm
    vec3 hv = normalize(l + v);
    float spec = pow(max(dot(n, hv), 0.0), mix(14.0, 70.0, hh)) * mix(0.07, 0.4, hh) * sh;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    vec3 rim = rimCol * max(dot(n, RD), 0.0) * (0.35 + 1.4 * fres);
    vec3 hl = uHand - p; float hd = length(hl); hl /= hd;
    vec3 hand = handCol * alb * (clamp((dot(n, hl) + 0.5) / 1.5, 0.0, 1.0) + thin * 0.6) / (1.0 + hd * hd * 9.0);
    vec3 amb = alb * (vec3(0.035, 0.032, 0.03) + keyCol * 0.018 * clamp(0.5 - n.y * 0.5, 0.0, 1.0)) * ao;
    col = keyCol * (alb * diff * spot + sss * alb * spot + vec3(spec) * spot) * mix(0.55, 1.0, ao) + rim * ao + hand + amb + fres * 0.03 * keyCol * ao * spot;
    vis = 1.0;
  } else if (tf < 30.0) {
    vec3 p = ro + rd * tf;
    vec3 n = vec3(0.0, 1.0, 0.0);
    vec3 v = -rd;
    vec3 l = normalize(LP - p);
    float spot = smoothstep(0.925, 0.99, dot(-l, spotDir));
    float near = length(p.xz - vec2(0.0, 0.0));
    float sh = near < 2.4 ? shadow(p + n * 0.003, l, 5.0) : 1.0;
    float ao = near < 1.9 ? occ(p, n) : 1.0;
    float grain = fbm(p.xz * 3.2);
    float vein = smoothstep(0.62, 0.75, fbm(p.xz * 1.1 + vec2(grain * 1.6, 0.0)));
    vec3 alb = vec3(0.016, 0.015, 0.014) * (0.7 + 0.6 * grain) + vec3(0.012) * vein;
    float ndl = max(dot(n, l), 0.0);
    vec3 r = reflect(-v, n);
    float gl = pow(max(dot(r, l), 0.0), 40.0) * 0.05 * (0.6 + 0.8 * grain);
    vec3 hl = uHand - p; float hd = length(hl);
    vec3 hand = handCol * alb * 6.0 * max(hl.y / hd, 0.0) / (1.0 + hd * hd * 9.0);
    col = keyCol * (alb * ndl * 1.8 + vec3(gl)) * spot * sh * ao + hand + alb * 0.08 * ao;
    float fade = exp(-max(tf - 7.0, 0.0) * 0.45);
    vis = fade * smoothstep(2.1, 0.45, length(p.xz - vec2(0.15, 0.1)));
  }

  col = aces(col * 1.05);
  col = pow(col, vec3(1.0 / 2.2));
  // light added onto the page colour, fading out at the canvas edges
  vec2 e = smoothstep(vec2(0.0), vec2(uEdge), frag) * smoothstep(vec2(0.0), vec2(uEdge), 1.0 - frag);
  vis *= mix(1.0, e.x * e.y, 1.0);
  col = 1.0 - (1.0 - uBg) * (1.0 - col * vis);
  gl_FragColor = vec4(col, 1.0);
}
`,se=.105,ce=.03,W=[14/255,12/255,10/255],G=e=>(e=Math.min(1,Math.max(0,e)),e*e*(3-2*e));function K(e,t){let n=re(),r=new ne({canvas:e,antialias:!1,alpha:!1,powerPreference:`high-performance`});r.setClearColor(new d().setRGB(W[0],W[1],W[2],l)),r.outputColorSpace=p;let i=new Uint16Array(24e4);for(let e=0;e<24e4;e++)i[e]=ie(n.data[e]);let a=new _(i,400,600,te,m);a.minFilter=a.magFilter=u,a.wrapS=a.wrapT=f,a.flipY=!1,a.generateMipmaps=!1,a.needsUpdate=!0;let o=[],s=[],S=e=>Array.from({length:e},()=>new v),C={uTex:{value:a},uRes:{value:new b(1,1)},uCam:{value:new x},uCX:{value:new x},uCY:{value:new x},uCZ:{value:new x},uTan:{value:.14},uShift:{value:new b},uBase:{value:n.base},uOffX:{value:n.offX},uMelt:{value:0},uLean:{value:0},uPool:{value:0},uCool:{value:0},uLamp:{value:+!!t.still},uHandK:{value:0},uPoolC:{value:new b(n.dotX,0)},uHand:{value:new x(0,.8,.6)},uDent:{value:S(6)},uBA:{value:S(10)},uBB:{value:S(10)},uBg:{value:new x(W[0],W[1],W[2])},uEdge:{value:.08}},w=new ee({vertexShader:ae,fragmentShader:oe,uniforms:C,depthTest:!1,depthWrite:!1}),T=new g,E=new c;T.add(new h(new y(2,2),w));let D=new x(2.1,1.75,7.3),O=new x(.02,.78,0),k=new x,A=new x,j=new x;k.subVectors(O,D).normalize(),A.crossVectors(k,new x(0,1,0)).normalize(),j.crossVectors(A,k),C.uCam.value.copy(D),C.uCX.value.copy(A),C.uCY.value.copy(j),C.uCZ.value.copy(k);let M=1,N=1,P=!0,F=()=>{let n=e.getBoundingClientRect();M=Math.max(1,n.width),N=Math.max(1,n.height);let i=Math.min(window.devicePixelRatio||1,t.phone?1.6:1.3);r.setPixelRatio(i),r.setSize(M,N,!1),C.uRes.value.set(Math.round(M*i),Math.round(N*i));let a=M/N;C.uTan.value=.168*Math.max(1,.92/a),C.uEdge.value=t.phone?.05:.08,P=!0},I={melt:0,lean:0,pool:0,scale:1};function L(e,t,n){let r=I.melt,i=Math.max(t,0),a=Math.exp(-i*6),s=e/(1+r*1.3*a),c=n/(1+r*2.6*a);s-=I.lean*i*i,c-=I.lean*.55*i*i;let l=r*r,u=i*(1+9*l*l*r)+(1*l+14*l*l*l*r)*i*i+Math.min(t,0),d=ce+r*.03;for(let e of o){let t=e.a*(e.late?1:I.scale);if(t<.001)continue;let n=s-e.x,r=u-e.y,i=Math.exp(-(n*n+r*r)*14),a=G((.45-(e.y-u))/.5),o=t*i;u+=o*.24*a,s=e.x+(s-e.x)/(1+o*.35),c/=1+o*.45,d+=o*.035}return{qx:s,qy:u,qz:c,rr:d}}function R(e,t,r){let{qx:i,qy:a,qz:o,rr:s}=L(e,t,r),c=U(n,i,a)+s,l=Math.abs(o)-se+s,u=(Math.min(Math.max(c,l),0)+Math.hypot(Math.max(c,0),Math.max(l,0))-s)*.62,d=e-C.uPoolC.value.x,f=r-C.uPoolC.value.y,p=.006+I.pool*.03,m=Math.hypot(Math.max(Math.hypot(d,f)-Math.max(I.pool-p,0),0),t)-p;return Math.min(u,m)}function z(e,t){let n=M/N,r=e/M*2-1,i=1-t/N*2,a=C.uTan.value;return new x().copy(k).addScaledVector(A,r*a*n).addScaledVector(j,i*a).normalize()}function B(e,t){let n=z(e,t),r=5.5;for(let e=0;e<140;e++){let e=D.x+n.x*r,t=D.y+n.y*r,i=D.z+n.z*r;if(t<-.02)return null;let a=R(e,t,i);if(a<.002)return{px:e,py:t,pz:i,...L(e,t,i)};if(r+=Math.max(a,.004),r>10)return null}return null}function V(e,t){let n=z(e,t),r=.5,i=(r-D.z)/n.z;C.uHand.value.set(D.x+n.x*i,Math.max(.05,D.y+n.y*i),r)}function H(e,t){let r=0;for(;r<.42&&t-r>.03&&U(n,e,t-r-.03)<-.012;)r+=.005;return r}let K=[];{let e=7,t=()=>(e=e*16807%2147483647)/2147483647;for(let e=0;e<400&&K.length<4;e++){let e=(t()-.5)*.9,r=.45+t()*n.height*.6;U(n,e,r)<-.04&&K.every(([t,n])=>Math.hypot(t-e,n-r)>.22)&&H(e,r)>.12&&K.push([e,r])}K.forEach(([e,t],n)=>s.push({ax:e,ay:t,az:.107,r:.026+n%2*.008,y:t,stop:H(e,t),v:0,preset:{m0:.12+n*.07}}))}function q(e){let t=s.filter(e=>!e.preset);t.length>=6&&s.splice(s.indexOf(t[0]),1);let r=e.x+(Math.random()-.5)*.06,i=e.y-.03;U(n,r,i)>-.01||s.push({ax:r,ay:i,az:Math.sign(e.z||1)*.109,r:.028+Math.random()*.012,y:i,stop:Math.max(.02,H(r,i)),v:.05,late:e.late})}let J=0,Y=0,X=null,Z=0,Q=0,le=+!!t.still,$={x:0,y:0};{let e=0,t=0,r=n.height*.7;for(let i=n.height*.45;i<n.height*.95;i+=.02)for(let a=-.4;a<.4;a+=.02){let o=-U(n,a,i);o>e&&(e=o,t=a,r=i)}$={x:t,y:r}}let ue=t.still,de=performance.now();function fe(){C.uMelt.value=I.melt,C.uLean.value=I.lean,C.uPool.value=I.pool,C.uPoolC.value.set(n.dotX+I.lean*.5,I.lean*.35);for(let e=0;e<6;e++){let t=o[e];C.uDent.value[e].set(t?t.x:0,t?t.y:0,t?t.z:0,t?t.a*(t.late?1:I.scale):0)}for(let e=0;e<10;e++){let t=s[e],n=C.uBA.value[e],r=C.uBB.value[e];if(!t){r.w=0;continue}let i;i=t.preset?t.stop*G((I.melt-t.preset.m0)/.16):(t.ay-t.y)*(t.late?1:I.scale);let a=t.preset||t.late?1:I.scale,o=+(t.preset?I.melt>t.preset.m0+.03:a>.02);n.set(t.ax,t.ay,t.az,t.r*Math.max(.3,a)),r.set(t.ax+Math.sin(t.ay*40)*i*.05,t.ay-Math.max(i,.004),t.az,o)}}let pe=0,me=performance.now(),he=()=>{pe=requestAnimationFrame(he);let e=performance.now(),n=Math.min(.5,(e-me)/1e3);me=e;let i=!1;if(!ue){let t=Math.min(1,(e-de-250)/1900);le=t<=0?0:1-(1-t)**3,i=!0,t>=1&&(ue=!0,ge.onOpen?.()),C.uLamp.value=le}if(!t.still){let e=J<I.melt?1.5:1.1,t=I.melt+(J-I.melt)*(1-Math.exp(-e*n));Math.abs(t-I.melt)>1e-5&&(I.melt=t,i=!0);let r=1-G(Y);if(Math.abs(r-I.scale)>1e-4&&(I.scale+=(r-I.scale)*(1-Math.exp(-3*n)),i=!0),I.lean=.34*G(I.melt/.6),I.scale<.01){for(let e=o.length-1;e>=0;e--)!o[e].late&&o[e]!==X&&o.splice(e,1);for(let e=s.length-1;e>=0;e--)!s[e].preset&&!s[e].late&&s.splice(e,1)}if(Y<.05){for(let e of o)e.late=!1;for(let e of s)e.late=!1}let a=o.reduce((e,t)=>e+t.a*(t.late?1:I.scale),0);if(I.pool=.95*I.melt**1.15+Math.min(.22,a*.05)+.02*G(I.melt*6),C.uCool.value=G(Y),X){X.a+=n*.6*Math.max(.12,1-X.a/1.8);let e=X.a>1?3:X.a>.6?2:+(X.a>.2);for(;X.beads<e;)X.beads++,q(X);i=!0}for(let e of s){if(e.preset)continue;let t=e.ay-e.y;t<e.stop&&(e.v=.012+.07*(1-t/e.stop),e.y=Math.max(e.ay-e.stop,e.y-e.v*n),i=!0)}let c=Z+(Q-Z)*(1-Math.exp(-6*n));Math.abs(c-Z)>1e-4&&(Z=c,i=!0),C.uHandK.value=Z}(i||P)&&(fe(),r.render(T,E),P=!1)},ge={setMelt(e,n){t.still||(J=e,Y=n)},resize:F,pointer(e,n,r){if(t.still)return!1;if(V(e,n),Q=X?1:r?.32:0,P=!0,X){let t=B(e,n);if(t){let e=o.find(e=>Math.hypot(e.x-t.qx,e.y-t.qy)<.12);e&&e!==X?X=e:e||(X=_e(t.qx,t.qy,t.qz))}return!0}return r&&!!B(e,n)},press(e,n){if(t.still)return!1;let r=B(e,n);return r?(X=o.find(e=>Math.hypot(e.x-r.qx,e.y-r.qy)<.12)??_e(r.qx,r.qy,r.qz),V(e,n),Q=1,!0):!1},pressAt(e,n){t.still||(X=o.find(t=>Math.hypot(t.x-e,t.y-n)<.08)??_e(e,n,se),C.uHand.value.set(e,n,.5),Q=1)},release(){X=null,Q=0},keyPoint:()=>$,moveKey(e,t){let r=$.x+e,i=$.y+t;U(n,r,i)<-.01&&($={x:r,y:i})},dispose(){cancelAnimationFrame(pe),r.dispose(),a.dispose(),w.dispose()}};function _e(e,t,n){o.length>=6&&(o.sort((e,t)=>e.a-t.a),o.shift());let r={x:e,y:t,z:n,a:0,beads:0,late:Y>.4};return o.push(r),r}return F(),pe=requestAnimationFrame(he),ge}var q=o(),J=({href:e,className:t,children:n})=>(0,q.jsx)(`a`,{className:t,href:e,rel:e.startsWith(`http`)?`noopener`:void 0,children:n});function Y(){if(new URLSearchParams(location.search).has(`flat`))return!1;try{return!!document.createElement(`canvas`).getContext(`webgl2`)}catch{return!1}}function X(){let e=j.roman;return(0,q.jsx)(`svg`,{className:`flatmark`,viewBox:`-560 -840 1120 1680`,role:`img`,"aria-label":`A question mark`,children:(0,q.jsx)(`path`,{d:e.d})})}function Z(){P(`wax`,{anchorOffset:a()?-Math.round(window.innerHeight*.42)-8:0});let e=(0,F.useRef)(null),n=(0,F.useRef)(null),o=(0,F.useRef)(null),c=(0,F.useRef)(null),[l]=(0,F.useState)(Y),[u,d]=(0,F.useState)(a),[f,p]=(0,F.useState)(r||!l),[m,h]=(0,F.useState)(!1);M(e),(0,F.useEffect)(()=>{let e=()=>d(a());return window.addEventListener(`resize`,e),()=>window.removeEventListener(`resize`,e)},[]),(0,F.useEffect)(()=>{let e=o.current;if(!e||!l)return;let t;try{t=K(e,{still:r,phone:u})}catch{return}c.current=t,t.onOpen=()=>p(!0);let n=setTimeout(()=>p(!0),3200),i=new ResizeObserver(()=>t.resize());return i.observe(e),()=>{clearTimeout(n),i.disconnect(),t.dispose(),c.current=null}},[l,u]),(0,F.useEffect)(()=>{let n=e.current;if(!n||r||!l)return;let o=[],u=0,d=1,f=e=>{let t=n.querySelector(e);return t?t.getBoundingClientRect().top+window.scrollY:0},p=()=>{let e=window.innerHeight;o=[[0,0],[f(`[data-k="m"]`),.04],[f(`#record`),.24],[f(`#drive`)+e*.2,.5],[f(`#people`),.72],[f(`#people`)+e*.7,1]],u=f(`#join`)-e*.45,d=f(`#join`)+e*.55};p();let m=new ResizeObserver(p);m.observe(n),document.fonts.ready.then(p);let h=()=>{let e=window.scrollY+window.innerHeight*(a()?.72:.5),r=o[o.length-1][1];for(let n=0;n<o.length-1;n++)if(e<o[n+1][0]){let[a,s]=o[n],[c,l]=o[n+1];r=s+(l-s)*t(i((e-a)/Math.max(1,c-a)));break}let s=i((e-u)/Math.max(1,d-u));c.current?.setMelt(r*(1-t(s)),s),n.style.setProperty(`--cold`,s.toFixed(3))};return s.ticker.add(h),()=>{s.ticker.remove(h),m.disconnect()}},[l,u]),(0,F.useEffect)(()=>{let e=n.current;if(!e||r||!l)return;let t=0,i=null,a=!1,s=-1,u=e=>{let t=o.current.getBoundingClientRect();return{x:e.clientX-t.left,y:e.clientY-t.top}},d=t=>{let n=u(t);if(c.current?.press(n.x,n.y)){a=!0,h(!0),e.classList.add(`is-hot`);try{e.setPointerCapture(s)}catch{}}},f=e=>{e.button===0&&(s=e.pointerId,i=u(e),e.pointerType===`mouse`?d(e):(clearTimeout(t),t=window.setTimeout(()=>d(e),220)))},p=n=>{let r=u(n);i&&!a&&Math.hypot(r.x-i.x,r.y-i.y)>10&&clearTimeout(t);let o=c.current?.pointer(r.x,r.y,!0)??!1;e.classList.toggle(`is-over`,o||a)},m=()=>{clearTimeout(t),i=null,a&&(a=!1,e.classList.remove(`is-hot`),c.current?.release())},g=t=>{if(!a){let n=u(t);c.current?.pointer(n.x,n.y,!1),e.classList.remove(`is-over`)}},_=e=>e.preventDefault();return e.addEventListener(`pointerdown`,f),e.addEventListener(`pointermove`,p),e.addEventListener(`pointerup`,m),e.addEventListener(`pointercancel`,m),e.addEventListener(`pointerleave`,g),e.addEventListener(`contextmenu`,_),()=>{clearTimeout(t),e.removeEventListener(`pointerdown`,f),e.removeEventListener(`pointermove`,p),e.removeEventListener(`pointerup`,m),e.removeEventListener(`pointercancel`,m),e.removeEventListener(`pointerleave`,g),e.removeEventListener(`contextmenu`,_)}},[l,u]);let g=(e,t)=>{let i=c.current;if(!i||r)return;if(e.key===` `||e.key===`Enter`){if(e.preventDefault(),t&&!e.repeat){let e=i.keyPoint();i.pressAt(e.x,e.y),h(!0),n.current?.classList.add(`is-hot`)}t||(i.release(),n.current?.classList.remove(`is-hot`));return}let a={ArrowLeft:[-.06,0],ArrowRight:[.06,0],ArrowUp:[0,.06],ArrowDown:[0,-.06]};if(t&&a[e.key]&&(e.preventDefault(),i.moveKey(...a[e.key]),n.current?.classList.contains(`is-hot`))){let e=i.keyPoint();i.pressAt(e.x,e.y)}},_=l&&!r;return(0,q.jsxs)(`div`,{className:`v-wax${f?` is-open`:``}${u?` is-phone`:``}${l?``:` no-gl`}${m?` was-held`:``}`,ref:e,children:[(0,q.jsx)(`a`,{className:`skip-x`,href:`#main`,children:`Skip to content`}),l?(0,q.jsx)(`button`,{type:`button`,className:`stage`,ref:n,"aria-label":_?`The wax. Hold Space to warm it; arrow keys move the heat.`:`The wax, a question mark standing on stone.`,onKeyDown:e=>g(e,!0),onKeyUp:e=>g(e,!1),onBlur:()=>{c.current?.release(),n.current?.classList.remove(`is-hot`)},children:(0,q.jsx)(`canvas`,{ref:o,"aria-hidden":`true`})}):(0,q.jsx)(`div`,{className:`stage`,children:(0,q.jsx)(X,{})}),(0,q.jsxs)(`div`,{className:`field`,children:[(0,q.jsxs)(`header`,{className:`top`,children:[(0,q.jsxs)(`a`,{className:`brand`,href:`#top`,"aria-label":`Skeptical, back to the top`,children:[`Skeptical`,(0,q.jsx)(`i`,{children:`?`})]}),(0,q.jsx)(`nav`,{"aria-label":`Sections`,children:D.map(e=>(0,q.jsx)(`a`,{href:`#${e.id}`,children:e.label},e.id))})]}),(0,q.jsxs)(`main`,{id:`main`,children:[(0,q.jsxs)(`section`,{className:`hero`,id:`top`,"aria-label":T.heading,children:[(0,q.jsx)(`h1`,{className:`pitch`,children:O.pitch.map(e=>(0,q.jsx)(`span`,{children:(0,q.jsx)(`span`,{children:e})},e))}),(0,q.jsx)(`p`,{className:`statement`,children:O.statement.map(e=>(0,q.jsx)(`span`,{children:e},e))}),(0,q.jsx)(`p`,{className:`doors`,children:O.doors.map((e,t)=>(0,q.jsx)(J,{className:t===0?`door main`:`door`,href:e.href,children:e.label},e.href))}),_&&(0,q.jsx)(`p`,{className:`hint`,"aria-hidden":`true`,children:u?`Hold your finger on the wax.`:`Press and hold the wax.`})]}),(0,q.jsx)(`section`,{className:`manifesto`,"data-k":`m`,"aria-label":`How the team works`,children:S.map(e=>(0,q.jsx)(N,{as:`p`,className:`line`,by:`words`,effect:`blur`,children:e},e))}),(0,q.jsxs)(`section`,{className:`sec record`,id:`record`,children:[(0,q.jsx)(N,{as:`h2`,className:`title`,by:`chars`,children:C.title}),(0,q.jsx)(`p`,{className:`lead`,"data-rise":!0,children:C.rule}),(0,q.jsxs)(`p`,{className:`event`,"data-rise":!0,children:[(0,q.jsx)(`span`,{children:C.when}),(0,q.jsx)(`span`,{children:C.name}),(0,q.jsx)(`span`,{children:C.where})]}),(0,q.jsx)(`ul`,{className:`results`,children:C.results.map(e=>(0,q.jsxs)(`li`,{"data-rise":!0,children:[(0,q.jsx)(`h3`,{children:e.what}),(0,q.jsxs)(`p`,{children:[(0,q.jsx)(`b`,{children:e.who}),` `,e.more]})]},e.who))}),(0,q.jsx)(`p`,{"data-rise":!0,children:(0,q.jsx)(J,{className:`more`,href:C.more.href,children:C.more.label})})]}),(0,q.jsxs)(`section`,{className:`sec drive`,id:`drive`,children:[(0,q.jsx)(N,{as:`h2`,className:`title`,by:`chars`,children:A.title}),(0,q.jsx)(`p`,{className:`lead`,"data-rise":!0,children:A.lead}),(0,q.jsx)(`dl`,{className:`items`,children:A.items.map(e=>(0,q.jsxs)(`div`,{className:`item`,"data-rise":!0,children:[(0,q.jsx)(`dt`,{children:e.term}),(0,q.jsx)(`dd`,{children:e.text})]},e.term))}),(0,q.jsx)(`p`,{"data-rise":!0,children:(0,q.jsx)(J,{className:`more`,href:A.more.href,children:A.more.label})})]}),(0,q.jsxs)(`section`,{className:`sec people`,id:`people`,children:[(0,q.jsx)(N,{as:`h2`,className:`title`,by:`chars`,children:k.title}),(0,q.jsx)(`ul`,{className:`coaches`,children:k.coaches.map(e=>(0,q.jsxs)(`li`,{"data-rise":!0,children:[(0,q.jsx)(`h3`,{children:e.name}),(0,q.jsx)(`p`,{className:`role`,children:e.role}),(0,q.jsx)(`p`,{className:`bio`,children:e.bio})]},e.name))}),(0,q.jsx)(`p`,{className:`count`,"data-rise":!0,children:k.count}),(0,q.jsx)(`p`,{"data-rise":!0,children:(0,q.jsx)(J,{className:`more`,href:k.more.href,children:k.more.label})})]}),(0,q.jsxs)(`section`,{className:`sec join`,id:`join`,children:[(0,q.jsx)(N,{as:`h2`,className:`title`,by:`chars`,children:w.title}),(0,q.jsx)(`p`,{className:`lead`,"data-rise":!0,children:w.lead}),(0,q.jsx)(`ol`,{className:`paths`,children:w.paths.map(e=>(0,q.jsxs)(`li`,{className:`path`,"data-rise":!0,children:[(0,q.jsx)(`h3`,{children:(0,q.jsxs)(J,{href:e.href,children:[(0,q.jsxs)(`span`,{className:`nm`,children:[e.name,`.`]}),(0,q.jsx)(`span`,{className:`ln`,children:e.line})]})}),(0,q.jsx)(`ul`,{children:e.text.map(e=>(0,q.jsx)(`li`,{children:e},e))})]},e.id))}),(0,q.jsxs)(`div`,{className:`after`,"data-rise":!0,children:[(0,q.jsxs)(`p`,{children:[w.already.before,(0,q.jsx)(J,{href:w.already.href,children:w.already.label})]}),(0,q.jsxs)(`p`,{children:[w.coach.before,(0,q.jsx)(J,{href:w.coach.href,children:w.coach.label})]}),(0,q.jsxs)(`p`,{children:[w.also,` `,(0,q.jsx)(J,{href:`mailto:${T.email}`,children:T.email})]}),(0,q.jsx)(`p`,{children:w.discord})]})]})]}),(0,q.jsxs)(`footer`,{className:`end`,children:[(0,q.jsx)(`p`,{className:`fline`,children:E.line}),(0,q.jsx)(`ul`,{className:`links`,children:E.links.map(e=>(0,q.jsx)(`li`,{children:(0,q.jsx)(J,{href:e.href,children:e.label})},e.href))}),(0,q.jsx)(`ul`,{className:`pages`,children:E.pages.map(e=>(0,q.jsx)(`li`,{children:(0,q.jsx)(J,{href:e.href,children:e.label})},e.href))}),(0,q.jsx)(`small`,{children:`Draft 2, version 56. Not the live site.`})]})]})]})}export{Z as default};