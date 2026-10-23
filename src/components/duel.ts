/**
 * A proving range for ship types in the live scene, driven from `window.__voyage.duel` (dev only): two ships of any
 * type and nation spawned beside the player, flying on lib/hunter.ts with each hull's numbers from lib/destroyer.ts,
 * shooting each other with their own guns; and flight trials that measure a hull's top speed and turn rate frame by
 * frame. Integration has no enemy flight or fire yet (enemy-ai and fleet-command bring them), so this is where the
 * destroyer's numbers are shown working in the game's own scene, models and loop.
 */
import * as THREE from 'three';
import { craftStats } from '../lib/craftStats';
import type { Hull } from '../lib/destroyer';
import { HULL } from '../lib/destroyer';
import type { HunterMode, Mover } from '../lib/hunter';
import { bears, fly, gunshipThink, hunterThink } from '../lib/hunter';
import type { V3 } from '../lib/nav';
import { add, dist, dot, len, scale, sub, unit } from '../lib/nav';
import type { NationId } from '../lib/nations';
import { NATIONS } from '../lib/nations';
import type { ShipType } from '../lib/shipTypes';
import { SHIP_TYPES, bodyRadius, shipLength } from '../lib/shipTypes';
import { LASER, intercept, sweptHit } from '../lib/weapons';
import type { SpaceUniforms } from './space/materials';
import { createFleet } from './space/fleet';

/** Fleet-command's bolt speed, L/s (lib/fleet/spec.ts BOLT). */
const BOLT_SPEED = 700;
const BOLT_LIFE = 1.3;
/** 1σ aiming error on every shot, radians: the enemy-ai default for a mid-skill pilot. */
const AIM_ERROR = 0.02;

interface Duelist {
  type: ShipType; nation: NationId; hull: Hull; m: Mover; hp: number; maxHp: number; radius: number;
  cool: number; mode: HunterMode; shots: number; hits: number; obj: THREE.Group; alive: boolean; diedAt: number | null;
}
interface Shot { pos: V3; vel: V3; age: number; from: number; mesh: THREE.Mesh }
export interface DuelSide { type: ShipType; nation: NationId }
interface Trial { d: Duelist; t: number; phase: 'straight' | 'turn'; top: number; turnStart: number; turnStartFwd: V3; turnTime: number | null; samples: number[] }

let seed = 1;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());

export function createDuel(scene: THREE.Scene, opts: { uniforms: SpaceUniforms; playerLength: number }) {
  const L = opts.playerLength;
  const root = new THREE.Group();
  scene.add(root);
  const fleet = createFleet(opts.uniforms);
  const boltGeo = new THREE.BoxGeometry(0.04, 0.04, 1.1);
  const boltMat = [new THREE.Color(0.4, 2.2, 3), new THREE.Color(3, 0.6, 0.35)].map((c) => new THREE.MeshBasicMaterial({ color: c, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  let ships: Duelist[] = [];
  let shots: Shot[] = [];
  let trial: Trial | null = null;
  let time = 0;
  let winner: number | null = null;
  // Follow: the whole range is carried along with the camera (translation only), so a fight or a lineup stays in
  // view while the player's ship orbits; the simulation itself runs in fixed world coordinates.
  let follow: { cam: THREE.Camera; from: THREE.Vector3 } | null = null;

  const nationOf = (id: NationId) => NATIONS.find((n) => n.id === id)!;
  function make(s: DuelSide, pos: V3, fwd: V3): Duelist {
    const obj = fleet.make(s.type, nationOf(s.nation), shipLength(s.type, L));
    root.add(obj);
    const { hp } = craftStats(s.nation, s.type);
    return { type: s.type, nation: s.nation, hull: HULL[s.type], m: { pos, vel: [0, 0, 0], fwd, speed: 0 }, hp, maxHp: hp, radius: bodyRadius(s.type, L), cool: rand() * 0.3, mode: 'run', shots: 0, hits: 0, obj, alive: true, diedAt: null };
  }
  const place = (d: Duelist) => {
    d.obj.position.set(...d.m.pos);
    const f = d.m.fwd;
    d.obj.lookAt(d.m.pos[0] - f[0], d.m.pos[1] - f[1], d.m.pos[2] - f[2]);
  };
  function clear() {
    for (const s of ships) root.remove(s.obj);
    for (const b of shots) root.remove(b.mesh);
    ships = [];
    shots = [];
    trial = null;
    winner = null;
    time = 0;
  }

  function fire(i: number, d: Duelist, tgt: Duelist, aim: V3) {
    const speed = BOLT_SPEED * L;
    const dir = unit(add(aim, [gauss() * AIM_ERROR, gauss() * AIM_ERROR, gauss() * AIM_ERROR]));
    const mesh = new THREE.Mesh(boltGeo, boltMat[i]);
    root.add(mesh);
    const pos = add(d.m.pos, scale(dir, d.radius * 0.6));
    shots.push({ pos, vel: add(scale(dir, speed), d.m.vel), age: 0, from: i, mesh });
    d.shots++;
    void tgt;
  }

  function stepFight(dt: number) {
    for (let i = 0; i < ships.length; i++) {
      const d = ships[i];
      const tgt = ships[1 - i];
      if (!d.alive) continue;
      const prey = { pos: tgt.m.pos, vel: tgt.m.vel, fwd: tgt.m.fwd, cone: tgt.hull.cone };
      const range = d.hull.range * L;
      let want: V3;
      if (!tgt.alive) want = scale(d.m.fwd, d.m.speed); // the fight is over: fly on
      else if (d.type === 'destroyer') {
        const o = hunterThink(d.m, d.hp / d.maxHp, prey, range, d.hull, L, d.mode);
        d.mode = o.mode;
        want = o.want;
      } else if (d.type === 'capital') want = scale(unit(sub(tgt.m.pos, d.m.pos)), dist(tgt.m.pos, d.m.pos) > range * 0.7 ? d.hull.speed * L : 0);
      else want = gunshipThink(d.m, prey, range, BOLT_SPEED * L, d.hull, L).want;
      d.m = fly(d.m, want, d.hull, L, dt);
      // Guns: every gun on its own cooldown, folded into one: `guns` shots per 1/rate seconds.
      d.cool -= dt;
      if (tgt.alive && d.cool <= 0 && d.mode !== 'break') {
        const hit = intercept(d.m.pos, BOLT_SPEED * L, tgt.m.pos, sub(tgt.m.vel, d.m.vel));
        const aim = unit(sub(hit ? hit.point : tgt.m.pos, d.m.pos));
        if (dist(tgt.m.pos, d.m.pos) <= range && bears(d.m.fwd, aim, d.hull.cone)) {
          fire(i, d, tgt, aim);
          d.cool = 1 / (d.hull.rate * d.hull.guns);
        }
      }
    }
    for (let k = shots.length - 1; k >= 0; k--) {
      const b = shots[k];
      const from = b.pos;
      b.pos = add(b.pos, scale(b.vel, dt));
      b.age += dt;
      const tgt = ships[1 - b.from];
      let gone = b.age > BOLT_LIFE;
      if (!gone && tgt.alive && sweptHit(from, b.pos, tgt.m.pos, tgt.radius + LASER.radius)) {
        const shooter = ships[b.from];
        tgt.hp -= shooter.hull.damage;
        shooter.hits++;
        gone = true;
        if (tgt.hp <= 0) { tgt.alive = false; tgt.obj.visible = false; tgt.diedAt = time; winner = b.from; }
      }
      if (gone) { root.remove(b.mesh); shots.splice(k, 1); } else {
        b.mesh.position.set(...b.pos);
        const v = unit(b.vel);
        b.mesh.lookAt(b.pos[0] + v[0], b.pos[1] + v[1], b.pos[2] + v[2]);
      }
    }
  }

  function stepTrial(t: Trial, dt: number) {
    const d = t.d;
    t.t += dt;
    if (t.phase === 'straight') {
      d.m = fly(d.m, scale(t.turnStartFwd, 1e6), d.hull, L, dt);
      t.top = Math.max(t.top, d.m.speed / L);
      // At top speed (or after 40 s for a slow capital ship), start the half turn.
      if (d.m.speed >= d.hull.speed * L * 0.999 || t.t > 40) { t.phase = 'turn'; t.turnStart = t.t; }
    } else if (t.turnTime === null) {
      const before = d.m.fwd;
      d.m = fly(d.m, scale(t.turnStartFwd, -1e6), d.hull, L, dt);
      t.samples.push(Math.acos(Math.max(-1, Math.min(1, dot(before, d.m.fwd)))) / dt);
      if (dot(d.m.fwd, t.turnStartFwd) < -0.999) t.turnTime = t.t - t.turnStart;
    }
  }

  return {
    root,
    /** Two ships, `gap` × A's gun range apart, `ahead` world units in front of `at` along `fwd`. */
    start(a: DuelSide, b: DuelSide, at: V3, fwd: V3 = [0, 0, -1], gap = 1.6, ahead = 30, s = 1) {
      clear();
      seed = s;
      const c = add(at, scale(unit(fwd), ahead));
      const side = unit([fwd[2], 0, -fwd[0]]);
      const half = (HULL[a.type].range * L * gap) / 2;
      ships = [make(a, add(c, scale(side, -half)), side), make(b, add(c, scale(side, half)), scale(side, -1))];
      ships.forEach(place);
    },
    /** A lone ship flies straight from rest to its top speed, then turns half round; the measured numbers. */
    trial(s: DuelSide, at: V3, fwd: V3 = [0, 0, -1], ahead = 20) {
      clear();
      const f = unit(fwd);
      const d = make(s, add(at, scale(f, ahead)), f);
      ships = [d];
      trial = { d, t: 0, phase: 'straight', top: 0, turnStart: 0, turnStartFwd: f, turnTime: null, samples: [] };
    },
    /** Carry the range along with `cam` from now on (null: leave it in world space). */
    follow(cam: THREE.Camera | null) {
      follow = cam ? { cam, from: cam.getWorldPosition(new THREE.Vector3()) } : null;
      root.position.set(0, 0, 0);
    },
    update(dt: number) {
      if (follow) follow.cam.getWorldPosition(root.position).sub(follow.from);
      if (!ships.length) return;
      time += dt;
      if (trial) stepTrial(trial, dt); else if (ships.length === 2) stepFight(dt);
      ships.forEach(place);
    },
    get state() {
      return {
        time: +time.toFixed(2), winner: winner === null ? null : `${ships[winner].nation} ${ships[winner].type}`,
        ships: ships.map((d) => ({ type: d.type, nation: d.nation, hp: +d.hp.toFixed(0), maxHp: d.maxHp, alive: d.alive, diedAt: d.diedAt, mode: d.type === 'destroyer' ? d.mode : '-', speedL: +(d.m.speed / L).toFixed(2), shots: d.shots, hits: d.hits, pos: d.m.pos.map((v) => +v.toFixed(1)) })),
        trial: trial && { type: trial.d.type, topSpeedL: +trial.top.toFixed(2), halfTurnS: trial.turnTime === null ? null : +trial.turnTime.toFixed(2), turnRate: trial.turnTime === null ? null : +(Math.PI / trial.turnTime).toFixed(3), peakTurn: trial.samples.length ? +Math.max(...trial.samples).toFixed(3) : null },
      };
    },
    /** Each type's model length in the scene, in world units and in player-ship lengths: measured off the meshes. */
    sizes(nation: NationId = 'earth') {
      const out: Record<string, { world: number; L: number }> = {};
      for (const t of SHIP_TYPES) {
        const o = fleet.make(t, nationOf(nation), shipLength(t, L));
        o.updateMatrixWorld(true);
        const box = new THREE.Box3();
        o.traverse((c) => { if (c instanceof THREE.Mesh && !c.userData.exhaust) { c.geometry.computeBoundingBox(); box.union(c.geometry.boundingBox!.clone().applyMatrix4(c.matrixWorld)); } });
        const z = box.max.z - box.min.z;
        out[t] = { world: +z.toFixed(4), L: +(z / L).toFixed(3) };
      }
      return out;
    },
    /**
     * Still models for a look: every nation's destroyer in a row (`kind` 'destroyers'), or one nation's ladder of
     * fighter, cruiser, destroyer and capital ship side by side ('ladder'), broadside on, `ahead` in front of `at`.
     */
    lineup(kind: 'destroyers' | 'ladder', at: V3, fwd: V3, ahead = 4, nation: NationId = 'mars', lift = 0) {
      clear();
      const f = unit(fwd);
      const side = unit([f[2], 0, -f[0]]);
      const row: DuelSide[] = kind === 'destroyers' ? NATIONS.map((n) => ({ type: 'destroyer' as ShipType, nation: n.id })) : (['fighter', 'cruiser', 'destroyer', 'capital'] as ShipType[]).map((type) => ({ type, nation }));
      const widths = row.map((s) => shipLength(s.type, L) * (kind === 'ladder' ? 1.05 : 0.5) + L * 0.5);
      let x = -widths.reduce((a, b) => a + b, 0) / 2;
      ships = row.map((s, i) => {
        x += widths[i] / 2;
        const d = make(s, add(add(add(at, scale(f, ahead)), scale(side, x)), [0, lift, 0]), kind === 'ladder' ? side : unit(add(side, scale(f, -0.6))));
        x += widths[i] / 2;
        d.alive = false; // a still: no flying, no guns
        return d;
      });
      ships.forEach(place);
    },
    clear,
    dispose() { clear(); scene.remove(root); fleet.dispose(); boltGeo.dispose(); boltMat.forEach((m) => m.dispose()); },
    get len() { return len; },
  };
}

export type Duel = ReturnType<typeof createDuel>;
