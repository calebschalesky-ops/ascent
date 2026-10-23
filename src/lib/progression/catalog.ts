/**
 * The modules a ship can carry, the slots each ship type has, and the 28 level-1 loadouts (seven races × capital,
 * cruiser, fighter, destroyer). Prices live in economy.ts; tiers and what each level unlocks live in levels.ts.
 *
 * Weapons and shields are arsenal's (by id, refs.ts); their numbers here are copied from its tables. Module stats are
 * only partly felt in the engine today: hit points, shields and dodge arm the AI ships; dps arms the player's fighters;
 * the player's own weapons fire as main's laser or missile (refs.ts ENGINE_WEAPON) until arsenal's munitions fly.
 */
import type { NationId } from '../nations';
import type { ModuleId, ShipType } from './refs';

export type SlotKind = 'weapon' | 'defence' | 'support';
export const SLOT_KINDS: SlotKind[] = ['weapon', 'defence', 'support'];
export const SLOT_LABEL: Record<SlotKind, string> = { weapon: 'Weapons', defence: 'Defence', support: 'Support' };

export interface ModuleStats {
  dps?: number; // damage per second it adds (weapons, attack drones)
  hp?: number; // hull points it adds (armour)
  shield?: number; // shield points it adds
  dodge?: number; // added to the chance of sidestepping a missile
  regen?: number; // hull points repaired per second
  lock?: number; // lock time multiplier (below 1 locks faster)
}

export interface Module { id: ModuleId; label: string; kind: SlotKind; tier: 1 | 2 | 3 | 4; line: string; stats: ModuleStats }

export const MODULES: Module[] = [
  // Weapons: arsenal's ten munitions (munitions.ts). dps is its damage × rate (swarm × 6 per salvo), for wingmen.
  { id: 'pulse', label: 'Pulse laser', kind: 'weapon', tier: 1, line: 'All-round gun; never runs dry.', stats: { dps: 84 } },
  { id: 'seeker', label: 'Seeker missile', kind: 'weapon', tier: 1, line: 'Homes with a held lock; lets go at the end.', stats: { dps: 75 } },
  { id: 'rail', label: 'Railgun', kind: 'weapon', tier: 1, line: 'Long-range slug; 40% passes the shield.', stats: { dps: 42 } },
  { id: 'flak', label: 'Flak', kind: 'weapon', tier: 1, line: 'Proximity bursts; kills missiles too.', stats: { dps: 75 } },
  { id: 'plasma', label: 'Plasma bolt', kind: 'weapon', tier: 2, line: 'Slow heavy bolt: weak on shields, strong on hull.', stats: { dps: 64 } },
  { id: 'swarm', label: 'Swarm missiles', kind: 'weapon', tier: 2, line: 'Six small missiles a salvo.', stats: { dps: 42 } },
  { id: 'mine', label: 'Proximity mine', kind: 'weapon', tier: 2, line: 'Dropped behind; bursts on a pursuer.', stats: { dps: 60 } },
  { id: 'ion', label: 'Ion shot', kind: 'weapon', tier: 3, line: 'Strips shields; disables a ship with none.', stats: { dps: 45 } },
  { id: 'beam', label: 'Beam laser', kind: 'weapon', tier: 3, line: 'Instant hit while held on target.', stats: { dps: 45 } },
  { id: 'torpedo', label: 'Torpedo', kind: 'weapon', tier: 4, line: 'Anti-capital: slow, huge, needs a long lock.', stats: { dps: 55 } },
  // Defence: arsenal's four shields (shields.ts; capacity per facet) and armour (PLACEHOLDER ids).
  { id: 'deflector', label: 'Deflector shield', kind: 'defence', tier: 1, line: 'Plain bubble; quick to come back.', stats: { shield: 100 } },
  { id: 'bifacet', label: 'Bi-facet shield', kind: 'defence', tier: 1, line: 'Separate front and rear shields.', stats: { shield: 70 } },
  { id: 'armour', label: 'Armour plating', kind: 'defence', tier: 1, line: 'Extra hull; resists kinetic most.', stats: { hp: 40 } },
  { id: 'capacitor', label: 'Capacitor shield', kind: 'defence', tier: 2, line: 'Fast regen, low capacity; feeds the guns.', stats: { shield: 60 } },
  { id: 'plate', label: 'Heavy plating', kind: 'defence', tier: 2, line: 'Much more hull; a little slower to sidestep.', stats: { hp: 100, dodge: -0.05 } },
  { id: 'hardened', label: 'Hardened shield', kind: 'defence', tier: 3, line: 'Resists energy and ion; slow to regenerate.', stats: { shield: 80 } },
  // Support: drones, countermeasures, electronics (PLACEHOLDER ids).
  { id: 'droneRepair', label: 'Repair drone', kind: 'support', tier: 1, line: 'Patches hull and shield in a fight.', stats: { regen: 2 } },
  { id: 'flares', label: 'Decoy flares', kind: 'support', tier: 1, line: 'A missile that sees one may chase it.', stats: { dodge: 0.15 } },
  { id: 'jammer', label: 'Jammer', kind: 'support', tier: 1, line: 'Locks on you take longer; missiles turn worse.', stats: { dodge: 0.1 } },
  { id: 'fireControl', label: 'Targeting computer', kind: 'support', tier: 1, line: 'Locks faster.', stats: { lock: 0.8 } },
  { id: 'chaff', label: 'Chaff', kind: 'support', tier: 2, line: 'Breaks a lock being held on you.', stats: { dodge: 0.1 } },
  { id: 'droneAttack', label: 'Attack drone', kind: 'support', tier: 2, line: 'Shoots the nearest hostile.', stats: { dps: 12 } },
  { id: 'dronePD', label: 'Point-defence drone', kind: 'support', tier: 3, line: 'Shoots down incoming missiles.', stats: { dodge: 0.2 } },
];

export const moduleOf = (id: ModuleId): Module => {
  const m = MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`no module ${id}`);
  return m;
};
export const isModuleId = (s: unknown): s is ModuleId => typeof s === 'string' && MODULES.some((m) => m.id === s);

/** Slots per ship type. FIRST PASS. */
export const SLOTS: Record<ShipType, Record<SlotKind, number>> = {
  capital: { weapon: 4, defence: 2, support: 2 },
  cruiser: { weapon: 2, defence: 1, support: 1 },
  fighter: { weapon: 2, defence: 1, support: 0 },
  // Three turrets, less armour and bay than a capital ship (DESTROYER.md).
  destroyer: { weapon: 3, defence: 1, support: 1 },
};

/** The highest tier a level-1 loadout of each type may carry. */
export const START_TIER: Record<ShipType, number> = { capital: 2, cruiser: 1, fighter: 1, destroyer: 2 };

export type Fit = Record<SlotKind, ModuleId[]>;

const fit = (weapon: ModuleId[], defence: ModuleId[], support: ModuleId[] = []): Fit => ({ weapon, defence, support });

/** The 28 level-1 loadouts. Each follows its race's doctrine (refs.ts) and LORE.md's ship descriptions. */
export const LOADOUTS: Record<NationId, Record<ShipType, Fit>> = {
  earth: {
    capital: fit(['pulse', 'seeker', 'rail', 'flak'], ['armour', 'deflector'], ['droneRepair', 'fireControl']),
    cruiser: fit(['pulse', 'seeker'], ['deflector'], ['fireControl']),
    fighter: fit(['pulse', 'rail'], ['armour']),
    destroyer: fit(['pulse', 'pulse', 'seeker'], ['deflector'], ['fireControl']),
  },
  moon: {
    capital: fit(['plasma', 'pulse', 'pulse', 'seeker'], ['deflector', 'capacitor'], ['droneAttack', 'jammer']),
    cruiser: fit(['pulse', 'pulse'], ['deflector'], ['droneRepair']),
    fighter: fit(['pulse', 'pulse'], ['deflector']),
    destroyer: fit(['pulse', 'pulse', 'plasma'], ['deflector'], ['droneAttack']),
  },
  mercury: {
    capital: fit(['rail', 'flak', 'flak', 'seeker'], ['bifacet', 'plate'], ['droneRepair', 'flares']),
    cruiser: fit(['rail', 'flak'], ['bifacet'], ['flares']),
    fighter: fit(['flak', 'pulse'], ['bifacet']),
    destroyer: fit(['flak', 'flak', 'pulse'], ['bifacet'], ['flares']),
  },
  venus: {
    capital: fit(['swarm', 'plasma', 'flak', 'pulse'], ['capacitor', 'deflector'], ['jammer', 'chaff']),
    cruiser: fit(['flak', 'seeker'], ['deflector'], ['flares']),
    fighter: fit(['flak', 'flak'], ['deflector']),
    destroyer: fit(['flak', 'pulse', 'swarm'], ['capacitor'], ['chaff']),
  },
  mars: {
    capital: fit(['rail', 'rail', 'flak', 'seeker'], ['plate', 'armour'], ['fireControl', 'chaff']),
    cruiser: fit(['rail', 'seeker'], ['armour'], ['fireControl']),
    fighter: fit(['rail', 'flak'], ['armour']),
    destroyer: fit(['rail', 'flak', 'seeker'], ['armour'], ['fireControl']),
  },
  jupiter: {
    capital: fit(['rail', 'plasma', 'swarm', 'seeker'], ['plate', 'deflector'], ['droneAttack', 'fireControl']),
    cruiser: fit(['rail', 'seeker'], ['deflector'], ['fireControl']),
    fighter: fit(['seeker', 'seeker'], ['armour']),
    destroyer: fit(['rail', 'plasma', 'seeker'], ['deflector'], ['fireControl']),
  },
  saturn: {
    capital: fit(['rail', 'mine', 'seeker', 'pulse'], ['deflector', 'armour'], ['jammer', 'droneRepair']),
    cruiser: fit(['rail', 'flak'], ['deflector'], ['jammer']),
    fighter: fit(['pulse', 'seeker'], ['deflector']),
    destroyer: fit(['rail', 'seeker', 'pulse'], ['deflector'], ['jammer']),
  },
};

export const loadoutOf = (n: NationId, t: ShipType): Fit => LOADOUTS[n][t];
export const fitModules = (f: Fit): ModuleId[] => SLOT_KINDS.flatMap((k) => f[k]);

/** What a fit adds up to. */
export function fitStats(f: Fit): Required<ModuleStats> {
  const s = { dps: 0, hp: 0, shield: 0, dodge: 0, regen: 0, lock: 1 };
  for (const id of fitModules(f)) {
    const m = moduleOf(id).stats;
    s.dps += m.dps ?? 0;
    s.hp += m.hp ?? 0;
    s.shield += m.shield ?? 0;
    s.dodge += m.dodge ?? 0;
    s.regen += m.regen ?? 0;
    s.lock *= m.lock ?? 1;
  }
  return s;
}

/** Why a fit does not fit a ship type, or null when it does. */
export function fitProblem(f: Fit, t: ShipType, maxTier = 4): string | null {
  for (const k of SLOT_KINDS) {
    if (f[k].length > SLOTS[t][k]) return `${f[k].length} ${k} modules in ${SLOTS[t][k]} slots`;
    for (const id of f[k]) {
      if (!isModuleId(id)) return `unknown module ${id}`;
      const m = moduleOf(id);
      if (m.kind !== k) return `${id} is ${m.kind}, not ${k}`;
      if (m.tier > maxTier) return `${id} is tier ${m.tier}, above ${maxTier}`;
    }
  }
  return null;
}
