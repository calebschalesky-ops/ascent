/**
 * Reads the balance simulator: how long each race's ship of each type takes to kill (the player's better weapon,
 * normal 0.5° aim, the race loadout's hit points and dodge, as the game builds them). The motivation plan pays kills
 * by this time (`killPay`), and the route simulator charges it.
 */
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import type { ShipType } from '../shipTypes';
import { SHIP_TYPES } from '../shipTypes';
import { DEFAULT_ENGAGE, engageMany } from '../balance/engage';
import { rng } from '../balance/rng';
import { CREDITS_PER_XP, XP_PER_COMBAT_SECOND } from './tables';

export type TtkTable = Record<NationId, Record<ShipType, number>>;

/** Seconds to kill, per nation and type: the faster of laser and missile, mean of kills. */
export function measureTtk(runs = 20, seed = 1): TtkTable {
  const r = rng(seed);
  const out = {} as TtkTable;
  for (const n of NATIONS) {
    out[n.id] = {} as Record<ShipType, number>;
    for (const t of SHIP_TYPES) {
      const o = { ...DEFAULT_ENGAGE, nation: n.id };
      const laser = engageMany(t, 'laser', runs, r, o).ttkMean;
      const missile = engageMany(t, 'missile', runs, r, o).ttkMean;
      out[n.id][t] = Math.min(laser, missile);
    }
  }
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const round5 = (x: number) => Math.max(5, Math.round(x / 5) * 5);

/** The proposed kill pay: a flat rate per second of the median race's time to kill, so no target pays best. */
export function killPay(ttk: TtkTable): Record<ShipType, { xp: number; credits: number; seconds: number }> {
  const out = {} as Record<ShipType, { xp: number; credits: number; seconds: number }>;
  for (const t of SHIP_TYPES) {
    const seconds = median(Object.values(ttk).map((row) => row[t]));
    const xp = round5(seconds * XP_PER_COMBAT_SECOND);
    out[t] = { xp, credits: round5(xp * CREDITS_PER_XP), seconds };
  }
  return out;
}
