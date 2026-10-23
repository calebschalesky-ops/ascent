/**
 * The bodies of the flyable cosmos, and where each one sits. One fixed layout: no dates, no ephemeris.
 *
 * LAYOUT gives each body one constant angle (degrees, anticlockwise seen from above, 0 = +x) on its own ring.
 * Chosen so the Mars → Jupiter leg of the grand tour runs straight through the Sun's clearance and the autopilot
 * has to detour around it: with Mars at 0° (ring 800 Earth-radii-of-2, see nav.ts VR) and Jupiter at 116° (ring 900),
 * the straight line between them passes about 1.4% of the Sun's radius from its centre at 58° (ring 450). Every
 * distance is multiplied by nav.ts COSMOS (185), so the angles and the detour are the same at any scale.
 * The inner bodies (Moon, Mercury, Venus) are spread so no inner leg runs through Earth.
 */

export type PlanetId = 'moon' | 'mercury' | 'venus' | 'sun' | 'mars' | 'jupiter' | 'saturn';
/** The zones of space, from Earth outward: near Earth, each planet's ring, the stars, the edge. */
export type SphereId = 'near' | PlanetId | 'stars' | 'edge';

/** From Earth outward. */
export const PLANET_ORDER: PlanetId[] = ['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn'];
export const SPHERE_ORDER: SphereId[] = ['near', ...PLANET_ORDER, 'stars', 'edge'];

export const PLANET_NAME: Record<PlanetId, string> = {
  moon: 'Moon', mercury: 'Mercury', venus: 'Venus', sun: 'Sun', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
};

/** Each ring's colour, as palette only. */
export const COLOR: Record<PlanetId, string> = {
  moon: '#2f5fc4', mercury: '#e3c52c', venus: '#1d8f5c', sun: '#eb9a1e', mars: '#cc2131', jupiter: '#7442ad', saturn: '#33307a',
};

/**
 * Kilometres in one scene unit. The player's cruiser is 40 m long and 0.3708 units in the scene, so a unit is 108 m.
 * Real scale (REAL-SCALE-PLAN.md) sizes every body from its true radius in km by this. It was 0.2 / 0.3708 (a 200 m
 * cruiser, art-refit/03-SHIPS.md) until 2026-10-21, when Caleb had the ships shrunk ×5 against the world so the planets
 * read life size (scale-jump-danger S1): capital 200 m, cruiser 40 m, fighter 8 m. Ships keep their scene units.
 */
export const KM_PER_UNIT = 0.04 / 0.3708;

/** Mean radius in km (Sun: nominal photospheric). */
export const RADIUS_KM: Record<PlanetId | 'earth', number> = {
  sun: 695700, mercury: 2439.7, venus: 6051.8, earth: 6371.0, moon: 1737.4, mars: 3389.5, jupiter: 69911, saturn: 58232,
};

/**
 * True orbits (real scale, step 3): each planet's semi-major axis about the Sun in AU (JPL mean elements, J2000), and
 * the Moon's about Earth in km. The planets go round the Sun, which sits 1 AU from Earth; the Moon goes round Earth.
 */
export const ORBIT_AU: Record<'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn', number> = {
  mercury: 0.38710, venus: 0.72333, mars: 1.52371, jupiter: 5.20289, saturn: 9.53668,
};
export const MOON_ORBIT_KM = 384400;
export const AU_KM = 1.495978707e8;
/** Hill spheres in km (a times the cube root of m/3M): inside one, that body's zone. The Moon's sits inside Earth's. */
export const HILL_KM: Record<PlanetId | 'earth', number> = {
  earth: 1.496e6, moon: 6.15e4, mercury: 1.75e5, venus: 1.01e6, mars: 9.82e5, jupiter: 5.32e7, saturn: 6.52e7, sun: 0,
};

/**
 * The fixed layout: one angle per body, and for the stars' waypoint. Since real scale (step 3) the planets' and the
 * stars' angles are heliocentric longitudes (round the Sun); the Sun's and the Moon's are seen from Earth.
 */
export const LAYOUT: Record<PlanetId | 'stars', number> = {
  moon: 300, mercury: 150, venus: 250, sun: 58, mars: 0, jupiter: 116, saturn: 200, stars: 30,
};

export const SPHERE_NAMES: Record<SphereId, string> = {
  near: 'Near Earth',
  moon: 'Moon’s ring',
  mercury: 'Mercury’s ring',
  venus: 'Venus’s ring',
  sun: 'Sun’s ring',
  mars: 'Mars’s ring',
  jupiter: 'Jupiter’s ring',
  saturn: 'Saturn’s ring',
  stars: 'The stars',
  edge: 'The edge',
};

export function isPlanet(s: string): s is PlanetId {
  return (PLANET_ORDER as string[]).includes(s);
}

export const norm360 = (a: number) => ((a % 360) + 360) % 360;
