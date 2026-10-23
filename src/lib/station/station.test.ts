import { describe, expect, it } from 'vitest';
import type { V3 } from '../nav';
import { dist, len, sub, unit } from '../nav';
import { MUNITIONS, isMunition } from '../munitions';
import { SHIELDS, shieldFrac } from '../shields';
import { STATION_HOMES } from '../stations';
import { HARDPOINT_KINDS, provisionalMounts } from './mounts';
import type { Hardpoint } from './mounts';
import { PROFILES } from './profiles';
import { DEVELOPMENT, METER_CAP, TIERS, fitted, powerBudget, price, stationMeters } from './civic';
import type { Contact } from './defence';
import { DEFENCE, canSee, fireOrders, hitMount, hitSection, isProvokedBy, mountState, newStation, provoke, shieldUp, stepAlert, stepRepair, workingMounts } from './defence';
import { DEFENDER, LAUNCH, alertSiblings, callNavy, interpose, newHangar, stepHangar, withinLeash } from './navy';
import { createStation, stepStation, upgrade } from './system';

const L = 0.18 * 2.06;
const AT: V3 = [1000, 0, 0];
const mounts = (id = 'stn-mars-1') => provisionalMounts(id, { pos: AT, out: [1, 0, 0] }, L);
const seeded = (s = 1) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const player = (pos: V3, vel: V3 = [0, 0, 0]): Contact => ({ id: 'player', kind: 'player', pos, vel, r: 0.3, hostile: true });

describe('profiles: one per world, on arsenal ids, gods not stars', () => {
  it('gives every world a god, a temple and arsenal munitions and shields', () => {
    for (const h of STATION_HOMES) {
      const p = PROFILES[h];
      expect(p.home).toBe(h);
      for (const g of Object.values(p.guns)) expect(isMunition(g)).toBe(true);
      expect(SHIELDS[p.shield]).toBeTruthy();
      expect(p.temple.name.length).toBeGreaterThan(3);
      expect(p.sites.length).toBeGreaterThan(0);
    }
    expect(PROFILES.mars.god.greek).toBe('Ares');
    expect(PROFILES.saturn.god.roman).toBe('Saturnus');
  });
  it('says nothing astrological', () => {
    const text = JSON.stringify(PROFILES).toLowerCase();
    for (const w of ['zodiac', 'horoscope', 'astrolog', 'occult', 'influence', 'correspond']) expect(text).not.toContain(w);
  });
});

describe('mounts and tiers', () => {
  it('puts every kind of hardpoint on the provisional station, each facing out of its plating', () => {
    const ms = mounts();
    for (const k of HARDPOINT_KINDS) expect(ms.some((m) => m.kind === k)).toBe(true);
    expect(new Set(ms.map((m) => m.id)).size).toBe(ms.length);
    for (const m of ms) { expect(len(m.normal)).toBeCloseTo(1, 6); expect(dist(m.pos, AT)).toBeLessThan(10 * L); }
  });
  it('fits more with each tier, and Venus and Saturn lay mines from the start', () => {
    const ms = mounts();
    const n = (t: 1 | 2 | 3, k: string, home: 'mars' | 'venus' = 'mars') => fitted(ms, t, PROFILES[home]).filter((m) => m.kind === k).length;
    expect([n(1, 'turret'), n(2, 'turret'), n(3, 'turret')]).toEqual([4, 6, 8]);
    expect([n(1, 'mooring'), n(2, 'mooring')]).toEqual([0, 1]);
    expect([n(1, 'minelayer'), n(3, 'minelayer'), n(1, 'minelayer', 'venus')]).toEqual([0, 2, 2]);
  });
  it('arms a citadel with every other turret on the heavy gun', () => {
    const run = createStation('stn-jupiter-1', 'jupiter', mounts('stn-jupiter-1'), 3);
    const guns = run.fit.filter((m) => m.kind === 'turret').map((m) => run.sys.mounts[m.id].munition);
    expect(guns.filter((g) => g === 'torpedo').length).toBe(4);
    expect(guns.filter((g) => g === 'rail').length).toBe(4);
  });
});

describe('power', () => {
  const fit = fitted(mounts(), 2, PROFILES.mars);
  it('serves shields and guns first; Mars, which buys its power, browns out its guns in a fight', () => {
    const mars = powerBudget(fit, PROFILES.mars.power.richness, true);
    expect(mars.share.shieldEmitter).toBe(1);
    expect(mars.share.turret).toBeLessThan(1);
    expect(mars.share.market).toBe(0); // the market closes in a fight
    const mercury = powerBudget(fit, PROFILES.mercury.power.richness, true);
    expect(mercury.share.turret).toBe(1);
    expect(mercury.supply).toBeGreaterThan(mercury.demand);
  });
  it('sizes reactors to the structure, so the budget holds however many hardpoints there are; losing reactors loses power', () => {
    const big = [...fit, ...fit.map((m) => ({ ...m, id: m.id + 'b' })), ...fit.map((m) => ({ ...m, id: m.id + 'c' }))];
    expect(powerBudget(big, 1, true).share.turret).toBe(powerBudget(fit, 1, true).share.turret);
    const noReactor = fit.filter((m) => m.kind !== 'reactor' || m.id.endsWith('-0'));
    expect(powerBudget(noReactor, 1, true, fit).supply).toBeCloseTo(powerBudget(fit, 1, true).supply / 2, 6);
  });
  it('turns working mounts into meter contributions, capped, religion from the temple', () => {
    const b = powerBudget(fit, 2.5, false);
    const m = stationMeters(fit, b.share);
    expect(m.religion).toBe(6);
    expect(m.economy).toBeGreaterThan(4);
    for (const v of Object.values(m)) expect(v).toBeLessThanOrEqual(METER_CAP);
    expect(stationMeters(fit.filter((x) => x.kind !== 'temple'), b.share).religion).toBe(0);
  });
  it('prices by the economy meter, cheaper for its own resource, closed in a fight', () => {
    const p = PROFILES.mars;
    expect(price('metals', p, 50, true, null)!.sell).toBeLessThan(price('ice', p, 50, true, null)!.sell * 10 / 6);
    expect(price('food', p, 90, true, null)!.sell).toBeLessThan(price('food', p, 10, true, null)!.sell);
    expect(price('food', p, 50, false, null)).toBeNull();
  });
});

describe('defence: shields, structure, provocation, the alert ladder', () => {
  const ms = mounts();
  const fresh = () => newStation('stn-mars-1', PROFILES.mars, fitted(ms, 2, PROFILES.mars), 2);
  it('takes a hit on the section shield first (arsenal applyHit), scaled up for a station', () => {
    const s = fresh();
    const sec = s.sections.ring;
    expect(sec.def.maxShield).toBeCloseTo(SHIELDS.deflector.capacity * 1.35 * DEFENCE.shieldCap, 6);
    const r = hitSection(s, 'ring', 'pulse', 12, 'player')!;
    expect(r.toShield).toBeCloseTo(12, 6);
    expect(sec.def.hull).toBe(TIERS[2].hull);
    expect(s.provoked.player).toBe(1);
    // A rail slug sends 40% straight to the structure.
    hitSection(s, 'ring', 'rail', 70, 'player');
    expect(sec.def.hull).toBeCloseTo(TIERS[2].hull - 70 * 0.4 * MUNITIONS.rail.hullMul, 6);
  });
  it('climbs calm → wary → engaged → siege, and stands down after a quiet spell', () => {
    const s = fresh();
    const far = player([AT[0] + 5000, 0, 0]);
    const near = player([AT[0] + 300, 0, 0]);
    expect(stepAlert(s, [far], AT, DEFENCE.sensor, 0.1, null)).toBe('calm');
    expect(stepAlert(s, [near], AT, DEFENCE.sensor, 0.1, null)).toBe('wary');
    provoke(s, 'player');
    expect(stepAlert(s, [near], AT, DEFENCE.sensor, 0.1, null)).toBe('engaged');
    s.sections.ring.def.shield[0] = 0;
    expect(stepAlert(s, [near], AT, DEFENCE.sensor, 0.1, null)).toBe('siege');
    s.sections.ring.def.shield[0] = s.sections.ring.def.maxShield;
    expect(stepAlert(s, [near], AT, DEFENCE.sensor, DEFENCE.quiet, null)).toBe('wary');
    expect(s.provoked).toEqual({});
  });
  it('fights a contact at war on sight, and fires on it, without being shot first (scale-jump-danger D2)', () => {
    // Before: a hostile player only made a station wary, and wary turrets shoot only missiles, so a ship of a house at
    // war with the station's flew past its guns untouched unless it fired first.
    const s = fresh();
    const near = player([AT[0] + 150, 0, 0]); // inside the plasma turrets' 275-unit reach
    expect(stepAlert(s, [near], AT, DEFENCE.sensor, 0.1, null)).toBe('wary');
    expect(fireOrders(s, fitted(ms, 2, PROFILES.mars), { contacts: [near], planet: null, power: { turret: 1, pointDefence: 1, minelayer: 1 }, boon: null, rand: () => 0.5 }).filter((f) => f.target === 'player')).toEqual([]);
    const war = { ...near, war: true };
    expect(stepAlert(s, [war], AT, DEFENCE.sensor, 0.1, null)).toBe('engaged');
    const shots = fireOrders(s, fitted(ms, 2, PROFILES.mars), { contacts: [war], planet: null, power: { turret: 1, pointDefence: 1, minelayer: 1 }, boon: null, rand: () => 0.5 });
    expect(shots.some((f) => f.target === 'player')).toBe(true);
    // Out of sensor range, war or not, it stays calm.
    const s2 = fresh();
    expect(stepAlert(s2, [{ ...player([AT[0] + DEFENCE.sensor * 1.5, 0, 0]), war: true }], AT, DEFENCE.sensor, 0.1, null)).toBe('calm');
  });
  it('needs twice the provocation under Aphrodite, counted across frames', () => {
    const s = fresh();
    const near = player([AT[0] + 300, 0, 0]);
    provoke(s, 'player');
    expect(isProvokedBy(s, 'player', null)).toBe(true);
    expect(isProvokedBy(s, 'player', 'charm')).toBe(false);
    expect(stepAlert(s, [near], AT, DEFENCE.sensor, 0.05, 'charm')).toBe('wary');
    provoke(s, 'player');
    expect(stepAlert(s, [near], AT, DEFENCE.sensor, 0.05, 'charm')).toBe('engaged');
  });
  it('falls when every section is suppressed, and a suppressed section silences its guns', () => {
    const s = fresh();
    const fit = fitted(ms, 2, PROFILES.mars);
    const gun = fit.find((m) => m.kind === 'turret')!;
    expect(mountState(s, gun)).toBe('up');
    s.sections.ring.def.shield[0] = 0;
    expect(shieldUp(s, 'ring')).toBe(false);
    s.sections.ring.def.hull = s.sections.ring.def.maxHull * 0.5;
    expect(mountState(s, gun)).toBe('down');
    hitMount(s, gun.id, 'rail', 1000, 'player');
    expect(mountState(s, gun)).toBe('wrecked');
    expect(workingMounts(s, fit).some((m) => m.section === 'ring')).toBe(false);
    s.sections.core.def.hull = 10;
    expect(stepAlert(s, [], AT, DEFENCE.sensor, 0.1, null)).toBe('fallen');
  });
  it('mends: shields after their delay, structure after 45 s at 1% a second, guns rebuilt only with a working drydock', () => {
    const s = fresh();
    const sec = s.sections.core;
    sec.def.shield[0] = 0; sec.def.hull = 1000; sec.sinceHit = 0; sec.def.since[0] = 0;
    stepRepair(s, 2, 1, true);
    expect(sec.def.shield[0]).toBe(0); // deflector delay 3 s
    stepRepair(s, 2, 1, true);
    expect(sec.def.shield[0]).toBeGreaterThan(0);
    expect(sec.def.hull).toBe(1000);
    for (let i = 0; i < 41; i++) stepRepair(s, 1, 1, true);
    expect(sec.def.hull).toBeCloseTo(1000 + sec.def.maxHull * 0.01, 3);
    const gun = Object.keys(s.mounts).find((k) => k.includes('turret'))!;
    expect(hitMount(s, gun, 'plasma', 1000, 'player')).toBe(true);
    stepRepair(s, DEFENCE.rebuild + 1, 1, false);
    expect(s.mounts[gun].hp).toBe(0);
    stepRepair(s, DEFENCE.rebuild + 1, 1, true);
    expect(s.mounts[gun].hp).toBe(s.mounts[gun].maxHp);
  });
});

describe('fire', () => {
  const ms = mounts();
  const fit = fitted(ms, 2, PROFILES.mars);
  const ctx = (contacts: Contact[], planet: { pos: V3; r: number } | null = null) =>
    ({ contacts, planet, power: { turret: 1, pointDefence: 1, minelayer: 1 }, boon: null, rand: seeded() });
  it('cannot see behind its own plating or through the planet', () => {
    const t: Hardpoint = ms.find((m) => m.kind === 'turret')!;
    const ahead: V3 = [t.pos[0] + t.normal[0] * 100, t.pos[1] + t.normal[1] * 100, t.pos[2] + t.normal[2] * 100];
    const behind: V3 = [t.pos[0] - t.normal[0] * 100, t.pos[1] - t.normal[1] * 100, t.pos[2] - t.normal[2] * 100];
    expect(canSee(t, ahead, null)).toBe(true);
    expect(canSee(t, behind, null)).toBe(false);
    const mid: V3 = [(t.pos[0] + ahead[0]) / 2, (t.pos[1] + ahead[1]) / 2, (t.pos[2] + ahead[2]) / 2];
    expect(canSee(t, ahead, { pos: mid, r: 10 })).toBe(false);
  });
  it('holds fire while only wary, then fires every gun that can see a provoker, leading it', () => {
    const s = newStation('stn-mars-1', PROFILES.mars, fit, 2);
    const vel: V3 = [0, 0, 60];
    const p = player([AT[0] + 150, 20, 0], vel);
    s.alert = 'wary';
    expect(fireOrders(s, fit, ctx([p])).length).toBe(0);
    provoke(s, 'player');
    stepAlert(s, [p], AT, DEFENCE.sensor, 0.01, null);
    const orders = fireOrders(s, fit, ctx([p]));
    expect(orders.length).toBeGreaterThanOrEqual(2);
    for (const o of orders) {
      expect(o.munition).toBe('plasma');
      const straight = unit(sub(p.pos, o.from));
      expect(o.dir[2]).toBeGreaterThan(straight[2]); // aimed ahead of a ship moving +z
    }
    expect(fireOrders(s, fit, ctx([p])).length).toBe(0); // all on cooldown
  });
  it('turns point defence on missiles first, even while only wary', () => {
    const s = newStation('stn-mars-1', PROFILES.mars, fit, 2);
    s.alert = 'wary';
    const pd = fit.find((m) => m.kind === 'pointDefence')!;
    const m: Contact = { id: 'm1', kind: 'missile', pos: [pd.pos[0] + pd.normal[0] * 50, pd.pos[1] + pd.normal[1] * 50, pd.pos[2] + pd.normal[2] * 50], vel: [0, 0, 0], r: 0.2, hostile: true };
    const o = fireOrders(s, fit, ctx([m]));
    expect(o.length).toBeGreaterThan(0);
    expect(o.every((x) => x.munition === 'flak' && x.target === 'm1')).toBe(true);
  });
});

describe('navy', () => {
  it('launches a fighter screen when engaged, cruisers and the capital ship under siege, and recalls them when calm', () => {
    const h = newHangar(TIERS[2].housed);
    const launched: string[] = [];
    for (let t = 0; t < 30; t += 0.1) launched.push(...stepHangar(h, 'engaged', 0.1, 1, null).launch);
    expect(launched.filter((x) => x === 'fighter').length).toBe(8);
    expect(launched).not.toContain('cruiser');
    for (let t = 0; t < 20; t += 0.1) launched.push(...stepHangar(h, 'siege', 0.1, 1, null).launch);
    expect(launched.filter((x) => x === 'capital').length).toBe(1);
    expect(launched.filter((x) => x === 'cruiser').length).toBe(2);
    let recall = false;
    for (let t = 0; t < LAUNCH.recallAfter + 0.5; t += 0.1) recall = stepHangar(h, 'calm', 0.1, 1, null).recall || recall;
    expect(recall).toBe(true);
  });
  it('launches faster and calls at once under Hermes; Mars puts up half again as many fighters', () => {
    const count = (boon: 'messenger' | null) => { const h = newHangar(TIERS[2].housed); let n = 0; for (let t = 0; t < 12; t += 0.1) n += stepHangar(h, 'engaged', 0.1, 1, boon).launch.length; return n; };
    expect(count('messenger')).toBeGreaterThan(count(null));
    const h = newHangar(TIERS[2].housed);
    expect(stepHangar(h, 'engaged', 0.1, 1, 'messenger').call).toBe(true);
    expect(stepHangar(newHangar(TIERS[2].housed), 'engaged', 0.1, 1, null).call).toBe(false);
    expect(newHangar(TIERS[2].housed, PROFILES.mars.wing).housed.fighter).toBe(12);
  });
  it('calls its world patrol nearest first, keeping the capital ship on its ring unless besieged', () => {
    const patrol = [
      { id: 1, type: 'capital' as const, pos: [AT[0] + 100, 0, 0] as V3, alive: true },
      { id: 2, type: 'cruiser' as const, pos: [AT[0] + 900, 0, 0] as V3, alive: true },
      { id: 3, type: 'fighter' as const, pos: [AT[0] + 200, 0, 0] as V3, alive: true },
      { id: 4, type: 'fighter' as const, pos: [AT[0] + LAUNCH.callReach * 1.1, 0, 0] as V3, alive: true }, // out of call
    ];
    expect(callNavy({ id: 'x', alert: 'engaged' }, AT, AT, patrol).ships).toEqual([3, 2]);
    expect(callNavy({ id: 'x', alert: 'siege' }, AT, AT, patrol).ships).toEqual([1, 3, 2]);
  });
  it('raises the world’s other stations against the same attacker', () => {
    const ms = mounts();
    const a = newStation('stn-jupiter-1', PROFILES.jupiter, ms, 2);
    const b = newStation('stn-jupiter-2', PROFILES.jupiter, ms, 2);
    provoke(a, 'player');
    a.alert = 'engaged';
    expect(alertSiblings(a, [a, b], 0, null)).toBe(0); // the news takes time
    expect(alertSiblings(a, [a, b], LAUNCH.callDelay, null)).toBe(1);
    expect(alertSiblings(a, [a, b], LAUNCH.callDelay, null)).toBe(0); // already told
    expect(b.alert).toBe('wary');
    expect(isProvokedBy(b, 'player', null)).toBe(true);
  });
  it('keeps launched ships on a leash: they defend the station, they do not chase', () => {
    expect(withinLeash(AT, [AT[0] + DEFENDER.leash - 1, 0, 0])).toBe(true);
    expect(withinLeash(AT, [AT[0] + DEFENDER.leash + 1, 0, 0])).toBe(false);
  });
  it('puts the capital ship between the attacker and the station, never inside the planet', () => {
    const p = interpose([100, 0, 0], [200, 0, 0], null);
    expect(p).toEqual([130, 0, 0]);
    const q = interpose([100, 0, 0], [-100, 0, 0], { pos: [0, 0, 0], r: 90 });
    expect(len(q)).toBeGreaterThanOrEqual(90 * 1.05 - 1e-9);
  });
});

describe('a whole station', () => {
  it('fights a provoking player with its guns and hangar, closes its market, and develops only in peace', () => {
    const run = createStation('stn-mars-1', 'mars', mounts(), 2);
    const rand = seeded(7);
    const p = player([AT[0] + 200, 30, 0], [0, 0, 40]);
    let shots = 0; let launches = 0; let calls = 0;
    const calm = stepStation(run, 1, { at: AT, contacts: [], planet: null, rand });
    expect(calm.marketOpen).toBe(true);
    const dev0 = run.dev;
    expect(dev0).toBeGreaterThan(0);
    provoke(run.sys, 'player');
    for (let t = 0; t < 20; t += 0.05) {
      const s = stepStation(run, 0.05, { at: AT, contacts: [p], planet: null, rand });
      shots += s.fire.length; launches += s.navy.launch.length; calls += s.navy.call ? 1 : 0;
      expect(s.marketOpen).toBe(false);
      provoke(run.sys, 'player');
    }
    expect(run.sys.alert).toBe('engaged');
    expect(shots).toBeGreaterThan(20);
    expect(launches).toBeGreaterThanOrEqual(6);
    expect(calls).toBeGreaterThan(0);
    expect(run.dev).toBe(dev0);
  });
  it('upgrades to a citadel once developed, keeping its damage', () => {
    const run = createStation('stn-saturn-1', 'saturn', mounts('stn-saturn-1'), 2);
    run.sys.sections.core.def.hull *= 0.8;
    expect(upgrade(run)).toBe(false);
    run.dev = DEVELOPMENT.points[3];
    expect(upgrade(run)).toBe(true);
    expect(run.sys.tier).toBe(3);
    expect(run.sys.sections.core.def.hull / run.sys.sections.core.def.maxHull).toBeCloseTo(0.8, 6);
    expect(run.fit.filter((m) => m.kind === 'turret').length).toBe(8);
    expect(shieldFrac(run.sys.sections.ring.def)).toBe(1);
  });
});
