import { describe, expect, it } from 'vitest';
import { NATIONS } from '../nations';
import { BUILDING_TYPES, CITY_TYPES } from './buildings';
import { METERS, RULES, approach, effects, meters, steadiness, unrest } from './meters';
import { CASES, controlAt, report, run } from './sim';
import { applyEvent, baseOf, conquestStatus, newPlanet, stepPlanet, targets } from './state';
import { WORLDS, worldOf } from './worlds';

/** Conquest's site ids (src/lib/conquest/sites.ts, claude/conquest-0b139e, read 2026-10-19). Update if it changes. */
const CONQUEST_SITES = `earth-metropolis earth-port earth-guard earth-pharos earth-foundries earth-breadbasket earth-desal
earth-mines earth-refineries earth-grid earth-guns-1 earth-guns-2 moon-omphalos moon-treasury moon-temenos moon-lamp
moon-mirrors moon-ovens moon-shackleton moon-imbrium moon-peaks moon-guns mercury-lakedaimon mercury-perioikoi
mercury-agoge mercury-thermopylae mercury-hoplon mercury-forges mercury-mirrors mercury-caloris mercury-cold
mercury-shield-1 mercury-shield-2 venus-nephelokokkygia venus-blachernae venus-varangian venus-horn venus-fire
venus-skimmers venus-orchards venus-descent venus-chain mars-quirinal mars-tharsis mars-prima mars-secunda
mars-navalia mars-fabrica mars-aqua mars-mines mars-fields mars-perchlorate mars-limes jupiter-basileia jupiter-court
jupiter-companions jupiter-prison jupiter-royal jupiter-forges jupiter-scoops jupiter-europa jupiter-sulphur
jupiter-fusion jupiter-regolith jupiter-sarissa-1 jupiter-sarissa-2 saturn-pnyx saturn-piraeus saturn-walls
saturn-sheds saturn-kerameikos saturn-kraken saturn-ligeia saturn-rings saturn-geysers saturn-scoops saturn-burners
saturn-owl`.split(/\s+/);

describe('meters', () => {
  it('every effect is exactly 1 at meters of 50, so conquest plays as written', () => {
    const fx = effects(meters(50, 50, 50, 50));
    for (const k of ['build', 'repair', 'works', 'hold', 'price', 'income'] as const) expect(fx[k]).toBeCloseTo(1, 10);
    expect(fx.unrest).toBe(0);
  });
  it('effects stay inside 0.25..1.5 over the whole meter range', () => {
    for (const g of [0, 50, 100]) for (const m of [0, 50, 100]) for (const e of [0, 50, 100]) {
      const fx = effects(meters(g, m, 50, e));
      for (const k of ['build', 'repair', 'works', 'hold', 'price', 'income'] as const) {
        expect(fx[k]).toBeGreaterThanOrEqual(0.25);
        expect(fx[k]).toBeLessThanOrEqual(1.5);
      }
    }
  });
  it('a meter closes half its gap in one half-life', () => {
    const m = approach(meters(0, 0, 0, 0), meters(100, 100, 100, 100), RULES.halfLife);
    for (const k of METERS) expect(m[k]).toBeCloseTo(50, 6);
  });
  it('unrest and steadiness have the documented ends', () => {
    expect(unrest(50)).toBe(0);
    expect(unrest(10)).toBe(1);
    expect(steadiness(0)).toBe(1.25);
    expect(steadiness(100)).toBe(0.75);
  });
});

describe('the worlds', () => {
  it('one world per nation', () => {
    expect(WORLDS.map((w) => w.id).sort()).toEqual(NATIONS.map((n) => n.id).sort());
  });
  it('uses exactly conquest’s sites, no more and no fewer', () => {
    expect(WORLDS.flatMap((w) => w.sites.map((s) => s.id)).sort()).toEqual([...CONQUEST_SITES].sort());
    for (const w of WORLDS) for (const s of w.sites) expect(s.id.startsWith(`${w.id}-`)).toBe(true);
  });
  it('every city and capital has a city type; works have a resource; buildings are known types', () => {
    for (const w of WORLDS) {
      expect(w.sites.filter((s) => s.kind === 'capital')).toHaveLength(1);
      for (const s of w.sites) {
        if (s.kind === 'capital' || s.kind === 'city') expect(CITY_TYPES[s.city!]).toBeTruthy();
        else expect(s.city).toBeUndefined();
        if (s.kind === 'works') expect(s.res && s.rich).toBeTruthy();
        for (const b of s.buildings) expect(BUILDING_TYPES[b.type]).toBeTruthy();
      }
    }
  });
  it('every lifeline site holds a lifeline building; only Earth has none', () => {
    for (const w of WORLDS) {
      const l = w.temperament.lifeline;
      if (w.id === 'earth') { expect(l).toBeNull(); continue; }
      expect(l).toBeTruthy();
      if (l && 'site' in l) expect(w.sites.find((s) => s.id === l.site)!.buildings.some((b) => b.type === 'lifeline')).toBe(true);
    }
  });
  it('starting meters are inside 0..100 and a world at peace targets exactly its start', () => {
    for (const w of WORLDS) {
      const p = newPlanet(w.id);
      const t = targets(p, {});
      for (const k of METERS) {
        expect(w.start[k]).toBeGreaterThanOrEqual(0);
        expect(w.start[k]).toBeLessThanOrEqual(100);
        expect(t[k]).toBeCloseTo(w.start[k], 6);
      }
    }
  });
  it('the people’s own base is never so low a world collapses without its buildings', () => {
    for (const w of WORLDS) for (const k of METERS) expect(baseOf(w)[k]).toBeGreaterThan(-25);
  });
  it('Mercury has no walls (Sparta had none)', () => {
    expect(worldOf('mercury').sites.some((s) => s.buildings.some((b) => b.type === 'walls'))).toBe(false);
  });
});

describe('rules', () => {
  it('maps conquest’s site state', () => {
    expect(conquestStatus('native', false)).toBe('working');
    expect(conquestStatus('native', true)).toBe('suppressed');
    expect(conquestStatus('player', true)).toBe('held');
    expect(conquestStatus('wrecked', false)).toBe('wrecked');
  });
  it('a lost capital shocks government; Jupiter’s dynasty takes twice the blow', () => {
    const mars = newPlanet('mars');
    applyEvent(mars, { kind: 'siteLost', site: 'mars-quirinal' });
    const jup = newPlanet('jupiter');
    applyEvent(jup, { kind: 'siteLost', site: 'jupiter-basileia' });
    expect(worldOf('mars').start.government - mars.meters.government).toBeGreaterThan(20);
    expect(worldOf('jupiter').start.government - jup.meters.government).toBeGreaterThan(45);
  });
  it('Saturn’s assembly feels every lost ship in its government more than Mars does', () => {
    const s = newPlanet('saturn');
    const m = newPlanet('mars');
    applyEvent(s, { kind: 'shipLost', ship: 'capital' });
    applyEvent(m, { kind: 'shipLost', ship: 'capital' });
    expect(75 - s.meters.government).toBeGreaterThan(70 - m.meters.government);
  });
  it('Mercury’s military never falls below 40 while the Spartans rule', () => {
    const p = newPlanet('mercury');
    for (let i = 0; i < 20; i++) applyEvent(p, { kind: 'shipLost', ship: 'capital' });
    stepPlanet(p, 1, { underAttack: true });
    expect(p.meters.military).toBeGreaterThanOrEqual(40);
  });
  it('losing the lifeline costs at least 15 government within 5 minutes (Earth has none to lose)', () => {
    for (const w of WORLDS) {
      const l = w.temperament.lifeline;
      if (!l) continue;
      const p = newPlanet(w.id);
      const sit = 'site' in l ? { sites: { [l.site]: 'suppressed' as const } } : { cutOff: [l.resource] };
      for (let t = 0; t < 300; t++) stepPlanet(p, 1, sit);
      expect(w.start.government - p.meters.government, w.id).toBeGreaterThanOrEqual(15);
    }
  });
});

describe('the headless run (bands written before it ran: PLANETS.md 3.1)', { timeout: 60_000 }, () => {
  const at = (id: (typeof WORLDS)[number]['id'], c: (typeof CASES)[number], minute: number) => run(id, c, 60).find((s) => s.minute === minute)!;

  it('peace: no meter drifts more than 1 in 30 minutes', () => {
    for (const w of WORLDS) for (const s of run(w.id, 'peace', 60)) for (const k of METERS) expect(Math.abs(s.meters[k] - w.start[k])).toBeLessThanOrEqual(1);
  });
  it('attack, minute 30: economy down 15 or more, military down, government still standing (20+)', () => {
    for (const w of WORLDS) {
      const s = at(w.id, 'attack', 30);
      expect(w.start.economy - s.meters.economy, w.id).toBeGreaterThanOrEqual(15);
      expect(s.meters.military, w.id).toBeLessThan(w.start.military);
      expect(s.meters.government, w.id).toBeGreaterThanOrEqual(20);
    }
  });
  it('attack, minute 30: the world rebuilds slower than at peace', () => {
    for (const w of WORLDS) expect(at(w.id, 'attack', 30).fx.build, w.id).toBeLessThan(at(w.id, 'peace', 30).fx.build);
  });
  it('conquered, minute 60: income × in 0.4..1.2; the Moon is the most restless, Earth the least', () => {
    const u: Record<string, number> = {};
    for (const w of WORLDS) {
      expect(controlAt(w.id, 'conquered')).not.toBeNull();
      const s = at(w.id, 'conquered', 60);
      expect(s.fx.income, w.id).toBeGreaterThanOrEqual(0.4);
      expect(s.fx.income, w.id).toBeLessThanOrEqual(1.2);
      u[w.id] = s.fx.unrest;
    }
    for (const w of WORLDS) {
      if (w.id !== 'moon') expect(u.moon, w.id).toBeGreaterThan(u[w.id]);
      if (w.id !== 'earth') expect(u.earth, w.id).toBeLessThan(u[w.id]);
    }
  });
  it('prints the tables (PLANETS.md 3.2)', () => {
    const r = report();
    expect(r).toContain('#### conquered');
    if ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.PLANETS_REPORT) console.log(r);
  });
});
