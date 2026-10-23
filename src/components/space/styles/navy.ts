/**
 * Earth (Humans): the "Metropolis" navy of ART-DIRECTION.md. Today's navies and space agencies grown up: smooth turned
 * hulls, brushed brass and gunmetal, blue bands and nav lights, round engine bells with blue plumes. The player's brass
 * courier is the root of the line.
 *
 * Built to the accepted model sheets (art-refit/refs/ships/earth-*.webp, notes in art-refit/03-SHIPS.md), with the
 * counts the notes rule on where the sheet's views disagree.
 */
import * as THREE from 'three';
import { NATIONS } from '../../../lib/nations';
import type { P3, StyleMaterials } from './kit';
import { Kit, hull, mirror, paletteMaterials } from './kit';

const EARTH = NATIONS.find((n) => n.id === 'earth')!.color;

export const navyMaterials = (accent: string = EARTH): StyleMaterials => paletteMaterials({
  hull: 0xc9a14a, panel: 0x3a3f48, accent, glow: new THREE.Color(0.9, 1.3, 2.4), glass: 0x0c1830,
  lit: new THREE.Color(1.6, 1.6, 1.55), metal: 0.75, rough: 0.35,
});

/** A turned solid along z: `profile` is [radius, z] pairs from the stern to the nose. */
export function lathe(profile: [number, number][], segments = 32) {
  // LatheGeometry turns about +y; laying it down maps +y to −z, so pass −z as the height.
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, -z)), segments);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** A short cylinder along z: a raised band round a turned hull, or a nacelle. */
export const zTube = (r0: number, r1: number, len: number, seg = 32) => new THREE.CylinderGeometry(r1, r0, len, seg).rotateX(Math.PI / 2);

/** A thin swept wing: root chord at x0 from zLead to zTrail, tip at x1 swept back by `sweep`, `t` thick. */
const wing = (x0: number, x1: number, zLead: number, zTrail: number, tipChord: number, sweep: number, y: number, t: number): P3[] => [
  [x0, y + t, zLead], [x0, y - t, zLead], [x0, y + t, zTrail], [x0, y - t, zTrail],
  [x1, y + t / 2, zLead + sweep], [x1, y - t / 2, zLead + sweep], [x1, y + t / 2, zLead + sweep + tipChord], [x1, y - t / 2, zLead + sweep + tipChord],
];
const side = (s: number, p: P3[]) => hull(p.map(([x, y, z]) => [s * x, y, z] as P3));

/** A round engine bell opening toward +z, with its plume face. */
function bell(k: Kit, x: number, y: number, z: number, r: number) {
  k.add('panel', lathe([[r, z + 0.5], [r * 0.82, z + 0.25], [r * 0.6, z]], 20), [x, y, 0]);
  k.add('glow', new THREE.CircleGeometry(r * 0.78, 20), [x, y, z + 0.42]);
}

/** A low domed turret with twin barrels run out forward (−z), sitting on y. */
export function navyTurret(k: Kit, x: number, y: number, z: number, r: number) {
  k.add('hull', new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), [x, y, z]);
  k.add('panel', new THREE.CylinderGeometry(r * 1.05, r * 1.05, r * 0.18, 16), [x, y + r * 0.06, z]);
  for (const s of [-1, 1]) k.add('panel', zTube(r * 0.11, r * 0.11, r * 1.6, 6), [x + s * r * 0.3, y + r * 0.42, z - r * 1.3]);
}

/**
 * *Metropolis*, the capital ship (sheet earth-metropolis): a long turned brass cylinder 10 long, three raised bands
 * (gunmetal, blue, gunmetal), two rows of portholes down each flank, and on top a flat gunmetal carrier deck on three
 * supports with a blue centre line, white bars and a lit hangar mouth at its front end. A brass island to starboard
 * toward the stern with a window band and a mast with a blue light. Two swept wings a side, the front pair larger
 * (the sheet drew one pair; the notes say build both), four twin-barrel turrets on the deck edges (the sheet drew
 * about six; build four) and four engine bells in a square in a gunmetal thrust frame.
 */
export function buildNavyCapital(mats: StyleMaterials = navyMaterials()) {
  const k = new Kit(mats);
  const R = 0.82;
  k.add('hull', lathe([[0.0, 4.3], [0.6, 4.3], [0.76, 4.05], [R, 3.6], [R, -3.2], [0.79, -3.8], [0.7, -4.3], [0.52, -4.7], [0.28, -4.95], [0.0, -5.05]], 40));
  // Three raised bands: gunmetal fore and aft, blue amidships.
  for (const [z, role] of [[-2.5, 'panel'], [0.4, 'accent'], [3.0, 'panel']] as const) {
    k.add(role, zTube(R + 0.05, R + 0.05, 0.36, 40), [0, 0, z]);
    k.add('panel', zTube(R + 0.065, R + 0.065, 0.05, 40), [0, 0, z - 0.2]);
    k.add('panel', zTube(R + 0.065, R + 0.065, 0.05, 40), [0, 0, z + 0.2]);
  }
  // Two rows of lit portholes down each flank, between the bands.
  for (let i = 0; i < 26; i++) {
    const z = -2.1 + i * 0.19;
    if (Math.abs(z - 0.4) < 0.28 || Math.abs(z - 3.0) < 0.28) continue;
    for (const a of [1.32, 1.6]) for (const s of [-1, 1]) k.add('lit', new THREE.BoxGeometry(0.03, 0.04, 0.05), [s * Math.sin(a) * (R + 0.005), Math.cos(a) * R, z]);
  }
  // The carrier deck on three supports, wider than the hull.
  const DY = 1.08, DZ0 = -3.7, DZ1 = 3.9;
  k.add('panel', new THREE.BoxGeometry(1.7, 0.14, DZ1 - DZ0), [0, DY, (DZ0 + DZ1) / 2]);
  for (const z of [-2.5, 0.4, 3.0]) k.add('panel', new THREE.BoxGeometry(0.42, 0.3, 0.5), [0, 0.86, z]);
  // The hangar mouth: a hood under the front of the deck, open forward and lit inside.
  k.add('panel', new THREE.BoxGeometry(0.12, 0.42, 1.1), [0.72, DY - 0.26, DZ0 + 0.55]);
  k.add('panel', new THREE.BoxGeometry(0.12, 0.42, 1.1), [-0.72, DY - 0.26, DZ0 + 0.55]);
  k.add('panel', new THREE.BoxGeometry(1.56, 0.08, 1.1), [0, DY - 0.45, DZ0 + 0.55]);
  k.add('lit', new THREE.PlaneGeometry(1.3, 0.3).rotateY(Math.PI), [0, DY - 0.26, DZ0 + 1.0]);
  // Blue centre line and the white bars near the front.
  k.add('accent', new THREE.BoxGeometry(0.05, 0.012, DZ1 - DZ0 - 1.4), [0, DY + 0.075, 0.6]);
  for (let i = 0; i < 6; i++) k.add('lit', new THREE.BoxGeometry(0.5, 0.012, 0.05), [0, DY + 0.075, DZ0 + 0.3 + i * 0.11]);
  // Rivet bosses down the deck edges.
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) k.add('hull', new THREE.SphereGeometry(0.06, 8, 5), [s * 0.86, DY, DZ0 + 0.6 + i * 1.3]);
  // Four twin-barrel turrets, two along each edge of the deck.
  for (const z of [-1.7, 1.3]) for (const s of [-1, 1]) navyTurret(k, s * 0.62, DY + 0.07, z, 0.2);
  // The island, to starboard toward the stern: brass block, gunmetal band, window band, mast with a blue light.
  k.add('hull', new THREE.BoxGeometry(0.5, 0.5, 0.95), [0.5, DY + 0.32, 2.5]);
  k.add('hull', new THREE.BoxGeometry(0.42, 0.18, 0.7), [0.5, DY + 0.66, 2.55]);
  k.add('glass', new THREE.BoxGeometry(0.52, 0.07, 0.97), [0.5, DY + 0.48, 2.5]);
  k.add('panel', new THREE.CylinderGeometry(0.018, 0.018, 0.55, 6), [0.5, DY + 1.02, 2.6]);
  k.add('glow', new THREE.SphereGeometry(0.035, 8, 6), [0.5, DY + 1.31, 2.6]);

  // Two swept radiator wings a side, the front pair larger, blue lights on the front tips.
  for (const s of [-1, 1]) {
    k.add('hull', side(s, wing(0.75, 3.0, 0.2, 1.6, 0.45, 1.25, -0.05, 0.04)));
    k.add('hull', side(s, wing(0.75, 2.0, 2.9, 3.8, 0.35, 0.75, -0.1, 0.035)));
    k.add('glow', new THREE.SphereGeometry(0.06, 8, 6), [s * 3.02, -0.05, 1.68]);
  }

  // The thrust frame at the stern: a gunmetal square holding four bells two by two.
  k.add('panel', new THREE.BoxGeometry(1.3, 1.3, 0.35), [0, 0, 4.45]);
  for (const x of [-0.33, 0.33]) for (const y of [-0.33, 0.33]) bell(k, x, y, 4.55, 0.26);
  return k.group;
}

/**
 * *Sparrow*, the fighter (sheet earth-sparrow): a small turned brass body rounded at the nose with one blue band, a
 * clear bubble canopy, swept wings from mid-body with gunmetal root fairings, two gunmetal tailplanes, one upright
 * fin, one bell, blue wingtip lights and a gun barrel under each wing root.
 */
export function buildNavyFighter(mats: StyleMaterials = navyMaterials()) {
  const k = new Kit(mats);
  k.add('hull', lathe([[0.0, 0.92], [0.12, 0.9], [0.17, 0.62], [0.19, 0.1], [0.19, -0.35], [0.16, -0.7], [0.1, -0.92], [0.0, -1.02]], 24));
  k.add('accent', zTube(0.196, 0.196, 0.07, 24), [0, 0, -0.45]);
  k.add('glass', new THREE.SphereGeometry(0.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.9, 0.95, 1.45), [0, 0.14, -0.15]);
  k.add('panel', new THREE.TorusGeometry(0.12, 0.012, 6, 24).rotateX(Math.PI / 2).scale(0.9, 1, 1.45), [0, 0.14, -0.15]);
  for (const s of [-1, 1]) {
    k.add('hull', side(s, wing(0.15, 0.9, -0.05, 0.5, 0.2, 0.42, -0.04, 0.026)));
    k.add('panel', side(s, [[0.13, 0.0, -0.12], [0.13, -0.06, -0.12], [0.2, 0.0, 0.4], [0.2, -0.08, 0.45], [0.36, -0.03, 0.1], [0.36, -0.05, 0.12]]));
    k.add('panel', side(s, wing(0.1, 0.42, 0.62, 0.86, 0.13, 0.22, 0.02, 0.014))); // tailplane
    k.add('glow', new THREE.SphereGeometry(0.026, 6, 4), [s * 0.91, -0.04, 0.44]);
    k.add('panel', zTube(0.022, 0.022, 0.3, 6), [s * 0.24, -0.1, -0.12]); // gun under the wing root
  }
  const fin: P3[] = [[0.016, 0.12, 0.45], [0.016, 0.12, 0.88], [0.01, 0.44, 0.9], [0.01, 0.44, 0.76]];
  k.add('panel', hull([...fin, ...mirror(fin)])); // the tail fin
  k.add('panel', lathe([[0.14, 1.06], [0.12, 0.96], [0.09, 0.88]], 16));
  k.add('glow', new THREE.CircleGeometry(0.11, 16), [0, 0, 1.04]);
  return k.group;
}

/**
 * *Pathfinder*, the cruiser (sheet earth-pathfinder): the player's brass courier. A turned brass cigar flattened top
 * to bottom with one gunmetal band, a long dark-blue canopy over the forward hull, flat trapezoid wings from
 * mid-hull, a gunmetal nacelle under each wing root (the views disagree; the notes say under the roots) with a brass
 * ring in front and a blue bell behind, a shallow V of two tail fins (not one), blue wingtip lights, a white light on
 * the tail and a gun in each wing root.
 */
export function buildNavyCruiser(mats: StyleMaterials = navyMaterials()) {
  const k = new Kit(mats);
  const FLAT = 0.74;
  k.add('hull', lathe([[0, 0.95], [0.14, 0.93], [0.22, 0.78], [0.27, 0.4], [0.29, 0], [0.28, -0.35], [0.22, -0.68], [0.12, -0.9], [0, -1.02]], 32).scale(1, FLAT, 1));
  k.add('panel', zTube(0.296, 0.296, 0.2, 32).scale(1, FLAT, 1), [0, 0, 0.12]);
  // The long canopy, framed in gunmetal.
  k.add('glass', new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.95, 0.85, 2.6), [0, 0.13, -0.3]);
  k.add('panel', new THREE.TorusGeometry(0.16, 0.014, 6, 32).rotateX(Math.PI / 2).scale(0.95, 1, 2.6), [0, 0.13, -0.3]);
  for (const s of [-1, 1]) {
    // A flat trapezoid wing from mid-hull.
    k.add('hull', side(s, [[0.2, 0.025, -0.05], [0.2, -0.025, -0.05], [0.2, 0.025, 0.55], [0.2, -0.025, 0.55],
      [1.27, 0.012, 0.3], [1.27, -0.012, 0.3], [1.27, 0.012, 0.64], [1.27, -0.012, 0.64]]));
    k.add('glow', new THREE.SphereGeometry(0.025, 8, 6), [s * 1.275, 0, 0.48]);
    // The nacelle under the wing root: gunmetal, a brass ring in front, a flared bell glowing behind.
    const x = s * 0.42, y = -0.09;
    k.add('panel', zTube(0.1, 0.1, 0.76, 20), [x, y, 0.5]);
    k.add('hull', zTube(0.112, 0.112, 0.06, 20), [x, y, 0.15]);
    k.add('panel', lathe([[0.135, 1.04], [0.11, 0.94], [0.1, 0.87]], 20), [x, y, 0]);
    k.add('glow', new THREE.CircleGeometry(0.11, 20), [x, y, 1.025]);
    // The gun in the wing root.
    k.add('panel', zTube(0.018, 0.018, 0.34, 6), [s * 0.27, -0.03, -0.2]);
    // The V tail fins.
    k.add('panel', new THREE.BoxGeometry(0.02, 0.26, 0.24).translate(0, 0.13, 0).rotateZ(-s * 0.42), [s * 0.06, 0.12, 0.8]);
  }
  k.add('lit', new THREE.SphereGeometry(0.02, 8, 6), [0, 0.24, 0.86]);
  return k.group;
}
