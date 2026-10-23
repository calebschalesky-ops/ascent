/**
 * `summarise(battle)`: what the world scripts measure, taken from the battle's own counters (never from the capped log),
 * plus a state hash for determinism.
 */
import { SIDES } from './types';
import { prizeSummary } from './boarding/summary';
import { fleetLosses } from './losses';
import type { Battle, Decision, Outcome, SideId } from './types';

export interface SideSummary {
  house: string;
  ships: number;
  /** Wrecked plus struck plus captured (PKG-05): ships the side no longer has. PKG-08: from losses.ts fleetLosses(). */
  shipsLost: number;
  /** PKG-08: share of its starting strength gone, net of prizes (fleetLosses().frac): the break rule's number. */
  strengthLost: number;
  wrecked: number;
  struck: number;
  fled: number;
  withdrawn: number;
  /** Ships that broke (fled or struck, or still running at the end). */
  broken: number;
  damageDealt: number;
  damageAt60: number;
  shots: number;
  hits: number;
  morale: number;
  brokenReason: string | null;
  /** PKG-05: enemy ships this side captured by boarding. */
  captured: number;
  /** PKG-05: value of the ships this side took: a capture is worth more than a wreck (boarding/numbers PRIZE). */
  prizeValue: number;
}

export interface Summary {
  seed: number;
  setup: string;
  variant: string | null;
  controllers: Record<SideId, string>;
  outcome: Outcome | null;
  winner: SideId | 'draw' | null;
  reason: string | null;
  durationS: number;
  sides: Record<SideId, SideSummary>;
  brokenShips: number;
  boardingAttempts: number;
  /** PKG-05: boarding launches no admiral ordered. */
  boardingUnordered: number;
  selfDecisions: number;
  timeoutDecisions: Decision[];
  decisions: Decision[];
  orders: number;
  moraleSeries: { t: number; player: number; enemy: number }[];
  rngDraws: number;
  logLength: number;
  logDropped: number;
  hash: string;
}

export function summarise(b: Battle): Summary {
  const sides = {} as Record<SideId, SideSummary>;
  for (const side of SIDES) {
    // PKG-05: a side's ships are the ones it started with; a ship it lost to boarding is lost, a prize it took is not its own.
    const mine = b.ships.filter((s) => (s.capturedFrom ?? s.side) === side);
    const st = b.stats.sides[side];
    // PKG-08: one count of losses, shared with the break rule and the end reason. A ship the enemy captured counts as
    // captured whatever became of it after (it is no longer this side's to wreck or flee).
    const l = fleetLosses(b, side);
    sides[side] = {
      house: b.sides[side].house,
      ships: mine.length,
      shipsLost: l.lost,
      strengthLost: Math.round(l.frac * 1000) / 1000,
      wrecked: l.wrecked,
      struck: l.struck,
      fled: l.fled,
      withdrawn: l.withdrawn,
      broken: mine.filter((s) => s.brokenAt !== null).length,
      damageDealt: Math.round(st.damageDealt),
      damageAt60: Math.round(st.damageAt60),
      shots: st.shots,
      hits: st.hits,
      morale: Math.round(b.sides[side].morale * 10) / 10,
      brokenReason: b.sides[side].brokenReason,
      ...prizeSummary(b, side),
    };
  }
  return {
    seed: b.seed, setup: b.setup, variant: b.variant, controllers: { ...b.controllers },
    outcome: b.outcome, winner: b.winner, reason: b.reason, durationS: Math.round((b.endT ?? b.t) * 100) / 100,
    sides,
    brokenShips: sides.player.broken + sides.enemy.broken,
    boardingAttempts: b.stats.boardingAttempts,
    boardingUnordered: b.boarding?.unordered ?? 0,
    selfDecisions: b.stats.selfDecisions,
    timeoutDecisions: b.stats.timeoutDecisions,
    decisions: b.stats.decisions,
    orders: b.stats.orders,
    moraleSeries: b.stats.moraleSeries,
    rngDraws: b.rng.n,
    logLength: b.log.length,
    logDropped: b.logDropped,
    hash: hashState(b),
  };
}

/** FNV-1a over the battle's JSON, two lanes: 16 hex characters. Equal state, equal hash. */
export function hashState(b: Battle): string {
  const json = JSON.stringify(b);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < json.length; i++) {
    const c = json.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
