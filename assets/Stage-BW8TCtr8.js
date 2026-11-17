import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{a as t,s as n,t as r}from"./react-three-fiber.esm-DZF78O6x.js";import{a as i,d as a,l as o,n as s,t as c}from"./jsx-runtime-BAJ4K1lj.js";import{n as l}from"./scroll-CIxM5NtI.js";import{L as u,Wi as d,jr as f,ro as p,ta as m}from"./three.core-BF58tRDi.js";import{t as h}from"./marks-Ce1ST7vc.js";import{n as g,t as _}from"./state-BFXPmPmf.js";var v=e(a(),1),y=1024,b=1366,x=b/y;function S(e){let t=e>>>0;return()=>(t=t*1664525+1013904223>>>0,t/4294967296)}function C(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,[n,n.getContext(`2d`)]}function w(e,t,n,r){let i=h.roman,a=r/i.h;return e.setTransform(a,0,0,a,t,n),new Path2D(i.d)}function T(){let[e,t]=C(y,b),n=S(93);t.fillStyle=`rgb(150,150,150)`,t.fillRect(0,0,y,b);let[r,i]=C(y,b);for(let e=0;e<520;e++){let e=n()*y,t=n()*b,r=18+n()*90;i.fillStyle=n()<.5?`rgba(255,255,255,0.07)`:`rgba(0,0,0,0.07)`,i.beginPath(),i.arc(e,t,r,0,Math.PI*2),i.fill()}t.filter=`blur(26px)`,t.drawImage(r,0,0),i.clearRect(0,0,y,b);for(let e=0;e<900;e++){let e=n()*y,t=n()*b,r=3+n()*12;i.fillStyle=n()<.5?`rgba(255,255,255,0.08)`:`rgba(0,0,0,0.08)`,i.beginPath(),i.arc(e,t,r,0,Math.PI*2),i.fill()}t.filter=`blur(6px)`,t.drawImage(r,0,0),t.filter=`none`,t.lineCap=`round`;for(let e=0;e<2600;e++){let e=n()*y,r=n()*b,i=n()*Math.PI*2,a=8+n()*34;t.strokeStyle=`rgba(255,255,255,${.05+n()*.1})`,t.lineWidth=.6+n()*1.2,t.beginPath(),t.moveTo(e,r);for(let o=0;o<5;o++)i+=(n()-.5)*.9,e+=Math.cos(i)*a/5,r+=Math.sin(i)*a/5,t.lineTo(e,r);t.stroke()}for(let e=4;e<b;e+=9){t.strokeStyle=`rgba(0,0,0,0.16)`,t.lineWidth=2.2,t.beginPath();for(let n=0;n<=y;n+=32)t.lineTo(n,e+Math.sin(n*.011+e*.3)*.7);t.stroke()}let[a,o]=C(y,b),[s,c]=C(y,b);for(let e=46;e<y;e+=118){let t=(n()-.5)*4;o.strokeStyle=`rgba(255,255,255,0.22)`,o.lineWidth=22,o.beginPath(),o.moveTo(e+t,0),o.lineTo(e-t,b),o.stroke(),c.strokeStyle=`rgba(0,0,0,0.42)`,c.lineWidth=3,c.beginPath(),c.moveTo(e+t,0),c.lineTo(e-t,b),c.stroke()}t.filter=`blur(9px)`,t.drawImage(a,0,0),t.filter=`blur(1px)`,t.drawImage(s,0,0),t.filter=`none`;let l=y*.5,u=b*.6,d=b*.5;t.save();let f=w(t,l,u,d),p=d/h.roman.h;t.filter=`blur(10px)`,t.strokeStyle=`rgba(255,255,255,0.55)`,t.lineWidth=34/p,t.stroke(f),t.filter=`blur(3px)`,t.fillStyle=`rgba(0,0,0,0.6)`,t.fill(f),t.restore();let[m,g]=C(y,b);g.save(),f=w(g,l,u,d),g.fillStyle=`#fff`,g.fill(f),g.restore();let[_,v]=C(y,b);v.filter=`blur(12px)`,v.drawImage(m,-11,-14),v.filter=`none`,v.globalCompositeOperation=`source-in`,v.fillStyle=`rgba(0,0,0,0)`;let[x,T]=C(y,b);T.drawImage(m,0,0),T.globalCompositeOperation=`destination-out`,T.drawImage(_,0,0),T.globalCompositeOperation=`source-in`,T.fillStyle=`rgba(255,255,255,0.5)`,T.fillRect(0,0,y,b),t.filter=`blur(5px)`,t.drawImage(x,0,0),t.filter=`none`;let[E,D]=C(y,b);return D.drawImage(m,0,0),D.globalCompositeOperation=`destination-out`,D.filter=`blur(6px)`,D.drawImage(m,7,9),D.globalCompositeOperation=`source-in`,D.filter=`none`,D.fillStyle=`rgba(0,0,0,0.6)`,D.fillRect(0,0,y,b),t.filter=`blur(2px)`,t.drawImage(E,0,0),t.filter=`none`,e}function E(){let[e,t]=C(512,683),n=S(7);t.fillStyle=`rgb(235,235,235)`,t.fillRect(0,0,512,683),t.filter=`blur(14px)`;for(let e=0;e<260;e++)t.fillStyle=n()<.5?`rgba(255,255,255,0.1)`:`rgba(0,0,0,0.1)`,t.beginPath(),t.arc(n()*512,n()*683,10+n()*50,0,Math.PI*2),t.fill();return e}function D(){let[e,t]=C(256,256),n=S(11),r=t.createImageData(256,256);for(let e=0;e<65536;e++){let t=100+n()*60;r.data[e*4]=r.data[e*4+1]=r.data[e*4+2]=t,r.data[e*4+3]=255}t.putImageData(r,0,0);let[i,a]=C(256,256),[o,s]=C(768,768);for(let t of[0,256,512])for(let n of[0,256,512])s.drawImage(e,t,n);a.filter=`blur(1.4px)`,a.drawImage(o,-256,-256),a.filter=`none`,a.lineCap=`round`;for(let e=0;e<160;e++){let e=n()*256,t=n()*256,r=n()*6.28;a.strokeStyle=`rgba(255,255,255,${.12+n()*.2})`,a.lineWidth=.8+n(),a.beginPath(),a.moveTo(e,t);for(let i=0;i<4;i++)r+=n()-.5,e+=Math.cos(r)*5,t+=Math.sin(r)*5,a.lineTo(e,t);a.stroke()}return i}function O(e){let[t,n]=C(y,b);n.fillStyle=`#000`,n.textAlign=`center`,n.textBaseline=`alphabetic`;let r=`SKEPTICAL`,i=160;n.font=`600 ${i}px "Bodoni Moda Variable", "Bodoni Moda", serif`;let a=.06,o=()=>n.measureText(r).width+a*i*8;i=y*.8*i/o(),n.font=`600 ${i}px "Bodoni Moda Variable", "Bodoni Moda", serif`;let s=y/2-o()/2,c=b*.2;n.textAlign=`left`;for(let e of r)n.fillText(e,s,c),s+=n.measureText(e).width+a*i;return n.fillRect(y*.1,b*.235,y*.8,2),n.textAlign=`center`,n.font=`italic 400 ${Math.round(y*.034)}px "Bodoni Moda Variable", "Bodoni Moda", serif`,n.fillText(e,y/2,b*.93),t}var k=c(),A=2.4,j=A*x,M=new p(-5.6,1.9,3),N=`
uniform float uBend;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vT; varying vec3 vB;
void main(){
  vUv = uv;
  vec3 p = position;
  float y = uv.y, x = uv.x;
  p.z += uBend * (sin(y * 3.14159) * 0.10 + (1.0 - y) * (1.0 - y) * 0.07 + sin(x * 3.14159) * 0.035);
  float dzdy = uBend * (cos(y * 3.14159) * 3.14159 * 0.10 - 2.0 * (1.0 - y) * 0.07) / ${j.toFixed(4)};
  float dzdx = uBend * cos(x * 3.14159) * 3.14159 * 0.035 / ${A.toFixed(4)};
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  mat3 m = mat3(modelMatrix);
  vN = normalize(m * normalize(vec3(-dzdx, -dzdy, 1.0)));
  vT = normalize(m * vec3(1.0, 0.0, dzdx));
  vB = normalize(m * vec3(0.0, 1.0, dzdy));
  gl_Position = projectionMatrix * viewMatrix * w;
}`,P=`
uniform sampler2D uThick; uniform sampler2D uPrint; uniform sampler2D uTooth;
uniform vec3 uLamp; uniform float uLampI; uniform vec3 uKey; uniform float uKeyI;
uniform float uHeavy; uniform float uSeed; uniform float uAmb;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vT; varying vec3 vB;
float hash(float n){ return fract(sin(n) * 43758.5453); }
float vn(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
float deckle(float along, float s){ return 0.008 + 0.016 * vn(along * 9.0 + s) + 0.007 * vn(along * 47.0 + s * 3.1) + 0.003 * vn(along * 160.0 + s); }
void main(){
  vec2 uv = vUv;
  float dl = uv.x * ${A.toFixed(4)}, dr = (1.0 - uv.x) * ${A.toFixed(4)};
  float db = uv.y * ${j.toFixed(4)}, dt = (1.0 - uv.y) * ${j.toFixed(4)};
  float kl = deckle(uv.y * ${j.toFixed(4)}, uSeed + 1.0), kr = deckle(uv.y * ${j.toFixed(4)}, uSeed + 7.0);
  float kb = deckle(uv.x * ${A.toFixed(4)}, uSeed + 13.0), kt = deckle(uv.x * ${A.toFixed(4)}, uSeed + 29.0);
  if (dl < kl || dr < kr || db < kb || dt < kt) discard;
  float feather = smoothstep(0.0, 0.05, min(min(dl - kl, dr - kr), min(db - kb, dt - kt)));

  float thick = mix(texture2D(uThick, uv).r, 0.97, uHeavy);
  vec2 tuv = uv * vec2(${A.toFixed(4)}, ${j.toFixed(4)}) * 1.35;
  float e = 1.0 / 256.0;
  float h = texture2D(uTooth, tuv).r;
  float hx = texture2D(uTooth, tuv + vec2(e, 0.0)).r - texture2D(uTooth, tuv - vec2(e, 0.0)).r;
  float hy = texture2D(uTooth, tuv + vec2(0.0, e)).r - texture2D(uTooth, tuv - vec2(0.0, e)).r;
  vec3 N0 = normalize(vN);
  if (!gl_FrontFacing) N0 = -N0;
  vec3 N = normalize(N0 - (hx * normalize(vT) + hy * normalize(vB)) * 2.5);

  vec3 V = normalize(cameraPosition - vWorld);
  vec3 bone = pow(vec3(0.93, 0.895, 0.83), vec3(2.2));
  vec3 albedo = bone * (0.9 + 0.35 * (h - 0.5)) * (1.0 - 0.05 * (thick - 0.59));
  float ink = texture2D(uPrint, uv).a * (1.0 - uHeavy);
  vec3 base = mix(albedo, vec3(0.006, 0.0055, 0.005), ink);

  vec3 Kd = normalize(uKey - vWorld);
  float kd = max(dot(N, Kd), 0.0);
  vec3 keyCol = vec3(1.0, 0.95, 0.88);
  vec3 col = base * (keyCol * kd * uKeyI + vec3(0.05, 0.047, 0.043) * uAmb);
  vec3 Hh = normalize(Kd + V);
  col += keyCol * pow(max(dot(N, Hh), 0.0), 60.0) * ink * 0.35 * uKeyI;

  vec3 Ld = uLamp - vWorld; float ld = length(Ld); Ld /= ld;
  vec3 lampCol = vec3(1.0, 0.6, 0.28);
  col += base * lampCol * max(dot(N, Ld), 0.0) * uLampI * 0.5 / (1.0 + ld * ld * 0.2);

  // light through the sheet
  float back = clamp(-dot(N0, Ld) * 4.0, 0.0, 1.0);
  float fwd = max(dot(-V, Ld), 0.0);
  float scatter = 0.07 + 0.55 * pow(fwd, 6.0) + 2.2 * pow(fwd, 36.0);
  float T = exp(-(thick - 0.59) * 5.0);
  T *= mix(1.8, 1.0, feather);
  T *= 1.0 - ink * 0.985;
  T *= mix(1.0, 0.0025, uHeavy);
  col += lampCol * mix(vec3(1.0), albedo, 0.5) * T * scatter * back * uLampI * 0.62 / (1.0 + ld * ld * 0.04);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;function F(e,t=!1){let n=new u(e);return n.colorSpace=``,n.anisotropy=8,t&&(n.wrapS=n.wrapT=d),n.needsUpdate=!0,n}function I(e,t,n){return new m({vertexShader:N,fragmentShader:P,side:2,uniforms:{uThick:{value:t?e.heavy:e.thick},uPrint:{value:e.print},uTooth:{value:e.tooth},uLamp:{value:new p},uLampI:{value:0},uKey:{value:M.clone()},uKeyI:{value:0},uHeavy:{value:+!!t},uSeed:{value:n},uAmb:{value:1},uBend:{value:0}}})}function L({maps:e}){let{camera:r,size:a}=n(),c=r,u=(0,v.useRef)(null),d=(0,v.useRef)(null),m=(0,v.useRef)(null),h=(0,v.useRef)(null),y=(0,v.useRef)(null),b=(0,v.useMemo)(()=>new f(A,j,24,32),[]),x=(0,v.useMemo)(()=>I(e,!1,3),[e]),S=(0,v.useMemo)(()=>{let t=I(e,!0,41);return t.uniforms.uAmb.value=5,t},[e]),C=(0,v.useRef)({lift:+!!o,v:0,side:0,cover:0,bright:0,up:0,zoom:1,lx:.3,ly:.1,born:performance.now()/1e3,hold:0,camL:+!!o}),w=(0,v.useMemo)(()=>new p,[]),T=(0,v.useMemo)(()=>new p,[]);return(0,v.useEffect)(()=>()=>{b.dispose(),x.dispose(),S.dispose()},[b,x,S]),t((e,t)=>{let n=Math.min(t,1.2),r=C.current,f=performance.now()/1e3,p=e.clock.elapsedTime,v=_(l.y);g.dragging||(g.hold=i(g.hold,0,3.2,n));let b=o?1:s(Math.max(v.lift,g.pinned)+g.hold,0,1.08);if(o)r.lift=1,r.v=0;else{let e=Math.ceil(n/(1/60)),t=n/e;for(let n=0;n<e;n++)r.v+=(b-r.lift)*46*t,r.v*=Math.exp(-7.5*t),r.lift+=r.v*t}let E=r.lift;r.camL=o?1:i(r.camL,s(E,0,1),3.4,n);let D=o?1:1-Math.exp(-4*n);r.side+=(v.side-r.side)*D,r.cover+=(v.cover-r.cover)*(o?1:1-Math.exp(-3*n)),r.bright+=(v.bright-r.bright)*D,r.up+=(v.up-r.up)*D,r.zoom+=(v.zoom-r.zoom)*D;let O=f-r.born,k=o?1:s((O-.2)/1.6),A=o?1:s((O-1.1)/1.4),j=g.px,M=g.py;g.aim===null?f-g.moved>3&&!o&&(j=Math.sin(p*.31)*.7,M=Math.cos(p*.23)*.35):(j=g.aim*.85,M=.1),r.lx=o?.25:i(r.lx,j,2.2,n),r.ly=o?.15:i(r.ly,M,2.2,n);let N=u.current,P=s(E,-.1,1.1),F=s(P)**.75;N.position.set(0,.012+1.92*P,.3-.5*P),N.rotation.set(-Math.PI/2+(Math.PI/2-.07)*F+r.ly*.05*P,-r.lx*.11*P,o?0:Math.sin(p*.6)*.012*P);let I=s(.55*P+r.v*.12,-.3,1),L=T.set(r.lx*1.7,1.95+r.ly*1,-2.5);m.current.position.copy(L);let z=A*(1+.7*r.bright)*(.55+.45*s(P));h.current.intensity=9*z,y.current.intensity=95*k*(1-.45*s(P));for(let e of[x,S])e.uniforms.uLamp.value.copy(L),e.uniforms.uLampI.value=z*2.3,e.uniforms.uKeyI.value=k*(2.3-1.85*s(P)),e.uniforms.uBend.value=I;let B=d.current;B.visible=r.cover>.01,B.position.set((1-r.cover)*5.2+.07,-.06+(1-r.cover)*.6,.035),B.rotation.set(0,0,.018+(1-r.cover)*.22);let V=R(r.camL),H=a.width/a.height,U=Math.max(8.4,4.9/H)/(r.zoom*(g.phone?1-.1*(1-V):1));w.set(0,0+1.92*V,.3-.5*V);let W=1-.95*V;c.position.set(w.x+Math.sin(-r.lx*.04)*U,w.y+Math.sin(W)*U,w.z+Math.cos(W)*U),c.lookAt(w);let G=a.width,K=a.height,q=g.phone?0:r.side*.24,J=g.phone?.13+.07*(1-V)+r.up*.3:r.up;c.setViewOffset(G,K,-q*G,J*K,G,K)}),(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(`color`,{attach:`background`,args:[`#0b0a09`]}),(0,k.jsx)(`ambientLight`,{intensity:.06,color:`#ffe8cc`}),(0,k.jsx)(`spotLight`,{ref:y,position:M,angle:.5,penumbra:.85,decay:2,color:`#fff3e2`,castShadow:!0,"shadow-mapSize":[1024,1024],"shadow-bias":-4e-4,"shadow-camera-near":2,"shadow-camera-far":16}),(0,k.jsx)(`pointLight`,{ref:h,position:[0,2,-2.5],color:`#ffa04a`,decay:2,distance:0}),(0,k.jsxs)(`group`,{ref:u,children:[(0,k.jsx)(`mesh`,{geometry:b,material:x,castShadow:!0}),(0,k.jsx)(`mesh`,{ref:d,geometry:b,material:S,scale:.965,castShadow:!0})]}),(0,k.jsxs)(`group`,{ref:m,children:[(0,k.jsxs)(`mesh`,{children:[(0,k.jsx)(`sphereGeometry`,{args:[.13,32,16]}),(0,k.jsx)(`meshBasicMaterial`,{color:`#ffd6a3`,toneMapped:!1})]}),(0,k.jsxs)(`mesh`,{position:[0,.2,0],children:[(0,k.jsx)(`cylinderGeometry`,{args:[.06,.07,.16,24]}),(0,k.jsx)(`meshStandardMaterial`,{color:`#141210`,roughness:.35,metalness:.6})]}),(0,k.jsxs)(`mesh`,{position:[0,5.3,0],children:[(0,k.jsx)(`cylinderGeometry`,{args:[.012,.012,10,8]}),(0,k.jsx)(`meshStandardMaterial`,{color:`#0a0908`,roughness:.6})]})]}),(0,k.jsxs)(`mesh`,{"rotation-x":-Math.PI/2,receiveShadow:!0,children:[(0,k.jsx)(`planeGeometry`,{args:[60,40]}),(0,k.jsx)(`meshStandardMaterial`,{color:`#1b1712`,roughness:.62,metalness:0})]}),(0,k.jsxs)(`mesh`,{position:[0,8,-7],receiveShadow:!0,children:[(0,k.jsx)(`planeGeometry`,{args:[60,20]}),(0,k.jsx)(`meshStandardMaterial`,{color:`#14110d`,roughness:.95})]})]})}var R=e=>{let t=s(e,0,1);return t*t*(3-2*t)};function z({line:e}){let[t,n]=(0,v.useState)(null);return(0,v.useEffect)(()=>{let t=!0,r=`"Bodoni Moda Variable"`;return Promise.all([document.fonts.load(`600 100px ${r}`),document.fonts.load(`italic 400 40px ${r}`)]).catch(()=>null).then(()=>{t&&(n({thick:F(T()),print:F(O(e)),tooth:F(D(),!0),heavy:F(E())}),g.ready=!0)}),()=>{t=!1}},[e]),(0,v.useEffect)(()=>()=>{t&&Object.values(t).forEach(e=>e.dispose())},[t]),(0,k.jsx)(r,{shadows:{type:1},dpr:[1,g.phone?1.5:1.6],camera:{fov:30,near:.1,far:80,position:[0,6,4]},gl:{antialias:!0,powerPreference:`high-performance`},style:{touchAction:`pan-y`},children:t&&(0,k.jsx)(L,{maps:t})})}export{z as default};