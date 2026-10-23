/**
 * Conquest: the seven resources, what each ship costs and how long it takes to build. FIRST PASS numbers, all here,
 * for Caleb to reshape (CONQUEST.md sections 3 and 4).
 */
import type { ShipType } from '../shipTypes';

export type Resource = 'metals' | 'ice' | 'hydrocarbons' | 'power' | 'helium3' | 'chemicals' | 'food';
export const RESOURCES: Resource[] = ['metals', 'ice', 'hydrocarbons', 'power', 'helium3', 'chemicals', 'food'];
export const RESOURCE_LABEL: Record<Resource, string> = {
  metals: 'Metals', ice: 'Ice', hydrocarbons: 'Hydrocarbons', power: 'Power', helium3: 'Helium-3', chemicals: 'Chemicals', food: 'Food',
};

export type Stock = Record<Resource, number>;
export const emptyStock = (v = 0): Stock => Object.fromEntries(RESOURCES.map((r) => [r, v])) as Stock;

export const PRODUCTION = {
  /** A works site's output per second at richness 1. */
  works: 0.1,
  /** An imported resource's rate per second, while the supplier and the lane are open. */
  imports: 0.05,
  /** The most a world stockpiles of each resource, and how full it starts. */
  cap: 40,
  start: 20,
  /** Each world the player controls speeds every other world's lines by this much (mobilisation). */
  alarm: 0.2,
  /** Seconds to build one ship with one working site. */
  buildTime: { fighter: 45, cruiser: 120, capital: 480, destroyer: 180 } as Record<ShipType, number>,
  /** Which line builds which type: fighters at a foundry, the rest at a shipyard. */
  line: { fighter: 'foundry', cruiser: 'shipyard', capital: 'shipyard', destroyer: 'shipyard' } as Record<ShipType, 'foundry' | 'shipyard'>,
  /** Credits a minute for every trade link the player has cut by taking its supplier. */
  toll: 5,
};

/** What each ship takes from the stockpile when it is laid down. */
export const SHIP_COST: Record<ShipType, Partial<Stock>> = {
  fighter: { metals: 2, hydrocarbons: 1 },
  cruiser: { metals: 6, hydrocarbons: 2, chemicals: 2, power: 2, ice: 1 },
  capital: { metals: 24, helium3: 6, power: 8, chemicals: 6, ice: 4, food: 4 },
  destroyer: { metals: 12, hydrocarbons: 2, chemicals: 4, power: 4, ice: 2 }, // integration pass 2: between cruiser and capital
};
