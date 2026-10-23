/**
 * Stations: since Caleb's ruling of 2026-10-19 each world a nation holds has one megastructure, its god's armour
 * (GOD-ARMOUR.md, src/lib/megastructure/), and a "station" here is one of its **berths**: a docking cradle on the
 * plating. The ids are the old station ids ('stn-mars-1' …), so saves, routes and the station screen carry over.
 * Where a berth sits, and its approach point, come from megastructure/hardpoints.ts.
 *
 * Every size here is in player-ship lengths, never scene units, so a rescale of the player ship carries through.
 * Not decided, and not invented here: upgrades, prices, goods, any currency or economy, who may dock where.
 */
import { PLANET_NAME } from './bodies';
import type { V3 } from './nav';
import { ARMOUR } from './megastructure/armour';
import { PEOPLES } from './races';

export type StationHome = 'earth' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export const STATION_HOMES: StationHome[] = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
/** Berths per world: more on the giants, which have the room. A first pass. */
export const STATION_COUNT: Record<StationHome, number> = { earth: 3, moon: 2, mercury: 2, venus: 2, mars: 3, jupiter: 4, saturn: 3 };

export type StationId = `stn-${StationHome}-${number}`;
export interface Station { id: StationId; home: StationHome; index: number; of: number; label: string }

export const homeName = (h: StationHome) => (h === 'earth' ? 'Earth' : PLANET_NAME[h]);
export const STATIONS: Station[] = STATION_HOMES.flatMap((home) => Array.from({ length: STATION_COUNT[home] }, (_, i) => ({
  id: `stn-${home}-${i + 1}` as StationId, home, index: i, of: STATION_COUNT[home],
  // A berth that is one of its people's stations (races.ts bases, 'stn-<home>-<n>') carries that station's name.
  label: PEOPLES.flatMap((p) => p.bases).find((b) => b.id === `stn-${home}-${i + 1}`)?.name ?? `${ARMOUR[home].short} · Berth ${i + 1}`,
})));
export const STATION_LABEL = Object.fromEntries(STATIONS.map((s) => [s.id, s.label])) as Record<StationId, string>;
export const isStation = (s: unknown): s is StationId => typeof s === 'string' && STATIONS.some((x) => x.id === s);
export const stationById = (id: string) => STATIONS.find((s) => s.id === id);

/** Ships each berth's yard houses: in its hangar, and moored outside. A first pass. */
export const HOUSED = { fighter: 3, cruiser: 2, capital: 1 };
/** Ship lengths against the player's: capital 5×, cruiser 1×, fighter 1/5 (as on the ship-types branch). */
export const HOUSED_LENGTH = { fighter: 0.2, cruiser: 1, capital: 5 };

/**
 * Where a berth is, for flying: `pos` is its approach point (straight out from the cradle, where the autopilot parks),
 * `cradle` the cradle on the plating, `out` the way out. `size` is the approach point's height above everything on
 * the plating less a margin, so a path to it keeps that margin over the armour (nav.ts pathObstacles). Distances in
 * scene units; worked out from ship lengths in megastructure/hardpoints.ts BERTH.
 */
export interface StationPlace { pos: V3; cradle: V3; out: V3; home: StationHome; size: number; arrive: number; stop: number; clear: number; dock: number; park: number; parkSpeed: number }

/** The player ship's hull. It had none before; nothing damages it yet except by hand. */
export const PLAYER_HULL = 100;
