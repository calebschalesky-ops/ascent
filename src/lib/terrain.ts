/**
 * Terrain for the bodies with ground: one height function per body, shared by the meshes you see and the collision
 * that stops you, and the cube-sphere quadtree that decides which patches of ground are drawn at what detail.
 * Pure functions, no three.js.
 *
 * Every length here is a fraction of the body's radius R, so it carries across a change of scale: a height of 0.01
 * is 1% of R above sea level, and a vertex spacing is given the same way. Directions are unit vectors in the body's
 * own (spinning) frame, the same frame the planet shaders colour, so continents line up with the view from space.
 */
import { ATMO } from './atmosphere';
import type { AirBody, RGB } from './atmosphere';
import { crater, fbm, ridged, smoothstep, snoise } from './noise';
import { realHeightDir, realStore } from './realTerrain';

export type GroundBody = Exclude<AirBody, 'jupiter' | 'saturn'>;
export const hasGround = (b: AirBody): b is GroundBody => ATMO[b].surface;

// ---------- the cube-sphere ----------
/** The six faces of the cube: outward normal, and the two axes across it (right-handed: u × v = n). */
export const FACES: { n: [number, number, number]; u: [number, number, number]; v: [number, number, number] }[] = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];

/**
 * A point on face f at (a, b) in [-1, 1]² to a unit direction. Uses the mapping that spreads cells evenly
 * (x' = x √(1 − y²/2 − z²/2 + y²z²/3), and so on), so cells near the cube's corners are not squeezed.
 */
export function faceDir(f: number, a: number, b: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const F = FACES[f];
  const x = F.n[0] + F.u[0] * a + F.v[0] * b;
  const y = F.n[1] + F.u[1] * a + F.v[1] * b;
  const z = F.n[2] + F.u[2] * a + F.v[2] * b;
  const x2 = x * x, y2 = y * y, z2 = z * z;
  out[0] = x * Math.sqrt(Math.max(0, 1 - y2 / 2 - z2 / 2 + (y2 * z2) / 3));
  out[1] = y * Math.sqrt(Math.max(0, 1 - z2 / 2 - x2 / 2 + (z2 * x2) / 3));
  out[2] = z * Math.sqrt(Math.max(0, 1 - x2 / 2 - y2 / 2 + (x2 * y2) / 3));
  return out;
}

/** A quadtree node: face, level (0 = a whole face) and its cell (i, j) of 2^level × 2^level. */
export interface QNode { face: number; level: number; i: number; j: number }
export const nodeKey = (n: QNode) => `${n.face}/${n.level}/${n.i}/${n.j}`;
/** The node's square on its face, as [a0, b0, size] in face coordinates. */
export function nodeRect(n: QNode): [number, number, number] {
  const size = 2 / (1 << n.level);
  return [-1 + n.i * size, -1 + n.j * size, size];
}
/** Edge length of a node's patch of ground, as a fraction of R (a face is a quarter of a great circle). */
export const nodeEdge = (level: number) => Math.PI / 2 / (1 << level);

/** The finest level whose vertex spacing (edge / segments) is still at least `minSpacing` (fraction of R). */
export const maxLevelFor = (segments: number, minSpacing: number) =>
  Math.max(0, Math.min(16, Math.floor(Math.log2(nodeEdge(0) / (segments * minSpacing)))));

/**
 * The patches to draw, for a camera at `cam` (body frame, in units of R, so |cam| = 1 + altitude). A patch splits
 * into four while the camera is closer to it than `split` × its edge, down to `maxLevel`. Returns the leaves.
 */
export function selectLeaves(cam: [number, number, number], maxLevel: number, split = 2.2): QNode[] {
  const out: QNode[] = [];
  const d: [number, number, number] = [0, 0, 0];
  const visit = (n: QNode) => {
    const [a0, b0, s] = nodeRect(n);
    faceDir(n.face, a0 + s / 2, b0 + s / 2, d);
    // Distance to the patch: to its centre on the sphere, less half its diagonal (never below zero).
    const dist = Math.max(0, Math.hypot(cam[0] - d[0], cam[1] - d[1], cam[2] - d[2]) - nodeEdge(n.level) * 0.71);
    if (n.level < maxLevel && dist < split * nodeEdge(n.level)) {
      for (let k = 0; k < 4; k++) visit({ face: n.face, level: n.level + 1, i: n.i * 2 + (k & 1), j: n.j * 2 + (k >> 1) });
    } else out.push(n);
  };
  for (let f = 0; f < 6; f++) visit({ face: f, level: 0, i: 0, j: 0 });
  return out;
}

// ---------- heights ----------
/** Octaves of a noise at base frequency `freq` (on the unit sphere) worth adding at this vertex spacing. */
const octavesFor = (freq: number, gain: number, spacing: number, max: number) => {
  // Octave i has wavelength 1 / (freq × gain^i); keep it while it spans at least 2.5 vertices.
  const n = Math.floor(Math.log(1 / (freq * spacing * 2.5)) / Math.log(gain)) + 1;
  return Math.max(1, Math.min(max, n));
};

/**
 * Height of the ground above the datum in direction (x, y, z), as a fraction of R, detailed down to `spacing`
 * (fraction of R; finer adds octaves). Below 0 is sea floor on Earth; `groundHeight` gives what you can touch.
 */
export function terrainHeight(body: GroundBody, x: number, y: number, z: number, spacing = 1e-4): number {
  // The measured ground, once its tiles are loaded (realTerrain.ts); the made-up shape below until then.
  const real = realStore(body);
  if (real) return realHeightDir(real, x, y, z, spacing);
  const relief = ATMO[body].relief;
  if (body === 'earth') {
    const c = fbm(x * 2.2, y * 2.2, z * 2.2, 6); // the same continents as the planet shader
    const coast = c - 0.02;
    if (coast <= 0) return coast * relief * 0.6;
    const land = smoothstep(0, 0.05, coast);
    const hills = 0.5 + 0.5 * fbm(x * 9 + 3, y * 9 + 3, z * 9 + 3, octavesFor(9, 2.03, spacing, 5));
    const range = smoothstep(0.06, 0.3, c + 0.25 * fbm(x * 3.3 + 11, y * 3.3, z * 3.3, 3));
    const ridge = range > 0.001 ? ridged(x * 14, y * 14, z * 14, octavesFor(14, 2.07, spacing, 9)) : 0;
    return relief * land * (0.03 + 0.12 * hills * (1 - range * 0.5) + 0.85 * range * ridge * ridge);
  }
  if (body === 'moon' || body === 'mercury') {
    let h = 0.35 * fbm(x * 3, y * 3, z * 3, octavesFor(3, 2.03, spacing, 8));
    const crs: [number, number, number][] = [[5, 0.55, 0], [11, 0.3, 3.1], [23, 0.16, 7.7], [61, 0.07, 1.9], [130, 0.035, 4.4], [290, 0.018, 2.6]];
    for (const [f, a, o] of crs) if (1 / f > spacing * 3) h += a * crater(x * f + o, y * f + o, z * f + o);
    return relief * 1.4 * h;
  }
  if (body === 'mars') {
    let h = 0.45 * fbm(x * 2.5, y * 2.5, z * 2.5, octavesFor(2.5, 2.03, spacing, 8));
    if (1 / 9 > spacing * 3) h += 0.25 * crater(x * 9, y * 9, z * 9);
    if (1 / 40 > spacing * 3) h += 0.08 * crater(x * 40 + 2, y * 40 + 2, z * 40 + 2);
    const mesa = smoothstep(-0.05, 0.3, fbm(x * 3 + 4, y * 3, z * 3, 3));
    h += 0.4 * mesa * ridged(x * 12, y * 12, z * 12, octavesFor(12, 2.07, spacing, 8));
    return relief * 1.4 * h;
  }
  // Venus: volcanic plains, ridged highlands.
  let h = 0.4 * fbm(x * 3, y * 3, z * 3, octavesFor(3, 2.03, spacing, 8));
  const high = smoothstep(0.05, 0.4, fbm(x * 2 + 8, y * 2, z * 2, 3));
  h += 0.5 * high * ridged(x * 10, y * 10, z * 10, octavesFor(10, 2.07, spacing, 8));
  return relief * 1.6 * h;
}

/** The highest ground as a fraction of R: the real data's, once loaded, else the made-up shape's. */
export function reliefOf(body: GroundBody): number {
  const real = realStore(body);
  return real ? real.relief : ATMO[body].relief;
}

/** What you can touch: the ground, or the sea surface over it. Fraction of R above the datum. */
export function groundHeight(body: GroundBody, x: number, y: number, z: number, spacing = 1e-4): number {
  const h = terrainHeight(body, x, y, z, spacing);
  return ATMO[body].sea ? Math.max(0, h) : h;
}

// ---------- colour ----------
const lin = (r: number, g: number, b: number): RGB => [r ** 2.2, g ** 2.2, b ** 2.2];
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const C = {
  deep: lin(0.02, 0.1, 0.28), shallow: lin(0.05, 0.25, 0.42), green: lin(0.17, 0.3, 0.12), dry: lin(0.62, 0.52, 0.34),
  rock: lin(0.42, 0.39, 0.36), forest: lin(0.08, 0.18, 0.07), field: lin(0.45, 0.47, 0.22), snow: lin(0.93, 0.95, 0.98), beach: lin(0.76, 0.7, 0.52),
  moonLight: lin(0.7, 0.69, 0.66), moonDark: lin(0.3, 0.3, 0.31), merLight: lin(0.58, 0.54, 0.5), merDark: lin(0.38, 0.35, 0.33),
  marsLight: lin(0.76, 0.38, 0.2), marsDark: lin(0.4, 0.18, 0.1), marsDust: lin(0.85, 0.55, 0.36),
  venusLight: lin(0.66, 0.5, 0.34), venusDark: lin(0.36, 0.25, 0.17),
};

/**
 * Ground colour (linear RGB) at a direction, its height h (fraction of R) and its steepness (0 flat .. 1 cliff).
 * The palettes follow the planet shaders, so the ground close up matches the planet seen from space.
 */
export function groundColor(body: GroundBody, x: number, y: number, z: number, h: number, steep: number, albedo?: RGB | null): RGB {
  const relief = reliefOf(body);
  const hr = h / relief;
  // A measured colour map (realTerrain.ts colour tiles, 0..1 sRGB): albedo from the orbiters, slope and caps on top.
  if (albedo && body !== 'earth') return measuredColor(body, x, y, z, albedo, steep);
  if (body === 'earth') {
    if (h <= 0) return mix(C.deep, C.shallow, smoothstep(-0.25, 0, hr));
    const dry = smoothstep(0.1, 0.5, fbm(x * 3 + 9, y * 3 + 9, z * 3 + 9, 4)) * (1 - smoothstep(0.25, 0.5, Math.abs(Math.abs(y) - 0.3)));
    let col = mix(C.green, C.dry, dry);
    // Patches of forest and field, and a fine mottling, so plains are not one flat green close up.
    const patch = fbm(x * 90 + 3, y * 90, z * 90, 4);
    col = mix(col, C.forest, smoothstep(0.0, 0.35, patch) * (1 - dry) * 0.8);
    col = mix(col, C.field, smoothstep(0.1, 0.4, -patch) * 0.45);
    const k = 0.88 + 0.24 * (0.5 + 0.5 * snoise(x * 700, y * 700, z * 700));
    col = [col[0] * k, col[1] * k, col[2] * k];
    col = mix(col, C.beach, 1 - smoothstep(0.004, 0.02, hr));
    col = mix(col, C.rock, Math.max(smoothstep(0.25, 0.55, hr), smoothstep(0.35, 0.7, steep)));
    const ice = smoothstep(0.82, 0.88, Math.abs(y) + 0.05 * snoise(x * 6, y * 6, z * 6));
    const snow = smoothstep(0.55, 0.7, hr + 0.1 * snoise(x * 40, y * 40, z * 40)) * (1 - smoothstep(0.55, 0.8, steep));
    return mix(col, C.snow, Math.max(ice, snow));
  }
  if (body === 'moon' || body === 'mercury') {
    const [light, dark] = body === 'moon' ? [C.moonLight, C.moonDark] : [C.merLight, C.merDark];
    const maria = body === 'moon' ? smoothstep(0, 0.3, fbm(x * 1.4 + 2, y * 1.4 + 2, z * 1.4 + 2, 6)) * 0.9 : smoothstep(-0.2, 0.4, fbm(x * 2, y * 2, z * 2, 6));
    const col = mix(light, dark, maria);
    const k = (0.85 + 0.25 * fbm(x * 18, y * 18, z * 18, 3)) * (1 + 0.35 * Math.max(-0.5, Math.min(0.6, hr)));
    return [col[0] * k, col[1] * k, col[2] * k];
  }
  if (body === 'mars') {
    let col = mix(C.marsLight, C.marsDark, smoothstep(-0.1, 0.45, fbm(x * 2.2 + 5, y * 2.2 + 5, z * 2.2 + 5, 5)));
    col = mix(col, C.marsDust, smoothstep(0.3, 0.7, fbm(x * 5, y * 5, z * 5, 3)) * 0.4);
    col = mix(col, C.marsDark, smoothstep(0.4, 0.8, steep) * 0.5);
    const cap = smoothstep(0.86, 0.9, Math.abs(y) + 0.04 * snoise(x * 8, y * 8, z * 8));
    return mix(col, C.snow, cap);
  }
  const col = mix(C.venusLight, C.venusDark, smoothstep(-0.2, 0.4, fbm(x * 4 + 1, y * 4, z * 4, 4)));
  return mix(col, C.venusDark, smoothstep(0.4, 0.8, steep) * 0.6);
}

/** Ground colour from a measured map: LROC WAC (Moon), MDIS (Mercury), Viking (Mars), Magellan radar (Venus). */
function measuredColor(body: GroundBody, x: number, y: number, z: number, c: RGB, steep: number): RGB {
  const grey = (c[0] + c[1] + c[2]) / 3;
  if (body === 'moon') {
    // WAC reflectance: maria ~0.25, highlands and rays ~0.55 of the stretch.
    const col = mix(C.moonDark, C.moonLight, smoothstep(0.18, 0.62, grey));
    const k = 0.92 + 0.16 * snoise(x * 400, y * 400, z * 400);
    return [col[0] * k, col[1] * k, col[2] * k];
  }
  if (body === 'mercury') {
    // The MDIS basemap carries baked shading and campaign seams: only 30% of it, over a flat albedo.
    const t = 0.5 + 0.3 * (smoothstep(0.1, 0.7, grey) - 0.5);
    return mix(C.merDark, C.merLight, t);
  }
  if (body === 'mars') {
    let col: RGB = [c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2];
    col = mix(col, C.marsDark, smoothstep(0.4, 0.8, steep) * 0.4);
    const cap = smoothstep(0.86, 0.9, Math.abs(y) + 0.04 * snoise(x * 8, y * 8, z * 8));
    return mix(col, C.snow, cap);
  }
  // Venus: radar brightness (rough tesserae and fresh flows are bright) between dark plains and bright highlands.
  const col = mix(C.venusDark, C.venusLight, smoothstep(0.12, 0.7, grey));
  return mix(col, C.venusDark, smoothstep(0.4, 0.8, steep) * 0.6);
}
