import { describe, expect, it } from 'vitest';
import { DODGE_DASH, THRUST, doubleTap, newDodge, stepLateral, stopLateral, tryDodge } from './thrust';
import type { Lateral } from './thrust';

const run = (lat: Lateral, input: Lateral, seconds: number, assist = true) => {
  let l = lat;
  let travelled = 0;
  for (let i = 0; i < seconds * 60; i++) { l = stepLateral(l, input, assist, 1 / 60); travelled += l.x / 60; }
  return { l, travelled };
};

describe('side and vertical thrusters', () => {
  it('reach their top speed under thrust in under half a second', () => {
    expect(run({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.45).l.x).toBeCloseTo(THRUST.strafe, 6);
    expect(run({ x: 0, y: 0 }, { x: 0, y: -1 }, 0.45).l.y).toBeCloseTo(-THRUST.strafe, 6);
  });
  it('flight assist damps side motion once let go; without it the ship drifts', () => {
    expect(Math.abs(run({ x: THRUST.strafe, y: 0 }, { x: 0, y: 0 }, 1).l.x)).toBeLessThan(0.2);
    expect(run({ x: THRUST.strafe, y: 0 }, { x: 0, y: 0 }, 1, false).l.x).toBeGreaterThan(5);
  });
  it('full stop kills side motion', () => {
    let l = { x: 6, y: -6 };
    for (let i = 0; i < 60; i++) l = stopLateral(l, 1 / 60);
    expect(Math.hypot(l.x, l.y)).toBeLessThan(0.03);
  });
});

describe('dodge dash', () => {
  it('a double-tap is two presses within the window, and a third press starts over', () => {
    const last = new Map<string, number>();
    expect(doubleTap(last, 'left', 1)).toBe(false);
    expect(doubleTap(last, 'left', 1.2)).toBe(true);
    expect(doubleTap(last, 'left', 1.3)).toBe(false);
    expect(doubleTap(last, 'left', 1.9)).toBe(false); // too slow
    expect(doubleTap(last, 'right', 1.95)).toBe(false); // another key
  });
  it('throws the ship well aside, then the speed bleeds back to nothing', () => {
    const s = newDodge();
    const lat = { x: 0, y: 0 };
    expect(tryDodge(s, lat, 1, 10, 100)).toEqual({ ok: true, cost: DODGE_DASH.cost });
    const { l, travelled } = run(lat, { x: 0, y: 0 }, 1.5);
    expect(travelled).toBeGreaterThan(3);
    expect(travelled).toBeLessThan(6);
    expect(Math.abs(l.x)).toBeLessThan(0.1);
  });
  it('has a cooldown and needs the capacitor', () => {
    const s = newDodge();
    const lat = { x: 0, y: 0 };
    expect(tryDodge(s, lat, -1, 10, 100).ok).toBe(true);
    expect(lat.x).toBe(-DODGE_DASH.impulse);
    expect(tryDodge(s, lat, -1, 10 + DODGE_DASH.cooldown - 0.01, 100)).toEqual({ ok: false, why: 'cooldown' });
    expect(tryDodge(s, lat, -1, 10 + DODGE_DASH.cooldown, DODGE_DASH.cost - 1)).toEqual({ ok: false, why: 'energy' });
    expect(tryDodge(s, lat, -1, 10 + DODGE_DASH.cooldown, DODGE_DASH.cost).ok).toBe(true);
    expect(s.count).toBe(2);
  });
  it('holding the key the same way keeps the thrusters going after the dash bleeds off', () => {
    const s = newDodge();
    const lat = { x: 0, y: 0 };
    tryDodge(s, lat, 1, 0, 100);
    expect(run(lat, { x: 1, y: 0 }, 1.5).l.x).toBeCloseTo(THRUST.strafe, 1);
  });
});
