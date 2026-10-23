/**
 * God armour: one megastructure over each world a nation holds, built for the god the planet is named after
 * (GOD-ARMOUR.md). Pure geometry, no three.js, so the same numbers draw the plates, place the hardpoints and stop the
 * ship from flying through the plating.
 *
 * A structure is a shell between an inner and an outer radius just above the air, cut into a grid of near-square cells:
 * rings of equal angular height round the structure's pole, each ring cut into as many cells as fit. The god's mask
 * says which cells carry a plate and what kind. What is drawn is exactly what collides.
 *
 * Everything here is a leaf: it imports no game module, so nav.ts, stations.ts and the scene can all use it.
 */
export type V3 = [number, number, number];
export type ArmourHome = 'earth' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export const ARMOUR_HOMES: ArmourHome[] = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

// ---------- small vector helpers (local, so this file imports nothing) ----------
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => { const l = len(a); return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0]; };
const D = Math.PI / 180;
const TAU = Math.PI * 2;
/** Angle wrapped to (−π, π]. */
const wrap = (a: number) => a - TAU * Math.round(a / TAU);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const frac = (x: number) => x - Math.floor(x);
/** A stable 0..1 hash of two integers. */
export function hash2(i: number, j: number, seed = 0): number {
  let h = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------- the structures ----------
/**
 * What a cell carries. 0 is open space. The rest are plates whose top stands at a fraction of the shell's thickness
 * (`PLATE_TOP`): a raised plate reaches the outer radius, a trench sits low, a lit plate carries a light strip.
 */
export const Plate = { Open: 0, Plain: 1, Raised: 2, Trench: 3, Lit: 4, Accent: 5 } as const;
export type Plate = (typeof Plate)[keyof typeof Plate];
export const PLATE_TOP: Record<number, number> = { 1: 0.6, 2: 1, 3: 0.3, 4: 0.6, 5: 0.75 };

/** Where a cell is, in both of the structure's frames: the planet's spin axis, and the face toward the inner system. */
export interface CellAt {
  /** Polar angle from the spin axis's north (0..π), and azimuth round it from the face's side (−π..π). */
  ts: number; ps: number;
  /** Polar angle from the face direction (0..π), and azimuth round it from planet north (−π..π). */
  tf: number; pf: number;
  /** Unit direction from the planet's centre. */
  dir: V3;
  /**
   * The direction in the structure's own axes (ART-REFIT.md): x toward the inner system on the equator (spinRef),
   * y north along the spin axis, z the planet's east of that (spinSide, which is screen-right seen from Earth).
   * For a tilted structure (Mars's shield ring) these are the tilted grid's axes.
   */
  g: V3;
  /** Grid indices, for per-cell variety. */
  i: number; j: number;
}

export interface ArmourSpec {
  home: ArmourHome;
  /** The structure's name (GOD-ARMOUR.md). */
  name: string;
  /** Short name for labels: "Ancile", "Kerykeion". */
  short: string;
  god: string;
  /** Inner and outer radius of the plating, in planet radii. */
  rIn: number; rOut: number;
  /** The grid's cell, in degrees of arc; `lowCell` on Battery saver. */
  cell: number; lowCell: number;
  /** The grid's pole: the planet's spin axis, or the face toward the inner system. */
  frame: 'spin' | 'face';
  /** Degrees the grid's pole leans from the spin axis, about the axis toward the inner system (Mars's ring). */
  tilt?: number;
  /** Sections for conquest, cut by azimuth round the grid's pole. */
  sections: number;
  mask: (c: CellAt) => Plate;
  /** Berths prefer cells near these directions (structure axes, as `g`), in order: berth 1 the first. */
  berthNear?: V3[];
}

const AXIAL_TILT: Record<ArmourHome, number> = { earth: 23.44, moon: 6.7, mercury: 0.03, venus: 177.4, mars: 25.2, jupiter: 3.1, saturn: 26.7 }; // as voyageScene.ts SPIN

/** Distance (radians) from a band of half-width w round azimuth `c` at polar angle t: arc measured along the ring. */
const bandOff = (p: number, c: number, t: number) => Math.abs(wrap(p - c)) * Math.max(Math.sin(t), 0.02);
const angTo = (a: V3, b: V3) => Math.acos(clamp(dot(a, b), -1, 1));
export const latOf = (g: V3) => Math.asin(clamp(g[1], -1, 1));
export const lonOf = (g: V3) => Math.atan2(g[2], g[0]);

/**
 * The shapes of the seven structures, from the accepted reference sheets (art-refit/01-PLANETS-AND-ARMOR.md, Results).
 * Each is written once here, in the structure's axes (`CellAt.g`), and the scene draws it from the same numbers
 * (components/armourArt.ts). The grid says what is solid on the shell; parts that stand off it (rings, spires, wings,
 * masts) are the set pieces in setpieces.ts, solid too. Angles in degrees, lengths in planet radii.
 */
export const SHAPE = {
  earth: { ribs: 12, ribHalf: 2.3, hub: 8.5, southHub: 5, ring: [1.13, 1.42] as const, ringHalf: 0.016, rim: 0.05 },
  // Selene's crescent: inside the circle `outer`° round the face, outside the circle `inner`° round a point `shift`° from
  // the face toward the west (away from the crescent). Its horns pass the poles. `gallery`: the colonnade's width.
  moon: { outer: 92, inner: 70, shift: 30, gallery: 4.5 },
  // The kerykeion: two counter-wound spines (`wind` radians of azimuth per radian of polar angle), a rail ring.
  mercury: { wind: 1.8, spineR: 0.022, spineMid: 1.085, rail: 1.0 },
  // Aphrodite's clamshell: hinged at a jewel boss on the girdle `boss`° east of the face; each half a fan `upper`/`lower`
  // (degrees round the boss from north toward the east) reaching `reach`° from the boss.
  venus: { boss: 55, reach: 72, ribs: 13, girdle: 2.5, upper: [-32, 92] as const, lower: [88, 212] as const, hub: 9, dome: 7 },
  // The legion's shield ring: `shields` scuta locked edge to edge round a ring tilted `tilt`°, `half`° tall each way.
  mars: { shields: 22, half: 9, tilt: 14 },
  // Zeus's crown: a wall on the equatorial ring, high at eight eagle pillars, low between; eight spires up, eight down.
  jupiter: { pillars: 8, wallLow: 9, wallHigh: 15, pillarTop: 19, pillarHalf: 1.6 },
  // Kronos's sickle wall on the rings' outer edge, sweeping from `from`° to `to`° east of the face.
  saturn: { from: -30, to: 150, low: -1.2, high: 2.6, colTop: 5.0 },
};

/** Venus's boss and the clamshell's local axes at it: north, and east (toward the limb seen from Earth). */
export const venusBoss = (): { b: V3; n: V3; e: V3 } => {
  const a = SHAPE.venus.boss * D;
  return { b: [Math.cos(a), 0, Math.sin(a)], n: [0, 1, 0], e: [-Math.sin(a), 0, Math.cos(a)] };
};
/** Where a direction (structure axes) sits on Venus's shell: its arc from the boss, its angle round the boss from north. */
export function venusShellAt(g: V3): { rho: number; alpha: number } {
  const { b, n, e } = venusBoss();
  return { rho: angTo(g, b), alpha: Math.atan2(dot(g, e), dot(g, n)) };
}
/** The scalloped rim of a shell half at angle `alpha` (radians): each rib reaches further than its groove. */
export function venusRim(alpha: number, from: number, to: number): number {
  const k = ((alpha / D - from) / (to - from)) * SHAPE.venus.ribs;
  return (SHAPE.venus.reach - 3.5 + 3.5 * Math.abs(Math.sin(frac(k) * Math.PI))) * D;
}
/** Which half of the clamshell a direction is on (1 upper, −1 lower, 0 neither), and its angle unwrapped for that half. */
export function venusHalf(g: V3): { half: number; a: number; rho: number } {
  const V = SHAPE.venus;
  const { rho, alpha } = venusShellAt(g);
  const lat = latOf(g) / D;
  if (rho < V.hub * D) return { half: 0, a: alpha, rho };
  const a = alpha / D;
  if (lat > V.girdle && a > V.upper[0] && a < V.upper[1] && rho < venusRim(alpha, V.upper[0], V.upper[1])) return { half: 1, a: alpha, rho };
  const a2 = a < V.lower[0] - 180 ? a + 360 : a;
  if (lat < -V.girdle && a2 > V.lower[0] && a2 < V.lower[1] && rho < venusRim(a2 * D, V.lower[0], V.lower[1])) return { half: -1, a: a2 * D, rho };
  return { half: 0, a: alpha, rho };
}
/**
 * The shell's height over the planet's radius 1.1 (planet radii) at a point on it: a dome, low at the hinge and the rim,
 * fluted by its ribs. 0 off the shell.
 */
export function venusShellTop(g: V3): number {
  const V = SHAPE.venus;
  const { half, a, rho } = venusHalf(g);
  if (!half) return 0;
  const [from, to] = half > 0 ? V.upper : V.lower;
  const u = clamp((rho - V.hub * D) / (venusRim(a, from, to) - V.hub * D), 0, 1);
  const k = ((a / D - from) / (to - from)) * V.ribs;
  const rib = Math.pow(Math.abs(Math.sin(frac(k) * Math.PI)), 0.6); // each rib a rounded ridge, the grooves between
  return 0.012 + 0.058 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.55 + 0.45 * u * u)), 0.7) + 0.012 * rib * Math.sin(Math.PI * u);
}
/** Saturn's wall: how far along the sweep azimuth `lon` (radians, east of the face) is (0..1), or −1 outside it. */
export function saturnSweep(lon: number): number {
  const S = SHAPE.saturn;
  let a = lon / D;
  while (a < S.from) a += 360;
  while (a >= S.from + 360) a -= 360;
  const u = (a - S.from) / (S.to - S.from);
  return u >= 0 && u <= 1 ? u : -1;
}
/** Saturn: the blade narrows to a point at both ends of the sweep (1 in the middle). */
export const saturnTaper = (u: number) => Math.min(1, Math.min(u, 1 - u) * 7);
/** Moon: the crescent's two circle centres in structure axes (x toward Earth, z east). */
export function moonCircles(): { a: V3; b: V3 } {
  const s = SHAPE.moon.shift * D;
  return { a: [1, 0, 0], b: [Math.cos(s), 0, -Math.sin(s)] };
}
/** Moon: inside the crescent? */
export function moonIn(g: V3): boolean {
  const { a, b } = moonCircles();
  return angTo(g, a) < SHAPE.moon.outer * D && angTo(g, b) > SHAPE.moon.inner * D;
}
/** Mercury: the azimuth of spine `s` (±1) at polar angle `t`. */
export const mercurySpine = (s: number, t: number) => s * SHAPE.mercury.wind * t + (s > 0 ? 0 : Math.PI);
/** Jupiter: the wall's top latitude (degrees) at azimuth `lon` (radians). Pillars stand at 22.5° + k·45°. */
export function jupiterWallTop(lon: number): number {
  const J = SHAPE.jupiter;
  const k = frac(lon / (TAU / J.pillars) - 0.5) - 0.5; // −0.5..0.5, 0 at a pillar
  const near = Math.abs(k) * (360 / J.pillars); // degrees from the pillar
  if (near < J.pillarHalf) return J.pillarTop;
  return J.wallLow + (J.wallHigh - J.wallLow) * Math.pow(Math.cos(Math.min(1, Math.abs(k) * 2) * Math.PI / 2), 2.2);
}

export const ARMOUR: Record<ArmourHome, ArmourSpec> = {
  // Gaia, a cradle: twelve gold ribs pole to pole and a hub on each pole. The shipyard ring and the tether from the Andes
  // to Pharos are set pieces (setpieces.ts). Sheet ruling: the ribs straight, the tether on the equator.
  earth: {
    home: 'earth', name: 'The Cradle of Gaia', short: 'Cradle of Gaia', god: 'Gaia', rIn: 1.1, rOut: 1.125, cell: 1, lowCell: 2,
    frame: 'spin', sections: 6,
    mask: ({ ts, g }) => {
      const E = SHAPE.earth;
      if (ts < E.hub * D || ts > Math.PI - E.southHub * D) return Plate.Raised;
      const lon = lonOf(g);
      for (let k = 0; k < E.ribs; k++) if (bandOff(lon, ((k * 360) / E.ribs) * D, ts) < E.ribHalf * D) return Plate.Raised;
      return Plate.Open;
    },
    berthNear: [[0.55, 0.83, 0], [0.3, 0.83, 0.47], [0.3, 0.83, -0.47]],
  },
  // Selene: a silver crescent helm over one side, horns past the poles, a colonnade along its inner edge.
  moon: {
    home: 'moon', name: 'The Crescent of Selene', short: 'Crescent of Selene', god: 'Selene', rIn: 1.08, rOut: 1.18, cell: 1.6, lowCell: 3.2,
    frame: 'spin', sections: 3,
    mask: ({ g }) => (moonIn(g) ? Plate.Raised : Plate.Open),
    berthNear: [[0.45, 0.55, 0.7], [0.45, -0.55, 0.7]],
  },
  // Hermes: two spines spiralling pole to pole (the kerykeion's snakes) and the rail ring; wings and hats are set pieces.
  mercury: {
    home: 'mercury', name: 'The Kerykeion', short: 'Kerykeion', god: 'Hermes', rIn: 1.063, rOut: 1.107, cell: 0.6, lowCell: 1.2,
    frame: 'spin', sections: 4,
    mask: ({ ts, g }) => {
      const H = SHAPE.mercury;
      if (Math.abs(latOf(g)) < H.rail * D) return Plate.Raised;
      const lon = lonOf(g);
      const w = (H.spineR / H.spineMid) * 1.4; // a little wider than the tube, so mounts have plate to stand on
      for (const s of [1, -1]) if (bandOff(lon, mercurySpine(s, ts), ts) < w) return Plate.Raised;
      return Plate.Open;
    },
    berthNear: [[-0.27, 0.5, 0.82], [0.27, 0.5, 0.82]], // on the two spines, north and east, where they face Earth's way in
  },
  // Aphrodite: one gold clamshell hinged at a jewel boss on a jewelled girdle, a green dome on the north pole.
  venus: {
    home: 'venus', name: 'The Shell of Aphrodite', short: 'Shell of Aphrodite', god: 'Aphrodite', rIn: 1.095, rOut: 1.18, cell: 1.2, lowCell: 2.4,
    frame: 'spin', sections: 4,
    mask: ({ g, ts }) => {
      const V = SHAPE.venus;
      if (ts < V.dome * D) return Plate.Accent; // the green dome
      if (venusShellAt(g).rho < V.hub * D) return Plate.Raised; // the jewel boss
      if (Math.abs(latOf(g)) < V.girdle * D) return Plate.Plain; // the girdle
      const top = venusShellTop(g);
      if (!top) return Plate.Open;
      // The plate kind whose top (PLATE_TOP) is the lowest that still covers the shell here.
      const f = (1.1 + top - 1.095) / (1.18 - 1.095);
      return f <= 0.3 ? Plate.Trench : f <= 0.6 ? Plate.Plain : f <= 0.75 ? Plate.Accent : Plate.Raised;
    },
    berthNear: [[0.3, 0.5, 0.81], [0.3, -0.5, 0.81]],
  },
  // Ares: a tilted ring of crimson shields locked edge to edge, clear of the planet. The eagle standard and the spears
  // to the two moon forts are set pieces.
  mars: {
    home: 'mars', name: 'The Shield Wall of Ares', short: 'Shield Wall', god: 'Ares', rIn: 1.42, rOut: 1.48, cell: 1.4, lowCell: 2.8,
    frame: 'spin', tilt: SHAPE.mars.tilt, sections: 4,
    mask: ({ g }) => (Math.abs(latOf(g)) < SHAPE.mars.half * D ? Plate.Raised : Plate.Open),
  },
  // Zeus: a crown wall on the equatorial ring, rising to eight eagle pillars. The ring and the sixteen lightning spires
  // are set pieces.
  jupiter: {
    home: 'jupiter', name: 'The Crown of Zeus', short: 'Crown of Zeus', god: 'Zeus', rIn: 1.105, rOut: 1.13, cell: 0.8, lowCell: 1.6,
    frame: 'spin', sections: 4,
    mask: ({ g }) => {
      const lat = latOf(g) / D;
      return lat > 0.6 && lat < jupiterWallTop(lonOf(g)) ? Plate.Raised : Plate.Open;
    },
  },
  // Kronos: the sickle wall on the rings' outer edge. The blade's deck, its colonnade, the hourglasses and the pylon are
  // set pieces.
  saturn: {
    home: 'saturn', name: 'The Sickle of Kronos', short: 'Sickle of Kronos', god: 'Kronos', rIn: 2.295, rOut: 2.335, cell: 0.6, lowCell: 1.2,
    frame: 'spin', sections: 2,
    mask: ({ g }) => {
      const S = SHAPE.saturn;
      const u = saturnSweep(lonOf(g));
      if (u < 0) return Plate.Open;
      const lat = latOf(g) / D;
      const t = saturnTaper(u);
      return lat > S.low * t && lat < S.high * t ? Plate.Raised : Plate.Open;
    },
    berthNear: [[0.45, 0, 0.89], [-0.1, 0, 0.99], [0.85, 0, 0.5]],
  },
};

// ---------- where a structure sits ----------
export interface Host { pos: V3; size: number }

/** The structure's frames round a planet: spin axis and face, each with a reference direction for azimuth. */
export interface ArmourFrame {
  home: ArmourHome;
  centre: V3;
  /** Planet radius, scene units. */
  R: number;
  spin: V3; spinRef: V3; spinSide: V3;
  face: V3; faceRef: V3; faceSide: V3;
  /** The grid's own pole and reference (one of the two frames above). */
  pole: V3; ref: V3; side: V3;
  rIn: number; rOut: number;
}

/** A unit vector at right angles to `a`, as close to `b` as possible. */
function perp(a: V3, b: V3): V3 {
  const p = sub(b, mul(a, dot(a, b)));
  if (len(p) > 1e-6) return unit(p);
  return unit(cross(a, Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]));
}

export function armourFrame(home: ArmourHome, host: Host): ArmourFrame {
  const s = ARMOUR[home];
  const t = AXIAL_TILT[home] * D;
  const spin: V3 = [-Math.sin(t), Math.cos(t), 0]; // the tilt group's +y (voyageScene: rotation.z = tilt)
  const face: V3 = len(host.pos) > 1e-6 ? unit(mul(host.pos, -1)) : [1, 0, 0]; // toward Earth (Earth's: +x)
  const spinRef = perp(spin, face);
  const faceRef = perp(face, spin);
  const f: ArmourFrame = {
    home, centre: host.pos, R: host.size,
    spin, spinRef, spinSide: cross(spin, spinRef),
    face, faceRef, faceSide: cross(face, faceRef),
    pole: spin, ref: spinRef, side: cross(spin, spinRef),
    rIn: s.rIn * host.size, rOut: s.rOut * host.size,
  };
  if (s.frame === 'face') { f.pole = face; f.ref = faceRef; f.side = f.faceSide; }
  if (s.tilt) {
    // Lean the grid's pole about its reference axis (toward the inner system).
    const a = s.tilt * D;
    const pole = unit(addv(mul(f.pole, Math.cos(a)), mul(f.side, -Math.sin(a))));
    f.side = unit(cross(pole, f.ref));
    f.pole = pole;
  }
  return f;
}

/** Polar angle and azimuth of a unit direction round a pole. */
function polar(d: V3, pole: V3, ref: V3, side: V3): [number, number] {
  return [Math.acos(clamp(dot(d, pole), -1, 1)), Math.atan2(dot(d, side), dot(d, ref))];
}

// ---------- the grid ----------
export interface Grid {
  /** Cell height in radians, and the ring count pole to pole. */
  dt: number; rings: number;
  /** Cells in each ring, and the index of each ring's first cell. */
  per: number[]; start: number[];
  /** Every cell's plate, in order ring by ring. */
  plates: Uint8Array;
  count: number;
}

const gridCache = new Map<string, Grid>();

/** A unit direction from (polar angle, azimuth) round the frame's pole. */
export function dirOf(f: ArmourFrame, th: number, ph: number): V3 {
  const s = Math.sin(th);
  return unit(addv(addv(mul(f.pole, Math.cos(th)), mul(f.ref, s * Math.cos(ph))), mul(f.side, s * Math.sin(ph))));
}

/** The cell context for a direction. */
export function cellAt(f: ArmourFrame, d: V3, i = 0, j = 0): CellAt {
  const [ts, ps] = polar(d, f.spin, f.spinRef, f.spinSide);
  const [tf, pf] = polar(d, f.face, f.faceRef, f.faceSide);
  return { ts, ps, tf, pf, dir: d, g: toLocal(f, d), i, j };
}

/**
 * The structure's own axes in world space: x toward the inner system on the equator, y north (the grid's pole for a
 * tilted structure, else the spin axis), z east. Every shape in SHAPE and setpieces.ts is written in these.
 */
export function axesOf(f: ArmourFrame): { x: V3; y: V3; z: V3 } {
  if (ARMOUR[f.home].tilt) return { x: f.ref, y: f.pole, z: f.side };
  // Venus turns backwards (tilt 177°): its spin axis points down, so the sheet's north (up on screen) is its south.
  if (AXIAL_TILT[f.home] > 90) return { x: f.spinRef, y: mul(f.spin, -1), z: mul(f.spinSide, -1) };
  return { x: f.spinRef, y: f.spin, z: f.spinSide };
}
/** A world direction in the structure's axes. */
export function toLocal(f: ArmourFrame, d: V3): V3 {
  const a = axesOf(f);
  return [dot(d, a.x), dot(d, a.y), dot(d, a.z)];
}
/** A direction (or offset) in the structure's axes, in world space. */
export function toWorld(f: ArmourFrame, g: V3): V3 {
  const a = axesOf(f);
  return addv(addv(mul(a.x, g[0]), mul(a.y, g[1])), mul(a.z, g[2]));
}

/** The grid of a structure in its frame, at the normal cell size or Battery saver's. Cached. */
export function armourGrid(f: ArmourFrame, low = false): Grid {
  const key = `${f.home}:${low}:${f.centre.join(',')}:${f.R}`;
  const hit = gridCache.get(key);
  if (hit) return hit;
  const spec = ARMOUR[f.home];
  const cell = (low ? spec.lowCell : spec.cell) * D;
  const rings = Math.max(4, Math.round(Math.PI / cell));
  const dt = Math.PI / rings;
  const per: number[] = [];
  const start: number[] = [];
  let n = 0;
  for (let i = 0; i < rings; i++) {
    const tc = (i + 0.5) * dt;
    const k = Math.max(3, Math.round((TAU * Math.sin(tc)) / dt));
    per.push(k); start.push(n); n += k;
  }
  const plates = new Uint8Array(n);
  for (let i = 0; i < rings; i++) {
    const tc = (i + 0.5) * dt;
    for (let j = 0; j < per[i]; j++) {
      const pc = ((j + 0.5) / per[i]) * TAU - Math.PI;
      plates[start[i] + j] = spec.mask(cellAt(f, dirOf(f, tc, pc), i, j));
    }
  }
  const g: Grid = { dt, rings, per, start, plates, count: n };
  gridCache.set(key, g);
  return g;
}

/** The cell a direction falls in: ring, index in the ring, and the flat index. */
export function cellIndex(f: ArmourFrame, g: Grid, d: V3): { i: number; j: number; k: number } {
  const [th, ph] = polar(d, f.pole, f.ref, f.side);
  const i = clamp(Math.floor(th / g.dt), 0, g.rings - 1);
  const n = g.per[i];
  const j = ((Math.floor(((ph + Math.PI) / TAU) * n) % n) + n) % n;
  return { i, j, k: g.start[i] + j };
}

/** The centre direction of a cell. */
export function cellDir(f: ArmourFrame, g: Grid, i: number, j: number): V3 {
  return dirOf(f, (i + 0.5) * g.dt, ((j + 0.5) / g.per[i]) * TAU - Math.PI);
}

/** Radius of a plate's top for a plate kind. */
export const plateTop = (f: ArmourFrame, p: number) => f.rIn + (f.rOut - f.rIn) * (PLATE_TOP[p] ?? 0);

/** Fraction of the sphere's area under plate, from a Fibonacci sample of directions. */
export function coverage(f: ArmourFrame, g: Grid, samples = 20000): number {
  let hit = 0;
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let n = 0; n < samples; n++) {
    const y = 1 - (2 * (n + 0.5)) / samples;
    const r = Math.sqrt(1 - y * y);
    const d: V3 = [Math.cos(ga * n) * r, y, Math.sin(ga * n) * r];
    if (g.plates[cellIndex(f, g, d).k]) hit++;
  }
  return hit / samples;
}

/** The section a direction belongs to (by azimuth round the grid's pole), 0..sections−1. */
export function sectionIndex(f: ArmourFrame, d: V3): number {
  const n = ARMOUR[f.home].sections;
  const [, ph] = polar(d, f.pole, f.ref, f.side);
  // Boundaries are nudged a hair off the grid's own cell centres, so a point on a cell centre always rounds one way.
  return Math.min(n - 1, Math.floor(((ph + Math.PI) / TAU) * n + 1.234e-3) % n);
}

// ---------- collision ----------
/**
 * Keep a point of radius `pad` out of the plating. `prev` is where it was a moment ago, which says from which side it
 * came. Returns the corrected point, or null when it is clear. Neighbouring cells within `pad` of it count too.
 */
export function armourPush(f: ArmourFrame, g: Grid, pos: V3, prev: V3, pad: number): V3 | null {
  const off = sub(pos, f.centre);
  const r = len(off);
  if (r > f.rOut + pad || r < f.rIn - pad) return null;
  const d = mul(off, 1 / r);
  // The tallest plate under the point or within `pad` of it, sideways.
  let top = 0;
  const a = pad / r;
  const t1 = perp(d, f.pole);
  const t2 = cross(d, t1);
  const probes: V3[] = [d, unit(addv(d, mul(t1, a))), unit(addv(d, mul(t1, -a))), unit(addv(d, mul(t2, a))), unit(addv(d, mul(t2, -a)))];
  for (const p of probes) {
    const pl = g.plates[cellIndex(f, g, p).k];
    if (pl) top = Math.max(top, plateTop(f, pl));
  }
  if (!top || r > top + pad) return null;
  const rp = len(sub(prev, f.centre));
  const outside = rp >= (f.rIn + top) / 2;
  const to = outside ? top + pad : f.rIn - pad;
  return addv(f.centre, mul(d, to));
}

/** True when the straight segment a→b passes through plating (sampled every `step`). */
export function segmentHitsArmour(f: ArmourFrame, g: Grid, a: V3, b: V3, step: number): boolean {
  // Only the part of the segment inside the outer radius can touch plating: solve |a + t(b − a) − c| = rOut.
  const ab = sub(b, a);
  const ac = sub(a, f.centre);
  const A = dot(ab, ab);
  const B = 2 * dot(ac, ab);
  const C = dot(ac, ac) - f.rOut * f.rOut;
  const disc = B * B - 4 * A * C;
  if (A < 1e-12 || disc <= 0) return false;
  const t0 = Math.max(0, (-B - Math.sqrt(disc)) / (2 * A));
  const t1 = Math.min(1, (-B + Math.sqrt(disc)) / (2 * A));
  if (t1 <= t0) return false;
  const n = Math.max(1, Math.ceil((len(ab) * (t1 - t0)) / step));
  for (let k = 0; k <= n; k++) {
    const p = addv(a, mul(ab, t0 + ((t1 - t0) * k) / n));
    const off = sub(p, f.centre);
    const r = len(off);
    if (r < f.rIn || r > f.rOut) continue;
    const pl = g.plates[cellIndex(f, g, mul(off, 1 / r)).k];
    if (pl && r <= plateTop(f, pl)) return true;
  }
  return false;
}
