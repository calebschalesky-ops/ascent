/**
 * Enemy armament: what each enemy ship carries, rolled from the same munition and module tables the player fits.
 *
 * The roll is seeded and deterministic (the same nation, class, level and seed always give the same ship), and it
 * is weighted three ways, so it feels random but stays ordered:
 *   - by nation: each one has a doctrine, a set of preferences over weapons, shields, countermeasures and drones;
 *   - by ship class: fighters carry light guns and missiles, cruisers a mix, capital ships heavy weapons
 *     (torpedoes, beams, railguns) and always some point defence;
 *   - by level: a ship's level sets the highest module tier it can carry, its shield's Mk and its pilot's skill.
 *
 * Doctrines describe how a nation fights, not who its people are; names and lore are Caleb's. Every weight and level
 * here is a first guess, to be tuned by play.
 */
import type { MunitionId } from './munitions';
import { MUNITIONS, MUNITION_IDS } from './munitions';
import { moduleById } from './modules';
import type { Armour, ShieldId } from './shields';
import { SHIELD_IDS } from './shields';
import type { CounterId, DroneId, Reactor, Targeting } from './tech';
import type { ShipType } from './shipTypes';
import { SHIP_SPECS, SHIP_TYPES } from './shipTypes';
import { ARMOURS, COUNTER_IDS, DRONE_IDS, ENEMY_CHARGES, ENEMY_FIT, REACTORS, TARGETING } from './tech';

// ---------- Ship classes ----------
/**
 * Ship classes are ship types (lib/shipTypes.ts, merged in integration pass 2): size, hp, hitRadius and dodge come
 * from SHIP_SPECS; this table adds only the flight and fitting fields. Lengths are in player-ship lengths, so a
 * rescaled ship carries through.
 */
export type ShipClass = ShipType;
export const SHIP_CLASSES: ShipClass[] = SHIP_TYPES;

export interface ClassSpec {
  label: string;
  size: number; // length against the player ship's
  hp: number;
  hitRadius: number; // player-ship lengths
  dodge: number; // chance it sidesteps a missile once the homing lets go
  shieldMul: number; // × the shield's capacity and regen (a capital ship carries a bigger generator)
  speed: number; // top speed, units/s at world scale 1
  accel: number; // units/s²
  turn: number; // rad/s
  weapons: number; // weapon slots
  drones: number; // drone slots
  charges: number; // countermeasure charges
}
const spec = (t: ShipType) => { const s = SHIP_SPECS[t]; return { label: s.label, size: s.size, hp: s.hp, hitRadius: s.hitRadius, dodge: s.dodge }; };
export const CLASS: Record<ShipClass, ClassSpec> = {
  capital: { ...spec('capital'), shieldMul: 3, speed: 16, accel: 5, turn: 0.3, weapons: 4, drones: 2, charges: 6 },
  cruiser: { ...spec('cruiser'), shieldMul: 1, speed: 38, accel: 16, turn: 0.9, weapons: 3, drones: 1, charges: 4 },
  fighter: { ...spec('fighter'), shieldMul: 0.5, speed: 75, accel: 70, turn: 2.4, weapons: 2, drones: 0, charges: ENEMY_CHARGES },
  // The destroyer (claude/destroyer-a8ff7d DESTROYER.md): faster and more agile than cruiser and capital, four mid-weight
  // guns, a small bay (one drone slot).
  destroyer: { ...spec('destroyer'), shieldMul: 1.6, speed: 46, accel: 20, turn: 1.1, weapons: 4, drones: 1, charges: 5 },
};

/** How much each class wants each munition, before the nation's doctrine. 0: never carried by this class. */
export const CLASS_WEAPON: Record<ShipClass, Record<MunitionId, number>> = {
  fighter: { pulse: 3, plasma: 1.5, ion: 1, seeker: 2.5, swarm: 1.5, mine: 0.6, flak: 0, beam: 0, rail: 0, torpedo: 0 },
  cruiser: { pulse: 1.5, plasma: 1.5, ion: 1.2, seeker: 1.5, swarm: 1.2, mine: 0.3, flak: 1, beam: 1, rail: 1.2, torpedo: 0.6 },
  capital: { pulse: 0.4, plasma: 1, ion: 0.8, seeker: 0.5, swarm: 1, mine: 0, flak: 2, beam: 2.5, rail: 2, torpedo: 3 },
  // Mid-weight guns and rails; no torpedoes (those are the capital ship's), no mines (it hunts, it does not run).
  destroyer: { pulse: 0.6, plasma: 1.5, ion: 1, seeker: 0.6, swarm: 1, mine: 0, flak: 1, beam: 2, rail: 2.5, torpedo: 0 },
};
/** The first slot: fighters and cruisers lead with a gun; capital ships with a heavy weapon. */
const PRIMARY: Record<ShipClass, MunitionId[]> = {
  fighter: ['pulse', 'plasma', 'ion'],
  cruiser: ['pulse', 'plasma', 'ion', 'beam', 'rail'],
  capital: ['torpedo', 'beam', 'rail', 'plasma'],
  destroyer: ['rail', 'beam', 'plasma'],
};

// ---------- Levels ----------
export const MAX_LEVEL = 5;
/** Highest module tier a ship of each level may carry (index = level − 1). */
export const LEVEL_TIER = [1, 2, 2, 3, 3] as const;
/** Pilot skill 0..1 by level: aim, reaction and how readily it uses its countermeasures. */
export const skillOf = (level: number) => 0.2 + 0.15 * (clampLevel(level) - 1);
const clampLevel = (l: number) => Math.max(1, Math.min(MAX_LEVEL, Math.round(l)));

/**
 * STAND-IN levels until progression decides how ships are levelled: nations further from Earth field better ships,
 * and a capital ship is one level above its nation's line.
 */
export const NATION_LEVEL: Record<string, number> = { earth: 1, moon: 1, mercury: 2, venus: 2, mars: 3, jupiter: 4, saturn: 4 };
export const levelOf = (nation: string, cls: ShipClass) => clampLevel((NATION_LEVEL[nation] ?? 1) + (cls === 'capital' ? 1 : 0));

// ---------- Doctrines ----------
export interface Temper {
  aggression: number; // 0..1: how readily its fighters press an attack rather than break off
  standoff: number; // × the standoff range its weapons give
  cover: number; // 0..1: how much its warships value cover when hurt
  sun: number; // 0..1: how much it prefers to come at the player out of the Sun
}
export interface Doctrine {
  summary: string; // how it fights, in one line (a placeholder, not lore)
  weapons: Partial<Record<MunitionId, number>>;
  shield: Partial<Record<ShieldId, number>>;
  counter: Partial<Record<CounterId | 'none', number>>;
  drones: Partial<Record<DroneId, number>>;
  temper: Temper;
}
/** A weapon a doctrine does not name can still turn up, rarely: the roll stays somewhat random. */
export const OFF_DOCTRINE = 0.15;

/** The preferred shield and countermeasure come from ENEMY_FIT (lib/tech.ts), so the arsenal's tests still hold. */
const pref = (nation: string, extra: Partial<Record<ShieldId, number>> = {}) => ({ [ENEMY_FIT[nation]?.shield ?? 'deflector']: 6, ...extra });

export const DOCTRINE: Record<string, Doctrine> = {
  moon: {
    summary: 'Picket: light guns, mines and flak; repairs before firepower',
    weapons: { pulse: 3, flak: 2, mine: 2, seeker: 1 }, shield: pref('moon'), counter: { none: 2, flare: 1 }, drones: { repair: 3, pointDefence: 1 },
    temper: { aggression: 0.4, standoff: 1, cover: 0.8, sun: 0.2 },
  },
  mercury: {
    summary: 'Sun-side raiders: hot energy weapons and fast passes out of the Sun',
    weapons: { plasma: 3, pulse: 2, beam: 2, swarm: 1 }, shield: pref('mercury'), counter: { flare: 4 }, drones: { attack: 3 },
    temper: { aggression: 0.9, standoff: 0.85, cover: 0.3, sun: 1 },
  },
  venus: {
    summary: 'Shield wall: ion to strip, beams to finish, point defence against missiles',
    weapons: { ion: 3, beam: 2, swarm: 1.5, pulse: 1 }, shield: pref('venus'), counter: { jammer: 3, none: 1 }, drones: { pointDefence: 3, repair: 1 },
    temper: { aggression: 0.5, standoff: 1.1, cover: 0.6, sun: 0.3 },
  },
  mars: {
    summary: 'Missile doctrine: lock and launch, guns as a backup',
    weapons: { seeker: 3, swarm: 3, torpedo: 2, pulse: 1 }, shield: pref('mars'), counter: { flare: 4 }, drones: { attack: 2, pointDefence: 1 },
    temper: { aggression: 0.8, standoff: 1, cover: 0.5, sun: 0.5 },
  },
  jupiter: {
    summary: 'Heavy line: railguns and torpedoes from range, flak for whatever gets close',
    weapons: { rail: 3, torpedo: 3, flak: 2, plasma: 1 }, shield: pref('jupiter'), counter: { chaff: 4 }, drones: { pointDefence: 3 },
    temper: { aggression: 0.3, standoff: 1.3, cover: 1, sun: 0.2 },
  },
  saturn: {
    summary: 'Ambush: mines and railguns from cover, ion to pin a target',
    weapons: { mine: 3, rail: 2, ion: 2, seeker: 1 }, shield: pref('saturn'), counter: { flare: 3, chaff: 1 }, drones: { repair: 2, attack: 1 },
    temper: { aggression: 0.6, standoff: 1.1, cover: 1, sun: 0.4 },
  },
  earth: {
    summary: 'The player’s own nation: the default loadout',
    weapons: { pulse: 3, seeker: 2 }, shield: { deflector: 6 }, counter: { flare: 3 }, drones: { repair: 1 },
    temper: { aggression: 0.5, standoff: 1, cover: 0.5, sun: 0.3 },
  },
};
export const doctrineOf = (nation: string): Doctrine => DOCTRINE[nation] ?? DOCTRINE.earth;

// ---------- The seeded roll ----------
/** A small seeded generator (mulberry32): the same seed gives the same sequence, in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A seed from any parts (FNV-1a over their text). */
export function seedOf(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** Pick one key by weight; null when every weight is zero. */
export function pickWeighted<K extends string>(w: Partial<Record<K, number>>, roll: number): K | null {
  const keys = (Object.keys(w) as K[]).filter((k) => (w[k] ?? 0) > 0);
  const total = keys.reduce((s, k) => s + (w[k] ?? 0), 0);
  if (total <= 0) return null;
  let x = roll * total;
  for (const k of keys) { x -= w[k] ?? 0; if (x < 0) return k; }
  return keys[keys.length - 1];
}

export const tierOfModule = (id: string) => moduleById(id)?.tier ?? 1;

/** Everything one enemy ship carries, and how well it is flown. */
export interface EnemyFit {
  nation: string;
  cls: ShipClass;
  level: number;
  tier: number; // highest module tier it was allowed
  skill: number;
  weapons: MunitionId[];
  shield: ShieldId;
  shieldTier: number;
  counter: CounterId | null;
  charges: number;
  drones: DroneId[];
  targeting: Targeting;
  reactor: Reactor;
  armour: Armour;
  temper: Temper;
}

/** The weight a ship of this class, nation and tier gives munition `id` (0: it will not carry it). */
export function weaponWeight(id: MunitionId, cls: ShipClass, d: Doctrine, tier: number): number {
  if (tierOfModule(id) > tier) return 0;
  return CLASS_WEAPON[cls][id] * (d.weapons[id] ?? OFF_DOCTRINE);
}

/** Roll one ship's fit. Deterministic in (nation, cls, level, seed). */
export function rollFit(nation: string, cls: ShipClass, level: number, seed: number): EnemyFit {
  const r = rng(seedOf(nation, cls, level, seed));
  const lv = clampLevel(level);
  const tier = LEVEL_TIER[lv - 1];
  const d = doctrineOf(nation);
  const spec = CLASS[cls];

  // Weapons: the primary from the class's lead list, then the rest by weight, no repeats.
  const weapons: MunitionId[] = [];
  const weightsFor = (ids: MunitionId[]) => Object.fromEntries(ids.filter((id) => !weapons.includes(id)).map((id) => [id, weaponWeight(id, cls, d, tier)])) as Partial<Record<MunitionId, number>>;
  // (A level-1 capital ship has no heavy weapon in its tier: it leads with whatever its tier allows.)
  const first = pickWeighted(weightsFor(PRIMARY[cls]), r()) ?? pickWeighted(weightsFor(MUNITION_IDS), r()) ?? 'pulse';
  weapons.push(first);
  while (weapons.length < spec.weapons) {
    const w = pickWeighted(weightsFor(MUNITION_IDS), r());
    if (!w) break;
    weapons.push(w);
  }

  // Shield: the doctrine's preference (others rarely), at a Mk one below its tier or at it, the higher more often.
  const shieldW = Object.fromEntries(SHIELD_IDS.map((s) => [s, d.shield[s] ?? 0.5])) as Record<ShieldId, number>;
  const shield = pickWeighted(shieldW, r()) ?? 'deflector';
  const shieldTier = Math.max(1, r() < 0.67 ? tier : tier - 1);

  // Countermeasure: from the doctrine, gated by tier; 'none' is a real choice.
  const counterW: Partial<Record<CounterId | 'none', number>> = { none: d.counter.none ?? 0 };
  for (const c of COUNTER_IDS) if (tierOfModule(c) <= tier) counterW[c] = d.counter[c] ?? 0;
  const c = pickWeighted(counterW, r());
  let counter: CounterId | null = c === 'none' || c === null ? null : c;
  // A doctrine whose countermeasure is above this ship's tier falls back to flares.
  if (c === null && Object.keys(d.counter).some((k) => k !== 'none')) counter = 'flare';

  // Drones: by doctrine, gated by tier, no repeats.
  const drones: DroneId[] = [];
  for (let i = 0; i < spec.drones; i++) {
    const w = Object.fromEntries(DRONE_IDS.filter((x) => !drones.includes(x) && tierOfModule(x) <= tier).map((x) => [x, d.drones[x] ?? OFF_DOCTRINE])) as Partial<Record<DroneId, number>>;
    const x = pickWeighted(w, r());
    if (x) drones.push(x);
  }

  // A capital ship always has point defence: a point-defence drone if its tier allows, else flak in its last slot.
  if (cls === 'capital' && !weapons.includes('flak') && !drones.includes('pointDefence')) {
    if (tierOfModule('pointDefence') <= tier && spec.drones > 0) drones[drones.length >= spec.drones ? drones.length - 1 : drones.length] = 'pointDefence';
    else weapons[weapons.length - 1] = 'flak';
  }

  const armourTier = cls === 'capital' ? Math.min(2, tier - 1) : cls === 'cruiser' && lv >= 3 ? 1 : 0;
  return {
    nation, cls, level: lv, tier, skill: skillOf(lv), weapons, shield, shieldTier, counter,
    charges: counter && counter !== 'jammer' ? spec.charges : 0, drones,
    targeting: TARGETING[tier - 1], reactor: REACTORS[tier - 1], armour: ARMOURS[armourTier], temper: d.temper,
  };
}

/** One line for the HUD or the dev hook. */
export const fitSummary = (f: EnemyFit) =>
  `${f.nation} ${f.cls} L${f.level}: ${f.weapons.map((w) => MUNITIONS[w].name).join(', ')}; ${f.shield} Mk ${f.shieldTier}` +
  `${f.counter ? `; ${f.counter}` : ''}${f.drones.length ? `; drones ${f.drones.join(', ')}` : ''}`;
