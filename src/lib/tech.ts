/**
 * Ship technology other than guns and shields: drones, countermeasures, targeting computers, reactors, armour and
 * engines. Pure data and maths; the scene (components/arsenal.ts) moves and draws them.
 */
import type { V3 } from './nav';
import { add, dist, sub, unit } from './nav';
import type { Armour } from './shields';

// ---------- Drones ----------
export type DroneId = 'attack' | 'repair' | 'pointDefence';
export interface Drone {
  id: DroneId;
  name: string;
  effect: string;
  orbit: number; // units from the ship's centre
  range: number; // reach of its gun or its repair link
  rate: number; // shots (or kill attempts) per second
  damage: number; // attack: per shot; repair: hull per second; point defence: chance per shot to kill a missile
  shieldRate?: number; // repair: shield per second
  color: string;
}
export const DRONES: Record<DroneId, Drone> = {
  attack: { id: 'attack', name: 'Attack drone', effect: 'Shoots the nearest hostile ship within 60 units', orbit: 1.6, range: 60, rate: 1.2, damage: 6, color: '#ff8a5c' },
  repair: { id: 'repair', name: 'Repair drone', effect: 'Restores 4 hull and 6 shield a second', orbit: 1.2, range: 3, rate: 0, damage: 4, shieldRate: 6, color: '#7dffb0' },
  pointDefence: { id: 'pointDefence', name: 'Point-defence drone', effect: 'Shoots down hostile missiles within 25 units', orbit: 1.4, range: 25, rate: 3, damage: 0.5, color: '#9fd4ff' },
};
export const DRONE_IDS = Object.keys(DRONES) as DroneId[];

/** Where drone `i` of `n` sits round its ship at time `t`: a slow circle, each on its own tilt. */
export function droneOffset(i: number, n: number, t: number, r: number): V3 {
  const a = (i / Math.max(1, n)) * Math.PI * 2 + t * 1.1;
  const tilt = 0.5 + i * 0.7;
  return [Math.cos(a) * r, Math.sin(a) * r * Math.sin(tilt), Math.sin(a) * r * Math.cos(tilt)];
}

/** The nearest point within `range` of `from`, or null. */
export function nearestWithin<T>(from: V3, items: T[], pos: (x: T) => V3, range: number): T | null {
  let best: T | null = null;
  let bd = range;
  for (const x of items) {
    const d = dist(from, pos(x));
    if (d <= bd) { best = x; bd = d; }
  }
  return best;
}

/** Repair: hull and shield back at the drone's rates, capped at full. */
export function repairStep(d: Drone, hull: number, maxHull: number, shield: number, maxShield: number, dt: number) {
  return { hull: Math.min(maxHull, hull + d.damage * dt), shield: Math.min(maxShield, shield + (d.shieldRate ?? 0) * dt) };
}

// ---------- Countermeasures ----------
export type CounterId = 'flare' | 'chaff' | 'jammer';
export interface Counter {
  id: CounterId;
  name: string;
  effect: string;
  charges: number | null; // null: passive, always on
  cooldown: number; // seconds between uses
  life: number; // seconds a decoy or cloud lasts
  pull: number; // flare: chance a missile seeing it takes it instead; chaff: chance it breaks a lock
  turnMul?: number; // jammer: incoming missiles turn at this fraction
  lockMul?: number; // jammer: locks on this ship take this many times longer
}
export const COUNTERS: Record<CounterId, Counter> = {
  flare: { id: 'flare', name: 'Decoy flares', effect: 'A hot decoy: missiles homing nearby may chase it instead', charges: 6, cooldown: 1.5, life: 2.5, pull: 0.75 },
  chaff: { id: 'chaff', name: 'Chaff', effect: 'A cloud that breaks a lock being held on the ship', charges: 4, cooldown: 3, life: 3, pull: 0.8 },
  jammer: { id: 'jammer', name: 'Lock jammer', effect: 'Passive: locks on the ship take 1.6× longer; incoming missiles turn at 60%', charges: null, cooldown: 0, life: 0, pull: 0, turnMul: 0.6, lockMul: 1.6 },
};
export const COUNTER_IDS = Object.keys(COUNTERS) as CounterId[];

/** How far a flare reaches a missile's seeker: a missile within this many units of a fresh flare sees it. */
export const FLARE_SEEN = 40;

/**
 * Does a homing missile take the decoy? `pull` is the countermeasure's strength, `seeker` the firing ship's targeting
 * grade (0..1; 1 ignores decoys). `roll` is in [0, 1) (Math.random in the game, fixed in tests).
 */
export const spoofed = (pull: number, seeker: number, roll: number) => roll < pull * (1 - Math.max(0, Math.min(1, seeker)));

/** Is a decoy in a missile's view: close enough, and ahead of it rather than behind? */
export function decoyVisible(missilePos: V3, missileVel: V3, decoy: V3): boolean {
  const to = sub(decoy, missilePos);
  if (dist(missilePos, decoy) > FLARE_SEEN) return false;
  const v = unit(missileVel);
  const u = unit(to);
  return v[0] * u[0] + v[1] * u[1] + v[2] * u[2] > -0.2;
}

/** A flare drifts away from the ship that dropped it: back and down from its heading. */
export const flareVel = (shipVel: V3, heading: V3): V3 => add(shipVel, [-heading[0] * 6, -heading[1] * 6 - 3, -heading[2] * 6]);

// ---------- Targeting, reactor, armour, engine ----------
/** Targeting computer: lock time multiplier, seeker grade against decoys, and the lead indicator's reach. */
export interface Targeting { lockMul: number; seeker: number; aimCone: number }
export const TARGETING: Targeting[] = [
  { lockMul: 1, seeker: 0, aimCone: 0.35 },
  { lockMul: 0.75, seeker: 0.3, aimCone: 0.45 },
  { lockMul: 0.5, seeker: 0.6, aimCone: 0.6 },
];

/** Reactor and capacitor: the weapon energy pool and how fast it refills. */
export interface Reactor { capacity: number; regen: number }
export const REACTORS: Reactor[] = [
  { capacity: 100, regen: 30 },
  { capacity: 140, regen: 42 },
  { capacity: 200, regen: 60 },
];

export const ARMOURS: Armour[] = [
  { hull: 0, resist: { energy: 0, kinetic: 0, explosive: 0, ion: 0 } },
  { hull: 40, resist: { energy: 0.05, kinetic: 0.15, explosive: 0.1, ion: 0 } },
  { hull: 90, resist: { energy: 0.1, kinetic: 0.3, explosive: 0.2, ion: 0 } },
];

/** Engine: the boost multiplier (the flight's base boost is 2.5×). */
export const ENGINES: { boost: number }[] = [{ boost: 2.5 }, { boost: 3.2 }, { boost: 4 }];

/** Capacitor: refill, capped. */
export const recharge = (energy: number, r: Reactor, dt: number) => Math.min(r.capacity, energy + r.regen * dt);

// ---------- Enemy fits ----------
/**
 * What each nation's patrol ships carry: a shield technology and a countermeasure, so every munition has something
 * to work against. Equipment only; enemies still do not shoot back, and nothing here is AI.
 */
export const ENEMY_FIT: Record<string, { shield: 'deflector' | 'hardened' | 'bifacet' | 'capacitor'; counter: CounterId | null }> = {
  moon: { shield: 'deflector', counter: null },
  mercury: { shield: 'hardened', counter: 'flare' },
  venus: { shield: 'bifacet', counter: null },
  mars: { shield: 'capacitor', counter: 'flare' },
  jupiter: { shield: 'hardened', counter: 'chaff' },
  saturn: { shield: 'deflector', counter: 'flare' },
};
/** Charges an enemy ship carries of its countermeasure. */
export const ENEMY_CHARGES = 3;
