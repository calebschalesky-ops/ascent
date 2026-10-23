/**
 * Hyperspace (scale-jump-danger J1-J3, 2026-10-21). Caleb: "The hyperspace button should jump us there within close
 * range but out of range of hostile ships. Within 5 seconds."
 *
 * A jump is three phases, all on a fixed clock so the trip takes the same few seconds to Mars or to Saturn:
 * - **spool** (`HYPER.spool`): the drive charges and the nose swings onto the line of the jump;
 * - **travel**: the ship runs the path (around any body in the way) on a smooth ease, the tunnel round it; its length
 *   grows by a fifth of a second per decade of distance, between `travelMin` and `travelMax`;
 * - **exit**: the tunnel fades and the ship sits at a stop at the drop point, facing the body.
 *
 * Where it drops you (`dropPoint`): the lowest safe point over the destination's body (above its air, outside its god
 * armour and set pieces), on the side you came from, and outside every hostile's engagement range (its weapons' reach
 * × `margin` + `marginAdd`), searched outward over a sphere of directions. If nowhere within the body's orbit zone is
 * clear, it drops at the point of least intrusion, on the edge of their range.
 *
 * When it refuses (`refusal`): a hostile's missile lock on you, docked, an armed hostile within `massLock` (REAL-SCALE-
 * PLAN.md's mass lock, kept in ship units since ships and guns did not change size), already in the destination's space,
 * or no destination. Pure: the frame loop (components/hyperspace.ts) flies by these functions.
 */
import type { DestGeo, V3 } from './nav';
import { add, cross, dist, orbitZone, planPath, scale, sub, unit } from './nav';
import { ATMO, isAirBody } from './atmosphere';

export const HYPER = {
  spool: 1.0, // s: the drive charges, the nose comes round
  travelMin: 1.6, // s: the shortest run through the tunnel ...
  travelMax: 2.3, // ... and the longest: 3.8 s in all, so a second's stall on arrival (a world's terrain building) still lands inside 5
  perDecade: 0.2, // s more per tenfold distance ...
  refDist: 1e6, // ... above this many units
  exit: 0.5, // s: out of the tunnel, the streaks fade
  margin: 1.25, // a hostile's engagement range is its weapons' reach × this ...
  marginAdd: 250, // ... + this many units
  massLock: 6000, // units (650 km at 40 m ships): an armed hostile this close keeps the drive from spooling
  lift: 0.01, // the drop sits this share of the body's radius above the lowest safe radius ...
  liftShips: 60, // ... plus this many ship lengths
  ring: 16, // directions on each ring round the preferred way out ...
  ringStep: 1.25, // ... each ring this much wider than the last, from a fraction of the smallest range
  step: 1.06, // each shell is this much farther out than the last
};

/** Seconds in the tunnel for a jump of `d` units. */
export const travelTime = (d: number) =>
  Math.max(HYPER.travelMin, Math.min(HYPER.travelMax, HYPER.travelMin + HYPER.perDecade * Math.log10(Math.max(1, d / HYPER.refDist))));
/** Seconds from the key press to arrival, for a jump of `d` units. */
export const jumpTime = (d: number) => HYPER.spool + travelTime(d) + HYPER.exit;

/** 0..1 ease with zero speed and zero acceleration at both ends (smootherstep). */
export const ease = (u: number) => { const x = Math.max(0, Math.min(1, u)); return x * x * x * (x * (x * 6 - 15) + 10); };

/** The point a share `s` (0..1) of the way along a polyline, by length. */
export function along(points: V3[], s: number): V3 {
  if (points.length < 2) return points[0];
  const segs = points.slice(1).map((p, i) => dist(p, points[i]));
  const total = segs.reduce((a, b) => a + b, 0);
  let want = Math.max(0, Math.min(1, s)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i] || i === segs.length - 1) {
      const k = segs[i] > 0 ? Math.min(1, want / segs[i]) : 1;
      return add(points[i], scale(sub(points[i + 1], points[i]), k));
    }
    want -= segs[i];
  }
  return points[points.length - 1];
}

/** Something that would fight you at the destination: where it is, and how far its guns reach. */
export interface Hostile { pos: V3; reach: number; armed?: boolean }
/** How close a hostile lets you drop: its reach plus the margin. */
export const engagementRange = (h: Hostile) => h.reach * HYPER.margin + HYPER.marginAdd;

/**
 * The lowest radius a ship may drop at over a body: above the ground and its air, and outside its god armour. With
 * `pieces` (the set pieces are tested point by point by the caller) that is over the plating and its mounts (`top`);
 * without, outside the whole shell, set pieces included (`shell`: Earth's Pharos makes that 1.72 radii).
 */
export function minDropRadius(body: DestGeo, shipLength: number, pieces = false): number {
  if (body.size <= 0) return 0;
  const air = isAirBody(body.id) ? body.size * (1 + ATMO[body.id].top) : 0;
  const armour = pieces ? body.top ?? body.shell ?? 0 : body.shell ?? 0;
  const floor = Math.max(body.size * 1.004 + 0.5, air, armour);
  return floor + body.size * HYPER.lift + HYPER.liftShips * shipLength;
}

/**
 * Directions round `axis`, nearest first: the axis, then rings of `HYPER.ring` directions at angles from `theta0`
 * growing by `HYPER.ringStep` out to the far side. Fine near the axis (where the drop wants to be), coarse far off it.
 */
export function dirsAround(axis: V3, theta0: number): V3[] {
  const a = unit(axis);
  const t1 = unit(cross(Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], a));
  const t2 = cross(a, t1);
  const out: V3[] = [a];
  for (let th = Math.max(1e-4, theta0); th < Math.PI; th *= HYPER.ringStep) {
    for (let k = 0; k < HYPER.ring; k++) {
      const ph = ((k + (out.length % 2) * 0.5) / HYPER.ring) * Math.PI * 2;
      const s = Math.sin(th);
      out.push(add(scale(a, Math.cos(th)), add(scale(t1, s * Math.cos(ph)), scale(t2, s * Math.sin(ph)))));
    }
  }
  out.push(scale(a, -1));
  return out;
}

export interface Drop {
  pos: V3;
  /** Distance from the body's centre, and height over its surface. */
  r: number; alt: number;
  /** Outside every hostile's engagement range. */
  clear: boolean;
  /** How far inside the worst hostile's range it is (0 when clear). */
  intrusion: number;
  /** The engagement ranges that were kept clear of, for the report. */
  ranges: number[];
}

/**
 * Where a jump to `body` drops you, coming from `from`. `prefer` is the way out from the body to aim for (default:
 * toward `from`, the side you come in on); `others` are bodies the point must not sit inside; `blocked`, when given,
 * says whether a point is inside one of the body's set pieces, and lets the drop come down to the plating's top.
 */
export function dropPoint(body: DestGeo, from: V3, hostiles: Hostile[], shipLength: number, opts: { prefer?: V3; others?: DestGeo[]; blocked?: (p: V3) => boolean } = {}): Drop {
  const ranges = hostiles.map(engagementRange);
  const intrusionAt = (p: V3) => hostiles.reduce((m, h, i) => Math.max(m, ranges[i] - dist(p, h.pos)), 0);
  if (body.size <= 0) {
    // A place with no body (the stars, the edge): its own point, nudged out of range along the way in if need be.
    const p = body.pos;
    return { pos: p, r: 0, alt: 0, clear: intrusionAt(p) <= 0, intrusion: intrusionAt(p), ranges };
  }
  const prefer = unit(opts.prefer ?? sub(from, body.pos));
  const others = (opts.others ?? []).filter((o) => o.size > 0 && o.id !== body.id && o.kind !== 'station');
  const inOther = (p: V3) => others.some((o) => dist(p, o.pos) < Math.max(o.shell ?? 0, o.size * 1.05)) || !!opts.blocked?.(p);
  const r0 = minDropRadius(body, shipLength, !!opts.blocked);
  const rMax = Math.max(r0 * 3, orbitZone(body) * 0.95);
  let best: { p: V3; r: number; i: number } | null = null;
  const smallest = ranges.length ? Math.min(...ranges) : r0;
  for (let r = r0; r <= rMax; r *= HYPER.step) {
    // Directions nearest the preferred one first, so the first clear point found on a shell is the best on it.
    for (const d of dirsAround(prefer, (0.2 * smallest) / r)) {
      const p = add(body.pos, scale(d, r));
      if (inOther(p)) continue;
      const i = intrusionAt(p);
      if (i <= 0) return { pos: p, r, alt: r - body.size, clear: true, intrusion: 0, ranges };
      if (!best || i < best.i - 1e-9) best = { p, r, i };
    }
  }
  // Nowhere clear: the point of least intrusion, pushed out to the edge of the worst range along the way it already lies.
  const b = best ?? { p: add(body.pos, scale(prefer, r0)), r: r0, i: intrusionAt(add(body.pos, scale(prefer, r0))) };
  return { pos: b.p, r: b.r, alt: b.r - body.size, clear: false, intrusion: b.i, ranges };
}

/** The path the jump runs: around any body in the way, from `from` to the drop point. */
export function jumpPath(from: V3, drop: V3, geo: DestGeo[]): V3[] {
  const to: DestGeo = { id: 'stars', pos: drop, size: 0, arrive: 0, stop: 0, clear: 0 };
  // The destination's own entry in geo must stay an obstacle (planPath leaves out `to.id`): the pseudo id is 'stars',
  // which is never in the way.
  return [from, ...planPath(from, to, geo.filter((g) => g.id !== 'stars')), drop];
}

export type Refusal = 'locked' | 'docked' | 'massLock' | 'here' | 'noTarget' | 'busy' | 'inside';
export const REFUSAL_TEXT: Record<Refusal, string> = {
  locked: 'Hyperdrive refused: a hostile has a missile lock on you',
  docked: 'Hyperdrive refused: undock first',
  massLock: 'Hyperdrive refused: mass-locked by an armed hostile nearby',
  here: 'Hyperdrive refused: already in its space; fly or use the autopilot',
  noTarget: 'Hyperdrive: pick a destination first (the nav map, or a body on screen)',
  busy: 'Hyperdrive: already jumping',
  inside: 'Hyperdrive refused: leave the atmosphere first',
};

export interface JumpCheck {
  target: boolean;
  jumping: boolean;
  docked: boolean;
  inside: boolean;
  /** Hostile missile locks complete on the player. */
  lockedOn: number;
  /** Armed hostiles: whether one is within the mass lock. */
  hostiles: Hostile[];
  pos: V3;
  /** Distance to the destination's body and that body's own space (its orbit zone); 0 when it has none. */
  toBody: number;
  space: number;
}

/** Why a jump may not start now, or null when it may. Order: the most pressing reason first. */
export function refusal(c: JumpCheck): Refusal | null {
  if (c.jumping) return 'busy';
  if (c.docked) return 'docked';
  if (c.inside) return 'inside';
  if (!c.target) return 'noTarget';
  if (c.lockedOn > 0) return 'locked';
  if (c.hostiles.some((h) => h.armed !== false && dist(h.pos, c.pos) < HYPER.massLock)) return 'massLock';
  if (c.toBody < c.space) return 'here';
  return null;
}

/** True when the autopilot should take a leg by hyperspace: the destination's body is outside the space you are in. */
export const longLeg = (toBody: number, space: number) => toBody >= space;

/** The space a destination's body holds round it: its orbit zone, or for a bodiless place twice its arrival distance. */
export const spaceOf = (body: DestGeo) => (body.size > 0 ? orbitZone(body) : body.arrive * 2);
