/**
 * Target choice. In order: the ship an attack order names (focus fire); for an escort, whoever is hitting the ward
 * or closing on it; otherwise, if the stance lets it pick its own, the best hostile in reach, weighted by distance and
 * by which types this ship would rather fight. A ship keeps its current target unless another is clearly better, so
 * it does not flicker between two.
 */
import type { V3 } from '../nav';
import { dist } from '../nav';
import { COMBAT, STANCES } from './spec';
import type { Agent, FleetWorld, Wing } from './types';

/** How recently (seconds) a hit still counts as "attacking" the ship it hit. */
export const THREAT_MEMORY = 6;
/** A new target must score this much better than the current one to take its place. */
export const SWITCH_MARGIN = 0.6;

export const isEnemy = (a: Agent, b: Agent) => b.alive && !b.docked && a.side !== b.side;

/** Lower is better. */
export function targetScore(a: Agent, t: Agent): number {
  return dist(a.pos, t.pos) / COMBAT[a.type].prefers[t.type];
}

/** Hostiles that hit `ward` within THREAT_MEMORY or are going for it; failing those, any within `radius` of it. */
export function threatsTo(ward: Agent, world: FleetWorld, side: Agent['side'], radius: number): Agent[] {
  const attacking: Agent[] = [];
  const near: Agent[] = [];
  for (const b of world.agents.values()) {
    if (!b.alive || b.docked || b.side === side) continue;
    const hitIt = ward.hitBy === b.id && world.time - ward.hitAt < THREAT_MEMORY;
    if (hitIt || (b.target === ward.id && dist(b.pos, ward.pos) < radius * 2)) attacking.push(b);
    else if (dist(b.pos, ward.pos) < radius) near.push(b);
  }
  // Ships actually attacking the ward come first; the merely close only when nobody is.
  return attacking.length ? attacking : near;
}

/**
 * Choose what `a` shoots at. `post` is where its order puts it, so a defensive ship looks for targets near its post
 * rather than chasing whatever it happens to see.
 */
export function chooseTarget(a: Agent, w: Wing, world: FleetWorld, post: V3 | null): number | null {
  const order = w.order;
  if (order.kind === 'attack') {
    const t = world.agents.get(order.target);
    if (t && isEnemy(a, t)) return t.id;
    // The named target is gone: fall through and act on the stance.
  }
  if (order.kind === 'recall') return null;
  const st = STANCES[w.stance];
  const reach = COMBAT[a.type].range * world.L * st.engage;
  let pool: Agent[] = [];
  if (order.kind === 'defend') {
    const ward = world.agents.get(order.ward);
    // An escort answers threats to its ward even under hold fire: it moves to intercept; whether it shoots is the stance's.
    if (ward && ward.alive) pool = threatsTo(ward, world, a.side, Math.max(reach, COMBAT[a.type].range * world.L));
  }
  if (!pool.length) {
    if (reach <= 0) return null;
    const from = post ?? a.pos;
    for (const b of world.agents.values()) if (isEnemy(a, b) && dist(b.pos, from) < reach) pool.push(b);
  }
  if (!pool.length) return null;
  let best = pool[0];
  for (const b of pool) if (targetScore(a, b) < targetScore(a, best)) best = b;
  const cur = a.target !== null ? world.agents.get(a.target) : undefined;
  if (cur && pool.includes(cur) && targetScore(a, best) > targetScore(a, cur) * SWITCH_MARGIN) return cur.id;
  return best.id;
}

/** The nearest enemy fighter within `range` of `a`: what a capital ship's point-defence guns go for. */
export function nearestFighter(a: Agent, world: FleetWorld, range: number): Agent | null {
  let best: Agent | null = null;
  let bd = range;
  for (const b of world.agents.values()) {
    if (!isEnemy(a, b) || b.type !== 'fighter') continue;
    const d = dist(a.pos, b.pos);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
