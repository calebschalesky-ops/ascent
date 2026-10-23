/**
 * Weapon and destruction effects, as plain functions any part of the game can call:
 *
 *   spawnImpact(pos, { color, scale, normal })      a bolt hitting something: sparks, a flash, a few embers
 *   spawnExplosion(pos, { color, scale })           a ship dying: flash, fireball, smoke, sparks, debris,
 *                                                   a shockwave ring and embers that linger
 *   spawnTrail(from, to, { style, scale })          call every frame with a mover's last and current position:
 *                                                   'smoke' (missile), 'ion' (engine), 'fire'
 *   spawnShieldHit(centre, radius, at, { color })   a shield bubble lighting up and rippling from the hit
 *   spawnMuzzle(pos, dir, { color, scale })         a gun firing
 *
 * `scale` is the size of the thing involved (a ship's length, a missile's length) so everything follows a rescale.
 * Each call is a no-op until `createEffects` has run (the flight view makes one). Battery saver spawns about a third
 * as many particles and skips the debris trails.
 */
import * as THREE from 'three';
import type { PSpawn } from './particles';
import { Particles } from './particles';
import { fxQuality } from './quality';
import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS } from './glsl';

type V = THREE.Vector3Like | [number, number, number];
const vec = (p: V) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p.x, p.y, p.z));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const dirRand = () => {
  const z = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - z * z);
  return new THREE.Vector3(s * Math.cos(t), z, s * Math.sin(t));
};
const count = (n: number) => Math.max(1, Math.round(n * fxQuality.budget));
const hdr = (c: THREE.ColorRepresentation, k: number) => new THREE.Color(c).multiplyScalar(k);

// ---------- Shockwave rings ----------
const RING_FRAG = /* glsl */ `
${LOGDEPTH_FRAG_PARS}
uniform vec3 uColor; uniform float uT;
varying vec2 vUv;
void main(){
  float r = length(vUv * 2.0 - 1.0);
  if (r > 1.0) discard;
  float edge = 1.0 - uT * 0.25;
  float ring = exp(-pow((r - edge) / (0.05 + 0.12 * uT), 2.0));
  float fill = smoothstep(edge, 0.0, r) * 0.15 * (1.0 - uT);
  float a = (ring + fill) * (1.0 - uT) * (1.0 - uT);
  gl_FragColor = vec4(uColor * a, 1.0);
  ${LOGDEPTH_FRAG}
}`;
const UV_VERT = /* glsl */ `
${LOGDEPTH_VERT_PARS}
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${LOGDEPTH_VERT} }`;

// ---------- Shield bubble ----------
const SHIELD_VERT = /* glsl */ `
${LOGDEPTH_VERT_PARS}
varying vec3 vN; varying vec3 vW; varying vec3 vObj;
void main(){
  vObj = normalize(position);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
  ${LOGDEPTH_VERT}
}`;
const SHIELD_FRAG = /* glsl */ `
${LOGDEPTH_FRAG_PARS}
uniform vec3 uColor; uniform vec3 uHit; uniform float uT;
varying vec3 vN; varying vec3 vW; varying vec3 vObj;
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float fres = pow(1.0 - abs(dot(normalize(vN), V)), 2.5);
  float d = acos(clamp(dot(vObj, uHit), -1.0, 1.0));      // angle from the hit point
  float wave = exp(-pow((d - uT * 3.2) * 5.0, 2.0));       // a ripple running out from the hit
  float spot = exp(-d * d * 18.0) * (1.0 - uT);
  // Hexagonal cells, from a cheap lattice on the sphere.
  vec3 q = vObj * 9.0;
  vec3 f = abs(fract(q) - 0.5);
  float cell = smoothstep(0.42, 0.5, max(f.x, max(f.y, f.z)));
  float fade = (1.0 - uT) * (1.0 - uT);
  float a = (fres * 0.35 + wave * (0.5 + 0.8 * cell) + spot * 2.5) * fade;
  gl_FragColor = vec4(uColor * a, 1.0);
  ${LOGDEPTH_FRAG}
}`;

interface Ring { mesh: THREE.Mesh; t: number; life: number; size: number }
interface Shield { mesh: THREE.Mesh; t: number; life: number }
interface Chunk { pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Euler; spin: THREE.Vector3; size: number; t: number; life: number; color: THREE.Color }

export interface Effects {
  particles: Particles;
  update: (dt: number, time: number) => void;
  dispose: () => void;
}

let current: (Effects & { impl: Impl }) | null = null;

interface Impl {
  impact: typeof spawnImpact;
  explosion: typeof spawnExplosion;
  trail: typeof spawnTrail;
  shield: typeof spawnShieldHit;
  muzzle: typeof spawnMuzzle;
}

export function spawnImpact(at: V, o: { color?: THREE.ColorRepresentation; scale?: number; normal?: V } = {}) { current?.impl.impact(at, o); }
export function spawnExplosion(at: V, o: { color?: THREE.ColorRepresentation; scale?: number } = {}) { current?.impl.explosion(at, o); }
export function spawnTrail(from: V, to: V, o: { style?: 'smoke' | 'ion' | 'fire'; scale?: number; color?: THREE.ColorRepresentation } = {}) { current?.impl.trail(from, to, o); }
export function spawnShieldHit(centre: V, radius: number, at: V, o: { color?: THREE.ColorRepresentation } = {}) { current?.impl.shield(centre, radius, at, o); }
export function spawnMuzzle(at: V, dir: V, o: { color?: THREE.ColorRepresentation; scale?: number } = {}) { current?.impl.muzzle(at, dir, o); }
/** Live particle count, for tests and the frame-time check. */
export const fxStats = () => ({ particles: current?.particles.count ?? 0 });

export function createEffects(scene: THREE.Scene): Effects {
  const root = new THREE.Group();
  scene.add(root);
  const particles = new Particles(root);
  const rings: Ring[] = [];
  const shields: Shield[] = [];
  const chunks: Chunk[] = [];
  const ringGeo = new THREE.PlaneGeometry(2, 2);
  const shieldGeo = new THREE.IcosahedronGeometry(1, 4);
  // Debris: one instanced mesh of jagged hull fragments, lit by the Sun, glowing hot as they fly.
  const MAX_CHUNKS = 96;
  const chunkGeo = new THREE.TetrahedronGeometry(1, 0);
  chunkGeo.scale(1, 0.45, 0.7);
  const chunkMat = new THREE.MeshStandardMaterial({ color: 0x4a4d55, metalness: 0.8, roughness: 0.5, emissive: 0xff5a1a, emissiveIntensity: 0.0 });
  const chunkMesh = new THREE.InstancedMesh(chunkGeo, chunkMat, MAX_CHUNKS);
  const tmpV = new THREE.Vector3();
  chunkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  chunkMesh.count = 0;
  chunkMesh.frustumCulled = false;
  root.add(chunkMesh);
  // Explosions light their surroundings: one light reused (adding lights would recompile every lit material).
  const flash = new THREE.PointLight(0xffb070, 0, 0, 2);
  root.add(flash);
  let flashK = 0;
  let flashScale = 1;

  const P = (p: PSpawn) => particles.spawn(p);
  const m4 = new THREE.Matrix4();
  const qq = new THREE.Quaternion();
  const sv = new THREE.Vector3();

  const impl: Impl = {
    impact(at, o = {}) {
      const p = vec(at);
      const s = o.scale ?? 0.5;
      const col = new THREE.Color(o.color ?? 0xff6040);
      const n = o.normal ? vec(o.normal).normalize() : null;
      P({ pos: p, c0: hdr(0xffffff, 6), c1: hdr(col, 2), s0: s * 0.9, s1: s * 1.6, life: 0.12, kind: 0 });
      P({ pos: p, c0: hdr(col, 3), c1: hdr(col, 0.5), s0: s * 0.6, s1: s * 1.4, life: 0.35, kind: 0 });
      for (let i = 0; i < count(14); i++) {
        const d = dirRand();
        if (n && d.dot(n) < 0) d.reflect(n);
        P({ pos: p, vel: d.multiplyScalar(rnd(4, 12) * s), c0: hdr(0xfff0c0, 5), c1: hdr(col, 1.5), s0: s * 0.05, s1: s * 0.02, life: rnd(0.15, 0.45), drag: 3, kind: 1, stretch: 0.05 });
      }
      for (let i = 0; i < count(4); i++) {
        P({ pos: p, vel: dirRand().multiplyScalar(rnd(0.5, 2) * s), c0: hdr(0xffa040, 3), c1: hdr(0xff3000, 1), s0: s * 0.05, life: rnd(0.6, 1.2), drag: 1, kind: 3 });
      }
      if (fxQuality.high) P({ pos: p, c0: hdr(0x887a70, 0.25), c1: hdr(0x403838, 0.15), s0: s * 0.4, s1: s * 1.2, life: 0.8, kind: 2, alpha: 0.35 });
    },

    explosion(at, o = {}) {
      const p = vec(at);
      const s = o.scale ?? 1;
      const tint = new THREE.Color(o.color ?? 0xff7a30);
      // Flash and light.
      P({ pos: p, c0: hdr(0xffffff, 6), c1: hdr(0xffd0a0, 2), s0: s * 1.2, s1: s * 2.4, life: 0.16, kind: 0, fadeIn: 0.001 });
      flash.position.copy(p);
      flashK = 1;
      flashScale = s;
      // Fireball: overlapping hot blobs cooling to deep red.
      for (let i = 0; i < count(14); i++) {
        const d = dirRand().multiplyScalar(rnd(0.5, 3.0) * s);
        P({ pos: p.clone().addScaledVector(d, 0.1), vel: d, c0: hdr(0xffb860, rnd(1.6, 3.0)), c1: hdr(0xa02008, 0.4), s0: s * rnd(0.3, 0.55), s1: s * rnd(0.9, 1.5), life: rnd(0.5, 1.0), drag: 2.2, kind: 0, fadeIn: 0.03 });
      }
      // Smoke left behind.
      for (let i = 0; i < count(12); i++) {
        const d = dirRand().multiplyScalar(rnd(0.3, 1.6) * s);
        P({ pos: p.clone().addScaledVector(d, 0.3), vel: d, c0: hdr(0x5a4a40, 0.5), c1: hdr(0x1c1a1e, 0.35), s0: s * rnd(0.8, 1.2), s1: s * rnd(2.5, 4.0), life: rnd(1.8, 3.2), drag: 0.9, kind: 2, alpha: 0.55, fadeIn: 0.25 });
      }
      // Sparks.
      for (let i = 0; i < count(46); i++) {
        P({ pos: p, vel: dirRand().multiplyScalar(rnd(6, 22) * s), c0: hdr(0xfff2c8, 6), c1: hdr(0xff6a20, 1.5), s0: s * 0.07, s1: s * 0.03, life: rnd(0.35, 0.9), drag: 1.6, kind: 1, stretch: 0.06 });
      }
      // Embers that linger.
      for (let i = 0; i < count(34); i++) {
        P({ pos: p, vel: dirRand().multiplyScalar(rnd(1.5, 6) * s), c0: hdr(0xffb050, 4), c1: hdr(0xff2a00, 1.2), s0: s * rnd(0.04, 0.08), life: rnd(1.8, 3.8), drag: 0.7, kind: 3 });
      }
      // Shockwave: a flat ring in a random plane, and a second faint one in the tint colour.
      for (const [k, c] of [[1, hdr(0xffe0b0, 1.6)], [1.6, hdr(tint, 1.0)]] as const) {
        const mat = new THREE.ShaderMaterial({ uniforms: { uColor: { value: c }, uT: { value: 0 } }, vertexShader: UV_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(ringGeo, mat);
        mesh.position.copy(p);
        mesh.lookAt(p.clone().add(dirRand()));
        root.add(mesh);
        rings.push({ mesh, t: 0, life: 0.7 * k, size: s * 4 * k });
      }
      // Debris.
      const nChunks = fxQuality.high ? 9 : 4;
      for (let i = 0; i < nChunks && chunks.length < MAX_CHUNKS; i++) {
        chunks.push({ pos: p.clone(), vel: dirRand().multiplyScalar(rnd(2, 7) * s), rot: new THREE.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6)), spin: new THREE.Vector3(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)), size: s * rnd(0.06, 0.16), t: 0, life: rnd(2.5, 4.5), color: tint.clone() });
      }
    },

    trail(from, to, o = {}) {
      const a = vec(from);
      const b = vec(to);
      const s = o.scale ?? 0.4;
      const style = o.style ?? 'smoke';
      const len = a.distanceTo(b);
      const step = s * (style === 'smoke' ? 0.35 : 0.5) / Math.max(0.35, fxQuality.budget);
      const n = Math.min(24, Math.max(1, Math.floor(len / step)));
      for (let i = 0; i < n; i++) {
        const q = a.clone().lerp(b, (i + Math.random()) / n);
        if (style === 'smoke') {
          P({ pos: q, vel: dirRand().multiplyScalar(s * 0.3), c0: hdr(0x9a948e, 0.35), c1: hdr(0x2a2834, 0.2), s0: s * 0.18, s1: s * rnd(0.7, 1.1), life: rnd(0.8, 1.4), drag: 1.5, kind: 2, alpha: 0.22, fadeIn: 0.08 });
          if (i % 2 === 0) P({ pos: q, c0: hdr(0xffc070, 4), c1: hdr(0xff4010, 0.5), s0: s * 0.22, s1: s * 0.1, life: 0.12, kind: 0 });
        } else if (style === 'fire') {
          P({ pos: q, vel: dirRand().multiplyScalar(s * 0.5), c0: hdr(0xffc070, 4), c1: hdr(0xa02000, 0.5), s0: s * 0.3, s1: s * 0.7, life: rnd(0.3, 0.6), drag: 2, kind: 0 });
        } else {
          const c = new THREE.Color(o.color ?? 0x6aa8ff);
          P({ pos: q, vel: dirRand().multiplyScalar(s * 0.2), c0: hdr(c, 2.5), c1: hdr(c, 0.3), s0: s * 0.12, s1: s * 0.3, life: rnd(0.25, 0.5), drag: 1, kind: 0 });
        }
      }
    },

    shield(centre, radius, at, o = {}) {
      const c = vec(centre);
      const hit = vec(at).sub(c).normalize();
      const mat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: hdr(o.color ?? 0x5ac8ff, 1.3) }, uHit: { value: hit }, uT: { value: 0 } },
        vertexShader: SHIELD_VERT, fragmentShader: SHIELD_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(shieldGeo, mat);
      mesh.position.copy(c);
      mesh.scale.setScalar(radius);
      root.add(mesh);
      shields.push({ mesh, t: 0, life: 0.6 });
      impl.impact(c.clone().addScaledVector(hit, radius), { color: o.color ?? 0x5ac8ff, scale: radius * 0.6, normal: hit });
    },

    muzzle(at, dir, o = {}) {
      const p = vec(at);
      const d = vec(dir).normalize();
      const s = o.scale ?? 0.3;
      const col = new THREE.Color(o.color ?? 0xff5040);
      P({ pos: p, c0: hdr(0xffffff, 5), c1: hdr(col, 2), s0: s * 0.35, s1: s * 0.6, life: 0.06, kind: 0, fadeIn: 0.001 });
      for (let i = 0; i < count(3); i++) {
        P({ pos: p, vel: d.clone().multiplyScalar(rnd(6, 12) * s).add(dirRand().multiplyScalar(2 * s)), c0: hdr(col, 4), c1: hdr(col, 1), s0: s * 0.04, life: 0.12, drag: 4, kind: 1, stretch: 0.03 });
      }
    },
  };

  const effects: Effects & { impl: Impl } = {
    impl,
    particles,
    update(dt, time) {
      particles.update(dt, time);
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.t += dt;
        const k = r.t / r.life;
        const m = r.mesh.material as THREE.ShaderMaterial;
        m.uniforms.uT.value = Math.min(1, k);
        r.mesh.scale.setScalar(r.size * (1 - Math.pow(1 - Math.min(1, k), 3)) + 1e-3);
        if (k >= 1) { root.remove(r.mesh); m.dispose(); rings.splice(i, 1); }
      }
      for (let i = shields.length - 1; i >= 0; i--) {
        const sh = shields[i];
        sh.t += dt;
        const m = sh.mesh.material as THREE.ShaderMaterial;
        m.uniforms.uT.value = Math.min(1, sh.t / sh.life);
        if (sh.t >= sh.life) { root.remove(sh.mesh); m.dispose(); shields.splice(i, 1); }
      }
      // Debris: tumble, slow a little, shed embers while hot, then fade by shrinking.
      let n = 0;
      let heat = 0;
      if (chunks.length) chunkMesh.position.copy(chunks[chunks.length - 1].pos); // an anchor: instances are offsets from it (space/origin.ts)
      for (let i = chunks.length - 1; i >= 0; i--) {
        const c = chunks[i];
        c.t += dt;
        if (c.t >= c.life) { chunks.splice(i, 1); continue; }
        const prev = c.pos.clone();
        c.vel.multiplyScalar(Math.exp(-dt * 0.25));
        c.pos.addScaledVector(c.vel, dt);
        c.rot.x += c.spin.x * dt; c.rot.y += c.spin.y * dt; c.rot.z += c.spin.z * dt;
        const k = c.t / c.life;
        const hot = Math.max(0, 1 - c.t / 1.6);
        heat = Math.max(heat, hot);
        if (hot > 0.05 && fxQuality.high) impl.trail(prev, c.pos, { style: 'fire', scale: c.size * 1.2 });
        qq.setFromEuler(c.rot);
        sv.setScalar(c.size * (k > 0.8 ? (1 - k) / 0.2 : 1));
        m4.compose(tmpV.copy(c.pos).sub(chunkMesh.position), qq, sv);
        chunkMesh.setMatrixAt(n++, m4);
      }
      chunkMesh.count = n;
      chunkMesh.instanceMatrix.needsUpdate = true;
      chunkMat.emissiveIntensity = heat * 1.5;
      flashK = Math.max(0, flashK - dt / 0.45);
      flash.intensity = flashK * flashK * 6 * flashScale * flashScale;
      flash.distance = flashScale * 30;
    },
    dispose() {
      if (current === effects) current = null;
      particles.dispose();
      for (const r of rings) (r.mesh.material as THREE.Material).dispose();
      for (const s of shields) (s.mesh.material as THREE.Material).dispose();
      ringGeo.dispose(); shieldGeo.dispose(); chunkGeo.dispose(); chunkMat.dispose();
      root.removeFromParent();
    },
  };
  current = effects;
  return effects;
}
