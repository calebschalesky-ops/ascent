/**
 * Jupiter (the Diadochoi): the clawed violet-empire style of ART-DIRECTION.md. Hooks, blades and talons, near-black
 * purple metal and violet plate, lit from within by thin magenta seams; nothing is round. Our own geometry and names,
 * in the spirit of the Galra ships in Voltron: Legendary Defender, not a copy of any.
 */
import * as THREE from 'three';
import { COLOR } from '../../../lib/bodies';
import type { P3, StyleMaterials } from './kit';
import { Kit, facePatch, hull, mirror, paletteMaterials, sliver } from './kit';

export const clawMaterials = (accent: string = COLOR.jupiter): StyleMaterials => paletteMaterials({
  hull: 0x24133a, panel: 0x4a2a78, accent, glow: new THREE.Color(1.5, 0.16, 1.3), glass: 0x16081f,
  lit: new THREE.Color(1.1, 0.55, 2.4), metal: 0.45, rough: 0.42,
});

const bez = (p: P3[], t: number): P3 => {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1, 2].map((i) => p.reduce((s, q, j) => s + q[i] * w[j], 0)) as P3;
};

/** A blade: a thin triangle standing on the line base0 → base1, its point at `tip`. */
const blade = (base0: P3, base1: P3, tip: P3, t = 0.06) =>
  hull([base0, base1].flatMap(([x, y, z]) => [[x - t, y, z], [x + t, y, z]] as P3[]).concat([[tip[0] - t / 3, tip[1], tip[2]], [tip[0] + t / 3, tip[1], tip[2]]]));

/** A four-pointed crown sigil, flat in the y–z plane. */
function sigil(r: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 2;
    const q = i % 2 === 0 ? r : r * 0.32;
    if (i === 0) s.moveTo(q * Math.cos(a), q * Math.sin(a)); else s.lineTo(q * Math.cos(a), q * Math.sin(a));
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  return g;
}

/**
 * A claw: faceted segments along a curve, a diamond in section that thins to a talon, with a magenta seam on its
 * inner edge. `path` is a cubic Bézier for the right-hand side; `s` picks the side. `focus` is the z on the centre
 * line the claw curls round (its inner side faces it); `barb` sizes the barbs.
 */
function claw(k: Kit, path: P3[], s: number, n: number, h0: number, w0: number, droop: number, focus = -1.5, barb = 0.25) {
  const at = (i: number) => {
    const t = i / n;
    const [x, y, z] = bez(path, t);
    const [x2, , z2] = bez(path, Math.min(1, t + 0.01));
    const [x1, , z1] = bez(path, Math.max(0, t - 0.01));
    const tx = x2 - x1, tz = z2 - z1, L = Math.hypot(tx, tz);
    const nx = -tz / L, nz = tx / L; // in the plane, to the left of the curve's direction
    const f = 1 - t * 0.88;
    return { c: [s * x, y - droop * t * t, z] as P3, n: [s * nx, nz] as [number, number], h: h0 * f, w: w0 * f };
  };
  for (let i = 0; i < n; i++) {
    const a = at(i), b = at(i + 1);
    const ring = (q: typeof a): P3[] => [
      [q.c[0], q.c[1] + q.h, q.c[2]], [q.c[0], q.c[1] - q.h * 0.7, q.c[2]],
      [q.c[0] + q.n[0] * q.w, q.c[1], q.c[2] + q.n[1] * q.w], [q.c[0] - q.n[0] * q.w, q.c[1], q.c[2] - q.n[1] * q.w],
    ];
    k.add(i % 2 ? 'panel' : 'hull', hull([...ring(a), ...ring(b)]));
    // The seam on the inner edge: the concave side, facing the hull.
    const inner = (q: typeof a): P3 => {
      const sign = Math.sign(-q.c[0] * q.n[0] + (focus - q.c[2]) * q.n[1]) || 1;
      return [q.c[0] + sign * q.n[0] * (q.w + 0.012), q.c[1], q.c[2] + sign * q.n[1] * (q.w + 0.012)];
    };
    k.add('glow', sliver(inner(a), inner(b), 0.025, 0.035 + a.h * 0.05));
    // Barbs raking back off the outer edge of the middle segments.
    if (i >= 1 && i <= 4) {
      const sign = -(Math.sign(-a.c[0] * a.n[0] + (focus - a.c[2]) * a.n[1]) || 1);
      const out: P3 = [a.c[0] + sign * a.n[0] * a.w, a.c[1], a.c[2] + sign * a.n[1] * a.w];
      const len = 0.9 * a.h + barb;
      const tip: P3 = [out[0] + sign * a.n[0] * len, out[1] + 0.1, out[2] + sign * a.n[1] * len + len * 0.9];
      const t = 0.07 * (barb / 0.25);
      k.add('hull', hull([[out[0], out[1] + t, out[2] - 0.2], [out[0], out[1] - t, out[2] - 0.2], [out[0], out[1] + t, out[2] + 0.25], [out[0], out[1] - t, out[2] + 0.25], tip]));
    }
  }
}

/**
 * *Tessarakonteres*, the royal flagship: a faceted lozenge spine about 10 long with two crescent claws sweeping from
 * its stern flanks forward past the prow (the sheet's flat views leave them out; their shape is the hero and front
 * views'), three raked crest blades and a keel blade, a lit throne-room band, the crown sigil, four heavy cannons down
 * each flank, and five magenta engines in an arrowhead (five: the sheet drew four in a diamond). Sheet
 * jupiter-tessarakonteres.
 */
export function buildClawCapital(mats: StyleMaterials = clawMaterials()) {
  const k = new Kit(mats);
  const side: P3[] = [[0.9, 0, -1], [1.15, 0, 2.4], [0.8, 0, 4.6], [0.55, 0.6, 1.4], [0.55, -0.55, 1.6], [0.4, 0.45, 4.3], [0.35, -0.4, 4.3]];
  const nose: P3 = [0, 0, -5.4];
  const top: P3[] = [[0, 0.95, -0.5], [0, 1.1, 2.4], [0, 0.72, 4.6]];
  const bot: P3[] = [[0, -0.8, 0], [0, -0.9, 3], [0, -0.5, 4.6]];
  k.add('hull', hull([nose, ...side, ...mirror(side), ...top, ...bot]));

  // Violet plate on the upper forward faces, and the throne-room band across them.
  for (const s of [-1, 1]) {
    const shoulder: P3 = [s * 0.9, 0, -1];
    k.add('panel', facePatch(nose, shoulder, top[0], [[0.25, 0.1], [0.85, 0.08], [0.82, 0.55], [0.3, 0.4]], 0.02));
    k.add('glow', facePatch(nose, shoulder, top[0], [[0.72, 0.62], [0.95, 0.66], [0.95, 0.74], [0.72, 0.7]], 0.03));
    // Seams down the flank, on the sharp edge.
    k.add('glow', sliver([s * 0.92, 0, -0.8], [s * 1.16, 0, 2.3], 0.03, 0.04));
    k.add('glow', sliver([s * 1.14, 0, 2.6], [s * 0.82, 0, 4.4], 0.03, 0.04));
  }

  // The claws.
  const path: P3[] = [[0.9, 0, 3.2], [3.3, 0, 1.8], [3.0, 0, -4.6], [0.5, 0, -6.7]];
  for (const s of [-1, 1]) claw(k, path, s, 7, 0.62, 0.5, 0.5);
  // Where each claw meets the hull: a heavy faceted root.
  for (const s of [-1, 1]) {
    const root: P3[] = [[0.6, 0.45, 2.6], [0.6, -0.45, 2.8], [0.7, 0.4, 4.1], [0.7, -0.35, 4.2], [1.6, 0.35, 2.9], [1.6, -0.3, 3.1]];
    k.add('panel', hull(root.map(([x, y, z]) => [s * x, y, z] as P3)));
  }

  // Crest blades along the spine, tallest in the middle, raked back; a keel blade below.
  k.add('hull', blade([0, 0.8, -0.6], [0, 0.95, 0.7], [0, 1.85, 1.5]));
  k.add('panel', blade([0, 0.95, 0.9], [0, 1.0, 2.4], [0, 2.5, 3.4]));
  k.add('hull', blade([0, 0.85, 2.7], [0, 0.7, 3.9], [0, 1.65, 4.6]));
  k.add('hull', blade([0, -0.7, 0.8], [0, -0.75, 3.2], [0, -1.75, 4.1]));
  for (const s of [-1, 1]) k.add('accent', sigil(0.28), [s * 0.075, 1.55, 2.25]);
  k.add('glow', sliver([0, 1.02, 1.0], [0, 2.38, 3.3], 0.13, 0.03)); // a lit edge up the middle blade

  // Four heavy faceted cannons down each flank, below the crest, in turrets on the shoulder.
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const z = 0.0 + i * 0.75;
    const x = s * (0.9 + i * 0.06);
    k.add('panel', hull([[x - 0.16, 0.28, z - 0.2], [x + 0.16, 0.28, z - 0.2], [x - 0.16, 0.28, z + 0.25], [x + 0.16, 0.28, z + 0.25], [x - 0.1, 0.46, z - 0.1], [x + 0.1, 0.46, z - 0.1], [x - 0.1, 0.46, z + 0.2], [x + 0.1, 0.46, z + 0.2]]));
    k.add('hull', new THREE.CylinderGeometry(0.05, 0.06, 0.75, 6).rotateX(Math.PI / 2), [x, 0.38, z - 0.55]);
  }

  // Engines: five hexagonal nozzles in an arrowhead.
  const nozzles: P3[] = [[0, 0.1, 4.95], [0.5, 0.38, 4.7], [-0.5, 0.38, 4.7], [0.5, -0.2, 4.7], [-0.5, -0.2, 4.7]];
  for (const [x, y, z] of nozzles) {
    k.add('panel', new THREE.CylinderGeometry(0.2, 0.24, 0.45, 6), [x, y, z - 0.1], [Math.PI / 2, 0, 0]);
    k.add('glow', new THREE.CircleGeometry(0.18, 6), [x, y, z + 0.13]);
  }
  return k.group;
}

/**
 * *Hetairos*, the companion fighter (sheet jupiter-hetairos): a needle-prowed faceted fuselage with a lit slit
 * cockpit, forward-swept crescent wings that hook down into talons, magenta leading edges, two raked tail spikes, one
 * engine and four guns, two under the prow and one at each wing elbow. About 2.2 long.
 */
export function buildClawFighter(mats: StyleMaterials = clawMaterials()) {
  const k = new Kit(mats);
  const side: P3[] = [[0.12, 0, -0.3], [0.19, 0, 0.5], [0.1, 0, 0.95]];
  k.add('hull', hull([[0, 0, -1.15], ...side, ...mirror(side), [0, 0.17, -0.1], [0, 0.15, 0.75], [0, -0.12, 0], [0, -0.1, 0.85]]));
  k.add('lit', sliver([0, 0.115, -0.5], [0, 0.175, -0.08], 0.07, 0.02)); // the slit cockpit

  for (const s of [-1, 1]) {
    const x = (p: P3[]) => p.map(([a, b, c]) => [s * a, b, c] as P3);
    // The wing: out and back to an elbow, then forward to the tip, a crescent.
    k.add('panel', hull(x([[0.14, 0.035, 0.08], [0.14, -0.035, 0.08], [0.16, 0.035, 0.66], [0.16, -0.035, 0.66],
      [0.72, 0.02, 0.36], [0.72, -0.02, 0.36], [0.74, 0.02, 0.78], [0.74, -0.02, 0.78]])));
    k.add('panel', hull(x([[0.68, 0.02, 0.36], [0.68, -0.02, 0.36], [0.76, 0.02, 0.76], [0.76, -0.02, 0.76],
      [1.02, 0.012, -0.55], [1.02, -0.012, -0.55], [1.1, 0.012, -0.3], [1.1, -0.012, -0.3]])));
    // The talon: the tip hooks down and forward.
    k.add('hull', hull(x([[1.0, 0.02, -0.56], [1.1, 0.02, -0.28], [1.0, -0.02, -0.56], [1.1, -0.02, -0.28], [0.84, -0.2, -0.98]])));
    k.add('glow', sliver([s * 0.15, 0.0, 0.06], [s * 0.71, 0.0, 0.34], 0.03, 0.03)); // leading edges
    k.add('glow', sliver([s * 0.67, 0.0, 0.34], [s * 0.995, 0.0, -0.59], 0.03, 0.03));
    k.add('glow', sliver([s * 0.995, -0.02, -0.59], [s * 0.85, -0.18, -0.95], 0.025, 0.025));
    // A raked tail spike.
    k.add('hull', hull(x([[0.05, 0.08, 0.3], [0.11, 0.08, 0.3], [0.05, 0.08, 0.92], [0.11, 0.08, 0.92], [0.34, 0.72, 1.32]])));
  }
  k.add('panel', new THREE.CylinderGeometry(0.08, 0.1, 0.22, 6), [0, 0, 0.95], [Math.PI / 2, 0, 0]);
  k.add('glow', new THREE.CircleGeometry(0.075, 6), [0, 0, 1.065]);
  // Four guns: two under the prow, one at each wing elbow, all forward.
  for (const s of [-1, 1]) {
    k.add('panel', new THREE.CylinderGeometry(0.018, 0.022, 0.42, 6).rotateX(Math.PI / 2), [s * 0.06, -0.1, -0.5]);
    k.add('panel', new THREE.BoxGeometry(0.07, 0.06, 0.16), [s * 0.72, -0.045, 0.45]);
    k.add('panel', new THREE.CylinderGeometry(0.018, 0.022, 0.42, 6).rotateX(Math.PI / 2), [s * 0.72, -0.05, 0.18]);
  }
  return k.group;
}

/**
 * *Sarissa*, the cruiser (sheet jupiter-sarissa): a long faceted spine carrying a spinal gun as long as the hull,
 * running out past the prow, two small claws of five segments at the bow, a raked crest blade with the crown sigil and
 * a row of lit bridge slits along its foot, magenta seams and three engines, one above and two below.
 */
export function buildClawCruiser(mats: StyleMaterials = clawMaterials()) {
  const k = new Kit(mats);
  const side: P3[] = [[0.16, 0, -0.2], [0.21, 0, 0.5], [0.14, 0, 0.92], [0.1, 0.13, 0.2], [0.1, -0.12, 0.3], [0.07, 0.1, 0.9], [0.07, -0.09, 0.9]];
  const top: P3[] = [[0, 0.19, -0.1], [0, 0.22, 0.5], [0, 0.14, 0.92]];
  const bot: P3[] = [[0, -0.17, 0], [0, -0.16, 0.7], [0, -0.1, 0.92]];
  k.add('hull', hull([[0, 0, -0.95], ...side, ...mirror(side), ...top, ...bot]));
  for (const s of [-1, 1]) {
    k.add('glow', sliver([s * 0.165, 0, -0.18], [s * 0.212, 0, 0.48], 0.01, 0.012));
    k.add('glow', sliver([s * 0.208, 0, 0.54], [s * 0.145, 0, 0.88], 0.01, 0.012));
  }
  // The spinal gun along the top, out past the prow, in its housing.
  k.add('panel', hull([[0.05, 0.18, -0.4], [-0.05, 0.18, -0.4], [0.06, 0.21, 0.75], [-0.06, 0.21, 0.75], [0.04, 0.28, 0.7], [-0.04, 0.28, 0.7], [0.03, 0.25, -0.35], [-0.03, 0.25, -0.35]]));
  k.add('hull', new THREE.BoxGeometry(0.035, 0.035, 1.25), [0, 0.235, -0.95]);
  k.add('glow', sliver([0, 0.255, -1.5], [0, 0.255, -0.4], 0.012, 0.006));
  k.add('glow', new THREE.CircleGeometry(0.02, 6), [0, 0.235, -1.576], [0, Math.PI, 0]);
  // Two small claws at the bow.
  const path: P3[] = [[0.12, 0, -0.15], [0.42, 0, -0.35], [0.4, 0, -0.95], [0.12, 0, -1.2]];
  for (const s of [-1, 1]) claw(k, path, s, 5, 0.12, 0.09, 0.06, -0.6, 0.05);
  // A raked crest blade with the crown sigil.
  k.add('hull', blade([0, 0.2, 0.15], [0, 0.21, 0.6], [0, 0.5, 0.85], 0.02));
  for (const s of [-1, 1]) k.add('accent', sigil(0.07), [s * 0.025, 0.32, 0.55]);
  // The bridge: a row of narrow violet-lit slit windows along the foot of the crest.
  k.add('hull', hull([[0.06, 0.2, 0.05], [-0.06, 0.2, 0.05], [0.07, 0.21, 0.62], [-0.07, 0.21, 0.62], [0.045, 0.26, 0.1], [-0.045, 0.26, 0.1], [0.05, 0.27, 0.6], [-0.05, 0.27, 0.6]]));
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) k.add('lit', new THREE.BoxGeometry(0.008, 0.016, 0.05), [s * 0.058, 0.24, 0.16 + i * 0.09]);
  // Engines: three hexagonal nozzles.
  for (const [x, y] of [[0, 0.02], [0.09, -0.04], [-0.09, -0.04]]) {
    k.add('panel', new THREE.CylinderGeometry(0.05, 0.06, 0.12, 6), [x, y, 0.95], [Math.PI / 2, 0, 0]);
    k.add('glow', new THREE.CircleGeometry(0.045, 6), [x, y, 1.012]);
  }
  return k.group;
}
