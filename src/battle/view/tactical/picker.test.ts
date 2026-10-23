import { describe, expect, it } from 'vitest';
import { MANEUVER_NAMES, SATURN_12V12, createBattle, step } from '../../sim/index';
import type { Battle } from '../../sim/index';
import { cannotFly, createPicker } from './picker';

const run = (b: Battle, s: number) => { for (let i = 0; i < Math.round(s * 30); i++) step(b); };
const fresh = () => { const b = createBattle(SATURN_12V12, 1); run(b, 20); return b; };
const flag = (b: Battle) => b.ships.find((s) => s.side === 'player' && s.flagship)!;
const cruiser = (b: Battle) => b.ships.find((s) => s.side === 'player' && s.cls === 'cruiser')!;
const foe = (b: Battle) => b.ships.find((s) => s.side === 'enemy' && !s.flagship && s.cls === 'escort')!;

describe('maneuver picker commits (PKG-21 F-05)', () => {
  for (const name of MANEUVER_NAMES) {
    it(`${name}: choose, target, commit orders it and clears the pick`, () => {
      const b = fresh();
      let changes = 0;
      const p = createPicker(() => b, () => 'player', () => { changes++; });
      p.choose(name, [flag(b).id], foe(b).id);
      expect(p.state().stage).toBe('ghost');
      const r = p.commit();
      expect(r).not.toBeNull();
      expect(r!.ok).toBe(true);
      expect(p.state().stage).toBe('idle');
      expect(p.active()).toBe(false);
      expect(p.state().last?.name).toBe(name);
      expect(flag(b).order?.kind).toBe('maneuver');
      expect(changes).toBeGreaterThan(1);
    });
  }

  it('a Boarding run from a ship with no hangar is refused: the reason shows, commit closes it, no points spent', () => {
    const b = fresh();
    const p = createPicker(() => b, () => 'player', () => {});
    const s = cruiser(b);
    const points = b.comms!.points.player;
    p.choose('boardingRun', [s.id], foe(b).id);
    expect(p.state().stage).toBe('refused');
    expect(p.state().why).toBe(`${s.name} cannot fly the Boarding run: no boarding hangar in the group.`);
    const r = p.commit();
    expect(r).toEqual({ ok: false, reason: p.state().last!.result.reason, protest: null });
    expect(r!.reason).toContain('no boarding hangar');
    expect(p.state().stage).toBe('idle');
    expect(b.comms!.points.player).toBe(points);
    expect(s.order?.kind === 'maneuver').toBe(false);
  });

  it('commit with no target yet says what is missing and keeps the pick open; cancel clears it', () => {
    const b = fresh();
    const p = createPicker(() => b, () => 'player', () => {});
    p.choose('flankingArc', [flag(b).id]);
    expect(p.state().stage).toBe('target');
    const r = p.commit();
    expect(r?.ok).toBe(false);
    expect(r?.reason).toMatch(/target/);
    expect(p.state().stage).toBe('target');
    p.cancel();
    expect(p.state().stage).toBe('idle');
  });

  it('cannotFly names the hangar for a cruiser and nothing for the capital', () => {
    const b = fresh();
    expect(cannotFly(b, cruiser(b).id, 'boardingRun')).toBe('no boarding hangar in the group');
    expect(cannotFly(b, flag(b).id, 'boardingRun')).toBeNull();
    expect(cannotFly(b, cruiser(b).id, 'flankingArc')).toBeNull();
  });
});
