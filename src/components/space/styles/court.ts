/**
 * Venus (Nephelai): the cloud court of ART-DIRECTION.md. Ships that float and impress: domes inside domes, gold leaf
 * on everything, green glass and enamel, nothing with a hard edge. Soft green engines.
 */
import * as THREE from 'three';
import { COLOR } from '../../../lib/bodies';
import type { P3, StyleMaterials } from './kit';
import { Kit, hull, paletteMaterials, sliver } from './kit';
import { lathe } from './navy';

/**
 * The court's materials. `hueShift` (degrees, ±15 at most) turns the green glass and enamel: each pilot's family
 * paints its own fighter.
 */
export const courtMaterials = (accent: string = COLOR.venus, hueShift = 0): StyleMaterials => {
  const turn = (c: string | number) => {
    const col = new THREE.Color(c);
    const hsl = { h: 0, s: 0, l: 0 };
    col.getHSL(hsl);
    return col.setHSL((hsl.h + Math.max(-15, Math.min(15, hueShift)) / 360 + 1) % 1, hsl.s, hsl.l);
  };
  return paletteMaterials({
    hull: 0xc9a227, panel: turn(0x0f4a33).getHex(), accent: `#${turn(accent).getHexString()}`, glow: new THREE.Color(0.8, 2.0, 1.1),
    glass: turn(accent).getHex(), lit: new THREE.Color(1.9, 1.6, 0.9), metal: 0.9, rough: 0.28,
  });
};

/** A ring round the y axis with radii `rx` across and `rz` along: an ellipse, its tube kept round. */
const ellipseRing = (rx: number, rz: number, tube: number) => {
  const pts = Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, tube, 8, true);
};

/** An onion dome standing on +y at `at`: a drum, a bulb drawn to a point, a finial, a filigree band. */
function onion(k: Kit, at: P3, s: number) {
  const [x, y, z] = at;
  k.add('panel', new THREE.CylinderGeometry(0.22 * s, 0.24 * s, 0.3 * s, 20), [x, y + 0.15 * s, z]);
  const bulb = new THREE.LatheGeometry([[0.0, 0], [0.24, 0], [0.34, 0.14], [0.36, 0.28], [0.28, 0.46], [0.12, 0.62], [0.03, 0.78], [0, 0.82]]
    .map(([r, h]) => new THREE.Vector2(r * s, h * s)), 24);
  k.add('hull', bulb, [x, y + 0.3 * s, z]);
  k.add('hull', new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.3 * s, 6), [x, y + 1.22 * s, z]);
  k.add('accent', new THREE.SphereGeometry(0.04 * s, 8, 6), [x, y + 1.3 * s, z]);
  k.add('panel', new THREE.TorusGeometry(0.335 * s, 0.018 * s, 6, 28), [x, y + 0.42 * s, z], [Math.PI / 2, 0, 0]);
}

/**
 * *Palatine*, the capital ship (sheet venus-palatine): a floating palace. A wide gilded teardrop about 10 long under a
 * great green-glass dome with eight gold ribs and filigree, four onion domes round it (four: the side view drew six),
 * a gold lifting ring round the waist on four arms set with eight knots (the sheet drew four), two broad enamel bands
 * with gold gun ports, warm windows, a chapel spire at the stern and three soft green engines, one over two.
 */
export function buildCourtCapital(mats: StyleMaterials = courtMaterials()) {
  const k = new Kit(mats);
  const body = lathe([[0, 5.0], [0.35, 4.3], [0.8, 3.1], [1.45, 1.0], [1.85, -1.0], [1.95, -2.5], [1.72, -3.8], [1.15, -4.6], [0.55, -5.0], [0, -5.15]], 40);
  body.scale(1.25, 0.62, 1);
  k.add('hull', body);
  // Enamel bands round the hull, edged in gold.
  // Two broad green enamel bands, edged in gold, with small gold gun ports open in them.
  for (const [z, r] of [[-3.9, 1.72], [0.2, 1.88]] as [number, number][]) {
    k.add('panel', new THREE.CylinderGeometry(r, r, 0.32, 48, 1, true).rotateX(Math.PI / 2).scale(1.25, 0.62, 1), [0, 0, z]);
    for (const dz of [-0.17, 0.17]) k.add('hull', new THREE.TorusGeometry(r, 0.025, 6, 48).scale(1.25, 0.62, 1), [0, 0, z + dz]);
    for (const s of [-1, 1]) for (const a of [-0.35, 0.35]) {
      const x = s * Math.cos(a) * r * 1.25, y = Math.sin(a) * r * 0.62;
      k.add('accent', new THREE.BoxGeometry(0.1, 0.1, 0.14), [x, y, z]);
      k.add('hull', new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6).rotateX(Math.PI / 2), [x * 1.02, y, z - 0.15]);
    }
  }
  // Warm windows along the waist.
  for (let i = 0; i < 16; i++) {
    const z = -3.4 + i * 0.3;
    const prof = [[5.0, 0], [4.3, 0.35], [3.1, 0.8], [1.0, 1.45], [-1.0, 1.85], [-2.5, 1.95], [-3.8, 1.72]];
    let r = 0;
    for (let j = 0; j < prof.length - 1; j++) {
      const [za, ra] = prof[j], [zb, rb] = prof[j + 1];
      if (z <= za && z >= zb) r = ra + ((rb - ra) * (za - z)) / (za - zb);
    }
    for (const s of [-1, 1]) k.add('lit', new THREE.BoxGeometry(0.03, 0.08, 0.12), [s * (r * 1.25 + 0.005), 0, z]);
  }

  // The great dome: green glass on a gold drum, with filigree bands, a gold lantern and a finial.
  const DZ = -2.0, DY = 1.1, DR = 1.35;
  k.add('hull', new THREE.CylinderGeometry(DR + 0.08, DR + 0.18, 0.35, 40), [0, DY + 0.05, DZ]);
  k.add('glass', new THREE.SphereGeometry(DR, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), [0, DY + 0.2, DZ]);
  for (const r of [1.0, 0.92, 0.6]) {
    k.add('hull', new THREE.TorusGeometry(DR * r + 0.01, 0.03, 6, 48), [0, DY + 0.2 + DR * Math.sqrt(1 - r * r), DZ], [Math.PI / 2, 0, 0]);
  }
  for (let i = 0; i < 4; i++) { // eight gold ribs over the glass: four half-hoops, each two ribs
    const a = (i / 4) * Math.PI;
    const rib = new THREE.TorusGeometry(DR + 0.01, 0.022, 4, 32, Math.PI);
    k.add('hull', rib, [0, DY + 0.2, DZ], [0, a, 0]);
  }
  k.add('hull', new THREE.CylinderGeometry(0.14, 0.18, 0.25, 16), [0, DY + 0.2 + DR + 0.1, DZ]);
  k.add('hull', new THREE.ConeGeometry(0.06, 0.4, 10), [0, DY + 0.2 + DR + 0.42, DZ]);
  k.add('accent', new THREE.SphereGeometry(0.06, 10, 8), [0, DY + 0.2 + DR + 0.66, DZ]);
  // The arched door in the drum, lit from the throne hall inside.
  k.add('lit', new THREE.BoxGeometry(0.3, 0.26, 0.02), [0, DY + 0.08, DZ - DR - 0.17]);

  // Four onion domes round it.
  for (const [x, z] of [[1.45, -3.55], [-1.45, -3.55], [1.3, -0.4], [-1.3, -0.4]]) onion(k, [x, 0.72, z], 0.75);

  // The lifting envelope: a gold ring round the waist, an enamel inner band, four arms to the hull.
  const EZ = -1.6;
  k.add('hull', ellipseRing(3.1, 3.6, 0.11), [0, 0.1, EZ]);
  k.add('panel', ellipseRing(3.1, 3.6, 0.045), [0, 0.22, EZ]);
  for (let i = 0; i < 8; i++) { // gilded knots on the ring
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    k.add('accent', new THREE.SphereGeometry(0.13, 12, 8), [Math.cos(a) * 3.1, 0.1, EZ + Math.sin(a) * 3.6]);
  }
  for (const [a, b] of [[[2.2, 0.05, EZ], [3.05, 0.1, EZ]], [[-2.2, 0.05, EZ], [-3.05, 0.1, EZ]],
    [[0, 0.0, EZ - 3.0], [0, 0.1, EZ - 3.55]], [[0, 0.1, EZ + 3.0], [0, 0.1, EZ + 3.55]]] as [P3, P3][]) k.add('hull', sliver(a, b, 0.09, 0.09));

  // The chapel spire at the stern.
  k.add('panel', new THREE.CylinderGeometry(0.18, 0.22, 0.4, 16), [0, 0.62, 2.7]);
  k.add('hull', new THREE.ConeGeometry(0.16, 1.5, 12), [0, 1.55, 2.7]);
  k.add('hull', new THREE.TorusGeometry(0.19, 0.02, 6, 20), [0, 0.86, 2.7], [Math.PI / 2, 0, 0]);
  k.add('accent', new THREE.SphereGeometry(0.05, 8, 6), [0, 2.33, 2.7]);

  // Three soft green engines in gold cups at the tail.
  for (const [x, y] of [[0, 0.06], [0.32, -0.06], [-0.32, -0.06]]) {
    k.add('hull', lathe([[0.19, 4.75], [0.16, 4.4], [0.09, 4.1]], 20), [x, y, 0]);
    k.add('glow', new THREE.CircleGeometry(0.16, 20), [x, y, 4.7]);
  }
  return k.group;
}

/**
 * *Jewel*, the fighter: a faceted green gem 1 × 0.6 × 2 held in a gold claw mount, two small curled fins and a gold
 * engine cup. Pass `courtMaterials(accent, hueShift)` to paint a family's own.
 */
export function buildCourtFighter(mats: StyleMaterials = courtMaterials()) {
  const k = new Kit(mats);
  // The gem: an eight-sided cut stone stretched long, flat, pointed at both ends.
  const girdle = (z: number, k0: number) => Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return [Math.cos(a) * 0.54 * k0, Math.sin(a) * 0.325 * k0, z] as P3;
  });
  k.add('glass', hull([[0, 0, -1.05], [0, 0, 0.95], ...girdle(-0.45, 1), ...girdle(0.35, 1)]));
  // The claw: four gold prongs from the stern collar along the gem's edges, curling over its widest point.
  for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const at = (r: number, z: number): P3 => [x * r, y * r * 0.62, z];
    k.add('hull', sliver(at(0.12, 0.92), at(0.5, 0.42), 0.045, 0.045));
    k.add('hull', sliver(at(0.5, 0.42), at(0.53, -0.1), 0.04, 0.04));
    k.add('hull', sliver(at(0.53, -0.1), at(0.42, -0.32), 0.035, 0.035)); // the hooked tip over the girdle
  }
  k.add('hull', new THREE.TorusGeometry(0.11, 0.035, 8, 20), [0, 0, 0.9]);
  // Two small curled fins, gold scrolls on the flanks.
  for (const s of [-1, 1]) {
    const curl = new THREE.TorusGeometry(0.13, 0.025, 6, 20, Math.PI * 1.4);
    curl.rotateY(Math.PI / 2);
    k.add('hull', curl, [s * 0.38, 0.12, 0.42]);
    k.add('accent', new THREE.SphereGeometry(0.035, 8, 6), [s * 0.38, 0.25, 0.42]);
  }
  k.add('hull', lathe([[0.14, 1.12], [0.12, 0.98], [0.07, 0.9]], 16));
  k.add('glow', new THREE.CircleGeometry(0.11, 16), [0, 0, 1.08]);
  // The gun: a small gold emitter at the gem's front point.
  k.add('hull', new THREE.CylinderGeometry(0.035, 0.05, 0.16, 10).rotateX(Math.PI / 2), [0, 0, -1.08]);
  k.add('accent', new THREE.SphereGeometry(0.025, 8, 6), [0, 0, -1.17]);
  return k.group;
}

/**
 * *Dromon*, the cruiser (sheet venus-dromon): a gilded teardrop 2 long with a broad green enamel band near the nose,
 * a small green-glass dome ringed in gold, two short gold guns, an onion cupola, four tall gilded fins in an X, only
 * the upper two painted with icon panels (the sheet put them on three or four), and a soft green engine.
 */
export function buildCourtCruiser(mats: StyleMaterials = courtMaterials()) {
  const k = new Kit(mats);
  k.add('hull', lathe([[0, 1.0], [0.08, 0.85], [0.2, 0.5], [0.33, 0], [0.4, -0.45], [0.36, -0.75], [0.22, -0.95], [0, -1.05]], 32).scale(1, 0.85, 1));
  // A broad green enamel band near the nose, edged in gold.
  k.add('panel', new THREE.CylinderGeometry(0.405, 0.41, 0.16, 32, 1, true).rotateX(Math.PI / 2).scale(1, 0.85, 1), [0, 0, -0.5]);
  for (const z of [-0.58, -0.42]) k.add('hull', new THREE.TorusGeometry(0.41, 0.012, 6, 32).scale(1, 0.85, 1), [0, 0, z]);
  // Two short gold gun barrels beside the dome, pointing forward.
  for (const x of [-0.07, 0.07]) k.add('hull', new THREE.CylinderGeometry(0.02, 0.022, 0.26, 8).rotateX(Math.PI / 2), [x, 0.3, -0.66]);
  k.add('glass', new THREE.SphereGeometry(0.17, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.9, 1.3), [0, 0.3, -0.42]);
  k.add('hull', new THREE.TorusGeometry(0.17, 0.012, 6, 24).scale(1, 1.3, 1), [0, 0.3, -0.42], [Math.PI / 2, 0, 0]);
  onion(k, [0, 0.21, 0.2], 0.28);
  // Four tall gilded fins in an X; the upper pair carry icon panels.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const at = (r: number, z: number, t: number): P3 => [Math.cos(a) * r - Math.sin(a) * t, Math.sin(a) * r + Math.cos(a) * t, z];
    const fin: [number, number][] = [[0.14, 0.6], [0.14, 0.98], [0.95, 0.98], [0.95, 0.62]]; // a tall board
    k.add('hull', hull(fin.flatMap(([r, z]) => [at(r, z, -0.014), at(r, z, 0.014)])));
    if (Math.sin(a) > 0) {
      for (const t of [-0.018, 0.018]) {
        const quad: [number, number][] = [[0.34, 0.65], [0.34, 0.94], [0.9, 0.94], [0.9, 0.65]];
        k.add('accent', hull(quad.flatMap(([r, z]) => [at(r, z, t), at(r, z, t * 1.15)])));
        for (let j = 0; j < 4; j++) {
          const [r0, z0] = quad[j], [r1, z1] = quad[(j + 1) % 4];
          k.add('hull', sliver(at(r0, z0, t * 1.3), at(r1, z1, t * 1.3), 0.018, 0.018));
        }
      }
    }
  }
  k.add('hull', lathe([[0.13, 1.08], [0.11, 0.96], [0.06, 0.9]], 16));
  k.add('glow', new THREE.CircleGeometry(0.1, 16), [0, 0, 1.04]);
  return k.group;
}
