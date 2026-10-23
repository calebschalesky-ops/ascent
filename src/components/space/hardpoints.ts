/**
 * Hardpoints: the player's ship shows what it carries (HARDPOINTS.md). Every fitted module puts hardware on the hull.
 * The hardware's shape says what it is in every nation (a railgun is always two long rails, a missile rack always a
 * box of round cells); the nation decides its materials and shape language (art/hardpoints/<nation>.jpg, the Gemini
 * sheets); and its glow is the colour of what it fires.
 *
 * Built in the cruiser model's own units, nose toward −z, up +y, and snapped to the hull by ray casts, so it fits any
 * of the seven hulls. One mesh per material, so a fully fitted ship adds a handful of draw calls.
 */
import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Loadout } from '../../lib/modules';
import { moduleById, sanitizeLoadout } from '../../lib/modules';
import type { MunitionId } from '../../lib/munitions';
import type { NationId } from '../../lib/nations';
import { SHIELDS } from '../../lib/shields';
import type { ShieldId } from '../../lib/shields';
import { DRONES } from '../../lib/tech';
import type { StyleMaterials } from './styles';

// ---- How each nation builds a mount -------------------------------------------------------------------------------

type Turret = 'dome' | 'column' | 'shield' | 'onion' | 'slab' | 'facet' | 'galley';
interface NationLook {
  turret: Turret;
  seg: number; // radial segments of round parts (few = faceted)
  body: 'hull' | 'panel'; // what the mount is made of
  trim: 'hull' | 'panel' | 'accent'; // rims, rings and collars
  barrel: 'hull' | 'panel' | 'accent'; // gun barrels and rails
  reach: number; // barrel length × (Saturn runs its guns out long)
  bolt: string; // the nation's bolt colour (ART-DIRECTION.md): every glow that is not a rail, plasma or ion
}

export const NATION_LOOK: Record<NationId, NationLook> = {
  earth: { turret: 'dome', seg: 20, body: 'hull', trim: 'panel', barrel: 'panel', reach: 1, bolt: '#a9cfff' },
  moon: { turret: 'column', seg: 16, body: 'hull', trim: 'panel', barrel: 'panel', reach: 1.1, bolt: '#8fbfff' },
  mercury: { turret: 'shield', seg: 18, body: 'hull', trim: 'accent', barrel: 'panel', reach: 0.8, bolt: '#ffd34d' },
  venus: { turret: 'onion', seg: 22, body: 'hull', trim: 'accent', barrel: 'hull', reach: 0.85, bolt: '#3dff9a' },
  mars: { turret: 'slab', seg: 4, body: 'hull', trim: 'panel', barrel: 'panel', reach: 1, bolt: '#ff3344' },
  jupiter: { turret: 'facet', seg: 6, body: 'panel', trim: 'hull', barrel: 'hull', reach: 1, bolt: '#ff2fd0' },
  saturn: { turret: 'galley', seg: 8, body: 'hull', trim: 'panel', barrel: 'panel', reach: 1.5, bolt: '#ffb347' },
};

/** The glow of each weapon's hardware: rail, plasma and ion keep their own colour everywhere, the rest are the nation's. */
const OWN_GLOW: Partial<Record<MunitionId, string>> = { rail: '#cfe4ff', plasma: '#5affbe', ion: '#6eaaff' };
export const weaponGlow = (nation: NationId, w: MunitionId) => OWN_GLOW[w] ?? NATION_LOOK[nation].bolt;

// ---- Where things go ----------------------------------------------------------------------------------------------

/** Mount zones: t is the place along the hull (0 nose, 1 stern), side which face. Flank zones are a mirrored pair. */
type Zone = 'chin' | 'spine' | 'spine2' | 'belly' | 'belly2' | 'flank' | 'flank2' | 'tail';
const ZONES: Record<Zone, { t: number; side: 'up' | 'down' | 'side' }> = {
  chin: { t: 0.14, side: 'down' },
  spine: { t: 0.34, side: 'up' },
  spine2: { t: 0.56, side: 'up' },
  belly: { t: 0.4, side: 'down' },
  belly2: { t: 0.62, side: 'down' },
  flank: { t: 0.44, side: 'side' },
  flank2: { t: 0.66, side: 'side' },
  tail: { t: 0.9, side: 'down' },
};

/** Where each weapon would rather sit, first choice first (HARDPOINTS.md's table). */
const PREFER: Record<MunitionId, Zone[]> = {
  rail: ['flank', 'spine', 'belly', 'flank2'],
  torpedo: ['belly', 'belly2', 'flank2', 'flank'],
  mine: ['tail', 'belly2', 'belly'],
  seeker: ['flank2', 'flank', 'spine2', 'belly2'],
  swarm: ['spine2', 'flank2', 'flank', 'belly2'],
  beam: ['chin', 'belly', 'spine'],
  pulse: ['spine', 'chin', 'belly', 'spine2'],
  plasma: ['spine', 'belly', 'spine2', 'chin'],
  ion: ['spine2', 'spine', 'belly2', 'belly'],
  flak: ['spine2', 'belly2', 'spine', 'flank2'],
};
/** The most particular weapons choose first. */
const PICK_ORDER: MunitionId[] = ['rail', 'torpedo', 'mine', 'seeker', 'swarm', 'beam', 'pulse', 'plasma', 'ion', 'flak'];

/** Which zone each fitted weapon gets. Pure, so it is tested without three.js. */
export function assignZones(weapons: MunitionId[], usable: (z: Zone) => boolean = () => true): Partial<Record<MunitionId, Zone>> {
  const taken = new Set<Zone>((Object.keys(ZONES) as Zone[]).filter((z) => !usable(z)));
  const out: Partial<Record<MunitionId, Zone>> = {};
  const all = Object.keys(ZONES) as Zone[];
  for (const w of PICK_ORDER) {
    if (!weapons.includes(w)) continue;
    const z = PREFER[w].find((x) => !taken.has(x)) ?? all.find((x) => !taken.has(x) && x !== 'tail');
    if (!z) continue;
    taken.add(z);
    out[w] = z;
  }
  return out;
}

// ---- Building -----------------------------------------------------------------------------------------------------

type Role = 'body' | 'trim' | 'barrel' | 'dark' | `glow:${string}`;
interface Part { role: Role; geo: THREE.BufferGeometry }

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Strip a geometry down to position and normal, so every part merges with every other. */
function plain(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal') out.deleteAttribute(k);
  if (!out.attributes.normal) out.computeVertexNormals();
  return out;
}

/** A local frame on the hull: y out of the hull, −z toward the nose (a belly mount hangs upside down). */
class Frame {
  readonly m: THREE.Matrix4;
  constructor(at: THREE.Vector3, up: THREE.Vector3) {
    const z = V(0, 0, 1);
    const x = up.clone().cross(z).normalize();
    this.m = new THREE.Matrix4().makeBasis(x, up, z).setPosition(at);
  }
  point(x: number, y: number, z: number) { return V(x, y, z).applyMatrix4(this.m); }
}

class Builder {
  readonly parts: Part[] = [];
  readonly glows = new Map<string, MunitionId | 'fit'>();
  add(role: Role, geo: THREE.BufferGeometry, f: Frame, pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) {
    const local = new THREE.Matrix4().compose(V(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), V(...scale));
    geo.applyMatrix4(local).applyMatrix4(f.m);
    this.parts.push({ role, geo: plain(geo) });
  }
}

const cyl = (r: number, len: number, seg: number, r2 = r) => new THREE.CylinderGeometry(r2, r, len, seg); // along y
/** A barrel along −z from the origin, `len` long. */
const barrel = (r: number, len: number, seg: number) => cyl(r, len, seg).rotateX(Math.PI / 2).translate(0, 0, -len / 2);
const ring = (r: number, tube: number, seg: number) => new THREE.TorusGeometry(r, tube, Math.max(4, Math.round(seg / 3)), seg);
const cube = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const hullOf = (pts: THREE.Vector3[]) => new ConvexGeometry(pts);

/** A prism with `n` sides and chamfered top, `r` across, `h` tall: the faceted base of Jupiter and Mars. */
function facetBlock(r: number, h: number, n: number, taper = 0.75, len = 1) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    pts.push(V(Math.cos(a) * r, 0, Math.sin(a) * r * len), V(Math.cos(a) * r * taper, h, Math.sin(a) * r * taper * len));
  }
  return hullOf(pts);
}

/** The base every turret stands on, in the nation's shape language. Returns the height of its gun line. */
function turretBase(b: Builder, f: Frame, look: NationLook, s: number): number {
  const pedestal = cyl(s * 0.75, s * 1.2, look.seg).translate(0, -s * 0.5, 0); // sinks into the hull
  b.add('body', pedestal, f);
  switch (look.turret) {
    case 'dome': {
      b.add('body', new THREE.SphereGeometry(s, look.seg, 10, 0, Math.PI * 2, 0, Math.PI / 2), f, [0, 0, 0], [0, 0, 0], [1, 0.7, 1.1]);
      b.add('trim', ring(s * 0.98, s * 0.07, look.seg), f, [0, s * 0.04, 0], [Math.PI / 2, 0, 0]);
      return s * 0.42;
    }
    case 'column': {
      b.add('body', cyl(s * 0.75, s * 0.18, look.seg), f, [0, s * 0.09, 0]);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; b.add('body', cyl(s * 0.11, s * 0.55, 8), f, [Math.cos(a) * s * 0.5, s * 0.45, Math.sin(a) * s * 0.5]); }
      b.add('trim', cyl(s * 0.72, s * 0.12, look.seg), f, [0, s * 0.78, 0]);
      return s * 0.95;
    }
    case 'shield': {
      // A heavy bronze dome on a gold-rimmed ring, and a small hoplite shield on its face, the barrels through it.
      b.add('trim', cyl(s * 1.0, s * 0.14, look.seg), f, [0, s * 0.07, 0]);
      b.add('body', new THREE.SphereGeometry(s * 0.9, look.seg, 10, 0, Math.PI * 2, 0, Math.PI / 2), f, [0, s * 0.12, 0], [0, 0, 0], [1, 0.8, 1.05]);
      b.add('body', new THREE.SphereGeometry(s * 0.55, look.seg, 6, 0, Math.PI * 2, 0, 0.8), f, [0, s * 0.42, -s * 0.62], [-Math.PI / 2, 0, 0], [1, 0.3, 1]);
      b.add('trim', ring(s * 0.42, s * 0.05, look.seg), f, [0, s * 0.42, -s * 0.78]);
      return s * 0.42;
    }
    case 'onion': {
      const prof = [V(0.001, 0, 0), V(0.85, 0, 0), V(0.95, 0.25, 0), V(0.8, 0.6, 0), V(0.4, 0.95, 0), V(0.12, 1.2, 0), V(0.001, 1.45, 0)].map((p) => new THREE.Vector2(p.x * s, p.y * s));
      b.add('body', new THREE.LatheGeometry(prof, look.seg), f);
      b.add('trim', ring(s * 0.9, s * 0.08, look.seg), f, [0, s * 0.18, 0], [Math.PI / 2, 0, 0]);
      b.add('trim', new THREE.SphereGeometry(s * 0.12, 8, 6), f, [0, s * 1.5, 0]);
      return s * 0.45;
    }
    case 'slab': {
      b.add('body', facetBlock(s * 1.05, s * 0.5, 4, 0.72, 1.3), f, [0, 0, 0], [0, Math.PI / 4, 0]);
      b.add('trim', cube(s * 1.1, s * 0.06, s * 0.1), f, [0, s * 0.5, s * 0.55]);
      for (let i = -1; i <= 1; i++) b.add('trim', cube(s * 0.12, s * 0.08, s * 0.12), f, [i * s * 0.35, s * 0.53, s * 0.2]);
      return s * 0.3;
    }
    case 'facet': {
      b.add('body', facetBlock(s * 1.0, s * 0.55, 6, 0.65, 1.25), f);
      // A talon raking back off the top, as every Jupiter part has one.
      b.add('trim', hullOf([V(-s * 0.08, s * 0.5, 0), V(s * 0.08, s * 0.5, 0), V(0, s * 0.5, s * 0.5), V(0, s * 1.05, s * 0.85)]), f);
      return s * 0.32;
    }
    case 'galley': {
      b.add('body', hullOf([V(-s * 0.55, 0, s), V(s * 0.55, 0, s), V(-s * 0.4, 0, -s * 0.9), V(s * 0.4, 0, -s * 0.9), V(-s * 0.4, s * 0.35, s * 0.8), V(s * 0.4, s * 0.35, s * 0.8), V(0, s * 0.3, -s * 0.9)]), f);
      return s * 0.2;
    }
  }
}

/** One weapon's hardware at frame `f`, `s` the mount's size, `L` the hull's length. */
function weaponMount(b: Builder, f: Frame, w: MunitionId, look: NationLook, s: number, L: number) {
  const g: Role = `glow:${w}`;
  b.glows.set(g, w);
  const seg = Math.max(look.seg, 6);
  const bs = look.turret === 'slab' || look.turret === 'facet' ? look.seg : seg; // faceted barrels for Mars and Jupiter
  const reach = look.reach;
  switch (w) {
    case 'pulse': {
      const y = turretBase(b, f, look, s);
      for (const x of [-1, 1]) {
        b.add('barrel', barrel(s * 0.13, s * 1.5 * reach, bs), f, [x * s * 0.28, y, -s * 0.3]);
        b.add(g, barrel(s * 0.08, s * 0.1, bs), f, [x * s * 0.28, y, -s * 0.3 - s * 1.5 * reach]);
      }
      return;
    }
    case 'flak': {
      const y = turretBase(b, f, look, s * 1.1);
      for (const x of [-1, 1]) for (const yy of [-1, 1]) {
        b.add('barrel', barrel(s * 0.12, s * 0.85 * reach, bs), f, [x * s * 0.26, y + yy * s * 0.18, -s * 0.4]);
        b.add(g, barrel(s * 0.07, s * 0.08, bs), f, [x * s * 0.26, y + yy * s * 0.18, -s * 0.4 - s * 0.85 * reach]);
      }
      return;
    }
    case 'plasma': {
      const y = turretBase(b, f, look, s);
      const len = s * 1.7 * reach;
      b.add('barrel', barrel(s * 0.26, len, bs), f, [0, y, -s * 0.2]);
      for (let i = 0; i < 4; i++) b.add(g, ring(s * 0.34, s * 0.06, bs), f, [0, y, -s * 0.45 - (i * len * 0.8) / 4]);
      b.add(g, barrel(s * 0.18, s * 0.08, bs), f, [0, y, -s * 0.2 - len]);
      return;
    }
    case 'ion': {
      const y = turretBase(b, f, look, s);
      const len = s * 1.6 * reach;
      b.add('barrel', barrel(s * 0.12, len, bs), f, [0, y, -s * 0.2]);
      for (let i = 0; i < 3; i++) {
        b.add('dark', ring(s * 0.42 - i * s * 0.06, s * 0.09, seg), f, [0, y, -s * 0.5 - i * s * 0.42]);
        b.add(g, ring(s * 0.42 - i * s * 0.06, s * 0.035, seg), f, [0, y, -s * 0.5 - i * s * 0.42 - s * 0.07]);
      }
      b.add(g, new THREE.SphereGeometry(s * 0.14, 10, 8), f, [0, y, -s * 0.2 - len]);
      return;
    }
    case 'beam': {
      // No barrel: a lens in a heavy collar on a short yoke.
      b.add('body', cyl(s * 0.6, s * 0.6, look.seg).translate(0, -s * 0.2, 0), f);
      const y = s * 0.55;
      b.add('body', cyl(s * 0.5, s * 0.55, look.seg).rotateX(Math.PI / 2), f, [0, y, -s * 0.15]);
      b.add('trim', ring(s * 0.46, s * 0.1, look.seg), f, [0, y, -s * 0.45]);
      b.add(g, new THREE.SphereGeometry(s * 0.34, look.seg, 10, 0, Math.PI * 2, 0, Math.PI / 2), f, [0, y, -s * 0.42], [-Math.PI / 2, 0, 0], [1, 0.6, 1]);
      return;
    }
    case 'rail': {
      // Two long rails, a glowing conductor between them, a capacitor block at the back, standing on two pylons.
      const len = L * 0.62; // the same for every nation: about a tenth of a hull past the nose
      const h = s * 0.55;
      const z0 = s * 1.4; // the breech, aft of the anchor
      b.add('body', cube(s * 0.35, h, s * 0.3), f, [0, h / 2 - s * 0.2, z0 - len * 0.3]);
      b.add('body', cube(s * 0.35, h, s * 0.3), f, [0, h / 2 - s * 0.2, z0 - len * 0.75]);
      b.add('body', cube(s * 0.6, s * 0.45, s * 0.9), f, [0, h, z0]);
      for (const x of [-1, 1]) b.add('barrel', cube(s * 0.16, s * 0.3, len), f, [x * s * 0.24, h, z0 - len / 2]);
      b.add(g, cube(s * 0.12, s * 0.12, len * 0.97), f, [0, h, z0 - len / 2]);
      return;
    }
    case 'seeker': {
      // A box of 2 × 3 round cell doors facing forward.
      const W = s * 1.5, H = s * 1.05, D = s * 2.2;
      b.add('body', cube(W, H, D).translate(0, H / 2, 0), f, [0, -s * 0.15, 0]);
      b.add('trim', cube(W * 1.04, H * 0.12, D * 0.9).translate(0, H, 0), f, [0, -s * 0.15, s * 0.05]); // a lid in the trim colour
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const x = (c - 1) * W * 0.3, y = H * 0.3 + r * H * 0.38 - s * 0.15;
        b.add('dark', cyl(s * 0.15, s * 0.06, 10).rotateX(Math.PI / 2), f, [x, y, -D / 2 - s * 0.02]);
        if (r === 1 && c === 1) b.add(g, new THREE.ConeGeometry(s * 0.1, s * 0.22, 8).rotateX(-Math.PI / 2), f, [x, y, -D / 2 - s * 0.12]);
      }
      b.add('trim', cube(W * 1.04, s * 0.08, s * 0.1), f, [0, H - s * 0.15, -D / 2]);
      return;
    }
    case 'swarm': {
      // A flat honeycomb panel of small hexagonal cells, raised and facing forward-up.
      const W = s * 1.8, H = s * 1.1;
      b.add('body', cube(W, s * 0.3, H).translate(0, s * 0.05, 0), f, [0, 0, 0], [0.35, 0, 0]);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
        const x = (c - 2.5 + (r % 2) * 0.5) * W * 0.15, z = (r - 1.5) * H * 0.22;
        b.add(g, cyl(s * 0.075, s * 0.04, 6), f, [x, s * 0.22 + z * Math.sin(0.35), z * Math.cos(0.35)], [0.35, 0, 0]);
      }
      b.add('trim', cube(W * 1.05, s * 0.36, s * 0.08), f, [0, s * 0.05 + H * 0.5 * Math.sin(0.35), -H * 0.5 * Math.cos(0.35)], [0.35, 0, 0]);
      return;
    }
    case 'torpedo': {
      // One big tube along the keel, the warhead's nose showing at its mouth.
      const len = L * 0.38, r = s * 0.55;
      b.add('body', cube(s * 0.4, s * 0.5, len * 0.6), f, [0, s * 0.05, -len * 0.4]);
      b.add('body', barrel(r, len, look.seg), f, [0, r + s * 0.15, s * 0.5]);
      b.add('trim', ring(r * 1.02, s * 0.08, look.seg), f, [0, r + s * 0.15, s * 0.5 - len]);
      b.add('trim', ring(r * 1.02, s * 0.06, look.seg), f, [0, r + s * 0.15, s * 0.5 - len * 0.5]);
      b.add(g, new THREE.SphereGeometry(r * 0.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), f, [0, r + s * 0.15, s * 0.5 - len], [-Math.PI / 2, 0, 0], [1, 1.2, 1]);
      return;
    }
    case 'mine': {
      // A rack facing aft with a row of spiked mines.
      b.add('body', cube(s * 1.8, s * 0.3, s * 0.7), f, [0, s * 0.05, 0]);
      for (const x of [-1, 1]) b.add('trim', cube(s * 0.08, s * 0.7, s * 0.7), f, [x * s * 0.9, s * 0.4, 0]);
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * s * 0.42;
        b.add('dark', new THREE.IcosahedronGeometry(s * 0.17, 0), f, [x, s * 0.42, s * 0.1]);
        b.add(g, new THREE.OctahedronGeometry(s * 0.21, 0), f, [x, s * 0.42, s * 0.1], [0.4, 0.4, 0]);
      }
      return;
    }
  }
}

// ---- The hull, for ray casts --------------------------------------------------------------------------------------

/** The model's solid parts baked into its own space, to find where its surface is. */
function probeOf(model: THREE.Group) {
  model.updateMatrixWorld(true);
  const inv = model.matrixWorld.clone().invert();
  const side = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const meshes: THREE.Mesh[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.role === 'glow' || m.userData.hardpoint || m.userData.exhaust) return;
    const g = m.geometry.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld));
    meshes.push(new THREE.Mesh(g, side));
  });
  const box = new THREE.Box3();
  for (const m of meshes) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox!); }
  const rc = new THREE.Raycaster();
  /** Where a ray from outside, travelling `dir`, first meets the hull; null if it misses. */
  const hit = (from: THREE.Vector3, dir: THREE.Vector3) => {
    rc.set(from, dir);
    rc.far = 1e3;
    const h = rc.intersectObjects(meshes, false)[0];
    return h ? h.point.clone() : null;
  };
  return { box, hit, dispose: () => { meshes.forEach((m) => m.geometry.dispose()); side.dispose(); } };
}

// ---- The fit ------------------------------------------------------------------------------------------------------

export interface Hardpoints {
  group: THREE.Group;
  /** Brighten the selected weapon's hardware, and breathe every glow. */
  update: (time: number, armed: MunitionId | null) => void;
  dispose: () => void;
}

/**
 * Hardware for everything in `loadout`, for `model` (a nation cruiser, in its own units, before it is fitted to
 * length), in the nation's materials. `nozzles` are the engine exits in the model's units, for afterburner collars.
 */
export function buildHardpoints(model: THREE.Group, nation: NationId, loadout: Loadout, mats: StyleMaterials, nozzles: THREE.Vector3[] = []): Hardpoints {
  const l = sanitizeLoadout(loadout);
  const look = NATION_LOOK[nation];
  const probe = probeOf(model);
  const { box } = probe;
  const size = box.getSize(V(0, 0, 0));
  const L = size.z;
  const cy = (box.min.y + box.max.y) / 2;
  const s = L * 0.08; // a mount's size: big enough to read at a glance in flight
  const b = new Builder();

  /** The anchor of a zone: a point on the hull and the way out of it, or null where no hull is found near it. */
  const anchor = (zone: Zone, sign = 1): Frame | null => {
    const { t, side } = ZONES[zone];
    if (side === 'side') {
      const p = find(t, (z, d) => probe.hit(V(sign * (box.max.x + 1), cy + d, z), V(-sign, 0, 0)));
      return p && new Frame(p.add(V(sign * s * 0.1, 0, 0)), V(sign, 0, 0));
    }
    return anchorAt(probe, box, t, side, 0);
  };
  /** Search a little fore and aft (and off the centre line) for hull. */
  const find = (t: number, ray: (z: number, d: number) => THREE.Vector3 | null) => {
    for (const dt of [0, 0.03, -0.03, 0.07, -0.07]) for (const d of [0, size.y * 0.15, -size.y * 0.15]) {
      const p = ray(box.min.z + L * (t + dt), d);
      if (p) return p;
    }
    return null;
  };
  const usable = new Map<Zone, boolean>();
  for (const z of Object.keys(ZONES) as Zone[]) usable.set(z, ZONES[z].side === 'side' ? !!anchor(z, 1) && !!anchor(z, -1) : !!anchor(z));

  // Weapons.
  const zones = assignZones(l.weapons, (z) => usable.get(z) ?? false);
  for (const w of l.weapons) {
    const zone = zones[w];
    if (!zone) continue;
    if (ZONES[zone].side === 'side') for (const sign of [1, -1]) weaponMount(b, anchor(zone, sign)!, w, look, s, L);
    else if (zone === 'tail') weaponMount(b, flipAft(anchor(zone)!), w, look, s, L);
    else weaponMount(b, anchor(zone)!, w, look, s, L);
  }
  const used = new Set(Object.values(zones));

  // Shield: one emitter pylon per Mk, astern on the spine (or on the flanks when the spine is full), in its colour.
  {
    const [sid, tier] = l.shield.split('-') as [ShieldId, string];
    const sg: Role = `glow:shield`;
    b.glows.set(sg, 'fit');
    shieldColor = SHIELDS[sid]?.color ?? '#5fb8ff';
    const n = Number(tier) || 1;
    for (let i = 0; i < n; i++) {
      const f = anchorAt(probe, box, 0.8 - i * 0.07, 'up', 0);
      if (!f) continue;
      const h = s * (0.9 + i * 0.2);
      if (look.seg <= 8) {
        // Faceted nations: a raked blade with a glowing point.
        b.add('body', hullOf([V(-s * 0.18, -s * 0.3, s * 0.5), V(s * 0.18, -s * 0.3, s * 0.5), V(-s * 0.12, -s * 0.3, -s * 0.3), V(s * 0.12, -s * 0.3, -s * 0.3), V(0, h, s * 0.35), V(0, h * 0.9, s * 0.1)]), f);
        b.add(sg, new THREE.OctahedronGeometry(s * 0.17, 0), f, [0, h + s * 0.08, s * 0.28]);
      } else {
        // Round nations: a short post, a collar, a glowing emitter ball.
        b.add('body', cyl(s * 0.12, h, look.seg, s * 0.22).translate(0, h / 2 - s * 0.2, 0), f);
        b.add('trim', ring(s * 0.22, s * 0.05, look.seg), f, [0, h * 0.85, 0], [Math.PI / 2, 0, 0]);
        b.add(sg, new THREE.SphereGeometry(s * 0.17, 12, 8), f, [0, h, 0]);
      }
    }
  }

  // Drones: a cradle with the drone docked in it, either side of the spine amidships.
  l.drones.forEach((d, i) => {
    const dg: Role = `glow:drone-${d}`;
    b.glows.set(dg, 'fit');
    droneColors[d] = DRONES[d].color;
    const f = anchorAt(probe, box, 0.5, 'up', (i ? -1 : 1) * Math.min(size.x * 0.22, s * 2.2));
    if (!f) return;
    b.add('body', cube(s * 1.0, s * 0.18, s * 1.1), f, [0, s * 0.05, 0]);
    for (const x of [-1, 1]) b.add('trim', cube(s * 0.08, s * 0.5, s * 1.0), f, [x * s * 0.5, s * 0.3, 0]);
    b.add('dark', new THREE.OctahedronGeometry(s * 0.38, 0), f, [0, s * 0.45, 0], [0, Math.PI / 4, 0], [1, 0.55, 1.4]);
    b.add(dg, new THREE.SphereGeometry(s * 0.11, 8, 6), f, [0, s * 0.5, -s * 0.45]);
  });

  // Countermeasure: flare strips, chaff pods, or a jammer mast.
  if (l.counter) {
    const cg: Role = 'glow:counter';
    b.glows.set(cg, 'fit');
    if (l.counter === 'jammer') {
      const f = anchorAt(probe, box, 0.72, 'up', s * 1.6);
      if (f) {
      b.add('trim', cyl(s * 0.05, s * 2.2, 6), f, [0, s * 1.1, 0]);
      for (let i = 0; i < 3; i++) b.add('trim', cube(s * (0.9 - i * 0.22), s * 0.05, s * 0.05), f, [0, s * (1.0 + i * 0.45), 0]);
      b.add(cg, new THREE.SphereGeometry(s * 0.1, 8, 6), f, [0, s * 2.25, 0]);
      }
    } else for (const sign of [1, -1]) {
      const f = anchorAt(probe, box, 0.86, 'down', sign * Math.min(size.x * 0.25, s * 2));
      if (!f) continue;
      if (l.counter === 'flare') {
        b.add('body', cube(s * 0.5, s * 0.25, s * 1.3), f, [0, s * 0.05, 0]);
        for (let i = 0; i < 4; i++) b.add(cg, cyl(s * 0.07, s * 0.05, 8), f, [0, s * 0.2, -s * 0.45 + i * s * 0.3]);
      } else {
        b.add('body', new THREE.CapsuleGeometry(s * 0.24, s * 0.9, 4, 10).rotateX(Math.PI / 2), f, [0, s * 0.18, 0]);
        b.add(cg, ring(s * 0.25, s * 0.03, 12), f, [0, s * 0.18, -s * 0.2]);
      }
    }
  }

  // Targeting computer: a sensor dome under the nose, bigger per Mk.
  {
    const tier = moduleById(l.targeting)?.tier ?? 1;
    if (!used.has('chin') || tier > 1) {
      const tg: Role = 'glow:targeting';
      b.glows.set(tg, 'fit');
      const f = anchorAt(probe, box, used.has('chin') ? 0.24 : 0.16, 'down', 0);
      if (f) {
      const r = s * (0.38 + tier * 0.12);
      b.add('trim', new THREE.SphereGeometry(r, look.seg, 8, 0, Math.PI * 2, 0, Math.PI / 2), f, [0, -r * 0.2, 0]);
      if (tier >= 2) b.add(tg, ring(r * 0.75, s * 0.03, 16), f, [0, r * 0.35, 0], [Math.PI / 2, 0, 0]);
      if (tier >= 3) b.add(tg, new THREE.SphereGeometry(s * 0.07, 6, 4), f, [0, r * 0.82, 0]);
      }
    }
  }

  // Reactor: glowing vents along the spine aft, one more per Mk, in the engine's colour.
  {
    const tier = moduleById(l.reactor)?.tier ?? 1;
    const rg: Role = 'glow:reactor';
    b.glows.set(rg, 'fit');
    for (let i = 0; i <= tier; i++) {
      const f = anchorAt(probe, box, 0.68 + i * 0.045, 'up', 0);
      if (!f || (used.has('spine2') && i === 0)) continue;
      b.add('dark', cube(s * 0.9, s * 0.2, s * 0.24), f, [0, s * 0.02, 0]);
      b.add(rg, cube(s * 0.7, s * 0.06, s * 0.1), f, [0, s * 0.13, 0]);
    }
  }

  // Armour: plate slabs down the flanks, a second row on Mk II.
  if (l.armour) {
    const tier = moduleById(l.armour)?.tier ?? 1;
    // Each plate is the hull's own surface over a patch, lifted off it: it follows the curve instead of jutting out.
    const thick = s * (0.12 + tier * 0.05);
    for (const sign of [1, -1]) for (let i = 0; i < 3; i++) for (let row = 0; row < tier; row++) {
      const t0 = 0.3 + i * 0.12, t1 = t0 + 0.1;
      const y0 = cy + (row ? -0.32 : -0.08) * size.y, y1 = y0 + size.y * 0.22;
      const pts: THREE.Vector3[] = [];
      for (const t of [t0, (t0 + t1) / 2, t1]) for (const y of [y0, (y0 + y1) / 2, y1]) {
        const p = probe.hit(V(sign * (box.max.x + 1), y, box.min.z + L * t), V(-sign, 0, 0));
        if (!p) continue;
        pts.push(p.clone().add(V(-sign * s * 0.05, 0, 0)), p.clone().add(V(sign * thick, 0, 0)));
      }
      if (pts.length < 10) continue;
      const geo = hullOf(pts);
      b.parts.push({ role: row ? 'trim' : 'body', geo: plain(geo) });
    }
  }

  // Engine: an afterburner collar on each nozzle, one ring per Mk above the first, and vanes at Mk III.
  {
    const tier = moduleById(l.engine)?.tier ?? 1;
    const eg: Role = 'glow:engine';
    b.glows.set(eg, 'fit');
    if (tier > 1) for (const n of nozzles.slice(0, 4)) {
      const r = Math.max(s * 0.6, Math.min(s * 1.4, nozzleRadius(n, nozzles, s)));
      const f = new Frame(n.clone(), V(0, 1, 0));
      for (let i = 0; i < tier - 1; i++) {
        b.add('trim', ring(r * (1.05 + i * 0.12), s * 0.12, look.seg), f, [0, 0, s * (0.15 + i * 0.4)]);
        b.add(eg, ring(r * (0.95 + i * 0.12), s * 0.04, look.seg), f, [0, 0, s * (0.3 + i * 0.4)]);
      }
      if (tier >= 3) for (let k = 0; k < 4; k++) b.add('body', cube(s * 0.08, r * 0.7, s * 0.8), f, [0, 0, s * 0.5], [0, 0, (k * Math.PI) / 2 + Math.PI / 4], [1, 1, 1]);
    }
  }

  probe.dispose();
  return assemble(b, nation, mats);
}

// Fit colours set while building (the shield and drone colours depend on the loadout).
let shieldColor = '#5fb8ff';
const droneColors: Record<string, string> = {};

function nozzleRadius(n: THREE.Vector3, all: THREE.Vector3[], s: number) {
  let d = Infinity;
  for (const o of all) if (o !== n) d = Math.min(d, o.distanceTo(n));
  return Number.isFinite(d) ? d * 0.45 : s;
}

/** A point on the top or bottom of the hull near (x, t), searched a little fore, aft and inward; null if none. */
function anchorAt(probe: ReturnType<typeof probeOf>, box: THREE.Box3, t: number, side: 'up' | 'down', x: number): Frame | null {
  const L = box.max.z - box.min.z;
  const up = side === 'up' ? 1 : -1;
  for (const dt of [0, 0.03, -0.03, 0.07, -0.07]) for (const k of [1, 0.6, 0.3, 0]) {
    const p = probe.hit(V(x * k, up > 0 ? box.max.y + 1 : box.min.y - 1, box.min.z + L * (t + dt)), V(0, -up, 0));
    if (p) return new Frame(p, V(0, up, 0));
  }
  return null;
}

/** The same anchor, turned to face aft (the mine rack). */
function flipAft(f: Frame): Frame {
  const turn = new THREE.Matrix4().makeRotationY(Math.PI);
  const out = Object.create(Frame.prototype) as Frame;
  (out as { m: THREE.Matrix4 }).m = f.m.clone().multiply(turn);
  return out;
}

/** Merge the parts into one mesh per material, and make the glows breathe. */
function assemble(b: Builder, nation: NationId, mats: StyleMaterials): Hardpoints {
  const group = new THREE.Group();
  group.userData.hardpoint = true;
  const byRole = new Map<Role, THREE.BufferGeometry[]>();
  for (const p of b.parts) { const a = byRole.get(p.role) ?? []; a.push(p.geo); byRole.set(p.role, a); }

  const own: THREE.Material[] = [];
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0d12, metalness: 0.7, roughness: 0.45 });
  own.push(dark);
  const glowMats = new Map<string, { mat: THREE.MeshBasicMaterial; base: THREE.Color; w: MunitionId | 'fit' }>();
  const engine = (mats.glow as THREE.MeshBasicMaterial).color;
  const glowColor = (role: string): THREE.Color => {
    const key = role.slice(5);
    if (key === 'shield') return new THREE.Color(shieldColor);
    if (key.startsWith('drone-')) return new THREE.Color(droneColors[key.slice(6)] ?? '#ffffff');
    if (key === 'reactor' || key === 'engine') return engine.clone();
    if (key === 'counter' || key === 'targeting') return new THREE.Color(NATION_LOOK[nation].bolt);
    return new THREE.Color(weaponGlow(nation, key as MunitionId));
  };

  const geos: THREE.BufferGeometry[] = [];
  for (const [role, list] of byRole) {
    const geo = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (!geo) continue;
    geos.push(geo);
    let mat: THREE.Material;
    if (role === 'body') mat = mats[NATION_LOOK[nation].body];
    else if (role === 'trim') mat = mats[NATION_LOOK[nation].trim];
    else if (role === 'barrel') mat = mats[NATION_LOOK[nation].barrel];
    else if (role === 'dark') mat = dark;
    else {
      const base = glowColor(role);
      const m = new THREE.MeshBasicMaterial({ color: base.clone() });
      own.push(m);
      glowMats.set(role, { mat: m, base, w: b.glows.get(role) ?? 'fit' });
      mat = m;
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.role = role.startsWith('glow') ? 'hardpoint-glow' : 'hardpoint';
    mesh.userData.hardpoint = true;
    group.add(mesh);
  }

  return {
    group,
    update(time, armed) {
      for (const [role, g] of glowMats) {
        const breathe = 0.85 + 0.15 * Math.sin(time * (role === 'glow:ion' ? 23 : 2.2) + role.length);
        const lit = g.w === 'fit' ? 1 : g.w === armed ? 2.4 : 0.9;
        g.mat.color.copy(g.base).multiplyScalar(lit * breathe);
      }
    },
    dispose() { geos.forEach((g) => g.dispose()); own.forEach((m) => m.dispose()); },
  };
}
