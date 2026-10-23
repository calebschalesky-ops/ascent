/**
 * Upgrades as data: every module the ship can fit (munition, shield, drone, countermeasure, targeting computer,
 * reactor, armour, engine), its tier and what it changes, and the loadout that says what is fitted now.
 *
 * `cost` is null on purpose. Prices, and how upgrades are earned, belong to the economy, which is undecided and
 * Caleb's call. A station's upgrade screen can read this same table later.
 */
import type { MunitionId } from './munitions';
import { MUNITIONS, MUNITION_IDS } from './munitions';
import type { Armour, ShieldId, ShieldTech } from './shields';
import { NO_ARMOUR, SHIELDS, SHIELD_IDS, tierMul } from './shields';
import type { CounterId, DroneId, Reactor, Targeting } from './tech';
import { ARMOURS, COUNTERS, COUNTER_IDS, DRONES, DRONE_IDS, ENGINES, REACTORS, TARGETING } from './tech';

export type Slot = 'weapon' | 'shield' | 'drone' | 'counter' | 'targeting' | 'reactor' | 'armour' | 'engine';
export const SLOT_LABEL: Record<Slot, string> = {
  weapon: 'Weapons', shield: 'Shield', drone: 'Drones', counter: 'Countermeasure', targeting: 'Targeting computer',
  reactor: 'Reactor', armour: 'Armour', engine: 'Engine',
};
/** How many of each slot the ship carries. Single slots hold one; armour and countermeasure may be left empty. */
export const SLOT_MAX: Record<Slot, number> = { weapon: 4, shield: 1, drone: 2, counter: 1, targeting: 1, reactor: 1, armour: 1, engine: 1 };

export interface Module {
  id: string;
  slot: Slot;
  name: string;
  tier: 1 | 2 | 3;
  changes: string; // what fitting it does, in one line
  cost: null; // undecided: the economy is Caleb's call
}

const MK = ['I', 'II', 'III'];
const tiers = [1, 2, 3] as const;

const WEAPON_TIER: Record<MunitionId, 1 | 2 | 3> = { pulse: 1, seeker: 1, flak: 1, mine: 1, beam: 2, plasma: 2, swarm: 2, ion: 2, rail: 3, torpedo: 3 };
const DRONE_TIER: Record<DroneId, 1 | 2 | 3> = { repair: 1, attack: 2, pointDefence: 2 };
const COUNTER_TIER: Record<CounterId, 1 | 2 | 3> = { flare: 1, chaff: 2, jammer: 3 };

export const MODULES: Module[] = [
  ...MUNITION_IDS.map((id): Module => {
    const m = MUNITIONS[id];
    const cost = m.ammo === null ? `${m.energy} energy${m.delivery === 'beam' ? '/s' : '/shot'}` : `${m.ammo} rounds`;
    return { id, slot: 'weapon', name: m.name, tier: WEAPON_TIER[id], changes: `${m.effect}. ${m.type}, ${cost}${m.lock === 'required' ? ', needs a lock' : m.lock === 'optional' ? ', homes with a lock' : ''}`, cost: null };
  }),
  ...SHIELD_IDS.flatMap((s) => tiers.map((t): Module => {
    const sh = SHIELDS[s];
    return { id: `${s}-${t}`, slot: 'shield', name: `${sh.name} Mk ${MK[t - 1]}`, tier: t, changes: `${Math.round(sh.capacity * tierMul(t))} shield${sh.facets === 2 ? ' per side' : ''}, ${Math.round(sh.regen * tierMul(t))}/s after ${sh.delay} s. ${sh.effect}`, cost: null };
  })),
  ...DRONE_IDS.map((d): Module => ({ id: d, slot: 'drone', name: DRONES[d].name, tier: DRONE_TIER[d], changes: DRONES[d].effect, cost: null })),
  ...COUNTER_IDS.map((c): Module => ({ id: c, slot: 'counter', name: COUNTERS[c].name, tier: COUNTER_TIER[c], changes: `${COUNTERS[c].effect}${COUNTERS[c].charges ? ` (${COUNTERS[c].charges} charges, C to use)` : ''}`, cost: null })),
  ...tiers.map((t): Module => { const x = TARGETING[t - 1]; return { id: `targeting-${t}`, slot: 'targeting', name: `Targeting computer Mk ${MK[t - 1]}`, tier: t, changes: `Locks in ${x.lockMul}× the time; ignores decoys ${Math.round(x.seeker * 100)}% of the time; lead within ${Math.round(x.aimCone * 57.3)}°`, cost: null }; }),
  ...tiers.map((t): Module => { const x = REACTORS[t - 1]; return { id: `reactor-${t}`, slot: 'reactor', name: `Reactor Mk ${MK[t - 1]}`, tier: t, changes: `${x.capacity} weapon energy, refills ${x.regen}/s`, cost: null }; }),
  ...([1, 2] as const).map((t): Module => { const x = ARMOURS[t]; return { id: `armour-${t}`, slot: 'armour', name: `Armour plating Mk ${MK[t - 1]}`, tier: t, changes: `+${x.hull} hull; resists kinetic ${Math.round(x.resist.kinetic * 100)}%, explosive ${Math.round(x.resist.explosive * 100)}%`, cost: null }; }),
  ...tiers.map((t): Module => ({ id: `engine-${t}`, slot: 'engine', name: `Afterburner Mk ${MK[t - 1]}`, tier: t, changes: `Boost ${ENGINES[t - 1].boost}× cruise speed`, cost: null })),
];
export const moduleById = (id: string) => MODULES.find((m) => m.id === id);
export const modulesFor = (slot: Slot) => MODULES.filter((m) => m.slot === slot);

/** What is fitted: module ids per slot. */
export interface Loadout {
  weapons: MunitionId[];
  shield: string;
  drones: DroneId[];
  counter: CounterId | null;
  targeting: string;
  reactor: string;
  armour: string | null;
  engine: string;
}

/** The ship as it first flies: the original laser and missile, a basic shield, flares, and Mk I everything. */
export const defaultLoadout = (): Loadout => ({
  weapons: ['pulse', 'seeker'], shield: 'deflector-1', drones: [], counter: 'flare', targeting: 'targeting-1', reactor: 'reactor-1', armour: null, engine: 'engine-1',
});

const inSlot = (id: unknown, slot: Slot): id is string => typeof id === 'string' && moduleById(id)?.slot === slot;
const uniq = <T,>(xs: T[]) => xs.filter((x, i) => xs.indexOf(x) === i);

/** Any saved or edited loadout made valid: unknown ids dropped, slots capped, at least one weapon. */
export function sanitizeLoadout(raw: unknown): Loadout {
  const d = defaultLoadout();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<Record<keyof Loadout, unknown>>;
  const weapons = Array.isArray(r.weapons) ? uniq(r.weapons.filter((w) => inSlot(w, 'weapon')) as MunitionId[]).slice(0, SLOT_MAX.weapon) : [];
  const drones = Array.isArray(r.drones) ? uniq(r.drones.filter((w) => inSlot(w, 'drone')) as DroneId[]).slice(0, SLOT_MAX.drone) : [];
  return {
    weapons: weapons.length ? weapons : d.weapons,
    shield: inSlot(r.shield, 'shield') ? r.shield : d.shield,
    drones,
    counter: r.counter === null ? null : inSlot(r.counter, 'counter') ? (r.counter as CounterId) : d.counter,
    targeting: inSlot(r.targeting, 'targeting') ? r.targeting : d.targeting,
    reactor: inSlot(r.reactor, 'reactor') ? r.reactor : d.reactor,
    armour: inSlot(r.armour, 'armour') ? r.armour : null,
    engine: inSlot(r.engine, 'engine') ? r.engine : d.engine,
  };
}

/** Everything the flight needs to know about a loadout. */
export interface Fitted {
  weapons: MunitionId[];
  shield: ShieldTech;
  shieldTier: number;
  drones: DroneId[];
  counter: CounterId | null;
  targeting: Targeting;
  reactor: Reactor;
  armour: Armour;
  boost: number;
}

const tierOf = (id: string) => moduleById(id)?.tier ?? 1;

export function fitted(l: Loadout): Fitted {
  const s = sanitizeLoadout(l);
  return {
    weapons: s.weapons,
    shield: SHIELDS[s.shield.split('-')[0] as ShieldId],
    shieldTier: tierOf(s.shield),
    drones: s.drones,
    counter: s.counter,
    targeting: TARGETING[tierOf(s.targeting) - 1],
    reactor: REACTORS[tierOf(s.reactor) - 1],
    armour: s.armour ? ARMOURS[tierOf(s.armour)] : NO_ARMOUR,
    boost: ENGINES[tierOf(s.engine) - 1].boost,
  };
}

/** The next fitted weapon after `w` (G cycles through them). */
export const nextWeapon = (weapons: MunitionId[], w: MunitionId) => weapons[(weapons.indexOf(w) + 1) % weapons.length];
