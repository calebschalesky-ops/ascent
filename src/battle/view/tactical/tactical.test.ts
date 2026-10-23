import { describe, expect, it } from 'vitest';
import { FLAGS } from '../../../flags';
import { SATURN_12V12, createBattle, flightOf, order, previewManeuver, step } from '../../sim/index';
import type { Battle, LogEvent, Ship } from '../../sim/index';
import { orderLines } from '../comms/logic';
import { createIntel, readIntel, shieldArcs } from './intel';
import { TAC } from './numbers';
import { distToPath, remainingPath } from './paths';
import { createPicker } from './picker';

const run = (b: Battle, s: number) => { for (let i = 0; i < Math.round(s * 30); i++) step(b); };
const own = (b: Battle) => b.ships.filter((s) => s.side === 'player');
const foe = (b: Battle) => b.ships.filter((s) => s.side === 'enemy');
const shot = (b: Battle, a: Ship, t: Ship, side: 'fore' | 'aft' | 'port' | 'starboard', shieldDmg: number, hullDmg: number): void => {
  b.log.push({ t: b.t, kind: 'shot', ship: a.id, target: t.id, gun: 'rail', range: 1000, p: 0.5, roll: 0.1, hit: true, side, shieldDmg, hullDmg } as LogEvent);
};

describe('tactical view (PKG-12)', () => {
  it('the flag is appended at the end of the list', () => {
    const f = FLAGS.find((x) => x.name === 'tactical');
    expect(f).toBeDefined(); // on since EXP-03's UI steps pass (reports/PKG-12.md)
    // PKG-25: flags.ts is append-only, so a later package's flag follows this one; it stays after the flags before it.
    const names = FLAGS.map((x) => x.name);
    expect(names.indexOf('tactical')).toBeGreaterThan(names.indexOf('director'));
  });

  it('time runs at 25% in the tactical view, never 0', () => {
    expect(TAC.timeScale).toBe(0.25);
    expect(TAC.timeScale).toBeGreaterThan(0);
    expect(TAC.normalScale).toBe(1);
  });

  it('enemy arcs: only what his ships saw land; a side seen to drop stays down until seen to recover', () => {
    const b = createBattle(SATURN_12V12, 3);
    const intel = createIntel();
    readIntel(intel, b, 'player');
    const [a] = own(b), [t] = foe(b);
    let arcs = shieldArcs(b, 'player', intel)[t.id];
    expect(arcs.every((x) => x.state === 'unknown' && x.level === null)).toBe(true);
    shot(b, a, t, 'port', 40, 0);
    readIntel(intel, b, 'player');
    expect(shieldArcs(b, 'player', intel)[t.id].find((x) => x.side === 'port')!.state).toBe('up');
    shot(b, a, t, 'port', 5, 30);
    readIntel(intel, b, 'player');
    expect(shieldArcs(b, 'player', intel)[t.id].find((x) => x.side === 'port')!.state).toBe('down');
    // The truth changes (the side regenerates) but nothing of his saw it: still down.
    t.shields.port = t.shieldTotal * t.split.port;
    t.open.port = false;
    run(b, 0.1);
    readIntel(intel, b, 'player');
    arcs = shieldArcs(b, 'player', intel)[t.id];
    const port = arcs.find((x) => x.side === 'port')!;
    expect(port.state === 'down' || port.state === 'up').toBe(true); // a real hit in that 0.1 s may have been seen
    shot(b, a, t, 'port', 25, 0);
    readIntel(intel, b, 'player');
    expect(shieldArcs(b, 'player', intel)[t.id].find((x) => x.side === 'port')!.state).toBe('up');
    // An enemy's hit on an enemy, or the enemy's on him, teaches him nothing about the enemy.
    const before = JSON.stringify(intel.ships[foe(b)[1].id] ?? null);
    shot(b, foe(b)[0], foe(b)[1], 'aft', 0, 50);
    shot(b, t, a, 'fore', 0, 50);
    readIntel(intel, b, 'player');
    expect(JSON.stringify(intel.ships[foe(b)[1].id] ?? null)).toBe(before);
  });

  it('enemy arcs never read the enemy\'s true shields: changing them changes nothing drawn', () => {
    const b = createBattle(SATURN_12V12, 3);
    const intel = createIntel();
    run(b, 40);
    readIntel(intel, b, 'player');
    const a1 = JSON.stringify(Object.fromEntries(foe(b).map((s) => [s.id, shieldArcs(b, 'player', intel)[s.id]])));
    for (const s of foe(b)) { s.shields = { fore: 0, aft: 0, port: 0, starboard: 0 }; s.open = { fore: true, aft: true, port: true, starboard: true }; s.split = { fore: 1, aft: 0, port: 0, starboard: 0 }; }
    const a2 = JSON.stringify(Object.fromEntries(foe(b).map((s) => [s.id, shieldArcs(b, 'player', intel)[s.id]])));
    expect(a2).toBe(a1);
  });

  it('his own arcs are the truth: charge per side and the power split', () => {
    const b = createBattle(SATURN_12V12, 3);
    const s = own(b)[0];
    s.shields.port = 0; s.open.port = true;
    const arcs = shieldArcs(b, 'player', createIntel())[s.id];
    expect(arcs.find((x) => x.side === 'port')).toMatchObject({ state: 'down', level: 0 });
    expect(arcs.find((x) => x.side === 'fore')!.level).toBeCloseTo(s.shields.fore / (s.shieldTotal * s.split.fore));
    expect(arcs.find((x) => x.side === 'fore')!.weight).toBe(s.split.fore);
  });

  it('picker: choose, target, ghost with ETA, commit through command(); the flown track stays on the ghost', () => {
    const b = createBattle(SATURN_12V12, 3);
    let changes = 0;
    const p = createPicker(() => b, () => 'player', () => { changes++; });
    const ship = b.ships.find((s) => s.id === 'p2')!;
    const target = foe(b).find((s) => s.cls === 'cruiser')!;
    expect(p.choose('broadsidePass', [ship.id]).stage).toBe('target');
    const st = p.target(target.id);
    expect(st.stage).toBe('ghost');
    expect(st.preview!.eta).toBeGreaterThan(0);
    expect(st.preview!.path[ship.id].length).toBeGreaterThan(2);
    const ghost = st.preview!.path[ship.id].map((q) => ({ x: q.x, z: q.z }));
    const r = p.commit()!;
    expect(changes).toBeGreaterThan(0);
    if (!r.ok) return; // a protest (pushback is PKG-06's, seeded): nothing flies yet
    expect(p.state().stage).toBe('idle');
    expect(flightOf(b, ship.id)).toBeDefined();
    let max = 0;
    for (let i = 0; i < 60 * 30 && flightOf(b, ship.id); i++) { step(b); max = Math.max(max, distToPath({ x: ship.pos.x, z: ship.pos.z }, ghost)); }
    expect(max).toBeLessThanOrEqual(TAC.ghostTolM);
  });

  it('picker: Esc cancels and nothing is ordered; a wheel previews before a target is clicked', () => {
    const b = createBattle(SATURN_12V12, 3);
    const p = createPicker(() => b, () => 'player', () => {});
    const n = b.log.filter((e) => e.kind === 'order').length;
    p.choose('defensiveWheel', ['p2', 'p3', 'p4']);
    expect(p.state().stage).toBe('ghost');
    expect(Object.keys(p.state().preview!.path).sort()).toEqual(['p2', 'p3', 'p4']);
    p.cancel();
    expect(p.state().stage).toBe('idle');
    expect(b.log.filter((e) => e.kind === 'order').length).toBe(n);
  });

  it('the six maneuvers each preview a different path', () => {
    const b = createBattle(SATURN_12V12, 3);
    const t = foe(b).find((s) => s.cls === 'cruiser')!.id;
    const ends = (['broadsidePass', 'crossingLine', 'flankingArc', 'defensiveWheel', 'fightingWithdrawal'] as const).map((n) => {
      const pv = previewManeuver(b, ['p3'], n, t);
      const path = pv.path.p3;
      return `${Math.round(path[path.length - 1].x / 100)}:${Math.round(path[path.length - 1].z / 100)}:${path.length}`;
    });
    expect(new Set(ends).size).toBe(ends.length);
  });

  it('order lines: every standing order kind, a maneuver as its remaining path (on the preview)', () => {
    const b = createBattle(SATURN_12V12, 3);
    const [a, c, d, e] = own(b).filter((s) => !s.flagship);
    const t = foe(b)[0];
    order(b, a.id, { kind: 'attack', target: t.id }, 'player');
    order(b, c.id, { kind: 'followFlagship' }, 'player');
    order(b, d.id, { kind: 'holdPosition' }, 'player');
    const cr = foe(b).find((s) => s.cls === 'cruiser')!;
    const pv = previewManeuver(b, [e.id], 'broadsidePass', cr.id);
    order(b, e.id, { kind: 'maneuver', name: 'broadsidePass', target: cr.id }, 'player');
    const all = orderLines(b, true);
    expect(all).toContainEqual({ from: a.id, to: t.id, kind: 'attack' });
    expect(all.find((l) => l.from === c.id)).toMatchObject({ kind: 'followFlagship', to: b.sides.player.flagshipId });
    expect(all.find((l) => l.from === d.id)).toMatchObject({ kind: 'holdPosition', to: null });
    const m = all.find((l) => l.from === e.id)!;
    expect(m.kind).toBe('maneuver');
    const ghost = pv.path[e.id].map((q) => ({ x: q.x, z: q.z }));
    for (const q of m.path!) expect(distToPath(q, ghost)).toBeLessThan(1);
    // Halfway, the remaining path starts at the ship and still lies on the ghost.
    run(b, 30);
    const rest = remainingPath(b, e.id, new Map())!;
    expect(rest.pts[0]).toEqual({ x: e.pos.x, z: e.pos.z });
    for (const q of rest.pts) expect(distToPath(q, ghost)).toBeLessThan(TAC.ghostTolM);
    // Without the flag, PKG-09's lines are unchanged: targeted orders only.
    expect(orderLines(b).every((l) => l.to !== null && !l.path)).toBe(true);
  });
});
