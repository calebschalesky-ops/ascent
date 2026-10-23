import { describe, expect, it } from 'vitest';
import {
  TOUR_ROUTE, AUTO, BODY, COSMOS, DESTS, EMPTY_ROUTE, VR, bearingTo, destGeometry, dist, flightTime, fmtBearing, fmtEta,
  lonLatOf, parkPoint, pathMargin, planLeg, planPath, planRoute, routeAdd, routeContinue, routeFromSave, routeMove, routeRemove,
  shipAxes, len, AU, add, sub, zoneOf,
} from './nav';
import type { DestGeo, V3 } from './nav';
import { KM_PER_UNIT, LAYOUT, ORBIT_AU } from './bodies';
import type { PlanetId } from './bodies';

// The game's fixed layout, plus eight scrambled ones, so the path tests do not depend on one arrangement.
// (These replace the nine dated layouts the-ascent's tests computed.)
type Layout = Record<PlanetId | 'stars', number>;
const scrambled = (k: number): Layout => Object.fromEntries(Object.entries(LAYOUT).map(([id, a], i) => [id, (a + k * 37 * (i + 1)) % 360])) as Layout;
const LAYOUTS: Layout[] = [LAYOUT, ...[1, 2, 3, 4, 5, 6, 7, 8].map(scrambled)];
/** Where a fresh flight starts (Voyage): just outside the outermost shell around Earth. */
const START: V3 = [12 * COSMOS, 0.6 * COSMOS, 0];

describe('destinations', () => {
  it('runs the grand tour from Earth outward to the edge', () => {
    expect(TOUR_ROUTE).toEqual(['earth', 'moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn', 'stars', 'edge']);
    expect(DESTS).toEqual(TOUR_ROUTE);
  });
  it('puts every body at its true distance: the Sun 1 AU from Earth, the planets on their orbits round it, the Moon round Earth', () => {
    const geo = destGeometry();
    const at = (id: string) => geo.find((x) => x.id === id)!;
    const sun = at('sun').pos;
    expect(len(sun) / AU).toBeCloseTo(1, 9);
    expect(lonLatOf(sun).lon).toBeCloseTo(LAYOUT.sun, 6);
    expect(len(at('moon').pos) * KM_PER_UNIT).toBeCloseTo(384400, 3);
    for (const p of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
      const g = at(p);
      expect(dist(g.pos, sun) / AU).toBeCloseTo(ORBIT_AU[p], 9);
      expect(lonLatOf(sub(g.pos, sun)).lon).toBeCloseTo(LAYOUT[p], 6);
      expect(g.size).toBeCloseTo(BODY[p], 9);
      expect(len(g.pos)).toBeCloseTo(VR[p], 3);
    }
    // In ship lengths: Earth to the Sun about 3.74e9 lengths of the 40 m cruiser (ships x5 smaller, 2026-10-21).
    expect(len(sun) / 0.3708).toBeCloseTo(3.74e9, -7);
  });
  it('tells the zone from where you are: Hill spheres first, then the band of the nearest orbit', () => {
    const geo = destGeometry();
    const at = (id: string) => geo.find((x) => x.id === id)!.pos;
    expect(zoneOf([VR.earth * 3, 0, 0])).toBe('near');
    expect(zoneOf(add(at('moon'), [BODY.moon * 3, 0, 0]))).toBe('moon');
    expect(zoneOf(add(at('jupiter'), [BODY.jupiter * 40, 0, 0]))).toBe('jupiter');
    expect(zoneOf(add(at('sun'), [AU * 0.1, 0, 0]))).toBe('sun');
    expect(zoneOf(add(at('sun'), [0, 0, AU * 3.5]))).toBe('jupiter'); // nearest orbit band: 3.5 AU is past halfway to Jupiter
    expect(zoneOf(add(at('sun'), [0, 0, AU * 11.5]))).toBe('stars');
  });
  it('gives the Sun its true scale: 109.2 Earth radii', () => {
    expect(BODY.sun / VR.earth).toBeGreaterThan(109.1);
    expect(BODY.sun / VR.earth).toBeLessThan(109.3);
  });
  it('makes Earth its true size: 6,371 km, 159,275 lengths of a 40 m cruiser', () => {
    const SHIP_LENGTH = 2.06 * 0.18; // the hull, nose to engine bells, times Voyage's SHIP scale
    expect(VR.earth / SHIP_LENGTH).toBeGreaterThan(159000);
    expect(VR.earth / SHIP_LENGTH).toBeLessThan(159500);
    expect(BODY.jupiter / VR.earth).toBeCloseTo(69911 / 6371, 6);
  });
});

describe('paths around bodies', () => {
  const sun: DestGeo = { id: 'sun', pos: [0, 0, 0], size: 218, arrive: 349, stop: 305, clear: 273.5 };
  const mars: DestGeo = { id: 'mars', pos: [800, 0, 0], size: 1, arrive: 6, stop: 3, clear: 2.25 };
  it('flies straight when nothing is in the way', () => {
    expect(planPath([800, 0, 300], mars, [sun, mars])).toEqual([]);
  });
  it('goes around the Sun rather than through it', () => {
    const from: V3 = [-800, 0, 0];
    const vias = planPath(from, mars, [sun, mars]);
    expect(vias.length).toBeGreaterThan(0);
    expect(pathMargin([from, ...vias, mars.pos], [sun])).toBeGreaterThan(0);
  });
  it('flies the tour’s Mars to Jupiter leg wide of the Sun now that orbits are true (it was the detour test until real scale)', () => {
    const geo = destGeometry();
    const at = (id: string) => geo.find((g) => g.id === id)!;
    const from = parkPoint(at('sun').pos, at('mars'));
    expect(pathMargin([from, at('jupiter').pos], [at('sun')]) / AU).toBeGreaterThan(1);
  });
  it('never passes through a body on any leg between any two stops, in many layouts', () => {
    let legs = 0;
    for (const layout of LAYOUTS) {
      const geo = destGeometry(layout);
      for (const a of geo) {
        for (const b of geo) {
          if (a.id === b.id) continue;
          // Start where the autopilot would have parked at a, coming in from Earth's side.
          const start = a.id === 'earth' ? START : parkPoint([0, 0, 0], a);
          const vias = planPath(start, b, geo);
          const others = geo.filter((g) => g.id !== b.id);
          expect(pathMargin([start, ...vias, b.pos], others)).toBeGreaterThan(-1e-6);
          // The last turn is made outside the destination's own body; from there the line runs straight at it
          // and the autopilot parks on the near side.
          const last = vias.length ? vias[vias.length - 1] : start;
          expect(dist(last, b.pos)).toBeGreaterThan(b.size);
          legs++;
        }
      }
    }
    expect(legs).toBe(LAYOUTS.length * 90);
  });
});

describe('ETAs', () => {
  it('grows with distance', () => {
    let prev = 0;
    for (const d of [5, 20, 80, 300, 900, 2000]) {
      const t = flightTime([d * COSMOS], 2 * COSMOS);
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });
  it('cruises at top speed on a long leg', () => {
    const a = flightTime([20000 * COSMOS], 2 * COSMOS);
    const b = flightTime([40000 * COSMOS], 2 * COSMOS);
    expect(b - a).toBeCloseTo((20000 * COSMOS) / AUTO.speed, 0);
  });
  it('matches the measured 8–16 s legs of the parked autopilot (session 7)', () => {
    const geo = destGeometry();
    const moon = geo.find((g) => g.id === 'moon')!;
    const t = planLeg(START, null, moon, geo).eta;
    expect(t).toBeGreaterThan(4);
    expect(t).toBeLessThan(20);
  });
  it('is zero when already parked', () => {
    expect(flightTime([3 * COSMOS], 3 * COSMOS)).toBe(0);
  });
  it('sums a route leg by leg from where each stop parks', () => {
    const geo = destGeometry();
    const legs = planRoute(START, [0, 0, -1], TOUR_ROUTE, 0, geo);
    expect(legs.map((l) => l.dest)).toEqual(TOUR_ROUTE);
    for (const l of legs) expect(l.eta).toBeGreaterThanOrEqual(0);
    const total = legs.reduce((s, l) => s + l.eta, 0);
    expect(total).toBeGreaterThan(60);
    expect(total).toBeLessThan(10000); // step 3 of real scale: true distances at sublight; step 4 (hyperdrive) pins it again
    expect(planRoute(START, [0, 0, -1], TOUR_ROUTE, 4, geo).map((l) => l.dest)).toEqual(TOUR_ROUTE.slice(4));
  });
  it('formats times plainly', () => {
    expect(fmtEta(null)).toBe('—');
    expect(fmtEta(Infinity)).toBe('—');
    expect(fmtEta(0.4)).toBe('<1 s');
    expect(fmtEta(42)).toBe('42 s');
    expect(fmtEta(100)).toBe('1 m 40 s');
    expect(fmtEta(3 * 3600 + 120)).toBe('3 h 02 m');
  });
});

describe('bearings and heading', () => {
  it('reads ahead, right, left, up and astern off the nose', () => {
    const ax = shipAxes(0, 0); // nose toward −z
    expect(bearingTo([0, 0, 0], ax, [0, 0, -10]).az).toBeCloseTo(0);
    expect(bearingTo([0, 0, 0], ax, [10, 0, 0]).az).toBeCloseTo(90);
    expect(bearingTo([0, 0, 0], ax, [-10, 0, 0]).az).toBeCloseTo(-90);
    expect(Math.abs(bearingTo([0, 0, 0], ax, [0, 0, 10]).az)).toBeCloseTo(180);
    expect(bearingTo([0, 0, 0], ax, [0, 10, -10]).el).toBeCloseTo(45);
    expect(fmtBearing(0.3, 0)).toBe('ahead');
    expect(fmtBearing(-35.2, -4)).toBe('35° L, 4° down');
    expect(fmtBearing(179, 88)).toBe('88° up');
  });
  it('keeps right-handed axes when pitched and turned', () => {
    const ax = shipAxes(1.1, 0.4);
    expect(len(ax.up)).toBeCloseTo(1);
    expect(bearingTo([5, 5, 5], ax, [5 + ax.fwd[0], 5 + ax.fwd[1], 5 + ax.fwd[2]]).az).toBeCloseTo(0);
    expect(bearingTo([0, 0, 0], ax, ax.up).el).toBeCloseTo(90);
  });
  it('reads the angle the nose points to', () => {
    // Yaw −90° faces +x: angle 0.
    expect(lonLatOf(shipAxes(-Math.PI / 2, 0).fwd).lon).toBeCloseTo(0);
    // Yaw 0 faces −z: angle 90.
    expect(lonLatOf(shipAxes(0, 0).fwd).lon).toBeCloseTo(90);
    expect(lonLatOf(shipAxes(0, 0.3).fwd).lat).toBeCloseTo((0.3 * 180) / Math.PI);
  });
});

describe('route editing', () => {
  const r = { stops: TOUR_ROUTE.slice(0, 4), index: 2, engaged: true, waiting: false };
  it('adds a stop at the end', () => {
    expect(routeAdd(EMPTY_ROUTE, 'mars').stops).toEqual(['mars']);
    expect(routeAdd(r, 'saturn').stops[4]).toBe('saturn');
  });
  it('removing an earlier stop keeps flying to the same one', () => {
    const x = routeRemove(r, 0);
    expect(x.stops[x.index]).toBe('mercury');
  });
  it('removing the current stop moves on to the next', () => {
    const x = routeRemove({ ...r, waiting: true }, 2);
    expect(x.stops[x.index]).toBe('venus');
    expect(x.waiting).toBe(false);
  });
  it('removing the last stop empties the route', () => {
    expect(routeRemove({ stops: ['sun'], index: 0, engaged: true, waiting: false }, 0)).toEqual(EMPTY_ROUTE);
  });
  it('reordering keeps the current destination', () => {
    const x = routeMove(r, 2, -1);
    expect(x.stops).toEqual(['earth', 'mercury', 'moon', 'venus']);
    expect(x.stops[x.index]).toBe('mercury');
  });
  it('continue steps through every stop in order, then finishes', () => {
    let x = { stops: [...TOUR_ROUTE], index: 0, engaged: true, waiting: true };
    const seen = [x.stops[x.index]];
    while (x.index < x.stops.length) { x = routeContinue({ ...x, waiting: true }); if (x.index < x.stops.length) seen.push(x.stops[x.index]); }
    expect(seen).toEqual(TOUR_ROUTE);
    expect(x.engaged).toBe(false);
  });
  it('reads a saved route back safely', () => {
    expect(routeFromSave({ stops: ['moon', 'pluto', 'sun'], index: 9, engaged: true, waiting: true })).toEqual({ stops: ['moon', 'sun'], index: 2, engaged: false, waiting: false });
    expect(routeFromSave(null)).toEqual(EMPTY_ROUTE);
    expect(routeFromSave({ stops: ['venus'], index: 0, engaged: true, waiting: false }).engaged).toBe(true);
  });
  it('parks short of the body on the side it came from', () => {
    const b: DestGeo = { id: 'mars', pos: [100, 0, 0], size: 1, arrive: 6, stop: 3, clear: 2 };
    expect(dist(parkPoint([0, 0, 0], b), [97, 0, 0])).toBeCloseTo(0);
  });
});

describe('orbits', () => {
  const geo = destGeometry();
  const at = (id: string) => geo.find((g) => g.id === id)!;
  it('orbits Earth from the starting point, and nothing out among the stars', async () => {
    const { orbitBody } = await import('./nav');
    expect(orbitBody(START, geo)?.id).toBe('earth');
    expect(orbitBody([0, 1200 * COSMOS, 0], geo)).toBeNull();
  });
  it('picks the body you are parked at', async () => {
    const { orbitBody } = await import('./nav');
    for (const id of ['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn']) {
      expect(orbitBody(parkPoint([0, 0, 0], at(id)), geo)?.id).toBe(id);
    }
  });
  it('keeps the current body just past its zone, then lets go', async () => {
    const { orbitBody, orbitZone } = await import('./nav');
    const m = at('mars');
    const p: V3 = [m.pos[0], m.pos[1] + orbitZone(m) * 1.05, m.pos[2]];
    expect(orbitBody(p, geo)).toBeNull();
    expect(orbitBody(p, geo, 'mars')?.id).toBe('mars');
    expect(orbitBody([m.pos[0], orbitZone(m) * 1.2, m.pos[2]], geo, 'mars')).toBeNull();
  });
  it('keeps the distance to the body and moves anticlockwise seen from above', async () => {
    const { orbitStep } = await import('./nav');
    const c: V3 = [100, 0, 0];
    const p: V3 = [110, 2, 0];
    const q = orbitStep(p, c, 0.3);
    expect(dist(q, c)).toBeCloseTo(dist(p, c), 9);
    expect(q[1]).toBe(2);
    expect(lonLatOf([q[0] - c[0], 0, q[2] - c[2]]).lon).toBeCloseTo((0.3 * 180) / Math.PI, 6);
  });
  it('laps in 45 s at the parking distance and slower further out', async () => {
    const { orbitPeriod } = await import('./nav');
    const moon = at('moon');
    expect(orbitPeriod(moon, moon.stop)).toBeCloseTo(45);
    expect(orbitPeriod(moon, moon.stop * 2)).toBeGreaterThan(120);
  });
  it('never sweeps the Sun orbit through another planet', async () => {
    const { orbitZone } = await import('./nav');
    for (const layout of LAYOUTS) {
      const g = destGeometry(layout);
      const sun = g.find((x) => x.id === 'sun')!;
      for (const b of g) if (b.id !== 'sun' && b.size) expect(dist(b.pos, sun.pos) - b.size).toBeGreaterThan(orbitZone(sun));
    }
  });
});

describe('latitude', () => {
  it('never shows a negative zero', async () => {
    const { fmtLat } = await import('./nav');
    expect(fmtLat(-0.2)).toBe('0°');
    expect(fmtLat(3.4)).toBe('+3°');
    expect(fmtLat(-12.25, 1)).toBe('−12.3°');
  });
});

describe('saves across ships ×5 smaller (scale-jump-danger S2)', () => {
  it('brings a ship saved with 200 m ships back at the same body, the same side, the same height in radii', async () => {
    const { COSMOS, COSMOS_200M, migratePos, destGeometry, dist, sub, unit } = await import('./nav');
    expect(COSMOS / COSMOS_200M).toBeCloseTo(5, 9);
    const geo = destGeometry();
    for (const id of ['earth', 'moon', 'mars', 'jupiter', 'saturn'] as const) {
      const now = geo.find((g) => g.id === id)!;
      // The body as it was saved: every position and size 1/5 of today's.
      const was = { pos: now.pos.map((v) => v / 5) as [number, number, number], size: now.size / 5 };
      const off: [number, number, number] = [was.size * 1.9, was.size * 0.4, -was.size * 0.7];
      const saved: [number, number, number] = [was.pos[0] + off[0], was.pos[1] + off[1], was.pos[2] + off[2]];
      const back = migratePos(saved, COSMOS_200M);
      expect(dist(back, now.pos) / now.size).toBeCloseTo(dist(saved, was.pos) / was.size, 6);
      const a = unit(sub(back, now.pos));
      const b = unit(off);
      expect(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]).toBeCloseTo(1, 9);
    }
    // A save from before any rescale (no scale) is still read as before.
    expect(migratePos([1, 2, 3])).toEqual([COSMOS, 2 * COSMOS, 3 * COSMOS]);
  });
  it('moves a saved infantry carrier with the world, and reads a fresh save unchanged', async () => {
    const { migrateInfantry } = await import('./infantry/persist');
    const { newInfantry, newCarrier } = await import('./infantry/carrier');
    const { COSMOS, COSMOS_200M } = await import('./nav');
    const inf = newInfantry();
    newCarrier(inf, 'player', 'earth', 'Test', [100, 200, -300]);
    const old = JSON.parse(JSON.stringify(inf));
    delete old.scale; // written with 200 m ships
    const up = migrateInfantry(old)!;
    expect(up.carriers[0].pos[0]).toBeCloseTo(100 * (COSMOS / COSMOS_200M), 6);
    expect(up.scale).toBe(COSMOS);
    const same = migrateInfantry(JSON.parse(JSON.stringify(inf)))!;
    expect(same.carriers[0].pos).toEqual([100, 200, -300]);
  });
});
