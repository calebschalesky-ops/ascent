import { describe, expect, it } from 'vitest';
import type { V3 } from './nav';
import { dot, sub, unit } from './nav';
import { rng } from './enemyArms';
import type { FighterView } from './fighterAI';
import { breakDir, fighterThink, newFighterMem, onSix, spiralDir, timeToImpact } from './fighterAI';
import { AI } from './aiKnobs';
import { leadDir } from './pilot';

const base = (o: Partial<FighterView> = {}): FighterView => ({
  t: 0, pos: [0, 0, 0], vel: [0, 0, -60], fwd: [0, 0, -1],
  target: { pos: [0, 0, -150], vel: [20, 0, 0], fwd: [0, 0, 1] }, threats: [], hurt: false,
  gunSpeed: 260, skill: 0.5, aggression: 0.5, sun: null, sunPref: 0, screen: null, k: 1, ...o,
});
const always = (x: number) => () => x;

describe('fighter state machine', () => {
  it('far away it approaches; inside attack range it attacks on the lead', () => {
    const mem = newFighterMem();
    const far = fighterThink(base({ target: { pos: [0, 0, -600], vel: [0, 0, 0], fwd: [0, 0, 1] } }), mem, always(0.99));
    expect(far.mode).toBe('approach');
    expect(far.throttle).toBe(1);
    const m2 = newFighterMem();
    const o = fighterThink(base(), m2, always(0.99));
    expect(o.mode).toBe('attack');
    const lead = leadDir([0, 0, 0], [0, 0, -60], 260 + 60, [0, 0, -150], [20, 0, 0]);
    expect(dot(o.wantDir, lead)).toBeCloseTo(1);
  });
  it('a pass that gets too close ends in a break-off away from the player (boom and zoom)', () => {
    const mem = newFighterMem();
    fighterThink(base(), mem, always(0.99));
    const o = fighterThink(base({ t: 1, target: { pos: [0, 0, -10], vel: [0, 0, 0], fwd: [1, 0, 0] } }), mem, always(0.99));
    expect(o.mode).toBe('breakoff');
    expect(o.maneuver).toBe('extend');
    expect(dot(o.wantDir, [0, 0, -1])).toBeLessThan(0); // turning away
    // And once it has extended far enough, it comes back in.
    const back = fighterThink(base({ t: 3, target: { pos: [0, 0, -AI.extendRange - 10], vel: [0, 0, 0], fwd: [1, 0, 0] } }), mem, always(0.99));
    expect(back.mode).toBe('approach');
  });
  it('a pass ends after the attack time even without closing', () => {
    const mem = newFighterMem();
    fighterThink(base(), mem, always(0.99));
    const o = fighterThink(base({ t: AI.attackTime * 1.01 }), mem, always(0.99));
    expect(o.mode).toBe('breakoff');
  });
  it('a missile homing on it: it turns to beam the missile and drops a flare when it is close', () => {
    const mem = newFighterMem();
    const missile = { pos: [0, 0, 50] as V3, vel: [0, 0, -130] as V3, homingOnMe: true };
    const o = fighterThink(base({ threats: [missile] }), mem, rng(3));
    expect(o.mode).toBe('evade');
    expect(o.maneuver).toBe('beamMissile');
    expect(Math.abs(dot(o.wantDir, unit(sub(missile.pos, [0, 0, 0]))))).toBeLessThan(0.05); // across the missile's line
    expect(o.flare).toBe(true);
    // A missile that is not homing on it is ignored.
    const calm = fighterThink(base({ threats: [{ ...missile, homingOnMe: false }] }), newFighterMem(), always(0.99));
    expect(calm.mode).toBe('attack');
  });
  it('the player on its six: it breaks, rolls or jinks', () => {
    const v = base({ target: { pos: [0, 0, 60], vel: [0, 0, -60], fwd: [0, 0, -1] } });
    expect(onSix(v)).toBe(true);
    const seen = new Set<string>();
    for (let s = 0; s < 30; s++) seen.add(fighterThink(v, newFighterMem(), rng(s)).maneuver);
    expect([...seen].sort()).toEqual(['breakTurn', 'jink', 'spiral']);
    const o = fighterThink(v, newFighterMem(), always(0.01)); // breakTurn
    expect(o.mode).toBe('evade');
    expect(Math.abs(dot(o.wantDir, [0, 0, 1]))).toBeLessThan(0.05); // across the player's line of fire
  });
  it('after the maneuver, shaken off, it breaks off; still pursued, it keeps maneuvering', () => {
    const chased = base({ target: { pos: [0, 0, 60], vel: [0, 0, -60], fwd: [0, 0, -1] } });
    const mem = newFighterMem();
    fighterThink(chased, mem, rng(1));
    expect(fighterThink({ ...chased, t: 5 }, mem, rng(2)).mode).toBe('evade');
    expect(fighterThink({ ...base(), t: 10 }, mem, rng(2)).mode).toBe('breakoff');
  });
  it('a hit sends it evading', () => {
    expect(fighterThink(base({ hurt: true }), newFighterMem(), rng(5)).mode).toBe('evade');
  });
  it('a sun-loving fighter comes in out of the Sun first', () => {
    const v = base({ target: { pos: [0, 0, -600], vel: [0, 0, 0], fwd: [0, 0, 1] }, sun: [1000, 0, -600], sunPref: 1 });
    const mem = newFighterMem();
    const o = fighterThink(v, mem, always(0.01));
    expect(o.maneuver).toBe('sunEntry');
    expect(mem.entry![0]).toBeGreaterThan(100); // on the Sun's side of the player
  });
  it('a skilled fighter often goes round to the six', () => {
    let six = 0;
    const v = base({ skill: 1, target: { pos: [0, 0, -600], vel: [0, 0, 0], fwd: [0, 0, 1] } });
    for (let s = 0; s < 60; s++) if (fighterThink(v, newFighterMem(), rng(s)).maneuver === 'sixHunt') six++;
    expect(six).toBeGreaterThan(15);
  });
  it('a screening fighter holds its point until the player comes close', () => {
    const screen: V3 = [0, 0, 300];
    const far = fighterThink(base({ pos: [0, 0, 290], screen, target: { pos: [0, 0, -400], vel: [0, 0, 0], fwd: [0, 0, 1] } }), newFighterMem(), always(0.5));
    expect(far.mode).toBe('screen');
    const near = fighterThink(base({ pos: [0, 0, 290], screen, target: { pos: [0, 0, 250], vel: [0, 0, 0], fwd: [0, 0, 1] } }), newFighterMem(), always(0.99));
    expect(near.mode).toBe('attack');
  });
  it('maneuver geometry: break turns are perpendicular; a spiral circles its base line', () => {
    const b = breakDir([0, 0, -1], [1, 0, 0], 1);
    expect(dot(b, [1, 0, 0])).toBeCloseTo(0);
    const s0 = spiralDir([0, 0, -1], 0, 5, 0.6), s1 = spiralDir([0, 0, -1], Math.PI / 5, 5, 0.6);
    expect(dot(s0, [0, 0, -1])).toBeCloseTo(Math.cos(0.6));
    expect(dot(s1, [0, 0, -1])).toBeCloseTo(Math.cos(0.6));
    expect(dot(s0, s1)).toBeLessThan(0.5); // half a turn later it points the other way round
  });
  it('time to impact: closing missiles only', () => {
    expect(timeToImpact([0, 0, 0], [0, 0, 0], { pos: [0, 0, 100], vel: [0, 0, -50], homingOnMe: true })).toBeCloseTo(2);
    expect(timeToImpact([0, 0, 0], [0, 0, 0], { pos: [0, 0, 100], vel: [0, 0, 50], homingOnMe: true })).toBe(Infinity);
  });
  it('the same seed gives the same decisions', () => {
    const v = base({ target: { pos: [0, 0, 60], vel: [0, 0, -60], fwd: [0, 0, -1] } });
    expect(fighterThink(v, newFighterMem(), rng(9))).toEqual(fighterThink(v, newFighterMem(), rng(9)));
  });
});
