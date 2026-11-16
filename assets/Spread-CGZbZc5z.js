import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{d as t,l as n,t as r}from"./jsx-runtime-BAJ4K1lj.js";/* empty css                          *//* empty css            */import{t as i}from"./createLucideIcon-6-U_RRUC.js";import{a,c as o,i as s,l as c,n as l,o as u,r as d,s as f,t as p}from"./content-D8DUqlkw.js";import{n as m}from"./motion-66kFq4QZ.js";import{t as h}from"./version-sRrcf_t8.js";import{t as g}from"./slider-C9xGrqCx.js";import{A as _,Ba as v,Dr as y,Ja as b,Ln as x,Pn as ee,U as te,Wn as ne,Yt as re,an as S,ar as ie,ct as ae,do as oe,ea as se,in as C,io as ce,j as le,jr as ue,kr as de,no as fe,ro as w,ta as pe}from"./three.core-BF58tRDi.js";import{o as me}from"./three.module-ChJkI3a6.js";var T={name:`pause`,size:24,node:[[`rect`,{x:`14`,y:`3`,width:`5`,height:`18`,rx:`1`,key:`kaeet6`}],[`rect`,{x:`5`,y:`3`,width:`5`,height:`18`,rx:`1`,key:`1wsw3u`}]]};T.node;var E=i(T),D={name:`play`,size:24,node:[[`path`,{d:`M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z`,key:`10ikf1`}]]};D.node;var he=i(D),O={name:`rotate-ccw`,size:24,node:[[`path`,{d:`M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`,key:`1357e3`}],[`path`,{d:`M3 3v5h5`,key:`1xhq8a`}]]};O.node;var k=i(O),A=e(t(),1),j=r(),ge=400,_e=160,ve=80,M=1500,N=8,ye=[`straight`,`gentle`,`winding`,`hills`,`racing`,`deep`],P={dark:{background:`transparent`,road:`#08080a`,lines:`#25252d`,tail:[`#d856bf`,`#6750a2`,`#c247ac`],head:[`#03b3c3`,`#0e5ea5`,`#324555`],poles:[`#03b3c3`],dust:`#ffffff`},light:{background:`transparent`,road:`#efeff2`,lines:`#d0d0d7`,tail:[`#d856bf`,`#6750a2`,`#c247ac`],head:[`#03b3c3`,`#0e5ea5`,`#324555`],poles:[`#03b3c3`],dust:`#18181b`}},F=`
  uniform float uTime;
  uniform float uCurvature;
  uniform vec4 uCurveA;
  uniform float uCurveB;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uPixel;
  #define PI 3.14159265358979
  float nsin(float v) { return sin(v) * 0.5 + 0.5; }
  vec3 gentle(float p) {
    return vec3(
      cos(p * PI * 5.0 + uTime) * 25.0 - cos(0.02 * PI * 5.0 + uTime) * 25.0,
      sin(p * PI * 2.0 + PI * 0.5 + uTime) * 15.0 - sin(0.02 * PI * 2.0 + PI * 0.5 + uTime) * 15.0,
      0.0
    );
  }
  float windX(float p) { return cos(PI * p * 4.0 + uTime) * 25.0 + pow(cos(PI * p * 8.0 + uTime * 2.0), 2.0) * 5.0; }
  float windY(float p) { return -nsin(PI * p * 8.0 + uTime) * 10.0 - pow(nsin(PI * p + uTime / 8.0), 5.0) * 10.0; }
  vec3 winding(float p) { return vec3(windX(p) - windX(0.0125), windY(p) - windY(0.0125), 0.0); }
  vec3 hills(float p) {
    return vec3(
      cos(p * PI * 3.0 + uTime) * 30.0 - cos(0.02 * PI * 3.0 + uTime) * 30.0,
      nsin(p * PI * 6.0 + uTime) * 30.0 - nsin(0.02 * PI * 6.0 + uTime) * 30.0,
      nsin(p * PI * 10.0 + uTime) * 20.0 - nsin(0.02 * PI * 10.0 + uTime) * 20.0
    );
  }
  vec3 racing(float p) {
    return vec3(
      sin(p * PI * 2.0 + uTime) * 35.0 - sin(0.0125 * PI * 2.0 + uTime) * 35.0,
      sin(p * PI * 3.0 + uTime) * 10.0 - sin(0.0125 * PI * 3.0 + uTime) * 10.0,
      0.0
    );
  }
  float deepX(float p) { return sin(p * PI * 4.0 + uTime) * 10.0; }
  float deepY(float p) { return pow(abs(p * 10.0), 2.0) + sin(p * PI * 8.0 + uTime) * 20.0; }
  vec3 deep(float p) { return vec3(deepX(p) - deepX(0.02), deepY(p) - deepY(0.02), 0.0); }
  vec3 bend(float p) {
    vec3 d = gentle(p) * uCurveA.x + winding(p) * uCurveA.y + hills(p) * uCurveA.z + racing(p) * uCurveA.w + deep(p) * uCurveB;
    return d * uCurvature;
  }
`,be=`
  ${F}
  attribute vec4 aSeedA;
  attribute vec4 aSeedB;
  attribute float aPair;
  attribute float aTone;
  uniform float uTravel;
  uniform float uRoadX;
  uniform float uRoadWidth;
  uniform float uLanes;
  uniform float uDirection;
  uniform vec2 uSpeedRange;
  uniform float uTrail;
  uniform float uStretch;
  uniform float uSize;
  uniform float uRadiusScale;
  uniform float uMirror;
  uniform vec3 uColors[${N}];
  uniform float uColorCount;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vThin;
  void main() {
    float laneWidth = uRoadWidth / uLanes;
    float lane = min(floor(aSeedA.x * uLanes), uLanes - 1.0);
    float laneX = (lane + 0.5) * laneWidth - uRoadWidth * 0.5 + (aSeedA.y - 0.5) * 0.5 * laneWidth;
    float carWidth = mix(0.3, 0.5, aSeedA.z) * laneWidth;
    float radius = mix(0.05, 0.14, aSeedA.w) * uSize;
    float len = mix(0.03, 0.2, aSeedB.x) * uTravel * uTrail * (1.0 + uStretch);
    float speed = mix(uSpeedRange.x, uSpeedRange.y, aSeedB.y) * uDirection;
    vec3 center = vec3(
      uRoadX + laneX + aPair * carWidth,
      aSeedB.w * 0.8 + radius * 1.3,
      position.z * len + len - mod(uTime * speed + aSeedB.z * uTravel, uTravel)
    );
    vAbove = center.y;
    center.y = mix(center.y, -center.y * 1.8, uMirror);
    center += bend(abs(center.z / uTravel));
    float depth = max(0.1, -(modelViewMatrix * vec4(center, 1.0)).z);
    float wanted = radius * uRadiusScale;
    float shown = max(wanted, depth * uPixel * 0.75);
    vThin = wanted / shown;
    vec3 p = center + vec3(position.x * shown, position.y * shown * mix(1.0, 2.2, uMirror), 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vec3 n = normal;
    n.y *= 1.0 - 2.0 * uMirror;
    vNormal = normalize(normalMatrix * n);
    vView = -mv.xyz;
    vUv = uv;
    vColor = uColors[int(min(floor(aTone * uColorCount), uColorCount - 1.0))];
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
`,xe=`
  uniform vec2 uFade;
  uniform float uIntensity;
  uniform float uSharp;
  uniform float uCore;
  uniform float uMirror;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vThin;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float alpha = pow(facing, uSharp) * smoothstep(uFade.x, uFade.y, vUv.x) * uIntensity * vThin * (1.0 - vFog);
    alpha *= mix(1.0, exp(-vAbove * 0.9), uMirror);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), pow(facing, 12.0) * uCore), min(alpha, 1.0));
  }
`,Se=`
  ${F}
  attribute vec4 aSeed;
  attribute float aIndex;
  attribute float aSide;
  uniform float uTravel;
  uniform float uCount;
  uniform float uEdge;
  uniform float uHeight;
  uniform float uRadiusScale;
  uniform float uMirror;
  uniform vec3 uColors[${N}];
  uniform float uColorCount;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vHeight;
  varying float vThin;
  void main() {
    vHeight = position.y + 0.5;
    float width = mix(0.08, 0.22, aSeed.y);
    float height = mix(1.3, 1.9, aSeed.z) * uHeight;
    float spacing = uTravel / max(uCount, 1.0);
    vec3 center = vec3(
      aSide * uEdge,
      vHeight * height,
      -uTravel + mod(uTime * 120.0 + (aIndex + aSeed.x * 0.6) * spacing, uTravel)
    );
    vAbove = center.y;
    center.y = mix(center.y, -center.y * 1.6, uMirror);
    center += bend(abs(center.z / uTravel));
    float depth = max(0.1, -(modelViewMatrix * vec4(center, 1.0)).z);
    float wanted = width * uRadiusScale;
    float shown = max(wanted, depth * uPixel * 0.75);
    vThin = wanted / shown;
    vec3 p = center + vec3(position.x * shown, 0.0, position.z * shown);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    vColor = uColors[int(min(floor(aSeed.w * uColorCount), uColorCount - 1.0))];
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
`,Ce=`
  uniform float uIntensity;
  uniform float uSharp;
  uniform float uCore;
  uniform float uMirror;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vHeight;
  varying float vThin;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float ends = smoothstep(0.0, 0.08, vHeight) * smoothstep(1.0, 0.9, vHeight);
    float alpha = pow(facing, uSharp) * ends * uIntensity * vThin * (1.0 - vFog);
    alpha *= mix(1.0, exp(-vAbove * 0.6), uMirror);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), pow(facing, 12.0) * uCore), min(alpha, 1.0));
  }
`,we=`
  ${F}
  attribute vec4 aSeed;
  attribute float aEnd;
  uniform float uTravel;
  uniform float uStretch;
  uniform float uSpread;
  varying float vAlpha;
  void main() {
    float x = (aSeed.x - 0.5) * uSpread;
    float y = mix(1.0, 42.0, aSeed.y * aSeed.y);
    float speed = mix(140.0, 260.0, aSeed.w);
    float z = -uTravel + mod(uTime * speed + aSeed.z * uTravel, uTravel);
    float len = (0.6 + uStretch * 7.0) * mix(0.6, 1.4, aSeed.w);
    vec3 p = vec3(x, y, z + aEnd * len);
    p += bend(abs(p.z / uTravel));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = aEnd * (1.0 - smoothstep(uFogNear, uFogFar, -mv.z));
  }
`,Te=`
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uIntensity);
  }
`,Ee=`
  ${F}
  uniform float uTravel;
  uniform float uWidth;
  varying vec2 vRoad;
  varying float vFog;
  void main() {
    vec3 p = position;
    p.x *= uWidth;
    vRoad = vec2(p.x, p.z);
    p += bend(abs(p.z / uTravel));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
`,De=`
  uniform float uTime;
  uniform vec3 uRoadColor;
  uniform vec3 uLineColor;
  uniform vec3 uBackground;
  uniform float uRoadWidth;
  uniform float uMedian;
  uniform float uLanes;
  uniform float uTransparent;
  uniform float uOpacity;
  varying vec2 vRoad;
  varying float vFog;
  float stripe(float d, float w) {
    float aa = fwidth(d) * 1.2;
    return 1.0 - smoothstep(w - aa, w + aa, d);
  }
  void main() {
    float rx = abs(vRoad.x) - uMedian * 0.5;
    vec3 color = rx < 0.0 ? mix(uRoadColor, uLineColor, 0.12) : uRoadColor;
    if (rx >= 0.0) {
      float laneWidth = uRoadWidth / uLanes;
      float shoulder = max(stripe(abs(rx - 0.3), 0.07), stripe(abs(rx - (uRoadWidth - 0.3)), 0.07));
      float nearest = floor(rx / laneWidth + 0.5);
      float inner = step(0.5, nearest) * step(nearest, uLanes - 0.5);
      float dash = step(0.5, fract((vRoad.y - uTime * 120.0) / 14.0));
      float marks = max(shoulder, stripe(abs(rx - nearest * laneWidth), 0.06) * inner * dash);
      color = mix(color, uLineColor, marks);
    }
    float alpha = mix(1.0, 1.0 - vFog, uTransparent) * uOpacity;
    gl_FragColor = vec4(mix(color, uBackground, vFog * (1.0 - uTransparent)), alpha);
  }
`,Oe=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,ke=`
  uniform sampler2D uTexture;
  uniform vec2 uTexel;
  varying vec2 vUv;
  vec4 tap(vec2 offset) {
    return min(texture2D(uTexture, vUv + uTexel * offset), vec4(1.0));
  }
  void main() {
    vec4 sum = tap(vec2(0.0)) * 4.0 + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
    gl_FragColor = sum * 0.125;
  }
`,I=`
  uniform sampler2D uTexture;
  uniform vec2 uTexel;
  varying vec2 vUv;
  vec4 tent() {
    vec4 sum = texture2D(uTexture, vUv + uTexel * vec2(-1.0, 0.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(1.0, 0.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.0, -1.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.0, 1.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(-0.5, -0.5)) * 2.0;
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.5, -0.5)) * 2.0;
    sum += texture2D(uTexture, vUv + uTexel * vec2(-0.5, 0.5)) * 2.0;
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.5, 0.5)) * 2.0;
    return sum / 12.0;
  }
`,Ae=`
  ${I}
  void main() {
    gl_FragColor = tent();
  }
`,je=`
  ${I}
  uniform float uStrength;
  uniform float uCeiling;
  uniform float uLight;
  void main() {
    vec4 color = tent() * uStrength;
    float peak = max(uLight > 0.5 ? color.a : max(color.r, max(color.g, color.b)), 0.0001);
    color *= uCeiling * (1.0 - exp(-peak / uCeiling)) / peak;
    gl_FragColor = uLight > 0.5 ? color : vec4(color.rgb, 0.0);
  }
`,L=null,R=e=>{if(L??=document.createElement(`canvas`).getContext(`2d`),!L)return[1,1,1];L.fillStyle=`#000000`,L.fillStyle=e;let t=String(L.fillStyle);if(t.startsWith(`#`)){let e=parseInt(t.slice(1,7),16);return[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255]}let n=t.match(/[\d.]+/g)?.map(Number)??[0,0,0];return[n[0]/255,n[1]/255,n[2]/255]},Me=(e,t,n)=>{let r=n.length?n:[`#ffffff`];for(let t=0;t<N;t++)e.value[t].fromArray(R(r[t%r.length]));t.value=Math.min(r.length,N)},Ne=e=>{let t=new S;return t.setIndex(e.index),Object.entries(e.attributes).forEach(([e,n])=>t.setAttribute(e,n)),t},z=e=>Math.sin(e)*.5+.5,B=(e,t)=>Math.cos(Math.PI*e*4+t)*25+Math.cos(Math.PI*e*8+t*2)**2*5,V=(e,t)=>-z(Math.PI*e*8+t)*10-z(Math.PI*e+t/8)**5*10,H=(e,t)=>Math.sin(e*Math.PI*4+t)*10,U=(e,t)=>Math.abs(e*10)**2+Math.sin(e*Math.PI*8+t)*20,Pe=(e,t)=>{let{PI:n,cos:r,sin:i}=Math;return[[r(e*n*5+t)*25-r(.02*n*5+t)*25,i(e*n*2+n*.5+t)*15-i(.02*n*2+n*.5+t)*15,0],[B(e,t)-B(.0125,t),V(e,t)-V(.0125,t),0],[r(e*n*3+t)*30-r(.02*n*3+t)*30,z(e*n*6+t)*30-z(.02*n*6+t)*30,z(e*n*10+t)*20-z(.02*n*10+t)*20],[i(e*n*2+t)*35-i(.0125*n*2+t)*35,i(e*n*3+t)*10-i(.0125*n*3+t)*10,0],[H(e,t)-H(.02,t),U(e,t)-U(.02,t),0]]},Fe=(e,t)=>{let n=.025,[r,,i,a]=Pe(n,e);return[[r[0]*t*2,r[1]*t*.4,-3],[(B(n,e)-B(.032,e))*t*-2,(V(n,e)-V(.032,e))*t*-5,-10],[i[0]*t*2,i[1]*t*2,i[2]*t*2-5],[a[0]*t,a[1]*t,-5],[(H(n,e)-H(.035,e))*t*-2,(U(n,e)-U(.035,e))*t*-4,-10]]},W=({curve:e=`winding`,curvature:t=1,speed:n=1,boost:r=3,fov:i=90,boostFov:a=130,lanes:o=3,roadWidth:s=10,medianWidth:c=2,density:l=40,trailLength:u=1,lightSize:d=1,poles:f=20,poleHeight:p=1,dust:m=100,glow:h=.6,reflections:g=.5,steer:S=.35,tailColors:T,headColors:E,poleColors:D,roadColor:he,roadOpacity:O=.1,lineColor:k,background:F,theme:I=`dark`,interactive:L=!0,boosting:z=!1,onBoostStart:B,onBoostEnd:V,className:H=``,style:U})=>{let Pe=(0,A.useRef)(null),W=P[I]??P.dark,G={light:I===`light`,curve:ye.includes(e)?e:`winding`,curvature:Math.max(0,t),speed:Math.max(0,n),boost:Math.max(1,r),fov:Math.min(170,Math.max(20,i)),boostFov:Math.min(170,Math.max(20,a)),lanes:Math.max(1,Math.round(o)),roadWidth:Math.max(1,s),medianWidth:Math.max(0,c),density:Math.min(_e,Math.max(0,Math.round(l))),trailLength:Math.max(.05,u),lightSize:Math.max(.1,d),poles:Math.min(ve,Math.max(0,Math.round(f))),poleHeight:Math.max(.1,p),dust:Math.min(M,Math.max(0,Math.round(m))),glow:Math.max(0,h),reflections:Math.max(0,g),steer:Math.max(0,S),tailColors:T?.length?T:W.tail,headColors:E?.length?E:W.head,poleColors:D?.length?D:W.poles,roadColor:he??W.road,roadOpacity:Math.min(1,Math.max(0,O)),lineColor:k??W.lines,background:F??W.background,dustColor:W.dust,interactive:L,boosting:z},K=(0,A.useRef)(G);K.current=G;let Ie=(0,A.useRef)({onBoostStart:B,onBoostEnd:V});return Ie.current={onBoostStart:B,onBoostEnd:V},(0,A.useEffect)(()=>{let e=Pe.current;if(!e)return;let t=window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches??!1,n=new me({antialias:!0,alpha:!0,powerPreference:`high-performance`});n.outputColorSpace=ne,n.autoClear=!1,n.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),e.appendChild(n.domElement);let r=new se,i=new de(K.current.fov,1,.1,1e4);i.position.set(0,8,-5);let a={uTime:{value:0},uCurvature:{value:1},uCurveA:{value:new ce},uCurveB:{value:0},uFogNear:{value:ge*.22},uFogFar:{value:ge*.95},uTravel:{value:ge},uStretch:{value:0},uPixel:{value:.001}},o=[],s=[],c=(e,t,n,r={})=>{let i=new pe({vertexShader:e,fragmentShader:t,uniforms:{...a,...n},transparent:!0,depthWrite:!1,...r});return o.push(i),i},l=()=>({value:Array.from({length:N},()=>new w(1,1,1))}),u=new ue(1,ge,1,220);u.rotateX(-Math.PI/2),u.translate(0,0,-200),o.push(u);let d={uWidth:{value:1},uRoadColor:{value:new w},uLineColor:{value:new w},uBackground:{value:new w},uRoadWidth:{value:10},uMedian:{value:2},uLanes:{value:3},uTransparent:{value:0},uOpacity:{value:1}},f=c(Ee,De,d,{transparent:!0,depthWrite:!0}),p=new ie(u,f);p.frustumCulled=!1,p.renderOrder=0,p.layers.enable(1),r.add(p);let m=new v(new ee(new w(0,0,0),new w(0,0,-1)),24,1,7,!1);o.push(m);let h=(e,t,n)=>{let i=Ne(m),a=new Float32Array(1280),u=new Float32Array(1280),d=new Float32Array(320),f=new Float32Array(320);for(let e=0;e<_e;e++){let t=[Math.random(),Math.random(),Math.random(),Math.random()],n=[Math.random(),Math.random(),Math.random(),Math.random()*Math.random()],r=Math.random();for(let i=0;i<2;i++){let o=e*2+i;a.set(t,o*4),u.set(n,o*4),d[o]=i?.5:-.5,f[o]=r}}i.setAttribute(`aSeedA`,new C(a,4)),i.setAttribute(`aSeedB`,new C(u,4)),i.setAttribute(`aPair`,new C(d,1)),i.setAttribute(`aTone`,new C(f,1)),i.instanceCount=0,o.push(i);let p={uRoadX:{value:0},uRoadWidth:{value:10},uLanes:{value:3},uDirection:{value:e},uSpeedRange:{value:new fe(...n)},uTrail:{value:1},uSize:{value:1},uColors:l(),uColorCount:{value:1},uFade:{value:new fe(...t)}},h=(e,t,n,a)=>{let o=c(be,xe,{...p,uRadiusScale:{value:e},uSharp:{value:t},uMirror:{value:n},uIntensity:{value:1},uCore:{value:0}},{depthTest:!n});s.push(o);let l=new ie(i,o);return l.frustumCulled=!1,l.renderOrder=a,n||l.layers.enable(1),r.add(l),o};return{geometry:i,uniforms:p,reflection:h(2.1,1.2,1,1),core:h(1,.85,0,3)}},g=h(1,[0,.6],[60,80]),S=h(-1,[1,.4],[120,160]),T=new ae(1,1,1,8,1,!0);o.push(T);let E=Ne(T),D=new Float32Array(640),he=new Float32Array(160),O=new Float32Array(160);for(let e=0;e<ve;e++)for(let t=0;t<2;t++){let n=e*2+t;D.set([Math.random(),Math.random(),Math.random(),Math.random()],n*4),he[n]=e+(t?.5:0),O[n]=t?1:-1}E.setAttribute(`aSeed`,new C(D,4)),E.setAttribute(`aIndex`,new C(he,1)),E.setAttribute(`aSide`,new C(O,1)),E.instanceCount=0,o.push(E);let k={uCount:{value:20},uEdge:{value:11},uHeight:{value:1},uColors:l(),uColorCount:{value:1}},A=(e,t,n,i)=>{let a=c(Se,Ce,{...k,uRadiusScale:{value:e},uSharp:{value:t},uMirror:{value:n},uIntensity:{value:1},uCore:{value:0}},{depthTest:!n});s.push(a);let o=new ie(E,a);return o.frustumCulled=!1,o.renderOrder=i,n||o.layers.enable(1),r.add(o),a},j={reflection:A(2.4,1.2,1,1),core:A(1,.8,0,3)},P=new le,F=new Float32Array(M*2*4),I=new Float32Array(M*2);for(let e=0;e<M;e++){let t=[Math.random(),Math.random(),Math.random(),Math.random()];F.set(t,e*8),F.set(t,e*8+4),I[e*2+1]=1}P.setAttribute(`position`,new _(new Float32Array(M*2*3),3)),P.setAttribute(`aSeed`,new _(F,4)),P.setAttribute(`aEnd`,new _(I,1)),P.setDrawRange(0,0),o.push(P);let L={uSpread:{value:140},uColor:{value:new w(1,1,1)},uIntensity:{value:.5}},z=c(we,Te,L);s.push(z);let B=new x(P,z);B.frustumCulled=!1,B.renderOrder=4,r.add(B);let V=n.extensions.has(`EXT_color_buffer_float`)||n.extensions.has(`EXT_color_buffer_half_float`),H=Array.from({length:5},(e,t)=>{let n=new oe(1,1,{type:V?re:b,depthBuffer:t===0});return o.push(n),n}),U=new se,W=new y(-1,1,1,-1,0,1),G=new ue(2,2);o.push(G);let q=new ie(G);q.frustumCulled=!1,U.add(q);let Le=(e,t)=>{let n=new pe({vertexShader:Oe,fragmentShader:e,uniforms:{uTexture:{value:null},uTexel:{value:new fe},uStrength:{value:1},uCeiling:{value:1},uLight:{value:0}},depthTest:!1,depthWrite:!1,...t});return o.push(n),n},Re=Le(ke,{blending:0}),ze=Le(Ae,{blending:5,blendSrc:201,blendDst:201,blendSrcAlpha:201,blendDstAlpha:201}),J=Le(je,{blending:5,blendSrc:201}),Be=(e,t,r)=>{q.material=e,e.uniforms.uTexture.value=t.texture,e.uniforms.uTexel.value.set(1/t.width,1/t.height),n.setRenderTarget(r),n.render(U,W)},Ve=new te,He=0,Y={boost:0,held:!1,boosted:!1,fov:K.current.fov,fovVelocity:0,steerX:0,steerY:0,pointerX:0,pointerY:0,weights:[0,0,0,0,0],visible:!0},X={tail:``,head:``,poles:``,surface:``,light:null},Z=new w,Q=0,Ue=performance.now(),We=!0,Ge=e=>{let t=e.tailColors.join();t!==X.tail&&(X.tail=t,Me(g.uniforms.uColors,g.uniforms.uColorCount,e.tailColors));let n=e.headColors.join();n!==X.head&&(X.head=n,Me(S.uniforms.uColors,S.uniforms.uColorCount,e.headColors));let r=e.poleColors.join();r!==X.poles&&(X.poles=r,Me(k.uColors,k.uColorCount,e.poleColors));let i=[e.roadColor,e.lineColor,e.background,e.dustColor].join();if(i!==X.surface){X.surface=i,d.uRoadColor.value.fromArray(R(e.roadColor)),d.uLineColor.value.fromArray(R(e.lineColor)),L.uColor.value.fromArray(R(e.dustColor));let t=e.background===`transparent`,n=t?[0,0,0]:R(e.background);d.uBackground.value.fromArray(n),d.uTransparent.value=+!!t,Ve.setRGB(...n,ne),He=+!t}X.light!==e.light&&(X.light=e.light,s.forEach(t=>{t.blending=e.light?1:2,t.needsUpdate=!0}),J.blendDst=e.light?205:201,J.blendSrcAlpha=e.light?201:200,J.blendDstAlpha=e.light?205:201,J.uniforms.uLight.value=+!!e.light)},Ke=!1,qe=()=>{let t=Math.max(1,e.clientWidth),r=Math.max(1,e.clientHeight);n.setSize(t,r,!1),H.forEach((e,n)=>e.setSize(Math.max(1,Math.round(t/2**(n+1))),Math.max(1,Math.round(r/2**(n+1))))),i.aspect=t/r,i.updateProjectionMatrix()},Je=()=>{Ke=!0,Xe()},Ye=e=>{if(Q=0,Ke&&(Ke=!1,qe()),!We)return;let o=K.current,s=Math.min(.05,Math.max(.001,(e-Ue)/1e3));Ue=e,Ge(o);let c=Y.held&&o.interactive||o.boosting?1:0;Y.boost+=(c-Y.boost)*(1-Math.exp(-s/(c>Y.boost?.28:.85)));let l=o.speed*(t?.3:1)*(1+(o.boost-1)*Y.boost);a.uTime.value+=s*l,a.uStretch.value=Y.boost*1.1,a.uCurvature.value=o.curvature;let u=ye.indexOf(o.curve)-1,p=1-Math.exp(-s/.6);Y.weights=Y.weights.map((e,t)=>e+(+(t===u)-e)*p),a.uCurveA.value.set(Y.weights[0],Y.weights[1],Y.weights[2],Y.weights[3]),a.uCurveB.value=Y.weights[4];let m=o.roadWidth/2+o.medianWidth/2,h=.45+.55*o.roadOpacity;[g,S].forEach((e,t)=>{e.geometry.instanceCount=o.density*2,e.uniforms.uRoadX.value=t?m:-m,e.uniforms.uRoadWidth.value=o.roadWidth,e.uniforms.uLanes.value=o.lanes,e.uniforms.uTrail.value=o.trailLength,e.uniforms.uSize.value=o.lightSize,e.core.uniforms.uIntensity.value=o.light?.95:1+.35*Y.boost,e.core.uniforms.uCore.value=o.light?0:.75,e.reflection.uniforms.uIntensity.value=o.reflections*(o.light?.22:.42)*h}),E.instanceCount=o.poles*2,k.uCount.value=Math.max(1,o.poles),k.uEdge.value=o.roadWidth+o.medianWidth/2+.8,k.uHeight.value=o.poleHeight,j.core.uniforms.uIntensity.value=o.light?.9:1,j.core.uniforms.uCore.value=o.light?0:.6,j.reflection.uniforms.uIntensity.value=o.reflections*(o.light?.2:.38)*h,P.setDrawRange(0,o.dust*2),L.uIntensity.value=(o.light?.35:.45)*(1+Y.boost),L.uSpread.value=(o.roadWidth*2+o.medianWidth)*5,d.uWidth.value=o.roadWidth*2+o.medianWidth+3,d.uRoadWidth.value=o.roadWidth,d.uMedian.value=o.medianWidth,d.uLanes.value=o.lanes,d.uOpacity.value=o.roadOpacity,f.depthWrite=o.roadOpacity>.5;let _=t?o.fov:o.fov+(o.boostFov-o.fov)*Y.boost;Y.fovVelocity+=((_-Y.fov)*90-Y.fovVelocity*13)*s,Y.fov+=Y.fovVelocity*s,i.fov=Y.fov,a.uPixel.value=2*Math.tan(Y.fov*Math.PI/360)/Math.max(1,n.domElement.height);let v=1-Math.exp(-s/.35),y=o.interactive?o.steer:0;Y.steerX+=(Y.pointerX*y-Y.steerX)*v,Y.steerY+=(Y.pointerY*y-Y.steerY)*v,i.position.set(Y.steerX*o.roadWidth*.45,8-Y.steerY*2.5,-5);let b=Fe(a.uTime.value,o.curvature),x=1-Y.weights.reduce((e,t)=>e+t,0);if(Z.set(0,0,-10*x),b.forEach((e,t)=>{Z.x+=e[0]*Y.weights[t],Z.y+=e[1]*Y.weights[t],Z.z+=e[2]*Y.weights[t]}),Z.x+=Y.steerX*2.5,Z.add(i.position),i.lookAt(Z),i.updateProjectionMatrix(),n.setRenderTarget(null),n.setClearColor(Ve,He),n.clear(),n.render(r,i),o.glow>0){let e=a.uPixel.value;a.uPixel.value=e*(n.domElement.height/H[0].height),i.layers.set(1),f.colorWrite=!1,n.setRenderTarget(H[0]),n.setClearColor(0,0),n.clear(),n.render(r,i),f.colorWrite=!0,i.layers.set(0),a.uPixel.value=e;for(let e=1;e<H.length;e++)Be(Re,H[e-1],H[e]);for(let e=H.length-1;e>1;e--)Be(ze,H[e],H[e-1]);J.uniforms.uStrength.value=o.glow*(o.light?.5:1.4),J.uniforms.uCeiling.value=o.glow*(o.light?.3:.5),Be(J,H[1],null)}Y.visible&&(Q=requestAnimationFrame(Ye))},Xe=()=>{!Q&&We&&Y.visible&&(Ue=performance.now(),Q=requestAnimationFrame(Ye))},Ze=e=>{Y.held!==e&&(Y.held=e,K.current.interactive&&(e?Ie.current.onBoostStart?.():Ie.current.onBoostEnd?.()))},Qe=e=>{(e.button===0||e.pointerType!==`mouse`)&&Ze(!0)},$=()=>Ze(!1),$e=t=>{let n=e.getBoundingClientRect();Y.pointerX=(t.clientX-n.left)/n.width*2-1,Y.pointerY=(t.clientY-n.top)/n.height*2-1},et=()=>{Y.pointerX=0,Y.pointerY=0},tt=e=>{K.current.interactive&&e.preventDefault()},nt=new ResizeObserver(Je);nt.observe(e);let rt=new IntersectionObserver(e=>{Y.visible=e.some(e=>e.isIntersecting),Y.visible&&Xe()});return rt.observe(e),e.addEventListener(`pointerdown`,Qe),e.addEventListener(`pointermove`,$e),e.addEventListener(`pointerleave`,et),e.addEventListener(`contextmenu`,tt),window.addEventListener(`pointerup`,$),window.addEventListener(`pointercancel`,$),window.addEventListener(`blur`,$),Je(),()=>{We=!1,cancelAnimationFrame(Q),nt.disconnect(),rt.disconnect(),e.removeEventListener(`pointerdown`,Qe),e.removeEventListener(`pointermove`,$e),e.removeEventListener(`pointerleave`,et),e.removeEventListener(`contextmenu`,tt),window.removeEventListener(`pointerup`,$),window.removeEventListener(`pointercancel`,$),window.removeEventListener(`blur`,$),o.forEach(e=>e.dispose()),n.dispose(),n.domElement.remove()}},[]),(0,j.jsx)(`div`,{ref:Pe,className:`hyperspeed${H?` ${H}`:``}`,style:U})},G=[{name:`Skeptical`,text:[...d.pitch,...d.statement].join(` `)},{name:`How it works`,text:a.join(` `)},{name:o.title,text:`${o.rule} ${o.when}. ${o.name}, ${o.where}. ${o.results.map(e=>`${e.who} ${e.what}. ${e.more}`).join(` `)}`},{name:p.title,text:`${p.lead} ${p.items.map(e=>`${e.term}. ${e.text}`).join(` `)}`},{name:f.title,text:`${f.coaches.map(e=>`${e.name}. ${e.role}. ${e.bio}`).join(` `)} ${f.count}`},{name:s.title,text:`${s.lead} ${s.paths.map(e=>`${e.name}. ${e.line} ${e.text.join(` `)}`).join(` `)}`}],K=G.flatMap((e,t)=>e.text.split(/\s+/).filter(Boolean).map(e=>({w:e,si:t}))),Ie=e=>{let t=e.replace(/[^\p{L}\p{N}]/gu,``).length;return Math.min(e.length-1,t<=1?0:t<=5?1:t<=9?2:t<=13?3:4)},q=({href:e,children:t})=>(0,j.jsx)(`a`,{href:e,rel:e.startsWith(`http`)?`noopener`:void 0,children:t});function Le(){h(`spread`);let e=(0,A.useRef)(null);m(e);let[t,r]=(0,A.useState)(250),[i,_]=(0,A.useState)(0),[v,y]=(0,A.useState)(!1),b=i>=K.length-1;(0,A.useEffect)(()=>{if(n)return;let e=setTimeout(()=>y(!0),1600);return()=>clearTimeout(e)},[]),(0,A.useEffect)(()=>{if(!v)return;if(b){y(!1);return}let e=K[i].w,n=6e4/t,r=setTimeout(()=>_(e=>e+1),n*(/[.?!]$/.test(e)?2.1:/[,:;]$/.test(e)?1.5:1));return()=>clearTimeout(r)},[v,i,t,b]),(0,A.useEffect)(()=>{let e=e=>{e.code===`Space`&&!e.target.closest(`input, button, a, [role="slider"]`)&&(e.preventDefault(),y(e=>!e))};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[]);let{w:x,si:ee}=K[i],te=Ie(x),ne=Math.max(0,Math.round((K.length-1-i)/t*60)),re=(0,A.useMemo)(()=>v?.5+(t-150)/120:.25,[v,t]);return(0,j.jsxs)(`div`,{className:`vs`,ref:e,children:[(0,j.jsx)(`a`,{className:`skip-x`,href:`#read`,children:`Skip to the text`}),(0,j.jsx)(`div`,{className:`road`,"aria-hidden":`true`,children:!n&&(0,j.jsx)(W,{curve:`gentle`,speed:re,boosting:v&&t>=340,lanes:3,density:1,glow:.7,dust:.4,interactive:!1,background:`#03040a`,roadColor:`#070912`,lineColor:`#1c2140`,tailColors:[`#ff3d5a`,`#ff7a2e`,`#ff2d92`],headColors:[`#e8f0ff`,`#7aa2ff`,`#9be7ff`],poleColors:[`#3b4680`]})}),(0,j.jsxs)(`header`,{className:`top`,children:[(0,j.jsx)(`a`,{className:`mark`,href:`#top`,"aria-label":`Skeptical, back to the top`,children:`skeptical`}),(0,j.jsx)(`nav`,{"aria-label":`Sections`,children:u.map(e=>(0,j.jsx)(`a`,{href:`#${e.id}`,children:e.label},e.id))})]}),(0,j.jsxs)(`section`,{className:`reader`,id:`top`,"aria-label":`Speed reader`,children:[(0,j.jsx)(`h1`,{className:`sr-only-x`,children:c.heading}),(0,j.jsx)(`p`,{className:`now`,"aria-hidden":`true`,children:G[ee].name}),(0,j.jsxs)(`div`,{className:`word`,"aria-hidden":`true`,children:[(0,j.jsx)(`span`,{className:`l`,children:x.slice(0,te)}),(0,j.jsx)(`span`,{className:`p`,children:x[te]}),(0,j.jsx)(`span`,{className:`r`,children:x.slice(te+1)})]}),(0,j.jsx)(`div`,{className:`ticks`,"aria-hidden":`true`,children:G.map((e,t)=>{let n=K.findIndex(e=>e.si===t),r=K.filter(e=>e.si===t).length;return(0,j.jsx)(`i`,{style:{flexGrow:r},children:(0,j.jsx)(`b`,{style:{transform:`scaleX(${Math.max(0,Math.min(1,(i-n+1)/r))})`}})},e.name)})}),(0,j.jsxs)(`div`,{className:`deck`,children:[(0,j.jsx)(`button`,{type:`button`,className:`play`,onClick:()=>{b?(_(0),y(!0)):y(e=>!e)},"aria-label":v?`Pause`:b?`Read it again`:`Play`,children:v?(0,j.jsx)(E,{size:22}):b?(0,j.jsx)(k,{size:22}):(0,j.jsx)(he,{size:22})}),(0,j.jsxs)(`div`,{className:`dial`,children:[(0,j.jsxs)(`p`,{children:[(0,j.jsx)(`b`,{children:t}),` words a minute`]}),(0,j.jsx)(g,{value:[t],min:150,max:450,step:10,onValueChange:e=>r(e[0]),"aria-label":`Reading speed in words per minute`})]}),(0,j.jsxs)(`p`,{className:`left`,children:[Math.floor(ne/60),`:`,String(ne%60).padStart(2,`0`),` left`]})]}),(0,j.jsx)(`p`,{className:`or`,children:(0,j.jsx)(`a`,{href:`#read`,children:`Or read it slowly.`})})]}),(0,j.jsxs)(`main`,{id:`read`,children:[(0,j.jsxs)(`section`,{children:[(0,j.jsx)(`h2`,{"data-rise":!0,children:d.pitch.join(` `)}),(0,j.jsx)(`p`,{className:`lede`,"data-rise":!0,children:d.statement.join(` `)}),(0,j.jsx)(`p`,{className:`doors`,"data-rise":!0,children:d.doors.map((e,t)=>(0,j.jsx)(`a`,{className:t?`btn alt`:`btn`,href:e.href,rel:`noopener`,children:e.label},e.href))}),(0,j.jsx)(`ol`,{className:`says`,children:a.map(e=>(0,j.jsx)(`li`,{"data-rise":!0,children:e},e))})]}),(0,j.jsxs)(`section`,{id:`record`,children:[(0,j.jsx)(`h2`,{"data-rise":!0,children:o.title}),(0,j.jsx)(`p`,{className:`lede`,"data-rise":!0,children:o.rule}),(0,j.jsxs)(`p`,{className:`dim`,"data-rise":!0,children:[o.when,`. `,o.name,`, `,o.where,`.`]}),(0,j.jsx)(`div`,{className:`rows`,children:o.results.map(e=>(0,j.jsxs)(`p`,{"data-rise":!0,children:[(0,j.jsx)(`b`,{children:e.what}),(0,j.jsxs)(`span`,{children:[e.who,` `,e.more]})]},e.who))}),(0,j.jsx)(`p`,{"data-rise":!0,children:(0,j.jsx)(q,{href:o.more.href,children:o.more.label})})]}),(0,j.jsxs)(`section`,{id:`drive`,children:[(0,j.jsx)(`h2`,{"data-rise":!0,children:p.title}),(0,j.jsx)(`p`,{className:`lede`,"data-rise":!0,children:p.lead}),(0,j.jsx)(`div`,{className:`rows`,children:p.items.map(e=>(0,j.jsxs)(`p`,{"data-rise":!0,children:[(0,j.jsx)(`b`,{children:e.term}),(0,j.jsx)(`span`,{children:e.text})]},e.term))}),(0,j.jsx)(`p`,{"data-rise":!0,children:(0,j.jsx)(q,{href:p.more.href,children:p.more.label})})]}),(0,j.jsxs)(`section`,{id:`people`,children:[(0,j.jsx)(`h2`,{"data-rise":!0,children:f.title}),(0,j.jsx)(`div`,{className:`rows`,children:f.coaches.map(e=>(0,j.jsxs)(`p`,{"data-rise":!0,children:[(0,j.jsx)(`b`,{children:e.name}),(0,j.jsxs)(`span`,{children:[e.role,`. `,e.bio]})]},e.name))}),(0,j.jsxs)(`p`,{"data-rise":!0,children:[f.count,` `,(0,j.jsx)(q,{href:f.more.href,children:f.more.label})]})]}),(0,j.jsxs)(`section`,{id:`join`,children:[(0,j.jsx)(`h2`,{"data-rise":!0,children:s.title}),(0,j.jsx)(`p`,{className:`lede`,"data-rise":!0,children:s.lead}),(0,j.jsx)(`div`,{className:`rows`,children:s.paths.map(e=>(0,j.jsxs)(`p`,{"data-rise":!0,children:[(0,j.jsx)(`b`,{children:(0,j.jsx)(q,{href:e.href,children:e.name})}),(0,j.jsxs)(`span`,{children:[e.line,` `,e.text.join(` `)]})]},e.id))}),(0,j.jsxs)(`p`,{"data-rise":!0,children:[s.already.before,(0,j.jsx)(q,{href:s.already.href,children:s.already.label}),`. `,s.coach.before,(0,j.jsx)(q,{href:s.coach.href,children:s.coach.label}),`. `,s.also,` `,(0,j.jsx)(q,{href:`mailto:${c.email}`,children:c.email})]})]}),(0,j.jsxs)(`footer`,{children:[(0,j.jsx)(`p`,{className:`line`,children:l.line}),(0,j.jsx)(`ul`,{children:l.links.map(e=>(0,j.jsx)(`li`,{children:(0,j.jsx)(q,{href:e.href,children:e.label})},e.href))}),(0,j.jsx)(`ul`,{children:l.pages.map(e=>(0,j.jsx)(`li`,{children:(0,j.jsx)(q,{href:e.href,children:e.label})},e.href))}),(0,j.jsx)(`small`,{children:`Draft 2, version 11. Not the live site.`})]})]})]})}export{Le as default};