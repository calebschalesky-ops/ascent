/**
 * A ribbon trail: a strip that follows a moving point, facing the camera, fading and thinning toward its tail.
 * Used for engine exhaust. Points older than `life` seconds drop off, so the trail's length follows the speed.
 */
import * as THREE from 'three';
import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS } from './glsl';

export class Ribbon {
  readonly mesh: THREE.Mesh;
  private pts: { p: THREE.Vector3; t: number }[] = [];
  private pos: Float32Array;
  private along: Float32Array;
  private vis: Float32Array;
  private geo: THREE.BufferGeometry;
  private mat: THREE.ShaderMaterial;
  private max: number;
  width: number;
  life: number;
  /** Farther than this between frames counts as a jump. */
  maxJump = Infinity;
  constructor(max: number, width: number, life: number, color: THREE.Color) {
    this.max = max;
    this.width = width;
    this.life = life;
    this.pos = new Float32Array(max * 2 * 3);
    this.along = new Float32Array(max * 2);
    this.vis = new Float32Array(max * 2);
    const idx: number[] = [];
    for (let i = 0; i < max - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlong', new THREE.BufferAttribute(this.along, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aVis', new THREE.BufferAttribute(this.vis, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color }, uFade: { value: 1 }, uNear: { value: 0 } },
      vertexShader: /* glsl */ `
        ${LOGDEPTH_VERT_PARS}
        attribute float aAlong; attribute float aVis; varying float vAlong; varying float vSide; varying float vDepth; varying float vVis;
        void main(){
          vAlong = aAlong; vVis = aVis; vSide = float(gl_VertexID % 2) * 2.0 - 1.0;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
          ${LOGDEPTH_VERT}
        }`,
      fragmentShader: /* glsl */ `
        ${LOGDEPTH_FRAG_PARS}
        uniform vec3 uColor; uniform float uFade; uniform float uNear; varying float vAlong; varying float vSide; varying float vDepth; varying float vVis;
        void main(){
          float edge = 1.0 - vSide * vSide;
          // Fade where the trail runs close past the camera, or it fills the view.
          float a = pow(1.0 - vAlong, 1.8) * edge * uFade * smoothstep(uNear * 0.3, uNear, vDepth) * vVis;
          vec3 c = mix(uColor, vec3(1.0), pow(1.0 - vAlong, 6.0) * 0.6);
          gl_FragColor = vec4(c * a, 1.0);
          ${LOGDEPTH_FRAG}
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
  }

  set fade(v: number) { this.mat.uniforms.uFade.value = v; }
  /** View depth under which the trail fades out. */
  set near(v: number) { this.mat.uniforms.uNear.value = v; }
  reset() { this.pts.length = 0; this.geo.setDrawRange(0, 0); }

  update(head: THREE.Vector3, time: number, camPos: THREE.Vector3) {
    let last: { p: THREE.Vector3; t: number } | undefined = this.pts[0];
    // A jump (leaving a body, loading a save) starts a fresh trail rather than drawing a line across space.
    // A clock that went backwards (a test hook replaying frames) also starts afresh.
    if (last && (last.p.distanceToSquared(head) > this.maxJump * this.maxJump || time < last.t)) { this.pts.length = 0; last = undefined; }
    if (!last || last.p.distanceToSquared(head) > (this.width * 0.5) ** 2) this.pts.unshift({ p: head.clone(), t: time });
    else last.p.copy(head);
    while (this.pts.length > this.max || (this.pts.length > 2 && time - this.pts[this.pts.length - 1].t > this.life)) this.pts.pop();
    const n = this.pts.length;
    if (n < 2) { this.geo.setDrawRange(0, 0); return; }
    const tan = new THREE.Vector3();
    const view = new THREE.Vector3();
    const side = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const p = this.pts[i].p;
      const a = this.pts[Math.max(0, i - 1)].p;
      const b = this.pts[Math.min(n - 1, i + 1)].p;
      tan.subVectors(a, b);
      if (tan.lengthSq() < 1e-12) tan.set(0, 0, 1);
      view.subVectors(camPos, p);
      side.crossVectors(tan, view);
      // Seen end-on, a strip has no width to show: fade it rather than let it flip into a sheet.
      const sin = side.length() / Math.max(1e-9, tan.length() * view.length());
      side.normalize();
      this.vis[i * 2] = this.vis[i * 2 + 1] = THREE.MathUtils.smoothstep(sin, 0.2, 0.55);
      const k = THREE.MathUtils.clamp((time - this.pts[i].t) / this.life, 0, 1);
      const w = this.width * (1 - k * 0.6);
      this.pos[i * 6] = p.x + side.x * w; this.pos[i * 6 + 1] = p.y + side.y * w; this.pos[i * 6 + 2] = p.z + side.z * w;
      this.pos[i * 6 + 3] = p.x - side.x * w; this.pos[i * 6 + 4] = p.y - side.y * w; this.pos[i * 6 + 5] = p.z - side.z * w;
      this.along[i * 2] = this.along[i * 2 + 1] = Math.max(k, i / (n - 1) * 0.15);
    }
    (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute('aAlong') as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute('aVis') as THREE.BufferAttribute).needsUpdate = true;
    this.geo.setDrawRange(0, (n - 1) * 6);
  }

  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
