/**
 * Combat in the scene: every nation's patrol ships, lock-on, the lead indicator and explosions. What the player fires
 * (all ten munitions), shields, drones and countermeasures are in arsenal.ts; how enemy ships fight back is in
 * enemyAI.ts. The maths lives in lib/.
 */
import * as THREE from 'three';
import type { DestGeo, V3 } from '../lib/nav';
import { add, dist, scale, sub, unit } from '../lib/nav';
import type { NationId } from '../lib/nations';
import { NATIONS, patrolDir, patrolPos } from '../lib/nations';
import type { ShipType } from '../lib/shipTypes';
import { SHIP_SPECS, SHIP_TYPES, bodyRadius, shipLength } from '../lib/shipTypes';
import type { MunitionId } from '../lib/munitions';
import { MUNITIONS } from '../lib/munitions';
import { applyHit } from '../lib/shields';
import type { EnemyFit, ShipClass } from '../lib/enemyArms';
import { AI } from '../lib/aiKnobs';
import type { Occluder } from '../lib/tactics';
import { inGlare } from '../lib/tactics';
import type { LockState } from '../lib/weapons';
import { LOCK, boltMiss, intercept, noLock, offAngle, stepDrawnLock, underReticle } from '../lib/weapons';
import type { SpaceUniforms } from './space/materials';
import { createFleet } from './space/fleet';
import { SHIP_MODEL_LENGTH } from './space/ship';
import { peopleOf } from '../lib/races';
import { craftArms } from '../lib/craftStats';
import type { Target } from './arsenal';
import { createArsenal, glow } from './arsenal';
import { createEnemyAI } from './enemyAI';
import { spawnExplosion } from './fx';

/** A patrol ship. Its shield, hull (def.hull), countermeasure and dodge are what the arsenal reads (Target). */
export interface Craft extends Target {
  nation: NationId;
  type: ShipType;
  idx: number; // its place among its nation's ships of this type
  of: number;
  maxHp: number; // hull + armour + shield when fresh (the HUD's bar)
  dodge: number; // chance it sidesteps a missile once the homing lets go
  vel: V3; // measured each frame from how far it moved, for the laser lead
  radius: number; // world units, the body's hit radius: bolts and missiles add their reach; the lock and the lead read it
  offset: V3; // knocked off its patrol ring by a dodge or held still while disabled; eases back
  obj: THREE.Group;
  cls: ShipClass; // enemy-ai's name for `type` (the same value; lib/enemyArms CLASS reads SHIP_SPECS)
  level: number;
  fit: EnemyFit; // what it carries: rolled by lib/enemyArms rollFit
  fwd: V3; // where its nose points (the AI or the fleet flies it; on the ring it is the way it goes)
  baseRadius: number; // hit radius at world scale 1
  /** Moved by something else (the fleet brains, a prize escorting the player), not by its patrol ring or the enemy AI. */
  driven?: boolean;
  /** A raider the director sent (GP-02): the key of its raid. Flown by the enemy AI as its own fleet; pays in full. */
  raid?: string;
  /** A drill target (the opening's shakedown flight): it flies `path`, not a patrol ring, and pays nothing. */
  drill?: { label: string; path: (t: number) => { pos: V3; dir: V3 } };
}

/** Something else shots can hit (conquest's sites): where it is, how big, and what a hit does. */
export interface Solid { pos: V3; radius: number; hit: (damage: number) => void }

/** The line the reticle shows: the camera's position and the way it looks through the screen's centre. */
export interface Sight { pos: V3; dir: V3 }

/** What the laser's aiming aid shows for the ship nearest the reticle. */
export interface Aim {
  craft: Craft;
  lead: V3; // aim here and a bolt fired now meets the ship (null intercept → the ship itself)
  bore: V3; // where a bolt fired now will be when it reaches the ship's range: the gun's line on screen
  miss: number; // how close a bolt fired now passes the ship
  willHit: boolean; // miss within the bolt's reach plus the ship's hit radius
}


/**
 * `shipScale` is the player ship's scale in the scene; every enemy is sized against the player ship, so a rescale
 * carries through. `uniforms` drive the cruisers' engine plumes. `extraOccluders` are cover the enemy AI may use
 * (stations, megastructures).
 */
export function createCombat(scene: THREE.Scene, geo: () => DestGeo[], opts: { uniforms: SpaceUniforms; shipScale: number; extraOccluders?: () => Occluder[] }) {
  const root = new THREE.Group();
  scene.add(root);
  const textures: THREE.Texture[] = [];
  const playerLength = SHIP_MODEL_LENGTH * opts.shipScale;
  const fleet = createFleet(opts.uniforms);

  // ---- Each nation's ships: a capital ship holding station, cruisers and fighters on their own rings ----
  const crafts: Craft[] = [];
  let nextId = 1;
  const beacons = new Map<NationId, THREE.SpriteMaterial>();
  for (const n of NATIONS) {
    const tex = glow(n.color);
    textures.push(tex);
    const beaconMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false });
    beacons.set(n.id, beaconMat);
    let seed = 0;
    for (const type of SHIP_TYPES) {
      for (let i = 0; i < n.force[type]; i++) {
        const obj = fleet.make(type, n, shipLength(type, playerLength));
        // A small light of the nation's colour, so its ships can be seen from afar.
        const beacon = new THREE.Sprite(beaconMat);
        const b = type === 'capital' ? 0.03 : 0.018;
        beacon.scale.set(b, b, 1);
        obj.add(beacon);
        root.add(obj);
        // Each ship's fit is enemy-ai's seeded roll for its nation, type and level, as arsenal's defences: craftStats.ts.
        const { fit, level, def, dodge } = craftArms(n.id, type, seed++);
        const radius = bodyRadius(type, playerLength);
        crafts.push({
          id: nextId++, nation: n.id, hostile: !n.player, type, cls: type, idx: i, of: n.force[type], maxHp: def.maxHull + def.maxShield * def.shield.length, dodge,
          radius, baseRadius: bodyRadius(type, SHIP_MODEL_LENGTH * 0.18), alive: true, pos: [0, 0, 0], vel: [0, 0, 0], offset: [0, 0, 0], dodgeVel: [0, 0, 0], dodgeT: 0, obj,
          level, fit, fwd: [0, 0, -1], def, counter: fit.counter, counterLeft: fit.charges, counterCd: 0, jam: 0,
        });
      }
    }
  }

  // ---- Each nation's special ship (races.ts, styles/specials.ts): one per nation, holding station a little astern of
  // its capital ship's post in the home patrol. Not a combatant yet: no ship type, arms or balance row exists for a
  // special, so it is scenery the guns pass through, until a thread gives specials their own spec.
  const specials = NATIONS.map((n) => {
    const length = peopleOf(n.id).ships.find((s) => s.kind === 'special')!.length;
    const obj = fleet.make('special', n, length * playerLength);
    const beacon = new THREE.Sprite(beacons.get(n.id)!);
    beacon.scale.set(0.018, 0.018, 1);
    obj.add(beacon);
    root.add(obj);
    // Astern of the capital's post by both ships' half lengths and a gap, in player-ship lengths.
    return { nation: n.id, obj, astern: SHIP_SPECS.capital.size / 2 + length / 2 + 1.5, of: n.force.capital };
  });
  const homeOfNation = (id: NationId) => geo().find((g) => g.id === NATIONS.find((n) => n.id === id)!.home);

  const stats = { kills: 0, lost: 0 }; // lost: the player's own (fleet) ships destroyed
  const lockState: LockState = noLock();
  let aim: Aim | null = null;
  let lastHit: Craft | null = null; // the ship the player hit last, for the wingmen
  const hooks: { onKill: ((c: Craft, by: 'player' | 'wing') => void) | null; solids: (() => Solid[]) | null } = { onKill: null, solids: null };
  let time = 0;
  let selected: MunitionId = 'pulse';

  const homeOf = (c: Craft) => geo().find((g) => g.id === NATIONS.find((n) => n.id === c.nation)!.home)!;

  const byId = (id: number | null) => (id === null ? undefined : crafts.find((c) => c.id === id && c.alive));
  const targetable = (c: Craft) => c.alive && c.hostile;
  const lockable = (c: Craft) => targetable(c) && c.jam <= 0; // inside its own chaff cloud it cannot be locked

  let killBy: 'player' | 'wing' = 'player';
  function kill(t: Target) {
    const c = t as Craft;
    c.alive = false;
    c.obj.visible = false;
    if (c.hostile) stats.kills++; else stats.lost++;
    const by = killBy;
    killBy = 'player';
    hooks.onKill?.(c, by);
    arsenal.blast(c.pos, 3 * Math.sqrt(SHIP_SPECS[c.type].size));
    spawnExplosion(c.pos, { color: NATIONS.find((n) => n.id === c.nation)!.color, scale: 0.6 * Math.sqrt(SHIP_SPECS[c.type].size) }); // graphics' particles
  }
  const arsenal = createArsenal(root, {
    crafts,
    insideBody: (p) => insideBody(p),
    kill,
    lock: () => ({ id: lockState.id, locked: lockState.locked }),
    onHit: (c) => { lastHit = c as Craft; if (!(c as Craft).raid) ai.provoke((c as Craft).nation); }, // a raid is at war already
    solids: () => hooks.solids?.() ?? [],
  });
  const ai = createEnemyAI(root, {
    crafts,
    arsenal,
    geo,
    homeOf: (c) => homeOf(c as Craft),
    patrolAt: (c, t) => patrolPos(homeOf(c as Craft), (c as Craft).idx, (c as Craft).of, t, (c as Craft).type),
    extraOccluders: opts.extraOccluders,
  });

  /** The hostile ship nearest the sight line, within `cone` radians and `range`. */
  function nearestTo(sight: Sight, cone: number, range: number): Craft | null {
    let best: Craft | null = null;
    let bestA = cone;
    for (const c of crafts) {
      if (!targetable(c)) continue;
      const d = dist(c.pos, sight.pos);
      if (d > range || d < 1e-6) continue;
      const a = offAngle(sight.pos, sight.dir, c.pos);
      if (a < bestA) { best = c; bestA = a; }
    }
    return best;
  }

  /**
   * The missile lock: hold the reticle on one ship for the munition's lock time (× the targeting computer's).
   * `draw` false (mc-controls R6): a munition that locks only builds its lock while it is being drawn (right button
   * held, like a bow); without the draw any lock it had lets go. Undefined keeps the old always-on lock.
   */
  function updateLock(dt: number, sight: Sight, draw?: boolean) {
    const range = arsenal.lockRange(selected);
    let under: Craft | null = null;
    let bestA = Infinity;
    for (const c of crafts) {
      if (!lockable(c) || dist(c.pos, sight.pos) > range) continue;
      if (!underReticle(sight.pos, sight.dir, c.pos, c.radius)) continue;
      const a = offAngle(sight.pos, sight.dir, c.pos);
      if (a < bestA) { under = c; bestA = a; }
    }
    const held = byId(lockState.id);
    const kept = !!held && held.jam <= 0 && dist(held.pos, sight.pos) <= range && offAngle(sight.pos, sight.dir, held.pos) <= LOCK.keep;
    if (lockState.id !== null && !held) { lockState.id = null; lockState.progress = 0; lockState.locked = false; } // it died
    const was = lockState.locked;
    // A ship in front of the Sun is hard to see: the lock builds more slowly (AI.glare).
    const sun = geo().find((g) => g.id === 'sun');
    const lockOn = byId(lockState.id) ?? under;
    const glare = !!sun && !!lockOn && inGlare(sight.pos, lockOn.pos, sun.pos, sun.size, AI.glare.cone);
    const drawn = draw !== false || arsenal.munition(selected).lock === 'none';
    stepDrawnLock(lockState, under ? under.id : null, kept, drawn, dt, arsenal.lockTime(selected) * (glare ? AI.glare.lockMul : 1));
    // Just locked: a ship carrying chaff answers with a cloud, which may break the lock. A missile lock is a hostile
    // act (the laser's lead uses the same lock state, and that one is not).
    const now = byId(lockState.id);
    if (!was && lockState.locked && now && arsenal.munition(selected).lock !== 'none') ai.provoke(now.nation);
    if (!was && lockState.locked && now && arsenal.onLocked(now)) { lockState.id = null; lockState.progress = 0; lockState.locked = false; }
  }

  /**
   * The lead indicator for the ship nearest the reticle, for the selected munition's shot speed. A beam is instant:
   * its lead is the ship itself, and it hits when the ship is on its line within reach.
   */
  function updateAim(sight: Sight, nose: V3, fwd: V3, shipSpeed: number) {
    const m = arsenal.munition(selected);
    const beam = m.delivery === 'beam';
    const speed = beam ? 1e6 : m.speed + Math.max(0, shipSpeed);
    const life = beam ? m.range / speed : m.life;
    const c = byId(lockState.id) ?? nearestTo(sight, arsenal.fitted.targeting.aimCone, speed * life);
    if (!c) { aim = null; return; }
    const hit = intercept(nose, speed, c.pos, c.vel);
    const range = dist(c.pos, nose);
    const miss = boltMiss(nose, fwd, speed, c.pos, c.vel, life);
    aim = { craft: c, lead: hit ? hit.point : c.pos, bore: add(nose, scale(unit(fwd), hit ? speed * hit.t : range)), miss, willHit: miss <= m.radius + c.radius && (!beam || range <= m.range) };
  }

  const noseOf = (shipPos: V3, fwd: V3) => add(shipPos, scale(fwd, 0.25 * arsenal.scale));

  /** Damage from outside the arsenal (the wingmen): a pulse-laser hit of `hp` on the front shield. */
  function damage(c: Craft, hp: number, by: 'player' | 'wing' = 'player') {
    if (!c.alive) return;
    if (by === 'player') lastHit = c;
    const r = applyHit(c.def, MUNITIONS.pulse, hp, 0);
    if (r.killed || c.def.hull <= 0) { killBy = by; kill(c); }
  }

  /** A ship that something else flies (fleet command): placed where its `pos` and `fwd` say each frame. */
  function spawn(type: ShipType, nation: NationId, pos: V3, fwd: V3, lvl?: number): Craft {
    const n = NATIONS.find((x) => x.id === nation)!;
    const obj = fleet.make(type, n, shipLength(type, playerLength));
    const beacon = new THREE.Sprite(beacons.get(nation)!);
    const b = type === 'capital' ? 0.03 : type === 'cruiser' ? 0.018 : 0.012;
    beacon.scale.set(b, b, 1);
    obj.add(beacon);
    root.add(obj);
    const { fit, level, def, dodge } = craftArms(nation, type, nextId, lvl);
    const radius = bodyRadius(type, playerLength);
    const c: Craft = {
      id: nextId++, nation, hostile: !n.player, type, cls: type, idx: 0, of: 1, maxHp: def.maxHull + def.maxShield * def.shield.length, dodge,
      radius, baseRadius: bodyRadius(type, SHIP_MODEL_LENGTH * 0.18), alive: true, pos: [...pos], vel: [0, 0, 0], offset: [0, 0, 0], dodgeVel: [0, 0, 0], dodgeT: 0, obj,
      level, fit, fwd: unit(fwd), def, counter: fit.counter, counterLeft: fit.charges, counterCd: 0, jam: 0, driven: true,
    };
    crafts.push(c);
    place(obj, c.pos, c.fwd);
    return c;
  }
  /**
   * A raid (GP-02): `force` ships of `nation`, put out `range` from `near` on the side `from` lies (where they came
   * from), noses on the player, and handed to the enemy AI engaged. Returns the raiders; `dropRaid` takes one away.
   * `level` overrides the nation's fit level (the first raid's pickets are level 1).
   */
  function raid(nation: NationId, force: Partial<Record<ShipType, number>>, near: V3, from: V3, range: number, level?: number): Craft[] {
    const key = `raid:${nextId}`;
    const out: Craft[] = [];
    const dir = unit(sub(from, near));
    const side = unit(Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [dir[2], 0, -dir[0]]);
    let i = 0;
    for (const type of SHIP_TYPES) for (let n = 0; n < (force[type] ?? 0); n++, i++) {
      const spread = (i - 0.5) * range * 0.12;
      const pos = add(add(near, scale(dir, range)), scale(side, spread));
      const c = spawn(type, nation, pos, scale(dir, -1), level);
      c.driven = false;
      c.raid = key;
      ai.adopt(c, key);
      out.push(c);
    }
    return out;
  }
  function dropRaid(c: Craft) {
    ai.release(c.id);
    if (lastHit === c) lastHit = null;
    remove(c);
  }
  /** Take a ship out of the scene (docked in a bay, say). */
  function remove(c: Craft) {
    const i = crafts.indexOf(c);
    if (i >= 0) crafts.splice(i, 1);
    root.remove(c.obj);
  }
  /** Take a ship out of the fight without a blast or a kill (a save says it is already dead). */
  function retire(c: Craft) {
    c.alive = false;
    c.obj.visible = false;
    if (lastHit === c) lastHit = null;
  }
  /** Bring a dead ship back at full strength, launching from `from` and easing out onto its patrol ring (conquest). */
  function revive(c: Craft, from?: V3) {
    c.alive = true;
    const d = c.def;
    d.hull = d.maxHull; d.shield = d.shield.map(() => d.maxShield); d.since = d.since.map(() => 99); d.disabled = 0;
    c.counterLeft = c.fit.charges;
    c.obj.visible = true;
    c.dodgeT = 0;
    c.dodgeVel = [0, 0, 0];
    const ring = patrolPos(homeOf(c), c.idx, c.of, time, c.type);
    c.offset = from ? sub(from, ring) : [0, 0, 0];
    c.pos = add(ring, c.offset);
    c.vel = [0, 0, 0];
  }

  /** The trigger, every frame: fires the selected munition at its rate while held (a beam, continuously). */
  function trigger(weapon: MunitionId, held: boolean, shipPos: V3, fwd: V3, shipSpeed: number, dt = 1 / 60, guide?: number) {
    selected = weapon;
    arsenal.trigger(weapon, held, shipPos, fwd, shipSpeed, dt, guide);
  }

  const place = (o: THREE.Object3D, p: V3, v: V3) => {
    o.position.set(...p);
    const d = unit(v);
    o.lookAt(p[0] - d[0], p[1] - d[1], p[2] - d[2]); // models point down −z
  };
  const insideBody = (p: V3) => geo().some((g) => g.size > 0 && dist(p, g.pos) < g.size);

  /**
   * `sight` is the reticle's line (defaults to the nose); `shipSpeed` sets the bolt speed for the lead. `aimOpts.gun`
   * is the line the guns fire along when it is not the nose (mouse aim, R5); `aimOpts.draw` whether a lock is being
   * drawn (R6).
   */
  function update(dt: number, shipPos: V3, fwd: V3, sight: Sight = { pos: shipPos, dir: fwd }, shipSpeed = 0, aimOpts: { gun?: V3; draw?: boolean } = {}) {
    time += dt;
    // Ships: along their patrol ring, plus any dodge they are in the middle of. A disabled ship (ion) holds where it
    // is; once it recovers, the offset eases it back onto its ring.
    const k = arsenal.scale;
    for (const c of crafts) {
      if (!c.alive) continue;
      c.radius = c.baseRadius * k;
      if (c.drill) {
        const at = c.drill.path(time);
        if (dt > 0 && time > dt) c.vel = scale(sub(at.pos, c.pos), 1 / dt);
        c.pos = at.pos;
        place(c.obj, c.pos, at.dir);
        c.obj.rotateZ(time * 1.5);
        continue;
      }
      if (c.driven) { place(c.obj, c.pos, c.fwd); continue; } // the fleet brains fly it
      if (ai.isFree(c.id)) continue; // engaged or flying home: enemyAI.ts flies it
      const home = homeOf(c);
      const p = patrolPos(home, c.idx, c.of, time, c.type);
      if (c.def.disabled > 0) { c.offset = sub(c.pos, p); c.vel = [0, 0, 0]; continue; }
      if (c.dodgeT > 0) { c.offset = add(c.offset, scale(c.dodgeVel, dt)); c.dodgeT -= dt; } else c.offset = scale(c.offset, Math.exp(-dt * 0.6));
      const was = c.pos;
      c.pos = add(p, c.offset);
      if (dt > 0 && time > dt) c.vel = scale(sub(c.pos, was), 1 / dt);
      c.fwd = unit(patrolDir(home, c.idx, c.of, time, c.type));
      place(c.obj, c.pos, c.fwd);
    }
    for (const sp of specials) {
      const home = homeOfNation(sp.nation);
      if (!home) continue;
      const dir = unit(patrolDir(home, 0, sp.of, time, 'capital'));
      place(sp.obj, sub(patrolPos(home, 0, sp.of, time, 'capital'), scale(dir, sp.astern * playerLength)), dir);
    }
    fleet.update(dt, time);
    ai.update(dt, shipPos, fwd, shipSpeed, false);
    updateLock(dt, sight, aimOpts.draw);
    updateAim(sight, noseOf(shipPos, fwd), aimOpts.gun ?? fwd, shipSpeed);

    arsenal.update(dt, shipPos, fwd);
  }

  // ---- Drill targets: slow orange buoys for the shakedown flight, circling a point in front of the ship ----
  const drillMat = new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xff5a10, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.5 });
  const drillRing = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.2, 0.3) });
  const drillLength = shipLength('cruiser', playerLength);
  const drillTex = glow('rgba(255,170,60,1)');
  textures.push(drillTex);
  const drillGeo = new THREE.OctahedronGeometry(drillLength * 0.35, 0);
  const drillRingGeo = new THREE.TorusGeometry(drillLength * 0.55, drillLength * 0.03, 6, 32);
  function drillModel() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(drillGeo, drillMat));
    g.add(new THREE.Mesh(drillRingGeo, drillRing));
    const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: drillTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }));
    beacon.scale.set(0.022, 0.022, 1);
    g.add(beacon);
    return g;
  }
  /**
   * Put `n` drill targets on a slow circle of radius `r` round `centre()`, facing `face` (the way the ship looked when
   * they were put out), so the laser's lead has something moving to lead. `centre` is a function so the buoys can keep
   * station off the ship's bow while it drifts in orbit. Each takes three bolts or one missile. `nation` is whose they
   * count as (the player's: they are the player's own yard's buoys, flagged hostile for the drill).
   */
  function addDrill(centre: () => V3, face: V3, n: number, nation: NationId, r = 6, speed = 4) {
    const f = unit(face);
    const side = unit(Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [f[2], 0, -f[0]]);
    const up: V3 = [side[1] * f[2] - side[2] * f[1], side[2] * f[0] - side[0] * f[2], side[0] * f[1] - side[1] * f[0]];
    const w = speed / r;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const path = (t: number) => {
        const a = a0 + t * w;
        const pos = add(centre(), add(scale(side, Math.cos(a) * r), scale(up, Math.sin(a) * r)));
        const dir = add(scale(side, -Math.sin(a)), scale(up, Math.cos(a)));
        return { pos, dir };
      };
      const obj = drillModel();
      root.add(obj);
      // Arms and defences as a fighter's (craftStats), so the arsenal can hit it; it never dodges.
      const { fit, level, def } = craftArms(nation, 'fighter', nextId);
      const at = path(time);
      crafts.push({
        id: nextId++, nation, hostile: true, type: 'fighter', cls: 'fighter', idx: i, of: n, maxHp: def.maxHull + def.maxShield * def.shield.length, dodge: 0,
        radius: bodyRadius('cruiser', playerLength) * 1.5, baseRadius: bodyRadius('cruiser', SHIP_MODEL_LENGTH * 0.18) * 1.5, alive: true, pos: at.pos, vel: [0, 0, 0], offset: [0, 0, 0], dodgeVel: [0, 0, 0], dodgeT: 0, obj,
        level, fit, fwd: unit(at.dir), def, counter: null, counterLeft: 0, counterCd: 0, jam: 0,
        drill: { label: 'Drill target', path },
      });
    }
  }
  function clearDrill() {
    for (let i = crafts.length - 1; i >= 0; i--) {
      const c = crafts[i];
      if (!c.drill) continue;
      root.remove(c.obj);
      c.obj.traverse((o) => { if (o instanceof THREE.Sprite) o.material.dispose(); });
      crafts.splice(i, 1);
    }
    if (lockState.id !== null && !byId(lockState.id)) { lockState.id = null; lockState.progress = 0; lockState.locked = false; }
  }
  const drillLeft = () => crafts.filter((c) => c.drill && c.alive);

  return {
    crafts,
    /** Each nation's special ship, on its home ring (scenery for now: not in `crafts`). */
    specials,
    arsenal,
    ai,
    geo,
    stats,
    /** Placeholder end of the lost state (the player's hull reached zero): refit and a short grace. */
    respawn: () => arsenal.respawn(),
    /** Let go of the lock (a drawn missile has been loosed, R6). */
    clearLock: () => { lockState.id = null; lockState.progress = 0; lockState.locked = false; },
    /** eve-controls (E6): the lock is the player's active locked target, held by controls/targets.ts. */
    setLock: (id: number | null, progress = 0, locked = false) => { lockState.id = id; lockState.progress = progress; lockState.locked = locked; },
    /** The ship the missile lock is on (acquiring or held), how far along, and whether it is held. */
    get lock() { const c = byId(lockState.id); return c ? { craft: c, progress: lockState.progress, locked: lockState.locked } : null; },
    get aim() { return aim; },
    get lastHit() { return lastHit && lastHit.alive ? lastHit : null; },
    hooks,
    root,
    damage,
    retire,
    revive,
    get time() { return time; },
    trigger,
    addDrill,
    clearDrill,
    drillLeft,
    update,
    get selected() { return selected; },
    spawn,
    remove,
    raid,
    dropRaid,
    playerLength,
    dispose: () => { clearDrill(); textures.forEach((t) => t.dispose()); fleet.dispose(); arsenal.dispose(); ai.dispose(); drillGeo.dispose(); drillRingGeo.dispose(); drillMat.dispose(); drillRing.dispose(); },
  };
}

export type Combat = ReturnType<typeof createCombat>;
