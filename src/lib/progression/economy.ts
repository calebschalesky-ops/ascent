/**
 * FIRST PASS. Every number of the first economy in one table, for Caleb to reshape. Credits come from kills and buy
 * modules and bay fighters; nothing else (no trading, mining or markets yet).
 */
import type { ModuleId, ShipType } from './refs';

export const ECONOMY = {
  /** Credits a new pilot starts with. */
  startCredits: 100,
  /** Experience for destroying a ship, by type. */
  killXp: { capital: 200, cruiser: 40, fighter: 15, destroyer: 90 } as Record<ShipType, number>,
  /** Credits for destroying a ship, by type. */
  killCredits: { capital: 120, cruiser: 25, fighter: 10, destroyer: 55 } as Record<ShipType, number>,
  /** Price of each fighter for the bay. The first fighter comes free when the first bay slot opens. */
  fighterPrice: 150,
  /** What a module sells back for, as a share of its price. Not used yet: nothing sells. */
  resale: 0.5,
  /** Price of each module. */
  prices: {
    // weapons
    pulse: 60, seeker: 80, rail: 110, flak: 70,
    plasma: 220, swarm: 240, mine: 200,
    ion: 420, beam: 450,
    torpedo: 900,
    // defence
    deflector: 90, bifacet: 100, armour: 80,
    capacitor: 230, plate: 260,
    hardened: 520,
    // support
    droneRepair: 120, flares: 90, jammer: 110, fireControl: 100,
    chaff: 200, droneAttack: 300,
    dronePD: 480,
  } as Record<ModuleId, number>,
};

export const priceOf = (id: ModuleId) => ECONOMY.prices[id];
