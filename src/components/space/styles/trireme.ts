/**
 * Saturn (Autochthones): the trireme fleet of ART-DIRECTION.md. Spare, long and quiet, built to last the trip: a
 * thin spine with banks of fins like oars, matte black composite and indigo, a few amber running lights and a painted
 * eye on the bow. In Saturn's dim light you see it by its lights.
 */
import * as THREE from 'three';
import { COLOR } from '../../../lib/bodies';
import type { P3, StyleMaterials } from './kit';
import { Kit, hull, mirror, paletteMaterials } from './kit';
import { lathe } from './navy';

export const triremeMaterials = (accent: string = COLOR.saturn): StyleMaterials => paletteMaterials({
  hull: 0x16161e, panel: 0x2a2850, accent, glow: new THREE.Color(2.0, 1.05, 0.3), glass: 0x0a0a14,
  // `lit` is the pale paint of the eye, not a lamp: it should not bloom.
  lit: new THREE.Color(0.86, 0.82, 0.7), metal: 0.25, rough: 0.72,
});

/** A painted eye on a flank facing ±x (`s`): a pale disc, an indigo iris, a black pupil. */
function eye(k: Kit, s: number, at: P3, r: number) {
  const face = (g: THREE.BufferGeometry) => g.rotateY((s * Math.PI) / 2);
  k.add('lit', face(new THREE.CircleGeometry(r, 20).scale(1.5, 1, 1)), [at[0] + s * 0.004, at[1], at[2]]);
  k.add('accent', face(new THREE.CircleGeometry(r * 0.6, 20)), [at[0] + s * 0.008, at[1], at[2]]);
  k.add('hull', face(new THREE.CircleGeometry(r * 0.28, 16)), [at[0] + s * 0.012, at[1], at[2]]);
}

/**
 * *Trireme*, the capital ship (sheet saturn-trireme): a long thin black spine 10 long with a ram at the bow, a long
 * gun run along it and a painted eye on each side, three banks of eight small amber engines down each flank (the
 * whole flank: the sheet bunched them in the middle third) and a long thin matte black radiator fin off each like an
 * oar (amber only at the engine), indigo panels, a curled stern post with the amber-windowed bridge cabin at its
 * foot, and amber running lights.
 */
export function buildTriremeCapital(mats: StyleMaterials = triremeMaterials()) {
  const k = new Kit(mats);
  const Z0 = -4.6, Z1 = 5.0;
  k.add('hull', new THREE.BoxGeometry(0.6, 0.5, Z1 - Z0), [0, 0, (Z0 + Z1) / 2]);
  // Indigo panels down the deck and a keel strake.
  for (let i = 0; i < 9; i++) k.add('panel', new THREE.BoxGeometry(0.44, 0.03, 0.85), [0, 0.26, Z0 + 0.7 + i * 0.98]);
  k.add('panel', new THREE.BoxGeometry(0.2, 0.06, Z1 - Z0 - 1), [0, -0.27, (Z0 + Z1) / 2]);

  // The ram: a long low beak below the waterline, in indigo, and the eye above it on each side.
  const ram: P3[] = [[0.3, 0.12, Z0], [0.3, -0.25, Z0], [0.12, -0.12, Z0 - 0.9], [0.06, -0.2, Z0 - 0.9]];
  k.add('panel', hull([...ram, ...mirror(ram), [0, -0.16, Z0 - 1.1]]));
  for (const s of [-1, 1]) eye(k, s, [s * 0.3, 0.08, Z0 + 0.45], 0.13);
  // One long gun run out along the ram.
  k.add('panel', new THREE.CylinderGeometry(0.045, 0.055, 1.6, 8).rotateX(Math.PI / 2), [0, 0.0, Z0 - 0.55]);
  k.add('hull', new THREE.BoxGeometry(0.2, 0.16, 0.4), [0, 0.0, Z0 + 0.15]);

  // Three banks of eight down each side: an engine block on the flank, an oar-fin raking back from it.
  const banks = [{ y: 0.16, tilt: 0.22 }, { y: 0.0, tilt: 0.0 }, { y: -0.16, tilt: -0.22 }];
  for (const s of [-1, 1]) {
    banks.forEach((b, row) => {
      for (let i = 0; i < 8; i++) {
        const z = -3.0 + i * 0.92 + row * 0.14;
        k.add('panel', new THREE.BoxGeometry(0.08, 0.1, 0.16), [s * 0.34, b.y, z]);
        k.add('glow', new THREE.PlaneGeometry(0.05, 0.06), [s * 0.34, b.y, z + 0.081]);
        k.add('glow', new THREE.PlaneGeometry(0.1, 0.05).rotateY(s * Math.PI / 2), [s * 0.381, b.y, z]); // seen from the side
        // The fin: 1.3 long, thin and flat, raked back 28° and fanned up or down by bank.
        const fin = new THREE.BoxGeometry(1.3, 0.018, 0.07).translate(s * 0.65, 0, 0).rotateZ(s * b.tilt).rotateY(-s * 0.49);
        k.add('hull', fin, [s * 0.36, b.y, z]);
      }
    });
  }

  // The stern post: a thin blade rising and curling forward, as on an old ship.
  const post = new THREE.TorusGeometry(0.55, 0.035, 6, 20, Math.PI * 1.1);
  post.rotateY(Math.PI / 2);
  k.add('panel', post, [0, 0.8, Z1 - 0.35]);
  k.add('hull', new THREE.BoxGeometry(0.06, 0.6, 0.3), [0, 0.5, Z1 - 0.2]);
  // The bridge: a low cabin at the post's foot with small amber windows.
  k.add('hull', new THREE.BoxGeometry(0.4, 0.2, 0.7), [0, 0.35, Z1 - 1.0]);
  k.add('panel', new THREE.BoxGeometry(0.44, 0.04, 0.74), [0, 0.47, Z1 - 1.0]);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.add('glow', new THREE.BoxGeometry(0.01, 0.045, 0.08), [s * 0.205, 0.38, Z1 - 1.25 + i * 0.22]);
  k.add('glow', new THREE.BoxGeometry(0.22, 0.045, 0.01), [0, 0.38, Z1 - 1.355]);

  // The main drive: a thin amber nozzle at the stern; amber running lights at the bow, stern and down the keel.
  k.add('panel', lathe([[0.16, Z1 + 0.35], [0.12, Z1 + 0.1], [0.1, Z1]], 16));
  k.add('glow', new THREE.CircleGeometry(0.13, 16), [0, 0, Z1 + 0.32]);
  for (const [x, y, z] of [[0, 0.3, Z0 + 0.1], [0, 1.05, Z1 - 0.9], [0.31, -0.2, Z1 - 0.2], [-0.31, -0.2, Z1 - 0.2], [0, -0.3, 0]] as P3[]) {
    k.add('glow', new THREE.SphereGeometry(0.035, 8, 6), [x, y, z]);
  }
  return k.group;
}

/**
 * *Glaux*, the fighter (sheet saturn-glaux): more sailplane than warplane, two small guns in the nose. High-aspect wings spanning 3 against a slim pod and boom 1.9
 * long, a T-tail, a small booster engine under the pod, an eye on the nose and amber wingtip lights.
 */
export function buildTriremeFighter(mats: StyleMaterials = triremeMaterials()) {
  const k = new Kit(mats);
  k.add('hull', lathe([[0.04, 0.25], [0.09, 0.05], [0.11, -0.35], [0.09, -0.7], [0.0, -0.92]], 16));
  k.add('hull', new THREE.CylinderGeometry(0.025, 0.04, 0.8, 8), [0, 0.02, 0.62], [Math.PI / 2, 0, 0]); // the boom
  k.add('glass', new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.9, 2.6), [0, 0.06, -0.42]);
  // The wings: long, thin, tapered, with a little dihedral and indigo tips.
  for (const s of [-1, 1]) {
    const w: P3[] = [[0.08, 0.04, -0.36], [0.08, 0.01, -0.12], [1.5, 0.15, -0.26], [1.5, 0.13, -0.17]];
    const wing = w.flatMap(([x, y, z]) => [[s * x, y + 0.012, z], [s * x, y - 0.012, z]] as P3[]);
    k.add('hull', hull(wing));
    const tip: P3[] = [[1.2, 0.125, -0.28], [1.2, 0.115, -0.165], [1.505, 0.15, -0.262], [1.505, 0.13, -0.168]];
    k.add('panel', hull(tip.flatMap(([x, y, z]) => [[s * x, y + 0.015, z], [s * x, y - 0.015, z]] as P3[])));
    k.add('glow', new THREE.SphereGeometry(0.018, 6, 4), [s * 1.51, 0.14, -0.215]);
    eye(k, s, [s * 0.098, 0.0, -0.6], 0.035);
  }
  // The T-tail.
  const fin: P3[] = [[0.01, 0.03, 0.82], [0.01, 0.03, 1.02], [0.01, 0.34, 1.0], [0.01, 0.34, 0.9]];
  k.add('hull', hull([...fin, ...mirror(fin)]));
  const tp: P3[] = [[0.0, 0.345, 0.88], [0.0, 0.345, 1.02], [0.34, 0.345, 0.93], [0.34, 0.345, 1.0]];
  k.add('panel', hull([...tp, ...mirror(tp)].flatMap(([x, y, z]) => [[x, y + 0.008, z], [x, y - 0.008, z]] as P3[])));
  // Two small guns in the nose.
  for (const s of [-1, 1]) k.add('panel', new THREE.CylinderGeometry(0.012, 0.014, 0.2, 6).rotateX(Math.PI / 2), [s * 0.035, -0.05, -0.9]);
  // The booster under the pod.
  k.add('panel', new THREE.CylinderGeometry(0.035, 0.045, 0.3, 10), [0, -0.1, 0.12], [Math.PI / 2, 0, 0]);
  k.add('glow', new THREE.CircleGeometry(0.035, 10), [0, -0.1, 0.271]);
  return k.group;
}

/**
 * *Paralos*, the cruiser (sheet saturn-paralos): a low, long black hull 2 long with a ram beak and a long gun along
 * it, a painted eye each side of the bow and a dark canopy behind them, three indigo fuel tanks in a row along its
 * spine (three: the hero view drew four), two oar-fins a side with amber root engines, amber running lights and a
 * thin amber drive.
 */
export function buildTriremeCruiser(mats: StyleMaterials = triremeMaterials()) {
  const k = new Kit(mats);
  const fore: P3[] = [[0.2, 0.07, -0.8], [0.2, -0.07, -0.8]];
  const aft: P3[] = [[0.24, 0.07, 0.9], [0.24, -0.07, 0.9]];
  k.add('hull', hull([...fore, ...mirror(fore), ...aft, ...mirror(aft), [0, 0.1, 0], [0, -0.1, 0.4]]));
  const ram: P3[] = [[0.2, 0.03, -0.8], [0.2, -0.09, -0.8], [0.04, -0.06, -1.12], [0.03, -0.11, -1.06]];
  k.add('panel', hull([...ram, ...mirror(ram)]));
  // One long gun run along the ram.
  k.add('hull', new THREE.CylinderGeometry(0.014, 0.018, 0.5, 6).rotateX(Math.PI / 2), [0, 0.04, -1.0]);
  // The bridge: a small dark canopy just behind the eyes.
  k.add('glass', new THREE.SphereGeometry(0.07, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1.8), [0, 0.08, -0.55]);
  for (const s of [-1, 1]) eye(k, s, [s * 0.2, 0.0, -0.66], 0.045);
  // Three fuel tanks in a row along the spine, with black bands.
  for (const z of [-0.45, 0.05, 0.55]) {
    k.add('panel', new THREE.CapsuleGeometry(0.11, 0.26, 4, 14), [0, 0.18, z], [Math.PI / 2, 0, 0]);
    k.add('hull', new THREE.TorusGeometry(0.112, 0.012, 6, 20), [0, 0.18, z]);
  }
  // Two oar-fins a side, raked back.
  for (const s of [-1, 1]) for (const z of [-0.2, 0.35]) {
    const fin = new THREE.BoxGeometry(0.55, 0.012, 0.045).translate(s * 0.275, 0, 0).rotateY(-s * 0.49);
    k.add('hull', fin, [s * 0.22, 0, z]);
    k.add('glow', new THREE.PlaneGeometry(0.035, 0.035), [s * 0.23, -0.03, z + 0.05]);
  }
  k.add('panel', lathe([[0.07, 1.06], [0.06, 0.95], [0.05, 0.9]], 12));
  k.add('glow', new THREE.CircleGeometry(0.06, 12), [0, 0, 1.04]);
  for (const [x, y, z] of [[0, 0.1, -0.75], [0.24, 0.07, 0.88], [-0.24, 0.07, 0.88]] as P3[]) k.add('glow', new THREE.SphereGeometry(0.018, 6, 4), [x, y, z]);
  return k.group;
}
