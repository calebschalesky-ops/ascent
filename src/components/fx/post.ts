/**
 * The cinematic pass, after bloom and before the output (tone mapping) pass, working on the linear HDR image:
 * god rays and a lens flare from the Sun when it is in view and not hidden behind a body, chromatic aberration while
 * boosting, colour grading and a vignette. Battery saver keeps only the grading and vignette (one texture read).
 */
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { fxQuality } from './quality';

const shader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uSun: { value: new THREE.Vector2(0.5, 0.5) },
    uSunVis: { value: 0 },
    uSunSize: { value: 0.05 },
    uAspect: { value: 1 },
    uRays: { value: 1 },
    uFlare: { value: 1 },
    uCA: { value: 0 },
    uTime: { value: 0 },
    uVignette: { value: 0.32 },
    uSat: { value: 1.12 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uSun; uniform float uSunVis; uniform float uSunSize; uniform float uAspect;
    uniform float uRays; uniform float uFlare; uniform float uCA; uniform float uTime; uniform float uVignette; uniform float uSat;
    varying vec2 vUv;
    float h12(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 fromC = uv - 0.5;
      vec3 c;
      if (uCA > 0.001) {
        vec2 d = fromC * dot(fromC, fromC) * uCA * 0.09;
        c = vec3(texture2D(tDiffuse, uv + d).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d).b);
      } else c = texture2D(tDiffuse, uv).rgb;

      float vis = uSunVis;
      if (uRays > 0.5 && vis > 0.001) {
        // God rays: march toward the Sun on the image, summing what is bright; bodies in the way block it.
        const int N = 16;
        vec2 delta = (uv - uSun) / float(N) * 0.85;
        vec2 tc = uv - delta * h12(uv * 913.0 + uTime);
        float w = 1.0;
        vec3 acc = vec3(0.0);
        for (int i = 0; i < N; i++){
          tc -= delta;
          vec3 s = texture2D(tDiffuse, clamp(tc, 0.0, 1.0)).rgb;
          acc += max(s - 1.6, 0.0) * w;
          w *= 0.92;
        }
        float near = exp(-length((uv - uSun) * vec2(uAspect, 1.0)) * 1.6);
        c += acc / float(N) * vec3(1.0, 0.82, 0.6) * 0.22 * vis * (0.25 + near);
      }
      if (uFlare > 0.5 && vis > 0.001) {
        // Lens flare: a starburst at the Sun, an anamorphic streak, and ghosts mirrored through the centre.
        vec2 sv = (uv - uSun) * vec2(uAspect, 1.0);
        float d = length(sv);
        float ang = atan(sv.y, sv.x);
        // Starburst and streak stay small however big the Sun looks; they fade as it fills the view.
        float sz = min(uSunSize, 0.06);
        float big = 1.0 - smoothstep(0.08, 0.3, uSunSize);
        float burst = pow(abs(sin(ang * 6.0 + 0.4)), 24.0) * 0.6 + pow(abs(sin(ang * 4.0 + 1.3)), 50.0);
        vec3 f = vec3(1.0, 0.85, 0.65) * burst * exp(-d / (sz * 6.0)) * 0.7 * big;
        f += vec3(0.55, 0.65, 1.0) * exp(-abs(sv.y) / (sz * 0.12)) * exp(-abs(sv.x) / 0.45) * 0.35 * big;
        vec2 axis = 0.5 - uSun;
        for (int k = 0; k < 5; k++){
          float fk = float(k);
          float off = -0.6 + fk * 0.55;
          float rad = 0.025 + 0.03 * fract(fk * 0.618);
          vec2 gp = uSun + axis * (1.0 + off) * 1.2;
          float gd = length((uv - gp) * vec2(uAspect, 1.0));
          float ring = smoothstep(rad, rad * 0.8, gd) * 0.5 + smoothstep(rad * 0.25, 0.0, abs(gd - rad)) * 0.6;
          vec3 tint = mix(vec3(0.35, 0.8, 1.0), vec3(1.0, 0.45, 0.85), fract(fk * 0.37));
          f += tint * ring * 0.06 * big;
        }
        float hr = abs(d - 0.42);
        f += vec3(0.4, 0.7, 1.0) * smoothstep(0.03, 0.0, hr) * 0.035 * (0.6 + 0.4 * sin(ang * 3.0)) * big;
        c += f * vis;
      }

      // Grade: a touch more saturation, cool shadows, warm highlights.
      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(lum), c, uSat);
      float sh = 1.0 - smoothstep(0.0, 0.25, lum);
      c += vec3(0.0004, 0.0010, 0.0030) * sh;
      c *= mix(vec3(1.0), vec3(1.04, 1.0, 0.95), smoothstep(0.4, 2.0, lum));
      // Vignette.
      float v = smoothstep(0.85, 0.2, length(fromC * vec2(uAspect * 0.8, 1.0)));
      c *= mix(1.0, v, uVignette);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

export interface Cinematic {
  pass: ShaderPass;
  /** sun: world position and radius; blockers: bodies that can hide it; boost: 0..1. */
  update: (camera: THREE.PerspectiveCamera, sun: { pos: THREE.Vector3; size: number } | null, blockers: { pos: THREE.Vector3; size: number }[], boost: number, time: number) => void;
}

const v = new THREE.Vector3();
const toSun = new THREE.Vector3();
const oc = new THREE.Vector3();

/** How much of the Sun shows past the bodies between it and the camera: 1 clear, 0 hidden. */
function sunVisible(cam: THREE.Vector3, sun: THREE.Vector3, sunR: number, blockers: { pos: THREE.Vector3; size: number }[]) {
  toSun.subVectors(sun, cam);
  const dSun = toSun.length();
  toSun.divideScalar(dSun);
  const sunAng = Math.asin(Math.min(1, sunR / dSun));
  let vis = 1;
  for (const b of blockers) {
    oc.subVectors(b.pos, cam);
    const along = oc.dot(toSun);
    if (along <= 0 || along > dSun) continue;
    const dB = oc.length();
    if (dB < b.size) return 0;
    const bAng = Math.asin(Math.min(1, b.size / dB));
    const sep = Math.acos(Math.max(-1, Math.min(1, along / dB)));
    // Fraction of the sun's disc left uncovered, approximated along the line between the two centres.
    const cover = THREE.MathUtils.clamp((bAng + sunAng - sep) / (2 * sunAng), 0, 1);
    vis = Math.min(vis, 1 - cover);
  }
  return vis;
}

export function createCinematic(): Cinematic {
  const pass = new ShaderPass(shader);
  const u = pass.uniforms as typeof shader.uniforms;
  let vis = 0;
  return {
    pass,
    update(camera, sun, blockers, boost, time) {
      const high = fxQuality.high;
      u.uRays.value = high ? 1 : 0;
      u.uFlare.value = high ? 1 : 0;
      u.uCA.value = high ? boost : 0;
      u.uTime.value = time % 100;
      u.uAspect.value = camera.aspect;
      let want = 0;
      if (sun) {
        // In front only if the Sun is ahead of the camera in view space: project() mirrors a point behind the camera
        // onto the screen, which drew rays and a starburst out of whatever was straight ahead with the Sun at our back.
        v.copy(sun.pos).applyMatrix4(camera.matrixWorldInverse);
        const inFront = v.z < 0;
        v.copy(sun.pos).project(camera);
        u.uSun.value.set((v.x + 1) / 2, (v.y + 1) / 2);
        const edge = Math.max(Math.abs(v.x), Math.abs(v.y));
        const onScreen = inFront ? THREE.MathUtils.clamp((1.35 - edge) / 0.4, 0, 1) : 0;
        const d = camera.position.distanceTo(sun.pos);
        u.uSunSize.value = Math.min(0.5, Math.atan(sun.size / Math.max(d, sun.size)) / ((camera.fov * Math.PI) / 360) * 0.5);
        want = onScreen * sunVisible(camera.position, sun.pos, sun.size, blockers);
      }
      vis += (want - vis) * 0.35;
      u.uSunVis.value = vis;
    },
  };
}
