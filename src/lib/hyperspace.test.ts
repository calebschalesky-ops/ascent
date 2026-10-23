import { describe, expect, it } from 'vitest';
import { HYPER, along, dropPoint, engagementRange, jumpPath, jumpTime, minDropRadius, refusal, spaceOf, travelTime } from './hyperspace';
import type { Hostile, JumpCheck } from './hyperspace';
import { worldGeometry } from './world';
import { dist, len, sub } from './nav';
import type { V3 } from './nav';
import { KM_PER_UNIT } from './bodies';

const L = 0.18 * 2.06;
const geo = worldGeometry(L);
const at = (id: string) => geo.find((g) => g.id === id)!;

describe('hyperspace: the clock (J1)', () => {
  it('arrives within 5 s from Earth to Mars and to Saturn, and distance barely changes it', () => {
    const mars = jumpTime(dist(at('earth').pos, at('mars').pos));
    const saturn = jumpTime(dist(at('earth').pos, at('saturn').pos));
    const moon = jumpTime(dist(at('earth').pos, at('moon').pos));
    for (const t of [mars, saturn, moon]) expect(t).toBeLessThanOrEqual(5);
    expect(saturn - mars).toBeLessThan(0.5);
    expect(moon).toBeGreaterThanOrEqual(HYPER.spool + HYPER.travelMin + HYPER.exit);
  });
  it('never runs the tunnel longer than travelMax, however far', () => {
    expect(travelTime(1e15)).toBe(HYPER.travelMax);
    expect(travelTime(10)).toBe(HYPER.travelMin);
  });
  it('walks a polyline by length', () => {
    const pts: V3[] = [[0, 0, 0], [10, 0, 0], [10, 10, 0]];
    expect(along(pts, 0)).toEqual([0, 0, 0]);
    expect(along(pts, 0.5)).toEqual([10, 0, 0]);
    expect(along(pts, 0.75)).toEqual([10, 5, 0]);
    expect(along(pts, 1)).toEqual([10, 10, 0]);
  });
  it('goes round the Sun rather than through it', () => {
    // From the far side of the Sun to a point beyond it: the path must keep clear of the Sun's surface.
    const sun = at('sun');
    const from: V3 = [sun.pos[0] - sun.size * 50, 0, sun.pos[2]];
    const to: V3 = [sun.pos[0] + sun.size * 50, 0, sun.pos[2]];
    const p = jumpPath(from, to, geo);
    expect(p.length).toBeGreaterThan(2);
    for (let s = 0; s <= 1; s += 0.01) expect(dist(along(p, s), sun.pos)).toBeGreaterThan(sun.size);
  });
});

describe('hyperspace: where it drops you (J2)', () => {
  it('drops low over Earth, outside its armour and set pieces, on the side you came from', () => {
    const earth = at('earth');
    const from = at('mars').pos;
    const d = dropPoint(earth, from, [], L, { others: geo });
    expect(d.clear).toBe(true);
    expect(d.r).toBeGreaterThan(earth.shell!);
    expect(d.r).toBeLessThan(earth.shell! * 1.05);
    // On the Mars side.
    const toMars = sub(from, earth.pos);
    const out = sub(d.pos, earth.pos);
    expect((toMars[0] * out[0] + toMars[1] * out[1] + toMars[2] * out[2]) / (len(toMars) * len(out))).toBeGreaterThan(0.99);
  });
  it('drops above the air of a world with no armour shell', () => {
    const sun = at('sun');
    const d = dropPoint(sun, at('earth').pos, [], L);
    expect(d.r).toBeGreaterThanOrEqual(minDropRadius(sun, L));
    expect(d.alt).toBeGreaterThan(0);
  });
  it('keeps out of every hostile engagement range at the moment of the jump', () => {
    const earth = at('earth');
    const from = at('mars').pos;
    const first = dropPoint(earth, from, [], L, { others: geo });
    // A patrol sits right on the preferred drop point, another a little to one side.
    const hostiles: Hostile[] = [{ pos: first.pos, reach: 900 * 2.06 }, { pos: [first.pos[0] + 3000, first.pos[1], first.pos[2]], reach: 600 * 2.06 }];
    const d = dropPoint(earth, from, hostiles, L, { others: geo });
    expect(d.clear).toBe(true);
    for (const h of hostiles) expect(dist(d.pos, h.pos)).toBeGreaterThanOrEqual(engagementRange(h));
    // Still close: the nearest clear point, not the far side of the world.
    expect(dist(d.pos, first.pos)).toBeLessThan(engagementRange(hostiles[0]) * 3);
    expect(d.r).toBeLessThan(earth.shell! * 1.2);
  });
  it('drops at the edge of their range when no clear point exists in the body’s space', () => {
    const moon = at('moon');
    // A hostile whose range swallows the Moon's whole space.
    const h: Hostile = { pos: moon.pos, reach: spaceOf(moon) * 2 };
    const d = dropPoint(moon, at('earth').pos, [h], L, { others: geo });
    expect(d.clear).toBe(false);
    expect(d.intrusion).toBeGreaterThan(0);
    expect(d.intrusion).toBeLessThan(engagementRange(h) - minDropRadius(moon, L) + 1);
  });
  it('comes down to the plating where the set pieces allow, and goes round a piece in the way', () => {
    const earth = at('earth');
    const from = at('mars').pos;
    const low = dropPoint(earth, from, [], L, { others: geo, blocked: () => false });
    expect(low.r).toBeLessThan(earth.shell!);
    expect(low.r).toBeGreaterThan(earth.top!);
    // A set piece over the preferred point: the drop moves off it.
    const pref = low.pos;
    const d = dropPoint(earth, from, [], L, { others: geo, blocked: (p) => dist(p, pref) < 5000 });
    expect(dist(d.pos, pref)).toBeGreaterThanOrEqual(5000);
    expect(d.r).toBeLessThan(earth.shell!);
  });
  it('arrival heights over Earth, Mars and Jupiter (for the report)', () => {
    for (const id of ['earth', 'mars', 'jupiter']) {
      const d = dropPoint(at(id), at(id === 'earth' ? 'mars' : 'earth').pos, [], L, { others: geo, blocked: () => false });
      expect(d.alt * KM_PER_UNIT).toBeGreaterThan(0);
      console.log(`drop over ${id}: ${Math.round(d.alt * KM_PER_UNIT).toLocaleString('en-US')} km up (${(d.r / at(id).size).toFixed(3)} R) with no set piece in the way`);
    }
  });
});

describe('hyperspace: when it refuses (J3)', () => {
  const ok: JumpCheck = { target: true, jumping: false, docked: false, inside: false, lockedOn: 0, hostiles: [], pos: [0, 0, 0], toBody: 1e9, space: 1e5 };
  it('jumps when nothing stops it', () => expect(refusal(ok)).toBeNull());
  it('refuses under a missile lock, docked, inside a body, already jumping or with no target', () => {
    expect(refusal({ ...ok, lockedOn: 1 })).toBe('locked');
    expect(refusal({ ...ok, docked: true })).toBe('docked');
    expect(refusal({ ...ok, inside: true })).toBe('inside');
    expect(refusal({ ...ok, jumping: true })).toBe('busy');
    expect(refusal({ ...ok, target: false })).toBe('noTarget');
  });
  it('is mass-locked by an armed hostile inside the lock, not by one outside it or an unarmed one', () => {
    expect(refusal({ ...ok, hostiles: [{ pos: [HYPER.massLock * 0.9, 0, 0], reach: 100 }] })).toBe('massLock');
    expect(refusal({ ...ok, hostiles: [{ pos: [HYPER.massLock * 1.1, 0, 0], reach: 100 }] })).toBeNull();
    expect(refusal({ ...ok, hostiles: [{ pos: [10, 0, 0], reach: 100, armed: false }] })).toBeNull();
  });
  it('will not jump within the destination’s own space', () => {
    expect(refusal({ ...ok, toBody: 5e4, space: 1e5 })).toBe('here');
  });
});
