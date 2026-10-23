/**
 * The antagonist director: decides when the solar system pushes back (MOTIVATION.md 4). Pure: it reads a summary of
 * the game and returns at most one threat to start now. Left 4 Dead's build-up / peak / relax, keyed not on the
 * player's stress but on how far ahead the player is: a dominant player who has been left alone gets a fight, and
 * nobody gets a new fight within `DIRECTOR.relax` minutes of the last one ending.
 *
 * Names follow endgame/00-system.md (GAMEPLAY.md P2.6): what this file called the "coalition" is the **Reckoning**
 * (at 3 worlds held: the drift and its raid lane), and what it called the "crisis" is the **Last Alliance** (at 5 held:
 * the Grand Armada, after a `marchWarning` countdown). "Coalition" is kept only for the Armada's members. The director
 * counts worlds **held** (your capital plus vassals and worlds you control) and **broken** (held worlds whose caste you
 * freed) directly, not worlds turned: a vassal counts, and in exile your home does not.
 *
 * The **feud raid** is the first-hour clock (FEUDS.md 5): your blood enemy (`DirectorCtx.raider`) raids you, first
 * inside a minute of the first undock and then on a clock, each raid a little bigger. It is what replaces the opening's
 * stand-in goal.
 *
 * Priority when several are due: Last Alliance, its march warning, the first feud raid, counter-offensive, rebellion,
 * nemesis, Reckoning, Reckoning raid, a later feud raid, then the calm-breaker raid. The last four, and the rival, hold
 * off while a player who is not dominant is stalled (`DIRECTOR.stallHold` minutes without a rung): threats interrupt
 * winning, not struggling.
 *
 * Times are minutes of flight. Never and long-ago are finite sentinels (`NEVER`), so the state saves as plain JSON.
 */
import type { NationId } from '../nations';
import { DIRECTOR } from './tables';

export type ThreatKind = 'counter' | 'rebellion' | 'nemesis' | 'reckoning' | 'reckoningRaid' | 'raid' | 'feudRaid' | 'marchWarning' | 'lastAlliance';
/** Announcements cost no time and do not need the relax gap; everything else is a fight. */
export const ANNOUNCEMENT: ThreatKind[] = ['reckoning', 'marchWarning'];

/** What a feud raid sends. */
export interface RaidForce { fighter: number; cruiser: number }
export interface Threat { kind: ThreatKind; at: number; world?: NationId; label: string; force?: RaidForce }

export const NEVER = 1e9;

export interface NemesisState { generation: number; escapes: number; nextAt: number; from: NationId }
export interface DirectorState {
  lastEnd: number; // when the last fight-threat ended
  lastPushback: number; // when the last threat of any kind started
  counters: { world: NationId; at: number }[];
  reckoning: 'none' | 'standing' | 'broken';
  reckoningNextRaid: number;
  nemesis: NemesisState | null;
  nemesisPending: NationId | null; // a new rival rises from this world at its next encounter
  rebelReadyAt: Partial<Record<NationId, number>>;
  lastAlliance: 'none' | 'warned' | 'done';
  marchAt: number; // when the march warning is due
  feudRaids: number; // feud raids dealt so far
  feudRaidAt: number; // when the next is due
}

export interface DirectorCtx {
  t: number;
  /** Worlds held: your capital (unless in exile), vassals, and worlds you control. */
  held: number;
  /** Held worlds whose caste you freed (00-system.md 1.1). */
  broken: number;
  dominance: number;
  rank: number;
  unrest: Partial<Record<NationId, number>>; // controlled worlds only
  heldSince: Partial<Record<NationId, number>>;
  sinceRung: number; // minutes since the player last reached a rung
  /** Who raids you on the feud clock (lib/diplomacy/standings firstRaider); absent: no feud raids (the simulator). */
  raider?: NationId;
}

export const newDirector = (): DirectorState => ({
  lastEnd: -NEVER, lastPushback: 0, counters: [], reckoning: 'none', reckoningNextRaid: NEVER,
  nemesis: null, nemesisPending: null, rebelReadyAt: {}, lastAlliance: 'none', marchAt: NEVER,
  feudRaids: 0, feudRaidAt: DIRECTOR.firstRaid,
});

/** The size of feud raid `n` (0 is the first): two fighters, then a fighter more every other raid, and from the second a cruiser. */
export function feudRaidForce(n: number): RaidForce {
  return { fighter: 2 + Math.floor(n / 2), cruiser: n >= 1 ? 1 + Math.floor(n / 4) : 0 };
}

/** Called when a world is taken (by any route): schedules the relief fleet, and may start the Last Alliance's march. */
export function onTaken(d: DirectorState, world: NationId, t: number, held: number) {
  // A world falling is a peak: the player gets the relax gap to enjoy it before anything new arrives.
  d.lastEnd = Math.max(d.lastEnd, t);
  d.lastPushback = Math.max(d.lastPushback, t);
  const [lo, hi] = DIRECTOR.counterAfterTurn;
  d.counters.push({ world, at: t + (lo + hi) / 2 });
  if (d.reckoning === 'broken') d.reckoning = 'none'; // a broken Reckoning re-forms after the next world falls
  if (held >= DIRECTOR.lastAllianceAtHeld && d.lastAlliance === 'none') d.marchAt = t; // the warning, at once
}

/** Called when the player first breaks a world's patrol: its commander escapes and becomes the rival. */
export function onPatrolBroken(d: DirectorState, world: NationId, t: number) {
  if (!d.nemesis && !d.nemesisPending) d.nemesis = { generation: 1, escapes: 0, nextAt: t + DIRECTOR.nemesisEvery, from: world };
  else if (!d.nemesis && d.nemesisPending) {
    d.nemesis = { generation: 2, escapes: 0, nextAt: t + DIRECTOR.nemesisEvery, from: world };
    d.nemesisPending = null;
  }
}

export function nextThreat(d: DirectorState, c: DirectorCtx): Threat | null {
  const relaxed = c.t - d.lastEnd >= DIRECTOR.relax;
  const mk = (kind: ThreatKind, label: string, world?: NationId, force?: RaidForce): Threat => ({ kind, at: c.t, world, label, force });
  const feud = () => mk('feudRaid', d.feudRaids === 0 ? 'Raiders inbound' : `Raid ${d.feudRaids + 1} inbound`, c.raider, feudRaidForce(d.feudRaids));

  if (d.lastAlliance === 'warned' && c.t >= d.marchAt + DIRECTOR.marchWarning && relaxed) return mk('lastAlliance', 'The Grand Armada reaches your home world');
  if (d.lastAlliance === 'none' && c.t >= d.marchAt) return mk('marchWarning', `The Last Alliance marches: the Grand Armada arrives in ${DIRECTOR.marchWarning} minutes`);
  if (!relaxed) return null;

  // The first raid is the opening's goal: it comes whatever else is going on.
  if (c.raider && d.feudRaids === 0 && c.t >= d.feudRaidAt) return feud();

  const counter = d.counters.find((x) => c.t >= x.at);
  if (counter) return mk('counter', `Relief fleet strikes ${counter.world}`, counter.world);

  for (const [w, u] of Object.entries(c.unrest) as [NationId, number][]) {
    const since = c.heldSince[w] ?? NEVER;
    if (u >= DIRECTOR.rebellionUnrest && c.t - since >= 20 && c.t >= (d.rebelReadyAt[w] ?? 0)) return mk('rebellion', `Rebellion on ${w}`, w);
  }

  // Threats interrupt winning, not stalling: the optional ones wait while a player who is not dominant has gone this
  // long without a rung. A dominant player who has stopped climbing is coasting, and gets pushed.
  if (c.sinceRung >= DIRECTOR.stallHold && c.dominance < DIRECTOR.dominant) return null;

  if (d.nemesis && c.rank >= 1 && c.t >= d.nemesis.nextAt) {
    const n = d.nemesis;
    const duel = n.escapes >= DIRECTOR.nemesisEscapes;
    return mk('nemesis', duel ? `Final duel with the rival from ${n.from}` : `The rival from ${n.from} returns (escape ${n.escapes + 1})`, n.from);
  }

  if (d.reckoning === 'none' && c.held >= DIRECTOR.reckoningAtHeld) return mk('reckoning', 'The Reckoning: your neighbours turn against you');
  if (d.reckoning === 'standing' && c.t >= d.reckoningNextRaid) return mk('reckoningRaid', 'The Reckoning raids your holdings');

  if (c.raider && c.t >= d.feudRaidAt) return feud();

  const calmMax = c.held >= 4 ? DIRECTOR.calmMaxLate : DIRECTOR.calmMaxMid;
  if (c.held >= 2 && c.dominance >= DIRECTOR.dominant && c.t - d.lastPushback >= calmMax) return mk('raid', 'Raiders hit a held site while you were winning');
  return null;
}

/** Book-keeping once a threat has played out (`end` is when the player finished it). */
export function resolveThreat(d: DirectorState, th: Threat, end: number) {
  d.lastPushback = th.at;
  if (!ANNOUNCEMENT.includes(th.kind)) d.lastEnd = end;
  switch (th.kind) {
    case 'counter': d.counters = d.counters.filter((x) => x.world !== th.world); break;
    case 'rebellion': d.rebelReadyAt[th.world!] = end + DIRECTOR.rebellionCooldown; break;
    case 'nemesis': {
      const n = d.nemesis!;
      if (n.escapes >= DIRECTOR.nemesisEscapes) { d.nemesis = null; d.nemesisPending = n.from; }
      else { n.escapes++; n.nextAt = end + DIRECTOR.nemesisEvery; }
      break;
    }
    case 'reckoning': d.reckoning = 'standing'; d.reckoningNextRaid = end + DIRECTOR.reckoningRaidEvery; break;
    case 'reckoningRaid': d.reckoningNextRaid = end + DIRECTOR.reckoningRaidEvery; break;
    case 'feudRaid': d.feudRaids++; d.feudRaidAt = end + DIRECTOR.feudRaidEvery; break;
    case 'marchWarning': d.lastAlliance = 'warned'; break;
    case 'lastAlliance': d.lastAlliance = 'done'; break;
    case 'raid': break;
  }
}

/** The economic and political routes can peel a member out of the Reckoning; it re-forms when the next world falls. */
export function breakReckoning(d: DirectorState) {
  d.reckoning = 'broken';
  d.reckoningNextRaid = NEVER;
}

/** A saved director (GameData.director), with anything missing filled from a new one. */
export function migrateDirector(raw: unknown): { t: number; d: DirectorState } | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { t?: unknown; d?: unknown };
  if (typeof r.t !== 'number' || !Number.isFinite(r.t) || !r.d || typeof r.d !== 'object') return null;
  const d = { ...newDirector() } as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(r.d as Record<string, unknown>)) if (k in d && v !== null && v !== undefined) d[k] = v;
  return { t: r.t, d: d as unknown as DirectorState };
}
