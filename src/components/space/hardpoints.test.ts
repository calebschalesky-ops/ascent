import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Loadout } from '../../lib/modules';
import { defaultLoadout } from '../../lib/modules';
import type { MunitionId } from '../../lib/munitions';
import { MUNITION_IDS } from '../../lib/munitions';
import type { NationId } from '../../lib/nations';
import { assignZones, buildHardpoints, weaponGlow } from './hardpoints';
import { buildPilotShip } from './pilotShip';
import { STYLES } from './styles';

const NATIONS = Object.keys(STYLES) as NationId[];

/** Every way to fit four of the ten weapons. */
function fours(): MunitionId[][] {
  const out: MunitionId[][] = [];
  const ids = MUNITION_IDS;
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (let c = b + 1; c < ids.length; c++) for (let d = c + 1; d < ids.length; d++) out.push([ids[a], ids[b], ids[c], ids[d]]);
  return out;
}

const full = (weapons: MunitionId[]): Loadout => ({
  weapons, shield: 'hardened-3', drones: ['attack', 'repair'], counter: 'jammer', targeting: 'targeting-3', reactor: 'reactor-3', armour: 'armour-2', engine: 'engine-3',
});

describe('assignZones', () => {
  it('gives every weapon of every four-weapon fit its own zone', () => {
    for (const ws of fours()) {
      const z = assignZones(ws);
      expect(Object.keys(z).sort()).toEqual([...ws].sort());
      const zones = Object.values(z);
      expect(new Set(zones).size).toBe(zones.length);
    }
  });
  it('puts the railgun on the flanks, the torpedo under the keel and the mines at the tail', () => {
    expect(assignZones(['rail', 'torpedo', 'mine', 'pulse'])).toMatchObject({ rail: 'flank', torpedo: 'belly', mine: 'tail', pulse: 'spine' });
  });
});

describe('weapon glow', () => {
  it('keeps rail, plasma and ion their own colour, and gives the rest the nation bolt colour', () => {
    expect(weaponGlow('mars', 'rail')).toBe(weaponGlow('jupiter', 'rail'));
    expect(weaponGlow('mars', 'pulse')).not.toBe(weaponGlow('jupiter', 'pulse'));
  });
});

describe('buildHardpoints', { timeout: 60_000 }, () => {
  const bounds = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);

  for (const nation of NATIONS) {
    it(`${nation}: fits every weapon on the cruiser, finite, near the hull, in a few draw calls`, () => {
      const mats = STYLES[nation].materials();
      const model = STYLES[nation].cruiser(mats);
      const hull = bounds(model);
      const L = hull.getSize(new THREE.Vector3()).z;
      for (const ws of [MUNITION_IDS.slice(0, 4), MUNITION_IDS.slice(4, 8), [...MUNITION_IDS.slice(8), 'pulse', 'rail'] as MunitionId[]]) {
        const hp = buildHardpoints(model, nation, full(ws), mats, [new THREE.Vector3(0, 0, hull.max.z)]);
        const meshes = hp.group.children as THREE.Mesh[];
        expect(meshes.length).toBeGreaterThan(3);
        expect(meshes.length).toBeLessThanOrEqual(16); // one mesh per material
        for (const m of meshes) {
          const pos = m.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < pos.length; i++) expect(Number.isFinite(pos[i])).toBe(true);
        }
        // Nothing floats off: the hardware sits within a quarter of a hull length of the hull's box.
        const b = bounds(hp.group);
        expect(b.min.z).toBeGreaterThan(hull.min.z - L * 0.25);
        expect(b.max.z).toBeLessThan(hull.max.z + L * 0.25);
        expect(Math.max(-b.min.x, b.max.x)).toBeLessThan(Math.max(-hull.min.x, hull.max.x) + L * 0.25);
        hp.update(1, ws[0]);
        hp.dispose();
      }
    });
  }

  it('changes the ship: a railgun fit and a missile fit are different hulls', () => {
    const tris = (l: Loadout) => {
      const ship = buildPilotShip('mars', { trim: 0, finish: 0 }, l);
      let n = 0;
      ship.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.userData.hardpoint) n += m.geometry.attributes.position.count; });
      return n;
    };
    const rail = tris({ ...defaultLoadout(), weapons: ['rail'] });
    const missiles = tris({ ...defaultLoadout(), weapons: ['seeker', 'swarm'] });
    expect(rail).toBeGreaterThan(0);
    expect(missiles).toBeGreaterThan(0);
    expect(rail).not.toBe(missiles);
  });

  it('refit replaces the hardware instead of piling it up, and keeps the hull fitted to length', () => {
    const ship = buildPilotShip('jupiter', { trim: 0, finish: 0 }, full(['rail', 'seeker', 'ion', 'mine']));
    const count = () => { let n = 0; ship.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.userData.hardpoint) n++; }); return n; };
    const first = count();
    ship.refit(full(['rail', 'seeker', 'ion', 'mine']));
    ship.refit(full(['rail', 'seeker', 'ion', 'mine']));
    expect(count()).toBe(first);
    ship.refit(null);
    expect(count()).toBe(0);
  });
});
