/**
 * A drill boarder from launch to result: its flight, the point defence that shoots at it, the impact (and the shield
 * rule), the drill, and the crew it meets inside. Pure (no three.js); world units, with `L` (the player ship's length
 * in world units) turning spec.ts's ship lengths into world units. DRILL-BOARDER.md says why each rule is what it is.
 */
import type { V3 } from '../nav';
import { add, closest, dist, dot, len, scale, sub, unit } from '../nav';
import type { NationId } from '../nations';
import type { Fit } from '../progression/catalog';
import { fitModules } from '../progression/catalog';
import type { ShipType } from '../shipTypes';
import { BAY, BOARDABLE, BOARDER, CREW, FIGHT, LAUNCHES, NATION_BOARDING, PD, boarderOf } from './spec';
import type { TroopForce } from './troops';

export type BoarderPhase = 'flying' | 'drilling' | 'inside' | 'lost';
export type LossCause = 'shot' | 'deflected' | 'fuel' | 'target' | 'repelled';

export interface Boarder {
  id: number;
  nation: NationId;
  side: 0 | 1; // 0 the player's, 1 hostile
  from: number; // the launching ship's id
  target: number;
  phase: BoarderPhase;
  pos: V3;
  vel: V3;
  speed: number;
  topSpeed: number;
  hp: number;
  maxHp: number;
  age: number;
  /** Seconds of drilling left. */
  drill: number;
  /** Where it struck, relative to the target's centre (so it rides along). */
  contact: V3 | null;
  troops: TroopForce;
  lost: LossCause | null;
}

/** A ship as the boarding rules see it. */
export interface Hull {
  id: number; type: ShipType; nation: NationId; side: 0 | 1; pos: V3; vel: V3;
  radius: number; // the hit sphere, world units: a boarder whose path touches it has struck
  /** How far the plating is from the centre, world units (the hit sphere is bigger than the hull); default 0.8 × radius. */
  skin?: number;
  hp: number; maxHp: number; alive: boolean;
}

export const canLaunch = (t: ShipType) => LAUNCHES.includes(t);
export const canBoard = (t: ShipType) => BOARDABLE.includes(t);
export const bayOf = (t: ShipType) => BAY[t];

/** A boarder leaving `from` toward `target`, nose first along the line to it. */
export function launch(id: number, from: Hull, target: Hull, L: number): Boarder {
  const b = boarderOf(from.nation);
  const dir = unit(sub(target.pos, from.pos));
  const start = add(from.pos, scale(dir, from.radius * 0.9));
  const sp = b.speed * L * 0.35;
  return {
    id, nation: from.nation, side: from.side, from: from.id, target: target.id, phase: 'flying',
    pos: start, vel: add(from.vel, scale(dir, sp)), speed: sp, topSpeed: b.speed * L, hp: b.hp, maxHp: b.hp, age: 0, drill: b.drill,
    contact: null, troops: { strength: b.troops, quality: b.quality }, lost: null,
  };
}

/** Rotate unit vector `a` toward unit vector `b` by at most `max` radians. */
export function turnToward(a: V3, b: V3, max: number): V3 {
  const c = Math.max(-1, Math.min(1, dot(a, b)));
  const ang = Math.acos(c);
  if (ang <= max || ang < 1e-9) return b;
  // Slerp by max / ang.
  const k = max / ang;
  const s = Math.sin(ang);
  const w1 = Math.sin((1 - k) * ang) / s;
  const w2 = Math.sin(k * ang) / s;
  return unit(add(scale(a, w1), scale(b, w2)));
}

/** Where to aim to meet a target at `p` moving at `v`, flying at `speed` from `from` (first-order lead). */
export function leadPoint(from: V3, speed: number, p: V3, v: V3): V3 {
  const t = dist(from, p) / Math.max(1e-6, speed);
  return add(p, scale(v, Math.min(t, 4)));
}

/**
 * One step of flight toward the target. Returns 'hit' when its path this step touched the target's hull (it is then
 * placed at the contact point), 'fuel' when it ran dry, otherwise null.
 */
export function stepFlight(b: Boarder, target: Hull, dt: number, L: number): 'hit' | 'fuel' | null {
  if (b.phase !== 'flying') return null;
  b.age += dt;
  if (b.age > BOARDER.life) return 'fuel';
  const want = unit(sub(leadPoint(b.pos, Math.max(b.speed, b.topSpeed * 0.5), target.pos, target.vel), b.pos));
  const cur = len(b.vel) > 1e-9 ? unit(b.vel) : want;
  const dir = turnToward(cur, want, BOARDER.turn * dt);
  b.speed = Math.min(b.topSpeed, b.speed + BOARDER.accel * L * dt);
  b.vel = scale(dir, b.speed);
  const a = b.pos;
  const next = add(b.pos, scale(b.vel, dt));
  const reach = target.radius + BOARDER.hitRadius * L * 0.5;
  const h = closest(a, next, target.pos);
  if (h.d <= reach) {
    // Contact on the hull's surface along the line from its centre to where the path came closest.
    const at = add(a, scale(sub(next, a), h.t));
    const out = len(sub(at, target.pos)) > 1e-9 ? unit(sub(at, target.pos)) : scale(dir, -1);
    b.contact = scale(out, target.skin ?? target.radius * 0.8);
    b.pos = add(target.pos, b.contact);
    return 'hit';
  }
  b.pos = next;
  return null;
}

/** The shield's share of capacity, from a ship whose shield is the first part of its hit points (craftStats). */
export function shieldFrac(hp: number, maxHp: number, shieldCap: number): number {
  if (shieldCap <= 0) return 0;
  const hull = maxHp - shieldCap;
  return Math.max(0, Math.min(1, (hp - hull) / shieldCap));
}
/** The hull's share left, not counting the shield part. */
export function hullFrac(hp: number, maxHp: number, shieldCap: number): number {
  const hull = Math.max(1e-9, maxHp - shieldCap);
  return Math.max(0, Math.min(1, hp / hull));
}

/** The impact: deflected when the shield is above the gate; otherwise the drill starts. */
export function impact(b: Boarder, shield: number): 'deflected' | 'drilling' {
  if (shield > BOARDER.shieldGate) { b.phase = 'lost'; b.lost = 'deflected'; return 'deflected'; }
  b.phase = 'drilling';
  b.vel = [0, 0, 0];
  return 'drilling';
}

/** Hit points the breach costs the target. */
export const breachDamage = (maxHp: number) => maxHp * BOARDER.breach;

/** One step of drilling; true on the step it breaks through. */
export function stepDrill(b: Boarder, dt: number): boolean {
  if (b.phase !== 'drilling') return false;
  b.drill -= dt;
  if (b.drill > 0) return false;
  b.phase = 'inside';
  return true;
}

/** A ship's point defence against boarders, damage per second, before it is split between them. */
export function pdDps(type: ShipType, fit: Fit | null, hull: number): number {
  let d = PD.hull[type];
  if (fit) for (const m of fitModules(fit)) d += PD.modules[m] ?? 0;
  return d * (PD.floor + (1 - PD.floor) * Math.max(0, Math.min(1, hull)));
}

/**
 * Point defence for one step: each ship fires at the hostile boarders in flight within its range, its damage split
 * evenly between them. Returns the damage each boarder takes this step, by boarder id.
 */
export function pointDefence(ships: { hull: Hull; dps: number }[], boarders: Boarder[], dt: number, L: number): Map<number, number> {
  const out = new Map<number, number>();
  const r = PD.range * L;
  for (const { hull, dps } of ships) {
    if (!hull.alive || dps <= 0) continue;
    const near = boarders.filter((b) => b.phase === 'flying' && b.side !== hull.side && dist(b.pos, hull.pos) <= r);
    for (const b of near) out.set(b.id, (out.get(b.id) ?? 0) + (dps * dt) / near.length);
  }
  return out;
}

/** The crew standing aboard a ship of `type` and `nation` with `hull` (0..1) left. */
export function crewOf(type: ShipType, nation: NationId, hull: number): TroopForce {
  const strength = CREW[type] * (CREW.floor + (1 - CREW.floor) * Math.max(0, Math.min(1, hull)));
  return { strength, quality: FIGHT.crew * NATION_BOARDING[nation].crew };
}
