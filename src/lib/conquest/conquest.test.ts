import { describe, expect, it } from 'vitest';
import type { NationId } from '../nations';
import { destGeometry, dist, orbitZone } from '../nav';
import { patrolRadius } from '../nations';
import { FORCE, SHIP_TYPES } from '../shipTypes';
import { applyKill, newProgress } from '../progression/progress';
import { ECONOMY } from '../progression/economy';
import { migrate } from '../store';
import { PRODUCTION, RESOURCES } from './resources';
import { KINDS, SITES, SITE_RULES, TRADE, siteById, sitesOf } from './sites';
import type { ConquestEvent, ConquestState } from './state';
import {
  WORLDS, captureProblem, captureStep, checkControl, controlledCount, hitSite, incomePerMinute, killReward, newConquest,
  onLoss, productionStopped, stepConquest, supplied,
} from './state';
import { migrateConquest } from './persist';
import { grant } from './rewards';
import { armada, capitalCommand } from './unlocks';
import { MOON_STANDINS, moonPlace, orbitRadius, siteFrame, siteLocal, twilightPos } from './anchors';

const TARGETS = WORLDS.filter((w) => w !== 'earth');
const wipe = (c: ConquestState, w: NationId) => { for (const t of SHIP_TYPES) while (c.worlds[w].alive[t] > 0) onLoss(c, w, t); };
const run = (c: ConquestState, secs: number, dt = 1) => { const ev: ConquestEvent[] = []; for (let t = 0; t < secs; t += dt) ev.push(...stepConquest(c, dt)); return ev; };
const launches = (ev: ConquestEvent[], w?: NationId) => ev.filter((e) => e.kind === 'launch' && (!w || e.world === w)) as Extract<ConquestEvent, { kind: 'launch' }>[];
/** Shoot a site down to suppressed and hold it until it is taken. */
const take = (c: ConquestState, id: string) => {
  const s = siteById(id)!;
  const ev = hitSite(c, id, KINDS[s.kind].hp * 4); // through any battery
  if (c.sites[id].owner === 'native') for (let i = 0; i < 400 && c.sites[id].owner === 'native'; i++) ev.push(...captureStep(c, id, 0.25, { inRange: true, contested: false }));
  return ev;
};
const wreck = (c: ConquestState, id: string) => hitSite(c, id, 1e6);

describe('the site tables', () => {
  it('give every world a capital, a shipyard, a foundry and at least one fort; ids are unique', () => {
    expect(new Set(SITES.map((s) => s.id)).size).toBe(SITES.length);
    for (const w of WORLDS) {
      const k = (kind: string) => sitesOf(w).filter((s) => s.kind === kind).length;
      expect(k('capital'), w).toBe(1);
      expect(k('shipyard'), w).toBe(1);
      expect(k('foundry'), w).toBe(1);
      expect(k('fort'), w).toBeGreaterThan(0);
    }
    for (const s of SITES.filter((x) => x.kind === 'works')) { expect(s.res, s.id).toBeTruthy(); expect(s.rich, s.id).toBeGreaterThan(0); }
  });
  it('lets every world source every resource: made at home, or imported (Venus also imports metals when the Descent is down)', () => {
    for (const w of WORLDS) for (const r of RESOURCES) {
      const local = sitesOf(w).some((s) => s.res === r);
      const from = TRADE[w][r];
      expect(local || !!from, `${w} ${r}`).toBe(true);
      if (from) expect(sitesOf(from).some((s) => s.res === r), `${from} sells ${r} to ${w}`).toBe(true);
    }
  });
});

describe('production', () => {
  it('rebuilds a wiped patrol: the first fighter 45 s after, the whole force within 6–16 minutes (15 before the destroyer joined the force)', () => {
    const c = newConquest('earth');
    wipe(c, 'mars');
    const early = launches(run(c, 30), 'mars');
    expect(early).toHaveLength(0); // a window after the patrol dies
    const ev = launches(run(c, 20), 'mars');
    expect(ev.map((e) => e.type)).toEqual(['fighter']);
    expect(ev[0].from).toBe('mars-fabrica');
    let t = 50;
    while (SHIP_TYPES.some((x) => c.worlds.mars.alive[x] < FORCE[x]) && t < 3600) { stepConquest(c, 1); t++; }
    expect(c.worlds.mars.alive).toEqual(FORCE);
    expect(t).toBeGreaterThanOrEqual(6 * 60);
    expect(t).toBeLessThanOrEqual(16 * 60);
  });
  it('never builds past the force', () => {
    const c = newConquest('earth');
    expect(launches(run(c, 1200))).toHaveLength(0);
    expect(c.worlds.mars.alive).toEqual(FORCE);
  });
  it('stops for good once every shipyard and foundry is taken or wrecked', () => {
    const c = newConquest('earth');
    wipe(c, 'mars');
    for (const b of sitesOf('mars').filter((s) => s.kind === 'battery')) wreck(c, b.id);
    take(c, 'mars-navalia');
    wreck(c, 'mars-fabrica');
    expect(productionStopped(c, 'mars')).toBe(true);
    const ev = run(c, 1800);
    expect(launches(ev, 'mars')).toHaveLength(0);
    expect(c.sites['mars-fabrica'].owner).toBe('wrecked'); // nothing left to rebuild it
  });
  it('rebuilds a wreck while a production site still stands, and pauses a suppressed line', () => {
    const c = newConquest('earth');
    for (const b of sitesOf('mars').filter((s) => s.kind === 'battery')) wreck(c, b.id);
    wreck(c, 'mars-mines');
    const ev = run(c, SITE_RULES.rebuild + 2);
    expect(ev.some((e) => e.kind === 'rebuilt' && e.site === 'mars-mines')).toBe(true);
    wipe(c, 'mars');
    hitSite(c, 'mars-fabrica', KINDS.foundry.hp * 1.2); // suppressed (the battery was rebuilt too, so this lands at half)
    expect(launches(run(c, SITE_RULES.repairDelay - 1), 'mars').filter((e) => e.type === 'fighter')).toHaveLength(0);
  });
  it('lays down no capital ship once helium-3 is cut off and spent, but still builds cruisers', () => {
    const c = newConquest('earth');
    c.worlds.moon.controlled = true; // the Moon sells Mars its helium-3
    expect(supplied(c, 'mars', 'helium3')).toBeNull();
    c.worlds.mars.stock.helium3 = 0;
    wipe(c, 'mars');
    const ev = launches(run(c, 3600), 'mars');
    expect(ev.filter((e) => e.type === 'capital')).toHaveLength(0);
    expect(ev.filter((e) => e.type === 'cruiser')).toHaveLength(2);
  });
  it('mobilises: every world the player controls speeds the others', () => {
    const slow = newConquest('earth');
    const fast = newConquest('earth');
    fast.worlds.moon.controlled = true;
    fast.worlds.mercury.controlled = true;
    wipe(slow, 'mars'); wipe(fast, 'mars');
    const at = (c: ConquestState) => { let t = 0; while (!launches(stepConquest(c, 0.5), 'mars').length) t += 0.5; return t; };
    expect(at(fast)).toBeLessThan(at(slow));
  });
});

describe('damage, capture and control', () => {
  it('batteries halve the damage other sites take; cities cannot be wrecked', () => {
    const c = newConquest('earth');
    hitSite(c, 'mars-navalia', 100);
    expect(c.sites['mars-navalia'].hp).toBe(KINDS.shipyard.hp - 50);
    wreck(c, 'mars-limes');
    hitSite(c, 'mars-navalia', 100);
    expect(c.sites['mars-navalia'].hp).toBe(KINDS.shipyard.hp - 150);
    wreck(c, 'mars-quirinal');
    expect(c.sites['mars-quirinal'].owner).toBe('native');
    expect(c.sites['mars-quirinal'].hp).toBe(KINDS.capital.hp * SITE_RULES.cityFloor);
  });
  it('pays a site once, whether wrecked or captured', () => {
    const c = newConquest('earth');
    const ev = wreck(c, 'mars-limes');
    expect(ev.filter((e) => e.kind === 'reward')).toEqual([{ kind: 'reward', xp: KINDS.battery.xp, credits: KINDS.battery.credits, why: 'Wrecked The Limes Batteries' }]);
    expect(wreck(c, 'mars-limes')).toEqual([]);
  });
  it('captures only a suppressed, uncontested site held in range for its hold time; progress drains when it is not', () => {
    const c = newConquest('earth');
    wreck(c, 'mars-limes');
    const id = 'mars-navalia';
    const ok = { inRange: true, contested: false };
    expect(captureProblem(c, id, ok)).toMatch(/suppressed/);
    hitSite(c, id, KINDS.shipyard.hp * 0.6);
    expect(captureProblem(c, id, { inRange: false, contested: false })).toMatch(/far/);
    expect(captureProblem(c, id, { inRange: true, contested: true })).toMatch(/contested/);
    captureStep(c, id, 10, ok);
    captureStep(c, id, 2, { ...ok, contested: true });
    expect(c.sites[id].hold).toBe(10); // their ships nearby pause it
    captureStep(c, id, 2, { ...ok, inRange: false });
    expect(c.sites[id].hold).toBe(10 - 2 * SITE_RULES.drain); // leaving drains it
    let ev: ConquestEvent[] = [];
    for (let t = 0; t < 30 && c.sites[id].owner === 'native'; t += 1) ev = captureStep(c, id, 1, ok);
    expect(c.sites[id].owner).toBe('player');
    expect(c.sites[id].hp).toBe(KINDS.shipyard.hp);
    expect(ev.some((e) => e.kind === 'reward' && e.xp === KINDS.shipyard.xp)).toBe(true);
  });
  it('holds a city back while a fort stands, and controls the world once the capital and every fort are taken', () => {
    const c = newConquest('earth');
    wipe(c, 'mars');
    wreck(c, 'mars-limes');
    hitSite(c, 'mars-quirinal', 1e6);
    expect(captureProblem(c, 'mars-quirinal', { inRange: true, contested: false })).toMatch(/forts/);
    take(c, 'mars-prima');
    wreck(c, 'mars-secunda');
    const ev = take(c, 'mars-quirinal');
    expect(c.worlds.mars.controlled).toBe(true);
    expect(ev.some((e) => e.kind === 'control' && e.world === 'mars')).toBe(true);
    expect(ev.some((e) => e.kind === 'reward' && e.xp === SITE_RULES.controlXp)).toBe(true);
    // Everything still the owner's surrendered; the wreck stays a wreck.
    expect(sitesOf('mars').filter((s) => c.sites[s.id].owner === 'native')).toHaveLength(0);
    expect(c.sites['mars-secunda'].owner).toBe('wrecked');
    expect(productionStopped(c, 'mars')).toBe(true);
    expect(launches(run(c, 1800), 'mars')).toHaveLength(0);
    expect(checkControl(c, 'mars')).toEqual([]);
  });
  it('never touches the player’s home world', () => {
    const c = newConquest('mars');
    expect(hitSite(c, 'mars-limes', 1e6)).toEqual([]);
    expect(c.sites['mars-limes'].owner).toBe('native');
    wipe(c, 'mars');
    expect(launches(run(c, 600), 'mars')).toHaveLength(0);
  });
});

describe('kills, rewards and income', () => {
  it('pays veterans in full and levies half; the veteran count only falls', () => {
    const c = newConquest('earth');
    const v = [0, 1, 2, 3].map(() => onLoss(c, 'mars', 'fighter').veteran);
    expect(v).toEqual([true, true, true, true]);
    run(c, 50);
    expect(c.worlds.mars.alive.fighter).toBe(1);
    expect(onLoss(c, 'mars', 'fighter').veteran).toBe(false);
    expect(killReward('cruiser', true)).toEqual({ xp: ECONOMY.killXp.cruiser, credits: ECONOMY.killCredits.cruiser });
    expect(killReward('cruiser', false)).toEqual({ xp: ECONOMY.killXp.cruiser / 2, credits: Math.round(ECONOMY.killCredits.cruiser / 2) });
  });
  it('grant levels up exactly as a kill does', () => {
    let a = newProgress('earth');
    let b = newProgress('earth');
    const la: string[] = [];
    const lb: string[] = [];
    for (let i = 0; i < 3; i++) { const x = applyKill(a, 'cruiser'); a = x.p; la.push(...x.lines); const y = grant(b, ECONOMY.killXp.cruiser, ECONOMY.killCredits.cruiser, 1); b = y.p; lb.push(...y.lines); }
    expect(b).toEqual(a);
    expect(lb).toEqual(la);
  });
  it('pays income from held sites, in flight time, plus tolls on cut trade', () => {
    const c = newConquest('earth');
    expect(incomePerMinute(c)).toBe(0);
    c.sites['mars-navalia'].owner = 'player';
    expect(incomePerMinute(c)).toBe(KINDS.shipyard.income);
    c.sites['mars-navalia'].owner = 'native';
    c.worlds.saturn.controlled = true; // six worlds buy Titan's hydrocarbons and Jupiter its food: seven links
    expect(incomePerMinute(c)).toBe(7 * PRODUCTION.toll);
    const ev = run(c, 60).filter((e) => e.kind === 'reward');
    expect(ev.reduce((a, e) => a + (e.kind === 'reward' ? e.credits : 0), 0)).toBe(35);
  });
});

describe('save and reload', () => {
  it('keeps every number through a save', () => {
    const c = newConquest('venus');
    wipe(c, 'mars');
    take(c, 'mars-navalia');
    hitSite(c, 'mars-fabrica', 300);
    run(c, 77);
    const back = migrate(JSON.parse(JSON.stringify({ ...migrate(null), conquest: c }))).conquest;
    expect(migrateConquest(back, 'venus')).toEqual(c);
  });
  it('a reload does not bring dead ships back or refill veterans', () => {
    const c = newConquest('earth');
    wipe(c, 'jupiter');
    const back = migrateConquest(JSON.parse(JSON.stringify(c)), 'earth')!;
    expect(back.worlds.jupiter.alive).toEqual({ capital: 0, cruiser: 0, fighter: 0, destroyer: 0 });
    expect(back.worlds.jupiter.veterans).toEqual({ capital: 0, cruiser: 0, fighter: 0, destroyer: 0 });
  });
  it('repairs what it cannot trust', () => {
    expect(migrateConquest(null, 'earth')).toBeNull();
    expect(migrateConquest({ v: 9 }, 'earth')).toBeNull();
    const c = migrateConquest({ v: 1, clock: -4, worlds: { mars: { alive: { fighter: 99, cruiser: 'x' }, controlled: true }, pluto: {} }, sites: { 'mars-quirinal': { owner: 'wrecked', hp: 5 }, 'mars-navalia': { owner: 'bogus', hp: 1e9 } } }, 'mars')!;
    expect(c.clock).toBe(0);
    expect(c.worlds.mars.alive.fighter).toBe(FORCE.fighter);
    expect(c.worlds.mars.alive.cruiser).toBe(FORCE.cruiser);
    expect(c.worlds.mars.controlled).toBe(false); // the home world is never controlled
    expect(c.sites['mars-quirinal'].owner).toBe('native'); // a capital cannot be a wreck
    expect(c.sites['mars-navalia']).toMatchObject({ owner: 'native', hp: KINDS.shipyard.hp });
  });
});

describe('the steps after the bay', () => {
  it('opens capital-ship command at level 8 with a held shipyard on a controlled world and helium-3', () => {
    const c = newConquest('earth');
    expect(capitalCommand(7, c).open).toBe(false);
    expect(capitalCommand(8, c).why).toMatch(/shipyard/);
    c.worlds.mars.controlled = true;
    c.sites['mars-navalia'].owner = 'player';
    expect(capitalCommand(8, c).why).toMatch(/helium/);
    c.sites['moon-ovens'].owner = 'player';
    expect(capitalCommand(8, c).open).toBe(true);
  });
  it('opens the armada at level 10 with three worlds', () => {
    const c = newConquest('earth');
    for (const w of ['moon', 'mars'] as NationId[]) c.worlds[w].controlled = true;
    expect(armada(10, c).open).toBe(false);
    c.worlds.venus.controlled = true;
    expect(controlledCount(c)).toBe(3);
    expect(armada(9, c).open).toBe(false);
    expect(armada(10, c).open).toBe(true);
  });
});

describe('where sites sit', () => {
  const geo = destGeometry();
  it('puts surface sites on the surface, cloud cities just above it, orbital sites between the rings and inside the orbit zone', () => {
    for (const s of SITES) {
      const home = geo.find((g) => g.id === s.world)!;
      const p = siteLocal(s, geo);
      const f = siteFrame(s);
      if (f === 'spin') expect(Math.hypot(...p) / home.size, s.id).toBeCloseTo(s.at.place === 'air' ? 1.009 : 1, 6);
      if (f === 'world') {
        const d = dist(p, home.pos);
        expect(d, s.id).toBeGreaterThan(home.size * 1.05);
        expect(d, s.id).toBeLessThan(patrolRadius(home));
        expect(d, s.id).toBeCloseTo(orbitRadius(home), 6);
      }
    }
  });
  it('puts each stand-in moon outside its planet’s orbit zone, ordered outward by real distance', () => {
    for (const p of ['jupiter', 'saturn'] as const) {
      const g = geo.find((x) => x.id === p)!;
      const ms = MOON_STANDINS.filter((m) => m.planet === p).sort((a, b) => a.aKm - b.aKm).map((m) => moonPlace(m.id, geo));
      ms.forEach((m) => expect(dist(m.pos, g.pos) - m.size).toBeGreaterThan(orbitZone(g)));
      for (let i = 1; i < ms.length; i++) expect(dist(ms[i].pos, g.pos)).toBeGreaterThan(dist(ms[i - 1].pos, g.pos));
    }
  });
  it('keeps Lakedaimon on the twilight line, a quarter turn from the Sun', () => {
    const merc = geo.find((g) => g.id === 'mercury')!;
    const sun = geo.find((g) => g.id === 'sun')!.pos;
    const p = twilightPos(merc, sun);
    const a = [p[0] - merc.pos[0], p[2] - merc.pos[2]];
    const b = [sun[0] - merc.pos[0], sun[2] - merc.pos[2]];
    expect(Math.abs(a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]))).toBeLessThan(1e-9);
    expect(dist(p, merc.pos)).toBeCloseTo(merc.size, 6);
  });
  it('has a site for every target world', () => {
    for (const w of TARGETS) expect(sitesOf(w).length).toBeGreaterThan(7);
  });
});
