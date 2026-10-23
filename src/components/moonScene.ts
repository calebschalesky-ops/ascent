/**
 * The moons in the scene. Major moons (the destinations) are full bodies with names; the hundreds of small ones are
 * one instanced mesh of rocks, true to scale, plus a cloud of points per planet so they can be seen at all, which keeps
 * a phone to four draw calls for all of them. Placement and sizes come from lib/moons.ts.
 */
import * as THREE from 'three';
import type { DestGeo } from '../lib/nav';
import { MOON_TINT, isMajorMoon, moonById } from '../lib/moons';
import { allMoons } from '../lib/world';
import type { MajorMoonId } from '../lib/moons';
import type { SpaceUniforms } from './space/materials';
import { moonletMaterial } from './space/materials';
import { LABEL_FONT, textSprite } from './three-helpers';
import type { Target } from './voyageScene';

export interface MoonLayer {
  targets: Target[];
  pickables: THREE.Object3D[];
  update: (dt: number, time: number, camera: THREE.Camera) => void;
}

/**
 * Each major moon's look for the shared surface shader: style (0 cratered, 1 Io, 2 Europa, 3 Titan, 4 Enceladus,
 * 5 Iapetus, 6 Ganymede) and three colours, picked from the spacecraft mosaics so each one is recognisable.
 */
const LOOK: Record<MajorMoonId, [number, string, string, string]> = {
  io: [1, '#f1d860', '#d99a3a', '#b8452a'],
  europa: [2, '#efe6d6', '#d8c9b0', '#9a5a3c'],
  ganymede: [6, '#b9ab98', '#6c5f52', '#e8e6ea'],
  callisto: [0, '#5f5446', '#3c342b', '#d9d2c4'],
  mimas: [0, '#cfcbc4', '#a9a49c', '#f2f0ec'],
  enceladus: [4, '#f7f9fc', '#e3ebf2', '#5fa6d8'],
  tethys: [0, '#e2ded6', '#bdb8ae', '#ffffff'],
  dione: [0, '#d6d2ca', '#9e988e', '#f6f4ef'],
  rhea: [0, '#c9c4bb', '#958f85', '#f4f2ee'],
  titan: [3, '#e0a14a', '#a9662a', '#7fa6c8'],
  iapetus: [5, '#ece6da', '#2b2219', '#5a4a38'],
};

export function buildMoons(scene: THREE.Scene, geo: DestGeo[], u?: SpaceUniforms): MoonLayer {
  const targets: Target[] = [];
  const pickables: THREE.Object3D[] = [];
  const labels: { sprite: THREE.Sprite; pos: THREE.Vector3; range: number }[] = [];
  const spinning: THREE.Mesh[] = [];
  const planetOf = (id: string) => geo.find((g) => g.id === id)!;

  for (const g of geo.filter((x) => x.kind === 'moon')) {
    const m = moonById(g.id)!;
    const planet = planetOf(m.planet);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(g.size, 96, 48),
      isMajorMoon(g.id) && u
        ? moonletMaterial(LOOK[g.id][0], LOOK[g.id][1], LOOK[g.id][2], LOOK[g.id][3], (g.id.charCodeAt(0) * 7.3 + g.id.length * 3.1) % 50, u)
        : new THREE.MeshStandardMaterial({ color: isMajorMoon(g.id) ? MOON_TINT[g.id] : 0x999999, roughness: 0.95, metalness: 0 }),
    );
    mesh.position.set(...g.pos);
    mesh.userData.dest = g.id;
    scene.add(mesh);
    pickables.push(mesh);
    spinning.push(mesh);
    const name = textSprite(m.name.toUpperCase(), LABEL_FONT, '#dfe9ff', 0.016, true);
    name.center.set(0.5, -0.3);
    name.position.set(g.pos[0], g.pos[1] + g.size * 1.05, g.pos[2]);
    name.userData.dest = g.id;
    scene.add(name);
    pickables.push(name);
    // Names show near the planet only, so from afar they do not pile up on the planet's own name.
    labels.push({ sprite: name, pos: mesh.position.clone(), range: planet.size * 12 });
    targets.push({ id: g.id, pos: mesh.position.clone(), arrive: g.arrive, stop: g.stop, size: g.size });
  }

  // The small moons: rocks at their true size, and a point each so they show.
  const minor = allMoons(geo).filter((pm) => !isMajorMoon(pm.moon.id));
  const rock = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1, flatShading: true });
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  // One instanced mesh per planet, sitting at the planet's centre: each rock is an offset from it (space/origin.ts).
  for (const p of ['earth', 'mars', 'jupiter', 'saturn'] as const) {
    const mine = minor.filter((pm) => pm.moon.planet === p);
    if (!mine.length) continue;
    const at = planetOf(p).pos;
    const rocks = new THREE.InstancedMesh(rock, rockMat, mine.length);
    rocks.position.set(...at);
    mine.forEach((pm, i) => {
      q.setFromEuler(new THREE.Euler(pm.moon.code * 0.37, pm.moon.code * 1.13, pm.moon.code * 0.71)); // a fixed tumble each
      mtx.compose(new THREE.Vector3(pm.pos[0] - at[0], pm.pos[1] - at[1], pm.pos[2] - at[2]), q, new THREE.Vector3(pm.size, pm.size * 0.8, pm.size * 0.65));
      rocks.setMatrixAt(i, mtx);
    });
    rocks.computeBoundingSphere();
    scene.add(rocks);
  }
  // One cloud of points per planet, shown only near that planet, where a field of specks reads as moons rather than noise.
  const dotMat = new THREE.PointsMaterial({ color: 0xb8ae9a, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.75, depthWrite: false });
  const fields = (['mars', 'jupiter', 'saturn'] as const).map((p) => {
    const mine = minor.filter((pm) => pm.moon.planet === p);
    const g = new THREE.BufferGeometry();
    const at = planetOf(p).pos;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mine.flatMap((pm) => [pm.pos[0] - at[0], pm.pos[1] - at[1], pm.pos[2] - at[2]])), 3));
    const dots = new THREE.Points(g, dotMat);
    dots.position.set(...at);
    scene.add(dots);
    return { dots, pos: new THREE.Vector3(...planetOf(p).pos), range: planetOf(p).size * 16 + 40 };
  });

  const camPos = new THREE.Vector3();
  return {
    targets,
    pickables,
    update: (dt, _time, camera) => {
      camPos.copy(camera.position);
      for (const l of labels) l.sprite.visible = camPos.distanceTo(l.pos) < l.range;
      for (const f of fields) f.dots.visible = camPos.distanceTo(f.pos) < f.range;
      for (const m of spinning) m.rotation.y += dt * 0.01;
    },
  };
}
