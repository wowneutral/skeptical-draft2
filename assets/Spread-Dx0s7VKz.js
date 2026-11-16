import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{d as t,l as n,t as r}from"./jsx-runtime-BAJ4K1lj.js";/* empty css                          *//* empty css            */import{t as i}from"./createLucideIcon-6-U_RRUC.js";import{A as a,Ba as o,Dr as s,Ja as c,Ln as l,Pn as u,U as d,Wn as f,Yt as ee,an as p,ar as m,ct as te,do as ne,ea as re,in as h,io as ie,j as ae,jr as oe,kr as se,no as ce,ro as g,ta as le}from"./three.core-BF58tRDi.js";import{a as _,c as v,i as y,l as b,n as x,o as S,r as C,s as w,t as T}from"./content-D8DUqlkw.js";import{n as ue}from"./motion-66kFq4QZ.js";import{t as E}from"./version-O83IIjLl.js";import{t as D}from"./slider-C9xGrqCx.js";import{o as de}from"./three.module-ChJkI3a6.js";var O={name:`pause`,size:24,node:[[`rect`,{x:`14`,y:`3`,width:`5`,height:`18`,rx:`1`,key:`kaeet6`}],[`rect`,{x:`5`,y:`3`,width:`5`,height:`18`,rx:`1`,key:`1wsw3u`}]]};O.node;var k=i(O),A={name:`play`,size:24,node:[[`path`,{d:`M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z`,key:`10ikf1`}]]};A.node;var fe=i(A),pe={name:`rotate-ccw`,size:24,node:[[`path`,{d:`M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`,key:`1357e3`}],[`path`,{d:`M3 3v5h5`,key:`1xhq8a`}]]};pe.node;var j=i(pe),M=e(t(),1),N=r(),me=400,he=160,ge=80,_e=1500,P=8,ve=[`straight`,`gentle`,`winding`,`hills`,`racing`,`deep`],F={dark:{background:`transparent`,road:`#08080a`,lines:`#25252d`,tail:[`#d856bf`,`#6750a2`,`#c247ac`],head:[`#03b3c3`,`#0e5ea5`,`#324555`],poles:[`#03b3c3`],dust:`#ffffff`},light:{background:`transparent`,road:`#efeff2`,lines:`#d0d0d7`,tail:[`#d856bf`,`#6750a2`,`#c247ac`],head:[`#03b3c3`,`#0e5ea5`,`#324555`],poles:[`#03b3c3`],dust:`#18181b`}},I=`
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
`,ye=`
  ${I}
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
  uniform vec3 uColors[${P}];
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
`,be=`
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
`,xe=`
  ${I}
  attribute vec4 aSeed;
  attribute float aIndex;
  attribute float aSide;
  uniform float uTravel;
  uniform float uCount;
  uniform float uEdge;
  uniform float uHeight;
  uniform float uRadiusScale;
  uniform float uMirror;
  uniform vec3 uColors[${P}];
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
`,Se=`
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
`,Ce=`
  ${I}
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
`,we=`
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uIntensity);
  }
`,Te=`
  ${I}
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
`,Ee=`
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
`,De=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,Oe=`
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
`,L=`
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
`,ke=`
  ${L}
  void main() {
    gl_FragColor = tent();
  }
`,Ae=`
  ${L}
  uniform float uStrength;
  uniform float uCeiling;
  uniform float uLight;
  void main() {
    vec4 color = tent() * uStrength;
    float peak = max(uLight > 0.5 ? color.a : max(color.r, max(color.g, color.b)), 0.0001);
    color *= uCeiling * (1.0 - exp(-peak / uCeiling)) / peak;
    gl_FragColor = uLight > 0.5 ? color : vec4(color.rgb, 0.0);
  }
`,R=null,z=e=>{if(R??=document.createElement(`canvas`).getContext(`2d`),!R)return[1,1,1];R.fillStyle=`#000000`,R.fillStyle=e;let t=String(R.fillStyle);if(t.startsWith(`#`)){let e=parseInt(t.slice(1,7),16);return[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255]}let n=t.match(/[\d.]+/g)?.map(Number)??[0,0,0];return[n[0]/255,n[1]/255,n[2]/255]},je=(e,t,n)=>{let r=n.length?n:[`#ffffff`];for(let t=0;t<P;t++)e.value[t].fromArray(z(r[t%r.length]));t.value=Math.min(r.length,P)},Me=e=>{let t=new p;return t.setIndex(e.index),Object.entries(e.attributes).forEach(([e,n])=>t.setAttribute(e,n)),t},B=e=>Math.sin(e)*.5+.5,V=(e,t)=>Math.cos(Math.PI*e*4+t)*25+Math.cos(Math.PI*e*8+t*2)**2*5,H=(e,t)=>-B(Math.PI*e*8+t)*10-B(Math.PI*e+t/8)**5*10,U=(e,t)=>Math.sin(e*Math.PI*4+t)*10,W=(e,t)=>Math.abs(e*10)**2+Math.sin(e*Math.PI*8+t)*20,Ne=(e,t)=>{let{PI:n,cos:r,sin:i}=Math;return[[r(e*n*5+t)*25-r(.02*n*5+t)*25,i(e*n*2+n*.5+t)*15-i(.02*n*2+n*.5+t)*15,0],[V(e,t)-V(.0125,t),H(e,t)-H(.0125,t),0],[r(e*n*3+t)*30-r(.02*n*3+t)*30,B(e*n*6+t)*30-B(.02*n*6+t)*30,B(e*n*10+t)*20-B(.02*n*10+t)*20],[i(e*n*2+t)*35-i(.0125*n*2+t)*35,i(e*n*3+t)*10-i(.0125*n*3+t)*10,0],[U(e,t)-U(.02,t),W(e,t)-W(.02,t),0]]},Pe=(e,t)=>{let n=.025,[r,,i,a]=Ne(n,e);return[[r[0]*t*2,r[1]*t*.4,-3],[(V(n,e)-V(.032,e))*t*-2,(H(n,e)-H(.032,e))*t*-5,-10],[i[0]*t*2,i[1]*t*2,i[2]*t*2-5],[a[0]*t,a[1]*t,-5],[(U(n,e)-U(.035,e))*t*-2,(W(n,e)-W(.035,e))*t*-4,-10]]},G=({curve:e=`winding`,curvature:t=1,speed:n=1,boost:r=3,fov:i=90,boostFov:p=130,lanes:_=3,roadWidth:v=10,medianWidth:y=2,density:b=40,trailLength:x=1,lightSize:S=1,poles:C=20,poleHeight:w=1,dust:T=100,glow:ue=.6,reflections:E=.5,steer:D=.35,tailColors:O,headColors:k,poleColors:A,roadColor:fe,roadOpacity:pe=.1,lineColor:j,background:I,theme:L=`dark`,interactive:R=!0,boosting:B=!1,onBoostStart:V,onBoostEnd:H,className:U=``,style:W})=>{let Ne=(0,M.useRef)(null),G=F[L]??F.dark,K={light:L===`light`,curve:ve.includes(e)?e:`winding`,curvature:Math.max(0,t),speed:Math.max(0,n),boost:Math.max(1,r),fov:Math.min(170,Math.max(20,i)),boostFov:Math.min(170,Math.max(20,p)),lanes:Math.max(1,Math.round(_)),roadWidth:Math.max(1,v),medianWidth:Math.max(0,y),density:Math.min(he,Math.max(0,Math.round(b))),trailLength:Math.max(.05,x),lightSize:Math.max(.1,S),poles:Math.min(ge,Math.max(0,Math.round(C))),poleHeight:Math.max(.1,w),dust:Math.min(_e,Math.max(0,Math.round(T))),glow:Math.max(0,ue),reflections:Math.max(0,E),steer:Math.max(0,D),tailColors:O?.length?O:G.tail,headColors:k?.length?k:G.head,poleColors:A?.length?A:G.poles,roadColor:fe??G.road,roadOpacity:Math.min(1,Math.max(0,pe)),lineColor:j??G.lines,background:I??G.background,dustColor:G.dust,interactive:R,boosting:B},q=(0,M.useRef)(K);q.current=K;let Fe=(0,M.useRef)({onBoostStart:V,onBoostEnd:H});return Fe.current={onBoostStart:V,onBoostEnd:H},(0,M.useEffect)(()=>{let e=Ne.current;if(!e)return;let t=window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches??!1,n=new de({antialias:!0,alpha:!0,powerPreference:`high-performance`});n.outputColorSpace=f,n.autoClear=!1,n.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),e.appendChild(n.domElement);let r=new re,i=new se(q.current.fov,1,.1,1e4);i.position.set(0,8,-5);let p={uTime:{value:0},uCurvature:{value:1},uCurveA:{value:new ie},uCurveB:{value:0},uFogNear:{value:me*.22},uFogFar:{value:me*.95},uTravel:{value:me},uStretch:{value:0},uPixel:{value:.001}},_=[],v=[],y=(e,t,n,r={})=>{let i=new le({vertexShader:e,fragmentShader:t,uniforms:{...p,...n},transparent:!0,depthWrite:!1,...r});return _.push(i),i},b=()=>({value:Array.from({length:P},()=>new g(1,1,1))}),x=new oe(1,me,1,220);x.rotateX(-Math.PI/2),x.translate(0,0,-200),_.push(x);let S={uWidth:{value:1},uRoadColor:{value:new g},uLineColor:{value:new g},uBackground:{value:new g},uRoadWidth:{value:10},uMedian:{value:2},uLanes:{value:3},uTransparent:{value:0},uOpacity:{value:1}},C=y(Te,Ee,S,{transparent:!0,depthWrite:!0}),w=new m(x,C);w.frustumCulled=!1,w.renderOrder=0,w.layers.enable(1),r.add(w);let T=new o(new u(new g(0,0,0),new g(0,0,-1)),24,1,7,!1);_.push(T);let ue=(e,t,n)=>{let i=Me(T),a=new Float32Array(1280),o=new Float32Array(1280),s=new Float32Array(320),c=new Float32Array(320);for(let e=0;e<he;e++){let t=[Math.random(),Math.random(),Math.random(),Math.random()],n=[Math.random(),Math.random(),Math.random(),Math.random()*Math.random()],r=Math.random();for(let i=0;i<2;i++){let l=e*2+i;a.set(t,l*4),o.set(n,l*4),s[l]=i?.5:-.5,c[l]=r}}i.setAttribute(`aSeedA`,new h(a,4)),i.setAttribute(`aSeedB`,new h(o,4)),i.setAttribute(`aPair`,new h(s,1)),i.setAttribute(`aTone`,new h(c,1)),i.instanceCount=0,_.push(i);let l={uRoadX:{value:0},uRoadWidth:{value:10},uLanes:{value:3},uDirection:{value:e},uSpeedRange:{value:new ce(...n)},uTrail:{value:1},uSize:{value:1},uColors:b(),uColorCount:{value:1},uFade:{value:new ce(...t)}},u=(e,t,n,a)=>{let o=y(ye,be,{...l,uRadiusScale:{value:e},uSharp:{value:t},uMirror:{value:n},uIntensity:{value:1},uCore:{value:0}},{depthTest:!n});v.push(o);let s=new m(i,o);return s.frustumCulled=!1,s.renderOrder=a,n||s.layers.enable(1),r.add(s),o};return{geometry:i,uniforms:l,reflection:u(2.1,1.2,1,1),core:u(1,.85,0,3)}},E=ue(1,[0,.6],[60,80]),D=ue(-1,[1,.4],[120,160]),O=new te(1,1,1,8,1,!0);_.push(O);let k=Me(O),A=new Float32Array(640),fe=new Float32Array(160),pe=new Float32Array(160);for(let e=0;e<ge;e++)for(let t=0;t<2;t++){let n=e*2+t;A.set([Math.random(),Math.random(),Math.random(),Math.random()],n*4),fe[n]=e+(t?.5:0),pe[n]=t?1:-1}k.setAttribute(`aSeed`,new h(A,4)),k.setAttribute(`aIndex`,new h(fe,1)),k.setAttribute(`aSide`,new h(pe,1)),k.instanceCount=0,_.push(k);let j={uCount:{value:20},uEdge:{value:11},uHeight:{value:1},uColors:b(),uColorCount:{value:1}},M=(e,t,n,i)=>{let a=y(xe,Se,{...j,uRadiusScale:{value:e},uSharp:{value:t},uMirror:{value:n},uIntensity:{value:1},uCore:{value:0}},{depthTest:!n});v.push(a);let o=new m(k,a);return o.frustumCulled=!1,o.renderOrder=i,n||o.layers.enable(1),r.add(o),a},N={reflection:M(2.4,1.2,1,1),core:M(1,.8,0,3)},F=new ae,I=new Float32Array(_e*2*4),L=new Float32Array(_e*2);for(let e=0;e<_e;e++){let t=[Math.random(),Math.random(),Math.random(),Math.random()];I.set(t,e*8),I.set(t,e*8+4),L[e*2+1]=1}F.setAttribute(`position`,new a(new Float32Array(_e*2*3),3)),F.setAttribute(`aSeed`,new a(I,4)),F.setAttribute(`aEnd`,new a(L,1)),F.setDrawRange(0,0),_.push(F);let R={uSpread:{value:140},uColor:{value:new g(1,1,1)},uIntensity:{value:.5}},B=y(Ce,we,R);v.push(B);let V=new l(F,B);V.frustumCulled=!1,V.renderOrder=4,r.add(V);let H=n.extensions.has(`EXT_color_buffer_float`)||n.extensions.has(`EXT_color_buffer_half_float`),U=Array.from({length:5},(e,t)=>{let n=new ne(1,1,{type:H?ee:c,depthBuffer:t===0});return _.push(n),n}),W=new re,G=new s(-1,1,1,-1,0,1),K=new oe(2,2);_.push(K);let J=new m(K);J.frustumCulled=!1,W.add(J);let Ie=(e,t)=>{let n=new le({vertexShader:De,fragmentShader:e,uniforms:{uTexture:{value:null},uTexel:{value:new ce},uStrength:{value:1},uCeiling:{value:1},uLight:{value:0}},depthTest:!1,depthWrite:!1,...t});return _.push(n),n},Le=Ie(Oe,{blending:0}),Re=Ie(ke,{blending:5,blendSrc:201,blendDst:201,blendSrcAlpha:201,blendDstAlpha:201}),Y=Ie(Ae,{blending:5,blendSrc:201}),ze=(e,t,r)=>{J.material=e,e.uniforms.uTexture.value=t.texture,e.uniforms.uTexel.value.set(1/t.width,1/t.height),n.setRenderTarget(r),n.render(W,G)},Be=new d,Ve=0,X={boost:0,held:!1,boosted:!1,fov:q.current.fov,fovVelocity:0,steerX:0,steerY:0,pointerX:0,pointerY:0,weights:[0,0,0,0,0],visible:!0},Z={tail:``,head:``,poles:``,surface:``,light:null},Q=new g,He=0,Ue=performance.now(),We=!0,Ge=e=>{let t=e.tailColors.join();t!==Z.tail&&(Z.tail=t,je(E.uniforms.uColors,E.uniforms.uColorCount,e.tailColors));let n=e.headColors.join();n!==Z.head&&(Z.head=n,je(D.uniforms.uColors,D.uniforms.uColorCount,e.headColors));let r=e.poleColors.join();r!==Z.poles&&(Z.poles=r,je(j.uColors,j.uColorCount,e.poleColors));let i=[e.roadColor,e.lineColor,e.background,e.dustColor].join();if(i!==Z.surface){Z.surface=i,S.uRoadColor.value.fromArray(z(e.roadColor)),S.uLineColor.value.fromArray(z(e.lineColor)),R.uColor.value.fromArray(z(e.dustColor));let t=e.background===`transparent`,n=t?[0,0,0]:z(e.background);S.uBackground.value.fromArray(n),S.uTransparent.value=+!!t,Be.setRGB(...n,f),Ve=+!t}Z.light!==e.light&&(Z.light=e.light,v.forEach(t=>{t.blending=e.light?1:2,t.needsUpdate=!0}),Y.blendDst=e.light?205:201,Y.blendSrcAlpha=e.light?201:200,Y.blendDstAlpha=e.light?205:201,Y.uniforms.uLight.value=+!!e.light)},Ke=!1,qe=()=>{let t=Math.max(1,e.clientWidth),r=Math.max(1,e.clientHeight);n.setSize(t,r,!1),U.forEach((e,n)=>e.setSize(Math.max(1,Math.round(t/2**(n+1))),Math.max(1,Math.round(r/2**(n+1))))),i.aspect=t/r,i.updateProjectionMatrix()},Je=()=>{Ke=!0,Xe()},Ye=e=>{if(He=0,Ke&&(Ke=!1,qe()),!We)return;let a=q.current,o=Math.min(.05,Math.max(.001,(e-Ue)/1e3));Ue=e,Ge(a);let s=X.held&&a.interactive||a.boosting?1:0;X.boost+=(s-X.boost)*(1-Math.exp(-o/(s>X.boost?.28:.85)));let c=a.speed*(t?.3:1)*(1+(a.boost-1)*X.boost);p.uTime.value+=o*c,p.uStretch.value=X.boost*1.1,p.uCurvature.value=a.curvature;let l=ve.indexOf(a.curve)-1,u=1-Math.exp(-o/.6);X.weights=X.weights.map((e,t)=>e+(+(t===l)-e)*u),p.uCurveA.value.set(X.weights[0],X.weights[1],X.weights[2],X.weights[3]),p.uCurveB.value=X.weights[4];let d=a.roadWidth/2+a.medianWidth/2,f=.45+.55*a.roadOpacity;[E,D].forEach((e,t)=>{e.geometry.instanceCount=a.density*2,e.uniforms.uRoadX.value=t?d:-d,e.uniforms.uRoadWidth.value=a.roadWidth,e.uniforms.uLanes.value=a.lanes,e.uniforms.uTrail.value=a.trailLength,e.uniforms.uSize.value=a.lightSize,e.core.uniforms.uIntensity.value=a.light?.95:1+.35*X.boost,e.core.uniforms.uCore.value=a.light?0:.75,e.reflection.uniforms.uIntensity.value=a.reflections*(a.light?.22:.42)*f}),k.instanceCount=a.poles*2,j.uCount.value=Math.max(1,a.poles),j.uEdge.value=a.roadWidth+a.medianWidth/2+.8,j.uHeight.value=a.poleHeight,N.core.uniforms.uIntensity.value=a.light?.9:1,N.core.uniforms.uCore.value=a.light?0:.6,N.reflection.uniforms.uIntensity.value=a.reflections*(a.light?.2:.38)*f,F.setDrawRange(0,a.dust*2),R.uIntensity.value=(a.light?.35:.45)*(1+X.boost),R.uSpread.value=(a.roadWidth*2+a.medianWidth)*5,S.uWidth.value=a.roadWidth*2+a.medianWidth+3,S.uRoadWidth.value=a.roadWidth,S.uMedian.value=a.medianWidth,S.uLanes.value=a.lanes,S.uOpacity.value=a.roadOpacity,C.depthWrite=a.roadOpacity>.5;let ee=t?a.fov:a.fov+(a.boostFov-a.fov)*X.boost;X.fovVelocity+=((ee-X.fov)*90-X.fovVelocity*13)*o,X.fov+=X.fovVelocity*o,i.fov=X.fov,p.uPixel.value=2*Math.tan(X.fov*Math.PI/360)/Math.max(1,n.domElement.height);let m=1-Math.exp(-o/.35),te=a.interactive?a.steer:0;X.steerX+=(X.pointerX*te-X.steerX)*m,X.steerY+=(X.pointerY*te-X.steerY)*m,i.position.set(X.steerX*a.roadWidth*.45,8-X.steerY*2.5,-5);let ne=Pe(p.uTime.value,a.curvature),re=1-X.weights.reduce((e,t)=>e+t,0);if(Q.set(0,0,-10*re),ne.forEach((e,t)=>{Q.x+=e[0]*X.weights[t],Q.y+=e[1]*X.weights[t],Q.z+=e[2]*X.weights[t]}),Q.x+=X.steerX*2.5,Q.add(i.position),i.lookAt(Q),i.updateProjectionMatrix(),n.setRenderTarget(null),n.setClearColor(Be,Ve),n.clear(),n.render(r,i),a.glow>0){let e=p.uPixel.value;p.uPixel.value=e*(n.domElement.height/U[0].height),i.layers.set(1),C.colorWrite=!1,n.setRenderTarget(U[0]),n.setClearColor(0,0),n.clear(),n.render(r,i),C.colorWrite=!0,i.layers.set(0),p.uPixel.value=e;for(let e=1;e<U.length;e++)ze(Le,U[e-1],U[e]);for(let e=U.length-1;e>1;e--)ze(Re,U[e],U[e-1]);Y.uniforms.uStrength.value=a.glow*(a.light?.5:1.4),Y.uniforms.uCeiling.value=a.glow*(a.light?.3:.5),ze(Y,U[1],null)}X.visible&&(He=requestAnimationFrame(Ye))},Xe=()=>{!He&&We&&X.visible&&(Ue=performance.now(),He=requestAnimationFrame(Ye))},Ze=e=>{X.held!==e&&(X.held=e,q.current.interactive&&(e?Fe.current.onBoostStart?.():Fe.current.onBoostEnd?.()))},Qe=e=>{(e.button===0||e.pointerType!==`mouse`)&&Ze(!0)},$=()=>Ze(!1),$e=t=>{let n=e.getBoundingClientRect();X.pointerX=(t.clientX-n.left)/n.width*2-1,X.pointerY=(t.clientY-n.top)/n.height*2-1},et=()=>{X.pointerX=0,X.pointerY=0},tt=e=>{q.current.interactive&&e.preventDefault()},nt=new ResizeObserver(Je);nt.observe(e);let rt=new IntersectionObserver(e=>{X.visible=e.some(e=>e.isIntersecting),X.visible&&Xe()});return rt.observe(e),e.addEventListener(`pointerdown`,Qe),e.addEventListener(`pointermove`,$e),e.addEventListener(`pointerleave`,et),e.addEventListener(`contextmenu`,tt),window.addEventListener(`pointerup`,$),window.addEventListener(`pointercancel`,$),window.addEventListener(`blur`,$),Je(),()=>{We=!1,cancelAnimationFrame(He),nt.disconnect(),rt.disconnect(),e.removeEventListener(`pointerdown`,Qe),e.removeEventListener(`pointermove`,$e),e.removeEventListener(`pointerleave`,et),e.removeEventListener(`contextmenu`,tt),window.removeEventListener(`pointerup`,$),window.removeEventListener(`pointercancel`,$),window.removeEventListener(`blur`,$),_.forEach(e=>e.dispose()),n.dispose(),n.domElement.remove()}},[]),(0,N.jsx)(`div`,{ref:Ne,className:`hyperspeed${U?` ${U}`:``}`,style:W})},K=[{name:`Skeptical`,text:[...C.pitch,...C.statement].join(` `)},{name:`How it works`,text:_.join(` `)},{name:v.title,text:`${v.rule} ${v.when}. ${v.name}, ${v.where}. ${v.results.map(e=>`${e.who} ${e.what}. ${e.more}`).join(` `)}`},{name:T.title,text:`${T.lead} ${T.items.map(e=>`${e.term}. ${e.text}`).join(` `)}`},{name:w.title,text:`${w.coaches.map(e=>`${e.name}. ${e.role}. ${e.bio}`).join(` `)} ${w.count}`},{name:y.title,text:`${y.lead} ${y.paths.map(e=>`${e.name}. ${e.line} ${e.text.join(` `)}`).join(` `)}`}],q=K.flatMap((e,t)=>e.text.split(/\s+/).filter(Boolean).map(e=>({w:e,si:t}))),Fe=e=>{let t=e.replace(/[^\p{L}\p{N}]/gu,``).length;return Math.min(e.length-1,t<=1?0:t<=5?1:t<=9?2:t<=13?3:4)},J=({href:e,children:t})=>(0,N.jsx)(`a`,{href:e,rel:e.startsWith(`http`)?`noopener`:void 0,children:t});function Ie(){E(`spread`);let e=(0,M.useRef)(null);ue(e);let[t,r]=(0,M.useState)(250),[i,a]=(0,M.useState)(0),[o,s]=(0,M.useState)(!1),c=i>=q.length-1;(0,M.useEffect)(()=>{if(n)return;let e=setTimeout(()=>s(!0),1600);return()=>clearTimeout(e)},[]),(0,M.useEffect)(()=>{if(!o)return;if(c){s(!1);return}let e=q[i].w,n=6e4/t,r=setTimeout(()=>a(e=>e+1),n*(/[.?!]$/.test(e)?2.1:/[,:;]$/.test(e)?1.5:1));return()=>clearTimeout(r)},[o,i,t,c]),(0,M.useEffect)(()=>{let e=e=>{e.code===`Space`&&!e.target.closest(`input, button, a, [role="slider"]`)&&(e.preventDefault(),s(e=>!e))};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[]);let{w:l,si:u}=q[i],d=Fe(l),f=Math.max(0,Math.round((q.length-1-i)/t*60)),ee=(0,M.useMemo)(()=>o?.5+(t-150)/120:.25,[o,t]);return(0,N.jsxs)(`div`,{className:`vs`,ref:e,children:[(0,N.jsx)(`a`,{className:`skip-x`,href:`#read`,children:`Skip to the text`}),(0,N.jsx)(`div`,{className:`road`,"aria-hidden":`true`,children:!n&&(0,N.jsx)(G,{curve:`gentle`,speed:ee,boosting:o&&t>=340,lanes:3,density:1,glow:.7,dust:.4,interactive:!1,background:`#03040a`,roadColor:`#070912`,lineColor:`#1c2140`,tailColors:[`#ff3d5a`,`#ff7a2e`,`#ff2d92`],headColors:[`#e8f0ff`,`#7aa2ff`,`#9be7ff`],poleColors:[`#3b4680`]})}),(0,N.jsxs)(`header`,{className:`top`,children:[(0,N.jsx)(`a`,{className:`mark`,href:`#top`,"aria-label":`Skeptical, back to the top`,children:`skeptical`}),(0,N.jsx)(`nav`,{"aria-label":`Sections`,children:S.map(e=>(0,N.jsx)(`a`,{href:`#${e.id}`,children:e.label},e.id))})]}),(0,N.jsxs)(`section`,{className:`reader`,id:`top`,"aria-label":`Speed reader`,children:[(0,N.jsx)(`h1`,{className:`sr-only-x`,children:b.heading}),(0,N.jsx)(`p`,{className:`now`,"aria-hidden":`true`,children:K[u].name}),(0,N.jsxs)(`div`,{className:`word`,"aria-hidden":`true`,children:[(0,N.jsx)(`span`,{className:`l`,children:l.slice(0,d)}),(0,N.jsx)(`span`,{className:`p`,children:l[d]}),(0,N.jsx)(`span`,{className:`r`,children:l.slice(d+1)})]}),(0,N.jsx)(`div`,{className:`ticks`,"aria-hidden":`true`,children:K.map((e,t)=>{let n=q.findIndex(e=>e.si===t),r=q.filter(e=>e.si===t).length;return(0,N.jsx)(`i`,{style:{flexGrow:r},children:(0,N.jsx)(`b`,{style:{transform:`scaleX(${Math.max(0,Math.min(1,(i-n+1)/r))})`}})},e.name)})}),(0,N.jsxs)(`div`,{className:`deck`,children:[(0,N.jsx)(`button`,{type:`button`,className:`play`,onClick:()=>{c?(a(0),s(!0)):s(e=>!e)},"aria-label":o?`Pause`:c?`Read it again`:`Play`,children:o?(0,N.jsx)(k,{size:22}):c?(0,N.jsx)(j,{size:22}):(0,N.jsx)(fe,{size:22})}),(0,N.jsxs)(`div`,{className:`dial`,children:[(0,N.jsxs)(`p`,{children:[(0,N.jsx)(`b`,{children:t}),` words a minute`]}),(0,N.jsx)(D,{value:[t],min:150,max:450,step:10,onValueChange:e=>r(e[0]),"aria-label":`Reading speed in words per minute`})]}),(0,N.jsxs)(`p`,{className:`left`,children:[Math.floor(f/60),`:`,String(f%60).padStart(2,`0`),` left`]})]}),(0,N.jsx)(`p`,{className:`or`,children:(0,N.jsx)(`a`,{href:`#read`,children:`Or read it slowly.`})})]}),(0,N.jsxs)(`main`,{id:`read`,children:[(0,N.jsxs)(`section`,{children:[(0,N.jsx)(`h2`,{"data-rise":!0,children:C.pitch.join(` `)}),(0,N.jsx)(`p`,{className:`lede`,"data-rise":!0,children:C.statement.join(` `)}),(0,N.jsx)(`p`,{className:`doors`,"data-rise":!0,children:C.doors.map((e,t)=>(0,N.jsx)(`a`,{className:t?`btn alt`:`btn`,href:e.href,rel:`noopener`,children:e.label},e.href))}),(0,N.jsx)(`ol`,{className:`says`,children:_.map(e=>(0,N.jsx)(`li`,{"data-rise":!0,children:e},e))})]}),(0,N.jsxs)(`section`,{id:`record`,children:[(0,N.jsx)(`h2`,{"data-rise":!0,children:v.title}),(0,N.jsx)(`p`,{className:`lede`,"data-rise":!0,children:v.rule}),(0,N.jsxs)(`p`,{className:`dim`,"data-rise":!0,children:[v.when,`. `,v.name,`, `,v.where,`.`]}),(0,N.jsx)(`div`,{className:`rows`,children:v.results.map(e=>(0,N.jsxs)(`p`,{"data-rise":!0,children:[(0,N.jsx)(`b`,{children:e.what}),(0,N.jsxs)(`span`,{children:[e.who,` `,e.more]})]},e.who))}),(0,N.jsx)(`p`,{"data-rise":!0,children:(0,N.jsx)(J,{href:v.more.href,children:v.more.label})})]}),(0,N.jsxs)(`section`,{id:`drive`,children:[(0,N.jsx)(`h2`,{"data-rise":!0,children:T.title}),(0,N.jsx)(`p`,{className:`lede`,"data-rise":!0,children:T.lead}),(0,N.jsx)(`div`,{className:`rows`,children:T.items.map(e=>(0,N.jsxs)(`p`,{"data-rise":!0,children:[(0,N.jsx)(`b`,{children:e.term}),(0,N.jsx)(`span`,{children:e.text})]},e.term))}),(0,N.jsx)(`p`,{"data-rise":!0,children:(0,N.jsx)(J,{href:T.more.href,children:T.more.label})})]}),(0,N.jsxs)(`section`,{id:`people`,children:[(0,N.jsx)(`h2`,{"data-rise":!0,children:w.title}),(0,N.jsx)(`div`,{className:`rows`,children:w.coaches.map(e=>(0,N.jsxs)(`p`,{"data-rise":!0,children:[(0,N.jsx)(`b`,{children:e.name}),(0,N.jsxs)(`span`,{children:[e.role,`. `,e.bio]})]},e.name))}),(0,N.jsxs)(`p`,{"data-rise":!0,children:[w.count,` `,(0,N.jsx)(J,{href:w.more.href,children:w.more.label})]})]}),(0,N.jsxs)(`section`,{id:`join`,children:[(0,N.jsx)(`h2`,{"data-rise":!0,children:y.title}),(0,N.jsx)(`p`,{className:`lede`,"data-rise":!0,children:y.lead}),(0,N.jsx)(`div`,{className:`rows`,children:y.paths.map(e=>(0,N.jsxs)(`p`,{"data-rise":!0,children:[(0,N.jsx)(`b`,{children:(0,N.jsx)(J,{href:e.href,children:e.name})}),(0,N.jsxs)(`span`,{children:[e.line,` `,e.text.join(` `)]})]},e.id))}),(0,N.jsxs)(`p`,{"data-rise":!0,children:[y.already.before,(0,N.jsx)(J,{href:y.already.href,children:y.already.label}),`. `,y.coach.before,(0,N.jsx)(J,{href:y.coach.href,children:y.coach.label}),`. `,y.also,` `,(0,N.jsx)(J,{href:`mailto:${b.email}`,children:b.email})]})]}),(0,N.jsxs)(`footer`,{children:[(0,N.jsx)(`p`,{className:`line`,children:x.line}),(0,N.jsx)(`ul`,{children:x.links.map(e=>(0,N.jsx)(`li`,{children:(0,N.jsx)(J,{href:e.href,children:e.label})},e.href))}),(0,N.jsx)(`ul`,{children:x.pages.map(e=>(0,N.jsx)(`li`,{children:(0,N.jsx)(J,{href:e.href,children:e.label})},e.href))}),(0,N.jsx)(`small`,{children:`Draft 2, version 11. Not the live site.`})]})]})]})}export{Ie as default};