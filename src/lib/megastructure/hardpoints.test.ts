import { describe, expect, it } from 'vitest';
import { ARMOUR, ARMOUR_HOMES, cellIndex } from './armour';
import { BATTERY, BERTH, HARDPOINT_KINDS, SHIP_LENGTH, allHardpoints, armourPlaces, berthOf, gatePoint, hardpointsOf, mooringOf, sectionAt, sectionsOf, sees } from './hardpoints';
import { STATIONS } from '../stations';

const L = SHIP_LENGTH;
const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const len = (a: number[]) => Math.hypot(...a);

describe('hardpoints', { timeout: 60_000 }, () => {
  it('gives every structure every kind, with unique ids, on plated cells at the outer radius', () => {
    const ids = new Set<string>();
    for (const h of ARMOUR_HOMES) {
      const p = armourPlaces()[h];
      const hps = hardpointsOf(h);
      for (const k of HARDPOINT_KINDS) expect(hps.some((x) => x.kind === k)).toBe(true);
      for (const x of hps) {
        expect(ids.has(x.id)).toBe(false);
        ids.add(x.id);
        expect(x.id.startsWith(`${h}-${x.kind}-`)).toBe(true);
        const off = sub(x.pos, p.frame.centre);
        expect(len(off)).toBeCloseTo(p.frame.rOut, 4);
        expect(len(x.normal)).toBeCloseTo(1, 9);
        expect(len(sub(off.map((v) => v / len(off)), x.normal))).toBeLessThan(1e-6);
        if (x.kind !== 'mooring') expect(p.grid.plates[cellIndex(p.frame, p.grid, x.normal).k]).toBeGreaterThan(0);
        expect(x.section).toMatch(new RegExp(`^${h}-s\\d$`));
      }
    }
  }, 30_000); // heavy: every hardpoint of every world; slow when the whole suite runs in parallel
  it('keeps the ids and places stable from call to call', () => {
    expect(allHardpoints().map((x) => x.id + x.pos.join())).toEqual(allHardpoints().map((x) => x.id + x.pos.join()));
  });
  it('makes every station id a berth, with an approach point straight out past the plating and its mounts', () => {
    for (const s of STATIONS) {
      const b = berthOf(s.id)!;
      expect(b.kind).toBe('berth');
      expect(b.dest).toBe(s.id);
      const p = armourPlaces()[s.home];
      expect(len(sub(b.approach!, p.frame.centre))).toBeCloseTo(p.frame.rOut + p.skin + BERTH.approach * L, 4);
      expect(mooringOf(b)!.kind).toBe('mooring');
      expect(b.normal[1]).toBeGreaterThan(0.2); // the plating faces up, so a ship in the cradle sits upright
    }
  });
  it('spaces a structure’s berths apart, so docking ships never share a cradle', () => {
    for (const h of ARMOUR_HOMES) {
      const bs = hardpointsOf(h).filter((x) => x.kind === 'berth');
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) expect(len(sub(bs[i].pos, bs[j].pos))).toBeGreaterThan(40 * L);
    }
  });
  it('names the temples for the world’s god', () => {
    for (const h of ARMOUR_HOMES) {
      const t = hardpointsOf(h).filter((x) => x.kind === 'temple');
      expect(t.length).toBe(2);
      expect(t.map((x) => x.name).join()).toContain(ARMOUR[h].god === 'Mars' ? 'Mars' : ARMOUR[h].god);
    }
  });
  it('cuts each structure into sections that hold plating, and finds the section under a hardpoint', () => {
    for (const h of ARMOUR_HOMES) {
      const ss = sectionsOf(h);
      expect(ss.length).toBe(ARMOUR[h].sections);
      expect(ss.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1, 9);
      for (const s of ss) expect(s.plates).toBeGreaterThan(0);
      for (const x of hardpointsOf(h).filter((y) => y.kind !== 'mooring')) {
        expect(sectionAt(h, x.pos)).toBe(x.section);
        const sec = ss.find((s) => s.id === x.section)!;
        expect(len(sub(x.pos, sec.centre))).toBeLessThan(sec.radius);
      }
      expect(sectionAt(h, armourPlaces()[h].frame.centre)).toBeNull();
    }
  });
  it('guards every gate (berth approach, hangar launch point) with 6 turrets and 4 point-defence mounts in range and in sight', () => {
    for (const h of ARMOUR_HOMES) {
      const p = armourPlaces()[h];
      const hps = hardpointsOf(h);
      for (const gate of hps.filter((x) => x.kind === 'berth' || x.kind === 'hangar')) {
        const gp = gatePoint(gate);
        const guns = (kind: string) => hps.filter((x) => x.kind === kind && len(sub(x.pos, gp)) < BATTERY.reach && sees(p.frame, x.pos, x.normal, gp)).length;
        expect(guns('turret'), `${gate.id} turrets`).toBeGreaterThanOrEqual(BATTERY.turrets);
        expect(guns('pointDefence'), `${gate.id} point defence`).toBeGreaterThanOrEqual(BATTERY.pointDefence);
      }
    }
  });
});
