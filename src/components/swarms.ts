/**
 * Drone swarms in the scene: the player's racks and every hostile carrier's, flown by lib/swarm and drawn here.
 *
 * Drawing is instanced: one InstancedMesh per role (a dart, a hex plate, arsenal's octahedron) holds every drone of
 * that role from every swarm, so a battle of hundreds is three draw calls, plus one glow cloud (Points) and one batch of
 * beam and tracer lines. All of it is placed round a floating origin at the camera, so drones ten thousand ship lengths
 * from the Sun do not jitter in Float32.
 *
 * Keys: 7 explosive, 8 shield, 9 laser-focus. A press launches that rack (at the locked or aimed ship if there is one,
 * else to guard the player's ship); a second press recalls it. 0 recalls every rack.
 */
import * as THREE from 'three';
import type { V3 } from '../lib/nav';
import { add, dist, scale } from '../lib/nav';
import { NATIONS } from '../lib/nations';
import type { ShipType } from '../lib/shipTypes';
import { bodyRadius } from '../lib/shipTypes';
import type { Battle } from '../lib/swarm/battle';
import { makeBattle, shieldBlock, soak, stepBattle } from '../lib/swarm/battle';
import type { HostileWatch } from '../lib/swarm/enemy';
import { hostileHangar, hostileWants } from '../lib/swarm/enemy';
import type { FleetOrder } from '../lib/swarm/refs';
import { DEFENCE, droneCapacity } from '../lib/swarm/refs';
import type { SwarmRole } from '../lib/swarm/roles';
import { ROLES, ROLE_LABEL, SWARM_ROLES } from '../lib/swarm/roles';
import type { ShipRef, Swarm, SwarmWorld } from '../lib/swarm/swarm';
import { FLYING, launch, makeSwarm, recall, setOrder } from '../lib/swarm/swarm';
import type { Combat, Craft } from './combat';
import { SHIP_MODEL_LENGTH } from './space/ship';

/** The player's ship in the swarm's registry. */
export const PLAYER_ID = 0;
/** Most drones of one role drawn at once (every swarm together). */
const CAP = 2048;
const MAX_LINES = 4096;
const MAX_FX = 96;

/**
 * The player cruiser's rack: its whole hangar (4 slots, 16 drones) as drones, split across the three roles. The
 * split is a first pass; on merge with progression the bay's fighters take slots from it (destroyer-hangars.md).
 */
export const PLAYER_RACK: Record<SwarmRole, number> = { explosive: 6, shield: 5, attack: 5 };

const KEYS: Record<string, SwarmRole> = { '7': 'explosive', '8': 'shield', '9': 'attack' };

function glowTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Each role's hull, pointing down +z, one unit long: a dart, a hex plate (its face along z), arsenal's octahedron. */
function roleGeometry(role: SwarmRole): THREE.BufferGeometry {
  if (role === 'explosive') {
    const g = new THREE.ConeGeometry(0.28, 1, 4);
    g.rotateX(Math.PI / 2);
    return g;
  }
  if (role === 'shield') {
    const g = new THREE.CylinderGeometry(0.6, 0.6, 0.12, 6);
    g.rotateX(Math.PI / 2);
    return g;
  }
  return new THREE.OctahedronGeometry(0.5, 0);
}

export interface SwarmsOpts {
  shipScale: number;
  camera: THREE.Camera;
  /** 'low' is Battery saver: no glow cloud, fewer flashes. The simulation is the same on both. */
  quality: () => 'high' | 'low';
}

export function createSwarms(scene: THREE.Scene, combat: Combat, opts: SwarmsOpts) {
  const L = SHIP_MODEL_LENGTH * opts.shipScale;
  const battle: Battle = makeBattle(7);
  const world: SwarmWorld = { time: 0, L, ships: new Map(), bodies: [] };
  const player: ShipRef = { id: PLAYER_ID, side: 0, pos: [0, 0, 0], vel: [0, 0, 0], radius: bodyRadius('cruiser', L), alive: true, pd: 1, flak: 0 };
  world.ships.set(PLAYER_ID, player);
  const crafts = new Map<number, Craft>();
  for (const c of combat.crafts) {
    const d = DEFENCE[c.type];
    world.ships.set(c.id, { id: c.id, side: c.hostile ? 1 : 0, pos: c.pos, vel: c.vel, radius: c.radius, alive: c.alive, pd: d.pd, flak: d.flak });
    crafts.set(c.id, c);
  }

  // ---- The player's racks: one swarm per role, all in the bay ----
  const mine = {} as Record<SwarmRole, Swarm>;
  for (const role of SWARM_ROLES) {
    const s = makeSwarm({ side: 0, role, carrier: PLAYER_ID, size: PLAYER_RACK[role], name: ROLE_LABEL[role], order: { kind: 'defend', ward: PLAYER_ID } });
    mine[role] = s;
    battle.swarms.push(s);
  }

  // ---- Hostile carriers: their swarms are built the first time they are provoked ----
  const hostile = new Map<number, { watch: HostileWatch; swarms: Swarm[] }>();
  const nationHit = new Map<string, number>(); // nation → world time it was last hit
  const hostileOn = { value: true };

  // ---- Drawing ----
  const group = new THREE.Group();
  group.frustumCulled = false;
  scene.add(group);
  const tex = glowTex();
  const meshes = {} as Record<SwarmRole, THREE.InstancedMesh>;
  const geos: THREE.BufferGeometry[] = [];
  for (const role of SWARM_ROLES) {
    const geo = roleGeometry(role);
    geos.push(geo);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const m = new THREE.InstancedMesh(geo, mat, CAP);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color());
    m.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    m.count = 0;
    m.frustumCulled = false;
    group.add(m);
    meshes[role] = m;
  }
  // A glow on every drone, so a swarm reads as a cloud of lights from afar.
  const glowGeo = new THREE.BufferGeometry();
  const glowPos = new Float32Array(CAP * 3 * 3);
  const glowCol = new Float32Array(CAP * 3 * 3);
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3).setUsage(THREE.DynamicDrawUsage));
  glowGeo.setAttribute('color', new THREE.BufferAttribute(glowCol, 3).setUsage(THREE.DynamicDrawUsage));
  const glow = new THREE.Points(glowGeo, new THREE.PointsMaterial({ size: 4, sizeAttenuation: false, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.frustumCulled = false;
  group.add(glow);
  // Beams (laser focus, escorts' lasers) and point-defence tracers.
  const lineGeo = new THREE.BufferGeometry();
  const linePos = new Float32Array(MAX_LINES * 6);
  const lineCol = new Float32Array(MAX_LINES * 6);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  lines.frustumCulled = false;
  group.add(lines);
  // Flashes: blasts, flak bursts, soaked hits, drones dying. A small pool of sprites.
  const flashes: { s: THREE.Sprite; t: number; life: number; size: number; at: V3 }[] = [];
  const fxMats = { blast: new THREE.Color(3, 1.6, 0.6), flak: new THREE.Color(2.2, 2, 1.6), soak: new THREE.Color(0.8, 2.4, 3), death: new THREE.Color(2, 1.2, 0.6) };
  function flash(at: V3, color: THREE.Color, size: number, life: number) {
    const cap = opts.quality() === 'low' ? MAX_FX / 3 : MAX_FX;
    if (flashes.length >= cap) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(s);
    flashes.push({ s, t: 0, life, size, at });
  }

  const sideColor = (carrierNation: string | null) => {
    const n = carrierNation ? NATIONS.find((x) => x.id === carrierNation) : NATIONS.find((x) => x.player);
    return new THREE.Color(n?.color ?? '#ffffff');
  };
  const roleGlow = Object.fromEntries(SWARM_ROLES.map((r) => [r, new THREE.Color(ROLES[r].color).multiplyScalar(2.2)])) as Record<SwarmRole, THREE.Color>;
  const tint = new Map<number, THREE.Color>();

  // ---- Commands ----
  /** What a player rack goes for on launch: the locked ship, else the one under the reticle, else it guards the player. */
  function defaultOrder(role: SwarmRole): FleetOrder {
    const t = combat.lock?.craft ?? combat.aim?.craft ?? null;
    if (role === 'shield' || !t) return { kind: 'defend', ward: PLAYER_ID };
    return { kind: 'attack', target: t.id };
  }
  /** Launch a rack, or give it an order (fleet-command's orders, the same union). */
  function order(role: SwarmRole, o?: FleetOrder) {
    const s = mine[role];
    setOrder(s, o ?? defaultOrder(role));
    launch(s);
  }
  function toggle(role: SwarmRole) {
    const s = mine[role];
    if (s.order.kind !== 'recall' && (s.flying > 0 || s.launching)) recall(s);
    else order(role);
  }
  function key(k: string): boolean {
    const role = KEYS[k];
    if (role) { toggle(role); return true; }
    if (k === '0') { for (const r of SWARM_ROLES) recall(mine[r]); return true; }
    return false;
  }

  const stats = { playerHits: 0, playerDamage: 0, interceptedBolts: 0, interceptedMissiles: 0, hostileLaunches: 0, drawn: 0, stepMs: 0, drawMs: 0 };

  /** Before combat moves its shots: hostile shield drones stop the player's bolts and missiles crossing their fields. */
  function shield(dt: number) {
    if (!battle.swarms.some((s) => s.side === 1 && s.role === 'shield' && s.flying)) return;
    // The player's shots and missiles are arsenal's (integration pass 2): every munition, each with its own damage.
    const shots = combat.arsenal.shots;
    for (let i = shots.length - 1; i >= 0; i--) {
      const b = shots[i];
      if (b.hostile) continue;
      const hit = shieldBlock(battle, b.pos, add(b.pos, scale(b.vel, dt)), 0, L);
      if (!hit) continue;
      soak(battle, hit, b.m.damage);
      b.obj.parent?.remove(b.obj);
      shots.splice(i, 1);
      stats.interceptedBolts++;
    }
    for (const m of combat.arsenal.missiles) {
      if (m.hostile || m.dead) continue;
      const hit = shieldBlock(battle, m.pos, add(m.pos, scale(m.vel, dt)), 0, L);
      if (!hit) continue;
      soak(battle, hit, m.m.damage);
      m.dead = true; // arsenal takes it out of the scene
      stats.interceptedMissiles++;
    }
  }

  function watchHostiles(dt: number) {
    for (const c of combat.crafts) {
      if (!c.hostile || !c.alive) continue;
      const hangar = hostileHangar(c.type as ShipType);
      if (!Object.keys(hangar).length) continue;
      let h = hostile.get(c.id);
      if (!h) { h = { watch: { provoked: false, calm: 0 }, swarms: [] }; hostile.set(c.id, h); }
      const hit = world.time - (nationHit.get(c.nation) ?? -1e9) < 1;
      const want = hostileOn.value && hostileWants(h.watch, dist(c.pos, player.pos), hit, L, dt);
      if (want && !h.swarms.length) {
        for (const [role, n] of Object.entries(hangar) as [SwarmRole, number][]) {
          const s = makeSwarm({ side: 1, role, carrier: c.id, size: n, name: `${c.nation} ${ROLE_LABEL[role]}`, order: role === 'shield' ? { kind: 'defend', ward: c.id } : { kind: 'attack', target: PLAYER_ID } });
          battle.swarms.push(s);
          h.swarms.push(s);
          tint.set(s.id, sideColor(c.nation));
          stats.hostileLaunches++;
        }
      }
      for (const s of h.swarms) {
        if (want && (s.order.kind === 'recall' || (!s.flying && !s.launching && s.inBay))) { setOrder(s, s.role === 'shield' ? { kind: 'defend', ward: c.id } : { kind: 'attack', target: PLAYER_ID }); launch(s); }
        else if (!want && s.order.kind !== 'recall') recall(s);
      }
    }
  }

  // ---- Each frame, after combat has moved its ships ----
  const lastHp = new Map<number, number>();
  let lastPos: V3 | null = null;
  function update(dt: number, pos: V3, vel: V3) {
    world.time += dt;
    // Measured from how far the ship moved, as combat measures its ships: an orbit moves the ship with its engines
    // off (vel 0), and a bubble that believed the 0 would be left behind.
    player.vel = lastPos && dt > 0 && dist(pos, lastPos) < 1e4 * dt ? scale([pos[0] - lastPos[0], pos[1] - lastPos[1], pos[2] - lastPos[2]], 1 / dt) : vel;
    player.pos = pos;
    lastPos = pos;
    // Ships come and go after the start (fleet command spawns and docks them, boarding turns prizes): register new
    // ones, follow a side change, and count a removed ship as gone (integration pass 2).
    for (const [id, r] of world.ships) if (id !== PLAYER_ID) r.alive = false;
    for (const c of combat.crafts) {
      let r = world.ships.get(c.id);
      if (!r) {
        const d = DEFENCE[c.type];
        r = { id: c.id, side: c.hostile ? 1 : 0, pos: c.pos, vel: c.vel, radius: c.radius, alive: c.alive, pd: d.pd, flak: d.flak };
        world.ships.set(c.id, r);
        crafts.set(c.id, c);
      }
      r.side = c.hostile ? 1 : 0;
      r.pos = c.pos;
      r.vel = c.vel;
      r.alive = c.alive;
      // A hostile ship that lost hull since last frame: its nation is provoked (enemy-ai's provokeNation).
      const hp = c.def.hull + c.def.shield.reduce((x, y) => x + y, 0);
      if (c.hostile && hp < (lastHp.get(c.id) ?? c.maxHp)) nationHit.set(c.nation, world.time);
      lastHp.set(c.id, hp);
    }
    watchHostiles(dt);
    const t0 = performance.now();
    stepBattle(battle, world, dt);
    stats.stepMs = performance.now() - t0;
    const ev = battle.events;
    for (const e of ev.damage) {
      if (e.ship === PLAYER_ID) { stats.playerHits++; stats.playerDamage += e.amount; continue; }
      const c = crafts.get(e.ship);
      if (c && c.alive && c.hostile && e.by === 0) combat.damage(c, e.amount, 'wing');
    }
    const hi = opts.quality() === 'high';
    for (const b of ev.blasts) flash(b.pos, fxMats.blast, b.r * 2.2, 0.45);
    for (const f of ev.flak) flash(f.pos, fxMats.flak, f.r * 1.2, 0.3);
    if (hi) for (const p of ev.soaks) flash(p, fxMats.soak, ROLES.shield.area * L * 1.4, 0.18);
    if (hi) for (const d of ev.deaths) flash(d.pos, fxMats.death, ROLES[d.role].size * L * 12, 0.3);
    const t1 = performance.now();
    draw(dt);
    stats.drawMs = performance.now() - t1;
  }

  // ---- Drawing, round a floating origin at the camera ----
  const o = new THREE.Vector3();
  function draw(dt: number) {
    opts.camera.getWorldPosition(o);
    group.position.copy(o);
    const ox = o.x, oy = o.y, oz = o.z;
    const hi = opts.quality() === 'high';
    const counts: Record<SwarmRole, number> = { explosive: 0, shield: 0, attack: 0 };
    let g = 0;
    for (const s of battle.swarms) {
      if (!s.flying) continue;
      const mesh = meshes[s.role];
      const arr = mesh.instanceMatrix.array as Float32Array;
      const col = mesh.instanceColor!.array as Float32Array;
      const c = tint.get(s.id) ?? sideColor(null);
      if (!tint.has(s.id)) tint.set(s.id, c);
      const gl = roleGlow[s.role];
      const sc = ROLES[s.role].size * L * 1.5;
      const [fx0, fy0, fz0] = s.frameVel;
      const ward = s.role === 'shield' && s.target !== null ? world.ships.get(s.target) : undefined;
      for (let i = 0; i < s.size; i++) {
        if (s.state[i] !== FLYING) continue;
        const k = counts[s.role]++;
        if (k >= CAP) break;
        const px = s.pos[i * 3], py = s.pos[i * 3 + 1], pz = s.pos[i * 3 + 2];
        // Facing: darts and octahedra along their flight (relative to the frame); shield plates outward from the ward.
        let fx: number, fy: number, fz: number;
        if (ward) {
          if (s.mode === 'wall' && s.aim) { fx = s.aim[0]; fy = s.aim[1]; fz = s.aim[2]; } else { fx = px - ward.pos[0]; fy = py - ward.pos[1]; fz = pz - ward.pos[2]; }
        } else { fx = s.vel[i * 3] - fx0; fy = s.vel[i * 3 + 1] - fy0; fz = s.vel[i * 3 + 2] - fz0; }
        let fl = Math.hypot(fx, fy, fz);
        if (fl < 1e-9) { fx = 0; fy = 0; fz = 1; fl = 1; }
        fx /= fl; fy /= fl; fz /= fl;
        // right = fwd × up, up' = right × fwd
        let rx = fz, ry = 0, rz = -fx;
        let rl = Math.hypot(rx, rz);
        if (rl < 1e-6) { rx = 1; rz = 0; rl = 1; }
        rx /= rl; rz /= rl;
        const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
        const m = k * 16;
        arr[m] = rx * sc; arr[m + 1] = ry * sc; arr[m + 2] = rz * sc; arr[m + 3] = 0;
        arr[m + 4] = ux * sc; arr[m + 5] = uy * sc; arr[m + 6] = uz * sc; arr[m + 7] = 0;
        arr[m + 8] = fx * sc; arr[m + 9] = fy * sc; arr[m + 10] = fz * sc; arr[m + 11] = 0;
        arr[m + 12] = px - ox; arr[m + 13] = py - oy; arr[m + 14] = pz - oz; arr[m + 15] = 1;
        // Hull in the nation's accent, lifted toward the role's colour so the three read apart.
        col[k * 3] = c.r * 0.6 + gl.r * 0.25; col[k * 3 + 1] = c.g * 0.6 + gl.g * 0.25; col[k * 3 + 2] = c.b * 0.6 + gl.b * 0.25;
        if (hi && g < CAP * 3) {
          glowPos[g * 3] = px - ox; glowPos[g * 3 + 1] = py - oy; glowPos[g * 3 + 2] = pz - oz;
          glowCol[g * 3] = gl.r * 0.5; glowCol[g * 3 + 1] = gl.g * 0.5; glowCol[g * 3 + 2] = gl.b * 0.5;
          g++;
        }
      }
    }
    let drawn = 0;
    for (const role of SWARM_ROLES) {
      const m = meshes[role];
      m.count = Math.min(CAP, counts[role]);
      drawn += m.count;
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor!.needsUpdate = true;
    }
    stats.drawn = drawn;
    glow.visible = hi;
    glowGeo.setDrawRange(0, g);
    (glowGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (glowGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    // Lines: beams in the role's colour (hostile beams in their nation's), tracers pale blue.
    const ev = battle.events;
    let n = 0;
    const put = (a: ArrayLike<number>, j: number, r: number, gg: number, b: number) => {
      if (n >= MAX_LINES) return;
      linePos[n * 6] = a[j] - ox; linePos[n * 6 + 1] = a[j + 1] - oy; linePos[n * 6 + 2] = a[j + 2] - oz;
      linePos[n * 6 + 3] = a[j + 3] - ox; linePos[n * 6 + 4] = a[j + 4] - oy; linePos[n * 6 + 5] = a[j + 5] - oz;
      lineCol[n * 6] = r * 0.35; lineCol[n * 6 + 1] = gg * 0.35; lineCol[n * 6 + 2] = b * 0.35;
      lineCol[n * 6 + 3] = r; lineCol[n * 6 + 4] = gg; lineCol[n * 6 + 5] = b;
      n++;
    };
    for (let k = 0; k < ev.beamSide.length; k++) {
      const hostileBeam = ev.beamSide[k] === 1;
      put(ev.beams, k * 6, hostileBeam ? 3 : 3.2, hostileBeam ? 0.6 : 1.4, hostileBeam ? 1.6 : 0.7);
    }
    for (let k = 0; k < ev.tracers.length / 6; k++) put(ev.tracers, k * 6, 1.2, 1.9, 2.6);
    lineGeo.setDrawRange(0, n * 2);
    (lineGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (lineGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.t += dt;
      const k = f.t / f.life;
      f.s.position.set(f.at[0] - ox, f.at[1] - oy, f.at[2] - oz);
      f.s.scale.setScalar(f.size * (0.5 + k));
      f.s.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) { group.remove(f.s); f.s.material.dispose(); flashes.splice(i, 1); }
    }
  }

  /**
   * Dev hook (tests and the browser proofs): a swarm of any size from any ship, outside the hangar rules, so the
   * largest battles can be measured before there are hulls that carry them.
   */
  function spawn(o: { side: 0 | 1; role: SwarmRole; carrier: number; size: number; order: FleetOrder; pack?: boolean }) {
    const s = makeSwarm({ ...o, name: `dev ${ROLE_LABEL[o.role]}` });
    if (o.pack === false) s.pack = false;
    const c = crafts.get(o.carrier);
    tint.set(s.id, sideColor(c ? c.nation : null));
    battle.swarms.push(s);
    launch(s);
    return s;
  }

  /** Spawn a hostile carrier's swarms now (dev hook for tests): the same as provoking it. */
  function provoke(craftId: number) {
    const c = crafts.get(craftId);
    if (c) nationHit.set(c.nation, world.time);
  }

  return {
    battle,
    world,
    mine,
    stats,
    hostileOn,
    order,
    toggle,
    key,
    provoke,
    spawn,
    shield,
    update,
    /** The rack's state for the HUD: per role, flying / in the bay / built. */
    get rack() { return SWARM_ROLES.map((r) => ({ role: r, label: ROLE_LABEL[r], flying: mine[r].flying, bay: mine[r].inBay, size: mine[r].size, order: mine[r].order.kind })); },
    capacity: droneCapacity,
    group,
    dispose: () => {
      scene.remove(group);
      geos.forEach((x) => x.dispose());
      for (const r of SWARM_ROLES) (meshes[r].material as THREE.Material).dispose();
      glowGeo.dispose();
      lineGeo.dispose();
      (glow.material as THREE.Material).dispose();
      (lines.material as THREE.Material).dispose();
      flashes.forEach((f) => f.s.material.dispose());
      tex.dispose();
    },
  };
}

export type Swarms = ReturnType<typeof createSwarms>;
/** The HUD's drone line: each rack that is out or has lost drones, as "Shield 4/5 out". Quiet until drones are used. */
export const rackLine = (r: Swarms['rack']) => r
  .filter((x) => x.size && (x.flying || x.bay < x.size))
  .map((x) => `${x.label.split(' ')[0]} ${x.flying + x.bay}/${x.size}${x.flying ? ' out' : ''}`)
  .join(' · ');
