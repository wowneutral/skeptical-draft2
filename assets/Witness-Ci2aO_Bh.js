import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{d as t,l as n,o as r,t as i}from"./jsx-runtime-BAJ4K1lj.js";import{a,s as o,t as s}from"./react-three-fiber.esm-DAIyBEPj.js";import{Pt as c,U as l,ar as u,do as d,jr as f,sr as p,ta as m}from"./three.core-BF58tRDi.js";import{t as h}from"./extends-CvVTau-c.js";import{t as g}from"./Environment-D-V1tXs3.js";import{t as _}from"./Lightformer-aseEaypq.js";import{t as v}from"./SVGLoader-DOTwrwdd.js";import{t as y}from"./marks-Ce1ST7vc.js";import{t as b}from"./stand-Dy6HrOrV.js";var x={uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`
      varying vec2 vUv;

      void main() {

        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {

    	vec4 sum = vec4( 0.0 );

    	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

    	gl_FragColor = sum;

    }
  `},S={uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`
    varying vec2 vUv;

    void main() {

      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
  `,fragmentShader:`

  uniform sampler2D tDiffuse;
  uniform float v;

  varying vec2 vUv;

  void main() {

    vec4 sum = vec4( 0.0 );

    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

    gl_FragColor = sum;

  }
  `},C=e(t()),w=C.forwardRef(({scale:e=10,frames:t=1/0,opacity:n=1,width:r=1,height:i=1,blur:s=1,near:c=0,far:g=10,resolution:_=512,smooth:v=!0,color:y=`#000000`,depthWrite:b=!1,renderOrder:w,...T},E)=>{let D=C.useRef(null),O=o(e=>e.scene),k=o(e=>e.gl),A=C.useRef(null);r*=Array.isArray(e)?e[0]:e||1,i*=Array.isArray(e)?e[1]:e||1;let[j,M,N,P,F,I,L]=C.useMemo(()=>{let e=new d(_,_),t=new d(_,_);t.texture.generateMipmaps=e.texture.generateMipmaps=!1;let n=new f(r,i).rotateX(Math.PI/2),a=new u(n),o=new p;o.depthTest=o.depthWrite=!1,o.onBeforeCompile=e=>{e.uniforms={...e.uniforms,ucolor:{value:new l(y)}},e.fragmentShader=e.fragmentShader.replace(`void main() {`,`uniform vec3 ucolor;
           void main() {
          `),e.fragmentShader=e.fragmentShader.replace(`vec4( vec3( 1.0 - fragCoordZ ), opacity );`,`vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );`)};let s=new m(x),c=new m(S);return c.depthTest=s.depthTest=!1,[e,n,o,a,s,c,t]},[_,r,i,e,y]),R=e=>{P.visible=!0,P.material=F,F.uniforms.tDiffuse.value=j.texture,F.uniforms.h.value=e*1/256,k.setRenderTarget(L),k.render(P,A.current),P.material=I,I.uniforms.tDiffuse.value=L.texture,I.uniforms.v.value=e*1/256,k.setRenderTarget(j),k.render(P,A.current),P.visible=!1},z=0,B,V;return a(()=>{A.current&&(t===1/0||z<t)&&(z++,B=O.background,V=O.overrideMaterial,D.current.visible=!1,O.background=null,O.overrideMaterial=N,k.setRenderTarget(j),k.render(O,A.current),R(s),v&&R(s*.4),k.setRenderTarget(null),D.current.visible=!0,O.overrideMaterial=V,O.background=B)}),C.useImperativeHandle(E,()=>D.current,[]),C.createElement(`group`,h({"rotation-x":Math.PI/2},T,{ref:D}),C.createElement(`mesh`,{renderOrder:w,geometry:M,scale:[1,-1,1],rotation:[-Math.PI/2,0,0]},C.createElement(`meshBasicMaterial`,{transparent:!0,map:j.texture,opacity:n,depthWrite:b})),C.createElement(`orthographicCamera`,{ref:A,args:[-r/2,r/2,i/2,-i/2,c,g]}))}),T=i();function E(){let e=(0,C.useMemo)(()=>{let e=new v().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${y.roman.d}"/></svg>`).paths.flatMap(e=>v.createShapes(e)),t=new c(e,{depth:260,bevelEnabled:!0,bevelThickness:40,bevelSize:26,bevelSegments:6,curveSegments:22});t.rotateX(Math.PI),t.center();let n=2.7/y.roman.h;return t.scale(n,n,n),t.computeVertexNormals(),t},[]),t=(0,C.useRef)(null),r=(0,C.useRef)(0);return a((e,i)=>{let a=t.current;if(a){if(i=Math.min(i,.05),r.current+=i,!b.drag){b.kick>0&&(b.v+=b.kick,b.kick=0);let e=Math.round(b.angle/(Math.PI*2))*Math.PI*2+(n?-.5:Math.sin(r.current*.5)*.5-.3),t=Math.abs(b.v)>2.5;b.v*=Math.exp(-(t?.8:2.4)*i),t||(b.v+=(e-b.angle)*8*i),b.angle+=b.v*i}a.rotation.y=b.angle,a.rotation.z=n?-.06:-.06+Math.sin(r.current*.8)*.03*(1+b.p*3),a.position.y=.15+(n?0:Math.sin(r.current*1.2)*.05)}}),(0,T.jsx)(`mesh`,{ref:t,geometry:e,castShadow:!0,children:(0,T.jsx)(`meshPhysicalMaterial`,{color:`#ff4b1f`,roughness:.26,metalness:.05,clearcoat:1,clearcoatRoughness:.12,sheen:.3,sheenColor:`#ffd2b8`})})}function D(){let e=(0,C.useMemo)(r,[]),t=(0,C.useRef)(null),i=(0,C.useRef)(null),[a,o]=(0,C.useState)(!1);return(0,C.useEffect)(()=>{let e=new IntersectionObserver(([e])=>o(e.isIntersecting),{rootMargin:`120px`});return i.current&&e.observe(i.current),()=>e.disconnect()},[]),(0,T.jsx)(`div`,{className:`w-box`,ref:i,children:(0,T.jsxs)(s,{frameloop:a&&!n?`always`:`demand`,className:`w-canvas`,dpr:[1,e?1.4:1.6],gl:{antialias:!0,alpha:!0,powerPreference:`low-power`},camera:{fov:22,position:[0,.2,9],near:.1,far:50},onPointerDown:e=>{b.drag=!0,t.current=e.clientX},onPointerMove:e=>{if(!b.drag||t.current===null)return;let n=e.clientX-t.current;t.current=e.clientX,b.angle+=n*.012,b.v=n*.6},onPointerUp:()=>{b.drag=!1,t.current=null},onPointerLeave:()=>{b.drag=!1,t.current=null},children:[(0,T.jsx)(`ambientLight`,{intensity:.15}),(0,T.jsx)(`directionalLight`,{position:[-3,4,5],intensity:2.2,color:`#fff4e6`}),(0,T.jsx)(`directionalLight`,{position:[4,1,-4],intensity:3,color:`#f4f1ea`}),(0,T.jsxs)(g,{resolution:128,frames:1,children:[(0,T.jsx)(_,{form:`rect`,intensity:4,color:`#fff1e0`,position:[-3,3,4],scale:[4,2,1]}),(0,T.jsx)(_,{form:`rect`,intensity:2.5,color:`#f4f1ea`,position:[4,0,-2],"rotation-y":-Math.PI/2,scale:[1,6,1]}),(0,T.jsx)(_,{form:`rect`,intensity:1.2,color:`#ff8a5c`,position:[0,-4,2],"rotation-x":Math.PI/2,scale:[6,3,1]})]}),(0,T.jsx)(E,{}),!e&&(0,T.jsx)(w,{position:[0,-1.45,0],opacity:.7,scale:5,blur:2.6,far:2.5,color:`#000000`,frames:n?1:40})]})})}export{D as default};