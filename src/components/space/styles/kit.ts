/**
 * The modelling kit for the nation styles in ART-DIRECTION.md. Every part is baked into its own geometry at the
 * position it sits, so a model is a flat group of meshes tagged with `userData.role`, which ship types' fleet.ts can
 * merge by role. Nose toward −z, up +y.
 */
import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

/** As fleet.ts's roles, plus `panel`, a second hull tone. */
export type StyleRole = 'hull' | 'panel' | 'accent' | 'glow' | 'glass' | 'lit';
export const STYLE_ROLES: StyleRole[] = ['hull', 'panel', 'accent', 'glow', 'glass', 'lit'];
export type StyleMaterials = Record<StyleRole, THREE.Material>;

export type P3 = [number, number, number];
const v = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);

/** A flat-faceted solid: the convex hull of the points. */
export const hull = (pts: P3[]) => new ConvexGeometry(pts.map(v));

/** The same points with x negated, for the other side of the ship. */
export const mirror = (pts: P3[]): P3[] => pts.map(([x, y, z]) => [-x, y, z]);

/** A thin raised patch on the face (a, b, c): corners given as (s, t) along a→b and a→c, lifted off the face. */
export function facePatch(a: P3, b: P3, c: P3, corners: [number, number][], lift = 0.015) {
  const A = v(a), B = v(b), C = v(c);
  const ab = B.clone().sub(A), ac = C.clone().sub(A);
  const n = ab.clone().cross(ac).normalize();
  // Lift away from the ship's centre line, whichever way the corner order made the normal.
  const mid = A.clone().add(B).add(C).divideScalar(3);
  if (n.dot(new THREE.Vector3(mid.x, mid.y, 0)) < 0 && Math.abs(mid.x) + Math.abs(mid.y) > 1e-6) n.negate();
  const pts: THREE.Vector3[] = [];
  for (const [s, t] of corners) {
    const p = A.clone().addScaledVector(ab, s).addScaledVector(ac, t);
    pts.push(p.clone().addScaledVector(n, lift * 0.3), p.clone().addScaledVector(n, lift));
  }
  return new ConvexGeometry(pts);
}

/** A thin bar along a → b, `w` across and `h` tall: for seams, stripes and trenches on an edge. */
export function sliver(a: P3, b: P3, w = 0.03, h = 0.03) {
  const pts: THREE.Vector3[] = [];
  for (const p of [a, b]) for (const dx of [-w / 2, w / 2]) for (const dy of [-h / 2, h / 2]) pts.push(v([p[0] + dx, p[1] + dy, p[2]]));
  return new ConvexGeometry(pts);
}

/** Collects a model's parts. Each `add` bakes the transform into the geometry. */
export class Kit {
  readonly group = new THREE.Group();
  private mats: StyleMaterials;
  constructor(mats: StyleMaterials) { this.mats = mats; }

  add(role: StyleRole, geo: THREE.BufferGeometry, pos?: P3, rot?: P3) {
    const m = new THREE.Matrix4().compose(
      pos ? v(pos) : new THREE.Vector3(),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot ?? [0, 0, 0]))),
      new THREE.Vector3(1, 1, 1),
    );
    geo.applyMatrix4(m);
    const mesh = new THREE.Mesh(geo, this.mats[role]);
    mesh.userData.role = role;
    this.group.add(mesh);
    return mesh;
  }

  /** Apply `m` to every part added since `from` (a count of children). */
  transformSince(from: number, m: THREE.Matrix4) {
    for (const c of this.group.children.slice(from)) (c as THREE.Mesh).geometry.applyMatrix4(m);
  }
}

/** A seeded random in [0, 1), so the details on a ship are the same every time it is built. */
export function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export interface Palette { hull: number; panel: number; accent: string; glow: THREE.Color; glass: number; lit: THREE.Color; metal: number; rough: number }

export function paletteMaterials(p: Palette): StyleMaterials {
  const accent = new THREE.Color(p.accent);
  return {
    hull: new THREE.MeshStandardMaterial({ color: p.hull, metalness: p.metal, roughness: p.rough, envMapIntensity: 0.5 }),
    panel: new THREE.MeshStandardMaterial({ color: p.panel, metalness: p.metal, roughness: p.rough + 0.1, envMapIntensity: 0.4 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, emissive: accent.clone().multiplyScalar(0.2), metalness: 0.4, roughness: 0.5 }),
    glow: new THREE.MeshBasicMaterial({ color: p.glow }),
    glass: new THREE.MeshPhysicalMaterial({ color: p.glass, metalness: 0, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.2 }),
    lit: new THREE.MeshBasicMaterial({ color: p.lit }),
  };
}
