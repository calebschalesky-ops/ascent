/**
 * Geometry, shield sides and the event log: the small shared pieces every other sim module uses.
 */
import { RUN, SHIELD, sideOffset } from './numbers';
import { SHIELD_SIDES, inField } from './types';
import type { Battle, Decision, LogEvent, ShieldSide, Ship, SideId, V3 } from './types';

export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
export const forward = (h: number): V3 => ({ x: Math.cos(h), y: 0, z: Math.sin(h) });
export const dist = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
/** Heading (yaw) that points from a to b. */
export const bearing = (a: V3, b: V3) => Math.atan2(b.z - a.z, b.x - a.x);
export function wrap(a: number): number {
  let r = a % (2 * Math.PI);
  if (r > Math.PI) r -= 2 * Math.PI;
  if (r <= -Math.PI) r += 2 * Math.PI;
  return r;
}

/** The shield side of `ship` that faces `point`. */
export function sideFacing(ship: Ship, point: V3): ShieldSide {
  const rel = wrap(bearing(ship.pos, point) - ship.heading);
  const a = Math.abs(rel);
  if (a <= SHIELD.arc) return 'fore';
  if (a >= Math.PI - SHIELD.arc) return 'aft';
  return rel > 0 ? 'port' : 'starboard';
}

/** Heading that turns `side` of a ship toward bearing `b`. */
export const headingToPresent = (b: number, side: ShieldSide) => wrap(b - sideOffset[side]);

export const sideMax = (s: Ship, side: ShieldSide) => s.shieldTotal * s.split[side];

/** Sides that are open: gunfire reaches the hull and a boarder can strike through (NAVY §1). Public for boarding. */
export function openSides(s: Ship): ShieldSide[] {
  return SHIELD_SIDES.filter((side) => s.open[side]);
}

/** Normalise a split to sum 1 (negative and non-finite values become 0; all-zero becomes even). */
export function normaliseSplit(split: Record<ShieldSide, number>): Record<ShieldSide, number> {
  const clean = SHIELD_SIDES.map((k) => (Number.isFinite(split[k]) && split[k] > 0 ? split[k] : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  const out = { fore: 0.25, aft: 0.25, port: 0.25, starboard: 0.25 };
  if (sum <= 0) return out;
  SHIELD_SIDES.forEach((k, i) => (out[k] = clean[i] / sum));
  return out;
}

/**
 * Shift shield power between the four sides (the shields-and-engineering officer's job). Current charge is clamped to
 * each side's new max; a side whose max falls to zero is open.
 */
export function setShieldPower(ship: Ship, split: Record<ShieldSide, number>): void {
  ship.split = normaliseSplit(split);
  for (const side of SHIELD_SIDES) {
    const max = sideMax(ship, side);
    if (ship.shields[side] > max) ship.shields[side] = max;
    if (max <= 0) { ship.shields[side] = 0; ship.open[side] = true; }
  }
}

export function focusSplit(side: ShieldSide): Record<ShieldSide, number> {
  const rest = (1 - SHIELD.focus) / 3;
  const out = { fore: rest, aft: rest, port: rest, starboard: rest };
  out[side] = SHIELD.focus;
  return out;
}

export const EVEN_SPLIT: Record<ShieldSide, number> = { fore: 0.25, aft: 0.25, port: 0.25, starboard: 0.25 };

export function pushLog(b: Battle, e: LogEvent): void {
  b.log.push(e);
  if (b.log.length > RUN.logCap) {
    const drop = b.log.length - RUN.logCap;
    b.log.splice(0, drop);
    b.logDropped += drop;
  }
}

/** A captain decided something on their own (or on a timeout): an event and a summary row. */
export function recordDecision(b: Battle, ship: Ship, decision: string, why: string, timeout: boolean): void {
  const d: Decision = { t: round2(b.t), ship: ship.id, side: ship.side, decision, why, trait: ship.captain.trait, timeout };
  pushLog(b, { t: d.t, kind: 'decision', ship: ship.id, decision, why, timeout });
  if (timeout) b.stats.timeoutDecisions.push(d);
  else b.stats.selfDecisions++;
  if (b.stats.decisions.length < RUN.decisionCap) b.stats.decisions.push(d);
  else b.stats.decisionsDropped++;
}

export const round2 = (x: number) => Math.round(x * 100) / 100;

export const shipById = (b: Battle, id: string | null | undefined): Ship | undefined =>
  id ? b.ships.find((s) => s.id === id) : undefined;

export const fieldShips = (b: Battle, side: SideId) => b.ships.filter((s) => s.side === side && inField(s.status));
export const activeShips = (b: Battle, side: SideId) => b.ships.filter((s) => s.side === side && s.status === 'active');

export function centroid(ships: Ship[]): V3 | null {
  if (!ships.length) return null;
  const c = v3(0, 0, 0);
  for (const s of ships) { c.x += s.pos.x; c.y += s.pos.y; c.z += s.pos.z; }
  return v3(c.x / ships.length, c.y / ships.length, c.z / ships.length);
}

export function nearest(from: Ship, ships: Ship[], maxRange = Infinity): Ship | null {
  let best: Ship | null = null;
  let bd = maxRange;
  for (const s of ships) {
    const d = dist(from.pos, s.pos);
    if (d <= bd) { bd = d; best = s; }
  }
  return best;
}

/** Mean of the four sides' charge as a fraction of their max (0 open … 1 full). */
export function shieldFrac(s: Ship): number {
  let sum = 0;
  for (const side of SHIELD_SIDES) {
    const m = sideMax(s, side);
    sum += m > 0 ? s.shields[side] / m : 0;
  }
  return sum / 4;
}
