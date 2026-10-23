/**
 * Munitions: the ten things the ship can fire or drop. Pure data and maths (no three.js), so the rules that matter
 * (lock, area damage, the shield/hull split, the special effects) are unit-tested. RESEARCH-ARSENAL.md says why each
 * one exists. Names are generic placeholders; balance and feel are Caleb's call.
 *
 * Units are world units and seconds, on the same scale as the original laser and missile (lib/weapons.ts). Speeds are
 * added to the ship's own forward speed at launch. If the world is rescaled, scaleMunition() carries every distance
 * and speed with it in one place.
 */
import { LASER, MISSILE } from './weapons';

/** What a hit is made of. Shields and armour resist each kind differently (lib/shields.ts). */
export type DamageType = 'energy' | 'kinetic' | 'explosive' | 'ion';
export const DAMAGE_TYPES: DamageType[] = ['energy', 'kinetic', 'explosive', 'ion'];

export type MunitionId = 'pulse' | 'beam' | 'plasma' | 'rail' | 'flak' | 'seeker' | 'torpedo' | 'swarm' | 'ion' | 'mine';

/** How it travels: a straight shot, an instant beam, a homing missile, a shell that bursts, or a mine left behind. */
export type Delivery = 'bolt' | 'beam' | 'missile' | 'burst' | 'mine';

/** none: never locks. optional: homes only with a held lock, flies straight without one. required: will not fire unlocked. */
export type LockRule = 'none' | 'optional' | 'required';

export interface Munition {
  id: MunitionId;
  name: string;
  role: string; // one line: what it is for
  effect: string; // one line: what it does that the others do not
  type: DamageType;
  delivery: Delivery;
  damage: number; // per hit (beam: per second held on target)
  speed: number; // units/s at launch, on top of the ship's speed (beam: 0, it is instant)
  life: number; // seconds a shot lives; range ≈ speed × life (beam: its range is `range`)
  range: number; // units: how far it reaches (beam's reach, a missile's lock range)
  rate: number; // shots per second with the trigger held (beam: 0, it is continuous)
  shieldMul: number; // × damage against shields
  hullMul: number; // × damage against hull
  pierce: number; // 0..1: the part of each hit that passes straight through the shield to the hull
  area: number; // blast radius in units (0: hits only what it touches)
  radius: number; // the shot's own reach for the hit test, added to the ship's hit radius
  lock: LockRule;
  lockTime: number; // seconds to acquire a lock (before the targeting computer's multiplier)
  ammo: number | null; // rounds carried (a salvo counts as one); null: draws only on the capacitor
  energy: number; // capacitor cost per shot (beam: per second)
  seeker?: { accel: number; turn: number; homingOff: number; top: number }; // missiles: how they home
  salvo?: { count: number; spread: number }; // several missiles per shot, fanned out by `spread` radians
  fuse?: number; // proximity fuse (units): bursts when a hostile comes this close
  arm?: number; // seconds after launch before a mine can go off
  disable?: number; // ion: seconds a ship is disabled once its shield (the hit side) is down
}

export const MUNITIONS: Record<MunitionId, Munition> = {
  pulse: {
    id: 'pulse', name: 'Pulse laser', role: 'All-round gun; never runs dry', effect: 'Fast bolts, light on the capacitor',
    type: 'energy', delivery: 'bolt', damage: LASER.damage, speed: LASER.speed, life: LASER.life, range: LASER.speed * LASER.life,
    rate: LASER.rate, shieldMul: 1, hullMul: 0.8, pierce: 0, area: 0, radius: LASER.radius, lock: 'none', lockTime: 0, ammo: null, energy: 3,
  },
  beam: {
    id: 'beam', name: 'Beam laser', role: 'Close-range shield stripper', effect: 'Instant hit while held on target; heavy capacitor drain',
    type: 'energy', delivery: 'beam', damage: 45, speed: 0, life: 0, range: 120, rate: 0,
    shieldMul: 1.2, hullMul: 0.6, pierce: 0, area: 0, radius: 0.15, lock: 'none', lockTime: 0, ammo: null, energy: 24,
  },
  plasma: {
    id: 'plasma', name: 'Plasma bolt', role: 'Hull breaker', effect: 'Slow heavy bolt: weak on shields, strong on bare hull',
    type: 'energy', delivery: 'bolt', damage: 40, speed: 110, life: 2.5, range: 275, rate: 1.6,
    shieldMul: 0.5, hullMul: 1.5, pierce: 0, area: 0, radius: 0.35, lock: 'none', lockTime: 0, ammo: null, energy: 12,
  },
  rail: {
    id: 'rail', name: 'Railgun slug', role: 'Long-range sniper', effect: '40% of each hit passes through the shield',
    type: 'kinetic', delivery: 'bolt', damage: 70, speed: 900, life: 1, range: 900, rate: 0.6,
    shieldMul: 0.6, hullMul: 1.2, pierce: 0.4, area: 0, radius: 0.12, lock: 'none', lockTime: 0, ammo: 30, energy: 15,
  },
  flak: {
    id: 'flak', name: 'Flak burst', role: 'Close defence against small, quick things', effect: 'Proximity fuse; bursts over an area and kills missiles in it',
    type: 'explosive', delivery: 'burst', damage: 30, speed: 180, life: 1.2, range: 216, rate: 2.5,
    shieldMul: 0.8, hullMul: 1, pierce: 0, area: 7, radius: 0.2, lock: 'none', lockTime: 0, ammo: 80, energy: 0, fuse: 4,
  },
  seeker: {
    id: 'seeker', name: 'Seeker missile', role: 'Standard guided missile', effect: 'Homes gently with a held lock; homing lets go at the end, so a ship can dodge',
    type: 'explosive', delivery: 'missile', damage: MISSILE.damage, speed: 0, life: MISSILE.life, range: MISSILE.lockRange, rate: MISSILE.rate,
    shieldMul: 0.8, hullMul: 1.2, pierce: 0, area: 0, radius: MISSILE.radius, lock: 'optional', lockTime: 1.5, ammo: 24, energy: 0,
    seeker: { accel: MISSILE.accel, turn: MISSILE.turn, homingOff: MISSILE.homingOff, top: MISSILE.speed + 40 },
  },
  torpedo: {
    id: 'torpedo', name: 'Torpedo', role: 'Anti-capital: slow, heavy, needs a long lock', effect: 'Huge blast; slow enough to dodge or decoy',
    type: 'explosive', delivery: 'missile', damage: 220, speed: 0, life: 25, range: 600, rate: 0.25,
    shieldMul: 0.6, hullMul: 1.6, pierce: 0, area: 10, radius: 0.5, lock: 'required', lockTime: 3, ammo: 4, energy: 0,
    seeker: { accel: 30, turn: 0.5, homingOff: 8, top: 45 },
  },
  swarm: {
    id: 'swarm', name: 'Swarm missiles', role: 'Saturation: many small missiles at once', effect: 'Six agile mini-missiles a salvo: they home to within 4 units, too late to dodge, but each can be decoyed',
    type: 'explosive', delivery: 'missile', damage: 14, speed: 0, life: 6, range: 300, rate: 0.5,
    shieldMul: 1, hullMul: 0.9, pierce: 0, area: 0, radius: 0.25, lock: 'optional', lockTime: 0.8, ammo: 8, energy: 0,
    seeker: { accel: 220, turn: 2.6, homingOff: 4, top: 120 }, salvo: { count: 6, spread: 0.25 },
  },
  ion: {
    id: 'ion', name: 'Ion shot', role: 'Disabler: strips shields, barely scratches hull', effect: 'A ship whose shield is down when it hits is disabled for 4 s',
    type: 'ion', delivery: 'bolt', damage: 30, speed: 200, life: 1.8, range: 360, rate: 1.5,
    shieldMul: 3, hullMul: 0.05, pierce: 0, area: 0, radius: 0.3, lock: 'none', lockTime: 0, ammo: null, energy: 10, disable: 4,
  },
  mine: {
    id: 'mine', name: 'Proximity mine', role: 'Area denial; left behind for a pursuer or a patrol route', effect: 'Arms after 1.5 s; bursts when a hostile comes within 8 units',
    type: 'explosive', delivery: 'mine', damage: 120, speed: -3, life: 60, range: 8, rate: 0.5,
    shieldMul: 0.9, hullMul: 1.3, pierce: 0, area: 12, radius: 0.4, lock: 'none', lockTime: 0, ammo: 10, energy: 0, fuse: 8, arm: 1.5,
  },
};

export const MUNITION_IDS = Object.keys(MUNITIONS) as MunitionId[];
export const isMunition = (s: unknown): s is MunitionId => typeof s === 'string' && s in MUNITIONS;

/** Every distance and speed × k (time, damage and rates unchanged), for a world drawn at another scale. */
export function scaleMunition(m: Munition, k: number): Munition {
  return {
    ...m,
    speed: m.speed * k, range: m.range * k, area: m.area * k, radius: m.radius * k,
    fuse: m.fuse === undefined ? undefined : m.fuse * k,
    seeker: m.seeker && { ...m.seeker, accel: m.seeker.accel * k, homingOff: m.seeker.homingOff * k, top: m.seeker.top * k },
  };
}

/** What firing needs right now. */
export interface FireState { energy: number; ammo: number | null; locked: boolean }
export type FireBlock = 'energy' | 'ammo' | 'lock' | null;

/** Can this munition fire? Energy cost for one shot (beam: one frame of `dt`), a round of ammo, a lock if required. */
export function fireBlock(m: Munition, s: FireState, dt = 0): FireBlock {
  if (m.lock === 'required' && !s.locked) return 'lock';
  if (m.ammo !== null && (s.ammo ?? 0) <= 0) return 'ammo';
  const cost = m.delivery === 'beam' ? m.energy * dt : m.energy;
  if (cost > s.energy + 1e-9) return 'energy';
  return null;
}

/** Does a shot fired now home on the lock? Only with a held lock, and only for munitions that lock at all. */
export const homes = (m: Munition, locked: boolean) => m.lock !== 'none' && locked;

/**
 * Area damage falloff: full inside the inner third of the radius, then linear to nothing at the edge.
 * Returns the fraction of the munition's damage dealt at distance `d` from the burst.
 */
export function areaFalloff(d: number, radius: number): number {
  if (radius <= 0) return 0;
  const inner = radius / 3;
  if (d <= inner) return 1;
  if (d >= radius) return 0;
  return 1 - (d - inner) / (radius - inner);
}

/** Directions for a salvo: `count` unit vectors fanned evenly round `fwd` at `spread` radians off it. */
export function salvoDirs(fwd: [number, number, number], count: number, spread: number): [number, number, number][] {
  const f = norm(fwd);
  // Any vector not parallel to fwd gives a basis across it.
  const ref: [number, number, number] = Math.abs(f[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const a = norm(crossV(f, ref));
  const b = crossV(f, a);
  const out: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const s = Math.sin(spread);
    const c = Math.cos(spread);
    out.push(norm([
      f[0] * c + (a[0] * Math.cos(t) + b[0] * Math.sin(t)) * s,
      f[1] * c + (a[1] * Math.cos(t) + b[1] * Math.sin(t)) * s,
      f[2] * c + (a[2] * Math.cos(t) + b[2] * Math.sin(t)) * s,
    ]));
  }
  return out;
}
const norm = (v: [number, number, number]): [number, number, number] => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const crossV = (a: [number, number, number], b: [number, number, number]): [number, number, number] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A mine goes off when it is armed and a hostile is inside its fuse. */
export const mineTriggers = (m: Munition, age: number, nearest: number) => age >= (m.arm ?? 0) && nearest <= (m.fuse ?? 0);

/** A flak shell bursts when a hostile (or a hostile missile) is inside its fuse, or at the end of its life. */
export const flakBursts = (m: Munition, age: number, nearest: number) => nearest <= (m.fuse ?? 0) || age >= m.life;
