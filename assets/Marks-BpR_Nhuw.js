import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{d as t,l as n,t as r}from"./jsx-runtime-BAJ4K1lj.js";import{A as i,L as a,j as o,no as s,ta as c}from"./three.core-BF58tRDi.js";import{a as l,s as u}from"./react-three-fiber.esm-DZF78O6x.js";import{n as d}from"./scroll-CIxM5NtI.js";import{t as f}from"./marks-Ce1ST7vc.js";var p=e(t(),1),m=r(),h=`
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
}`;function g({show:e}){let{size:t,viewport:r}=u(),i=(0,p.useMemo)(()=>new c({vertexShader:`void main(){ gl_Position = vec4(position.xy, 1.0, 1.0); }`,fragmentShader:h,depthTest:!1,depthWrite:!1,uniforms:{uRes:{value:new s(1,1)},uT:{value:0},uShow:{value:0},uP:{value:0},uDpr:{value:1},uPhone:{value:0}}}),[]);return l(a=>{let o=i.uniforms;o.uRes.value.set(t.width*r.dpr,t.height*r.dpr),o.uDpr.value=r.dpr,o.uPhone.value=+(t.width<=820),o.uT.value=(n?0:a.clock.elapsedTime*.035)+d.p*5,o.uShow.value=e.reveal,o.uP.value=d.p}),(0,m.jsx)(`mesh`,{frustumCulled:!1,renderOrder:-10,material:i,children:(0,m.jsx)(`planeGeometry`,{args:[2,2]})})}function _({count:e=90,show:t,mask:r}){let{size:h,viewport:g}=u(),{geometry:_,material:v}=(0,p.useMemo)(()=>{let t=document.createElement(`canvas`);t.width=t.height=128;let n=t.getContext(`2d`),r=f.italic,l=102.4/r.h;n.translate(64,64),n.scale(l,l),n.fillStyle=`#fff`,n.fill(new Path2D(r.d));let u=new a(t),d=11,p=()=>(d=d*16807%2147483647,d/2147483647),m=new Float32Array(e*3),h=new Float32Array(e);for(let t=0;t<e;t++){let e=p()*Math.PI*2,n=1.7+p()*1.5;m.set([Math.cos(e)*n,p()*6-3,Math.sin(e)*n],t*3),h[t]=p()}let g=new o;return g.setAttribute(`position`,new i(m,3)),g.setAttribute(`aSeed`,new i(h,1)),{geometry:g,material:new c({transparent:!0,depthWrite:!1,uniforms:{uMap:{value:u},uT:{value:0},uScale:{value:1},uShow:{value:0},uMask:{value:new s(1,0)}},vertexShader:`
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
        }`,fragmentShader:`
        precision mediump float; uniform sampler2D uMap; varying float vA; varying float vRot;
        void main(){
          vec2 uv = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot);
          uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) + 0.5;
          float a = texture2D(uMap, uv).a * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(pow(vec3(240.0, 240.0, 236.0) / 255.0, vec3(2.2)), a);
        }`})}},[e]);return l(e=>{let i=v.uniforms;i.uT.value=(n?0:e.clock.elapsedTime)+d.p*16,i.uShow.value=t.reveal,i.uScale.value=200*g.dpr*(h.height/900),i.uMask.value.set(r.x,r.y)}),(0,m.jsx)(`points`,{geometry:_,material:v,frustumCulled:!1})}export{g as n,_ as t};