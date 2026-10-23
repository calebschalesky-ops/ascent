/**
 * Where each site sits in the scene. Pure: the scene hangs each site in the right frame (a planet's turning surface,
 * its tilted equator, a moon, or the world) at the local position given here.
 *
 * Moons: Jupiter's and Saturn's peoples live on moons, which are destinations on the stations-moons branch (not merged).
 * Until it merges, `MOON_STANDINS` puts a true-scale stand-in for each moon a site stands on, outside its planet's orbit
 * zone, ordered outward by real distance (the same log squeeze stations-moons uses, from a different base), at a fixed
 * angle. On merge, `moonPlace` should read `allMoons()` from lib/world.ts instead; nothing else changes.
 */
import { RADIUS_KM } from '../bodies';
import type { DestGeo, V3 } from '../nav';
import { orbitZone } from '../nav';
import { patrolRadius } from '../nations';
import type { MoonId, SiteDef } from './sites';
import { KINDS } from './sites';

export interface MoonStandin { id: MoonId; name: string; planet: 'jupiter' | 'saturn'; km: number; aKm: number; angle: number; tint: string }
/** Radii and mean distances in km (NASA's satellite fact sheets, as LORE.md cites them); angles are a fixed layout. */
export const MOON_STANDINS: MoonStandin[] = [
  { id: 'io', name: 'Io', planet: 'jupiter', km: 1821.6, aKm: 421_700, angle: 40, tint: '#d8c46c' },
  { id: 'europa', name: 'Europa', planet: 'jupiter', km: 1560.8, aKm: 671_034, angle: 100, tint: '#d9d0c1' },
  { id: 'ganymede', name: 'Ganymede', planet: 'jupiter', km: 2631.2, aKm: 1_070_412, angle: 160, tint: '#9b9082' },
  { id: 'callisto', name: 'Callisto', planet: 'jupiter', km: 2410.3, aKm: 1_882_709, angle: 220, tint: '#6e6455' },
  { id: 'enceladus', name: 'Enceladus', planet: 'saturn', km: 252.1, aKm: 237_948, angle: 150, tint: '#eef1f4' },
  { id: 'titan', name: 'Titan', planet: 'saturn', km: 2574.7, aKm: 1_221_870, angle: 60, tint: '#d29a4c' },
];

/** A stand-in moon's centre and radius in the scene. */
export function moonPlace(id: MoonId, geo: DestGeo[]): { pos: V3; size: number } {
  const m = MOON_STANDINS.find((x) => x.id === id)!;
  const p = geo.find((g) => g.id === m.planet)!;
  const size = (m.km / RADIUS_KM[m.planet]) * p.size;
  const q = (aKm: number) => aKm / RADIUS_KM[m.planet];
  const inner = Math.min(...MOON_STANDINS.filter((x) => x.planet === m.planet).map((x) => q(x.aKm)));
  const d = orbitZone(p) * 1.05 + p.size * 2 * Math.log(q(m.aKm) / inner) + size * 2;
  const a = (m.angle * Math.PI) / 180;
  return { pos: [p.pos[0] + Math.cos(a) * d, p.pos[1], p.pos[2] - Math.sin(a) * d], size };
}

/** A direction from latitude and longitude in degrees (y is the body's pole). */
export function dirOf(lat: number, lon: number): V3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
}

/**
 * The frame a site hangs in: `spin` turns with its planet (surface and cloud layer), `tilt` sits in the planet's
 * tilted equator without turning (Saturn's rings), `moon` on a stand-in moon, `world` fixed in space (orbit), and
 * `twilight` is worked out each frame from where the Sun is (Mercury's walking city).
 */
export type SiteFrame = 'spin' | 'tilt' | 'moon' | 'world' | 'twilight';
export function siteFrame(s: SiteDef): SiteFrame {
  if (s.at.on !== 'home') return 'moon';
  return s.at.place === 'orbit' ? 'world' : s.at.place === 'ring' ? 'tilt' : s.at.place === 'twilight' ? 'twilight' : 'spin';
}

/** How far out from its home's centre an orbital site sits: between the fighter ring and the capital ring. */
export const orbitRadius = (home: DestGeo) => home.size + (patrolRadius(home) - home.size) * 0.8;

/** A site's hit radius in scene units, given the player ship's length. */
export const siteRadius = (s: SiteDef, playerLength: number) => KINDS[s.kind].size * playerLength;

/**
 * A site's position in its frame: relative to its body's (or moon's) centre for spin, tilt and moon frames; absolute
 * for world. Twilight sites use `twilightPos`.
 */
export function siteLocal(s: SiteDef, geo: DestGeo[]): V3 {
  const home = geo.find((g) => g.id === s.world)!;
  const d = dirOf(s.at.lat, s.at.lon);
  const k = (r: number): V3 => [d[0] * r, d[1] * r, d[2] * r];
  switch (siteFrame(s)) {
    case 'moon': return k(moonPlace(s.at.on as MoonId, geo).size);
    case 'tilt': return k(home.size * 1.9); // in Saturn's rings (about 1.2 to 2.3 radii)
    case 'world': { const o = k(orbitRadius(home)); return [home.pos[0] + o[0], home.pos[1] + o[1], home.pos[2] + o[2]]; }
    default: return k(home.size * (s.at.place === 'air' ? 1.009 : 1)); // Venus's cities ride at about 50–55 km
  }
}

/** On the twilight line: the point of the equator a quarter turn from the Sun, on the side the planet turns toward night. */
export function twilightPos(home: DestGeo, sun: V3): V3 {
  const to: V3 = [sun[0] - home.pos[0], 0, sun[2] - home.pos[2]];
  const l = Math.hypot(to[0], to[2]) || 1;
  const side: V3 = [-to[2] / l, 0, to[0] / l];
  return [home.pos[0] + side[0] * home.size, home.pos[1], home.pos[2] + side[2] * home.size];
}
