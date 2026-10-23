import { describe, expect, it } from 'vitest';
import type { V3 } from './nav';
import { dist, dot, len, sub, unit } from './nav';
import { MUNITIONS } from './munitions';
import type { Occluder } from './tactics';
import { avoidBodies, bears, bestCover, blockedBy, broadsideFace, clearShot, effectiveRange, fleetPlan, focusTarget, hidden, inGlare, orbitVel, rotateAbout, standoffRange, sunApproach } from './tactics';
import { AI } from './aiKnobs';

const planet: Occluder = { pos: [50, 0, 0], r: 10, kind: 'body' };

describe('line of sight and cover', () => {
  it('a planet between two points blocks the line; one off to the side does not', () => {
    expect(blockedBy([0, 0, 0], [100, 0, 0], [planet])).toBe(planet);
    expect(blockedBy([0, 0, 0], [100, 30, 0], [planet])).toBeNull();
    expect(clearShot([0, 0, 0], [100, 0, 0], [planet])).toBe(false);
  });
  it('the shooter and the target do not block their own line', () => {
    const me: Occluder = { pos: [0, 0, 0], r: 2, kind: 'ship', id: 1 };
    const them: Occluder = { pos: [100, 30, 0], r: 2, kind: 'ship', id: 2 };
    expect(clearShot([0, 0, 0], [100, 30, 0], [me, them], 1, 2)).toBe(true);
    const between: Occluder = { pos: [50, 15, 0], r: 2, kind: 'ship', id: 3 };
    expect(clearShot([0, 0, 0], [100, 30, 0], [me, them, between], 1, 2)).toBe(false);
  });
  it('best cover puts the planet between the ship and the player', () => {
    const player: V3 = [0, 0, 0];
    const c = bestCover([60, 40, 0], 1.1, 9, player, [planet], 70, 300)!;
    expect(c.behind).toBe(planet);
    expect(hidden(c.point, 9, player, [planet])).toBe(true);
    expect(dist(c.point, player)).toBeGreaterThanOrEqual(70);
  });
  it('a ship can use a friendly ship as cover, and prefers a planet when both are near', () => {
    const player: V3 = [0, 0, 0];
    const cruiser: Occluder = { pos: [0, 0, 40], r: 0.7, kind: 'ship', id: 2 };
    const onlyShip = bestCover([5, 0, 80], 1.1, 1, player, [cruiser], 70, 300)!;
    expect(onlyShip.behind).toBe(cruiser);
    expect(hidden(onlyShip.point, 1, player, [cruiser])).toBe(true);
    const both = bestCover([30, 0, 60], 1.1, 1, player, [cruiser, planet], 70, 300)!;
    expect(both.behind).toBe(planet);
  });
  it('no cover within reach: null', () => {
    expect(bestCover([0, 0, 500], 1, 1, [0, 0, 0], [planet], 70, 50)).toBeNull();
  });
});

describe('ranges and arcs', () => {
  it('effective range is a share of each munition’s reach', () => {
    expect(effectiveRange(MUNITIONS.pulse)).toBeCloseTo(260 * 1.6 * 0.5);
    expect(effectiveRange(MUNITIONS.beam)).toBeCloseTo(120 * 0.85);
  });
  it('a warship that outranges the player kites just outside the player’s reach', () => {
    const playerPulse = [MUNITIONS.pulse];
    const rail = standoffRange('cruiser', [MUNITIONS.rail], playerPulse);
    expect(rail).toBeCloseTo(effectiveRange(MUNITIONS.pulse) * AI.kite);
    expect(rail).toBeGreaterThan(effectiveRange(MUNITIONS.pulse));
  });
  it('a short-ranged warship holds near its own reach, never under its class minimum', () => {
    const beam = standoffRange('capital', [MUNITIONS.beam, MUNITIONS.flak], [MUNITIONS.rail]);
    expect(beam).toBeCloseTo(Math.max(AI.minStandoff.capital, effectiveRange(MUNITIONS.flak) * 0.85));
    expect(standoffRange('cruiser', [MUNITIONS.mine], [MUNITIONS.pulse])).toBe(AI.minStandoff.cruiser);
  });
  it('standoff scales with the world', () => {
    const a = standoffRange('cruiser', [MUNITIONS.pulse], [MUNITIONS.pulse], 1, 1);
    expect(standoffRange('cruiser', [MUNITIONS.pulse].map((m) => ({ ...m, speed: m.speed * 2 })), [MUNITIONS.pulse].map((m) => ({ ...m, speed: m.speed * 2 })), 1, 2)).toBeCloseTo(a * 2);
  });
  it('weapon arcs: nose, forward hemisphere, broadside', () => {
    const fwd: V3 = [0, 0, -1];
    expect(bears('nose', fwd, [0, 0.05, -1])).toBe(true);
    expect(bears('nose', fwd, [0, 0.3, -1])).toBe(false);
    expect(bears('forward', fwd, [1, 0, -1])).toBe(true);
    expect(bears('forward', fwd, [0, 0, 1])).toBe(false);
    expect(bears('broadside', fwd, [1, 0, 0])).toBe(true);
    expect(bears('broadside', fwd, [0, 0, -1])).toBe(false);
  });
  it('broadside heading is perpendicular to the target and near the current heading', () => {
    const f = broadsideFace([0.3, 0, -1], [1, 0, 0]);
    expect(Math.abs(dot(f, [1, 0, 0]))).toBeLessThan(1e-9);
    expect(dot(f, [0, 0, -1])).toBeGreaterThan(0.9);
  });
  it('orbit velocity runs along the ring and corrects toward its radius', () => {
    const v = orbitVel([100, 0, 0], [0, 0, 0], 100, 10, 1);
    expect(len(v)).toBeCloseTo(10);
    expect(Math.abs(dot(unit(v), [1, 0, 0]))).toBeLessThan(1e-6);
    expect(dot(orbitVel([150, 0, 0], [0, 0, 0], 100, 10, 1), [1, 0, 0])).toBeLessThan(0); // too far: comes in
  });
});

describe('the Sun', () => {
  it('a sun approach comes from the Sun’s side of the player', () => {
    const p = sunApproach([10, 0, 0], [1000, 0, 0], 50);
    expect(p).toEqual([60, 0, 0]);
  });
  it('a target in front of the Sun is in its glare; one off to the side is not', () => {
    expect(inGlare([0, 0, 0], [50, 1, 0], [450, 0, 0], 218, 0.08)).toBe(true);
    expect(inGlare([0, 0, 0], [0, 50, 0], [450, 0, 0], 218, 0.08)).toBe(false);
  });
});

describe('not flying into bodies', () => {
  it('a ship heading straight at a planet bends away and keeps its speed', () => {
    const pos: V3 = [0, 0, 0];
    const vel: V3 = [20, 0, 0];
    const v = avoidBodies(pos, vel, [planet], 4, 3);
    expect(len(v)).toBeCloseTo(20);
    // Fly it: follow the corrected velocity step by step and never touch the surface.
    let p = pos, w = vel, min = Infinity;
    for (let i = 0; i < 200; i++) {
      w = avoidBodies(p, w, [planet], 4, 3);
      p = [p[0] + w[0] * 0.05, p[1] + w[1] * 0.05, p[2] + w[2] * 0.05];
      min = Math.min(min, dist(p, planet.pos));
      w = [w[0] * 0.9 + 2, w[1] * 0.9, w[2] * 0.9]; // it keeps wanting to go +x
    }
    expect(min).toBeGreaterThan(planet.r);
  });
  it('a clear path is left alone', () => {
    expect(avoidBodies([0, 50, 0], [20, 0, 0], [planet], 4, 3)).toEqual([20, 0, 0]);
  });
  it('ships are not avoided as bodies (they are cover, and fly)', () => {
    expect(avoidBodies([0, 0, 0], [20, 0, 0], [{ ...planet, kind: 'ship' }], 4, 3)).toEqual([20, 0, 0]);
  });
});

describe('the fleet', () => {
  const player: V3 = [0, 0, 0];
  const ships = [
    { id: 1, cls: 'capital' as const, pos: [300, 0, 0] as V3, standoff: 150 },
    { id: 2, cls: 'cruiser' as const, pos: [280, 0, 20] as V3, standoff: 100 },
    { id: 3, cls: 'cruiser' as const, pos: [280, 0, -20] as V3, standoff: 100 },
    { id: 4, cls: 'fighter' as const, pos: [290, 0, 0] as V3, standoff: 0 },
    { id: 5, cls: 'fighter' as const, pos: [290, 5, 0] as V3, standoff: 0 },
  ];
  it('capital on the line, cruisers on either flank (a pincer), fighters screening the capital', () => {
    const plan = fleetPlan(ships, player, ships[0].pos, null, 0);
    expect(plan.get(1)!.role).toBe('line');
    const a = plan.get(2)!.slot!, b = plan.get(3)!.slot!;
    expect(plan.get(2)!.role).toBe('flank');
    expect(len(a)).toBeCloseTo(100);
    // The two cruisers sit either side of the line, about 2 × pincer apart as seen from the player.
    const line = unit(sub(plan.get(1)!.slot!, player));
    const ang = Math.acos(dot(unit(a), unit(b)));
    expect(ang).toBeCloseTo(2 * AI.pincer, 1);
    expect(dot(unit(a), line)).toBeCloseTo(Math.cos(AI.pincer), 1);
    expect(plan.get(4)!.role).toBe('screen');
    expect(plan.get(5)!.role).toBe('strike');
    expect(dist(plan.get(4)!.slot!, ships[0].pos)).toBeLessThan(AI.screenDist * 1.5);
  });
  it('slots do not move with the ship being placed (a lone cruiser does not chase its own slot)', () => {
    const lone = [{ id: 2, cls: 'cruiser' as const, pos: [100, 0, 0] as V3, standoff: 100 }];
    const a = fleetPlan(lone, player, [300, 0, 0], null, 0).get(2)!.slot!;
    const b = fleetPlan([{ ...lone[0], pos: a }], player, [300, 0, 0], null, 0).get(2)!.slot!;
    expect(dist(a, b)).toBeLessThan(1e-9);
  });
  it('once the player is close to the capital ship, every fighter strikes', () => {
    const plan = fleetPlan(ships, [250, 0, 0], ships[0].pos, null, 0);
    expect(plan.get(4)!.role).toBe('strike');
    expect(plan.get(5)!.role).toBe('strike');
  });
  it('a sun-loving fleet swings its line toward the Sun', () => {
    const plain = fleetPlan(ships, player, ships[0].pos, null, 0).get(1)!.slot!;
    const sunny = fleetPlan(ships, player, ships[0].pos, [0, 0, 1000], 0.5).get(1)!.slot!;
    expect(sunny[2]).toBeGreaterThan(plain[2] + 50);
  });
  it('focus fire picks the threat, then the most hurt', () => {
    const c = [{ id: 1, pos: [10, 0, 0] as V3, hullFrac: 1, threat: 1 }, { id: 2, pos: [10, 0, 0] as V3, hullFrac: 0.2, threat: 0 }];
    expect(focusTarget(c, [0, 0, 0], 1000)).toBe(1);
    expect(focusTarget(c.map((x) => ({ ...x, threat: 0 })), [0, 0, 0], 1000)).toBe(2);
    expect(focusTarget([], [0, 0, 0], 1)).toBeNull();
  });
  it('rotateAbout turns a vector round an axis', () => {
    const r = rotateAbout([1, 0, 0], [0, 1, 0], Math.PI / 2);
    expect(r[2]).toBeCloseTo(-1);
  });
});
