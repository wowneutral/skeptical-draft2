import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{d as t,i as n,l as r,t as i}from"./jsx-runtime-BAJ4K1lj.js";/* empty css            *//* empty css            */import{a,c as o,i as s,l as c,n as l,r as u,s as d,t as f}from"./content-D8DUqlkw.js";import{i as p}from"./scroll-CIxM5NtI.js";import{t as m}from"./version-O83IIjLl.js";var h=e(t(),1),g=i(),_=2,v=4,y={glitch:.7,degauss:1.6},b={blocks:0,dots:1,characters:2},x={none:0,glitch:1,degauss:2},S=[[`.###.`,`#..##`,`#.#.#`,`##..#`,`.###.`],[`..#..`,`.##..`,`..#..`,`..#..`,`.###.`],[`####.`,`....#`,`.###.`,`#....`,`#####`],[`####.`,`....#`,`.###.`,`....#`,`####.`],[`#..#.`,`#..#.`,`#####`,`...#.`,`...#.`],[`#####`,`#....`,`####.`,`....#`,`####.`],[`.###.`,`#....`,`####.`,`#...#`,`.###.`],[`#####`,`....#`,`...#.`,`..#..`,`..#..`],[`.###.`,`#...#`,`.###.`,`#...#`,`.###.`],[`.###.`,`#...#`,`.####`,`....#`,`.###.`],[`.###.`,`#...#`,`#####`,`#...#`,`#...#`],[`####.`,`#...#`,`####.`,`#...#`,`####.`],[`.####`,`#....`,`#....`,`#....`,`.####`],[`####.`,`#...#`,`#...#`,`#...#`,`####.`],[`#####`,`#....`,`####.`,`#....`,`#####`],[`#####`,`#....`,`####.`,`#....`,`#....`],[`.....`,`..#..`,`.###.`,`..#..`,`.....`],[`.....`,`.....`,`.###.`,`.....`,`.....`],[`.#...`,`..#..`,`...#.`,`..#..`,`.#...`],[`....#`,`...#.`,`..#..`,`.#...`,`#....`],[`.....`,`#.#.#`,`.###.`,`#.#.#`,`.....`],[`.....`,`#####`,`.....`,`#####`,`.....`],[`.....`,`.....`,`.....`,`.....`,`#####`]].map(e=>e.reduce((e,t,n)=>{let r=e;for(let e=0;e<5;e++)t[e]===`#`&&(r+=2**(n*5+e));return r},0)),C=`#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,w=`#version 300 es
precision highp float;
precision highp int;

uniform float iTime;
uniform vec2 uGridMul;
uniform float uNoiseAmp;
uniform float uScale;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform ivec2 uOrigin;
uniform sampler2D uPrev0;
uniform sampler2D uPrev1;
uniform float uDecay;
uniform float uFresh;
uniform float uHover;

layout(location = 0) out vec4 outRings;
layout(location = 1) out vec4 outExtra;

float time;

float noise(vec2 p) {
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;
}

mat2 rotate(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;
  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545;
  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;
  f += amp * noise(p);
  return f;
}

float pattern(vec2 p) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time);
  mat2 rot1 = rotate(0.1);
  vec2 q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  vec2 r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

void main() {
  time = iTime * 0.333333;
  ivec2 texel = ivec2(gl_FragCoord.xy);
  vec2 grid = uGridMul * 15.0;
  vec2 s = vec2(texel + uOrigin) / grid;
  float intensity = pattern(s * 0.1) * 1.3 - 0.03;
  float lift = 0.0;
  float strike = 0.0;

  if (uUseMouse > 0.5) {
    vec2 mouseWorld = uMouse * uScale;
    float distToMouse = distance(s, mouseWorld);
    float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
    intensity += mouseInfluence;
    float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
    intensity += ripple;
    lift = mouseInfluence;
  }

  if (uUsePageLoadAnimation > 0.5) {
    float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
    float cellDelay = cellRandom * 0.8;
    float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
    float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
    intensity *= fadeAlpha;
    strike = sin(3.14159265 * cellProgress) * step(0.1, intensity);
  }

  vec4 on0 = step(vec4(0.1), intensity - vec4(0.0, 1.0, 2.0, 4.0) * 0.0625);
  vec2 on1 = step(vec2(0.1), intensity - vec2(5.0, 8.0) * 0.0625);
  float level = clamp((intensity - 0.1) / 0.6, 0.0, 1.0);
  float heat = max(clamp(lift / 3.0, 0.0, 1.0) * uHover, strike);

  vec4 prev0 = texelFetch(uPrev0, texel, 0) * (1.0 - uFresh);
  vec4 prev1 = texelFetch(uPrev1, texel, 0) * (1.0 - uFresh);
  vec4 fade0 = max(prev0 * uDecay - 1.0 / 255.0, 0.0);
  vec4 fade1 = max(prev1 * uDecay - 1.0 / 255.0, 0.0);

  outRings = max(on0, fade0);
  outExtra = vec4(max(on1, fade1.xy), max(level, fade1.z), max(heat, fade1.w));
}`,T=`#version 300 es
precision highp float;
precision highp int;

uniform float iTime;
uniform vec3 iResolution;
uniform float uScale;
uniform vec2 uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3 uTint;
uniform float uBrightness;
uniform float uLightMode;
uniform sampler2D uRings0;
uniform sampler2D uRings1;
uniform ivec2 uOrigin;
uniform ivec2 uCellCount;
uniform int uGlyphs;
uniform float uGlow;
uniform float uScramble;
uniform float uMouseGlow;
uniform float uVignette;
uniform vec4 uClicks[${v}];
uniform int uClickMode;
uniform float uClickSeconds;
uniform float uClock;

out vec4 outColor;

${`const uint FONT[${S.length}] = uint[${S.length}](${S.map(e=>`${e}u`).join(`, `)});`}

float time;
float clickTear;
float clickSplit;
float pixelHeat;

float hash21(vec2 p) {
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float hashCell(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

ivec2 cellTexel(vec2 cell) {
  return clamp(ivec2(cell) - uOrigin, ivec2(0), uCellCount - 1);
}

float ringValue(float n, vec4 r0, vec4 r1) {
  if (n < 0.5) return r0.x;
  if (n < 1.5) return r0.y;
  if (n < 2.5) return r0.z;
  if (n < 4.5) return r0.w;
  if (n < 5.5) return r1.x;
  return r1.y;
}

float digit(vec2 p) {
  vec2 grid = uGridMul * 15.0;
  vec2 cell = floor(p * grid);
  ivec2 texel = cellTexel(cell);
  vec4 r0 = texelFetch(uRings0, texel, 0);
  vec4 r1 = texelFetch(uRings1, texel, 0);
  float boost = 1.0 + r1.w * uMouseGlow * 1.3;
  pixelHeat = max(pixelHeat, r1.w);
  p = fract(p * grid);
  p *= uDigitSize;

  float px5 = p.x * 5.0;
  float py5 = (1.0 - p.y) * 5.0;
  float x = fract(px5);
  float y = fract(py5);
  float i = floor(py5) - 2.0;
  float j = floor(px5) - 2.0;
  float inside = step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);

  if (uGlyphs == 2) {
    float rate = 1.2 + r1.w * uScramble * 18.0;
    float phase = hashCell(cell * 1.37 + 4.1);
    float epoch = floor(iTime * rate + phase * 7.0);
    float pick = hashCell(cell + vec2(epoch * 0.731, epoch * 1.913));
    uint glyph = FONT[int(min(pick * float(FONT.length()), float(FONT.length()) - 1.0))];
    int bit = int(i + 2.0) * 5 + int(j + 2.0);
    float lit = float((glyph >> uint(clamp(bit, 0, 24))) & 1u);
    float glow = max(r0.x, r1.z);
    float shade = 0.35 + 0.65 * r1.z;
    return inside * lit * glow * shade * boost * (0.2 + y * 0.8) * (0.75 + x * 0.25);
  }

  float n = i * i + j * j;
  float on = ringValue(n, r0, r1);
  if (uGlyphs == 1) {
    vec2 d = vec2(x, y) - 0.5;
    float radius = 0.36 + 0.06 * on;
    float edge = fwidth(px5) * 0.75;
    float dot = 1.0 - smoothstep(radius - edge, radius + edge, length(d));
    return inside * on * dot * boost * (0.55 + 0.45 * (1.0 - length(d) / 0.5));
  }
  float brightness = on * (0.2 + y * 0.8) * (0.75 + x * 0.25);
  return inside * brightness * boost;
}

float onOff(float a, float b, float c) {
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look) {
  float y = look.y - mod(iTime * 0.25, 1.0);
  float window = 1.0 / (1.0 + 50.0 * y * y);
  return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec2 getLight(vec2 p) {
  float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
  bar *= uScanlineIntensity;

  float displacement = displace(p);
  p.x += displacement;

  if (uGlitchAmount != 1.0) {
    float extra = displacement * (uGlitchAmount - 1.0);
    p.x += extra;
  }

  p.x += clickTear;

  float middle = digit(p);

  const float off = 0.002;
  float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
              digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
              digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));

  return vec2(0.9 * middle, sum * 0.1 * bar);
}

float glowAt(vec2 p) {
  vec2 grid = uGridMul * 15.0;
  vec2 cell = floor(p * grid);
  vec2 cellPx = iResolution.xy / (uScale * grid);
  float sigma = 0.5 * min(cellPx.x, cellPx.y);
  float center = 0.5 * min(1.0, 1.0 / max(uDigitSize, 0.001));
  float total = 0.0;
  for (int oy = -1; oy <= 1; oy++) {
    for (int ox = -1; ox <= 1; ox++) {
      vec2 c = cell + vec2(float(ox), float(oy));
      ivec2 texel = cellTexel(c);
      vec4 r0 = texelFetch(uRings0, texel, 0);
      vec4 r1 = texelFetch(uRings1, texel, 0);
      float emission = uGlyphs == 2
        ? max(r0.x, r1.z) * (0.35 + 0.65 * r1.z) * 0.45
        : (r0.x + 4.0 * (r0.y + r0.z + r0.w + r1.y) + 8.0 * r1.x) / 25.0;
      emission *= 1.0 + r1.w * uMouseGlow * 1.6;
      vec2 d = (p - (c + center) / grid) * iResolution.xy / uScale;
      total += emission * exp(-dot(d, d) / (2.0 * sigma * sigma));
    }
  }
  return total;
}

vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
  time = iTime * 0.333333;
  vec2 uv = gl_FragCoord.xy / iResolution.xy;

  if (uCurvature != 0.0) {
    uv = barrel(uv);
  }

  clickTear = 0.0;
  clickSplit = 0.0;
  if (uClickMode > 0) {
    for (int k = 0; k < ${v}; k++) {
      vec4 click = uClicks[k];
      if (click.w <= 0.0) continue;
      float age = uClock - click.z;
      if (age < 0.0 || age > uClickSeconds) continue;
      float life = age / uClickSeconds;
      float envelope = (1.0 - life) * (1.0 - life);
      if (uClickMode == 1) {
        float tick = floor(age * 30.0);
        float bands = 14.0 + 26.0 * hashCell(vec2(click.z, tick * 0.37));
        float row = floor(uv.y * bands);
        float pickRow = hashCell(vec2(row + tick * 7.0, click.z * 17.0));
        float torn = step(0.42, pickRow);
        float reach = exp(-abs(uv.y - click.y) * 2.5);
        float shift = (hashCell(vec2(row * 1.7 + tick, click.z)) - 0.5) * 0.22;
        clickTear += shift * torn * envelope * reach;
        clickSplit = max(clickSplit, envelope * reach * (0.4 + 0.6 * torn));
      } else {
        vec2 aspect = vec2(iResolution.x / iResolution.y, 1.0);
        vec2 delta = (uv - click.xy) * aspect;
        float dist = length(delta);
        float front = age * 1.6;
        float band = exp(-pow((dist - front) / 0.18, 2.0));
        float wave = sin((dist - front) * 40.0) * band;
        uv += delta / aspect * wave * 0.05 * envelope;
        clickSplit = max(clickSplit, envelope * band);
      }
    }
  }

  vec2 p = uv * uScale;
  pixelHeat = 0.0;
  vec2 lightG = getLight(p);
  float heat = pixelHeat;
  vec2 lightR = lightG;
  vec2 lightB = lightG;

  float split = uChromaticAberration + clickSplit * 6.0;
  if (split != 0.0) {
    vec2 ca = vec2(split) / iResolution.xy;
    lightR = getLight(p + ca);
    lightB = getLight(p - ca);
  }

  if (uGlow > 0.0) {
    float bloom = uGlow * 0.2 * glowAt(p);
    lightR.y += bloom;
    lightG.y += bloom;
    lightB.y += bloom;
  }

  vec3 core = vec3(lightR.x, lightG.x, lightB.x);
  vec3 halo = vec3(lightR.y, lightG.y, lightB.y);
  vec3 raw = core + halo;

  vec3 luma = vec3(0.2126, 0.7152, 0.0722);
  float peak = max(uTint.r, max(uTint.g, uTint.b));
  float phosphor = clamp(uGlow, 0.0, 1.0);
  vec3 vividTint = clamp(mix(vec3(dot(uTint, luma)), uTint, 1.0 + 0.8 * phosphor), 0.0, 1.0);
  vec3 coreTint = mix(uTint, vec3(peak), phosphor * 0.45 * smoothstep(0.45, 0.9, core));
  vec3 col = core * coreTint + halo * vividTint;
  col += (vec3(1.0) - uTint) * min(raw, vec3(1.0)) * heat * uMouseGlow * 0.6;
  col *= uBrightness;

  if (uVignette > 0.0) {
    float edge = 0.04 + 0.22 * uVignette;
    vec2 fade = smoothstep(vec2(0.0), vec2(edge), uv) * smoothstep(vec2(0.0), vec2(edge), 1.0 - uv);
    float mask = fade.x * fade.y;
    mask = mask * mask * (3.0 - 2.0 * mask);
    float keep = mix(1.0, mask, clamp(uVignette * 1.5, 0.0, 1.0));
    col *= keep;
    core *= keep;
    halo *= keep;
  }

  if (uLightMode > 0.5) {
    vec3 luma = vec3(0.2126, 0.7152, 0.0722);
    float lum = dot(uTint, luma);
    float peak = max(uTint.r, max(uTint.g, uTint.b));
    vec3 hue = uTint / max(peak, 0.0001);
    vec3 vivid = clamp(mix(vec3(dot(hue, luma)), hue, 1.6), 0.0, 1.0);
    vivid = clamp(vivid * (0.3 / max(dot(vivid, luma), 0.0001)), 0.0, 1.0);
    vec3 ink = mix(uTint, vivid, smoothstep(0.3, 0.6, lum));
    vec3 cover = (core * 1.15 + halo * 0.4) * uBrightness * (1.0 + heat * uMouseGlow * 0.4);
    if (uDither > 0.0) cover += (hash21(gl_FragCoord.xy) - 0.5) * (uDither * 0.003922);
    cover = clamp(cover, 0.0, 0.94);
    float alpha = max(cover.r, max(cover.g, cover.b));
    outColor = vec4(alpha - cover * (1.0 - ink), alpha);
    return;
  }

  if (uDither > 0.0) {
    float rnd = hash21(gl_FragCoord.xy);
    col += (rnd - 0.5) * (uDither * 0.003922);
  }

  col = clamp(col, 0.0, 1.0);
  outColor = vec4(col, max(col.r, max(col.g, col.b)));
}`,E=(e,t,n)=>Math.min(n,Math.max(t,e)),D=(e,t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(e.deleteShader(r),null)):null},O=(e,t)=>{let n=D(e,e.VERTEX_SHADER,C),r=D(e,e.FRAGMENT_SHADER,t),i=e.createProgram();if(!n||!r||!i)return null;if(e.attachShader(i,n),e.attachShader(i,r),e.linkProgram(i),e.deleteShader(n),e.deleteShader(r),!e.getProgramParameter(i,e.LINK_STATUS))return e.deleteProgram(i),null;let a={},o=e.getProgramParameter(i,e.ACTIVE_UNIFORMS);for(let t=0;t<o;t++){let n=e.getActiveUniform(i,t);if(!n)continue;let r=n.name.replace(/\[0\]$/,``);a[r]=e.getUniformLocation(i,r)}return{program:i,uniforms:a}},k=e=>{let t=String(e||`#ffffff`).replace(`#`,``).trim();(t.length===3||t.length===4)&&(t=t.slice(0,3).split(``).map(e=>e+e).join(``));let n=parseInt(t.slice(0,6),16);return Number.isNaN(n)?[1,1,1]:[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};function A({scale:e=1,gridMul:t=[2,1],digitSize:n=1.5,timeScale:r=.3,pause:i=!1,scanlineIntensity:a=.3,glitchAmount:o=1,flickerAmount:s=1,noiseAmp:c=1,chromaticAberration:l=0,dither:u=0,curvature:d=.2,tint:f=`#ffffff`,mouseReact:p=!0,mouseStrength:m=.2,pageLoadAnimation:S=!0,brightness:C=1,glyphs:D=`blocks`,glow:A=.5,persistence:j=.5,scramble:M=.5,mouseGlow:N=.6,vignette:P=.25,clickEffect:F=`glitch`,variation:I,lightMode:L=!1,dpr:R,className:z=``,style:B,...V}){let H=(0,h.useRef)(null),U=(0,h.useRef)(null),W=(0,h.useRef)(null),G={scale:Math.max(.05,e),gridX:Math.max(.1,(t?.[0]??2)*15),gridY:Math.max(.1,(t?.[1]??1)*15),digitSize:n,timeScale:r,pause:i,scanlineIntensity:a,glitchAmount:o,flickerAmount:s,noiseAmp:c,chromaticAberration:l,dither:typeof u==`boolean`?+!!u:u,curvature:d,tint:f,mouseReact:p,mouseStrength:m,pageLoadAnimation:S,brightness:C,glyphs:b[D]??0,glow:E(A,0,3),persistence:E(j,0,1),scramble:E(M,0,1),mouseGlow:E(N,0,1),vignette:E(P,0,1),clickEffect:x[F]??0,clickSeconds:y[F]??1,variation:I,lightMode:L,dpr:R},K=(0,h.useRef)(G);return K.current=G,(0,h.useEffect)(()=>{let e=H.current,t=U.current,n=t?.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!e||!t||!n)return;let r=O(n,w),i=O(n,T);if(!r||!i)return;let a=r.uniforms,o=i.uniforms,s=n.createVertexArray(),c=()=>{let e=n.createTexture();return n.bindTexture(n.TEXTURE_2D,e),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,1,1,0,n.RGBA,n.UNSIGNED_BYTE,null),e},l=[0,1].map(()=>{let e=c(),t=c(),r=n.createFramebuffer();return n.bindFramebuffer(n.FRAMEBUFFER,r),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,e,0),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT1,n.TEXTURE_2D,t,0),{rings:e,extra:t,framebuffer:r}});n.bindFramebuffer(n.FRAMEBUFFER,null);let u=window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches??!1,d={width:1,height:1,ratio:1,columns:1},f={x:0,y:0,w:1,h:1,key:``},p={x:.5,y:.5,inside:!1},m={x:.5,y:.5},h=new Float32Array(16),g=0,y=0,b=0,x=0,S=!0,C=K.current.variation,D=(typeof C==`number`?C*10:Math.random()*100)*K.current.timeScale,A=K.current.pageLoadAnimation&&!u?0:1,j=0,M=0,N=!0,P=0,F=e=>{let t=1+Math.max(0,e.curvature)*2,r=.5-.5*t,i=.5+.5*t,a=.06*Math.max(1,Math.abs(e.glitchAmount))*Math.max(1,Math.abs(e.flickerAmount))+.2,o=e.gridX*d.columns,s=Math.floor((r*e.scale-a)*o)-2,c=Math.floor((i*e.scale+a)*o)+2,u=Math.floor((r*e.scale-a)*e.gridY)-2,p=Math.floor((i*e.scale+a)*e.gridY)+2,m=`${s}:${c}:${u}:${p}`;if(m!==f.key){f.key=m,f.x=s,f.y=u,f.w=Math.max(1,Math.min(4096,c-s+1)),f.h=Math.max(1,Math.min(4096,p-u+1));for(let e of l)for(let t of[e.rings,e.extra])n.bindTexture(n.TEXTURE_2D,t),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,f.w,f.h,0,n.RGBA,n.UNSIGNED_BYTE,null);S=!0}},I=(e,t)=>{let i=l[x],o=l[1-x];n.bindFramebuffer(n.FRAMEBUFFER,o.framebuffer),n.drawBuffers([n.COLOR_ATTACHMENT0,n.COLOR_ATTACHMENT1]),n.viewport(0,0,f.w,f.h),n.disable(n.BLEND),n.useProgram(r.program),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,i.rings),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,i.extra),n.uniform1i(a.uPrev0,0),n.uniform1i(a.uPrev1,1),n.uniform1f(a.iTime,D),n.uniform2f(a.uGridMul,e.gridX*d.columns/15,e.gridY/15),n.uniform1f(a.uNoiseAmp,e.noiseAmp),n.uniform1f(a.uScale,e.scale),n.uniform2f(a.uMouse,m.x,m.y),n.uniform1f(a.uMouseStrength,e.mouseStrength),n.uniform1f(a.uUseMouse,+!!e.mouseReact),n.uniform1f(a.uPageLoadProgress,A),n.uniform1f(a.uUsePageLoadAnimation,+!!e.pageLoadAnimation),n.uniform2i(a.uOrigin,f.x,f.y),n.uniform1f(a.uDecay,t),n.uniform1f(a.uFresh,+!!S),n.uniform1f(a.uHover,b),n.bindVertexArray(s),n.drawArrays(n.TRIANGLES,0,3),n.bindFramebuffer(n.FRAMEBUFFER,null),x=1-x,S=!1},L=()=>{let e=K.current,r=l[x];n.viewport(0,0,t.width,t.height),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),n.useProgram(i.program),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,r.rings),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,r.extra),n.uniform1i(o.uRings0,0),n.uniform1i(o.uRings1,1),n.uniform1f(o.iTime,D),n.uniform3f(o.iResolution,t.width,t.height,t.width/t.height),n.uniform1f(o.uScale,e.scale),n.uniform2f(o.uGridMul,e.gridX*d.columns/15,e.gridY/15),n.uniform1f(o.uDigitSize,e.digitSize),n.uniform1f(o.uScanlineIntensity,e.scanlineIntensity),n.uniform1f(o.uGlitchAmount,u?0:e.glitchAmount),n.uniform1f(o.uFlickerAmount,u?0:e.flickerAmount),n.uniform1f(o.uChromaticAberration,e.chromaticAberration),n.uniform1f(o.uDither,e.dither),n.uniform1f(o.uCurvature,e.curvature),n.uniform3fv(o.uTint,k(e.tint)),n.uniform1f(o.uBrightness,e.brightness),n.uniform1f(o.uLightMode,+!!e.lightMode),n.uniform2i(o.uOrigin,f.x,f.y),n.uniform2i(o.uCellCount,f.w,f.h),n.uniform1i(o.uGlyphs,e.glyphs),n.uniform1f(o.uGlow,e.glow),n.uniform1f(o.uScramble,e.scramble),n.uniform1f(o.uMouseGlow,e.mouseGlow),n.uniform1f(o.uVignette,e.vignette),n.uniform4fv(o.uClicks,h),n.uniform1i(o.uClickMode,e.clickEffect),n.uniform1f(o.uClickSeconds,e.clickSeconds),n.uniform1f(o.uClock,y),n.bindVertexArray(s),n.drawArrays(n.TRIANGLES,0,3),n.bindVertexArray(null)},R=()=>{let n=K.current;d.width=Math.max(1,e.clientWidth),d.height=Math.max(1,e.clientHeight),d.ratio=Math.min(n.dpr||window.devicePixelRatio||1,2),d.columns=Math.min(1,d.width/d.height/1.5),t.width=Math.max(1,Math.round(d.width*d.ratio)),t.height=Math.max(1,Math.round(d.height*d.ratio)),F(n),I(n,0),L(),B()},z=e=>{if(j=0,!N||document.hidden)return;let t=K.current,n=M?E((e-M)/1e3,.001,1/20):1/60;M=e,y+=n,!t.pause&&!u&&(D+=n*t.timeScale);let r=p.inside?p.x:.5,i=p.inside?p.y:.5,a=1-Math.exp(-n/(p.inside?.19988:.6));m.x+=(r-m.x)*a,m.y+=(i-m.y)*a,b+=(+!!p.inside-b)*(1-Math.exp(-n/.35));for(let e=0;e<v;e++)h[e*4+3]>0&&y-h[e*4+2]>t.clickSeconds&&(h[e*4+3]=0);F(t);let o=t.persistence>0?Math.exp(-n/(.08+t.persistence*1.4)):0;I(t,o),L(),A<1&&(A=Math.min(1,A+n/_));let s=!(t.pause||u)||A<1;s||=Math.abs(r-m.x)+Math.abs(i-m.y)>1e-4,s||=Math.abs(+!!p.inside-b)>.001;for(let e=0;e<v;e++)s||=h[e*4+3]>0;P=s?0:P+n,P<2.5&&(j=requestAnimationFrame(z))};function B(){P=0,!j&&N&&!document.hidden&&(M=0,j=requestAnimationFrame(z))}let V=t=>{let n=e.getBoundingClientRect(),r=(t.clientX-n.left)/Math.max(n.width,1),i=1-(t.clientY-n.top)/Math.max(n.height,1);return{x:r,y:i,inside:r>=0&&r<=1&&i>=0&&i<=1}},G=e=>{let{x:t,y:n,inside:r}=V(e),i=p.inside;p.inside=r,r&&(p.x=t,p.y=n),(r||i)&&B()},q=e=>{let t=K.current,{x:n,y:r,inside:i}=V(e);if(!i||u||!t.clickEffect)return;let a=g*4;h[a]=n,h[a+1]=r,h[a+2]=y,h[a+3]=1,g=(g+1)%v,B()},J=()=>{p.inside=!1,B()},Y=()=>B(),X=new ResizeObserver(R);X.observe(e);let Z=new IntersectionObserver(e=>{N=e.some(e=>e.isIntersecting),N&&B()});return Z.observe(e),window.addEventListener(`pointermove`,G,{passive:!0}),window.addEventListener(`pointerdown`,q,{passive:!0}),document.documentElement.addEventListener(`pointerleave`,J),document.addEventListener(`visibilitychange`,Y),R(),W.current=B,()=>{cancelAnimationFrame(j),W.current=null,X.disconnect(),Z.disconnect(),window.removeEventListener(`pointermove`,G),window.removeEventListener(`pointerdown`,q),document.documentElement.removeEventListener(`pointerleave`,J),document.removeEventListener(`visibilitychange`,Y);for(let e of l)n.deleteTexture(e.rings),n.deleteTexture(e.extra),n.deleteFramebuffer(e.framebuffer);n.deleteVertexArray(s),n.deleteProgram(r.program),n.deleteProgram(i.program),t.isConnected||n.getExtension(`WEBGL_lose_context`)?.loseContext()}},[]),(0,h.useEffect)(()=>{W.current?.()}),(0,g.jsx)(`div`,{ref:H,className:`faulty-terminal-container${z?` ${z}`:``}`,style:B,...V,children:(0,g.jsx)(`canvas`,{ref:U,className:`faulty-terminal-canvas`,"aria-hidden":`true`})})}var j=({href:e,children:t})=>(0,g.jsx)(`a`,{href:e,rel:e.startsWith(`http`)?`noopener`:void 0,children:t}),M=({k:e,children:t})=>(0,g.jsxs)(`p`,{className:`row`,children:[(0,g.jsx)(`span`,{className:`k`,children:e}),(0,g.jsx)(`span`,{children:t})]}),N={pitch:{about:`what this is`,run:()=>(0,g.jsxs)(g.Fragment,{children:[u.pitch.map(e=>(0,g.jsx)(`p`,{className:`big`,children:e},e)),(0,g.jsx)(`p`,{children:u.statement.join(` `)})]})},why:{about:`how the team works`,run:()=>(0,g.jsx)(g.Fragment,{children:a.map((e,t)=>(0,g.jsx)(M,{k:`0${t+1}`,children:e},e))})},record:{about:`breaks and speaker awards`,run:()=>(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)(`p`,{className:`dim`,children:o.rule}),(0,g.jsxs)(`p`,{className:`hl`,children:[o.when,`. `,o.name,`, `,o.where,`.`]}),o.results.map(e=>(0,g.jsxs)(M,{k:e.who,children:[(0,g.jsxs)(`b`,{children:[e.what,`.`]}),` `,e.more]},e.who)),(0,g.jsx)(`p`,{children:(0,g.jsx)(j,{href:o.more.href,children:o.more.label})})]})},drive:{about:`what is in the drive`,run:()=>(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)(`p`,{className:`dim`,children:f.lead}),f.items.map(e=>(0,g.jsx)(M,{k:`${e.term.toLowerCase()}/`,children:e.text},e.term)),(0,g.jsx)(`p`,{children:(0,g.jsx)(j,{href:f.more.href,children:f.more.label})})]})},people:{about:`the coaches`,run:()=>(0,g.jsxs)(g.Fragment,{children:[d.coaches.map(e=>(0,g.jsxs)(M,{k:e.role.toLowerCase(),children:[(0,g.jsxs)(`b`,{children:[e.name,`.`]}),` `,e.bio]},e.name)),(0,g.jsxs)(`p`,{children:[d.count,` `,(0,g.jsx)(j,{href:d.more.href,children:d.more.label})]})]})},join:{about:`three ways in`,run:()=>(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)(`p`,{className:`dim`,children:s.lead}),s.paths.map(e=>(0,g.jsxs)(M,{k:e.id,children:[(0,g.jsx)(j,{href:e.href,children:(0,g.jsx)(`b`,{children:e.line})}),` `,e.text.join(` `)]},e.id)),(0,g.jsxs)(`p`,{children:[s.already.before,(0,g.jsx)(j,{href:s.already.href,children:s.already.label}),`. `,s.coach.before,(0,g.jsx)(j,{href:s.coach.href,children:s.coach.label}),`.`]}),(0,g.jsxs)(`p`,{children:[s.also,` `,(0,g.jsx)(j,{href:`mailto:${c.email}`,children:c.email})]})]})},links:{about:`where else we are`,run:()=>(0,g.jsxs)(g.Fragment,{children:[l.links.map(e=>(0,g.jsx)(M,{k:e.label.includes(`@`)?`email`:e.label.toLowerCase(),children:(0,g.jsx)(j,{href:e.href,children:e.href.replace(/^mailto:|^https:\/\//,``)})},e.href)),l.pages.map(e=>(0,g.jsx)(M,{k:e.label.toLowerCase(),children:(0,g.jsx)(j,{href:e.href,children:e.href.replace(`https://`,``)})},e.href))]})}},P=[`pitch`,`why`,`record`,`drive`,`people`,`join`,`links`],F=()=>(0,g.jsxs)(g.Fragment,{children:[P.map(e=>(0,g.jsx)(M,{k:e,children:N[e].about},e)),(0,g.jsx)(M,{k:`all`,children:`everything, in order`}),(0,g.jsx)(M,{k:`clear`,children:`wipe the screen`})]}),I=1;function L(){m(`terminal`);let[e,t]=(0,h.useState)([]),[i,a]=(0,h.useState)(``),[o,s]=(0,h.useState)(``),c=(0,h.useRef)([]),u=(0,h.useRef)(-1),d=(0,h.useRef)(null),f=(0,h.useRef)(null),_=(0,h.useCallback)(e=>{let n=e.trim().toLowerCase();if(!n)return;if(c.current.unshift(n),u.current=-1,n===`clear`){t([]);return}let r=n===`help`?(0,g.jsx)(F,{}):n===`all`?(0,g.jsx)(g.Fragment,{children:P.map(e=>(0,g.jsxs)(`div`,{className:`block`,children:[(0,g.jsx)(`p`,{className:`sub`,children:e}),N[e].run()]},e))}):N[n]?N[n].run():(0,g.jsxs)(`p`,{children:[`Not a command: `,(0,g.jsx)(`b`,{children:n}),`. Try `,(0,g.jsx)(`b`,{children:`help`}),`.`]});t(e=>[...e,{id:I++,cmd:n,out:r}])},[]);return(0,h.useEffect)(()=>{if(r){_(`pitch`),_(`help`);return}let e=0,t=!0,n=()=>{t&&(e<=5?(s(`pitch`.slice(0,e++)),setTimeout(n,110)):(s(``),_(`pitch`),setTimeout(()=>t&&_(`help`),500)))},i=setTimeout(n,1100);return()=>{t=!1,clearTimeout(i)}},[_]),(0,h.useEffect)(()=>{if(e.length<3)return;let t=f.current.getBoundingClientRect().bottom+window.scrollY-window.innerHeight+24;t>window.scrollY&&p(t)},[e]),(0,g.jsxs)(`div`,{className:`vt`,children:[(0,g.jsx)(`a`,{className:`skip-x`,href:`#main`,children:`Skip to content`}),(0,g.jsx)(`div`,{className:`bg`,"aria-hidden":`true`,children:(0,g.jsx)(A,{scale:1.7,digitSize:1.5,timeScale:.28,pause:r,scanlineIntensity:.35,glitchAmount:1,flickerAmount:.5,noiseAmp:.8,chromaticAberration:0,dither:0,curvature:.12,tint:`#39d98a`,mouseReact:!n,mouseStrength:.25,pageLoadAnimation:!r,brightness:.32})}),(0,g.jsxs)(`main`,{id:`main`,className:`win`,onClick:e=>{!e.target.closest(`a, button`)&&!window.getSelection()?.toString()&&d.current?.focus({preventScroll:!0})},children:[(0,g.jsxs)(`header`,{className:`bar`,children:[(0,g.jsxs)(`span`,{className:`dots`,"aria-hidden":`true`,children:[(0,g.jsx)(`i`,{}),(0,g.jsx)(`i`,{}),(0,g.jsx)(`i`,{})]}),(0,g.jsx)(`h1`,{children:`skeptical: an independent Lincoln-Douglas debate team`})]}),(0,g.jsx)(`div`,{className:`out`,role:`log`,"aria-live":`polite`,"aria-label":`Terminal output`,children:e.map(e=>(0,g.jsxs)(`div`,{className:`entry`,children:[(0,g.jsxs)(`p`,{className:`cmd`,children:[(0,g.jsx)(`span`,{className:`ps`,"aria-hidden":`true`,children:`skeptical ~ %`}),` `,e.cmd]}),(0,g.jsx)(`div`,{className:`res`,children:e.out})]},e.id))}),(0,g.jsxs)(`div`,{className:`prompt`,children:[(0,g.jsx)(`label`,{htmlFor:`cli`,className:`ps`,children:`skeptical ~ %`}),(0,g.jsx)(`input`,{id:`cli`,ref:d,value:o||i,onChange:e=>a(e.target.value),onKeyDown:e=>{if(e.key===`Enter`)_(i),a(``);else if(e.key===`Tab`&&i){let t=[...P,`all`,`help`,`clear`].find(e=>e.startsWith(i.toLowerCase()));t&&(e.preventDefault(),a(t))}else(e.key===`ArrowUp`||e.key===`ArrowDown`)&&(e.preventDefault(),u.current=Math.max(-1,Math.min(c.current.length-1,u.current+(e.key===`ArrowUp`?1:-1))),a(u.current<0?``:c.current[u.current]))},autoComplete:`off`,autoCapitalize:`off`,spellCheck:!1,"aria-describedby":`cli-hint`,readOnly:!!o})]}),(0,g.jsx)(`p`,{id:`cli-hint`,className:`hint`,children:`Type a command and press Return, or use the keys. Tab completes, the up arrow repeats.`}),(0,g.jsx)(`div`,{className:`keys`,role:`group`,"aria-label":`Commands`,children:[...P,`all`,`help`,`clear`].map(e=>(0,g.jsx)(`button`,{type:`button`,onClick:()=>_(e),children:e},e))}),(0,g.jsx)(`div`,{ref:f})]}),(0,g.jsx)(`footer`,{children:(0,g.jsxs)(`p`,{children:[l.line,` Draft 2, version 10. Not the live site.`]})})]})}export{L as default};