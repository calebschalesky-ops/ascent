import { describe, expect, it } from 'vitest';
import type { V3 } from '../nav';
import { add, scale } from '../nav';
import type { NationId } from '../nations';
import { craftStats } from '../craftStats';
import { fitStats, loadoutOf } from '../progression/catalog';
import { LAUNCHED_SPECS, SHIP_SPECS } from '../shipTypes';
import type { Boarder, Hull } from './boarder';
import { breachDamage, crewOf, hullFrac, impact, launch, pdDps, pointDefence, shieldFrac, stepDrill, stepFlight, turnToward } from './boarder';
import { enemyLaunch, pickLauncher } from './enemy';
import { escortStep, migratePrizes } from './prize';
import { BOARDER, NATION_BOARDING, boarderOf } from './spec';
import { HULL_FIGHT, resolve } from './troops';

const L = 0.371;
let nextId = 1;
const hull = (o: Partial<Hull> & Pick<Hull, 'type' | 'nation'>): Hull => {
  const { hp } = craftStats(o.nation, o.type);
  return { id: nextId++, side: 1, pos: [0, 0, 0], vel: [0, 0, 0], radius: SHIP_SPECS[o.type].hitRadius * L, hp, maxHp: hp, alive: true, ...o };
};
const shieldCap = (n: NationId, t: Hull['type']) => fitStats(loadoutOf(n, t)).shield;

/** Fly boarders at a target under its point defence; return what became of each. */
function fly(bs: Boarder[], target: Hull, pd: number, seconds = 25, dt = 1 / 30) {
  const out = new Map<number, 'hit' | 'shot' | 'fuel'>();
  for (let t = 0; t < seconds && out.size < bs.length; t += dt) {
    target.pos = add(target.pos, scale(target.vel, dt));
    const dmg = pointDefence([{ hull: target, dps: pd }], bs.filter((b) => !out.has(b.id)), dt, L);
    for (const b of bs) {
      if (out.has(b.id)) continue;
      b.hp -= dmg.get(b.id) ?? 0;
      if (b.hp <= 0) { out.set(b.id, 'shot'); continue; }
      const r = stepFlight(b, target, dt, L);
      if (r) out.set(b.id, r);
    }
  }
  return out;
}

describe('the boarder', () => {
  it('has its own row: bigger than a fighter, smaller than a cruiser; a model and a name per nation', () => {
    const s = LAUNCHED_SPECS.boarder;
    expect(s.size).toBeGreaterThan(SHIP_SPECS.fighter.size);
    expect(s.size).toBeLessThan(SHIP_SPECS.cruiser.size);
    const names = Object.values(NATION_BOARDING).map((n) => n.name);
    expect(names).toHaveLength(7);
    expect(new Set(names).size).toBe(7);
    expect(NATION_BOARDING.mars.name).toBe('Harpax');
  });
  it('flies slower than a fighter (so it can be caught) and turns toward its target', () => {
    expect(BOARDER.speed).toBeLessThan(60);
    const d = turnToward([1, 0, 0], [0, 1, 0], 0.1);
    expect(Math.acos(d[0])).toBeCloseTo(0.1, 6);
    expect(turnToward([1, 0, 0], [0.999, 0.0447, 0], 0.1)).toEqual([0.999, 0.0447, 0]);
  });
  it('reaches a cruiser on its patrol from launch range, with nothing shooting at it', () => {
    const from = hull({ type: 'capital', nation: 'earth', side: 0 });
    const tgt = hull({ type: 'cruiser', nation: 'mars', pos: [200 * L, 30 * L, 0], vel: [0, 0, 4] });
    const b = launch(1, from, tgt, L);
    expect(fly([b], tgt, 0).get(1)).toBe('hit');
    expect(b.age).toBeLessThan(BOARDER.life);
    expect(b.contact).not.toBeNull();
    expect(Math.hypot(...b.contact!)).toBeCloseTo(tgt.radius * 0.8, 9);
    // With the plating given, it clamps on there instead.
    const c = launch(2, from, { ...tgt, skin: 0.1 }, L);
    fly([c], { ...tgt, skin: 0.1 }, 0);
    expect(Math.hypot(...c.contact!)).toBeCloseTo(0.1, 9);
  });
  it('runs out of fuel chasing something it cannot catch', () => {
    const from = hull({ type: 'capital', nation: 'earth', side: 0 });
    const tgt = hull({ type: 'cruiser', nation: 'mars', pos: [200 * L, 0, 0], vel: [200, 0, 0] });
    expect(fly([launch(1, from, tgt, L)], tgt, 0).get(1)).toBe('fuel');
  });
});

describe('point defence', () => {
  it('flak and point-defence drones add to it; a battered ship has less', () => {
    expect(pdDps('cruiser', loadoutOf('mercury', 'cruiser'), 1)).toBeGreaterThan(pdDps('cruiser', loadoutOf('earth', 'cruiser'), 1));
    expect(pdDps('cruiser', loadoutOf('mercury', 'cruiser'), 0.2)).toBeLessThan(pdDps('cruiser', loadoutOf('mercury', 'cruiser'), 1));
    expect(pdDps('capital', loadoutOf('mars', 'capital'), 1)).toBeGreaterThan(pdDps('cruiser', loadoutOf('mars', 'cruiser'), 1));
  });
  it('one boarder at a fresh Mercury cruiser (rail and flak) is shot down; at an Earth cruiser it gets through', () => {
    const from = hull({ type: 'capital', nation: 'earth', side: 0, pos: [-200 * L, 0, 0] });
    const merc = hull({ type: 'cruiser', nation: 'mercury' });
    expect(fly([launch(1, from, merc, L)], merc, pdDps('cruiser', loadoutOf('mercury', 'cruiser'), 1)).get(1)).toBe('shot');
    const earth = hull({ type: 'cruiser', nation: 'earth', side: 1 });
    expect(fly([launch(2, from, earth, L)], earth, pdDps('cruiser', loadoutOf('earth', 'cruiser'), 1)).get(2)).toBe('hit');
  });
  it('splits its fire: two boarders at that Mercury cruiser and at least one gets through', () => {
    const from = hull({ type: 'capital', nation: 'earth', side: 0, pos: [-200 * L, 0, 0] });
    const merc = hull({ type: 'cruiser', nation: 'mercury' });
    const r = fly([launch(1, from, merc, L), launch(2, from, merc, L)], merc, pdDps('cruiser', loadoutOf('mercury', 'cruiser'), 1));
    expect([...r.values()]).toContain('hit');
  });
  it('fires only at the other side’s boarders, in range', () => {
    const own = hull({ type: 'cruiser', nation: 'earth', side: 0 });
    const tgt = hull({ type: 'cruiser', nation: 'mars' });
    const b = launch(1, own, tgt, L);
    expect(pointDefence([{ hull: own, dps: 50 }], [b], 1, L).size).toBe(0);
    const far = hull({ type: 'cruiser', nation: 'mars', pos: [1000, 0, 0] });
    expect(pointDefence([{ hull: far, dps: 50 }], [b], 1, L).size).toBe(0);
    expect(pointDefence([{ hull: tgt, dps: 50 }], [b], 1, L).get(1)).toBeCloseTo(50, 9);
  });
});

describe('impact and the drill', () => {
  it('a shield above a quarter deflects it; a shield stripped lets the drill start', () => {
    const cap = shieldCap('earth', 'cruiser');
    const { hp } = craftStats('earth', 'cruiser');
    expect(shieldFrac(hp, hp, cap)).toBe(1);
    expect(shieldFrac(hp - cap, hp, cap)).toBe(0);
    const from = hull({ type: 'capital', nation: 'earth', side: 0 });
    const tgt = hull({ type: 'cruiser', nation: 'earth' });
    const a = launch(1, from, tgt, L);
    expect(impact(a, 0.5)).toBe('deflected');
    expect(a.lost).toBe('deflected');
    const b = launch(2, from, tgt, L);
    expect(impact(b, 0.2)).toBe('drilling');
  });
  it('a Roman cruiser carries armour, not a shield, so it is always open to boarding', () => {
    const { hp } = craftStats('mars', 'cruiser');
    expect(shieldCap('mars', 'cruiser')).toBe(0);
    expect(shieldFrac(hp, hp, 0)).toBe(0);
    expect(hullFrac(hp, hp, 0)).toBe(1);
  });
  it('drills for its nation’s time, then the troops are inside; the breach costs 4%', () => {
    const tgt = hull({ type: 'cruiser', nation: 'mars' });
    const b = launch(1, hull({ type: 'capital', nation: 'venus', side: 0 }), tgt, L);
    impact(b, 0);
    let t = 0;
    while (!stepDrill(b, 0.1)) t += 0.1;
    expect(t).toBeLessThan(boarderOf('venus').drill);
    expect(t + 0.1 + 1e-9).toBeGreaterThanOrEqual(boarderOf('venus').drill);
    expect(boarderOf('venus').drill).toBeLessThan(boarderOf('earth').drill);
    expect(b.phase).toBe('inside');
    expect(breachDamage(200)).toBeCloseTo(8, 9);
  });
});

describe('the fight inside', () => {
  const marines = (n: number, nation: NationId = 'earth') => ({ strength: boarderOf(nation).troops * n, quality: boarderOf(nation).quality });
  it('one boarder is repelled by a cruiser’s full crew, and takes a cruiser at 70% hull', () => {
    expect(resolve(marines(1), crewOf('cruiser', 'earth', 1)).outcome).toBe('repelled');
    const f = resolve(marines(1), crewOf('cruiser', 'earth', 0.7));
    expect(f.outcome).toBe('captured');
    expect(f.attackers.strength).toBeGreaterThan(0);
    expect(f.t).toBeGreaterThan(3);
    expect(f.t).toBeLessThan(30);
  });
  it('a fresh capital ship takes five boarders; four are repelled; three do it once its hull is under a third', () => {
    expect(resolve(marines(4), crewOf('capital', 'earth', 1)).outcome).toBe('repelled');
    expect(resolve(marines(5), crewOf('capital', 'earth', 1)).outcome).toBe('captured');
    expect(resolve(marines(3), crewOf('capital', 'earth', 0.3)).outcome).toBe('captured');
  });
  it('Spartan crews are harder to take than Selenite ones; legions bring more people', () => {
    expect(crewOf('cruiser', 'mercury', 1).quality).toBeGreaterThan(crewOf('cruiser', 'moon', 1).quality);
    expect(boarderOf('mars').troops).toBeGreaterThan(boarderOf('earth').troops);
  });
  it('a second boarder arriving mid-fight turns it', () => {
    const f = HULL_FIGHT.start(marines(1), crewOf('cruiser', 'earth', 1));
    HULL_FIGHT.step(f, 2);
    expect(f.outcome).toBe('fighting');
    HULL_FIGHT.reinforce(f, marines(1));
    for (let i = 0; i < 300 && f.outcome === 'fighting'; i++) HULL_FIGHT.step(f, 0.5);
    expect(f.outcome).toBe('captured');
  });
});

describe('who launches', () => {
  const cap = (o: Partial<Hull> = {}) => hull({ type: 'capital', nation: 'earth', side: 0, ...o });
  it('the player: the nearest stocked capital ship in range; otherwise it says why', () => {
    const tgt = hull({ type: 'cruiser', nation: 'mars', pos: [100 * L, 0, 0] });
    const near = { hull: cap({ pos: [0, 0, 0] }), bay: 2, cooldown: 0 };
    const far = { hull: cap({ pos: [-2000 * L, 0, 0] }), bay: 4, cooldown: 0 };
    expect(pickLauncher([far, near], tgt, L).launcher).toBe(near);
    expect(pickLauncher([far], tgt, L).why).toMatch(/range/);
    expect(pickLauncher([{ ...near, bay: 0 }], tgt, L).why).toMatch(/bay/);
    expect(pickLauncher([near], hull({ type: 'fighter', nation: 'mars' }), L).why).toMatch(/cruisers/);
    expect(pickLauncher([], tgt, L).why).toMatch(/capital/);
    expect(pickLauncher([near], tgt, L, () => false).why).toMatch(/range/);
  });
  it('an enemy capital ship boards a player ship whose shield is down, in range, and not through a planet', () => {
    const enemy = { hull: hull({ type: 'capital', nation: 'mars', side: 1 }), bay: 4, cooldown: 0 };
    const prize = hull({ type: 'cruiser', nation: 'mars', side: 0, pos: [100 * L, 0, 0] });
    const flag = hull({ type: 'capital', nation: 'earth', side: 0, pos: [50 * L, 0, 0] });
    const base = { launcher: enemy, committed: new Map(), L };
    expect(enemyLaunch({ ...base, targets: [{ hull: prize, shield: 0, hull01: 0.6 }, { hull: flag, shield: 1, hull01: 1 }] })).toBe(prize.id);
    expect(enemyLaunch({ ...base, targets: [{ hull: flag, shield: 1, hull01: 1 }] })).toBeNull();
    expect(enemyLaunch({ ...base, launcher: { ...enemy, cooldown: 3 }, targets: [{ hull: prize, shield: 0, hull01: 0.6 }] })).toBeNull();
    expect(enemyLaunch({ ...base, launcher: { ...enemy, bay: 0 }, targets: [{ hull: prize, shield: 0, hull01: 0.6 }] })).toBeNull();
    expect(enemyLaunch({ ...base, clear: () => false, targets: [{ hull: prize, shield: 0, hull01: 0.6 }] })).toBeNull();
  });
  it('holds its boarders when enough are already on the way', () => {
    const enemy = { hull: hull({ type: 'capital', nation: 'mars', side: 1 }), bay: 4, cooldown: 0 };
    const prize = hull({ type: 'cruiser', nation: 'mars', side: 0, pos: [100 * L, 0, 0] });
    const t = { hull: prize, shield: 0, hull01: 0.5, defenders: { strength: 5, quality: 0.6 } };
    expect(enemyLaunch({ launcher: enemy, targets: [t], committed: new Map([[prize.id, { strength: 25, quality: 1.8 }]]), L })).toBeNull();
    expect(enemyLaunch({ launcher: enemy, targets: [{ ...t, defenders: { strength: 60, quality: 1.6 } }], committed: new Map([[prize.id, { strength: 25, quality: 1.8 }]]), L })).toBe(prize.id);
  });
});

describe('prizes', () => {
  it('reads a save: keeps good prizes, drops unknown, empty, dead and duplicate ones', () => {
    const good = { nation: 'mars', type: 'cruiser', idx: 1, hp: 80, maxHp: 140, crew: 14, quality: 1.6, at: 5 };
    const got = migratePrizes([good, good, { nation: 'pluto', type: 'cruiser' }, { nation: 'mars', type: 'yacht' }, { ...good, idx: 0, hp: 0 }, null, 3]);
    expect(got).toEqual([good]);
    expect(migratePrizes(undefined)).toEqual([]);
    expect(migratePrizes([{ nation: 'venus', type: 'capital', idx: 0, hp: 9999, maxHp: 1000 }])[0].hp).toBe(1000);
  });
  it('an escort eases toward its station, and jumps when the player has gone too far to follow', () => {
    const a = escortStep([0, 0, 0], [10 * L, 0, 0], 0.1, L);
    expect(a.pos[0]).toBeGreaterThan(0);
    expect(a.pos[0]).toBeLessThan(10 * L);
    // Carried at the player's speed, it holds its station instead of trailing behind.
    let pos: V3 = [0, 0, 0];
    for (let i = 0; i < 300; i++) pos = escortStep(pos, [100 * L * (i + 1) / 30, 0, 0], 1 / 30, L, [100 * L, 0, 0]).pos;
    expect(Math.abs(pos[0] - 1000 * L)).toBeLessThan(L);
    const goal: V3 = [1e5, 0, 0];
    expect(escortStep([0, 0, 0], goal, 0.1, L).pos).toEqual(goal);
  });
});
