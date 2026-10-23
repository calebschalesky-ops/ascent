import { describe, expect, it } from 'vitest';
import { NATIONS } from '../nations';
import { peopleOf } from '../races';
import type { NationId } from '../nations';
import { migrate } from '../store';
import { MODULES, fitStats } from '../progression/catalog';
import { ENGINE_WEAPON } from '../progression/refs';
import { AVATAR_OPTIONS, SHIP_FINISHES, SHIP_NAMES, avatarLook, defaultPilot, migratePilot, shipTrims, suggestName } from './profile';
import { FIRST_TIER, firstFitProblem, setSlot, slotOptions, standardFit } from './fit';
import type { FlightProbe } from './tutorial';
import { DRILL_STEPS, howTo, memoryAt, migrateTutorial, newTutorial, nextStep, observe, prevStep, stepDone, stepsFor, tokensOf } from './tutorial';
import { ACTIONS, DEFAULT_BINDS, rebind } from '../../components/controls/bindings';
import { RIVAL, firstGoal, goalKill, migrateGoal, startGoal } from './goal';

const IDS = NATIONS.map((n) => n.id);

describe('opening: the pilot', () => {
  it('every people has real choices: two or more of each, and a name that is theirs', () => {
    for (const n of IDS) {
      const o = AVATAR_OPTIONS[n];
      for (const list of [o.skin, o.hair, o.eyes, o.attire]) expect(list.length).toBeGreaterThanOrEqual(2);
      for (const c of [...o.skin, ...o.hair, ...o.eyes]) expect(c.value).toMatch(/^#[0-9a-f]{6}$/);
      expect(suggestName(n, 0.3, 0.7).split(' ').length).toBeGreaterThanOrEqual(2);
      expect(SHIP_NAMES[n].length).toBeGreaterThanOrEqual(4);
      expect(shipTrims(n)[0].value).toBe(NATIONS.find((x) => x.id === n)!.color);
    }
  });

  it('one people, one look: every skin choice is a shade of the people’s own skin, never another race', () => {
    const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    for (const n of IDS) {
      const anchor = rgb(peopleOf(n).palette.skin);
      expect(AVATAR_OPTIONS[n].skin.map((s) => s.value)).toContain(peopleOf(n).palette.skin);
      for (const s of AVATAR_OPTIONS[n].skin) {
        const gap = Math.max(...rgb(s.value).map((c, i) => Math.abs(c - anchor[i])));
        expect(gap, `${n} ${s.label}`).toBeLessThanOrEqual(32);
      }
    }
  });
  it('a portrait look follows the choices', () => {
    const p = defaultPilot('mars');
    const look = avatarLook('mars', { ...p.avatar, skin: 2, attire: 1, headwear: false });
    expect(look.skin).toBe(AVATAR_OPTIONS.mars.skin[2].value);
    expect(look.cloth).toBe(AVATAR_OPTIONS.mars.attire[1].cloth);
    expect(look.headwear).toBe(false);
  });
  it('reads a saved pilot back, and repairs what it cannot read', () => {
    const p = { ...defaultPilot('saturn'), avatar: { ...defaultPilot('saturn').avatar, name: '  Kleon of Ligeia  ', hair: 3 }, ship: { name: 'Owl of Titan', trim: 2, finish: 1 } };
    expect(migratePilot(JSON.parse(JSON.stringify(p)))).toEqual({ ...p, avatar: { ...p.avatar, name: 'Kleon of Ligeia' } });
    const bad = migratePilot({ nation: 'jupiter', avatar: { name: '', skin: 99, eyes: -1, headwear: 'yes' }, ship: { trim: 7, finish: 1.5 } })!;
    expect(bad.avatar.skin).toBe(0);
    expect(bad.avatar.eyes).toBe(0);
    expect(bad.avatar.name).toBe(defaultPilot('jupiter').avatar.name);
    expect(bad.ship).toEqual({ name: defaultPilot('jupiter').ship.name, trim: 0, finish: 0 });
    expect(migratePilot({ nation: 'pluto' })).toBeNull();
    expect(SHIP_FINISHES.length).toBe(3);
  });
});

describe('opening: the first fit', () => {
  it('offers only level-1 tools, and a gun in the first slot', () => {
    for (const m of slotOptions('weapon', 0)) expect(ENGINE_WEAPON[m.id]).toBe('laser');
    for (const k of ['weapon', 'defence', 'support'] as const) for (const m of slotOptions(k, 1)) expect(m.tier).toBeLessThanOrEqual(FIRST_TIER);
    expect(slotOptions('weapon', 1).some((m) => ENGINE_WEAPON[m.id] === 'missile')).toBe(true);
  });
  it('every nation’s standard fit is allowed, and swaps keep it allowed', () => {
    for (const n of IDS) {
      const f = standardFit(n);
      expect(firstFitProblem(f)).toBeNull();
      for (const m of slotOptions('support', 0)) expect(firstFitProblem(setSlot(f, 'support', 0, m.id))).toBeNull();
    }
  });
  it('refuses a missile in the main-gun slot and anything above tier 1', () => {
    const f = standardFit('earth');
    expect(firstFitProblem(setSlot(f, 'weapon', 0, 'seeker'))).toMatch(/gun/);
    const t2 = MODULES.find((m) => m.tier === 2 && m.kind === 'weapon')!;
    expect(firstFitProblem(setSlot(f, 'weapon', 1, t2.id))).toMatch(/tier/);
    expect(fitStats(setSlot(f, 'support', 0, 'droneRepair')).regen).toBeGreaterThan(0);
  });
});

const probe = (p: Partial<FlightProbe> = {}): FlightProbe => ({
  throttle: 0, speed: 0, boosting: false, yaw: 0, pitch: 0, weapon: 'laser', weapons: ['laser', 'missile'],
  laserShots: 0, laserHits: 0, missileShots: 0, missileHits: 0, aimHit: false, locked: false, nav: null,
  auto: false, target: null, docked: null, hull: 100, maxHull: 100, drillLeft: 0, drillAhead: false, dronesOut: 0, ...p,
});

describe('opening: the shakedown flight', () => {
  it('a fit without a missile skips switching and lock-on', () => {
    expect(stepsFor(['laser', 'missile']).map((s) => s.id)).toEqual(['throttle', 'steer', 'boost', 'laser', 'switch', 'lock', 'drones', 'map', 'autopilot', 'dock', 'repair', 'undock']);
    expect(stepsFor(['laser']).map((s) => s.id)).not.toContain('lock');
    expect(stepsFor(['laser']).map((s) => s.id)).not.toContain('switch');
    expect(DRILL_STEPS).toContain('laser');
  });
  it('each step ends when the flight shows it was done, and not before', () => {
    const run = (id: Parameters<typeof stepDone>[0], seq: Partial<FlightProbe>[]) => {
      let m = memoryAt(probe(seq[0]));
      for (const s of seq.slice(1)) m = observe(m, probe(s), 0.15);
      return stepDone(id, m);
    };
    expect(run('throttle', [{}, { throttle: 0.1 }])).toBe(false);
    expect(run('throttle', [{}, { throttle: 0.4 }])).toBe(true);
    expect(run('steer', [{}, { yaw: 0.3 }, { yaw: 0.6 }])).toBe(false);
    expect(run('steer', [{}, { yaw: 0.5 }, { yaw: 1 }])).toBe(true);
    expect(run('steer', [{ yaw: 3.1 }, { yaw: -3.0 }, { yaw: -2.0 }])).toBe(true); // across the ±π seam
    expect(run('boost', [{}, ...Array(3).fill({ boosting: true, speed: 5 })])).toBe(false);
    expect(run('boost', [{}, ...Array(5).fill({ boosting: true, speed: 5 })])).toBe(true);
    expect(run('laser', [{ laserHits: 4 }, { laserHits: 5 }])).toBe(false); // counted from the step's start
    expect(run('laser', [{ laserHits: 4 }, { laserHits: 6 }])).toBe(true);
    expect(run('switch', [{}, { weapon: 'missile' }])).toBe(true);
    expect(run('lock', [{}, { missileShots: 1 }])).toBe(false); // fired without a lock
    expect(run('lock', [{}, { locked: true }, { locked: false, missileShots: 1 }])).toBe(true);
    expect(run('lock', [{}, { locked: true }, { locked: false }, { missileShots: 1 }])).toBe(false); // the lock lapsed first
    expect(run('drones', [{}, { dronesOut: 0 }])).toBe(false);
    expect(run('drones', [{}, { dronesOut: 6 }])).toBe(true);
    expect(run('map', [{}, { nav: 'map' }, { nav: 'computer' }])).toBe(false);
    expect(run('map', [{}, { nav: 'map' }, { nav: 'computer' }, { nav: 'route' }])).toBe(true);
    expect(run('autopilot', [{}, { auto: true }])).toBe(true);
    expect(run('dock', [{}, { docked: 'stn-earth-1' }])).toBe(true);
    expect(run('repair', [{ docked: 'stn-earth-1', hull: 72 }, { docked: 'stn-earth-1', hull: 72 }])).toBe(false);
    expect(run('repair', [{ docked: 'stn-earth-1', hull: 72 }, { docked: 'stn-earth-1', hull: 100 }])).toBe(true);
    expect(run('undock', [{ docked: 'stn-earth-1' }, { docked: null }])).toBe(true);
  });
  it('every lesson names its keys from the binds, so it cannot drift from bindings.ts again (GAMEPLAY.md correction 4)', () => {
    const all = stepsFor(['laser', 'missile']);
    for (const st of all) {
      for (const t of tokensOf(st.keys)) expect(ACTIONS as string[], `${st.id}: {${t}}`).toContain(t);
      const text = howTo(st, DEFAULT_BINDS);
      expect(text, st.id).not.toMatch(/\{\w+\}/); // every token filled
      // No key written into the text by hand: a lone capital letter or a named key outside a token.
      expect(st.keys.replace(/\{\w+\}/g, ''), st.id).not.toMatch(/\b(Shift|Space|Ctrl|Control|Enter|Tab)\b|(^|[\s(])[A-Z](?=[\s.,)])/);
    }
    const say = (id: string) => howTo(all.find((x) => x.id === id)!, DEFAULT_BINDS);
    // The corrections table: what the defaults actually bind.
    expect(say('boost')).toMatch(/Hold Ctrl/);
    expect(say('switch')).toMatch(/^Press 2/);
    expect(say('lock')).toMatch(/press C: a lock icon/); // eve-controls E6: the bow draw (Hold Right click) is gone
    expect(say('map')).toMatch(/^Press M/);
    expect(say('autopilot')).toMatch(/Press G/);
    expect(say('dock')).toMatch(/Enter docks/);
    expect(say('drones')).toMatch(/Press 5/);
    // A rebound key shows up in the lesson.
    expect(howTo(all.find((x) => x.id === 'autopilot')!, rebind(DEFAULT_BINDS, 'autopilot', 'KeyP'))).toMatch(/Press P/);
    expect(howTo(all.find((x) => x.id === 'drones')!, DEFAULT_BINDS, true)).toMatch(/Tap slot 5/);
  });
  it('moves forward and back, and a save resumes on the same step', () => {
    const steps = stepsFor(['laser']);
    expect(nextStep(steps, 'laser')).toBe('drones');
    expect(nextStep(steps, 'lock')).toBe('drones'); // a saved step this fit has no lesson for moves on
    expect(nextStep(steps, 'undock')).toBeNull();
    expect(prevStep(steps, 'throttle')).toBeNull();
    expect(prevStep(steps, 'map')).toBe('drones');
    expect(migrateTutorial({ step: 'dock', done: false, skipped: false })).toEqual({ step: 'dock', done: false, skipped: false });
    expect(migrateTutorial({ step: 'nonsense' })).toEqual(newTutorial());
    expect(migrateTutorial({ done: true, skipped: true })).toEqual({ step: null, done: true, skipped: true });
    expect(migrateTutorial(undefined)).toBeNull();
  });
});

describe('opening: the first goal (motivation seam)', () => {
  it("every nation's first goal is the first raid: another nation, coming to you", () => {
    for (const n of IDS) {
      const g = firstGoal(n);
      expect(RIVAL[n]).not.toBe(n);
      expect(g.against).toBe(RIVAL[n]);
      expect(g.target).toBeNull();
      expect(g.need).toBe(2);
      expect(g.need).toBeGreaterThan(0);
      expect(g.why.length).toBeGreaterThan(40);
    }
  });
  it('only the rival’s ships count, and it is done at the count', () => {
    let g = startGoal('earth');
    g = goalKill(g, 'venus');
    expect(g.kills).toBe(0);
    for (let i = 0; i < 2; i++) g = goalKill(g, 'mars');
    expect(g).toMatchObject({ kills: 2, done: true });
    expect(goalKill(g, 'mars')).toBe(g);
    expect(migrateGoal(JSON.parse(JSON.stringify(g)))).toEqual(g);
    expect(migrateGoal({ nation: 'mars', kills: -2 })).toMatchObject({ kills: 0, done: false });
  });
});

describe('opening: the save', () => {
  it('keeps the pilot, the tutorial and the goal, and an older save has none', () => {
    const d = migrate({ journey: null, pilot: defaultPilot('venus'), tutorial: { step: 'repair', done: false }, goal: startGoal('venus') });
    expect(d.pilot?.nation).toBe('venus');
    expect(d.tutorial).toEqual({ step: 'repair', done: false, skipped: false });
    expect(d.goal?.nation).toBe('venus');
    const old = migrate({ journey: { ship: { pos: [0, 0, 0], yaw: 0, pitch: 0, target: null }, savedAt: 1 } });
    expect([old.pilot, old.tutorial, old.goal]).toEqual([null, null, null]);
  });
  it('covers all seven nations', () => {
    expect(IDS.sort()).toEqual((['earth', 'jupiter', 'mars', 'mercury', 'moon', 'saturn', 'venus'] as NationId[]).sort());
  });
});
