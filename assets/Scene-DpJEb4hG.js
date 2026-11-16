import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{a as t,c as n,d as r,l as i,n as a,o,t as s}from"./jsx-runtime-BAJ4K1lj.js";import{a as c,s as l,t as u}from"./react-three-fiber.esm-BeYEtBgh.js";import{t as d}from"./Text-CdmdnpuS.js";import{E as f,Lt as p,O as m,U as h,an as g,ar as _,fa as v,io as y,ir as b,j as x,jn as S,mo as ee,no as te,on as C,or as w,pn as T,qa as E,qt as ne,ro as D,ta as re,tr as ie}from"./three.core-BF58tRDi.js";import{i as O,r as k}from"./three.module-ChJkI3a6.js";import{n as ae}from"./scroll-CIxM5NtI.js";import{a as oe,i as A,n as se,o as j,r as M,t as N}from"./ui-BsQSux9s.js";var P=e(r(),1),ce=new f,F=new D,I=class extends g{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type=`LineSegmentsGeometry`,this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute(`position`,new p([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute(`uv`,new p([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new C(t,6,1);return this.setAttribute(`instanceStart`,new T(n,3,0)),this.setAttribute(`instanceEnd`,new T(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new C(t,6,1);return this.setAttribute(`instanceColorStart`,new T(n,3,0)),this.setAttribute(`instanceColorEnd`,new T(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new ee(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new f);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),ce.setFromBufferAttribute(t),this.boundingBox.union(ce))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new v),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)F.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(F)),F.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(F));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error(`THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.`,this)}}toJSON(){}};O.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new te},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}},k.line={uniforms:E.merge([O.common,O.fog,O.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		float trimSegmentAlpha( const in vec4 start, const in vec4 end ) {

			// compute the interpolation factor needed to trim the segment so it terminates
			// between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column

			// we need different nearEstimate formula for reversed and default depth buffer
			// a is positive with a reversed depth buffer so it can be used for controlling the code flow
			float nearEstimate = ( a > 0.0 ) ? ( - b / ( a + 1.0 ) ) : ( - 0.5 * b / a );

			return ( nearEstimate - start.z ) / ( end.z - start.z );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef USE_DASH

				float lineDistanceStart = dashScale * instanceDistanceStart;
				float lineDistanceEnd = dashScale * instanceDistanceEnd;

			#endif

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( start, end );
					end.xyz = mix( start.xyz, end.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceEnd = mix( lineDistanceStart, lineDistanceEnd, alpha );

					#endif

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( end, start );
					start.xyz = mix( end.xyz, start.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceStart = mix( lineDistanceEnd, lineDistanceStart, alpha );

					#endif

				}

			}

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? lineDistanceStart : lineDistanceEnd;
				vUv = uv;

			#endif

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = perspective ? normalize( mix( start.xyz, end.xyz, 0.5 ) ) : vec3( 0.0, 0.0, - 1.0 );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;

				// only shift the depth of vertices in front of the camera (#35137)
				if ( clip.w > 0.0 ) clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				float len;

				if ( isOrthographic ) {

					// View rays are parallel to the z axis so the distance reduces to camera-space XY
					vec2 lineDir = worldEnd.xy - worldStart.xy;
					float t = clamp( dot( worldPos.xy - worldStart.xy, lineDir ) / dot( lineDir, lineDir ), 0.0, 1.0 );
					len = length( worldStart.xy + lineDir * t - worldPos.xy );

				} else {

					// Find the closest points on the view ray and the line segment
					vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
					vec3 lineDir = worldEnd - worldStart;
					vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

					vec3 p1 = worldStart + lineDir * params.x;
					vec3 p2 = rayEnd * params.y;
					vec3 delta = p1 - p2;
					len = length( delta );

				}

				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};var le=class extends re{constructor(e){super({type:`LineMaterial`,uniforms:E.clone(k.line.uniforms),vertexShader:k.line.vertexShader,fragmentShader:k.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return`WORLD_UNITS`in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS=``:delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return`USE_DASH`in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH=``:delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return`USE_ALPHA_TO_COVERAGE`in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE=``:delete this.defines.USE_ALPHA_TO_COVERAGE)}},L=new y,ue=new D,de=new D,R=new y,z=new y,B=new y,V=new D,H=new b,U=new S,fe=new D,W=new f,G=new v,K=new y,q,J;function pe(e,t,n){return K.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),K.multiplyScalar(1/K.w),K.x=J/n.width,K.y=J/n.height,K.applyMatrix4(e.projectionMatrixInverse),K.multiplyScalar(1/K.w),Math.abs(Math.max(K.x,K.y))}function me(e,t){let n=e.matrixWorld,r=e.geometry,i=r.attributes.instanceStart,a=r.attributes.instanceEnd,o=Math.min(r.instanceCount,i.count);for(let r=0,s=o;r<s;r++){U.start.fromBufferAttribute(i,r),U.end.fromBufferAttribute(a,r),U.applyMatrix4(n);let o=new D,s=new D;q.distanceSqToSegment(U.start,U.end,s,o),s.distanceTo(o)<J*.5&&t.push({point:s,pointOnLine:o,distance:q.origin.distanceTo(s),object:e,face:null,faceIndex:r,uv:null,uv1:null})}}function he(e,t,n){let r=t.projectionMatrix,i=e.material.resolution,a=e.matrixWorld,o=e.geometry,s=o.attributes.instanceStart,c=o.attributes.instanceEnd,l=Math.min(o.instanceCount,s.count),u=-t.near;q.at(1,B),B.w=1,B.applyMatrix4(t.matrixWorldInverse),B.applyMatrix4(r),B.multiplyScalar(1/B.w),B.x*=i.x/2,B.y*=i.y/2,B.z=0,V.copy(B),H.multiplyMatrices(t.matrixWorldInverse,a);for(let t=0,o=l;t<o;t++){if(R.fromBufferAttribute(s,t),z.fromBufferAttribute(c,t),R.w=1,z.w=1,R.applyMatrix4(H),z.applyMatrix4(H),R.z>u&&z.z>u)continue;if(R.z>u){let e=R.z-z.z,t=(R.z-u)/e;R.lerp(z,t)}else if(z.z>u){let e=z.z-R.z,t=(z.z-u)/e;z.lerp(R,t)}R.applyMatrix4(r),z.applyMatrix4(r),R.multiplyScalar(1/R.w),z.multiplyScalar(1/z.w),R.x*=i.x/2,R.y*=i.y/2,z.x*=i.x/2,z.y*=i.y/2,U.start.copy(R),U.start.z=0,U.end.copy(z),U.end.z=0;let o=U.closestPointToPointParameter(V,!0);U.at(o,fe);let l=ie.lerp(R.z,z.z,o),d=l>=-1&&l<=1,f=V.distanceTo(fe)<J*.5;if(d&&f){U.start.fromBufferAttribute(s,t),U.end.fromBufferAttribute(c,t),U.start.applyMatrix4(a),U.end.applyMatrix4(a);let r=new D,i=new D;q.distanceSqToSegment(U.start,U.end,i,r),n.push({point:i,pointOnLine:r,distance:q.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,uv1:null})}}}var Y=class extends _{constructor(e=new I,t=new le({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type=`LineSegments2`}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)ue.fromBufferAttribute(t,e),de.fromBufferAttribute(n,e),r[i]=i===0?0:r[i-1],r[i+1]=r[i]+ue.distanceTo(de);let i=new C(r,2,1);return e.setAttribute(`instanceDistanceStart`,new T(i,1,0)),e.setAttribute(`instanceDistanceEnd`,new T(i,1,1)),this}raycast(e,t){let n=this.material.worldUnits,r=e.camera;if(r===null&&!n&&console.error(`LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.`),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let i=e.params.Line2===void 0?0:e.params.Line2.threshold||0;q=e.ray;let a=this.matrixWorld,o=this.geometry,s=this.material;J=s.linewidth+i,o.boundingSphere===null&&o.computeBoundingSphere(),G.copy(o.boundingSphere).applyMatrix4(a);let c;if(c=n?J*.5:pe(r,Math.max(r.near,G.distanceToPoint(q.origin)),s.resolution),G.radius+=c,q.intersectsSphere(G)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),W.copy(o.boundingBox).applyMatrix4(a);let l;l=n?J*.5:pe(r,Math.max(r.near,W.distanceToPoint(q.origin)),s.resolution),W.expandByScalar(l),q.intersectsBox(W)!==!1&&(n?me(this,t):he(this,r,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(L),this.material.uniforms.resolution.value.set(L.z,L.w))}},ge=new URL(`space-mono-latin-400-normal-_3DlpgIW.woff`,import.meta.url).href,X=s(),_e=new h(`#eaf2ff`),Z=new h(`#62e0ff`),ve=`#0c2142`,Q=Math.PI/180;function $(e){let t=new le({color:(e.color??_e).getHex(),linewidth:e.w,dashed:!!e.dashed,dashSize:e.dash??.07,gapSize:e.gap??.055,transparent:(e.opacity??1)<1,opacity:e.opacity??1});return e.hidden&&(t.depthFunc=6,t.depthWrite=!1),t}var ye=new w({color:ve,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:2}),be=new m(1,1,1);function xe(){let e=e=>{let t=0;for(let n=0;n<e.length;n+=6)t+=Math.hypot(e[n+3]-e[n],e[n+4]-e[n+1],e[n+5]-e[n+2]);return t},t=[0,0,0];for(let n of A)for(let r of n.parts)t[n.pen]+=e(r.segs);let n=[0,0,0];return A.map(r=>{let i=new ne;i.position.set(...r.pos),i.rotation.y=r.rot;let a={thin:$({w:1.25}),thick:$({w:2.6}),hid:$({w:1,dashed:!0,hidden:!0,opacity:.42}),dim:$({w:r.pen===2?2.6:1.1,color:Z}),chain:$({w:1.1,dashed:!0,dash:.32,gap:.09,opacity:.85})};return{obj:r,group:i,parts:r.parts.map(o=>{let s=new ne,c=new I;c.setPositions(o.segs);let l=o.segs.length/6,u=e(o.segs),d=n[r.pen]/t[r.pen];n[r.pen]+=u;let f=n[r.pen]/t[r.pen],p=new Y(c,o.w===`thick`?a.thick:o.w===`dim`?a.dim:o.w===`chain`?a.chain:a.thin);if(p.computeLineDistances(),p.renderOrder=1,p.frustumCulled=!1,p.raycast=()=>{},s.add(p),o.w===`thin`||o.w===`thick`){let e=new Y(c,a.hid);e.renderOrder=2,e.frustumCulled=!1,e.raycast=()=>{},s.add(e)}let m=o.fills.map(e=>{let t=new _(be,ye);return t.scale.set(...e.s),t.position.set(...e.p),t.userData.obj=r.id,s.add(t),t});return i.add(s),{g:s,geo:c,n:l,s:d,e:f,fills:m,ex:o.ex,segs:o.segs}}),mats:a,ev:0,ex:0}})}function Se({built:e}){let{size:t}=l(),r=(0,P.useRef)([]),o=(0,P.useRef)(null),s=(0,P.useRef)(null),u=(0,P.useMemo)(()=>new D,[]);(0,P.useEffect)(()=>{for(let n of e)for(let e of Object.values(n.mats))e.resolution.set(t.width,t.height)},[t,e]),c((t,c)=>{let l=t.clock.elapsedTime;j.t0<0&&j.ready&&(j.t0=l),j.reveal=i?1:j.t0<0?0:a((l-j.t0-.2)/4.6);let d=se[Math.round(j.f)],f=1-a(Math.abs(j.f-Math.round(j.f))*3),p=i?1:j.ways;for(let t of e){let e=t.obj.pen===2?p:n(j.reveal),o=j.explode[t.obj.id]??0;if(i)t.ex=o;else{let e=140*(o-t.ex)-13*t.ev;t.ev+=e*Math.min(c,.05),t.ex+=t.ev*Math.min(c,.05)}let s=j.rattle[t.obj.id];if(t.group.position.set(...t.obj.pos),s!==void 0&&!i){let e=l-s;e<.7&&(t.group.position.z+=Math.sin(e*70)*.03*(1-e/.7))}let m=null;for(let n of t.parts){let r=a((e-n.s)/Math.max(1e-6,n.e-n.s)),i=Math.round(r*n.n);n.geo.instanceCount=i;for(let e of n.fills)e.visible=r>=1;if(n.g.position.set(n.ex[0]*t.ex,n.ex[1]*t.ex,n.ex[2]*t.ex),n.g.rotation.z=n.ex[0]*t.ex*.25,n.g.rotation.x=-n.ex[2]*t.ex*.2,r>0&&r<1&&i>0){let e=(i-1)*6+3;m=u.set(n.segs[e],n.segs[e+1],n.segs[e+2]),n.g.localToWorld(m)}}let h=r.current[t.obj.pen];h&&m&&(h.position.copy(m),h.visible=!0);let g=d===t.obj.id?f:0,_=t.mats.thin.color;_.copy(_e).lerp(Z,g*.85),t.mats.thick.color.copy(_)}for(let e=0;e<3;e++){let t=r.current[e];if(!t)continue;let n=e===2?p:j.reveal;(n<=0||n>=1)&&(t.visible=!1)}o.current&&(o.current.visible=j.reveal>.92),s.current&&(s.current.visible=p>.6)});let f=(e,t,n=.24,r=0,i=`#eaf2ff`)=>(0,X.jsx)(d,{font:ge,fontSize:n,color:i,anchorX:`center`,anchorY:`middle`,position:t,rotation:[-Math.PI/2,0,r],letterSpacing:.12,children:e});return(0,X.jsxs)(X.Fragment,{children:[e.map(e=>(0,X.jsx)(`primitive`,{object:e.group},e.obj.id)),[0,1,2].map(e=>(0,X.jsxs)(`mesh`,{ref:t=>{r.current[e]=t},visible:!1,renderOrder:5,children:[(0,X.jsx)(`sphereGeometry`,{args:[.055,12,8]}),(0,X.jsx)(`meshBasicMaterial`,{color:`#62e0ff`,depthTest:!1})]},e)),(0,X.jsxs)(P.Suspense,{fallback:null,children:[(0,X.jsxs)(`group`,{ref:o,visible:!1,children:[f(`AFF`,[-2,.01,-.12],.26),f(`NEG`,[2,.01,-.12],.26),f(`JUDGE`,[0,.01,-1.4],.26),f(`LECTERN`,[0,.01,.95],.15),f(`DOOR`,[3.4,.01,4],.18),f(`DRIVE. LOCKED.`,[-3.9,.01,-1.7],.15,Math.PI/2),f(`GALLERY`,[-.6,.01,3.12],.16),f(`A`,[-6.2,.01,1.25],.26,0,`#62e0ff`),f(`A`,[6.6,.01,1.25],.26,0,`#62e0ff`),f(`SECTION A`,[0,.01,4.85],.15,0,`#62e0ff`)]}),(0,X.jsxs)(`group`,{ref:s,visible:!1,children:[f(`COMPETE`,[-4.25,.01,.75],.2,Math.PI/2,`#62e0ff`),f(`LECTURE`,[-2.95,.01,-2.75],.2,0,`#62e0ff`),f(`COACH`,[4.25,.01,-1.1],.2,-Math.PI/2,`#62e0ff`)]})]})]})}function Ce(){let e=(0,P.useMemo)(()=>{let e=[];for(let t=-4.5;t<=4.51;t+=.5)e.push(t,0,-3.4,t,0,3.4);for(let t=-3;t<=3.01;t+=.5)e.push(-4.9,0,t,4.9,0,t);let t=new x;return t.setAttribute(`position`,new p(e,3)),t},[]);return(0,X.jsxs)(X.Fragment,{children:[(0,X.jsx)(`lineSegments`,{geometry:e,renderOrder:0,children:(0,X.jsx)(`lineBasicMaterial`,{color:`#eaf2ff`,transparent:!0,opacity:.07,depthWrite:!1})}),(0,X.jsx)(`mesh`,{"rotation-x":-Math.PI/2,position:[0,-.003,0],material:ye,onPointerMove:e=>{j.measure.on&&j.measure.a&&!j.measure.b&&(j.measure.hover=we(e.point),j.measure.dirty=!0)},onClick:e=>Te(e),children:(0,X.jsx)(`planeGeometry`,{args:[10,7]})})]})}var we=e=>[Math.round(e.x*20)/20,Math.max(0,Math.round(e.y*20)/20),Math.round(e.z*20)/20];function Te(e){if(e.delta>6)return;e.stopPropagation();let t=j.measure;if(t.on){let n=we(e.point);!t.a||t.b?(t.a=n,t.b=null,t.hover=n):t.b=n,t.dirty=!0;return}let n=e.object.userData.obj||``,r=A.find(e=>e.id===n);r?.click&&(r.click===`rattle`?j.rattle[n]=j.clock:j.explode[n]=+!j.explode[n],window.dispatchEvent(new CustomEvent(`room:click`,{detail:n})))}function Ee(){let e=(0,P.useMemo)(()=>{let e=new I;e.setPositions([0,0,0,0,0,0]);let t=$({w:2,color:Z});t.depthTest=!1;let n=new Y(e,t);return n.renderOrder=6,n.frustumCulled=!1,n.raycast=()=>{},n},[]),{size:t,camera:n}=l(),r=(0,P.useMemo)(()=>new D,[]);return(0,P.useEffect)(()=>{e.material.resolution.set(t.width,t.height)},[t,e]),c(()=>{let i=j.measure,a=i.a,o=i.b??i.hover;if(i.dirty){if(i.dirty=!1,a&&o){let t=.12;e.geometry.setPositions([...a,...o,a[0],a[1],a[2],a[0],a[1]+t*3,a[2],o[0],o[1],o[2],o[0],o[1]+t*3,o[2]]),e.visible=!0}else e.visible=!1}let s=N.mlabel;if(s){if(i.on&&a&&o){let e=Math.hypot(o[0]-a[0],o[1]-a[1],o[2]-a[2]);r.set((a[0]+o[0])/2,(a[1]+o[1])/2+.3,(a[2]+o[2])/2).project(n),s.style.transform=`translate(${(r.x+1)/2*t.width}px, ${(1-r.y)/2*t.height}px) translate(-50%, -120%)`,s.textContent=`${e.toFixed(2)} sk`,s.style.opacity=`1`}else s.style.opacity=`0`}e.visible=e.visible&&i.on}),(0,X.jsx)(`primitive`,{object:e})}function De(e){let t=a(Math.floor(e),0,M.length-1),r=Math.min(M.length-1,t+1),i=M[t],o=M[r],s=e-t;o.cut&&(s=s<.5?0:1),s=n(s);let c=o.yaw-i.yaw;for(;c>Math.PI;)c-=Math.PI*2;for(;c<-Math.PI;)c+=Math.PI*2;let l=(e,t)=>e+(t-e)*s;return{t:[l(i.t[0],o.t[0]),l(i.t[1],o.t[1]),l(i.t[2],o.t[2])],yaw:i.yaw+c*s,pitch:l(i.pitch,o.pitch),dist:l(i.dist,o.dist),fov:l(i.fov,o.fov),sx:l(i.sx,o.sx),sy:l(i.sy,o.sy),psy:l(i.psy,o.psy),pd:l(i.pd,o.pd)}}function Oe({built:e}){let{camera:r,size:o}=l(),s=r,u=(0,P.useRef)(null),d=(0,P.useRef)(-1),f=(0,P.useRef)(0),p=(0,P.useMemo)(()=>new D,[]),m=(0,P.useMemo)(()=>new D,[]);return c((r,c)=>{j.clock=r.clock.elapsedTime;let l=j.centers,h=0;if(l.length>1){let e=ae.y;if(e>=l[l.length-1])h=l.length-1;else for(let t=0;t<l.length-1;t++)if(e<l[t+1]){let n=a((e-l[t])/Math.max(1,l[t+1]-l[t]));h=t+a((n-.2)/.6);break}}let g=Math.floor(f.current+.5)!==Math.floor(h+.5)&&M[Math.round(Math.max(h,f.current))]?.cut;f.current=h,j.f=h,j.ways=n(a((h-8.35)/.6));let _=Math.round(h);_!==d.current&&(d.current=_,j.yawOff=0,j.pitchOff=0,N.sheetNo&&(N.sheetNo.textContent=`A-`+String(_).padStart(2,`0`)),N.sheetName&&(N.sheetName.textContent=oe[_]),N.root&&(N.root.dataset.stop=String(_)),j.onStop?.(_)),g&&N.flash&&!i&&(N.flash.classList.remove(`go`),N.flash.offsetWidth,N.flash.classList.add(`go`));let v=De(h);if(j.mode!==`persp`){let e=Math.max(3.2,2*v.dist*Math.tan(v.fov*Q/2))*1.25;v.fov=11,v.dist=e/2/Math.tan(v.fov*Q/2),j.mode===`plan`?(v.yaw=0,v.pitch=89.4*Q):(v.yaw=Math.round(v.yaw/(Math.PI/2))*(Math.PI/2),v.pitch=.4*Q,v.t=[v.t[0],Math.max(.9,v.t[1]),v.t[2]])}v.yaw+=j.yawOff,v.pitch=a(v.pitch+j.pitchOff,.2*Q,89.4*Q);let y=o.width<o.height;if(y&&(v.dist*=v.pd),!u.current||i||g)u.current={...v,t:[...v.t]};else{let e=j.dragging?9:3.6,n=Math.min(c,.05),r=u.current,i=v.yaw-r.yaw;for(;i>Math.PI;)i-=Math.PI*2;for(;i<-Math.PI;)i+=Math.PI*2;r.yaw+=i*(1-Math.exp(-e*n)),r.pitch=t(r.pitch,v.pitch,e,n),r.dist=t(r.dist,v.dist,e,n),r.fov=t(r.fov,v.fov,e,n);for(let i=0;i<3;i++)r.t[i]=t(r.t[i],v.t[i],e,n);r.sx=t(r.sx,v.sx,e,n),r.sy=t(r.sy,v.sy,e,n),r.psy=t(r.psy,v.psy,e,n)}let b=u.current;s.fov=b.fov,s.near=.05,s.far=400,s.position.set(b.t[0]+Math.sin(b.yaw)*Math.cos(b.pitch)*b.dist,b.t[1]+Math.sin(b.pitch)*b.dist,b.t[2]+Math.cos(b.yaw)*Math.cos(b.pitch)*b.dist),s.up.set(0,1,0),b.pitch>89*Q&&s.up.set(-Math.sin(b.yaw),0,-Math.cos(b.yaw)),s.lookAt(b.t[0],b.t[1],b.t[2]);let x=o.width,S=o.height,ee=y?0:b.sx,te=y?b.psy:b.sy;if(s.setViewOffset(x,S,-ee*x,-te*S,x,S),s.updateProjectionMatrix(),N.north&&N.north.setAttribute(`transform`,`rotate(${(b.yaw/Q).toFixed(1)})`),N.bar&&N.barLabel){let e=S/(2*b.dist*Math.tan(b.fov*Q/2)),t=[.25,.5,1,2,5,10].find(t=>t*e>=46)??10;N.bar.style.width=`${Math.min(220,t*e*2).toFixed(1)}px`,N.barLabel.textContent=`${t*2} sk`}let C=se[_],w=e.find(e=>e.obj.id===C),T=i?+(Math.abs(h-_)<.45):1-a((Math.abs(h-_)-.12)*4),E=w&&N.root?Array.from(N.root.querySelectorAll(`[data-sec="${_}"] [data-lead]`)):[];for(let e=0;e<3;e++){let t=N.paths[e],n=N.dots[e];if(!t||!n)continue;let r=E[e],i=w?.obj.anchors[e];if(!w||!r||!i||T<=.01||(m.set(...i),w.group.localToWorld(m),p.copy(m).project(s),p.z>1)){t.style.opacity=`0`,n.style.opacity=`0`;continue}let o=(p.x+1)/2*x,c=(1-p.y)/2*S,l=r.getBoundingClientRect(),u;if(y){let e=a(o,l.left+16,l.right-16),t=l.top;u=`M${e},${t} L${e},${t-18} L${o},${c}`}else{let e=o>l.right,t=e?l.right:l.left,n=a(c,l.top+14,l.bottom-14);u=`M${t},${n} L${t+(e?28:-28)},${n} L${o},${c}`}t.setAttribute(`d`,u),t.style.opacity=String(T),n.setAttribute(`transform`,`translate(${o.toFixed(1)},${c.toFixed(1)})`),n.style.opacity=String(T)}}),null}function ke(){let{gl:e}=l();return(0,P.useEffect)(()=>{let t=e.domElement,n=0,r=0,i=!1,o=e=>{i=!0,n=e.clientX,r=e.clientY,j.dragging=!0},s=e=>{if(!i)return;let t=e.clientX-n,o=e.clientY-r;n=e.clientX,r=e.clientY,j.yawOff=a(j.yawOff-t*.005,-.75,.75),e.pointerType!==`touch`&&(j.pitchOff=a(j.pitchOff+o*.004,-.4,.4))},c=()=>{i=!1,j.dragging=!1};return t.addEventListener(`pointerdown`,o),window.addEventListener(`pointermove`,s),window.addEventListener(`pointerup`,c),window.addEventListener(`pointercancel`,c),()=>{t.removeEventListener(`pointerdown`,o),window.removeEventListener(`pointermove`,s),window.removeEventListener(`pointerup`,c),window.removeEventListener(`pointercancel`,c)}},[e]),null}function Ae({built:e}){let t=(0,P.useMemo)(()=>e.flatMap(e=>e.parts.flatMap(e=>e.fills)),[e]);return(0,P.useEffect)(()=>{for(let e of t)e.userData.pick=!0},[t]),null}function je(){let e=(0,P.useMemo)(xe,[]),t=o();return(0,X.jsxs)(u,{dpr:[1,t?1.75:2],gl:{antialias:!0,alpha:!0,powerPreference:`high-performance`},camera:{fov:14,position:[20,20,20],near:.05,far:400},onCreated:({gl:e})=>e.setClearColor(0,0),raycaster:{params:{Line:{threshold:0},Points:{threshold:0},Mesh:{},LOD:{},Sprite:{}}},children:[(0,X.jsx)(`group`,{onClick:e=>{e.object.userData.pick&&Te(e)},onPointerOver:e=>{e.object.userData.pick&&N.root&&N.root.classList.add(`can-click`)},onPointerOut:()=>N.root?.classList.remove(`can-click`),children:(0,X.jsx)(Se,{built:e})}),(0,X.jsx)(Ce,{}),(0,X.jsx)(Ee,{}),(0,X.jsx)(Oe,{built:e}),(0,X.jsx)(ke,{}),(0,X.jsx)(Ae,{built:e})]})}export{je as default};