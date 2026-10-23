/**
 * Mercury (Hemerodromoi): the phalanx of ART-DIRECTION.md. Everything faces the Sun behind a great round shield, so
 * from the front a ship is a circle. Thick, domed, riveted rims; dark bronze and black iron with a gold rim on every
 * shield and one gold chevron; short, wide, white-gold engines.
 */
import * as THREE from 'three';
import { COLOR } from '../../../lib/bodies';
import type { P3, StyleMaterials } from './kit';
import { Kit, facePatch, hull, mirror, paletteMaterials, sliver } from './kit';

export const phalanxMaterials = (accent: string = COLOR.mercury): StyleMaterials => paletteMaterials({
  hull: 0x5a3d22, panel: 0x151210, accent, glow: new THREE.Color(2.2, 1.9, 1.1), glass: 0x1a1408,
  lit: new THREE.Color(2.0, 1.7, 1.1), metal: 0.8, rough: 0.42,
});

/** Flat facets: split the shared vertices so each face shades on its own. */
const flat = (g: THREE.BufferGeometry) => {
  const n = g.toNonIndexed();
  n.computeVertexNormals();
  return n;
};

/**
 * A domed round shield facing −z: a sphere cap of radius `r` and depth `d`, its apex at z = `apex`, closed behind
 * with a black iron plate, ringed with a raised gold rim and a riveted iron band, a boss at the centre and the
 * gold chevron above it.
 */
function shield(k: Kit, r: number, d: number, apex: number, rivets: number) {
  const R = (r * r + d * d) / (2 * d);
  const theta = Math.asin(r / R);
  const dome = new THREE.SphereGeometry(R, 48, 10, 0, Math.PI * 2, 0, theta);
  dome.rotateX(-Math.PI / 2); // apex toward −z
  k.add('hull', dome, [0, 0, apex + R]);
  const base = apex + d;
  k.add('panel', new THREE.CircleGeometry(r, 48), [0, 0, base]);
  k.add('accent', new THREE.TorusGeometry(r, r * 0.035, 8, 64), [0, 0, base - r * 0.01]);
  const surf = (x: number, y: number) => apex + R - Math.sqrt(R * R - x * x - y * y);
  /** A flat shape laid onto the dome, lifted off it. */
  const onDome = (shape: THREE.Shape, lift: number) => {
    const depth = r * 0.012;
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
    const p = g.getAttribute('position');
    // A shift in z only, so the faces keep their winding: the shape's z = 0 face ends up in front.
    for (let i = 0; i < p.count; i++) p.setZ(i, surf(p.getX(i), p.getY(i)) - lift - depth + p.getZ(i));
    g.computeVertexNormals();
    return g;
  };
  // A raised black iron band inside the rim, riveted, and a bronze boss at the centre.
  const band = new THREE.Shape();
  band.absarc(0, 0, r * 0.93, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * 0.8, 0, Math.PI * 2, true);
  band.holes.push(hole);
  k.add('panel', onDome(band, r * 0.006));
  for (let i = 0; i < rivets; i++) {
    const a = (i / rivets) * Math.PI * 2;
    const x = Math.cos(a) * r * 0.865, y = Math.sin(a) * r * 0.865;
    k.add('hull', new THREE.SphereGeometry(r * 0.022, 6, 4), [x, y, surf(x, y) - r * 0.02]);
  }
  k.add('hull', new THREE.SphereGeometry(r * 0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 0.5), [0, 0, apex + r * 0.005]);
  // One broad gold chevron, point down, across the face above the boss (our own mark, not a letter).
  const w = r * 0.6, top = r * 0.62, drop = r * 0.26, t = r * 0.15;
  const chev = new THREE.Shape();
  chev.moveTo(-w, top); chev.lineTo(0, top - drop); chev.lineTo(w, top);
  chev.lineTo(w, top - t); chev.lineTo(0, top - drop - t * 1.2); chev.lineTo(-w, top - t); chev.closePath();
  k.add('accent', onDome(chev, r * 0.03));
}

/**
 * *Hoplon*, the capital ship (sheet mercury-hoplon): a domed heat shield 8 across facing forward, and behind it,
 * hidden by it from the front, a twelve-sided drum on a black iron mount ring, two gold rings, two rings of eight gun
 * blisters (sixteen: the sheet drew one ring, the notes say two), rivet rows, a ring of bridge slit windows on the
 * drum's rear face and two thick, short engine bells with gold rims.
 */
export function buildPhalanxCapital(mats: StyleMaterials = phalanxMaterials()) {
  const k = new Kit(mats);
  const APEX = -4.6, D = 1.2;
  shield(k, 4, D, APEX, 28);

  const z0 = APEX + D, z1 = 3.2;
  k.add('hull', flat(new THREE.CylinderGeometry(2.2, 2.2, z1 - z0, 12)), [0, 0, (z0 + z1) / 2], [Math.PI / 2, 0, 0]);
  k.add('panel', flat(new THREE.CylinderGeometry(1.6, 1.9, 0.5, 12)), [0, 0, z0 + 0.25], [Math.PI / 2, 0, 0]); // the shield's mount
  for (const z of [-0.4, 2.2]) k.add('accent', new THREE.TorusGeometry(2.22, 0.06, 6, 12), [0, 0, z], [0, 0, Math.PI / 12]);
  k.add('panel', flat(new THREE.CylinderGeometry(1.85, 2.2, 0.4, 12)), [0, 0, z1 + 0.2], [Math.PI / 2, 0, 0]);
  // The bridge: a ring of slit windows round the drum's rear face, inside a raised rim.
  k.add('hull', new THREE.TorusGeometry(1.7, 0.05, 6, 12), [0, 0, z1 + 0.41], [0, 0, Math.PI / 12]);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    k.add('lit', new THREE.BoxGeometry(0.22, 0.08, 0.02), [Math.cos(a) * 1.5, Math.sin(a) * 1.5, z1 + 0.41], [0, 0, a + Math.PI / 2]);
  }
  // Gun blisters round the rim, two rings of eight, each with a short barrel raking forward.
  for (const z of [0.6, 2.7]) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const c: P3 = [Math.cos(a) * 2.2, Math.sin(a) * 2.2, z];
      k.add('panel', flat(new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2)).rotateZ(a - Math.PI / 2), c); // bulging outward
      const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), -1.2).normalize();
      const g = new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6).translate(0, 0.4, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
      k.add('hull', g, [c[0] * 1.08, c[1] * 1.08, z]);
    }
  }
  // Rivet rows round the drum.
  for (const z of [-1.4, 1.2]) for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    k.add('panel', new THREE.BoxGeometry(0.06, 0.06, 0.06), [Math.cos(a) * 2.2, Math.sin(a) * 2.2, z]);
  }
  // Two thick, short engine bells, white-gold.
  for (const x of [-0.85, 0.85]) {
    k.add('hull', flat(new THREE.CylinderGeometry(0.55, 0.72, 0.9, 12)), [x, 0, z1 + 0.85], [Math.PI / 2, 0, 0]);
    k.add('accent', new THREE.TorusGeometry(0.72, 0.05, 6, 12), [x, 0, z1 + 1.3]);
    k.add('glow', new THREE.CircleGeometry(0.64, 16), [x, 0, z1 + 1.28]);
  }
  return k.group;
}

/**
 * *Aspis*, the fighter (sheet mercury-aspis): a small domed round shield 2 across with its gold rim, riveted band and
 * chevron, a gun barrel through the middle with a gold collar, a faceted body with a cockpit window on top, two
 * upright fins and a single engine behind. Flown in tight rows, a squadron is a wall of discs from the front.
 */
export function buildPhalanxFighter(mats: StyleMaterials = phalanxMaterials()) {
  const k = new Kit(mats);
  const APEX = -0.5, D = 0.14;
  shield(k, 0.52, D, APEX, 12);
  k.add('panel', new THREE.CylinderGeometry(0.03, 0.036, 0.62, 8), [0, 0, -0.78], [Math.PI / 2, 0, 0]); // the gun barrel
  k.add('panel', new THREE.CylinderGeometry(0.045, 0.045, 0.08, 8), [0, 0, -1.08], [Math.PI / 2, 0, 0]); // the muzzle ring
  k.add('accent', new THREE.CylinderGeometry(0.06, 0.06, 0.07, 8), [0, 0, -0.53], [Math.PI / 2, 0, 0]);
  k.add('glow', new THREE.CircleGeometry(0.02, 8), [0, 0, -1.121], [0, Math.PI, 0]);
  // The faceted body behind the shield, narrowing to the engine.
  const body: P3[] = [[0.16, 0.14, -0.34], [0.2, 0.0, -0.34], [0.16, -0.14, -0.34], [0.2, 0.12, 0.3], [0.24, 0.0, 0.3], [0.18, -0.14, 0.3], [0.12, 0.1, 0.7], [0.14, 0.0, 0.7], [0.1, -0.1, 0.7]];
  k.add('hull', flat(hull([...body, ...mirror(body), [0, 0.2, -0.3], [0, 0.18, 0.4], [0, -0.17, 0.3]])));
  k.add('panel', flat(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 10)), [0, 0, 0.77], [Math.PI / 2, 0, 0]);
  k.add('accent', new THREE.TorusGeometry(0.12, 0.015, 6, 16), [0, 0, 0.85]);
  k.add('glow', new THREE.CircleGeometry(0.1, 12), [0, 0, 0.856]);
  // The cockpit: a small faceted canopy on top of the body.
  k.add('hull', hull([[0.08, 0.17, -0.2], [-0.08, 0.17, -0.2], [0.1, 0.17, 0.15], [-0.1, 0.17, 0.15], [0.05, 0.27, -0.1], [-0.05, 0.27, -0.1], [0.06, 0.27, 0.1], [-0.06, 0.27, 0.1]]));
  k.add('glass', new THREE.BoxGeometry(0.09, 0.06, 0.01), [0, 0.225, -0.155], [-0.75, 0, 0]);
  // Two small upright fins on the flanks, to keep it in its row.
  for (const s of [-1, 1]) k.add('panel', hull([[0.2, -0.02, 0.2], [0.2, -0.02, 0.62], [0.21, 0.36, 0.5], [0.21, 0.36, 0.62], [0.2, -0.3, 0.55], [0.2, -0.3, 0.62],
    [0.22, -0.02, 0.2], [0.22, -0.02, 0.62], [0.23, 0.36, 0.5], [0.23, 0.36, 0.62], [0.22, -0.3, 0.55], [0.22, -0.3, 0.62]].map(([x, y, z]) => [s * x, y, z] as P3)));
  return k.group;
}

/**
 * *Embolon*, the cruiser (sheet mercury-embolon): a blunt bronze wedge flown point-first, a round domed shield plate
 * at the point with its gold rim, riveted band and chevron pointing down (the sheet's flat views disagree; the notes
 * say a round disc facing forward), black iron flanks, gold strips on the top edges and spine, a slit bridge behind
 * the shield, two short guns under the rim and two short, wide white-gold engines.
 */
export function buildPhalanxCruiser(mats: StyleMaterials = phalanxMaterials()) {
  const k = new Kit(mats);
  shield(k, 0.68, 0.16, -0.95, 12);
  // The wedge: its point tucked behind the shield, widening and dropping to a low, broad stern.
  const front: P3[] = [[0.12, 0.2, -0.8], [0.12, -0.18, -0.8]];
  const back: P3[] = [[0.6, 0.12, 0.8], [0.6, -0.16, 0.8]];
  k.add('hull', hull([...front, ...mirror(front), ...back, ...mirror(back), [0, 0.3, 0.8], [0, -0.24, 0.8], [0, 0.28, -0.8], [0, -0.22, -0.8]]));
  for (const s of [-1, 1]) {
    const fT: P3 = [s * 0.12, 0.2, -0.8], fB: P3 = [s * 0.12, -0.18, -0.8], bT: P3 = [s * 0.6, 0.12, 0.8];
    k.add('panel', facePatch(fT, bT, fB, [[0.1, 0.15], [0.95, 0.12], [0.95, 0.85], [0.1, 0.8]], 0.01)); // black flank
    k.add('accent', sliver(fT, bT, 0.022, 0.022)); // gold edges
    k.add('accent', sliver([s * 0.04, 0.285, -0.8], [s * 0.04, 0.305, 0.8], 0.018, 0.018));
    // Two short, wide engines.
    k.add('panel', new THREE.BoxGeometry(0.34, 0.2, 0.2), [s * 0.25, -0.01, 0.9]);
    k.add('glow', new THREE.PlaneGeometry(0.27, 0.12), [s * 0.25, -0.01, 1.002]);
    // A short gun barrel under the shield's rim on each side, pointing forward.
    k.add('panel', new THREE.CylinderGeometry(0.022, 0.026, 0.4, 6), [s * 0.22, -0.5, -0.88], [Math.PI / 2, 0, 0]);
  }
  // The bridge: a slit window on the spine just behind the shield.
  k.add('panel', hull([[0.07, 0.27, -0.68], [-0.07, 0.27, -0.68], [0.07, 0.28, -0.35], [-0.07, 0.28, -0.35], [0.05, 0.34, -0.64], [-0.05, 0.34, -0.64], [0.05, 0.35, -0.38], [-0.05, 0.35, -0.38]]));
  k.add('lit', new THREE.BoxGeometry(0.07, 0.012, 0.18), [0, 0.352, -0.5]);
  return k.group;
}
