/**
 * Hardpoints: every mount point on the god armour, typed, with a fixed world position, an outward normal, a size in
 * ship lengths and the section it belongs to. This is the interface the stations thread mounts its systems on
 * (defences, navy, economy, religion, power); conquest takes a structure a section at a time.
 *
 * The armour does not turn with its planet, so a hardpoint's position never changes: no pose over time is needed.
 * Every hardpoint stands on a plated cell, at the plating's outer radius, so its normal's half-space is open sky and
 * the plating is behind it (a turret cannot fire through its own plating if it only fires into that half-space).
 *
 * Berths are hardpoints too. Each berth is also a destination (its `dest`, an old station id such as 'stn-mars-1'),
 * with an approach point straight out from the cradle that the autopilot flies to before the docking run.
 *
 * Positions come from nav.ts's fixed layout and the player ship's length in scene units (`shipLength`, default the
 * player cruiser's 0.3708). Cached per layout.
 */
import type { V3 } from '../nav';
import { VR, destGeometry } from '../nav';
import type { DestGeo } from '../nav';
import { ARMOUR, ARMOUR_HOMES, Plate, armourFrame, armourGrid, cellDir, cellIndex, hash2, sectionIndex, toWorld } from './armour';
import type { ArmourFrame, ArmourHome, Grid } from './armour';
import { STATION_COUNT } from '../stations';
import type { StationId } from '../stations';

export type { ArmourHome } from './armour';

/** What a hardpoint mounts. Grouped as the stations thread asked: defences, navy, economy/religion/power/detection. */
export type HardpointKind =
  | 'turret' | 'pointDefence' | 'shieldEmitter' | 'minelayer' // defences
  | 'hangar' | 'berth' | 'mooring' | 'drydock' // navy: launch, dock, moor a capital ship, repair
  | 'market' | 'temple' | 'reactor' | 'sensor'; // economy, religion, power, detection
export const HARDPOINT_KINDS: HardpointKind[] = ['turret', 'pointDefence', 'shieldEmitter', 'minelayer', 'hangar', 'berth', 'mooring', 'drydock', 'market', 'temple', 'reactor', 'sensor'];

export interface Hardpoint {
  /** Unique across the game: '<home>-<kind>-<nn>', e.g. 'mars-turret-07'. */
  id: string;
  /** The megastructure: the home planet's id (one structure per planet). */
  station: ArmourHome;
  /** The section it belongs to, '<home>-s<n>', for capture a section at a time. */
  section: string;
  kind: HardpointKind;
  /** World position, scene units: on the plating's outer radius. Fixed for the whole game. */
  pos: V3;
  /** Unit vector straight out of the plating. Its half-space is the hardpoint's field; the plating is behind it. */
  normal: V3;
  /** Size in ship lengths: a turret's hit radius, a hangar mouth's width, a temple's length. */
  size: number;
  /** A temple's or a market's name (temples name the planet's god). */
  name?: string;
  /** Berths: the destination id, and the point straight out from the cradle that the autopilot flies to. */
  dest?: StationId;
  approach?: V3;
  /** Battery guns: the gate (berth or hangar id) they were placed to guard. */
  gate?: string;
  /** Moorings: the berth it serves, and the moored capital ship's heading (a unit tangent). */
  berth?: string;
  along?: V3;
}

export interface ArmourSection {
  id: string;
  station: ArmourHome;
  index: number;
  /** A sphere round the section's plating, scene units: its hit volume for a first pass. */
  centre: V3;
  radius: number;
  /** Plated cells in it, and the fraction of the structure's plating. */
  plates: number;
  share: number;
}

/**
 * Each gate's battery (a berth or a hangar mouth): this many turrets and point-defence mounts within `reach` scene units
 * of the gate's point, every one able to see it. Asked for by the stations thread (stations-to-god-armour.md): with guns
 * spread evenly, most were over the horizon from any one approach (Jupiter: none could engage a ship at a hangar).
 */
export const BATTERY = { turrets: 6, pointDefence: 4, reach: 400, launch: 200 };

/** The point a gate's battery guards: a berth's approach point, or a hangar's launch point `BATTERY.launch` straight out. */
export function gatePoint(gate: Hardpoint): V3 {
  return gate.approach ?? add(gate.pos, mul(gate.normal, BATTERY.launch));
}

/** A mount at `pos` (normal `n`) can see `p`: in front of its own plating, and the line to it misses the planet. */
export function sees(f: { centre: V3; R: number }, pos: V3, n: V3, p: V3): boolean {
  const d = sub(p, pos);
  if (dot(d, n) <= 0) return false;
  const l2 = dot(d, d);
  const t = Math.max(0, Math.min(1, -dot(sub(pos, f.centre), d) / l2));
  return len(sub(add(pos, mul(d, t)), f.centre)) > f.R;
}

/** The player cruiser's length in scene units (Voyage.tsx SHIP_LENGTH). */
export const SHIP_LENGTH = 0.18 * 2.06;

/**
 * Berths, in ship lengths. The autopilot routes to `approach` out from the plating plus the hardpoints' reach, keeping
 * `margin` above everything on the way, parks within `park` of it at under `parkSpeed` a second, then the docking run
 * takes the ship down to the cradle. L docks by hand within `dockReach` of the approach point.
 */
export const BERTH = { approach: 12, margin: 2, park: 2, parkSpeed: 4, dockReach: 14, cradle: 1.4, mooring: 9 };

/** How a structure's hardpoints scale with the world: bigger on the giants (√ of the radius against Earth's). */
export const mountScale = (R: number) => Math.min(3.4, Math.max(0.6, Math.sqrt(R / VR.earth))); // against Earth's radius, so real scale left it alone

/** Base sizes in ship lengths (before `mountScale`; berths and moorings never scale: they hold ships). */
const SIZE: Record<HardpointKind, number> = {
  turret: 3, pointDefence: 1.5, shieldEmitter: 8, minelayer: 3, hangar: 10, berth: 4, mooring: 6, drydock: 12, market: 14, temple: 20, reactor: 10, sensor: 4,
};
/** How far above the outer radius the tallest mount reaches, in ship lengths before scale. */
export const SKIN = 4;

/** Counts per structure. Berths come from stations.ts STATION_COUNT; one mooring per berth. */
function counts(home: ArmourHome): Record<HardpointKind, number> {
  return {
    turret: home === 'mars' ? 18 : home === 'jupiter' ? 20 : 12, // over the long faces, besides each gate's battery
    pointDefence: 8,
    shieldEmitter: home === 'mars' ? 12 : 6, // Mars: the twelve anciles of the Salii
    minelayer: 4,
    hangar: 6,
    berth: STATION_COUNT[home],
    mooring: STATION_COUNT[home],
    drydock: 2,
    market: home === 'mercury' ? 4 : home === 'saturn' ? 3 : 2,
    temple: 2,
    reactor: 3,
    sensor: 4,
  };
}

/** Temples and markets by name, each world's god (GOD-ARMOUR.md). */
const NAMES: Record<ArmourHome, { temple: string[]; market: string[] }> = {
  earth: { temple: ['Temple of Gaia', 'Temple of Tellus'], market: ['Market of the Sementivae', 'Garden Market'] },
  moon: { temple: ['Temple of Selene', 'Temple of Luna'], market: ['Silver Market', 'Market of Latmos'] },
  mercury: { temple: ['Temple of Hermes', 'Temple of Mercury'], market: ['Market of the Mercatores', 'Herald’s Market', 'Purse Market', 'Crossing Market'] },
  venus: { temple: ['Temple of Aphrodite', 'Temple of Venus Genetrix'], market: ['Market of Cythera', 'Myrtle Market'] },
  mars: { temple: ['Temple of Mars Ultor', 'Temple of Ares'], market: ['Armoury Market', 'Campus Market'] },
  jupiter: { temple: ['Temple of Zeus', 'Temple of Jupiter Optimus Maximus'], market: ['Capitoline Market', 'Eagle Market'] },
  saturn: { temple: ['Temple of Kronos', 'Temple of Saturn'], market: ['The Aerarium (Saturn’s treasury)', 'Golden Age Market', 'Harvest Market'] },
};

// ---------- placement ----------
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a); return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ang = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

interface Cand { dir: V3; plate: number; i: number; j: number; h: number }

/** Plated cells whose four neighbours are plated too (a mount sits on solid plate, never on a lattice edge). */
function candidates(f: ArmourFrame, g: Grid): Cand[] {
  const out: Cand[] = [];
  for (let i = 1; i < g.rings - 1; i++) {
    for (let j = 0; j < g.per[i]; j++) {
      const p = g.plates[g.start[i] + j];
      if (!p || p === Plate.Trench) continue;
      const d = cellDir(f, g, i, j);
      const t1 = unit(cross(d, f.pole));
      const t2 = cross(d, t1);
      const s = g.dt * 0.9;
      const ok = [add(d, mul(t1, s)), add(d, mul(t1, -s)), add(d, mul(t2, s)), add(d, mul(t2, -s))].every((q) => g.plates[cellIndex(f, g, unit(q)).k]);
      if (ok) out.push({ dir: d, plate: p, i, j, h: hash2(i, j, 11) });
    }
  }
  return out;
}

/**
 * Points on solid plate round a direction, closer together than cells: at real scale a cell is hundreds of ship lengths
 * across, wider than a gate battery's reach, so a battery cannot sit only on cell centres. A point counts when it and
 * four points round it, half a step away, are all on plate that is not a trench.
 */
function localCands(f: ArmourFrame, g: Grid, normal: V3, maxAng: number): Cand[] {
  const t1 = unit(len(cross(normal, f.pole)) > 1e-6 ? cross(normal, f.pole) : cross(normal, [1, 0, 0]));
  const t2 = cross(normal, t1);
  const n = 12;
  const s = maxAng / n;
  const solid = (d: V3) => { const p = g.plates[cellIndex(f, g, unit(d)).k]; return !!p && p !== Plate.Trench; };
  const out: Cand[] = [];
  for (let a = -n; a <= n; a++) {
    for (let b = -n; b <= n; b++) {
      if (a * a + b * b > n * n) continue;
      const d = unit(add(normal, add(mul(t1, a * s), mul(t2, b * s))));
      const h = s * 0.5;
      if (![d, add(d, mul(t1, h)), add(d, mul(t1, -h)), add(d, mul(t2, h)), add(d, mul(t2, -h))].every(solid)) continue;
      out.push({ dir: d, plate: g.plates[cellIndex(f, g, d).k], i: 1000 + a, j: 1000 + b, h: hash2(a, b, 13) });
    }
  }
  return out;
}

/** Up to `n` candidates, each at least `sep` radians from every one already taken, best `score` first. */
function pick(cands: Cand[], taken: V3[], n: number, sep: number, score: (c: Cand) => number): Cand[] {
  const order = [...cands].sort((a, b) => score(b) - score(a));
  const got: Cand[] = [];
  let s = sep;
  for (let tries = 0; tries < 8 && got.length < n; tries++, s *= 0.75) {
    for (const c of order) {
      if (got.length >= n) break;
      if (got.includes(c)) continue;
      if (taken.some((t) => ang(t, c.dir) < s) || got.some((g) => ang(g.dir, c.dir) < s)) continue;
      got.push(c);
    }
  }
  taken.push(...got.map((g) => g.dir));
  return got;
}

export interface ArmourPlace { frame: ArmourFrame; grid: Grid; hardpoints: Hardpoint[]; sections: ArmourSection[]; skin: number; k: number }

const cache = new Map<string, Record<ArmourHome, ArmourPlace>>();

/** Every structure's frame, grid, hardpoints and sections, for a layout (nav.ts destGeometry) and ship length. */
export function armourPlaces(geo: DestGeo[] = destGeometry(), shipLength = SHIP_LENGTH): Record<ArmourHome, ArmourPlace> {
  const key = `${shipLength}:${ARMOUR_HOMES.map((h) => geo.find((g) => g.id === h)!.pos.join(',')).join(';')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = {} as Record<ArmourHome, ArmourPlace>;
  for (const home of ARMOUR_HOMES) {
    const body = geo.find((g) => g.id === home)!;
    const frame = armourFrame(home, { pos: body.pos, size: body.size });
    const grid = armourGrid(frame);
    out[home] = placeOne(frame, grid, shipLength);
  }
  cache.set(key, out);
  return out;
}

function placeOne(f: ArmourFrame, g: Grid, L: number): ArmourPlace {
  const home = f.home;
  const k = mountScale(f.R);
  const skin = SKIN * k * L;
  const cands = candidates(f, g);
  const n = counts(home);
  const taken: V3[] = [];
  const hps: Hardpoint[] = [];
  const at = (d: V3) => add(f.centre, mul(d, f.rOut));
  const sec = (d: V3) => `${home}-s${sectionIndex(f, d)}`;
  const nn = (x: number) => String(x).padStart(2, '0');
  const cellSep = g.dt * 1.5;

  // Berths first, on the side facing the inner system, where a ship arriving from Earth meets them; each with a
  // mooring for a capital ship alongside.
  const berthSep = Math.max(cellSep * 3, (16 * Math.PI) / 180);
  // Only where the plating faces up (y > 0.2): the ship flies without roll, so in a cradle under a world it would
  // hang belly-up beneath the plating.
  const upward = cands.filter((c) => c.dir[1] > 0.2);
  const pool = upward.length >= n.berth ? upward : cands;
  // A structure may say where its berths go (ARMOUR[home].berthNear, in its own axes): each berth nearest its own point.
  const near = ARMOUR[home].berthNear?.map((g) => unit(toWorld(f, g)));
  const berths = near
    ? near.slice(0, n.berth).map((w) => pick(pool, taken, 1, berthSep, (c) => dot(c.dir, w) + 0.02 * c.h)[0]).filter(Boolean)
    : [];
  if (berths.length < n.berth) berths.push(...pick(pool, taken, n.berth - berths.length, berthSep, (c) => dot(c.dir, f.face) + 0.5 * c.dir[1] + 0.15 * c.h + (c.plate === Plate.Raised ? 0 : 0.05)));
  berths.forEach((c, i) => {
    const id = `${home}-berth-${nn(i + 1)}`;
    const dest = `stn-${home}-${i + 1}` as StationId;
    hps.push({
      id, station: home, section: sec(c.dir), kind: 'berth', pos: at(c.dir), normal: c.dir, size: SIZE.berth, dest,
      approach: add(f.centre, mul(c.dir, f.rOut + skin + BERTH.approach * L)),
    });
    // Alongside, toward the structure's north, a capital ship's length and more away.
    const along = unit(cross(c.dir, unit(cross(f.pole, c.dir))));
    const tangent = len(along) > 0.5 ? along : unit(cross(c.dir, [1, 0, 0]));
    const md = unit(add(c.dir, mul(tangent, (BERTH.mooring * L) / f.rOut)));
    hps.push({ id: `${home}-mooring-${nn(i + 1)}`, station: home, section: sec(md), kind: 'mooring', pos: at(md), normal: md, size: SIZE.mooring, berth: id, along: unit(cross(md, unit(cross(tangent, md)))) });
  });

  // Temples at the god's own places: the face's centre and the spin axis's north (the crown, the hinge, the pole).
  const temples = [f.face, f.spin].map((want) => pick(cands, taken, 1, cellSep * 2, (c) => -ang(c.dir, want) + (c.plate === Plate.Raised ? 0.02 : 0))[0]).filter(Boolean);
  temples.forEach((c, i) => hps.push({ id: `${home}-temple-${nn(i + 1)}`, station: home, section: sec(c.dir), kind: 'temple', pos: at(c.dir), normal: c.dir, size: SIZE.temple * k, name: NAMES[home].temple[i] }));

  // Everything else spread evenly over the plating, in a fixed order so the ids never move. Hangars first: with the
  // berths they are the gates, and each gate gets a battery before the rest of the guns spread over the long faces.
  const area = cands.length * g.dt * g.dt;
  const counter: Partial<Record<HardpointKind, number>> = {};
  const add1 = (kind: HardpointKind, c: Cand, extra: Partial<Hardpoint> = {}) => {
    const i = (counter[kind] = (counter[kind] ?? 0) + 1);
    hps.push({ id: `${home}-${kind}-${nn(i)}`, station: home, section: sec(c.dir), kind, pos: at(c.dir), normal: c.dir, size: SIZE[kind] * k, ...extra });
  };
  const spread = (kind: HardpointKind, want: number) => {
    const sep = Math.max(cellSep, Math.sqrt(area / Math.max(1, want)) * 0.7);
    pick(cands, taken, want, sep, (c) => hash2(c.i, c.j, HARDPOINT_KINDS.indexOf(kind) + 20)).forEach((c) => add1(kind, c, kind === 'market' ? { name: NAMES[home].market[counter.market ?? 0] } : {}));
  };
  spread('hangar', n.hangar);
  // A battery at every gate: guns within BATTERY.reach of the gate's point (a berth's approach point, or a hangar's
  // launch point straight out), each with that point in front of its own plating and not behind the planet.
  const gates = hps.filter((x) => x.kind === 'berth' || x.kind === 'hangar');
  for (const gate of gates) {
    const gp = gatePoint(gate);
    const h = len(sub(gp, f.centre)) - f.rOut;
    const maxAng = Math.min(BATTERY.reach / f.rOut, Math.acos(f.rOut / (f.rOut + h))) * 0.9;
    // Cell centres in reach, and finer points on the same plate (localCands): at real scale only the finer ones fit.
    const near = [...cands, ...localCands(f, g, gate.normal, maxAng)].filter((c) => ang(c.dir, gate.normal) < maxAng && sees(f, at(c.dir), c.dir, gp));
    const sep = Math.min(cellSep, maxAng / 3);
    for (const [kind, want] of [['turret', BATTERY.turrets], ['pointDefence', BATTERY.pointDefence]] as const) {
      pick(near, taken, want, sep, (c) => -ang(c.dir, gate.normal)).forEach((c) => add1(kind, c, { gate: gate.id }));
    }
  }
  for (const kind of ['reactor', 'shieldEmitter', 'drydock', 'market', 'sensor', 'minelayer'] as const) spread(kind, n[kind]);
  spread('turret', n.turret);
  spread('pointDefence', n.pointDefence);

  // Sections: a sphere round each one's plated cells.
  const N = ARMOUR[home].sections;
  const sums: V3[] = Array.from({ length: N }, () => [0, 0, 0]);
  const plates = new Array(N).fill(0);
  const dirs: V3[][] = Array.from({ length: N }, () => []);
  for (let i = 0; i < g.rings; i++) {
    for (let j = 0; j < g.per[i]; j++) {
      if (!g.plates[g.start[i] + j]) continue;
      const d = cellDir(f, g, i, j);
      const s = sectionIndex(f, d);
      sums[s] = add(sums[s], d); plates[s]++;
      if ((i + j) % 3 === 0) dirs[s].push(d);
    }
  }
  const total = plates.reduce((a, b) => a + b, 0);
  const rMid = (f.rIn + f.rOut) / 2;
  const sections: ArmourSection[] = sums.map((s, index) => {
    const c = len(s) > 1e-9 ? add(f.centre, mul(unit(s), rMid * Math.min(1, len(s) / Math.max(1, plates[index])))) : f.centre;
    let radius = 0;
    for (const d of dirs[index]) radius = Math.max(radius, len(sub(add(f.centre, mul(d, rMid)), c)));
    return { id: `${home}-s${index}`, station: home, index, centre: c, radius: radius + g.dt * f.rOut + (f.rOut - f.rIn), plates: plates[index], share: total ? plates[index] / total : 0 };
  });
  return { frame: f, grid: g, hardpoints: hps, sections, skin, k };
}

/** Every hardpoint of one structure. */
export const hardpointsOf = (home: ArmourHome, geo?: DestGeo[], shipLength?: number) => armourPlaces(geo, shipLength)[home].hardpoints;
/** Every hardpoint of every structure. */
export const allHardpoints = (geo?: DestGeo[], shipLength?: number) => ARMOUR_HOMES.flatMap((h) => hardpointsOf(h, geo, shipLength));
/** One structure's sections. */
export const sectionsOf = (home: ArmourHome, geo?: DestGeo[], shipLength?: number) => armourPlaces(geo, shipLength)[home].sections;
/** The berth hardpoint for a destination id ('stn-mars-1'). */
export const berthOf = (dest: string, geo?: DestGeo[], shipLength?: number): Hardpoint | undefined => {
  const home = dest.split('-')[1] as ArmourHome;
  return ARMOUR_HOMES.includes(home) ? hardpointsOf(home, geo, shipLength).find((h) => h.dest === dest) : undefined;
};
/** The mooring beside a berth. */
export const mooringOf = (berth: Hardpoint, geo?: DestGeo[], shipLength?: number) => hardpointsOf(berth.station, geo, shipLength).find((h) => h.berth === berth.id);

/**
 * The section of a structure at a world point on or just over its plating, or null if the point is on open sky or
 * away from the shell. `pad` widens the shell (scene units) for a hit test.
 */
export function sectionAt(home: ArmourHome, pos: V3, pad = 0, geo?: DestGeo[], shipLength?: number): string | null {
  const p = armourPlaces(geo, shipLength)[home];
  const off = sub(pos, p.frame.centre);
  const r = len(off);
  if (r < p.frame.rIn - pad || r > p.frame.rOut + p.skin + pad) return null;
  const d = mul(off, 1 / r);
  const pl = p.grid.plates[cellIndex(p.frame, p.grid, d).k];
  if (!pl) return null; // over plate, up to the mounts' reach (they stand on pylons to the outer radius)
  return `${home}-s${sectionIndex(p.frame, d)}`;
}
