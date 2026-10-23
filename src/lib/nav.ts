/**
 * Navigation for the voyage: where every destination sits, paths that go around bodies, autopilot ETAs,
 * bearings, and the route of stops. Pure functions only (no three.js), so all of it is unit-tested.
 */
import { AU_KM, HILL_KM, KM_PER_UNIT, LAYOUT, MOON_ORBIT_KM, ORBIT_AU, PLANET_ORDER, RADIUS_KM, norm360 } from './bodies';
import type { PlanetId, SphereId } from './bodies';
import { MAJOR_MOONS, MOON_LABEL, MOON_PLANET, isMajorMoon } from './moons';
import type { MajorMoonId } from './moons';
import { STATIONS, STATION_LABEL, stationById } from './stations';
import type { StationId } from './stations';

/** Earth, the planets, the stars and the edge; and, beyond those ten, the major moons and the stations (moons.ts, stations.ts). */
export type Dest = PlanetId | 'earth' | 'stars' | 'edge' | MajorMoonId | StationId;
export type V3 = [number, number, number];

/**
 * How much bigger the cosmos is than the ship. One scene unit is ship-sized (the player's hull is 0.371 units long,
 * an enemy patrol ship 0.6), and every distance in the cosmos is multiplied by this. Ships ×5 smaller (2026-10-21):
 * Earth's radius (2 × COSMOS) is its true 6,371 km, 59,059 units, 159,275 lengths of a 40 m cruiser. Real scale
 * (2026-10-20) had it at 11,812 units (200 m ships), and planet scale before that at 185 (370 units). Speeds in open space scale with it too, so a trip still takes the same seconds.
 * Weapons, the camera and the ships stay in ship units. See SPEC.md, "Scale", and REAL-SCALE-PLAN.md.
 */
export const COSMOS = RADIUS_KM.earth / KM_PER_UNIT / 2;
/** COSMOS while the cruiser was 200 m (real scale, until ships went ×5 smaller on 2026-10-21): the `scale` saves of then carry. */
export const COSMOS_200M = RADIUS_KM.earth / (0.2 / 0.3708) / 2;
/**
 * A saved position, written at `savedScale` (COSMOS when it was saved; 1 before the planet rescale), at today's scale.
 * Every body, orbit and station sits at a fixed multiple of COSMOS from Earth's centre, so scaling about the origin
 * keeps a ship's place against its body: the same side, the same height in that body's radii.
 */
export const migratePos = (pos: V3, savedScale = 1): V3 => [pos[0] * (COSMOS / savedScale), pos[1] * (COSMOS / savedScale), pos[2] * (COSMOS / savedScale)];
/** One astronomical unit in scene units (2.77e8). */
export const AU = AU_KM / KM_PER_UNIT;
/** Earth's radius and the three crystal shells round it (water, air, fire), in units of COSMOS. */
const NEAR = { earth: 2, water: 4, air: 6, fire: 9 } as const;
const onEcl0 = (lon: number, r: number): V3 => { const a = (lon * Math.PI) / 180; return [r * Math.cos(a), 0, -r * Math.sin(a)]; };
/** Where the Sun sits: 1 AU from Earth, at its layout angle. Every planet goes round it. */
export const SUN_POS: V3 = onEcl0(LAYOUT.sun, AU);
/** Where a body sits, from the layout: the Moon round Earth, the planets round the Sun at their true orbits. */
export function bodyPos(p: PlanetId, layout: Record<PlanetId | 'stars', number> = LAYOUT): V3 {
  if (p === 'moon') return onEcl0(layout.moon, MOON_ORBIT_KM / KM_PER_UNIT);
  const sun = onEcl0(layout.sun, AU);
  if (p === 'sun') return sun;
  const q = onEcl0(layout[p], ORBIT_AU[p] * AU);
  return [sun[0] + q[0], 0, sun[2] + q[2]];
}
/** The stars' waypoint, a game place past Saturn: 1.15 of Saturn's orbit from the Sun. */
export const STARS_R = 1.15 * ORBIT_AU.saturn * AU;
/** The edge: a sphere round the Sun at 1.3 of Saturn's orbit. Nothing flies past it. */
export const LIMIT = 1.3 * ORBIT_AU.saturn * AU;
/** The farthest anything is from Earth, for the far plane. */
export const FARTHEST = Math.hypot(...SUN_POS) + LIMIT;
/**
 * Distances in the flyable cosmos (scene units): Earth's radius and its shells, then each body's distance from Earth,
 * and the stars' and the edge's from the Sun. These were rings round Earth until real scale; now only the shells are,
 * and the rest keep the names for the map and the labels.
 */
export const VR = {
  ...Object.fromEntries(Object.entries(NEAR).map(([k, v]) => [k, v * COSMOS])),
  ...Object.fromEntries(PLANET_ORDER.map((p) => [p, Math.hypot(...bodyPos(p))])),
  stars: STARS_R, edge: LIMIT,
} as { readonly [K in keyof typeof NEAR | PlanetId | 'stars' | 'edge']: number };
/** Body radii in scene units, true to life: Earth = VR.earth = 6,371 km. */
export const BODY = Object.fromEntries(PLANET_ORDER.map((p) => [p, (RADIUS_KM[p] / RADIUS_KM.earth) * VR.earth])) as Record<PlanetId, number>;
/** Hill sphere radii in scene units. */
export const HILL = Object.fromEntries(Object.entries(HILL_KM).map(([k, v]) => [k, v / KM_PER_UNIT])) as Record<PlanetId | 'earth', number>;

/** Every destination, from Earth outward. */
export const DESTS: Dest[] = ['earth', ...PLANET_ORDER, 'stars', 'edge'];
/** The grand tour: every destination, from Earth outward. */
export const TOUR_ROUTE: Dest[] = ['earth', 'moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn', 'stars', 'edge'];
export const DEST_LABEL: Record<Dest, string> = {
  earth: 'Earth', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', sun: 'Sun', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', stars: 'Stars', edge: 'The edge',
  ...MOON_LABEL, ...STATION_LABEL,
};
/** Every destination: the ten, then the major moons, then the stations. */
export const ALL_DESTS: Dest[] = [...DESTS, ...MAJOR_MOONS, ...STATIONS.map((s) => s.id)];
export const isDest = (s: unknown): s is Dest => typeof s === 'string' && (ALL_DESTS as string[]).includes(s);

/**
 * Which zone a point is in. Inside a body's Hill sphere it is that body's (the Moon's before Earth's, which holds it;
 * Earth's is "near"). Out between the worlds it is the band of the nearest orbit by distance from the Sun: inside
 * 0.2 AU the Sun's, then Mercury's, Venus's, Earth's (near), Mars's, Jupiter's, Saturn's, the stars and the edge.
 */
export function zoneOf(pos: V3): SphereId {
  if (dist(pos, bodyPos('moon')) < HILL.moon) return 'moon';
  if (len(pos) < HILL.earth) return 'near';
  for (const p of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) if (dist(pos, bodyPos(p)) < HILL[p]) return p;
  const r = dist(pos, SUN_POS) / AU;
  if (r < 0.2) return 'sun';
  const bands: [SphereId, number][] = [['mercury', ORBIT_AU.mercury], ['venus', ORBIT_AU.venus], ['near', 1], ['mars', ORBIT_AU.mars], ['jupiter', ORBIT_AU.jupiter], ['saturn', ORBIT_AU.saturn], ['stars', STARS_R / AU], ['edge', LIMIT / AU]];
  for (let i = 0; i < bands.length - 1; i++) if (r < (bands[i][1] + bands[i + 1][1]) / 2) return bands[i][0];
  return 'edge';
}

// ---------- vectors ----------
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: V3, b: V3) => len(sub(a, b));
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = (a: V3): V3 => { const l = len(a); return l > 1e-12 ? scale(a, 1 / l) : [0, 0, 0]; };
const angleBetween = (a: V3, b: V3) => {
  const la = len(a);
  const lb = len(b);
  if (la < 1e-9 || lb < 1e-9) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (la * lb))));
};

/** An angle (degrees) and ring radius to a point on the plane (anticlockwise seen from above, +y). */
export const onEcl = (lon: number, r: number, y = 0): V3 => {
  const a = (lon * Math.PI) / 180;
  return [r * Math.cos(a), y, -r * Math.sin(a)];
};

// ---------- where things are ----------
/**
 * arrive: distance that counts as arriving; stop: where autopilot parks; size: body radius (0 = no body);
 * clear: the radius a path must stay outside (Saturn's includes its rings).
 */
/**
 * `park` and `parkSpeed`, when set, replace the autopilot's own parking tolerance and speed (parkSlack, AUTO.parkSpeed):
 * a station sets them in ship lengths, so the autopilot parks within docking range.
 */
export interface DestGeo {
  id: Dest; pos: V3; size: number; arrive: number; stop: number; clear: number; kind?: 'moon' | 'station'; park?: number; parkSpeed?: number;
  /** A world with god armour: the radius a path must stay outside to clear the plating and its mounts (world.ts). */
  shell?: number;
  /** The top of the plating and its mounts: a path between points over it (berths) never comes closer than this. */
  top?: number;
}

/** Where every destination sits, arrives and parks, from the fixed layout in bodies.ts. */
export function destGeometry(layout: Record<PlanetId | 'stars', number> = LAYOUT): DestGeo[] {
  const out: DestGeo[] = [];
  const e = VR.earth;
  const K = COSMOS;
  out.push({ id: 'earth', pos: [0, 0, 0], size: e, arrive: e * 4 + 1.5 * K, stop: e * 2.8 + 0.6 * K, clear: e * 1.25 + K });
  for (const p of PLANET_ORDER) {
    const size = BODY[p];
    const [arrive, stop] = p === 'sun' ? [size * 1.6, size * 1.4] : p === 'saturn' ? [size * 3.6, size * 2.7] : [size * 4 + 1.5 * K, size * 2.8 + 0.6 * K];
    out.push({ id: p, pos: bodyPos(p, layout), size, arrive, stop, clear: p === 'saturn' ? size * 2.4 + K : size * 1.25 + K });
  }
  const sun = bodyPos('sun', layout);
  out.push({ id: 'stars', pos: add(sun, onEcl(layout.stars, STARS_R * 0.985)), size: 0, arrive: 30 * K, stop: 12 * K, clear: 0 });
  out.push({ id: 'edge', pos: add(sun, [0, LIMIT - 5 * K, 0]), size: 0, arrive: 25 * K, stop: 8 * K, clear: 0 });
  return out;
}

/** The zone each destination sits in. */
export function destSphere(id: Dest): SphereId {
  if (isMajorMoon(id)) return MOON_PLANET[id];
  const st = stationById(id);
  if (st) return st.home === 'earth' ? 'near' : st.home;
  return id === 'earth' ? 'near' : (id as SphereId);
}

// ---------- paths around bodies ----------
/** Closest approach of segment a→b to point c: the parameter t in [0,1] and the distance. */
export function closest(a: V3, b: V3, c: V3): { t: number; d: number } {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, dot(sub(c, a), ab) / l2));
  return { t, d: dist(add(a, scale(ab, t)), c) };
}

const DETOUR = 1.35; // a detour point sits this far outside the clearance radius

function detour(a: V3, b: V3, obs: DestGeo[], depth: number): V3[] {
  if (depth > 6) return [];
  let worst: DestGeo | null = null;
  let worstPen = 0;
  let worstT = 0;
  for (const o of obs) {
    // A segment that starts (or ends) inside a clearance zone and moves away from the body is leaving it; let it.
    const { t, d } = closest(a, b, o.pos);
    if ((t <= 1e-6 && dist(a, o.pos) < o.clear) || (t >= 1 - 1e-6 && dist(b, o.pos) < o.clear)) continue;
    const pen = o.clear - d;
    if (pen > worstPen) { worst = o; worstPen = pen; worstT = t; }
  }
  if (!worst) return [];
  const ab = sub(b, a);
  const p = add(a, scale(ab, worstT));
  let off = sub(p, worst.pos);
  if (len(off) < worst.clear * 1e-3) {
    // Dead centre: go around over the top (+y), or sideways if the segment is vertical.
    off = cross(ab, [0, 1, 0]);
    if (len(off) < 1e-9) off = [1, 0, 0];
    off = cross(off, ab);
  }
  const via = add(worst.pos, scale(unit(off), worst.clear * DETOUR));
  return [...detour(a, via, obs, depth + 1), via, ...detour(via, b, obs, depth + 1)];
}

/**
 * Points to fly through on the way from `from` to a destination so that no leg passes through a body.
 * The destination's own body is not an obstacle: the ship flies at its centre and parks on the near side.
 */
export function planPath(from: V3, to: DestGeo, bodies: DestGeo[]): V3[] {
  return detour(from, to.pos, pathObstacles(from, to, bodies), 0);
}

/**
 * The bodies a path must go around, each with the clearance it is given. A station in low orbit sits inside its
 * planet's clearance; a body whose clearance holds the start or the destination has it shrunk to just under that point
 * (never below 1.02 of its radius), so the path still goes round the planet instead of ignoring it.
 */
export function pathObstacles(from: V3, to: DestGeo, bodies: DestGeo[]): DestGeo[] {
  return bodies.filter((b) => b.clear > 0 && b.id !== to.id).map((b) => {
    const room = Math.min(dist(from, b.pos) * 0.98, dist(to.pos, b.pos) - Math.max(to.size, 1e-6));
    // Never shrink it into a world's armour, unless the path starts or ends under the plating. Between points over the
    // plating (a berth's approach point is just over it, inside the armour's reach), never below the plating's top:
    // a chord from berth to berth on one world would otherwise skim the plating (a wall, a ring of shields).
    const dF = dist(from, b.pos);
    const dT = dist(to.pos, b.pos);
    const keep = !b.shell ? 0 : dF >= b.shell && dT >= b.shell ? b.shell : b.top && dF >= b.top && dT >= b.top ? b.top : 0;
    return room < b.clear ? { ...b, clear: Math.max(b.size * 1.02, keep, room) } : b;
  });
}

/** The smallest margin (distance minus clearance radius) a polyline keeps from the given bodies. */
export function pathMargin(points: V3[], bodies: DestGeo[]): number {
  let m = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    for (const o of bodies) if (o.clear > 0) m = Math.min(m, closest(points[i], points[i + 1], o.pos).d - o.clear);
  }
  return m;
}

// ---------- autopilot model and ETAs ----------
/** The autopilot's speed profile; Voyage flies by these same numbers. */
export const AUTO = {
  speed: 400 * COSMOS, // top speed in open space (74,000 units/s, 200,000 ship lengths a second)
  gain: 0.5, // cruise speed = remaining distance × gain, so it brakes on its own momentum
  min: 0.25 * COSMOS,
  accel: 1.2, // speed eases toward what is wanted at this rate (1/s)...
  decel: 2.2, // ...or this one when slowing
  grip: 7, // the hull's velocity follows the set speed at this rate on autopilot
  corner: 0.8, // approaching a detour point: speed ≤ distance × corner + cornerMin
  cornerMin: 25 * COSMOS,
  faceTurn: 0.555, // radians off the nose (cos = 0.85) before it will cruise rather than turn in place
  turnRate: 1.45, // rad/s: yaw and pitch turn together, and it creeps forward while turning (fitted to flights)
  creep: 0.4 * COSMOS, // the least it creeps forward at while turning to face the way
  parkSpeed: 0.6 * COSMOS, // parked once within parkSlack of the stop and slower than this
  viaReach: [2 * COSMOS, 40 * COSMOS] as const, // a detour point counts as passed within speed × 0.5, clamped to this
};

/** Seconds to turn the nose by `angle` radians before cruising. */
export const alignTime = (angle: number) => (angle > AUTO.faceTurn ? (angle - AUTO.faceTurn) / AUTO.turnRate + 0.2 : 0);

/** Where autopilot considers itself parked: within this of the stop distance, and slower than 0.6. */
export const parkSlack = (stop: number, park?: number) => park ?? stop * 0.06 + 0.15 * COSMOS;
/** The speed below which the autopilot counts itself parked at `d`. */
export const parkSpeedAt = (d: { parkSpeed?: number }) => d.parkSpeed ?? AUTO.parkSpeed;
/**
 * The least cruise speed short of the stop. In open space 0.25 × COSMOS; at a berth, half its park speed, so the
 * autopilot can creep the last ship lengths to the approach point instead of coasting 20 units past it into the plating.
 */
export const minSpeed = (parkSpeed: number = AUTO.parkSpeed) => (parkSpeed < AUTO.parkSpeed ? parkSpeed * 0.5 : AUTO.min);

/**
 * Seconds for the autopilot to fly a path (segment lengths, with detour corners between them) and park
 * `stop` short of its end, starting at speed v0. Simulates the same profile the frame loop flies.
 */
export function flightTime(segs: number[], stop: number, v0 = 0, park?: number, parkSpeed: number = AUTO.parkSpeed): number {
  const total = segs.reduce((s, x) => s + x, 0) - stop;
  if (total <= parkSlack(stop, park)) return 0;
  const corners: number[] = [];
  let acc = 0;
  for (let i = 0; i < segs.length - 1; i++) { acc += segs[i]; corners.push(acc); }
  const dt = 1 / 30;
  let s = 0;
  let v = Math.max(0, v0); // the speed the engines are set to
  let u = v; // the speed actually moving, which follows v with the hull's grip
  let t = 0;
  let ci = 0;
  for (let i = 0; i < 200000; i++) {
    const rem = total - s;
    if (rem < parkSlack(stop, park) && u < parkSpeed) break;
    while (ci < corners.length && corners[ci] <= s) ci++;
    let want = Math.max(minSpeed(parkSpeed), Math.min(AUTO.speed, rem * AUTO.gain));
    if (ci < corners.length) want = Math.min(want, (corners[ci] - s) * AUTO.corner + AUTO.cornerMin);
    if (rem <= 0) want = 0;
    v += (want - v) * (1 - Math.exp(-dt * (want < v ? AUTO.decel : AUTO.accel)));
    u += (v - u) * (1 - Math.exp(-dt * AUTO.grip));
    s += u * dt;
    t += dt;
  }
  return t;
}

export interface LegPlan { dest: Dest; from: V3; vias: V3[]; length: number; eta: number }

/** One leg: path from a point to a destination, its length to the parking point, and its flight time. */
export function planLeg(from: V3, fwd: V3 | null, to: DestGeo, bodies: DestGeo[], v0 = 0): LegPlan {
  const vias = planPath(from, to, bodies);
  const pts = [from, ...vias, to.pos];
  const segs = pts.slice(1).map((p, i) => dist(p, pts[i]));
  let turns = fwd ? alignTime(angleBetween(fwd, sub(pts[1], from))) : 0;
  // At a detour corner the ship is already moving and starts its turn early, so a corner costs about half a turn in place.
  for (let i = 1; i < pts.length - 1; i++) turns += 0.5 * alignTime(angleBetween(sub(pts[i], pts[i - 1]), sub(pts[i + 1], pts[i])));
  const length = Math.max(0, segs.reduce((s, x) => s + x, 0) - to.stop);
  return { dest: to.id, from, vias, length, eta: flightTime(segs, to.stop, v0, to.park, parkSpeedAt(to)) + turns };
}

/** Where the autopilot parks at a destination when it comes in from `from`. */
export function parkPoint(from: V3, to: DestGeo): V3 {
  const d = sub(from, to.pos);
  return len(d) < 1e-9 ? add(to.pos, [to.stop, 0, 0]) : add(to.pos, scale(unit(d), to.stop));
}

/** Legs from the ship through the remaining stops, each starting where the last one parked. */
export function planRoute(shipPos: V3, shipFwd: V3, stops: Dest[], index: number, bodies: DestGeo[], v0 = 0): LegPlan[] {
  const legs: LegPlan[] = [];
  let from = shipPos;
  let fwd: V3 | null = shipFwd;
  for (let i = Math.max(0, index); i < stops.length; i++) {
    const to = bodies.find((b) => b.id === stops[i]);
    if (!to) continue;
    const leg = planLeg(from, fwd, to, bodies, i === index ? v0 : 0);
    legs.push(leg);
    const last = leg.vias.length ? leg.vias[leg.vias.length - 1] : from;
    const park = parkPoint(last, to);
    fwd = sub(to.pos, last); // arriving nose-on to the body
    from = park;
  }
  return legs;
}

// ---------- orbits ----------
/**
 * How far out a body holds the ship in orbit when the engines are off. The Sun's reach stops at its arrival distance,
 * so its orbit never sweeps through the inner planets; the stars, the edge and the stations have no body to orbit.
 */
export const orbitZone = (d: DestGeo) => (d.size <= 0 || d.kind === 'station' ? 0 : d.id === 'sun' ? d.arrive : d.size * 4 + 10 * COSMOS); // a station holds no orbit

/**
 * Seconds for one lap at distance r from the body's centre. 45 s at the autopilot's parking distance, and slower
 * further out as r^1.5 (Kepler's third law, scaled per body: the masses are not to scale in this cosmos).
 */
export function orbitPeriod(d: DestGeo, r: number): number {
  return Math.max(20, Math.min(600, 45 * Math.pow(Math.max(r, d.size) / d.stop, 1.5)));
}

/**
 * The body the ship orbits from here: the one whose surface is nearest among those whose orbit zone it is in.
 * Once orbiting, it keeps that body until it leaves 10% past the zone, so it never flips between two at a border.
 */
export function orbitBody(pos: V3, bodies: DestGeo[], current: Dest | null = null): DestGeo | null {
  // Alongside a station the ship keeps station with it rather than orbiting the planet beneath (it would drift out of docking range).
  for (const b of bodies) if (b.kind === 'station' && dist(pos, b.pos) < b.arrive) return null;
  const cur = current ? bodies.find((b) => b.id === current) : undefined;
  if (cur && orbitZone(cur) > 0 && dist(pos, cur.pos) < orbitZone(cur) * 1.1) return cur;
  let best: DestGeo | null = null;
  let gap = Infinity;
  for (const b of bodies) {
    const z = orbitZone(b);
    const d = dist(pos, b.pos);
    if (z > 0 && d < z && d - b.size < gap) { best = b; gap = d - b.size; }
  }
  return best;
}

/** Turn a point about a body's centre by `angle` radians about +y (+ is anticlockwise seen from above). */
export function orbitStep(pos: V3, centre: V3, angle: number): V3 {
  const x = pos[0] - centre[0];
  const z = pos[2] - centre[2];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [centre[0] + x * c + z * s, pos[1], centre[2] - x * s + z * c];
}

// ---------- the ship's frame ----------
export interface Axes { fwd: V3; right: V3; up: V3 }
/** The ship's axes for a yaw and pitch (three.js 'YXZ' order; yaw 0 faces −z). */
export function shipAxes(yaw: number, pitch: number): Axes {
  const fwd: V3 = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  const right: V3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
  return { fwd, right, up: cross(right, fwd) };
}

/** Bearing of a point from the ship: azimuth off the nose (+ right) and elevation (+ up), in degrees. */
export function bearingTo(pos: V3, axes: Axes, target: V3): { az: number; el: number } {
  const d = sub(target, pos);
  const x = dot(d, axes.right);
  const y = dot(d, axes.up);
  const z = dot(d, axes.fwd);
  return { az: (Math.atan2(x, z) * 180) / Math.PI, el: (Math.atan2(y, Math.hypot(x, z)) * 180) / Math.PI };
}

/** The angle round from +x (anticlockwise seen from above) and the elevation a direction points to (y = up). */
export function lonLatOf(dir: V3): { lon: number; lat: number } {
  const u = unit(dir);
  return { lon: norm360((Math.atan2(-u[2], u[0]) * 180) / Math.PI), lat: (Math.asin(Math.max(-1, Math.min(1, u[1]))) * 180) / Math.PI };
}


// ---------- the route ----------
export interface RouteState {
  stops: Dest[];
  index: number; // the stop being flown to (or waited at); stops.length when the route is complete
  engaged: boolean; // autopilot is flying it (false once you take the controls; Resume re-engages)
  waiting: boolean; // parked at stops[index], showing its card
}
export const EMPTY_ROUTE: RouteState = { stops: [], index: 0, engaged: false, waiting: false };

export const routeDone = (r: RouteState) => r.stops.length > 0 && r.index >= r.stops.length;
export const routeCurrent = (r: RouteState): Dest | null => r.stops[r.index] ?? null;

export function routeAdd(r: RouteState, d: Dest): RouteState {
  // Adding to a finished route starts the new stop as the next one.
  return { ...r, stops: [...r.stops, d] };
}

export function routeRemove(r: RouteState, i: number): RouteState {
  if (i < 0 || i >= r.stops.length) return r;
  const stops = r.stops.filter((_, k) => k !== i);
  let { index, waiting } = r;
  if (i < index) index--;
  else if (i === index) waiting = false; // the stop being flown to is gone: on to the next one
  if (!stops.length) return { ...EMPTY_ROUTE };
  return { ...r, stops, index: Math.min(index, stops.length), waiting };
}

export function routeMove(r: RouteState, i: number, delta: -1 | 1): RouteState {
  const j = i + delta;
  if (i < 0 || j < 0 || i >= r.stops.length || j >= r.stops.length) return r;
  const stops = [...r.stops];
  [stops[i], stops[j]] = [stops[j], stops[i]];
  // The ship keeps flying to the same destination it was flying to.
  const index = r.index === i ? j : r.index === j ? i : r.index;
  return { ...r, stops, index, waiting: r.waiting && index === r.index };
}

/** Leave the stop you are parked at for the next one. */
export function routeContinue(r: RouteState): RouteState {
  const index = Math.min(r.index + 1, r.stops.length);
  return { ...r, index, waiting: false, engaged: index < r.stops.length };
}

/** Parked at the current stop. */
export const routeArrived = (r: RouteState): RouteState => ({ ...r, waiting: true });

/** Sanitise a route read back from a save. */
export function routeFromSave(raw: unknown): RouteState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_ROUTE };
  const o = raw as Partial<RouteState>;
  const stops = Array.isArray(o.stops) ? o.stops.filter(isDest) : [];
  if (!stops.length) return { ...EMPTY_ROUTE };
  const index = Math.max(0, Math.min(stops.length, Math.floor(Number(o.index) || 0)));
  return { stops, index, engaged: !!o.engaged && index < stops.length, waiting: !!o.waiting && index < stops.length };
}

// ---------- formatting ----------
export function fmtEta(s: number | null): string {
  if (s === null || !Number.isFinite(s)) return '—';
  if (s < 1) return '<1 s';
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} m ${String(Math.round(s - m * 60)).padStart(2, '0')} s`;
  const h = Math.floor(m / 60);
  return h >= 100 ? '>99 h' : `${h} h ${String(m - h * 60).padStart(2, '0')} m`;
}

export const fmtDist = (d: number) => (d >= 100 ? Math.round(d).toLocaleString('en-US') : d >= 10 ? d.toFixed(0) : d.toFixed(1));

/** An elevation with its plus or minus, never "−0". */
export function fmtLat(lat: number, digits = 0): string {
  const v = +lat.toFixed(digits);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}°`;
}

export function fmtBearing(az: number, el: number): string {
  const a = Math.round(Math.abs(az));
  const e = Math.round(el);
  if (Math.abs(e) >= 80) return `${Math.abs(e)}° ${e > 0 ? 'up' : 'down'}`; // nearly overhead: left or right means little
  const h = a <= 1 ? 'ahead' : a >= 179 ? 'astern' : `${a}° ${az > 0 ? 'R' : 'L'}`;
  return e === 0 ? h : `${h}, ${Math.abs(e)}° ${e > 0 ? 'up' : 'down'}`;
}
