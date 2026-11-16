import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{d as t,i as n,l as r,t as i}from"./jsx-runtime-BAJ4K1lj.js";import{t as a}from"./gsap-Dm7UF3sG.js";/* empty css                    *//* empty css                   *//* empty css                        */import{a as o,c as s,i as c,l,n as u,o as d,r as f,s as p,t as m}from"./content-D8DUqlkw.js";import{o as h}from"./scroll-CIxM5NtI.js";import{n as g,t as _}from"./motion-66kFq4QZ.js";import{t as v}from"./version-DkdLFk3s.js";var y=e(t(),1),b=new URL(`bodoni-moda-latin-400-italic-DB-bun8K.woff2`,import.meta.url).href,x=i(),S=512,C=2048,w=8192e3,T=1<<18,E=1<<21,D=`#version 300 es
layout(location = 0) in vec2 a_position;
uniform vec2 u_resolution;
uniform float u_imageAspect;
uniform float u_scale;
uniform float u_rotation;
out vec2 v_imageUV;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  vec2 uv = a_position * 0.5;
  float r = u_rotation * 3.14159265358979323846 / 180.0;
  mat2 turn = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 imageBox;
  imageBox.x = min(u_resolution.x / u_imageAspect, u_resolution.y) * u_imageAspect;
  imageBox.y = imageBox.x / u_imageAspect;
  v_imageUV = uv * (u_resolution / imageBox) / u_scale;
  v_imageUV.x *= u_imageAspect;
  v_imageUV = turn * v_imageUV;
  v_imageUV.x /= u_imageAspect;
  v_imageUV += 0.5;
  v_imageUV.y = 1.0 - v_imageUV.y;
}`,O=`#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_colorBack;
uniform vec4 u_colorTint;
uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;
uniform vec2 u_tilt;
uniform float u_reveal;
uniform float u_light;

in vec2 v_imageUV;

out vec4 fragColor;

#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float getColorChanges(float c1, float c2, float stripe, vec3 w, float blur, float bump, float tint) {
  float ch = mix(c2, c1, smoothstep(0.0, 2.0 * blur, stripe));
  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe));
  bump = smoothstep(0.2, 0.8, bump);
  border = w[0] + 0.4 * (1.0 - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe));
  border = w[0] + 0.5 * (1.0 - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe));
  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe));
  float gradientT = (stripe - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0.0, 1.0, gradientT));
  ch = mix(ch, gradient, smoothstep(border, border + 0.5 * blur, stripe));
  ch = mix(ch, 1.0 - min(1.0, (1.0 - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}

float getImgFrame(vec2 uv, float th) {
  float frame = 1.0;
  frame *= smoothstep(0.0, th, uv.y);
  frame *= 1.0 - smoothstep(1.0 - th, 1.0, uv.y);
  frame *= smoothstep(0.0, th, uv.x);
  frame *= 1.0 - smoothstep(1.0 - th, 1.0, uv.x);
  return frame;
}

float blurEdge3x3(sampler2D tex, vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {
  vec2 texel = 1.0 / vec2(textureSize(tex, 0));
  vec2 r = radius * texel;
  float sum = 4.0 * centerSample;
  sum += 2.0 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).r;
  sum += 2.0 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).r;
  sum += 2.0 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).r;
  sum += 2.0 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).r;
  sum += textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).r;
  sum += textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).r;
  sum += textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).r;
  sum += textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).r;
  return sum / 16.0;
}

void main() {
  const float firstFrameOffset = 2.8;
  float t = 0.3 * (u_time + firstFrameOffset);

  vec2 uv = v_imageUV;
  vec2 dudx = dFdx(v_imageUV);
  vec2 dudy = dFdy(v_imageUV);
  vec4 img = textureGrad(u_image, uv, dudx, dudy);

  float cycleWidth = u_repetition;

  vec2 rotatedUV = uv - vec2(0.5);
  float angle = (-u_angle + 70.0) * PI / 180.0;
  float cosA = cos(angle);
  float sinA = sin(angle);
  rotatedUV = vec2(rotatedUV.x * cosA - rotatedUV.y * sinA, rotatedUV.x * sinA + rotatedUV.y * cosA) + vec2(0.5);

  float edge = blurEdge3x3(u_image, uv, dudx, dudy, 6.0, img.r);
  edge = pow(edge, 1.6);
  edge *= smoothstep(0.0, 0.4, u_contour);

  float opacity = img.g * getImgFrame(v_imageUV, 0.0);
  float depth = img.r;

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  vec3 color1 = mix(vec3(0.98, 0.98, 1.0), vec3(0.9, 0.9, 0.93), u_light);
  vec3 color2 = vec3(0.1, 0.1, 0.1 + 0.1 * smoothstep(0.7, 1.3, diagTLtoBR));

  vec2 gradUV = uv - 0.5 - u_tilt * vec2(0.18, -0.12);
  float dist = length(gradUV + vec2(0.0, 0.2 * diagBLtoTR));
  gradUV = rotate(gradUV, (0.25 - 0.2 * diagBLtoTR) * PI);
  float direction = gradUV.x;

  float bump = pow(1.8 * dist, 1.2);
  bump = 1.0 - bump;
  bump *= pow(uv.y, 0.3);

  float thinStrip1 = 0.12 / cycleWidth * (1.0 - 0.4 * bump);
  float thinStrip2 = 0.07 / cycleWidth * (1.0 + 0.4 * bump);
  float wideStrip = 1.0 - thinStrip1 - thinStrip2;

  float noise = snoise(uv - t);
  edge += (1.0 - edge) * u_distortion * noise;

  direction += diagBLtoTR;
  direction -= 2.0 * noise * diagBLtoTR * (smoothstep(0.0, 1.0, edge) * (1.0 - smoothstep(0.0, 1.0, edge)));
  direction *= mix(1.0, 1.0 - edge, smoothstep(0.5, 1.0, u_contour));
  direction -= 1.7 * edge * smoothstep(0.5, 1.0, u_contour);
  direction += 0.2 * pow(u_contour, 4.0) * (1.0 - smoothstep(0.0, 1.0, edge));

  bump *= clamp(pow(uv.y, 0.1), 0.3, 1.0);
  direction *= 0.1 + (1.1 - edge) * bump;
  direction *= 0.4 + 0.6 * (1.0 - smoothstep(0.5, 1.0, edge));
  direction += 0.18 * (smoothstep(0.1, 0.2, uv.y) * (1.0 - smoothstep(0.2, 0.4, uv.y)));
  direction += 0.03 * (smoothstep(0.1, 0.2, 1.0 - uv.y) * (1.0 - smoothstep(0.2, 0.4, 1.0 - uv.y)));
  direction *= 0.5 + 0.5 * pow(uv.y, 2.0);
  direction *= cycleWidth;
  direction -= t + dot(u_tilt, vec2(0.35, 0.2));

  float colorDispersion = clamp(1.0 - bump, 0.0, 1.0);
  float dispersionRed = colorDispersion;
  dispersionRed += 0.03 * bump * noise;
  dispersionRed += 5.0 * (smoothstep(-0.1, 0.2, uv.y) * (1.0 - smoothstep(0.1, 0.5, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 1.0, bump)));
  dispersionRed -= diagBLtoTR;

  float dispersionBlue = colorDispersion * 1.3;
  dispersionBlue += (smoothstep(0.0, 0.4, uv.y) * (1.0 - smoothstep(0.1, 0.8, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 0.8, bump)));
  dispersionBlue -= 0.2 * edge;

  dispersionRed *= u_shiftRed / 20.0;
  dispersionBlue *= u_shiftBlue / 20.0;

  float softness = 0.05 * u_softness;
  float blur = softness + 0.5 * smoothstep(1.0, 10.0, u_repetition) * smoothstep(0.0, 1.0, edge);
  float smallCanvas = 1.0 - smoothstep(100.0, 500.0, min(u_resolution.x, u_resolution.y));
  blur += smallCanvas * smoothstep(0.0, 1.0, edge);
  float rExtraBlur = softness * (0.05 + 0.1 * (u_shiftRed / 20.0) * bump);
  float gExtraBlur = softness * 0.05 / max(0.001, abs(1.0 - diagBLtoTR));

  vec3 w = vec3(thinStrip1 * cycleWidth, thinStrip2 * cycleWidth, wideStrip);
  w[1] -= 0.02 * smoothstep(0.0, 1.0, edge + bump);
  float stripeR = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripeR, w, blur + fwidth(stripeR) + rExtraBlur, bump, u_colorTint.r);
  float stripeG = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripeG, w, blur + fwidth(stripeG) + gExtraBlur, bump, u_colorTint.g);
  float stripeB = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripeB, w, blur + fwidth(stripeB), bump, u_colorTint.b);

  vec3 sheen = mix(vec3(1.0), u_colorTint.rgb, 0.45 * u_colorTint.a);
  r *= sheen.r;
  g *= sheen.g;
  b *= sheen.b;

  float rim = smoothstep(0.78, 1.0, depth) * u_light;
  r *= 1.0 - rim * 0.62;
  g *= 1.0 - rim * 0.62;
  b *= 1.0 - rim * 0.58;

  float pour = u_reveal * 1.25 - 0.1;
  opacity *= smoothstep(1.0 - pour, 1.15 - pour, depth) * smoothstep(0.0, 0.25, u_reveal);

  vec3 color = vec3(r, g, b) * opacity;
  vec3 back = u_colorBack.rgb * u_colorBack.a;
  color += back * (1.0 - opacity);
  opacity += u_colorBack.a * (1.0 - opacity);
  color += 1.0 / 256.0 * (fract(sin(dot(0.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - 0.5);
  fragColor = vec4(color, opacity);
}`,k=(e,t,n)=>Math.min(n,Math.max(t,e)),A=(()=>{let e=null;return(t,n)=>{if(typeof document>`u`||(e??=document.createElement(`canvas`).getContext(`2d`,{willReadFrequently:!0}),!e))return n;e.clearRect(0,0,1,1),e.fillStyle=`rgba(0, 0, 0, 0)`,e.fillStyle=String(t),e.fillRect(0,0,1,1);let[r,i,a,o]=e.getImageData(0,0,1,1).data;return[r/255,i/255,a/255,o/255]}})(),j=e=>new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=()=>n(Error(`MetallicPaint: failed to load the image`)),r.src=e}),M=async e=>{if(/\.svg($|[?#])/i.test(e)||e.startsWith(`data:image/svg+xml`))return!0;if(!e.startsWith(`blob:`))return!1;try{return(await(await fetch(e)).blob()).type===`image/svg+xml`}catch{return!1}},N=async e=>{let[t,n]=await Promise.all([j(e),M(e)]),r=t.naturalWidth||t.width||C,i=t.naturalHeight||t.height||C,a=Math.max(r,i),o=n?C/a:k(1024/a,1,C/a);r=Math.max(1,Math.round(r*o)),i=Math.max(1,Math.round(i*o));let s=document.createElement(`canvas`);s.width=r,s.height=i;let c=s.getContext(`2d`,{willReadFrequently:!0});c.drawImage(t,0,0,r,i);let l=c.getImageData(0,0,r,i),u=!0;for(let e=3;e<l.data.length;e+=4)if(l.data[e]<250){u=!1;break}if(u){for(let e=0;e<l.data.length;e+=4){let t=Math.min(l.data[e],l.data[e+1],l.data[e+2]);l.data[e+3]=Math.round(k((250-t)/30,0,1)*255)}c.putImageData(l,0,0)}return s},P=async(e,t,n)=>{let r=`${n} 320px ${t}`;try{await document.fonts?.load(r,e)}catch{return null}let i=document.createElement(`canvas`).getContext(`2d`);i.font=r;let a=i.measureText(e),o=a.actualBoundingBoxAscent||256,s=a.actualBoundingBoxDescent||64,c=a.actualBoundingBoxLeft||0,l=a.actualBoundingBoxRight||a.width,u=38.4,d=document.createElement(`canvas`);d.width=Math.ceil(c+l+u*2),d.height=Math.ceil(o+s+u*2);let f=d.getContext(`2d`);return f.font=r,f.fillStyle=`#000`,f.textBaseline=`alphabetic`,f.fillText(e,u+c,u+o),d},F=()=>new Promise(e=>{let t=new MessageChannel;t.port1.onmessage=()=>{t.port1.close(),e()},t.port2.postMessage(0)}),I=(e,t,n)=>{let r=[];for(let i=0;i<n;i++)for(let a=0;a<t;a++){let o=i*t+a;e[o]&&a!==0&&i!==0&&a!==t-1&&i!==n-1&&e[o-1]&&e[o+1]&&e[o-t]&&e[o+t]&&e[o-t-1]&&e[o-t+1]&&e[o+t-1]&&e[o+t+1]&&r.push(o)}let i=new Float32Array(t*n),a=[],o=[];return r.forEach(e=>(e%t+Math.floor(e/t))%2==0?a.push(e):o.push(e)),{field:i,red:a,black:o,relax:e=>{for(let n=0;n<e.length;n++){let r=e[n],a=i[r+1]+i[r-1]+i[r-t]+i[r+t];i[r]=1.9*((.01+a)/4)-.9*i[r]}},peak:()=>{let e=0;return r.forEach(t=>{i[t]>e&&(e=i[t])}),e||1}}},L=async(e,t,n,r)=>{let{field:i,red:a,black:o,relax:s,peak:c}=I(e,t,n);if(await F(),!r())return null;let l=k(Math.floor(E/Math.max(1,a.length+o.length)),1,8);for(let e=0;e<40;e++)if(s(a),s(o),e%l===l-1&&e<39&&(await F(),!r()))return null;return{field:i,peak:c()}},R=(e,t,n)=>{let r=document.createElement(`canvas`);r.width=t,r.height=n;let i=r.getContext(`2d`,{willReadFrequently:!0});i.drawImage(e,0,0,t,n);let a=i.getImageData(0,0,t,n).data,o=new Uint8Array(t*n);for(let e=0;e<o.length;e++)o[e]=+(a[e*4+3]>0);return{small:r,smallCtx:i,mask:o}},z=async({small:e,smallCtx:t,mask:n},{field:r,peak:i},a,o,s,c,l)=>{let u=t.createImageData(a,o);for(let e=0;e<n.length;e++){let t=e*4,a=n[e]?255*(1-r[e]/i):255;u.data[t]=a,u.data[t+1]=a,u.data[t+2]=a,u.data[t+3]=n[e]?255:0}t.putImageData(u,0,0);let d=document.createElement(`canvas`);d.width=s,d.height=c;let f=d.getContext(`2d`,{willReadFrequently:!0});if(f.imageSmoothingEnabled=!0,f.imageSmoothingQuality=`high`,s<=a||c<=o)return f.drawImage(e,0,0,a,o,0,0,s,c),f.getImageData(0,0,s,c);let p=f.createImageData(s,c),m=Math.max(1,Math.floor(T/s));for(let t=0;t<c;t+=m){let n=Math.min(m,c-t);if(f.save(),f.beginPath(),f.rect(0,t,s,n),f.clip(),f.drawImage(e,0,0,a,o,0,0,s,c),f.restore(),p.data.set(f.getImageData(0,t,s,n).data,t*s*4),t+n<c&&(await F(),!l()))return null}return p},B=async(e,t,n,r,i)=>{let a=t.getContext(`2d`,{willReadFrequently:!0}).getImageData(0,0,n,r).data,o=[n,r,-1,-1],s=Math.max(1,Math.floor(T/n));for(let t=0,c=0;t<r;t++){if(t&&t%s===0&&(await F(),!i()))return null;for(let r=0;r<n;r++,c+=4){let n=a[c+3];n===0?(e.data[c]=255,e.data[c+1]=0):(e.data[c]=e.data[c+3]===0?0:e.data[c],e.data[c+1]=n,r<o[0]&&(o[0]=r),r>o[2]&&(o[2]=r),t<o[1]&&(o[1]=t),o[3]=t),e.data[c+2]=255,e.data[c+3]=255}}return o},V=async(e,t)=>{if(await F(),!t())return null;let n=e.width,r=e.height,i=S/Math.min(n,r),a=Math.max(2,Math.round(n*i)),o=Math.max(2,Math.round(r*i)),s=R(e,a,o);if(await F(),!t())return null;let c=await L(s.mask,a,o,t);if(!c||(await F(),!t()))return null;let l=await z(s,c,a,o,n,r,t);if(!l||(await F(),!t()))return null;let u=await B(l,e,n,r,t);return u?{image:l,bounds:u}:null},H=(e,t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),r):null};function U({imageSrc:e,text:t,fontFamily:n=`system-ui, sans-serif`,fontWeight:r=800,color:i=`#ffffff`,backgroundColor:a=`transparent`,density:o=2,softness:s=.1,dispersion:c=.3,distortion:l=.07,edgeBend:u=.6,angle:d=70,speed:f=1,scale:p=.6,rotation:m=0,mouseTilt:h=.5,lightMode:g=!1,intro:_=!0,paused:v=!1,dpr:b,className:S=``,style:C}){let T=(0,y.useRef)(null),E=(0,y.useRef)(null),j=(0,y.useRef)(null),M=(0,y.useRef)(null);return M.current={tint:A(i,[1,1,1,1]),back:A(a,[0,0,0,0]),density:k(o,.5,12),softness:k(s,0,1),dispersion:k(c,-1,1),distortion:k(l,0,1),edgeBend:k(u,0,1),angle:d,speed:f,scale:Math.max(.05,p),rotation:m,mouseTilt:k(h,0,1.5),lightMode:g,intro:_,paused:v,dpr:b},(0,y.useEffect)(()=>{let e=T.current,t=E.current;if(!e||!t)return;let n=t.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!n)return;let r=n.getExtension(`KHR_parallel_shader_compile`),i=H(n,n.VERTEX_SHADER,D),a=H(n,n.FRAGMENT_SHADER,O),o=n.createProgram();if(!i||!a||!o){n.deleteShader(i),n.deleteShader(a),n.deleteProgram(o);return}n.attachShader(o,i),n.attachShader(o,a),n.linkProgram(o);let s={},c=()=>{let e=n.getProgramParameter(o,n.LINK_STATUS);if(n.deleteShader(i),n.deleteShader(a),!e)return!1;n.useProgram(o);let t=n.getProgramParameter(o,n.ACTIVE_UNIFORMS);for(let e=0;e<t;e++){let t=n.getActiveUniform(o,e);t&&(s[t.name]=n.getUniformLocation(o,t.name))}return n.uniform1i(s.u_image,0),!0};if(!r&&!c()){n.deleteProgram(o);return}let l=n.createVertexArray(),u=n.createBuffer();n.bindVertexArray(l),n.bindBuffer(n.ARRAY_BUFFER,u),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),n.STATIC_DRAW),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0);let d=n.createTexture();n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,d),n.texImage2D(n.TEXTURE_2D,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,new Uint8Array([255,0,255,255])),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR);let f=window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches??!1,p={raf:0,last:0,time:0,visible:!0,ready:!r,queued:void 0,pending:!1,hasImage:!1,imageAspect:1,imageWidth:1,imageHeight:1,bounds:null,width:0,height:0,revealStart:-1,reveal:M.current.intro&&!f?0:1,tiltX:0,tiltY:0,velocityX:0,velocityY:0,targetX:0,targetY:0,alive:!0},m=()=>{let r=M.current,i=e.getBoundingClientRect(),a=r.dpr??Math.min(window.devicePixelRatio||1,2),o=Math.max(a,2),s=i.width*i.height*o*o;s>w&&(o*=Math.sqrt(w/s));let c=Math.max(1,Math.round(i.width*o)),l=Math.max(1,Math.round(i.height*o));(c!==p.width||l!==p.height)&&(p.width=c,p.height=l,t.width=c,t.height=l,n.viewport(0,0,c,l))},h=e=>{let t=p.bounds;if(!t||t[2]<t[0])return null;let n=p.imageAspect,r=Math.min(p.width/n,p.height)*e.scale,i=e.rotation*Math.PI/180,a=Math.cos(i),o=Math.sin(i),s=1/0,c=-1/0,l=1/0,u=-1/0;for(let e=0;e<4;e++){let i=(e&1?t[2]+1:t[0])/p.imageWidth,d=(e&2?t[3]+1:t[1])/p.imageHeight,f=(i-.5)*n,m=.5-d,h=(a*f+o*m)*r+p.width/2,g=(a*m-o*f)*r+p.height/2;s=Math.min(s,h),c=Math.max(c,h),l=Math.min(l,g),u=Math.max(u,g)}let d=8+2*r/p.imageHeight,f=Math.max(0,Math.floor((s-d)/2)*2),m=Math.max(0,Math.floor((l-d)/2)*2),h=Math.min(p.width,Math.ceil((c+d)/2)*2),g=Math.min(p.height,Math.ceil((u+d)/2)*2);return[f,m,Math.max(0,h-f),Math.max(0,g-m)]},g=()=>{let e=M.current;if(!p.ready||p.pending||!p.hasImage){n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT);return}n.useProgram(o),n.uniform2f(s.u_resolution,p.width,p.height),n.uniform1f(s.u_time,p.time),n.uniform1f(s.u_imageAspect,p.imageAspect),n.uniform1f(s.u_scale,e.scale),n.uniform1f(s.u_rotation,e.rotation),n.uniform4f(s.u_colorBack,e.back[0],e.back[1],e.back[2],e.back[3]),n.uniform4f(s.u_colorTint,e.tint[0],e.tint[1],e.tint[2],e.tint[3]),n.uniform1f(s.u_softness,e.softness),n.uniform1f(s.u_repetition,e.density),n.uniform1f(s.u_shiftRed,e.dispersion),n.uniform1f(s.u_shiftBlue,e.dispersion),n.uniform1f(s.u_distortion,e.distortion),n.uniform1f(s.u_contour,e.edgeBend),n.uniform1f(s.u_angle,e.angle),n.uniform2f(s.u_tilt,p.tiltX,p.tiltY),n.uniform1f(s.u_reveal,p.reveal),n.uniform1f(s.u_light,+!!e.lightMode);let t=e.back[3]===1,r=t||e.back[3]===0?h(e):null;r&&t?n.clearColor(e.back[0],e.back[1],e.back[2],1):n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),(!r||r[2]!==0&&r[3]!==0)&&(n.bindVertexArray(l),r?(n.enable(n.SCISSOR_TEST),n.scissor(r[0],r[1],r[2],r[3]),n.drawArrays(n.TRIANGLE_STRIP,0,4),n.disable(n.SCISSOR_TEST)):n.drawArrays(n.TRIANGLE_STRIP,0,4))},_=e=>{if(p.raf=0,!p.alive)return;let t=M.current,n=p.last?Math.min(.05,(e-p.last)/1e3):1/60;p.last=e;let r=!t.paused&&!f&&t.speed!==0;r&&(p.time+=n*t.speed);let i=r;if(p.reveal<1&&!p.pending){p.revealStart<0&&(p.revealStart=e);let t=k((e-p.revealStart)/1600,0,1);p.reveal=1-(1-t)**3,r&&(p.time+=n*2.4*(1-t)**2),i=!0}let a=Math.max(1,Math.ceil(n/(1/240))),o=n/a;for(let e=0;e<a;e++)p.velocityX+=(60*(p.targetX*t.mouseTilt-p.tiltX)-14*p.velocityX)*o,p.velocityY+=(60*(p.targetY*t.mouseTilt-p.tiltY)-14*p.velocityY)*o,p.tiltX+=p.velocityX*o,p.tiltY+=p.velocityY*o;(Math.abs(p.targetX*t.mouseTilt-p.tiltX)>5e-4||Math.abs(p.targetY*t.mouseTilt-p.tiltY)>5e-4||Math.abs(p.velocityX)+Math.abs(p.velocityY)>5e-4)&&(i=!0),g(),i&&p.visible?p.raf=requestAnimationFrame(_):p.last=0},v=()=>{!p.raf&&p.alive&&p.visible&&(p.raf=requestAnimationFrame(_))},y=()=>{p.alive=!1,cancelAnimationFrame(p.raf),C.disconnect(),A.disconnect(),t.removeEventListener(`webglcontextlost`,N),e.removeEventListener(`pointermove`,x),e.removeEventListener(`pointerleave`,S),j.current===F&&(j.current=null),n.deleteShader(i),n.deleteShader(a),n.deleteTexture(d),n.deleteBuffer(u),n.deleteVertexArray(l),n.deleteProgram(o)},b=e=>{p.raf=0,p.alive&&(r&&!n.getProgramParameter(o,r.COMPLETION_STATUS_KHR)?p.raf=requestAnimationFrame(b):c()?(p.ready=!0,p.queued!==void 0&&(P(p.queued),p.queued=void 0),_(e)):y())},x=t=>{let n=e.getBoundingClientRect();p.targetX=k((t.clientX-n.left)/n.width*2-1,-1.2,1.2),p.targetY=k((t.clientY-n.top)/n.height*2-1,-1.2,1.2),v()},S=()=>{p.targetX=0,p.targetY=0,v()},C=new ResizeObserver(()=>{m(),g()});C.observe(e);let A=new IntersectionObserver(e=>{p.visible=e.some(e=>e.isIntersecting),p.visible&&v()});A.observe(e);let N=e=>{e.preventDefault(),p.alive=!1,cancelAnimationFrame(p.raf)};t.addEventListener(`webglcontextlost`,N),e.addEventListener(`pointermove`,x),e.addEventListener(`pointerleave`,S);let P=e=>{if(p.pending=!1,n.bindTexture(n.TEXTURE_2D,d),e){let t=e.image;n.texImage2D(n.TEXTURE_2D,0,n.RGBA,n.RGBA,n.UNSIGNED_BYTE,t),n.generateMipmap(n.TEXTURE_2D),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR_MIPMAP_LINEAR),p.imageAspect=t.width/t.height,p.imageWidth=t.width,p.imageHeight=t.height,p.bounds=e.bounds,p.hasImage=!0}else n.texImage2D(n.TEXTURE_2D,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,new Uint8Array([255,0,255,255])),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),p.imageAspect=1,p.bounds=null,p.hasImage=!1},F={setPending:e=>{p.pending=e,e&&(p.queued=void 0),g()},setImage:e=>{p.ready?(P(e),g(),v()):p.queued=e},wake:v,redraw:()=>{m(),g(),v()}};return j.current=F,m(),g(),p.ready?v():p.raf=requestAnimationFrame(b),y},[]),(0,y.useEffect)(()=>{let i=!0,a=t?P(t,n,r):e?N(e):null;if(!a)j.current?.setImage(null);else return j.current?.setPending(!0),a.then(e=>i&&e?V(e,()=>i):null).then(e=>{i&&e&&j.current?.setImage(e)}).catch(()=>{i&&j.current?.setImage(null)}),()=>{i=!1}},[e,t,n,r]),(0,y.useEffect)(()=>{j.current?.redraw()}),(0,x.jsx)(`div`,{ref:T,className:`metallic-paint ${S}`.trim(),style:C,children:(0,x.jsx)(`canvas`,{ref:E,className:`metallic-paint-canvas`})})}var W=({href:e,children:t,className:n})=>(0,x.jsx)(`a`,{className:n??`u`,href:e,rel:e.startsWith(`http`)?`noopener`:void 0,children:t});function G(){v(`metal`);let e=(0,y.useRef)(null);g(e);let[t,i]=(0,y.useState)(!1);return(0,y.useEffect)(()=>{let e=!0;return new FontFace(`Skeptical Mark`,`url(${b})`).load().then(t=>{document.fonts.add(t),e&&i(!0)}).catch(()=>e&&i(!0)),()=>{e=!1}},[]),h(()=>{let t=e.current,n=a.matchMedia();return n.add(`(min-width: 861px) and (prefers-reduced-motion: no-preference)`,()=>{let e=t.querySelector(`.strip`),n=e.querySelector(`.track`),r=a.utils.toArray(`.item`,n),i=()=>{let e=window.innerWidth/2;r.forEach(t=>{let n=t.getBoundingClientRect();t.style.setProperty(`--lit`,String(Math.max(0,1-Math.abs(n.left+n.width/2-e)/(window.innerWidth*.42))))})},o=a.to(n,{x:()=>-(n.scrollWidth-window.innerWidth),ease:`none`,scrollTrigger:{trigger:e,start:`top top`,end:()=>`+=${n.scrollWidth}`,pin:!0,scrub:.5,invalidateOnRefresh:!0,onUpdate:i,onRefresh:i}});return i(),()=>{o.kill()}}),()=>n.revert()},{scope:e}),(0,x.jsxs)(`div`,{className:`vm`,ref:e,children:[(0,x.jsx)(`a`,{className:`skip-x`,href:`#main`,children:`Skip to content`}),(0,x.jsxs)(`header`,{className:`top`,children:[(0,x.jsx)(`a`,{className:`mark`,href:`#top`,"aria-label":`Skeptical, back to the top`,children:`skeptical`}),(0,x.jsx)(`nav`,{"aria-label":`Sections`,children:d.map(e=>(0,x.jsx)(`a`,{href:`#${e.id}`,children:e.label},e.id))})]}),(0,x.jsxs)(`main`,{id:`main`,children:[(0,x.jsxs)(`section`,{className:`hero`,id:`top`,"aria-label":l.heading,children:[(0,x.jsx)(`div`,{className:`pour`,"aria-hidden":`true`,children:t&&(0,x.jsx)(U,{text:`skeptical`,fontFamily:`Skeptical Mark`,fontWeight:400,color:`#f0f0ec`,backgroundColor:`#050505`,scale:.92,speed:r?0:.35,mouseTilt:n||r?0:.6,paused:r,intro:!r})}),(0,x.jsxs)(`div`,{className:`foot`,children:[(0,x.jsx)(_,{as:`h1`,on:`load`,delay:.9,children:f.pitch.join(` `)}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`p`,{className:`lede`,"data-rise":!0,children:f.statement.join(` `)}),(0,x.jsx)(`p`,{className:`doors`,"data-rise":!0,children:f.doors.map(e=>(0,x.jsx)(W,{href:e.href,children:e.label},e.href))})]})]})]}),(0,x.jsx)(`section`,{className:`why`,"aria-label":`How the team works`,children:o.map(e=>(0,x.jsx)(_,{as:`p`,children:e},e))}),(0,x.jsxs)(`section`,{id:`record`,className:`cols`,children:[(0,x.jsxs)(`div`,{children:[(0,x.jsx)(_,{as:`h2`,children:s.title}),(0,x.jsx)(`p`,{className:`lede`,"data-rise":!0,children:s.rule}),(0,x.jsxs)(`p`,{className:`mute`,"data-rise":!0,children:[s.when,`. `,s.name,`, `,s.where,`.`]}),(0,x.jsx)(`p`,{"data-rise":!0,children:(0,x.jsx)(W,{href:s.more.href,children:s.more.label})})]}),(0,x.jsx)(`div`,{className:`results`,children:s.results.map(e=>(0,x.jsxs)(`div`,{"data-rise":!0,children:[(0,x.jsx)(`h3`,{children:e.what}),(0,x.jsxs)(`p`,{children:[e.who,` `,e.more]})]},e.who))})]}),(0,x.jsxs)(`section`,{id:`drive`,className:`strip`,children:[(0,x.jsxs)(`div`,{className:`strip-head`,children:[(0,x.jsx)(`h2`,{children:m.title}),(0,x.jsx)(`p`,{className:`lede`,children:m.lead})]}),(0,x.jsxs)(`dl`,{className:`track`,children:[m.items.map(e=>(0,x.jsxs)(`div`,{className:`item`,children:[(0,x.jsx)(`dt`,{children:e.term}),(0,x.jsx)(`dd`,{children:e.text})]},e.term)),(0,x.jsx)(`div`,{className:`item end`,children:(0,x.jsx)(`dt`,{children:(0,x.jsx)(W,{href:m.more.href,children:m.more.label})})})]})]}),(0,x.jsxs)(`section`,{id:`people`,className:`cols`,children:[(0,x.jsxs)(`div`,{children:[(0,x.jsx)(_,{as:`h2`,children:p.title}),(0,x.jsx)(`p`,{className:`lede`,"data-rise":!0,children:p.count}),(0,x.jsx)(`p`,{"data-rise":!0,children:(0,x.jsx)(W,{href:p.more.href,children:p.more.label})})]}),(0,x.jsx)(`div`,{className:`results`,children:p.coaches.map(e=>(0,x.jsxs)(`div`,{"data-rise":!0,children:[(0,x.jsx)(`h3`,{children:e.name}),(0,x.jsxs)(`p`,{children:[(0,x.jsxs)(`span`,{className:`mute`,children:[e.role,`.`]}),` `,e.bio]})]},e.name))})]}),(0,x.jsxs)(`section`,{id:`join`,className:`cols`,children:[(0,x.jsxs)(`div`,{children:[(0,x.jsx)(_,{as:`h2`,children:c.title}),(0,x.jsx)(`p`,{className:`lede`,"data-rise":!0,children:c.lead}),(0,x.jsxs)(`p`,{"data-rise":!0,children:[c.already.before,(0,x.jsx)(W,{href:c.already.href,children:c.already.label}),`. `,c.coach.before,(0,x.jsx)(W,{href:c.coach.href,children:c.coach.label}),`.`]}),(0,x.jsxs)(`p`,{"data-rise":!0,children:[c.also,` `,(0,x.jsx)(W,{href:`mailto:${l.email}`,children:l.email})]})]}),(0,x.jsx)(`ul`,{className:`paths`,children:c.paths.map(e=>(0,x.jsx)(`li`,{"data-rise":!0,children:(0,x.jsxs)(`a`,{href:e.href,rel:`noopener`,children:[(0,x.jsx)(`b`,{children:e.name}),(0,x.jsxs)(`span`,{children:[e.line,` `,e.text[0]]})]})},e.id))})]})]}),(0,x.jsxs)(`footer`,{children:[(0,x.jsx)(`p`,{className:`line`,children:u.line}),(0,x.jsx)(`ul`,{children:u.links.map(e=>(0,x.jsx)(`li`,{children:(0,x.jsx)(W,{href:e.href,children:e.label})},e.href))}),(0,x.jsx)(`ul`,{children:u.pages.map(e=>(0,x.jsx)(`li`,{children:(0,x.jsx)(W,{href:e.href,children:e.label})},e.href))}),(0,x.jsx)(`small`,{children:`Draft 2, version 14. Not the live site.`})]})]})}export{G as default};