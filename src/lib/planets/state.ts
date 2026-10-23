/**
 * Planets: a world's meters over time. Pure rules (PLANETS.md section 1): each meter drifts toward a target built from
 * the world's working buildings and its situation, and takes instant shocks from losses.
 *
 * The seam with conquest: conquest says what each site is doing (`SiteStatus`, see `conquestStatus`) and what just
 * happened (`PlanetEvent`); this module answers with `Effects`, multipliers conquest applies to its own rates. Until
 * conquest is merged, the simulator in `sim.ts` plays conquest's part.
 */
import type { ShipType } from '../shipTypes';
import type { NationId } from '../nations';
import type { Resource } from './buildings';
import { KIND_EFFECT, KIND_SHOCK, effectOf, worksEconomy } from './buildings';
import type { Effects, MeterId, Meters } from './meters';
import { METERS, RULES, addMeters, approach, clamp, clampMeters, effects, meters, steadiness } from './meters';
import type { PlanetSite, World } from './worlds';
import { siteOf, worldOf } from './worlds';

/** What a site is doing. Conquest: native and working, native and suppressed, the player's, or wrecked. */
export type SiteStatus = 'working' | 'suppressed' | 'held' | 'wrecked';

/** From conquest's `SiteState.owner` and its `suppressed()` test. */
export const conquestStatus = (owner: 'native' | 'player' | 'wrecked', isSuppressed: boolean): SiteStatus =>
  owner === 'wrecked' ? 'wrecked' : owner === 'player' ? 'held' : isSuppressed ? 'suppressed' : 'working';

/** The world's situation this tick. Sites not listed are working. */
export interface Situation {
  sites?: Record<string, SiteStatus>;
  /** A hostile ship in the world's orbit zone. */
  underAttack?: boolean;
  /** The player in orbit with none of the world's ships alive (conquest's blockade). */
  blockaded?: boolean;
  /** Resources the world needs and can neither make nor import, its stock spent. */
  cutOff?: Resource[];
}

export type PlanetEvent =
  | { kind: 'shipLost'; ship: ShipType }
  | { kind: 'siteLost'; site: string }
  | { kind: 'controlled' };

export interface PlanetState {
  world: NationId;
  meters: Meters;
  /** The player controls the world (conquest's control rule). */
  controlled: boolean;
  /** The lifeline was down at the last step (so its shock lands once, when it goes). */
  lifelineDown: boolean;
}

/** What a world's buildings would give at full strength: the starting meters less these is the people's own base. */
export function contributions(w: World, status: (s: PlanetSite) => number, religionStatus: (s: PlanetSite) => number = status): Meters {
  let m = meters();
  for (const s of w.sites) {
    const k = status(s);
    const r = religionStatus(s);
    if (k === 0 && r === 0) continue;
    const add = (e: Partial<Meters>) => {
      m = addMeters(m, { ...e, religion: 0 }, k);
      m = addMeters(m, { religion: e.religion ?? 0 }, r);
    };
    add(KIND_EFFECT[s.kind]);
    if (s.kind === 'works') add({ economy: worksEconomy(s.rich ?? 1) });
    for (const b of s.buildings) add(effectOf(b));
  }
  return m;
}

const statusOf = (sit: Situation, id: string): SiteStatus => sit.sites?.[id] ?? 'working';

/** The people's own base: the starting meters less what every working site gives. Fixed per world. */
export const baseOf = (w: World): Meters => addMeters(w.start, contributions(w, () => 1), -1);

/** Is the world's lifeline down (its site not working, or its resource cut off)? */
export function lifelineDown(w: World, sit: Situation, controlled: boolean): boolean {
  const l = w.temperament.lifeline;
  if (!l) return false;
  if ('site' in l) {
    const st = statusOf(sit, l.site);
    return controlled ? st === 'wrecked' || st === 'suppressed' : st !== 'working';
  }
  return (sit.cutOff ?? []).includes(l.resource);
}

/** Where each meter is heading, given the situation and the current meters (for hunger). */
export function targets(state: PlanetState, sit: Situation): Meters {
  const w = worldOf(state.world);
  const base = baseOf(w);
  const cut = (sit.cutOff ?? []).length * RULES.cutOff * (w.temperament.cutOffMul ?? 1);
  let t: Meters;
  if (!state.controlled) {
    t = addMeters(base, contributions(w, (s) => (statusOf(sit, s.id) === 'working' ? 1 : 0)));
    if (sit.underAttack) t = addMeters(t, w.temperament.rally ?? RULES.rally);
    if (sit.blockaded) t = addMeters(t, { economy: RULES.blockade });
  } else {
    // Under occupation: held sites work at a share; the temples still stand and the people keep their gods.
    const held = (s: PlanetSite) => (statusOf(sit, s.id) === 'held' ? RULES.occupiedShare : 0);
    const kept = (s: PlanetSite) => (statusOf(sit, s.id) === 'wrecked' ? 0 : 1);
    const c = contributions(w, held, kept);
    const religion = base.religion + c.religion;
    t = meters(
      RULES.occupationBase + c.government - w.temperament.resolve * Math.max(0, religion - RULES.resistAbove) / 2,
      RULES.occupiedShare * Math.max(0, base.military) + c.military,
      religion,
      RULES.occupiedShare * Math.max(0, base.economy) + c.economy,
    );
  }
  t = addMeters(t, { economy: cut });
  if (lifelineDown(w, sit, state.controlled)) t = addMeters(t, RULES.lifelineTarget);
  t = addMeters(t, { government: -Math.max(0, RULES.hungerAt - state.meters.economy) * RULES.hunger });
  return clampMeters(t);
}

export function newPlanet(id: NationId): PlanetState {
  return { world: id, meters: { ...worldOf(id).start }, controlled: false, lifelineDown: false };
}

/** Apply a shock: scaled by the people's temperament, and by religion's steadiness while the natives rule. */
function shock(state: PlanetState, d: Partial<Meters>, extra: Partial<Meters> = {}) {
  const w = worldOf(state.world);
  const steady = state.controlled ? 1 : steadiness(state.meters.religion);
  for (const k of METERS) {
    const v = d[k];
    if (!v) continue;
    const st = k === 'government' || k === 'military' ? steady : 1;
    state.meters[k] = clamp(state.meters[k] + v * (w.temperament.shock?.[k] ?? 1) * (extra[k] ?? 1) * st);
  }
}

export function applyEvent(state: PlanetState, ev: PlanetEvent) {
  const w = worldOf(state.world);
  if (ev.kind === 'shipLost') {
    shock(state, RULES.loss[ev.ship], { government: w.temperament.lossGovernment ?? 1 });
  } else if (ev.kind === 'siteLost') {
    const s = siteOf(w, ev.site);
    const cap = s.kind === 'capital' ? (w.temperament.capitalShock ?? 1) : 1;
    shock(state, KIND_SHOCK[s.kind], { government: cap, religion: cap });
  } else if (ev.kind === 'controlled') {
    state.controlled = true;
    state.meters.government = Math.min(state.meters.government, RULES.conquestFloor);
    state.meters.military = Math.min(state.meters.military, RULES.conquestFloor);
  }
}

/** Advance `dt` seconds of flight time. Returns the effects for conquest to apply. */
export function stepPlanet(state: PlanetState, dt: number, sit: Situation): Effects {
  const w = worldOf(state.world);
  const down = lifelineDown(w, sit, state.controlled);
  if (down && !state.lifelineDown) shock(state, RULES.lifelineShock);
  state.lifelineDown = down;
  state.meters = approach(state.meters, targets(state, sit), dt, w.temperament.recover);
  if (!state.controlled) {
    for (const k of METERS) {
      const f = w.temperament.floor?.[k as MeterId];
      if (f !== undefined) state.meters[k] = Math.max(f, state.meters[k]);
    }
  }
  return effects(state.meters);
}
