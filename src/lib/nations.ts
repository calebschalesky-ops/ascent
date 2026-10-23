/**
 * Nations: one controls each planet (and the Moon). The player's is the one picked at the start (Earth by default).
 * Each other nation is named for its race (lib/races.ts, a DRAFT; the lore is in LORE.md). The Sun is held by no one.
 */
import type { PlanetId } from './bodies';
import { COLOR } from './bodies';
import type { Dest, DestGeo, V3 } from './nav';
import { COSMOS, orbitZone } from './nav';
import { RACE_NAME } from './races';
import type { Force, ShipType } from './shipTypes';
import { FORCE, SHIP_SPECS, forceSize } from './shipTypes';

export type NationId = 'earth' | Exclude<PlanetId, 'sun'>;
export interface Nation { id: NationId; home: Dest; name: string; color: string; player: boolean; force: Force }

/** The player's nation: Earth until a new game picks another (setPlayerNation). */
export let PLAYER_NATION: NationId = 'earth';

export const NATIONS: Nation[] = [
  { id: 'earth', home: 'earth', name: 'Earth', color: '#3f7fd0', player: true, force: { ...FORCE } },
  ...(['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const).map((p) => ({
    id: p, home: p, name: RACE_NAME[p], color: COLOR[p], player: false, force: { ...FORCE },
  })),
];

/** Make `id` the player's nation (the start screen's choice, or a loaded save's). */
export function setPlayerNation(id: NationId) {
  PLAYER_NATION = id;
  for (const n of NATIONS) n.player = n.id === id;
}

export const nationOf = (d: Dest): Nation | undefined => NATIONS.find((n) => n.home === d);
export const shipCount = (n: Nation) => forceSize(n.force);

/**
 * How far from its home body a patrol flies: low over it, inside where the autopilot parks (stop = 2.8 radii + 111),
 * so arriving you look down on its ships against the planet. Inside the orbit zone, well clear of the surface.
 */
export const patrolRadius = (home: DestGeo) => home.size * 1.6 + COSMOS;

/**
 * A type's own ring, so capital, cruisers and fighters fly apart: the type's ring factor scales the patrol's height
 * above the surface (integration pass 1). Ship types scaled the whole radius, which at planet scale's 1.6 × radius
 * + 185 put fighters inside Jupiter and Saturn; scaling the height keeps every ring above the surface at any scale.
 */
export const ringRadius = (home: DestGeo, type: ShipType = 'cruiser') => home.size + (patrolRadius(home) - home.size) * SHIP_SPECS[type].ring;

function ringPoint(home: DestGeo, r: number, a: number, i: number): V3 {
  const tilt = 0.25 + i * 0.35;
  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;
  return [home.pos[0] + x, home.pos[1] + z * Math.sin(tilt), home.pos[2] + z * Math.cos(tilt)];
}

/**
 * A patrol's speed in ship units per second (integration pass 1). Ships keep their numbers when the cosmos grows
 * (planet scale's rule), so this is the speed the type flew before COSMOS: the old lap rate (bigger bodies, slower
 * laps) times the old ring (2.2 × radius + 3, times the type's ring factor), with the body's size taken back to the
 * old scale. The lap rate on today's ring follows from it. Without this, patrols flew about 5× faster in ship units
 * and the missile's straight last 22 units missed them (balance-1.md).
 */
export function patrolSpeed(home: DestGeo, type: ShipType = 'cruiser'): number {
  const old = home.size / COSMOS;
  return (0.25 / Math.sqrt(Math.max(1, old))) * (old * 2.2 + 3) * SHIP_SPECS[type].ring * SHIP_SPECS[type].patrolSpeed;
}

const ringAngle = (home: DestGeo, i: number, n: number, t: number, type: ShipType) =>
  (i / n) * Math.PI * 2 + t * (patrolSpeed(home, type) / ringRadius(home, type));

/**
 * Where ship `i` of the `n` ships of `type` is at time `t` (seconds): circling its home on a tilted ring, evenly
 * spaced. A type with patrol speed 0 (the capital ship) holds station. Pure, so a patrol's path can be tested and a
 * save does not need to store the ships' positions.
 */
export const patrolPos = (home: DestGeo, i: number, n: number, t: number, type: ShipType = 'cruiser'): V3 =>
  ringPoint(home, ringRadius(home, type), ringAngle(home, i, n, t, type), i);

/** The way ship `i` faces: along its ring, even when it holds station. Not normalised. */
export function patrolDir(home: DestGeo, i: number, n: number, t: number, type: ShipType = 'cruiser'): V3 {
  const r = ringRadius(home, type);
  const a = ringAngle(home, i, n, t, type);
  const p = ringPoint(home, r, a, i);
  const q = ringPoint(home, r, a + 0.01, i);
  return [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
}

/** True when the patrol ring stays outside the body and inside the zone where a ship orbits that body. */
export const patrolFits = (home: DestGeo) => patrolRadius(home) > home.size * 1.3 && patrolRadius(home) < orbitZone(home);

/**
 * True when a type's ring keeps its whole hull clear of the surface (and inside the orbit zone), given the player
 * ship's length in world units.
 */
export const ringClear = (home: DestGeo, type: ShipType, playerLength: number) => {
  const r = ringRadius(home, type);
  const half = (SHIP_SPECS[type].size * playerLength) / 2;
  return r - half > home.size * 1.2 && r + half < orbitZone(home);
};
