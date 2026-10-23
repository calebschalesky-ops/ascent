/**
 * PKG-25: fighter wings as sim entities. Acceptance for package steps 1–5 (launch, fly, lose, recover; the three tasks;
 * pods lost to point defence and enemy wings; the admiral's fighter line uses the player's order).
 */
import { describe, expect, it } from 'vitest';
import { SATURN_12V12, createBattle, hashState, order, run, step } from '../index';
import { boarding } from '../boarding/boarding';
import { dist } from '../ships';
import type { Battle, Ship } from '../types';
import { FIGHTERS, fighterReport, fighters, podPdChance } from './index';

const fresh = (seed = 1) => createBattle(SATURN_12V12, seed, { controllers: { enemy: 'idle' } });
const ship = (b: Battle, id: string) => b.ships.find((s) => s.id === id)!;
const steps = (b: Battle, seconds: number) => { for (let i = 0; i < Math.round(seconds / b.dt); i++) step(b); };

describe('PKG-25 fighters: wings on the hulls', () => {
  it('a battle nobody orders fighters in has no fighter state (Phase A unchanged)', () => {
    const b = fresh(3);
    run(b, 60);
    expect(b.fighters).toBeUndefined();
    expect(fighterReport(b)).toBeNull();
  });

  it('carriers carry two wings and capitals one, aboard until tasked', () => {
    const b = fresh();
    const st = fighters(b);
    const per = (side: string) => st.wings.filter((w) => w.side === side).map((w) => `${ship(b, w.home).cls}`).sort();
    expect(per('player')).toEqual(['capital', 'carrier', 'carrier']);
    expect(per('enemy')).toEqual(['capital', 'carrier', 'carrier']);
    expect(st.wings.every((w) => w.state === 'docked' && w.craft === FIGHTERS.craftPerWing)).toBe(true);
  });

  it('fighter command is the flagship\'s: another ship\'s order is refused and nothing launches', () => {
    const b = fresh();
    expect(order(b, 'p7', { kind: 'fighters', task: 'screen' }, 'player')).toBe(false);
    expect(b.fighters).toBeUndefined();
  });

  it('an order launches the side\'s wings, staggered by hangar, and they fly out', () => {
    const b = fresh();
    expect(order(b, 'p6', { kind: 'fighters', task: 'screen' }, 'player')).toBe(true);
    steps(b, 1);
    const st = fighters(b);
    const mine = st.wings.filter((w) => w.side === 'player');
    expect(mine.filter((w) => w.state === 'flying').map((w) => w.id).sort()).toEqual(['p6w1', 'p7w1']); // first off each deck
    steps(b, FIGHTERS.launchGapS);
    expect(mine.every((w) => w.state === 'flying')).toBe(true);
    const at = Object.fromEntries(b.log.filter((e) => e.kind === 'wingLaunch').map((e) => [e.wing, e.t]));
    expect(at.p7w2 - at.p7w1).toBeGreaterThanOrEqual(FIGHTERS.launchGapS - 0.05);
    expect(st.wings.filter((w) => w.side === 'enemy').every((w) => w.state === 'docked')).toBe(true);
    expect(b.log.filter((e) => e.kind === 'wingLaunch').length).toBe(3);
    steps(b, 8);
    for (const w of mine) expect(dist(w.pos, ship(b, w.home).pos)).toBeGreaterThan(300);
  });

  it('same seed, same orders: identical state hash, and the battle round-trips through JSON', () => {
    const go = () => {
      const b = fresh(5);
      order(b, 'p6', { kind: 'fighters', task: 'hunt' }, 'player');
      order(b, 'e6', { kind: 'fighters', task: 'screen' }, 'enemy');
      run(b, 90);
      return b;
    };
    const a = go(), c = go();
    expect(hashState(a)).toBe(hashState(c));
    expect(JSON.parse(JSON.stringify(a.fighters))).toEqual(a.fighters);
  });

  it('a wing\'s pass never moves the battle\'s main dice: same main-RNG draw count with and without a pass that finds nothing', () => {
    const a = fresh(2), c = fresh(2);
    order(c, 'p6', { kind: 'fighters', task: 'screen' }, 'player');
    steps(a, 5); steps(c, 5);
    expect(c.rng.n).toBe(a.rng.n);
  });
});

describe('PKG-25 fighters: the three tasks fly', () => {
  it('screen: the wings sit out on the line from the screened ship toward the threat', () => {
    const b = fresh();
    order(b, 'p6', { kind: 'fighters', task: 'screen', target: 'p2' }, 'player');
    steps(b, 20);
    const guard = ship(b, 'p2');
    const foe = b.ships.filter((s) => s.side === 'enemy').sort((x, y) => dist(x.pos, guard.pos) - dist(y.pos, guard.pos))[0];
    expect(fighters(b).orders.player.target).toBe('p2');
    for (const w of fighters(b).wings.filter((x) => x.side === 'player')) {
      const dg = dist(w.pos, guard.pos), df = dist(w.pos, foe.pos);
      expect(dg).toBeLessThan(FIGHTERS.screenM + FIGHTERS.weaveM + 50);
      expect(df).toBeLessThan(dist(guard.pos, foe.pos)); // on the threat's side of the ship
    }
  });

  it('escort: with our pods in flight the wings fly on them (EXP-02 step 10)', () => {
    const b = fresh();
    order(b, 'p6', { kind: 'fighters', task: 'escort' }, 'player');
    steps(b, 2);
    expect(order(b, 'p7', { kind: 'board', target: 'e7' } as never, 'player')).toBe(true);
    const g = boarding(b).pods.find((x) => x.side === 'player' && x.from === 'p7')!;
    steps(b, 4);
    const wings = fighters(b).wings.filter((w) => w.side === 'player' && w.state === 'flying');
    expect(wings.length).toBeGreaterThan(0);
    for (const w of wings) {
      expect(w.escorting).toBe(g.id);
      expect(dist(w.pos, g.pos)).toBeLessThan(FIGHTERS.escortOnM);
    }
    expect(podPdChance(b, g, ship(b, 'e7'))).toBeLessThan(podPdChanceBare(b, ship(b, 'e7')));
  });

  it('hunt: wings go after enemy wings and the dogfight costs both sides fighters', () => {
    const b = fresh(4);
    order(b, 'e6', { kind: 'fighters', task: 'screen' }, 'enemy');
    order(b, 'p6', { kind: 'fighters', task: 'hunt' }, 'player');
    steps(b, 60);
    const st = fighters(b);
    expect(st.stats.player.craftLost).toBeGreaterThan(0);
    expect(st.stats.enemy.craftLost).toBeGreaterThan(0);
    expect(st.wings.filter((w) => w.side === 'player').reduce((n, w) => n + w.craftKilled, 0)).toBeGreaterThan(0);
  });

  it('a worn wing turns for home, lands, and rearms before it can go again', () => {
    const b = fresh();
    order(b, 'p6', { kind: 'fighters', task: 'screen' }, 'player');
    steps(b, 2);
    const w = fighters(b).wings.find((x) => x.side === 'player')!;
    w.craft = 1.5;
    steps(b, 30);
    const home = b.log.find((e) => e.kind === 'wingHome' && e.wing === w.id);
    expect(home).toBeDefined();
    expect(w.state === 'docked' || w.state === 'flying').toBe(true);
    // Rearm: no relaunch within rearmS of landing.
    const relaunch = b.log.find((e) => e.kind === 'wingLaunch' && e.wing === w.id && e.t > home!.t);
    if (relaunch) expect(relaunch.t - home!.t).toBeGreaterThanOrEqual(FIGHTERS.rearmS - 0.05);
  });

  it('wings aboard a hull that is wrecked are lost with it', () => {
    const b = fresh();
    fighters(b);
    const carrier = ship(b, 'p7');
    carrier.status = 'wrecked';
    order(b, 'p6', { kind: 'fighters', task: 'screen' }, 'player');
    steps(b, 1);
    const lost = fighters(b).wings.filter((w) => w.home === 'p7');
    expect(lost.every((w) => w.state === 'out' && w.outHow === 'lost')).toBe(true);
  });
});

describe('PKG-25 fighters: pods en route', () => {
  it('enemy wings on a screen shoot down pods aimed at the ship they screen', () => {
    let killed = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const b = fresh(seed);
      order(b, 'e6', { kind: 'fighters', task: 'screen', target: 'e7' }, 'enemy');
      steps(b, 12);
      order(b, 'p7', { kind: 'board', target: 'e7' } as never, 'player');
      steps(b, 30);
      killed += fighters(b).stats.enemy.killedAimedAt.e7 ?? 0;
      expect(b.log.filter((e) => e.kind === 'podIntercept').every((e) => e.kind === 'podIntercept' && e.side === 'enemy')).toBe(true);
    }
    expect(killed).toBeGreaterThan(0);
  });

  it('a group shot down to its last pod is gone, and no group lands with no marines', () => {
    const b = fresh(1);
    order(b, 'e6', { kind: 'fighters', task: 'screen', target: 'e7' }, 'enemy');
    steps(b, 12);
    order(b, 'p7', { kind: 'board', target: 'e7' } as never, 'player');
    for (let i = 0; i < 40 * 30; i++) {
      step(b);
      for (const g of b.boarding?.pods ?? []) expect(g.pods).toBeGreaterThan(0);
    }
  });
});

describe('PKG-25 fighters: the AI admiral', () => {
  it('when switched on, sends its fighters forward with a boarding telegraph, through order() with the player\'s fighters order', () => {
    let seen = 0;
    FIGHTERS.admiralEscortsPush = true;
    try {
    for (let seed = 1; seed <= 4 && !seen; seed++) {
      const b = createBattle(SATURN_12V12, seed);
      run(b, 300);
      const orders = b.log.filter((e) => e.kind === 'order' && e.by === 'enemy' && e.order.kind === 'fighters');
      if (!orders.length) continue;
      seen++;
      expect(orders.every((e) => e.kind === 'order' && e.order.task === 'escort' && e.ship === b.sides.enemy.flagshipId)).toBe(true);
      const tele = b.log.find((e) => e.kind === 'telegraph' && e.side === 'enemy')!;
      expect(orders[0].t).toBe(tele.t);
    }
    } finally { FIGHTERS.admiralEscortsPush = false; }
    expect(seen).toBe(1);
  });

  it('off by default (FIGHTERS.admiralEscortsPush): a Phase A battle with the admiral orders no fighters and has none', () => {
    const b = createBattle(SATURN_12V12, 1);
    run(b, 300);
    expect(b.log.some((e) => e.kind === 'order' && e.order.kind === 'fighters')).toBe(false);
    expect(b.fighters).toBeUndefined();
  });
});

/** The point defence's chance against one pod with no escort: pdChance × pdKillScale (boarding.ts before PKG-25). */
function podPdChanceBare(b: Battle, t: Ship): number {
  const st = b.fighters!;
  const saved = st.wings.map((w) => w.escorting);
  for (const w of st.wings) w.escorting = null;
  const p = podPdChance(b, { id: -1, side: 'player' } as never, t);
  st.wings.forEach((w, i) => { w.escorting = saved[i]; });
  return p;
}
