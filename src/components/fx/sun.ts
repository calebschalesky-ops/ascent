/**
 * The Sun's corona: a camera-facing disc around the Sun with a hot inner glow, slowly turning streamers and a few
 * looping prominences at the limb. Sized from the Sun's radius, so it follows any rescale.
 */
import * as THREE from 'three';
import type { SpaceUniforms } from '../space/materials';
import { NOISE } from '../space/materials';
import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS } from './glsl';

const SPAN = 7; // the disc reaches this many solar radii from the centre

export function corona(radius: number, u: SpaceUniforms): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: u.uTime, uSpan: { value: SPAN } },
    vertexShader: /* glsl */ `
      ${LOGDEPTH_VERT_PARS}
      varying vec2 vUv;
      void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${LOGDEPTH_VERT} }`,
    fragmentShader: /* glsl */ `
      ${LOGDEPTH_FRAG_PARS}
      uniform float uTime; uniform float uSpan;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        float r = length(vUv) * uSpan;            // in solar radii
        if (r < 0.98) discard;
        float a = atan(vUv.y, vUv.x);
        vec2 ring = vec2(cos(a), sin(a));
        float t = uTime * 0.02;
        // Streamers: radial structure from noise around the limb, stretched outward.
        float s1 = fbm(vec3(ring * 3.0, t) + vec3(0.0, 0.0, r * 0.08));
        float s2 = snoise(vec3(ring * 9.0, t * 1.7 + r * 0.05));
        float streak = clamp(0.55 + 0.6 * s1 + 0.25 * s2, 0.0, 1.6);
        float fall = r - 1.0;
        float inner = exp(-fall * 9.0);
        float mid = exp(-fall * 2.2) * streak;
        float outer = exp(-fall * 1.1) * (0.6 + 0.4 * streak) * 0.12;
        // Prominences: bright loops hugging the limb.
        float prom = smoothstep(0.55, 0.9, snoise(vec3(ring * 4.0, t * 2.0))) * exp(-fall * 14.0) * smoothstep(0.0, 0.03, fall);
        prom *= 0.6 + 0.4 * snoise(vec3(ring * 30.0, t * 5.0));
        vec3 col = vec3(1.0, 0.82, 0.55) * inner * 2.4
                 + vec3(1.0, 0.62, 0.30) * mid * 0.6
                 + vec3(0.95, 0.55, 0.45) * outer
                 + vec3(1.0, 0.35, 0.20) * prom * 3.0;
        col *= smoothstep(uSpan, uSpan * 0.6, r);
        gl_FragColor = vec4(col, 1.0);
        ${LOGDEPTH_FRAG}
      }`,
    defines: { OCTAVES: 4 },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * SPAN * 2, radius * SPAN * 2), mat);
  const q = new THREE.Quaternion();
  const pq = new THREE.Quaternion();
  // Face the camera every frame (a billboard that still depth-tests against the planets).
  mesh.onBeforeRender = (_r, _s, cam) => {
    mesh.parent?.getWorldQuaternion(pq);
    q.copy(pq).invert().multiply(cam.quaternion);
    mesh.quaternion.copy(q);
    mesh.updateMatrixWorld();
  };
  mesh.frustumCulled = false;
  return mesh;
}
