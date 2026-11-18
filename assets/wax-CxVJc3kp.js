import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{c as t,d as n,l as r,n as i,o as a,t as o}from"./jsx-runtime-BAJ4K1lj.js";import{t as s}from"./gsap-Dm7UF3sG.js";/* empty css             *//* empty css                    *//* empty css                       */import{a as c,c as l,i as u,l as d,n as f,o as p,r as m,s as h,t as g}from"./content-D8DUqlkw.js";import{t as _}from"./marks-Ce1ST7vc.js";import"./scroll-CIxM5NtI.js";import{n as v,t as y}from"./motion-66kFq4QZ.js";import{F as b,Qi as x,Rn as S,U as C,V as w,Wn as T,Yt as E,ar as D,ea as O,ft as ee,io as te,jr as ne,no as k,ro as A,ta as re,zi as ie}from"./three.core-BF58tRDi.js";import{t as j}from"./version-P7QtdNZ3.js";import{o as ae}from"./three.module-ChJkI3a6.js";var M=e(n(),1),N=-560,P=-840,F=1120,I=1680,L=1e3;function R(e,t,n,r,i){let a=0;r[0]=0,i[0]=-1/0,i[1]=1/0;for(let n=1;n<t;n++){let t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);for(;t<=i[a];)a--,t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);a++,r[a]=n,i[a]=t,i[a+1]=1/0}a=0;for(let o=0;o<t;o++){for(;i[a+1]<o;)a++;n[o]=(o-r[a])*(o-r[a])+e[r[a]]}}function z(e){let t=new Float64Array(600),n=new Float64Array(600),r=new Int32Array(600),i=new Float64Array(601);for(let a=0;a<400;a++){for(let n=0;n<600;n++)t[n]=e[n*400+a];R(t,600,n,r,i);for(let t=0;t<600;t++)e[t*400+a]=n[t]}for(let a=0;a<600;a++){for(let n=0;n<400;n++)t[n]=e[a*400+n];R(t,400,n,r,i);for(let t=0;t<400;t++)e[a*400+t]=Math.sqrt(n[t])}}function oe(){let e=document.createElement(`canvas`);e.width=400,e.height=600;let t=e.getContext(`2d`,{willReadFrequently:!0}),n=400/F;t.setTransform(n,0,0,n,560*n,840*n),t.fillStyle=`#fff`,t.fill(new Path2D(_.roman.d));let r=t.getImageData(0,0,400,600).data,i=0x56bc75e2d63100000,a=new Float64Array(24e4),o=new Float64Array(24e4),s=400,c=0,l=600,u=0,d=new Float32Array(24e4);for(let e=0;e<24e4;e++){let t=r[e*4+3]/255;d[e]=t;let n=t>.5;if(o[e]=n?0:i,a[e]=n?i:0,n){let t=e%400,n=e/400|0;t<s&&(s=t),t>c&&(c=t),n<l&&(l=n),n>u&&(u=n)}}z(o),z(a);let f=new Float32Array(24e4),p=F/400/L;for(let e=0;e<24e4;e++){let t=o[e]>0?o[e]-.5:-(a[e]-.5),n=Math.abs(t)<1.2?.5-d[e]:t;f[e]=n*p}let m=(u+1)/n+P,h=(s+c+1)/2/n+N,g=0,v=0,y=u-(u-l)*.12;for(let e=Math.floor(y);e<=u;e++)for(let t=s;t<=c;t++)d[e*400+t]>.5&&(g+=t,v++);let b=((v?g/v:(s+c)/2)/n+N-h)/L;return{data:f,base:m,offX:h,height:(u-l+1)/n/L,dotX:b}}function B(e,t,n){let r=t*L+e.offX,i=e.base-n*L,a=(r-N)/F,o=(i-P)/I,s=Math.min(.998,Math.max(.002,a)),c=Math.min(.998,Math.max(.002,o)),l=s*400-.5,u=c*600-.5,d=Math.max(0,Math.floor(l)),f=Math.max(0,Math.floor(u)),p=Math.min(399,d+1),m=Math.min(599,f+1),h=l-d,g=u-f,_=e.data,v=_[f*400+d]*(1-h)+_[f*400+p]*h,y=_[m*400+d]*(1-h)+_[m*400+p]*h;return v*(1-g)+y*g+Math.hypot((a-s)*F/L,(o-c)*I/L)}function se(e){let t=new Float32Array(1),n=new Int32Array(t.buffer);t[0]=e;let r=n[0],i=r>>16&32768,a=(r>>23&255)-127+15,o=r&8388607;return a<=0?i:a>=31?i|31744:i|a<<10|o>>13}var ce=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,le=`
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
`,V=.105,ue=.03,H=[14/255,12/255,10/255],U=e=>(e=Math.min(1,Math.max(0,e)),e*e*(3-2*e));function W(e,t){let n=oe(),r=new ae({canvas:e,antialias:!1,alpha:!1,powerPreference:`high-performance`});r.setClearColor(new C().setRGB(H[0],H[1],H[2],x)),r.outputColorSpace=T;let i=new Uint16Array(24e4);for(let e=0;e<24e4;e++)i[e]=se(n.data[e]);let a=new ee(i,400,600,ie,E);a.minFilter=a.magFilter=S,a.wrapS=a.wrapT=w,a.flipY=!1,a.generateMipmaps=!1,a.needsUpdate=!0;let o=[],s=[],c=e=>Array.from({length:e},()=>new te),l={uTex:{value:a},uRes:{value:new k(1,1)},uCam:{value:new A},uCX:{value:new A},uCY:{value:new A},uCZ:{value:new A},uTan:{value:.14},uShift:{value:new k},uBase:{value:n.base},uOffX:{value:n.offX},uMelt:{value:0},uLean:{value:0},uPool:{value:0},uCool:{value:0},uLamp:{value:+!!t.still},uHandK:{value:0},uPoolC:{value:new k(n.dotX,0)},uHand:{value:new A(0,.8,.6)},uDent:{value:c(6)},uBA:{value:c(10)},uBB:{value:c(10)},uBg:{value:new A(H[0],H[1],H[2])},uEdge:{value:.08}},u=new re({vertexShader:ce,fragmentShader:le,uniforms:l,depthTest:!1,depthWrite:!1}),d=new O,f=new b;d.add(new D(new ne(2,2),u));let p=new A(2.1,1.75,7.3),m=new A(.02,.78,0),h=new A,g=new A,_=new A;h.subVectors(m,p).normalize(),g.crossVectors(h,new A(0,1,0)).normalize(),_.crossVectors(g,h),l.uCam.value.copy(p),l.uCX.value.copy(g),l.uCY.value.copy(_),l.uCZ.value.copy(h);let v=1,y=1,j=!0,M=()=>{let n=e.getBoundingClientRect();v=Math.max(1,n.width),y=Math.max(1,n.height);let i=Math.min(window.devicePixelRatio||1,t.phone?1.6:1.3);r.setPixelRatio(i),r.setSize(v,y,!1),l.uRes.value.set(Math.round(v*i),Math.round(y*i));let a=v/y;l.uTan.value=.168*Math.max(1,.92/a),l.uEdge.value=t.phone?.05:.08,j=!0},N={melt:0,lean:0,pool:0,scale:1};function P(e,t,n){let r=N.melt,i=Math.max(t,0),a=Math.exp(-i*6),s=e/(1+r*1.3*a),c=n/(1+r*2.6*a);s-=N.lean*i*i,c-=N.lean*.55*i*i;let l=r*r,u=i*(1+9*l*l*r)+(1*l+14*l*l*l*r)*i*i+Math.min(t,0),d=ue+r*.03;for(let e of o){let t=e.a*(e.late?1:N.scale);if(t<.001)continue;let n=s-e.x,r=u-e.y,i=Math.exp(-(n*n+r*r)*14),a=U((.45-(e.y-u))/.5),o=t*i;u+=o*.24*a,s=e.x+(s-e.x)/(1+o*.35),c/=1+o*.45,d+=o*.035}return{qx:s,qy:u,qz:c,rr:d}}function F(e,t,r){let{qx:i,qy:a,qz:o,rr:s}=P(e,t,r),c=B(n,i,a)+s,u=Math.abs(o)-V+s,d=(Math.min(Math.max(c,u),0)+Math.hypot(Math.max(c,0),Math.max(u,0))-s)*.62,f=e-l.uPoolC.value.x,p=r-l.uPoolC.value.y,m=.006+N.pool*.03,h=Math.hypot(Math.max(Math.hypot(f,p)-Math.max(N.pool-m,0),0),t)-m;return Math.min(d,h)}function I(e,t){let n=v/y,r=e/v*2-1,i=1-t/y*2,a=l.uTan.value;return new A().copy(h).addScaledVector(g,r*a*n).addScaledVector(_,i*a).normalize()}function L(e,t){let n=I(e,t),r=5.5;for(let e=0;e<140;e++){let e=p.x+n.x*r,t=p.y+n.y*r,i=p.z+n.z*r;if(t<-.02)return null;let a=F(e,t,i);if(a<.002)return{px:e,py:t,pz:i,...P(e,t,i)};if(r+=Math.max(a,.004),r>10)return null}return null}function R(e,t){let n=I(e,t),r=.5,i=(r-p.z)/n.z;l.uHand.value.set(p.x+n.x*i,Math.max(.05,p.y+n.y*i),r)}function z(e,t){let r=0;for(;r<.42&&t-r>.03&&B(n,e,t-r-.03)<-.012;)r+=.005;return r}let W=[];{let e=7,t=()=>(e=e*16807%2147483647)/2147483647;for(let e=0;e<400&&W.length<4;e++){let e=(t()-.5)*.9,r=.45+t()*n.height*.6;B(n,e,r)<-.04&&W.every(([t,n])=>Math.hypot(t-e,n-r)>.22)&&z(e,r)>.12&&W.push([e,r])}W.forEach(([e,t],n)=>s.push({ax:e,ay:t,az:.107,r:.026+n%2*.008,y:t,stop:z(e,t),v:0,preset:{m0:.12+n*.07}}))}function G(e){let t=s.filter(e=>!e.preset);t.length>=6&&s.splice(s.indexOf(t[0]),1);let r=e.x+(Math.random()-.5)*.06,i=e.y-.03;B(n,r,i)>-.01||s.push({ax:r,ay:i,az:Math.sign(e.z||1)*.109,r:.028+Math.random()*.012,y:i,stop:Math.max(.02,z(r,i)),v:.05,late:e.late})}let K=0,q=0,J=null,Y=0,X=0,de=+!!t.still,Z={x:0,y:0};{let e=0,t=0,r=n.height*.7;for(let i=n.height*.45;i<n.height*.95;i+=.02)for(let a=-.4;a<.4;a+=.02){let o=-B(n,a,i);o>e&&(e=o,t=a,r=i)}Z={x:t,y:r}}let fe=t.still,pe=performance.now();function me(){l.uMelt.value=N.melt,l.uLean.value=N.lean,l.uPool.value=N.pool,l.uPoolC.value.set(n.dotX+N.lean*.5,N.lean*.35);for(let e=0;e<6;e++){let t=o[e];l.uDent.value[e].set(t?t.x:0,t?t.y:0,t?t.z:0,t?t.a*(t.late?1:N.scale):0)}for(let e=0;e<10;e++){let t=s[e],n=l.uBA.value[e],r=l.uBB.value[e];if(!t){r.w=0;continue}let i;i=t.preset?t.stop*U((N.melt-t.preset.m0)/.16):(t.ay-t.y)*(t.late?1:N.scale);let a=t.preset||t.late?1:N.scale,o=+(t.preset?N.melt>t.preset.m0+.03:a>.02);n.set(t.ax,t.ay,t.az,t.r*Math.max(.3,a)),r.set(t.ax+Math.sin(t.ay*40)*i*.05,t.ay-Math.max(i,.004),t.az,o)}}let Q=0,he=performance.now(),ge=()=>{Q=requestAnimationFrame(ge);let e=performance.now(),n=Math.min(.5,(e-he)/1e3);he=e;let i=!1;if(!fe){let t=Math.min(1,(e-pe-250)/1900);de=t<=0?0:1-(1-t)**3,i=!0,t>=1&&(fe=!0,_e.onOpen?.()),l.uLamp.value=de}if(!t.still){let e=K<N.melt?1.5:1.1,t=N.melt+(K-N.melt)*(1-Math.exp(-e*n));Math.abs(t-N.melt)>1e-5&&(N.melt=t,i=!0);let r=1-U(q);if(Math.abs(r-N.scale)>1e-4&&(N.scale+=(r-N.scale)*(1-Math.exp(-3*n)),i=!0),N.lean=.34*U(N.melt/.6),N.scale<.01){for(let e=o.length-1;e>=0;e--)!o[e].late&&o[e]!==J&&o.splice(e,1);for(let e=s.length-1;e>=0;e--)!s[e].preset&&!s[e].late&&s.splice(e,1)}if(q<.05){for(let e of o)e.late=!1;for(let e of s)e.late=!1}let a=o.reduce((e,t)=>e+t.a*(t.late?1:N.scale),0);if(N.pool=.95*N.melt**1.15+Math.min(.22,a*.05)+.02*U(N.melt*6),l.uCool.value=U(q),J){J.a+=n*.6*Math.max(.12,1-J.a/1.8);let e=J.a>1?3:J.a>.6?2:+(J.a>.2);for(;J.beads<e;)J.beads++,G(J);i=!0}for(let e of s){if(e.preset)continue;let t=e.ay-e.y;t<e.stop&&(e.v=.012+.07*(1-t/e.stop),e.y=Math.max(e.ay-e.stop,e.y-e.v*n),i=!0)}let c=Y+(X-Y)*(1-Math.exp(-6*n));Math.abs(c-Y)>1e-4&&(Y=c,i=!0),l.uHandK.value=Y}(i||j)&&(me(),r.render(d,f),j=!1)},_e={setMelt(e,n){t.still||(K=e,q=n)},resize:M,pointer(e,n,r){if(t.still)return!1;if(R(e,n),X=J?1:r?.32:0,j=!0,J){let t=L(e,n);if(t){let e=o.find(e=>Math.hypot(e.x-t.qx,e.y-t.qy)<.12);e&&e!==J?J=e:e||(J=$(t.qx,t.qy,t.qz))}return!0}return r&&!!L(e,n)},press(e,n){if(t.still)return!1;let r=L(e,n);return r?(J=o.find(e=>Math.hypot(e.x-r.qx,e.y-r.qy)<.12)??$(r.qx,r.qy,r.qz),R(e,n),X=1,!0):!1},pressAt(e,n){t.still||(J=o.find(t=>Math.hypot(t.x-e,t.y-n)<.08)??$(e,n,V),l.uHand.value.set(e,n,.5),X=1)},release(){J=null,X=0},keyPoint:()=>Z,moveKey(e,t){let r=Z.x+e,i=Z.y+t;B(n,r,i)<-.01&&(Z={x:r,y:i})},dispose(){cancelAnimationFrame(Q),r.dispose(),a.dispose(),u.dispose()}};function $(e,t,n){o.length>=6&&(o.sort((e,t)=>e.a-t.a),o.shift());let r={x:e,y:t,z:n,a:0,beads:0,late:q>.4};return o.push(r),r}return M(),Q=requestAnimationFrame(ge),_e}var G=o(),K=({href:e,className:t,children:n})=>(0,G.jsx)(`a`,{className:t,href:e,rel:e.startsWith(`http`)?`noopener`:void 0,children:n});function q(){if(new URLSearchParams(location.search).has(`flat`))return!1;try{return!!document.createElement(`canvas`).getContext(`webgl2`)}catch{return!1}}function J(){let e=_.roman;return(0,G.jsx)(`svg`,{className:`flatmark`,viewBox:`-560 -840 1120 1680`,role:`img`,"aria-label":`A question mark`,children:(0,G.jsx)(`path`,{d:e.d})})}function Y(){j(`wax`,{anchorOffset:a()?-Math.round(window.innerHeight*.42)-8:0});let e=(0,M.useRef)(null),n=(0,M.useRef)(null),o=(0,M.useRef)(null),_=(0,M.useRef)(null),[b]=(0,M.useState)(q),[x,S]=(0,M.useState)(a),[C,w]=(0,M.useState)(r||!b),[T,E]=(0,M.useState)(!1);v(e),(0,M.useEffect)(()=>{let e=()=>S(a());return window.addEventListener(`resize`,e),()=>window.removeEventListener(`resize`,e)},[]),(0,M.useEffect)(()=>{let e=o.current;if(!e||!b)return;let t;try{t=W(e,{still:r,phone:x})}catch{return}_.current=t,t.onOpen=()=>w(!0);let n=setTimeout(()=>w(!0),3200),i=new ResizeObserver(()=>t.resize());return i.observe(e),()=>{clearTimeout(n),i.disconnect(),t.dispose(),_.current=null}},[b,x]),(0,M.useEffect)(()=>{let n=e.current;if(!n||r||!b)return;let o=[],c=0,l=1,u=e=>{let t=n.querySelector(e);return t?t.getBoundingClientRect().top+window.scrollY:0},d=()=>{let e=window.innerHeight;o=[[0,0],[u(`[data-k="m"]`),.04],[u(`#record`),.24],[u(`#drive`)+e*.2,.5],[u(`#people`),.72],[u(`#people`)+e*.7,1]],c=u(`#join`)-e*.45,l=u(`#join`)+e*.55};d();let f=new ResizeObserver(d);f.observe(n),document.fonts.ready.then(d);let p=()=>{let e=window.scrollY+window.innerHeight*(a()?.72:.5),r=o[o.length-1][1];for(let n=0;n<o.length-1;n++)if(e<o[n+1][0]){let[a,s]=o[n],[c,l]=o[n+1];r=s+(l-s)*t(i((e-a)/Math.max(1,c-a)));break}let s=i((e-c)/Math.max(1,l-c));_.current?.setMelt(r*(1-t(s)),s),n.style.setProperty(`--cold`,s.toFixed(3))};return s.ticker.add(p),()=>{s.ticker.remove(p),f.disconnect()}},[b,x]),(0,M.useEffect)(()=>{let e=n.current;if(!e||r||!b)return;let t=0,i=null,a=!1,s=-1,c=e=>{let t=o.current.getBoundingClientRect();return{x:e.clientX-t.left,y:e.clientY-t.top}},l=t=>{let n=c(t);if(_.current?.press(n.x,n.y)){a=!0,E(!0),e.classList.add(`is-hot`);try{e.setPointerCapture(s)}catch{}}},u=e=>{e.button===0&&(s=e.pointerId,i=c(e),e.pointerType===`mouse`?l(e):(clearTimeout(t),t=window.setTimeout(()=>l(e),220)))},d=n=>{let r=c(n);i&&!a&&Math.hypot(r.x-i.x,r.y-i.y)>10&&clearTimeout(t);let o=_.current?.pointer(r.x,r.y,!0)??!1;e.classList.toggle(`is-over`,o||a)},f=()=>{clearTimeout(t),i=null,a&&(a=!1,e.classList.remove(`is-hot`),_.current?.release())},p=t=>{if(!a){let n=c(t);_.current?.pointer(n.x,n.y,!1),e.classList.remove(`is-over`)}},m=e=>e.preventDefault();return e.addEventListener(`pointerdown`,u),e.addEventListener(`pointermove`,d),e.addEventListener(`pointerup`,f),e.addEventListener(`pointercancel`,f),e.addEventListener(`pointerleave`,p),e.addEventListener(`contextmenu`,m),()=>{clearTimeout(t),e.removeEventListener(`pointerdown`,u),e.removeEventListener(`pointermove`,d),e.removeEventListener(`pointerup`,f),e.removeEventListener(`pointercancel`,f),e.removeEventListener(`pointerleave`,p),e.removeEventListener(`contextmenu`,m)}},[b,x]);let D=(e,t)=>{let i=_.current;if(!i||r)return;if(e.key===` `||e.key===`Enter`){if(e.preventDefault(),t&&!e.repeat){let e=i.keyPoint();i.pressAt(e.x,e.y),E(!0),n.current?.classList.add(`is-hot`)}t||(i.release(),n.current?.classList.remove(`is-hot`));return}let a={ArrowLeft:[-.06,0],ArrowRight:[.06,0],ArrowUp:[0,.06],ArrowDown:[0,-.06]};if(t&&a[e.key]&&(e.preventDefault(),i.moveKey(...a[e.key]),n.current?.classList.contains(`is-hot`))){let e=i.keyPoint();i.pressAt(e.x,e.y)}},O=b&&!r;return(0,G.jsxs)(`div`,{className:`v-wax${C?` is-open`:``}${x?` is-phone`:``}${b?``:` no-gl`}${T?` was-held`:``}`,ref:e,children:[(0,G.jsx)(`a`,{className:`skip-x`,href:`#main`,children:`Skip to content`}),b?(0,G.jsx)(`button`,{type:`button`,className:`stage`,ref:n,"aria-label":O?`The wax. Hold Space to warm it; arrow keys move the heat.`:`The wax, a question mark standing on stone.`,onKeyDown:e=>D(e,!0),onKeyUp:e=>D(e,!1),onBlur:()=>{_.current?.release(),n.current?.classList.remove(`is-hot`)},children:(0,G.jsx)(`canvas`,{ref:o,"aria-hidden":`true`})}):(0,G.jsx)(`div`,{className:`stage`,children:(0,G.jsx)(J,{})}),(0,G.jsxs)(`div`,{className:`field`,children:[(0,G.jsxs)(`header`,{className:`top`,children:[(0,G.jsxs)(`a`,{className:`brand`,href:`#top`,"aria-label":`Skeptical, back to the top`,children:[`Skeptical`,(0,G.jsx)(`i`,{children:`?`})]}),(0,G.jsx)(`nav`,{"aria-label":`Sections`,children:p.map(e=>(0,G.jsx)(`a`,{href:`#${e.id}`,children:e.label},e.id))})]}),(0,G.jsxs)(`main`,{id:`main`,children:[(0,G.jsxs)(`section`,{className:`hero`,id:`top`,"aria-label":d.heading,children:[(0,G.jsx)(`h1`,{className:`pitch`,children:m.pitch.map(e=>(0,G.jsx)(`span`,{children:(0,G.jsx)(`span`,{children:e})},e))}),(0,G.jsx)(`p`,{className:`statement`,children:m.statement.map(e=>(0,G.jsx)(`span`,{children:e},e))}),(0,G.jsx)(`p`,{className:`doors`,children:m.doors.map((e,t)=>(0,G.jsx)(K,{className:t===0?`door main`:`door`,href:e.href,children:e.label},e.href))}),O&&(0,G.jsx)(`p`,{className:`hint`,"aria-hidden":`true`,children:x?`Hold your finger on the wax.`:`Press and hold the wax.`})]}),(0,G.jsx)(`section`,{className:`manifesto`,"data-k":`m`,"aria-label":`How the team works`,children:c.map(e=>(0,G.jsx)(y,{as:`p`,className:`line`,by:`words`,effect:`blur`,children:e},e))}),(0,G.jsxs)(`section`,{className:`sec record`,id:`record`,children:[(0,G.jsx)(y,{as:`h2`,className:`title`,by:`chars`,children:l.title}),(0,G.jsx)(`p`,{className:`lead`,"data-rise":!0,children:l.rule}),(0,G.jsxs)(`p`,{className:`event`,"data-rise":!0,children:[(0,G.jsx)(`span`,{children:l.when}),(0,G.jsx)(`span`,{children:l.name}),(0,G.jsx)(`span`,{children:l.where})]}),(0,G.jsx)(`ul`,{className:`results`,children:l.results.map(e=>(0,G.jsxs)(`li`,{"data-rise":!0,children:[(0,G.jsx)(`h3`,{children:e.what}),(0,G.jsxs)(`p`,{children:[(0,G.jsx)(`b`,{children:e.who}),` `,e.more]})]},e.who))}),(0,G.jsx)(`p`,{"data-rise":!0,children:(0,G.jsx)(K,{className:`more`,href:l.more.href,children:l.more.label})})]}),(0,G.jsxs)(`section`,{className:`sec drive`,id:`drive`,children:[(0,G.jsx)(y,{as:`h2`,className:`title`,by:`chars`,children:g.title}),(0,G.jsx)(`p`,{className:`lead`,"data-rise":!0,children:g.lead}),(0,G.jsx)(`dl`,{className:`items`,children:g.items.map(e=>(0,G.jsxs)(`div`,{className:`item`,"data-rise":!0,children:[(0,G.jsx)(`dt`,{children:e.term}),(0,G.jsx)(`dd`,{children:e.text})]},e.term))}),(0,G.jsx)(`p`,{"data-rise":!0,children:(0,G.jsx)(K,{className:`more`,href:g.more.href,children:g.more.label})})]}),(0,G.jsxs)(`section`,{className:`sec people`,id:`people`,children:[(0,G.jsx)(y,{as:`h2`,className:`title`,by:`chars`,children:h.title}),(0,G.jsx)(`ul`,{className:`coaches`,children:h.coaches.map(e=>(0,G.jsxs)(`li`,{"data-rise":!0,children:[(0,G.jsx)(`h3`,{children:e.name}),(0,G.jsx)(`p`,{className:`role`,children:e.role}),(0,G.jsx)(`p`,{className:`bio`,children:e.bio})]},e.name))}),(0,G.jsx)(`p`,{className:`count`,"data-rise":!0,children:h.count}),(0,G.jsx)(`p`,{"data-rise":!0,children:(0,G.jsx)(K,{className:`more`,href:h.more.href,children:h.more.label})})]}),(0,G.jsxs)(`section`,{className:`sec join`,id:`join`,children:[(0,G.jsx)(y,{as:`h2`,className:`title`,by:`chars`,children:u.title}),(0,G.jsx)(`p`,{className:`lead`,"data-rise":!0,children:u.lead}),(0,G.jsx)(`ol`,{className:`paths`,children:u.paths.map(e=>(0,G.jsxs)(`li`,{className:`path`,"data-rise":!0,children:[(0,G.jsx)(`h3`,{children:(0,G.jsxs)(K,{href:e.href,children:[(0,G.jsxs)(`span`,{className:`nm`,children:[e.name,`.`]}),(0,G.jsx)(`span`,{className:`ln`,children:e.line})]})}),(0,G.jsx)(`ul`,{children:e.text.map(e=>(0,G.jsx)(`li`,{children:e},e))})]},e.id))}),(0,G.jsxs)(`div`,{className:`after`,"data-rise":!0,children:[(0,G.jsxs)(`p`,{children:[u.already.before,(0,G.jsx)(K,{href:u.already.href,children:u.already.label})]}),(0,G.jsxs)(`p`,{children:[u.coach.before,(0,G.jsx)(K,{href:u.coach.href,children:u.coach.label})]}),(0,G.jsxs)(`p`,{children:[u.also,` `,(0,G.jsx)(K,{href:`mailto:${d.email}`,children:d.email})]}),(0,G.jsx)(`p`,{children:u.discord})]})]})]}),(0,G.jsxs)(`footer`,{className:`end`,children:[(0,G.jsx)(`p`,{className:`fline`,children:f.line}),(0,G.jsx)(`ul`,{className:`links`,children:f.links.map(e=>(0,G.jsx)(`li`,{children:(0,G.jsx)(K,{href:e.href,children:e.label})},e.href))}),(0,G.jsx)(`ul`,{className:`pages`,children:f.pages.map(e=>(0,G.jsx)(`li`,{children:(0,G.jsx)(K,{href:e.href,children:e.label})},e.href))}),(0,G.jsx)(`small`,{children:`Draft 2, version 56. Not the live site.`})]})]})]})}export{Y as default};