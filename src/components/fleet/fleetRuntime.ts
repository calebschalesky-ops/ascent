/**
 * Fleet command in the scene: the player's flagship and bay, the wings it launches, and the brains (lib/fleet) that
 * fly them. combat.ts owns the ships' models, hit points and explosions; this file mirrors every combat ship into
 * the brains' world each frame, steps the brains, copies the driven ships back, draws the fleet's bolts and hands
 * their hits to combat's damage.
 */
import * as THREE from 'three';
import type { DestGeo, V3 } from '../../lib/nav';
import { add, dist, len, scale, sub, unit } from '../../lib/nav';
import { PLAYER_NATION } from '../../lib/nations';
import type { NationId } from '../../lib/nations';
import type { ShipType } from '../../lib/shipTypes';
import { SHIP_TYPES } from '../../lib/shipTypes';
import { stepFleet } from '../../lib/fleet/brain';
import type { Rank, RankId } from '../../lib/fleet/command';
import { canCommand, canField, rankById, rankFor } from '../../lib/fleet/command';
import { formationGap, nearestSpacing, slotOffset, slotWorld } from '../../lib/fleet/formation';
import { activeMembers, makeWing, postOf, setOrder } from '../../lib/fleet/orders';
import { COMBAT, FORMATIONS, FORMATION_ORDER, ORDER_LABEL, STANCES, STANCE_ORDER } from '../../lib/fleet/spec';
import type { Agent, FleetWorld, FormationId, Order, Stance, Wing } from '../../lib/fleet/types';
import { newStats } from '../../lib/fleet/types';
import type { Combat, Craft } from '../combat';

/** What a ship has left: hull plus every shield facet (arsenal's defences), on maxHp's scale. */
const hpOf = (c: Craft) => c.def.hull + c.def.shield.reduce((a, x) => a + x, 0);

export interface FleetShipSnap { id: number; type: ShipType; side: 0 | 1; pos: V3; fwd: V3; hp: number; maxHp: number; wing: number | null; nation: NationId; flagship: boolean }
export interface WingSnap {
  id: number; name: string; side: 0 | 1; order: Order; orderText: string; formation: FormationId; stance: Stance;
  ships: number[]; post: (V3 | null)[]; spacing: number | null; engage: number; anchor: V3 | null;
}
export interface FleetSnap {
  rank: Rank; level: number; hull: ShipType; flagship: FleetShipSnap | null; bay: Record<ShipType, number>; ships: FleetShipSnap[];
  wings: WingSnap[]; selected: number | 'all'; stats: FleetWorld['stats']; lastOrder: string | null; time: number;
}

const MAX_BOLTS = 600;
/** Wing stations on the flagship, [right, up, back] in its hit radii, in launch order. */
const STATIONS: V3[] = [[0, 0, 0.5], [1.6, 1, 1.2], [-1.6, 1, 1.2], [0, -1.2, 2], [0, 1.8, 2.4], [2.6, 0, 0], [-2.6, 0, 0], [0, 0, 4]];

/** `level` is the pilot's level from progression; a capital ship needs Captain's (see lib/fleet/command.ts). */
export function createFleetCommand(scene: THREE.Scene, combat: Combat, geo: () => DestGeo[], level: () => number = () => 1) {
  const L = combat.playerLength;
  const world: FleetWorld = { time: 0, L, agents: new Map(), wings: [], bolts: [], bodies: [], stats: newStats() };
  let rank: Rank = rankById('pilot');
  let flagship: Craft | null = null;
  const bay: Record<ShipType, number> = { capital: 0, cruiser: 0, fighter: 0, destroyer: 0 };
  let selected: number | 'all' = 'all';
  let lastOrder: string | null = null;
  const prevPos = new Map<number, V3>();

  // ---- Bolts: one instanced mesh, the player's side cyan and the other red ----
  const boltGeo = new THREE.BoxGeometry(0.04, 0.04, 1.1);
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const boltMesh = new THREE.InstancedMesh(boltGeo, boltMat, MAX_BOLTS);
  boltMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  boltMesh.frustumCulled = false;
  boltMesh.count = 0;
  scene.add(boltMesh);
  const ours = new THREE.Color(0.4, 2.2, 3);
  const theirs = new THREE.Color(3, 0.6, 0.35);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const one = new THREE.Vector3(1, 1, 1);

  const sideOf = (c: Craft): 0 | 1 => (c.hostile ? 1 : 0);
  const craftOf = (id: number) => combat.crafts.find((c) => c.id === id);

  /** Mirror every combat ship into the brains' world. Driven ships keep their brain state; others are copied. */
  function sync(dt: number) {
    const seen = new Set<number>();
    for (const c of combat.crafts) {
      seen.add(c.id);
      let a = world.agents.get(c.id);
      if (!a) {
        a = { id: c.id, side: sideOf(c), type: c.type, pos: [...c.pos], vel: [0, 0, 0], fwd: c.fwd ?? [0, 0, -1], speed: 0, hp: hpOf(c), maxHp: c.maxHp, radius: c.radius, alive: c.alive, driven: false, wing: null, target: null, cooldown: 0, hitBy: null, hitAt: -99, docked: false };
        world.agents.set(c.id, a);
      }
      a.hp = hpOf(c);
      a.alive = c.alive;
      if (!a.driven) {
        const prev = prevPos.get(c.id);
        if (prev && dt > 0) {
          a.vel = scale(sub(c.pos, prev), 1 / dt);
          a.speed = len(a.vel);
          if (a.speed > 1e-4 && c !== flagship) a.fwd = unit(a.vel);
        }
        a.pos = [...c.pos];
        if (c === flagship && c.fwd) a.fwd = c.fwd;
      }
      prevPos.set(c.id, [...c.pos]);
    }
    for (const id of [...world.agents.keys()]) if (!seen.has(id)) { world.agents.delete(id); prevPos.delete(id); }
    world.bodies = geo().filter((g) => g.size > 0).map((g) => ({ pos: g.pos, size: g.size }));
  }

  const wingName = (type: ShipType, k: number) => (type === 'cruiser' ? 'Cruisers' : type === 'capital' ? 'Capitals' : type === 'destroyer' ? 'Destroyers' : ['Alpha', 'Beta', 'Gamma', 'Delta'][k] ?? `Wing ${k + 1}`);
  const ourWings = () => world.wings.filter((w) => w.side === 0 && !w.own);
  const flying = () => {
    const f: Record<ShipType, number> = { capital: 0, cruiser: 0, fighter: 0, destroyer: 0 };
    for (const w of ourWings()) for (const a of activeMembers(w, world)) f[a.type]++;
    return f;
  };

  /** The wing a newly launched ship joins: its type's newest wing with room (four fighters, or four cruisers). */
  function wingFor(type: ShipType): Wing {
    const mine = ourWings().filter((w) => w.members.some((id) => world.agents.get(id)?.type === type) || w.name === wingName(type, 0));
    const open = mine.find((w) => w.members.length < 4 && w.members.every((id) => world.agents.get(id)?.type === type));
    if (open) return open;
    const k = mine.length;
    const w = makeWing(wingName(type, k), 0, [], { kind: 'follow', leader: flagship!.id }, type === 'cruiser' || type === 'destroyer' ? 'line' : 'wedge', 'defensive');
    // Each wing keeps its own station on the flagship: cruisers abreast of it, fighter wings above and to either side.
    const n = ourWings().length;
    w.station = STATIONS[n % STATIONS.length];
    world.wings.push(w);
    return w;
  }

  /** Put one ship of `type` out of the bay, below and behind the flagship, moving with it. */
  function launchOne(type: ShipType): Agent | null {
    if (!flagship || bay[type] <= 0 || !canField(rank, flying(), type)) return null;
    const fa = world.agents.get(flagship.id)!;
    const fwd = fa.fwd;
    const n = flying()[type];
    const side = n % 2 === 0 ? 1 : -1;
    const off: V3 = [side * flagship.radius * 0.5, -flagship.radius * 0.45, flagship.radius * 0.3 + n * L * 0.4];
    const pos = slotWorld(flagship.pos, fwd, off);
    const c = combat.spawn(type, PLAYER_NATION, pos, fwd);
    bay[type]--;
    const a: Agent = { id: c.id, side: 0, type, pos, vel: scale(fwd, fa.speed), fwd, speed: Math.min(fa.speed, COMBAT[type].speed * L), hp: hpOf(c), maxHp: c.maxHp, radius: c.radius, alive: true, driven: true, wing: null, target: null, cooldown: 0.5, hitBy: null, hitAt: -99, docked: false };
    world.agents.set(c.id, a);
    prevPos.set(c.id, [...pos]);
    const w = wingFor(type);
    w.members.push(c.id);
    a.wing = w.id;
    return a;
  }

  /** Launch everything of `types` still in the bay (by default, the whole bay). */
  function launch(types: ShipType[] = ['cruiser', 'fighter']) {
    let n = 0;
    for (const t of types) while (launchOne(t)) n++;
    lastOrder = n ? `Launched ${n}` : 'Bay empty';
    return n;
  }

  /** Become a rank: the flagship's hull and bay come from it. */
  function setRank(id: RankId, at?: { pos: V3; fwd: V3 }) {
    rank = rankById(id);
    const pos = at?.pos ?? flagship?.pos ?? [0, 0, 0];
    const fwd = at?.fwd ?? flagship?.fwd ?? [0, 0, -1];
    if (!flagship || flagship.type !== rank.hull) {
      if (flagship) combat.remove(flagship);
      flagship = combat.spawn(rank.hull, PLAYER_NATION, pos, fwd);
      world.agents.delete(flagship.id);
      // Its own wing, so its turrets pick targets and fire while the player flies it.
      world.wings = world.wings.filter((w) => !w.own);
      const own = makeWing('Flagship', 0, [flagship.id], { kind: 'follow', leader: flagship.id }, 'wedge', 'defensive');
      own.own = true;
      world.wings.push(own);
    }
    for (const t of SHIP_TYPES) bay[t] = rank.bay[t];
  }
  /**
   * Take command of a capital ship. The level gate is progression's; the mission that hands you the ship is not built
   * yet, so meeting the level is enough for now. `force` skips the gate (the dev hook and the test-build button).
   */
  const takeCommand = (at?: { pos: V3; fwd: V3 }, force = false) => {
    if (!force && !canCommand(level())) return false;
    setRank(rankFor(Math.max(level(), 10), { command: true }).id, at);
    return true;
  };

  const wingsFor = (who: number | 'all') => ourWings().filter((w) => who === 'all' || w.id === who);
  const describe = (w: Wing): string => {
    const o = w.order;
    const name = (id: number) => { const c = craftOf(id); return c ? (c === flagship ? 'you' : `${c.hostile ? c.nation : 'our'} ${c.type}`) : 'gone'; };
    switch (o.kind) {
      case 'attack': return `attack ${name(o.target)}`;
      case 'defend': return `defend ${name(o.ward)}`;
      case 'follow': return `follow ${name(o.leader)}`;
      case 'hold': return 'hold';
      case 'path': return `path ${Math.min(o.next + 1, o.points.length)}/${o.points.length}${o.loop ? ' (loop)' : ''}`;
      case 'recall': return 'recall';
    }
  };

  /** Give the selected wing(s), or `who`, an order. */
  function order(o: Order | ((w: Wing) => Order), who: number | 'all' = selected) {
    const ws = wingsFor(who);
    for (const w of ws) setOrder(w, typeof o === 'function' ? o(w) : structuredClone(o), world);
    if (ws.length) lastOrder = `${who === 'all' ? 'All' : ws[0].name} · ${ORDER_LABEL[ws[0].order.kind]}`;
    return ws.length;
  }
  const fa = () => (flagship ? world.agents.get(flagship.id) ?? null : null);
  const orders = {
    attack: (target: number, who?: number | 'all') => order({ kind: 'attack', target }, who),
    defend: (ward = flagship?.id ?? -1, who?: number | 'all') => order({ kind: 'defend', ward }, who),
    follow: (leader = flagship?.id ?? -1, who?: number | 'all') => order({ kind: 'follow', leader }, who),
    hold: (at?: V3, who?: number | 'all') => order((w) => {
      const ms = activeMembers(w, world);
      const c = at ?? (ms.length ? scale(ms.reduce<V3>((s, a) => add(s, a.pos), [0, 0, 0]), 1 / ms.length) : fa()?.pos ?? [0, 0, 0]);
      return { kind: 'hold', at: [...c] as V3, facing: fa()?.fwd ?? [0, 0, -1] };
    }, who),
    path: (points: V3[], loop = false, who?: number | 'all') => order({ kind: 'path', points: points.map((p) => [...p] as V3), loop, next: 0 }, who),
    recall: (who?: number | 'all') => order({ kind: 'recall', carrier: flagship?.id ?? -1 }, who),
    /** The ping: attack the locked ship, or form on me if nothing is locked. */
    ping: (locked: number | null, who?: number | 'all') => (locked !== null ? orders.attack(locked, who) : orders.follow(undefined, who)),
  };
  function setFormation(f: FormationId | 'next', who: number | 'all' = selected) {
    for (const w of wingsFor(who)) w.formation = f === 'next' ? FORMATION_ORDER[(FORMATION_ORDER.indexOf(w.formation) + 1) % FORMATION_ORDER.length] : f;
    const w = wingsFor(who)[0];
    if (w) lastOrder = `${who === 'all' ? 'All' : w.name} · ${FORMATIONS[w.formation].label}`;
  }
  function setStance(s: Stance | 'next', who: number | 'all' = selected) {
    for (const w of wingsFor(who)) w.stance = s === 'next' ? STANCE_ORDER[(STANCE_ORDER.indexOf(w.stance) + 1) % STANCE_ORDER.length] : s;
    const w = wingsFor(who)[0];
    if (w) lastOrder = `${who === 'all' ? 'All' : w.name} · ${STANCES[w.stance].label}`;
  }

  /**
   * Turn a nation's ships loose on a target with the same brains (the test for defend; enemy strategy is not
   * designed yet). Returns the wing.
   */
  function aggro(nation: NationId, target = flagship?.id ?? -1, types: ShipType[] = ['cruiser', 'fighter']) {
    const ids: number[] = [];
    for (const c of combat.crafts) {
      if (c.nation !== nation || !c.alive || c.driven || !types.includes(c.type)) continue;
      c.driven = true;
      c.fwd = world.agents.get(c.id)?.fwd ?? [0, 0, -1];
      const a = world.agents.get(c.id);
      if (a) { a.driven = true; a.speed = 0; }
      ids.push(c.id);
    }
    const w = makeWing(`${nation} raid`, 1, ids, { kind: 'attack', target }, 'wedge', 'aggressive');
    world.wings.push(w);
    return w;
  }

  /** One frame. `pose` is the player's ship (it flies the flagship). */
  function update(dt: number, pose: { pos: V3; fwd: V3; speed: number }) {
    if (flagship) {
      flagship.pos = [...pose.pos];
      flagship.fwd = unit(pose.fwd);
    }
    sync(dt);
    if (flagship) {
      const a = world.agents.get(flagship.id);
      if (a) { a.fwd = flagship.fwd!; a.speed = pose.speed; a.vel = scale(flagship.fwd!, pose.speed); }
    }
    if (dt > 0) {
      const hits = stepFleet(world, dt, false);
      for (const h of hits) {
        const c = craftOf(h.target.id);
        if (!c || !c.alive) continue;
        if (c === flagship) { c.def.hull = Math.max(1, c.def.hull - h.damage); continue; } // the flagship can't be lost yet
        const wasAlive = c.alive;
        combat.damage(c, h.damage, 'wing'); // the fleet's kill: progression counts it as the wing's
        if (wasAlive && !c.alive) { if (c.hostile) world.stats.kills++; else world.stats.lost++; }
        h.target.hp = hpOf(c);
        h.target.alive = c.alive;
      }
    }
    // Driven ships back into the scene; docked ones back into the bay.
    for (const w of world.wings) {
      for (const id of [...w.members]) {
        const a = world.agents.get(id);
        const c = craftOf(id);
        if (!a || !c) { w.members.splice(w.members.indexOf(id), 1); continue; }
        if (a.docked) {
          combat.remove(c);
          world.agents.delete(id);
          w.members.splice(w.members.indexOf(id), 1);
          if (w.side === 0) bay[a.type]++;
          continue;
        }
        if (a.driven && c.alive) { c.pos = [...a.pos]; c.fwd = a.fwd; }
      }
    }
    world.wings = world.wings.filter((w) => w.members.length || w.side === 0);
    // Bolts.
    const n = Math.min(MAX_BOLTS, world.bolts.length);
    // Round an anchor at the first bolt, so the GPU never adds two numbers billions of units across (space/origin.ts).
    if (n) boltMesh.position.set(...world.bolts[0].pos);
    for (let i = 0; i < n; i++) {
      const b = world.bolts[i];
      const v = new THREE.Vector3(...b.vel).normalize();
      q.setFromUnitVectors(zAxis, v);
      m4.compose(new THREE.Vector3(...b.pos).sub(boltMesh.position), q, one);
      boltMesh.setMatrixAt(i, m4);
      boltMesh.setColorAt(i, b.side === 0 ? ours : theirs);
    }
    boltMesh.count = n;
    boltMesh.instanceMatrix.needsUpdate = true;
    if (boltMesh.instanceColor) boltMesh.instanceColor.needsUpdate = true;
  }

  function shipSnap(c: Craft): FleetShipSnap {
    const a = world.agents.get(c.id);
    return { id: c.id, type: c.type, side: sideOf(c), pos: [...c.pos], fwd: a?.fwd ?? c.fwd ?? [0, 0, -1], hp: hpOf(c), maxHp: c.maxHp, wing: a?.wing ?? null, nation: c.nation, flagship: c === flagship };
  }

  /** Everything the command strip and the tactical view read. `near` limits ships to that distance of the flagship. */
  function snap(near = Infinity): FleetSnap {
    const centre = flagship?.pos ?? [0, 0, 0];
    const ships = combat.crafts.filter((c) => c.alive && (c === flagship || dist(c.pos, centre) < near)).map(shipSnap);
    const wings: WingSnap[] = world.wings.filter((w) => !w.own).map((w) => {
      const ms = activeMembers(w, world);
      const gap = formationGap(w.formation, ms.map((a) => a.type), L);
      const slots = w.anchor && ms.length ? [w.anchor.pos, ...ms.map((_, k) => slotWorld(w.anchor!.pos, w.anchor!.fwd, slotOffset(w.formation, k, ms.length, gap)))] : [];
      const biggest = ms.length ? Math.max(...ms.map((a) => COMBAT[a.type].range)) : 0;
      return {
        id: w.id, name: w.name, side: w.side, order: structuredClone(w.order), orderText: describe(w), formation: w.formation, stance: w.stance,
        ships: ms.map((a) => a.id), post: ms.map((a) => postOf(a, w, world)?.pos ?? null),
        spacing: ms.length > 1 ? nearestSpacing(ms.map((a) => postOf(a, w, world)?.pos).filter((p): p is V3 => !!p)) : slots.length > 2 ? nearestSpacing(slots.slice(1)) : null,
        engage: biggest * L * STANCES[w.stance].engage,
        anchor: w.anchor ? [...w.anchor.pos] : null,
      };
    });
    return { rank, level: level(), hull: flagship?.type ?? 'cruiser', flagship: flagship ? shipSnap(flagship) : null, bay: { ...bay }, ships, wings, selected, stats: { ...world.stats }, lastOrder, time: world.time };
  }

  return {
    world,
    get rank() { return rank; },
    get level() { return level(); },
    get flagship() { return flagship; },
    get hull(): ShipType { return flagship?.type ?? 'cruiser'; },
    get selected() { return selected; },
    select: (w: number | 'all') => { selected = w; },
    bay,
    setRank,
    takeCommand,
    launch,
    launchOne,
    orders,
    setFormation,
    setStance,
    aggro,
    update,
    snap,
    /** Time on the tactical view: 0.25 (slow), 0 (paused) or 1. */
    tacticalScale: 0.25,
    dispose: () => { scene.remove(boltMesh); boltGeo.dispose(); boltMat.dispose(); boltMesh.dispose(); },
  };
}

export type FleetCommand = ReturnType<typeof createFleetCommand>;
