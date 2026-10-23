/**
 * The numbers behind drill boarders (DRILL-BOARDER.md). Lengths in player-ship lengths (L), times in seconds. A first
 * pass, to be tuned by play.
 */
import type { NationId } from '../nations';
import type { ModuleId } from '../progression/refs';
import type { ShipType } from '../shipTypes';
import { LAUNCHED_SPECS } from '../shipTypes';

export const BOARDER = {
  hp: LAUNCHED_SPECS.boarder.hp,
  size: LAUNCHED_SPECS.boarder.size,
  hitRadius: LAUNCHED_SPECS.boarder.hitRadius,
  /** Top speed, L/s (a fighter flies 60). */
  speed: 30,
  /** L/s². */
  accel: 40,
  /** rad/s. */
  turn: 2.2,
  /** Seconds of fuel: a boarder that has not struck by then is lost. */
  life: 20,
  /** The farthest a capital ship launches at a target, L. */
  range: 250,
  /** People aboard one boarder. */
  troops: 20,
  /** Seconds the drill takes to breach. */
  drill: 2.5,
  /** Hit points the breach costs the target, as a share of its full hit points. */
  breach: 0.04,
  /** A boarder striking a ship whose shield is above this share of its capacity is deflected. */
  shieldGate: 0.25,
};

/** Which ship types a boarder may be launched at, and which launch them. */
export const BOARDABLE: ShipType[] = ['cruiser', 'capital'];
export const LAUNCHES: ShipType[] = ['capital'];

/**
 * Boarders carried per hull. STAND-IN until the destroyer thread's hangar table (destroyer-hangars.md) exists; then
 * this reads from it.
 */
export const BAY: Record<ShipType, number> = { capital: 4, cruiser: 0, fighter: 0, destroyer: 0 }; // capital 4 fits lib/hangars.ts (2 slots each, 12 a capital)

/** Close-in point defence against boarders: range in L, damage per second by hull and by what the loadout carries. */
export const PD = {
  range: 60,
  hull: { capital: 24, cruiser: 12, fighter: 0, destroyer: 18 } as Record<ShipType, number>, // destroyer: integration pass 2, between
  /** Arsenal's ids (progression's module ids, refs.ts ARSENAL_ID): each one carried adds this much. */
  modules: { flak: 30, dronePD: 20 } as Partial<Record<ModuleId, number>>,
  /** At zero hull a ship keeps this share of its point defence; the rest scales with the hull. */
  floor: 0.3,
};

/** People aboard, by hull, at full hull. A damaged ship has fewer standing: × (floor + (1 − floor) × hull). */
export const CREW = { capital: 160, cruiser: 36, fighter: 0, destroyer: 70, floor: 0.35 } as Record<ShipType, number> & { floor: number };

/** The fight inside (troops.ts): attrition rate, qualities, the share of its start at which a side breaks. */
export const FIGHT = { rate: 0.1, marines: 1.6, crew: 0.6, breakAt: 0.3 };

/** Enemy capital ships: seconds between launches. */
export const ENEMY = { cooldown: 25 };

export interface NationBoarding {
  name: string; // the boarder's class name
  troopName: string; // what its troops are called
  troops: number; // × BOARDER.troops
  quality: number; // × FIGHT.marines
  crew: number; // × FIGHT.crew, when this nation's crew defends its own ship
  drill: number; // × BOARDER.drill (below 1 drills faster)
  speed: number; // × BOARDER.speed
  hp: number; // × BOARDER.hp
  range: number; // × BOARDER.range
}

/** Names from each people's culture (LORE.md); tilts follow its doctrine. */
export const NATION_BOARDING: Record<NationId, NationBoarding> = {
  earth: { name: 'Breacher', troopName: 'marines', troops: 1, quality: 1, crew: 1, drill: 1, speed: 1, hp: 1, range: 1 },
  moon: { name: 'Gnomon', troopName: 'temple guard', troops: 0.9, quality: 1, crew: 0.85, drill: 0.9, speed: 1.1, hp: 0.9, range: 1 },
  mercury: { name: 'Dory', troopName: 'hoplites', troops: 0.9, quality: 1.25, crew: 1.25, drill: 1.1, speed: 0.9, hp: 1.3, range: 1 },
  venus: { name: 'Siphon', troopName: 'kataphraktoi', troops: 1, quality: 1, crew: 0.9, drill: 0.7, speed: 1, hp: 1, range: 1 },
  mars: { name: 'Harpax', troopName: 'legionaries', troops: 1.25, quality: 1.1, crew: 1.1, drill: 1, speed: 0.95, hp: 1.1, range: 1 },
  jupiter: { name: 'Embolon', troopName: 'argyraspides', troops: 1, quality: 1.2, crew: 1, drill: 1, speed: 1, hp: 1.2, range: 1 },
  saturn: { name: 'Epibates', troopName: 'epibatai', troops: 0.9, quality: 1.05, crew: 1, drill: 1, speed: 1.25, hp: 0.85, range: 1.3 },
};

/** A nation's boarder, its numbers tilted. */
export function boarderOf(nation: NationId) {
  const n = NATION_BOARDING[nation];
  return {
    name: n.name,
    troopName: n.troopName,
    hp: BOARDER.hp * n.hp,
    speed: BOARDER.speed * n.speed,
    range: BOARDER.range * n.range,
    drill: BOARDER.drill * n.drill,
    troops: Math.round(BOARDER.troops * n.troops),
    quality: FIGHT.marines * n.quality,
  };
}
