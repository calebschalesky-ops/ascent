import { describe, expect, it } from 'vitest';
import { ATMO } from './atmosphere';
import { FACES, faceDir, groundColor, groundHeight, maxLevelFor, nodeEdge, selectLeaves, terrainHeight } from './terrain';
import type { GroundBody } from './terrain';
import { crater, fbm, ridged, snoise, worley } from './noise';

const BODIES: GroundBody[] = ['earth', 'moon', 'mercury', 'venus', 'mars'];
const len = (v: number[]) => Math.hypot(v[0], v[1], v[2]);

describe('noise', () => {
  it('is deterministic, bounded and continuous', () => {
    let prev = snoise(0.3, 0.7, 1.1);
    expect(snoise(0.3, 0.7, 1.1)).toBe(prev);
    let maxStep = 0;
    for (let i = 1; i < 2000; i++) {
      const v = snoise(0.3 + i * 0.001, 0.7, 1.1);
      expect(Math.abs(v)).toBeLessThanOrEqual(1.0001);
      maxStep = Math.max(maxStep, Math.abs(v - prev));
      prev = v;
    }
    expect(maxStep).toBeLessThan(0.02);
  });
  it('stays in range far from the origin (the float32 constants the GPU uses), with both signs', () => {
    for (let i = 0; i < 20000; i++) expect(Math.abs(snoise(Math.sin(i) * 300, Math.cos(i * 1.3) * 300, Math.sin(i * 0.7) * 300))).toBeLessThan(1.05);
    const vals = Array.from({ length: 200 }, (_, i) => snoise(i * 0.37, i * 0.11, i * 0.53));
    expect(Math.max(...vals)).toBeGreaterThan(0.3);
    expect(Math.min(...vals)).toBeLessThan(-0.3);
  });
  it('fbm, ridged, worley and crater stay in range', () => {
    for (let i = 0; i < 300; i++) {
      const [x, y, z] = [Math.sin(i) * 3, Math.cos(i * 1.3) * 3, Math.sin(i * 0.7) * 3];
      expect(Math.abs(fbm(x, y, z))).toBeLessThan(1);
      const r = ridged(x, y, z, 6);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
      const w = worley(x, y, z);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThan(1.5);
      expect(Math.abs(crater(x, y, z))).toBeLessThan(1);
    }
  });
});

describe('the cube-sphere', () => {
  it('maps every face point to a unit vector, face centres to the face normals', () => {
    for (let f = 0; f < 6; f++) {
      expect(faceDir(f, 0, 0)).toEqual(FACES[f].n.map((v) => v + 0)); // + 0 turns -0 into 0
      for (const [a, b] of [[-1, -1], [1, 1], [0.3, -0.7], [1, 0]]) expect(len(faceDir(f, a, b))).toBeCloseTo(1, 12);
    }
  });
  it('neighbouring faces meet along their edges with no gap', () => {
    // Face +x at a = 1 (its u axis is -z) is the edge shared with face -z at a = -1 (u axis -x).
    for (const b of [-0.8, -0.2, 0.4, 1]) {
      const p = faceDir(0, 1, b);
      const q = faceDir(5, -1, b);
      expect(len([p[0] - q[0], p[1] - q[1], p[2] - q[2]])).toBeLessThan(1e-12);
    }
  });
  it('splits the patches near the camera and keeps far ones coarse', () => {
    const maxL = 7;
    const leaves = selectLeaves([0, 1.002, 0], maxL); // just above the +y pole
    const finest = Math.max(...leaves.map((n) => n.level));
    expect(finest).toBe(maxL);
    // The patch under the camera is the finest; the far side of the planet stays at level 0 or 1.
    const under = leaves.filter((n) => n.face === 2 && n.level === maxL);
    expect(under.length).toBeGreaterThan(0);
    expect(Math.max(...leaves.filter((n) => n.face === 3).map((n) => n.level))).toBeLessThanOrEqual(2);
    // Far away, the whole planet is six patches.
    expect(selectLeaves([0, 40, 0], maxL).length).toBe(6);
    // A few hundred patches at most when skimming the ground.
    expect(leaves.length).toBeLessThan(600);
  });
  it('caps the level so vertices never get closer than asked', () => {
    const L = maxLevelFor(32, 0.12 / 370); // Earth at the planet-scale radius, 0.12-unit spacing
    expect(nodeEdge(L) / 32).toBeGreaterThanOrEqual(0.12 / 370);
    expect(nodeEdge(L + 1) / 32).toBeLessThan(0.12 / 370);
  });
});

describe('terrain heights', () => {
  it('stay within the body’s relief and are continuous', () => {
    for (const b of BODIES) {
      const relief = ATMO[b].relief;
      let prev = terrainHeight(b, 1, 0, 0);
      let maxStep = 0;
      for (let i = 1; i <= 3000; i++) {
        const a = i * 0.0005;
        const h = terrainHeight(b, Math.cos(a), Math.sin(a) * 0.6, Math.sin(a) * 0.8);
        expect(Math.abs(h)).toBeLessThan(relief * 1.2);
        maxStep = Math.max(maxStep, Math.abs(h - prev));
        prev = h;
      }
      // 0.0005 rad apart (0.18 units on a 370-unit Earth): never a cliff of more than a fifth of the relief.
      expect(maxStep).toBeLessThan(relief * 0.2);
    }
  });
  it('Earth has seas, plains and mountains; the sea surface is what you touch', () => {
    const hs: number[] = [];
    for (let i = 0; i < 4000; i++) {
      const u = (i * 0.618034) % 1;
      const v = (i * 0.414214) % 1;
      const th = 2 * Math.PI * u;
      const z = 2 * v - 1;
      const r = Math.sqrt(1 - z * z);
      hs.push(terrainHeight('earth', r * Math.cos(th), z, r * Math.sin(th)));
    }
    const relief = ATMO.earth.relief;
    const sea = hs.filter((h) => h < 0).length / hs.length;
    expect(sea).toBeGreaterThan(0.3);
    expect(sea).toBeLessThan(0.8);
    expect(hs.filter((h) => h > 0 && h < relief * 0.15).length).toBeGreaterThan(100); // plains
    expect(Math.max(...hs)).toBeGreaterThan(relief * 0.4); // mountains
    const [x, y, z] = [0.6, 0.0, 0.8];
    expect(groundHeight('earth', x, y, z)).toBe(Math.max(0, terrainHeight('earth', x, y, z)));
  });
  it('the Moon and Mercury are cratered (bowls below the mean)', () => {
    const hs = Array.from({ length: 2000 }, (_, i) => terrainHeight('moon', Math.cos(i * 0.01), Math.sin(i * 0.01), 0.3));
    expect(Math.min(...hs)).toBeLessThan(-ATMO.moon.relief * 0.2);
  });
  it('finer spacing only adds detail: coarse and fine agree to within a fraction of the relief', () => {
    for (const b of BODIES) {
      for (let i = 0; i < 50; i++) {
        const [x, y, z] = faceDir(i % 6, Math.sin(i) * 0.9, Math.cos(i * 1.7) * 0.9);
        const coarse = terrainHeight(b, x, y, z, 1e-2);
        const fine = terrainHeight(b, x, y, z, 1e-5);
        expect(Math.abs(fine - coarse)).toBeLessThan(ATMO[b].relief * 0.5);
      }
    }
  });
  it('colours are valid linear RGB', () => {
    for (const b of BODIES) for (const h of [-0.003, 0, 0.002, 0.01]) {
      const c = groundColor(b, 0.6, 0.48, 0.64, h, 0.3);
      for (const v of c) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1.5); }
    }
  });
});
