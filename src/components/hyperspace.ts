/**
 * Hyperspace in the scene (scale-jump-danger J1): flies the ship through a jump the pure lib/hyperspace.ts planned,
 * and draws the tunnel. Spool: the ship holds where it is and swings its nose onto the line of the jump while the
 * streaks gather. Travel: the ship runs the path on lib's ease, the tunnel full round the camera. Exit: the ship sits at
 * a stop at the drop point and turns to face the body, the streaks thin out. Voyage's frame loop hands the ship here for
 * the length of a jump, as it does for docking.
 */
import * as THREE from 'three';
import type { Dest, V3 } from '../lib/nav';
import { HYPER, along, ease, travelTime } from '../lib/hyperspace';
import type { Drop } from '../lib/hyperspace';

export interface JumpPlan {
  dest: Dest;
  /** From where the ship is to the drop point, round any body in the way. */
  path: V3[];
  /** The point to face on arrival: the body's centre. */
  face: V3;
  drop: Drop;
  /** Straight-line length of the jump, for the clock. */
  dist: number;
  /** The autopilot asked for it (it goes on flying the leg after the drop). */
  auto: boolean;
}

export type JumpPhase = 'spool' | 'travel' | 'exit';

interface ShipLike { pos: THREE.Vector3; vel: THREE.Vector3; speed: number; yaw: number; pitch: number; yawRate: number; pitchRate: number; push: number }

const STREAKS = 700;
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const yawOf = (d: V3) => Math.atan2(-d[0], -d[2]);
const pitchOf = (d: V3) => Math.asin(Math.max(-1, Math.min(1, d[1] / Math.max(1e-9, Math.hypot(d[0], d[1], d[2])))));

export function createHyperspace(scene: THREE.Scene) {
  // ---- The tunnel: streaks on a cylinder round the line of sight, carried with the camera ----
  const group = new THREE.Group();
  group.name = 'hyperspace';
  group.visible = false;
  group.renderOrder = 10;
  const pos = new Float32Array(STREAKS * 6);
  const col = new Float32Array(STREAKS * 6);
  const seed = Array.from({ length: STREAKS }, (_, i) => {
    const a = (i * 2.399963) % (Math.PI * 2);
    const r = 1.2 + ((i * 7919) % 1000) / 1000 * 9;
    return { a, r, z: -((i * 104729) % 1000) / 1000 * 260, len: 6 + ((i * 31) % 17) * 1.4, hue: (i * 13) % 5 };
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  group.add(lines);
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.5, 1.1), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.BackSide });
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(14, 2.5, 300, 32, 1, true).rotateX(Math.PI / 2).translate(0, 0, -140), glowMat);
  glow.frustumCulled = false;
  group.add(glow);
  scene.add(group);
  const palette = [[0.6, 0.8, 1.6], [0.9, 0.95, 1.8], [0.5, 0.6, 1.4], [1.2, 1.1, 1.6], [0.45, 0.9, 1.5]];

  let jump: (JumpPlan & { t: number; start: number | null; travel: number; total: number; from: { yaw: number; pitch: number } }) | null = null;
  let flow = 0;
  /** Each jump, timed in frame seconds from the press to arrival: the proof that it is under 5 s. */
  const log: { dest: Dest; dist: number; seconds: number; planned: number; alt: number; clear: boolean }[] = [];

  function begin(plan: JumpPlan, ship: ShipLike) {
    const travel = travelTime(plan.dist);
    jump = { ...plan, t: 0, start: null, travel, total: HYPER.spool + travel + HYPER.exit, from: { yaw: ship.yaw, pitch: ship.pitch } };
  }

  /**
   * One frame of a jump at `now` (seconds, the frame's clock). The jump's time is measured from its first frame, not
   * added up from frame steps, so a slow frame (a world's terrain building on arrival) is absorbed, never added on.
   * Returns true on the frame it ends (the ship is at the drop point, stopped).
   */
  function step(now: number, ship: ShipLike): boolean {
    const j = jump;
    if (!j) return false;
    if (j.start === null) j.start = now;
    const dt = Math.max(0, now - j.start - j.t);
    j.t = now - j.start;
    ship.yawRate = 0;
    ship.pitchRate = 0;
    const out = j.path.length > 1 ? ([j.path[1][0] - j.path[0][0], j.path[1][1] - j.path[0][1], j.path[1][2] - j.path[0][2]] as V3) : ([0, 0, -1] as V3);
    if (j.t < HYPER.spool) {
      // Spool: the nose comes onto the line of the jump.
      const k = ease(j.t / HYPER.spool);
      ship.yaw = wrapPi(j.from.yaw + wrapPi(yawOf(out) - j.from.yaw) * k);
      ship.pitch = j.from.pitch + (pitchOf(out) - j.from.pitch) * k;
      ship.speed *= Math.exp(-dt * 3);
      ship.vel.multiplyScalar(Math.exp(-dt * 3));
      ship.pos.addScaledVector(ship.vel, dt);
      ship.push = 0.3 + 0.7 * k;
      return false;
    }
    const u = (j.t - HYPER.spool) / j.travel;
    if (u < 1) {
      const before = ship.pos.clone();
      const p = along(j.path, ease(u));
      ship.pos.set(p[0], p[1], p[2]);
      ship.vel.copy(ship.pos).sub(before).divideScalar(Math.max(dt, 1e-6));
      ship.speed = ship.vel.length();
      const ahead = along(j.path, Math.min(1, ease(u) + 0.002));
      const d: V3 = [ahead[0] - p[0], ahead[1] - p[1], ahead[2] - p[2]];
      if (Math.hypot(...d) > 1e-6) { ship.yaw = yawOf(d); ship.pitch = pitchOf(d); }
      ship.push = 1;
      return false;
    }
    // Exit: at a stop at the drop point, turning to face the body.
    ship.pos.set(j.drop.pos[0], j.drop.pos[1], j.drop.pos[2]);
    ship.vel.set(0, 0, 0);
    ship.speed = 0;
    ship.push = 0;
    const face: V3 = [j.face[0] - j.drop.pos[0], j.face[1] - j.drop.pos[1], j.face[2] - j.drop.pos[2]];
    const k = Math.min(1, dt * 6);
    ship.yaw = wrapPi(ship.yaw + wrapPi(yawOf(face) - ship.yaw) * k);
    ship.pitch += (pitchOf(face) - ship.pitch) * k;
    if (j.t >= j.total) {
      ship.yaw = yawOf(face);
      ship.pitch = Math.max(-1.4, Math.min(1.4, pitchOf(face)));
      log.push({ dest: j.dest, dist: j.dist, seconds: +j.t.toFixed(2), planned: +j.total.toFixed(2), alt: j.drop.alt, clear: j.drop.clear });
      jump = null;
      return true;
    }
    return false;
  }

  /** The tunnel, every frame: carried with the camera, its strength following the jump's phase. */
  function draw(dt: number, camera: THREE.Camera) {
    const j = jump;
    let want = 0;
    if (j) {
      if (j.t < HYPER.spool) want = 0.35 * (j.t / HYPER.spool);
      else if (j.t < HYPER.spool + j.travel) want = 1;
      else want = Math.max(0, 1 - (j.t - HYPER.spool - j.travel) / HYPER.exit);
    }
    flow += (want - flow) * Math.min(1, dt * 10);
    group.visible = flow > 0.01;
    if (!group.visible) return;
    group.position.copy(camera.position);
    group.quaternion.copy(camera.quaternion);
    const speed = j && j.t >= HYPER.spool ? 420 : 60;
    for (let i = 0; i < STREAKS; i++) {
      const s = seed[i];
      s.z += speed * dt;
      if (s.z > 10) s.z -= 270;
      const x = Math.cos(s.a) * s.r;
      const y = Math.sin(s.a) * s.r;
      const l = s.len * (0.3 + flow * 1.7);
      pos.set([x, y, s.z, x, y, s.z - l], i * 6);
      const c = palette[s.hue];
      const f = flow * (0.5 + 0.5 * Math.min(1, (s.z + 260) / 120));
      col.set([c[0] * f, c[1] * f, c[2] * f, 0, 0, 0], i * 6);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    mat.opacity = Math.min(1, flow * 1.2);
    glowMat.opacity = 0.07 * flow;
  }

  return {
    begin, step, draw, log,
    get active() { return !!jump; },
    get state(): { phase: JumpPhase; dest: Dest; left: number } | null {
      if (!jump) return null;
      const phase: JumpPhase = jump.t < HYPER.spool ? 'spool' : jump.t < HYPER.spool + jump.travel ? 'travel' : 'exit';
      return { phase, dest: jump.dest, left: Math.max(0, jump.total - jump.t) };
    },
    get plan() { return jump; },
    cancel: () => { jump = null; },
    dispose: () => { scene.remove(group); geo.dispose(); mat.dispose(); glow.geometry.dispose(); glowMat.dispose(); },
  };
}
export type Hyperspace = ReturnType<typeof createHyperspace>;
