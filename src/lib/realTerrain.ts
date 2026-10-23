/**
 * Real ground: the bodies' measured elevation (NOAA ETOPO 2022, LRO LOLA, MGS MOLA, MESSENGER, Magellan), cut into
 * the same cube-sphere quadtree the chunks use, plus procedural detail below what the instruments resolved.
 *
 * Tiles are built outside the repo by `ascent-flight-data/scripts` (see its TERRAIN-PLAN.md) and served at
 * `/terrain/<body>/` (vite.config.ts serves them in dev). A tile is 259 × 259 uint16 samples over one quadtree node:
 * sample k sits at face coordinate a0 + s·(k − 1)/256, so there is a one-sample border past every edge. Heights are
 * `offset + scale_L · v` metres. A chunk at level Lc reads the tile at level Lc − 3 (256 tile intervals = 8 × the
 * chunk's 32), one tile per chunk; past the finest tile, it reads the finest ancestor and the detail takes over.
 *
 * No three.js: this runs in the terrain workers as well as on the main thread (collision).
 */
import type { RGB } from './atmosphere';
import { crater, ridged, smoothstep, snoise } from './noise';
import { FACES, faceDir } from './terrain';
import type { GroundBody } from './terrain';

export const TILE_T = 256;
export const TILE_N = TILE_T + 3;

export interface TerrainMeta {
  body: GroundBody;
  radius_km: number;
  maxLevel: number;
  baseLevel: number;
  encoding: { offset: number; format: string };
  levels: Record<string, { spacing_km: number; scale_m: number; tiles: number; bytes: number }>;
  base: { bytes: number; index: [number, number, number, number, number, number][] };
  tile_range_m: [number, number];
  colour?: { mode: 'L' | 'RGB'; maxLevel: number };
}

export interface Tile { L: number; f: number; i: number; j: number; v: Uint16Array; scale: number; offset: number }
export interface ColourTile { L: number; f: number; i: number; j: number; rgb: Uint8ClampedArray } // RGBA, TILE_N²

// ---------- decoding ----------
export async function inflate(bytes: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate');
  const src = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(src).arrayBuffer());
}

/**
 * Tile format v2 back to samples: two byte planes (low, then high) of zigzagged residuals, each sample predicted from
 * left + up − upleft (left on the first row, up on the first column), all mod 2^16. Mirrors tiler.py encode_values.
 */
export function decodeTile(raw: Uint8Array): Uint16Array {
  const N = TILE_N;
  const NN = N * N;
  if (raw.length < 2 * NN) throw new Error(`tile is ${raw.length} bytes, expected ${2 * NN}`);
  const v = new Uint16Array(NN);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = y * N + x;
      const z = raw[k] | (raw[NN + k] << 8);
      const r = (z >>> 1) ^ -(z & 1);
      const pred = y === 0 ? (x === 0 ? 0 : v[k - 1]) : x === 0 ? v[k - N] : v[k - 1] + v[k - N] - v[k - N - 1];
      v[k] = (r + pred) & 0xffff;
    }
  }
  return v;
}

// ---------- the inverse of faceDir ----------
/** A unit direction to its cube face and face coordinates (a, b), inverting `faceDir` by Newton's method. */
export function dirToFace(x: number, y: number, z: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  const f = ax >= ay && ax >= az ? (x > 0 ? 0 : 1) : ay >= az ? (y > 0 ? 2 : 3) : z > 0 ? 4 : 5;
  const { n, u, v } = FACES[f];
  const dn = x * n[0] + y * n[1] + z * n[2];
  let a = (x * u[0] + y * u[1] + z * u[2]) / dn; // the gnomonic point: within a few % of the answer
  let b = (x * v[0] + y * v[1] + z * v[2]) / dn;
  const P: [number, number, number] = [0, 0, 0], Pa: [number, number, number] = [0, 0, 0], Pb: [number, number, number] = [0, 0, 0];
  const e = 1e-6;
  for (let it = 0; it < 6; it++) {
    faceDir(f, a, b, P);
    const rx = x - P[0], ry = y - P[1], rz = z - P[2];
    const ra = rx * u[0] + ry * u[1] + rz * u[2], rb = rx * v[0] + ry * v[1] + rz * v[2];
    if (Math.abs(ra) + Math.abs(rb) < 1e-13) break;
    faceDir(f, a + e, b, Pa);
    faceDir(f, a, b + e, Pb);
    const j11 = ((Pa[0] - P[0]) * u[0] + (Pa[1] - P[1]) * u[1] + (Pa[2] - P[2]) * u[2]) / e;
    const j12 = ((Pb[0] - P[0]) * u[0] + (Pb[1] - P[1]) * u[1] + (Pb[2] - P[2]) * u[2]) / e;
    const j21 = ((Pa[0] - P[0]) * v[0] + (Pa[1] - P[1]) * v[1] + (Pa[2] - P[2]) * v[2]) / e;
    const j22 = ((Pb[0] - P[0]) * v[0] + (Pb[1] - P[1]) * v[1] + (Pb[2] - P[2]) * v[2]) / e;
    const det = j11 * j22 - j12 * j21;
    a = Math.max(-1, Math.min(1, a + (j22 * ra - j12 * rb) / det));
    b = Math.max(-1, Math.min(1, b + (-j21 * ra + j11 * rb) / det));
  }
  out[0] = f; out[1] = a; out[2] = b;
  return out;
}

/** Latitude and longitude (degrees, east positive) of a direction: conquest's convention (anchors.ts dirOf). */
export const latLonOf = (x: number, y: number, z: number) => ({
  lat: (Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI,
  lon: (Math.atan2(-z, x) * 180) / Math.PI,
});

// ---------- sampling ----------
/** The tile (at `L`) holding face point (a, b), as its cell indices. */
export function tileOf(L: number, a: number, b: number): [number, number] {
  const n = 1 << L;
  const s = 2 / n;
  return [Math.max(0, Math.min(n - 1, Math.floor((a + 1) / s))), Math.max(0, Math.min(n - 1, Math.floor((b + 1) / s)))];
}

const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));

/** What the data says at a point: height (m), a roughness (m, the local Laplacian) and slope (rise over run). */
export interface DataSample { h: number; rough: number; slope: number }

/** Bicubic (Catmull-Rom) height at face point (a, b) from a tile, which needn't contain it beyond its border. */
export function sampleTile(t: Tile, a: number, b: number, spacingM: number, out: DataSample): DataSample {
  const N = TILE_N;
  const s = 2 / (1 << t.L);
  const ka = ((a - (-1 + t.i * s)) / s) * TILE_T + 1;
  const kb = ((b - (-1 + t.j * s)) / s) * TILE_T + 1;
  const x1 = Math.max(1, Math.min(N - 3, Math.floor(ka)));
  const y1 = Math.max(1, Math.min(N - 3, Math.floor(kb)));
  const fx = Math.max(0, Math.min(1, ka - x1)), fy = Math.max(0, Math.min(1, kb - y1));
  const V = t.v;
  const row = (y: number) => {
    const o = y * N + x1;
    return cr(V[o - 1], V[o], V[o + 1], V[o + 2], fx);
  };
  const v = cr(row(y1 - 1), row(y1), row(y1 + 1), row(y1 + 2), fy);
  const c = y1 * N + x1;
  const lap = 4 * V[c] - V[c - 1] - V[c + 1] - V[c - N] - V[c + N];
  const gx = (V[c + 1] - V[c - 1]) * 0.5, gy = (V[c + N] - V[c - N]) * 0.5;
  out.h = t.offset + t.scale * v;
  out.rough = Math.abs(lap) * t.scale;
  out.slope = (Math.hypot(gx, gy) * t.scale) / Math.max(1, spacingM);
  return out;
}

/** The colour tile's RGB (0..1) at face point (a, b), bilinear. */
export function sampleColour(t: ColourTile, a: number, b: number, out: RGB): RGB {
  const N = TILE_N;
  const s = 2 / (1 << t.L);
  const ka = Math.max(0, Math.min(N - 1.001, ((a - (-1 + t.i * s)) / s) * TILE_T + 1));
  const kb = Math.max(0, Math.min(N - 1.001, ((b - (-1 + t.j * s)) / s) * TILE_T + 1));
  const x0 = Math.floor(ka), y0 = Math.floor(kb), fx = ka - x0, fy = kb - y0;
  for (let c = 0; c < 3; c++) {
    const p = (yy: number, xx: number) => t.rgb[(yy * N + xx) * 4 + c];
    out[c] = ((p(y0, x0) * (1 - fx) + p(y0, x0 + 1) * fx) * (1 - fy) + (p(y0 + 1, x0) * (1 - fx) + p(y0 + 1, x0 + 1) * fx) * fy) / 255;
  }
  return out;
}

// ---------- detail below the data ----------
/**
 * Procedural relief (metres) at wavelengths the data cannot hold: from about twice the data spacing `dataM` down to
 * the vertex spacing `vertM`. Its amplitude follows the data's own roughness there as a power law, so rough highlands
 * get rough detail and smooth plains stay smooth; then each body adds what its surface is made of. Deterministic.
 */
export function detailM(body: GroundBody, x: number, y: number, z: number, R: number, dataM: number, vertM: number, d: DataSample): number {
  if (vertM * 2.5 >= dataM * 2) return 0; // the data already resolves everything a vertex can show
  const P = BODY_DETAIL[body];
  const sigma = Math.max(P.floor * dataM * 1e-3, Math.min(0.06 * dataM, 0.4 * d.rough));
  let sum = 0;
  let lam = dataM * 2;
  const stop = vertM * 2.5;
  for (let o = 0; o < 12 && lam >= stop; o++) {
    const k = R / lam;
    const amp = sigma * Math.pow(lam / dataM, P.H);
    // Fade the first octave in, so the data's own shape is never doubled.
    const w = o === 0 ? 0.5 : 1;
    sum += w * amp * snoise(x * k + o * 7.1, y * k + o * 3.3, z * k + o * 5.7);
    lam /= 2.03;
  }
  if (body === 'moon' || body === 'mercury') {
    // Craters below the data: bowls 0.2 D deep, denser on rough (old) ground.
    const density = 0.4 + 0.6 * smoothstep(0.2 * sigma, 2 * sigma, d.rough);
    for (let D = dataM * 1.5, s = 0; D >= vertM * 4 && s < 8; D /= 2.4, s++) {
      const k = R / (D * 3);
      sum += 0.2 * D * density * crater(x * k + s * 13.7, y * k + s * 2.9, z * k + s * 8.3);
    }
  } else if (body === 'mars') {
    // Layered cliffs: on steep ground (canyon and crater walls), terrace the detail into strata.
    const steep = smoothstep(0.12, 0.35, d.slope);
    if (steep > 0 && vertM < 150) {
      const strata = 120;
      const hh = d.h + sum;
      const q = Math.round(hh / strata) * strata + strata * 0.2 * snoise(x * R / 2000, y * R / 2000, z * R / 2000);
      sum += (q - hh) * steep * 0.6;
    }
    // Dunes: in low, flat places (crater floors, Hellas, the north polar erg).
    const low = smoothstep(-1500, -4000, d.h) + smoothstep(0.93, 0.96, y);
    if (low > 0 && vertM < 120) {
      const k = R / 350;
      sum += low * (1 - smoothstep(0.03, 0.09, d.slope)) * 18 * (1 - Math.abs(snoise(x * k * 0.3, y * k, z * k * 0.6)));
    }
  } else if (body === 'earth') {
    // Hold the coastline the data draws: no detail crosses sea level except within a few metres.
    const coast = smoothstep(2, 60, Math.abs(d.h));
    if (d.h > 0 && vertM < 400) {
      // Erosion: ridges and valleys on steep ground, flat where the data is flat.
      const k = R / Math.max(dataM * 0.6, 300);
      const steep = smoothstep(0.03, 0.3, d.slope);
      sum += steep * 0.08 * dataM * (ridged(x * k, y * k, z * k, 4) - 0.5);
    }
    sum *= coast;
  } else {
    // Venus: tesserae where the data is rough (two crossing ridge sets); near-glassy plains elsewhere.
    const tess = smoothstep(0.5 * sigma, 3 * sigma, d.rough);
    if (tess > 0) {
      const k1 = R / 6000, k2 = R / 4200;
      sum += tess * 140 * (ridged(x * k1, y * k1 * 3, z * k1, 3) + ridged(x * k2 * 3, y * k2, z * k2 + 9, 3) - 1);
    }
  }
  return sum;
}

/** Per body: H, the roughness exponent below the data; floor, the least roughness (m per km of data spacing). */
const BODY_DETAIL: Record<GroundBody, { H: number; floor: number }> = {
  earth: { H: 0.7, floor: 6 },
  moon: { H: 0.9, floor: 10 },
  mercury: { H: 0.9, floor: 10 },
  mars: { H: 0.8, floor: 8 },
  venus: { H: 0.6, floor: 2 },
};

// ---------- the store ----------
const key = (L: number, f: number, i: number, j: number) => `${L}/${f}/${i}/${j}`;

/** Where the tiles are served: `/terrain/<body>/`. */
export const terrainUrl = (body: GroundBody) => `${(import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/')}terrain/${body}/`;

/**
 * One body's tiles: its meta, the base map (levels 0..base, always held) and an LRU of finer tiles, fetched on demand.
 * `get` is synchronous (what is loaded now); `ensure` fetches.
 */
export class TileStore {
  meta: TerrainMeta | null = null;
  ready = false;
  failed = false;
  private tiles = new Map<string, Tile>();
  private colours = new Map<string, ColourTile>();
  private pending = new Map<string, Promise<Tile | null>>();
  private cPending = new Map<string, Promise<ColourTile | null>>();
  private use = new Map<string, number>();
  private tick = 0;
  readonly url: string;
  /** Bytes fetched (for the frame-time notes). */
  fetched = 0;

  readonly body: GroundBody;
  readonly cap: number;

  constructor(body: GroundBody, url?: string, cap = 160) {
    this.body = body;
    this.cap = cap;
    this.url = url ?? terrainUrl(body);
  }

  get R(): number { return (this.meta?.radius_km ?? 1) * 1000; }
  get maxLevel(): number { return this.meta?.maxLevel ?? 0; }
  /** Highest ground in the tiles, as a fraction of R (for horizon culling and skirts). */
  get relief(): number { return this.meta ? Math.max(1, this.meta.tile_range_m[1]) / this.R : 0; }
  spacingM(L: number): number { return (Math.PI / 2) * this.R / (1 << L) / TILE_T; }

  async init(withBase = true): Promise<boolean> {
    try {
      const r = await fetch(this.url + 'meta.json');
      if (!r.ok) throw new Error(`meta ${r.status}`);
      this.meta = (await r.json()) as TerrainMeta;
      if (withBase) {
        const br = await fetch(this.url + 'base.bin');
        if (!br.ok) throw new Error(`base ${br.status}`);
        const buf = new Uint8Array(await br.arrayBuffer());
        this.fetched += buf.length;
        await Promise.all(this.meta.base.index.map(async ([L, f, i, j, off, len]) => {
          this.put(L, f, i, j, decodeTile(await inflate(buf.subarray(off, off + len))), true);
        }));
      }
      this.ready = true;
    } catch {
      this.failed = true;
    }
    return this.ready;
  }

  private put(L: number, f: number, i: number, j: number, v: Uint16Array, pinned = false): Tile {
    const m = this.meta!;
    const t: Tile = { L, f, i, j, v, scale: m.levels[String(L)].scale_m, offset: m.encoding.offset };
    const k = key(L, f, i, j);
    this.tiles.set(k, t);
    this.use.set(k, pinned ? Infinity : ++this.tick);
    if (this.tiles.size > this.cap) {
      let oldest = '', age = Infinity;
      for (const [kk, u] of this.use) if (u < age) { age = u; oldest = kk; }
      if (oldest) { this.tiles.delete(oldest); this.use.delete(oldest); }
    }
    return t;
  }

  get(L: number, f: number, i: number, j: number): Tile | undefined {
    const k = key(L, f, i, j);
    const t = this.tiles.get(k);
    if (t && this.use.get(k) !== Infinity) this.use.set(k, ++this.tick);
    return t;
  }

  /** The tile at (L, f, i, j), fetching it if needed. Null if it cannot be had. */
  ensure(L: number, f: number, i: number, j: number): Promise<Tile | null> {
    const t = this.get(L, f, i, j);
    if (t) return Promise.resolve(t);
    if (!this.meta || L > this.meta.maxLevel) return Promise.resolve(null);
    const k = key(L, f, i, j);
    let p = this.pending.get(k);
    if (!p) {
      p = (async () => {
        try {
          const r = await fetch(`${this.url}h/${L}/${f}/${i}_${j}.bin`);
          if (!r.ok) return null;
          const buf = await r.arrayBuffer();
          this.fetched += buf.byteLength;
          return this.put(L, f, i, j, decodeTile(await inflate(buf)));
        } catch {
          return null;
        } finally {
          this.pending.delete(k);
        }
      })();
      this.pending.set(k, p);
    }
    return p;
  }

  /** The deepest loaded tile at or above `L` holding face point (a, b). */
  best(f: number, a: number, b: number, L: number): Tile | undefined {
    for (let l = Math.min(L, this.maxLevel); l >= 0; l--) {
      const [i, j] = tileOf(l, a, b);
      const t = this.get(l, f, i, j);
      if (t) return t;
    }
    return undefined;
  }

  getColour(L: number, f: number, i: number, j: number): ColourTile | undefined {
    return this.colours.get(key(L, f, i, j));
  }

  /** The colour tile, decoded through an OffscreenCanvas (workers and modern browsers only; null elsewhere). */
  ensureColour(L: number, f: number, i: number, j: number): Promise<ColourTile | null> {
    const m = this.meta;
    if (!m?.colour || L > m.colour.maxLevel || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return Promise.resolve(null);
    const k = key(L, f, i, j);
    const have = this.colours.get(k);
    if (have) return Promise.resolve(have);
    let p = this.cPending.get(k);
    if (!p) {
      p = (async () => {
        try {
          const r = await fetch(`${this.url}c/${L}/${f}/${i}_${j}.jpg`);
          if (!r.ok) return null;
          const blob = await r.blob();
          this.fetched += blob.size;
          const bmp = await createImageBitmap(blob);
          const cv = new OffscreenCanvas(bmp.width, bmp.height);
          const ctx = cv.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(bmp, 0, 0);
          const c: ColourTile = { L, f, i, j, rgb: ctx.getImageData(0, 0, bmp.width, bmp.height).data };
          if (this.colours.size > this.cap) this.colours.delete(this.colours.keys().next().value as string);
          this.colours.set(k, c);
          return c;
        } catch {
          return null;
        } finally {
          this.cPending.delete(k);
        }
      })();
      this.cPending.set(k, p);
    }
    return p;
  }
}

// ---------- the registry, read by terrain.ts ----------
const stores = new Map<GroundBody, TileStore>();
export const realStore = (body: GroundBody): TileStore | undefined => {
  const s = stores.get(body);
  return s?.ready ? s : undefined;
};
/** Start (once) loading a body's real ground. Resolves with the store, ready or failed. */
export function loadRealTerrain(body: GroundBody, withBase = true): Promise<TileStore> {
  let s = stores.get(body);
  if (!s) {
    s = new TileStore(body);
    stores.set(body, s);
    const st = s;
    return st.init(withBase).then(() => st);
  }
  return Promise.resolve(s);
}

const SAMPLE: DataSample = { h: 0, rough: 0, slope: 0 };
const FAB: [number, number, number] = [0, 0, 0];

/**
 * Real height (fraction of R) in direction (x, y, z), detailed down to `spacing` (fraction of R), from the deepest
 * tile loaded; asks for the finest one under the point. For collision and anything else on the main thread.
 */
export function realHeightDir(s: TileStore, x: number, y: number, z: number, spacing: number): number {
  dirToFace(x, y, z, FAB);
  const [f, a, b] = FAB;
  const t = s.best(f, a, b, s.maxLevel);
  if (!t) return 0;
  if (t.L < s.maxLevel) {
    const [i, j] = tileOf(s.maxLevel, a, b);
    void s.ensure(s.maxLevel, f, i, j);
  }
  return realHeightOn(s, t, f, a, b, x, y, z, spacing);
}

/** Real height (fraction of R) at face point (a, b) of face f (direction x, y, z) from tile `t`. */
export function realHeightOn(s: TileStore, t: Tile, _f: number, a: number, b: number, x: number, y: number, z: number, spacing: number): number {
  const R = s.R;
  const dataM = s.spacingM(t.L);
  sampleTile(t, a, b, dataM, SAMPLE);
  return (SAMPLE.h + detailM(s.body, x, y, z, R, dataM, spacing * R, SAMPLE)) / R;
}
