/**
 * How an enemy ship flies and when it fires: a simple flight model (fighters fly where they point; warships can
 * drift one way while their turrets face another), the lock an enemy builds on the player, and the fire orders for
 * each fitted weapon. Pure, unit-tested; the scene only applies the results.
 */
import type { V3 } from './nav';
import { add, dist, dot, len, scale, sub, unit } from './nav';
import type { Munition, MunitionId } from './munitions';
import { fireBlock } from './munitions';
import type { Arc } from './tactics';
import { bears } from './tactics';
import { intercept, turnToward } from './weapons';

export interface Body { pos: V3; vel: V3; fwd: V3 }
export interface FlightSpec { speed: number; accel: number; turn: number }

/**
 * Coupled flight (fighters): the nose turns toward `wantDir` at the turn rate, the speed eases toward `wantSpeed`,
 * and the ship flies along its nose. Returns the segment it flew.
 */
export function flyCoupled(b: Body, wantDir: V3, wantSpeed: number, spec: FlightSpec, dt: number): [V3, V3] {
  const from = b.pos;
  if (len(wantDir) > 1e-9) b.fwd = turnToward(b.fwd, wantDir, spec.turn * dt);
  const sp = len(b.vel);
  const target = Math.max(0, Math.min(spec.speed, wantSpeed));
  const next = sp + Math.max(-spec.accel * dt, Math.min(spec.accel * dt, target - sp));
  b.vel = scale(b.fwd, next);
  b.pos = add(b.pos, scale(b.vel, dt));
  return [from, b.pos];
}

/**
 * Free flight (cruisers, capital ships): the velocity changes toward `wantVel` by at most the acceleration, capped
 * at top speed, while the nose turns toward `face` on its own. A cruiser can back off and keep its guns on you.
 */
export function flyFree(b: Body, wantVel: V3, face: V3, spec: FlightSpec, dt: number): [V3, V3] {
  const from = b.pos;
  const dv = sub(wantVel, b.vel);
  const step = Math.min(len(dv), spec.accel * dt);
  b.vel = add(b.vel, scale(unit(dv), step));
  if (len(b.vel) > spec.speed) b.vel = scale(unit(b.vel), spec.speed);
  if (len(face) > 1e-9) b.fwd = turnToward(b.fwd, face, spec.turn * dt);
  b.pos = add(b.pos, scale(b.vel, dt));
  return [from, b.pos];
}

/** A velocity toward `goal` that slows to a stop on arrival instead of overshooting. */
export function arrive(pos: V3, goal: V3, speed: number, accel: number): V3 {
  const to = sub(goal, pos);
  const d = len(to);
  if (d < 1e-6) return [0, 0, 0];
  const brake = Math.sqrt(2 * accel * d) * 0.8; // the speed it can still shed in that distance
  return scale(to, Math.min(speed, brake) / d);
}

// ---------- The lock an enemy builds on the player ----------
/**
 * One step of an enemy's lock on the player: it builds while the player is on its line (`onTarget`), at 1/lockTime
 * a second, and drains at `decay` a second when not. Returns the new progress (≥ 1 is locked).
 */
export function stepEnemyLock(progress: number, onTarget: boolean, dt: number, lockTime: number, decay: number): number {
  if (onTarget) return Math.min(1, progress + dt / Math.max(lockTime, 1e-6));
  return Math.max(0, progress - decay * dt);
}

// ---------- Fire orders ----------
export interface Gun { id: MunitionId; m: Munition; cd: number; ammo: number | null }
export interface FireView {
  pos: V3;
  vel: V3;
  fwd: V3;
  arc: Arc;
  noseCone: number; // fighters: how far off the nose the guns can swing
  target: { pos: V3; vel: V3; r: number };
  locked: boolean;
  energy: number;
  los: boolean; // a clear shot at the target (nothing in the way)
  threats: V3[]; // the player's missiles nearby (for flak as point defence)
  chased: boolean; // the target is close behind (fighters drop mines)
}
export interface FireOrder { id: MunitionId; dir: V3; at: 'ship' | 'missile' }

/** Where to point a shot of speed `speed` from a ship moving at `vel` to meet a target: the lead, in the ship's frame. */
export function leadDir(pos: V3, vel: V3, speed: number, tPos: V3, tVel: V3): V3 {
  const hit = intercept(pos, speed, tPos, sub(tVel, vel));
  return unit(sub(hit ? hit.point : tPos, pos));
}

/** Which fitted weapons fire this frame, and where. Guns need a clear line; missiles a lock; mines a pursuer. */
export function fireOrders(guns: Gun[], v: FireView): FireOrder[] {
  const out: FireOrder[] = [];
  const d = dist(v.pos, v.target.pos);
  const toT = sub(v.target.pos, v.pos);
  for (const g of guns) {
    if (g.cd > 0) continue;
    const m = g.m;
    if (fireBlock(m, { energy: v.energy, ammo: g.ammo, locked: v.locked }, 1 / 60)) continue;
    if (m.delivery === 'mine') {
      if (v.chased) out.push({ id: g.id, dir: scale(v.fwd, -1), at: 'ship' });
      continue;
    }
    if (m.delivery === 'missile') {
      const min = Math.max(m.area * 3, (m.seeker?.homingOff ?? 0) * 1.5);
      if (v.locked && d <= m.range * 0.9 && d >= min && v.los) out.push({ id: g.id, dir: v.arc === 'nose' ? v.fwd : unit(toT), at: 'ship' });
      continue;
    }
    if (m.delivery === 'burst') {
      // Flak shoots down missiles first (point defence), then the ship if it is close.
      const near = v.threats.filter((p) => dist(p, v.pos) < m.speed * m.life * 0.5).sort((a, b) => dist(a, v.pos) - dist(b, v.pos))[0];
      if (near) { out.push({ id: g.id, dir: unit(sub(near, v.pos)), at: 'missile' }); continue; }
    }
    if (!v.los) continue;
    if (m.delivery === 'beam') {
      if (d <= m.range && bears(v.arc, v.fwd, toT, v.noseCone)) out.push({ id: g.id, dir: unit(toT), at: 'ship' });
      continue;
    }
    // Bolts and flak at the ship: in range, on the lead, within the arc.
    const reach = m.speed * m.life * (m.delivery === 'burst' ? 0.7 : 0.9);
    if (d > reach) continue;
    const dir = leadDir(v.pos, v.vel, m.speed, v.target.pos, v.target.vel);
    if (!bears(v.arc, v.fwd, dir, v.noseCone)) continue;
    out.push({ id: g.id, dir, at: 'ship' });
  }
  return out;
}

/** Scatter a direction by up to `err` radians (two rolls in [0, 1)): the pilot's aim. */
export function scatter(dir: V3, err: number, r1: number, r2: number): V3 {
  if (err <= 0) return unit(dir);
  const u = unit(dir);
  const ref: V3 = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const a = unit([u[1] * ref[2] - u[2] * ref[1], u[2] * ref[0] - u[0] * ref[2], u[0] * ref[1] - u[1] * ref[0]]);
  const b: V3 = [u[1] * a[2] - u[2] * a[1], u[2] * a[0] - u[0] * a[2], u[0] * a[1] - u[1] * a[0]];
  const ang = err * Math.sqrt(r1);
  const t = r2 * Math.PI * 2;
  return unit(add(scale(u, Math.cos(ang)), scale(add(scale(a, Math.cos(t)), scale(b, Math.sin(t))), Math.sin(ang))));
}

/** Is the player on a launcher's line for a lock? Fighters lock down the nose; warships' launchers turn to bear. */
export function lockLine(arc: Arc, fwd: V3, pos: V3, target: V3, cone: number): boolean {
  if (arc !== 'nose') return true;
  const to = unit(sub(target, pos));
  return dot(unit(fwd), to) >= Math.cos(cone);
}
