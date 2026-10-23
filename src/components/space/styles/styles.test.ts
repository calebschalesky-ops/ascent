import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { NationId } from '../../../lib/nations';
import { SPECIALS, STYLES, STYLE_ROLES, courtMaterials, buildClawCapital, buildClawFighter, buildImperialCapital, buildImperialFighter } from './index';
import { overlap, silhouette, type View } from './silhouette';

const box = (g: THREE.Group) => new THREE.Box3().setFromObject(g);
const size = (g: THREE.Group) => box(g).getSize(new THREE.Vector3());

const NATIONS = Object.keys(STYLES) as NationId[];
const KINDS = ['capital', 'cruiser', 'fighter'] as const;
const BUILDS = Object.fromEntries(NATIONS.flatMap((n) => KINDS.map((k) => [`${n} ${k}`, () => STYLES[n][k]()])));
const meshes = (g: THREE.Group, role?: string) => (g.children as THREE.Mesh[]).filter((c) => !role || c.userData.role === role);
const roleBox = (g: THREE.Group, role: string) => meshes(g, role).reduce((b, m) => b.expandByObject(m), new THREE.Box3());
const glow = (g: THREE.Group) => (meshes(g, 'glow')[0].material as THREE.MeshBasicMaterial).color;

describe('nation style models', () => {
  for (const [name, build] of Object.entries(BUILDS)) {
    it(`${name}: every mesh has a known role and finite geometry`, () => {
      const g = build();
      expect(g.children.length).toBeGreaterThan(5);
      for (const c of g.children as THREE.Mesh[]) {
        expect(STYLE_ROLES).toContain(c.userData.role);
        const pos = c.geometry.getAttribute('position').array;
        expect(pos.length).toBeGreaterThan(0);
        expect([...pos].every(Number.isFinite)).toBe(true);
      }
    });
    it(`${name}: built symmetric about x = 0, nose toward −z`, () => {
      const b = box(build());
      expect(Math.abs(b.max.x + b.min.x)).toBeLessThan(0.02);
      expect(-b.min.z).toBeGreaterThan(b.max.z * 0.8);
    });
  }

  it('every nation has a style', () => {
    expect(NATIONS.sort()).toEqual(['earth', 'jupiter', 'mars', 'mercury', 'moon', 'saturn', 'venus']);
  });

  it('every capital ship is about 10 long, every cruiser and fighter about 2', () => {
    for (const n of NATIONS) {
      expect(size(STYLES[n].capital()).z, n).toBeGreaterThan(9);
      expect(size(STYLES[n].capital()).z, n).toBeLessThan(12.5);
      expect(size(STYLES[n].cruiser()).z, n).toBeGreaterThan(1.6);
      expect(size(STYLES[n].cruiser()).z, n).toBeLessThan(3.2);
      expect(size(STYLES[n].fighter()).z, n).toBeGreaterThan(1.6);
      expect(size(STYLES[n].fighter()).z, n).toBeLessThan(2.6);
    }
  });

  it('capital ships are about 10 long and fighters about 2', () => {
    expect(size(buildImperialCapital()).z).toBeCloseTo(10, 0);
    expect(size(buildClawCapital()).z).toBeGreaterThan(10);
    expect(size(buildClawCapital()).z).toBeLessThan(13);
    for (const f of [buildImperialFighter(), buildClawFighter()]) {
      expect(size(f).z).toBeGreaterThan(1.6);
      expect(size(f).z).toBeLessThan(2.6);
    }
  });

  it('the silhouettes differ: a long flat wedge, a javelin, claws past the prow', () => {
    const wedge = size(buildImperialCapital());
    expect(wedge.z / wedge.x).toBeGreaterThan(2.4); // the sheet's dagger: long against its width, oars and all
    expect(wedge.z / wedge.y).toBeGreaterThan(3.5); // and low
    // The Velite is a javelin, not a cockpit between upright panels (rejected twice as a TIE fighter).
    const jav = size(buildImperialFighter());
    expect(jav.z).toBeGreaterThan(jav.x * 1.2);
    expect(jav.y).toBeLessThan(jav.z * 0.2);
    // The claws reach past the spine's prow (z = −5.4).
    expect(box(buildClawCapital()).min.z).toBeLessThan(-6.5);
    const talon = size(buildClawFighter());
    expect(talon.y).toBeLessThan(talon.z * 0.5); // low against its length
  });

  it('each glows in its own colour: ice-white for Mars, magenta for Jupiter', () => {
    const glow = (g: THREE.Group) => ((g.children as THREE.Mesh[]).find((c) => c.userData.role === 'glow')!.material as THREE.MeshBasicMaterial).color;
    const mars = glow(buildImperialCapital());
    const jup = glow(buildClawCapital());
    expect(mars.b).toBeGreaterThan(mars.r); // cold
    expect(jup.r).toBeGreaterThan(jup.g * 3); // magenta
    expect(jup.b).toBeGreaterThan(jup.g * 3);
  });

  it('the cruisers keep their nation\'s shape', () => {
    // Earth's is the player's courier: the hull and span of space/ship.ts.
    const earth = size(STYLES.earth.cruiser());
    expect(earth.x).toBeCloseTo(2.6, 1);
    expect(earth.z).toBeCloseTo(2.06, 1);
    // The Moon's lamp opens forward: its reflector is the widest part, at the bow.
    const lamp = STYLES.moon.cruiser();
    const reflector = roleBox(lamp, 'panel');
    expect(reflector.min.z).toBeLessThan(-0.95);
    expect(size(lamp).x).toBeLessThan(1.1);
    // Mercury's wedge is round from the front, its shield at the point.
    const wedge = STYLES.mercury.cruiser();
    expect(box(wedge).min.z).toBeLessThan(-0.95);
    expect(meshes(wedge, 'accent').some((m) => m.geometry instanceof THREE.TorusGeometry)).toBe(true);
    // Mars's corvus is a flat wedge; Jupiter's gun runs out past its claws.
    const corvus = size(STYLES.mars.cruiser());
    expect(corvus.z / corvus.x).toBeCloseTo(2.5, 0);
    const sarissa = STYLES.jupiter.cruiser();
    expect(box(sarissa).min.z).toBeLessThan(-1.5);
    // Venus's fins stand in an X; Saturn's raider is low and long.
    const dromon = size(STYLES.venus.cruiser());
    expect(Math.abs(dromon.x - dromon.y)).toBeLessThan(0.25);
    const raider = size(STYLES.saturn.cruiser());
    expect(raider.z / raider.y).toBeGreaterThan(4);
  });

  it('Earth: a turned cigar with swept wings; a small conventional fighter', () => {
    const cap = STYLES.earth.capital();
    const c = size(cap);
    expect(c.z / c.x).toBeGreaterThan(1.4); // the wings make it wide, but it stays a long hull
    expect(c.z / c.y).toBeGreaterThan(2.5);
    expect(meshes(cap).some((m) => m.geometry instanceof THREE.LatheGeometry)).toBe(true);
    const f = size(STYLES.earth.fighter());
    expect(f.z).toBeGreaterThan(f.x); // longer than its span
    expect(f.y).toBeLessThan(f.z * 0.35);
  });

  it('Moon: a spearhead warship with a colonnade of eighteen columns sunk in its spine; a needle', () => {
    const cap = STYLES.moon.capital();
    const c = size(cap);
    expect(c.z / c.x).toBeGreaterThan(2.5);
    const columns = meshes(cap, 'hull').filter((m) => m.geometry instanceof THREE.CylinderGeometry && size(new THREE.Group().add(m.clone())).y > 0.5);
    expect(columns.length).toBe(18);
    expect(meshes(cap).some((m) => m.geometry instanceof THREE.TorusGeometry && m.userData.role === 'panel')).toBe(true); // the mirror ring
    const f = size(STYLES.moon.fighter());
    expect(Math.max(f.x, f.y)).toBeLessThan(f.z * 0.2);
  });

  it('Mercury: a circle from the front, a shield as wide as the ship is long; the fighter a disc', () => {
    const c = size(STYLES.mercury.capital());
    expect(Math.abs(c.x - c.y)).toBeLessThan(0.01);
    expect(c.x).toBeGreaterThan(c.z * 0.8);
    // The Aspis sheet: a disc from the front that hides the body, a gun before it and a body as long as it behind.
    const f = size(STYLES.mercury.fighter());
    expect(Math.abs(f.x - f.y)).toBeLessThan(0.01);
    expect(f.z).toBeGreaterThan(f.x * 1.6);
  });

  it('Venus: a wide teardrop under a great glass dome inside a ring; a gem fighter', () => {
    const cap = STYLES.venus.capital();
    const c = size(cap);
    expect(c.x).toBeGreaterThan(c.z * 0.55); // the lifting ring
    const dome = roleBox(cap, 'glass').getSize(new THREE.Vector3());
    expect(dome.x).toBeGreaterThan(2.5);
    expect(roleBox(cap, 'glass').min.y).toBeGreaterThan(roleBox(cap, 'hull').min.y + 1); // on top
    const gem = roleBox(STYLES.venus.fighter(), 'glass').getSize(new THREE.Vector3());
    expect(gem.x).toBeCloseTo(1, 1);
    expect(gem.y).toBeCloseTo(0.6, 1);
    expect(gem.z).toBeCloseTo(2, 1);
  });

  it('Saturn: a long thin spine with banks of oar-fins; a long-winged glider', () => {
    const cap = STYLES.saturn.capital();
    const c = size(cap);
    expect(c.z / c.y).toBeGreaterThan(5);
    const oars = meshes(cap, 'hull').filter((m) => m.geometry instanceof THREE.BoxGeometry && size(new THREE.Group().add(m.clone())).x > 1);
    expect(oars.length).toBe(48);
    const f = size(STYLES.saturn.fighter());
    expect(f.x).toBeGreaterThan(f.z * 1.5);
  });

  it("no two nations' ships could be taken for each other in silhouette, from above, the side or the front", () => {
    const views: View[] = ['top', 'side', 'front'];
    for (const k of KINDS) {
      const masks = Object.fromEntries(NATIONS.map((n) => {
        const g = STYLES[n][k]();
        return [n, views.map((v) => silhouette(g, v))];
      }));
      for (let i = 0; i < NATIONS.length; i++) for (let j = i + 1; j < NATIONS.length; j++) {
        const a = NATIONS[i], b = NATIONS[j];
        const o = views.map((_, v) => overlap(masks[a][v], masks[b][v]));
        const pair = `${k}: ${a} vs ${b} (${o.map((x) => x.toFixed(2)).join(', ')})`;
        expect(Math.max(...o), pair).toBeLessThan(0.8);
        expect(o.reduce((s, x) => s + x) / o.length, pair).toBeLessThan(0.6);
      }
    }
  });

  it('each nation glows in its own colour, as in the plume table', () => {
    const e = glow(STYLES.earth.capital()), m = glow(STYLES.moon.capital()), me = glow(STYLES.mercury.capital());
    const v = glow(STYLES.venus.capital()), s = glow(STYLES.saturn.capital());
    expect(e.b).toBeGreaterThan(e.r * 2); // blue
    expect(m.b).toBeGreaterThan(m.r); // pale blue-white
    expect(m.r).toBeGreaterThan(m.b * 0.5);
    expect(me.r).toBeGreaterThan(me.b * 1.5); // white-gold
    expect(me.g).toBeGreaterThan(me.b);
    expect(v.g).toBeGreaterThan(v.r * 2); // green
    expect(v.g).toBeGreaterThan(v.b);
    expect(s.r).toBeGreaterThan(s.g); // amber
    expect(s.g).toBeGreaterThan(s.b * 2);
  });

  it("a Venus family can turn its fighter's green by up to 15°, no further", () => {
    const hue = (shift: number) => {
      const hsl = { h: 0, s: 0, l: 0 };
      (courtMaterials(undefined, shift).glass as THREE.MeshPhysicalMaterial).color.getHSL(hsl);
      return hsl.h * 360;
    };
    expect(hue(10) - hue(0)).toBeCloseTo(10, 0);
    expect(hue(40) - hue(0)).toBeCloseTo(15, 0);
    expect(hue(-40) - hue(0)).toBeCloseTo(-15, 0);
  });

  for (const n of NATIONS) {
    it(`${n} special (${SPECIALS[n].name}): known roles, finite, symmetric, nose toward −z, about 6 long`, () => {
      const g = SPECIALS[n].build(STYLES[n].materials());
      expect(g.children.length).toBeGreaterThan(5);
      for (const c of g.children as THREE.Mesh[]) {
        expect(STYLE_ROLES).toContain(c.userData.role);
        expect([...c.geometry.getAttribute('position').array].every(Number.isFinite)).toBe(true);
      }
      const b = box(g);
      expect(Math.abs(b.max.x + b.min.x)).toBeLessThan(0.05);
      expect(-b.min.z).toBeGreaterThan(b.max.z * 0.8);
      expect(b.max.z - b.min.z).toBeGreaterThan(4.5);
      expect(b.max.z - b.min.z).toBeLessThan(7.5);
    });
  }
});
