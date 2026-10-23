/**
 * The infantry model: squads, their strength and morale (INFANTRY-CARRIER.md section 3). Owned by the infantry-carrier
 * thread; the drill-boarder thread uses the same squads and the same fight (fight.ts) inside a hull.
 *
 * Every number is a FIRST PASS, here in one table so it can be reshaped by play.
 */
import type { NationId } from '../nations';
import type { ShipType } from '../shipTypes';

/**
 * Kinds of squad. `line` are the ordinary troops a carrier lands; `shock` are armoured assault troops (boarders,
 * breachers); `guard` are a site's or a flagship's best (fort garrisons, palace guards, marines); `militia` are
 * townsfolk and crew with rifles.
 */
export type SquadKind = 'line' | 'shock' | 'guard' | 'militia';
export const SQUAD_KINDS: SquadKind[] = ['line', 'shock', 'guard', 'militia'];

export interface SquadSpec {
  label: string;
  /** Men in a full squad. */
  men: number;
  /** Fire per man per second against an enemy in the open, before morale and cover. */
  fire: number;
  /** Divides the casualties the squad takes (armour, drill). */
  tough: number;
  /** Morale a fresh squad starts with (0..1). */
  morale: number;
  /** Credits to raise one squad (a carrier refills its bays at a held site or the home world). */
  cost: number;
}

export const SQUADS: Record<SquadKind, SquadSpec> = {
  line: { label: 'Line squad', men: 10, fire: 1, tough: 1, morale: 0.7, cost: 40 },
  shock: { label: 'Shock squad', men: 8, fire: 1.5, tough: 1.5, morale: 0.85, cost: 90 },
  guard: { label: 'Guard squad', men: 10, fire: 1.2, tough: 1.25, morale: 0.9, cost: 0 },
  militia: { label: 'Militia', men: 12, fire: 0.55, tough: 0.8, morale: 0.5, cost: 0 },
};

export const INFANTRY = {
  /** Casualties per unit of fire per second (sets how long fights last: a line squad against one in the open, ~25 s). */
  lethality: 0.01,
  /** Morale lost per share of a squad's full strength lost. */
  shock: 1.4,
  /** Morale lost per second for every 1 the enemy's fire exceeds the squad's own side's fire, as a ratio. */
  pressure: 0.005,
  /** Morale regained per second while its side out-fires the other. */
  rally: 0.003,
  /** At or below this morale a squad breaks: it stops fighting (attackers fall back to their carrier, defenders surrender). */
  breakAt: 0.2,
  /** Below this many men a squad is gone. */
  minMen: 0.5,
  /** A fight longer than this (seconds) ends in the defenders' favour: the attack stalls. */
  maxTime: 600,
};

export type Side = 'attack' | 'defend';
export type SquadState = 'fighting' | 'broken' | 'dead';

/** One squad. A plain object: it saves as it is. */
export interface Squad {
  id: string;
  kind: SquadKind;
  nation: NationId;
  /** Men standing (fractional while a fight runs). */
  men: number;
  /** 0..1 */
  morale: number;
  state: SquadState;
}

export function newSquad(kind: SquadKind, nation: NationId, id: string, share = 1): Squad {
  const k = SQUADS[kind];
  return { id, kind, nation, men: k.men * Math.max(0, Math.min(1, share)), morale: k.morale, state: 'fighting' };
}

/** Strength: the share of a full squad still standing (0..1). */
export const strength = (s: Squad) => s.men / SQUADS[s.kind].men;
export const fighting = (s: Squad) => s.state === 'fighting';
/** A squad's fire per second before cover: men × fire, damped by low morale (a shaken squad keeps its head down). */
export const fireOf = (s: Squad) => (fighting(s) ? s.men * SQUADS[s.kind].fire * (0.5 + 0.5 * s.morale) : 0);
export const sideFire = (ss: Squad[]) => ss.reduce((t, s) => t + fireOf(s), 0);
export const menOf = (ss: Squad[]) => ss.reduce((t, s) => t + (s.state === 'dead' ? 0 : s.men), 0);

// ---------- who defends what ----------

/** A conquest site kind (conquest's `SiteKind`, kept as a string here so the model does not depend on the conquest branch). */
export type GroundKind = 'capital' | 'city' | 'fort' | 'shipyard' | 'foundry' | 'works' | 'battery';

/** A site's full garrison, by kind. A battery cannot be held, so it has none to fight. */
export const GARRISON: Record<GroundKind, Partial<Record<SquadKind, number>>> = {
  capital: { guard: 3, line: 2, militia: 2 },
  city: { line: 2, militia: 3 },
  fort: { guard: 3, line: 1 },
  shipyard: { guard: 1, line: 2 },
  foundry: { line: 2, militia: 1 },
  works: { line: 1, militia: 1 },
  battery: {},
};

/** How much a defender's position cuts the casualties it takes (1 = open ground). */
export const COVER: Record<GroundKind | 'hull', number> = {
  capital: 0.7,
  city: 0.75,
  fort: 0.55,
  shipyard: 0.8,
  foundry: 0.8,
  works: 0.9,
  battery: 1,
  hull: 0.8,
};

/** A hull's crew that fights boarders, by ship type (a default; the drill-boarder thread may set its own). */
export const CREW: Record<ShipType, Partial<Record<SquadKind, number>>> = {
  capital: { guard: 2, line: 2, militia: 2 },
  cruiser: { line: 1, militia: 1 },
  fighter: { militia: 0.1 }, // one pilot
  destroyer: { guard: 1, line: 2, militia: 1 }, // integration pass 2: between cruiser and capital
};

function raise(mix: Partial<Record<SquadKind, number>>, nation: NationId, prefix: string, share: number): Squad[] {
  const out: Squad[] = [];
  for (const kind of SQUAD_KINDS) {
    const n = mix[kind] ?? 0;
    for (let i = 0; i < Math.ceil(n); i++) {
      const part = Math.min(1, n - i) * share;
      if (part * SQUADS[kind].men >= INFANTRY.minMen) out.push(newSquad(kind, nation, `${prefix}-${kind}-${i}`, part));
    }
  }
  return out;
}

/**
 * The garrison standing in a site now. Bombardment kills some of it: the share of the garrison left follows the share
 * of structure left (0.25 + 0.75 × structure share), so suppressing a site (below half) leaves about 60% of its men.
 * `military` is the planets thread's military multiplier (1 at an ordinary world).
 */
export function garrisonFor(kind: GroundKind, nation: NationId, siteId: string, hpShare: number, military = 1): Squad[] {
  const share = (0.25 + 0.75 * Math.max(0, Math.min(1, hpShare))) * military;
  return raise(GARRISON[kind], nation, siteId, share);
}

/** A hull's crew for a boarding fight; `hpShare` is the hull's hit points left. */
export function crewFor(type: ShipType, nation: NationId, shipId: string, hpShare = 1): Squad[] {
  return raise(CREW[type], nation, shipId, 0.4 + 0.6 * Math.max(0, Math.min(1, hpShare)));
}
