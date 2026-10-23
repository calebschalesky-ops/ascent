import { describe, expect, it } from 'vitest';
import { STATIONS, STATION_COUNT, isStation, stationById } from './stations';
import { BERTH, armourPlaces } from './megastructure/hardpoints';
import { segmentHitsArmour } from './megastructure/armour';
import type { ArmourHome } from './megastructure/armour';
import { MAJOR_MOONS, isMajorMoon } from './moons';
import { ALL_DESTS, DEST_LABEL, TOUR_ROUTE, flightTime, parkSlack, destGeometry, destSphere, dist, isDest, orbitBody, orbitZone, parkPoint, pathMargin, pathObstacles, planPath, planRoute, routeFromSave, shipAxes } from './nav';
import type { V3 } from './nav';
import { NATIONS, ringRadius } from './nations';
import { SHIP_TYPES } from './shipTypes';
import { allMoons, holderOf, stationPlaces, worldGeometry } from './world';

const L = 0.18 * 2.06; // the player ship's length in scene units (Voyage SHIP × the model's length)
const world = worldGeometry(L);
const at = (id: string) => world.find((g) => g.id === id)!;

describe('stations', () => {
  it('gives every nation at least one station at its home', () => {
    for (const n of NATIONS) expect(STATIONS.filter((s) => s.home === n.home).length).toBeGreaterThanOrEqual(1);
    expect(STATIONS.length).toBe(19);
    expect(Object.values(STATION_COUNT).reduce((a, b) => a + b, 0)).toBe(19);
    expect(holderOf('stn-mars-2')?.id).toBe('mars');
    expect(holderOf('stn-earth-1')?.player).toBe(true);
    expect(holderOf('io')).toBeUndefined();
  });
  it('puts each berth on its world’s armour, its approach point straight out from the cradle, inside every patrol ring', () => {
    const base = destGeometry();
    for (const p of stationPlaces(L)) {
      const s = stationById(p.id)!;
      const home = base.find((g) => g.id === s.home)!;
      const arm = armourPlaces()[s.home as ArmourHome];
      expect(dist(p.cradle, home.pos)).toBeCloseTo(arm.frame.rOut, 4);
      expect(dist(p.pos, home.pos)).toBeCloseTo(arm.frame.rOut + arm.skin + BERTH.approach * L, 4);
      // Every patrol ring passes clear of it: outside it, or (Saturn's wall on the rings' edge) inside it.
      for (const t of SHIP_TYPES) expect(Math.abs(dist(p.pos, home.pos) - ringRadius(home, t))).toBeGreaterThan(L);
      expect(dist(p.pos, home.pos)).toBeLessThan(orbitZone(home));
      expect(p.size / L).toBeCloseTo(BERTH.approach - BERTH.margin, 9);
    }
  });
  it('keeps every berth’s approach point clear of every moon (major or minor) and every other body', () => {
    const moons = allMoons();
    for (const s of stationPlaces(L)) {
      for (const pm of moons) expect(dist(s.pos, pm.pos)).toBeGreaterThan(pm.size * 1.25 + 1);
      for (const g of world) {
        if (g.kind === 'station' || g.size <= 0 || g.id === stationById(s.id)!.home) continue;
        expect(dist(s.pos, g.pos)).toBeGreaterThan(g.clear);
      }
    }
  });
  it('holds no orbit of its own', () => {
    for (const s of STATIONS) expect(orbitZone(at(s.id))).toBe(0);
  });
  it('lets the ship keep station alongside rather than orbit the planet beneath', () => {
    const g = at('stn-mars-1');
    const beside: V3 = [g.pos[0] + g.stop, g.pos[1], g.pos[2]];
    expect(orbitBody(beside, world)).toBeNull();
    expect(orbitBody(beside, world, 'mars')).toBeNull();
    const away: V3 = [g.pos[0] + g.arrive * 1.5, g.pos[1], g.pos[2]];
    expect(orbitBody(away, world)?.id).toBe('mars');
  });
  it('parks the autopilot within docking reach of the approach point, in ship lengths', () => {
    for (const s of STATIONS) {
      const g = at(s.id);
      expect(g.stop + parkSlack(g.stop, g.park)).toBeLessThan(BERTH.dockReach * L);
      expect(g.park! / L).toBeCloseTo(2, 9);
    }
    // The planets' tolerance (about 28 units) would have parked it far outside.
    const g = at('stn-earth-1');
    expect(g.stop + parkSlack(g.stop)).toBeGreaterThan(BERTH.dockReach * L * 4);
    expect(flightTime([500], g.stop, 0, g.park, g.parkSpeed)).toBeGreaterThan(flightTime([500], g.stop));
  });
});

describe('destinations: moons and stations', () => {
  it('adds the eleven major moons and the nineteen berths to the ten destinations', () => {
    expect(world.length).toBe(10 + 11 + 19);
    expect(ALL_DESTS).toEqual(world.map((g) => g.id));
    for (const id of ALL_DESTS) { expect(isDest(id)).toBe(true); expect(DEST_LABEL[id]).toBeTruthy(); }
    expect(isDest('phobos')).toBe(false);
    expect(DEST_LABEL['stn-jupiter-2']).toBe('Second Crown'); // its people's station (races.ts)
    expect(DEST_LABEL['stn-jupiter-4']).toBe('Crown of Zeus · Berth 4'); // a berth with no station of its own
    expect(isStation('stn-moon-1') && stationById('stn-moon-1')!.label).toBe('Tholos Station');
    expect(MAJOR_MOONS.every(isMajorMoon)).toBe(true);
  });
  it('puts a moon in its planet zone and a station in its home zone', () => {
    expect([destSphere('titan'), destSphere('io'), destSphere('stn-earth-2'), destSphere('stn-mars-1')]).toEqual(['saturn', 'jupiter', 'near', 'mars']);
  });
  it('keeps a route to a moon or a station through a save', () => {
    expect(routeFromSave({ stops: ['ganymede', 'stn-saturn-3', 'phobos'], index: 1, engaged: true, waiting: false }).stops).toEqual(['ganymede', 'stn-saturn-3']);
  });
});

describe('paths in the full world', () => {
  const start: V3 = [0, 0.6, at('earth').stop]; // parked off Earth (the old [6, 0.6, 10.4] is inside Earth at planet scale)
  it('flies the grand tour without passing through any moon, station or body', () => {
    const legs = planRoute(start, shipAxes(0, 0).fwd, TOUR_ROUTE, 0, world);
    expect(legs.length).toBe(10);
    for (const leg of legs) {
      const to = at(leg.dest);
      expect(pathMargin([leg.from, ...leg.vias, to.pos], pathObstacles(leg.from, to, world))).toBeGreaterThan(0);
    }
  });
  it('goes round the planet to a station on its far side', () => {
    const g = at('stn-earth-1');
    const far: V3 = [-g.pos[0] * 3, -g.pos[1] * 3, -g.pos[2] * 3];
    const vias = planPath(far, g, world);
    expect(vias.length).toBeGreaterThan(0);
    expect(pathMargin([far, ...vias, g.pos], [{ ...at('earth'), clear: at('earth').size }])).toBeGreaterThan(0);
  });
  it('reaches every moon and station from Earth, and from Mars, Jupiter and Saturn, around everything in the way', () => {
    for (const fromId of ['earth', 'mars', 'jupiter', 'saturn']) {
      const from = fromId === 'earth' ? start : parkPoint(start, at(fromId));
      for (const g of world.filter((x) => x.kind)) {
        const vias = planPath(from, g, world);
        expect(pathMargin([from, ...vias, g.pos], pathObstacles(from, g, world).filter((x) => x.id !== fromId))).toBeGreaterThan(0);
        // and never through the solid body of anything, home planet included
        expect(pathMargin([from, ...vias, g.pos], world.filter((x) => x.id !== g.id && x.size > 0 && x.kind !== 'station').map((x) => ({ ...x, clear: x.size })))).toBeGreaterThan(0);
      }
    }
  });
});

describe('paths and the god armour', () => {
  const arm = armourPlaces();
  const hits = (pts: V3[]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      for (const h of Object.keys(arm) as ArmourHome[]) if (segmentHitsArmour(arm[h].frame, arm[h].grid, pts[i], pts[i + 1], L * 2)) return h;
    }
    return null;
  };
  it('never routes through any plating: to every berth from Earth, Mars and Jupiter, and berth to berth on one world', () => {
    const start: V3 = [0, 0.6, at('earth').stop];
    for (const fromId of ['earth', 'mars', 'jupiter']) {
      const from = fromId === 'earth' ? start : parkPoint(start, at(fromId));
      for (const g of world.filter((x) => x.kind === 'station')) expect(hits([from, ...planPath(from, g, world), g.pos])).toBeNull();
    }
    for (const a of world.filter((x) => x.kind === 'station')) {
      for (const b of world.filter((x) => x.kind === 'station' && x.id !== a.id && stationById(x.id)!.home === stationById(a.id)!.home)) {
        expect(hits([a.pos, ...planPath(a.pos, b, world), b.pos])).toBeNull();
      }
    }
  });
  it('keeps the grand tour and every moon leg out of the plating', () => {
    const start: V3 = [0, 0.6, at('earth').stop];
    // A planet or moon is flown at and parked short of: the path ends at its parking point, not its centre.
    const park = (pts: V3[], g: (typeof world)[number]) => [...pts, parkPoint(pts[pts.length - 1], g)];
    for (const leg of planRoute(start, shipAxes(0, 0).fwd, TOUR_ROUTE, 0, world)) expect(hits(park([leg.from, ...leg.vias], at(leg.dest)))).toBeNull();
    for (const g of world.filter((x) => x.kind === 'moon')) expect(hits(park([start, ...planPath(start, g, world)], g))).toBeNull();
  });
});
