/**
 * The arsenal in the scene: every munition the player fires, the shields on every ship (with their hit flash), the
 * player's capacitor, ammunition, drones and countermeasures, and the enemies' flares and chaff. The rules live in
 * lib/munitions, lib/shields, lib/tech and lib/modules; this file moves things, applies those rules and draws them.
 *
 * Enemies shoot back (2026-10-18, thread enemy-ai): `enemyFire` and `enemyBeam` take an enemy ship's shot from
 * components/enemyAI.ts and run it through the same munitions and the same shield/hull split, so the player's shield,
 * flares, chaff, jammer, point defence and repair drone all matter. `incoming()` is still the dev hook for one hostile
 * test missile. When the player's hull reaches zero the ship is "lost": a placeholder state (no lore, no penalty)
 * that Voyage ends with `respawn()`.
 */
import * as THREE from 'three';
import type { Fitted, Loadout } from '../lib/modules';
import { defaultLoadout, fitted as fitOf } from '../lib/modules';
import type { Munition, MunitionId } from '../lib/munitions';
import { MUNITIONS, MUNITION_IDS, areaFalloff, fireBlock, flakBursts, homes, mineTriggers, salvoDirs, scaleMunition } from '../lib/munitions';
import type { V3 } from '../lib/nav';
import { add, closest, dist, scale, sub, unit } from '../lib/nav';
import type { Defence, HitResult } from '../lib/shields';
import { applyHit, drawShield, facetOf, makeDefence, regenerate, shieldFrac } from '../lib/shields';
import { GUARD, guardDrain, guarded, inFrontArc } from '../lib/guard';
import type { CounterId, DroneId } from '../lib/tech';
import { COUNTERS, DRONES, decoyVisible, droneOffset, flareVel, nearestWithin, recharge, repairStep, spoofed } from '../lib/tech';
import type { Missile } from '../lib/weapons';
import { DODGE, MISSILE, dodgeDir, intercept, stepMissile, sweptHit, turnToward, wantsDodge } from '../lib/weapons';
import { AI } from '../lib/aiKnobs';

/** What the arsenal needs of a ship it can hit. combat.ts's Craft has all of this. */
export interface Target {
  id: number;
  alive: boolean;
  hostile: boolean;
  pos: V3;
  vel: V3;
  radius: number;
  def: Defence;
  counter: CounterId | null; // its countermeasure, if it carries one
  counterLeft: number;
  counterCd: number;
  jam: number; // seconds left inside its own chaff cloud: it cannot be locked
  dodgeVel: V3;
  dodgeT: number;
  dodge?: number; // its chance to sidestep a missile (ship type × its fit); DODGE_CHANCE when unset
  fwd?: V3; // where its nose points, when that is not where it is going (a warship backing off)
}

export interface ArsenalWorld {
  crafts: Target[];
  insideBody: (p: V3) => boolean;
  kill: (c: Target) => void;
  lock: () => { id: number | null; locked: boolean };
  onHit?: (c: Target) => void; // the player hit this ship: its nation takes offence, and the wingmen follow it
  /** Other things the player's shots and missiles can hit (conquest's ground sites): a hit lands its full damage. */
  solids?: () => { pos: V3; radius: number; hit: (damage: number) => void }[];
}

export interface MunitionStats { shots: number; hits: number; shield: number; hull: number; disables: number; kills: number; bursts: number }
const zero = (): MunitionStats => ({ shots: 0, hits: 0, shield: 0, hull: 0, disables: 0, kills: 0, bursts: 0 });

const PLAYER_HULL = 100;
const PLAYER_R = 0.35; // the player's hit radius (the model is about 0.37 long at SHIP 0.18)
/**
 * The player's shots burst within this of a ship (a proximity fuse), so a ship counts as at least this wide to them.
 * A fighter's body is 0.17 after the x5 ship shrink: with the 0.2 bolt that was a quarter of a degree at 80 units,
 * which a jinking fighter left before the bolt arrived (5% of shots hit in a tracked fight). 0.5 is a cruiser's body.
 */
const FUSE_R = 0.5;
/**
 * The player's guided missiles: a proximity fuse (the blast drawn on a hit, and the decoy's catch radius), and homing
 * that lets go this close (units, × k) rather than at the munition's own homingOff. Both were set before ships shrunk
 * x5: letting go at 22 units, a 75 u/s fighter was gone before the missile arrived and 24 of 24 seekers missed. Caleb's
 * ruling stays whole: they home, let go and run straight in, "unless they dodge last second" (the dodge roll is kept).
 */
const MISSILE_FUSE = 1.5;
/**
 * Fire control (E6): a bolt fired at the active target (selected and inside the gun arc) bends toward it in flight at
 * up to this rate (rad/s). Ballistic leads lost to a fighter's turn: one starting a 2 rad/s turn 140 units out is
 * somewhere else by the time a 0.5 s bolt arrives, and 5% of tracked shots hit. Shots without a target stay ballistic.
 */
const GUIDE_TURN = 4;
const PLAYER_LET_GO = 6;
const DODGE_CHANCE = 0.35;
const FLARE_REACT = 60; // an enemy with flares drops one when a missile homing on it comes this close
const BEAM_COLOR = new THREE.Color(3, 1.6, 0.6);

export function glow(color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Shot { m: Munition; pos: V3; vel: V3; age: number; obj: THREE.Object3D; drone: boolean; hostile?: boolean; from?: number; guide?: number }
interface Flying extends Missile { m: Munition; obj: THREE.Object3D; dodgeRolled: Set<number>; decoy: Decoy | null; seen: Set<Decoy>; hostile: boolean; dead: boolean; test?: boolean; from?: number; grade?: number }
interface EnemyBeam { mesh: THREE.Mesh; at: number }
interface Decoy { kind: 'flare' | 'chaff'; pos: V3; vel: V3; age: number; life: number; sprite: THREE.Sprite; player: boolean }
interface Fx { t: number; life: number; obj: THREE.Object3D; size: number; grow: boolean; dispose: () => void }
interface DroneBody { id: DroneId; obj: THREE.Mesh; pos: V3; cd: number }
interface Bubble { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; flash: number }

export function createArsenal(root: THREE.Group, world: ArsenalWorld) {
  const textures: THREE.Texture[] = [];
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const tex = (c: string) => { const t = glow(c); textures.push(t); return t; };
  const sprMat = (t: THREE.Texture) => { const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); mats.push(m); return m; };
  const g = <T extends THREE.BufferGeometry>(x: T) => { geos.push(x); return x; };
  const additive = (color: THREE.Color | string, opacity = 0.95) => { const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }); mats.push(m); return m; };

  // ---- Looks ----
  const pulseGeo = g(new THREE.BoxGeometry(0.05, 0.05, 1.6));
  const pulseMat = additive(new THREE.Color(3, 0.5, 0.4));
  const railGeo = g(new THREE.BoxGeometry(0.025, 0.025, 4));
  const railMat = additive(new THREE.Color(2.2, 2.6, 3.2));
  const plasmaMat = sprMat(tex('rgba(90,255,190,1)'));
  const ionMat = sprMat(tex('rgba(110,170,255,1)'));
  const flakMat = sprMat(tex('rgba(255,230,120,1)'));
  const droneShotMat = sprMat(tex('rgba(255,150,90,1)'));
  const missileGeo = g(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8));
  missileGeo.rotateX(Math.PI / 2);
  const missileMat = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 0.6, roughness: 0.4, emissive: 0x222222 });
  const hostileMat = new THREE.MeshStandardMaterial({ color: 0x552222, metalness: 0.6, roughness: 0.4, emissive: 0x330000 });
  mats.push(missileMat, hostileMat);
  const flameMat = sprMat(tex('rgba(255,170,60,1)'));
  const redFlameMat = sprMat(tex('rgba(255,60,60,1)'));
  const mineGeo = g(new THREE.IcosahedronGeometry(0.18, 0));
  const mineMat = new THREE.MeshStandardMaterial({ color: 0x331111, emissive: 0xff2a1a, emissiveIntensity: 1, metalness: 0.5, roughness: 0.5 });
  mats.push(mineMat);
  const beamGeo = g(new THREE.CylinderGeometry(0.03, 0.03, 1, 6));
  beamGeo.rotateX(Math.PI / 2);
  const beamMesh = new THREE.Mesh(beamGeo, additive(BEAM_COLOR, 0.9));
  beamMesh.visible = false;
  root.add(beamMesh);
  const blastTex = tex('rgba(255,140,40,1)');
  const sparkTex = tex('rgba(255,200,120,1)');
  const flareTex = tex('rgba(255,250,210,1)');
  const chaffTex = tex('rgba(190,200,215,1)');
  const bubbleGeo = g(new THREE.SphereGeometry(1, 24, 16));
  const droneGeo = g(new THREE.OctahedronGeometry(0.1, 0));

  const shotObj = (m: Munition, drone: boolean): THREE.Object3D => {
    if (drone) { const s = new THREE.Sprite(droneShotMat); s.scale.setScalar(0.35); return s; }
    switch (m.id) {
      case 'rail': return new THREE.Mesh(railGeo, railMat);
      case 'plasma': { const s = new THREE.Sprite(plasmaMat); s.scale.setScalar(1.1); return s; }
      case 'ion': { const s = new THREE.Sprite(ionMat); s.scale.setScalar(0.8); return s; }
      case 'flak': { const s = new THREE.Sprite(flakMat); s.scale.setScalar(0.45); return s; }
      case 'mine': return new THREE.Mesh(mineGeo, mineMat);
      default: return new THREE.Mesh(pulseGeo, pulseMat);
    }
  };
  const missileObj = (m: Munition, hostile: boolean) => {
    const o = new THREE.Group();
    o.add(new THREE.Mesh(missileGeo, hostile ? hostileMat : missileMat));
    const flame = new THREE.Sprite(hostile ? redFlameMat : flameMat);
    flame.scale.set(0.5, 0.5, 1);
    flame.position.z = 0.3;
    o.add(flame);
    o.scale.setScalar(m.id === 'torpedo' ? 2.4 : m.id === 'swarm' ? 0.6 : 1);
    return o;
  };

  // ---- State ----
  let k = 1; // world scale: every distance and speed is × k
  let M: Record<MunitionId, Munition> = { ...MUNITIONS };
  let droneShot: Munition = { ...MUNITIONS.pulse, damage: DRONES.attack.damage, speed: 220, life: 0.6 };
  let fitted: Fitted = fitOf(defaultLoadout());
  const player = {
    def: makeDefence(fitted.shield, PLAYER_HULL, fitted.shieldTier, fitted.armour),
    energy: fitted.reactor.capacity,
    ammo: {} as Partial<Record<MunitionId, number>>,
    counterLeft: 0,
    counterCd: 0,
    block: null as string | null,
    guard: false, // the forward shield block is up (mc-controls R6, lib/guard.ts)
    pos: [0, 0, 0] as V3,
    fwd: [0, 0, -1] as V3,
    down: false, // ship lost (placeholder state) until respawn()
    grace: 0, // seconds after a respawn in which nothing can hurt it
    jam: 0, // seconds left in the player's own chaff cloud: enemies cannot lock it
    chaffs: 0, // chaff clouds dropped so far (enemy locks roll against each new one)
    threat: { locking: 0, locked: 0 }, // enemy locks on the player, written by enemyAI each frame
  };
  let loadout: Loadout = defaultLoadout();
  let enemyMul = AI.damageMul;
  const stats = Object.fromEntries(MUNITION_IDS.map((id) => [id, zero()])) as Record<MunitionId, MunitionStats>;
  const enemy = Object.fromEntries(MUNITION_IDS.map((id) => [id, zero()])) as Record<MunitionId, MunitionStats>;
  const enemyBy = new Map<number, { shots: number; hits: number; shield: number; hull: number }>();
  const extra = { blocked: 0, hurt: 0, landed: 0, hurtFrom: [0, 0, -1] as V3, deaths: 0, enemyDrone: zero(), enemyPdKills: 0, enemyFlakKills: 0, droneShots: 0, drone: zero(), repaired: { hull: 0, shield: 0 }, pdShots: 0, pdKills: 0, flakKills: 0, spoofs: 0, playerSpoofs: 0, chaffBreaks: 0, flares: 0, chaff: 0, enemyFlares: 0, enemyChaff: 0, dodges: 0, incoming: 0, playerHits: 0, player: { shield: 0, hull: 0 } };
  const shots: Shot[] = [];
  const missiles: Flying[] = [];
  const decoys: Decoy[] = [];
  const fx: Fx[] = [];
  const drones: DroneBody[] = [];
  const bubbles = new Map<number, Bubble>();
  const enemyBeams = new Map<number, EnemyBeam>();
  let cooldown = 0;
  let beamOn = false;
  let beamTarget: number | null = null;
  let time = 0;

  const makeBubble = (color: string): Bubble => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(bubbleGeo, mat);
    mesh.visible = false;
    root.add(mesh);
    return { mesh, mat, flash: 0 };
  };
  const bubbleOf = (c: Target) => { let b = bubbles.get(c.id); if (!b) { b = makeBubble(c.def.tech.color); bubbles.set(c.id, b); } return b; };
  const playerBubble = makeBubble(fitted.shield.color);

  const place = (o: THREE.Object3D, p: V3, v: V3) => {
    o.position.set(...p);
    const d = unit(v);
    o.lookAt(p[0] - d[0], p[1] - d[1], p[2] - d[2]); // models point down −z
  };

  function spawnFx(pos: V3, map: THREE.Texture, size: number, life: number, grow = true) {
    const mat = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const s = new THREE.Sprite(mat);
    s.position.set(...pos);
    root.add(s);
    fx.push({ t: 0, life, obj: s, size, grow, dispose: () => mat.dispose() });
  }
  function tracer(a: V3, b: V3, color: string) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.Line(geo, mat);
    root.add(line);
    fx.push({ t: 0, life: 0.12, obj: line, size: 1, grow: false, dispose: () => { geo.dispose(); mat.dispose(); } });
  }

  // ---- Loadout and scale ----
  function rebuildDrones() {
    for (const d of drones) root.remove(d.obj);
    drones.length = 0;
    fitted.drones.forEach((id) => {
      const mat = new THREE.MeshStandardMaterial({ color: DRONES[id].color, emissive: DRONES[id].color, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.5 });
      mats.push(mat);
      const obj = new THREE.Mesh(droneGeo, mat);
      obj.scale.setScalar(k);
      root.add(obj);
      drones.push({ id, obj, pos: player.pos, cd: 0 });
    });
  }
  /** Fit a loadout: rebuilds the shield, refills the capacitor and ammunition, launches the drones. */
  function setLoadout(l: Loadout) {
    loadout = l;
    fitted = fitOf(l);
    player.def = makeDefence(fitted.shield, PLAYER_HULL, fitted.shieldTier, fitted.armour);
    player.energy = fitted.reactor.capacity;
    player.ammo = Object.fromEntries(fitted.weapons.filter((w) => MUNITIONS[w].ammo !== null).map((w) => [w, MUNITIONS[w].ammo!]));
    player.counterLeft = fitted.counter ? COUNTERS[fitted.counter].charges ?? 0 : 0;
    player.counterCd = 0;
    playerBubble.mat.color.set(fitted.shield.color);
    rebuildDrones();
  }
  setLoadout(defaultLoadout());
  /** Rescale every distance and speed (planet scale): k = 1 is the scale these numbers were written for. */
  function setScale(s: number) {
    k = s;
    M = Object.fromEntries(MUNITION_IDS.map((id) => [id, scaleMunition(MUNITIONS[id], s)])) as Record<MunitionId, Munition>;
    droneShot = scaleMunition({ ...MUNITIONS.pulse, damage: DRONES.attack.damage, speed: 220, life: 0.6 }, s);
    for (const d of drones) d.obj.scale.setScalar(s);
  }

  // ---- Hits ----
  const live = () => world.crafts.filter((c) => c.alive && c.hostile);
  const byId = (id: number | null) => (id === null ? undefined : world.crafts.find((c) => c.id === id && c.alive));

  function hitCraft(c: Target, m: Munition, amount: number, from: V3, drone = false): HitResult {
    const facet = facetOf(c.def, c.fwd ?? unit(c.vel), from);
    const r = applyHit(c.def, m, amount, facet);
    if (!drone && c.hostile && r.toShield + r.toHull > 0) extra.landed++; // the hitmarker's count (mc-controls R12)
    const s = drone ? extra.drone : stats[m.id];
    s.shield += r.toShield;
    s.hull += r.toHull;
    if (r.disabled) s.disables++;
    if (r.toShield > 0) { const b = bubbleOf(c); b.flash = 1; b.mat.color.set(c.def.tech.color); }
    if (r.toHull > 0.5) spawnFx(c.pos, sparkTex, 0.6 * k, 0.25);
    if (c.alive) world.onHit?.(c);
    if (r.killed && c.alive) { s.kills++; world.kill(c); }
    return r;
  }
  const NO_HIT: HitResult = { toShield: 0, toHull: 0, shieldDown: false, killed: false, disabled: false };
  /** A hit on the player. `by` is the enemy ship that fired it (for its stats); nothing lands while lost or in grace. */
  function hitPlayer(m: Munition, amount: number, from: V3, by?: number) {
    if (player.down || player.grace > 0) return NO_HIT;
    const blocked = player.guard && inFrontArc(player.fwd, from);
    if (blocked) { extra.blocked += amount * GUARD.reduce; playerBubble.flash = 1; }
    const r = applyHit(player.def, m, guarded(amount, player.guard, player.fwd, from), facetOf(player.def, player.fwd, from));
    if (r.toShield + r.toHull > 0) { extra.hurt++; extra.hurtFrom = from; }
    if (by !== undefined) {
      const e = enemy[m.id];
      e.hits++; e.shield += r.toShield; e.hull += r.toHull;
      const s = enemyBy.get(by) ?? { shots: 0, hits: 0, shield: 0, hull: 0 };
      s.hits++; s.shield += r.toShield; s.hull += r.toHull;
      enemyBy.set(by, s);
    }
    if (r.killed && !player.down) { player.down = true; extra.deaths++; spawnFx(player.pos, blastTex, 4 * k, 1.2); }
    extra.playerHits++;
    extra.player.shield += r.toShield;
    extra.player.hull += r.toHull;
    if (r.toShield > 0) playerBubble.flash = 1;
    if (r.toHull > 0.5) spawnFx(player.pos, sparkTex, 0.6 * k, 0.25);
    return r;
  }

  /**
   * An area burst: every hostile ship in reach takes damage by falloff; hostile missiles in it are destroyed.
   * An enemy's burst (`by` set) instead hurts the player by falloff and destroys the player's missiles in it.
   */
  function burst(pos: V3, m: Munition, by?: number) {
    if (by !== undefined) {
      enemy[m.id].bursts++;
      const d = Math.max(0, dist(pos, player.pos) - PLAYER_R * k);
      const f = areaFalloff(d, m.area);
      if (f > 0) hitPlayer(m, m.damage * f * enemyMul, unit(sub(pos, player.pos)), by);
      for (const x of missiles) if (!x.hostile && !x.dead && dist(x.pos, pos) <= m.area) { x.dead = true; extra.enemyFlakKills++; }
      spawnFx(pos, blastTex, m.area * 0.6, 0.6);
      return;
    }
    stats[m.id].bursts++;
    for (const c of live()) {
      const d = Math.max(0, dist(pos, c.pos) - c.radius);
      const f = areaFalloff(d, m.area);
      if (f <= 0) continue;
      hitCraft(c, m, m.damage * f, unit(sub(pos, c.pos)));
      stats[m.id].hits++;
    }
    for (const f of missiles) if (f.hostile && !f.dead && dist(f.pos, pos) <= m.area) { f.dead = true; extra.flakKills++; }
    spawnFx(pos, blastTex, m.area * 0.6, 0.6);
  }

  // ---- Energy ----
  const available = () => player.energy + (player.def.tech.draw ? player.def.shield[0] : 0);
  function pay(cost: number) {
    if (player.energy >= cost) { player.energy -= cost; return; }
    const need = cost - player.energy;
    player.energy = 0;
    drawShield(player.def, need); // only a capacitor shield gives anything; fireBlock already checked there is enough
  }

  // ---- Firing ----
  const noseOf = (shipPos: V3, fwd: V3) => add(shipPos, scale(fwd, 0.25 * k));

  function launch(m: Munition, shipPos: V3, fwd: V3, shipSpeed: number, guide?: number) {
    const nose = noseOf(shipPos, fwd);
    if (m.delivery === 'bolt' || m.delivery === 'burst') {
      const obj = shotObj(m, false);
      root.add(obj);
      shots.push({ m, pos: nose, vel: scale(unit(fwd), m.speed + Math.max(0, shipSpeed)), age: 0, obj, drone: false, guide: m.delivery === 'bolt' ? guide : undefined });
    } else if (m.delivery === 'mine') {
      const obj = shotObj(m, false);
      obj.scale.setScalar(k);
      root.add(obj);
      shots.push({ m, pos: add(shipPos, scale(fwd, -0.5 * k)), vel: scale(unit(fwd), m.speed), age: 0, obj, drone: false });
    } else if (m.delivery === 'missile') {
      const lk = world.lock();
      const target = homes(m, lk.locked) ? lk.id : null; // without a held lock it flies straight where it was pointed
      const dirs = m.salvo ? salvoDirs(fwd, m.salvo.count, m.salvo.spread) : [unit(fwd)];
      const sp = Math.max(8 * k, shipSpeed);
      for (const d of dirs) {
        const obj = missileObj(m, false);
        root.add(obj);
        missiles.push({ m, pos: nose, vel: scale(d, sp), speed: sp, age: 0, target, homing: target !== null, obj, dodgeRolled: new Set(), decoy: null, seen: new Set(), hostile: false, dead: false });
      }
    }
  }

  function fireBeam(m: Munition, shipPos: V3, fwd: V3, dt: number) {
    const nose = noseOf(shipPos, fwd);
    const end = add(nose, scale(unit(fwd), m.range));
    let best: Target | null = null;
    let bt = 1;
    for (const c of live()) {
      const h = closest(nose, end, c.pos);
      if (h.d <= m.radius + c.radius && h.t < bt) { best = c; bt = h.t; }
    }
    const tip = add(nose, scale(sub(end, nose), bt));
    beamMesh.visible = true;
    const mid = scale(add(nose, tip), 0.5);
    place(beamMesh, mid, fwd);
    beamMesh.scale.set(k, k, Math.max(0.01, dist(nose, tip)));
    if (best) {
      if (beamTarget !== best.id) { stats.beam.hits++; beamTarget = best.id; }
      hitCraft(best, m, m.damage * dt, scale(unit(fwd), -1));
    } else beamTarget = null;
  }

  /** The trigger, every frame. Fires `id` at its rate while held, if it is fitted and has the energy, ammo and lock. */
  function trigger(id: MunitionId, held: boolean, shipPos: V3, fwd: V3, shipSpeed: number, dt: number, guide?: number) {
    const m = M[id];
    const wasBeam = beamOn;
    beamOn = false;
    beamMesh.visible = false;
    if (!held) { player.block = null; beamTarget = null; return; }
    if (player.down) { player.block = 'ship lost'; return; }
    if (player.def.disabled > 0) { player.block = 'disabled'; return; }
    if (!fitted.weapons.includes(id)) { player.block = 'not fitted'; return; }
    const block = fireBlock(m, { energy: available(), ammo: m.ammo === null ? null : player.ammo[id] ?? 0, locked: world.lock().locked }, dt);
    player.block = block;
    if (block) return;
    if (m.delivery === 'beam') {
      if (!wasBeam) stats.beam.shots++;
      beamOn = true;
      pay(m.energy * dt);
      fireBeam(m, shipPos, fwd, dt * (player.guard ? GUARD.rateMul : 1)); // under the block the beam does a share of its damage
      return;
    }
    if (cooldown > 0) return;
    pay(m.energy);
    if (m.ammo !== null) player.ammo[id] = (player.ammo[id] ?? 0) - 1;
    cooldown = 1 / (m.rate * (player.guard ? GUARD.rateMul : 1)); // the block slows the gun in hand
    stats[id].shots++;
    launch(m, shipPos, fwd, shipSpeed, guide);
  }

  // ---- Countermeasures ----
  function dropDecoy(kind: 'flare' | 'chaff', pos: V3, vel: V3, heading: V3, isPlayer: boolean) {
    const cm = COUNTERS[kind];
    const sprite = new THREE.Sprite(sprMat(kind === 'flare' ? flareTex : chaffTex));
    sprite.scale.setScalar((kind === 'flare' ? 1.2 : 3) * k);
    sprite.position.set(...pos);
    root.add(sprite);
    const d: Decoy = { kind, pos, vel: kind === 'flare' ? flareVel(vel, heading) : scale(vel, 0.3), age: 0, life: cm.life, sprite, player: isPlayer };
    decoys.push(d);
    return d;
  }
  /** The player's countermeasure (C): drops a flare or chaff. The jammer is passive and has nothing to drop. */
  function countermeasure(shipPos: V3, fwd: V3, shipSpeed: number): boolean {
    const id = fitted.counter;
    if (!id || id === 'jammer' || player.counterLeft <= 0 || player.counterCd > 0 || player.down || player.def.disabled > 0) return false;
    player.counterLeft--;
    player.counterCd = COUNTERS[id].cooldown;
    dropDecoy(id, add(shipPos, scale(fwd, -0.4 * k)), scale(fwd, shipSpeed), fwd, true);
    if (id === 'flare') extra.flares++; else { extra.chaff++; player.chaffs++; player.jam = COUNTERS.chaff.life; }
    return true;
  }
  /**
   * The player just locked craft `c`. If it carries chaff it drops a cloud, which breaks the lock unless the
   * targeting computer sees through it. Returns true when the lock is broken.
   */
  function onLocked(c: Target): boolean {
    if (c.counter !== 'chaff' || c.counterLeft <= 0 || c.counterCd > 0 || c.def.disabled > 0) return false;
    c.counterLeft--;
    c.counterCd = COUNTERS.chaff.cooldown;
    dropDecoy('chaff', c.pos, c.vel, unit(c.vel), false);
    extra.enemyChaff++;
    if (!spoofed(COUNTERS.chaff.pull, fitted.targeting.seeker, Math.random())) return false;
    c.jam = COUNTERS.chaff.life;
    extra.chaffBreaks++;
    return true;
  }

  /** Dev hook: a hostile missile launched at the player from `range` units ahead, homing all the way in. */
  function incoming(range = 120) {
    const m = M.seeker;
    const side: V3 = unit([player.fwd[2], 0.3, -player.fwd[0]]);
    const pos = add(add(player.pos, scale(player.fwd, range * k)), scale(side, 8 * k));
    const vel = scale(unit(sub(player.pos, pos)), 20 * k);
    const obj = missileObj(m, true);
    root.add(obj);
    const f: Flying = { m, pos, vel, speed: 20 * k, age: 0, target: null, homing: true, obj, dodgeRolled: new Set(), decoy: null, seen: new Set(), hostile: true, dead: false, test: true };
    missiles.push(f);
    extra.incoming++;
    return f;
  }

  /** Dev hook: the player's munition `id` launched from the nose, homing on ship `target` as if locked. */
  function testLaunch(id: MunitionId, target: number) {
    const m = M[id];
    if (m.delivery !== 'missile') return null;
    const obj = missileObj(m, false);
    root.add(obj);
    const f: Flying = { m, pos: noseOf(player.pos, player.fwd), vel: scale(player.fwd, 8 * k), speed: 8 * k, age: 0, target, homing: true, obj, dodgeRolled: new Set(), decoy: null, seen: new Set(), hostile: false, dead: false };
    missiles.push(f);
    stats[id].shots++;
    return f;
  }

  // ---- Enemy fire (from components/enemyAI.ts) ----
  const enemyCount = (by: number, m: Munition) => {
    enemy[m.id].shots++;
    const s = enemyBy.get(by) ?? { shots: 0, hits: 0, shield: 0, hull: 0 };
    s.shots++;
    enemyBy.set(by, s);
  };
  /**
   * An enemy ship fires munition `m` (already at world scale) along `dir`: a bolt, flak shell or mine, or a missile
   * (salvo) that homes on the player. `grade` is its targeting computer's seeker grade against the player's flares.
   * Shots leave from the ship's hull and carry its velocity.
   */
  function enemyFire(c: Target, m: Munition, dir: V3, grade = 0, drone = false) {
    const d = unit(dir);
    const start = add(c.pos, scale(d, c.radius + 0.2 * k));
    if (drone) extra.enemyDrone.shots++; else enemyCount(c.id, m);
    if (m.delivery === 'bolt' || m.delivery === 'burst' || m.delivery === 'mine') {
      const obj = shotObj(m, drone);
      if (drone) obj.scale.setScalar(0.35 * k); else if (m.delivery === 'mine') obj.scale.setScalar(k);
      root.add(obj);
      const vel = m.delivery === 'mine' ? add(scale(c.vel, 0.5), scale(d, m.speed)) : add(scale(d, m.speed), c.vel);
      shots.push({ m, pos: m.delivery === 'mine' ? add(c.pos, scale(d, c.radius + 0.5 * k)) : start, vel, age: 0, obj, drone, hostile: true, from: c.id });
      return;
    }
    if (m.delivery !== 'missile') return;
    const dirs = m.salvo ? salvoDirs(d, m.salvo.count, m.salvo.spread) : [d];
    const sp = Math.max(8 * k, len3(c.vel));
    for (const x of dirs) {
      const obj = missileObj(m, true);
      root.add(obj);
      missiles.push({ m, pos: start, vel: scale(x, sp), speed: sp, age: 0, target: null, homing: true, obj, dodgeRolled: new Set(), decoy: null, seen: new Set(), hostile: true, dead: false, from: c.id, grade });
    }
  }
  /** An enemy beam held on the player this frame: `track` is the share of its damage that lands (pilot skill). */
  function enemyBeam(c: Target, m: Munition, dir: V3, dt: number, track: number) {
    let b = enemyBeams.get(c.id);
    if (!b) {
      b = { mesh: new THREE.Mesh(beamGeo, additive(new THREE.Color(3, 0.6, 1.4), 0.85)), at: -1 };
      root.add(b.mesh);
      enemyBeams.set(c.id, b);
    }
    if (time - b.at > 0.2) enemyCount(c.id, m); // a new burst of beam counts as one shot
    b.at = time;
    const from = add(c.pos, scale(unit(dir), c.radius));
    const end = add(from, scale(unit(dir), m.range));
    const h = closest(from, end, player.pos);
    const on = h.d <= m.radius + PLAYER_R * k && !player.down;
    const tip = on ? add(from, scale(sub(end, from), h.t)) : end;
    b.mesh.visible = true;
    place(b.mesh, scale(add(from, tip), 0.5), dir);
    b.mesh.scale.set(k, k, Math.max(0.01, dist(from, tip)));
    if (on) hitPlayer(m, m.damage * dt * track * enemyMul, scale(unit(dir), -1), c.id);
  }
  /** An enemy drops a flare (its AI saw a missile coming). */
  function enemyFlare(c: Target) {
    if (c.counter !== 'flare' || c.counterLeft <= 0 || c.counterCd > 0 || c.def.disabled > 0) return false;
    c.counterLeft--;
    c.counterCd = COUNTERS.flare.cooldown;
    dropDecoy('flare', c.pos, c.vel, unit(c.vel), false);
    extra.enemyFlares++;
    return true;
  }
  /** Placeholder end of the lost state: refit (full shield, hull, ammunition) and a short grace. Lore is Caleb's. */
  function respawn() {
    setLoadout(loadout);
    player.down = false;
    player.grace = AI.respawnGrace;
    for (const f of missiles) if (f.hostile) f.dead = true;
  }

  // ---- Each frame ----
  function update(dt: number, shipPos: V3, fwd: V3) {
    time += dt;
    player.pos = shipPos;
    player.fwd = unit(fwd);
    cooldown = Math.max(0, cooldown - dt);
    player.counterCd = Math.max(0, player.counterCd - dt);
    if (player.guard) { const g = guardDrain(player.energy, dt); player.energy = g.energy; player.guard = g.up; } // the block drains it
    else if (!beamOn) player.energy = recharge(player.energy, fitted.reactor, dt);
    regenerate(player.def, dt);
    player.grace = Math.max(0, player.grace - dt);
    player.jam = Math.max(0, player.jam - dt);
    for (const b of enemyBeams.values()) if (time - b.at > 0.05) b.mesh.visible = false;
    for (const c of world.crafts) {
      if (!c.alive) continue;
      regenerate(c.def, dt);
      c.counterCd = Math.max(0, c.counterCd - dt);
      c.jam = Math.max(0, c.jam - dt);
    }
    const hostiles = live();
    const solids = world.solids?.() ?? [];
    const hitSolid = (a: V3, b: V3, reach: number, damage: number) => {
      for (const so of solids) if (sweptHit(a, b, so.pos, reach + so.radius)) { so.hit(damage); return true; }
      return false;
    };

    // Shots: bolts, flak, mines, drone shots.
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      const from = s.pos;
      if (s.guide !== undefined && !s.hostile) {
        const g = world.crafts.find((c) => c.id === s.guide);
        if (g?.alive) {
          const sp = Math.hypot(s.vel[0], s.vel[1], s.vel[2]);
          const tgo = dist(g.pos, s.pos) / Math.max(sp, 1e-6);
          s.vel = scale(turnToward(unit(s.vel), sub(add(g.pos, scale(g.vel, tgo)), s.pos), GUIDE_TURN * dt), sp);
        } else s.guide = undefined;
      }
      s.pos = add(s.pos, scale(s.vel, dt));
      s.age += dt;
      let gone = false;
      if (s.hostile) {
        // An enemy's shot: it can only hurt the player (and a flak shell can catch the player's missiles).
        const pd = player.down ? Infinity : closest(from, s.pos, player.pos).d - PLAYER_R * k;
        if (s.m.delivery === 'burst') {
          let near = pd;
          for (const f of missiles) if (!f.hostile && !f.dead) near = Math.min(near, closest(from, s.pos, f.pos).d);
          if (flakBursts(s.m, s.age, near)) { burst(s.pos, s.m, s.from ?? -1); gone = true; }
        } else if (s.m.delivery === 'mine') {
          s.vel = scale(s.vel, Math.exp(-dt * 0.5));
          if (mineTriggers(s.m, s.age, player.down ? Infinity : dist(s.pos, player.pos) - PLAYER_R * k)) { burst(s.pos, s.m, s.from ?? -1); gone = true; }
          s.obj.rotation.y += dt;
        } else if (pd <= s.m.radius) {
          hitPlayer(s.m, s.m.damage * enemyMul, scale(unit(s.vel), -1), s.drone ? undefined : s.from);
          if (s.drone) extra.enemyDrone.hits++;
          gone = true;
        }
      } else if (s.m.delivery === 'burst') {
        let near = Infinity;
        for (const c of hostiles) near = Math.min(near, closest(from, s.pos, c.pos).d - c.radius);
        for (const f of missiles) if (f.hostile && !f.dead) near = Math.min(near, closest(from, s.pos, f.pos).d);
        if (flakBursts(s.m, s.age, near)) { burst(s.pos, s.m); gone = true; }
      } else if (s.m.delivery === 'mine') {
        s.vel = scale(s.vel, Math.exp(-dt * 0.5));
        let near = Infinity;
        for (const c of hostiles) near = Math.min(near, dist(s.pos, c.pos) - c.radius);
        if (mineTriggers(s.m, s.age, near)) { burst(s.pos, s.m); gone = true; }
        const armed = s.age >= (s.m.arm ?? 0);
        ((s.obj as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = armed ? 0.6 + 0.6 * Math.sin(time * 8) : 0.3;
        s.obj.rotation.y += dt;
      } else {
        for (const c of hostiles) {
          if (gone || !c.alive) continue;
          if (sweptHit(from, s.pos, c.pos, s.m.radius + Math.max(c.radius, FUSE_R * k))) {
            hitCraft(c, s.m, s.m.damage, scale(unit(s.vel), -1), s.drone);
            if (s.drone) extra.drone.hits++; else stats[s.m.id].hits++;
            gone = true;
          }
        }
        if (!gone && hitSolid(from, s.pos, s.m.radius, s.m.damage)) { stats[s.m.id].hits++; gone = true; }
      }
      if (!gone && (s.age > s.m.life || world.insideBody(s.pos))) gone = true;
      if (gone) { root.remove(s.obj); shots.splice(i, 1); } else if (s.m.delivery === 'mine') s.obj.position.set(...s.pos); else place(s.obj, s.pos, s.vel);
    }

    // Missiles: the player's (seeker, torpedo, swarm) and any hostile test missile.
    for (let i = missiles.length - 1; i >= 0; i--) {
      const f = missiles[i];
      if (f.dead) { spawnFx(f.pos, blastTex, 1.2 * k, 0.4); root.remove(f.obj); missiles.splice(i, 1); continue; }
      const sk = f.m.seeker!;
      const jammed = f.hostile && fitted.counter === 'jammer';
      // The dev test missile homes all the way in; an enemy's missile lets go at the end like the player's, so the
      // player can outfly it.
      const letGo = f.test ? 0 : f.hostile ? sk.homingOff : Math.min(sk.homingOff, PLAYER_LET_GO * k);
      const spec = { accel: sk.accel, turn: sk.turn * (jammed ? COUNTERS.jammer.turnMul! : 1), homingOff: letGo };
      let tp: V3 | null = null;
      if (f.decoy) tp = f.decoy.age < f.decoy.life ? f.decoy.pos : null;
      else if (f.hostile) tp = player.down ? null : shipPos;
      else if (f.target !== null) tp = byId(f.target)?.pos ?? null;
      const [a, b] = stepMissile(f, tp, dt, sk.top, spec);
      let gone = f.age > f.m.life || world.insideBody(b);

      // A homing missile that sees a fresh flare from the other side rolls once against it.
      if (!gone && f.homing && !f.decoy) {
        for (const d of decoys) {
          if (d.kind !== 'flare' || d.player !== f.hostile || f.seen.has(d) || !decoyVisible(f.pos, f.vel, d.pos)) continue;
          f.seen.add(d);
          if (spoofed(COUNTERS.flare.pull, f.hostile ? f.grade ?? 0 : fitted.targeting.seeker, Math.random())) {
            f.decoy = d;
            if (f.hostile) extra.playerSpoofs++; else extra.spoofs++;
            break;
          }
        }
      }
      if (!gone && f.decoy && dist(b, f.decoy.pos) < 1.5 * k) { spawnFx(b, blastTex, 1.5 * k, 0.4); gone = true; }

      if (!gone && f.hostile) {
        if (!player.down && sweptHit(a, b, shipPos, f.m.radius + PLAYER_R * k)) {
          if (f.m.area > 0 && f.from !== undefined) burst(b, f.m, f.from);
          else hitPlayer(f.m, f.m.damage * (f.test ? 1 : enemyMul), scale(unit(f.vel), -1), f.from);
          spawnFx(b, blastTex, 2 * k, 0.6);
          gone = true;
        }
      } else if (!gone) {
        // An enemy with flares drops one when a missile homing on it gets close.
        const tg = f.homing && !f.decoy ? byId(f.target) : undefined;
        if (tg && tg.counter === 'flare' && tg.counterLeft > 0 && tg.counterCd <= 0 && tg.def.disabled <= 0 && dist(f.pos, tg.pos) < FLARE_REACT * k) {
          tg.counterLeft--;
          tg.counterCd = COUNTERS.flare.cooldown;
          dropDecoy('flare', tg.pos, tg.vel, unit(tg.vel), false);
          extra.enemyFlares++;
        }
        for (const c of hostiles) {
          if (gone || !c.alive) continue;
          // The last-second dodge: rolled once per missile per ship, only after the homing has let go. A disabled ship cannot.
          if (!f.dodgeRolled.has(c.id) && !f.homing && c.def.disabled <= 0 && dist(f.pos, c.pos) < letGo) {
            f.dodgeRolled.add(c.id);
            if (wantsDodge(f, c.pos, Math.random(), c.dodge ?? DODGE_CHANCE, letGo)) {
              c.dodgeVel = scale(dodgeDir(f.vel, Math.random() - 0.5), DODGE.speed * k);
              c.dodgeT = DODGE.time;
              extra.dodges++;
            }
          }
          if (sweptHit(a, b, c.pos, f.m.radius + Math.max(c.radius, MISSILE_FUSE * k))) {
            if (f.m.area > 0) burst(b, f.m);
            else { hitCraft(c, f.m, f.m.damage, scale(unit(f.vel), -1)); stats[f.m.id].hits++; spawnFx(b, blastTex, 1.5 * k, 0.5); }
            gone = true;
          }
        }
        if (!gone && !f.hostile && hitSolid(a, b, f.m.radius, f.m.damage)) { stats[f.m.id].hits++; spawnFx(b, blastTex, 1.5 * k, 0.5); gone = true; }
      }
      if (gone) { root.remove(f.obj); missiles.splice(i, 1); } else place(f.obj, f.pos, f.vel);
    }

    // Decoys drift and burn out.
    for (let i = decoys.length - 1; i >= 0; i--) {
      const d = decoys[i];
      d.age += dt;
      d.pos = add(d.pos, scale(d.vel, dt));
      d.sprite.position.set(...d.pos);
      const left = 1 - d.age / d.life;
      d.sprite.scale.setScalar((d.kind === 'flare' ? 1.2 * (0.6 + 0.4 * Math.sin(time * 40)) : 3 * (1.4 - left * 0.4)) * k * Math.max(0.05, left));
      if (d.age >= d.life) { root.remove(d.sprite); decoys.splice(i, 1); }
    }

    // Drones.
    drones.forEach((d, i) => {
      const spec = DRONES[d.id];
      d.pos = add(shipPos, droneOffset(i, drones.length, time, spec.orbit * k));
      d.obj.position.set(...d.pos);
      d.obj.rotation.y += dt * 3;
      d.cd = Math.max(0, d.cd - dt);
      if (d.id === 'repair') {
        const was = { hull: player.def.hull, shield: player.def.shield.reduce((a, b) => a + b, 0) };
        player.def.hull = repairStep(spec, player.def.hull, player.def.maxHull, 0, 0, dt).hull;
        player.def.shield = player.def.shield.map((s) => repairStep(spec, 0, 0, s, player.def.maxShield, dt).shield);
        extra.repaired.hull += player.def.hull - was.hull;
        extra.repaired.shield += player.def.shield.reduce((a, b) => a + b, 0) - was.shield;
        return;
      }
      if (d.cd > 0) return;
      if (d.id === 'attack') {
        const t = nearestWithin(d.pos, hostiles, (c) => c.pos, spec.range * k);
        if (!t) return;
        const hit = intercept(d.pos, droneShot.speed, t.pos, t.vel);
        const dir = unit(sub(hit ? hit.point : t.pos, d.pos));
        const obj = shotObj(droneShot, true);
        obj.scale.setScalar(0.35 * k);
        root.add(obj);
        shots.push({ m: droneShot, pos: d.pos, vel: scale(dir, droneShot.speed), age: 0, obj, drone: true });
        extra.droneShots++;
        extra.drone.shots++;
        d.cd = 1 / spec.rate;
      } else if (d.id === 'pointDefence') {
        const t = nearestWithin(d.pos, missiles.filter((f) => f.hostile && !f.dead), (f) => f.pos, spec.range * k);
        if (!t) return;
        tracer(d.pos, t.pos, spec.color);
        extra.pdShots++;
        if (Math.random() < spec.damage) { t.dead = true; extra.pdKills++; }
        d.cd = 1 / spec.rate;
      }
    });

    // Shield bubbles: a flash on every hit to the shield; an ion-blue flicker while disabled.
    for (const c of world.crafts) {
      const b = bubbles.get(c.id) ?? (c.def.disabled > 0 ? bubbleOf(c) : undefined);
      if (!b) continue;
      b.flash = Math.max(0, b.flash - dt * 2.5);
      const dis = c.alive && c.def.disabled > 0;
      const op = c.alive ? b.flash * 0.5 + (dis ? 0.12 + 0.1 * Math.sin(time * 30) : 0) : 0;
      if (dis && b.flash <= 0) b.mat.color.set('#6fb6ff');
      b.mat.opacity = op;
      b.mesh.visible = op > 0.01;
      b.mesh.position.set(...c.pos);
      b.mesh.scale.setScalar(c.radius * 1.7);
    }
    playerBubble.flash = Math.max(0, playerBubble.flash - dt * 2.5);
    playerBubble.mat.opacity = playerBubble.flash * 0.45;
    playerBubble.mesh.visible = playerBubble.flash > 0.02;
    playerBubble.mesh.position.set(...shipPos);
    playerBubble.mesh.scale.setScalar(PLAYER_R * 2 * k);

    for (let i = fx.length - 1; i >= 0; i--) {
      const x = fx[i];
      x.t += dt;
      const q = x.t / x.life;
      if (x.obj instanceof THREE.Sprite) {
        x.obj.scale.setScalar(x.size * (x.grow ? 0.4 + q * 1.6 : 1));
        x.obj.material.opacity = Math.max(0, 1 - q);
      }
      if (q >= 1) { root.remove(x.obj); x.dispose(); fx.splice(i, 1); }
    }
  }

  /** The figures the lock and the lead indicator need for munition `id`. */
  const lockTime = (id: MunitionId) => (M[id].lock !== 'none' ? M[id].lockTime : 1.5) * fitted.targeting.lockMul;
  const lockRange = (id: MunitionId) => (M[id].lock !== 'none' ? M[id].range : MISSILE.lockRange * k);

  return {
    stats,
    extra,
    enemy,
    enemyBy,
    player,
    shots,
    missiles,
    decoys,
    drones,
    get fitted() { return fitted; },
    get scale() { return k; },
    munition: (id: MunitionId) => M[id],
    lockTime,
    lockRange,
    setLoadout,
    setScale,
    trigger,
    update,
    countermeasure,
    onLocked,
    incoming,
    testLaunch,
    enemyFire,
    enemyBeam,
    enemyFlare,
    respawn,
    tracer,
    get droneShot() { return droneShot; },
    get enemyDamage() { return enemyMul; },
    set enemyDamage(x: number) { enemyMul = x; },
    hitCraft,
    hitPlayer: (id: MunitionId, amount?: number, from: V3 = player.fwd) => hitPlayer(M[id], amount ?? M[id].damage, from),
    burst,
    blast: (pos: V3, size: number) => spawnFx(pos, blastTex, size, 0.8),
    /** For the HUD. */
    hud: (id: MunitionId) => ({
      energy: player.energy, energyMax: fitted.reactor.capacity, ammo: M[id].ammo === null ? null : player.ammo[id] ?? 0,
      shield: shieldFrac(player.def), hull: player.def.hull, maxHull: player.def.maxHull,
      counter: fitted.counter, counterLeft: player.counterLeft, block: player.block,
      down: player.down, grace: player.grace, disabled: player.def.disabled, locking: player.threat.locking, locked: player.threat.locked,
      incoming: missiles.filter((f) => f.hostile && !f.dead && !f.decoy && f.homing).length,
    }),
    dispose: () => { textures.forEach((t) => t.dispose()); geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); bubbles.forEach((b) => b.mat.dispose()); playerBubble.mat.dispose(); },
  };
}

export type Arsenal = ReturnType<typeof createArsenal>;
const len3 = (v: V3) => Math.hypot(v[0], v[1], v[2]);
