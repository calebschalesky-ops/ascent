import { describe, expect, it } from 'vitest';
import { COVER, INFANTRY, crewFor, garrisonFor, menOf, newSquad, strength } from './squads';
import type { Squad } from './squads';
import { balanceOfFire, forecast, newFight, stepFight, survivors } from './fight';

const lines = (n: number, nation: 'earth' | 'mars' = 'earth', kind: 'line' | 'shock' = 'line'): Squad[] =>
  Array.from({ length: n }, (_, i) => newSquad(kind, nation, `${nation}-${i}`));

describe('squads', () => {
  it('a fresh squad is at full strength and its kind’s morale', () => {
    const s = newSquad('line', 'earth', 'a');
    expect(strength(s)).toBe(1);
    expect(s.morale).toBe(0.7);
  });
  it('a suppressed site keeps about 60% of its garrison; an intact one all of it', () => {
    const full = menOf(garrisonFor('fort', 'mars', 'mars-castra', 1));
    const half = menOf(garrisonFor('fort', 'mars', 'mars-castra', 0.5));
    expect(half / full).toBeCloseTo(0.625, 2);
    expect(garrisonFor('battery', 'mars', 'b', 1)).toEqual([]);
  });
  it('a capital is held by more men than a works', () => {
    expect(menOf(garrisonFor('capital', 'mars', 'c', 1))).toBeGreaterThan(3 * menOf(garrisonFor('works', 'mars', 'w', 1)));
  });
  it('a hull has a crew: more on a capital ship than a cruiser, one pilot on a fighter', () => {
    expect(menOf(crewFor('capital', 'mars', 'c'))).toBeGreaterThan(menOf(crewFor('cruiser', 'mars', 'r')));
    expect(menOf(crewFor('fighter', 'mars', 'f'))).toBeCloseTo(1.2, 5);
  });
});

describe('the fight', () => {
  it('is deterministic', () => {
    const a = forecast(lines(4), garrisonFor('works', 'mars', 'w', 0.5), { place: 'site', cover: COVER.works });
    const b = forecast(lines(4), garrisonFor('works', 'mars', 'w', 0.5), { place: 'site', cover: COVER.works });
    expect(a).toEqual(b);
  });
  it('four line squads take a suppressed works quickly and keep most of their men', () => {
    const o = forecast(lines(4), garrisonFor('works', 'mars', 'w', 0.5), { place: 'site', cover: COVER.works });
    expect(o.winner).toBe('attack');
    expect(o.time).toBeLessThan(60);
    expect(o.attackMen).toBeGreaterThan(0.75 * 40);
  });
  it('a full carrier (6 squads) takes a suppressed fort, but not an intact one', () => {
    const terms = { place: 'site' as const, cover: COVER.fort };
    expect(forecast(lines(6), garrisonFor('fort', 'mars', 'f', 0.5), terms).winner).toBe('attack');
    expect(forecast(lines(3), garrisonFor('fort', 'mars', 'f', 1), terms).winner).toBe('defend');
  });
  it('shock troops do better than line troops of the same number of squads', () => {
    const d = () => garrisonFor('fort', 'mars', 'f', 0.5);
    const terms = { place: 'site' as const, cover: COVER.fort };
    const l = forecast(lines(4), d(), terms);
    const s = forecast(lines(4, 'earth', 'shock'), d(), terms);
    expect(s.attackMen / 32).toBeGreaterThan(l.attackMen / 40);
  });
  it('cover matters: the same garrison in the open falls faster', () => {
    const g = () => garrisonFor('city', 'mars', 'c', 0.5);
    const open = forecast(lines(5), g(), { place: 'site', cover: 1 });
    const town = forecast(lines(5), g(), { place: 'site', cover: COVER.city });
    expect(open.time).toBeLessThan(town.time);
  });
  it('squads break before they die: the losers mostly surrender rather than fall to the last man', () => {
    const f = newFight(lines(6), garrisonFor('works', 'mars', 'w', 0.5), { place: 'site', cover: COVER.works });
    while (!f.winner) stepFight(f, 0.5);
    expect(f.defend.some((s) => s.state === 'broken')).toBe(true);
    expect(f.defend.every((s) => s.morale <= INFANTRY.breakAt || s.state === 'dead')).toBe(true);
  });
  it('an attack with nobody in it fails, and a stalled one ends for the defenders', () => {
    expect(newFight([], garrisonFor('works', 'mars', 'w', 1), { place: 'site', cover: 1 }).winner).toBe('defend');
    const f = newFight(lines(1), lines(1, 'mars'), { place: 'site', cover: 0 }); // nothing can hurt the defenders
    f.attack[0].morale = 0.9; // and nothing breaks the attackers quickly
    let n = 0;
    while (!f.winner && n++ < 5000) stepFight(f, 1);
    expect(f.winner).toBe('defend');
  });
  it('survives a save mid-fight: the copy fights on to the same end', () => {
    const f = newFight(lines(6), garrisonFor('fort', 'mars', 'f', 0.5), { place: 'site', cover: COVER.fort });
    for (let i = 0; i < 20; i++) stepFight(f, 0.5);
    const g = JSON.parse(JSON.stringify(f));
    while (!f.winner) stepFight(f, 0.5);
    while (!g.winner) stepFight(g, 0.5);
    expect(g).toEqual(f);
  });
  it('the balance of fire runs from 0 to 1, and survivors re-embark rallied', () => {
    const f = newFight(lines(6), garrisonFor('works', 'mars', 'w', 0.5), { place: 'site', cover: COVER.works });
    const b0 = balanceOfFire(f);
    expect(b0).toBeGreaterThan(0.5);
    while (!f.winner) stepFight(f, 0.5);
    expect(balanceOfFire(f)).toBe(1);
    expect(survivors(f.attack).every((s) => s.state === 'fighting')).toBe(true);
  });
});
