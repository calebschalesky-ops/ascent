import { describe, expect, it } from 'vitest';
import type { V3 } from '../nav';
import { dist } from '../nav';
import { SHIP_SPECS } from '../shipTypes';
import type { ShipType } from '../shipTypes';
import { stepFleet, think } from './brain';
import { canCommand, canField, pointsOf, rankById, rankFor, RANKS } from './command';
import { formationGap, nearestSpacing, slotOffset, slotWorld } from './formation';
import { activeMembers, makeWing, postOf, setOrder } from './orders';
import { COMBAT, STANCES } from './spec';
import { avoidBodies, fly } from './steer';
import { chooseTarget } from './targeting';
import type { Agent, FleetWorld, Side } from './types';
import { newStats } from './types';

const L = 0.371;
let ids = 100;
function agent(type: ShipType, side: Side, pos: V3, driven = true, fwd: V3 = [0, 0, -1]): Agent {
  const hp = SHIP_SPECS[type].hp;
  return { id: ids++, side, type, pos, vel: [0, 0, 0], fwd, speed: 0, hp, maxHp: hp, radius: SHIP_SPECS[type].hitRadius * L, alive: true, driven, wing: null, target: null, cooldown: 0, hitBy: null, hitAt: -99, docked: false };
}
function world(agents: Agent[], bodies: FleetWorld['bodies'] = []): FleetWorld {
  return { time: 0, L, agents: new Map(agents.map((a) => [a.id, a])), wings: [], bolts: [], bodies, stats: newStats() };
}
const run = (w: FleetWorld, seconds: number, until?: () => boolean) => {
  for (let i = 0; i < seconds * 30; i++) { stepFleet(w, 1 / 30); if (until?.()) return (i + 1) / 30; }
  return seconds;
};

describe('formations', () => {
  it('spaces slots by the formation gap and keeps them outside the leader', () => {
    const gap = formationGap('wedge', ['fighter', 'fighter'], L);
    expect(gap).toBeCloseTo(3 * L); // fighters are smaller than 1 L, so the floor of 1 L applies
    expect(formationGap('wedge', ['cruiser', 'capital'], L)).toBeCloseTo(3 * 5 * L);
    const clear = 3 * L * 5 * 1.2;
    for (const f of ['wedge', 'line', 'column', 'screen'] as const) {
      for (let k = 0; k < 6; k++) {
        const o = slotOffset(f, k, 6, gap, clear);
        expect(Math.hypot(...o)).toBeGreaterThan(clear * 0.9);
      }
    }
  });
  it('line abreast stands wider than a wedge, and no two slots touch', () => {
    const pts = (f: 'wedge' | 'line') => {
      const gap = formationGap(f, ['fighter'], L);
      return [[0, 0, 0] as V3, ...Array.from({ length: 6 }, (_, k) => slotWorld([0, 0, 0], [0, 0, -1], slotOffset(f, k, 6, gap)))];
    };
    const width = (ps: V3[]) => Math.max(...ps.map((p) => p[0])) - Math.min(...ps.map((p) => p[0]));
    expect(width(pts('line'))).toBeGreaterThan(width(pts('wedge')));
    expect(nearestSpacing(pts('line'))).toBeGreaterThan(L);
    expect(nearestSpacing(pts('wedge'))).toBeGreaterThan(L);
  });
  it('places slots behind a leader that faces any way', () => {
    const p = slotWorld([10, 0, 0], [1, 0, 0], [0, 0, 2]); // facing +x, 2 behind
    expect(p[0]).toBeCloseTo(8);
  });
});

describe('target choice', () => {
  it('focus fire: an attack order names the target, whatever is nearer', () => {
    const me = agent('fighter', 0, [0, 0, 0]);
    const near = agent('fighter', 1, [2, 0, 0], false);
    const cap = agent('capital', 1, [40, 0, 0], false);
    const w = world([me, near, cap]);
    const wing = makeWing('A', 0, [me.id], { kind: 'attack', target: cap.id });
    expect(chooseTarget(me, wing, w, null)).toBe(cap.id);
    cap.alive = false;
    expect(chooseTarget(me, wing, w, null)).toBe(near.id); // named target gone: the stance picks
  });
  it('hold fire picks nothing for itself; aggressive reaches further than defensive', () => {
    const me = agent('cruiser', 0, [0, 0, 0]);
    const far = agent('cruiser', 1, [COMBAT.cruiser.range * L * 1.5, 0, 0], false);
    const w = world([me, far]);
    const wing = makeWing('A', 0, [me.id], { kind: 'hold', at: [0, 0, 0], facing: [0, 0, -1] }, 'wedge', 'holdFire');
    expect(chooseTarget(me, wing, w, null)).toBeNull();
    wing.stance = 'defensive';
    expect(chooseTarget(me, wing, w, null)).toBeNull();
    wing.stance = 'aggressive';
    expect(chooseTarget(me, wing, w, null)).toBe(far.id);
  });
  it('fighters prefer fighters; capital ships prefer the big ships', () => {
    const f = agent('fighter', 0, [0, 0, 0]);
    const c = agent('capital', 0, [0, 0, 0]);
    const ef = agent('fighter', 1, [10, 0, 0], false);
    const ec = agent('capital', 1, [0, 0, 11], false);
    const w = world([f, c, ef, ec]);
    const wing = makeWing('A', 0, [f.id, c.id], { kind: 'hold', at: [0, 0, 0], facing: [0, 0, -1] }, 'wedge', 'aggressive');
    expect(chooseTarget(f, wing, w, null)).toBe(ef.id);
    expect(chooseTarget(c, wing, w, null)).toBe(ec.id);
  });
  it('an escort goes after whoever hit its ward', () => {
    const ward = agent('capital', 0, [0, 0, 0], false);
    const me = agent('fighter', 0, [0, 0, 3]);
    const raider = agent('fighter', 1, [30, 0, 0], false);
    const idle = agent('fighter', 1, [0, 0, 12], false);
    const w = world([ward, me, raider, idle]);
    w.time = 10;
    ward.hitBy = raider.id;
    ward.hitAt = 9;
    const wing = makeWing('A', 0, [me.id], { kind: 'defend', ward: ward.id }, 'screen', 'defensive');
    expect(chooseTarget(me, wing, w, null)).toBe(raider.id);
  });
  it('keeps its target unless another is clearly better', () => {
    const me = agent('fighter', 0, [0, 0, 0]);
    const a = agent('fighter', 1, [10, 0, 0], false);
    const b = agent('fighter', 1, [9, 0, 0], false);
    const w = world([me, a, b]);
    const wing = makeWing('A', 0, [me.id], { kind: 'hold', at: [0, 0, 0], facing: [0, 0, -1] }, 'wedge', 'aggressive');
    me.target = a.id;
    expect(chooseTarget(me, wing, w, null)).toBe(a.id);
    b.pos = [3, 0, 0];
    expect(chooseTarget(me, wing, w, null)).toBe(b.id);
  });
});

describe('steering', () => {
  it('never flies into a planet it is pointed at', () => {
    const body = { pos: [0, 0, -20] as V3, size: 2 };
    for (const type of ['fighter', 'cruiser', 'capital'] as const) {
      const a = agent(type, 0, [0.3, 0, 0]);
      let closest = Infinity;
      for (let i = 0; i < 30 * 30; i++) {
        const want = avoidBodies(a.pos, [0, 0, -1], [body], Math.max(a.speed * 2, L * 4), a.radius + L);
        fly(a, want, COMBAT[type].speed * L, L, 1 / 30, [body]);
        closest = Math.min(closest, dist(a.pos, body.pos));
      }
      expect(closest).toBeGreaterThan(body.size + a.radius);
    }
  });
  it('turns no faster than its type allows', () => {
    const a = agent('capital', 0, [0, 0, 0]);
    fly(a, [0, 0, 1], 1, L, 1, []); // asked to turn round in one second
    const turned = Math.acos(-a.fwd[2]);
    expect(turned).toBeCloseTo(COMBAT.capital.turn, 3);
  });
});

describe('orders, carried out', () => {
  it('follow: a wing forms up on its leader', () => {
    const lead = agent('capital', 0, [0, 0, 0], false);
    const fs = [0, 1, 2, 3].map((k) => agent('fighter', 0, [k * 3 - 6, 2, 8]));
    const w = world([lead, ...fs]);
    const wing = makeWing('A', 0, fs.map((f) => f.id), { kind: 'follow', leader: lead.id }, 'wedge', 'defensive');
    w.wings.push(wing);
    run(w, 12);
    for (const f of fs) expect(dist(f.pos, postOf(f, wing, w)!.pos)).toBeLessThan(L);
  });

  it('attack: two cruisers and six fighters destroy a capital ship', () => {
    const cap = agent('capital', 1, [0, 0, -40], false);
    const ms = [agent('cruiser', 0, [-2, 0, 0]), agent('cruiser', 0, [2, 0, 0]), ...[0, 1, 2, 3, 4, 5].map((k) => agent('fighter', 0, [k - 3, 1, 1]))];
    const w = world([cap, ...ms]);
    w.wings.push(makeWing('All', 0, ms.map((m) => m.id), { kind: 'attack', target: cap.id }, 'wedge', 'aggressive'));
    const t = run(w, 60, () => !cap.alive);
    expect(cap.alive).toBe(false);
    expect(t).toBeLessThan(40);
  });

  it('defend: escorts engage the raider attacking their ward, and kill it', () => {
    const ward = agent('capital', 0, [0, 0, 0], false);
    const esc = [agent('fighter', 0, [3, 0, 0]), agent('fighter', 0, [-3, 0, 0]), agent('cruiser', 0, [0, 0, 4])];
    const raider = agent('cruiser', 1, [0, 0, -30]);
    const w = world([ward, ...esc, raider]);
    w.wings.push(makeWing('Escort', 0, esc.map((e) => e.id), { kind: 'defend', ward: ward.id }, 'screen', 'defensive'));
    w.wings.push(makeWing('Raid', 1, [raider.id], { kind: 'attack', target: ward.id }, 'wedge', 'aggressive'));
    run(w, 60, () => !raider.alive);
    expect(raider.alive).toBe(false);
    expect(ward.hp).toBeGreaterThan(0);
  });

  it('hold fire: a wing under fire shoots nothing; defensive shoots back', () => {
    const me = agent('cruiser', 0, [0, 0, 0]);
    const foe = agent('cruiser', 1, [0, 0, -20], false);
    const w = world([me, foe]);
    const wing = makeWing('A', 0, [me.id], { kind: 'hold', at: [0, 0, 0], facing: [0, 0, -1] }, 'wedge', 'holdFire');
    w.wings.push(wing);
    run(w, 5);
    expect(w.stats.shots).toBe(0);
    wing.stance = 'defensive';
    run(w, 5);
    expect(w.stats.shots).toBeGreaterThan(0);
  });

  it('path: a wing flies every waypoint in order, in formation, then holds at the last', () => {
    const fs = [0, 1, 2].map((k) => agent('fighter', 0, [k, 0, 0]));
    const w = world(fs);
    const wing = makeWing('A', 0, fs.map((f) => f.id), { kind: 'hold', at: [0, 0, 0], facing: [0, 0, -1] }, 'column', 'holdFire');
    w.wings.push(wing);
    const pts: V3[] = [[0, 0, -15], [15, 0, -15], [15, 0, 0]];
    setOrder(wing, { kind: 'path', points: pts.map((p) => [...p] as V3), loop: false, next: 0 }, w);
    const passed = pts.map(() => Infinity);
    for (let i = 0; i < 40 * 30; i++) {
      stepFleet(w, 1 / 30);
      pts.forEach((p, j) => { passed[j] = Math.min(passed[j], dist(fs[0].pos, p)); });
    }
    for (const d of passed) expect(d).toBeLessThan(2 * L); // the first ship flies the anchor, over every point
    expect(wing.order.kind).toBe('hold');
  });

  it('a path round a planet stays clear of it', () => {
    const body = { pos: [0, 0, -12] as V3, size: 3 };
    const fs = [0, 1].map((k) => agent('cruiser', 0, [k, 0, 0]));
    const w = world(fs, [body]);
    const wing = makeWing('A', 0, fs.map((f) => f.id), { kind: 'hold', at: [0, 0, 0], facing: [0, 0, -1] }, 'line', 'holdFire');
    w.wings.push(wing);
    setOrder(wing, { kind: 'path', points: [[0, 0, -24]], loop: false, next: 0 }, w); // straight through it
    let closest = Infinity;
    for (let i = 0; i < 30 * 30; i++) { stepFleet(w, 1 / 30); for (const f of fs) closest = Math.min(closest, dist(f.pos, body.pos) - f.radius); }
    expect(closest).toBeGreaterThan(body.size);
  });

  it('recall: fighters fly home and dock', () => {
    const carrier = agent('capital', 0, [0, 0, 0], false);
    const fs = [agent('fighter', 0, [20, 0, 0]), agent('fighter', 0, [-20, 3, 5])];
    const w = world([carrier, ...fs]);
    const wing = makeWing('A', 0, fs.map((f) => f.id), { kind: 'recall', carrier: carrier.id });
    w.wings.push(wing);
    run(w, 20, () => fs.every((f) => f.docked));
    expect(fs.every((f) => f.docked)).toBe(true);
    expect(activeMembers(wing, w)).toHaveLength(0);
  });

  it('stance changes how far a wing will go to fight', () => {
    const me = agent('fighter', 0, [0, 0, 0]);
    const foe = agent('fighter', 1, [COMBAT.fighter.range * L * 1.6, 0, 0], false);
    const w = world([me, foe]);
    const wing = makeWing('A', 0, [me.id], { kind: 'hold', at: [0, 0, 0], facing: [0, 0, -1] }, 'wedge', 'defensive');
    w.wings.push(wing);
    expect(think(me, wing, w).mode).toBe('post');
    wing.stance = 'aggressive';
    expect(think(me, wing, w).mode).toBe('engage');
    expect(STANCES.aggressive.engage).toBeGreaterThan(STANCES.defensive.engage);
  });
});

describe('ranks and the fleet cap', () => {
  it("climbs from a cruiser to a capital ship to an armada, on progression's levels", () => {
    expect(rankFor(1).hull).toBe('cruiser');
    expect(rankFor(2).id).toBe('flightLead');
    expect(rankFor(9).id).toBe('squadron');
    expect(rankFor(10).hull).toBe('cruiser'); // the level alone is not enough: the mission hands you the ship
    expect(rankFor(10, { command: true }).id).toBe('captain');
    expect(rankFor(10, { command: true, capitals: 2 }).id).toBe('commodore');
    expect(rankFor(10, { command: true, capitals: 2, shipyard: true }).id).toBe('admiral');
    expect(canCommand(9)).toBe(false);
    expect(canCommand(10)).toBe(true);
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].cap).toBeGreaterThanOrEqual(RANKS[i - 1].cap);
  });
  it("a captain's bay fits the captain's cap exactly", () => {
    const cap = rankById('captain');
    expect(pointsOf(cap.bay)).toBe(cap.cap);
    expect(canField(cap, cap.bay, 'fighter')).toBe(false);
    expect(canField(cap, { cruiser: 2, fighter: 7 }, 'fighter')).toBe(true);
  });
});

describe('destroyers (claude/destroyer-a8ff7d)', () => {
  it('fly faster and turn quicker than cruisers and capital ships, and out-gun the cruiser', () => {
    const dps = (t: ShipType) => COMBAT[t].guns * COMBAT[t].rate * COMBAT[t].damage;
    for (const t of ['cruiser', 'capital'] as const) {
      expect(COMBAT.destroyer.speed).toBeGreaterThan(COMBAT[t].speed);
      expect(COMBAT.destroyer.turn).toBeGreaterThan(COMBAT[t].turn);
    }
    expect(dps('destroyer')).toBeGreaterThan(dps('cruiser'));
    expect(dps('destroyer')).toBeLessThan(dps('capital'));
  });
  it('take orders: an attack order sends a destroyer wing after the named ship, and it kills it', () => {
    const foe = agent('cruiser', 1, [0, 0, -60]);
    const decoy = agent('fighter', 1, [4, 0, -8], false);
    const ds = [agent('destroyer', 0, [-3, 0, 0]), agent('destroyer', 0, [3, 0, 0])];
    const w = world([foe, decoy, ...ds]);
    w.wings.push(makeWing('Destroyers', 0, ds.map((d) => d.id), { kind: 'attack', target: foe.id }, 'line', 'aggressive'));
    const t = run(w, 60, () => !foe.alive);
    expect(foe.alive).toBe(false);
    expect(ds.every((d) => d.target === foe.id || !foe.alive)).toBe(true);
    expect(t).toBeLessThan(30);
  });
  it('one destroyer beats one cruiser in the fleet brains, flying rings round it', () => {
    let wins = 0;
    for (let k = 0; k < 6; k++) {
      const cru = agent('cruiser', 1, [k * 3, 0, -50], true, [0, 0, 1]);
      const des = agent('destroyer', 0, [0, 0, 0]);
      const w = world([cru, des]);
      w.wings.push(makeWing('D', 0, [des.id], { kind: 'attack', target: cru.id }, 'line', 'aggressive'));
      w.wings.push(makeWing('C', 1, [cru.id], { kind: 'attack', target: des.id }, 'line', 'aggressive'));
      run(w, 90, () => !cru.alive || !des.alive);
      if (!cru.alive && des.alive) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(5);
  });
  it('a Commander flies a destroyer with a two-fighter bay; it needs the ship, not only the level', () => {
    expect(rankFor(9).id).toBe('squadron');
    const c = rankFor(9, { destroyer: true });
    expect(c.id).toBe('commander');
    expect(c.hull).toBe('destroyer');
    expect(c.bay.fighter).toBeLessThan(rankById('squadron').bay.fighter); // a cruiser carries more small craft
    expect(canField(c, { fighter: 2 }, 'destroyer')).toBe(false);
    expect(pointsOf({ destroyer: 1 })).toBeGreaterThan(pointsOf({ cruiser: 1 }));
    expect(pointsOf({ destroyer: 1 })).toBeLessThan(pointsOf({ capital: 1 }));
  });
});
