/**
 * Shields and hull: the four shield technologies, how a hit splits between shield and hull, regeneration, the
 * front/rear facets, armour, and the ion disable. Pure maths, unit-tested; the scene only reads the numbers.
 *
 * A hit: the munition's `pierce` part goes straight to the hull. The rest meets the shield at
 * damage × shieldMul × (1 − the shield's resistance to that damage type). What the shield cannot hold carries over to
 * the hull at hullMul, less the armour's resistance. A shield regenerates once it has gone `delay` seconds unhit.
 */
import type { DamageType, Munition } from './munitions';
import type { V3 } from './nav';

export type ShieldId = 'deflector' | 'hardened' | 'bifacet' | 'capacitor';
type Resist = Record<DamageType, number>;
const NONE: Resist = { energy: 0, kinetic: 0, explosive: 0, ion: 0 };

export interface ShieldTech {
  id: ShieldId;
  name: string;
  effect: string;
  capacity: number; // per facet
  regen: number; // per second per facet, once `delay` has passed since the last hit
  delay: number; // seconds unhit before it regenerates
  resist: Resist; // 0..1 per damage type
  facets: 1 | 2; // 2: separate front and rear shields
  draw: boolean; // capacitor-linked: the weapons may draw on it when the capacitor runs dry
  color: string; // the hit flash
}

export const SHIELDS: Record<ShieldId, ShieldTech> = {
  deflector: {
    id: 'deflector', name: 'Deflector', effect: 'Plain bubble; quick to come back', capacity: 100, regen: 14, delay: 3,
    resist: NONE, facets: 1, draw: false, color: '#5fb8ff',
  },
  hardened: {
    id: 'hardened', name: 'Hardened shield', effect: 'Less capacity, slow regen, resists energy and ion', capacity: 80, regen: 6, delay: 4,
    resist: { energy: 0.4, kinetic: 0.1, explosive: 0.3, ion: 0.5 }, facets: 1, draw: false, color: '#ffd166',
  },
  bifacet: {
    id: 'bifacet', name: 'Bi-facet shield', effect: 'Separate front and rear shields; each side takes only its own hits', capacity: 70, regen: 10, delay: 2.5,
    resist: NONE, facets: 2, draw: false, color: '#7dffb0',
  },
  capacitor: {
    id: 'capacitor', name: 'Capacitor shield', effect: 'Fast regen, low capacity; weapons draw on it when the capacitor is empty', capacity: 60, regen: 22, delay: 2,
    resist: NONE, facets: 1, draw: true, color: '#c58bff',
  },
};
export const SHIELD_IDS = Object.keys(SHIELDS) as ShieldId[];

/** Armour plating: extra hull and some resistance to what reaches it. */
export interface Armour { hull: number; resist: Resist }
export const NO_ARMOUR: Armour = { hull: 0, resist: NONE };

/** A ship's defences as they stand. `shield` has one entry per facet: [front] or [front, rear]. */
export interface Defence {
  tech: ShieldTech;
  shield: number[];
  maxShield: number;
  regen: number;
  hull: number;
  maxHull: number;
  armour: Armour;
  since: number[]; // seconds since each facet was last hit
  disabled: number; // seconds left disabled (ion)
}

/** Fresh defences: `tier` scales capacity and regen (1, 1.35, 1.7 for Mk I..III). */
export function makeDefence(tech: ShieldTech, hull: number, tier = 1, armour: Armour = NO_ARMOUR): Defence {
  const k = tierMul(tier);
  const cap = tech.capacity * k;
  return {
    tech, shield: Array(tech.facets).fill(cap), maxShield: cap, regen: tech.regen * k,
    hull: hull + armour.hull, maxHull: hull + armour.hull, armour, since: Array(tech.facets).fill(99), disabled: 0,
  };
}
export const tierMul = (tier: number) => 1 + (Math.max(1, tier) - 1) * 0.35;

/**
 * Which facet a hit lands on: 0 (front) when the shot comes from ahead of the ship, 1 (rear) from behind.
 * `heading` is the way the ship faces; `from` points from the ship toward where the shot came from.
 */
export function facetOf(def: Defence, heading: V3, from: V3): number {
  if (def.tech.facets === 1) return 0;
  return heading[0] * from[0] + heading[1] * from[1] + heading[2] * from[2] >= 0 ? 0 : 1;
}

export interface HitResult { toShield: number; toHull: number; shieldDown: boolean; killed: boolean; disabled: boolean }

/**
 * Apply `amount` raw damage of munition `m` to `def` on facet `facet`. Mutates `def`. The amount is usually
 * m.damage, less for area falloff or a beam's per-frame slice.
 */
export function applyHit(def: Defence, m: Pick<Munition, 'type' | 'shieldMul' | 'hullMul' | 'pierce' | 'disable'>, amount: number, facet = 0): HitResult {
  const f = Math.min(facet, def.shield.length - 1);
  const through = amount * m.pierce;
  const rest = amount - through;
  const want = rest * m.shieldMul * (1 - def.tech.resist[m.type]);
  let toShield = 0;
  let leftover = 0; // raw damage the shield could not hold
  if (want <= 0) leftover = 0;
  else if (def.shield[f] >= want) { toShield = want; def.shield[f] -= want; }
  else { toShield = def.shield[f]; leftover = rest * (1 - def.shield[f] / want); def.shield[f] = 0; }
  const toHull = (through + leftover) * m.hullMul * (1 - def.armour.resist[m.type]);
  def.hull = Math.max(0, def.hull - toHull);
  def.since[f] = 0;
  const shieldDown = def.shield[f] <= 1e-9;
  let disabled = false;
  if (m.disable && shieldDown && def.hull > 0) { def.disabled = Math.max(def.disabled, m.disable); disabled = true; }
  return { toShield, toHull, shieldDown, killed: def.hull <= 0, disabled };
}

/** Time passes: each facet regenerates once it has gone `delay` unhit; a disabled ship's shield does not. */
export function regenerate(def: Defence, dt: number) {
  def.disabled = Math.max(0, def.disabled - dt);
  for (let i = 0; i < def.shield.length; i++) {
    def.since[i] += dt;
    if (def.disabled > 0 || def.since[i] < def.tech.delay) continue;
    def.shield[i] = Math.min(def.maxShield, def.shield[i] + def.regen * dt);
  }
}

/** Total shield over all facets, 0..1 of full. */
export const shieldFrac = (def: Defence) => def.shield.reduce((a, b) => a + b, 0) / (def.maxShield * def.shield.length);

/** Capacitor-linked shield: take up to `want` energy from it (front facet). Returns how much it gave. */
export function drawShield(def: Defence, want: number): number {
  if (!def.tech.draw || want <= 0) return 0;
  const got = Math.min(want, def.shield[0]);
  def.shield[0] -= got;
  if (got > 0) def.since[0] = 0;
  return got;
}
