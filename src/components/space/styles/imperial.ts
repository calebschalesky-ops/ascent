/**
 * Mars (the Quirites): the galactic-empire style of ART-DIRECTION.md. Flat faceted planes and hard edges, cold grey,
 * Mars red only as a thin stripe or a plate, ice-white engines in flat banks. Our own geometry and names, in the
 * spirit of the Imperial ships in Star Wars, not a copy of any.
 */
import * as THREE from 'three';
import { COLOR } from '../../../lib/bodies';
import type { P3, StyleMaterials } from './kit';
import { Kit, facePatch, hull, mirror, paletteMaterials, seeded, sliver } from './kit';

export const imperialMaterials = (accent: string = COLOR.mars): StyleMaterials => paletteMaterials({
  hull: 0x8a8f96, panel: 0x5d6269, accent, glow: new THREE.Color(0.85, 1.6, 2.0), glass: 0x0a121c,
  lit: new THREE.Color(1.7, 1.7, 1.6), metal: 0.55, rough: 0.55,
});

// The wedge: nose, the two stern corners of the sharp edge, the top ridge and the keel at the stern. The sheet's
// wedge is about 3.4 times as long as it is wide.
const NOSE = -4.5;
const NOSE_T: P3 = [0, 0.06, NOSE];
const NOSE_B: P3 = [0, -0.04, NOSE];
const W = 1.45; // half the width at the stern
const STERN = 4.3;
const RIDGE: P3 = [0, 0.62, STERN];
const KEEL: P3 = [0, -0.36, STERN];
/** Height of the upper hull at (x, z). */
const topY = (x: number, z: number) => 0.06 - (0.56 / W) * Math.abs(x) + (0.56 / (STERN - NOSE)) * (z - NOSE);
/** Half-width of the hull at z. */
const halfWidth = (z: number) => (W * (z - NOSE)) / (STERN - NOSE);

/** A deck: a trapezoid slab rising along the spine from zF to zB, its top sloping from tF to tB. */
function deck(zF: number, zB: number, wF: number, wB: number, base: number, tF: number, tB: number) {
  const side: P3[] = [[wF, base, zF], [wB, base, zB], [wF * 0.8, tF, zF + 0.15], [wB * 0.88, tB, zB]];
  return hull([...side, ...mirror(side)]);
}

/** A twin-gun turret on a deck top: a low faceted block and two barrels forward. */
function turret(k: Kit, x: number, y: number, z: number, r: number) {
  const block: P3[] = [[r, y, z - r], [r, y, z + r], [r * 0.7, y + r * 0.7, z - r * 0.5], [r * 0.7, y + r * 0.7, z + r]];
  k.add('hull', hull([...block, ...mirror(block)]), [x, 0, 0]);
  for (const s of [-1, 1]) k.add('panel', new THREE.CylinderGeometry(r * 0.12, r * 0.12, r * 2.2, 6).rotateX(Math.PI / 2), [x + s * r * 0.35, y + r * 0.38, z - r * 1.9]);
}

/**
 * *Rostrata*, the capital ship (sheet mars-rostrata): a flat dagger-wedge about 10 long, three stepped decks rising
 * to a command tower at the stern (a neck, a wide bridge bar with windows, two upright vanes, a red plate), three
 * twin-gun turrets down each side of the decks, a trench down each edge, a red stripe down each side of the prow, a
 * lit hangar under the belly, a heavy three-bladed galley ram beak jutting past the nose, twelve oar-like radiator
 * vanes raked back down each flank, and a flat bank of seven square-cut nozzles, three large over four small (seven:
 * the rear view drew nine).
 */
export function buildImperialCapital(mats: StyleMaterials = imperialMaterials()) {
  const k = new Kit(mats);
  const edgeR: P3[] = [[W, 0.06, STERN], [W, -0.06, STERN]];
  k.add('hull', hull([NOSE_T, NOSE_B, RIDGE, KEEL, ...edgeR, ...mirror(edgeR)]));

  // Three stepped decks, each narrower and shorter than the one below.
  const decks = [
    { zF: -1.4, zB: STERN, wF: 0.22, wB: 0.85, base: 0.18, tF: 0.48, tB: 0.8 },
    { zF: 0.6, zB: STERN, wF: 0.18, wB: 0.58, base: 0.48, tF: 0.9, tB: 1.02 },
    { zF: 2.3, zB: STERN, wF: 0.15, wB: 0.38, base: 0.8, tF: 1.16, tB: 1.22 },
  ];
  decks.forEach((d, i) => k.add(i === 1 ? 'panel' : 'hull', deck(d.zF, d.zB, d.wF, d.wB, d.base, d.tF, d.tB)));

  // Window rows along the decks' flanks.
  for (const d of decks) {
    const n = Math.floor((d.zB - d.zF - 0.3) / 0.2);
    for (let i = 0; i < n; i++) {
      const z = d.zF + 0.3 + i * 0.2;
      const f = (z - d.zF) / (d.zB - d.zF);
      const w = d.wF + (d.wB - d.wF) * f;
      const y = d.base + (d.tF + (d.tB - d.tF) * f - d.base) * 0.45;
      for (const s of [-1, 1]) k.add('lit', new THREE.BoxGeometry(0.02, 0.025, 0.08), [s * (w * 0.94 + 0.01), y, z]);
    }
  }
  // Three twin-gun turrets down each side of the lowest deck's top.
  for (const s of [-1, 1]) for (const z of [-0.6, 0.9, 2.4]) {
    const f = (z + 1.4) / (STERN + 1.4);
    turret(k, s * (0.22 + 0.63 * f) * 0.62, 0.48 + 0.32 * f - 0.02, z, 0.13);
  }

  // The command tower: a neck, a wide flat bridge bar with windows, two upright sensor vanes, Mars's plate.
  k.add('hull', new THREE.BoxGeometry(0.3, 0.5, 0.42), [0, 1.42, 3.9]);
  const bar: P3[] = [[0.72, 1.62, 3.7], [0.72, 1.8, 3.75], [0.66, 1.62, 4.12], [0.66, 1.8, 4.12]];
  k.add('hull', hull([...bar, ...mirror(bar)]));
  k.add('lit', new THREE.BoxGeometry(1.3, 0.035, 0.02), [0, 1.72, 3.71]);
  for (const s of [-1, 1]) {
    const vane: P3[] = [[0.66, 1.8, 3.8], [0.72, 1.8, 3.8], [0.66, 1.8, 4.1], [0.72, 1.8, 4.1], [0.72, 2.2, 3.95], [0.78, 2.2, 3.95], [0.72, 2.2, 4.1], [0.78, 2.2, 4.1]];
    k.add('panel', hull(vane.map(([x, y, z]) => [s * x, y, z] as P3)));
  }
  k.add('accent', new THREE.BoxGeometry(0.14, 0.14, 0.012), [0, 1.42, 3.685]);

  // Each upper face: a trench along the sharp edge, Mars's red stripe on the prow, rows of small details.
  for (const s of [-1, 1]) {
    const corner: P3 = [s * W, 0.06, STERN];
    k.add('panel', facePatch(NOSE_T, corner, RIDGE, [[0.12, 0], [0.97, 0], [0.97, 0.06], [0.12, 0.06]], 0.02));
    k.add('accent', facePatch(NOSE_T, corner, RIDGE, [[0.06, 0.1], [0.36, 0.1], [0.36, 0.13], [0.06, 0.13]], 0.02));
  }
  const rnd = seeded(41);
  for (let i = 0; i < 70; i++) {
    const z = -1.6 + rnd() * 5.6;
    const hw = halfWidth(z) * 0.82;
    const x = (rnd() * 2 - 1) * hw;
    if (Math.abs(x) < 0.25 + (z > -1.4 ? (0.63 * (z + 1.4)) / 5.7 : 0)) continue; // clear of the decks
    const sx = 0.05 + rnd() * 0.1, sz = 0.06 + rnd() * 0.24;
    k.add('panel', new THREE.BoxGeometry(sx, 0.03, sz), [x, topY(x, z) + 0.005, z], [0, 0, (x > 0 ? -1 : 1) * Math.atan(0.56 / W)]);
  }

  // The galley ram under the prow: a heavy dark steel beak of three blades, jutting past the nose.
  const beak: P3[] = [[0.14, -0.06, NOSE + 0.9], [0, -0.3, NOSE + 1.1], [0, -0.1, NOSE - 0.8], [0.06, -0.14, NOSE - 0.6]];
  k.add('panel', hull([...beak, ...mirror(beak)]));
  for (const y of [-0.08, -0.16, -0.24]) k.add('panel', new THREE.BoxGeometry(0.4 - Math.abs(y + 0.16) * 1.5, 0.022, 0.14), [0, y, NOSE - 0.45]);

  // Twelve oar radiators down each flank, below the trench, raked back like a galley's oars.
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) {
    const z = -0.4 + i * 0.36;
    const oar = new THREE.BoxGeometry(0.75, 0.018, 0.07).translate(s * 0.375, 0, 0).rotateY(-s * 0.55).rotateZ(-s * 0.18);
    k.add('panel', oar, [s * (halfWidth(z) - 0.05), -0.06, z]);
  }

  // The hangar under the belly, a third of the way back, lit inside.
  k.add('glass', new THREE.BoxGeometry(0.7, 0.05, 1.1), [0, -0.2, -0.3]);
  k.add('lit', new THREE.BoxGeometry(0.6, 0.02, 0.03), [0, -0.22, -0.82]);

  // Engines: a stern block, three large and four small square-cut nozzles in a flat bank.
  k.add('hull', new THREE.BoxGeometry(2.4, 0.8, 0.3), [0, 0.1, STERN + 0.14]);
  for (const x of [-0.72, 0, 0.72]) {
    k.add('panel', new THREE.BoxGeometry(0.5, 0.42, 0.26), [x, 0.22, STERN + 0.4]);
    k.add('glow', new THREE.PlaneGeometry(0.4, 0.34), [x, 0.22, STERN + 0.531]);
  }
  for (const x of [-0.96, -0.32, 0.32, 0.96]) {
    k.add('panel', new THREE.BoxGeometry(0.26, 0.22, 0.22), [x, -0.15, STERN + 0.38]);
    k.add('glow', new THREE.PlaneGeometry(0.19, 0.15), [x, -0.15, STERN + 0.491]);
  }
  return k.group;
}

/**
 * *Velite*, the fighter (sheet mars-velite, v3: the javelin; Caleb rejected the ball-between-panels as a TIE
 * fighter, twice). Long, low and flat: a narrow faceted fuselage, a pilum-shaped gun run out well past the nose to a
 * small pyramid tip, a visor-slit canopy behind the nose, short flat delta wings low on the fuselage and angled a
 * little down with red leading edges, two small fins canted out in a V, and two square nozzles side by side. No
 * upright panels beside the cockpit anywhere.
 */
export function buildImperialFighter(mats: StyleMaterials = imperialMaterials()) {
  const k = new Kit(mats);
  // The fuselage: flat top and bottom, faceted sides, a wedge nose.
  const sec = (z: number, w: number, h: number): P3[] => [[w, h, z], [w * 1.25, 0, z], [w, -h * 0.8, z]];
  const body = [...sec(-0.62, 0.05, 0.035), ...sec(-0.2, 0.11, 0.07), ...sec(0.3, 0.13, 0.075), ...sec(0.62, 0.11, 0.07)];
  k.add('hull', hull([...body, ...mirror(body), [0, 0.0, -0.8]]));
  const spine: P3[] = [[0.06, 0.07, -0.05], [0.07, 0.072, 0.58], [0.05, 0.1, 0.0], [0.05, 0.1, 0.55]];
  k.add('panel', hull([...spine, ...mirror(spine)]));
  // The visor-slit canopy just behind the nose, lit faintly.
  const visor: P3[] = [[0.07, 0.06, -0.42], [0.08, 0.07, -0.06], [0.05, 0.12, -0.3], [0.06, 0.13, -0.08]];
  k.add('hull', hull([...visor, ...mirror(visor)]));
  k.add('glass', new THREE.BoxGeometry(0.1, 0.03, 0.008), [0, 0.105, -0.315], [-0.55, 0, 0]);
  // The pilum: a long thin iron gun forward of the nose, ending in a four-sided pyramid tip.
  k.add('panel', new THREE.CylinderGeometry(0.014, 0.018, 0.62, 6).rotateX(Math.PI / 2), [0, -0.01, -1.08]);
  k.add('panel', new THREE.CylinderGeometry(0.026, 0.026, 0.05, 6).rotateX(Math.PI / 2), [0, -0.01, -0.79]);
  k.add('hull', new THREE.ConeGeometry(0.04, 0.12, 4).rotateX(-Math.PI / 2), [0, -0.01, -1.45]);
  for (const s of [-1, 1]) {
    // A short flat delta wing low on the fuselage, angled a little down, red along its leading edge.
    const wing: P3[] = [[0.12, -0.03, -0.12], [0.12, -0.03, 0.42], [0.78, -0.1, 0.32], [0.78, -0.1, 0.42]];
    k.add('hull', hull(wing.flatMap(([x, y, z]) => [[s * x, y + 0.012, z], [s * x, y - 0.012, z]] as P3[])));
    k.add('accent', sliver([s * 0.13, -0.03, -0.12], [s * 0.78, -0.1, 0.31], 0.03, 0.03));
    // A small fin canted out in a V.
    k.add('panel', new THREE.BoxGeometry(0.014, 0.2, 0.2).translate(0, 0.1, 0).rotateZ(-s * 0.5), [s * 0.06, 0.07, 0.5]);
    // Two square nozzles side by side.
    k.add('panel', new THREE.BoxGeometry(0.11, 0.1, 0.1), [s * 0.065, 0, 0.66]);
    k.add('glow', new THREE.PlaneGeometry(0.085, 0.075), [s * 0.065, 0, 0.711]);
  }
  return k.group;
}

/**
 * *Corvus*, the cruiser (sheet mars-corvus): a flat dagger-wedge 1:2.5, one raised deck with window rows, a single
 * tower block at the stern with its bridge bar and red plates, and its boarding bridge (the *corvus*) folded along
 * the spine: a railed boom of seven crossbars (seven: the sheet drew about twelve) hinged at the tower, with a spike
 * at its tip. One red stripe down each side of the prow (not the centre), two guns under it, three square-cut
 * ice-white nozzles.
 */
export function buildImperialCruiser(mats: StyleMaterials = imperialMaterials()) {
  const k = new Kit(mats);
  const w = 0.4, z0 = -1, z1 = 0.95;
  const nT: P3 = [0, 0.02, z0], nB: P3 = [0, -0.015, z0], ridge: P3 = [0, 0.24, z1];
  const edgeR: P3[] = [[w, 0.02, z1], [w, -0.02, z1]];
  k.add('hull', hull([nT, nB, ridge, [0, -0.15, z1], ...edgeR, ...mirror(edgeR)]));
  k.add('panel', deck(-0.15, z1, 0.06, 0.2, 0.06, 0.17, 0.31));
  for (const s of [-1, 1]) {
    const corner: P3 = [s * w, 0.02, z1];
    k.add('panel', facePatch(nT, corner, ridge, [[0.15, 0], [0.97, 0], [0.97, 0.06], [0.15, 0.06]], 0.006));
    k.add('accent', facePatch(nT, corner, ridge, [[0.08, 0.08], [0.4, 0.08], [0.4, 0.12], [0.08, 0.12]], 0.006));
    for (let i = 0; i < 6; i++) k.add('lit', new THREE.BoxGeometry(0.006, 0.012, 0.03), [s * (0.075 + i * 0.016), 0.2 + i * 0.012, 0.0 + i * 0.13]);
  }
  // The tower block, its bridge windows and Mars's plate.
  k.add('hull', new THREE.BoxGeometry(0.16, 0.16, 0.2), [0, 0.36, 0.82]);
  k.add('hull', new THREE.BoxGeometry(0.34, 0.06, 0.14), [0, 0.47, 0.8]);
  k.add('lit', new THREE.BoxGeometry(0.3, 0.012, 0.006), [0, 0.475, 0.728]);
  k.add('accent', new THREE.BoxGeometry(0.004, 0.06, 0.08), [0.082, 0.36, 0.82]);
  k.add('accent', new THREE.BoxGeometry(0.004, 0.06, 0.08), [-0.082, 0.36, 0.82]);
  // The corvus: a railed boom folded forward along the spine from a hinge on the tower, a spike at its tip.
  const hinge: P3 = [0, 0.33, 0.7], tip: P3 = [0, 0.11, -0.55];
  k.add('panel', new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), hinge, [0, 0, Math.PI / 2]);
  for (const x of [-0.035, 0.035]) k.add('hull', sliver([x, hinge[1], hinge[2]], [x, tip[1], tip[2]], 0.014, 0.02));
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const y = hinge[1] + (tip[1] - hinge[1]) * t, z = hinge[2] + (tip[2] - hinge[2]) * t;
    k.add('panel', new THREE.BoxGeometry(0.08, 0.008, 0.012), [0, y, z]);
  }
  k.add('hull', hull([[0.035, 0.1, -0.53], [-0.035, 0.1, -0.53], [0.035, 0.13, -0.53], [-0.035, 0.13, -0.53], [0, 0.105, -0.72]]));
  // Two short gun barrels under the prow.
  for (const x of [-0.04, 0.04]) k.add('panel', new THREE.CylinderGeometry(0.012, 0.014, 0.22, 6).rotateX(Math.PI / 2), [x, -0.045, -0.82]);
  k.add('panel', new THREE.BoxGeometry(0.12, 0.03, 0.14), [0, -0.035, -0.68]);
  // Engines: a stern block and three square-cut nozzles in a flat bank.
  k.add('hull', new THREE.BoxGeometry(0.5, 0.2, 0.08), [0, 0.04, z1 + 0.03]);
  for (const x of [-0.16, 0, 0.16]) {
    k.add('panel', new THREE.BoxGeometry(0.12, 0.11, 0.06), [x, 0.05, z1 + 0.09]);
    k.add('glow', new THREE.PlaneGeometry(0.09, 0.08), [x, 0.05, z1 + 0.121]);
  }
  return k.group;
}
