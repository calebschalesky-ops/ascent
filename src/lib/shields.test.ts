import { describe, expect, it } from 'vitest';
import { MUNITIONS } from './munitions';
import { SHIELDS, applyHit, drawShield, facetOf, makeDefence, regenerate, shieldFrac } from './shields';
import { ARMOURS } from './tech';

describe('shield and hull split', () => {
  it('a shield holds a hit it can take; the hull is untouched', () => {
    const d = makeDefence(SHIELDS.deflector, 100);
    const r = applyHit(d, MUNITIONS.pulse, 12);
    expect(r.toShield).toBe(12);
    expect(r.toHull).toBe(0);
    expect(d.shield[0]).toBe(88);
    expect(d.hull).toBe(100);
  });
  it('what the shield cannot hold carries to the hull at hullMul', () => {
    const d = makeDefence(SHIELDS.deflector, 100);
    d.shield[0] = 30;
    // Plasma: 40 raw × 0.5 = 20 wanted from the shield; it has 30, so all held.
    expect(applyHit(d, MUNITIONS.plasma, 40).toHull).toBe(0);
    // Now 10 left; 20 wanted → half the raw (20) carries over × 1.5 hull = 30.
    const r = applyHit(d, MUNITIONS.plasma, 40);
    expect(r.toShield).toBe(10);
    expect(r.toHull).toBeCloseTo(30, 9);
    expect(r.shieldDown).toBe(true);
  });
  it('a railgun slug sends 40% straight through a full shield', () => {
    const d = makeDefence(SHIELDS.deflector, 100);
    const r = applyHit(d, MUNITIONS.rail, 70);
    expect(r.toShield).toBeCloseTo(70 * 0.6 * 0.6, 9);
    expect(r.toHull).toBeCloseTo(70 * 0.4 * 1.2, 9);
  });
  it('a hardened shield resists energy and ion by its own figures', () => {
    const d = makeDefence(SHIELDS.hardened, 100);
    expect(applyHit(d, MUNITIONS.pulse, 12).toShield).toBeCloseTo(12 * 0.6, 9);
    expect(applyHit(d, MUNITIONS.ion, 30).toShield).toBeCloseTo(30 * 3 * 0.5, 9);
  });
  it('armour cuts what reaches the hull', () => {
    const d = makeDefence(SHIELDS.deflector, 100, 1, ARMOURS[2]);
    expect(d.maxHull).toBe(190);
    d.shield[0] = 0;
    expect(applyHit(d, MUNITIONS.rail, 70).toHull).toBeCloseTo(70 * 1.2 * 0.7, 9);
  });
  it('tiers scale capacity and regen', () => {
    const d = makeDefence(SHIELDS.deflector, 100, 3);
    expect(d.maxShield).toBeCloseTo(170, 9);
    expect(d.regen).toBeCloseTo(14 * 1.7, 9);
  });
});

describe('ion disable', () => {
  it('strips shields three times as fast and only disables once the shield is down', () => {
    const d = makeDefence(SHIELDS.deflector, 100);
    const a = applyHit(d, MUNITIONS.ion, 30); // 90 of 100
    expect(a.toShield).toBe(90);
    expect(a.disabled).toBe(false);
    const b = applyHit(d, MUNITIONS.ion, 30);
    expect(b.shieldDown).toBe(true);
    expect(b.disabled).toBe(true);
    expect(d.disabled).toBe(4);
    expect(d.hull).toBeGreaterThan(98); // barely scratched: the overflow × 0.05
  });
  it('a disabled ship does not regenerate until it recovers', () => {
    const d = makeDefence(SHIELDS.deflector, 100);
    d.shield[0] = 0;
    d.disabled = 4;
    d.since[0] = 10;
    regenerate(d, 2);
    expect(d.shield[0]).toBe(0);
    regenerate(d, 2.5); // recovers after 2 more seconds, then regenerates
    expect(d.disabled).toBe(0);
    expect(d.shield[0]).toBeGreaterThan(0);
  });
});

describe('regeneration', () => {
  it('waits for the delay after a hit, then refills at the regen rate, capped', () => {
    const d = makeDefence(SHIELDS.deflector, 100);
    applyHit(d, MUNITIONS.pulse, 50); // 50 off
    regenerate(d, 2.9);
    expect(d.shield[0]).toBe(50);
    regenerate(d, 0.1); // 3 s: the delay is over, so this step already refills 1.4
    regenerate(d, 1);
    expect(d.shield[0]).toBeCloseTo(50 + 1.4 + 14, 6);
    regenerate(d, 100);
    expect(d.shield[0]).toBe(100);
    expect(shieldFrac(d)).toBe(1);
  });
});

describe('bi-facet shield', () => {
  it('takes a hit from ahead on the front and from behind on the rear', () => {
    const d = makeDefence(SHIELDS.bifacet, 100);
    expect(facetOf(d, [0, 0, -1], [0, 0, -1])).toBe(0);
    expect(facetOf(d, [0, 0, -1], [0, 0, 1])).toBe(1);
    applyHit(d, MUNITIONS.pulse, 12, 1);
    expect(d.shield).toEqual([70, 58]);
    // A single-facet shield always answers 0.
    expect(facetOf(makeDefence(SHIELDS.deflector, 100), [0, 0, -1], [0, 0, 1])).toBe(0);
  });
});

describe('capacitor shield', () => {
  it('gives energy to the weapons and nothing more than it holds', () => {
    const d = makeDefence(SHIELDS.capacitor, 100);
    expect(drawShield(d, 10)).toBe(10);
    expect(d.shield[0]).toBe(50);
    expect(drawShield(d, 80)).toBe(50);
    expect(drawShield(makeDefence(SHIELDS.deflector, 100), 10)).toBe(0);
  });
});
