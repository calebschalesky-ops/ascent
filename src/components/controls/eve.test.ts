import { describe, expect, it } from 'vitest';
import type { V3 } from '../../lib/nav';
import { shipAxes } from '../../lib/nav';
import { aimError, aimRates, angleBetween } from './aim';
import { EVE, flyCommand, isDoubleClick, orbitDrag, orbitOffset, trackedGun, zoomStep } from './eve';

const UP: V3 = [0, 1, 0];

/** Voyage's space turn with a held heading: rates ease toward what aimRates asks, then integrate. */
function holdHeading(dir: V3, seconds: number, maxYaw = 1.2, maxPitch = 0.95) {
  const s = { yaw: 0, pitch: 0, yawRate: 0, pitchRate: 0 };
  const dt = 1 / 60;
  for (let i = 0; i < seconds * 60; i++) {
    const r = aimRates(aimError(dir, shipAxes(s.yaw, s.pitch).fwd, UP), maxYaw, maxPitch, { yaw: s.yawRate, pitch: s.pitchRate });
    const ease = 1 - Math.exp(-dt * 5);
    s.yawRate += (r.yaw - s.yawRate) * ease;
    s.pitchRate += (r.pitch - s.pitchRate) * ease;
    s.yaw += s.yawRate * dt;
    s.pitch = Math.max(-1.4, Math.min(1.4, s.pitch + s.pitchRate * dt));
  }
  return s;
}

describe('EVE camera (E2)', () => {
  it('a left-drag swings the camera round the ship and never touches the heading', () => {
    const o = orbitDrag({ yaw: 0, pitch: EVE.pitch0 }, 450, 0);
    expect(o.yaw).toBeCloseTo(-Math.PI / 2, 6); // a 450-pixel drag right: a quarter turn
    expect(o.pitch).toBeCloseTo(EVE.pitch0, 9);
  });
  it('dragging down raises the camera; invert flips it; it stops short of straight overhead', () => {
    expect(orbitDrag({ yaw: 0, pitch: 0 }, 0, 100).pitch).toBeLessThan(0);
    expect(orbitDrag({ yaw: 0, pitch: 0 }, 0, 100, 1, true).pitch).toBeGreaterThan(0);
    expect(orbitDrag({ yaw: 0, pitch: 0 }, 0, 1e5).pitch).toBe(-EVE.pitchLimit);
  });
  it('the camera sits behind the ship along the way it looks', () => {
    const [x, y, z] = orbitOffset({ yaw: 0, pitch: 0 }, 2);
    expect(x).toBeCloseTo(0, 9); // looking along −z, so behind is +z
    expect(y).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(2, 9);
    const f = shipAxes(0.7, -0.3).fwd;
    const off = orbitOffset({ yaw: 0.7, pitch: -0.3 }, 1);
    expect(off[0]).toBeCloseTo(-f[0], 9);
    expect(off[1]).toBeCloseTo(-f[1], 9); // a camera looking down sits above
    expect(off[2]).toBeCloseTo(-f[2], 9);
  });
  it('zoom moves a notch at a time within its range', () => {
    expect(zoomStep(1, 1)).toBeCloseTo(EVE.notch, 9);
    expect(zoomStep(1, -1)).toBeCloseTo(1 / EVE.notch, 9);
    let z = 1;
    for (let i = 0; i < 100; i++) z = zoomStep(z, 1);
    expect(z).toBe(EVE.zoomMax);
    for (let i = 0; i < 100; i++) z = zoomStep(z, -1);
    expect(z).toBe(EVE.zoomMin);
  });
});

describe('double-click to fly (E3)', () => {
  it('two clicks close in time and place are a double-click; slow or apart are not', () => {
    const a = { t: 10, x: 300, y: 200 };
    expect(isDoubleClick(a, 10.2, 303, 202)).toBe(true);
    expect(isDoubleClick(a, 10.5, 300, 200)).toBe(false);
    expect(isDoubleClick(a, 10.1, 330, 200)).toBe(false);
    expect(isDoubleClick(null, 10.1, 300, 200)).toBe(false);
  });
  it('from a stop the engines open to a cruise; moving, the throttle stays', () => {
    expect(flyCommand(0)).toBe(EVE.goThrottle);
    expect(flyCommand(0.62)).toBe(0.62);
  });
  it('the nose converges on the clicked direction and holds it', () => {
    const clicked = shipAxes(2.2, 0.5).fwd; // well behind and above: a long turn
    const s = holdHeading(clicked, 6);
    expect(angleBetween(shipAxes(s.yaw, s.pitch).fwd, clicked)).toBeLessThan(EVE.onHeading);
    expect(Math.abs(s.yawRate) + Math.abs(s.pitchRate)).toBeLessThan(0.02);
  });
  it('a capital ship takes the same turn slower', () => {
    const clicked = shipAxes(1.5, 0).fwd;
    const cruiser = holdHeading(clicked, 1);
    const capital = holdHeading(clicked, 1, 1.2 * 0.35, 0.95 * 0.35);
    expect(capital.yaw).toBeLessThan(cruiser.yaw * 0.6);
  });
});

describe('E6: the guns track the selected target inside the arc', () => {
  const nose: V3 = [0, 0, -1];
  it('fires along the nose with nothing selected', () => {
    expect(trackedGun([0, 0, 0], nose, null, 400, 300)).toEqual({ dir: nose, inArc: true, tracking: false });
  });
  it('leads a crossing target inside the arc', () => {
    const g = trackedGun([0, 0, 0], nose, { pos: [0, 0, -100], vel: [50, 0, 0] }, 400, 300);
    expect(g.tracking).toBe(true);
    expect(g.dir[0]).toBeGreaterThan(0.05); // ahead of the target, toward where it is going
    expect(Math.hypot(...g.dir)).toBeCloseTo(1, 6);
  });
  it('falls back to the nose, out of arc, when the target is behind or beyond reach', () => {
    expect(trackedGun([0, 0, 0], nose, { pos: [0, 0, 100], vel: [0, 0, 0] }, 400, 300).inArc).toBe(false);
    expect(trackedGun([0, 0, 0], nose, { pos: [0, 0, -1000], vel: [0, 0, 0] }, 400, 300)).toMatchObject({ inArc: false, dir: nose });
  });
  it('the arc edge sits at EVE.gunArc', () => {
    const a = EVE.gunArc - 0.01, b = EVE.gunArc + 0.01;
    expect(trackedGun([0, 0, 0], nose, { pos: [Math.sin(a) * 100, 0, -Math.cos(a) * 100], vel: [0, 0, 0] }, 400, 300).tracking).toBe(true);
    expect(trackedGun([0, 0, 0], nose, { pos: [Math.sin(b) * 100, 0, -Math.cos(b) * 100], vel: [0, 0, 0] }, 400, 300).tracking).toBe(false);
  });
});

describe('E6: the lead allows for a turning target', () => {
  /** Fly a bolt along the gun line and return its closest pass to a fighter on a circle. */
  function missOnCircle(withAcc: boolean) {
    const R = 31, w = 2.4, speed = 260; // a fighter's hard turn, the pulse bolt
    const at = (t: number): V3 => [R * Math.cos(w * t), 0, -60 + R * Math.sin(w * t)];
    const vel: V3 = [0, 0, R * w];
    const acc: V3 = [-R * w * w, 0, 0];
    const g = trackedGun([0, 0, 0], [0, 0, -1], { pos: at(0), vel, acc: withAcc ? acc : undefined }, speed, 400);
    let best = Infinity;
    for (let t = 0; t < 1; t += 0.0005) {
      const b = g.dir.map((x) => x * speed * t);
      const f = at(t);
      best = Math.min(best, Math.hypot(b[0] - f[0], b[1] - f[1], b[2] - f[2]));
    }
    return best;
  }
  it('misses by metres with a straight-line lead and by under half a unit with the acceleration term', () => {
    expect(missOnCircle(false)).toBeGreaterThan(3);
    expect(missOnCircle(true)).toBeLessThan(0.5);
  });
});
