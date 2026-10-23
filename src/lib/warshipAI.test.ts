import { describe, expect, it } from 'vitest';
import type { V3 } from './nav';
import { add, dist, dot, len, scale, sub, unit } from './nav';
import type { Occluder } from './tactics';
import { hidden } from './tactics';
import type { WarshipView } from './warshipAI';
import { coverThreshold, newWarshipMem, warshipThink } from './warshipAI';
import { flyFree } from './pilot';
import { AI } from './aiKnobs';

const view = (o: Partial<WarshipView> = {}): WarshipView => ({
  cls: 'cruiser', t: 0, pos: [0, 0, 300], vel: [0, 0, 0], fwd: [0, 0, -1], id: 7, r: 0.7,
  target: { pos: [0, 0, 0], vel: [0, 0, 0] }, shield: 1, standoff: 150, slot: null, occluders: [],
  speed: 38, accel: 16, coverPref: 0.5, k: 1, ...o,
});

/** Fly a warship for `secs` against a fixed or moving player, re-thinking every step. */
function fly(v: WarshipView, secs: number, playerAt: (t: number) => V3 = () => v.target.pos, shield: (t: number) => number = () => v.shield) {
  const mem = newWarshipMem();
  const b = { pos: v.pos, vel: v.vel, fwd: v.fwd };
  const dt = 1 / 30;
  const log: { t: number; d: number; mode: string; hidden: boolean; fwd: V3; pos: V3 }[] = [];
  for (let t = 0; t < secs; t += dt) {
    const tp = playerAt(t);
    const o = warshipThink({ ...v, t, pos: b.pos, vel: b.vel, fwd: b.fwd, shield: shield(t), target: { pos: tp, vel: [0, 0, 0] } }, mem);
    flyFree(b, o.wantVel, o.face, { speed: v.speed, accel: v.accel, turn: v.cls === 'capital' ? 0.3 : 0.9 }, dt);
    log.push({ t, d: dist(b.pos, tp), mode: o.mode, hidden: o.hidden, fwd: b.fwd, pos: b.pos });
  }
  return log;
}

describe('cruiser', () => {
  it('closes to its standoff range and holds it with its guns on the player', () => {
    const log = fly(view(), 30);
    const end = log[log.length - 1];
    expect(Math.abs(end.d - 150)).toBeLessThan(150 * 0.15);
    expect(end.mode).toBe('hold');
    const toP = unit(sub([0, 0, 0], end.pos));
    expect(dot(end.fwd, toP)).toBeGreaterThan(0.95);
  });
  it('backs off when the player comes inside its range, still facing the player', () => {
    const log = fly(view({ pos: [0, 0, 60] }), 12);
    expect(log[log.length - 1].d).toBeGreaterThan(110);
    expect(dot(log[log.length - 1].fwd, [0, 0, -1])).toBeGreaterThan(0.9);
  });
  it('flies to its flank slot', () => {
    const slot: V3 = [150, 0, 0];
    const log = fly(view({ slot }), 40);
    expect(dist(log[log.length - 1].pos, slot)).toBeLessThan(20);
  });
});

describe('capital ship', () => {
  const cap = (o: Partial<WarshipView> = {}) => view({ cls: 'capital', r: 1.1, speed: 16, accel: 5, standoff: 120, pos: [0, 0, 200], ...o });
  it('circles the player at standoff, broadside on', () => {
    const log = fly(cap(), 60);
    const late = log.slice(-300);
    for (const x of late) expect(Math.abs(x.d - 120)).toBeLessThan(120 * 0.25);
    const end = late[late.length - 1];
    const toP = unit(sub([0, 0, 0], end.pos));
    expect(Math.abs(dot(end.fwd, toP))).toBeLessThan(0.35); // the player is off its beam, not its nose
    expect(dist(late[0].pos, end.pos)).toBeGreaterThan(20); // and it keeps moving
  });
  it('with its shield low, it hides behind a planet; with the shield back, it comes out', () => {
    const planet: Occluder = { pos: [0, 0, 80], r: 12, kind: 'body' };
    const log = fly(cap({ occluders: [planet], pos: [60, 0, 160] }), 40, () => [0, 0, 0], (t) => (t < 25 ? 0.1 : 0.95));
    const at24 = log.find((x) => x.t > 24)!;
    expect(at24.mode).toBe('cover');
    expect(at24.hidden).toBe(true);
    expect(hidden(at24.pos, 7, [0, 0, 0], [planet])).toBe(true);
    expect(log[log.length - 1].mode).not.toBe('cover');
  });
  it('it can hide behind its own cruiser', () => {
    const cruiser: Occluder = { pos: [0, 0, 60], r: 2.5, kind: 'ship', id: 2 };
    const log = fly(cap({ occluders: [cruiser], pos: [30, 0, 140] }), 30, () => [0, 0, 0], () => 0.1);
    const end = log[log.length - 1];
    expect(end.mode).toBe('cover');
    expect(end.hidden).toBe(true);
  });
  it('the cover threshold follows doctrine', () => {
    expect(coverThreshold(1)).toBeGreaterThan(coverThreshold(0));
    expect(coverThreshold(0.5)).toBeCloseTo(AI.coverAt);
  });
  it('no cover in reach: it stays on the line rather than running', () => {
    const far: Occluder = { pos: [5000, 0, 0], r: 10, kind: 'body' };
    const mem = newWarshipMem();
    const o = warshipThink(cap({ shield: 0.05, occluders: [far] }), mem);
    expect(o.mode).not.toBe('cover');
    expect(len(add(o.wantVel, scale(o.wantVel, 0)))).toBeGreaterThan(0);
  });
});

describe('destroyer (fast hunter)', () => {
  const D = { cls: 'destroyer' as const, speed: 46, accel: 20, standoff: 120 };
  it('runs in at full speed, then circles the player at speed, outside its nose', () => {
    const v = view({ ...D, target: { pos: [0, 0, 0], vel: [0, 0, 0], fwd: [0, 0, 1] } });
    const first = warshipThink(v, newWarshipMem());
    expect(len(first.wantVel)).toBeCloseTo(46, 6); // 300 out: straight in, flat out
    const mem = newWarshipMem();
    const b = { pos: v.pos, vel: v.vel, fwd: v.fwd };
    let inNose = 0, n = 0, dMin = Infinity, dMax = 0;
    for (let t = 0; t < 40; t += 1 / 30) {
      const o = warshipThink({ ...v, t, pos: b.pos, vel: b.vel, fwd: b.fwd }, mem);
      flyFree(b, o.wantVel, o.face, { speed: 46, accel: 20, turn: 1.1 }, 1 / 30);
      if (t > 20) {
        n++;
        const d = len(b.pos);
        dMin = Math.min(dMin, d); dMax = Math.max(dMax, d);
        if (dot(unit(b.pos), [0, 0, 1]) > Math.cos(0.3)) inNose++;
      }
    }
    expect(dMax).toBeLessThan(120 * 1.3); // it stays in its guns' reach …
    expect(dMin).toBeGreaterThan(20); // … without ramming
    expect(inNose / n).toBeLessThan(0.15); // and rarely sits in front of the player's guns
  });
  it('out-runs and out-turns the cruiser and the capital ship', async () => {
    const { CLASS } = await import('./enemyArms');
    for (const t of ['cruiser', 'capital'] as const) {
      expect(CLASS.destroyer.speed).toBeGreaterThan(CLASS[t].speed);
      expect(CLASS.destroyer.turn).toBeGreaterThan(CLASS[t].turn);
      expect(CLASS.destroyer.accel).toBeGreaterThan(CLASS[t].accel);
    }
    expect(CLASS.destroyer.size).toBeGreaterThan(CLASS.cruiser.size);
    expect(CLASS.destroyer.size).toBeLessThan(CLASS.capital.size);
  });
});

describe('destroyer firepower (rolled fits)', () => {
  it('out-guns the cruiser and sits slightly under the capital ship, averaged over every nation and 40 rolls', async () => {
    const { rollFit, levelOf } = await import('./enemyArms');
    const { MUNITIONS } = await import('./munitions');
    const dps = (cls: 'capital' | 'cruiser' | 'destroyer') => {
      let sum = 0, n = 0;
      for (const nation of ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']) for (let s = 0; s < 40; s++) {
        const f = rollFit(nation, cls, levelOf(nation, cls), s);
        sum += f.weapons.reduce((a, id) => { const m = MUNITIONS[id]; return a + (m.rate > 0 ? m.damage * m.rate : m.damage); }, 0);
        n++;
      }
      return sum / n;
    };
    const [cap, des, cru] = [dps('capital'), dps('destroyer'), dps('cruiser')];
    console.log(`enemy-ai rolled dps: capital ${cap.toFixed(1)}, destroyer ${des.toFixed(1)}, cruiser ${cru.toFixed(1)}`);
    expect(des).toBeGreaterThan(cru);
    expect(des).toBeLessThan(cap);
  });
});
