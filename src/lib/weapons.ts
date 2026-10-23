/**
 * Weapons: lasers and missiles. Pure maths only (no three.js), so the homing and the dodge are unit-tested.
 *
 * A missile homes on its target gently (a limited turn rate) until it is HOMING_OFF units away; from there the
 * homing is off and it flies straight. A target that sidesteps in that last stretch makes it miss.
 */
import type { V3 } from './nav';
import { add, closest, dist, len, scale, sub, unit } from './nav';

export type WeaponId = 'laser' | 'missile';
export const WEAPONS: WeaponId[] = ['laser', 'missile'];
export const WEAPON_LABEL: Record<WeaponId, string> = { laser: 'Laser', missile: 'Missile' };

export const LASER = {
  speed: 260, // units/s, added to the ship's own forward speed
  life: 1.6, // seconds before a bolt fades
  rate: 7, // shots per second while the trigger is held
  damage: 12,
  radius: 0.2, // a bolt's own reach; it hits when it passes within this plus the ship's hit radius
  aimCone: 0.35, // radians off the sight line within which a ship gets a lead indicator
};

/** A ship's hit radius when it does not set its own. Ships of other sizes carry their own. */
export const SHIP_RADIUS = 0.5;

export const MISSILE = {
  speed: 95, // top speed, added to the ship's speed at launch
  accel: 160, // units/s² up to top speed
  turn: 1.3, // rad/s: the "slight" homing
  life: 9,
  rate: 1.25, // shots per second
  damage: 60,
  radius: 0.3, // added to the ship's hit radius
  homingOff: 22, // inside this distance from the target the homing switches off and it flies straight
  lockRange: 400,
};

/** The last-second dodge: a ship that wins its roll sidesteps at `speed` units/s for `time` seconds. */
export const DODGE = { speed: 14, time: 0.6 };

/**
 * Missile lock: hold the reticle on one hostile ship for LOCK.time seconds. While acquiring, the ship must stay inside
 * the reticle (LOCK.cone, or the ship's own size on screen if that is bigger); looking off it drains the lock at
 * LOCK.decay per second. Once LOCKED it holds while the ship stays within LOCK.keep, and breaks outright beyond that.
 */
export const LOCK = {
  time: 1.5, // seconds on the ship to acquire the lock
  cone: 0.05, // radians (about 3°): the reticle's reach
  keep: 0.2, // radians (about 11°): how far off the sight line a held lock survives
  decay: 1.5, // lock progress (0..1) lost per second while off the ship
};

export interface Missile { pos: V3; vel: V3; speed: number; age: number; target: number | null; homing: boolean }

/** Turn a direction toward another by at most `maxAngle` radians. */
export function turnToward(dir: V3, want: V3, maxAngle: number): V3 {
  const a = unit(dir);
  const b = unit(want);
  const cos = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const ang = Math.acos(cos);
  if (ang <= maxAngle || ang < 1e-9) return b;
  // Slerp by maxAngle/ang.
  const t = maxAngle / ang;
  const s = Math.sin(ang);
  const k0 = Math.sin((1 - t) * ang) / s;
  const k1 = Math.sin(t * ang) / s;
  return unit(add(scale(a, k0), scale(b, k1)));
}

/**
 * One step of a missile. `targetPos` is where its target is now (null when it has none or it is gone).
 * Returns the segment it flew this step, for the hit test.
 */
export interface Seeker { accel: number; turn: number; homingOff: number }

export function stepMissile(m: Missile, targetPos: V3 | null, dt: number, topSpeed: number, spec: Seeker = MISSILE): [V3, V3] {
  const from = m.pos;
  m.age += dt;
  m.speed = Math.min(topSpeed, m.speed + spec.accel * dt);
  let dir = unit(m.vel);
  if (targetPos && m.homing) {
    if (dist(m.pos, targetPos) < spec.homingOff) m.homing = false;
    else dir = turnToward(dir, sub(targetPos, m.pos), spec.turn * dt);
  }
  m.vel = scale(dir, m.speed);
  m.pos = add(m.pos, scale(m.vel, dt));
  return [from, m.pos];
}

/** Whether a shot that flew from a to b passed within `r` of a point. */
export const sweptHit = (a: V3, b: V3, c: V3, r: number) => closest(a, b, c).d <= r;

/**
 * Should a ship dodge this missile now? Only once the missile's homing is off, it is close, and it is coming at the
 * ship. `roll` is a number in [0, 1) (Math.random in the game, fixed in tests); `chance` is the ship's dodge skill.
 */
export function wantsDodge(m: Missile, shipPos: V3, roll: number, chance: number, homingOff = MISSILE.homingOff): boolean {
  if (m.homing) return false;
  const to = sub(shipPos, m.pos);
  const d = len(to);
  if (d > homingOff) return false;
  const closing = (m.vel[0] * to[0] + m.vel[1] * to[1] + m.vel[2] * to[2]) / Math.max(d, 1e-9);
  return closing > 0 && roll < chance;
}

/** A sidestep direction for a dodge: across the missile's line, `side` picks which way. */
export function dodgeDir(missileVel: V3, side: number): V3 {
  const v = unit(missileVel);
  let across: V3 = [-v[2], 0, v[0]]; // horizontal and across the line
  if (len(across) < 1e-6) across = [1, 0, 0];
  return scale(unit(across), side >= 0 ? 1 : -1);
}

/** Angle in radians between a sight line (from `from` along `dir`) and a point. */
export function offAngle(from: V3, dir: V3, p: V3): number {
  const to = sub(p, from);
  const d = len(to);
  if (d < 1e-9) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot3(unit(dir), to) / d)));
}
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Is a ship of hit radius `r` under the reticle? Inside the cone, or the reticle's centre is over its body. */
export function underReticle(from: V3, dir: V3, p: V3, r: number): boolean {
  const d = dist(from, p);
  return offAngle(from, dir, p) <= Math.max(LOCK.cone, Math.atan2(r, Math.max(d, 1e-9)));
}

export interface LockState { id: number | null; progress: number; locked: boolean }
export const noLock = (): LockState => ({ id: null, progress: 0, locked: false });

/**
 * One step of the missile lock. `under` is the ship now under the reticle (null for none). `kept` says whether the
 * ship being tracked is still inside LOCK.keep and in range (only matters once locked). `time` is the seconds to lock
 * (each munition and targeting computer sets its own; LOCK.time by default). Mutates and returns `s`.
 */
export function stepLock(s: LockState, under: number | null, kept: boolean, dt: number, time = LOCK.time): LockState {
  if (s.locked) {
    if (s.id !== null && kept) return s;
    s.locked = false; // looked away: the lock breaks
    s.progress = 0;
    s.id = null;
  }
  if (under !== null && under === s.id) {
    s.progress = Math.min(1, s.progress + dt / time);
    if (s.progress >= 1) s.locked = true;
  } else if (under !== null && (s.id === null || s.progress <= 0)) {
    s.id = under;
    s.progress = Math.min(1, dt / time);
  } else {
    s.progress = Math.max(0, s.progress - dt * LOCK.decay);
    if (s.progress <= 0) s.id = null;
  }
  return s;
}

/**
 * Lead: where to aim so a bolt fired now from `from` at `speed` meets a target at `p` moving at constant `v`.
 * Solves |p + v·t − from| = speed·t for the earliest t > 0. Null when the bolt can never catch it.
 */
export function intercept(from: V3, speed: number, p: V3, v: V3): { t: number; point: V3 } | null {
  const r = sub(p, from);
  const a = dot3(v, v) - speed * speed;
  const b = 2 * dot3(r, v);
  const c = dot3(r, r);
  let t: number;
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) < 1e-12) return null;
    t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const q = Math.sqrt(disc);
    const t1 = (-b - q) / (2 * a);
    const t2 = (-b + q) / (2 * a);
    const lo = Math.min(t1, t2);
    const hi = Math.max(t1, t2);
    t = lo > 0 ? lo : hi;
  }
  if (!(t > 0) || !Number.isFinite(t)) return null;
  return { t, point: add(p, scale(v, t)) };
}

/**
 * How close a bolt fired now along `dir` at `speed` passes to a target at `p` moving at constant `v`, over the
 * bolt's life. A bolt "will hit" when this is within the bolt's reach plus the ship's hit radius.
 */
export function boltMiss(from: V3, dir: V3, speed: number, p: V3, v: V3, life = LASER.life): number {
  const r = sub(p, from);
  const w = sub(v, scale(unit(dir), speed)); // the target's motion relative to the bolt
  const ww = dot3(w, w);
  const t = ww < 1e-12 ? 0 : Math.max(0, Math.min(life, -dot3(r, w) / ww));
  return len(add(r, scale(w, t)));
}

/**
 * The bow draw (mc-controls R6): a munition that locks builds its lock only while drawn (right button held). Undrawn,
 * the reticle counts as on nothing and a held lock lets go. `drawn` true is plain stepLock.
 */
export function stepDrawnLock(s: LockState, under: number | null, kept: boolean, drawn: boolean, dt: number, time = LOCK.time): LockState {
  return stepLock(s, drawn ? under : null, drawn && kept, dt, time);
}
