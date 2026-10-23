/**
 * 3D noise on the CPU, for terrain heights that collision and rendering share.
 *
 * `snoise` is a line-for-line port of the GLSL simplex noise the planet shaders use (Ian McEwan, Ashima Arts /
 * Stefan Gustavson, "webgl-noise", MIT licence), and `fbm` matches the shaders' fbm, so continents and maria seen
 * close up sit where they sit seen from space. Pure functions, no allocation in the hot path.
 */

const mod289 = (x: number) => x - Math.floor(x * (1 / 289)) * 289;
const permute = (x: number) => mod289((x * 34 + 10) * x);
const taylorInvSqrt = (r: number) => 1.79284291400159 - 0.85373472095314 * r;

// The shader's constants as the GPU holds them (float32). In double precision 7 × 0.142857142857 floors to 0, where
// the GPU's 1.0000000447 floors to 1, and the gradients come out of range.
const NS_Z = Math.fround(0.142857142857);
const NS_X = Math.fround(2 * NS_Z);
const NS_Y = Math.fround(0.5 * NS_Z - 1);

/** Simplex noise in 3D, roughly -1..1. */
export function snoise(vx: number, vy: number, vz: number): number {
  const s = (vx + vy + vz) / 3;
  const ix = Math.floor(vx + s);
  const iy = Math.floor(vy + s);
  const iz = Math.floor(vz + s);
  const t = (ix + iy + iz) / 6;
  const x0x = vx - ix + t;
  const x0y = vy - iy + t;
  const x0z = vz - iz + t;
  // g = step(x0.yzx, x0.xyz); l = 1 - g; i1 = min(g, l.zxy); i2 = max(g, l.zxy)
  const gx = x0x >= x0y ? 1 : 0;
  const gy = x0y >= x0z ? 1 : 0;
  const gz = x0z >= x0x ? 1 : 0;
  const lx = 1 - gx, ly = 1 - gy, lz = 1 - gz;
  const i1x = Math.min(gx, lz), i1y = Math.min(gy, lx), i1z = Math.min(gz, ly);
  const i2x = Math.max(gx, lz), i2y = Math.max(gy, lx), i2z = Math.max(gz, ly);
  const mx = mod289(ix), my = mod289(iy), mz = mod289(iz);

  let sum = 0;
  for (let k = 0; k < 4; k++) {
    // Corner k: offsets 0, i1, i2, 1 and the matching x0, x1, x2, x3.
    const ox = k === 0 ? 0 : k === 1 ? i1x : k === 2 ? i2x : 1;
    const oy = k === 0 ? 0 : k === 1 ? i1y : k === 2 ? i2y : 1;
    const oz = k === 0 ? 0 : k === 1 ? i1z : k === 2 ? i2z : 1;
    const c = k / 6; // C.xxx for x1 (1/6), C.yyy for x2 (1/3), D.yyy for x3 (1/2)
    const xx = x0x - ox + c;
    const xy = x0y - oy + c;
    const xz = x0z - oz + c;
    let m = 0.5 - (xx * xx + xy * xy + xz * xz);
    if (m <= 0) continue;
    const p = permute(permute(permute(mz + oz) + my + oy) + mx + ox);
    const j = p - 49 * Math.floor(p * NS_Z * NS_Z);
    const x_ = Math.floor(j * NS_Z);
    const y_ = Math.floor(j - 7 * x_);
    const gxk = x_ * NS_X + NS_Y;
    const gyk = y_ * NS_X + NS_Y;
    const h = 1 - Math.abs(gxk) - Math.abs(gyk);
    const sh = h <= 0 ? -1 : 0;
    const px = gxk + (Math.floor(gxk) * 2 + 1) * sh;
    const py = gyk + (Math.floor(gyk) * 2 + 1) * sh;
    const pz = h;
    const norm = taylorInvSqrt(px * px + py * py + pz * pz);
    m *= m;
    sum += m * m * (px * xx + py * xy + pz * xz) * norm;
  }
  return 105 * sum;
}

/** Fractal noise as the shaders sum it: each octave 2.03× the frequency and half the amplitude. Roughly -1..1. */
export function fbm(x: number, y: number, z: number, octaves = 6): number {
  let a = 0.5;
  let s = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * snoise(x, y, z);
    x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; z = z * 2.03 + 3.1;
    a *= 0.5;
  }
  return s;
}

/**
 * Ridged fractal noise for mountain ranges: sharp crests where the noise crosses zero, each octave weighted by the
 * one before so ridges carry the fine detail and valleys stay smooth. 0..1.
 */
export function ridged(x: number, y: number, z: number, octaves: number): number {
  let a = 0.5;
  let s = 0;
  let w = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(snoise(x, y, z));
    n *= n;
    n *= w;
    w = Math.min(1, n * 2);
    s += a * n;
    norm += a;
    x = x * 2.07 + 5.3; y = y * 2.07 + 1.1; z = z * 2.07 + 7.9;
    a *= 0.5;
  }
  return norm > 0 ? s / norm : 0;
}

/** A cheap integer hash of a lattice cell to a feature point inside it, kept to the middle half of the cell. */
function feature(ix: number, iy: number, iz: number, out: number[]) {
  let h = (Math.imul(ix, 0x8da6b343) ^ Math.imul(iy, 0xd8163841) ^ Math.imul(iz, 0xcb1ab31f)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  h >>>= 0;
  out[0] = 0.25 + 0.5 * ((h & 1023) / 1024);
  out[1] = 0.25 + 0.5 * (((h >>> 10) & 1023) / 1024);
  out[2] = 0.25 + 0.5 * (((h >>> 20) & 1023) / 1024);
}

const tmp = [0, 0, 0];
/**
 * Distance to the nearest feature point, with a smooth minimum so cell borders leave no crease. About 0..1.
 * Feature points sit in the middle half of each cell, so the nearest is always in one of the 8 cells on the near
 * side of each axis: 8 lookups instead of 27.
 */
export function worley(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx < 0.5 ? -1 : 1, sy = fy < 0.5 ? -1 : 1, sz = fz < 0.5 ? -1 : 1;
  let s = 0;
  for (let k = 0; k < 8; k++) {
    const a = k & 1 ? sx : 0, b = k & 2 ? sy : 0, c = k & 4 ? sz : 0;
    feature(ix + a, iy + b, iz + c, tmp);
    const rx = a + tmp[0] - fx, ry = b + tmp[1] - fy, rz = c + tmp[2] - fz;
    s += Math.exp(-14 * Math.sqrt(rx * rx + ry * ry + rz * rz));
  }
  return s > 0 ? Math.max(-Math.log(s) / 14, 0) : 1;
}

/** A crater: a bowl with a raised rim, zero away from craters (same shape as the shaders' crater()). */
export function crater(x: number, y: number, z: number): number {
  const d = worley(x, y, z);
  const k = (d - 0.52) * 9;
  const sm = Math.min(1, Math.max(0, d / 0.55));
  return (sm * sm * (3 - 2 * sm) - 1) * 0.8 + 0.45 * Math.exp(-k * k);
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
