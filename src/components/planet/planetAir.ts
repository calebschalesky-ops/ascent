/**
 * Flying in air: which body's atmosphere the ship is in, the flight model there, the camera, and everything drawn
 * for it (streaming ground, the sky from inside, cloud decks, entry glow). Voyage calls it through a few hooks:
 *
 *   update(ship)        once a frame before physics: goes into or out of an atmosphere
 *   step(dt, ship, in)  in air, instead of the space flight model
 *   orient(shipObj)     in air, the ship's attitude (level with the ground, not with the cosmos)
 *   camera(camera, …)   after the camera is placed: the camera in air, and smoothing every change of mode
 *   render(…)           just before drawing: rides along with the planet's spin, streams the ground, the sky
 *
 * In air the ship's yaw and pitch are kept against the local horizon (a level frame carried along the sphere), so
 * "level" means level with the ground under you anywhere on the planet, and flight assist holds you there. Outside,
 * the space model is untouched. The air itself turns with the planet, so the ship rides along with the spin.
 */
import * as THREE from 'three';
import {
  AIR, AIR_BODIES, ATMO, airBlend, airSpeedStep, buffet, crushAccel, density, isAirBody, maxAirspeed, plasmaGlow as glowOf,
  pullUp, sinkAccel, skyAt,
} from '../../lib/atmosphere';
import type { AirBody } from '../../lib/atmosphere';
import { KM_PER_UNIT } from '../../lib/bodies';
import { groundHeight, hasGround } from '../../lib/terrain';
import type { GroundBody } from '../../lib/terrain';
import { PlanetTerrain } from './terrainMesh';
import type { AirUniforms } from './terrainMesh';
import { CLOUD_LAYERS, cloudDeck, createDome, fadeStars, plasmaGlow, setDomeLayers } from './sky';
import { atmosphereMaterial } from '../space/materials';
import type { SpaceUniforms } from '../space/materials';

/** What the scene tells us about each body: the object that spins with it, its surface material, its radius. */
export interface BodyFrame { spin: THREE.Object3D; surface: THREE.Material | null; radius: number }
export interface AirWorld { frames: Map<string, BodyFrame>; sky: THREE.Object3D[] }

export interface AirShip {
  pos: THREE.Vector3; vel: THREE.Vector3; speed: number; yaw: number; pitch: number; roll: number;
  yawRate: number; pitchRate: number; push: number;
}
export interface AirInput {
  yawIn: number; pitchIn: number; // -1..1, after sensitivity shaping and invert
  want: number; // the speed the throttle (or autopilot) asks for
  assist: boolean;
  sens: number;
  ap: THREE.Vector3 | null; // the autopilot's aim point, if it is flying: in air it climbs out toward it first
  stop: boolean;
}
export interface AirHud {
  body: AirBody;
  alt: number; // above the ground (or, on a gas giant, above the cloud tops: negative below them), scene units
  airspeed: number;
  density: number; // relative to Earth's at sea level
  glow: number; // entry plasma 0..1
  warn: boolean; // pull up
  limited: boolean; // slowing near the ground
  crush: boolean; // the pressure is pushing back
  event: { text: string; n: number } | null;
}

/**
 * Haze over the ground and the giants' decks, per km of sight line at Earth's sea-level density: 1/e at about 45 km.
 * It was 0.012 per scene unit, tuned when a unit was 0.54 km; ships went x5 smaller against the world on 2026-10-21
 * (KM_PER_UNIT) and the ground stayed true in km, so a per-unit haze hid everything past 9 km (GRAPHICS-PASS-3 #1).
 */
const HAZE_PER_KM = 0.012 / (0.2 / 0.3708);
/** Below this altitude (fraction of R) the streaming ground replaces the planet's sphere. */
export const TERRAIN_ON = 0.3;
const NAME: Record<AirBody, string> = { earth: 'Earth', moon: 'the Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
const Y = new THREE.Vector3(0, 1, 0);
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fwd = (yaw: number, pitch: number, out = new THREE.Vector3()) =>
  out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));

export interface PlanetAirOptions { maxYaw: number; maxPitch: number; shipLength: number; shipScale: number }

export function createPlanetAir(scene: THREE.Scene, space: SpaceUniforms, getWorld: () => AirWorld | null, opts: PlanetAirOptions) {
  const au: AirUniforms & { uTime: { value: number } } = {
    uSun: space.uSun, uTime: space.uTime,
    uHazeColor: { value: new THREE.Color() }, uHaze: { value: 0 }, uAmbient: { value: new THREE.Color() },
  };
  const dome = createDome();
  scene.add(dome.mesh);
  const plasma = plasmaGlow();
  scene.add(plasma.mesh);
  const terrains = new Map<GroundBody, PlanetTerrain>();
  let terrainQuality: 'high' | 'low' | null = null;
  const decks = new Map<AirBody, THREE.Mesh[]>();
  let hiddenGlobe: THREE.Material | null = null; // a giant's own globe, hidden while the dome's cloud layers stand for it
  let rimsAdded = false;

  // ---- flight state in air ----
  let body: AirBody | null = null;
  let frame: BodyFrame | null = null;
  const centre = new THREE.Vector3();
  const F = new THREE.Quaternion(); // the level frame: its +y is the local up
  let yaw = 0, pitch = 0, roll = 0, yawRate = 0, pitchRate = 0;
  const spinPrev = new THREE.Quaternion();
  let touching = false;
  let crushed = false;
  let thrown = 0;
  let warn = false;
  let limited = false;
  let glow = 0;
  let shake = 0;
  let lastDt = 1 / 60;
  let event: { text: string; n: number } | null = null;
  let eventN = 0;
  const dbg = { terrainHits: 0, crushPushes: 0, entries: 0, exits: 0, minAlt: Infinity, maxDepth: 0, maxGlow: 0, warnFrames: 0 };

  // ---- camera ----
  let camY = 0, camP = 0;
  const corr = new THREE.Quaternion();
  const lastCamQ = new THREE.Quaternion();
  let haveCam = false;
  let switched = false;
  let upTouched = false;

  // scratch
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();
  const e1 = new THREE.Euler(0, 0, 0, 'YXZ');

  const fineSpacing = (R: number) => 0.08 / R;
  /** Distance from the centre to what you would touch under a world point (ground, sea, or null on a gas giant). */
  const groundR = (b: AirBody, f: BodyFrame, p: THREE.Vector3): number | null => {
    if (!hasGround(b)) return null;
    const local = f.spin.worldToLocal(v3.copy(p)).normalize();
    return f.radius * (1 + groundHeight(b, local.x, local.y, local.z, fineSpacing(f.radius)));
  };

  function enter(id: AirBody, f: BodyFrame, ship: AirShip) {
    body = id;
    frame = f;
    f.spin.getWorldPosition(centre);
    const up = v1.copy(ship.pos).sub(centre).normalize();
    F.setFromUnitVectors(Y, up);
    // The ship keeps exactly the attitude it had; only what counts as level changes. Roll then eases to the bank.
    q1.setFromEuler(e1.set(ship.pitch, ship.yaw, ship.roll, 'YXZ'));
    q2.copy(F).invert().multiply(q1);
    e1.setFromQuaternion(q2, 'YXZ');
    pitch = clamp(e1.x, -1.4, 1.4); yaw = e1.y; roll = e1.z;
    yawRate = 0; pitchRate = 0;
    f.spin.getWorldQuaternion(spinPrev);
    touching = false; crushed = false;
    event = { text: `Into ${NAME[id]}’s air`, n: ++eventN };
    dbg.entries++;
    switched = true;
  }
  function exit(ship: AirShip) {
    if (!body) return;
    event = { text: `Out of ${NAME[body]}’s air`, n: ++eventN };
    body = null;
    frame = null;
    ship.roll = 0;
    warn = false; limited = false;
    dbg.exits++;
    switched = true;
  }

  return {
    dbg,
    get active() { return body !== null; },
    get body() { return body; },
    /** Bodies with air are slowed for by approachLimit, not by Voyage's "slowing near a surface". */
    hasAir: (id: string) => isAirBody(id) && !!getWorld()?.frames.has(id),
    /** The body whose ground (or crush depth) is handled here rather than by Voyage's solid sphere. */
    handles: (id: string) => body === id,
    get terrains() { return terrains; },
    /** Height of a world point above the ground (or the cloud tops) of the body whose air you are in. */
    altitudeAt(p: THREE.Vector3): number {
      if (!body || !frame) return Infinity;
      const d = p.distanceTo(centre);
      const g = groundR(body, frame, p);
      return d - (g ?? frame.radius);
    },
    /** The ship's attitude against the local horizon (radians), for tests and a future attitude indicator. */
    get local() { return { yaw, pitch, roll, yawRate, pitchRate }; },
    /** In air: the local vertical (world space) that yaw turns about and pitch is measured from; null outside. */
    get up(): [number, number, number] | null { if (!body) return null; const u = v4.copy(Y).applyQuaternion(F); return [u.x, u.y, u.z]; },

    /** Out of the air without a banner or a camera swing: going into a body's room, or a journey loaded. */
    leaveQuietly(ship: AirShip) {
      if (!body) return;
      body = null;
      frame = null;
      ship.roll = 0;
      warn = false; limited = false; glow = 0; shake = 0;
      haveCam = false;
      corr.identity();
      switched = true;
    },

    /** Once a frame before physics: in or out of an atmosphere. */
    update(ship: AirShip) {
      const w = getWorld();
      if (!w) return;
      if (body && frame) {
        const h = ship.pos.distanceTo(centre) / frame.radius - 1;
        if (h > ATMO[body].top * 1.03) exit(ship);
      }
      if (!body) {
        for (const id of AIR_BODIES) {
          const f = w.frames.get(id);
          if (!f) continue;
          f.spin.getWorldPosition(v1);
          if (ship.pos.distanceTo(v1) / f.radius - 1 < ATMO[id].top) { enter(id, f, ship); break; }
        }
      }
    },

    /** Speed limit from space toward an atmosphere on your line: arrive at its top no faster than AIR.entry. */
    approachLimit(pos: THREE.Vector3, heading: THREE.Vector3): number {
      const w = getWorld();
      if (!w) return Infinity;
      let lim = Infinity;
      for (const id of AIR_BODIES) {
        const f = w.frames.get(id);
        if (!f || id === body) continue;
        const Rt = f.radius * (1 + ATMO[id].top);
        f.spin.getWorldPosition(v1).sub(pos);
        const along = v1.dot(heading);
        if (along <= 0) continue;
        const perp2 = v1.lengthSq() - along * along;
        if (perp2 > Rt * Rt) continue;
        const toShell = along - Math.sqrt(Rt * Rt - perp2);
        if (toShell > 0) lim = Math.min(lim, Math.max(AIR.entry, toShell * 0.8));
      }
      return lim;
    },

    /** One step of flight in air. Writes the ship's position, velocity, speed and its world yaw and pitch. */
    step(dt: number, ship: AirShip, inp: AirInput) {
      if (!body || !frame) return;
      lastDt = dt;
      const s = ATMO[body];
      const R = frame.radius;
      const rel = v1.copy(ship.pos).sub(centre);
      const dist = rel.length();
      const up = rel.divideScalar(dist); // v1 is now the local up
      const h = dist / R - 1;
      // Carry the level frame along the sphere, so level stays level as you fly round the planet.
      q1.setFromUnitVectors(v2.copy(Y).applyQuaternion(F), up);
      F.premultiply(q1);

      // ---- steering, against the local horizon ----
      let wantYawRate: number;
      let wantPitchRate: number;
      if (inp.ap) {
        // The autopilot climbs out first: nose up 30°, turning toward its aim.
        const aim = v2.copy(inp.ap).sub(ship.pos).applyQuaternion(q2.copy(F).invert());
        wantYawRate = clamp(wrapPi(Math.atan2(-aim.x, -aim.z) - yaw) * 3, -opts.maxYaw, opts.maxYaw);
        wantPitchRate = clamp((0.52 - pitch) * 3, -opts.maxPitch, opts.maxPitch);
      } else {
        wantYawRate = clamp(inp.yawIn * opts.maxYaw * inp.sens, -opts.maxYaw * 1.6, opts.maxYaw * 1.6);
        wantPitchRate = clamp(inp.pitchIn * opts.maxPitch * inp.sens, -opts.maxPitch * 1.6, opts.maxPitch * 1.6);
        if (inp.assist && Math.abs(inp.pitchIn) < 0.02) wantPitchRate = -pitch * 0.6;
      }
      const ease = 1 - Math.exp(-dt * 5);
      yawRate += (wantYawRate - yawRate) * ease;
      pitchRate += (wantPitchRate - pitchRate) * ease;
      yaw = wrapPi(yaw + yawRate * dt);
      pitch = clamp(pitch + pitchRate * dt, -1.4, 1.4);
      const b = airBlend(s, h);
      // Bank into turns, more in thick air, like a wing.
      roll += (clamp(-yawRate * 0.55 * (1 + 0.6 * b), -0.95, 0.95) - roll) * (1 - Math.exp(-dt * 2.5));

      // ---- speed: thrust against drag; slowing for the ground ahead ----
      const rho = density(s, h);
      let want = inp.stop ? 0 : inp.ap ? Math.max(inp.want, Math.min(maxAirspeed(rho), 1e5)) : inp.want;
      const gR = groundR(body, frame, ship.pos);
      const groundAlt = gR === null ? dist - R : dist - gR;
      const descent = -ship.vel.dot(up);
      limited = false;
      if (gR !== null && descent > 0.01) {
        // Never closer than 1.2 s to the ground on this line: like the space model's "slowing near a surface".
        const v = Math.max(AIR.vSea * 0.08, (Math.max(0, groundAlt - AIR.clearance) * Math.max(ship.speed, 1)) / (1.2 * descent));
        if (want > v) { want = v; limited = true; }
      }
      const before = ship.speed;
      // Braking for the ground is firmer than drag alone: reverse thrust.
      if (limited && ship.speed > want) ship.speed = Math.max(want, ship.speed - Math.max(60, (ship.speed - want) * 6) * dt);
      ship.speed = airSpeedStep(ship.speed, want, rho, dt);
      ship.push = want > before + 0.3 ? 1 : want < before - 0.3 ? 0 : 0.4;

      // ---- velocity: follows the nose (tighter in thick air), sinks without lift, pushed back from the crush ----
      const heading = fwd(yaw, pitch, v2).applyQuaternion(F);
      const grip = thrown > 0 ? 0.3 : (inp.ap ? 7 : inp.assist ? 5 : 1.6) * (1 - b) + AIR.turnGrip * b;
      ship.vel.lerp(heading.multiplyScalar(ship.speed), 1 - Math.exp(-dt * grip));
      ship.vel.addScaledVector(up, -sinkAccel(s, h, ship.speed) * dt);
      const push = crushAccel(s, h);
      if (push > 0) ship.vel.addScaledVector(up, push * dt);
      // Once the pressure beats the engines, the hull is thrown back up and the engines choke.
      if (push > AIR.thrust && !crushed) {
        crushed = true;
        thrown = 1.5;
        dbg.crushPushes++;
      } else if (push < AIR.thrust * 0.3) crushed = false;
      if (thrown > 0) {
        // Thrown back: the engines choke and the pressure lifts the hull for a moment and a half.
        thrown -= dt;
        ship.speed *= Math.exp(-dt * 3);
        ship.vel.addScaledVector(up, 24 * dt);
      }
      ship.pos.addScaledVector(ship.vel, dt);

      // ---- the floor: the crush depth on a gas giant, the ground (or sea) elsewhere ----
      const d2 = ship.pos.distanceTo(centre);
      if (!s.surface) {
        const floor = R * (1 - s.crush);
        if (d2 < floor) {
          ship.pos.copy(centre).addScaledVector(up, floor);
          const vn = ship.vel.dot(up);
          if (vn < 0) ship.vel.addScaledVector(up, -vn * 1.6); // bounced back out
          if (!crushed) dbg.crushPushes++;
          crushed = true;
        }
        dbg.maxDepth = Math.max(dbg.maxDepth, (R - d2) / R);
      } else {
        const g2 = groundR(body, frame, ship.pos)!;
        const min = g2 + AIR.clearance;
        if (d2 < min) {
          const n = v3.copy(ship.pos).sub(centre).normalize();
          ship.pos.copy(centre).addScaledVector(n, min);
          const vn = ship.vel.dot(n);
          if (vn < 0) ship.vel.addScaledVector(n, -vn);
          ship.speed *= 0.6;
          if (!touching) dbg.terrainHits++;
          touching = true;
        } else touching = d2 < min + 0.05;
        dbg.minAlt = Math.min(dbg.minAlt, d2 - g2);
      }

      // ---- pull up: the ground on this line within a couple of seconds ----
      warn = false;
      if (s.surface) {
        if (pullUp(groundAlt - AIR.clearance, descent)) warn = true;
        for (const t of [0.4, 0.8, 1.2, 1.6, 2.0, 2.5]) {
          const p = v3.copy(ship.pos).addScaledVector(ship.vel, t);
          const g = groundR(body, frame, p)!;
          if (p.distanceTo(centre) - g < AIR.clearance * 1.5) { warn = true; break; }
        }
      } else warn = push > 0;
      if (warn) dbg.warnFrames++;

      // The rest of the game reads the ship's world yaw and pitch (the nose for weapons, the map's heading).
      const f = fwd(yaw, pitch, v2).applyQuaternion(F);
      ship.yaw = Math.atan2(-f.x, -f.z);
      ship.pitch = Math.asin(clamp(f.y, -1, 1));
      ship.yawRate = yawRate;
      ship.pitchRate = pitchRate;
    },

    /** In air: the ship's attitude against the local horizon. */
    orient(obj: THREE.Object3D) {
      if (!body) return;
      obj.quaternion.copy(F).multiply(q1.setFromEuler(e1.set(pitch, yaw, roll, 'YXZ')));
    },

    /**
     * After Voyage has placed the camera: in air, place it against the local horizon instead; and whenever the
     * mode changes, swing smoothly from where the camera was rather than snapping.
     */
    camera(camera: THREE.PerspectiveCamera, shipPos: THREE.Vector3, offset: THREE.Vector3, look?: THREE.Vector3) {
      if (body) {
        if (switched) { camY = yaw; camP = pitch; }
        // Mouse look (mc-controls R1): the camera looks along the aim, given in world space, instead of trailing the nose.
        let wantY = yaw;
        let wantP = pitch;
        if (look) {
          const l = v3.copy(look).applyQuaternion(q2.copy(F).invert());
          wantY = Math.atan2(-l.x, -l.z);
          wantP = Math.asin(clamp(l.y / Math.max(l.length(), 1e-9), -1, 1));
        }
        const turn = 1 - Math.exp(-lastDt * (look ? 25 : 7));
        camY += wrapPi(wantY - camY) * turn;
        camP += (wantP - camP) * turn;
        const qOff = q1.copy(F).multiply(q2.setFromEuler(e1.set(camP * 0.7, camY, 0, 'YXZ')));
        camera.position.copy(offset).applyQuaternion(qOff).add(shipPos);
        camera.up.copy(Y).applyQuaternion(F);
        upTouched = true;
        if (look) camera.lookAt(v1.copy(camera.position).add(fwd(camY, camP, v2).applyQuaternion(F))); // the centre is the aim
        else camera.lookAt(v1.copy(shipPos).add(fwd(camY, camP, v2).applyQuaternion(F).multiplyScalar(5 * opts.shipScale)));
      } else if (upTouched) {
        camera.up.copy(Y);
        upTouched = false;
        camera.lookAt(v1.copy(camera.position).add(v2.set(0, 0, -1).applyQuaternion(camera.quaternion)));
      }
      if (switched && haveCam) corr.copy(lastCamQ).multiply(q1.copy(camera.quaternion).invert());
      switched = false;
      corr.slerp(q2.identity(), 1 - Math.exp(-lastDt * 2.2));
      if (Math.abs(corr.w) < 0.99999) {
        const off = v1.copy(camera.position).sub(shipPos).applyQuaternion(corr);
        camera.position.copy(shipPos).add(off);
        camera.quaternion.premultiply(corr);
      }
      if (shake > 0.01) {
        const a = opts.shipLength * 0.05 * shake;
        camera.position.add(v1.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a));
      }
      lastCamQ.copy(camera.quaternion);
      haveCam = true;
    },

    /**
     * Just before drawing. Rides along with the planet's spin since physics (the planet turned in world.update, and
     * the air turns with it); streams the ground for the nearest body; sets the sky, the haze and the entry glow.
     */
    render(camera: THREE.PerspectiveCamera, shipObj: THREE.Object3D, ship: AirShip, quality: 'high' | 'low', heat: HTMLElement | null) {
      const w = getWorld();
      if (!w) return;
      if (!rimsAdded) {
        // The Moon and Mercury had no air: give them the same kind of rim the others have, at their air's top.
        for (const [id, col] of [['moon', 0x9fb0d0], ['mercury', 0xd0c0a8]] as const) {
          const f = w.frames.get(id);
          if (f) f.spin.add(new THREE.Mesh(new THREE.SphereGeometry(f.radius * (1 + ATMO[id].top), 96, 48), atmosphereMaterial(col, 0.5, space)));
        }
        rimsAdded = true;
      }
      if (body && frame) {
        const q = frame.spin.getWorldQuaternion(q1);
        const dq = q2.copy(q).multiply(spinPrev.invert());
        spinPrev.copy(q);
        if (Math.abs(dq.w) < 0.9999999999) {
          const about = (p: THREE.Vector3) => p.sub(centre).applyQuaternion(dq).add(centre);
          about(ship.pos);
          ship.vel.applyQuaternion(dq);
          F.premultiply(dq);
          shipObj.position.copy(ship.pos);
          shipObj.quaternion.premultiply(dq);
          about(camera.position);
          camera.quaternion.premultiply(dq);
          camera.up.applyQuaternion(dq);
          lastCamQ.copy(camera.quaternion);
        }
      }

      // ---- the ground: the nearest body with ground, once low enough ----
      if (terrainQuality !== quality) {
        for (const t of terrains.values()) t.dispose();
        terrains.clear();
        terrainQuality = quality;
      }
      let near: { id: GroundBody; f: BodyFrame; h: number } | null = null;
      for (const id of AIR_BODIES) {
        if (!hasGround(id)) continue;
        const f = w.frames.get(id);
        if (!f) continue;
        const h = camera.position.distanceTo(f.spin.getWorldPosition(v1)) / f.radius - 1;
        if (h < TERRAIN_ON && (!near || h < near.h)) near = { id, f, h };
      }
      for (const [id, t] of terrains) {
        if (near && id === near.id) continue;
        t.group.visible = false;
        const f = w.frames.get(id);
        if (f?.surface) f.surface.visible = true;
      }
      if (near) {
        let t = terrains.get(near.id);
        if (!t) {
          const hi = quality === 'high';
          t = new PlanetTerrain({ body: near.id, radius: near.f.radius, segments: hi ? 32 : 16, minSpacing: hi ? 0.12 : 0.3, maxChunks: hi ? 700 : 350 }, au);
          terrains.set(near.id, t);
          // Keep at most two bodies' ground in memory.
          if (terrains.size > 2) for (const [id, old] of terrains) if (id !== near.id) { old.dispose(); terrains.delete(id); const f = w.frames.get(id); if (f?.surface) f.surface.visible = true; break; }
        }
        if (t.group.parent !== near.f.spin) near.f.spin.add(t.group);
        t.group.visible = true;
        t.update(near.f.spin.worldToLocal(v1.copy(camera.position)));
        if (near.f.surface) near.f.surface.visible = !t.ready;
      }

      // ---- gas giants' cloud decks, near them ----
      for (const id of ['jupiter', 'saturn'] as const) {
        const f = w.frames.get(id);
        if (!f) continue;
        const h = camera.position.distanceTo(f.spin.getWorldPosition(v1)) / f.radius - 1;
        const on = h < ATMO[id].top * 1.5;
        let d = decks.get(id);
        if (on && !d) {
          const s = ATMO[id];
          d = [cloudDeck(f.radius * (1 + 0.004), s.horizon, au, 1.7), cloudDeck(f.radius * (1 - s.crush * 0.45), s.zenith.map((c) => c * 1.2) as [number, number, number], au, 5.3)];
          for (const m of d) f.spin.add(m);
          decks.set(id, d);
        }
        if (d) for (const m of d) m.visible = on;
      }

      // ---- the sky, and the haze over the ground ----
      let cover = 0;
      let hazeBody: { id: AirBody; f: BodyFrame; h: number } | null = null;
      for (const id of AIR_BODIES) {
        const f = w.frames.get(id);
        if (!f) continue;
        const h = camera.position.distanceTo(f.spin.getWorldPosition(v1)) / f.radius - 1;
        if (h < TERRAIN_ON && (!hazeBody || h / ATMO[id].top < hazeBody.h / ATMO[hazeBody.id].top)) hazeBody = { id, f, h };
      }
      if (hazeBody) {
        const s = ATMO[hazeBody.id];
        hazeBody.f.spin.getWorldPosition(v1);
        const up = v2.copy(camera.position).sub(v1).normalize();
        const sunDir = v3.copy(space.uSun.value).sub(camera.position).normalize();
        const sunUp = up.dot(sunDir);
        const sky = skyAt(s, hazeBody.h, sunUp);
        const dark = !s.surface && hazeBody.h < 0 ? Math.exp((hazeBody.h / s.scale) * 0.35) : 1; // light fades deep in a giant
        cover = hazeBody.h < s.top ? Math.min(0.995, sky.cover + (1 - sky.cover) * (1 - dark)) : 0;
        dome.u.uUp.value.copy(up);
        dome.u.uSunDir.value.copy(sunDir);
        dome.u.uZenith.value.setRGB(sky.zenith[0] * dark, sky.zenith[1] * dark, sky.zenith[2] * dark);
        dome.u.uHorizon.value.setRGB(sky.horizon[0] * dark, sky.horizon[1] * dark, sky.horizon[2] * dark);
        dome.u.uCover.value = cover;
        // The cloud layers of a thick air, banded about the planet's own axis, and the Sun's halo through them.
        const layers = CLOUD_LAYERS[hazeBody.id];
        setDomeLayers(dome, layers, hazeBody.h, s.scale, s.surface);
        dome.u.uAxis.value.copy(Y).applyQuaternion(hazeBody.f.spin.getWorldQuaternion(q3));
        dome.u.uTime.value = space.uTime.value;
        dome.u.uSunHaze.value = layers ? clamp(cover * 1.1, 0, 1) : cover * 0.3;
        dome.mesh.position.copy(camera.position);
        dome.mesh.scale.setScalar(hazeBody.f.radius * 0.8);
        const day = clamp((sunUp + 0.12) / 0.3, 0, 1);
        const hk = (0.06 + 0.94 * day) * dark;
        au.uHazeColor.value.setRGB(s.horizon[0] * hk, s.horizon[1] * hk, s.horizon[2] * hk);
        au.uHaze.value = HAZE_PER_KM * KM_PER_UNIT * Math.sqrt(density(s, hazeBody.h) + 0.1 * s.rho0) * (s.surface ? 1 : 3);
        au.uAmbient.value.setRGB(s.zenith[0] * 0.3 * day + 0.015, s.zenith[1] * 0.3 * day + 0.015, s.zenith[2] * 0.3 * day + 0.015);
      }
      dome.mesh.visible = cover > 0.002;
      // Once the sky has closed in, the dome's own layers stand for the decks and for a giant's globe: seen from just
      // above its cloud tops, the globe is an opaque floor a few units down that the haze paints one flat colour.
      if (cover > 0.5) for (const d of decks.values()) for (const m of d) m.visible = false;
      const globe = cover > 0.5 && hazeBody && !ATMO[hazeBody.id].surface ? hazeBody.f.surface : null;
      if (hiddenGlobe && hiddenGlobe !== globe) hiddenGlobe.visible = true;
      if (globe) globe.visible = false;
      hiddenGlobe = globe;
      fadeStars(w.sky, cover);

      // ---- entry: plasma round the ship, the heat at the screen's edges, the buffeting ----
      let gTarget = 0;
      let bTarget = 0;
      if (body && frame) {
        const rho = density(ATMO[body], ship.pos.distanceTo(centre) / frame.radius - 1);
        const v = ship.vel.length();
        gTarget = glowOf(rho, v);
        bTarget = buffet(rho, v);
      }
      glow += (gTarget - glow) * (1 - Math.exp(-lastDt * (gTarget > glow ? 6 : 0.9)));
      shake += (bTarget - shake) * (1 - Math.exp(-lastDt * 4));
      dbg.maxGlow = Math.max(dbg.maxGlow, glow);
      plasma.mesh.visible = glow > 0.01;
      if (plasma.mesh.visible) {
        const dir = v1.copy(ship.vel).normalize();
        plasma.u.uGlow.value = glow;
        plasma.mesh.position.copy(ship.pos).addScaledVector(dir, opts.shipLength * 0.2);
        plasma.mesh.quaternion.setFromUnitVectors(v2.set(0, 0, -1), dir);
        plasma.mesh.scale.set(opts.shipLength * 0.55, opts.shipLength * 0.5, opts.shipLength * 0.95);
      }
      if (heat) {
        heat.style.opacity = String(Math.min(0.85, glow * 0.8));
        heat.style.display = glow > 0.01 ? 'block' : 'none';
      }
    },

    hud(ship: AirShip): AirHud | null {
      if (!body || !frame) return null;
      const dist = ship.pos.distanceTo(centre);
      const gR = groundR(body, frame, ship.pos);
      return {
        body,
        alt: gR === null ? dist - frame.radius : dist - gR,
        airspeed: ship.vel.length(),
        density: density(ATMO[body], dist / frame.radius - 1),
        glow, warn, limited,
        crush: crushAccel(ATMO[body], dist / frame.radius - 1) > 0,
        event,
      };
    },
    /** The latest into/out-of-the-air message, for a banner (also after leaving, when hud() is null). */
    get event() { return event; },

    dispose() {
      for (const t of terrains.values()) t.dispose();
      terrains.clear();
      dome.mesh.removeFromParent();
      plasma.mesh.removeFromParent();
      if (hiddenGlobe) hiddenGlobe.visible = true;
    },
  };
}
export type PlanetAir = ReturnType<typeof createPlanetAir>;
