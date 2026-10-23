/**
 * Station systems in the scene: the player's shots land on stations (sections, guns), a station that has been provoked
 * fires its arsenal guns back, launches its fighters from the hangar mouth and recalls them, lays mines, mends, and
 * raises the other stations of its world. The rules are lib/station/; this file only draws them and moves the shots.
 *
 * Mounted on the provisional hardpoints (lib/station/mounts.ts) until god-armour's megastructure publishes its own.
 * The player has no shield yet (arsenal is not merged), so hits come off the hull.
 */
import * as THREE from 'three';
import type { DestGeo, V3 } from '../lib/nav';
import { add, dist, scale, sub, unit } from '../lib/nav';
import { intercept, sweptHit } from '../lib/weapons';
import { MUNITIONS, areaFalloff } from '../lib/munitions';
import type { MunitionId } from '../lib/munitions';
import type { StationId, StationPlace } from '../lib/stations';
import { stationById } from '../lib/stations';
import { holderOf } from '../lib/world';
import { NATIONS } from '../lib/nations';
import { SHIP_SPECS } from '../lib/shipTypes';
import type { ShipType } from '../lib/shipTypes';
import { WING, stepWing } from '../lib/progression/wingman';
import type { Wing } from '../lib/progression/wingman';
import type { Hardpoint } from '../lib/station/mounts';
import { provisionalMounts } from '../lib/station/mounts';
import type { Contact } from '../lib/station/defence';
import { hitMount, hitSection, provoke, scatter, status } from '../lib/station/defence';
import type { StationRun, StationStep } from '../lib/station/system';
import { createStation, stepStation, summary } from '../lib/station/system';
import { DEFENDER, alertSiblings, callNavy, docked, interpose, lost, withinLeash } from '../lib/station/navy';
import type { DefendCall } from '../lib/station/navy';
import type { Combat } from './combat';

interface Shot { pos: V3; vel: V3; age: number; life: number; munition: MunitionId; damage: number; mesh: THREE.Mesh; homing: boolean; station: string; tracer: boolean; fighter: boolean }
interface Mine { pos: V3; age: number; mesh: THREE.Mesh; station: string }
interface Defender { id: string; type: ShipType; station: string; wing: Wing; hp: number; mesh: THREE.Object3D; goal?: V3 }

export interface StationDefenseOpts {
  places: (StationPlace & { id: string })[];
  geo: () => DestGeo[];
  shipLength: number;
  hull: () => number;
  setHull: (v: number) => void;
}

const PLAYER_R = 0.3; // the player ship's hit radius for station shots
const FIGHTER_GUN: MunitionId = 'pulse';

export function createStationDefense(combat: Combat, o: StationDefenseOpts) {
  const root = new THREE.Group();
  combat.root.parent?.add(root);
  const L = o.shipLength;
  const runs = new Map<string, StationRun>();
  const mountsBy = new Map<string, Hardpoint[]>();
  const hostile = new Map<string, boolean>(); // is this station's nation hostile to the player
  const guns = new Map<string, THREE.Mesh>(); // a small gun mesh per fitted gun mount, hidden when it is shot off
  const gunGeo = new THREE.BoxGeometry(0.35 * L, 0.35 * L, 0.6 * L);
  const shields = new Map<string, { mesh: THREE.Mesh; flash: number }>();
  const shieldGeo = new THREE.SphereGeometry(1, 24, 16);
  const shotGeo = new THREE.BoxGeometry(0.06, 0.06, 1.4);
  const mineGeo = new THREE.OctahedronGeometry(0.25);
  const fighterGeo = new THREE.ConeGeometry(0.06, 0.3, 6).rotateX(Math.PI / 2);
  const cruiserGeo = new THREE.ConeGeometry(0.12, L, 8).rotateX(Math.PI / 2);
  const capitalGeo = new THREE.BoxGeometry(0.22 * 5 * L, 0.14 * 5 * L, 5 * L);
  const mats = new Map<string, { shot: THREE.MeshBasicMaterial; ship: THREE.MeshStandardMaterial; shield: THREE.MeshBasicMaterial }>();
  const matsOf = (home: string) => {
    let m = mats.get(home);
    if (!m) {
      const c = new THREE.Color(NATIONS.find((n) => n.home === home)!.color);
      m = {
        shot: new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(3), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
        ship: new THREE.MeshStandardMaterial({ color: c, emissive: c.clone().multiplyScalar(0.4), metalness: 0.5, roughness: 0.45 }),
        shield: new THREE.MeshBasicMaterial({ color: c.clone().lerp(new THREE.Color(1, 1, 1), 0.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      };
      mats.set(home, m);
    }
    return m;
  };

  for (const p of o.places) {
    const st = stationById(p.id)!;
    const ms = provisionalMounts(p.id, p, L);
    const run = createStation(p.id, st.home, ms, 2);
    runs.set(p.id, run);
    mountsBy.set(p.id, ms);
    hostile.set(p.id, !holderOf(p.id as StationId)?.player);
    const m = matsOf(st.home);
    for (const h of run.fit) {
      if (h.kind !== 'turret' && h.kind !== 'pointDefence') continue;
      const g = new THREE.Mesh(gunGeo, m.ship);
      g.position.set(...h.pos);
      g.lookAt(new THREE.Vector3(...add(h.pos, h.normal)));
      root.add(g);
      guns.set(h.id, g);
    }
    const sh = new THREE.Mesh(shieldGeo, m.shield.clone());
    sh.position.set(...p.pos);
    sh.scale.setScalar(p.size * 1.15);
    root.add(sh);
    shields.set(p.id, { mesh: sh, flash: 0 });
  }

  const shots: Shot[] = [];
  const mines: Mine[] = [];
  const defenders: Defender[] = [];
  let nextDef = 1;
  let time = 0;
  const rand = Math.random;
  const stats = { playerHitsOnStations: 0, playerHitsOnGuns: 0, gunsDestroyed: 0, stationShots: 0, stationHitsOnPlayer: 0, damageToPlayer: 0, launched: { fighter: 0, cruiser: 0, capital: 0, destroyer: 0 } as Record<ShipType, number>, defenderShots: 0, defenderHits: 0, defendersKilled: 0, docked: 0, minesLaid: 0, mineHits: 0, calls: [] as DefendCall[], siblingsRaised: 0 };
  const lastStep = new Map<string, StationStep>();
  const placeOf = (id: string) => o.places.find((p) => p.id === id)!;
  const craftHp = new Map<number, number>();
  const engagedFor = new Map<string, number>();

  const planetOf = (id: string) => {
    const g = o.geo().find((x) => x.id === stationById(id)!.home);
    return g ? { pos: g.pos, r: g.size } : null;
  };
  const sectionNear = (id: string, at: V3) => {
    let best: Hardpoint | null = null;
    for (const m of mountsBy.get(id)!) if (!best || dist(m.pos, at) < dist(best.pos, at)) best = m;
    return best!;
  };

  /** A player shot from a to b: does it hit a station (a gun on it, or a section)? Returns true when it was spent. */
  function playerShot(a: V3, b: V3, munition: MunitionId, damage: number): boolean {
    for (const p of o.places) {
      if (!sweptHit(a, b, p.pos, p.size)) continue;
      const run = runs.get(p.id)!;
      const ms = mountsBy.get(p.id)!;
      const gun = run.fit.find((m) => (m.kind === 'turret' || m.kind === 'pointDefence') && run.sys.mounts[m.id].hp > 0 && sweptHit(a, b, m.pos, m.size * L + 0.25));
      if (gun) {
        stats.playerHitsOnGuns++;
        if (hitMount(run.sys, gun.id, munition, damage, 'player')) { stats.gunsDestroyed++; guns.get(gun.id)!.visible = false; }
      } else {
        const near = sectionNear(p.id, b) ?? ms[0];
        hitSection(run.sys, near.section, munition, damage, 'player');
        stats.playerHitsOnStations++;
        shields.get(p.id)!.flash = 1;
      }
      return true;
    }
    return false;
  }

  function spawnShot(st: string, from: V3, dir: V3, munition: MunitionId, damage: number, tracer = false, fighter = false) {
    const mu = MUNITIONS[munition];
    const home = stationById(st)!.home;
    const mesh = new THREE.Mesh(shotGeo, matsOf(home).shot);
    root.add(mesh);
    const beam = mu.delivery === 'beam';
    const speed = beam ? 2000 : mu.seeker ? mu.seeker.top : mu.speed;
    const life = beam ? mu.range / speed : mu.seeker ? mu.life : mu.life;
    shots.push({ pos: [...from] as V3, vel: scale(dir, speed), age: 0, life, munition, damage, mesh, homing: !!mu.seeker, station: st, tracer, fighter });
  }

  function launch(st: string, type: ShipType) {
    const run = runs.get(st)!;
    const mouth = run.fit.find((m) => m.kind === (type === 'capital' ? 'mooring' : 'hangar')) ?? run.fit[0];
    const m = matsOf(stationById(st)!.home);
    const mesh = new THREE.Mesh(type === 'fighter' ? fighterGeo : type === 'cruiser' ? cruiserGeo : capitalGeo, m.ship);
    root.add(mesh);
    const wing: Wing = { slot: nextDef % 6, pos: add(mouth.pos, scale(mouth.normal, 0.5)), vel: scale(mouth.normal, 25), state: 'escort', cooldown: 1 };
    defenders.push({ id: `d${nextDef++}`, type, station: st, wing, hp: SHIP_SPECS[type].hp, mesh });
    stats.launched[type]++;
  }

  function update(dt: number, player: V3, playerVel: V3, docking: boolean) {
    time += dt;
    // ---- The player's shots: on stations and on launched defenders ----
    // Arsenal's shots and missiles (integration pass 2): every munition, each with its own damage and reach.
    const pshots = combat.arsenal.shots;
    for (let i = pshots.length - 1; i >= 0; i--) {
      const b = pshots[i];
      if (b.hostile) continue;
      const a = sub(b.pos, scale(b.vel, dt));
      let spent = playerShot(a, b.pos, b.m.id, b.m.damage);
      if (!spent) for (const d of defenders) {
        if (sweptHit(a, b.pos, d.wing.pos, SHIP_SPECS[d.type].hitRadius * L * 0.5 + b.m.radius)) { d.hp -= b.m.damage; provoke(runs.get(d.station)!.sys, 'player'); spent = true; break; }
      }
      if (spent) { b.obj.parent?.remove(b.obj); pshots.splice(i, 1); }
    }
    const pmissiles = combat.arsenal.missiles.filter((m) => !m.hostile && !m.dead);
    for (const m of pmissiles) if (playerShot(sub(m.pos, scale(m.vel, dt)), m.pos, m.m.id, m.m.damage)) m.dead = true;
    // A nation's ships hit near its station provoke the station too.
    for (const c of combat.crafts) {
      const hp = c.def.hull + c.def.shield.reduce((x, y) => x + y, 0);
      const before = craftHp.get(c.id) ?? c.maxHp;
      craftHp.set(c.id, hp);
      if (hp >= before) continue;
      for (const p of o.places) if (stationById(p.id)!.home === NATIONS.find((n) => n.id === c.nation)!.home && dist(p.pos, c.pos) < 1500) provoke(runs.get(p.id)!.sys, 'player');
    }

    // ---- Each station thinks ----
    const live = pmissiles.filter((m) => !m.dead);
    const missiles: Contact[] = live.map((m, k) => ({ id: `pm${k}`, kind: 'missile', pos: m.pos, vel: m.vel, r: m.m.radius, hostile: true }));
    for (const p of o.places) {
      const run = runs.get(p.id)!;
      // Its house's word on the player, as its fleets read it (standings and foreign space, GameView's hooks): 'engage'
      // is war, 'hold' is a friend. Without the hooks (dev), the old rule: anyone not of the player's house is hostile.
      const nation = NATIONS.find((n) => n.home === stationById(p.id)!.home)!;
      const att = combat.ai.hooks.attitudeOf?.(nation.id) ?? null;
      const enemy = att ? att !== 'hold' : hostile.get(p.id)!;
      const war = att === 'engage';
      const contacts: Contact[] = docking ? [] : [{ id: 'player', kind: 'player', pos: player, vel: playerVel, r: PLAYER_R, hostile: enemy || (run.sys.provoked.player ?? 0) > 0, war }];
      if (enemy) contacts.push(...missiles);
      const step = stepStation(run, dt, { at: p.pos, contacts, planet: planetOf(p.id), rand });
      lastStep.set(p.id, step);
      for (const f of step.fire) {
        stats.stationShots++;
        if (f.delivery === 'mine') {
          const mesh = new THREE.Mesh(mineGeo, matsOf(stationById(p.id)!.home).shot);
          root.add(mesh);
          mines.push({ pos: add(f.from, scale(f.dir, 3 * L)), age: 0, mesh, station: p.id });
          stats.minesLaid++;
        } else if (f.target === 'player') spawnShot(p.id, f.from, f.dir, f.munition, f.damage);
        else if (f.target.startsWith('pm')) { // point defence on a player missile
          const k = +f.target.slice(2);
          const m = live[k];
          if (m && rand() < 0.5) m.dead = true; // arsenal takes it out of the scene
        }
      }
      for (const t of step.navy.launch) {
        if (t === 'capital') {
          launch(p.id, 'capital');
          defenders[defenders.length - 1].goal = interpose(p.pos, player, planetOf(p.id));
        } else launch(p.id, t);
      }
      const fighting = run.sys.alert === 'engaged' || run.sys.alert === 'siege';
      engagedFor.set(p.id, fighting ? (engagedFor.get(p.id) ?? 0) + dt : 0);
      if (step.navy.call && !stats.calls.some((c) => c.ward === p.id)) {
        const home = stationById(p.id)!.home;
        const nation = NATIONS.find((n) => n.home === home)!;
        const patrol = combat.crafts.filter((c) => c.nation === nation.id).map((c) => ({ id: c.id, type: c.type, pos: c.pos, alive: c.alive }));
        stats.calls.push(callNavy(run.sys, p.pos, player, patrol));
      }
      stats.siblingsRaised += alertSiblings(run.sys, [...runs.values()].map((r) => r.sys), engagedFor.get(p.id)!, step.boon);
      // Shields: a flash on a hit, a faint skin while fighting.
      const sh = shields.get(p.id)!;
      sh.flash = Math.max(0, sh.flash - dt * 2.5);
      const sf = status(run.sys).shield;
      (sh.mesh.material as THREE.MeshBasicMaterial).opacity = (fighting ? 0.06 : 0) * sf + sh.flash * 0.35 * sf;
      for (const h of run.fit) { const g = guns.get(h.id); if (g) g.visible = run.sys.mounts[h.id].hp > 0; }
    }

    // ---- Station shots fly; they hit the player ----
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      const mu = MUNITIONS[s.munition];
      if (s.homing && mu.seeker) {
        const want = scale(unit(sub(player, s.pos)), mu.seeker.top);
        const k = Math.min(1, dt * mu.seeker.turn);
        s.vel = add(s.vel, scale(sub(want, s.vel), k));
      }
      const a = s.pos;
      s.pos = add(s.pos, scale(s.vel, dt));
      s.age += dt;
      const reach = (mu.area > 0 && mu.fuse ? mu.fuse : 0) + mu.radius + PLAYER_R;
      let gone = s.age > s.life;
      if (!docking && !s.tracer && sweptHit(a, s.pos, player, reach)) {
        // Integration pass 2: station fire lands on arsenal's player defences (shield first, then hull), like enemy fire.
        const raw = s.damage * (mu.area > 0 ? Math.max(0.3, areaFalloff(dist(s.pos, player), mu.area)) : 1);
        const before = o.hull();
        combat.arsenal.hitPlayer(s.munition, raw, unit(sub(a, player)));
        const dmg = before - o.hull();
        if (s.fighter) stats.defenderHits++; else stats.stationHitsOnPlayer++;
        stats.damageToPlayer += dmg;
        gone = true;
      }
      if (gone) { root.remove(s.mesh); shots.splice(i, 1); continue; }
      s.mesh.position.set(...s.pos);
      s.mesh.lookAt(new THREE.Vector3(...add(s.pos, s.vel)));
    }
    // ---- Mines drift and go off ----
    const mine = MUNITIONS.mine;
    for (let i = mines.length - 1; i >= 0; i--) {
      const m = mines[i];
      m.age += dt;
      const d = dist(m.pos, player);
      let gone = m.age > mine.life;
      if (!docking && m.age >= (mine.arm ?? 0) && d <= (mine.fuse ?? 0)) {
        const before = o.hull();
        combat.arsenal.hitPlayer('mine', mine.damage * Math.max(0.3, areaFalloff(d, mine.area)), unit(sub(m.pos, player)));
        const dmg = before - o.hull();
        stats.mineHits++;
        stats.damageToPlayer += dmg;
        gone = true;
      }
      if (gone) { root.remove(m.mesh); mines.splice(i, 1); continue; }
      m.mesh.position.set(...m.pos);
      m.mesh.rotation.y += dt;
    }

    // ---- Launched defenders: attack the player while their station fights, then come home ----
    for (let i = defenders.length - 1; i >= 0; i--) {
      const d = defenders[i];
      const run = runs.get(d.station)!;
      if (d.hp <= 0) { lost(run.hangar, d.type); root.remove(d.mesh); defenders.splice(i, 1); stats.defendersKilled++; continue; }
      const fighting = run.sys.alert === 'engaged' || run.sys.alert === 'siege';
      const step = lastStep.get(d.station);
      const mouth = run.fit.find((m) => m.kind === (d.type === 'capital' ? 'mooring' : 'hangar'))!;
      const anchor = d.goal && fighting ? d.goal : add(mouth.pos, scale(mouth.normal, 4 * L));
      const target = fighting && !docking && d.type !== 'capital' && withinLeash(placeOf(d.station).pos, player) ? player : null;
      const recall = !!step?.navy.recall || (!fighting && run.hangar.calm > 10);
      if (recall) { // straight home to the hangar mouth
        const to = sub(mouth.pos, d.wing.pos);
        const k = Math.min(DEFENDER.homeSpeed, dist(mouth.pos, d.wing.pos) * 2);
        d.wing.vel = scale(unit(to), k);
        d.wing.pos = add(d.wing.pos, scale(d.wing.vel, dt));
        if (dist(d.wing.pos, mouth.pos) < 1) { docked(run.hangar, d.type); root.remove(d.mesh); defenders.splice(i, 1); stats.docked++; continue; }
        d.mesh.position.set(...d.wing.pos);
        continue;
      }
      // Chasing, it takes the wingmen's chase speed against the target's (stepWing's top speed reads playerVel).
      const r = stepWing(d.wing, { player: anchor, playerVel: target ? playerVel : [0, 0, 0], fwd: mouth.normal, target, recall: false, t: time }, dt);
      if (r.fire && target && dist(d.wing.pos, player) < WING.range * 4) {
        d.wing.cooldown = 1 / DEFENDER.rate;
        stats.defenderShots++;
        const mu = MUNITIONS[FIGHTER_GUN];
        const lead = intercept(d.wing.pos, mu.speed, player, playerVel);
        spawnShot(d.station, d.wing.pos, scatter(unit(sub(lead ? lead.point : player, d.wing.pos)), 0.02, rand), FIGHTER_GUN, mu.damage * WING.gunScale, false, true);
      }
      d.mesh.position.set(...d.wing.pos);
      d.mesh.lookAt(new THREE.Vector3(...add(d.wing.pos, d.wing.vel)));
    }
  }

  return {
    runs, stats, defenders, shots, mines,
    update,
    /** A station fighting the player will not let it dock. */
    refuses: (id: string) => { const r = runs.get(id); return !!r && (r.sys.alert === 'engaged' || r.sys.alert === 'siege') && (r.sys.provoked.player ?? 0) > 0; },
    summary: (id: string) => { const r = runs.get(id); return r ? summary(r, lastStep.get(id)) : null; },
    status: (id: string) => { const r = runs.get(id); return r ? { ...status(r.sys), tier: r.sys.tier, hangar: { ...r.hangar.housed }, out: { ...r.hangar.out }, step: lastStep.get(id) } : null; },
    dispose: () => {
      root.parent?.remove(root);
      for (const g of [gunGeo, shieldGeo, shotGeo, mineGeo, fighterGeo, cruiserGeo, capitalGeo]) g.dispose();
      for (const m of mats.values()) { m.shot.dispose(); m.ship.dispose(); m.shield.dispose(); }
      for (const s of shields.values()) (s.mesh.material as THREE.Material).dispose();
    },
  };
}
export type StationDefense = ReturnType<typeof createStationDefense>;
