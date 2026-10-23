/**
 * Speed dust: specks in a box that wraps around the camera, drawn as streaks along the ship's motion so speed is
 * felt. At rest they are faint points; at speed they stretch; boosting lengthens and tints them. The box is sized
 * from the ship, so a rescale keeps the same feel.
 */
import * as THREE from 'three';
import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS } from './glsl';
import { fxQuality } from './quality';

export function createStreaks(scene: THREE.Scene, shipScale: number) {
  const n = 700;
  const box = shipScale * 90;
  const pos = new Float32Array(n * 2 * 3);
  const end = new Float32Array(n * 2);
  const seed = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = Math.random() * box, y = Math.random() * box, z = Math.random() * box, s = Math.random();
    for (let k = 0; k < 2; k++) {
      pos.set([x, y, z], (i * 2 + k) * 3);
      end[i * 2 + k] = k;
      seed[i * 2 + k] = s;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new THREE.Vector3() }, uEye: { value: new THREE.Vector3() }, uBox: { value: box }, uVel: { value: new THREE.Vector3() },
      uStretch: { value: 0.03 }, uBright: { value: 0.5 }, uTint: { value: new THREE.Color(0.7, 0.78, 1.0) }, uNear: { value: shipScale * 3 },
    },
    vertexShader: /* glsl */ `
      ${LOGDEPTH_VERT_PARS}
      uniform vec3 uCam; uniform vec3 uEye; uniform float uBox; uniform vec3 uVel; uniform float uStretch; uniform float uNear;
      attribute float aEnd; attribute float aSeed;
      varying float vA; varying float vEnd;
      void main(){
        vec3 p = mod(position - uCam, uBox) - uBox * 0.5 + uEye; // uCam: the camera modulo the box (doubles); uEye: the camera, rebased
        // Cap the streak's length so a jump in speed never draws lines across the screen.
        vec3 tail = uVel * uStretch * (0.6 + 0.8 * aSeed);
        float tl = length(tail);
        if (tl > uBox * 0.25) tail *= uBox * 0.25 / tl;
        p -= tail * aEnd;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        vA = smoothstep(uBox * 0.5, uBox * 0.2, d) * smoothstep(uNear, uNear * 3.0, d);
        vEnd = aEnd;
        gl_Position = projectionMatrix * mv;
        ${LOGDEPTH_VERT}
      }`,
    fragmentShader: /* glsl */ `
      ${LOGDEPTH_FRAG_PARS}
      uniform float uBright; uniform vec3 uTint;
      varying float vA; varying float vEnd;
      void main(){ gl_FragColor = vec4(uTint * vA * uBright * (1.0 - vEnd * 0.9), 1.0); ${LOGDEPTH_FRAG} }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  scene.add(lines);
  const cool = new THREE.Color(0.7, 0.78, 1.0);
  const hot = new THREE.Color(0.75, 0.9, 1.6);
  return {
    update(camPos: THREE.Vector3, vel: THREE.Vector3, boost: boolean) {
      const u = mat.uniforms;
      const b = u.uBox.value as number;
      const m = (v: number) => ((v % b) + b) % b;
      u.uCam.value.set(m(camPos.x), m(camPos.y), m(camPos.z));
      u.uEye.value.copy(camPos);
      u.uVel.value.copy(vel);
      const sp = vel.length();
      const fast = Math.min(1, Math.log10(1 + sp) / 2.4);
      u.uStretch.value = (0.012 + fast * 0.03) * (boost ? 1.8 : 1);
      u.uBright.value = (0.35 + fast * 0.9) * (boost ? 1.5 : 1) * (fxQuality.high ? 1 : 0.8);
      (u.uTint.value as THREE.Color).copy(boost ? hot : cool);
      lines.visible = true;
    },
    /** World-position uniforms, for the render origin. */
    worldUniforms: [mat.uniforms.uEye as { value: THREE.Vector3 }],
    dispose() { scene.remove(lines); geo.dispose(); mat.dispose(); },
  };
}
