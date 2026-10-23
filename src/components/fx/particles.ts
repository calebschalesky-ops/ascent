/**
 * Particles as camera-facing instanced quads. Two pools: additive (fire, sparks, glow, embers) and alpha-blended
 * (smoke). A spark can stretch along its motion on screen. One draw call per pool; the CPU moves them.
 */
import * as THREE from 'three';
import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS } from './glsl';

/** 0 soft glow · 1 spark (hard core, stretches) · 2 smoke puff · 3 ember (flickers). */
export type PKind = 0 | 1 | 2 | 3;

export interface PSpawn {
  pos: THREE.Vector3Like;
  vel?: THREE.Vector3Like;
  /** Start and end colour (linear, may exceed 1 for HDR glow). */
  c0: THREE.Color;
  c1?: THREE.Color;
  /** Start and end size (world units, the quad's half width). */
  s0: number;
  s1?: number;
  life: number;
  /** Velocity damping per second. */
  drag?: number;
  alpha?: number;
  kind?: PKind;
  /** Screen-space stretch along motion, in seconds of travel (sparks). */
  stretch?: number;
  /** Seconds of fade in (default 5% of life). */
  fadeIn?: number;
}

const VERT = /* glsl */ `
${LOGDEPTH_VERT_PARS}
attribute vec3 iPos;
attribute vec3 iVel;
attribute vec4 iCol;
attribute vec4 iParam; // size, stretch, kind, seed
varying vec2 vUv;
varying vec4 vCol;
varying float vKind;
varying float vSeed;
void main(){
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  vec2 corner = position.xy;
  float size = iParam.x;
  vec2 axisX = vec2(1.0, 0.0);
  vec2 axisY = vec2(0.0, 1.0);
  float len = size;
  if (iParam.y > 0.0) {
    vec3 vv = (viewMatrix * vec4(iVel, 0.0)).xyz;
    vec2 sv = vv.xy;
    float sl = length(sv);
    if (sl > 1e-5) {
      axisX = sv / sl;
      axisY = vec2(-axisX.y, axisX.x);
      len = size + sl * iParam.y;
    }
  } else {
    float a = iParam.w * 6.2831;
    axisX = vec2(cos(a), sin(a));
    axisY = vec2(-axisX.y, axisX.x);
  }
  mv.xy += axisX * corner.x * len + axisY * corner.y * size;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy;
  vCol = iCol;
  vKind = iParam.z;
  vSeed = iParam.w;
  ${LOGDEPTH_VERT}
}`;

const FRAG = /* glsl */ `
${LOGDEPTH_FRAG_PARS}
varying vec2 vUv;
varying vec4 vCol;
varying float vKind;
varying float vSeed;
float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main(){
  float r = length(vUv);
  if (r > 1.0) discard;
  float a;
  if (vKind < 0.5) a = pow(1.0 - r, 2.2);                       // glow
  else if (vKind < 1.5) a = exp(-r * r * 5.0) + exp(-r * 18.0) * 2.0; // spark: tight core
  else if (vKind < 2.5) {                                         // smoke: lumpy puff
    float n = vnoise(vUv * 2.6 + vSeed * 37.0) * 0.6 + vnoise(vUv * 5.0 - vSeed * 11.0) * 0.4;
    a = smoothstep(1.0, 0.15, r) * (0.45 + 0.75 * n);
  } else a = exp(-r * r * 7.0);                                   // ember
  #ifdef ALPHA_POOL
    gl_FragColor = vec4(vCol.rgb, clamp(a * vCol.a, 0.0, 1.0));
  #else
    gl_FragColor = vec4(vCol.rgb * a * vCol.a, 1.0);
  #endif
  ${LOGDEPTH_FRAG}
}`;

class Pool {
  readonly mesh: THREE.Mesh;
  private geo: THREE.InstancedBufferGeometry;
  private iPos: THREE.InstancedBufferAttribute;
  private iVel: THREE.InstancedBufferAttribute;
  private iCol: THREE.InstancedBufferAttribute;
  private iParam: THREE.InstancedBufferAttribute;
  private n = 0;
  // CPU state per particle
  private pos: Float32Array; private vel: Float32Array;
  private c0: Float32Array; private c1: Float32Array;
  private sz: Float32Array; // s0, s1
  private life: Float32Array; private age: Float32Array; private drag: Float32Array;
  private alpha: Float32Array; private kind: Float32Array; private stretch: Float32Array; private seed: Float32Array; private fadeIn: Float32Array;

  readonly max: number;
  constructor(max: number, alphaPool: boolean) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(2, 2);
    g.index = quad.index;
    g.setAttribute('position', quad.getAttribute('position'));
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.iVel = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.iCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iParam = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.iPos);
    g.setAttribute('iVel', this.iVel);
    g.setAttribute('iCol', this.iCol);
    g.setAttribute('iParam', this.iParam);
    g.instanceCount = 0;
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      defines: alphaPool ? { ALPHA_POOL: '' } : {},
      transparent: true,
      depthWrite: false,
      blending: alphaPool ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = alphaPool ? 2 : 3;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.c0 = new Float32Array(max * 3); this.c1 = new Float32Array(max * 3);
    this.sz = new Float32Array(max * 2);
    this.life = new Float32Array(max); this.age = new Float32Array(max); this.drag = new Float32Array(max);
    this.alpha = new Float32Array(max); this.kind = new Float32Array(max); this.stretch = new Float32Array(max);
    this.seed = new Float32Array(max); this.fadeIn = new Float32Array(max);
  }

  get count() { return this.n; }

  spawn(p: PSpawn) {
    let i = this.n;
    if (i >= this.max) {
      // Full: replace the oldest-by-age-fraction slot near the start (cheap and good enough).
      i = Math.floor(Math.random() * this.max);
    } else this.n++;
    this.pos[i * 3] = p.pos.x; this.pos[i * 3 + 1] = p.pos.y; this.pos[i * 3 + 2] = p.pos.z;
    this.vel[i * 3] = p.vel?.x ?? 0; this.vel[i * 3 + 1] = p.vel?.y ?? 0; this.vel[i * 3 + 2] = p.vel?.z ?? 0;
    const c1 = p.c1 ?? p.c0;
    this.c0[i * 3] = p.c0.r; this.c0[i * 3 + 1] = p.c0.g; this.c0[i * 3 + 2] = p.c0.b;
    this.c1[i * 3] = c1.r; this.c1[i * 3 + 1] = c1.g; this.c1[i * 3 + 2] = c1.b;
    this.sz[i * 2] = p.s0; this.sz[i * 2 + 1] = p.s1 ?? p.s0;
    this.life[i] = Math.max(0.01, p.life); this.age[i] = 0; this.drag[i] = p.drag ?? 0;
    this.alpha[i] = p.alpha ?? 1; this.kind[i] = p.kind ?? 0; this.stretch[i] = p.stretch ?? 0;
    this.seed[i] = Math.random(); this.fadeIn[i] = p.fadeIn ?? p.life * 0.05;
  }

  private copy(from: number, to: number) {
    for (let k = 0; k < 3; k++) {
      this.pos[to * 3 + k] = this.pos[from * 3 + k]; this.vel[to * 3 + k] = this.vel[from * 3 + k];
      this.c0[to * 3 + k] = this.c0[from * 3 + k]; this.c1[to * 3 + k] = this.c1[from * 3 + k];
    }
    this.sz[to * 2] = this.sz[from * 2]; this.sz[to * 2 + 1] = this.sz[from * 2 + 1];
    this.life[to] = this.life[from]; this.age[to] = this.age[from]; this.drag[to] = this.drag[from];
    this.alpha[to] = this.alpha[from]; this.kind[to] = this.kind[from]; this.stretch[to] = this.stretch[from];
    this.seed[to] = this.seed[from]; this.fadeIn[to] = this.fadeIn[from];
  }

  update(dt: number, time: number) {
    let i = 0;
    while (i < this.n) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.n--; if (i !== this.n) this.copy(this.n, i); continue; }
      const k = Math.exp(-this.drag[i] * dt);
      for (let a = 0; a < 3; a++) { this.vel[i * 3 + a] *= k; this.pos[i * 3 + a] += this.vel[i * 3 + a] * dt; }
      i++;
    }
    const P = this.iPos.array as Float32Array, Vv = this.iVel.array as Float32Array, C = this.iCol.array as Float32Array, Q = this.iParam.array as Float32Array;
    for (let j = 0; j < this.n; j++) {
      const t = this.age[j] / this.life[j];
      const fin = Math.min(1, this.age[j] / Math.max(1e-3, this.fadeIn[j]));
      let a = this.alpha[j] * fin * (1 - t) * (1 - t * 0.5);
      if (this.kind[j] === 3) a *= 0.65 + 0.35 * Math.sin(time * 23 + this.seed[j] * 50);
      for (let c = 0; c < 3; c++) {
        P[j * 3 + c] = this.pos[j * 3 + c];
        Vv[j * 3 + c] = this.vel[j * 3 + c];
        C[j * 4 + c] = this.c0[j * 3 + c] + (this.c1[j * 3 + c] - this.c0[j * 3 + c]) * t;
      }
      C[j * 4 + 3] = a;
      Q[j * 4] = this.sz[j * 2] + (this.sz[j * 2 + 1] - this.sz[j * 2]) * Math.sqrt(t);
      Q[j * 4 + 1] = this.stretch[j];
      Q[j * 4 + 2] = this.kind[j];
      Q[j * 4 + 3] = this.seed[j];
    }
    this.geo.instanceCount = this.n;
    for (const at of [this.iPos, this.iVel, this.iCol, this.iParam]) {
      at.clearUpdateRanges();
      at.addUpdateRange(0, this.n * at.itemSize);
      at.needsUpdate = true;
    }
  }

  dispose() { this.geo.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}

export class Particles {
  readonly add: Pool;
  readonly smoke: Pool;
  constructor(scene: THREE.Object3D, maxAdd = 6000, maxSmoke = 2000) {
    this.add = new Pool(maxAdd, false);
    this.smoke = new Pool(maxSmoke, true);
    scene.add(this.smoke.mesh, this.add.mesh);
  }
  spawn(p: PSpawn) { (p.kind === 2 ? this.smoke : this.add).spawn(p); }
  update(dt: number, time: number) { this.add.update(dt, time); this.smoke.update(dt, time); }
  get count() { return this.add.count + this.smoke.count; }
  dispose() { this.add.mesh.removeFromParent(); this.smoke.mesh.removeFromParent(); this.add.dispose(); this.smoke.dispose(); }
}
