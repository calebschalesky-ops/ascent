/**
 * The god armour in the scene (GOD-ARMOUR.md, ART-REFIT.md). Each world's structure is sculpted to its accepted
 * reference sheet in armourArt.ts: one merged mesh and one material per world, columns instanced, a few small moving
 * parts. Every mount, berth cradle and moored capital ship on it is merged into two static meshes (hull and lights).
 * Only the structures near the camera are drawn at all.
 *
 * Built from megastructure/armour.ts, setpieces.ts and hardpoints.ts, the same numbers the collision uses, so what you
 * see is what you hit. Battery saver keeps the art and uses the coarser grid for collision (`gridOf`).
 *
 * Geometry is local to the planet's centre (the group sits there), so vertex positions stay small and precise in single
 * precision even at Saturn, 185,000 units out. Built-in materials only: they write the logarithmic depth themselves.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ARMOUR, ARMOUR_HOMES, armourGrid, axesOf } from '../lib/megastructure/armour';
import type { ArmourFrame, ArmourHome, Grid } from '../lib/megastructure/armour';
import { setPieces } from '../lib/megastructure/setpieces';
import type { SetPieces } from '../lib/megastructure/setpieces';
import { allMoons } from '../lib/world';
import { armourMaterial, marsSpears, worldArt, Mesher } from './armourArt';
import type { BodyFrame } from './voyageScene';
import { BERTH, SKIN, armourPlaces } from '../lib/megastructure/hardpoints';
import type { ArmourPlace, Hardpoint } from '../lib/megastructure/hardpoints';
import type { DestGeo } from '../lib/nav';
import { STATIONS } from '../lib/stations';
import { LABEL_FONT, textSprite } from './three-helpers';
import type { Target } from './voyageScene';

/** Colours per world for the mounts, from the reference sheets' swatches (art-refit/01-PLANETS-AND-ARMOR.md). */
interface Palette { plain: number; raised: number; trench: number; accent: number; glow: number; metal: number; rough: number }
const PALETTE: Record<ArmourHome, Palette> = {
  earth: { plain: 0xc9a14a, raised: 0x3a3f48, trench: 0x23272e, accent: 0x3f7fd0, glow: 0x5c8bff, metal: 0.7, rough: 0.4 }, // gold, gunmetal, sky blue
  moon: { plain: 0xe6e3da, raised: 0xb8c0cc, trench: 0x8a8f99, accent: 0x2f5fc4, glow: 0x9ab8ff, metal: 0.3, rough: 0.4 }, // bone, pale steel, deep blue
  mercury: { plain: 0x6e4a26, raised: 0x5a3d22, trench: 0x151210, accent: 0xe3c52c, glow: 0xffb000, metal: 0.8, rough: 0.4 }, // bronze, iron, hard yellow
  venus: { plain: 0xc9a227, raised: 0xc9a227, trench: 0x0f4a33, accent: 0x1d8f5c, glow: 0x3dff9a, metal: 0.85, rough: 0.3 }, // gold, deep green, emerald
  mars: { plain: 0x8a8f96, raised: 0x8a8f96, trench: 0x5d6269, accent: 0xcc2131, glow: 0xbfefff, metal: 0.7, rough: 0.4 }, // steel, legion red, ice blue
  jupiter: { plain: 0x4a2a78, raised: 0x4a2a78, trench: 0x24133a, accent: 0x7442ad, glow: 0xff2fd0, metal: 0.6, rough: 0.4 }, // royal purple, violet-black, magenta
  saturn: { plain: 0x2a2850, raised: 0x2a2850, trench: 0x16161e, accent: 0x33307a, glow: 0xff8a1e, metal: 0.5, rough: 0.55 }, // indigo, near-black, ember
};

/** Tangent directions at a point on the shell: east (round the pole) and north (toward it). */
function tangents(f: ArmourFrame, d: [number, number, number]): [THREE.Vector3, THREE.Vector3] {
  const dv = new THREE.Vector3(...d);
  let e = new THREE.Vector3(...f.pole).cross(dv);
  if (e.lengthSq() < 1e-8) e = new THREE.Vector3(...f.ref).cross(dv);
  e.normalize();
  return [e, dv.clone().cross(e).normalize()];
}

// ---------- mounts: one merged hull and one merged light mesh per structure ----------
type Parts = { hull: THREE.BufferGeometry[]; glow: THREE.BufferGeometry[] };

/** A piece, posed in a mount's local frame (x east, y north, z out of the plating; ship lengths), then into the planet's frame. */
function put(into: THREE.BufferGeometry[], g: THREE.BufferGeometry, local: THREE.Matrix4, base: THREE.Matrix4, color?: THREE.Color) {
  let p = g.index ? g.toNonIndexed() : g;
  if (p !== g) g.dispose();
  p.applyMatrix4(local).applyMatrix4(base);
  for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k);
  if (color) {
    const n = p.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
    p.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  into.push(p);
}
/**
 * A world's sculpted mesh cut into tiles by direction (`lat` bands × `lon` sectors in the structure's axes), each tile
 * with its own origin at its centre (REAL-SCALE-PLAN.md section 5). At real scale a structure is up to 250,000 units
 * across, and one mesh with its origin at the planet's centre shakes by hundredths of a unit up close; a tile's
 * vertices are a short way from its own origin, so it holds still. Each tile is frustum- and horizon-culled on its own.
 * Returns the tiles with their direction and angular radius (structure axes) for the horizon test.
 */
export interface ArtTile { mesh: THREE.Mesh; dir: THREE.Vector3; r: number; spread: number }
export function tileArt(geo: THREE.BufferGeometry, mat: THREE.Material, lat = 6, lon = 12): ArtTile[] {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const tris = pos.count / 3;
  const bins = new Map<number, number[]>();
  const c = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.x += pos.getX(t * 3 + k), c.y += pos.getY(t * 3 + k), c.z += pos.getZ(t * 3 + k);
    const l = c.length() || 1;
    const la = Math.min(lat - 1, Math.floor(((Math.asin(Math.max(-1, Math.min(1, c.y / l))) / Math.PI) + 0.5) * lat));
    const lo = Math.min(lon - 1, Math.floor(((Math.atan2(c.z, c.x) / (2 * Math.PI)) + 0.5) * lon));
    const key = la * lon + lo;
    (bins.get(key) ?? bins.set(key, []).get(key)!).push(t);
  }
  const names = Object.keys(geo.attributes);
  const out: ArtTile[] = [];
  for (const list of bins.values()) {
    const centre = new THREE.Vector3();
    for (const t of list) for (let k = 0; k < 3; k++) centre.x += pos.getX(t * 3 + k), centre.y += pos.getY(t * 3 + k), centre.z += pos.getZ(t * 3 + k);
    centre.divideScalar(list.length * 3);
    const g = new THREE.BufferGeometry();
    for (const name of names) {
      const src = geo.attributes[name] as THREE.BufferAttribute;
      const n = src.itemSize;
      const arr = new Float32Array(list.length * 3 * n);
      let o = 0;
      for (const t of list) {
        for (let k = 0; k < 3; k++) {
          const v = t * 3 + k;
          for (let q = 0; q < n; q++) arr[o++] = src.array[v * n + q] - (name === 'position' ? centre.getComponent(q) : 0);
        }
      }
      g.setAttribute(name, new THREE.BufferAttribute(arr, n));
    }
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.copy(centre);
    const r = centre.length();
    out.push({ mesh, dir: centre.clone().normalize(), r, spread: Math.min(Math.PI, (g.boundingSphere!.radius / Math.max(r, 1e-6)) * 1.2) });
  }
  geo.dispose();
  return out;
}

const T = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const box = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5); // base on z = 0
const cyl = (seg = 10) => new THREE.CylinderGeometry(0.5, 0.5, 1, seg).rotateX(Math.PI / 2).translate(0, 0, 0.5);
const dome = () => new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
const ring = () => new THREE.TorusGeometry(0.5, 0.06, 6, 20);

/** The capital-ship stand-in moored at a berth: five ship lengths, nose to +y, hull in the nation's tones. */
function capital(parts: Parts, base: THREE.Matrix4, hull: THREE.Color, accent: THREE.Color, z: number) {
  const L = 5;
  const P = (g: THREE.BufferGeometry, m: THREE.Matrix4, c: THREE.Color) => put(parts.hull, g, m, base, c);
  P(box(), T(0, -0.06 * L, z - 0.07 * L, 0.22 * L, 0.84 * L, 0.14 * L), hull);
  P(new THREE.ConeGeometry(0.155 * L, 0.18 * L, 4).rotateY(Math.PI / 4), T(0, 0.45 * L, z), hull);
  P(box(), T(0, -0.32 * L, z + 0.05 * L, 0.08 * L, 0.12 * L, 0.1 * L), hull);
  P(box(), T(0, 0, z + 0.07 * L, 0.224 * L, 0.6 * L, 0.025 * L), accent);
  for (const s of [-1, 1]) put(parts.glow, new THREE.CircleGeometry(0.035 * L, 10), T(0.05 * L * s, -0.48 * L, z, 1, 1, 1, Math.PI / 2), base);
}

/** One mount's model in ship lengths. `s` its size, `H` the most it may stand above the plating, `drop` the plinth's depth. */
function mountModel(parts: Parts, hp: Hardpoint, base: THREE.Matrix4, H: number, drop: number, hull: THREE.Color, accent: THREE.Color, dark: THREE.Color) {
  const s = hp.size;
  const P = (g: THREE.BufferGeometry, m: THREE.Matrix4, c = hull) => put(parts.hull, g, m, base, c);
  const G = (g: THREE.BufferGeometry, m: THREE.Matrix4) => put(parts.glow, g, m, base);
  const foot = Math.min(s * 0.9, s * 0.9);
  if (hp.kind !== 'mooring') P(box(), T(0, 0, -drop, foot, foot, drop), dark); // the plinth down to the plating
  const z = (f: number) => Math.min(f * s, H * f / 0.6); // heights capped so nothing stands above the skin
  switch (hp.kind) {
    case 'turret':
      P(cyl(), T(0, 0, 0, 0.8 * s, 0.8 * s, z(0.2)));
      P(box(), T(0, 0, z(0.2), 0.5 * s, 0.5 * s, z(0.2)), accent);
      for (const x of [-0.1, 0.1]) P(box(), T(x * s, 0.35 * s, z(0.28), 0.07 * s, 0.7 * s, z(0.06)));
      break;
    case 'pointDefence':
      P(dome(), T(0, 0, 0, s, s, z(0.5) * 2 / s), accent);
      break;
    case 'shieldEmitter':
      P(dome(), T(0, 0, 0, s, s, z(0.3) * 2 / s));
      G(ring(), T(0, 0, z(0.05), 1.1 * s, 1.1 * s, s));
      break;
    case 'minelayer':
      P(box(), T(0, 0, 0, 0.8 * s, 0.5 * s, z(0.3)), accent);
      break;
    case 'hangar':
      P(box(), T(0, 0, 0, s, 0.5 * s, z(0.4)));
      P(box(), T(0, 0.26 * s, z(0.05), 0.8 * s, 0.02 * s, z(0.3)), dark); // the mouth
      G(box(), T(0, 0.27 * s, z(0.36), 0.84 * s, 0.03 * s, z(0.03)));
      break;
    case 'berth': {
      P(cyl(16), T(0, 0, 0, 1.2 * s, 1.2 * s, 0.1 * s), hull); // the cradle's pad
      for (const x of [-1, 1]) P(box(), T(x * 0.5 * s, 0, 0, 0.1 * s, 0.6 * s, z(0.45)), accent);
      G(ring(), T(0, 0, BERTH.cradle * 0.9, 1.1 * s, 1.1 * s, s));
      G(box(), T(0, 0, 0.1 * s, 0.9 * s, 0.05 * s, 0.02 * s));
      break;
    }
    case 'mooring': {
      P(box(), T(0, 0, -drop, 0.4, 0.4, drop + 2.2), dark); // a pylon up from the plating
      P(box(), T(0, 0, 2.0, 1.4, 0.6, 0.35), accent); // the clamp
      capital(parts, base, hull, accent, 2.6);
      break;
    }
    case 'drydock':
      for (const x of [-1, 1]) for (const y of [-1, 1]) P(box(), T(x * 0.45 * s, y * 0.45 * s, 0, 0.06 * s, 0.06 * s, z(0.5)));
      for (const x of [-1, 1]) P(box(), T(x * 0.45 * s, 0, z(0.5), 0.06 * s, 0.96 * s, 0.05 * s), accent);
      for (const x of [-1, 1]) for (const y of [-1, 1]) G(box(), T(x * 0.45 * s, y * 0.45 * s, z(0.5), 0.09 * s, 0.09 * s, 0.03 * s));
      break;
    case 'market':
      P(box(), T(-0.25 * s, 0, 0, 0.4 * s, 0.6 * s, z(0.35)));
      P(box(), T(0.2 * s, 0.1 * s, 0, 0.35 * s, 0.4 * s, z(0.5)), accent);
      P(box(), T(0.2 * s, -0.3 * s, 0, 0.3 * s, 0.25 * s, z(0.2)));
      G(box(), T(-0.25 * s, 0.31 * s, z(0.15), 0.32 * s, 0.01 * s, z(0.04)));
      break;
    case 'temple': {
      // A temple front: stylobate, two rows of columns, entablature and a low pediment.
      const hgt = z(0.3);
      P(box(), T(0, 0, 0, s, 0.5 * s, hgt * 0.15), hull);
      for (const y of [-0.2, 0.2]) for (let c = 0; c < 8; c++) P(cyl(8), T((-0.42 + c * 0.12) * s, y * s, hgt * 0.15, 0.05 * s, 0.05 * s, hgt * 0.6), hull);
      P(box(), T(0, 0, hgt * 0.75, s, 0.5 * s, hgt * 0.12), accent);
      P(new THREE.CylinderGeometry(0.5, 0.5, 1, 3).rotateZ(Math.PI / 2).rotateY(0), T(0, 0, hgt * 0.87 + hgt * 0.06, s, 0.5 * s, hgt * 0.12, 0, 0, 0), hull);
      G(box(), T(0, 0, hgt * 0.16, 0.2 * s, 0.1 * s, hgt * 0.4)); // the lamp inside
      break;
    }
    case 'reactor':
      G(new THREE.SphereGeometry(0.5, 14, 10), T(0, 0, z(0.35), 0.6 * s, 0.6 * s, z(0.5)));
      P(ring(), T(0, 0, z(0.35), 0.9 * s, 0.9 * s, s));
      P(cyl(), T(0, 0, 0, 0.3 * s, 0.3 * s, z(0.15)), accent);
      break;
    case 'sensor':
      P(cyl(6), T(0, 0, 0, 0.08 * s, 0.08 * s, z(0.6)));
      P(new THREE.CylinderGeometry(0.5, 0.15, 0.15, 12).rotateX(Math.PI / 2), T(0, 0, z(0.6), 0.7 * s, 0.7 * s, s), accent);
      G(new THREE.SphereGeometry(0.06, 6, 4), T(0, 0, z(0.62) + 0.1 * s, s, s, s));
      break;
  }
}

/** The beacon at a berth's approach point: a ring of lights round the way in, so a pilot can find it from afar. */
function beacon(parts: Parts, base: THREE.Matrix4, h: number) {
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    put(parts.glow, new THREE.BoxGeometry(0.25, 0.25, 0.25), T(Math.cos(a) * 2.6, Math.sin(a) * 2.6, h), base);
  }
}

/** A mount's frame: east, north and out at its foot, in ship lengths, in the planet's local frame. */
function mountBase(f: ArmourFrame, hp: Hardpoint, L: number): THREE.Matrix4 {
  const d = hp.normal;
  let [e, n] = tangents(f, d);
  if (hp.along) { n = new THREE.Vector3(...hp.along); e = n.clone().cross(new THREE.Vector3(...d)).normalize(); }
  const o = new THREE.Vector3(...hp.pos).sub(new THREE.Vector3(...f.centre));
  return new THREE.Matrix4().makeBasis(e.multiplyScalar(L), n.multiplyScalar(L), new THREE.Vector3(...d).multiplyScalar(L)).setPosition(o);
}

function buildMounts(place: ArmourPlace, pal: Palette, L: number, hullMat: THREE.Material, glowMat: THREE.Material): THREE.Group {
  const f = place.frame;
  const parts: Parts = { hull: [], glow: [] };
  const hull = new THREE.Color(pal.raised);
  const accent = new THREE.Color(pal.accent);
  const dark = new THREE.Color(pal.trench).lerp(new THREE.Color(pal.plain), 0.4);
  const H = SKIN * place.k * 0.95;
  const drop = (f.rOut - f.rIn) / L;
  for (const hp of place.hardpoints) {
    const base = mountBase(f, hp, L);
    mountModel(parts, hp, base, H, drop, hull, accent, dark);
    if (hp.kind === 'berth') beacon(parts, base, (place.skin / L) + BERTH.approach);
  }
  const group = new THREE.Group();
  const merged = mergeGeometries(parts.hull, false)!;
  parts.hull.forEach((g) => g.dispose());
  group.add(new THREE.Mesh(merged, hullMat));
  const glow = mergeGeometries(parts.glow, false)!;
  parts.glow.forEach((g) => g.dispose());
  group.add(new THREE.Mesh(glow, glowMat));
  return group;
}

export interface ArmourLayer {
  targets: Target[];
  pickables: THREE.Object3D[];
  update: (dt: number, time: number, camera: THREE.Camera) => void;
  /** Battery saver uses the coarser grid for collision (`gridOf`); the art is the same. */
  setQuality: (q: 'high' | 'low') => void;
  gridOf: (home: ArmourHome) => Grid;
  places: Record<ArmourHome, ArmourPlace>;
  /** Each world's set pieces (rings, spires, wings, masts), solid like the plating. */
  setPieces: Record<ArmourHome, SetPieces>;
  /** Plated cells and structures drawn now, for the frame-time check. */
  stats: () => { plates: number; structures: number; mounts: number };
  /** Dev checks: hide every structure, to measure a frame without them. */
  show: { on: boolean };
  dispose: () => void;
}

/** Quito, where Earth's tether stands (conquest's latitude and longitude: east positive). */
export const QUITO = { lat: -0.22, lon: -78.5 };

/**
 * Every world's god armour. `geo` is the world (world.ts worldGeometry); `shipLength` the player cruiser's length;
 * `bodyFrame` the planets' turning frames (Earth's shipyard ring, tether and Pharos turn with Earth).
 */
export function buildArmour(scene: THREE.Scene, geo: DestGeo[], shipLength: number, quality: 'high' | 'low', bodyFrame?: (id: string) => BodyFrame | undefined): ArmourLayer {
  const plain = geo.filter((g) => !g.kind);
  const places = armourPlaces(plain, shipLength);
  const moons = allMoons(plain).filter((m) => m.moon.id === 'phobos' || m.moon.id === 'deimos').map((m) => ({ id: m.moon.id, pos: m.pos, size: m.size }));
  const pieces = Object.fromEntries(ARMOUR_HOMES.map((h) => [h, setPieces(places[h].frame, h === 'mars' ? { moons } : {})])) as Record<ArmourHome, SetPieces>;
  const targets: Target[] = [];
  const pickables: THREE.Object3D[] = [];
  const disposables: { dispose: () => void }[] = [];
  const homes: { home: ArmourHome; root: THREE.Group; detail: THREE.Object3D[]; mounts: THREE.Group; glow: THREE.MeshBasicMaterial; base: THREE.Color; label: THREE.Sprite; berthLabels: THREE.Sprite[]; update?: (t: number) => void; uTime: { value: number }; spin: THREE.Object3D | null; tiles: ArtTile[]; axes: THREE.Matrix3 }[] = [];
  let q = quality;
  const centre = new THREE.Vector3();

  for (const home of ARMOUR_HOMES) {
    const place = places[home];
    const f = place.frame;
    const pal = PALETTE[home];
    const root = new THREE.Group();
    root.position.set(...f.centre);
    scene.add(root);
    const mountMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: pal.metal, roughness: pal.rough, flatShading: true });
    const base = new THREE.Color(pal.glow);
    const glow = new THREE.MeshBasicMaterial({ color: base.clone().multiplyScalar(1.6), toneMapped: false });
    disposables.push(mountMat, glow);
    const mounts = buildMounts(place, pal, shipLength, mountMat, glow);
    root.add(mounts);

    // The sculpted structure, in its own axes and planet radii.
    const art = worldArt(home, { quito: { lat: QUITO.lat, lon: -QUITO.lon } }); // armourArt's longitudes run the other way round
    const mat = armourMaterial(art.style);
    disposables.push(mat);
    const ax = axesOf(f);
    const X = new THREE.Vector3(...ax.x), Y = new THREE.Vector3(...ax.y), Z = new THREE.Vector3(...ax.z);
    const artGroup = new THREE.Group();
    artGroup.matrixAutoUpdate = false;
    artGroup.matrix.makeBasis(X, Y, Z).scale(new THREE.Vector3(f.R, f.R, f.R));
    root.add(artGroup);
    const meshOf = (m: Mesher) => new THREE.Mesh(m.build(), mat);
    const tiles = tileArt(art.mesh.build(), mat);
    for (const t of tiles) artGroup.add(t.mesh);
    const detail: THREE.Object3D[] = [];
    if (art.columns && art.columns.mats.length) {
      const im = new THREE.InstancedMesh(art.columns.geo, mat, art.columns.mats.length);
      art.columns.mats.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      artGroup.add(im);
      detail.push(im);
    }
    for (const g of art.moving ?? []) {
      const m = g.userData.mesher as Mesher | undefined;
      if (m) g.add(meshOf(m));
      artGroup.add(g);
    }
    if (home === 'mars') {
      // The spears out to Phobos and Deimos and the forts on them, in Mars's axes.
      const M = new Mesher();
      const toLocalR = (p: [number, number, number]) => {
        const r = new THREE.Vector3(p[0] - f.centre[0], p[1] - f.centre[1], p[2] - f.centre[2]).divideScalar(f.R);
        return new THREE.Vector3(r.dot(X), r.dot(Y), r.dot(Z));
      };
      marsSpears(M, moons.map((m) => ({ id: m.id, at: toLocalR(m.pos), size: m.size / f.R })));
      artGroup.add(meshOf(M));
    }
    let spinMesh: THREE.Object3D | null = null;
    if (art.spin) {
      // Parts that turn with the planet go in its spin frame, whose y is the spin axis.
      const sf = bodyFrame?.(home);
      const sm = meshOf(art.spin);
      spinMesh = sm;
      sm.scale.setScalar(f.R);
      if (sf) sf.spin.add(sm);
      else artGroup.add(sm);
      disposables.push({ dispose: () => { sm.removeFromParent(); sm.geometry.dispose(); } });
    }
    const uTime = mat.userData.uTime as { value: number };
    const entry = { home, root, detail, mounts, glow, base, label: null as unknown as THREE.Sprite, berthLabels: [] as THREE.Sprite[], update: art.update, uTime, spin: spinMesh, tiles, axes: new THREE.Matrix3().set(X.x, Y.x, Z.x, X.y, Y.y, Z.y, X.z, Y.z, Z.z) };
    // The structure's name over its north, read from afar.
    const label = textSprite(ARMOUR[home].name.toUpperCase(), LABEL_FONT, '#dfe9ff', 0.02, true);
    label.center.set(0.5, -0.3);
    label.position.copy(Y.clone().multiplyScalar(Math.max(f.rOut, Math.min(pieces[home].reach, f.R * 2.4)) * 1.08));
    root.add(label);
    entry.label = label;
    for (const hp of place.hardpoints.filter((x) => x.kind === 'berth')) {
      const st = STATIONS.find((s) => s.id === hp.dest)!;
      const t = textSprite(st.label.toUpperCase(), LABEL_FONT, '#dfe9ff', 0.014, true);
      t.center.set(0.5, -0.6);
      t.position.set(hp.approach![0] - f.centre[0], hp.approach![1] - f.centre[1], hp.approach![2] - f.centre[2]);
      t.userData.dest = hp.dest;
      root.add(t);
      pickables.push(t);
      entry.berthLabels.push(t);
      targets.push({ id: hp.dest!, pos: new THREE.Vector3(...hp.approach!), arrive: 40 * shipLength, stop: 0, size: 0 });
    }
    homes.push(entry);
  }

  const cam = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const tileDir = new THREE.Vector3();
  const show = { on: true };
  return {
    show,
    targets,
    pickables,
    places,
    setPieces: pieces,
    gridOf: (home) => armourGrid(places[home].frame, q === 'low'),
    setQuality: (nq) => { q = nq; },
    stats: () => {
      let plates = 0;
      let structures = 0;
      let mounts = 0;
      for (const h of homes) {
        if (!h.root.visible) continue;
        structures++;
        plates += armourGrid(places[h.home].frame, q === 'low').plates.reduce((a, p) => a + (p ? 1 : 0), 0);
        if (h.mounts.visible) mounts++;
      }
      return { plates, structures, mounts };
    },
    update: (_dt, time, camera) => {
      camera.getWorldPosition(cam);
      const pulse = 1.25 + 0.35 * Math.sin(time * 1.7);
      for (const h of homes) {
        const f = places[h.home].frame;
        centre.set(...f.centre);
        const d = cam.distanceTo(centre);
        // Far off, a world is a few pixels and its armour a smudge: draw none of it. Its mounts only from close in.
        h.root.visible = show.on && d < f.R * 30; // past 30 radii the world is under 2° across: its armour is a few pixels
        if (h.spin) h.spin.visible = h.root.visible;
        h.mounts.visible = d < f.R * 3.5;
        for (const x of h.detail) x.visible = d < f.R * 9;
        h.label.visible = d > f.R * 1.6 && d < f.R * 40;
        for (const b of h.berthLabels) b.visible = cam.distanceTo(b.getWorldPosition(centre)) < Math.max(160 * shipLength, f.R * 0.5);
        h.glow.color.copy(h.base).multiplyScalar(pulse);
        if (h.root.visible) { h.uTime.value = time; h.update?.(time); }
        // Tiles behind the planet's limb are not drawn (the frustum takes care of the rest).
        if (h.root.visible) {
          camDir.copy(cam).sub(centre).divideScalar(d); // toward the camera, world axes
          const horizon = d > f.R ? Math.acos(Math.min(1, f.R / d)) : 0;
          for (const t of h.tiles) {
            tileDir.copy(t.dir).applyMatrix3(h.axes);
            const over = t.r > 1 ? Math.acos(Math.min(1, 1 / t.r)) : 0; // a tile standing off the surface sees over the limb
            t.mesh.visible = d <= f.R * 1.0001 || Math.acos(Math.max(-1, Math.min(1, tileDir.dot(camDir)))) < horizon + over + t.spread;
          }
        }
      }
    },
    dispose: () => {
      for (const h of homes) {
        scene.remove(h.root);
        h.root.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
      }
      disposables.forEach((x) => x.dispose());
    },
  };
}
