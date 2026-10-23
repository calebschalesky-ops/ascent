/**
 * Each nation's special ship (races.ts's `special` class), built to the accepted model sheets
 * (art-refit/refs/ships/<nation>-<name>.webp, notes and rulings in art-refit/03-SHIPS.md). Same kit and materials as
 * the nation's capital, cruiser and fighter (kit.ts roles), nose toward −z, each about 6 long: the caller fits it to
 * its world length (races.ts gives each special its own).
 */
import * as THREE from 'three';
import type { NationId } from '../../../lib/nations';
import type { P3, StyleMaterials } from './kit';
import { Kit, hull, mirror, sliver } from './kit';
import { lathe, zTube } from './navy';

/** A small convex box between two points, as a strut or spoke, `r` thick. */
const strut = (a: P3, b: P3, r: number) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
};

/** A painted eye on the flank facing ±x (`s`): a pale disc, an indigo iris, a black pupil. */
function eye(k: Kit, s: number, at: P3, r: number) {
  const face = (g: THREE.BufferGeometry) => g.rotateY((s * Math.PI) / 2);
  k.add('lit', face(new THREE.CircleGeometry(r, 20).scale(1.5, 1, 1)), [at[0] + s * 0.004, at[1], at[2]]);
  k.add('accent', face(new THREE.CircleGeometry(r * 0.6, 20)), [at[0] + s * 0.008, at[1], at[2]]);
  k.add('hull', face(new THREE.CircleGeometry(r * 0.28, 16)), [at[0] + s * 0.012, at[1], at[2]]);
}

/**
 * Earth, *Ark*, the colony ship (sheet earth-ark): unarmed. A fat turned brass hull rounded at both ends, three
 * gunmetal bands, and round its middle (the sheet put it two-thirds back; the notes say the middle) a wide turning
 * habitat ring on four spokes, lit windows round its inner face, portholes and rivets on its outer face, blue lights at
 * four points. A blue glass bridge dome at the nose, a lit docking bay under the forward hull, three bells in a
 * triangle in a gunmetal frame.
 */
export function buildArk(mats: StyleMaterials) {
  const k = new Kit(mats);
  k.add('hull', lathe([[0, 3.0], [0.5, 2.96], [0.85, 2.6], [1.0, 1.8], [1.0, -1.5], [0.92, -2.3], [0.66, -2.85], [0.3, -3.08], [0, -3.12]], 40));
  for (const z of [-1.3, 1.0, 2.1]) k.add('panel', zTube(1.035, 1.035, 0.3, 40), [0, 0, z]);
  k.add('panel', zTube(1.12, 1.12, 0.36, 40), [0, 0, 0]); // the ring's collar
  // The habitat ring: a wide flat band, gunmetal edges, brass face, lit windows inside, portholes outside.
  const RR = 2.6, RW = 0.5;
  k.add('hull', lathe([[RR, RW / 2], [RR, -RW / 2], [RR - 0.12, -RW / 2], [RR - 0.12, RW / 2], [RR, RW / 2]], 72));
  for (const dz of [-RW / 2, RW / 2]) k.add('panel', new THREE.TorusGeometry(RR, 0.06, 6, 64), [0, 0, dz]);
  k.add('panel', new THREE.TorusGeometry(RR - 0.14, 0.05, 6, 64), [0, 0, 0]);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    k.add('lit', new THREE.BoxGeometry(0.03, 0.16, 0.3), [Math.cos(a) * (RR - 0.13), Math.sin(a) * (RR - 0.13), 0], [0, 0, a]);
    if (i % 2 === 0) k.add('panel', new THREE.BoxGeometry(0.03, 0.06, 0.06), [Math.cos(a) * (RR + 0.02), Math.sin(a) * (RR + 0.02), 0.1], [0, 0, a]);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 2;
    const c = Math.cos(a), sn = Math.sin(a);
    k.add('panel', strut([c * 1.1, sn * 1.1, 0], [c * (RR - 0.1), sn * (RR - 0.1), 0], 0.07));
    k.add('glow', new THREE.SphereGeometry(0.08, 8, 6), [c * (RR + 0.06), sn * (RR + 0.06), -0.2]);
  }
  // The bridge dome at the nose, ringed in brass.
  k.add('glass', new THREE.SphereGeometry(0.32, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2), [0, 0, -3.02]);
  k.add('panel', new THREE.TorusGeometry(0.33, 0.05, 6, 24), [0, 0, -3.0]);
  // The docking bay under the forward hull, lit inside, with its apron.
  k.add('panel', new THREE.BoxGeometry(0.8, 0.36, 1.0), [0, -0.86, -1.8]);
  k.add('lit', new THREE.PlaneGeometry(0.6, 0.22).rotateY(Math.PI), [0, -0.86, -2.31]);
  k.add('panel', new THREE.BoxGeometry(0.7, 0.04, 0.5), [0, -1.04, -2.5]);
  // Three bells in a triangle in a gunmetal thrust frame.
  k.add('panel', zTube(0.72, 0.66, 0.3, 24), [0, 0, 3.0]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * 0.36, y = Math.sin(a) * 0.36;
    k.add('panel', lathe([[0.26, 3.6], [0.21, 3.35], [0.16, 3.12]], 16), [x, y, 0]);
    k.add('glow', new THREE.CircleGeometry(0.2, 16), [x, y, 3.52]);
  }
  return k.group;
}

/**
 * Moon, *Theoros*, the sacred envoy (sheet moon-theoros): unarmed. A slim white needle with blue inlay, at the bow an
 * open laurel wreath of two silver branches standing far above and below the hull (open, as the sheet drew it; the
 * notes keep that and move it to the bow), a little open shrine of four columns under a silver pediment with a pale
 * blue light inside, cabin slits below it, two swept fins edged in silver and a silver ring engine.
 */
export function buildTheoros(mats: StyleMaterials) {
  const k = new Kit(mats);
  const sec = (z: number, r: number): P3[] => Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return [Math.cos(a) * r, Math.sin(a) * r, z] as P3;
  });
  k.add('hull', hull([[0, 0, -3.1], ...sec(-0.6, 0.3), ...sec(1.6, 0.3), ...sec(2.6, 0.2)]));
  for (const s of [-1, 1]) k.add('accent', sliver([s * 0.275, -0.02, -2.0], [s * 0.3, -0.02, 2.3], 0.02, 0.04));
  // The wreath: two branches curving up from below the hull, leaves alternating, open at the top.
  const WZ = -2.0, WR = 1.15;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const a = -Math.PI / 2 + t * Math.PI * 0.86; // from the bottom round the side, stopping short of the top
      const x = s * Math.cos(a) * WR * 0.7, y = Math.sin(a) * WR;
      const leaf = () => new THREE.OctahedronGeometry(1, 0).scale(0.05, 0.17 - t * 0.05, 0.035);
      k.add('panel', leaf(), [x + s * 0.09, y, WZ], [0, 0, s * (a + Math.PI / 2) - s * 0.6]);
      k.add('panel', leaf(), [x - s * 0.09, y, WZ], [0, 0, s * (a + Math.PI / 2) + s * 0.6]);
      if (i < 13) {
        const a2 = -Math.PI / 2 + ((i + 1) / 13) * Math.PI * 0.86;
        k.add('panel', strut([x, y, WZ], [s * Math.cos(a2) * WR * 0.7, Math.sin(a2) * WR, WZ], 0.018));
      }
    }
  }
  // The shrine: a stylobate, four columns, a silver pediment, the pale blue light inside.
  k.add('hull', new THREE.BoxGeometry(0.42, 0.05, 0.5), [0, 0.3, -0.4]);
  for (const x of [-0.15, 0.15]) for (const z of [-0.58, -0.22]) k.add('hull', new THREE.CylinderGeometry(0.025, 0.028, 0.34, 8), [x, 0.5, z]);
  k.add('panel', new THREE.BoxGeometry(0.44, 0.04, 0.52), [0, 0.69, -0.4]);
  k.add('panel', hull([[0.24, 0.71, -0.66], [-0.24, 0.71, -0.66], [0, 0.84, -0.66], [0.24, 0.71, -0.14], [-0.24, 0.71, -0.14], [0, 0.84, -0.14]]));
  k.add('glow', new THREE.SphereGeometry(0.07, 10, 8), [0, 0.48, -0.4]);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.add('lit', new THREE.BoxGeometry(0.01, 0.025, 0.1), [s * 0.29, 0.08, -0.85 + i * 0.22]);
  // Two swept fins near the stern, edged in silver.
  for (const s of [-1, 1]) {
    const f: P3[] = [[0.25, 0, 1.3], [0.25, 0, 2.3], [1.0, -0.05, 2.5], [1.0, -0.05, 2.25]];
    k.add('hull', hull(f.flatMap(([x, y, z]) => [[s * x, y + 0.015, z], [s * x, y - 0.015, z]] as P3[])));
    k.add('panel', sliver([s * 0.27, 0, 1.3], [s * 1.0, -0.05, 2.25], 0.03, 0.035));
  }
  // The ring engine and its halo.
  k.add('panel', new THREE.TorusGeometry(0.24, 0.07, 10, 24), [0, 0, 2.75]);
  k.add('panel', zTube(0.3, 0.3, 0.2, 24), [0, 0, 2.66]);
  k.add('glow', new THREE.RingGeometry(0.09, 0.21, 24), [0, 0, 2.83]);
  return k.group;
}

/**
 * Mercury, *Skytale*, the dispatch runner (sheet mercury-skytale): a long straight black iron rod, a domed bronze
 * nose cap with a gold rim and a gun, a gold ribbon wound round the rod in exactly six turns, a bronze cockpit pod
 * with a slit window inside the first turn, and one long nozzle with a gold rim at the stern.
 */
export function buildSkytale(mats: StyleMaterials) {
  const k = new Kit(mats);
  const Z0 = -2.6, Z1 = 2.8;
  k.add('panel', zTube(0.1, 0.1, Z1 - Z0, 12), [0, 0, (Z0 + Z1) / 2]);
  // The nose cap, its gold rim and the gun through it.
  k.add('hull', new THREE.SphereGeometry(0.32, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 1.5), [0, 0, Z0 + 0.05]);
  k.add('hull', zTube(0.32, 0.3, 0.2, 20), [0, 0, Z0 + 0.15]);
  k.add('accent', new THREE.TorusGeometry(0.32, 0.035, 6, 24), [0, 0, Z0 + 0.25]);
  k.add('panel', zTube(0.04, 0.05, 0.6, 8), [0, 0, Z0 - 0.6]);
  // The ribbon: six turns from behind the cap to the stern, a thin gold band standing off the rod.
  const turns = 6, N = turns * 28, R = 0.42, A = Z0 + 0.5, B = Z1 - 0.2;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    const p = (t: number): P3 => [Math.cos(t * turns * Math.PI * 2) * R, Math.sin(t * turns * Math.PI * 2) * R, A + t * (B - A)];
    const a = p(t0), b = p(t1);
    // A short flat plate of the ribbon: radial depth 0.03, width 0.1 along the rod.
    const pts: P3[] = [];
    for (const q of [a, b]) for (const dr of [-0.015, 0.015]) for (const dz of [-0.05, 0.05]) {
      const r = Math.hypot(q[0], q[1]);
      pts.push([q[0] * (1 + dr / r), q[1] * (1 + dr / r), q[2] + dz]);
    }
    k.add('accent', hull(pts));
  }
  // The cockpit pod inside the first turn, with its slit window.
  k.add('hull', new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.8, 0.9, 1.6), [0, 0.06, Z0 + 0.85]);
  k.add('lit', new THREE.BoxGeometry(0.16, 0.03, 0.01), [0, 0.2, Z0 + 0.6], [-0.4, 0, 0]);
  // The nozzle.
  k.add('panel', zTube(0.12, 0.16, 0.4, 16), [0, 0, Z1 + 0.15]);
  k.add('accent', new THREE.TorusGeometry(0.16, 0.025, 6, 20), [0, 0, Z1 + 0.35]);
  k.add('glow', new THREE.CircleGeometry(0.13, 16), [0, 0, Z1 + 0.36]);
  return k.group;
}

/**
 * Venus, *Siphon*, the fire ship (sheet venus-siphon): a straight gilded tube with three green enamel bands edged in
 * gold (three: the sheet drew one wide band), a gold lion's head at the front with a filigree mane and a green glow
 * deep in its open mouth (the flame projector), two bulbous gold fuel tanks with green sight windows just behind the
 * head (the sheet put them aft), a green-glass dome cockpit, four short gilded fins in an X and a green engine cup.
 */
export function buildSiphon(mats: StyleMaterials) {
  const k = new Kit(mats);
  const R = 0.45;
  k.add('hull', zTube(R, R, 4.0, 28), [0, 0, 0.6]);
  for (const z of [0.1, 0.8, 1.5]) {
    k.add('panel', zTube(R + 0.015, R + 0.015, 0.28, 28), [0, 0, z]);
    for (const dz of [-0.15, 0.15]) k.add('hull', new THREE.TorusGeometry(R + 0.02, 0.022, 6, 28), [0, 0, z + dz]);
  }
  // The lion's head: a gold skull, a long muzzle, a filigree mane round it, an open mouth glowing green.
  const HZ = -1.75;
  k.add('hull', new THREE.SphereGeometry(0.62, 20, 14).scale(1, 1, 1.05), [0, 0.06, HZ]);
  k.add('hull', hull([[0.3, 0.22, HZ - 0.4], [-0.3, 0.22, HZ - 0.4], [0.22, 0.1, HZ - 0.85], [-0.22, 0.1, HZ - 0.85], [0.18, 0.28, HZ - 0.75], [-0.18, 0.28, HZ - 0.75], [0.3, -0.05, HZ - 0.4], [-0.3, -0.05, HZ - 0.4]]));
  k.add('hull', hull([[0.26, -0.22, HZ - 0.35], [-0.26, -0.22, HZ - 0.35], [0.2, -0.32, HZ - 0.8], [-0.2, -0.32, HZ - 0.8], [0.22, -0.42, HZ - 0.4], [-0.22, -0.42, HZ - 0.4]])); // the jaw, hanging open
  k.add('panel', new THREE.CircleGeometry(0.2, 16).rotateY(Math.PI).scale(1.2, 0.7, 1), [0, -0.08, HZ - 0.72]);
  k.add('glow', new THREE.SphereGeometry(0.13, 12, 8).scale(1.2, 0.6, 1), [0, -0.08, HZ - 0.62]);
  for (const s of [-1, 1]) {
    k.add('glow', new THREE.SphereGeometry(0.045, 8, 6), [s * 0.19, 0.3, HZ - 0.58]); // eyes
    k.add('hull', new THREE.ConeGeometry(0.1, 0.22, 8), [s * 0.36, 0.6, HZ - 0.15]); // ears
    for (const x of [0.06, 0.15]) k.add('lit', new THREE.ConeGeometry(0.025, 0.1, 6).rotateX(Math.PI), [s * x, 0.04, HZ - 0.8]); // fangs
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const g = new THREE.ConeGeometry(0.11, 0.42, 6).rotateZ(-Math.PI / 2).rotateZ(a);
    k.add('hull', g.rotateY(0.25), [Math.cos(a) * 0.68, Math.sin(a) * 0.68 + 0.04, HZ + 0.3]);
  }
  // Two bulbous fuel tanks just behind the head, green sight windows outboard.
  for (const s of [-1, 1]) {
    k.add('hull', new THREE.CapsuleGeometry(0.3, 0.45, 6, 16).rotateX(Math.PI / 2), [s * 0.72, -0.05, -0.55]);
    k.add('hull', strut([s * 0.4, -0.05, -0.55], [s * 0.5, -0.05, -0.55], 0.12));
    k.add('glass', new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-s * Math.PI / 2).scale(0.5, 1, 1.4), [s * 1.02, -0.05, -0.55]);
  }
  // The cockpit dome, ringed in gold.
  k.add('glass', new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.4, 0.45]);
  k.add('hull', new THREE.TorusGeometry(0.25, 0.035, 6, 20).rotateX(Math.PI / 2), [0, 0.41, 0.45]);
  // Four short gilded fins in an X, and the engine cup.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const at = (r: number, z: number, t: number): P3 => [Math.cos(a) * r - Math.sin(a) * t, Math.sin(a) * r + Math.cos(a) * t, z];
    const fin: [number, number][] = [[0.4, 2.0], [0.4, 2.6], [1.05, 2.75], [1.05, 2.4]];
    k.add('hull', hull(fin.flatMap(([r, z]) => [at(r, z, -0.025), at(r, z, 0.025)])));
  }
  k.add('hull', lathe([[0.36, 2.95], [0.32, 2.75], [0.26, 2.6]], 20));
  k.add('glow', new THREE.CircleGeometry(0.3, 20), [0, 0, 2.92]);
  return k.group;
}

/**
 * Mars, *Testudo*, the assault lander (sheet mars-testudo): a long low box with an arched roof, roof and sides covered
 * in rows of overlapping bossed shield plates (six rows over the roof, three down each side), a red bar on each plate
 * of the roof's centre line, the front ramp and two ramps a side outlined in red and drawn open (the sheet drew them
 * open; the notes keep it), four landing legs folded under, a slit bridge across the top front edge, two twin-gun
 * roof turrets (two: the sheet drew one) and six square nozzles in two rows of three.
 */
export function buildTestudo(mats: StyleMaterials) {
  const k = new Kit(mats);
  const W = 0.9, H = 0.5, ZF = -3.0, ZB = 2.9;
  const sec = (z: number, w: number): P3[] => [[w, -H, z], [w, H * 0.5, z], [w * 0.75, H * 0.92, z], [w * 0.35, H * 1.05, z]];
  k.add('panel', hull([...sec(ZF + 0.35, W), ...mirror(sec(ZF + 0.35, W)), ...sec(ZB, W), ...mirror(sec(ZB, W)), ...sec(ZF, W * 0.85).map(([x, y, z]) => [x, y * 0.9, z] as P3), ...mirror(sec(ZF, W * 0.85)).map(([x, y, z]) => [x, y * 0.9, z] as P3)]));
  // The shield plates: rows of bossed plates over the roof's arch and down the sides, overlapping like a shield wall.
  const cols = 13, pz = (ZB - ZF - 0.7) / cols;
  const plates: { x: number; y: number; ang: number }[] = [];
  for (let r = 0; r < 6; r++) {
    const a = -0.85 + (r + 0.5) * (1.7 / 6); // across the arch
    plates.push({ x: Math.sin(a) * W * 0.95, y: H * 0.62 + Math.cos(a) * H * 0.5, ang: -a });
  }
  for (const s of [-1, 1]) for (let r = 0; r < 3; r++) plates.push({ x: s * (W + 0.03), y: H * 0.35 - r * 0.32, ang: (s * Math.PI) / 2 });
  for (const p of plates) for (let c = 0; c < cols; c++) {
    const z = ZF + 0.55 + c * pz + pz / 2;
    const g = new THREE.BoxGeometry(0.28, 0.035, pz * 1.04).rotateZ(p.ang);
    k.add('hull', g, [p.x, p.y, z]);
    const n = [-Math.sin(p.ang), Math.cos(p.ang)];
    k.add('panel', new THREE.SphereGeometry(0.04, 6, 4), [p.x + n[0] * 0.025, p.y + n[1] * 0.025, z]);
  }
  for (let c = 0; c < cols; c++) {
    const z = ZF + 0.55 + c * pz + pz / 2;
    for (const x of [-0.13, 0.13]) k.add('accent', new THREE.BoxGeometry(0.03, 0.01, pz * 0.6), [x, H * 1.13, z]);
  }
  // The front ramp, open: the dark mouth, the ramp let down, a red stripe across the top edge.
  k.add('panel', new THREE.BoxGeometry(1.2, 0.62, 0.05), [0, -0.12, ZF - 0.01]);
  k.add('glass', new THREE.PlaneGeometry(1.0, 0.5).rotateY(Math.PI), [0, -0.12, ZF - 0.04]);
  k.add('accent', new THREE.BoxGeometry(1.2, 0.06, 0.04), [0, 0.22, ZF - 0.03]);
  k.add('hull', new THREE.BoxGeometry(1.0, 0.05, 0.9).translate(0, 0, -0.45).rotateX(0.5), [0, -0.42, ZF]);
  // Two ramps a side, open and outlined in red.
  for (const s of [-1, 1]) for (const z of [-1.1, 1.0]) {
    k.add('glass', new THREE.PlaneGeometry(0.5, 0.5).rotateY((s * Math.PI) / 2), [s * (W + 0.07), -0.2, z]);
    for (const [a, b] of [[[0, -0.45], [0, 0.05]], [[0, 0.05], [0.5, 0.05]], [[0.5, 0.05], [0.5, -0.45]]] as [[number, number], [number, number]][]) {
      k.add('accent', sliver([s * (W + 0.075), a[1], z - 0.25 + a[0]], [s * (W + 0.075), b[1], z - 0.25 + b[0]], 0.02, 0.03));
    }
    k.add('hull', new THREE.BoxGeometry(0.04, 0.6, 0.5).translate(0, -0.3, 0).rotateZ(s * 0.7), [s * (W + 0.06), -0.45, z]);
  }
  // Four landing legs folded flat under the belly.
  for (const s of [-1, 1]) for (const z of [-1.9, 1.9]) k.add('panel', new THREE.BoxGeometry(0.12, 0.08, 0.7), [s * 0.6, -H - 0.04, z], [0.2, 0, 0]);
  // The slit bridge across the top front edge.
  k.add('lit', new THREE.BoxGeometry(0.9, 0.04, 0.02), [0, 0.38, ZF + 0.2]);
  // Two twin-gun turrets on the roof, fore and aft.
  for (const z of [-1.8, 2.0]) {
    k.add('hull', new THREE.CylinderGeometry(0.2, 0.24, 0.14, 8), [0, H * 1.18, z]);
    for (const x of [-0.06, 0.06]) k.add('panel', zTube(0.025, 0.025, 0.42, 6), [x, H * 1.24, z - 0.3]);
  }
  // Six square nozzles in two rows of three.
  k.add('panel', new THREE.BoxGeometry(1.5, 0.75, 0.2), [0, 0.0, ZB + 0.08]);
  for (const y of [-0.17, 0.2]) for (const x of [-0.46, 0, 0.46]) k.add('glow', new THREE.PlaneGeometry(0.36, 0.28), [x, y, ZB + 0.19]);
  return k.group;
}

/**
 * Jupiter, *Helepolis*, the siege ship (sheet jupiter-helepolis): a siege tower laid on its side and flown point-first.
 * Four stepped tiers, hexagonal in section (the sheet's departure from the square the prompt asked for, kept because it
 * looks better), each edged in a magenta seam and faced with violet plate; a ram claw of three curved talons at the
 * front, one above and two below (three, as the front view); sixteen faceted turrets (two, four, four and six from the
 * front tier back); the crown sigil on the rear tier's flanks, its lit bridge band, and four hexagonal nozzles.
 */
export function buildHelepolis(mats: StyleMaterials) {
  const k = new Kit(mats);
  const tiers = [{ r: 1.3, z0: 1.2, z1: 2.7, guns: 6 }, { r: 1.05, z0: -0.2, z1: 1.2, guns: 4 }, { r: 0.82, z0: -1.4, z1: -0.2, guns: 4 }, { r: 0.6, z0: -2.4, z1: -1.4, guns: 2 }];
  const hex = (r: number, len: number) => new THREE.CylinderGeometry(r, r, len, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).toNonIndexed();
  tiers.forEach((t, i) => {
    const g = hex(t.r, t.z1 - t.z0);
    g.computeVertexNormals();
    k.add(i % 2 ? 'panel' : 'hull', g, [0, 0, (t.z0 + t.z1) / 2]);
    // Violet plates on the four slanted faces, and the magenta seam round the tier's front edge.
    for (const a of [Math.PI / 3, (2 * Math.PI) / 3, (4 * Math.PI) / 3, (5 * Math.PI) / 3]) {
      const ap = t.r * Math.cos(Math.PI / 6) + 0.02;
      k.add(i % 2 ? 'hull' : 'panel', new THREE.BoxGeometry(t.r * 0.75, 0.03, (t.z1 - t.z0) * 0.7).rotateZ(a - Math.PI / 2), [Math.cos(a) * ap, Math.sin(a) * ap, (t.z0 + t.z1) / 2]);
    }
    k.add('glow', new THREE.TorusGeometry(t.r + 0.01, 0.03, 4, 6).rotateZ(Math.PI / 6), [0, 0, t.z0 + 0.02]);
    // Turrets on the upper and side faces, all forward.
    const faces = t.guns === 6 ? [Math.PI / 2 - 0.5, Math.PI / 2 + 0.5, 0, Math.PI, -0.5, Math.PI + 0.5] : t.guns === 4 ? [Math.PI / 2 - 0.5, Math.PI / 2 + 0.5, 0.05, Math.PI - 0.05] : [Math.PI / 2 - 0.5, Math.PI / 2 + 0.5];
    for (const a of faces) {
      const rr = t.r * 1.0;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr, z = (t.z0 + t.z1) / 2 - 0.1;
      const b: P3[] = [[0.16, 0, -0.16], [0.16, 0, 0.2], [0.11, 0.16, -0.1], [0.11, 0.16, 0.16]];
      const tg = hull([...b, ...mirror(b)]).rotateZ(a - Math.PI / 2);
      k.add('panel', tg, [x, y, z]);
      for (const s of [-1, 1]) k.add('hull', zTube(0.025, 0.03, 0.5, 6), [x + Math.cos(a) * 0.1 + s * 0.05 * Math.sin(a), y + Math.sin(a) * 0.1 - s * 0.05 * Math.cos(a), z - 0.4]);
    }
  });
  // The crown sigil on each flank of the rear tier, and the bridge band across its top.
  for (const s of [-1, 1]) {
    const c = new THREE.Shape();
    c.moveTo(-0.3, -0.2); c.lineTo(0.3, -0.2); c.lineTo(0.34, 0.15); c.lineTo(0.17, 0.0); c.lineTo(0, 0.2); c.lineTo(-0.17, 0.0); c.lineTo(-0.34, 0.15); c.closePath();
    k.add('accent', new THREE.ExtrudeGeometry(c, { depth: 0.02, bevelEnabled: false }).rotateY((s * Math.PI) / 2), [s * 1.14, 0, 2.0]);
  }
  k.add('panel', new THREE.BoxGeometry(0.9, 0.18, 0.9), [0, 1.2, 2.1]);
  k.add('lit', new THREE.BoxGeometry(0.92, 0.06, 0.92), [0, 1.18, 2.1]);
  // The ram claw: three curved talons, one above and two below, meeting at a point ahead.
  for (const a of [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3]) {
    const c = Math.cos(a), s = Math.sin(a);
    const P = (r: number, z: number): P3 => [c * r, s * r, z];
    const seg = [[0.5, -2.3, 0.22], [0.82, -2.95, 0.17], [0.72, -3.6, 0.11], [0.12, -4.0, 0.03]] as const;
    for (let i = 0; i < seg.length - 1; i++) {
      const [r0, z0, w0] = seg[i], [r1, z1, w1] = seg[i + 1];
      const side = (r: number, z: number, w: number): P3[] => [P(r, z), [c * r - s * w, s * r + c * w, z], [c * r + s * w, s * r - c * w, z], P(r - w * 1.4, z)];
      k.add(i % 2 ? 'hull' : 'panel', hull([...side(r0, z0, w0), ...side(r1, z1, w1)]));
    }
  }
  // Four hexagonal nozzles in a square in a heavy engine block.
  k.add('panel', hex(1.0, 0.4), [0, 0, 2.9]);
  for (const x of [-0.32, 0.32]) for (const y of [-0.32, 0.32]) {
    k.add('panel', new THREE.CylinderGeometry(0.24, 0.28, 0.3, 6).rotateX(Math.PI / 2), [x, y, 3.2]);
    k.add('glow', new THREE.CircleGeometry(0.22, 6), [x, y, 3.36]);
  }
  return k.group;
}

/**
 * Saturn, *Holkas*, the fuel tanker (sheet saturn-holkas): unarmed. A deep, round-bellied black merchant hull with a
 * short blunt bow, painted eyes and a raised curled stern post; its middle one huge indigo fuel bladder bulging out on
 * both sides under five black hoops; four valve towers along the top with amber lights; six black oar fins a side with
 * amber root engines (six: the sheet drew seven or eight); a cabin with amber windows under the stern post; two hose
 * booms folded along the sides ending in lit couplings; two thick amber main drives.
 */
export function buildHolkas(mats: StyleMaterials) {
  const k = new Kit(mats);
  // The hull: a deep round belly, fat in the middle, a blunt bow rising a little, the stern drawn up.
  const prof: [number, number][] = [[0.2, 3.0], [0.62, 2.7], [0.9, 2.0], [1.0, 0.8], [1.0, -0.8], [0.88, -1.9], [0.62, -2.6], [0.3, -2.95], [0, -3.0]];
  k.add('hull', lathe(prof, 32).scale(0.92, 0.85, 1));
  k.add('hull', new THREE.BoxGeometry(1.2, 0.2, 5.6), [0, 0.72, 0.0]); // the deck
  // The bladder: an indigo bulge through the middle, held by five hoops.
  k.add('panel', new THREE.SphereGeometry(1, 28, 18).scale(1.12, 0.95, 2.1), [0, 0.42, 0.1]);
  for (let i = 0; i < 5; i++) {
    const z = -1.4 + i * 0.75;
    const f = Math.sqrt(Math.max(0, 1 - (((z - 0.1) / 2.1) ** 2)));
    k.add('hull', new THREE.TorusGeometry(1, 0.045, 6, 32).scale(1.12 * f + 0.02, 0.95 * f + 0.02, 1), [0, 0.42, z]);
  }
  for (const s of [-1, 1]) eye(k, s, [s * 0.66, 0.15, -2.35], 0.16);
  // Four valve towers along the top, amber lights on their caps.
  for (let i = 0; i < 4; i++) {
    const z = -1.2 + i * 0.8;
    k.add('hull', new THREE.CylinderGeometry(0.07, 0.09, 0.42, 8), [0, 1.45, z]);
    k.add('hull', new THREE.CylinderGeometry(0.13, 0.13, 0.06, 10), [0, 1.67, z]);
    k.add('glow', new THREE.SphereGeometry(0.05, 8, 6), [0, 1.74, z]);
  }
  // The stern post, curling forward over the cabin; the cabin with its amber windows.
  k.add('hull', new THREE.TorusGeometry(0.5, 0.07, 6, 18, Math.PI * 1.15).rotateY(Math.PI / 2).rotateX(-0.2), [0, 1.4, 2.65]);
  k.add('hull', new THREE.BoxGeometry(0.12, 0.8, 0.3), [0, 1.0, 2.85]);
  k.add('hull', new THREE.BoxGeometry(0.6, 0.26, 0.6), [0, 0.95, 2.2]);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.add('glow', new THREE.BoxGeometry(0.01, 0.06, 0.1), [s * 0.305, 0.98, 2.0 + i * 0.18]);
  // Six oar fins a side with amber root engines; only the engines glow.
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    const z = -0.9 + i * 0.4;
    k.add('glow', new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10).rotateZ(Math.PI / 2), [s * 0.95, -0.3, z]);
    const oar = new THREE.BoxGeometry(1.1, 0.025, 0.08).translate(s * 0.55, 0, 0).rotateZ(s * -0.45).rotateY(-s * 0.4);
    k.add('hull', oar, [s * 0.97, -0.3, z]);
  }
  // Two hose booms folded along the sides, couplings lit at their ends.
  for (const s of [-1, 1]) {
    k.add('hull', strut([s * 0.98, 0.62, 1.8], [s * 0.98, 0.62, -1.7], 0.05));
    k.add('panel', zTube(0.09, 0.09, 0.14, 8), [s * 0.98, 0.62, -1.8]);
    k.add('glow', new THREE.SphereGeometry(0.04, 8, 6), [s * 0.98, 0.62, -1.9]);
  }
  // Two thick amber main drives.
  for (const x of [-0.3, 0.3]) {
    k.add('hull', zTube(0.2, 0.24, 0.35, 16), [x, -0.15, 2.95]);
    k.add('glow', new THREE.CircleGeometry(0.19, 16), [x, -0.15, 3.13]);
  }
  return k.group;
}

/** Each nation's special ship: the name races.ts gives it and its builder (pass the nation's style materials). */
export const SPECIALS: Record<NationId, { name: string; build: (m: StyleMaterials) => THREE.Group }> = {
  earth: { name: 'Ark', build: buildArk },
  moon: { name: 'Theoros', build: buildTheoros },
  mercury: { name: 'Skytale', build: buildSkytale },
  venus: { name: 'Siphon', build: buildSiphon },
  mars: { name: 'Testudo', build: buildTestudo },
  jupiter: { name: 'Helepolis', build: buildHelepolis },
  saturn: { name: 'Holkas', build: buildHolkas },
};
