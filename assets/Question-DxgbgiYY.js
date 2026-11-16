import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{a as t,c as n,d as r,i,l as a,n as o,r as s,s as c,t as l}from"./jsx-runtime-BAJ4K1lj.js";import{t as u}from"./gsap-Dm7UF3sG.js";/* empty css                          */import{a as d,c as f,i as p,l as m,n as h,o as g,r as _,s as v,t as y}from"./content-D8DUqlkw.js";import{c as b,n as x,o as S}from"./scroll-CIxM5NtI.js";import{n as C,t as w}from"./motion-66kFq4QZ.js";import{t as ee}from"./version-sRrcf_t8.js";import{t as T}from"./Loader-B0Gd9vtg.js";import{t as te}from"./dist-CKXK8MBg.js";import{a as E,i as D,n as O,r as k,s as A,t as j,u as M}from"./dist-BK1wwRnp.js";import{t as N}from"./createLucideIcon-6-U_RRUC.js";import{r as ne,t as re}from"./dist-Cv8U3uhO.js";import{Ga as ie,L as ae,Pt as oe,Qi as se,Rn as ce,Rt as le,U as ue,Yt as de,bt as fe,do as pe,pr as me,qa as he,ro as ge,ta as _e,tr as ve}from"./three.core-BF58tRDi.js";import{n as ye,t as be}from"./dist-Ds9vaSQ-.js";import{t as xe}from"./Magnet-CMB5MGpE.js";import{a as P,i as Se,s as F,t as Ce}from"./react-three-fiber.esm-BeYEtBgh.js";import{t as we}from"./Environment-SxcYP0I8.js";import{t as Te}from"./extends-CvVTau-c.js";import{t as Ee}from"./Text-CdmdnpuS.js";import{f as De,r as Oe,s as ke,t as Ae}from"./dist-BA56AkWY.js";import{t as je}from"./SVGLoader-DOTwrwdd.js";import{t as Me}from"./marks-Ce1ST7vc.js";var Ne={name:`chevron-down`,size:24,node:[[`path`,{d:`m6 9 6 6 6-6`,key:`qrunsl`}]]};Ne.node;var Pe=N(Ne),I=e(r(),1),L=l(),Fe=Object.defineProperty,R=(e,t)=>Fe(e,`name`,{value:t,configurable:!0}),z=`Collapsible`,[Ie,Le]=D(z),[Re,B]=Ie(z),ze=I.forwardRef(R(function(e,t){let{__scopeCollapsible:n,open:r,defaultOpen:i,disabled:a,onOpenChange:o,...s}=e,[c,l]=j({prop:r,defaultProp:i??!1,onChange:o,caller:z});return(0,L.jsx)(Re,{scope:n,disabled:a,contentId:be(),open:c,onOpenToggle:I.useCallback(()=>l(e=>!e),[l]),children:(0,L.jsx)(E.div,{"data-state":V(c),"data-disabled":a?``:void 0,...s,ref:t})})},`Collapsible`)),Be=`CollapsibleTrigger`,Ve=I.forwardRef(R(function(e,t){let{__scopeCollapsible:n,...r}=e,i=B(Be,n);return(0,L.jsx)(E.button,{type:`button`,"aria-controls":i.open?i.contentId:void 0,"aria-expanded":i.open||!1,"data-state":V(i.open),"data-disabled":i.disabled?``:void 0,disabled:i.disabled,...r,ref:t,onClick:O(e.onClick,i.onOpenToggle)})},`CollapsibleTrigger`)),He=`CollapsibleContent`,Ue=I.forwardRef(R(function(e,t){let{forceMount:n,...r}=e,i=B(He,e.__scopeCollapsible);return(0,L.jsx)(ye,{present:n||i.open,children:({present:e})=>(0,L.jsx)(We,{...r,ref:t,present:e})})},`CollapsibleContent`)),We=I.forwardRef(R(function(e,t){let{__scopeCollapsible:n,present:r,children:i,...a}=e,o=B(He,n),[s,c]=I.useState(r),l=I.useRef(null),u=M(t,l),d=I.useRef(0),f=d.current,p=I.useRef(0),m=p.current,h=o.open||s,g=I.useRef(h),_=I.useRef(void 0);return I.useEffect(()=>{let e=requestAnimationFrame(()=>g.current=!1);return()=>cancelAnimationFrame(e)},[]),k(()=>{let e=l.current;if(e){_.current=_.current||{transitionDuration:e.style.transitionDuration,animationName:e.style.animationName},e.style.transitionDuration=`0s`,e.style.animationName=`none`;let t=e.getBoundingClientRect();d.current=t.height,p.current=t.width,g.current||(e.style.transitionDuration=_.current.transitionDuration,e.style.animationName=_.current.animationName),c(r)}},[o.open,r]),(0,L.jsx)(E.div,{"data-state":V(o.open),"data-disabled":o.disabled?``:void 0,id:o.contentId,hidden:!h,...a,ref:u,style:{"--radix-collapsible-content-height":f?`${f}px`:void 0,"--radix-collapsible-content-width":m?`${m}px`:void 0,...e.style},children:h&&i})},`CollapsibleContentImpl`));function V(e){return e?`open`:`closed`}R(V,`getState`);var Ge=Object.defineProperty,H=(e,t)=>Ge(e,`name`,{value:t,configurable:!0}),Ke={Single:`single`,Multiple:`multiple`},U={Vertical:`vertical`,Horizontal:`horizontal`},qe={LTR:`ltr`,RTL:`rtl`},W=`Accordion`,Je=[`Home`,`End`,`ArrowDown`,`ArrowUp`,`ArrowLeft`,`ArrowRight`],[G,{useGetCollection:Ye,createCollectionScope:Xe}]=ne(W),[K,Ze]=D(W,[Xe,Le]),q=Le(),Qe=I.forwardRef(H(function(e,t){let{type:n,...r}=e,i=r,a=r;return(0,L.jsx)(G.Provider,{scope:e.__scopeAccordion,children:n===Ke.Multiple?(0,L.jsx)(it,{...a,ref:t}):(0,L.jsx)(rt,{...i,ref:t})})},`Accordion`)),[$e,et]=K(W),[tt,nt]=K(W,{collapsible:!1}),rt=I.forwardRef(H(function(e,t){let{value:n,defaultValue:r,onValueChange:i=H(()=>{},`onValueChange`),collapsible:a=!1,...o}=e,[s,c]=j({prop:n,defaultProp:r??``,onChange:i,caller:W});return(0,L.jsx)($e,{scope:e.__scopeAccordion,value:I.useMemo(()=>s?[s]:[],[s]),onItemOpen:c,onItemClose:I.useCallback(()=>a&&c(``),[a,c]),children:(0,L.jsx)(tt,{scope:e.__scopeAccordion,collapsible:a,children:(0,L.jsx)(ot,{...o,ref:t})})})},`AccordionImplSingle`)),it=I.forwardRef(H(function(e,t){let{value:n,defaultValue:r,onValueChange:i=H(()=>{},`onValueChange`),...a}=e,[o,s]=j({prop:n,defaultProp:r??[],onChange:i,caller:W}),c=I.useCallback(e=>s((t=[])=>[...t,e]),[s]),l=I.useCallback(e=>s((t=[])=>t.filter(t=>t!==e)),[s]);return(0,L.jsx)($e,{scope:e.__scopeAccordion,value:o,onItemOpen:c,onItemClose:l,children:(0,L.jsx)(tt,{scope:e.__scopeAccordion,collapsible:!0,children:(0,L.jsx)(ot,{...a,ref:t})})})},`AccordionImplMultiple`)),[at,J]=K(W),ot=I.forwardRef(H(function(e,t){let{__scopeAccordion:n,disabled:r,dir:i,orientation:a=U.Vertical,...o}=e,s=I.useRef(null),c=M(s,t),l=Ye(n),u=re(i)===qe.LTR,d=O(e.onKeyDown,e=>{if(!Je.includes(e.key))return;let t=l(),n=e.target,r=t.filter(([,e])=>!e.element.disabled),i=r.findIndex(([,e])=>e.element===n),o=r.size;if(i===-1)return;e.preventDefault();let s=i,c=o-1,d=H(()=>{s=i+1,s>c&&(s=0)},`moveNext`),f=H(()=>{s=i-1,s<0&&(s=c)},`movePrev`);switch(e.key){case`Home`:s=0;break;case`End`:s=c;break;case`ArrowRight`:a===U.Horizontal&&(u?d():f());break;case`ArrowDown`:a===U.Vertical&&d();break;case`ArrowLeft`:a===U.Horizontal&&(u?f():d());break;case`ArrowUp`:a===U.Vertical&&f()}let p=s%o;r.at(p)?.element.focus()});return(0,L.jsx)(at,{scope:n,disabled:r,direction:i,orientation:a,children:(0,L.jsx)(G.Slot,{scope:n,children:(0,L.jsx)(E.div,{...o,"data-orientation":a,ref:c,onKeyDown:r?void 0:d})})})},`AccordionImpl`)),Y=`AccordionItem`,[st,X]=K(Y),ct=I.forwardRef(H(function(e,t){let{__scopeAccordion:n,value:r,...i}=e,a=J(Y,n),o=et(Y,n),s=q(n),c=be(),l=r&&o.value.includes(r)||!1,u=a.disabled||e.disabled;return(0,L.jsx)(st,{scope:n,open:l,disabled:u,triggerId:c,children:(0,L.jsx)(ze,{"data-orientation":a.orientation,"data-state":ht(l),...s,...i,ref:t,disabled:u,open:l,onOpenChange:e=>{e?o.onItemOpen(r):o.onItemClose(r)}})})},`AccordionItem`)),lt=`AccordionHeader`,ut=I.forwardRef(H(function(e,t){let{__scopeAccordion:n,...r}=e,i=J(W,n),a=X(lt,n);return(0,L.jsx)(E.h3,{"data-orientation":i.orientation,"data-state":ht(a.open),"data-disabled":a.disabled?``:void 0,...r,ref:t})},`AccordionHeader`)),dt=`AccordionTrigger`,ft=I.forwardRef(H(function(e,t){let{__scopeAccordion:n,...r}=e,i=J(W,n),a=X(dt,n),o=nt(dt,n),s=q(n);return(0,L.jsx)(G.ItemSlot,{scope:n,children:(0,L.jsx)(Ve,{"aria-disabled":a.open&&!o.collapsible||void 0,"data-orientation":i.orientation,id:a.triggerId,...s,...r,ref:t})})},`AccordionTrigger`)),pt=`AccordionContent`,mt=I.forwardRef(H(function(e,t){let{__scopeAccordion:n,...r}=e,i=J(W,n),a=X(pt,n),o=q(n);return(0,L.jsx)(Ue,{role:`region`,"aria-labelledby":a.triggerId,"data-orientation":i.orientation,...o,...r,ref:t,style:{"--radix-accordion-content-height":`var(--radix-collapsible-content-height)`,"--radix-accordion-content-width":`var(--radix-collapsible-content-width)`,...e.style}})},`AccordionContent`));function ht(e){return e?`open`:`closed`}H(ht,`getState`);function gt(e,t,n,r){var i=class extends _e{constructor(i){super({vertexShader:t,fragmentShader:n,...i});for(let t in e)this.uniforms[t]=new ie(e[t]),Object.defineProperty(this,t,{get(){return this.uniforms[t].value},set(e){this.uniforms[t].value=e}});this.uniforms=he.clone(this.uniforms),r?.(this)}};return i.key=ve.generateUUID(),i}function _t(e,t,n){let r=F(e=>e.size),i=F(e=>e.viewport),a=typeof e==`number`?e:r.width*i.dpr,o=typeof t==`number`?t:r.height*i.dpr,s=(typeof e==`number`?n:e)||{},{samples:c=0,depth:l,...u}=s,d=l??s.depthBuffer,f=I.useMemo(()=>{let e=new pe(a,o,{minFilter:ce,magFilter:ce,type:de,...u});return d&&(e.depthTexture=new fe(a,o,le)),e.samples=c,e},[]);return I.useLayoutEffect(()=>{f.setSize(a,o),c&&(f.samples=c)},[c,f,a,o]),I.useEffect(()=>()=>f.dispose(),[]),f}var vt=gt({},`void main() { }`,`void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); discard;  }`),yt=class extends me{constructor(e=6,t=!1){super(),this.uniforms={chromaticAberration:{value:.05},transmission:{value:0},_transmission:{value:1},transmissionMap:{value:null},roughness:{value:0},thickness:{value:0},thicknessMap:{value:null},attenuationDistance:{value:1/0},attenuationColor:{value:new ue(`white`)},anisotropicBlur:{value:.1},time:{value:0},distortion:{value:0},distortionScale:{value:.5},temporalDistortion:{value:0},buffer:{value:null}},this.onBeforeCompile=n=>{n.uniforms={...n.uniforms,...this.uniforms},(this.anisotropy??0)>0&&(n.defines.USE_ANISOTROPY=``),t?n.defines.USE_SAMPLER=``:n.defines.USE_TRANSMISSION=``,n.fragmentShader=`
      uniform float chromaticAberration;         
      uniform float anisotropicBlur;      
      uniform float time;
      uniform float distortion;
      uniform float distortionScale;
      uniform float temporalDistortion;
      uniform sampler2D buffer;

      vec3 random3(vec3 c) {
        float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
        vec3 r;
        r.z = fract(512.0*j);
        j *= .125;
        r.x = fract(512.0*j);
        j *= .125;
        r.y = fract(512.0*j);
        return r-0.5;
      }

      uint hash( uint x ) {
        x += ( x << 10u );
        x ^= ( x >>  6u );
        x += ( x <<  3u );
        x ^= ( x >> 11u );
        x += ( x << 15u );
        return x;
      }

      // Compound versions of the hashing algorithm I whipped together.
      uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
      uint hash( uvec3 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
      uint hash( uvec4 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }

      // Construct a float with half-open range [0:1] using low 23 bits.
      // All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
      float floatConstruct( uint m ) {
        const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
        const uint ieeeOne      = 0x3F800000u; // 1.0 in IEEE binary32
        m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
        m |= ieeeOne;                          // Add fractional part to 1.0
        float  f = uintBitsToFloat( m );       // Range [1:2]
        return f - 1.0;                        // Range [0:1]
      }

      // Pseudo-random value in half-open range [0:1].
      float randomBase( float x ) { return floatConstruct(hash(floatBitsToUint(x))); }
      float randomBase( vec2  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float randomBase( vec3  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float randomBase( vec4  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
      float rand(float seed) {
        float result = randomBase(vec3(gl_FragCoord.xy, seed));
        return result;
      }

      const float F3 =  0.3333333;
      const float G3 =  0.1666667;

      float snoise(vec3 p) {
        vec3 s = floor(p + dot(p, vec3(F3)));
        vec3 x = p - s + dot(s, vec3(G3));
        vec3 e = step(vec3(0.0), x - x.yzx);
        vec3 i1 = e*(1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy*(1.0 - e);
        vec3 x1 = x - i1 + G3;
        vec3 x2 = x - i2 + 2.0*G3;
        vec3 x3 = x - 1.0 + 3.0*G3;
        vec4 w, d;
        w.x = dot(x, x);
        w.y = dot(x1, x1);
        w.z = dot(x2, x2);
        w.w = dot(x3, x3);
        w = max(0.6 - w, 0.0);
        d.x = dot(random3(s), x);
        d.y = dot(random3(s + i1), x1);
        d.z = dot(random3(s + i2), x2);
        d.w = dot(random3(s + 1.0), x3);
        w *= w;
        w *= w;
        d *= w;
        return dot(d, vec4(52.0));
      }

      float snoiseFractal(vec3 m) {
        return 0.5333333* snoise(m)
              +0.2666667* snoise(2.0*m)
              +0.1333333* snoise(4.0*m)
              +0.0666667* snoise(8.0*m);
      }
`+n.fragmentShader,n.fragmentShader=n.fragmentShader.replace(`#include <transmission_pars_fragment>`,`
        #ifdef USE_TRANSMISSION
          // Transmission code is based on glTF-Sampler-Viewer
          // https://github.com/KhronosGroup/glTF-Sample-Viewer
          uniform float _transmission;
          uniform float thickness;
          uniform float attenuationDistance;
          uniform vec3 attenuationColor;
          #ifdef USE_TRANSMISSIONMAP
            uniform sampler2D transmissionMap;
          #endif
          #ifdef USE_THICKNESSMAP
            uniform sampler2D thicknessMap;
          #endif
          uniform vec2 transmissionSamplerSize;
          uniform sampler2D transmissionSamplerMap;
          uniform mat4 modelMatrix;
          uniform mat4 projectionMatrix;
          varying vec3 vWorldPosition;
          vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in vec3 modelScale ) {
            // Direction of refracted light.
            // n is normalized once when the sample normal is built.
            vec3 refractionVector = refract( - v, n, 1.0 / ior );
            // The thickness is specified in local space.
            return normalize( refractionVector ) * thickness * modelScale;
          }
          float applyIorToRoughness( const in float roughness, const in float ior ) {
            // Scale roughness with IOR so that an IOR of 1.0 results in no microfacet refraction and
            // an IOR of 1.5 results in the default amount of microfacet refraction.
            return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
          }
          vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
            float framebufferLod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );            
            #ifdef USE_SAMPLER
              #ifdef texture2DLodEXT
                return texture2DLodEXT(transmissionSamplerMap, fragCoord.xy, framebufferLod);
              #else
                return texture2D(transmissionSamplerMap, fragCoord.xy, framebufferLod);
              #endif
            #else
              return texture2D(buffer, fragCoord.xy);
            #endif
          }
          vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
            const in vec3 position, const in vec3 modelScale, const in vec3 attenuationCoefficient, const in vec3 F,
            const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
            const in float attenuationDistance ) {
            vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelScale );
            vec3 refractedRayExit = position + transmissionRay;
            // Project refracted vector on the framebuffer, while mapping to normalized device coordinates.
            vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
            vec2 refractionCoords = ndcPos.xy / ndcPos.w;
            refractionCoords += 1.0;
            refractionCoords /= 2.0;
            // Sample framebuffer to get pixel the refracted ray hits.
            vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
            vec3 attenuatedColor = transmittedLight.rgb;
            if ( !isinf( attenuationDistance ) ) {
              // Apply Beer's law.
              attenuatedColor *= exp( - attenuationCoefficient * length( transmissionRay ) );
            }
            return vec4( ( 1.0 - F ) * attenuatedColor * diffuseColor, transmittedLight.a );
          }
        #endif
`),n.fragmentShader=n.fragmentShader.replace(`#include <transmission_fragment>`,`  
        // Improve the refraction to use the world pos
        material.transmission = _transmission;
        material.transmissionAlpha = 1.0;
        material.thickness = thickness;
        material.attenuationDistance = attenuationDistance;
        material.attenuationColor = attenuationColor;
        #ifdef USE_TRANSMISSIONMAP
          material.transmission *= texture2D( transmissionMap, vUv ).r;
        #endif
        #ifdef USE_THICKNESSMAP
          material.thickness *= texture2D( thicknessMap, vUv ).g;
        #endif
        
        if (material.transmission != 0.0) {
          vec3 pos = vWorldPosition;
          float runningSeed = 0.0;
          vec3 v = normalize( cameraPosition - pos );
          vec3 n = inverseTransformDirection( normal, viewMatrix );
          vec3 transmission = vec3(0.0);
          float randomCoords = rand(runningSeed++);
          float thickness_smear = thickness * max(pow(roughnessFactor, 0.33), anisotropicBlur);
          vec3 distortionNormal = vec3(0.0);
          vec3 temporalOffset = vec3(time, -time, -time) * temporalDistortion;

          vec3 modelScale = vec3(
            length( vec3( modelMatrix[ 0 ].xyz ) ),
            length( vec3( modelMatrix[ 1 ].xyz ) ),
            length( vec3( modelMatrix[ 2 ].xyz ) )
          );

          // Beer's-law coefficient
          vec3 attenuationCoefficient = vec3(0.0);
          if ( !isinf( material.attenuationDistance ) ) {
            attenuationCoefficient = -log( material.attenuationColor ) / material.attenuationDistance;
          }

          if (distortion > 0.0) {
            distortionNormal = distortion * vec3(snoiseFractal(vec3((pos * distortionScale + temporalOffset))), snoiseFractal(vec3(pos.zxy * distortionScale - temporalOffset)), snoiseFractal(vec3(pos.yxz * distortionScale + temporalOffset)));
          }
          for (float i = 0.0; i < ${e}.0; i ++) {
            vec3 sampleNorm;
            if (roughnessFactor > 0.0) {
              sampleNorm = normalize(n + roughnessFactor * roughnessFactor * 2.0 * normalize(vec3(rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5)) * pow(rand(runningSeed++), 0.33) + distortionNormal);
            } else {
              // Smooth surfaces skip four hashes, a pow, and a normalization per sample
              sampleNorm = normalize(n + distortionNormal);
            }
            float sampleProgress = (i + randomCoords) / float(${e});
            float sampleThickness = material.thickness + thickness_smear * sampleProgress;
            // Fresnel is identical for RGB; only the refracted IOR changes.
            vec3 F = EnvironmentBRDF( sampleNorm, v, material.specularColor, material.specularF90, material.roughness );
            if (chromaticAberration == 0.0) {
              // With one IOR, a single framebuffer sample supplies all RGB channels
              transmission += getIBLVolumeRefraction(
                sampleNorm, v, material.roughness, material.diffuseColor, pos, modelScale, attenuationCoefficient, F,
                viewMatrix, projectionMatrix, material.ior, sampleThickness, material.attenuationDistance
              ).rgb;
            } else {
              float aberration = chromaticAberration * sampleProgress;
              transmission.r += getIBLVolumeRefraction(
                sampleNorm, v, material.roughness, material.diffuseColor, pos, modelScale, attenuationCoefficient, F,
                viewMatrix, projectionMatrix, material.ior, sampleThickness, material.attenuationDistance
              ).r;
              transmission.g += getIBLVolumeRefraction(
                sampleNorm, v, material.roughness, material.diffuseColor, pos, modelScale, attenuationCoefficient, F,
                viewMatrix, projectionMatrix, material.ior * (1.0 + aberration), sampleThickness, material.attenuationDistance
              ).g;
              transmission.b += getIBLVolumeRefraction(
                sampleNorm, v, material.roughness, material.diffuseColor, pos, modelScale, attenuationCoefficient, F,
                viewMatrix, projectionMatrix, material.ior * (1.0 + 2.0 * aberration), sampleThickness, material.attenuationDistance
              ).b;
            }
          }
          transmission /= ${e}.0;
          totalDiffuse = mix( totalDiffuse, transmission, material.transmission );
        }\n`)},Object.keys(this.uniforms).forEach(e=>Object.defineProperty(this,e,{get:()=>this.uniforms[e].value,set:t=>this.uniforms[e].value=t}))}},bt=I.forwardRef(({buffer:e,transmissionSampler:t=!1,backside:n=!1,side:r=0,transmission:i=1,thickness:a=0,backsideThickness:o=0,backsideEnvMapIntensity:s=1,samples:c=10,resolution:l,backsideResolution:u,background:d,anisotropy:f,anisotropicBlur:p,...m},h)=>{Se({MeshTransmissionMaterial:yt});let g=I.useRef(null),[_]=I.useState(()=>new vt),v=u??l,y=_t(v,v),b=_t(l,l),x,S,C,w;return P(e=>{let i=g.current;if(i.uniforms.time.value=e.clock.elapsedTime,i.uniforms.buffer.value===b.texture&&!t){var c;w=(c=i.__r3f)==null||(c=c.parent)==null?void 0:c.object,w&&i.visible&&i.uniforms._transmission.value!==0&&(C=e.gl.toneMapping,x=e.scene.background,S=i.envMapIntensity,e.gl.toneMapping=0,d&&(e.scene.background=d),w.material=_,n&&(e.gl.setRenderTarget(y),e.gl.render(e.scene,e.camera),w.material=i,i.uniforms.buffer.value=y.texture,i.uniforms.thickness.value=o,i.side=1,r!==1&&(i.needsUpdate=!0),i.envMapIntensity=s),e.gl.setRenderTarget(b),e.gl.render(e.scene,e.camera),w.material=i,i.uniforms.thickness.value=a,i.side=r,n&&r!==1&&(i.needsUpdate=!0),i.uniforms.buffer.value=b.texture,i.envMapIntensity=S,e.scene.background=x,e.gl.setRenderTarget(null),e.gl.toneMapping=C)}}),I.useImperativeHandle(h,()=>g.current,[]),I.createElement(`meshTransmissionMaterial`,Te({args:[c,t],ref:g},m,{buffer:e||b.texture,_transmission:i,anisotropicBlur:p??f,transmission:t?i:0,thickness:a,side:r}))}),xt=te(`inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,{variants:{variant:{default:`bg-primary text-primary-foreground hover:bg-primary/90`,destructive:`bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40`,outline:`border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50`,secondary:`bg-secondary text-secondary-foreground hover:bg-secondary/80`,ghost:`hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50`,link:`text-primary underline-offset-4 hover:underline`},size:{default:`h-9 px-4 py-2 has-[>svg]:px-3`,xs:`h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3`,sm:`h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5`,lg:`h-10 rounded-md px-6 has-[>svg]:px-4`,icon:`size-9`,"icon-xs":`size-6 rounded-md [&_svg:not([class*='size-'])]:size-3`,"icon-sm":`size-8`,"icon-lg":`size-10`}},defaultVariants:{variant:`default`,size:`default`}});function St({className:e,variant:t=`default`,size:n=`default`,asChild:r=!1,...i}){let a=r?A:`button`;return(0,L.jsx)(a,{"data-slot":`button`,"data-variant":t,"data-size":n,className:s(xt({variant:t,size:n,className:e})),...i})}function Ct({...e}){return(0,L.jsx)(Qe,{"data-slot":`accordion`,...e})}function wt({className:e,...t}){return(0,L.jsx)(ct,{"data-slot":`accordion-item`,className:s(`border-b last:border-b-0`,e),...t})}function Tt({className:e,children:t,...n}){return(0,L.jsx)(ut,{className:`flex`,children:(0,L.jsxs)(ft,{"data-slot":`accordion-trigger`,className:s(`flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180`,e),...n,children:[t,(0,L.jsx)(Pe,{className:`pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200`})]})})}function Et({className:e,children:t,...n}){return(0,L.jsx)(mt,{"data-slot":`accordion-content`,className:`overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down`,...n,children:(0,L.jsx)(`div`,{className:s(`pt-0 pb-4`,e),children:t})})}var Dt=new URL(`schibsted-grotesk-latin-800-normal-Dl5-MP1T.woff`,import.meta.url).href,Z={ready:!1,reveal:0},Q=new Map,Ot=10,kt=-1.2,At=30,jt=e=>Math.tan(At/2*Math.PI/180)*(Ot-e);function Mt(){let e=(0,I.useMemo)(()=>new _e({depthTest:!1,depthWrite:!1,uniforms:{uT:{value:0},uShow:{value:0},uAspect:{value:1}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`,fragmentShader:`
      precision highp float; varying vec2 vUv; uniform float uT, uShow, uAspect;
      vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
      float blob(vec2 p, vec2 c, float r){ return smoothstep(r, 0.0, distance(p, c)); }
      void main(){
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        vec3 col = lin(vec3(0.027, 0.024, 0.043));
        col += lin(vec3(1.0, 0.24, 0.5)) * blob(p, vec2(-0.75 + sin(uT * 0.7) * 0.2, 0.35 + cos(uT * 0.5) * 0.2), 0.8) * 0.035;
        col += lin(vec3(0.16, 0.29, 1.0)) * blob(p, vec2(0.75 + cos(uT * 0.6) * 0.2, -0.3 + sin(uT * 0.8) * 0.2), 0.9) * 0.05;
        col += lin(vec3(1.0, 0.48, 0.18)) * blob(p, vec2(0.1 + sin(uT * 0.4) * 0.5, -0.7), 0.6) * 0.022;
        gl_FragColor = vec4(col * uShow, 1.0);
      }`}),[]);return P(t=>{e.uniforms.uT.value=(a?2:t.clock.elapsedTime*.12)+x.p*6,e.uniforms.uShow.value=Z.reveal,e.uniforms.uAspect.value=t.size.width/t.size.height}),(0,L.jsx)(`mesh`,{frustumCulled:!1,renderOrder:-10,material:e,children:(0,L.jsx)(`planeGeometry`,{args:[2,2]})})}function Nt(){let{size:e}=F(),[t,n]=(0,I.useState)([]),r=(0,I.useRef)([]);(0,I.useEffect)(()=>{let e=()=>{let e=Array.from(document.querySelectorAll(`.vq [data-gl]`));n(e.map(e=>{let t=getComputedStyle(e),n=parseFloat(t.fontSize);return{el:e,text:e.textContent??``,size:n,spacing:(parseFloat(t.letterSpacing)||0)/n,color:e.dataset.gl||`#f3f0ea`}}))};e(),document.fonts.ready.then(e);let t=setTimeout(e,600);return()=>clearTimeout(t)},[e.width,e.height]),P(()=>{let n=2*jt(kt)/e.height;t.forEach((t,i)=>{let a=r.current[i];if(!a)return;let o=t.el.getBoundingClientRect();if(a.visible=o.bottom>-80&&o.top<e.height+80,!a.visible)return;let s=Q.get(t.el);a.position.set((o.left-e.width/2)*n,-(o.top+o.height/2-e.height/2+(s?s.y*t.size:0))*n,kt),a.fillOpacity=(s?s.o:1)*Z.reveal})});let i=2*jt(kt)/e.height;return(0,L.jsx)(L.Fragment,{children:t.map((e,t)=>(0,L.jsx)(Ee,{ref:e=>{r.current[t]=e},font:Dt,fontSize:e.size*i,letterSpacing:e.spacing,lineHeight:1,anchorX:`left`,anchorY:`middle`,color:e.color,sdfGlyphSize:128,whiteSpace:`nowrap`,"material-toneMapped":!1,children:e.text},`${t}-${e.text}-${e.size}`))})}var Pt={hero:{x:.58,y:.3,s:.82,ry:-.5,rz:.1,rx:.05},why:{x:-.05,y:0,s:1.05,ry:1.2,rz:-.25,rx:.2},record:{x:.55,y:.05,s:.8,ry:2.6,rz:.12,rx:-.1},drive:{x:-.6,y:-.1,s:.7,ry:4.2,rz:-.3,rx:.25},people:{x:0,y:.1,s:.9,ry:5.6,rz:.18,rx:-.12},join:{x:.5,y:.2,s:.5,ry:Math.PI*2,rz:0,rx:0}},Ft={hero:{x:.25,y:.5,s:.44,ry:-.5,rz:.1,rx:.05},why:{x:1.2,y:-.25,s:.8,ry:1.2,rz:-.25,rx:.2},record:{x:1.15,y:.2,s:.62,ry:2.6,rz:.12,rx:-.1},drive:{x:1.1,y:.4,s:.5,ry:4.2,rz:-.3,rx:.25},people:{x:1.15,y:-.2,s:.66,ry:5.6,rz:.18,rx:-.12},join:{x:.6,y:.2,s:.4,ry:Math.PI*2,rz:0,rx:0}};function It(){let e=document.createElement(`canvas`);e.width=1024,e.height=512;let t=e.getContext(`2d`),n=t.createLinearGradient(0,0,0,512);[[0,`#0a0618`],[.2,`#24167a`],[.4,`#6a35ff`],[.5,`#ff5a96`],[.57,`#ff9a4d`],[.66,`#34186a`],[1,`#07040f`]].forEach(([e,t])=>n.addColorStop(e,t)),t.fillStyle=n,t.fillRect(0,0,1024,512);let r=t.createLinearGradient(0,0,1024,0);[[0,`rgba(50,90,255,0.8)`],[.3,`rgba(50,90,255,0)`],[.62,`rgba(255,70,130,0)`],[.8,`rgba(255,70,130,0.55)`],[1,`rgba(50,90,255,0.8)`]].forEach(([e,t])=>r.addColorStop(e,t)),t.fillStyle=r,t.fillRect(0,60,1024,330),t.fillStyle=`#ffffff`,[[90,70,150,26],[420,40,240,18],[760,96,120,30],[300,330,30,120],[880,300,22,150],[610,180,16,110]].forEach(([e,n,r,i])=>t.fillRect(e,n,r,i));let i=new ae(e);return i.mapping=303,i.colorSpace=se,i}function Lt({sky:e}){let r=(0,I.useRef)(null),s=(0,I.useRef)(null),l=(0,I.useRef)(null),u=F(e=>e.size.width<=760),d=(0,I.useMemo)(()=>{let e=Me.roman.d,t=e.indexOf(`M`,1),n=e=>{let t=new je().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${e}"/></svg>`).paths.flatMap(e=>je.createShapes(e)),n=new oe(t,{depth:250,bevelEnabled:!0,bevelThickness:52,bevelSize:36,bevelSegments:12,curveSegments:32});return n.translate(0,0,-125),n},r=n(e.slice(0,t)),i=n(e.slice(t));i.computeBoundingBox();let a=i.boundingBox,o=a.getCenter(new ge);return i.translate(-o.x,-o.y,0),{hookGeo:r,dotGeo:i,dotC:o,dotD:a.max.x-a.min.x}},[]),f=(0,I.useRef)({x:0,y:0,s:.2,ry:-2.6,rz:0,rx:0,t:0,px:0,py:0,first:!0}),p=(0,I.useRef)({x:0,y:0});(0,I.useEffect)(()=>{if(i||a)return;let e=e=>{p.current.x=e.clientX/window.innerWidth-.5,p.current.y=e.clientY/window.innerHeight-.5};return window.addEventListener(`pointermove`,e,{passive:!0}),()=>window.removeEventListener(`pointermove`,e)},[]),P((e,i)=>{let m=Array.from(document.querySelectorAll(`.vq section[data-key]`)),h=document.querySelector(`.vq .dot-slot`);if(!m.length||!r.current||!s.current||!l.current)return;let g=e.size.width,_=e.size.height,v=u?Ft:Pt,y=window.scrollY+_/2,b=m[0],x=m[0],S=0;for(let e=0;e<m.length;e++){let t=m[e].offsetTop+m[e].offsetHeight/2;if(y>=t){b=m[e],x=m[Math.min(m.length-1,e+1)];let n=x.offsetTop+x.offsetHeight/2;S=n>t?o((y-t)/(n-t)):0}}let C=n(S),w=v[b.dataset.key],ee=v[x.dataset.key],T=f.current,te=x.dataset.key===`join`&&b.dataset.key!==`join`?n(o((S-.35)/.6)):+(b.dataset.key===`join`),E=a||T.first?1e3:4.5;T.first=!1,[`x`,`y`,`s`,`ry`,`rz`,`rx`].forEach(e=>{T[e]=t(T[e],c(w[e],ee[e],C),E,i)}),T.t=t(T.t,te,E,i),T.px=t(T.px,p.current.x,3,i),T.py=t(T.py,p.current.y,3,i);let D=jt(0),O=g/_*D,k=Z.reveal,A=T.s*c(.55,1,k)*2*D/Me.roman.h,j=T.x*O,M=T.y*D,N=T.t;if(N>.001&&h){let e=h.getBoundingClientRect(),t=e.width/_*2*D/d.dotD,n=((e.left+e.width/2)/g*2-1)*O,r=-((e.top+e.height/2)/_*2-1)*D,i=c(A,t,N);j=c(j,n-d.dotC.x*i,N),M=c(M,r+d.dotC.y*i,N),A=i}r.current.position.set(j,M,0),r.current.scale.setScalar(A),r.current.rotation.set((T.rx+T.py*.3)*(1-N),T.ry+(1-k)*-2.2+T.px*.4*(1-N),T.rz*(1-N)),s.current.scale.setScalar(Math.max(1e-4,1-n(o(N*1.5)))),s.current.position.y=-N*900,s.current.rotation.z=N*1.2,s.current.visible=N<.98,l.current.rotation.y=-T.ry*N});let m={transmission:1,thickness:1.6,roughness:.03,ior:1.38,chromaticAberration:.7,anisotropicBlur:.2,distortion:.3,distortionScale:.3,temporalDistortion:a?0:.08,samples:u?3:6,resolution:u?384:768,color:`#ffffff`,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.25,background:e,backside:!u,backsideThickness:.6};return(0,L.jsx)(`group`,{ref:r,children:(0,L.jsxs)(`group`,{scale:[1,-1,1],children:[(0,L.jsx)(`mesh`,{ref:s,geometry:d.hookGeo,children:(0,L.jsx)(bt,{...m})}),(0,L.jsx)(`group`,{position:[d.dotC.x,d.dotC.y,0],children:(0,L.jsx)(`mesh`,{ref:l,geometry:d.dotGeo,children:(0,L.jsx)(bt,{...m})})})]})})}function Rt(){let e=(0,I.useMemo)(It,[]);return(0,L.jsxs)(Ce,{dpr:[1,1.6],camera:{fov:At,near:.1,far:60,position:[0,0,Ot]},gl:{antialias:!0,powerPreference:`high-performance`},children:[(0,L.jsx)(Mt,{}),(0,L.jsx)(Nt,{}),(0,L.jsx)(Lt,{sky:e}),(0,L.jsx)(we,{map:e}),(0,L.jsxs)(Oe,{multisampling:0,children:[(0,L.jsx)(Ae,{mipmapBlur:!0,luminanceThreshold:.9,intensity:.35}),(0,L.jsx)(ke,{mode:De.ACES_FILMIC})]})]})}var $=e=>e.startsWith(`http`)?{rel:`noopener`}:{},zt=[[`An independent`,`LD team.`],[`Coaches who`,`still compete.`]];function Bt(){ee(`question`);let e=(0,I.useRef)(null),[t,n]=(0,I.useState)(!1),r=(0,I.useCallback)(()=>n(!0),[]),[o]=(0,I.useState)(()=>{try{return!!document.createElement(`canvas`).getContext(`webgl2`)}catch{return!1}});(0,I.useEffect)(()=>(Z.reveal=+!!a,()=>{Q.clear()}),[]),(0,I.useEffect)(()=>{t&&!a&&u.to(Z,{reveal:1,duration:2.2,ease:`expo.out`})},[t]),C(e),S(()=>{if(!o)return;let n=u.utils.toArray(`[data-gl]`,e.current);n.forEach(e=>Q.set(e,{o:+!!a,y:a?0:.7})),!a&&t&&n.forEach((e,t)=>{let n=!!e.closest(`.hero`),r=()=>u.to(Q.get(e),{o:1,y:0,duration:1.3,ease:`expo.out`,delay:n?.25+t*.09:0});n?r():b.create({trigger:e,start:`top 92%`,once:!0,onEnter:r})})},{scope:e,dependencies:[t,o]});let s=e=>{let t=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty(`--mx`,`${e.clientX-t.left}px`),e.currentTarget.style.setProperty(`--my`,`${e.clientY-t.top}px`)};return(0,L.jsxs)(`div`,{className:`vq${o?` gl`:``}`,ref:e,children:[(0,L.jsx)(`a`,{className:`skip-x`,href:`#main`,children:`Skip to content`}),(0,L.jsx)(T,{onDone:r,bg:`#07060b`,ink:`#f3f0ea`,font:`800 clamp(5rem, 17vw, 16rem)/0.85 "Schibsted Grotesk Variable", sans-serif`}),o&&(0,L.jsx)(`div`,{className:`stage`,"aria-hidden":`true`,children:(0,L.jsx)(Rt,{})}),(0,L.jsxs)(`header`,{className:`top`,children:[(0,L.jsx)(`a`,{className:`mark`,href:`#top`,"aria-label":`Skeptical, back to the top`,children:`skeptical`}),(0,L.jsx)(`nav`,{"aria-label":`Sections`,children:g.map(e=>(0,L.jsx)(`a`,{href:`#${e.id}`,children:e.label},e.id))})]}),(0,L.jsxs)(`main`,{id:`main`,children:[(0,L.jsxs)(`section`,{className:`hero`,id:`top`,"data-key":`hero`,"aria-label":m.heading,children:[(0,L.jsx)(`h1`,{className:`giant`,children:zt.map((e,t)=>(0,L.jsx)(`span`,{className:`row`,children:e.map(e=>(0,L.jsx)(`span`,{"data-gl":``,children:e},e))},t))}),(0,L.jsxs)(`div`,{className:`hero-foot`,children:[(0,L.jsx)(`p`,{className:`lede`,"data-rise":!0,children:_.statement.join(` `)}),(0,L.jsxs)(`div`,{className:`doors`,"data-rise":!0,children:[(0,L.jsx)(xe,{padding:60,magnetStrength:3,disabled:i||a,children:(0,L.jsx)(St,{asChild:!0,size:`lg`,className:`q-btn`,children:(0,L.jsx)(`a`,{href:_.doors[0].href,...$(_.doors[0].href),children:_.doors[0].label})})}),(0,L.jsx)(xe,{padding:60,magnetStrength:3,disabled:i||a,children:(0,L.jsx)(St,{asChild:!0,size:`lg`,variant:`outline`,className:`q-btn q-btn-o`,children:(0,L.jsx)(`a`,{href:_.doors[1].href,...$(_.doors[1].href),children:_.doors[1].label})})})]})]})]}),(0,L.jsx)(`section`,{className:`why`,id:`why`,"data-key":`why`,"aria-label":`How the team works`,children:d.map(e=>(0,L.jsx)(w,{as:`p`,className:`say`,children:e},e))}),(0,L.jsxs)(`section`,{id:`record`,"data-key":`record`,children:[(0,L.jsx)(`h2`,{className:`giant`,children:(0,L.jsx)(`span`,{"data-gl":``,children:f.title})}),(0,L.jsxs)(`div`,{className:`grid2`,children:[(0,L.jsxs)(`div`,{children:[(0,L.jsx)(`p`,{className:`lede`,"data-rise":!0,children:f.rule}),(0,L.jsxs)(`p`,{className:`dim mt`,"data-rise":!0,children:[f.when,`. `,f.name,`, `,f.where,`.`]}),(0,L.jsx)(`p`,{className:`mt`,"data-rise":!0,children:(0,L.jsx)(`a`,{href:f.more.href,rel:`noopener`,children:f.more.label})})]}),(0,L.jsx)(`div`,{className:`rows`,children:f.results.map(e=>(0,L.jsxs)(`div`,{className:`row-r`,"data-rise":!0,children:[(0,L.jsx)(`h3`,{children:e.what}),(0,L.jsxs)(`p`,{children:[(0,L.jsx)(`b`,{children:e.who}),` `,(0,L.jsx)(`span`,{className:`dim`,children:e.more})]})]},e.who))})]})]}),(0,L.jsx)(`section`,{id:`drive`,"data-key":`drive`,children:(0,L.jsxs)(`div`,{className:`grid2 rev`,children:[(0,L.jsx)(`dl`,{className:`kit`,children:y.items.map(e=>(0,L.jsxs)(`div`,{"data-rise":!0,children:[(0,L.jsx)(`dt`,{children:e.term}),(0,L.jsx)(`dd`,{children:e.text})]},e.term))}),(0,L.jsxs)(`div`,{className:`stick`,children:[(0,L.jsx)(`h2`,{className:`giant`,children:(0,L.jsx)(`span`,{"data-gl":``,children:y.title})}),(0,L.jsx)(`p`,{className:`lede mt`,"data-rise":!0,children:y.lead}),(0,L.jsx)(`p`,{className:`mt`,"data-rise":!0,children:(0,L.jsx)(`a`,{href:y.more.href,rel:`noopener`,children:y.more.label})})]})]})}),(0,L.jsxs)(`section`,{id:`people`,"data-key":`people`,children:[(0,L.jsx)(`h2`,{className:`giant`,children:(0,L.jsx)(`span`,{"data-gl":``,children:v.title})}),(0,L.jsx)(`div`,{className:`cards`,children:v.coaches.map(e=>(0,L.jsxs)(`article`,{className:`card`,"data-rise":!0,onPointerMove:s,children:[(0,L.jsx)(`p`,{className:`role`,children:e.role}),(0,L.jsx)(`h3`,{children:e.name}),(0,L.jsx)(`p`,{children:e.bio})]},e.name))}),(0,L.jsxs)(`p`,{className:`mt`,"data-rise":!0,children:[v.count,` `,(0,L.jsx)(`a`,{href:v.more.href,rel:`noopener`,children:v.more.label})]})]}),(0,L.jsxs)(`section`,{className:`join`,id:`join`,"data-key":`join`,children:[(0,L.jsxs)(`h2`,{className:`giant huge`,children:[(0,L.jsx)(`span`,{"data-gl":``,children:`Join`}),(0,L.jsx)(`span`,{className:`dot-slot`,"aria-hidden":`true`}),(0,L.jsx)(`span`,{className:`sr-only-x`,children:`.`})]}),(0,L.jsxs)(`div`,{className:`grid2`,children:[(0,L.jsxs)(`div`,{children:[(0,L.jsx)(`p`,{className:`lede`,"data-rise":!0,children:p.lead}),(0,L.jsxs)(`p`,{className:`mt`,"data-rise":!0,children:[p.already.before,(0,L.jsx)(`a`,{href:p.already.href,rel:`noopener`,children:p.already.label}),`. `,p.coach.before,(0,L.jsx)(`a`,{href:p.coach.href,rel:`noopener`,children:p.coach.label}),`.`]}),(0,L.jsxs)(`p`,{className:`mt-s`,"data-rise":!0,children:[p.also,` `,(0,L.jsx)(`a`,{href:`mailto:${m.email}`,children:m.email})]})]}),(0,L.jsx)(Ct,{type:`single`,collapsible:!0,defaultValue:`compete`,className:`paths`,"data-rise":!0,children:p.paths.map(e=>(0,L.jsxs)(wt,{value:e.id,className:`path`,children:[(0,L.jsx)(Tt,{className:`path-t`,children:(0,L.jsxs)(`span`,{children:[(0,L.jsx)(`b`,{children:e.name}),(0,L.jsx)(`i`,{children:e.line})]})}),(0,L.jsxs)(Et,{className:`path-c`,children:[(0,L.jsx)(`ul`,{children:e.text.map(e=>(0,L.jsx)(`li`,{children:e},e))}),(0,L.jsx)(St,{asChild:!0,className:`q-btn mt-4`,children:(0,L.jsx)(`a`,{href:e.href,rel:`noopener`,children:`The application`})})]})]},e.id))})]})]})]}),(0,L.jsxs)(`footer`,{children:[(0,L.jsx)(`p`,{className:`big`,children:h.line}),(0,L.jsx)(`ul`,{children:h.links.map(e=>(0,L.jsx)(`li`,{children:(0,L.jsx)(`a`,{href:e.href,...$(e.href),children:e.label})},e.href))}),(0,L.jsx)(`ul`,{children:h.pages.map(e=>(0,L.jsx)(`li`,{children:(0,L.jsx)(`a`,{href:e.href,rel:`noopener`,children:e.label})},e.href))}),(0,L.jsx)(`small`,{children:`Draft 2, version 3. Not the live site.`})]})]})}export{Bt as default};