/**
 * PKG-20: the setup registry, the setups the scripts name, and the roster fixtures.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETUP, ROSTERS, SATURN_12V12, SETUPS, createBattle, hashState, run, setupById, setupIds, startBattle,
} from '../index';
import type { AbilityId, Battle, BattleClass } from '../index';
import { ABILITY } from '../numbers';
import { shipAt } from './apply';
import { HOUSES, MIX } from './fleets';

/** Every start state EXP-07..15 and WORLD-03..06 name (the inventory's package S2), and the default. */
const NAMED = [
  'saturn-12v12', 'europa-12v11', 'titan-haze-12v11', 'phobos-13v12', 'europa-12v12-wings', 'saturn-12v12+candour-mix',
  'europa-12v12+pushback-mix', 'saturn-16v16-reinforced', 'titan-14v12-defector', 'europa-12v12', 'phobos-12v12',
  'moon-12v12', 'mercury-12v12', 'ref-03', 'ref-05', 'ref-08', 'ref-10', 'ref-11', 'ref-22', 'ref-24', 'ref-27', 'ref-28',
];
const KEYS: AbilityId[] = ['gunnery', 'helm', 'nerve', 'judgement', 'candour'];
const CLASSES: BattleClass[] = ['capital', 'destroyer', 'cruiser', 'carrier', 'escort'];
/** Red Rising's houses and leading names (house rule: none of them). */
const RED_RISING = ['augustus', 'bellona', 'telemanus', 'julii', 'arcos', 'barca', 'grimmus', 'lune', 'raa', 'rath', 'darrow',
  'cassius', 'sevro', 'mustang', 'virginia', 'octavia', 'lysander', 'andromedus', 'carthii', 'falthe', 'reaper', 'sovereign'];
const total = (b: Battle, side: string, k: AbilityId, cls: string) =>
  b.ships.filter((s) => s.side === side && s.cls === cls).reduce((t, s) => t + s.captain.abilities[k], 0);

describe('setup registry (PKG-20)', { timeout: 60_000 }, () => {
  it('registers every setup a script names, and nothing else', () => {
    expect([...setupIds()].sort()).toEqual([...NAMED].sort());
    for (const id of NAMED) expect(setupById(id).name).toBe(id);
  });

  it('keeps saturn-12v12 the default, unchanged', () => {
    expect(DEFAULT_SETUP).toBe('saturn-12v12');
    expect(setupById()).toBe(SATURN_12V12);
    for (const seed of [1, 2, 3]) {
      const a = run(createBattle(SATURN_12V12, seed, { maxMinutes: 1 }));
      const b = run(startBattle(setupById(), seed, { maxMinutes: 1 }));
      expect(hashState(b)).toBe(hashState(a));
    }
  });

  it('throws on an unknown setup or roster, naming what is registered', () => {
    expect(() => setupById('nowhere')).toThrow(/Registered: saturn-12v12/);
    expect(() => setupById('saturn-12v12+nobody')).toThrow(/candour-mix/);
  });

  it('builds every setup: ships named once, a flagship a side, mixes as fleets.ts says', () => {
    for (const id of NAMED) {
      const s = setupById(id);
      for (const side of [s.player, s.enemy]) {
        expect(new Set(side.ships.map((x) => x.name)).size, id).toBe(side.ships.length);
        expect(side.ships.filter((x) => x.flagship).length, id).toBe(1);
        expect(side.ships.map((x) => x.cls), id).toEqual(MIX[side.ships.length]);
      }
      const b = startBattle(s, 1);
      expect(b.ships.length).toBe(s.player.ships.length + s.enemy.ships.length);
      expect(b.setup).toBe(id);
    }
  });

  it('uses no Red Rising name for a house or ship', () => {
    const names = Object.values(HOUSES).flatMap((h) => [h.house, ...h.names]).map((n) => n.toLowerCase());
    for (const n of names) for (const rr of RED_RISING) expect(n.split(/[\s-]+/), n).not.toContain(rr);
  });

  it('is deterministic: same setup, seed and roster give the same battle', () => {
    for (const id of ['europa-12v12-wings', 'saturn-12v12+candour-mix', 'ref-28']) {
      const a = run(startBattle(setupById(id), 4, { maxMinutes: 1 }));
      const b = run(startBattle(setupById(id), 4, { maxMinutes: 1 }));
      expect(hashState(a), id).toBe(hashState(b));
    }
  });

  it('places wings at their offsets', () => {
    const s = setupById('europa-12v12-wings');
    const flat = createBattle(s, 1);
    const winged = startBattle(s, 1);
    for (const w of s.wings!) {
      for (const name of w.ships) {
        const a = flat.ships.find((x) => x.side === w.side && x.name === name)!;
        const b = winged.ships.find((x) => x.side === w.side && x.name === name)!;
        expect(b.pos.x - a.pos.x).toBe(w.offset.x);
        expect(b.pos.z - a.pos.z).toBe(w.offset.z);
      }
    }
  });

  it('keeps reinforcements, convoys and courted ships as data naming real ships', () => {
    const r = setupById('saturn-16v16-reinforced').reinforcements![0];
    expect([r.side, r.atS, r.ships.length]).toEqual(['enemy', 180, 6]);
    expect(setupById('ref-08').reinforcements![0].atS).toBe(180);
    for (const id of ['titan-14v12-defector', 'ref-22']) {
      const s = setupById(id);
      for (const c of s.courted!) for (const n of c.ships) expect(s.player.ships.map((x) => x.name)).toContain(n);
    }
    expect(setupById('ref-03').convoy![0].ships.length).toBe(4);
  });
});

describe('roster fixtures (PKG-20)', () => {
  it('candour-mix: the Optimist at 2, the Pessimist at 3, the honest captain at 9, mirrored on the enemy', () => {
    const b = startBattle(setupById('saturn-12v12+candour-mix'), 10);
    for (const side of ['player', 'enemy'] as const) {
      expect([shipAt(b, side, 'cruiser', 1)!.captain.trait, shipAt(b, side, 'cruiser', 1)!.captain.abilities.candour]).toEqual(['Optimist', 2]);
      expect([shipAt(b, side, 'cruiser', 2)!.captain.trait, shipAt(b, side, 'cruiser', 2)!.captain.abilities.candour]).toEqual(['Pessimist', 3]);
      expect(shipAt(b, side, 'destroyer', 1)!.captain.abilities.candour).toBe(9);
    }
  });

  it('pushback-mix: Veteran J9, Bold J3, Glory-hound at loyalty 45, a Fanatic, a By-the-book', () => {
    const b = startBattle(setupById('europa-12v12+pushback-mix'), 11);
    const c = (cls: BattleClass, n: number) => shipAt(b, 'player', cls, n)!.captain;
    expect([c('cruiser', 1).trait, c('cruiser', 1).abilities.judgement]).toEqual(['Veteran', 9]);
    expect([c('cruiser', 2).trait, c('cruiser', 2).abilities.judgement]).toEqual(['Bold', 3]);
    expect([c('destroyer', 1).trait, c('destroyer', 1).loyalty]).toEqual(['Glory-hound', 45]);
    expect(c('cruiser', 3).trait).toBe('Fanatic');
    expect(c('cruiser', 4).trait).toBe('By-the-book');
  });

  it('one-fanatic gives the enemy exactly one Fanatic, no-fanatic none, on rosters 1-8', () => {
    for (let r = 1; r <= 8; r++) {
      for (const id of ['europa-12v12-wings', 'titan-haze-12v11', 'ref-28']) {
        const b = startBattle(setupById(id), 1, { rosterSeed: r });
        expect(b.ships.filter((s) => s.side === 'enemy' && s.captain.trait === 'Fanatic').length, `${id} roster ${r}`).toBe(1);
      }
      const b = startBattle(setupById('europa-12v11'), 1, { rosterSeed: r });
      expect(b.ships.some((s) => s.side === 'enemy' && s.captain.trait === 'Fanatic'), `roster ${r}`).toBe(false);
    }
  });

  it('ambitious-52: one Ambitious player captain at loyalty 52', () => {
    const b = startBattle(setupById('titan-14v12-defector'), 13);
    const c = shipAt(b, 'player', 'cruiser', 1)!;
    expect([c.captain.trait, c.captain.loyalty, c.name]).toEqual(['Ambitious', 52, 'Pnyx']);
  });

  it('keeps the fair-roster rule: equal ability totals and traits per class, both sides, on rosters 1-8', () => {
    expect(ABILITY.fairRosters).toBe(true);
    const ids = NAMED.filter((id) => setupById(id).roster);
    expect(ids.length).toBeGreaterThanOrEqual(10);
    for (const id of ids) {
      for (let r = 1; r <= 8; r++) {
        const b = startBattle(setupById(id), 1, { rosterSeed: r });
        for (const cls of CLASSES) {
          const n = (side: string) => b.ships.filter((s) => s.side === side && s.cls === cls).length;
          if (n('player') !== n('enemy')) continue;
          for (const k of KEYS) {
            expect(Math.abs(total(b, 'player', k, cls) - total(b, 'enemy', k, cls)), `${id} r${r} ${cls} ${k}`).toBeLessThanOrEqual(ABILITY.fairTotalTol);
          }
          const traits = (side: string) => b.ships.filter((s) => s.side === side && s.cls === cls).map((s) => s.captain.trait).sort();
          expect(traits('enemy'), `${id} r${r} ${cls}`).toEqual(traits('player'));
        }
      }
    }
  });

  it('every fixture is named by a script and used by a setup', () => {
    const used = new Set(NAMED.map((id) => setupById(id).roster).filter(Boolean));
    expect([...used].sort()).toEqual(Object.keys(ROSTERS).sort());
  });
});

describe('every setup runs headless (PKG-20)', { timeout: 60_000 }, () => {
  it('runs a minute of every setup without error, and morale is set from the fixed captains', () => {
    for (const id of NAMED) {
      const b = run(startBattle(setupById(id), 2, { maxMinutes: 0.25 }));
      expect(b.t, id).toBeGreaterThan(0);
      for (const s of b.ships) expect(s.moraleStart, id).toBeGreaterThan(0);
    }
  }, 60_000);
  it('SETUPS has no entry under a name other than its own', () => {
    for (const [k, v] of Object.entries(SETUPS)) expect(v.name).toBe(k);
  });
});
