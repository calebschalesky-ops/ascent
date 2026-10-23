import { describe, expect, it } from 'vitest';
import {
  AIR, AIR_BODIES, ATMO, airBlend, airSpeedStep, altFrac, buffet, crushAccel, density, dragDecel, heating, liftShare,
  maxAirspeed, plasmaGlow, pullUp, sinkAccel, skyAt, timeToGround,
} from './atmosphere';

describe('density by altitude', () => {
  it('is rho0 at the datum, exactly 0 at the top and above, and falls monotonically between', () => {
    for (const b of AIR_BODIES) {
      const s = ATMO[b];
      expect(density(s, 0)).toBeCloseTo(s.rho0, 10);
      expect(density(s, s.top)).toBe(0);
      expect(density(s, s.top * 2)).toBe(0);
      let prev = Infinity;
      for (let h = -s.top / 2; h < s.top; h += s.top / 50) {
        const d = density(s, h);
        expect(d).toBeLessThan(prev);
        prev = d;
      }
    }
  });
  it('falls by about e per scale height low down', () => {
    const s = ATMO.earth;
    expect(density(s, s.scale) / density(s, 0)).toBeCloseTo(Math.exp(-1), 2);
  });
  it('keeps the real order: Venus thick, Earth, Mars thin; the Moon and Mercury are marked as game choices', () => {
    expect(ATMO.venus.rho0).toBeGreaterThan(ATMO.earth.rho0);
    expect(ATMO.mars.rho0).toBeLessThan(ATMO.earth.rho0 / 10);
    expect(ATMO.moon.physical).toBe(false);
    expect(ATMO.mercury.physical).toBe(false);
    expect(ATMO.jupiter.surface).toBe(false);
    expect(ATMO.saturn.surface).toBe(false);
  });
  it('grows below the datum on a gas giant', () => {
    const s = ATMO.jupiter;
    expect(density(s, -s.crush)).toBeGreaterThan(s.rho0 * 10);
  });
  it('altFrac measures from the datum in radii', () => {
    expect(altFrac(103, 100)).toBeCloseTo(0.03);
  });
});

describe('the space-to-air blend', () => {
  it('is 0 at the top, 1 at the datum, and smooth in between', () => {
    for (const b of AIR_BODIES) {
      const s = ATMO[b];
      expect(airBlend(s, s.top)).toBe(0);
      expect(airBlend(s, 0)).toBe(1);
      expect(airBlend(s, -0.01)).toBe(1);
      // No jumps: neighbouring samples never differ by more than a few percent.
      let prev = 1;
      for (let i = 1; i <= 400; i++) {
        const k = airBlend(s, (s.top * i) / 400);
        expect(Math.abs(k - prev)).toBeLessThan(0.05);
        prev = k;
      }
    }
  });
  it('lets the space model back at the top: no drag, no sink, no speed cap', () => {
    const s = ATMO.earth;
    expect(maxAirspeed(density(s, s.top))).toBe(Infinity);
    expect(sinkAccel(s, s.top, 0)).toBe(0);
    expect(dragDecel(density(s, s.top), 500)).toBe(0);
  });
});

describe('drag and speed', () => {
  it('drag equals the thrust at the top speed, and rises with the square of speed and with density', () => {
    expect(dragDecel(1, AIR.vSea)).toBeCloseTo(AIR.thrust);
    expect(dragDecel(1, 2 * AIR.vSea)).toBeCloseTo(4 * AIR.thrust);
    expect(dragDecel(2, AIR.vSea)).toBeCloseTo(2 * AIR.thrust);
  });
  it('the top speed falls as 1/√density: thick Venus slow, thin Mars fast', () => {
    expect(maxAirspeed(1)).toBe(AIR.vSea);
    expect(maxAirspeed(4)).toBeCloseTo(AIR.vSea / 2);
    expect(maxAirspeed(ATMO.venus.rho0)).toBeLessThan(AIR.vSea);
    expect(maxAirspeed(ATMO.mars.rho0)).toBeGreaterThan(AIR.vSea * 5);
  });
  it('full throttle in sea-level air settles at the top speed and never passes it', () => {
    let v = 0;
    let peak = 0;
    for (let i = 0; i < 30 * 20; i++) { v = airSpeedStep(v, 1e6, 1, 1 / 30); peak = Math.max(peak, v); }
    expect(v).toBeCloseTo(AIR.vSea, 1);
    expect(peak).toBeLessThanOrEqual(AIR.vSea + 1e-9);
  });
  it('arriving fast, the air slows the ship toward its top speed', () => {
    let v = AIR.entry;
    for (let i = 0; i < 30 * 3; i++) v = airSpeedStep(v, 1e6, 0.5, 1 / 30);
    expect(v).toBeLessThan(maxAirspeed(0.5) * 1.05);
  });
});

describe('lift and gravity', () => {
  it('the engines always carry the hover share; above the stall speed the wings carry it all', () => {
    expect(liftShare(0, 1)).toBe(AIR.hover);
    expect(liftShare(AIR.vStall * 2, 1)).toBe(1);
    // Thin air needs more speed for the same lift.
    expect(liftShare(AIR.vStall, 0.02)).toBeLessThan(liftShare(AIR.vStall, 1));
  });
  it('a stopped ship sinks slowly near the ground; a fast one does not', () => {
    const s = ATMO.earth;
    expect(sinkAccel(s, 0, 0)).toBeCloseTo(AIR.g * (1 - AIR.hover));
    expect(sinkAccel(s, 0, AIR.vSea)).toBe(0);
    expect(sinkAccel(ATMO.jupiter, 0, 0)).toBeGreaterThan(sinkAccel(s, 0, 0));
  });
});

describe('entry heating, buffeting, crush depth', () => {
  it('heats as √density × speed³ (Sutton–Graves)', () => {
    expect(heating(0.2, 100) / heating(0.05, 100)).toBeCloseTo(2);
    expect(heating(0.05, 200) / heating(0.05, 100)).toBeCloseTo(8);
    expect(heating(0, 1000)).toBe(0);
  });
  it('no glow at a cruise, a strong glow on a hard entry', () => {
    expect(plasmaGlow(1, AIR.vSea)).toBeLessThan(0.05);
    expect(plasmaGlow(0.05, AIR.entry)).toBeGreaterThan(0.9);
  });
  it('buffets on entry, not in vacuum', () => {
    expect(buffet(0, 5000)).toBe(0);
    expect(buffet(0.05, AIR.entry)).toBeGreaterThan(0.5);
  });
  it('pushes back only near the crush depth, hardest at it, and never on a body with ground', () => {
    const s = ATMO.jupiter;
    expect(crushAccel(s, 0)).toBe(0);
    expect(crushAccel(s, -s.crush * 0.6)).toBe(0);
    expect(crushAccel(s, -s.crush * 0.85)).toBeGreaterThan(0);
    expect(crushAccel(s, -s.crush)).toBeCloseTo(AIR.crushPush);
    expect(crushAccel(s, -s.crush)).toBeGreaterThan(AIR.thrust); // stronger than the engines: it wins
    expect(crushAccel(ATMO.earth, -1)).toBe(0);
  });
});

describe('the sky', () => {
  it('is black in space and covers the stars low in thick air by day', () => {
    const s = ATMO.earth;
    expect(skyAt(s, s.top, 1).cover).toBe(0);
    expect(skyAt(s, 0, 1).cover).toBeGreaterThan(0.9);
    // At night the stars come back.
    expect(skyAt(s, 0, -0.5).cover).toBeLessThan(0.35);
  });
  it('deepens from black to the planet’s colour as you descend', () => {
    const s = ATMO.earth;
    const hi = skyAt(s, s.top * 0.8, 1).zenith;
    const lo = skyAt(s, 0, 1).zenith;
    expect(lo[2]).toBeGreaterThan(hi[2]);
    expect(lo[2]).toBeCloseTo(s.zenith[2], 5);
  });
  it('a thin air gives a thin sky', () => {
    expect(skyAt(ATMO.moon, 0, 1).cover).toBeLessThan(skyAt(ATMO.earth, 0, 1).cover);
  });
});

describe('pull up', () => {
  it('warns when the ground is close on this line, not when climbing', () => {
    expect(timeToGround(10, 5)).toBe(2);
    expect(timeToGround(10, -5)).toBe(Infinity);
    expect(pullUp(10, 5)).toBe(true);
    expect(pullUp(10, 1)).toBe(false);
    expect(pullUp(2, 1)).toBe(false);
    expect(pullUp(2, 2)).toBe(true);
  });
});
