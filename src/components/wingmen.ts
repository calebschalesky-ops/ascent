/**
 * The player's bay fighters in the scene: launch, fly as wingmen, shoot, come home. Steering is lib/progression/
 * wingman.ts; this file only draws them and lands their shots on combat's ships.
 */
import * as THREE from 'three';
import type { NationId } from '../lib/nations';
import type { V3 } from '../lib/nav';
import { add, scale } from '../lib/nav';
import { LASER, sweptHit } from '../lib/weapons';
import type { Wing } from '../lib/progression/wingman';
import { WING, launchWing, stepWing } from '../lib/progression/wingman';
import type { Combat, Craft } from './combat';
import type { Loadout } from '../lib/modules';
import type { ReactNode } from 'react';
import type { Dest, DestGeo } from '../lib/nav';
import type { VoyageWorld } from './voyageScene';

/** What Voyage lets a game layer hang on the flight: per-frame work, extra keys and the weapons the ship carries. */
export interface FlightHooks {
  attach: (ctx: { combat: Combat; shipScale: number; scene: THREE.Scene; world: () => VoyageWorld | null; geo: () => DestGeo[] }) => FlightExt;
  card?: (dest: Dest) => ReactNode; // more rows for the arrival card (conquest)
  loadout?: () => Loadout; // what the ship flies (progression's fit as arsenal's loadout); default: Settings' loadout
  level?: () => number; // the pilot's level, for fleet command's gate
  /** The hotbar's utility slots (mc-controls): the bay's fighters (null: none) and infantry carriers out (null: none carried). */
  utility?: () => { fighters: { bay: number; out: number } | null; infantry: { out: number } | null };
}
export interface FlightExt {
  update: (dt: number, pos: V3, fwd: V3, vel: V3) => void;
  key: (key: string) => boolean; // true when it used the key
  /**
   * The ship was lost at `pos` (GP-15a): pay what that costs, and say which worlds' stations it may come back at
   * (the nearest of them is used). Empty or absent: it comes back where it started.
   */
  lost?: (pos: V3, cost: { drones: number }) => NationId[];
  dispose: () => void;
}

interface Bolt { pos: V3; vel: V3; age: number; target: Craft; mesh: THREE.Mesh }
export interface WingView { slot: number; state: Wing['state'] | 'docked' }

export function createWingmen(root: THREE.Object3D, combat: Combat, opts: { color: string; shipScale: number; dps: number; bay: () => number }) {
  const group = new THREE.Group();
  root.add(group);
  const mat = new THREE.MeshStandardMaterial({ color: opts.color, emissive: new THREE.Color(opts.color).multiplyScalar(0.5), metalness: 0.5, roughness: 0.4 });
  const hull = new THREE.ConeGeometry(0.16, 0.6, 6);
  hull.rotateX(-Math.PI / 2);
  const wingGeo = new THREE.BoxGeometry(0.7, 0.03, 0.18);
  const boltGeo = new THREE.BoxGeometry(0.04, 0.04, 1.0);
  const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.color).multiplyScalar(3), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, opts.color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const wings: (Wing & { obj: THREE.Group })[] = [];
  const bolts: Bolt[] = [];
  const stats = { launched: 0, docked: 0, shots: 0, hits: 0, kills: 0 };
  let recall = false;
  let target: Craft | null = null;
  let t = 0;
  const perShot = (opts.dps * WING.gunScale) / WING.rate;

  const place = (o: THREE.Object3D, p: V3, v: V3) => {
    o.position.set(...p);
    if (Math.hypot(...v) > 1e-6) o.lookAt(p[0] - v[0], p[1] - v[1], p[2] - v[2]);
  };

  /** Launch the next docked fighter. False when none is left in the bay. */
  function launch(pos: V3, vel: V3): boolean {
    if (wings.length >= opts.bay()) return false;
    recall = false;
    const used = new Set(wings.map((w) => w.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const obj = new THREE.Group();
    obj.add(new THREE.Mesh(hull, mat));
    const w = new THREE.Mesh(wingGeo, mat);
    w.position.z = 0.12;
    obj.add(w);
    const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }));
    beacon.scale.set(0.014, 0.014, 1);
    obj.add(beacon);
    obj.scale.setScalar(opts.shipScale * 0.6);
    group.add(obj);
    wings.push({ ...launchWing(slot, pos, vel), obj });
    stats.launched++;
    return true;
  }

  let last = { pos: [0, 0, 0] as V3, vel: [0, 0, 0] as V3 };

  function update(dt: number, pos: V3, fwd: V3, vel: V3) {
    t += dt;
    last = { pos, vel };
    // The wing's target: the player's held missile lock, else the ship the player hit last, held while it lives.
    const held = combat.lock;
    const want = (held && held.locked ? held.craft : null) ?? combat.lastHit;
    if (want) target = want;
    if (target && !target.alive) target = null;
    for (let i = wings.length - 1; i >= 0; i--) {
      const w = wings[i];
      const r = stepWing(w, { player: pos, playerVel: vel, fwd, target: target ? target.pos : null, recall, t }, dt);
      if (r.docked) { group.remove(w.obj); wings.splice(i, 1); stats.docked++; continue; }
      place(w.obj, w.pos, w.vel);
      if (r.fire && target) {
        const mesh = new THREE.Mesh(boltGeo, boltMat);
        group.add(mesh);
        bolts.push({ pos: [...w.pos] as V3, vel: scale(r.fire, WING.boltSpeed), age: 0, target, mesh });
        stats.shots++;
      }
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      const from = b.pos;
      b.pos = add(b.pos, scale(b.vel, dt));
      b.age += dt;
      let gone = b.age > 0.3 || !b.target.alive;
      if (!gone && sweptHit(from, b.pos, b.target.pos, LASER.radius)) {
        stats.hits++;
        combat.damage(b.target, perShot, 'wing');
        if (!b.target.alive) stats.kills++;
        gone = true;
      }
      if (gone) { group.remove(b.mesh); bolts.splice(i, 1); } else place(b.mesh, b.pos, b.vel);
    }
  }

  return {
    wings,
    stats,
    get target() { return target; },
    get recalling() { return recall; },
    update,
    launch: () => launch(last.pos, last.vel),
    recall: () => { recall = wings.length > 0; },
    /** The cruiser was lost: every fighter out goes with it. Returns how many. */
    lose: () => { const n = wings.length; for (const w of wings) group.remove(w.obj); wings.length = 0; recall = false; return n; },
    /** Each bay slot: docked, or what its fighter is doing. */
    view: (): WingView[] => Array.from({ length: opts.bay() }, (_, slot) => ({ slot, state: wings.find((w) => w.slot === slot)?.state ?? 'docked' })),
    dispose: () => { root.remove(group); hull.dispose(); wingGeo.dispose(); boltGeo.dispose(); boltMat.dispose(); mat.dispose(); tex.dispose(); },
  };
}

export type Wingmen = ReturnType<typeof createWingmen>;
