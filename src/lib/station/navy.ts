/**
 * What a station does with ships when a fleet comes in. Pure and tested.
 *
 * - **Hangar**: engaged, it launches its fighters one by one from the hangar mouth (a fighter screen); under siege its
 *   cruisers follow and the moored capital ship slips its mooring and puts itself between the attacker and the
 *   station. Calm again, everything is recalled and docks.
 * - **The planet's navy**: engaged, it calls its world's patrol to defend it (fleet command's `defend { ward }` order,
 *   in shape); the capital ship of the patrol is kept on its ring unless the station is under siege.
 * - **The other stations of the world** go to arms with it (Hermes's messenger: at once; the rest after a delay).
 * - **Cover**: the planet, its moons and the station itself are offered to enemy-ai's cover picker as occluders
 *   (`tactics.ts` `Occluder`, kind 'station'), so launched cruisers and the patrol fight from behind them.
 *
 * Ships come from what conquest's production has built and housed here; a launched ship that dies is gone until
 * conquest builds another.
 */
import type { V3 } from '../nav';
import { COSMOS, add, dist, len, scale, sub, unit } from '../nav';
import type { ShipType } from '../shipTypes';
import type { Alert, StationSys } from './defence';
import type { Boon } from './profiles';

export const LAUNCH = {
  every: { fighter: 3, cruiser: 8, capital: 0, destroyer: 10 } as Record<ShipType, number>, // destroyer: integration pass 2 (stations house none yet) // seconds between launches from one hangar mouth
  messenger: 1.5, // Hermes: launches this much faster
  recallAfter: 10, // seconds calm before the launched ships are called home
  callDelay: 5, // seconds engaged before the patrol is called (Hermes: none)
  callReach: 0.7 * COSMOS, // patrol ships farther than this from the station are not called (a world distance: 4,000 at 200 m ships)
};

/** Ships the station launches: they defend it, they do not chase. FIRST PASS (measured in the browser, STATIONS.md). */
export const DEFENDER = {
  leash: 600, // attack only a target within this of the station; past it, fall back to the hangar mouth
  rate: 1, // shots a second for a launched fighter (the player's wingmen fire 3)
  homeSpeed: 100, // units a second flying home when recalled
};
/** Should a launched ship attack this target, or hold by its station? */
export const withinLeash = (station: V3, target: V3) => dist(station, target) <= DEFENDER.leash;

export interface Hangar {
  housed: Record<ShipType, number>; // in the hangar (the capital ship: moored outside)
  out: Record<ShipType, number>; // launched and alive
  cd: number;
  calm: number; // seconds calm, for the recall
  engaged: number; // seconds engaged, for the call
}
/** A hangar holding a tier's ships; `wing` multiplies the fighters (Mars's legion squadrons). */
export const newHangar = (housed: Partial<Record<ShipType, number>>, wing = 1): Hangar =>
  ({ housed: { capital: 0, cruiser: 0, destroyer: 0, ...housed, fighter: Math.round((housed.fighter ?? 0) * wing) }, out: { fighter: 0, cruiser: 0, capital: 0, destroyer: 0 }, cd: 0, calm: 0, engaged: 0 });

export interface NavyOrders { launch: ShipType[]; recall: boolean; call: boolean }

/**
 * One step of the hangar: engaged, every fighter goes up, one per launch interval per working hangar mouth; under siege
 * the cruisers go out ahead of the remaining fighters and the capital ship slips its mooring. `mouths`: working hangar mouths (none: nothing
 * launches from the hangar). Mutates the hangar.
 */
export function stepHangar(h: Hangar, alert: Alert, dt: number, mouths: number, boon: Boon | null): NavyOrders {
  const fighting = alert === 'engaged' || alert === 'siege';
  h.calm = fighting ? 0 : h.calm + dt;
  h.engaged = fighting ? h.engaged + dt : 0;
  const orders: NavyOrders = { launch: [], recall: false, call: false };
  if (!fighting) {
    if (h.calm >= LAUNCH.recallAfter && (h.out.fighter || h.out.cruiser || h.out.capital)) orders.recall = true;
    return orders;
  }
  orders.call = h.engaged >= (boon === 'messenger' ? 0 : LAUNCH.callDelay);
  if (alert === 'siege' && h.housed.capital > 0) { h.housed.capital--; h.out.capital++; orders.launch.push('capital'); }
  h.cd -= dt;
  if (mouths <= 0 || h.cd > 0) return orders;
  const tempo = mouths * (boon === 'messenger' ? LAUNCH.messenger : 1);
  if (alert === 'siege' && h.housed.cruiser > 0) { // under siege the cruisers go first
    h.housed.cruiser--; h.out.cruiser++; orders.launch.push('cruiser'); h.cd = LAUNCH.every.cruiser / tempo;
  } else if (h.housed.fighter > 0) {
    h.housed.fighter--; h.out.fighter++; orders.launch.push('fighter'); h.cd = LAUNCH.every.fighter / tempo;
  }
  return orders;
}
/** A launched ship came home and docked. */
export function docked(h: Hangar, t: ShipType) { if (h.out[t] > 0) { h.out[t]--; h.housed[t]++; } }
/** A launched ship was destroyed. */
export function lost(h: Hangar, t: ShipType) { if (h.out[t] > 0) h.out[t]--; }

export interface PatrolShip { id: number; type: ShipType; pos: V3; alive: boolean }
/** Fleet command's order, in shape: defend the station, with these ships. */
export interface DefendCall { kind: 'defend'; ward: string; at: V3; ships: number[] }

/** The patrol ships a station calls: its world's live ships within reach, nearest first; the capital only under siege. */
export function callNavy(sys: Pick<StationSys, 'id' | 'alert'>, at: V3, threat: V3, patrol: PatrolShip[]): DefendCall {
  const ships = patrol
    .filter((p) => p.alive && dist(p.pos, at) <= LAUNCH.callReach && (p.type !== 'capital' || sys.alert === 'siege'))
    .sort((a, b) => dist(a.pos, at) - dist(b.pos, at))
    .map((p) => p.id);
  return { kind: 'defend', ward: sys.id, at: threat, ships };
}

/**
 * The other stations of the world go to arms (returns how many heard of a new attacker): at least wary, and they share who provoked it, so each fights the same
 * attacker. With Hermes's boon the news is instant; otherwise each sibling gets it once the caller has been engaged
 * for `LAUNCH.callDelay` (the caller passes `engagedFor`).
 */
export function alertSiblings(from: StationSys, siblings: StationSys[], engagedFor: number, boon: Boon | null): number {
  if (from.alert !== 'engaged' && from.alert !== 'siege') return 0;
  if (boon !== 'messenger' && engagedFor < LAUNCH.callDelay) return 0;
  let n = 0; // siblings that hear of an attacker for the first time
  for (const s of siblings) {
    if (s === from || s.home !== from.home || s.alert === 'fallen') continue;
    let news = false;
    for (const [a, hits] of Object.entries(from.provoked)) { if (!s.provoked[a]) news = true; s.provoked[a] = Math.max(s.provoked[a] ?? 0, hits); }
    s.quiet = Math.min(s.quiet, from.quiet);
    if (s.alert === 'calm') s.alert = 'wary';
    if (news) n++;
  }
  return n;
}

/**
 * Where the moored capital ship goes when it slips its mooring: on the line from the station to the threat, `stand`
 * of the way out, lifted off the line if that point is inside the planet.
 */
export function interpose(station: V3, threat: V3, planet: { pos: V3; r: number } | null, stand = 0.3): V3 {
  let p = add(station, scale(sub(threat, station), stand));
  if (planet && dist(p, planet.pos) < planet.r * 1.05) p = add(planet.pos, scale(unit(sub(p, planet.pos)), planet.r * 1.05));
  return p;
}

/** enemy-ai's `Occluder` shape (tactics.ts on claude/enemy-ai-dbbee0): what a ship can hide behind near a station. */
export interface Occluder { pos: V3; r: number; kind: 'body' | 'station' | 'asteroid' | 'ship'; id?: number }
export function stationOccluders(station: { pos: V3; size: number }, planet: { pos: V3; r: number } | null, moons: { pos: V3; r: number }[]): Occluder[] {
  const out: Occluder[] = [{ pos: station.pos, r: station.size, kind: 'station' }];
  if (planet) out.push({ pos: planet.pos, r: planet.r, kind: 'body' });
  for (const m of moons) if (planet && len(sub(m.pos, planet.pos)) < planet.r * 12) out.push({ pos: m.pos, r: m.r, kind: 'body' });
  return out;
}
