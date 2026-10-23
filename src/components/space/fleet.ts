/**
 * The nations' ship models: a capital ship, the cruiser (the player's own ship in a nation's colour), a fighter and,
 * per nation, a destroyer (destroyers.ts) and a special ship (styles/specials.ts).
 * Built procedurally like ship.ts. Each model is merged into one mesh per material, and the capital ship and fighter
 * share their geometry across every nation, so 49 ships stay cheap enough for a phone.
 *
 * Every model comes back with its nose toward −z and is fitted to a length the caller asks for in world units.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ShipType } from '../../lib/shipTypes';
import type { NationId } from '../../lib/nations';
import type { DRole } from './destroyers';
import { buildDestroyer, destroyerMaterials } from './destroyers';
import type { SpaceUniforms } from './materials';
import { SHIP_MODEL_LENGTH, buildShip } from './ship';
import { SPECIALS, STYLES } from './styles';
import type { StyleMaterials } from './styles';

type Role = 'hull' | 'accent' | 'glow' | 'glass' | 'lit';

/** Bake each direct child's transform and merge meshes that share a material. Children tagged `keep` stay as they are. */
export function mergeByMaterial(group: THREE.Group) {
  const byMat = new Map<THREE.Material, THREE.Mesh[]>();
  for (const c of [...group.children]) {
    if (!(c instanceof THREE.Mesh) || c.userData.keep) continue;
    const m = c.material as THREE.Material;
    if (!byMat.has(m)) byMat.set(m, []);
    byMat.get(m)!.push(c);
  }
  for (const [mat, meshes] of byMat) {
    const parts = meshes.map((mesh) => {
      mesh.updateMatrix();
      let g = mesh.geometry.clone().applyMatrix4(mesh.matrix);
      if (g.index) { const n = g.toNonIndexed(); g.dispose(); g = n; }
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      g.clearGroups();
      return g;
    });
    const merged = new THREE.Mesh(mergeGeometries(parts, false)!, mat);
    merged.userData.role = meshes[0].userData.role;
    parts.forEach((g) => g.dispose());
    for (const mesh of meshes) { group.remove(mesh); mesh.geometry.dispose(); }
    group.add(merged);
  }
  return group;
}

/** Length along z of a model's meshes, exhaust left out. */
export function modelLength(o: THREE.Object3D) {
  o.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const b = new THREE.Box3();
  o.traverse((c) => {
    if (!(c instanceof THREE.Mesh) || c.userData.exhaust) return;
    c.geometry.computeBoundingBox();
    b.copy(c.geometry.boundingBox!).applyMatrix4(c.matrixWorld);
    box.union(b);
  });
  return box.max.z - box.min.z;
}

const ROLES: Role[] = ['hull', 'accent', 'glow', 'glass', 'lit'];

/** Template materials: only their identity matters (one per role), so meshes merge by role. */
function roleMats(): Record<Role, THREE.Material> {
  return Object.fromEntries(ROLES.map((r) => [r, new THREE.MeshBasicMaterial({ name: r })])) as unknown as Record<Role, THREE.Material>;
}

function part(group: THREE.Group, mats: Record<Role, THREE.Material>, role: Role, g: THREE.BufferGeometry, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(g, mats[role]);
  m.position.set(x, y, z);
  m.userData.role = role;
  group.add(m);
  return m;
}

/** An extruded outline seen from above: shape (x, y) → model (x, z), `depth` tall, centred on y = `y`. */
function slab(points: [number, number][], depth: number, y: number, bevel = 0.06) {
  const s = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 });
  g.rotateX(Math.PI / 2); // shape y → z, depth → −y
  g.translate(0, y + depth / 2, 0);
  return g;
}

/**
 * A capital ship, about ten units long before fitting: a long armoured wedge with a keel beneath, stepped decks
 * rising to a bridge tower at the stern, gun turrets, a nation-coloured light strip down each flank and a bank of
 * three engines.
 */
function capitalTemplate() {
  const g = new THREE.Group();
  const M = roleMats();
  const wedge: [number, number][] = [[0, -5], [0.95, -2.4], [1.45, 1.2], [1.3, 4.6], [-1.3, 4.6], [-1.45, 1.2], [-0.95, -2.4]];
  part(g, M, 'hull', slab(wedge, 0.7, 0));
  part(g, M, 'hull', slab(wedge.map(([x, z]) => [x * 0.55, z * 0.92 + 0.3]), 0.55, -0.6)); // keel
  // Stepped decks toward the stern, then the bridge.
  part(g, M, 'accent', slab([[0, -1.6], [0.8, 0.4], [0.9, 4.2], [-0.9, 4.2], [-0.8, 0.4]], 0.3, 0.52, 0.04));
  part(g, M, 'hull', slab([[0, 1.0], [0.55, 2.0], [0.6, 4.0], [-0.6, 4.0], [-0.55, 2.0]], 0.3, 0.84, 0.04));
  part(g, M, 'hull', new THREE.BoxGeometry(0.42, 0.8, 0.7), 0, 1.35, 3.4); // tower
  part(g, M, 'accent', new THREE.BoxGeometry(1.5, 0.2, 0.42), 0, 1.82, 3.35); // bridge
  part(g, M, 'lit', new THREE.BoxGeometry(1.52, 0.05, 0.06), 0, 1.84, 3.13); // bridge windows
  part(g, M, 'hull', new THREE.CylinderGeometry(0.02, 0.03, 0.8, 4), 0, 2.3, 3.5); // mast
  // Turrets along the spine: a dome and a pair of barrels each.
  for (const [x, z] of [[0, -2.6], [0, -1.2], [0.55, 0.6], [-0.55, 0.6]] as const) {
    const y = z < 0 ? 0.42 : 0.72;
    const dome = new THREE.SphereGeometry(0.2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    part(g, M, 'accent', dome, x, y, z);
    for (const s of [-1, 1]) {
      const barrel = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5);
      barrel.rotateX(Math.PI / 2);
      part(g, M, 'hull', barrel, x + s * 0.07, y + 0.08, z - 0.3);
    }
  }
  // Light strips down the flanks and rows of windows.
  for (const s of [-1, 1]) {
    const strip = new THREE.BoxGeometry(0.05, 0.06, 3.7);
    strip.rotateY(-s * Math.atan2(0.5, 3.6));
    part(g, M, 'glow', strip, s * 1.2, 0, -0.6);
    for (let i = 0; i < 6; i++) part(g, M, 'lit', new THREE.BoxGeometry(0.04, 0.04, 0.22), s * 1.36, 0.18, 1.6 + i * 0.45);
  }
  // Engines: a block at the stern with three nozzles and their glow.
  part(g, M, 'hull', new THREE.BoxGeometry(2.3, 0.95, 0.5), 0, 0.05, 4.75);
  for (const x of [-0.7, 0, 0.7]) {
    const bell = new THREE.CylinderGeometry(0.26, 0.34, 0.4, 14, 1, true);
    bell.rotateX(Math.PI / 2);
    part(g, M, 'accent', bell, x, 0.05, 5.15);
    const disc = new THREE.CircleGeometry(0.27, 14);
    part(g, M, 'glow', disc, x, 0.05, 5.2);
  }
  return mergeByMaterial(g);
}

/** A fighter, about two units long before fitting: a dart fuselage, a bubble canopy, delta wings and twin fins. */
function fighterTemplate() {
  const g = new THREE.Group();
  const M = roleMats();
  const body = new THREE.ConeGeometry(0.2, 1.7, 6);
  body.rotateX(-Math.PI / 2); // nose toward −z
  body.scale(1, 0.7, 1);
  part(g, M, 'hull', body, 0, 0, -0.1);
  const canopy = new THREE.SphereGeometry(0.1, 10, 6);
  canopy.scale(0.8, 0.6, 2);
  part(g, M, 'glass', canopy, 0, 0.1, -0.2);
  part(g, M, 'accent', slab([[0.12, -0.1], [0.95, 0.6], [0.95, 0.75], [0.12, 0.6]], 0.04, 0));
  part(g, M, 'accent', slab([[-0.12, -0.1], [-0.12, 0.6], [-0.95, 0.75], [-0.95, 0.6]], 0.04, 0));
  for (const s of [-1, 1]) {
    const fin = new THREE.BoxGeometry(0.03, 0.3, 0.32);
    const m = part(g, M, 'hull', fin, s * 0.16, 0.16, 0.55);
    m.rotation.z = -0.35 * s;
  }
  const bell = new THREE.CylinderGeometry(0.1, 0.13, 0.18, 10, 1, true);
  bell.rotateX(Math.PI / 2);
  part(g, M, 'hull', bell, 0, 0, 0.78);
  part(g, M, 'glow', new THREE.CircleGeometry(0.11, 10), 0, 0, 0.86);
  return mergeByMaterial(g);
}

/** One nation's materials for the capital ship and the fighter. */
export function nationMaterials(color: string): Record<Role, THREE.Material> {
  const c = new THREE.Color(color);
  return {
    hull: new THREE.MeshStandardMaterial({ color: new THREE.Color(0x4c525c).lerp(c, 0.35), metalness: 0.8, roughness: 0.5, envMapIntensity: 0.7 }),
    accent: new THREE.MeshStandardMaterial({ color: c, emissive: c.clone().multiplyScalar(0.25), metalness: 0.6, roughness: 0.45, envMapIntensity: 0.7 }),
    glow: new THREE.MeshBasicMaterial({ color: c.clone().lerp(new THREE.Color(1, 1, 1), 0.35).multiplyScalar(2.5) }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0b1e3a, metalness: 0, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.2 }),
    lit: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.35, 0.9) }),
  };
}

/**
 * A nation's own model of `type` from ART-DIRECTION.md (styles/, integration pass 2), merged by material. Each nation
 * has a capital ship, a cruiser and a fighter; its accent is the nation's colour.
 */
export function styledModel(type: 'capital' | 'cruiser' | 'fighter', nation: { id: NationId; color: string }, mats?: StyleMaterials) {
  const style = STYLES[nation.id];
  return mergeByMaterial(style[type](mats ?? style.materials(nation.color)));
}

/**
 * Dresses the player's ship (ship.ts) as its nation's cruiser: the courier's hull and lights are hidden, its live
 * exhaust stays, and the nation's cruiser is fitted to the courier's length (SHIP_MODEL_LENGTH), so every size
 * measured against the player ship holds. Caleb, 2026-10-18: the player flies their nation's cruiser.
 */
export function dressAsNation(group: THREE.Group, nation: { id: NationId; color: string }) {
  for (const c of group.children) if (!c.userData.exhaust) c.visible = false;
  const model = styledModel('cruiser', nation);
  model.scale.setScalar(SHIP_MODEL_LENGTH / modelLength(model));
  model.userData.nationModel = true;
  group.add(model);
  return model;
}

/**
 * Readable at fighting range (GRAPHICS-PASS #10). Every hull and panel catches at least 0.7 of the environment; a hull
 * darker than the night it flies in takes on its nation's colour (a third of the way, and a faint glow of it), so the
 * Saturn and Jupiter houses stop vanishing into the nebula; and a row of running lights in the nation's colour is set
 * along the spine and the keel, so a ship reads by colour as well as shape when it is a few pixels long.
 * Changes the template's materials in place (they are its own: one set per nation and type) and adds one mesh.
 */
const DARK = 0.06; // relative luminance below which a hull is lifted toward its nation's colour
export function liven(model: THREE.Object3D, color: string) {
  const c = new THREE.Color(color);
  const seen = new Set<THREE.Material>();
  const solids: THREE.Mesh[] = [];
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.userData.exhaust || o.userData.runningLights || !o.visible) return;
    solids.push(o);
    const m = o.material as THREE.Material;
    if (seen.has(m) || !(m instanceof THREE.MeshStandardMaterial) || m instanceof THREE.MeshPhysicalMaterial) return;
    seen.add(m);
    const role = o.userData.role;
    if (role === 'hull' || role === 'panel' || role === 'accent') m.envMapIntensity = Math.max(m.envMapIntensity, 0.7);
    if ((role === 'hull' || role === 'panel') && luminance(m.color) < DARK) {
      m.color.lerp(c, 0.33);
      m.emissive.copy(c).multiplyScalar(0.07);
    }
  });
  // The running lights: short bars down the centreline, set onto whatever the hull is there (top and bottom).
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const len = size.z;
  const ray = new THREE.Raycaster();
  const bars: THREE.BufferGeometry[] = [];
  const N = 9;
  for (const dir of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const z = box.min.z + len * (0.12 + (0.76 * i) / (N - 1));
      ray.set(new THREE.Vector3(0, dir < 0 ? box.max.y + 1 : box.min.y - 1, z), new THREE.Vector3(0, dir, 0));
      const hit = ray.intersectObjects(solids, false)[0];
      if (!hit) continue;
      const bar = new THREE.BoxGeometry(Math.max(size.x * 0.035, len * 0.012), len * 0.008, len * 0.045);
      bar.translate(0, hit.point.y - dir * len * 0.004, z);
      bars.push(bar);
    }
  }
  if (!bars.length) return;
  // The nation's hue at full strength (dark colours scaled up to it), so the bloom shows the colour and not white.
  const hue = c.clone().multiplyScalar(1 / Math.max(c.r, c.g, c.b, 1e-3));
  const lights = new THREE.Mesh(mergeGeometries(bars, false)!, new THREE.MeshBasicMaterial({ color: hue.multiplyScalar(1.6) }));
  bars.forEach((g) => g.dispose());
  lights.userData = { role: 'glow', runningLights: true };
  // In the model's own frame: undo the model's transform so the bars sit where the rays found the hull.
  lights.applyMatrix4(model.matrixWorld.clone().invert());
  model.add(lights);
}
const luminance = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/** What fleet.make builds: the four ship types, and each nation's special ship (races.ts's `special` class). */
export type ModelKind = ShipType | 'special';

export interface Fleet {
  /** A new model of `type` in a nation's style and colour, `length` world units long. */
  make: (type: ModelKind, nation: { id?: NationId; color: string }, length: number) => THREE.Group;
  /** Engines and lights of the cruisers. */
  update: (dt: number, time: number) => void;
  dispose: () => void;
}

export function createFleet(u: SpaceUniforms): Fleet {
  const templates = { capital: capitalTemplate(), fighter: fighterTemplate() };
  const lengths = { capital: modelLength(templates.capital), fighter: modelLength(templates.fighter) };
  const mats = new Map<string, Record<Role, THREE.Material>>();
  const cruisers = new Map<string, { ship: ReturnType<typeof buildShip>; length: number }>();
  const matsFor = (color: string) => {
    if (!mats.has(color)) mats.set(color, nationMaterials(color));
    return mats.get(color)!;
  };

  // Destroyers: one model per nation (destroyers.ts), built once and shared by every copy.
  const destroyers = new Map<NationId, { template: THREE.Group; mats: Record<DRole, THREE.Material>; length: number }>();
  const destroyerOf = (n: NationId, color: string) => {
    if (!destroyers.has(n)) {
      const mats = destroyerMaterials(n);
      const template = mergeByMaterial(buildDestroyer(n, mats));
      const length = modelLength(template);
      liven(template, color);
      destroyers.set(n, { template, mats, length });
    }
    return destroyers.get(n)!;
  };

  // Specials: one per nation (styles/specials.ts) in the nation's style materials, built once and shared by every copy.
  const specials = new Map<NationId, { template: THREE.Group; length: number }>();
  const specialOf = (n: { id: NationId; color: string }) => {
    if (!specials.has(n.id)) {
      const template = mergeByMaterial(SPECIALS[n.id].build(STYLES[n.id].materials(n.color)));
      specials.set(n.id, { template, length: modelLength(template) });
    }
    return specials.get(n.id)!;
  };

  /** A copy of a merged template: new meshes on the template's geometry and materials. */
  const copyOf = (template: THREE.Group) => {
    const g = new THREE.Group();
    for (const t of template.children as THREE.Mesh[]) {
      const mesh = new THREE.Mesh(t.geometry, t.material);
      mesh.userData = { ...t.userData };
      g.add(mesh);
    }
    return g;
  };

  // Each nation's styled template per type, built once; copies share geometry and materials.
  const styled = new Map<string, { group: THREE.Group; length: number }>();
  function make(type: ModelKind, nation: { id?: NationId; color: string }, length: number) {
    const holder = new THREE.Group();
    let model: THREE.Object3D;
    let own: number;
    if (type === 'special') {
      const s = specialOf({ id: nation.id ?? 'earth', color: nation.color });
      model = copyOf(s.template);
      own = s.length;
    } else if (type === 'destroyer') {
      const d = destroyerOf(nation.id ?? 'earth', nation.color);
      const g = new THREE.Group();
      for (const t of d.template.children as THREE.Mesh[]) {
        const mesh = new THREE.Mesh(t.geometry, t.material);
        mesh.userData = { ...t.userData };
        g.add(mesh);
      }
      model = g;
      own = d.length;
    } else if (nation.id && STYLES[nation.id] && (type === 'capital' || type === 'cruiser' || type === 'fighter')) {
      const key = `${nation.id}:${type}`;
      let t = styled.get(key);
      if (!t) {
        const group = styledModel(type, { id: nation.id, color: nation.color });
        t = { group, length: modelLength(group) };
        liven(group, nation.color);
        styled.set(key, t);
        model = group;
      }
      else model = t.group.clone();
      own = t.length;
    } else if (type === 'cruiser') {
      // The player's ship, repainted; one per nation, the rest are copies sharing its geometry and materials.
      let c = cruisers.get(nation.color);
      if (!c) {
        const ship = buildShip(u, { hull: nation.color });
        mergeByMaterial(ship.group);
        ship.update(5, 0.5, 0);
        c = { ship, length: modelLength(ship.group) };
        cruisers.set(nation.color, c);
        model = ship.group;
      } else model = c.ship.group.clone();
      own = c.length;
    } else {
      const m = matsFor(nation.color);
      const g = new THREE.Group();
      for (const t of templates[type].children as THREE.Mesh[]) {
        const mesh = new THREE.Mesh(t.geometry, m[t.userData.role as Role]);
        mesh.userData = { ...t.userData };
        g.add(mesh);
      }
      model = g;
      own = lengths[type];
    }
    model.scale.setScalar(length / own);
    holder.add(model);
    return holder;
  }

  return {
    make,
    update(dt, time) { for (const c of cruisers.values()) c.ship.update(dt, 0.5, time); },
    dispose() {
      for (const t of Object.values(templates)) t.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      for (const m of mats.values()) Object.values(m).forEach((x) => x.dispose());
      for (const s of specials.values()) s.template.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
      for (const d of destroyers.values()) { d.template.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); Object.values(d.mats).forEach((x) => x.dispose()); }
      for (const c of cruisers.values()) c.ship.group.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
      for (const t of styled.values()) t.group.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
    },
  };
}
