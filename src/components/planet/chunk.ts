/**
 * One patch of ground: a grid of (segments + 1)² vertices on the cube-sphere, displaced by the body's terrain height,
 * with normals from its neighbours (so lighting runs on across patch edges), a colour per vertex, and a skirt hanging
 * from each edge so no crack shows where a fine patch meets a coarse one. No three.js: it runs in a worker.
 *
 * Positions are in the body's own frame, in scene units, relative to the patch's own centre (`origin`, where the
 * mesh is placed). At real size (Earth R = 11,812 units) a body-frame float32 vertex steps by ~1e-3 units (half a
 * metre), which shimmers at 65 m spacing; relative to the patch it is exact to a millimetre, and three.js composes
 * model-view on the CPU in double precision.
 *
 * Where the body's real tiles are loaded (realTerrain.ts), heights come from the measured data plus the detail below
 * it, and colour from the measured albedo; otherwise from the made-up shape in terrain.ts.
 */
import { ATMO } from '../../lib/atmosphere';
import type { RGB } from '../../lib/atmosphere';
import { faceDir, groundColor, nodeEdge, nodeRect, reliefOf, terrainHeight } from '../../lib/terrain';
import type { GroundBody, QNode } from '../../lib/terrain';
import { realHeightOn, realStore, sampleColour } from '../../lib/realTerrain';
import type { TileStore } from '../../lib/realTerrain';

export interface ChunkRequest { body: GroundBody; node: QNode; segments: number; radius: number; spacing: number }
export interface ChunkData {
  positions: Float32Array; // xyz per vertex, grid then skirt
  normals: Float32Array;
  colors: Float32Array; // rgba: linear colour, and 1 where it is sea
  minH: number; // lowest and highest ground in the patch, fraction of R
  maxH: number;
  origin: [number, number, number]; // where the patch sits in the body's frame: positions are relative to it
  real: number; // the data tile level the heights came from, or -1 for the made-up shape
}

/**
 * The data tiles a patch reads: heights at level − 3 (a tile's 256 intervals are 8 × a patch's 32), capped at the
 * finest level; colour at that level capped at the colour's finest. Each is the patch's ancestor, so one tile each.
 */
export function chunkTiles(s: TileStore, node: QNode) {
  const L = Math.max(0, Math.min(s.maxLevel, node.level - 3));
  const d = node.level - L;
  const cmax = s.meta?.colour?.maxLevel ?? -1;
  const C = Math.min(L, cmax);
  return {
    h: { L, f: node.face, i: node.i >> d, j: node.j >> d },
    c: C >= 0 ? { L: C, f: node.face, i: node.i >> (node.level - C), j: node.j >> (node.level - C) } : null,
  };
}

/** Vertices in a patch: the grid, then four skirts of `segments` each (closing the ring). */
export const vertexCount = (n: number) => (n + 1) * (n + 1) + 4 * n;

/** Triangles for every patch with `n` segments: the grid, then each skirt as quads down from its edge. */
export function chunkIndex(n: number): Uint32Array {
  const idx: number[] = [];
  const g = (i: number, j: number) => j * (n + 1) + i;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = g(i, j), b = g(i + 1, j), c = g(i, j + 1), d = g(i + 1, j + 1);
    idx.push(a, b, c, b, d, c);
  }
  // The edge ring, in order round the patch, and the skirt vertex below each (ring position k → skirt base + k).
  const ring: number[] = [];
  for (let i = 0; i < n; i++) ring.push(g(i, 0));
  for (let j = 0; j < n; j++) ring.push(g(n, j));
  for (let i = n; i > 0; i--) ring.push(g(i, n));
  for (let j = n; j > 0; j--) ring.push(g(0, j));
  const base = (n + 1) * (n + 1);
  for (let k = 0; k < ring.length; k++) {
    const k2 = (k + 1) % ring.length;
    idx.push(ring[k], base + k, ring[k2], ring[k2], base + k, base + k2);
  }
  return new Uint32Array(idx);
}

export function buildChunk(req: ChunkRequest): ChunkData {
  const { body, node, segments: n, radius: R, spacing } = req;
  const sea = ATMO[body].sea;
  const [a0, b0, s] = nodeRect(node);
  const real = realStore(body);
  const want = real ? chunkTiles(real, node) : null;
  const tile = real && want ? real.get(want.h.L, want.h.f, want.h.i, want.h.j) ?? real.best(node.face, a0 + s / 2, b0 + s / 2, want.h.L) : undefined;
  const ctile = real && want?.c ? real.getColour(want.c.L, want.c.f, want.c.i, want.c.j) : undefined;
  const albedo: RGB = [0, 0, 0];
  const A = new Float64Array(ctile ? (n + 3) * (n + 3) * 3 : 0);
  const W = n + 3; // grid plus a border of one, for the normals at the edges
  const P = new Float64Array(W * W * 3);
  const H = new Float64Array(W * W); // raw height (below 0 is sea floor on Earth)
  const D = new Float64Array(W * W * 3);
  const dir: [number, number, number] = [0, 0, 0];
  let minH = Infinity;
  let maxH = -Infinity;
  for (let jj = 0; jj < W; jj++) for (let ii = 0; ii < W; ii++) {
    const k = jj * W + ii;
    faceDir(node.face, a0 + (s * (ii - 1)) / n, b0 + (s * (jj - 1)) / n, dir);
    const l = Math.hypot(dir[0], dir[1], dir[2]); // the border runs a cell past the face's edge: renormalise
    const x = dir[0] / l, y = dir[1] / l, z = dir[2] / l;
    const fa = a0 + (s * (ii - 1)) / n, fb = b0 + (s * (jj - 1)) / n;
    const h = real && tile ? realHeightOn(real, tile, node.face, fa, fb, x, y, z, spacing) : terrainHeight(body, x, y, z, spacing);
    if (ctile) { sampleColour(ctile, fa, fb, albedo); A[k * 3] = albedo[0]; A[k * 3 + 1] = albedo[1]; A[k * 3 + 2] = albedo[2]; }
    const touch = sea ? Math.max(0, h) : h;
    H[k] = h;
    const r = R * (1 + touch);
    P[k * 3] = x * r; P[k * 3 + 1] = y * r; P[k * 3 + 2] = z * r;
    D[k * 3] = x; D[k * 3 + 1] = y; D[k * 3 + 2] = z;
    if (ii > 0 && jj > 0 && ii < W - 1 && jj < W - 1) { minH = Math.min(minH, touch); maxH = Math.max(maxH, touch); }
  }
  // The patch's own origin: its centre on the datum sphere.
  const oc: [number, number, number] = [0, 0, 0];
  faceDir(node.face, a0 + s / 2, b0 + s / 2, oc);
  const ox = oc[0] * R, oy = oc[1] * R, oz = oc[2] * R;
  const count = vertexCount(n);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  const put = (v: number, k: number, drop: number) => {
    // Normal from the neighbours across and along.
    const kx0 = (k - 1) * 3, kx1 = (k + 1) * 3, ky0 = (k - W) * 3, ky1 = (k + W) * 3;
    const ux = P[kx1] - P[kx0], uy = P[kx1 + 1] - P[kx0 + 1], uz = P[kx1 + 2] - P[kx0 + 2];
    const vx = P[ky1] - P[ky0], vy = P[ky1 + 1] - P[ky0 + 1], vz = P[ky1 + 2] - P[ky0 + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    const dx = D[k * 3], dy = D[k * 3 + 1], dz = D[k * 3 + 2];
    if (nx * dx + ny * dy + nz * dz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const steep = Math.min(1, Math.max(0, (1 - (nx * dx + ny * dy + nz * dz)) * 5));
    positions[v * 3] = P[k * 3] - dx * drop - ox;
    positions[v * 3 + 1] = P[k * 3 + 1] - dy * drop - oy;
    positions[v * 3 + 2] = P[k * 3 + 2] - dz * drop - oz;
    const water = sea && H[k] < 0;
    if (water) { nx = dx; ny = dy; nz = dz; }
    normals[v * 3] = nx; normals[v * 3 + 1] = ny; normals[v * 3 + 2] = nz;
    const c = groundColor(body, dx, dy, dz, H[k], water ? 0 : steep, ctile ? [A[k * 3], A[k * 3 + 1], A[k * 3 + 2]] : null);
    colors[v * 4] = c[0]; colors[v * 4 + 1] = c[1]; colors[v * 4 + 2] = c[2]; colors[v * 4 + 3] = water ? 1 : 0;
  };
  const at = (i: number, j: number) => (j + 1) * W + (i + 1);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) put(j * (n + 1) + i, at(i, j), 0);
  // Skirts: the edge ring again, dropped below the ground by a few percent of the patch's width.
  const drop = R * nodeEdge(node.level) * 0.04 + R * reliefOf(body) * 0.05;
  let v = (n + 1) * (n + 1);
  for (let i = 0; i < n; i++) put(v++, at(i, 0), drop);
  for (let j = 0; j < n; j++) put(v++, at(n, j), drop);
  for (let i = n; i > 0; i--) put(v++, at(i, n), drop);
  for (let j = n; j > 0; j--) put(v++, at(0, j), drop);
  return { positions, normals, colors, minH, maxH, origin: [ox, oy, oz], real: real && tile ? tile.L : -1 };
}
