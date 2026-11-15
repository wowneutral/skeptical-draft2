import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{d as t,l as n,t as r}from"./jsx-runtime-BAJ4K1lj.js";import{a as i,s as a,t as o}from"./react-three-fiber.esm-BeYEtBgh.js";import{Pt as s,U as c,ro as l,ta as u}from"./three.core-BF58tRDi.js";import{t as d}from"./SVGLoader-DOTwrwdd.js";import{t as f}from"./marks-Ce1ST7vc.js";var p=e(t(),1),m=r(),h={v:0,drag:!1,angle:.3,tilt:0,kick:0},g=`
  varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    vW = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }`,_=`
  uniform float uPx; uniform vec3 uInk; uniform vec3 uHi; uniform vec3 uPaper; uniform vec3 uL;
  varying vec3 vN; varying vec3 vV; varying vec3 vW;
  float bayer(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    int i = int(q.x) + int(q.y) * 4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    float v = 0.0;
    for (int k = 0; k < 16; k++) if (k == i) v = m[k];
    return (v + 0.5) / 16.0;
  }
  void main() {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(vV);
    vec3 l = normalize(uL);
    float d = max(dot(n, l), 0.0);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 h = normalize(l + v);
    float sp = pow(max(dot(n, h), 0.0), 40.0);
    float i = clamp(0.12 + d * 0.78 + rim * 0.25 + sp * 0.9, 0.0, 1.0);
    float t = bayer(gl_FragCoord.xy / uPx);
    vec3 c;
    if (i < 0.5) c = (i * 2.0 > t) ? uHi : uInk;
    else c = ((i - 0.5) * 2.0 > t) ? uPaper : uHi;
    gl_FragColor = vec4(c, 1.0);
  }`,v=`
  uniform float uPx; uniform vec3 uInk; uniform float uK;
  varying vec2 vUv;
  float bayer(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    int i = int(q.x) + int(q.y) * 4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    float v = 0.0;
    for (int k = 0; k < 16; k++) if (k == i) v = m[k];
    return (v + 0.5) / 16.0;
  }
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.1, r) * uK;
    if (a < bayer(gl_FragCoord.xy / uPx)) discard;
    gl_FragColor = vec4(uInk, 1.0);
  }`,y=e=>new c(e);function b(){return(0,p.useMemo)(()=>{let e=new d().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${f.italic.d}"/></svg>`).paths.flatMap(e=>d.createShapes(e)),t=new s(e,{depth:220,bevelEnabled:!0,bevelThickness:34,bevelSize:22,bevelSegments:4,curveSegments:18});t.rotateX(Math.PI),t.center();let n=2.6/f.italic.h;return t.scale(n,n,n),t.computeVertexNormals(),t},[])}function x({px:e}){let t=b(),r=(0,p.useRef)(null),o=(0,p.useRef)(null),{gl:s}=a(),c=(0,p.useMemo)(()=>new u({vertexShader:g,fragmentShader:_,uniforms:{uPx:{value:e*s.getPixelRatio()},uInk:{value:y(`#15171d`)},uHi:{value:y(`#ffd84a`)},uPaper:{value:y(`#f3f1ea`)},uL:{value:new l(-.6,.8,.9)}}}),[e,s]),d=(0,p.useMemo)(()=>new u({vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,fragmentShader:v,transparent:!1,uniforms:{uPx:{value:e*s.getPixelRatio()},uInk:{value:y(`#15171d`)},uK:{value:.7}}}),[e,s]),f=(0,p.useRef)(0);return i((e,t)=>{let i=r.current;if(!i)return;if(t=Math.min(t,.05),f.current+=t,!h.drag){let e=Math.round(h.angle/(Math.PI*2))*Math.PI*2+(n?.35:Math.sin(f.current*.6)*.45+.2),r=Math.abs(h.v)>2.2;h.v*=Math.exp(-(r?.9:2.6)*t),r||(h.v+=(e-h.angle)*9*t),h.angle+=h.v*t}h.kick*=Math.exp(-4*t);let a=n?0:Math.sin(f.current*1.3)*.06;if(i.rotation.y=h.angle,i.rotation.x=h.tilt*.4+Math.sin(f.current*.7)*.05,i.rotation.z=-.08+h.kick*.2,i.position.y=.12+a+h.kick*.3,o.current){let e=1-(a+h.kick*.3)*1.2;o.current.scale.set(1.6*e,.5*e,1)}e.invalidate()}),(0,m.jsxs)(`group`,{children:[(0,m.jsx)(`mesh`,{ref:r,geometry:t,material:c}),(0,m.jsx)(`mesh`,{ref:o,material:d,position:[.05,-1.45,-.2],"rotation-x":-Math.PI/2,children:(0,m.jsx)(`planeGeometry`,{args:[1,1]})})]})}function S({px:e=3}){return(0,m.jsx)(o,{className:`m3-canvas`,dpr:[1,1.6],flat:!0,gl:{antialias:!1,alpha:!0,powerPreference:`low-power`},camera:{fov:20,position:[0,.1,8.6],near:.1,far:50},children:(0,m.jsx)(x,{px:e})})}function C(){try{let e=document.createElement(`canvas`);return!!(e.getContext(`webgl2`)||e.getContext(`webgl`))}catch{return!1}}export{C as n,h as r,S as t};