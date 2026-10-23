/**
 * The destroyer, one model per nation, built to the accepted model sheets (art-refit/refs/ships/<nation>-<name>.webp,
 * notes and "build N" rulings in art-refit/03-SHIPS.md): each nation's silhouette, hull language and colours, at the
 * destroyer's own proportions: longer and leaner than the cruiser, three turrets, a short engine bank built for speed,
 * and no hangar deck (lib/hangars.ts: two slots).
 *
 * Built about ten units long, nose toward −z, every mesh tagged with a role and merged by material (fleet.ts's
 * mergeByMaterial), so a destroyer costs a handful of draw calls. The caller fits it to its world length.
 */
import * as THREE from 'three';
import type { NationId } from '../../lib/nations';
import type { P3 } from './styles/kit';
import { hull as convex, mirror, sliver } from './styles/kit';

export type DRole = 'hull' | 'panel' | 'accent' | 'glow' | 'glass' | 'lit';
const ROLES: DRole[] = ['hull', 'panel', 'accent', 'glow', 'glass', 'lit'];

/** Each nation's colours, from the art direction's table: hull base, second tone, accent, engine glow. */
export const DESTROYER_LOOK: Record<NationId, { hull: string; panel: string; accent: string; glow: string; metal: number; rough: number }> = {
  earth: { hull: '#c9a14a', panel: '#3a3f48', accent: '#3f7fd0', glow: '#9fd0ff', metal: 0.8, rough: 0.4 },
  moon: { hull: '#e6e3da', panel: '#b8c0cc', accent: '#2f5fc4', glow: '#dfe8ff', metal: 0.5, rough: 0.3 },
  mercury: { hull: '#5a3d22', panel: '#151210', accent: '#e3c52c', glow: '#fff1b8', metal: 0.85, rough: 0.45 },
  venus: { hull: '#c9a227', panel: '#0f4a33', accent: '#1d8f5c', glow: '#5cffb0', metal: 0.9, rough: 0.3 },
  mars: { hull: '#8a8f96', panel: '#5d6269', accent: '#cc2131', glow: '#bfefff', metal: 0.7, rough: 0.55 },
  jupiter: { hull: '#24133a', panel: '#4a2a78', accent: '#7442ad', glow: '#ff3df0', metal: 0.5, rough: 0.42 },
  saturn: { hull: '#16161e', panel: '#2a2850', accent: '#33307a', glow: '#ffb347', metal: 0.4, rough: 0.7 },
};

export function destroyerMaterials(n: NationId): Record<DRole, THREE.Material> {
  const l = DESTROYER_LOOK[n];
  const std = (c: string, e = 0) => new THREE.MeshStandardMaterial({ color: c, metalness: l.metal, roughness: l.rough, envMapIntensity: 0.4, emissive: new THREE.Color(c).multiplyScalar(e) });
  return {
    hull: std(l.hull),
    panel: std(l.panel),
    accent: std(l.accent, 0.25),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(l.glow).multiplyScalar(2.4) }),
    // Venus's domes are green glass, as its cruiser's; the rest a dark blue canopy.
    glass: new THREE.MeshPhysicalMaterial({ color: n === 'venus' ? l.accent : 0x0b1e3a, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.2 }),
    lit: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.35, 0.9) }),
  };
}

type Add = (role: DRole, g: THREE.BufferGeometry, x?: number, y?: number, z?: number, rx?: number, ry?: number, rz?: number) => THREE.Mesh;

function kit(group: THREE.Group, mats: Record<DRole, THREE.Material>): Add {
  return (role, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(g, mats[role]);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.userData.role = role;
    group.add(m);
    return m;
  };
}

/** A z-axis cylinder (radius a at −z, b at +z). */
const tube = (a: number, b: number, len: number, seg = 12) => new THREE.CylinderGeometry(a, b, len, seg).rotateX(Math.PI / 2);
/** A turned solid along z from [radius, z] pairs, stern first. */
const lathe = (prof: [number, number][], seg = 24) => new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, -z)), seg).rotateX(-Math.PI / 2);
/** Flat-shaded outline seen from above, extruded `depth` tall, centred on y. Points are (x, z). */
function plate(points: [number, number][], depth: number, y = 0) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z))), { depth, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  g.translate(0, y + depth / 2, 0);
  return g;
}
/** A turret: a low dome and twin barrels pointing forward. */
function turret(add: Add, x: number, y: number, z: number, r = 0.32, role: DRole = 'panel', under = false) {
  const u = under ? -1 : 1;
  add(role, new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), x, y, z, under ? Math.PI : 0);
  for (const s of [-1, 1]) add('hull', tube(0.04, 0.04, r * 2.4, 5), x + s * r * 0.35, y + u * r * 0.35, z - r * 1.2);
}
/** A faceted turret with one long barrel. */
function facetTurret(add: Add, x: number, y: number, z: number, r: number, role: DRole = 'panel', under = false) {
  const u = under ? -1 : 1;
  const b: P3[] = [[r, 0, -r], [r, 0, r], [r * 0.6, u * r * 0.7, -r * 0.5], [r * 0.6, u * r * 0.7, r * 0.8]];
  add(role, convex([...b, ...mirror(b)]), x, y, z);
  add('hull', tube(r * 0.13, r * 0.16, r * 3.4, 6), x, y + u * r * 0.35, z - r * 2.2);
}
const nozzle = (add: Add, x: number, y: number, z: number, r: number) => {
  add('panel', tube(r * 0.8, r, r * 1.2, 12), x, y, z);
  add('glow', new THREE.CircleGeometry(r * 0.85, 12), x, y, z + r * 0.62);
};
/** A thin blade standing on base0 → base1, its point at `tip`. */
const blade = (base0: P3, base1: P3, tip: P3, t = 0.05) =>
  convex([base0, base1].flatMap(([x, y, z]) => [[x - t, y, z], [x + t, y, z]] as P3[]).concat([[tip[0] - t / 3, tip[1], tip[2]], [tip[0] + t / 3, tip[1], tip[2]]]));

/**
 * A claw for side `s`: `n` faceted diamond segments along the quadratic curve p0 → p1 → p2 (right-hand side), thinning
 * to a talon, alternating hull and panel, with a magenta seam on the inner edge.
 */
function claw(add: Add, s: number, p0: P3, p1: P3, p2: P3, n: number, h0: number, w0: number) {
  const at = (t: number): P3 => {
    const u = 1 - t;
    return [0, 1, 2].map((i) => u * u * p0[i] + 2 * u * t * p1[i] + t * t * p2[i]) as P3;
  };
  const ring = (t: number) => {
    const c = at(t), d = at(Math.min(1, t + 0.01)), e = at(Math.max(0, t - 0.01));
    const tx = d[0] - e[0], tz = d[2] - e[2], L = Math.hypot(tx, tz);
    const nx = -tz / L, nz = tx / L, f = 1 - t * 0.85, h = h0 * f, w = w0 * f;
    const x = s * c[0];
    return { pts: [[x, c[1] + h, c[2]], [x, c[1] - h * 0.7, c[2]], [x + s * nx * w, c[1], c[2] + nz * w], [x - s * nx * w, c[1], c[2] - nz * w]] as P3[], inner: [x - s * nx * (w + 0.02), c[1], c[2] - nz * (w + 0.02)] as P3 };
  };
  for (let i = 0; i < n; i++) {
    const a = ring(i / n), b = ring((i + 1) / n);
    add(i % 2 ? 'panel' : 'hull', convex([...a.pts, ...b.pts]));
    add('glow', sliver(a.inner, b.inner, 0.03, 0.05));
  }
}

/** A painted eye on the flank facing ±x. */
function eye(add: Add, s: number, x: number, y: number, z: number, r: number) {
  add('lit', new THREE.CircleGeometry(r, 18).scale(1.5, 1, 1), x + s * 0.004, y, z, 0, (s * Math.PI) / 2);
  add('accent', new THREE.CircleGeometry(r * 0.6, 18), x + s * 0.008, y, z, 0, (s * Math.PI) / 2);
  add('hull', new THREE.CircleGeometry(r * 0.28, 12), x + s * 0.012, y, z, 0, (s * Math.PI) / 2);
}

/**
 * Earth, *Harrier* (sheet earth-harrier): a slim turned brass cigar, three gunmetal bands, a long low dark-blue canopy
 * over the forward hull, swept trapezoid wings from the rear half with blue tip lights, two twin-barrel turrets on top
 * and one under the belly, a short gunmetal engine block with two bells side by side, and a shallow V of tail fins.
 */
function earth(add: Add) {
  add('hull', lathe([[0, 4.3], [0.45, 4.25], [0.6, 3.6], [0.66, 1.0], [0.66, -2.6], [0.58, -3.9], [0.4, -4.6], [0.16, -4.95], [0, -5.0]], 28));
  for (const z of [-1.7, 0.0, 1.6]) add('panel', tube(0.69, 0.69, 0.22, 28), 0, 0, z);
  // The long canopy, framed.
  add('glass', new THREE.SphereGeometry(0.4, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.8, 0.55, 4.0), 0, 0.5, -2.6);
  add('panel', new THREE.TorusGeometry(0.4, 0.03, 6, 28).rotateX(Math.PI / 2).scale(0.8, 1, 4.0), 0, 0.5, -2.6);
  for (const s of [-1, 1]) {
    add('hull', plate([[s * 0.55, 1.2], [s * 2.2, 2.4], [s * 2.2, 2.95], [s * 0.55, 3.0]], 0.07, -0.08));
    add('glow', new THREE.SphereGeometry(0.06, 8, 6), s * 2.22, -0.045, 2.7);
    add('panel', new THREE.BoxGeometry(0.04, 0.55, 0.6).translate(0, 0.27, 0), s * 0.2, 0.42, 3.9, 0, 0, -s * 0.4); // V fin
  }
  turret(add, 0, 0.64, 0.75, 0.3); turret(add, 0, 0.64, 2.2, 0.3); turret(add, 0, -0.64, 1.0, 0.28, 'panel', true);
  add('panel', tube(0.5, 0.55, 0.6, 20), 0, 0, 4.45);
  for (const x of [-0.24, 0.24]) nozzle(add, x, 0, 4.85, 0.22);
}

/**
 * Moon, *Theoris* (sheet moon-theoris): a warship first. A thin white needle keel, eight-sided and pointed at both
 * ends (the sheet drew a wide spindle; the notes say a needle) with a blue inlay line down each flank; riding on it a
 * short open colonnade of two rows of six columns under a low silver roof with three vaults between and bridge slits
 * along the roof's front edge; eight mirror petals round the laser at the bow; three mirror-dish turrets (roof, under
 * the bow, under the stern: three, as asked, though the top view drew five) and a silver ring engine.
 */
function moon(add: Add) {
  const sec = (z: number, r: number): P3[] => Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return [Math.cos(a) * r, Math.sin(a) * r * 0.8, z] as P3;
  });
  add('hull', convex([[0, 0, -4.2], ...sec(-2.6, 0.32), ...sec(1.6, 0.42), ...sec(3.3, 0.3), [0, 0, 4.3]]));
  for (const s of [-1, 1]) add('accent', sliver([s * 0.4, -0.02, -2.0], [s * 0.42, -0.02, 2.6], 0.02, 0.04));
  // The colonnade: a stylobate, twelve columns, three vaults, a low flat silver roof with bridge slits at its front.
  add('panel', new THREE.BoxGeometry(0.9, 0.06, 3.0), 0, 0.36, 0.1);
  for (let i = 0; i < 6; i++) for (const x of [-0.36, 0.36]) add('hull', new THREE.CylinderGeometry(0.045, 0.05, 0.9, 10), x, 0.84, -1.15 + i * 0.5);
  for (let i = 0; i < 3; i++) add('panel', new THREE.BoxGeometry(0.34, 0.4, 0.36), 0, 0.6, -0.7 + i * 0.85);
  add('hull', new THREE.BoxGeometry(0.98, 0.08, 3.0), 0, 1.33, 0.1);
  add('panel', new THREE.BoxGeometry(0.9, 0.08, 2.9), 0, 1.41, 0.1);
  for (let i = 0; i < 5; i++) add('lit', new THREE.BoxGeometry(0.1, 0.04, 0.01), -0.3 + i * 0.15, 1.33, -1.405);
  // The lamp at the bow: eight curved mirror petals round the glowing laser.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const at = (r: number, t: number, z: number): P3 => [Math.cos(a) * r - Math.sin(a) * t, Math.sin(a) * r + Math.cos(a) * t, z];
    for (const [r0, z0, r1, z1, w0, w1] of [[0.16, -3.55, 0.46, -3.85, 0.08, 0.18], [0.46, -3.85, 0.6, -4.4, 0.18, 0.14]]) {
      const pts: P3[] = [];
      for (const d of [0, 0.04]) pts.push(at(r0 + d, -w0, z0), at(r0 + d, w0, z0), at(r1 + d, -w1, z1), at(r1 + d, w1, z1));
      add('panel', convex(pts));
    }
  }
  add('glow', new THREE.SphereGeometry(0.24, 14, 10), 0, 0, -4.1);
  // Three mirror-dish turrets with pale-blue cores: on the roof, under the bow, under the stern.
  for (const [y, z, u] of [[1.45, -0.5, 1], [-0.3, -2.0, -1], [-0.36, 2.4, -1]] as const) {
    add('panel', new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, y, z, u < 0 ? Math.PI : 0);
    add('glow', new THREE.SphereGeometry(0.07, 8, 6), 0, y + u * 0.14, z - 0.12);
    add('hull', tube(0.03, 0.03, 0.4, 6), 0, y + u * 0.1, z - 0.32);
  }
  // The stern ring engine and its halo.
  add('panel', new THREE.TorusGeometry(0.5, 0.12, 10, 28), 0, 0, 4.15);
  add('panel', tube(0.6, 0.6, 0.35, 28), 0, 0, 4.05);
  add('glow', new THREE.RingGeometry(0.22, 0.44, 28), 0, 0, 4.24);
}

/**
 * Mercury, *Dory* (sheet mercury-dory): a domed OVAL heat shield, taller than wide, with its gold rim, riveted iron
 * band, boss and chevron pointing down; the spear-gun through the boss far out ahead with a gold collar and a leaf
 * tip; behind it a long lean bronze hull with black iron flanks and gold top strips, two shoulder turrets and one
 * under the belly, a slit bridge on the spine, and two short wide white-gold engines.
 */
function mercury(add: Add) {
  const SR = 1.6, SX = 0.72; // shield half-height, and its width as a share of that
  const dome = new THREE.SphereGeometry(SR * 1.6, 28, 8, 0, Math.PI * 2, 0, 0.66).rotateX(-Math.PI / 2).scale(SX, 1, 0.55);
  add('hull', dome, 0, 0, -1.0 + SR * 1.6 * 0.55);
  add('accent', new THREE.TorusGeometry(SR * 1.6 * Math.sin(0.66), 0.08, 6, 40).scale(SX, 1, 1), 0, 0, -0.62);
  add('panel', new THREE.TorusGeometry(SR * 1.6 * Math.sin(0.66) * 0.9, 0.07, 4, 40).scale(SX, 1, 1), 0, 0, -0.7);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, R = SR * 1.6 * Math.sin(0.66) * 0.9;
    add('hull', new THREE.SphereGeometry(0.04, 6, 4), Math.cos(a) * R * SX, Math.sin(a) * R, -0.76);
  }
  add('hull', new THREE.SphereGeometry(0.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 0.5), 0, 0, -1.0);
  // The chevron, point down, above the boss.
  const chev = new THREE.Shape();
  chev.moveTo(-0.55, 0.95); chev.lineTo(0, 0.55); chev.lineTo(0.55, 0.95); chev.lineTo(0.55, 0.75); chev.lineTo(0, 0.33); chev.lineTo(-0.55, 0.75); chev.closePath();
  add('accent', new THREE.ExtrudeGeometry(chev, { depth: 0.05, bevelEnabled: false }), 0, 0, -0.98);
  // The spear: a long barrel through the boss, a gold collar, a leaf-shaped iron tip.
  add('panel', tube(0.06, 0.08, 3.4, 8), 0, 0, -2.6);
  add('accent', tube(0.13, 0.13, 0.16, 10), 0, 0, -1.05);
  add('panel', new THREE.OctahedronGeometry(1, 0).scale(0.16, 0.04, 0.45), 0, 0, -4.65);
  // The hull: long and lean behind the shield, black iron flanks, gold strips along its top edges.
  const h: P3[] = [[0.42, 0.42, -0.6], [0.55, 0.0, -0.6], [0.42, -0.4, -0.6], [0.42, 0.4, 4.2], [0.55, 0.0, 4.2], [0.42, -0.38, 4.2]];
  add('hull', convex([...h, ...mirror(h), [0, 0.5, -0.6], [0, 0.48, 4.2]]));
  for (const s of [-1, 1]) {
    add('panel', convex([[s * 0.5, 0.18, -0.3], [s * 0.56, 0.0, -0.3], [s * 0.5, 0.16, 4.0], [s * 0.56, 0.0, 4.0], [s * 0.5, -0.2, -0.3], [s * 0.5, -0.2, 4.0]]));
    add('accent', sliver([s * 0.42, 0.43, -0.55], [s * 0.42, 0.43, 4.15], 0.05, 0.03));
  }
  // The bridge: a slit window on the spine just behind the shield.
  add('hull', convex([[0.2, 0.48, -0.4], [-0.2, 0.48, -0.4], [0.2, 0.48, 0.6], [-0.2, 0.48, 0.6], [0.14, 0.62, -0.3], [-0.14, 0.62, -0.3], [0.14, 0.62, 0.55], [-0.14, 0.62, 0.55]]));
  add('lit', new THREE.BoxGeometry(0.22, 0.04, 0.02), 0, 0.57, -0.36);
  // Two shoulder turrets and one under the belly.
  turret(add, 0.32, 0.46, 0.9, 0.26, 'hull'); turret(add, -0.32, 0.46, 0.9, 0.26, 'hull'); turret(add, 0, -0.42, 2.0, 0.26, 'hull', true);
  // Two short wide engines.
  add('panel', new THREE.BoxGeometry(1.1, 0.5, 0.35), 0, 0, 4.35);
  for (const x of [-0.27, 0.27]) add('glow', new THREE.PlaneGeometry(0.42, 0.32), x, 0, 4.53);
}

/**
 * Venus, *Chelandion* (sheet venus-chelandion): a long slim gilded teardrop with two green enamel bands in filigree,
 * two green-glass domes ringed in gold (the forward one larger), a twin turret between them and one low on each
 * flank, four tall gilded fins in an X of which only the upper two carry icon panels, and two soft green engines.
 */
function venus(add: Add) {
  const prof: [number, number][] = [[0, 4.6], [0.3, 4.4], [0.6, 3.2], [0.82, 1.0], [0.88, -1.0], [0.8, -2.8], [0.55, -4.0], [0.25, -4.7], [0, -4.9]];
  add('hull', lathe(prof, 24).scale(1, 0.85, 1));
  for (const [z, r] of [[-2.1, 0.8], [0.0, 0.875]] as const) {
    add('panel', tube(r + 0.015, r + 0.015, 0.5, 24).scale(1, 0.85, 1), 0, 0, z);
    for (const dz of [-0.26, 0.26]) add('hull', new THREE.TorusGeometry(r + 0.02, 0.025, 6, 24).scale(1, 0.85, 1), 0, 0, z + dz);
  }
  for (const [z, r] of [[-1.0, 0.64], [1.4, 0.44]] as const) {
    add('glass', new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.68, z);
    add('hull', new THREE.TorusGeometry(r + 0.02, 0.05, 6, 24).rotateX(Math.PI / 2), 0, 0.7, z);
  }
  // Four tall gilded fins in an X; icon panels on the upper two only.
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const fin = add('hull', plate([[0.2, 3.3], [1.45, 3.65], [1.45, 4.5], [0.2, 4.4]], 0.05), 0, 0, 0);
    fin.rotation.z = a;
    if (Math.sin(a) > 0) {
      const icon = add('accent', new THREE.BoxGeometry(0.75, 0.08, 0.62), Math.cos(a) * 0.95, Math.sin(a) * 0.95, 4.0);
      icon.rotation.z = a;
    }
  }
  turret(add, 0, 0.66, 0.2, 0.24, 'hull'); turret(add, 0.82, -0.1, 0.4, 0.22, 'hull'); turret(add, -0.82, -0.1, 0.4, 0.22, 'hull');
  add('hull', new THREE.BoxGeometry(0.75, 0.42, 0.4), 0, 0, 4.55);
  for (const x of [-0.2, 0.2]) nozzle(add, x, 0, 4.85, 0.17);
}

/**
 * Mars, *Liburna* (sheet mars-liburna): a narrow dagger about four times as long as wide, two stepped decks with
 * window rows, a three-bladed galley ram beak under the prow, eight raked oar radiators down each flank, two twin
 * turrets on the spine ahead of the decks and one under the belly, a short tower with a bridge bar and red plates, a
 * red stripe down each side of the prow (not the centre), and seven nozzles, three large over four small (seven: the
 * rear view drew six).
 */
function mars(add: Add) {
  const wedge: [number, number][] = [[0, -5], [0.85, 1.2], [1.2, 4.4], [-1.2, 4.4], [-0.85, 1.2]];
  add('hull', plate(wedge, 0.45, 0.12));
  add('panel', plate(wedge.map(([x, z]) => [x * 0.7, z * 0.95 + 0.2]), 0.4, -0.3)); // keel
  add('panel', plate([[0, 0.4], [0.5, 1.6], [0.62, 4.0], [-0.62, 4.0], [-0.5, 1.6]], 0.22, 0.45));
  add('hull', plate([[0, 1.9], [0.38, 2.6], [0.42, 3.9], [-0.42, 3.9], [-0.38, 2.6]], 0.2, 0.66));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) add('lit', new THREE.BoxGeometry(0.02, 0.04, 0.1), s * (0.5 + i * 0.013), 0.56, 1.0 + i * 0.32);
    const w = (z: number) => (0.85 * (z + 5)) / 6.2; // the hull's half-width at z
    add('accent', sliver([s * 0.6 * w(-4.4), 0.36, -4.4], [s * 0.6 * w(-0.8), 0.36, -0.8], 0.05, 0.03)); // a red stripe each side of the prow
    add('panel', new THREE.BoxGeometry(0.06, 0.08, 3.2), s * 0.98, 0.12, 2.6); // trench
    // Eight oar radiators raked back below the edge.
    for (let i = 0; i < 8; i++) {
      const z = 0.3 + i * 0.48;
      const oar = new THREE.BoxGeometry(0.9, 0.025, 0.09).translate(s * 0.45, 0, 0).rotateY(-s * 0.55).rotateZ(-s * 0.18);
      add('panel', oar, s * (0.85 + (z - 1.2) * 0.11), -0.12, z);
    }
  }
  // The ram beak under the prow, three blades jutting past the nose.
  const beak: P3[] = [[0.18, -0.08, -3.6], [0, -0.42, -3.4], [0, -0.16, -6.0], [0.08, -0.2, -5.7]];
  add('panel', convex([...beak, ...mirror(beak)]));
  for (const y of [-0.12, -0.22, -0.32]) add('panel', new THREE.BoxGeometry(0.46 - Math.abs(y + 0.22) * 1.8, 0.03, 0.2), 0, y, -5.4);
  add('hull', new THREE.BoxGeometry(0.3, 0.55, 0.5), 0, 1.02, 3.6); // tower neck
  add('panel', new THREE.BoxGeometry(1.1, 0.16, 0.34), 0, 1.36, 3.6); // bridge bar
  add('lit', new THREE.BoxGeometry(1.12, 0.04, 0.05), 0, 1.38, 3.42);
  for (const s of [-1, 1]) add('accent', new THREE.BoxGeometry(0.012, 0.18, 0.22), s * 0.156, 1.0, 3.6);
  turret(add, 0, 0.36, -1.9, 0.24); turret(add, 0, 0.5, -0.4, 0.24); turret(add, 0, -0.3, 1.2, 0.24, 'panel', true);
  add('panel', new THREE.BoxGeometry(2.0, 0.7, 0.4), 0, 0.05, 4.6);
  for (const x of [-0.55, 0, 0.55]) add('glow', new THREE.PlaneGeometry(0.4, 0.28), x, 0.2, 4.81);
  for (const x of [-0.72, -0.24, 0.24, 0.72]) add('glow', new THREE.PlaneGeometry(0.3, 0.18), x, -0.14, 4.81);
}

/**
 * Jupiter, *Hemiolia* (sheet jupiter-hemiolia): a long faceted diamond spine with a needle prow, two short claws of
 * four segments at the bow with magenta inner seams, three raked crest blades (the middle tallest) with the crown
 * sigil and lit bridge slits at the middle one's foot, three faceted turrets with long single barrels (one on the spine
 * ahead of the crests, one low on each flank: three, though the top view drew four), magenta flank seams and three
 * hexagonal nozzles in a triangle.
 */
function jupiter(add: Add) {
  add('hull', new THREE.OctahedronGeometry(1, 0).scale(0.6, 0.55, 4.8), 0, 0, 0);
  add('panel', convex([[0.35, 0.22, -2.6], [-0.35, 0.22, -2.6], [0.5, 0.15, 0.5], [-0.5, 0.15, 0.5], [0, 0.42, -1.0], [0, 0.0, -4.0]]));
  for (const s of [-1, 1]) {
    // A claw of four faceted segments curling forward beside the prow, magenta on its inner edge.
    claw(add, s, [0.35, -0.1, -1.6], [1.35, -0.15, -3.2], [0.3, -0.25, -4.6], 4, 0.26, 0.2);
    add('glow', new THREE.BoxGeometry(0.03, 0.03, 4.6), s * 0.4, -0.05, 0.6, 0, s * 0.06, 0); // flank seam
  }
  // Three raked crest blades, the middle one tallest.
  add('panel', blade([0, 0.45, -0.9], [0, 0.42, 0.1], [0, 1.15, 0.5]));
  add('panel', blade([0, 0.42, 0.4], [0, 0.36, 1.6], [0, 1.55, 2.2]));
  add('panel', blade([0, 0.36, 1.9], [0, 0.28, 2.9], [0, 0.95, 3.4]));
  for (const s of [-1, 1]) add('accent', new THREE.BoxGeometry(0.02, 0.2, 0.2), s * 0.04, 0.9, 1.45, Math.PI / 4, 0, 0); // the crown sigil
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) add('glow', new THREE.BoxGeometry(0.02, 0.04, 0.1), s * 0.17, 0.44, 0.55 + i * 0.2);
  facetTurret(add, 0, 0.42, -1.6, 0.22); facetTurret(add, 0.5, 0.0, 0.4, 0.2); facetTurret(add, -0.5, 0.0, 0.4, 0.2);
  for (const [x, y] of [[0, 0.2], [-0.24, -0.08], [0.24, -0.08]] as const) {
    add('panel', tube(0.16, 0.19, 0.4, 6), x, y, 4.6);
    add('glow', new THREE.CircleGeometry(0.15, 6), x, y, 4.81);
  }
}

/**
 * Saturn, *Pentekontor* (sheet saturn-pentekontor): a long thin matte black spine, an indigo keel strip and ram beak,
 * a painted eye each side of the bow, three indigo fuel tanks in black bands on the spine (three: the side view drew
 * two), two banks of ten amber engines down each flank (ten: the sheet drew about fourteen) each with a matte black
 * oar fin (upper bank fanned up, lower down), three black turrets with long single barrels (spine, under the bow,
 * under the stern), a low stern cabin with amber windows, a thin amber drive and amber running lights.
 */
function saturn(add: Add) {
  add('hull', new THREE.BoxGeometry(0.46, 0.5, 9.0), 0, 0, 0);
  add('panel', new THREE.BoxGeometry(0.24, 0.08, 8.4), 0, -0.27, 0.2); // keel strip
  const ram: P3[] = [[0.23, 0.15, -4.5], [0.23, -0.25, -4.5], [0.06, -0.12, -5.6], [0.05, -0.24, -5.5]];
  add('panel', convex([...ram, ...mirror(ram)]));
  for (const s of [-1, 1]) eye(add, s, s * 0.23, 0.06, -3.9, 0.13);
  for (const z of [-1.6, -0.6, 0.4]) {
    add('panel', new THREE.CapsuleGeometry(0.27, 0.5, 4, 12).rotateX(Math.PI / 2), 0, 0.5, z);
    add('hull', new THREE.TorusGeometry(0.275, 0.03, 6, 16), 0, 0.5, z);
  }
  for (const s of [-1, 1]) for (const [y, tilt] of [[0.1, 0.24], [-0.1, -0.24]] as const) for (let i = 0; i < 10; i++) {
    const z = -2.6 + i * 0.6;
    add('glow', new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10).rotateZ(Math.PI / 2), s * 0.25, y, z);
    const oar = new THREE.BoxGeometry(1.5, 0.025, 0.08).translate(s * 0.75, 0, 0).rotateZ(s * tilt).rotateY(-s * 0.4);
    add('hull', oar, s * 0.27, y, z);
  }
  facetTurret(add, 0, 0.25, -2.6, 0.18, 'hull'); facetTurret(add, 0, -0.28, -3.6, 0.16, 'hull', true); facetTurret(add, 0, -0.28, 3.6, 0.16, 'hull', true);
  add('hull', new THREE.BoxGeometry(0.42, 0.24, 0.8), 0, 0.37, 3.9);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) add('glow', new THREE.BoxGeometry(0.01, 0.05, 0.1), s * 0.215, 0.4, 3.65 + i * 0.22);
  add('glow', new THREE.BoxGeometry(0.24, 0.05, 0.01), 0, 0.4, 3.495);
  nozzle(add, 0, 0, 4.7, 0.2);
  for (const [x, y, z] of [[0, 0.27, -4.4], [0.24, 0.2, 4.45], [-0.24, 0.2, 4.45]] as const) add('glow', new THREE.SphereGeometry(0.05, 8, 6), x, y, z);
}

const BUILD: Record<NationId, (add: Add) => void> = { earth, moon, mercury, venus, mars, jupiter, saturn };

/** One nation's destroyer, about ten units long, nose −z, meshes tagged by role (not yet merged). */
export function buildDestroyer(n: NationId, mats: Record<DRole, THREE.Material> = destroyerMaterials(n)) {
  const g = new THREE.Group();
  BUILD[n](kit(g, mats));
  g.userData.nation = n;
  return g;
}

export const DESTROYER_ROLES = ROLES;
