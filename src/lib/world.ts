/**
 * The whole world's geometry: the ten destinations (nav.ts), plus the major moons and the stations, every one of them
 * a body the autopilot goes around and a ship stops at. The minor moons are drawn but are not destinations.
 */
import { LAYOUT } from './bodies';
import type { PlanetId } from './bodies';
import type { Dest, DestGeo } from './nav';
import { destGeometry, orbitZone } from './nav';
import { MOON_PLANETS, MOON_TINT, isMajorMoon, moonById, placeMoons } from './moons';
import type { MoonHost, PlacedMoon } from './moons';
import { STATIONS, stationById } from './stations';
import type { StationPlace } from './stations';
import { NATIONS, nationOf } from './nations';
import type { Nation } from './nations';
import { BERTH, armourPlaces, berthOf } from './megastructure/hardpoints';
import { ARMOUR_HOMES } from './megastructure/armour';
import { setPieces } from './megastructure/setpieces';
import type { ArmourHome } from './megastructure/armour';

export const moonHost = (g: DestGeo): MoonHost => ({ pos: g.pos, size: g.size, stop: g.stop, zone: orbitZone(g) });

/** Every moon of Mars, Jupiter and Saturn at its place. */
export function allMoons(geo: DestGeo[] = destGeometry()): PlacedMoon[] {
  return MOON_PLANETS.flatMap((p) => placeMoons(p, moonHost(geo.find((g) => g.id === p)!)));
}

/** Every berth on the god armour, for flying: its approach point, cradle and way out (megastructure/hardpoints.ts). */
export function stationPlaces(shipLength: number, geo: DestGeo[] = destGeometry()): (StationPlace & { id: Dest })[] {
  return STATIONS.map((s) => {
    const b = berthOf(s.id, geo, shipLength)!;
    const L = shipLength;
    return {
      id: s.id, home: s.home, pos: b.approach!, cradle: b.pos, out: b.normal,
      size: (BERTH.approach - BERTH.margin) * L, // a path to the approach point keeps BERTH.margin over the plating
      arrive: 40 * L, stop: 0, clear: 0, // a berth is not an obstacle: the plating under it is, as its planet's shell
      dock: BERTH.dockReach * L, park: BERTH.park * L, parkSpeed: BERTH.parkSpeed * L,
    };
  });
}

/**
 * The ten destinations, then the major moons, then the stations. `shipLength` is the player ship's length in scene
 * units: stations are sized against it.
 */
export function worldGeometry(shipLength: number, layout: Record<PlanetId | 'stars', number> = LAYOUT): DestGeo[] {
  const plain = destGeometry(layout);
  // The worlds with god armour keep paths outside their plating and its mounts, plus a berth's margin.
  const arm = armourPlaces(plain, shipLength);
  // The set pieces (Earth's ring, Mercury's wings, Zeus's spires, Kronos's wall…) widen it; Mars's spears to its moons
  // do not (they are left out here), and Earth's Pharos turns with the planet out to 1.72 radii.
  const reachOf = (h: ArmourHome) => {
    const f = arm[h].frame;
    return Math.max(f.rOut + arm[h].skin, setPieces(f).reach, h === 'earth' ? f.R * 1.72 : 0);
  };
  const base = plain.map((g) => (ARMOUR_HOMES.includes(g.id as ArmourHome)
    ? { ...g, shell: reachOf(g.id as ArmourHome) + BERTH.margin * shipLength, top: arm[g.id as ArmourHome].frame.rOut + arm[g.id as ArmourHome].skin } : g));
  const moons: DestGeo[] = allMoons(base).filter((m) => isMajorMoon(m.moon.id)).map(({ moon, pos, size }) => ({
    id: moon.id as Dest, pos, size, kind: 'moon',
    arrive: size * 4 + 1.5, stop: size * 2.8 + 0.6, clear: size * 1.25 + 1, // as a planet's
  }));
  const stations: DestGeo[] = stationPlaces(shipLength, base).map(({ id, pos, size, arrive, stop, clear, park, parkSpeed }) => ({ id, pos, size, arrive, stop, clear, park, parkSpeed, kind: 'station' }));
  return [...base, ...moons, ...stations];
}

/** The colour of a moon (its tint) or a station (its nation's); undefined for the ten. */
export function destTint(d: Dest): string | undefined {
  if (isMajorMoon(d)) return MOON_TINT[d];
  return stationById(d) ? holderOf(d)?.color : undefined;
}

/** A line saying what a moon or a station is, for the arrival card. */
export function destKindLine(d: Dest): string | undefined {
  if (isMajorMoon(d)) { const m = moonById(d)!; return `Moon of ${m.planet[0].toUpperCase()}${m.planet.slice(1)}`; }
  return stationById(d) ? 'Space station' : undefined;
}

/** Who holds a destination: a station's nation, or the nation whose home it is. Moons are held by no one yet. */
export function holderOf(d: Dest): Nation | undefined {
  const st = stationById(d);
  return st ? NATIONS.find((n) => n.home === st.home) : nationOf(d);
}

