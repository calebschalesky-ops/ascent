/**
 * What WORLD-02 checks 5–7 measure about an admiral after a battle (PKG-07). Read from the admiral's own record and,
 * as an independent cross-check, from the battle's order counter and kept log.
 */
import { ORDER_KINDS } from '../types';
import type { Battle, SideId } from '../types';
import { TELEGRAPH } from './numbers';

export interface PushReport {
  target: string;
  side: string;
  status: string;
  telegraphAt: number | null;
  launchedAt: number | null;
  launchEventAt: number | null;
  /** Seconds from the telegraph to the boarders launching (the boardLaunch event if seen, else the board order). */
  lead: number | null;
  escortsCloserM: number | null;
  capitalTurnDeg: number | null;
  /** The telegraph showed: escorts measurably closer or a launcher measurably turned. */
  visible: boolean;
  abortReason: string | null;
}

export interface AdmiralReport {
  side: SideId;
  style: string | null;
  difficulty: string | null;
  issued: number;
  refused: number;
  kinds: Record<string, number>;
  /** Kinds the admiral issued that are not in the player's order set (check 5: must be empty). */
  foreignKinds: string[];
  /** Kept-log cross-check: this side's order events whose kind is not a player order kind. */
  logForeign: number;
  logOrders: number;
  /** battle.stats.orders counts every order() call by both sides. */
  statsOrders: number;
  mistakes: number;
  withdrawn: number;
  telegraphs: number;
  pushes: PushReport[];
  /** Check 7's measure: the mean range of every shot this side fired (the range each shot event logs). */
  meanShotRangeM: number | null;
  shots: number;
  /** Secondary: own active ship to nearest active foe, sampled each second (survivorship-biased: ships that close and die stop counting). */
  meanRangeM: number | null;
  rangeSamples: number;
  opsLog: string[];
}

export function admiralReport(b: Battle, side: SideId): AdmiralReport {
  const a = b.sides[side].admiral;
  const kinds = ORDER_KINDS as readonly string[];
  const logOrders = b.log.filter((e) => e.kind === 'order' && e.by === side);
  const pushes: PushReport[] = (a?.pushes ?? []).map((p) => {
    const at = p.launchEventAt ?? p.launchedAt;
    const lead = p.telegraphAt !== null && at !== null ? Math.round((at - p.telegraphAt) * 100) / 100 : null;
    const visible = (p.escortsCloserM ?? 0) >= TELEGRAPH.minEscortCloseM || (p.capitalTurnDeg ?? 0) >= TELEGRAPH.minCapitalTurnDeg;
    return {
      target: p.target, side: p.side, status: p.status, telegraphAt: p.telegraphAt, launchedAt: p.launchedAt,
      launchEventAt: p.launchEventAt, lead, escortsCloserM: p.escortsCloserM, capitalTurnDeg: p.capitalTurnDeg, visible,
      abortReason: p.abortReason,
    };
  });
  return {
    side, style: a?.style ?? null, difficulty: a?.difficulty ?? null,
    issued: a?.issued ?? 0, refused: a?.refused ?? 0, kinds: { ...(a?.kinds ?? {}) },
    foreignKinds: Object.keys(a?.kinds ?? {}).filter((k) => !kinds.includes(k)),
    logForeign: logOrders.filter((e) => e.kind === 'order' && !kinds.includes(e.order.kind)).length,
    logOrders: logOrders.length,
    statsOrders: b.stats.orders,
    mistakes: a?.mistakes ?? 0,
    withdrawn: a?.withdrawn.length ?? 0,
    telegraphs: pushes.filter((p) => p.telegraphAt !== null).length,
    pushes,
    meanShotRangeM: a && a.shotN ? Math.round(a.shotRangeSum / a.shotN) : null,
    shots: a?.shotN ?? 0,
    meanRangeM: a && a.rangeN ? Math.round(a.rangeSum / a.rangeN) : null,
    rangeSamples: a?.rangeN ?? 0,
    opsLog: a?.opsLog ?? [],
  };
}
