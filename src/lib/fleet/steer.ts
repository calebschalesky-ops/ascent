/**
 * Steering: where a ship wants to go becomes a heading and a speed, turned and accelerated within its type's limits,
 * bent round planets and pushed apart from its neighbours.
 */
import type { V3 } from '../nav';
import { add, closest, cross, dist, dot, len, scale, sub, unit } from '../nav';
import { turnToward } from '../weapons';
import { COMBAT } from './spec';
import type { Agent, Body } from './types';

/** How far outside a body's surface a fleet ship keeps, × the body's radius, plus `margin`. */
export const BODY_CLEAR = 1.15;

/**
 * Bend a heading so the ship's next `ahead` units keep clear of every body. Inside the clear zone it is pushed
 * straight out.
 */
export function avoidBodies(pos: V3, dir: V3, bodies: Body[], ahead: number, margin: number): V3 {
  let d = unit(dir);
  for (const b of bodies) {
    if (b.size <= 0) continue;
    const clear = b.size * BODY_CLEAR + margin;
    const r = dist(pos, b.pos);
    const out = unit(sub(pos, b.pos));
    if (r < clear) { d = unit(add(d, scale(out, 2.5))); continue; }
    const tip = add(pos, scale(d, ahead));
    const c = closest(pos, tip, b.pos);
    if (c.d < clear && dot(d, out) < 0) {
      // Sidestep: away from the centre, at the point of closest approach.
      const pt = add(pos, scale(sub(tip, pos), c.t));
      let side = sub(pt, b.pos);
      if (len(side) < 1e-6) side = [-d[2], 0, d[0]];
      const k = (clear - c.d) / clear;
      d = unit(add(d, scale(unit(side), 1.5 * k + 0.5)));
    }
  }
  return d;
}

/** Push apart from neighbours closer than `gap`. Returns a vector to add to a heading. */
export function separation(a: Agent, others: Iterable<Agent>, gap: number): V3 {
  let push: V3 = [0, 0, 0];
  for (const b of others) {
    if (b === a || !b.alive || b.docked) continue;
    const want = gap + a.radius * 0.5 + b.radius * 0.5;
    const off = sub(a.pos, b.pos);
    const d = len(off);
    if (d < want && d > 1e-6) push = add(push, scale(off, (want - d) / (want * d)));
  }
  return push;
}

/**
 * One step of flight: turn the nose toward `want` within the type's turn rate, ease the speed toward `wantSpeed`
 * within its acceleration, fly along the nose. Afterwards, never inside a body.
 */
export function fly(a: Agent, want: V3, wantSpeed: number, L: number, dt: number, bodies: Body[]) {
  const spec = COMBAT[a.type];
  if (len(want) > 1e-9) {
    // Dead astern, the turn has no preferred side: pick one, so the slerp has a plane to turn in.
    const w = dot(unit(want), a.fwd) < -0.9999 ? add(unit(want), scale(unit(cross(a.fwd, [0, 1, 0])), 0.01)) : want;
    a.fwd = turnToward(a.fwd, w, spec.turn * dt);
  }
  const top = spec.speed * L;
  const target = Math.max(0, Math.min(top, wantSpeed));
  const dv = spec.accel * L * dt;
  a.speed += Math.max(-dv, Math.min(dv, target - a.speed));
  a.vel = scale(a.fwd, a.speed);
  a.pos = add(a.pos, scale(a.vel, dt));
  for (const b of bodies) {
    if (b.size <= 0) continue;
    const floor = b.size * 1.02 + a.radius;
    const r = dist(a.pos, b.pos);
    if (r < floor) a.pos = add(b.pos, scale(unit(sub(a.pos, b.pos)), floor));
  }
}

/** Where to aim to hit a ship moving at `vel` with a bolt at `boltSpeed`, from `from`. */
export function leadPoint(from: V3, pos: V3, vel: V3, boltSpeed: number): V3 {
  let p = pos;
  for (let i = 0; i < 3; i++) p = add(pos, scale(vel, dist(from, p) / boltSpeed));
  return p;
}
