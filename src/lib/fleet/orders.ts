/**
 * Orders turn into posts. Each wing has an anchor (a point, a heading and a speed): pinned to the ship it follows or
 * escorts, fixed where it holds, or moved along the path it flies. Each ship's post is its formation slot on that
 * anchor. An attack order has no anchor: every ship goes for the target.
 */
import type { V3 } from '../nav';
import { add, dist, len, scale, sub, unit } from '../nav';
import { COMBAT } from './spec';
import { formationGap, slotOffset, slotWorld } from './formation';
import type { Agent, FleetWorld, FormationId, Order, Stance, Wing } from './types';

let wingIds = 1;

export function makeWing(name: string, side: Wing['side'], members: number[], order: Order, formation: FormationId = 'wedge', stance: Stance = 'defensive'): Wing {
  return { id: wingIds++, name, side, order, formation, stance, members: [...members], anchor: null };
}

/**
 * A slot when the wing has no ship to form on (a hold or a path): its first ship flies the anchor point itself, so
 * it passes over every waypoint, and the rest form on it.
 */
export function ownSlot(f: FormationId, k: number, n: number, gap: number): V3 {
  return k === 0 ? [0, 0, 0] : slotOffset(f, k - 1, n - 1, gap);
}

/** The wing's ships that are flying (alive and not docked). */
export function activeMembers(w: Wing, world: FleetWorld): Agent[] {
  const out: Agent[] = [];
  for (const id of w.members) {
    const a = world.agents.get(id);
    if (a && a.alive && !a.docked) out.push(a);
  }
  return out;
}

export function centroid(ags: Agent[]): V3 {
  if (!ags.length) return [0, 0, 0];
  return scale(ags.reduce<V3>((s, a) => add(s, a.pos), [0, 0, 0]), 1 / ags.length);
}

/** Give a wing a new order. A path starts from where the wing is now. */
export function setOrder(w: Wing, order: Order, world: FleetWorld) {
  w.order = order;
  const ms = activeMembers(w, world);
  if (order.kind === 'path') {
    const c = centroid(ms);
    const first = order.points[0] ?? c;
    w.anchor = { pos: c, fwd: unit(sub(first, c)), speed: 0 };
    if (len(w.anchor.fwd) < 0.5) w.anchor.fwd = ms[0]?.fwd ?? [0, 0, -1];
  } else w.anchor = null;
}

/** The slowest member's top speed, world units/s: a formation moves no faster. */
export function wingSpeed(ms: Agent[], L: number) {
  return ms.length ? Math.min(...ms.map((a) => COMBAT[a.type].speed)) * L : 0;
}

/** Move the wing's anchor for this step. */
export function updateAnchor(w: Wing, world: FleetWorld, dt: number) {
  const o = w.order;
  const ms = activeMembers(w, world);
  const pin = (id: number) => {
    const s = world.agents.get(id);
    w.anchor = s && s.alive ? { pos: s.pos, fwd: s.fwd, speed: s.speed } : w.anchor;
  };
  switch (o.kind) {
    case 'follow': pin(o.leader); return;
    case 'defend': pin(o.ward); return;
    case 'recall': pin(o.carrier); return;
    case 'hold': w.anchor = { pos: o.at, fwd: o.facing, speed: 0 }; return;
    case 'attack': w.anchor = null; return;
    case 'path': {
      if (!w.anchor) setOrder(w, o, world);
      const an = w.anchor!;
      const goal = o.points[o.next];
      if (!goal) { w.order = { kind: 'hold', at: an.pos, facing: an.fwd }; an.speed = 0; return; }
      // Wait for stragglers: the anchor slows while a ship keeping station is far from its slot. Ships that broke
      // off to fight are not waited for; they catch up.
      const gap = formationGap(w.formation, ms.map((a) => a.type), world.L);
      const keeping = ms.map((a, k) => (a.target === null ? dist(a.pos, slotWorld(an.pos, an.fwd, ownSlot(w.formation, k, ms.length, gap))) : 0));
      const lag = keeping.length ? Math.max(...keeping) : 0;
      const top = wingSpeed(ms, world.L) * 0.7;
      const to = sub(goal, an.pos);
      const d = len(to);
      // Slow into each waypoint, so the slowest-turning ship can make the corner instead of cutting it.
      const turn = ms.length ? Math.min(...ms.map((a) => COMBAT[a.type].turn)) : 1;
      const corner = Math.max(top * 0.2, d * turn * 1.5);
      const v = Math.min(corner, top * Math.max(0.15, Math.min(1, 1 - (lag - gap * 2) / (gap * 6))));
      const step = Math.min(d, v * dt);
      an.fwd = d > 1e-6 ? unit(to) : an.fwd;
      an.pos = add(an.pos, scale(an.fwd, step));
      an.speed = v;
      if (d - step < world.L * 0.5) {
        o.next++;
        if (o.next >= o.points.length) {
          if (o.loop) o.next = 0;
          else { w.order = { kind: 'hold', at: goal, facing: an.fwd }; an.speed = 0; }
        }
      }
      return;
    }
  }
}

/**
 * Ship `a`'s post: its formation slot on the wing's anchor, and the anchor's heading and speed. Null under an
 * attack order (no formation) or when the anchor is gone.
 */
export function postOf(a: Agent, w: Wing, world: FleetWorld): { pos: V3; fwd: V3; speed: number } | null {
  const an = w.anchor;
  if (!an) return null;
  const ms = activeMembers(w, world);
  const k = ms.indexOf(a);
  if (k < 0) return null;
  if (w.order.kind === 'recall') return { pos: an.pos, fwd: an.fwd, speed: an.speed };
  const lead = w.order.kind === 'follow' ? w.order.leader : w.order.kind === 'defend' ? w.order.ward : null;
  const leader = lead !== null ? world.agents.get(lead) : undefined;
  const clear = leader ? leader.radius * 1.2 + a.radius : 0;
  const gap = formationGap(w.formation, ms.map((m) => m.type), world.L);
  const off = leader ? slotOffset(w.formation, k, ms.length, gap, clear) : ownSlot(w.formation, k, ms.length, gap);
  const st = leader && w.station ? scale(w.station, leader.radius) : null;
  return { pos: slotWorld(an.pos, an.fwd, st ? add(off, st) : off), fwd: an.fwd, speed: an.speed };
}
