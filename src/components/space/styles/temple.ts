/**
 * The Moon (Selenitai): the temple fleet of ART-DIRECTION.md. Ships built as offerings: white ceramic and polished
 * silver, thin blue inlay, the light itself as the weapon. The engine is a mirror ring with a pale blue halo.
 *
 * Built to the accepted model sheets (art-refit/refs/ships/moon-*.webp, notes in art-refit/03-SHIPS.md). The capital
 * ship follows the second Thesauros sheet: a warship first, with the treasury sunk into its spine.
 */
import * as THREE from 'three';
import { COLOR } from '../../../lib/bodies';
import type { P3, StyleMaterials } from './kit';
import { Kit, hull, mirror, paletteMaterials, sliver } from './kit';

export const templeMaterials = (accent: string = COLOR.moon): StyleMaterials => paletteMaterials({
  hull: 0xe6e3da, panel: 0xb8c0cc, accent, glow: new THREE.Color(1.3, 1.6, 2.4), glass: 0xdfe8f4,
  lit: new THREE.Color(1.5, 1.6, 1.9), metal: 0.35, rough: 0.3,
});

/** A laurel ring in the x–y plane: small leaf boxes round a circle, leaning alternately. */
function laurel(k: Kit, r: number, [cx, cy, z]: P3, leaves = 28, size = 1) {
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2;
    k.add('accent', new THREE.BoxGeometry(0.035 * size, 0.11 * size, 0.02 * size), [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z], [0, 0, a + (i % 2 ? 0.5 : -0.5)]);
  }
}

/** A mirror-ring engine facing +z: the polished ring, the halo inside it, laurel leaves round its rim. */
function mirrorRing(k: Kit, x: number, y: number, z: number, r: number, leaves = 0) {
  k.add('panel', new THREE.TorusGeometry(r, r * 0.2, 12, 40), [x, y, z]);
  k.add('panel', new THREE.CylinderGeometry(r * 1.05, r * 1.05, r * 0.5, 40, 1, true).rotateX(Math.PI / 2), [x, y, z - r * 0.2]);
  k.add('glow', new THREE.RingGeometry(r * 0.42, r * 0.86, 40), [x, y, z + 0.02]);
  if (leaves) laurel(k, r * 1.22, [x, y, z - r * 0.1], leaves, r * 1.4);
}

/**
 * *Thesauros*, the capital ship (sheet moon-thesauros, v2): a spearhead hull 10 long in white ceramic and silver,
 * wide and deep at the stern and narrowing to a long silver ram, blue inlay down its edges. The treasury is sunk into
 * the spine (the sheet set it on top; the notes say build it lower, inside the hull walls): nine pairs of columns
 * under a silver roof, a pediment with a laurel wreath facing forward and four vaults between the rows. A bridge
 * crest behind the ram with a pale blue window band, six mirror-dish turrets down each flank (six, as the hero and side
 * views), a keel blade, and three mirror-ring engines on pylons, the centre one largest.
 */
export function buildTempleCapital(mats: StyleMaterials = templeMaterials()) {
  const k = new Kit(mats);
  const ZP = -4.2, ZS = 3.7; // the prow (where the ram starts) and the stern
  // The spearhead: a flat-topped lower hull, faceted, deep and wide aft.
  const half: P3[] = [
    [0.0, 0.18, ZP], [0.0, -0.18, ZP],
    [0.55, 0.36, -2.4], [0.5, -0.32, -2.4], [0.25, -0.5, -2.4],
    [1.05, 0.45, 1.0], [0.98, -0.3, 1.0], [0.5, -0.6, 1.0],
    [1.15, 0.45, ZS], [1.1, -0.28, ZS], [0.55, -0.62, ZS],
  ];
  k.add('hull', hull([...half, ...mirror(half)]));
  // Silver plating over the upper flanks, and the blue inlay along the chines.
  for (const s of [-1, 1]) {
    k.add('panel', hull([[s * 0.56, 0.37, -2.3], [s * 0.57, 0.3, -2.3], [s * 1.07, 0.46, 1.0], [s * 1.08, 0.38, 1.0], [s * 1.17, 0.46, ZS], [s * 1.17, 0.38, ZS], [s * 0.3, 0.2, -3.6], [s * 0.31, 0.15, -3.6]]));
    k.add('accent', sliver([s * 0.02, 0.0, ZP], [s * 0.53, 0.0, -2.4], 0.02, 0.025));
    k.add('accent', sliver([s * 0.53, 0.0, -2.4], [s * 1.03, 0.0, 1.0], 0.02, 0.025));
    k.add('accent', sliver([s * 1.03, 0.0, 1.0], [s * 1.13, 0.0, ZS], 0.02, 0.025));
  }
  // The ram: a long mirror-polished silver spike from the prow.
  k.add('panel', hull([[0, 0.14, ZP + 0.3], [0, -0.14, ZP + 0.3], [0.16, 0, ZP + 0.3], [-0.16, 0, ZP + 0.3], [0, 0, ZP - 1.1]]));
  // The bridge crest just behind the ram, with its pale blue window band.
  const crest: P3[] = [[0.18, 0.3, -3.0], [0.32, 0.4, -2.0], [0.3, 0.42, -1.4], [0.14, 0.62, -2.1], [0.12, 0.64, -1.5]];
  k.add('hull', hull([...crest, ...mirror(crest), [0, 0.32, -3.3]]));
  k.add('lit', new THREE.BoxGeometry(0.4, 0.05, 0.5), [0, 0.56, -2.05], [-0.25, 0, 0]);

  // The treasury, sunk into the spine: walls rise round it, the colonnade stands inside them.
  const T0 = -1.2, T1 = 2.1, base = 0.45, colH = 0.62;
  for (const s of [-1, 1]) k.add('hull', hull([[s * 0.66, base, T0 - 0.2], [s * 1.02, base, T0 - 0.2], [s * 0.7, base + 0.18, T0 + 0.1], [s * 0.96, base + 0.12, T0 + 0.1],
    [s * 0.66, base, T1 + 0.4], [s * 1.1, base, T1 + 0.4], [s * 0.7, base + 0.18, T1 + 0.2], [s * 1.0, base + 0.12, T1 + 0.2]]));
  k.add('panel', new THREE.BoxGeometry(1.24, 0.06, T1 - T0 + 0.3), [0, base + 0.03, (T0 + T1) / 2]); // the stylobate
  for (let i = 0; i < 9; i++) {
    const z = T0 + 0.2 + (i * (T1 - T0 - 0.4)) / 8;
    for (const x of [-0.46, 0.46]) {
      k.add('hull', new THREE.CylinderGeometry(0.045, 0.052, colH, 10), [x, base + 0.06 + colH / 2, z]);
      k.add('hull', new THREE.BoxGeometry(0.12, 0.04, 0.12), [x, base + 0.06 + colH - 0.02, z]);
    }
  }
  // Four sealed silver vaults between the rows.
  for (let i = 0; i < 4; i++) k.add('panel', new THREE.BoxGeometry(0.42, 0.44, 0.38), [0, base + 0.28, T0 + 0.55 + i * 0.75]);
  // The roof: an entablature and a silver pitched roof, the pediment facing forward with the laurel wreath on it.
  const top = base + 0.06 + colH;
  k.add('hull', new THREE.BoxGeometry(1.14, 0.08, T1 - T0), [0, top + 0.04, (T0 + T1) / 2]);
  k.add('panel', hull([[0.6, top + 0.08, T0], [-0.6, top + 0.08, T0], [0, top + 0.32, T0], [0.6, top + 0.08, T1], [-0.6, top + 0.08, T1], [0, top + 0.32, T1]]));
  k.add('hull', hull([[0.6, top + 0.08, T0 - 0.04], [-0.6, top + 0.08, T0 - 0.04], [0, top + 0.34, T0 - 0.04], [0.6, top + 0.08, T0 + 0.02], [-0.6, top + 0.08, T0 + 0.02], [0, top + 0.34, T0 + 0.02]]));
  laurel(k, 0.07, [0, top + 0.17, T0 - 0.06], 14, 0.45);

  // The battery: six mirror-dish turrets down each flank, aimed forward, each with a pale blue core.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const z = -1.6 + i * 0.85;
      const w = 0.55 + ((z + 2.4) / (ZS + 2.4)) * 0.55; // the flank's half-width there
      const x = s * (w + 0.1), y = 0.1;
      k.add('panel', new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(s * Math.PI / 2), [x, y, z]); // open outward
      k.add('panel', new THREE.TorusGeometry(0.2, 0.03, 8, 20).rotateY(Math.PI / 2), [x, y, z]);
      k.add('glow', new THREE.SphereGeometry(0.07, 10, 8), [x + s * 0.03, y, z]);
      k.add('panel', new THREE.CylinderGeometry(0.025, 0.03, 0.4, 6).rotateX(Math.PI / 2), [x + s * 0.12, y, z - 0.22]);
    }
  }
  // The keel blade.
  k.add('panel', hull([[0.02, -0.5, -2.0], [-0.02, -0.5, -2.0], [0.02, -0.6, 3.2], [-0.02, -0.6, 3.2], [0.02, -1.0, 2.2], [-0.02, -1.0, 2.2], [0.02, -0.85, 0.2], [-0.02, -0.85, 0.2]]));

  // Three mirror-ring engines at the stern on heavy faceted pylons, the centre one largest.
  const ringZ = ZS + 0.55;
  mirrorRing(k, 0, 0.0, ringZ, 0.55, 22);
  for (const s of [-1, 1]) {
    mirrorRing(k, s * 1.05, 0.05, ringZ - 0.1, 0.4, 18);
    k.add('panel', hull([[s * 0.6, 0.25, ZS - 0.3], [s * 0.6, -0.15, ZS - 0.3], [s * 0.95, 0.2, ringZ - 0.25], [s * 0.95, -0.1, ringZ - 0.25], [s * 0.7, 0.3, ZS], [s * 0.7, -0.2, ZS]]));
  }
  k.add('panel', new THREE.BoxGeometry(0.3, 0.3, 0.6), [0, 0.0, ZS + 0.15]);
  return k.group;
}

/**
 * *Belone*, the fighter (sheet moon-belone): a long white needle, a slim cone from the sharp tip to a wider tail, a
 * pale blue point of light at the tip, a thin glass cockpit slit ahead of a silver collar near the tail, and four fins,
 * two white and two silver, folded flat back along the rear of the shaft (the sheet stood them out; the notes say
 * folded). The engine is a small silver ring with the halo inside it.
 */
export function buildTempleFighter(mats: StyleMaterials = templeMaterials()) {
  const k = new Kit(mats);
  k.add('hull', new THREE.ConeGeometry(0.095, 1.75, 16), [0, 0, -0.17], [-Math.PI / 2, 0, 0]); // tip toward −z
  k.add('hull', new THREE.CylinderGeometry(0.095, 0.09, 0.3, 16), [0, 0, 0.85], [Math.PI / 2, 0, 0]);
  k.add('panel', new THREE.CylinderGeometry(0.105, 0.105, 0.06, 16), [0, 0, 0.62], [Math.PI / 2, 0, 0]);
  k.add('accent', new THREE.CylinderGeometry(0.098, 0.098, 0.02, 16), [0, 0, 0.98], [Math.PI / 2, 0, 0]);
  k.add('glass', new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.6, 0.6, 4), [0, 0.065, 0.36]);
  k.add('glow', new THREE.SphereGeometry(0.03, 8, 6), [0, 0, -1.06]);
  // Four fins folded back flat along the shaft, like fletching: two white, two silver.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = new THREE.Shape();
    fin.moveTo(0, 0); fin.lineTo(0.0, 0.62); fin.lineTo(0.16, 0.78); fin.lineTo(0.1, 0.18); fin.closePath();
    const g = new THREE.ExtrudeGeometry(fin, { depth: 0.012, bevelEnabled: false });
    g.translate(0.08, 0, -0.006);
    g.rotateX(Math.PI / 2); // shape y → z, back along the shaft
    g.rotateZ(a);
    k.add(i % 2 ? 'panel' : 'hull', g, [0, 0, 0.2]);
  }
  k.add('panel', new THREE.TorusGeometry(0.085, 0.02, 8, 24), [0, 0, 1.01]);
  k.add('glow', new THREE.RingGeometry(0.03, 0.075, 24), [0, 0, 1.015]);
  return k.group;
}

/**
 * *Lampas*, the cruiser (sheet moon-lampas): a narrow straight white hull 2 long, square with its long edges cut flat,
 * three silver collars (bow, middle, stern), a blue inlay line down each flank, eight curved silver petals at the bow
 * flaring forward round a pale blue sphere on a stalk (the laser), a row of bridge window slits behind the petals over
 * a little colonnade, and a small silver ring engine with the halo inside it.
 */
export function buildTempleCruiser(mats: StyleMaterials = templeMaterials()) {
  const k = new Kit(mats);
  const h = 0.125, c = 0.04; // half the section, and the chamfer
  const oct: [number, number][] = [[h - c, h], [h, h - c], [h, c - h], [h - c, -h], [c - h, -h], [-h, c - h], [-h, h - c], [c - h, h]];
  k.add('hull', hull([-0.7, 0.86].flatMap((z) => oct.map(([x, y]) => [x, y, z] as P3))));
  for (const z of [-0.66, 0.18, 0.84]) k.add('panel', new THREE.CylinderGeometry(0.148, 0.148, 0.07, 8), [0, 0, z], [Math.PI / 2, Math.PI / 8, 0]);
  for (const s of [-1, 1]) k.add('accent', sliver([s * 0.126, -0.02, -0.6], [s * 0.126, -0.02, 0.8], 0.006, 0.018));
  // The bridge: a low cabin with window slits on top behind the petals, little columns down its sides.
  k.add('hull', hull([[0.08, h, -0.58], [-0.08, h, -0.58], [0.08, h, -0.25], [-0.08, h, -0.25], [0.06, h + 0.06, -0.54], [-0.06, h + 0.06, -0.54], [0.06, h + 0.06, -0.28], [-0.06, h + 0.06, -0.28]]));
  for (let i = 0; i < 3; i++) k.add('lit', new THREE.BoxGeometry(0.1, 0.012, 0.035), [0, h + 0.062, -0.5 + i * 0.09]);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.add('panel', new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), [s * 0.128, 0.03, -0.5 + i * 0.08]);
  // The reflector: eight curved mirror petals flaring forward round the lamp, open between them.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const at = (r: number, t: number, z: number): P3 => [Math.cos(a) * r - Math.sin(a) * t, Math.sin(a) * r + Math.cos(a) * t, z];
    // Two segments: out from the collar, then curling forward.
    for (const [r0, z0, r1, z1, w0, w1] of [[0.14, -0.72, 0.32, -0.82, 0.05, 0.11], [0.32, -0.82, 0.42, -1.06, 0.11, 0.085]]) {
      const pts: P3[] = [];
      for (const d of [0, 0.014]) pts.push(at(r0 + d, -w0, z0), at(r0 + d, w0, z0), at(r1 + d, -w1, z1), at(r1 + d, w1, z1));
      k.add('panel', hull(pts));
    }
  }
  k.add('hull', new THREE.CylinderGeometry(0.02, 0.03, 0.25, 8), [0, 0, -0.82], [Math.PI / 2, 0, 0]);
  k.add('glow', new THREE.SphereGeometry(0.08, 14, 10), [0, 0, -0.96]);
  // The engine: a small mirror ring with the halo inside it.
  k.add('panel', new THREE.TorusGeometry(0.13, 0.03, 8, 28), [0, 0, 0.93]);
  k.add('glow', new THREE.RingGeometry(0.04, 0.11, 24), [0, 0, 0.94]);
  return k.group;
}
