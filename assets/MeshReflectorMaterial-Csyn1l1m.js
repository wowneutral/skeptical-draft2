import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{t}from"./extends-CvVTau-c.js";import{d as n}from"./jsx-runtime-BAJ4K1lj.js";import{A as r,Ar as i,F as a,Ga as o,Rn as s,Yt as c,ar as l,bt as u,do as d,ea as f,io as p,ir as m,j as h,kr as g,mr as _,no as v,ro as y,ta as b,to as x,vt as S}from"./three.core-BF58tRDi.js";import{a as C,i as w,s as T}from"./react-three-fiber.esm-DZF78O6x.js";var E=e(n()),D=parseInt(`187`.replace(/\D+/g,``)),O=class extends b{constructor(e=new v){super({uniforms:{inputBuffer:new o(null),depthBuffer:new o(null),resolution:new o(new v),texelSize:new o(new v),halfTexelSize:new o(new v),kernel:new o(0),scale:new o(1),cameraNear:new o(0),cameraFar:new o(1),minDepthThreshold:new o(0),maxDepthThreshold:new o(1),depthScale:new o(0),depthToBlurRatioBias:new o(.25)},fragmentShader:`#include <common>
        #include <dithering_pars_fragment>      
        uniform sampler2D inputBuffer;
        uniform sampler2D depthBuffer;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          float depthFactor = 0.0;
          
          #ifdef USE_DEPTH
            vec4 depth = texture2D(depthBuffer, vUv);
            depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
            depthFactor *= depthScale;
            depthFactor = max(0.0, min(1.0, depthFactor + 0.25));
          #endif
          
          vec4 sum = texture2D(inputBuffer, mix(vUv0, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv1, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv2, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv3, vUv, depthFactor));
          gl_FragColor = sum * 0.25 ;

          #include <dithering_fragment>
          #include <tonemapping_fragment>
          #include <${D>=154?`colorspace_fragment`:`encodings_fragment`}>
        }`,vertexShader:`uniform vec2 texelSize;
        uniform vec2 halfTexelSize;
        uniform float kernel;
        uniform float scale;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          vec2 uv = position.xy * 0.5 + 0.5;
          vUv = uv;

          vec2 dUv = (texelSize * vec2(kernel) + halfTexelSize) * scale;
          vUv0 = vec2(uv.x - dUv.x, uv.y + dUv.y);
          vUv1 = vec2(uv.x + dUv.x, uv.y + dUv.y);
          vUv2 = vec2(uv.x + dUv.x, uv.y - dUv.y);
          vUv3 = vec2(uv.x - dUv.x, uv.y - dUv.y);

          gl_Position = vec4(position.xy, 1.0, 1.0);
        }`,blending:0,depthWrite:!1,depthTest:!1}),this.toneMapped=!1,this.setTexelSize(e.x,e.y),this.kernel=new Float32Array([0,1,2,2,3])}setTexelSize(e,t){this.uniforms.texelSize.value.set(e,t),this.uniforms.halfTexelSize.value.set(e,t).multiplyScalar(.5)}setResolution(e){this.uniforms.resolution.value.copy(e)}},k=class{constructor({gl:e,resolution:t,width:n=500,height:i=500,minDepthThreshold:o=0,maxDepthThreshold:u=1,depthScale:p=0,depthToBlurRatioBias:m=.25}){this.renderToScreen=!1,this.renderTargetA=new d(t,t,{minFilter:s,magFilter:s,stencilBuffer:!1,depthBuffer:!1,type:c}),this.renderTargetB=this.renderTargetA.clone(),this.convolutionMaterial=new O,this.convolutionMaterial.setTexelSize(1/n,1/i),this.convolutionMaterial.setResolution(new v(n,i)),this.scene=new f,this.camera=new a,this.convolutionMaterial.uniforms.minDepthThreshold.value=o,this.convolutionMaterial.uniforms.maxDepthThreshold.value=u,this.convolutionMaterial.uniforms.depthScale.value=p,this.convolutionMaterial.uniforms.depthToBlurRatioBias.value=m,this.convolutionMaterial.defines.USE_DEPTH=p>0;let g=new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),_=new Float32Array([0,0,2,0,0,2]),y=new h;y.setAttribute(`position`,new r(g,3)),y.setAttribute(`uv`,new r(_,2)),this.screen=new l(y,this.convolutionMaterial),this.screen.frustumCulled=!1,this.scene.add(this.screen)}render(e,t,n){let r=this.scene,i=this.camera,a=this.renderTargetA,o=this.renderTargetB,s=this.convolutionMaterial,c=s.uniforms;c.depthBuffer.value=t.depthTexture;let l=s.kernel,u=t,d,f,p;for(f=0,p=l.length-1;f<p;++f)d=f&1?o:a,c.kernel.value=l[f],c.inputBuffer.value=u.texture,e.setRenderTarget(d),e.render(r,i),u=d;c.kernel.value=l[f],c.inputBuffer.value=u.texture,e.setRenderTarget(this.renderToScreen?null:n),e.render(r,i)}},A=class extends _{constructor(e={}){super(e),this._tDepth={value:null},this._distortionMap={value:null},this._tDiffuse={value:null},this._tDiffuseBlur={value:null},this._textureMatrix={value:null},this._hasBlur={value:!1},this._mirror={value:0},this._mixBlur={value:0},this._blurStrength={value:.5},this._minDepthThreshold={value:.9},this._maxDepthThreshold={value:1},this._depthScale={value:0},this._depthToBlurRatioBias={value:.25},this._distortion={value:1},this._mixContrast={value:1},this.setValues(e)}onBeforeCompile(e){var t;(t=e.defines)!=null&&t.USE_UV||(e.defines.USE_UV=``),e.uniforms.hasBlur=this._hasBlur,e.uniforms.tDiffuse=this._tDiffuse,e.uniforms.tDepth=this._tDepth,e.uniforms.distortionMap=this._distortionMap,e.uniforms.tDiffuseBlur=this._tDiffuseBlur,e.uniforms.textureMatrix=this._textureMatrix,e.uniforms.mirror=this._mirror,e.uniforms.mixBlur=this._mixBlur,e.uniforms.mixStrength=this._blurStrength,e.uniforms.minDepthThreshold=this._minDepthThreshold,e.uniforms.maxDepthThreshold=this._maxDepthThreshold,e.uniforms.depthScale=this._depthScale,e.uniforms.depthToBlurRatioBias=this._depthToBlurRatioBias,e.uniforms.distortion=this._distortion,e.uniforms.mixContrast=this._mixContrast,e.vertexShader=`
        uniform mat4 textureMatrix;
        varying vec4 my_vUv;
      ${e.vertexShader}`,e.vertexShader=e.vertexShader.replace(`#include <project_vertex>`,`#include <project_vertex>
        my_vUv = textureMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );`),e.fragmentShader=`
        uniform sampler2D tDiffuse;
        uniform sampler2D tDiffuseBlur;
        uniform sampler2D tDepth;
        uniform sampler2D distortionMap;
        uniform float distortion;
        uniform float cameraNear;
			  uniform float cameraFar;
        uniform bool hasBlur;
        uniform float mixBlur;
        uniform float mirror;
        uniform float mixStrength;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float mixContrast;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec4 my_vUv;
        ${e.fragmentShader}`,e.fragmentShader=e.fragmentShader.replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>

      float distortionFactor = 0.0;
      #ifdef USE_DISTORTION
        distortionFactor = texture2D(distortionMap, vUv).r * distortion;
      #endif

      vec4 new_vUv = my_vUv;
      new_vUv.x += distortionFactor;
      new_vUv.y += distortionFactor;

      vec4 base = texture2DProj(tDiffuse, new_vUv);
      vec4 blur = texture2DProj(tDiffuseBlur, new_vUv);

      vec4 merge = base;

      #ifdef USE_NORMALMAP
        vec2 normal_uv = vec2(0.0);
        vec4 normalColor = texture2D(normalMap, vUv * normalScale);
        vec3 my_normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
        vec3 coord = new_vUv.xyz / new_vUv.w;
        normal_uv = coord.xy + coord.z * my_normal.xz * 0.05;
        vec4 base_normal = texture2D(tDiffuse, normal_uv);
        vec4 blur_normal = texture2D(tDiffuseBlur, normal_uv);
        merge = base_normal;
        blur = blur_normal;
      #endif

      float depthFactor = 0.0001;
      float blurFactor = 0.0;

      #ifdef USE_DEPTH
        vec4 depth = texture2DProj(tDepth, new_vUv);
        depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
        depthFactor *= depthScale;
        depthFactor = max(0.0001, min(1.0, depthFactor));

        #ifdef USE_BLUR
          blur = blur * min(1.0, depthFactor + depthToBlurRatioBias);
          merge = merge * min(1.0, depthFactor + 0.5);
        #else
          merge = merge * depthFactor;
        #endif

      #endif

      float reflectorRoughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        vec4 reflectorTexelRoughness = texture2D( roughnessMap, vUv );
        reflectorRoughnessFactor *= reflectorTexelRoughness.g;
      #endif

      #ifdef USE_BLUR
        blurFactor = min(1.0, mixBlur * reflectorRoughnessFactor);
        merge = mix(merge, blur, blurFactor);
      #endif

      vec4 newMerge = vec4(0.0, 0.0, 0.0, 1.0);
      newMerge.r = (merge.r - 0.5) * mixContrast + 0.5;
      newMerge.g = (merge.g - 0.5) * mixContrast + 0.5;
      newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;

      diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);
      `)}get tDiffuse(){return this._tDiffuse.value}set tDiffuse(e){this._tDiffuse.value=e}get tDepth(){return this._tDepth.value}set tDepth(e){this._tDepth.value=e}get distortionMap(){return this._distortionMap.value}set distortionMap(e){this._distortionMap.value=e}get tDiffuseBlur(){return this._tDiffuseBlur.value}set tDiffuseBlur(e){this._tDiffuseBlur.value=e}get textureMatrix(){return this._textureMatrix.value}set textureMatrix(e){this._textureMatrix.value=e}get hasBlur(){return this._hasBlur.value}set hasBlur(e){this._hasBlur.value=e}get mirror(){return this._mirror.value}set mirror(e){this._mirror.value=e}get mixBlur(){return this._mixBlur.value}set mixBlur(e){this._mixBlur.value=e}get mixStrength(){return this._blurStrength.value}set mixStrength(e){this._blurStrength.value=e}get minDepthThreshold(){return this._minDepthThreshold.value}set minDepthThreshold(e){this._minDepthThreshold.value=e}get maxDepthThreshold(){return this._maxDepthThreshold.value}set maxDepthThreshold(e){this._maxDepthThreshold.value=e}get depthScale(){return this._depthScale.value}set depthScale(e){this._depthScale.value=e}get depthToBlurRatioBias(){return this._depthToBlurRatioBias.value}set depthToBlurRatioBias(e){this._depthToBlurRatioBias.value=e}get distortion(){return this._distortion.value}set distortion(e){this._distortion.value=e}get mixContrast(){return this._mixContrast.value}set mixContrast(e){this._mixContrast.value=e}},j=E.forwardRef(({mixBlur:e=0,mixStrength:n=1,resolution:r=256,blur:a=[0,0],minDepthThreshold:o=.9,maxDepthThreshold:l=1,depthScale:f=0,depthToBlurRatioBias:h=.25,mirror:_=0,distortion:v=1,mixContrast:b=1,distortionMap:D,reflectorOffset:O=0,...j},M)=>{w({MeshReflectorMaterialImpl:A});let N=T(({gl:e})=>e),P=T(({camera:e})=>e),F=T(({scene:e})=>e);a=Array.isArray(a)?a:[a,a];let I=a[0]+a[1]>0,L=a[0],R=a[1],z=E.useRef(null);E.useImperativeHandle(M,()=>z.current,[]);let[B]=E.useState(()=>new i),[V]=E.useState(()=>new y),[H]=E.useState(()=>new y),[U]=E.useState(()=>new y),[W]=E.useState(()=>new m),[G]=E.useState(()=>new y(0,0,-1)),[K]=E.useState(()=>new p),[q]=E.useState(()=>new y),[J]=E.useState(()=>new y),[Y]=E.useState(()=>new p),[X]=E.useState(()=>new m),[Z]=E.useState(()=>new g),ee=E.useCallback(()=>{var e;let t=z.current.parent||((e=z.current)==null||(e=e.__r3f.parent)==null?void 0:e.object);if(!t||(H.setFromMatrixPosition(t.matrixWorld),U.setFromMatrixPosition(P.matrixWorld),W.extractRotation(t.matrixWorld),V.set(0,0,1),V.applyMatrix4(W),H.addScaledVector(V,O),q.subVectors(H,U),q.dot(V)>0))return;q.reflect(V).negate(),q.add(H),W.extractRotation(P.matrixWorld),G.set(0,0,-1),G.applyMatrix4(W),G.add(U),J.subVectors(H,G),J.reflect(V).negate(),J.add(H),Z.position.copy(q),Z.up.set(0,1,0),Z.up.applyMatrix4(W),Z.up.reflect(V),Z.lookAt(J),Z.far=P.far,Z.updateMatrixWorld(),Z.projectionMatrix.copy(P.projectionMatrix),X.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),X.multiply(Z.projectionMatrix),X.multiply(Z.matrixWorldInverse),X.multiply(t.matrixWorld),B.setFromNormalAndCoplanarPoint(V,H),B.applyMatrix4(Z.matrixWorldInverse),K.set(B.normal.x,B.normal.y,B.normal.z,B.constant);let n=Z.projectionMatrix;Y.x=(Math.sign(K.x)+n.elements[8])/n.elements[0],Y.y=(Math.sign(K.y)+n.elements[9])/n.elements[5],Y.z=-1,Y.w=(1+n.elements[10])/n.elements[14],K.multiplyScalar(2/K.dot(Y)),n.elements[2]=K.x,n.elements[6]=K.y,n.elements[10]=K.z+1,n.elements[14]=K.w},[P,O]),[Q,te,ne,$]=E.useMemo(()=>{let t={minFilter:s,magFilter:s,type:c},i=new d(r,r,t);i.depthBuffer=!0,i.depthTexture=new u(r,r),i.depthTexture.format=S,i.depthTexture.type=x;let a=new d(r,r,t);return[i,a,new k({gl:N,resolution:r,width:L,height:R,minDepthThreshold:o,maxDepthThreshold:l,depthScale:f,depthToBlurRatioBias:h}),{mirror:_,textureMatrix:X,mixBlur:e,tDiffuse:i.texture,tDepth:i.depthTexture,tDiffuseBlur:a.texture,hasBlur:I,mixStrength:n,minDepthThreshold:o,maxDepthThreshold:l,depthScale:f,depthToBlurRatioBias:h,distortion:v,distortionMap:D,mixContrast:b,"defines-USE_BLUR":I?``:void 0,"defines-USE_DEPTH":f>0?``:void 0,"defines-USE_DISTORTION":D?``:void 0}]},[N,L,R,X,r,_,I,e,n,o,l,f,h,v,D,b]);return C(()=>{var e;let t=z.current.parent||((e=z.current)==null||(e=e.__r3f.parent)==null?void 0:e.object);if(!t)return;t.visible=!1;let n=N.xr.enabled,r=N.shadowMap.autoUpdate;ee(),N.xr.enabled=!1,N.shadowMap.autoUpdate=!1,N.setRenderTarget(Q),N.state.buffers.depth.setMask(!0),N.autoClear||N.clear(),N.render(F,Z),I&&ne.render(N,Q,te),N.xr.enabled=n,N.shadowMap.autoUpdate=r,t.visible=!0,N.setRenderTarget(null)}),E.createElement(`meshReflectorMaterialImpl`,t({attach:`material`,key:`key`+$[`defines-USE_BLUR`]+$[`defines-USE_DEPTH`]+$[`defines-USE_DISTORTION`],ref:z},$,j))});export{D as n,j as t};