/**
 * The moons of Mars, Jupiter and Saturn: every one JPL lists (moonData.ts), sized true to scale with their planet and
 * set at fixed places round it. Earth's Moon is already its own destination on its own ring (bodies.ts), so it is
 * counted here but not placed again. Mercury and Venus have no moons.
 *
 * Sizes are true: a moon's radius is its planet's scene radius × (moon km ÷ planet km), so a rescale of the planets
 * carries through to their moons.
 *
 * Distances are true since real scale (step 3): each moon sits at its real semi-major axis, its planet radii (q) times
 * the planet's true radius. Callisto is 27 Jupiter radii out and Saturn's outermost moons over 400 Saturn radii. Io,
 * Mimas and Enceladus orbit inside where a ship parks and orbits, as they do.
 *
 * Direction is fixed too: each moon's angle round its orbit at the table's epoch (node + argument of periapsis + mean
 * anomaly, on its inclined plane), in the planet's equatorial plane for Laplace-frame orbits and the ecliptic for the
 * rest. Like the planets, moons hold those places; there are no dates.
 */
import { RADIUS_KM } from './bodies';
import type { V3 } from './nav';
import { MOON_ROWS } from './moonData';
import type { MoonRow } from './moonData';

export type MoonPlanet = 'mars' | 'jupiter' | 'saturn';
export const MOON_PLANETS: MoonPlanet[] = ['mars', 'jupiter', 'saturn'];

/**
 * The moons that are destinations: the ones drawn as full bodies, because they can be seen from where a ship parks at
 * their planet (see `seenFromPark`). Test-checked against that rule.
 */
export type MajorMoonId = 'io' | 'europa' | 'ganymede' | 'callisto' | 'mimas' | 'enceladus' | 'tethys' | 'dione' | 'rhea' | 'titan' | 'iapetus';
export const MAJOR_MOONS: MajorMoonId[] = ['io', 'europa', 'ganymede', 'callisto', 'mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus'];
export const MOON_LABEL: Record<MajorMoonId, string> = {
  io: 'Io', europa: 'Europa', ganymede: 'Ganymede', callisto: 'Callisto',
  mimas: 'Mimas', enceladus: 'Enceladus', tethys: 'Tethys', dione: 'Dione', rhea: 'Rhea', titan: 'Titan', iapetus: 'Iapetus',
};
/** Each major moon's colour in the scene and on the map: palette only, like the planets' ring colours. */
export const MOON_TINT: Record<MajorMoonId, string> = {
  io: '#d8c46c', europa: '#d9d0c1', ganymede: '#9b9082', callisto: '#6e6455',
  mimas: '#bdb9b2', enceladus: '#eef1f4', tethys: '#d8d5ce', dione: '#c8c5be', rhea: '#bcb8b0', titan: '#d29a4c', iapetus: '#8b7b62',
};
export const isMajorMoon =(s: unknown): s is MajorMoonId => typeof s === 'string' && (MAJOR_MOONS as string[]).includes(s);

/** JPL publishes no radius for most small irregular moons. They are drawn at this size. Not from JPL: a placeholder. */
export const UNKNOWN_RADIUS_KM = 2;
/** Log-scale spread of moon distances, in planet radii per e-fold of real distance. */
export const SPREAD = 2;
/** Smallest angular diameter (degrees) that counts as seen: about two pixels on a 1080-pixel-tall, 60° view. */
export const SEEN_DEG = 0.1;
/** Axial tilt (degrees, about the scene's z axis), the same as the planets are drawn with in voyageScene.ts. */
export const AXIAL_TILT: Record<MoonPlanet, number> = { mars: 25.2, jupiter: 3.1, saturn: 26.7 };

export interface Moon {
  id: string; // the name in lower case; also a MajorMoonId for the major ones
  name: string;
  code: number; // JPL's number
  planet: 'earth' | MoonPlanet;
  aKm: number;
  /** Real distance in planet radii. */
  q: number;
  /** JPL's radius, or null where JPL publishes none. */
  radiusKm: number | null;
  radiusSource: 'phys_par' | 'horizons' | null;
  frame: 'laplace' | 'ecliptic';
  i: number; node: number; w: number; M: number;
}

const planetKm = (p: Moon['planet']) => RADIUS_KM[p];

export const MOONS: Moon[] = MOON_ROWS.map(([planet, name, code, aKm, frame, i, node, w, M, radiusKm, src]: MoonRow) => ({
  id: name.toLowerCase(), name, code, planet, aKm, q: aKm / planetKm(planet), radiusKm,
  radiusSource: src === 'P' ? 'phys_par' : src === 'H' ? 'horizons' : null,
  frame: frame === 'L' ? 'laplace' : 'ecliptic', i, node, w, M,
}));
export const moonsOf = (p: Moon['planet']) => MOONS.filter((m) => m.planet === p);
export const moonById = (id: string) => MOONS.find((m) => m.id === id);
/** The planet each major moon goes round. */
export const MOON_PLANET = Object.fromEntries(MAJOR_MOONS.map((id) => [id, moonById(id)!.planet])) as Record<MajorMoonId, MoonPlanet>;

/** Radius to draw at (km): JPL's, or the placeholder. */
export const drawRadiusKm = (m: Moon) => m.radiusKm ?? UNKNOWN_RADIUS_KM;
/** Scene radius, true to scale with the planet. */
export const moonSize = (m: Moon, planetSize: number) => (planetSize * drawRadiusKm(m)) / planetKm(m.planet);

/** What a moon is placed against: its planet's centre, radius, parking distance and orbit zone (scene units). */
export interface MoonHost { pos: V3; size: number; stop: number; zone: number }

/** Just outside the planet's orbit zone, with room for the largest moon's clearance. */
export const innerRadius = (h: MoonHost) => h.zone + h.size * 0.15 + 2;

/** Distance of a moon from its planet's centre in the scene (see the file comment). */
export function moonDistance(m: Moon, h: MoonHost): number {
  return m.q * h.size; // real scale: the true distance (planet radii times the planet's true radius)
}

/** Unit direction from the planet to the moon, in scene axes (y up, the ecliptic is the xz plane). */
export function moonDir(m: Moon): V3 {
  const r = Math.PI / 180;
  const O = m.node * r;
  const inc = m.i * r;
  const u = (m.w + m.M) * r; // circular orbits: the mean anomaly stands in for the true anomaly
  const X = Math.cos(O) * Math.cos(u) - Math.sin(O) * Math.sin(u) * Math.cos(inc);
  const Y = Math.sin(O) * Math.cos(u) + Math.cos(O) * Math.sin(u) * Math.cos(inc);
  const Z = Math.sin(u) * Math.sin(inc);
  const p: V3 = [X, Z, -Y]; // reference plane to scene: angle anticlockwise from +x seen from above, as onEcl
  if (m.frame === 'ecliptic' || m.planet === 'earth') return p;
  const t = AXIAL_TILT[m.planet] * r; // the planet's equator is tilted about z, as its mesh is
  return [p[0] * Math.cos(t) - p[1] * Math.sin(t), p[0] * Math.sin(t) + p[1] * Math.cos(t), p[2]];
}

export interface PlacedMoon { moon: Moon; pos: V3; size: number; dist: number }

/** Every moon of a planet at its fixed place. */
export function placeMoons(p: MoonPlanet, h: MoonHost): PlacedMoon[] {
  return moonsOf(p).map((moon) => {
    const dist = moonDistance(moon, h);
    const d = moonDir(moon);
    return { moon, dist, size: moonSize(moon, h.size), pos: [h.pos[0] + d[0] * dist, h.pos[1] + d[1] * dist, h.pos[2] + d[2] * dist] };
  });
}

/**
 * True when a moon is big enough to see from where a ship parks at its planet: its angular diameter, from the parking
 * distance on the moon's side, is at least SEEN_DEG. Those are drawn as full bodies and are destinations.
 */
export function seenFromPark(pm: PlacedMoon, h: MoonHost): boolean {
  if (pm.moon.radiusKm === null) return false; // a placeholder size is never enough to call a moon big
  return ((2 * pm.size) / (pm.dist - h.stop)) * (180 / Math.PI) >= SEEN_DEG;
}
