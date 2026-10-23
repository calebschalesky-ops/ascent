import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { NATIONS } from '../../lib/nations';
import { createFleet, modelLength } from './fleet';
import type { SpaceUniforms } from './materials';

describe('fleet.make special', () => {
  // The special path never reads the uniforms (only the fallback cruiser does).
  const fleet = createFleet({} as SpaceUniforms);
  const meshes = (o: THREE.Object3D) => { const out: THREE.Mesh[] = []; o.traverse((c) => { if (c instanceof THREE.Mesh) out.push(c); }); return out; };

  it.each(NATIONS.map((n) => [n.id, n] as const))('%s: fitted to the asked length, one mesh per material, copies share the template', (_, n) => {
    const a = fleet.make('special', n, 7);
    const b = fleet.make('special', n, 3);
    expect(modelLength(a)).toBeCloseTo(7, 3);
    expect(modelLength(b)).toBeCloseTo(3, 3);
    const ma = meshes(a), mb = meshes(b);
    expect(new Set(ma.map((m) => m.material)).size).toBe(ma.length);
    expect(ma.map((m) => m.geometry)).toEqual(mb.map((m) => m.geometry));
    expect(ma.map((m) => m.material)).toEqual(mb.map((m) => m.material));
  });
});
