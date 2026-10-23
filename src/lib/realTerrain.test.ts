import { beforeAll, describe, expect, it } from 'vitest';
import { EARTH_L0_F4 } from './__fixtures__/earthTile';
import { faceDir } from './terrain';
import { TILE_N, decodeTile, detailM, dirToFace, inflate, latLonOf, sampleTile, tileOf } from './realTerrain';
import type { DataSample, Tile } from './realTerrain';
import type { GroundBody } from './terrain';

// A real tile: Earth, level 0, face 4 (+Z, centred on 0°N 90°W), as built by ascent-flight-data/scripts/tiler.py.
// The reference values were decoded by the Python tiler; this checks the browser decoder reads the same samples.
let raw = new Uint8Array(0);
beforeAll(async () => {
  raw = await inflate(Uint8Array.from(atob(EARTH_L0_F4), (c) => c.charCodeAt(0)));
});
const OFFSET = -10900;
const SCALE0 = 8;

describe('real terrain tiles', () => {
  it('decodes the v2 format exactly as the Python tiler wrote it', () => {
    const v = decodeTile(raw);
    expect(v.length).toBe(TILE_N * TILE_N);
    const at = (y: number, x: number) => v[y * TILE_N + x];
    expect([at(0, 0), at(129, 129), at(258, 258), at(17, 201)]).toEqual([774, 1217, 770, 1397]);
    let sum = 0;
    for (const x of v) sum += x;
    expect(sum).toBe(70763224);
  });

  it('samples a tile bicubically: exact on a sample, smooth between, with the data spacing as the slope run', () => {
    const t: Tile = { L: 0, f: 4, i: 0, j: 0, v: decodeTile(raw), scale: SCALE0, offset: OFFSET };
    const d: DataSample = { h: 0, rough: 0, slope: 0 };
    // Face centre (a = b = 0) is sample (129, 129): 0°N 90°W, the Pacific floor off the Galápagos.
    sampleTile(t, 0, 0, 39000, d);
    expect(d.h).toBe(OFFSET + SCALE0 * 1217);
    let prev = sampleTile(t, -0.01, 0, 39000, d).h;
    let worst = 0;
    for (let k = 1; k <= 200; k++) {
      const h = sampleTile(t, -0.01 + k * 1e-4, 0, 39000, d).h;
      worst = Math.max(worst, Math.abs(h - prev));
      prev = h;
    }
    expect(worst).toBeLessThan(200); // 1e-4 of a face is ~160 m: no jumps between samples
  });

  it('inverts faceDir on every face, edges and corners included', () => {
    const p: [number, number, number] = [0, 0, 0];
    const o: [number, number, number] = [0, 0, 0];
    for (let f = 0; f < 6; f++) for (const a of [-1, -0.73, 0, 0.31, 0.999]) for (const b of [-0.999, -0.2, 0, 0.5, 1]) {
      faceDir(f, a, b, p);
      dirToFace(p[0], p[1], p[2], o);
      const q: [number, number, number] = [0, 0, 0];
      faceDir(o[0], o[1], o[2], q);
      expect(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])).toBeLessThan(1e-9);
      if (Math.abs(a) < 0.99 && Math.abs(b) < 0.99) {
        expect(o[0]).toBe(f);
        expect(o[1]).toBeCloseTo(a, 9);
        expect(o[2]).toBeCloseTo(b, 9);
      }
    }
  });

  it("uses conquest's latitude and longitude: longitude 0 on +X, east towards -Z, north on +Y", () => {
    expect(latLonOf(1, 0, 0).lat).toBeCloseTo(0);
    expect(latLonOf(1, 0, 0).lon).toBeCloseTo(0);
    expect(latLonOf(0, 0, -1).lon).toBeCloseTo(90);
    expect(latLonOf(0, 0, 1).lon).toBeCloseTo(-90); // face 4's centre, as above
    expect(latLonOf(0, 1, 0).lat).toBeCloseTo(90);
    expect(tileOf(3, 0.99, -0.99)).toEqual([7, 0]);
  });

  it('adds no detail where the data already resolves the vertices, and bounded detail below it', () => {
    const d: DataSample = { h: 1200, rough: 40, slope: 0.1 };
    const bodies: GroundBody[] = ['earth', 'moon', 'mars', 'mercury', 'venus'];
    for (const b of bodies) {
      expect(detailM(b, 0.3, 0.5, 0.81, 6e6, 1000, 1000, d)).toBe(0);
      let worst = 0;
      for (let k = 0; k < 400; k++) {
        const x = Math.cos(k), y = Math.sin(k * 0.7), z = 0.4;
        const l = Math.hypot(x, y, z);
        worst = Math.max(worst, Math.abs(detailM(b, x / l, y / l, z / l, 6e6, 1000, 60, d)));
      }
      expect(worst).toBeGreaterThan(0);
      expect(worst).toBeLessThan(600); // detail under 1 km data never builds a mountain
    }
  });
});
