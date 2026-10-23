/**
 * Streaming terrain for one body: a cube-sphere quadtree of patches, built in Web Workers and swapped in by distance.
 * A patch splits into four only once all four are built, so the ground never shows a hole; until the six face patches
 * exist, the planet's own sphere stays on screen.
 */
import * as THREE from 'three';
import { maxLevelFor, nodeEdge, nodeKey, nodeRect, faceDir, reliefOf } from '../../lib/terrain';
import type { GroundBody, QNode } from '../../lib/terrain';
import { buildChunk, chunkIndex, chunkTiles } from './chunk';
import { loadRealTerrain } from '../../lib/realTerrain';
import type { TileStore } from '../../lib/realTerrain';
import type { ChunkData, ChunkRequest } from './chunk';
import { SNOISE, logDepth } from './glsl';

/** Uniforms the sky drives each frame, shared by the ground and the cloud decks. */
export interface AirUniforms {
  uSun: { value: THREE.Vector3 }; // the Sun's world position
  uHazeColor: { value: THREE.Color }; // the sky at the horizon, which distant ground fades into
  uHaze: { value: number }; // haze per scene unit of distance
  uAmbient: { value: THREE.Color }; // skylight on the ground
}

// ---------- workers ----------
type Pending = { resolve: (d: ChunkData) => void };
let pool: { workers: Worker[]; busy: number[]; next: number; waiting: Map<number, Pending> } | null = null;
let poolFailed = false;
function getPool() {
  if (pool || poolFailed) return pool;
  try {
    const n = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 2) - 2));
    const workers: Worker[] = [];
    const waiting = new Map<number, Pending>();
    const busy: number[] = [];
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('./terrainWorker.ts', import.meta.url), { type: 'module' });
      const wi = i;
      w.onmessage = (e: MessageEvent<{ id: number; data: ChunkData }>) => {
        busy[wi]--;
        const p = waiting.get(e.data.id);
        waiting.delete(e.data.id);
        p?.resolve(e.data.data);
      };
      w.onerror = () => { poolFailed = true; };
      workers.push(w);
      busy.push(0);
    }
    pool = { workers, busy, next: 1, waiting };
  } catch {
    poolFailed = true;
  }
  return pool;
}

// ---------- the ground's material ----------
export function terrainMaterial(u: AirUniforms): THREE.ShaderMaterial {
  return logDepth(new THREE.ShaderMaterial({
    uniforms: { ...u },
    side: THREE.DoubleSide, // the skirts hang both ways
    vertexShader: /* glsl */ `
      uniform vec3 uSun;
      attribute vec4 aColor;
      varying vec4 vC; varying vec3 vN; varying vec3 vMV; varying vec3 vL; varying vec3 vObj;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0); // view space, composed on the CPU in double precision
        vMV = mv.xyz; vObj = position; vC = aColor;
        vN = normalize(normalMatrix * normal);
        vL = normalize((viewMatrix * vec4(uSun, 1.0)).xyz - mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHazeColor; uniform float uHaze; uniform vec3 uAmbient;
      varying vec4 vC; varying vec3 vN; varying vec3 vMV; varying vec3 vL; varying vec3 vObj;
      ${SNOISE}
      void main(){
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 L = normalize(vL);
        vec3 V = normalize(-vMV);
        float d = length(vMV);
        // Fine texture close up, faded out before it is smaller than a few pixels.
        float fw = max(length(fwidth(vObj)), 1e-6);
        float det = 0.0;
        float f = 1.1;
        float a = 0.5;
        for (int i = 0; i < 4; i++){
          float k = 1.0 - smoothstep(0.1, 0.4, f * fw);
          det += a * k * snoise(vObj * f);
          f *= 3.1; a *= 0.6;
        }
        float water = vC.a;
        vec3 col = vC.rgb * (1.0 + (0.28 - 0.2 * water) * det);
        float ndl = dot(n, L);
        float diff = max(ndl, 0.0);
        vec3 lit = col * (diff * 1.5 + uAmbient);
        // Sea: a sun glint and the sky in it at a glancing angle.
        vec3 H = normalize(L + V);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
        lit += water * (pow(max(dot(n, H), 0.0), 90.0) * 1.4 * step(0.0, ndl) + uHazeColor * fres * 0.6);
        float haze = 1.0 - exp(-d * uHaze);
        gl_FragColor = vec4(mix(lit, uHazeColor, haze), 1.0);
      }`,
  }));
}

interface Chunk { node: QNode; mesh: THREE.Mesh | null; pending: boolean; used: number; minH: number; maxH: number }

export interface TerrainOptions {
  body: GroundBody;
  radius: number; // scene units
  segments: number; // per patch edge
  minSpacing: number; // the closest vertices may sit, scene units
  split?: number; // split a patch while nearer than this × its width
  maxChunks?: number;
}

export class PlanetTerrain {
  readonly group = new THREE.Group();
  readonly material: THREE.ShaderMaterial;
  readonly maxLevel: number;
  private chunks = new Map<string, Chunk>();
  private index: THREE.BufferAttribute;
  private frame = 0;
  private queue: { node: QNode; dist: number }[] = [];
  private inFlight = 0;
  /** True once the six face patches are built: the planet's own sphere can be hidden. */
  ready = false;
  /** How many patches are drawn, built, and waiting (for the HUD and the frame-time notes); real: the deepest data
   * tile level among the drawn patches (-1: the made-up shape), and the tile bytes fetched on this thread. */
  stats = { shown: 0, built: 0, pending: 0, level: 0, real: -1, fetched: 0 };
  /** The body's real tiles: undefined while loading, null if there are none (the made-up shape is used). */
  private store: TileStore | null | undefined = undefined;

  readonly opts: TerrainOptions;

  constructor(opts: TerrainOptions, u: AirUniforms) {
    this.opts = opts;
    this.material = terrainMaterial(u);
    this.maxLevel = maxLevelFor(opts.segments, opts.minSpacing / opts.radius);
    this.index = new THREE.BufferAttribute(chunkIndex(opts.segments), 1);
    this.group.name = `terrain:${opts.body}`;
    // Real ground: nothing is built until the tiles' meta and base map have loaded (or failed), so the first patches
    // are never the made-up shape. The planet's own sphere stays up meanwhile.
    void loadRealTerrain(opts.body).then((st) => { this.store = st.ready ? st : null; });
  }

  private request(node: QNode, dist: number) {
    const c = this.chunks.get(nodeKey(node));
    if (c?.pending || c?.mesh) return;
    this.queue.push({ node, dist });
  }

  private accept(node: QNode, d: ChunkData) {
    const key = nodeKey(node);
    const c = this.chunks.get(key);
    if (!c) return; // evicted while building
    c.pending = false;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(d.normals, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(d.colors, 4));
    g.setIndex(this.index);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.material);
    m.visible = false;
    m.position.set(d.origin[0], d.origin[1], d.origin[2]);
    m.updateMatrix();
    m.matrixAutoUpdate = false;
    m.userData.real = d.real;
    this.group.add(m);
    c.mesh = m;
    c.minH = d.minH;
    c.maxH = d.maxH;
  }

  private dispatch() {
    const p = getPool();
    const reqOf = (node: QNode): ChunkRequest => ({
      body: this.opts.body, node, segments: this.opts.segments, radius: this.opts.radius,
      spacing: nodeEdge(node.level) / this.opts.segments,
    });
    // Coarse first, then nearest: a patch can only split once its children exist, so every level on the way down to
    // the ship has to be there (nearest-first left the middle levels unbuilt and the ground fell back to a whole face).
    // Ranked by distance over size: the patches round the camera at every level (ratio near 0) before anything far.
    const rank = (q: { node: QNode; dist: number }) => Math.floor((q.dist / nodeEdge(q.node.level)) * 4);
    this.queue.sort((a, b) => rank(a) - rank(b) || a.node.level - b.node.level || a.dist - b.dist);
    if (p && !poolFailed) {
      const cap = p.workers.length * 3;
      while (this.queue.length && this.inFlight < cap) {
        const { node } = this.queue.shift()!;
        const key = nodeKey(node);
        if (this.chunks.get(key)?.pending || this.chunks.get(key)?.mesh) continue;
        this.chunks.set(key, { node, mesh: null, pending: true, used: this.frame, minH: 0, maxH: 0 });
        let wi = 0;
        if (this.store) {
          // The worker that owns the patch's data tile, so each tile is fetched and decoded once.
          const t = chunkTiles(this.store, node).h;
          wi = (((t.L * 6 + t.f) * 73856093) ^ (t.i * 19349663) ^ (t.j * 83492791)) >>> 0;
          wi %= p.workers.length;
        } else for (let i = 1; i < p.workers.length; i++) if (p.busy[i] < p.busy[wi]) wi = i;
        const id = p.next++;
        p.busy[wi]++;
        this.inFlight++;
        p.waiting.set(id, { resolve: (d) => { this.inFlight--; this.accept(node, d); } });
        p.workers[wi].postMessage({ id, req: reqOf(node), real: !!this.store });
      }
    } else {
      // No workers (tests, or a browser without module workers): build here within a time budget.
      const t0 = performance.now();
      while (this.queue.length && performance.now() - t0 < 4) {
        const { node } = this.queue.shift()!;
        const key = nodeKey(node);
        if (this.chunks.get(key)?.mesh) continue;
        this.chunks.set(key, { node, mesh: null, pending: true, used: this.frame, minH: 0, maxH: 0 });
        this.accept(node, buildChunk(reqOf(node)));
      }
    }
    this.queue.length = 0;
  }

  /** Choose and show the patches for a camera at `cam` in the body's frame (scene units). */
  update(cam: THREE.Vector3) {
    this.frame++;
    if (this.store === undefined) return; // the tiles are still loading
    const R = this.opts.radius;
    const split = this.opts.split ?? 1.6;
    const cx = cam.x / R, cy = cam.y / R, cz = cam.z / R;
    // The horizon, as an angle from the point under the camera, pushed out for the tallest peaks beyond it.
    const camR = Math.max(1.0001, Math.hypot(cx, cy, cz));
    const peak = 1 + reliefOf(this.opts.body);
    const horizon = Math.acos(Math.min(1, 1 / camR)) + Math.acos(1 / peak);
    const show: Chunk[] = [];
    const d: [number, number, number] = [0, 0, 0];
    let deepest = 0;
    const cover = (node: QNode): boolean => {
      const key = nodeKey(node);
      const c = this.chunks.get(key);
      if (c) c.used = this.frame;
      const [a0, b0, s] = nodeRect(node);
      faceDir(node.face, a0 + s / 2, b0 + s / 2, d);
      // Wholly over the horizon: nothing to draw, nothing to build.
      if (node.level > 0 && Math.acos(Math.max(-1, Math.min(1, (cx * d[0] + cy * d[1] + cz * d[2]) / camR))) > horizon + nodeEdge(node.level) * 0.8) return true;
      // The patch's ground may stand up to its tallest peak: measure from there.
      const lift = 1 + (c?.mesh ? c.maxH : 0);
      const dist = Math.max(0, Math.hypot(cx - d[0] * lift, cy - d[1] * lift, cz - d[2] * lift) - nodeEdge(node.level) * 0.71);
      if (node.level < this.maxLevel && dist < split * nodeEdge(node.level)) {
        const start = show.length;
        let ok = true;
        for (let k = 0; k < 4; k++) if (!cover({ face: node.face, level: node.level + 1, i: node.i * 2 + (k & 1), j: node.j * 2 + (k >> 1) })) ok = false;
        if (ok) return true;
        show.length = start;
      }
      if (c?.mesh) { show.push(c); deepest = Math.max(deepest, node.level); return true; }
      this.request(node, dist);
      return false;
    };
    let roots = 0;
    for (let f = 0; f < 6; f++) if (cover({ face: f, level: 0, i: 0, j: 0 })) roots++;
    this.ready = roots === 6;
    this.dispatch();
    for (const c of this.chunks.values()) if (c.mesh) c.mesh.visible = false;
    if (this.ready) for (const c of show) c.mesh!.visible = true;
    this.evict();
    let built = 0;
    let pending = 0;
    for (const c of this.chunks.values()) { if (c.mesh) built++; if (c.pending) pending++; }
    let real = -1;
    if (this.ready) for (const c of show) real = Math.max(real, c.mesh!.userData.real as number);
    this.stats = { shown: this.ready ? show.length : 0, built, pending, level: deepest, real, fetched: this.store?.fetched ?? 0 };
  }

  /** Drop patches not needed for a while, oldest first, once there are more than the budget. */
  private evict() {
    const max = this.opts.maxChunks ?? 700;
    if (this.chunks.size <= max) return;
    const old = [...this.chunks.entries()].filter(([, c]) => c.used < this.frame - 30 && !c.pending && c.node.level > 0).sort((a, b) => a[1].used - b[1].used);
    for (const [key, c] of old.slice(0, this.chunks.size - max)) {
      if (c.mesh) { this.group.remove(c.mesh); c.mesh.geometry.dispose(); }
      this.chunks.delete(key);
    }
  }

  dispose() {
    for (const c of this.chunks.values()) if (c.mesh) { this.group.remove(c.mesh); c.mesh.geometry.dispose(); }
    this.chunks.clear();
    this.material.dispose();
    this.group.removeFromParent();
  }
}
