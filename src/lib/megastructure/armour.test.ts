import { describe, expect, it } from 'vitest';
import { ARMOUR, ARMOUR_HOMES, Plate, armourFrame, armourGrid, armourPush, cellDir, cellIndex, coverage, plateTop, segmentHitsArmour } from './armour';
import type { ArmourHome, V3 } from './armour';
import { destGeometry } from '../nav';

const geo = destGeometry();
const frameOf = (h: ArmourHome) => { const g = geo.find((x) => x.id === h)!; return armourFrame(h, { pos: g.pos, size: g.size }); };
const at = (c: V3, d: V3, r: number): V3 => [c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r];
const rad = (p: V3, c: V3) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);

describe('god armour', () => {
  // The accepted reference sheets (art-refit/01-PLANETS-AND-ARMOR.md, Results) replaced the first pass's "a third or more
  // of every world": the armour leaves its planet readable, Mercury's is the lightest and Mars is fully bare (its shields
  // ride a ring clear of the planet). Coverage is the share of directions from the centre that meet plating.
  it('covers each world as its sheet rules: open enough to read the planet, Mercury lightest', () => {
    const cov = Object.fromEntries(ARMOUR_HOMES.map((h) => { const f = frameOf(h); return [h, coverage(f, armourGrid(f))]; }));
    const band: Record<ArmourHome, [number, number]> = {
      earth: [0.12, 0.3], moon: [0.15, 0.5], mercury: [0.02, 0.1], venus: [0.18, 0.45], mars: [0.08, 0.2], jupiter: [0.06, 0.2], saturn: [0.005, 0.05],
    };
    for (const h of ARMOUR_HOMES) {
      expect(cov[h]).toBeGreaterThan(band[h][0]);
      expect(cov[h]).toBeLessThan(band[h][1]);
    }
    for (const h of ARMOUR_HOMES) if (h !== 'saturn' && h !== 'mercury') expect(cov.mercury).toBeLessThan(cov[h]);
  });
  it('sits clear of the air (top 1.06 R rocky, 1.035 R giants); Mars’s ring clear of the planet, Saturn’s wall on the rings’ edge', () => {
    for (const h of ARMOUR_HOMES) {
      const s = ARMOUR[h];
      expect(s.rIn).toBeGreaterThan(h === 'jupiter' || h === 'saturn' ? 1.035 : 1.06);
      expect(s.rOut).toBeGreaterThan(s.rIn);
      if (h !== 'mars' && h !== 'saturn') expect(s.rOut).toBeLessThan(1.21);
    }
    expect(ARMOUR.mars.rIn).toBeGreaterThan(1.3);
    expect(ARMOUR.saturn.rIn).toBeGreaterThan(2.27); // the rings end at 2.27 R (voyageScene.ts)
  });
  it('puts fewer plates on Battery saver, and no structure past 30,000 plates', () => {
    const n = (x: Uint8Array) => x.reduce((a, p) => a + (p ? 1 : 0), 0);
    for (const h of ARMOUR_HOMES) {
      const f = frameOf(h);
      expect(n(armourGrid(f, true).plates)).toBeLessThan(n(armourGrid(f).plates) * 0.4);
      expect(n(armourGrid(f).plates)).toBeLessThan(30000);
    }
  });
  it('keeps a ship out of the plating from either side, and lets it through an open cell', () => {
    for (const h of ARMOUR_HOMES) {
      const f = frameOf(h);
      const g = armourGrid(f);
      let solid: [number, number] | null = null;
      let open: [number, number] | null = null;
      for (let i = 3; i < g.rings - 3 && !(solid && open); i++) {
        for (let j = 1; j < g.per[i] - 1; j++) {
          const p = g.plates[g.start[i] + j];
          const nb = [g.plates[g.start[i] + j - 1], g.plates[g.start[i] + j + 1]];
          if (!solid && p && p !== Plate.Trench && nb.every((x) => x && x !== Plate.Trench)) solid = [i, j];
          if (!open && !p && nb.every((x) => !x)) open = [i, j];
        }
      }
      expect(solid && open).toBeTruthy();
      const ds = cellDir(f, g, solid![0], solid![1]);
      expect(cellIndex(f, g, ds).k).toBe(g.start[solid![0]] + solid![1]);
      const mid = (f.rIn + f.rOut) / 2;
      const pad = 0.2;
      const pushed = armourPush(f, g, at(f.centre, ds, mid), at(f.centre, ds, f.rOut * 1.05), pad)!;
      expect(rad(pushed, f.centre)).toBeGreaterThanOrEqual(plateTop(f, g.plates[g.start[solid![0]] + solid![1]]) + pad - 1e-6);
      expect(rad(pushed, f.centre)).toBeLessThanOrEqual(f.rOut + pad + 1e-6);
      const under = armourPush(f, g, at(f.centre, ds, mid), at(f.centre, ds, f.rIn * 0.98), pad)!;
      expect(rad(under, f.centre)).toBeCloseTo(f.rIn - pad, 6);
      expect(segmentHitsArmour(f, g, at(f.centre, ds, f.rOut * 1.1), at(f.centre, ds, f.rIn * 0.9), 0.05)).toBe(true);
      const dO = cellDir(f, g, open![0], open![1]);
      expect(armourPush(f, g, at(f.centre, dO, mid), at(f.centre, dO, f.rOut * 1.05), 1e-4)).toBeNull();
    }
  });
});
