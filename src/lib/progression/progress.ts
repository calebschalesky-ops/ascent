/**
 * The pilot's progress: race, experience, credits, the cruiser's fit, bought modules and the fighters in the bay.
 * Pure functions over a plain object, saved with the game (store.ts GameData.progress).
 */
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import type { DestGeo, V3 } from '../nav';
import { COSMOS, len, scale, sub, unit } from '../nav';
import type { Fit, SlotKind } from './catalog';
import { SLOT_KINDS, SLOTS, fitModules, fitProblem, isModuleId, loadoutOf, moduleOf } from './catalog';
import { ECONOMY, priceOf } from './economy';
import { baySlotsAt, levelOf, tierAt, unlocksBetween } from './levels';
import type { ModuleId, ShipType } from './refs';
import { ARSENAL_ID, ENGINE_WEAPON, raceRef } from './refs';
import type { Loadout } from '../modules';
import { moduleById, sanitizeLoadout } from '../modules';
import type { MunitionId } from '../munitions';

export interface Progress {
  nation: NationId;
  xp: number;
  credits: number;
  kills: number;
  /** The player's cruiser. */
  fit: Fit;
  /** Bought and not fitted. */
  inventory: ModuleId[];
  /** Fighters in the cruiser's bay; never more than the level's open slots. */
  fighters: number;
  /** Every module bought, in order. */
  bought: ModuleId[];
}

const copyFit = (f: Fit): Fit => ({ weapon: [...f.weapon], defence: [...f.defence], support: [...f.support] });

export function newProgress(nation: NationId): Progress {
  return { nation, xp: 0, credits: ECONOMY.startCredits, kills: 0, fit: copyFit(loadoutOf(nation, 'cruiser')), inventory: [], fighters: 0, bought: [] };
}

export const levelOfProgress = (p: Progress) => levelOf(p.xp);

/**
 * What losing the ship costs (GP-15a; `arsenal.ts` used to say "no penalty"): the fighters that were out, and
 * `creditsPct` of credits. Drones out and troops aboard are lost by their own layers. **The size is Caleb's call**;
 * 10% is GAMEPLAY.md's proposal.
 */
export const DEATH = { creditsPct: 10 };
export function deathCost(p: Progress, fightersOut: number): { p: Progress; credits: number; fighters: number } {
  const credits = Math.floor((p.credits * DEATH.creditsPct) / 100);
  const fighters = Math.min(p.fighters, Math.max(0, fightersOut));
  return { p: { ...p, credits: p.credits - credits, fighters: p.fighters - fighters }, credits, fighters };
}
export const baySlots = (p: Progress) => baySlotsAt(levelOf(p.xp));

/** The player's ship, named for the race: "Quirite Corvus". */
export const shipName = (p: Progress, t: ShipType = 'cruiser') => `${raceRef(p.nation).demonym} ${raceRef(p.nation).ships[t]}`;

/** A kill: experience, credits, and anything the new level opens. The first bay slot comes with a free fighter. */
export function applyKill(p: Progress, type: ShipType): { p: Progress; lines: string[] } {
  const before = levelOf(p.xp);
  const xp = p.xp + ECONOMY.killXp[type];
  const after = levelOf(xp);
  const lines = after > before ? [`Level ${after}`, ...unlocksBetween(before, after)] : [];
  let fighters = p.fighters;
  if (baySlotsAt(before) === 0 && baySlotsAt(after) > 0) {
    fighters = Math.max(fighters, 1);
    lines.push(`A ${raceRef(p.nation).ships.fighter} fighter joins your bay`);
  }
  return { p: { ...p, xp, credits: p.credits + ECONOMY.killCredits[type], kills: p.kills + 1, fighters }, lines };
}

/** Why a module cannot be bought now, or null. */
export function buyProblem(p: Progress, id: ModuleId): string | null {
  const m = moduleOf(id);
  if (m.tier > tierAt(levelOf(p.xp))) return `Tier ${m.tier}: needs a higher level`;
  if (p.credits < priceOf(id)) return 'Not enough credits';
  return null;
}

/** Buy a module: into a free slot of its kind if there is one, else into the hold. */
export function buy(p: Progress, id: ModuleId): Progress {
  if (buyProblem(p, id)) return p;
  const kind = moduleOf(id).kind;
  const fit = copyFit(p.fit);
  const inventory = [...p.inventory];
  if (fit[kind].length < SLOTS.cruiser[kind]) fit[kind].push(id);
  else inventory.push(id);
  return { ...p, credits: p.credits - priceOf(id), fit, inventory, bought: [...p.bought, id] };
}

export function fighterProblem(p: Progress): string | null {
  if (p.fighters >= baySlots(p)) return baySlots(p) ? 'Bay full: no open slot' : 'The bay opens at level 2';
  if (p.credits < ECONOMY.fighterPrice) return 'Not enough credits';
  return null;
}

export function buyFighter(p: Progress): Progress {
  if (fighterProblem(p)) return p;
  return { ...p, fighters: p.fighters + 1, credits: p.credits - ECONOMY.fighterPrice };
}

/** Swap a module from the hold into slot `index` of `kind` (the one there goes to the hold). */
export function fitFromHold(p: Progress, kind: SlotKind, index: number, id: ModuleId): Progress {
  const h = p.inventory.indexOf(id);
  if (h < 0 || moduleOf(id).kind !== kind || index < 0 || index >= SLOTS.cruiser[kind]) return p;
  const fit = copyFit(p.fit);
  const inventory = [...p.inventory];
  inventory.splice(h, 1);
  const old = fit[kind][index];
  if (old) { fit[kind][index] = id; inventory.push(old); } else fit[kind].push(id);
  return { ...p, fit, inventory };
}

/** The engine weapons the cruiser's fit can fire (main has two: laser and missile). Never empty. */
export function engineWeapons(p: Progress): ('laser' | 'missile')[] {
  const out: ('laser' | 'missile')[] = [];
  for (const id of p.fit.weapon) { const w = ENGINE_WEAPON[id]; if (w && !out.includes(w)) out.push(w); }
  return out.length ? out : ['laser'];
}

/**
 * The fit as arsenal flies it (lib/modules.ts Loadout): munitions by their own ids, the first shield at Mk I, armour
 * and plate as armour Mk I and II, drones, the countermeasure and the targeting computer. A fit with no shield (the
 * Quirite cruiser carries armour instead) flies a Mk I deflector, because arsenal's ship always has one.
 */
export function flightLoadout(p: Progress): Loadout { return fitLoadout(p.fit); }

/** A fit as the arsenal flies it (and as the hull shows it, space/hardpoints.ts). */
export function fitLoadout(fit: Progress['fit']): Loadout {
  const ids = fitModules(fit).map((id) => ARSENAL_ID[id] as string);
  const weapons = fit.weapon.filter((id, i, a) => a.indexOf(id) === i) as MunitionId[];
  const shield = ids.find((id) => moduleById(`${id}-1`)?.slot === 'shield');
  const armour = ids.filter((id) => moduleById(id)?.slot === 'armour').sort().pop() ?? null;
  return sanitizeLoadout({
    weapons, shield: `${shield ?? 'deflector'}-1`, armour,
    drones: ids.filter((id) => moduleById(id)?.slot === 'drone'),
    counter: ids.find((id) => moduleById(id)?.slot === 'counter') ?? null,
    targeting: ids.find((id) => moduleById(id)?.slot === 'targeting') ?? 'targeting-1',
    reactor: 'reactor-1', engine: 'engine-1',
  });
}

/** The fitted module each engine weapon stands for, for the HUD ("Railgun" fires as laser for now). */
export function weaponLabel(p: Progress, w: 'laser' | 'missile'): string {
  const id = p.fit.weapon.find((m) => ENGINE_WEAPON[m] === w);
  return id ? moduleOf(id).label : w;
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);

/** Reads a saved progress, repairing what it can. Null when there is none (an old save: the caller treats it as Earth). */
export function migrateProgress(raw: unknown): Progress | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const nation = NATIONS.find((n) => n.id === r.nation)?.id;
  if (!nation) return null;
  const base = newProgress(nation);
  const xp = num(r.xp);
  const rf = r.fit as Partial<Record<SlotKind, unknown>> | undefined;
  let fit = base.fit;
  if (rf && typeof rf === 'object') {
    const raw = SLOT_KINDS.map((k) => (Array.isArray(rf[k]) ? (rf[k] as unknown[]) : []));
    const f = Object.fromEntries(SLOT_KINDS.map((k, i) => [k, raw[i].filter(isModuleId)])) as Fit;
    // Keep a saved fit only if every module in it still exists and it fits; else the race's own loadout.
    if (raw.every((r, i) => r.length === f[SLOT_KINDS[i]].length) && f.weapon.length && !fitProblem(f, 'cruiser')) fit = f;
  }
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter(isModuleId) : []);
  return {
    nation,
    xp,
    credits: num(r.credits, base.credits),
    kills: Math.floor(num(r.kills)),
    fit,
    inventory: ids(r.inventory),
    fighters: Math.min(Math.floor(num(r.fighters)), baySlotsAt(levelOf(xp))),
    bought: ids(r.bought),
  };
}

/**
 * Where a new game starts: parked near the home body, on the side facing Earth, nose to the planet. Earth's start is
 * Voyage's own (null), so an Earth game begins exactly as it always has.
 */
export function homeSpawn(nation: NationId, geo: DestGeo[]): { pos: V3; scale: number; yaw: number; pitch: number; target: null } | null {
  const home = NATIONS.find((n) => n.id === nation)?.home;
  if (!home || home === 'earth') return null;
  const g = geo.find((x) => x.id === home);
  if (!g) return null;
  const r = g.size * 2.2 + 3 + Math.max(2, g.size * 0.6); // just outside the patrol ring, well inside the orbit zone
  const out = len(g.pos) > 1e-6 ? unit(scale(g.pos, -1)) : ([0, 0, 1] as V3);
  const pos: V3 = [g.pos[0] + out[0] * r, g.pos[1] + out[1] * r + 0.6, g.pos[2] + out[2] * r];
  const to = sub(g.pos, pos);
  // `scale`: the geometry is already at today's COSMOS, so Voyage must not scale it up again (game-start found every
  // non-Earth start landing at the edge of the system without it).
  return { pos, scale: COSMOS, yaw: Math.atan2(-to[0], -to[2]), pitch: Math.asin(Math.max(-1, Math.min(1, to[1] / len(to)))), target: null };
}
