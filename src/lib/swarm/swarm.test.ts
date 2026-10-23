import { describe, expect, it } from 'vitest';
import type { V3 } from '../nav';
import { add, dist, scale } from '../nav';
import type { ShipType } from '../shipTypes';
import { bodyRadius } from '../shipTypes';
import type { Battle } from './battle';
import { makeBattle, shieldBlock, stepBattle } from './battle';
import { HOSTILE, hostileHangar, hostileWants } from './enemy';
import { DEFENCE, droneCapacity } from './refs';
import { FOCUS_FULL, ROLES, focusDps } from './roles';
import type { ShipRef, Swarm, SwarmWorld } from './swarm';
import { BAY, FLYING, killMember, launch, makeSwarm, memberPos, nearestPair, polarisation, recall, setOrder, shieldSlots, sphereSlot } from './swarm';

const L = 0.3708; // the player ship's length in world units today
const DT = 1 / 60;

function ship(id: number, side: 0 | 1, pos: V3, type: ShipType, armed = false, vel: V3 = [0, 0, 0]): ShipRef {
  const d = armed ? DEFENCE[type] : { pd: 0, flak: 0 };
  return { id, side, pos, vel, radius: bodyRadius(type, L), alive: true, pd: d.pd, flak: d.flak };
}
function worldOf(ships: ShipRef[]): SwarmWorld {
  return { time: 0, L, ships: new Map(ships.map((s) => [s.id, s])), bodies: [] };
}
/** Run the battle; ships take the damage events against `hp`, and moving ships move. */
function run(b: Battle, w: SwarmWorld, seconds: number, hp: Map<number, number> = new Map(), each?: (t: number) => void, dt = DT) {
  for (let k = 0; k < Math.round(seconds / dt); k++) {
    w.time += dt;
    for (const s of w.ships.values()) s.pos = add(s.pos, scale(s.vel, dt));
    stepBattle(b, w, dt);
    for (const e of b.events.damage) {
      if (!hp.has(e.ship)) continue;
      const left = hp.get(e.ship)! - e.amount;
      hp.set(e.ship, left);
      if (left <= 0) w.ships.get(e.ship)!.alive = false;
    }
    each?.(w.time);
  }
  return hp;
}
function swarmOf(b: Battle, o: Parameters<typeof makeSwarm>[0]): Swarm {
  const s = makeSwarm(o);
  b.swarms.push(s);
  launch(s);
  return s;
}

describe('hangars (destroyer-hangars.md)', () => {
  it('four drones to a slot: a cruiser carries 16, a capital 48', () => {
    expect(droneCapacity('cruiser')).toBe(16);
    expect(droneCapacity('capital')).toBe(48);
    expect(droneCapacity('fighter')).toBe(0);
  });
  it('a hostile capital ship fills its hangar with shield and explosive drones; a cruiser with laser drones', () => {
    const c = hostileHangar('capital');
    expect((c.shield ?? 0) + (c.explosive ?? 0)).toBe(48);
    expect(hostileHangar('cruiser')).toEqual({ attack: 16 });
    expect(hostileHangar('fighter')).toEqual({});
  });
  it('hostile carriers launch when the player closes or the nation is hit, and recall after calm', () => {
    const w = { provoked: false, calm: 0 };
    expect(hostileWants(w, 1000 * L, false, L, 0.1)).toBe(false);
    expect(hostileWants(w, 100 * L, false, L, 0.1)).toBe(true);
    expect(hostileWants(w, 300 * L, false, L, 0.1)).toBe(true); // still provoked inside the disengage range
    let out = true;
    for (let t = 0; t < HOSTILE.calmTime + 1; t += 0.5) out = hostileWants(w, 900 * L, false, L, 0.5);
    expect(out).toBe(false);
    expect(hostileWants(w, 900 * L, true, L, 0.1)).toBe(true);
  });
});

describe('launch, flock, recall', () => {
  it('the bay empties at the launch rate', () => {
    const w = worldOf([ship(1, 0, [0, 0, 0], 'cruiser')]);
    const b = makeBattle();
    const s = swarmOf(b, { side: 0, role: 'attack', carrier: 1, size: 16 });
    run(b, w, 0.85);
    expect(s.flying).toBeGreaterThanOrEqual(8);
    expect(s.flying).toBeLessThan(16);
    run(b, w, 1);
    expect(s.flying).toBe(16);
    expect(s.inBay).toBe(0);
  });

  it('in transit the flock aligns (polarisation) without collisions, and stays together', () => {
    const w = worldOf([ship(1, 0, [0, 0, 0], 'capital')]);
    const b = makeBattle();
    const s = swarmOf(b, { side: 0, role: 'explosive', carrier: 1, size: 48, seed: 3 });
    run(b, w, 5); // out and gathered round the carrier
    setOrder(s, { kind: 'hold', at: [400 * L, 0, 0], facing: [1, 0, 0] });
    let pol = 0, minGap = Infinity, maxSpread = 0;
    run(b, w, 2.5, undefined, () => { pol = Math.max(pol, polarisation(s)); minGap = Math.min(minGap, nearestPair(s)); maxSpread = Math.max(maxSpread, s.spread); });
    expect(pol).toBeGreaterThan(0.85);
    expect(minGap / L).toBeGreaterThan(0.3); // ≥ 3 drone lengths apart at the closest
    expect(maxSpread / L).toBeLessThan(40);
    console.log(`transit: polarisation ${pol.toFixed(2)}, closest pair ${(minGap / L).toFixed(2)} L, spread ${(maxSpread / L).toFixed(1)} L`);
  });

  it('a recalled swarm docks, repaired, and launches again', () => {
    const w = worldOf([ship(1, 0, [0, 0, 0], 'cruiser', false, [20 * L, 0, 0])]);
    const b = makeBattle();
    const s = swarmOf(b, { side: 0, role: 'attack', carrier: 1, size: 16 });
    run(b, w, 4);
    s.hp[0] = 1;
    recall(s);
    run(b, w, 6);
    expect(s.inBay).toBe(16);
    expect(s.stats.docked).toBe(16);
    expect(s.hp[0]).toBe(ROLES.attack.hp);
    launch(s);
    run(b, w, 2);
    expect(s.flying).toBe(16);
  });

  it('a carrier destroyed takes the drones still in its bay', () => {
    const w = worldOf([ship(1, 0, [0, 0, 0], 'cruiser')]);
    const b = makeBattle();
    const s = swarmOf(b, { side: 0, role: 'attack', carrier: 1, size: 16 });
    run(b, w, 0.5);
    const out = s.flying;
    w.ships.get(1)!.alive = false;
    run(b, w, 0.5);
    expect(s.inBay).toBe(0);
    expect(s.flying).toBe(out);
    expect(s.stats.lost).toBe(16 - out);
  });
});

describe('explosive drones: a pack that strikes together', () => {
  it('stalks on a ring, then every drone hits an undefended cruiser within a second of the others', () => {
    const target = ship(2, 1, [200 * L, 0, 0], 'cruiser');
    const w = worldOf([ship(1, 0, [0, 0, 0], 'capital'), target]);
    const b = makeBattle();
    const s = swarmOf(b, { side: 0, role: 'explosive', carrier: 1, size: 16, order: { kind: 'attack', target: 2 } });
    const blastT: number[] = [];
    let stalked = false;
    const hp = run(b, w, 12, new Map([[2, 10_000]]), (t) => { if (s.phase === 'stalk') stalked = true; for (let k = 0; k < b.events.blasts.length; k++) blastT.push(t); });
    expect(stalked).toBe(true);
    expect(s.stats.spent).toBe(16);
    expect(blastT.length).toBe(16);
    expect(Math.max(...blastT) - Math.min(...blastT)).toBeLessThan(1);
    expect(10_000 - hp.get(2)!).toBeGreaterThan(16 * ROLES.explosive.damage * 0.9);
    console.log(`pack: 16 blasts in ${(Math.max(...blastT) - Math.min(...blastT)).toFixed(2)} s, ${(10_000 - hp.get(2)!).toFixed(0)} damage`);
  });

  it('point defence and flak thin the pack: losses before contact, and fewer hits land', () => {
    const outcome = (armed: boolean, pack = true, dt = DT, carrierVel: V3 = [0, 0, 0]) => {
      const w = worldOf([ship(1, 0, [0, 0, 0], 'capital', false, carrierVel), ship(2, 1, [250 * L, 0, 0], 'capital', armed)]);
      const b = makeBattle(5);
      const s = swarmOf(b, { side: 0, role: 'explosive', carrier: 1, size: 48, order: { kind: 'attack', target: 2 }, seed: 9 });
      s.pack = pack;
      const hp = run(b, w, 15, new Map([[2, 10_000]]), undefined, dt);
      return { spent: s.stats.spent, lost: s.stats.lost, dmg: 10_000 - hp.get(2)!, pd: b.stats.pdKills, flak: b.stats.flakKills, bursts: b.stats.flakBursts, shots: b.stats.pdShots };
    };
    const open = outcome(false);
    const def = outcome(true);
    const stream = outcome(true, false);
    console.log(`48 explosive drones vs a capital ship: undefended ${open.spent} hit, ${open.dmg.toFixed(0)} damage; ` +
      `with 4 PD + 2 flak, as a pack ${def.spent} hit, ${def.lost} shot down (PD ${def.pd} of ${def.shots} shots, flak ${def.flak} in ${def.bursts} bursts), ${def.dmg.toFixed(0)} damage; ` +
      `streaming in ${stream.spent} hit, ${stream.lost} shot down (PD ${stream.pd}, flak ${stream.flak}), ${stream.dmg.toFixed(0)} damage`);
    expect(open.lost).toBe(0);
    expect(def.lost).toBeGreaterThan(5);
    expect(stream.lost).toBeGreaterThan(def.lost * 2); // the pack's encirclement is what gets it through
    // The game steps at 30 frames a second, where a diving drone covers more than a hull's radius a frame.
    const coarse = outcome(true, true, 1 / 30);
    console.log(`at 30 fps: ${coarse.spent} hit, ${coarse.lost} shot down`);
    expect(coarse.spent).toBeGreaterThan(def.spent * 0.7);
    // Launched from a carrier flying across at 150 L/s, the last drones trail in hundreds of lengths behind.
    const strung = outcome(true, true, 1 / 30, [0, 0, 150 * L]);
    console.log(`from a carrier crossing at 150 L/s: ${strung.spent} hit, ${strung.lost} shot down`);
    expect(strung.spent).toBeGreaterThan(def.spent * 0.5);
    expect(def.pd + def.flak).toBe(def.lost);
    expect(def.spent).toBeGreaterThan(5); // the pack still gets through
    expect(def.dmg).toBeLessThan(open.dmg * 0.85);
  });
});

describe('shield drones: a bubble or a wall', () => {
  /** Shots from `from` directions at the ward's centre; the share a shield drone stops. */
  const blocked = (b: Battle, ward: V3, dirs: V3[]) => dirs.filter((d) => shieldBlock(b, add(ward, scale(d, 60 * L)), ward, 1, L) !== null).length / dirs.length;
  const dirsAll = Array.from({ length: 300 }, (_, k) => sphereSlot(k, 300));

  it('16 drones close a bubble round a cruiser and stop most shots from any side', () => {
    const ward: V3 = [0, 0, 0];
    const w = worldOf([ship(1, 0, ward, 'cruiser'), ship(9, 1, [400 * L, 0, 0], 'cruiser')]);
    const b = makeBattle();
    const s = swarmOf(b, { side: 0, role: 'shield', carrier: 1, size: 16, order: { kind: 'defend', ward: 1 } });
    run(b, w, 4);
    expect(s.mode).toBe('bubble');
    const share = blocked(b, ward, dirsAll);
    console.log(`bubble of 16 round a cruiser: ${(share * 100).toFixed(0)}% of shots from all round stopped`);
    expect(share).toBeGreaterThan(0.8);
  });

  it('when members die the rest reform: too few for a bubble, they stand as a wall toward the threat', () => {
    const ward: V3 = [0, 0, 0];
    const w = worldOf([ship(1, 0, ward, 'cruiser'), ship(9, 1, [400 * L, 0, 0], 'cruiser')]);
    const b = makeBattle();
    const s = swarmOf(b, { side: 0, role: 'shield', carrier: 1, size: 16, order: { kind: 'defend', ward: 1 } });
    run(b, w, 4);
    for (let i = 0; i < 10; i++) killMember(s, i);
    const before = blocked(b, ward, [[1, 0, 0], [0.97, 0.2, 0], [0.97, -0.2, 0], [0.97, 0, 0.2], [0.97, 0, -0.2]]);
    run(b, w, 2);
    expect(s.flying).toBe(6);
    expect(s.mode).toBe('wall');
    const cone = dirsAll.filter((d) => d[0] > 0.95);
    const back = dirsAll.filter((d) => d[0] < -0.5);
    const front = blocked(b, ward, cone);
    console.log(`6 left: wall toward the threat stops ${(front * 100).toFixed(0)}% of shots from it (${(before * 100).toFixed(0)}% before reforming), ${(blocked(b, ward, back) * 100).toFixed(0)}% from behind`);
    expect(front).toBeGreaterThan(0.85);
    expect(blocked(b, ward, back)).toBeLessThan(0.2);
  });

  it('a bubble rides along with a fast ward', () => {
    const w = worldOf([ship(1, 0, [0, 0, 0], 'cruiser', false, [400 * L, 0, 0])]);
    const b = makeBattle();
    const s = swarmOf(b, { side: 0, role: 'shield', carrier: 1, size: 16, order: { kind: 'defend', ward: 1 } });
    run(b, w, 6);
    const c = w.ships.get(1)!.pos;
    expect(dist(s.centroid, c) / L).toBeLessThan(1);
  });

  it('a shield bubble soaks explosive drones before they reach the hull', () => {
    const w = worldOf([ship(1, 0, [0, 0, 0], 'capital'), ship(2, 1, [200 * L, 0, 0], 'cruiser')]);
    const b = makeBattle(2);
    const pack = swarmOf(b, { side: 0, role: 'explosive', carrier: 1, size: 16, order: { kind: 'attack', target: 2 } });
    const shield = swarmOf(b, { side: 1, role: 'shield', carrier: 2, size: 16, order: { kind: 'defend', ward: 2 } });
    const hp = run(b, w, 12, new Map([[2, 10_000]]));
    console.log(`16 explosive vs a cruiser in a 16-drone bubble: ${b.stats.soaked} soaked, ${shield.stats.lost} shield drones lost, ${(10_000 - hp.get(2)!).toFixed(0)} damage to the hull`);
    expect(pack.stats.spent).toBe(16);
    expect(b.stats.soaked).toBeGreaterThan(8);
    expect(10_000 - hp.get(2)!).toBeLessThan(16 * ROLES.explosive.damage * 0.5);
  });
});

describe('laser-focus drones: every beam on one point', () => {
  it('ring up out of point defence range and converge every beam on one point', () => {
    const w = worldOf([ship(1, 0, [0, 0, 0], 'capital'), ship(2, 1, [300 * L, 0, 0], 'capital', true)]);
    const b = makeBattle();
    const s = swarmOf(b, { side: 0, role: 'attack', carrier: 1, size: 16, order: { kind: 'attack', target: 2 } });
    let firstBeam = -1;
    run(b, w, 10, new Map([[2, 1e6]]), (t) => { if (firstBeam < 0 && b.events.beams.length) firstBeam = t; });
    const hp = run(b, w, 5, new Map([[2, 1e6]]));
    expect(firstBeam).toBeGreaterThan(0);
    expect(s.phase).toBe('focus');
    const ends = b.events.beams.length / 6;
    expect(ends).toBe(16);
    let spread = 0;
    for (let k = 0; k < ends; k++) spread = Math.max(spread, dist([b.events.beams[k * 6 + 3], b.events.beams[k * 6 + 4], b.events.beams[k * 6 + 5]], s.aim!));
    expect(spread).toBeLessThan(1e-9);
    const dps = (1e6 - hp.get(2)!) / 5;
    console.log(`16 laser drones: first beam at ${firstBeam.toFixed(1)} s, ${dps.toFixed(0)} dps on one point (single drone ${ROLES.attack.damage.toFixed(1)}), lost ${s.stats.lost} to point defence`);
    expect(dps).toBeCloseTo(focusDps(16), 0);
    expect(s.stats.lost).toBe(0); // the ring stands off outside point defence and flak range
  });

  it('focused beams burn harder than the same beams spread', () => {
    expect(focusDps(FOCUS_FULL)).toBeCloseTo(FOCUS_FULL * ROLES.attack.damage * 1.5);
    expect(focusDps(1)).toBe(ROLES.attack.damage);
  });

  it("a shield bubble takes the beams meant for its ward", () => {
    const w = worldOf([ship(1, 0, [0, 0, 0], 'capital'), ship(2, 1, [300 * L, 0, 0], 'cruiser')]);
    const b = makeBattle();
    swarmOf(b, { side: 0, role: 'attack', carrier: 1, size: 16, order: { kind: 'attack', target: 2 } });
    const sh = swarmOf(b, { side: 1, role: 'shield', carrier: 2, size: 16, order: { kind: 'defend', ward: 2 } });
    const hp = run(b, w, 15, new Map([[2, 1e6]]));
    console.log(`16 laser drones vs a cruiser in a bubble: ${b.stats.soaked} beam-steps soaked, ${sh.stats.lost} shield drones burnt, ${(1e6 - hp.get(2)!).toFixed(0)} damage got through`);
    expect(sh.stats.lost).toBeGreaterThan(0);
    expect(b.stats.soaked).toBeGreaterThan(100);
  });
});

describe('slots', () => {
  it('a bubble only when the fields can cover the sphere', () => {
    const r = bodyRadius('cruiser', L);
    expect(shieldSlots(16, [0, 0, 0], r, [1, 0, 0], L).mode).toBe('bubble');
    expect(shieldSlots(6, [0, 0, 0], r, [1, 0, 0], L).mode).toBe('wall');
    expect(shieldSlots(16, [0, 0, 0], bodyRadius('capital', L), [1, 0, 0], L).mode).toBe('wall');
    const wall = shieldSlots(6, [0, 0, 0], r, [1, 0, 0], L).slots;
    for (const p of wall) expect(p[0]).toBeGreaterThan(0);
  });
});

// PKG-23: the wall-clock bar runs in `npm run bench` (ASCENT_BENCH=1), not in the suite, where a loaded machine failed it.
const BENCH = !!(globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.ASCENT_BENCH;

/** Twelve swarms of 48 launched, then 120 steps timed. Returns the drones flying and the mean ms a step. */
function droneLoad(): { n: number; ms: number } {
  const ships: ShipRef[] = [];
  for (let k = 0; k < 6; k++) ships.push(ship(10 + k, 0, [k * 60 * L, 0, 0], 'capital'), ship(20 + k, 1, [k * 60 * L, 0, 350 * L], 'capital'));
  const w = worldOf(ships);
  const b = makeBattle();
  const roles = ['explosive', 'attack', 'shield'] as const;
  for (let k = 0; k < 6; k++) for (const side of [0, 1] as const) {
    const me = (side ? 20 : 10) + k;
    const foe = (side ? 10 : 20) + k;
    const role = roles[(k + side) % 3];
    // Shields guard their carriers, lasers burn the carrier opposite (through its shield), explosives escort.
    swarmOf(b, { side, role, carrier: me, size: 48, order: role === 'attack' ? { kind: 'attack', target: foe } : { kind: 'defend', ward: me } });
  }
  run(b, w, 5.5); // launch
  const n = b.swarms.reduce((a, s) => a + s.flying, 0);
  const t0 = performance.now();
  const steps = 120;
  run(b, w, steps * DT, new Map(ships.map((s) => [s.id, 1e9])));
  return { n, ms: (performance.now() - t0) / steps };
}

describe('performance', { timeout: 60_000 }, () => {
  it('hundreds of drones fly in a full battle (the step-time bar is in npm run bench)', () => {
    expect(droneLoad().n).toBeGreaterThanOrEqual(500);
  });
  it.runIf(BENCH)('bench: hundreds of drones in a full battle step in a few milliseconds', () => {
    const { n, ms } = droneLoad();
    console.log(`${n} drones flying in 12 swarms: ${ms.toFixed(2)} ms a step (pure maths, no drawing)`);
    expect(n).toBeGreaterThanOrEqual(500);
    expect(ms).toBeLessThan(8);
  });
});

describe('states', () => {
  it('members start in the bay', () => {
    const s = makeSwarm({ side: 0, role: 'shield', carrier: 1, size: 4 });
    expect([...s.state]).toEqual([BAY, BAY, BAY, BAY]);
    expect(FLYING).not.toBe(BAY);
    expect(memberPos(s, 0)).toEqual([0, 0, 0]);
  });
});
