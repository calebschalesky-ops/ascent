import { describe, expect, it, vi } from 'vitest';
import { SATURN_12V12, command, createBattle, fire, hashState, order, step } from '../index';
import { ABILITY, CLASS } from '../numbers';
import { wrap } from '../ships';
import type { Battle, Order, Ship, V3 } from '../types';
import { flightOf, previewManeuver } from './fly';
import { MAN } from './numbers';
import { limitsOf } from './pilot';
import { plan, rangeOf } from './shapes';
import { MANEUVER_NAMES } from './types';
import type { ManeuverName, ManeuverPreview } from './types';

// These tests fly whole battles (about a second each on a quiet machine). With several build threads loading the
// machine, the 5 s default timed them out in the merge gate on 2026-10-21 (PKG-18); the limit is wall time, not a bar.
vi.setConfig({ testTimeout: 30_000 });

const ship = (b: Battle, id: string) => b.ships.find((s) => s.id === id)!;
const clone = (b: Battle): Battle => JSON.parse(JSON.stringify(b));
const d2 = (a: { x: number; z: number }, c: { x: number; z: number }) => Math.hypot(a.x - c.x, a.z - c.z);

/** Both fleets, no guns (nothing gets damaged, so nothing but the pilot moves the flown ships), enemy idle. */
function quiet(seed = 3): Battle {
  const b = createBattle(SATURN_12V12, seed, { controllers: { enemy: 'idle' } });
  for (const s of b.ships) s.guns = [];
  return b;
}

/** The six, each with the ships that fly it and its target (seed 3 is EXP-03's start state). */
const CASES: Record<ManeuverName, { ships: string[]; target: string; side?: 'port' | 'starboard' | 'aft' }> = {
  broadsidePass: { ships: ['p2'], target: 'e3' },
  crossingLine: { ships: ['p4'], target: 'e3' },
  flankingArc: { ships: ['p3'], target: 'e3', side: 'aft' },
  boardingRun: { ships: ['p7', 'p5', 'p8'], target: 'e3' },
  defensiveWheel: { ships: ['p2', 'p3', 'p4'], target: 'e6' },
  fightingWithdrawal: { ships: ['p2', 'p3', 'p4'], target: 'e6' },
};

function orderIt(b: Battle, name: ManeuverName): boolean {
  const c = CASES[name];
  const o: Order = { kind: 'maneuver', name, target: c.target, ...(c.side ? { side: c.side } : {}), ...(c.ships.length > 1 ? { group: c.ships.slice(1) } : {}) };
  return order(b, c.ships[0], o);
}

/** Order it, fly it to the end, and return the worst distance between the flown track and the ghost line. */
function flyAndCompare(b: Battle, pre: ManeuverPreview, ids: string[]): { worst: number; flownEnd: number } {
  const want = new Map<number, Record<string, V3>>();
  for (const id of ids) pre.times[id].forEach((t, i) => {
    const row = want.get(Math.round(t * 100)) ?? {};
    row[id] = pre.path[id][i];
    want.set(Math.round(t * 100), row);
  });
  let worst = 0;
  const end = b.t + pre.eta + 2;
  while (b.t < end) {
    step(b);
    const row = want.get(Math.round(b.t * 100));
    if (row) for (const id of ids) if (row[id]) worst = Math.max(worst, d2(ship(b, id).pos, row[id]));
  }
  return { worst, flownEnd: b.t };
}

describe('maneuvers: the six, preview = flown (EXP-03 steps 3-5)', { timeout: 60_000 }, () => {
  for (const name of MANEUVER_NAMES) {
    it(`${name}: the ghost line is the path flown, and it completes`, () => {
      const b = quiet();
      const c = CASES[name];
      const before = hashState(b);
      const pre = previewManeuver(b, c.ships, name, c.target, c.side);
      expect(hashState(b)).toBe(before); // the preview changes nothing
      expect(pre.refused).toEqual([]);
      expect(pre.complete).toBe(true);
      expect(pre.eta).toBeGreaterThan(5);
      for (const id of c.ships) expect(pre.path[id].length).toBeGreaterThan(3);
      expect(orderIt(b, name)).toBe(true);
      for (const id of c.ships) expect(flightOf(b, id)?.name).toBe(name);
      const { worst } = flyAndCompare(b, pre, c.ships);
      expect(worst).toBeLessThanOrEqual(MAN.previewTolM);
      for (const id of c.ships) {
        expect(flightOf(b, id)).toBeUndefined();
        expect(b.log.some((e) => e.kind === 'maneuver' && e.ship === id && e.phase === 'done')).toBe(true);
      }
    });
  }

  it('boarding run: escorts lead, the carrier launches pods through `board` at its closest point, everyone breaks away', () => {
    const b = quiet();
    const pre = previewManeuver(b, ['p7', 'p5', 'p8'], 'boardingRun', 'e3');
    const t0 = { ...ship(b, 'e3').pos };
    expect(pre.marks.map((m) => m.ship)).toEqual(['p7']);
    // Escorts get in first: each reaches its lead point before the carrier reaches its dive point.
    const closest = (id: string) => {
      const pts = pre.path[id];
      let best = Infinity;
      let at = 0;
      pts.forEach((p, i) => { const d = d2(p, t0); if (d < best) { best = d; at = pre.times[id][i]; } });
      return { best, at };
    };
    const near = Object.fromEntries(['p7', 'p5', 'p8'].map((id) => [id, closest(id)]));
    expect(near.p5.at).toBeLessThan(pre.marks[0].t);
    expect(near.p8.at).toBeLessThan(pre.marks[0].t);
    orderIt(b, 'boardingRun');
    flyAndCompare(b, pre, ['p7', 'p5', 'p8']);
    const launch = b.log.find((e) => e.kind === 'boardLaunch' && e.ship === 'p7');
    expect(launch && launch.kind === 'boardLaunch' && launch.ordered).toBe(true);
    expect(launch!.t).toBeCloseTo(pre.marks[0].t, 1);
    // Breaking away: every ship's course ends further from where the target was than its closest point.
    for (const id of ['p7', 'p5', 'p8']) expect(d2(pre.path[id][pre.path[id].length - 1], t0)).toBeGreaterThan(near[id].best + 500);
  });

  it('each of the six is a different shape', () => {
    const b = quiet();
    const shapes = MANEUVER_NAMES.map((n) => {
      const pre = previewManeuver(b, ['p2', 'p3'], n, n === 'defensiveWheel' || n === 'fightingWithdrawal' ? 'e6' : 'e3');
      return { n, pts: pre.path.p2 ?? pre.path.p3 };
    }).filter((x) => x.pts);
    // boardingRun needs a hangar: with two cruisers it is refused; the carrier's shape is checked above.
    expect(shapes.map((x) => x.n)).not.toContain('boardingRun');
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const A = shapes[i].pts;
        const B = shapes[j].pts;
        // Time-aligned, the two paths come at least a kilometre apart somewhere (or one ends while the other flies on).
        let far = 0;
        for (let k = 0; k < Math.max(A.length, B.length); k++) far = Math.max(far, d2(A[Math.min(k, A.length - 1)], B[Math.min(k, B.length - 1)]));
        expect(far, `${shapes[i].n} vs ${shapes[j].n}`).toBeGreaterThan(1000);
      }
    }
  });

  it('a group of ships with no hangar is refused the boarding run, out loud', () => {
    const b = quiet();
    expect(order(b, 'p2', { kind: 'maneuver', name: 'boardingRun', target: 'e3', group: ['p3'] })).toBe(false);
    const last = b.log.filter((e) => e.kind === 'commsRefused');
    expect(last.map((e) => e.ship).sort()).toEqual(['p2', 'p3']);
    expect(last[0].kind === 'commsRefused' && last[0].reason).toMatch(/no boarding hangar/);
    const o = b.log.find((e) => e.kind === 'order' && e.order.kind === 'maneuver');
    expect(o && o.kind === 'order' && o.ok).toBe(false);
    expect(order(b, 'p2', { kind: 'maneuver', name: 'ram', target: 'e3' })).toBe(false);
    expect(b.log[b.log.length - 1].kind).toBe('commsRefused');
  });
});

describe('maneuvers: the captain chooses how (EXP-03 step 7)', { timeout: 60_000 }, () => {
  /**
   * The ideal shape is the plotted course: the start, then each go waypoint, as straight lines. How tightly a ship holds
   * it is the WORST distance (PKG-18; PKG-10 used the mean) from any ghost-line point to that course, over every ship.
   */
  function worstOff(b: Battle, pre: ManeuverPreview, plans: ReturnType<typeof plan>['plans']): number {
    const seg = (p: V3, a: { x: number; z: number }, c: { x: number; z: number }) => {
      const dx = c.x - a.x, dz = c.z - a.z;
      const L = dx * dx + dz * dz || 1;
      const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L));
      return Math.hypot(p.x - (a.x + u * dx), p.z - (a.z + u * dz));
    };
    let worst = 0;
    for (const pl of plans) {
      const s = ship(b, pl.ship);
      const poly = [{ x: s.pos.x, z: s.pos.z }, ...pl.legs.flatMap((l) => (l.k === 'go' ? [{ x: l.x, z: l.z }] : []))];
      for (const p of pre.path[pl.ship]) {
        let m = Infinity;
        for (let i = 1; i < poly.length; i++) m = Math.min(m, seg(p, poly[i - 1], poly[i]));
        worst = Math.max(worst, m);
      }
    }
    return worst;
  }

  /** The same battle, every ship in the group given Helm `helm` and a trait that shades nothing. */
  function withHelm(b0: Battle, ids: string[], helm: number): Battle {
    const b = clone(b0);
    for (const id of ids) {
      ship(b, id).captain.abilities.helm = helm;
      ship(b, id).captain.trait = 'By-the-book';
    }
    return b;
  }

  /** Both helms on one geometry, preview only (preview = flown is proved above and below). */
  function compare(b0: Battle, ids: string[], name: ManeuverName, target: string, side?: 'port' | 'starboard' | 'aft') {
    const r: Record<number, { eta: number; off: number }> = {};
    for (const helm of [9, 3]) {
      const b = withHelm(b0, ids, helm);
      const p = plan(b, ids, name, target, side ?? null);
      const pre = previewManeuver(b, ids, name, target, side ?? null);
      expect(pre.refused).toEqual([]);
      expect(pre.complete).toBe(true);
      r[helm] = { eta: pre.eta, off: worstOff(b, pre, p.plans) };
    }
    return r;
  }

  for (const name of MANEUVER_NAMES) {
    it(`${name}: Helm 9 finishes sooner and holds the path tighter than Helm 3, flown`, () => {
      const c = CASES[name];
      const r: Record<number, { eta: number; off: number; flown: number }> = {};
      for (const helm of [9, 3]) {
        const b = withHelm(quiet(), c.ships, helm);
        const p = plan(b, c.ships, name, c.target, c.side ?? null);
        const pre = previewManeuver(b, c.ships, name, c.target, c.side);
        const off = worstOff(b, pre, p.plans);
        expect(orderIt(b, name)).toBe(true);
        const { worst } = flyAndCompare(b, pre, c.ships);
        expect(worst).toBeLessThanOrEqual(MAN.previewTolM);
        const done = b.log.filter((e) => e.kind === 'maneuver' && c.ships.includes(e.ship) && e.phase === 'done');
        expect(done.length).toBe(c.ships.length);
        r[helm] = { eta: pre.eta, off, flown: Math.max(...done.map((e) => e.t)) };
      }
      expect(r[9].eta).toBeLessThan(r[3].eta);
      expect(r[9].flown).toBeLessThan(r[3].flown);
      expect(r[9].off).toBeLessThan(r[3].off);
    });
  }

  /**
   * PKG-12 measured the flanking arc looser at Helm 9 in 4 of 5 live geometries. This sweeps live battles (both sides'
   * controllers running) at 0, 4 and 20 s on three seeds, every maneuver, several ships and targets. Both helms within
   * the ghost line's own tolerance (MAN.previewTolM) of the plotted course is a tie: both flew the course, and a
   * difference smaller than the ghost line is held to cannot be seen. Ties are allowed; looser is not.
   */
  const ON_COURSE_M = MAN.previewTolM;
  const SWEEP: Record<ManeuverName, string[][]> = {
    broadsidePass: [['p2'], ['p4'], ['p3'], ['p9'], ['p1']],
    crossingLine: [['p2'], ['p4'], ['p3'], ['p9']],
    flankingArc: [['p2'], ['p4'], ['p3'], ['p9'], ['p11']],
    boardingRun: [['p7', 'p5', 'p8']],
    defensiveWheel: [['p2', 'p3', 'p4'], ['p2']],
    fightingWithdrawal: [['p2', 'p3', 'p4'], ['p4']],
  };
  it('Helm 9 finishes sooner and is never looser than Helm 3, across live geometries (every maneuver)', () => {
    const misses: string[] = [];
    let n = 0;
    let tighter = 0;
    for (const seed of [1, 3, 5]) for (const at of [0, 4, 20]) {
      const b0 = createBattle(SATURN_12V12, seed);
      while (b0.t < at) step(b0);
      for (const name of MANEUVER_NAMES) for (const ids of SWEEP[name]) for (const target of ['e2', 'e3', 'e4', 'e9']) {
        const r = compare(b0, ids, name, target);
        n++;
        const onCourse = r[9].off <= ON_COURSE_M && r[3].off <= ON_COURSE_M;
        if (r[9].off < r[3].off) tighter++;
        if (!(r[9].eta < r[3].eta) || !(r[9].off < r[3].off || onCourse)) {
          misses.push(`seed ${seed} ${at}s ${name} ${ids.join('+')}→${target}: eta ${r[9].eta}/${r[3].eta}, off ${r[9].off.toFixed(0)}/${r[3].off.toFixed(0)} m`);
        }
      }
    }
    expect(misses).toEqual([]);
    expect(n).toBe(684);
    expect(tighter).toBeGreaterThan(n * 0.75);
  }, 60000);
});

describe('maneuvers: broadside pass joins the run without a detour (PKG-18)', { timeout: 60_000 }, () => {
  it('never swings out past the run line or runs back along it by more than a turning radius', () => {
    let worstOut = 0;
    let worstBack = 0;
    for (const seed of [1, 3, 5]) for (const at of [0, 4, 20]) {
      const b0 = createBattle(SATURN_12V12, seed);
      while (b0.t < at) step(b0);
      for (const id of ['p1', 'p2', 'p3', 'p4', 'p9']) for (const tg of ['e2', 'e3', 'e4', 'e9']) for (const helm of [9, 3]) {
        const b = clone(b0);
        const s = ship(b, id);
        s.captain.abilities.helm = helm;
        const t = ship(b, tg);
        const legs = plan(b, [id], 'broadsidePass', tg).plans[0].legs.flatMap((l) => (l.k === 'go' ? [l] : []));
        const pre = previewManeuver(b, [id], 'broadsidePass', tg);
        const radius = limitsOf(s, b.dt).radius;
        // Away from the target line: distance from the target's track, beyond the run line or where the ship began.
        const off = (q: { x: number; z: number }) => Math.abs(Math.cos(t.heading) * (q.z - t.pos.z) - Math.sin(t.heading) * (q.x - t.pos.x));
        const base = Math.max(off(s.pos), rangeOf(s));
        // Back along the run: against the run's direction (join → exit), from where the ship began.
        const a = legs[0], e = legs[legs.length - 1];
        const len = Math.hypot(e.x - a.x, e.z - a.z);
        const u = (q: { x: number; z: number }) => ((q.x - a.x) * (e.x - a.x) + (q.z - a.z) * (e.z - a.z)) / len;
        const u0 = u(s.pos);
        for (const q of pre.path[id]) {
          worstOut = Math.max(worstOut, (off(q) - base) / radius);
          worstBack = Math.max(worstBack, (u0 - u(q)) / radius);
        }
        // The run is parallel to the target and passes its beam: the last leg runs along its heading, at range.
        const prev = legs[legs.length - 2];
        expect(Math.abs(Math.sin(wrap(Math.atan2(e.z - prev.z, e.x - prev.x) - t.heading)))).toBeLessThan(1e-6);
        expect(Math.abs(off(e) - rangeOf(s))).toBeLessThan(1);
      }
    }
    expect(worstOut).toBeLessThanOrEqual(1);
    expect(worstBack).toBeLessThanOrEqual(1);
  }, 60000);
});

describe('maneuvers: the captain chooses how (traits)', { timeout: 60_000 }, () => {
  it('traits shade the choice: a Bold captain goes straight in, a Veteran swings wide', () => {
    const legsFor = (trait: Ship['captain']['trait']) => {
      const b = quiet();
      ship(b, 'p3').captain.trait = trait;
      return { b, legs: plan(b, ['p3'], 'flankingArc', 'e3', 'aft').plans[0].legs };
    };
    const bold = legsFor('Bold');
    const vet = legsFor('Veteran');
    expect(bold.legs.filter((l) => l.k === 'go').length).toBe(1);
    expect(vet.legs.filter((l) => l.k === 'go').length).toBeGreaterThan(1);
    const t = ship(vet.b, 'e3').pos;
    const firstArc = vet.legs[0] as { x: number; z: number };
    const goal = vet.legs.filter((l) => l.k === 'go').slice(-1)[0] as { x: number; z: number };
    expect(d2(firstArc, t)).toBeGreaterThan(d2(goal, t) * 1.3);
  });
});

describe('maneuvers: override (EXP-03 step 6)', { timeout: 60_000 }, () => {
  it('a new order mid-maneuver breaks off, and the heading never turns faster than the ship can', () => {
    const b = quiet();
    const s = ship(b, 'p2');
    const pre = previewManeuver(b, ['p2'], 'broadsidePass', 'e3');
    order(b, 'p2', { kind: 'maneuver', name: 'broadsidePass', target: 'e3' });
    const limit = CLASS[s.cls].turn * (ABILITY.helmBase + ABILITY.helmPer * s.captain.abilities.helm) * b.dt;
    expect(limitsOf(s, b.dt).rate).toBeCloseTo(limit, 12);
    let worst = 0;
    let prev = s.heading;
    const half = pre.eta / 2;
    while (b.t < half) { step(b); worst = Math.max(worst, Math.abs(wrap(s.heading - prev))); prev = s.heading; }
    // Turn on a target well behind: the biggest turn there is.
    expect(order(b, 'p2', { kind: 'attack', target: 'e11' })).toBe(true);
    const cancelAt = b.t;
    let maxAfter = 0;
    while (b.t < cancelAt + 60) { step(b); maxAfter = Math.max(maxAfter, Math.abs(wrap(s.heading - prev))); prev = s.heading; }
    expect(flightOf(b, 'p2')).toBeUndefined();
    expect(b.log.some((e) => e.kind === 'maneuver' && e.ship === 'p2' && e.phase === 'brokenOff')).toBe(true);
    expect(worst).toBeLessThanOrEqual(limit + 1e-12);
    expect(maxAfter).toBeLessThanOrEqual(limit + 1e-12);
    expect(maxAfter).toBeGreaterThan(limit * 0.9); // it did turn, at the limit, not snap
  });

  it('a new maneuver replaces the one in flight; a guns order does not break it', () => {
    const b = quiet();
    const f = b.sides.player.flagshipId;
    order(b, 'p2', { kind: 'maneuver', name: 'broadsidePass', target: 'e3' });
    for (let i = 0; i < 90; i++) step(b);
    order(b, 'p2', { kind: 'maneuver', name: 'crossingLine', target: 'e4' });
    expect(flightOf(b, 'p2')?.name).toBe('crossingLine');
    command(b, f, { kind: 'maneuver', name: 'flankingArc', target: 'e3' });
    for (let i = 0; i < 30; i++) step(b);
    expect(flightOf(b, f)?.name).toBe('flankingArc');
    command(b, f, { kind: 'gunsOn', target: 'e3' });
    for (let i = 0; i < 30; i++) step(b);
    expect(flightOf(b, f)?.name).toBe('flankingArc');
  });
});

describe('maneuvers: the flag captain flies the helm order (EXP-02 step 9)', { timeout: 60_000 }, () => {
  it('helm "bring us across their bow" flies crossing the line, and the flagship follows its ghost line', () => {
    const b = createBattle(SATURN_12V12, 2, { controllers: { enemy: 'idle' } });
    for (const s of b.ships) s.guns = [];
    const f = b.sides.player.flagshipId;
    command(b, f, { kind: 'gunsOn', target: 'e6' });
    const r = command(b, f, { kind: 'helm', maneuver: 'crossBow' });
    expect(r.ok).toBe(true);
    expect(flightOf(b, f)).toBeUndefined(); // picked up on the next step
    const pre = previewManeuver(b, [f], 'crossingLine', 'e6');
    step(b);
    expect(flightOf(b, f)?.name).toBe('crossingLine');
    expect(flightOf(b, f)?.target).toBe('e6');
    // The step that picked it up flew its first tick; compare from here.
    const { worst } = flyAndCompare(b, { ...pre, eta: pre.eta - b.dt }, [f]);
    expect(worst).toBeLessThanOrEqual(MAN.previewTolM);
    expect(b.log.some((e) => e.kind === 'maneuver' && e.ship === f && e.phase === 'done')).toBe(true);
  });

  it('every helm maneuver is flown or refused out loud', () => {
    for (const m of ['close', 'crossBow', 'freshSide', 'openRange', 'holdStation', 'ram']) {
      const b = quiet();
      const f = b.sides.player.flagshipId;
      command(b, f, { kind: 'helm', maneuver: m });
      step(b);
      const fl = flightOf(b, f);
      if (m === 'ram') expect(b.log.some((e) => e.kind === 'commsRefused' && e.ship === f && /ram/.test(e.reason))).toBe(true);
      else if (m === 'holdStation') expect(ship(b, f).order?.kind).toBe('holdPosition');
      else expect(fl, m).toBeDefined();
    }
  });
});

describe('maneuvers: rule 1 and determinism', { timeout: 60_000 }, () => {
  it('the maneuver changes geometry only: given the same geometry, a flown ship and a plain one roll the same hits', () => {
    const a = createBattle(SATURN_12V12, 5);
    order(a, 'p2', { kind: 'maneuver', name: 'flankingArc', target: 'e3', side: 'port' });
    let compared = 0;
    for (let k = 0; k < 6; k++) {
      for (let i = 0; i < 300; i++) step(a);
      const flying = clone(a);
      const plain = clone(a);
      delete plain.maneuvers;
      ship(plain, 'p2').order = null;
      for (const kind of ['rail', 'laser', 'missile'] as const) {
        for (const t of ['e3', 'e6', 'e1']) {
          const s1 = ship(flying, 'p2'), t1 = ship(flying, t);
          if (t1.status !== 'active' || s1.status !== 'active') continue;
          fire(flying, s1, kind, t1);
          fire(plain, ship(plain, 'p2'), kind, ship(plain, t));
          const x = flying.log[flying.log.length - 1];
          const y = plain.log[plain.log.length - 1];
          expect(x.kind === 'shot' && y.kind === 'shot').toBe(true);
          if (x.kind === 'shot' && y.kind === 'shot') { expect([x.p, x.roll, x.hit, x.side]).toEqual([y.p, y.roll, y.hit, y.side]); compared++; }
        }
      }
    }
    expect(compared).toBeGreaterThan(20);
  });

  it('same seed, same maneuver orders: the same battle; and a flight resumes exactly from a JSON copy', () => {
    const go = () => {
      const b = createBattle(SATURN_12V12, 4);
      for (let i = 0; i < 60; i++) step(b);
      order(b, 'p7', { kind: 'maneuver', name: 'boardingRun', target: 'e3', group: ['p5', 'p8'] });
      order(b, 'p2', { kind: 'maneuver', name: 'fightingWithdrawal', target: 'e6', group: ['p3'] });
      for (let i = 0; i < 900; i++) step(b);
      return b;
    };
    const x = go();
    const y = go();
    expect(hashState(x)).toBe(hashState(y));
    const z = clone(x);
    for (let i = 0; i < 900; i++) { step(x); step(z); }
    expect(hashState(z)).toBe(hashState(x));
  });

  it('a battle with no maneuver ordered carries no maneuver state (save shape unchanged)', () => {
    const b = createBattle(SATURN_12V12, 1);
    for (let i = 0; i < 600; i++) step(b);
    expect(b.maneuvers).toBeUndefined();
  });
});
