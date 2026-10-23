/**
 * A swarm: up to a few hundred drones of one role, launched from one carrier, flying as a flock. Pure (no three.js),
 * so all of it is unit-tested and the scene only draws it.
 *
 * Members live in flat typed arrays (structure of arrays), not objects, so hundreds cost one allocation and the step
 * touches memory in order. Positions are Float64: drones fly ten thousand ship lengths from the Sun, where a Float32
 * would round a position to more than a drone's own length.
 *
 * Each step a role "brain" gives every member a goal point, then the flock rule (separation, alignment, cohesion and
 * the goal, Reynolds 1987) moves it, steering by its nearest few neighbours only (Ballerini et al. 2008). Members never
 * hold fixed places: slots are handed out by rank among the living each step, so when members die the rest close up.
 */
import type { V3 } from '../nav';
import { add, cross, dist, dot, len, scale, sub, unit } from '../nav';
import type { FleetOrder, Side } from './refs';
import type { SwarmRole } from './roles';
import { BUBBLE_COVER, GUARD, ROLES, SHELL_GAP, STALK_MAX, STALK_READY, STANDOFF, STRIKE_SPEED } from './roles';

/** Member states. */
export const BAY = 0;
export const FLYING = 1;
export const DEAD = 2;

/** A ship as the swarm sees it: anything it can launch from, guard, attack or be shot by. */
export interface ShipRef {
  id: number;
  side: Side;
  pos: V3;
  vel: V3;
  /** Hull radius, world units. */
  radius: number;
  alive: boolean;
  /** Guns it turns on hostile drones. */
  pd: number;
  flak: number;
}

export interface SwarmWorld {
  time: number;
  /** The player ship's length in world units. */
  L: number;
  ships: Map<number, ShipRef>;
  bodies: { pos: V3; size: number }[];
}

export interface SwarmStats {
  launched: number;
  docked: number;
  lost: number;
  /** Explosive drones that went off (their job, not losses). */
  spent: number;
  /** Explosive: blasts set off. Laser: seconds of beam on target, summed over beams. Shield: hits soaked. */
  work: number;
  /** Damage dealt to ships. */
  damage: number;
}

export type Phase = 'launch' | 'stalk' | 'strike' | 'focus' | 'approach' | 'guard' | 'hold' | 'home';

export interface Swarm {
  id: number;
  name: string;
  side: Side;
  role: SwarmRole;
  carrier: number;
  order: FleetOrder;
  /** Members built (the most it can field). */
  size: number;
  state: Uint8Array;
  pos: Float64Array;
  vel: Float64Array;
  goal: Float64Array;
  hp: Float32Array;
  /** Per member: the ship id (≥ 0) it is diving on, or −1. */
  aimAt: Int32Array;
  /** Explosive stalk: each member's station on the sphere round the target, and how many stations were handed out. */
  slot: Int32Array;
  slotN: number;
  /** Speed cap multiplier this step (an explosive drone's strike). */
  boost: number;
  /** Explosive: per member, 0 stalking, 1 diving in (its wave has gone); and the world time its wave lands. */
  wave: Uint8Array;
  arrive: Float64Array;
  /** Explosive: waves sent in so far. */
  waves: number;
  /**
   * Explosive: hunt as a pack (stalk, encircle, strike together). False streams every drone straight in as it
   * launches: what a green crew does, and the case point defence and flak are best against.
   */
  pack: boolean;
  launching: boolean;
  launchAcc: number;
  phase: Phase;
  phaseT: number;
  /** Shield: closed bubble or a wall toward the threat. */
  mode: 'bubble' | 'wall' | null;
  /** The ship it works round (ward, target or carrier) and its velocity, so slots ride along with it. */
  frameVel: V3;
  /** The ship it attacks (explosive, laser) or guards (shield), or null. */
  target: number | null;
  /** Laser: the one point every beam meets. Shield: the way the wall faces. */
  aim: V3 | null;
  axis: V3;
  centroid: V3;
  /** Distance from the centroid to the farthest flying member, world units. */
  spread: number;
  flying: number;
  inBay: number;
  stats: SwarmStats;
  rng: () => number;
}

let swarmIds = 1;

/** A small seeded random generator (mulberry32), so a test run is the same every time. */
export function rngOf(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSwarm(o: { side: Side; role: SwarmRole; carrier: number; size: number; order?: FleetOrder; name?: string; seed?: number }): Swarm {
  const n = Math.max(0, Math.floor(o.size));
  const id = swarmIds++;
  const hp = new Float32Array(n).fill(ROLES[o.role].hp);
  return {
    id, name: o.name ?? `${o.role} ${id}`, side: o.side, role: o.role, carrier: o.carrier,
    order: o.order ?? { kind: 'follow', leader: o.carrier }, size: n,
    state: new Uint8Array(n), pos: new Float64Array(n * 3), vel: new Float64Array(n * 3), goal: new Float64Array(n * 3), hp,
    aimAt: new Int32Array(n).fill(-1), slot: new Int32Array(n), slotN: -1, boost: 1, wave: new Uint8Array(n), arrive: new Float64Array(n), waves: 0, pack: true,
    launching: false, launchAcc: 0, phase: 'launch', phaseT: 0, mode: null, frameVel: [0, 0, 0], target: null, aim: null, axis: [0, 0, 1],
    centroid: [0, 0, 0], spread: 0, flying: 0, inBay: n,
    stats: { launched: 0, docked: 0, lost: 0, spent: 0, work: 0, damage: 0 }, rng: rngOf(o.seed ?? id * 7919),
  };
}

export const memberPos = (s: Swarm, i: number): V3 => [s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]];
export const memberVel = (s: Swarm, i: number): V3 => [s.vel[i * 3], s.vel[i * 3 + 1], s.vel[i * 3 + 2]];
const setV = (a: Float64Array, i: number, v: V3) => { a[i * 3] = v[0]; a[i * 3 + 1] = v[1]; a[i * 3 + 2] = v[2]; };

/** Open the bay: members leave at the role's launch rate until the bay is empty or the swarm is recalled. */
export function launch(s: Swarm) {
  s.launching = true;
  if (s.order.kind === 'recall') s.order = { kind: 'follow', leader: s.carrier };
}
/** Call every member home to dock. Docked drones are back in the bay, repaired, ready to launch again. */
export function recall(s: Swarm) {
  s.launching = false;
  s.order = { kind: 'recall', carrier: s.carrier };
}
/** A fleet-command order. Recall stops the launch; anything else opens the bay if nothing is flying yet. */
export function setOrder(s: Swarm, o: FleetOrder) {
  if (o.kind === 'recall') { recall(s); return; }
  s.order = o.kind === 'path' ? { ...o, points: [...o.points] } : o;
  s.wave.fill(0);
  s.slotN = -1;
  if (s.flying === 0 && s.inBay > 0) s.launching = true;
  s.phase = 'launch';
  s.phaseT = 0;
}

/** Kill member `i` (shot down, burst, or lost with its carrier). */
export function killMember(s: Swarm, i: number) {
  if (s.state[i] === DEAD) return;
  if (s.state[i] === BAY) s.inBay--; else s.flying--;
  s.state[i] = DEAD;
  s.hp[i] = 0;
  s.stats.lost++;
}

/** Damage member `i`; true when that killed it. */
export function hurtMember(s: Swarm, i: number, amount: number): boolean {
  if (s.state[i] !== FLYING) return false;
  s.hp[i] -= amount;
  if (s.hp[i] > 0) return false;
  killMember(s, i);
  return true;
}

// ---------- Slots ----------
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Point `k` of `n` spread evenly over the unit sphere (a Fibonacci lattice). */
export function sphereSlot(k: number, n: number): V3 {
  const y = 1 - (2 * (k + 0.5)) / Math.max(1, n);
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const a = k * GOLDEN;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}
/** Point `k` of `n` spread evenly over a unit disc (a sunflower), as [x, y] in the disc's plane. */
export function discSlot(k: number, n: number): [number, number] {
  const r = Math.sqrt((k + 0.5) / Math.max(1, n));
  const a = k * GOLDEN;
  return [Math.cos(a) * r, Math.sin(a) * r];
}
/** Two unit vectors square to `d` and to each other. */
export function basisOf(d: V3): [V3, V3] {
  const f = unit(d);
  let r = cross(f, Math.abs(f[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0]);
  r = unit(r);
  return [r, unit(cross(r, f))];
}

/** The share of a sphere of radius `R` that `n` shield fields of radius `field` can cover (1 or more: closed). */
export const shellCover = (n: number, field: number, R: number) => (n * field * field) / (4 * R * R);

/** Where a shield swarm stands: bubble round the ward, or a wall between it and the threat. World units. */
export function shieldSlots(n: number, ward: V3, wardRadius: number, threat: V3, L: number): { mode: 'bubble' | 'wall'; slots: V3[] } {
  const R = wardRadius + SHELL_GAP * L;
  const field = ROLES.shield.area * L;
  const slots: V3[] = [];
  if (shellCover(n, field, R) >= BUBBLE_COVER) {
    for (let k = 0; k < n; k++) slots.push(add(ward, scale(sphereSlot(k, n), R)));
    return { mode: 'bubble', slots };
  }
  // A wall: a disc square to the threat, as wide as the ward plus a field, R out from the ward's centre.
  const f = unit(threat);
  const [a, b] = basisOf(f);
  const c = add(ward, scale(f, R));
  const rd = Math.min(wardRadius + field, Math.sqrt(n) * field * 0.95);
  for (let k = 0; k < n; k++) {
    const [x, y] = discSlot(k, n);
    slots.push(add(c, add(scale(a, x * rd), scale(b, y * rd))));
  }
  return { mode: 'wall', slots };
}

// ---------- Brains: a goal for every flying member ----------
function flyingIdx(s: Swarm): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.size; i++) if (s.state[i] === FLYING) out.push(i);
  return out;
}

/** The nearest live ship of the other side to `p` within `range` (world units), or null. */
export function nearestEnemy(w: SwarmWorld, side: Side, p: V3, range: number): ShipRef | null {
  let best: ShipRef | null = null;
  let bd = range;
  for (const sh of w.ships.values()) {
    if (!sh.alive || sh.side === side) continue;
    const d = dist(p, sh.pos);
    if (d < bd) { best = sh; bd = d; }
  }
  return best;
}

/** Hostile drones near a point, for escorts: [swarm, member] pairs within `range`, nearest first. */
export type Threat = { s: Swarm; i: number; d: number };
export function dronesNear(swarms: Swarm[], side: Side, p: V3, range: number): Threat[] {
  const out: Threat[] = [];
  for (const o of swarms) {
    if (o.side === side || o.flying === 0) continue;
    if (dist(o.centroid, p) - o.spread > range) continue;
    for (let i = 0; i < o.size; i++) {
      if (o.state[i] !== FLYING) continue;
      const d = Math.hypot(o.pos[i * 3] - p[0], o.pos[i * 3 + 1] - p[1], o.pos[i * 3 + 2] - p[2]);
      if (d <= range) out.push({ s: o, i, d });
    }
  }
  return out.sort((a, b) => a.d - b.d);
}

/**
 * Give each flying member a station on the sphere round `centre`: greedy, the member nearest a station takes it, so
 * the pack spreads over the sphere without anyone flying across it.
 */
function assignStations(s: Swarm, idx: number[], centre: V3) {
  const n = idx.length;
  s.slotN = n;
  const free = new Set<number>(Array.from({ length: n }, (_, k) => k));
  const dirs = idx.map((i) => unit(sub(memberPos(s, i), centre)));
  const todo = new Set<number>(idx.map((_, k) => k));
  while (todo.size) {
    let best = -2, bm = -1, bk = -1;
    for (const m of todo) for (const k of free) {
      const c = dot(dirs[m], sphereSlot(k, n));
      if (c > best) { best = c; bm = m; bk = k; }
    }
    s.slot[idx[bm]] = bk;
    todo.delete(bm);
    free.delete(bk);
  }
}

/** Escort station: a loose shell round the ward. */
function escortGoals(s: Swarm, idx: number[], ward: ShipRef, L: number) {
  const R = ward.radius + 4 * L;
  idx.forEach((i, k) => setV(s.goal, i, add(ward.pos, scale(sphereSlot(k, idx.length), R))));
}

/** Who the swarm works round, from its order. Null: nothing (an attack target died, or the leader is gone). */
function anchorShip(s: Swarm, w: SwarmWorld): ShipRef | null {
  const o = s.order;
  const id = o.kind === 'follow' ? o.leader : o.kind === 'defend' ? o.ward : o.kind === 'recall' ? o.carrier : o.kind === 'attack' ? o.target : null;
  if (id === null) return null;
  const sh = w.ships.get(id);
  return sh && sh.alive ? sh : null;
}

function brain(s: Swarm, w: SwarmWorld, swarms: Swarm[], dt: number) {
  const L = w.L;
  const spec = ROLES[s.role];
  const idx = flyingIdx(s);
  s.boost = 1;
  s.aim = null;
  s.phaseT += dt;
  for (const i of idx) s.aimAt[i] = -1;
  const carrier = w.ships.get(s.carrier);
  let anchor = anchorShip(s, w);
  // An attack target that died: explosive and laser swarms pick the nearest hostile near them, else go home.
  if (s.order.kind === 'attack' && !anchor) {
    const near = nearestEnemy(w, s.side, s.centroid, Math.max(spec.range, GUARD) * L * 3);
    if (near) { s.order = { kind: 'attack', target: near.id }; anchor = near; s.phase = 'launch'; s.phaseT = 0; }
    else { s.order = { kind: 'follow', leader: s.carrier }; anchor = carrier && carrier.alive ? carrier : null; }
  }
  const o = s.order;
  s.frameVel = anchor ? anchor.vel : [0, 0, 0];

  // ---- Fixed points: hold, path, a lost leader ----
  if (o.kind === 'hold' || o.kind === 'path' || (!anchor && o.kind !== 'recall')) {
    let at: V3 = o.kind === 'hold' ? o.at : s.centroid;
    if (o.kind === 'path') {
      const goal = o.points[o.next];
      if (goal && dist(s.centroid, goal) < 6 * L) o.next = o.loop ? (o.next + 1) % o.points.length : Math.min(o.next + 1, o.points.length);
      at = o.points[Math.min(o.next, o.points.length - 1)] ?? s.centroid;
    }
    s.phase = 'hold';
    s.target = null;
    idx.forEach((i, k) => setV(s.goal, i, add(at, scale(sphereSlot(k, idx.length), Math.cbrt(idx.length) * spec.sepDist * L))));
    return;
  }
  if (o.kind === 'recall') {
    s.phase = 'home';
    s.target = null;
    const home = carrier && carrier.alive ? carrier.pos : s.centroid;
    for (const i of idx) setV(s.goal, i, home);
    return;
  }
  const a = anchor!;

  if (s.role === 'shield') {
    // The ward is the ship it defends or follows; on an attack order it screens its own carrier from the target.
    const ward = o.kind === 'attack' ? (carrier && carrier.alive ? carrier : a) : a;
    s.frameVel = ward.vel;
    s.target = ward.id;
    const near = dronesNear(swarms, s.side, ward.pos, GUARD * L)[0];
    const foe = o.kind === 'attack' ? a : nearestEnemy(w, s.side, ward.pos, 600 * L);
    let threat: V3 = near ? sub(memberPos(near.s, near.i), ward.pos) : foe ? sub(foe.pos, ward.pos) : len(ward.vel) > 1e-6 ? ward.vel : [0, 0, -1];
    if (len(threat) < 1e-9) threat = [0, 0, -1];
    // The wall turns toward the threat at a limited rate, so it sweeps instead of jumping.
    s.axis = unit(add(scale(s.axis, Math.max(0, 1 - dt * 4)), scale(unit(threat), Math.min(1, dt * 4))));
    if (len(s.axis) < 1e-6) s.axis = unit(threat);
    const { mode, slots } = shieldSlots(idx.length, ward.pos, ward.radius, s.axis, L);
    s.mode = mode;
    s.aim = s.axis;
    s.phase = 'guard';
    idx.forEach((i, k) => setV(s.goal, i, slots[k]));
    return;
  }

  // Escorts (defend, follow): explosive and laser drones ring the ward and go for hostile drones that come in.
  if (o.kind === 'defend' || o.kind === 'follow') {
    s.phase = 'guard';
    s.target = null;
    escortGoals(s, idx, a, L);
    const threats = dronesNear(swarms, s.side, a.pos, GUARD * L);
    if (threats.length && s.role === 'explosive') {
      idx.forEach((i, k) => {
        const t = threats[k % threats.length];
        setV(s.goal, i, memberPos(t.s, t.i));
      });
      s.boost = STRIKE_SPEED;
    } else if (s.role === 'explosive') {
      s.wave.fill(0);
    }
    return;
  }

  // ---- Attack ----
  s.target = a.id;
  const toT = sub(s.centroid, a.pos);
  if (s.role === 'explosive') {
    // A wolf pack (Muro et al. 2011): close to a safe distance, spread round the prey away from each other, then all
    // go in at once from every side, so the target's point defence and flak cannot take them one direction at a time.
    const R = spec.range * L;
    // Members go in waves: those on the ring when the pack is ready strike together; latecomers keep stalking and
    // make the next wave. A stream (no pack) sends every drone straight in.
    const t0 = w.time;
    const stalkers = idx.filter((i) => s.wave[i] === 0);
    if (!s.pack) for (const i of stalkers) { s.wave[i] = 1; s.arrive[i] = 0; }
    else if (stalkers.length) {
      // Hand out stations spread over the whole sphere round the target, nearest first.
      if (s.slotN !== stalkers.length) assignStations(s, stalkers, a.pos);
      let ready = 0;
      const onRing: number[] = [];
      for (const i of stalkers) {
        const p = memberPos(s, i);
        const d = dist(p, a.pos);
        let out = sub(p, a.pos);
        if (len(out) < 1e-6) out = [1, 0, 0];
        const want = sphereSlot(s.slot[i], stalkers.length);
        const here = unit(out);
        if (d > R * 0.75 && d < R * 1.3) { onRing.push(i); if (dot(here, want) > 0.9) ready++; }
        // Work round the sphere toward the station, never across it (that would pass the target's guns).
        const step = unit(add(scale(here, 0.75), scale(want, 0.25)));
        setV(s.goal, i, add(a.pos, scale(dot(here, want) > 0.95 ? want : step, R)));
      }
      if (s.phase !== 'stalk' && s.phase !== 'strike') s.phaseT = 0;
      const launched = !s.launching || s.inBay === 0;
      if (onRing.length && launched && (ready >= STALK_READY * stalkers.length || s.phaseT > STALK_MAX)) {
        // Time on target: the farthest drone on the ring sets it, and the nearer ones slow so the wave lands at once.
        let far = 0;
        for (const i of onRing) far = Math.max(far, dist(memberPos(s, i), a.pos) - a.radius);
        const at = t0 + far / (spec.speed * STRIKE_SPEED * L) + 0.1;
        for (const i of onRing) { s.wave[i] = 1; s.arrive[i] = at; }
        s.waves++;
        s.phaseT = 0;
        s.slotN = -1;
      }
    }
    let striking = 0;
    for (const i of idx) {
      if (s.wave[i] !== 1) continue;
      striking++;
      // Lead the target: aim where it will be when this drone gets there. Each drone dives on the side of the hull it
      // comes from, so the wave does not funnel into one point.
      const p = memberPos(s, i);
      const t = dist(p, a.pos) / (spec.speed * STRIKE_SPEED * L);
      setV(s.goal, i, add(add(a.pos, scale(a.vel, t)), scale(unit(sub(p, a.pos)), a.radius * 0.5)));
      s.aimAt[i] = a.id;
    }
    s.phase = striking ? 'strike' : 'stalk';
    return;
  }

  // Laser focus: a ring square to the line of fire, every beam on one point of the target's hull.
  const range = spec.range * L;
  const d = len(toT);
  if (d > 1e-6) s.axis = unit(add(scale(s.axis, Math.max(0, 1 - dt * 0.8)), scale(unit(toT), Math.min(1, dt * 0.8))));
  if (len(s.axis) < 1e-6) s.axis = [0, 0, 1];
  const standoff = Math.max(a.radius + 6 * L, range * STANDOFF);
  s.phase = d < range ? 'focus' : 'approach';
  const c = add(a.pos, scale(s.axis, standoff));
  const [u, v] = basisOf(s.axis);
  const n = idx.length;
  const ring = Math.max(3 * L, (n * spec.sepDist * 1.4 * L) / (2 * Math.PI));
  idx.forEach((i, k) => {
    // The ring turns slowly (milling), so drones are never parked where a gunner last saw them.
    const ang = (k / Math.max(1, n)) * Math.PI * 2 + w.time * 0.25;
    setV(s.goal, i, add(c, add(scale(u, Math.cos(ang) * ring), scale(v, Math.sin(ang) * ring))));
  });
  s.aim = add(a.pos, scale(s.axis, a.radius * 0.85));
}

// ---------- The flock ----------
const HASH = 4096; // buckets; more members than this share buckets, which only costs extra distance checks
const head = new Int32Array(HASH);
let next = new Int32Array(256);
const cellKey = (x: number, y: number, z: number) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) & (HASH - 1);

const nbI = new Int32Array(16);
const nbD = new Float64Array(16);

/** One flocking step for every flying member: neighbours from a spatial hash, forces, then move. */
function flock(s: Swarm, w: SwarmWorld, dt: number) {
  const L = w.L;
  const spec = ROLES[s.role];
  const cell = spec.view * L;
  const K = Math.min(spec.neighbours, nbI.length);
  if (next.length < s.size) next = new Int32Array(s.size * 2);
  head.fill(-1);
  const P = s.pos;
  const V = s.vel;
  for (let i = 0; i < s.size; i++) {
    if (s.state[i] !== FLYING) continue;
    const h = cellKey(Math.floor(P[i * 3] / cell), Math.floor(P[i * 3 + 1] / cell), Math.floor(P[i * 3 + 2] / cell));
    next[i] = head[h];
    head[h] = i;
  }
  const amax = spec.accel * L;
  const sepD = spec.sepDist * L;
  const [fx, fy, fz] = s.frameVel;
  const t = w.time;
  const all = s.boost > 1; // an escort intercepting: every member dives
  for (let i = 0; i < s.size; i++) {
    if (s.state[i] !== FLYING) continue;
    // Diving members (a wave gone in, or an intercept) are terminal: faster, and they stop flocking.
    const strike = all || s.wave[i] === 1;
    const vmax = spec.speed * L * (strike ? STRIKE_SPEED : 1);
    const wSep = spec.sep * (strike ? 0.3 : 1);
    const wAli = strike ? 0 : spec.ali;
    const wCoh = strike ? 0 : spec.coh;
    const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2];
    const vx = V[i * 3], vy = V[i * 3 + 1], vz = V[i * 3 + 2];
    // K nearest within view (a topological neighbourhood, capped by a metric one).
    let found = 0;
    const cx = Math.floor(px / cell), cy = Math.floor(py / cell), cz = Math.floor(pz / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      for (let j = head[cellKey(cx + dx, cy + dy, cz + dz)]; j !== -1; j = next[j]) {
        if (j === i) continue;
        const ex = P[j * 3] - px, ey = P[j * 3 + 1] - py, ez = P[j * 3 + 2] - pz;
        const d2 = ex * ex + ey * ey + ez * ez;
        if (d2 > cell * cell) continue;
        if (found < K) { let k = found++; while (k > 0 && nbD[k - 1] > d2) { nbD[k] = nbD[k - 1]; nbI[k] = nbI[k - 1]; k--; } nbD[k] = d2; nbI[k] = j; }
        else if (d2 < nbD[K - 1]) { let k = K - 1; while (k > 0 && nbD[k - 1] > d2) { nbD[k] = nbD[k - 1]; nbI[k] = nbI[k - 1]; k--; } nbD[k] = d2; nbI[k] = j; }
      }
    }
    let sx = 0, sy = 0, sz = 0, ax = 0, ay = 0, az = 0, cx2 = 0, cy2 = 0, cz2 = 0;
    for (let k = 0; k < found; k++) {
      const j = nbI[k];
      const d = Math.sqrt(nbD[k]);
      if (d < sepD && d > 1e-9) {
        const f = (sepD - d) / (d * sepD);
        sx += (px - P[j * 3]) * f; sy += (py - P[j * 3 + 1]) * f; sz += (pz - P[j * 3 + 2]) * f;
      }
      ax += V[j * 3]; ay += V[j * 3 + 1]; az += V[j * 3 + 2];
      cx2 += P[j * 3]; cy2 += P[j * 3 + 1]; cz2 += P[j * 3 + 2];
    }
    let fxs = sx * wSep, fys = sy * wSep, fzs = sz * wSep;
    if (found) {
      fxs += ((ax / found - vx) / vmax) * wAli + ((cx2 / found - px) / cell) * wCoh;
      fys += ((ay / found - vy) / vmax) * wAli + ((cy2 / found - py) / cell) * wCoh;
      fzs += ((az / found - vz) / vmax) * wAli + ((cz2 / found - pz) / cell) * wCoh;
    }
    // Seek the goal with arrival: full speed far off, slowing inside a few lengths, riding the frame's velocity. The
    // error is taken from where the member will be after this step, so a slot on a moving ward is met, not overrun.
    const gx = s.goal[i * 3] - px - vx * dt, gy = s.goal[i * 3 + 1] - py - vy * dt, gz = s.goal[i * 3 + 2] - pz - vz * dt;
    const gd = Math.hypot(gx, gy, gz);
    const left = s.arrive[i] - t;
    const want = strike ? Math.min(vmax, !all && left > 0 ? gd / Math.max(dt, left) : vmax) : Math.min(vmax, gd * 2.5);
    const k = gd > 1e-9 ? want / gd : 0;
    fxs += ((fx + gx * k - vx) / vmax) * spec.goal;
    fys += ((fy + gy * k - vy) / vmax) * spec.goal;
    fzs += ((fz + gz * k - vz) / vmax) * spec.goal;
    // Each member weaves on its own phase.
    if (spec.jitter > 0) {
      const ph = i * 2.399;
      fxs += Math.sin(t * 3.1 + ph) * spec.jitter;
      fys += Math.sin(t * 2.7 + ph * 1.7) * spec.jitter;
      fzs += Math.sin(t * 3.7 + ph * 2.3) * spec.jitter;
    }
    const ac = Math.hypot(fxs, fys, fzs) * amax;
    let m = ac > amax ? amax / ac : 1;
    let nvx = vx + fxs * amax * m * dt, nvy = vy + fys * amax * m * dt, nvz = vz + fzs * amax * m * dt;
    // The last dive is terminal homing, not flocking: straight at the lead point, or it would circle the target.
    if (strike && k > 0) { nvx = fx + gx * k; nvy = fy + gy * k; nvz = fz + gz * k; }
    // Speed is capped relative to the frame, so a bubble keeps up with a fast ward.
    const rx = nvx - fx, ry = nvy - fy, rz = nvz - fz;
    const rs = Math.hypot(rx, ry, rz);
    if (rs > vmax) { m = vmax / rs; nvx = fx + rx * m; nvy = fy + ry * m; nvz = fz + rz * m; }
    V[i * 3] = nvx; V[i * 3 + 1] = nvy; V[i * 3 + 2] = nvz;
    P[i * 3] = px + nvx * dt; P[i * 3 + 1] = py + nvy * dt; P[i * 3 + 2] = pz + nvz * dt;
  }
  // Never inside a planet.
  for (const b of w.bodies) {
    if (b.size <= 0) continue;
    if (dist(s.centroid, b.pos) - s.spread > b.size * 1.02) continue;
    for (let i = 0; i < s.size; i++) {
      if (s.state[i] !== FLYING) continue;
      const p = memberPos(s, i);
      const r = dist(p, b.pos);
      if (r < b.size * 1.02) setV(P, i, add(b.pos, scale(unit(sub(p, b.pos)), b.size * 1.02)));
    }
  }
}

function measure(s: Swarm) {
  let n = 0, x = 0, y = 0, z = 0;
  for (let i = 0; i < s.size; i++) {
    if (s.state[i] !== FLYING) continue;
    n++; x += s.pos[i * 3]; y += s.pos[i * 3 + 1]; z += s.pos[i * 3 + 2];
  }
  s.flying = n;
  if (!n) { s.spread = 0; return; }
  s.centroid = [x / n, y / n, z / n];
  let r = 0;
  for (let i = 0; i < s.size; i++) {
    if (s.state[i] !== FLYING) continue;
    r = Math.max(r, Math.hypot(s.pos[i * 3] - s.centroid[0], s.pos[i * 3 + 1] - s.centroid[1], s.pos[i * 3 + 2] - s.centroid[2]));
  }
  s.spread = r;
}

/** Bay doors: release members at the launch rate, out of the back of the carrier and outward. */
function releaseFromBay(s: Swarm, carrier: ShipRef, L: number, dt: number) {
  if (!s.launching || s.inBay === 0) { if (s.inBay === 0) s.launching = false; return; }
  s.launchAcc += ROLES[s.role].launchRate * dt;
  const back = len(carrier.vel) > 1e-6 ? scale(unit(carrier.vel), -1) : ([0, 0, 1] as V3);
  for (let i = 0; i < s.size && s.launchAcc >= 1; i++) {
    if (s.state[i] !== BAY) continue;
    s.launchAcc -= 1;
    const r = s.rng;
    const out = unit([r() - 0.5, r() - 0.5, r() - 0.5]);
    setV(s.pos, i, add(carrier.pos, add(scale(back, carrier.radius * 0.8), scale(out, carrier.radius * 0.3))));
    setV(s.vel, i, add(carrier.vel, scale(unit(add(back, out)), ROLES[s.role].speed * L * 0.4)));
    s.state[i] = FLYING;
    s.hp[i] = ROLES[s.role].hp;
    s.wave[i] = 0;
    s.inBay--;
    s.flying++;
    s.stats.launched++;
  }
  if (s.launchAcc > 1) s.launchAcc = 1;
}

/**
 * One step of one swarm: the bay, the brain, the flock, docking. Weapons and damage are the battle's (battle.ts),
 * since they need every swarm and ship at once.
 */
export function stepSwarm(s: Swarm, w: SwarmWorld, swarms: Swarm[], dt: number) {
  const L = w.L;
  const carrier = w.ships.get(s.carrier);
  // A carrier lost takes the drones still in its bay with it.
  if (!carrier || !carrier.alive) {
    for (let i = 0; i < s.size; i++) if (s.state[i] === BAY) killMember(s, i);
    s.launching = false;
    if (s.order.kind === 'recall' || (s.order.kind === 'follow' && s.order.leader === s.carrier)) s.order = { kind: 'hold', at: s.centroid, facing: [0, 0, -1] };
  } else releaseFromBay(s, carrier, L, dt);
  measure(s);
  if (s.flying === 0) return;
  brain(s, w, swarms, dt);
  flock(s, w, dt);
  // Docking: a recalled drone that reaches the carrier goes back in the bay, repaired.
  if (s.order.kind === 'recall' && carrier && carrier.alive) {
    const reach = carrier.radius + 0.5 * L;
    for (let i = 0; i < s.size; i++) {
      if (s.state[i] !== FLYING) continue;
      if (Math.hypot(s.pos[i * 3] - carrier.pos[0], s.pos[i * 3 + 1] - carrier.pos[1], s.pos[i * 3 + 2] - carrier.pos[2]) < reach) {
        s.state[i] = BAY;
        s.hp[i] = ROLES[s.role].hp;
        s.flying--;
        s.inBay++;
        s.stats.docked++;
      }
    }
  }
  measure(s);
}

/** Polarisation: how much the flying members point the same way (1: all parallel, ~0: no order). Vicsek et al. 1995. */
export function polarisation(s: Swarm): number {
  let x = 0, y = 0, z = 0, n = 0;
  for (let i = 0; i < s.size; i++) {
    if (s.state[i] !== FLYING) continue;
    const v = unit(memberVel(s, i));
    x += v[0]; y += v[1]; z += v[2]; n++;
  }
  return n ? Math.hypot(x, y, z) / n : 0;
}

/** The smallest distance between two flying members, world units. */
export function nearestPair(s: Swarm): number {
  let best = Infinity;
  for (let i = 0; i < s.size; i++) {
    if (s.state[i] !== FLYING) continue;
    for (let j = i + 1; j < s.size; j++) {
      if (s.state[j] !== FLYING) continue;
      best = Math.min(best, Math.hypot(s.pos[i * 3] - s.pos[j * 3], s.pos[i * 3 + 1] - s.pos[j * 3 + 1], s.pos[i * 3 + 2] - s.pos[j * 3 + 2]));
    }
  }
  return best;
}

