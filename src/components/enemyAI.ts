/**
 * Enemy AI in the scene: when each nation's ships engage, how they fly, and what they fire. Every decision is made
 * by the pure libs (lib/fighterAI, lib/warshipAI, lib/tactics, lib/pilot); this file gathers what they need to see,
 * flies their orders, and hands their shots to the arsenal.
 *
 * Idle is the patrol ring (combat.ts). What a nation's fleet does on meeting the player is its standing toward the
 * player's house (lib/diplomacy/standings, FEUDS.md 6.2), read each frame through `hooks.attitudeOf`: Blood and Hostile
 * fleets engage when the player comes within alert range of any of them, Wary fleets shadow (close in, keep their
 * distance, never fire), Friendly and Allied fleets hold. A hit or a lock on one of their ships is reported through
 * `hooks.onProvoke`, which may change the standing; a fleet that is now at war engages. They go home once the player
 * has been far away for a while, or is lost. Raiders the director sends (`adopt`) fly as their own fleet and always
 * engage. Knobs: lib/aiKnobs.ts.
 */
import * as THREE from 'three';
import type { DestGeo, V3 } from '../lib/nav';
import { add, dist, dot, len, scale, sub, unit } from '../lib/nav';
import type { Munition } from '../lib/munitions';
import { AI, bySkill } from '../lib/aiKnobs';
import type { EnemyFit, ShipClass } from '../lib/enemyArms';
import { CLASS, rng, seedOf } from '../lib/enemyArms';
import type { FighterMem, FighterOrder } from '../lib/fighterAI';
import { fighterThink, newFighterMem } from '../lib/fighterAI';
import type { WarshipMem, WarshipOrder } from '../lib/warshipAI';
import { newWarshipMem, warshipThink } from '../lib/warshipAI';
import type { FleetSlot, Occluder } from '../lib/tactics';
import { ARC, avoidBodies, clearShot, fleetPlan, hidden, standoffRange } from '../lib/tactics';
import type { Gun } from '../lib/pilot';
import { arrive, fireOrders, flyCoupled, flyFree, leadDir, lockLine, scatter, stepEnemyLock } from '../lib/pilot';
import { COUNTERS, DRONES, droneOffset, nearestWithin, repairStep, spoofed } from '../lib/tech';
import type { Arsenal, Target } from './arsenal';
import type { Attitude } from '../lib/diplomacy/standings';

/** What the AI needs of a ship: combat.ts's Craft has all of this. */
export interface AICraft extends Target {
  nation: string;
  cls: ShipClass;
  fit: EnemyFit;
  fwd: V3;
  obj: THREE.Object3D;
  offset: V3;
}

export type Mode = 'patrol' | 'engaged' | 'return';
export interface Brain {
  craft: AICraft;
  fleet: string; // its fleet's key: the nation, or `raid:<id>` for a raid the director sent
  mode: Mode;
  rand: () => number;
  fighter: FighterMem;
  warship: WarshipMem;
  order: FighterOrder | WarshipOrder | null;
  thinkAt: number;
  guns: Gun[];
  energy: number;
  lock: number; // 0..1 on the player
  chaffSeen: number;
  hurtAt: number;
  lastDef: number;
  standoff: number;
  slot: FleetSlot | null;
  drones: { id: keyof typeof DRONES; obj: THREE.Mesh; cd: number; pos: V3 }[];
  log: { modeTime: Record<string, number>; maneuvers: Record<string, number>; hiddenTime: number; lastManeuver: string; flares: number; covered: number };
}
interface Fleet {
  key: string;
  nation: string;
  alert: boolean;
  calm: number;
  plan: Map<number, FleetSlot>;
  planAt: number;
  /** Used when no `hooks.attitudeOf` is set (tests, the dev toggle). */
  attitude: Attitude;
  /** A raid: always engages, whatever its house's standing. */
  raid: boolean;
  /** What it is doing this frame. */
  now: Attitude;
  /** Called out to the player in its home space this frame (`hooks.summoned`). */
  called?: boolean;
}

export interface AIWorld {
  crafts: AICraft[];
  arsenal: Arsenal;
  geo: () => DestGeo[];
  homeOf: (c: AICraft) => DestGeo;
  patrolAt: (c: AICraft, t: number) => V3;
  extraOccluders?: () => Occluder[]; // stations, asteroids: from the branches that add them
}

const defTotal = (c: Target) => c.def.hull + c.def.shield.reduce((a, b) => a + b, 0);

export function createEnemyAI(root: THREE.Group, w: AIWorld) {
  const A = w.arsenal;
  const brains = new Map<number, Brain>();
  const fleets = new Map<string, Fleet>();
  const droneGeo = new THREE.OctahedronGeometry(0.1, 0);
  const mats: THREE.Material[] = [];
  let time = 0;
  let playerPrev: V3 | null = null;
  let playerVel: V3 = [0, 0, 0];
  let lastChaffs = 0;

  /**
   * `summoned`: the player is in this house's home space and not welcome there (diplomacy/territory.ts): its fleet comes
   * out to the player however far off it is, to shadow while it challenges and to fight once weapons free.
   */
  const hooks: { attitudeOf: ((nation: string) => Attitude) | null; onProvoke: ((nation: string) => void) | null; summoned: ((nation: string) => boolean) | null } = { attitudeOf: null, onProvoke: null, summoned: null };
  const attitudeNow = (f: Fleet): Attitude => (f.raid ? 'engage' : hooks.attitudeOf?.(f.nation) ?? f.attitude);

  function makeBrain(c: AICraft, key: string): Brain {
    const r = rng(seedOf('ai', c.id, c.nation));
    const drones = c.fit.drones.map((id) => {
      const mat = new THREE.MeshStandardMaterial({ color: DRONES[id].color, emissive: DRONES[id].color, emissiveIntensity: 0.8 });
      mats.push(mat);
      const obj = new THREE.Mesh(droneGeo, mat);
      obj.scale.setScalar(CLASS[c.cls].size > 2 ? 2 : 1);
      root.add(obj);
      return { id, obj, cd: 0, pos: c.pos };
    });
    const b: Brain = {
      craft: c, fleet: key, mode: 'patrol', rand: r, fighter: newFighterMem(), warship: newWarshipMem(0, r() < 0.5 ? 1 : -1), order: null, thinkAt: 0,
      guns: [], energy: c.fit.reactor.capacity, lock: 0, chaffSeen: 0, hurtAt: -9, lastDef: defTotal(c), standoff: 0, slot: null, drones,
      log: { modeTime: {}, maneuvers: {}, hiddenTime: 0, lastManeuver: '', flares: 0, covered: 0 },
    };
    brains.set(c.id, b);
    if (!fleets.has(key)) fleets.set(key, { key, nation: c.nation, alert: false, calm: 0, plan: new Map(), planAt: -9, attitude: 'engage', raid: key !== c.nation, now: 'engage' });
    return b;
  }
  for (const c of w.crafts) if (c.hostile) makeBrain(c, c.nation);
  /** Guns at the current world scale (munitions are rescaled by the arsenal). */
  const armGuns = (b: Brain) => {
    b.guns = b.craft.fit.weapons.map((id) => ({ id, m: A.munition(id), cd: b.rand() * 0.5, ammo: A.munition(id).ammo }));
  };
  for (const b of brains.values()) armGuns(b);

  /** The player hit or locked one of `nation`'s ships: the standing hears of it, and a fleet now at war engages. */
  function provoke(nation: string) {
    if (A.player.down) return;
    hooks.onProvoke?.(nation);
    if (!AI.provokeNation) return;
    for (const f of fleets.values()) {
      if (f.nation !== nation || attitudeNow(f) !== 'engage') continue;
      f.alert = true;
      f.calm = 0;
    }
  }

  function occluders(): Occluder[] {
    const o: Occluder[] = w.geo().filter((g) => g.size > 0).map((g) => ({ pos: g.pos, r: g.size, kind: 'body' as const }));
    for (const c of w.crafts) if (c.alive) o.push({ pos: c.pos, r: c.radius, kind: 'ship', id: c.id });
    return w.extraOccluders ? o.concat(w.extraOccluders()) : o;
  }

  const place = (o: THREE.Object3D, p: V3, f: V3) => { o.position.set(...p); o.lookAt(p[0] - f[0], p[1] - f[1], p[2] - f[2]); };

  function engage(b: Brain) {
    if (b.mode === 'engaged') return;
    const c = b.craft;
    if (b.mode === 'patrol') {
      c.fwd = len(c.vel) > 1e-6 ? unit(c.vel) : c.fwd;
      b.fighter = newFighterMem(time);
      b.warship = newWarshipMem(time, b.warship.sense);
    }
    b.mode = 'engaged';
    if (!b.guns.length || b.guns[0].m !== A.munition(b.guns[0].id)) armGuns(b);
  }

  /** One frame. `player` is where the player is; its velocity is measured here. */
  function update(dt: number, playerPos: V3, playerFwd: V3, playerSpeed: number, inside: boolean) {
    time += dt;
    const k = A.scale;
    if (playerPrev && dt > 0) playerVel = scale(sub(playerPos, playerPrev), 1 / dt);
    playerPrev = playerPos;
    const P = A.player;
    const away = P.down || inside;
    const geo = w.geo();
    const sunG = geo.find((g) => g.id === 'sun');
    const occ = occluders();
    const newChaff = P.chaffs !== lastChaffs;
    lastChaffs = P.chaffs;
    let locking = 0;
    let locked = 0;

    // ---- Alert and calm, per nation ----
    for (const f of fleets.values()) {
      const ships = [...brains.values()].filter((b) => b.fleet === f.key && b.craft.alive);
      const nearest = ships.reduce((m, b) => Math.min(m, dist(b.craft.pos, playerPos)), Infinity);
      f.now = attitudeNow(f);
      if (f.now === 'hold') f.alert = false;
      const spot = AI.alertRange * k * (f.now === 'shadow' ? AI.shadowSpot : 1);
      if (!f.alert && !away && P.grace <= 0 && f.now !== 'hold' && nearest < spot) { f.alert = true; f.calm = 0; }
      const called = !f.raid && !away && P.grace <= 0 && f.now !== 'hold' && !!hooks.summoned?.(f.nation);
      f.called = called;
      if (called) { f.alert = true; f.calm = 0; }
      else if (f.alert) {
        f.calm = nearest > AI.disengageRange * k ? f.calm + dt : 0;
        if (f.calm > AI.calmTime || away) f.alert = false;
      }
      for (const b of ships) {
        if (f.alert) engage(b);
        else if (b.mode === 'engaged') b.mode = 'return';
      }
      if (f.alert && f.now === 'engage' && time - f.planAt > 0.5) {
        f.planAt = time;
        const fleet = ships.map((b) => {
          if (b.craft.cls !== 'fighter') b.standoff = standoffRange(b.craft.cls, b.guns.map((g) => g.m), A.fitted.weapons.map((id) => A.munition(id)), b.craft.fit.temper.standoff, k);
          return { id: b.craft.id, cls: b.craft.cls, pos: b.craft.pos, standoff: b.standoff };
        });
        const capital = ships.find((b) => b.craft.cls === 'capital');
        const anchor = capital ? capital.craft.pos : w.homeOf(ships[0].craft).pos;
        f.plan = fleetPlan(fleet, playerPos, anchor, sunG ? sunG.pos : null, AI.sunBias * (ships[0]?.craft.fit.temper.sun ?? 0), k);
        for (const b of ships) b.slot = f.plan.get(b.craft.id) ?? null;
      }
    }

    // ---- Each ship ----
    for (const b of brains.values()) {
      const c = b.craft;
      for (const d of b.drones) d.obj.visible = c.alive;
      if (!c.alive || b.mode === 'patrol') {
        if (c.alive) b.drones.forEach((d, i) => { d.pos = add(c.pos, droneOffset(i, b.drones.length, time, DRONES[d.id].orbit * k * (CLASS[c.cls].size > 2 ? 2 : 1))); d.obj.position.set(...d.pos); });
        continue;
      }
      const spec = CLASS[c.cls];
      const flight = { speed: spec.speed * k, accel: spec.accel * k, turn: spec.turn };
      b.log.modeTime[b.mode] = (b.log.modeTime[b.mode] ?? 0) + dt;

      // Hurt? (any loss of shield or hull since last frame)
      const total = defTotal(c);
      if (total < b.lastDef - 0.01) b.hurtAt = time;
      b.lastDef = total;

      if (b.mode === 'return') {
        // Home to its place on the ring, then back to the patrol (combat.ts eases the last of the offset out).
        const goal = w.patrolAt(c, time);
        const v = avoidBodies(c.pos, arrive(c.pos, goal, flight.speed, flight.accel), occ, AI.avoidMargin * k + c.radius, AI.lookahead);
        flyFree(c, v, len(v) > 1e-6 ? v : c.fwd, { ...flight, accel: flight.accel * 2 }, dt);
        place(c.obj, c.pos, c.fwd);
        if (dist(c.pos, goal) < 3 * k) { b.mode = 'patrol'; c.offset = sub(c.pos, goal); b.lock = 0; }
        moveDrones(b, dt, false);
        continue;
      }

      // Ion-disabled: it drifts, blind.
      if (c.def.disabled > 0) {
        c.vel = scale(c.vel, Math.exp(-dt * 2));
        c.pos = add(c.pos, scale(c.vel, dt));
        c.obj.position.set(...c.pos);
        b.lock = 0;
        continue;
      }

      const toP = sub(playerPos, c.pos);
      const d = len(toP);
      const target = { pos: playerPos, vel: playerVel, fwd: playerFwd };

      // Far off (a summoned patrol on the far side of its world): it burns in at a speed that falls with the distance
      // left, round the bodies in the way, and fights once it is close (scale-jump-danger D1).
      if (d > AI.transit.from * k && fleets.get(b.fleet)?.called) {
        // In the player's frame: a ship parked in orbit low over a world moves at tens of thousands of units a second.
        const close = Math.max(flight.speed, (d - AI.transit.from * k * 0.5) * AI.transit.gain);
        const want = add(playerVel, scale(unit(toP), close));
        const v = avoidBodies(c.pos, want, occ, AI.avoidMargin * k + c.radius, AI.transit.lookahead);
        c.vel = v;
        c.pos = add(c.pos, scale(v, dt));
        if (len(v) > 1e-6) c.fwd = unit(v);
        for (const g of geo) {
          if (!g.size) continue;
          const min = g.size * 1.02 + c.radius;
          const off = sub(c.pos, g.pos);
          if (len(off) < min) c.pos = add(g.pos, scale(unit(off), min));
        }
        place(c.obj, c.pos, c.fwd);
        b.lock = 0;
        b.log.modeTime.transit = (b.log.modeTime.transit ?? 0) + dt;
        moveDrones(b, dt, false);
        continue;
      }

      // Wary: close in and keep station off the player, nose on them, guns cold (FEUDS.md 2, "patrols shadow you").
      if (fleets.get(b.fleet)?.now === 'shadow') {
        const goal = add(playerPos, scale(unit(len(toP) > 1e-6 ? scale(toP, -1) : [0, 0, 1]), AI.shadowRange * k));
        const v = avoidBodies(c.pos, arrive(c.pos, goal, flight.speed, flight.accel), occ, AI.avoidMargin * k + c.radius, AI.lookahead);
        flyFree(c, v, toP, flight, dt);
        place(c.obj, c.pos, c.fwd);
        b.lock = 0;
        b.log.modeTime.shadow = (b.log.modeTime.shadow ?? 0) + dt;
        moveDrones(b, dt, false);
        continue;
      }

      // ---- Decide and fly ----
      if (c.cls === 'fighter') {
        const threats = A.missiles.filter((f) => !f.hostile && !f.dead).map((f) => ({ pos: f.pos, vel: f.vel, homingOnMe: f.homing && f.target === c.id && !f.decoy }));
        const primary = b.guns.find((g) => g.m.delivery === 'bolt') ?? b.guns[0];
        const o = fighterThink({
          t: time, pos: c.pos, vel: c.vel, fwd: c.fwd, target, threats, hurt: time - b.hurtAt < 0.5,
          gunSpeed: primary.m.speed, skill: c.fit.skill, aggression: c.fit.temper.aggression,
          sun: sunG ? sunG.pos : null, sunPref: c.fit.temper.sun, screen: b.slot?.role === 'screen' ? b.slot.slot : null, k,
        }, b.fighter, b.rand);
        b.order = o;
        if (o.maneuver !== b.log.lastManeuver) { b.log.maneuvers[o.maneuver] = (b.log.maneuvers[o.maneuver] ?? 0) + 1; b.log.lastManeuver = o.maneuver; }
        if (o.flare && A.enemyFlare(c)) b.log.flares++;
        // Chase what the player is really doing: a ship parked in orbit has speed 0 on its gauge but moves with the
        // orbit, and fighters held to the gauge could never close on it (found proving the first raid, GP-02).
        const top = Math.min(AI.speedCap * k, Math.max(flight.speed, Math.max(playerSpeed, len(playerVel)) * AI.matchPlayer));
        const want = avoidBodies(c.pos, scale(o.wantDir, top), occ, AI.avoidMargin * k + c.radius, AI.lookahead);
        flyCoupled(c, want, o.throttle * top, { ...flight, speed: top, accel: flight.accel * Math.max(1, top / flight.speed) }, dt);
      } else {
        if (time >= b.thinkAt || !b.order) {
          b.thinkAt = time + 0.25;
          b.order = warshipThink({
            cls: c.cls, t: time, pos: c.pos, vel: c.vel, fwd: c.fwd, id: c.id, r: c.radius, target, shield: c.def.shield.reduce((a, x) => a + x, 0) / (c.def.maxShield * c.def.shield.length),
            standoff: b.standoff || AI.minStandoff[c.cls] * k, slot: b.slot?.slot ?? null, occluders: occ, speed: flight.speed, accel: flight.accel, coverPref: c.fit.temper.cover, k,
          }, b.warship);
          const m = (b.order as WarshipOrder).mode;
          if (m !== b.log.lastManeuver) { b.log.maneuvers[m] = (b.log.maneuvers[m] ?? 0) + 1; b.log.lastManeuver = m; if (m === 'cover') b.log.covered++; }
        }
        const o = b.order as WarshipOrder;
        const v = avoidBodies(c.pos, o.wantVel, occ, AI.avoidMargin * k + c.radius, AI.lookahead);
        flyFree(c, v, o.face, flight, dt);
      }
      if (c.dodgeT > 0) { c.pos = add(c.pos, scale(c.dodgeVel, dt)); c.dodgeT -= dt; }
      // Bodies are solid.
      for (const g of geo) {
        if (!g.size) continue;
        const min = g.size * 1.02 + c.radius;
        const off = sub(c.pos, g.pos);
        if (len(off) < min) { c.pos = add(g.pos, scale(unit(off), min)); c.vel = scale(c.vel, 0.3); }
      }
      place(c.obj, c.pos, c.fwd);
      if (hidden(c.pos, c.id, playerPos, occ)) b.log.hiddenTime += dt;

      // ---- Lock on the player ----
      const launchers = b.guns.filter((g) => g.m.lock !== 'none');
      if (launchers.length && !away) {
        const range = Math.max(...launchers.map((g) => g.m.range));
        const los = clearShot(c.pos, playerPos, occ, c.id);
        const on = P.jam <= 0 && P.grace <= 0 && d <= range && los && lockLine(ARC[c.cls], c.fwd, c.pos, playerPos, AI.lockCone);
        const lt = Math.min(...launchers.map((g) => g.m.lockTime)) * c.fit.targeting.lockMul * (A.fitted.counter === 'jammer' ? COUNTERS.jammer.lockMul! : 1);
        b.lock = stepEnemyLock(b.lock, on, dt, lt, AI.lockDecay);
        // The player's chaff: each new cloud may break a lock being built or held.
        if (newChaff && b.lock > 0 && spoofed(COUNTERS.chaff.pull, c.fit.targeting.seeker, b.rand())) b.lock = 0;
        if (b.lock >= 1) locked++; else if (b.lock > 0.05) locking++;
      } else b.lock = 0;

      // ---- Fire ----
      b.energy = Math.min(c.fit.reactor.capacity, b.energy + c.fit.reactor.regen * dt);
      for (const g of b.guns) g.cd = Math.max(0, g.cd - dt);
      if (!away && P.grace <= 0) {
        const los = clearShot(c.pos, playerPos, occ, c.id);
        const behind = d < AI.mineChase * k && dot(c.fwd, unit(toP)) < -0.5;
        const orders = fireOrders(b.guns, {
          pos: c.pos, vel: c.vel, fwd: c.fwd, arc: ARC[c.cls], noseCone: bySkill(AI.fireCone, c.fit.skill), target: { pos: playerPos, vel: playerVel, r: 0.35 * k },
          locked: b.lock >= 1, energy: b.energy, los, threats: A.missiles.filter((f) => !f.hostile && !f.dead).map((f) => f.pos), chased: behind,
        });
        for (const o of orders) {
          const g = b.guns.find((x) => x.id === o.id)!;
          const m = g.m;
          if (m.delivery === 'beam') {
            b.energy = Math.max(0, b.energy - m.energy * dt);
            A.enemyBeam(c, m, o.dir, dt, bySkill(AI.beamTrack, c.fit.skill));
            continue;
          }
          const dir = o.at === 'missile' ? o.dir : scatter(o.dir, bySkill(AI.aimError, c.fit.skill), b.rand(), b.rand());
          A.enemyFire(c, m, dir, c.fit.targeting.seeker);
          b.energy = Math.max(0, b.energy - m.energy);
          if (g.ammo !== null) g.ammo--;
          g.cd = 1 / (m.rate * AI.rateMul);
          if (m.delivery === 'missile') b.lock = 0.5; // the launcher re-acquires for the next one
        }
      }
      moveDrones(b, dt, !away && P.grace <= 0);
    }
    P.threat.locking = locking;
    P.threat.locked = locked;
  }

  /** An engaged ship's drones: repair its ship, shoot down the player's missiles, or shoot at the player. */
  function moveDrones(b: Brain, dt: number, fight: boolean) {
    const c = b.craft;
    const k = A.scale;
    const big = CLASS[c.cls].size > 2 ? 2 : 1;
    b.drones.forEach((d, i) => {
      const spec = DRONES[d.id];
      d.pos = add(c.pos, droneOffset(i, b.drones.length, time, spec.orbit * k * big));
      d.obj.position.set(...d.pos);
      d.obj.rotation.y += dt * 3;
      d.cd = Math.max(0, d.cd - dt);
      if (d.id === 'repair') {
        c.def.hull = repairStep(spec, c.def.hull, c.def.maxHull, 0, 0, dt).hull;
        c.def.shield = c.def.shield.map((s) => repairStep(spec, 0, 0, s, c.def.maxShield, dt).shield);
        return;
      }
      if (!fight || d.cd > 0) return;
      if (d.id === 'pointDefence') {
        const t = nearestWithin(d.pos, A.missiles.filter((f) => !f.hostile && !f.dead), (f) => f.pos, spec.range * k);
        if (!t) return;
        A.tracer(d.pos, t.pos, spec.color);
        if (b.rand() < spec.damage) { t.dead = true; A.extra.enemyPdKills++; }
        d.cd = 1 / spec.rate;
      } else if (d.id === 'attack') {
        if (A.player.down || dist(d.pos, A.player.pos) > spec.range * k) return;
        const m: Munition = A.droneShot;
        A.enemyFire({ ...c, pos: d.pos, radius: 0.05 * k }, m, leadDir(d.pos, [0, 0, 0], m.speed, A.player.pos, playerVel), 0, true);
        d.cd = 1 / spec.rate;
      }
    });
  }

  /** Fly `c` as one of the raid `key` (the director's raiders): engaged at once, whatever its house's standing. */
  function adopt(c: AICraft, key: string) {
    const b = makeBrain(c, key);
    armGuns(b);
    const f = fleets.get(key)!;
    f.alert = true;
    f.calm = 0;
    engage(b);
    return b;
  }
  /** Stop flying a ship (a raider gone home or taken out of the scene). */
  function release(id: number) {
    const b = brains.get(id);
    if (!b) return;
    for (const d of b.drones) { root.remove(d.obj); }
    brains.delete(id);
    if (![...brains.values()].some((x) => x.fleet === b.fleet) && b.fleet !== b.craft.nation) fleets.delete(b.fleet);
  }

  return {
    brains,
    fleets,
    hooks,
    update,
    provoke,
    adopt,
    release,
    modeOf: (id: number): Mode | null => brains.get(id)?.mode ?? null,
    /** Dev: a nation's attitude when no standings are wired (`hooks.attitudeOf`). */
    setAttitude: (nation: string, a: Attitude) => { const f = fleets.get(nation); if (f) f.attitude = a; },
    isFree: (id: number) => (brains.get(id)?.mode ?? 'patrol') !== 'patrol',
    dispose: () => { droneGeo.dispose(); mats.forEach((m) => m.dispose()); },
  };
}

export type EnemyAI = ReturnType<typeof createEnemyAI>;
