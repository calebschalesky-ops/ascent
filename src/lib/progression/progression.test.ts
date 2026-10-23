import { afterEach, describe, expect, it } from 'vitest';
import { NATIONS, PLAYER_NATION, setPlayerNation } from '../nations';
import { destGeometry, dist, orbitZone } from '../nav';
import { migrate } from '../store';
import { LOADOUTS, MODULES, SLOT_KINDS, START_TIER, fitModules, fitProblem, fitStats } from './catalog';
import { ECONOMY } from './economy';
import { MAX_LEVEL, UNLOCKS, baySlotsAt, levelOf, levelProgress, tierAt, xpForLevel } from './levels';
import { DEATH, applyKill, buy, deathCost, buyFighter, buyProblem, engineWeapons, fighterProblem, fitFromHold, homeSpawn, migrateProgress, newProgress, shipName } from './progress';
import { ARSENAL_ID, RACE_REFS, SHIP_TYPES } from './refs';
import type { Wing } from './wingman';
import { WING, formationPoint, launchWing, stepWing } from './wingman';

const kills = (n: number, nation = NATIONS[0].id) => {
  let p = newProgress(nation);
  const lines: string[] = [];
  for (let i = 0; i < n; i++) { const r = applyKill(p, 'cruiser'); p = r.p; lines.push(...r.lines); }
  return { p, lines };
};

describe('level curve', () => {
  it('starts at level 1 and needs 100 more experience for each level than the last', () => {
    expect(levelOf(0)).toBe(1);
    expect([2, 3, 4, 5, 10].map(xpForLevel)).toEqual([100, 300, 600, 1000, 4500]);
    for (let l = 2; l < MAX_LEVEL; l++) expect(xpForLevel(l + 1) - xpForLevel(l) - (xpForLevel(l) - xpForLevel(l - 1))).toBe(100);
  });
  it('reads the level from experience, and stops at the cap', () => {
    expect(levelOf(99)).toBe(1);
    expect(levelOf(100)).toBe(2);
    expect(levelOf(299)).toBe(2);
    expect(levelOf(1e9)).toBe(MAX_LEVEL);
    expect(levelProgress(150)).toEqual({ level: 2, into: 50, need: 200 });
    expect(levelProgress(1e9).need).toBeNull();
  });
});

describe('unlock schedule', () => {
  it('has one row per level, never takes anything away, and opens the bay early', () => {
    expect(UNLOCKS.map((u) => u.level)).toEqual(Array.from({ length: MAX_LEVEL }, (_, i) => i + 1));
    for (let i = 1; i < UNLOCKS.length; i++) {
      expect(UNLOCKS[i].baySlots).toBeGreaterThanOrEqual(UNLOCKS[i - 1].baySlots);
      expect(UNLOCKS[i].tier).toBeGreaterThanOrEqual(UNLOCKS[i - 1].tier);
    }
    expect(baySlotsAt(1)).toBe(0);
    expect(baySlotsAt(2)).toBe(1);
    expect(baySlotsAt(MAX_LEVEL)).toBe(4);
    expect(tierAt(1)).toBe(1);
    expect(tierAt(MAX_LEVEL)).toBe(Math.max(...MODULES.map((m) => m.tier)));
  });
  it('every tier is on sale by some level', () => {
    for (const m of MODULES) expect(UNLOCKS.some((u) => u.tier >= m.tier)).toBe(true);
  });
});

describe('loadouts', () => {
  it('has 28: every race × capital, cruiser, fighter and destroyer, each valid against the module list and its slots', () => {
    let n = 0;
    for (const r of RACE_REFS) {
      for (const t of SHIP_TYPES) {
        const f = LOADOUTS[r.nation][t];
        expect(fitProblem(f, t, START_TIER[t]), `${r.nation} ${t}`).toBeNull();
        expect(f.weapon.length, `${r.nation} ${t} has a weapon`).toBeGreaterThan(0);
        n++;
      }
    }
    expect(n).toBe(28);
    expect(Object.keys(LOADOUTS).sort()).toEqual(NATIONS.map((x) => x.id).sort());
  });
  it('no two races carry the same loadout for a ship type', () => {
    for (const t of SHIP_TYPES) {
      const keys = RACE_REFS.map((r) => fitModules(LOADOUTS[r.nation][t]).sort().join(','));
      expect(new Set(keys).size, t).toBe(RACE_REFS.length);
    }
  });
  it('uses only modules with a price and an arsenal mapping', () => {
    for (const m of MODULES) {
      expect(ECONOMY.prices[m.id]).toBeGreaterThan(0);
      expect(ARSENAL_ID[m.id]).toBeTruthy();
    }
    expect(MODULES.filter((m) => m.kind === 'weapon').map((m) => m.id).sort()).toEqual(['beam', 'flak', 'ion', 'mine', 'plasma', 'pulse', 'rail', 'seeker', 'swarm', 'torpedo']); // arsenal's MunitionId
  });
  it('follows doctrine: Mars carries the most armour of the cruisers, the Moon the only drone, Mercury the bi-facet shield', () => {
    const hp = (n: (typeof RACE_REFS)[number]['nation']) => fitStats(LOADOUTS[n].cruiser).hp;
    expect(Math.max(...RACE_REFS.map((r) => hp(r.nation)))).toBe(hp('mars'));
    expect(RACE_REFS.filter((r) => LOADOUTS[r.nation].cruiser.support.includes('droneRepair')).map((r) => r.nation)).toEqual(['moon']);
    expect(LOADOUTS.mercury.cruiser.defence).toEqual(['bifacet']);
  });
  it('a level-1 cruiser fires what it carries: the Moon has no missile', () => {
    expect(engineWeapons(newProgress('moon'))).toEqual(['laser']);
    expect(engineWeapons(newProgress('earth'))).toEqual(['laser', 'missile']);
  });
});

describe('faction start', () => {
  afterEach(() => setPlayerNation('earth'));
  it('makes the chosen nation the player’s, and only that one', () => {
    setPlayerNation('mars');
    expect(PLAYER_NATION).toBe('mars');
    expect(NATIONS.filter((n) => n.player).map((n) => n.id)).toEqual(['mars']);
  });
  it('names the ship for the race and starts it in that race’s cruiser loadout', () => {
    const p = newProgress('jupiter');
    expect(shipName(p)).toBe('Diadoch Sarissa');
    expect(p.fit).toEqual(LOADOUTS.jupiter.cruiser);
    expect(p.fit).not.toBe(LOADOUTS.jupiter.cruiser); // a copy: buying must not change the table
    expect(p.credits).toBe(ECONOMY.startCredits);
  });
  it('spawns at home: Earth as before, every other race near its own planet, outside it and inside its orbit zone', () => {
    const geo = destGeometry();
    expect(homeSpawn('earth', geo)).toBeNull();
    for (const n of NATIONS.filter((x) => x.id !== 'earth')) {
      const s = homeSpawn(n.id, geo)!;
      const home = geo.find((g) => g.id === n.home)!;
      const d = dist(s.pos, home.pos);
      expect(d, n.id).toBeGreaterThan(home.size * 1.3);
      expect(d, n.id).toBeLessThan(orbitZone(home));
      const nearest = geo.filter((g) => g.size > 0).sort((a, b) => dist(s.pos, a.pos) - dist(s.pos, b.pos))[0];
      expect(nearest.id, n.id).toBe(n.home);
    }
  });
});

describe('experience, bay and purchases', () => {
  it('three cruiser kills reach level 2, which opens the bay with a free fighter', () => {
    const two = kills(2);
    expect(levelOf(two.p.xp)).toBe(1);
    expect(two.p.fighters).toBe(0);
    const three = kills(3);
    expect(levelOf(three.p.xp)).toBe(2);
    expect(three.p.fighters).toBe(1);
    expect(three.p.credits).toBe(ECONOMY.startCredits + 3 * ECONOMY.killCredits.cruiser);
    expect(three.lines).toEqual(['Level 2', 'Bay slot 1 open', 'A Sparrow fighter joins your bay']);
  });
  it('sells a fighter only into an open slot', () => {
    const p = kills(3).p;
    expect(fighterProblem(p)).toBe('Bay full: no open slot');
    expect(fighterProblem(newProgress('earth'))).toBe('The bay opens at level 2');
    const l4 = { ...kills(15).p, credits: 1000 };
    expect(levelOf(l4.xp)).toBe(4);
    const bought = buyFighter(l4);
    expect(bought.fighters).toBe(2);
    expect(bought.credits).toBe(1000 - ECONOMY.fighterPrice);
    expect(buyFighter(bought)).toBe(bought);
  });
  it('sells a module only once its tier is open and the credits are there; it goes into the hold when slots are full', () => {
    const p = { ...newProgress('earth'), credits: 1000 };
    expect(buyProblem(p, 'plasma')).toMatch(/Tier 2/);
    expect(buyProblem({ ...p, credits: 10 }, 'armour')).toBe('Not enough credits');
    const q = buy(p, 'armour');
    expect(q.credits).toBe(1000 - ECONOMY.prices.armour);
    expect(q.inventory).toEqual(['armour']); // the cruiser's one defence slot holds its shield
    expect(q.bought).toEqual(['armour']);
    const r = fitFromHold(q, 'defence', 0, 'armour');
    expect(r.fit.defence).toEqual(['armour']);
    expect(r.inventory).toEqual(['deflector']);
    expect(fitProblem(r.fit, 'cruiser')).toBeNull();
  });
  it('fits a bought weapon into a free slot at once', () => {
    const p = { ...newProgress('earth'), credits: 1000, fit: { ...newProgress('earth').fit, weapon: ['pulse' as const] } };
    expect(buy(p, 'rail').fit.weapon).toEqual(['pulse', 'rail']);
  });
});

describe('save migration', () => {
  it('an old save without progress loads as an Earth pilot (null progress)', () => {
    const d = migrate({ app: 'ascent-flight', version: 1, journey: { ship: { pos: [1, 2, 3], yaw: 0, pitch: 0, target: null }, savedAt: 5 }, settings: {} });
    expect(d.progress).toBeNull();
    expect(d.journey?.savedAt).toBe(5);
  });
  it('keeps race, experience, credits, fit, hold, bay and purchases through a save', () => {
    let p = kills(15, 'saturn').p;
    p = buy({ ...p, credits: 2000 }, 'mine');
    p = buyFighter(p);
    const back = migrate(JSON.parse(JSON.stringify({ ...migrate(null), progress: p }))).progress;
    expect(back).toEqual(p);
  });
  it('repairs what it cannot trust', () => {
    expect(migrateProgress({ nation: 'pluto' })).toBeNull();
    const p = migrateProgress({ nation: 'mars', xp: -5, credits: 'lots', fighters: 9, fit: { weapon: ['pulse', 'pulse', 'pulse'] }, inventory: ['pulse', 'banana'] })!;
    expect(p.xp).toBe(0);
    expect(p.credits).toBe(ECONOMY.startCredits);
    expect(p.fighters).toBe(0); // level 1 has no bay slots
    expect(p.fit).toEqual(LOADOUTS.mars.cruiser); // three weapons do not fit a cruiser
    expect(p.inventory).toEqual(['pulse']);
    for (const k of SLOT_KINDS) expect(Array.isArray(p.fit[k])).toBe(true);
    // A fit naming a module that no longer exists is not trusted at all.
    expect(migrateProgress({ nation: 'moon', fit: { weapon: ['laser', 'missile'], defence: ['deflector'], support: [] } })!.fit).toEqual(LOADOUTS.moon.cruiser);
  });
});

describe('wingman', () => {
  const run = (w: Wing, ctx: Parameters<typeof stepWing>[1], secs: number) => {
    let fired = 0;
    let docked = false;
    for (let i = 0; i < secs * 30 && !docked; i++) {
      const r = stepWing(w, { ...ctx, t: i / 30 }, 1 / 30);
      if (r.fire) fired++;
      docked = r.docked;
    }
    return { fired, docked };
  };
  it('escorts: settles into its formation slot beside a moving player', () => {
    const w = launchWing(0, [0, 0, 0], [0, 0, -5]);
    const ctx = { player: [0, 0, 0] as [number, number, number], playerVel: [0, 0, 0] as [number, number, number], fwd: [0, 0, -1] as [number, number, number], target: null, recall: false, t: 0 };
    run(w, ctx, 4);
    expect(w.state).toBe('escort');
    expect(dist(w.pos, formationPoint(0, ctx.player, ctx.fwd))).toBeLessThan(0.05);
    expect(dist(formationPoint(0, ctx.player, ctx.fwd), formationPoint(1, ctx.player, ctx.fwd))).toBeGreaterThan(0.8); // slots apart
  });
  it('attacks the player’s target: closes to its stand-off and fires at the weapon rate', () => {
    const w = launchWing(1, [0, 0, 0], [0, 0, 0]);
    const target: [number, number, number] = [0, 0, -40];
    const { fired } = run(w, { player: [0, 0, 0], playerVel: [0, 0, 0], fwd: [0, 0, -1], target, recall: false, t: 0 }, 6);
    expect(w.state).toBe('attack');
    expect(dist(w.pos, target)).toBeLessThan(WING.standoff + 0.5);
    expect(fired).toBeGreaterThan(8);
    expect(fired).toBeLessThanOrEqual(6 * WING.rate + 1);
  });
  it('returns and docks when recalled, without firing', () => {
    const w = launchWing(0, [0, 0, -30], [0, 0, 0]);
    const { fired, docked } = run(w, { player: [0, 0, 0], playerVel: [0, 0, 0], fwd: [0, 0, -1], target: [0, 0, -32], recall: true, t: 0 }, 5);
    expect(w.state).toBe('return');
    expect(docked).toBe(true);
    expect(fired).toBe(0);
  });
});

describe('death costs something (GP-15a)', () => {
  it('takes the fighters that were out and a share of credits', () => {
    const p = { ...newProgress('earth'), credits: 1000, fighters: 3 };
    const r = deathCost(p, 2);
    expect(r.credits).toBe(1000 * DEATH.creditsPct / 100);
    expect(r.p.credits).toBe(1000 - r.credits);
    expect(r.fighters).toBe(2);
    expect(r.p.fighters).toBe(1);
  });
  it('never takes more fighters than the bay had, nor goes below zero', () => {
    const r = deathCost({ ...newProgress('mars'), credits: 5, fighters: 1 }, 4);
    expect(r.p.fighters).toBe(0);
    expect(r.p.credits).toBeGreaterThanOrEqual(0);
  });
});
