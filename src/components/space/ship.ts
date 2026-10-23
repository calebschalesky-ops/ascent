import * as THREE from 'three';
import type { SpaceUniforms } from './materials';
import { plumeMaterial } from './materials';

export interface Ship {
  group: THREE.Group;
  /** Engine nozzle exits, in the model's own units (for exhaust trails and engine light). */
  nozzles: THREE.Vector3[];
  /** thrust 0..1 */
  update: (dt: number, thrust: number, time: number) => void;
}

/** The model's length from nose to nozzles, in its own units (the exhaust not counted). */
export const SHIP_MODEL_LENGTH = 2.06; // nose at z −1.02, nozzles at 1.04

/**
 * A brass courier: lathed hull, glass canopy, swept wings, twin engines with live exhaust and navigation lights.
 * `hull` repaints the brass (a nation's cruisers fly this same ship in its colour); the player's stays brass.
 * Exhaust and lights are tagged `userData.keep` so a copy can merge the rest into a few meshes.
 */
export function buildShip(u: SpaceUniforms, look: { hull?: THREE.ColorRepresentation } = {}): Ship {
  const group = new THREE.Group();
  const brass = new THREE.MeshPhysicalMaterial({ color: look.hull ?? 0xc9a14a, metalness: 1, roughness: 0.52, clearcoat: 0.15, clearcoatRoughness: 0.4, envMapIntensity: 1.6 });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x3a3f48, metalness: 0.9, roughness: 0.38, envMapIntensity: 1.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1e3a, metalness: 0, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.2 });

  // Hull: a lathed profile, nose forward (-Z), slightly flattened.
  const profile = [
    [0.0, -0.95], [0.16, -0.92], [0.22, -0.8], [0.27, -0.4], [0.29, 0.0], [0.26, 0.35], [0.19, 0.65], [0.1, 0.88], [0.0, 1.02],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const hullGeo = new THREE.LatheGeometry(profile, 32);
  hullGeo.rotateX(-Math.PI / 2);
  hullGeo.scale(1, 0.72, 1);
  group.add(new THREE.Mesh(hullGeo, brass));

  // Panel line around the hull.
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.012, 6, 40), steel);
  band.scale.set(1, 0.72, 1);
  band.position.z = 0.05;
  group.add(band);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16), glass);
  canopy.scale.set(0.95, 0.7, 2.1);
  canopy.position.set(0, 0.13, -0.28);
  group.add(canopy);

  // Swept wings, one shape per side so the normals stay right.
  const wing = (side: number) => {
    const s = new THREE.Shape();
    s.moveTo(0.2 * side, 0.3);
    s.lineTo(1.2 * side, 0.68);
    s.lineTo(1.28 * side, 0.86);
    s.lineTo(0.24 * side, 0.78);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, brass);
    m.position.y = 0.02;
    return m;
  };
  group.add(wing(1), wing(-1));

  // Engines.
  const nozzles: THREE.Vector3[] = [];
  for (const side of [1, -1]) {
    const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.72, 20), steel);
    nac.rotation.x = Math.PI / 2;
    nac.position.set(0.42 * side, -0.02, 0.55);
    group.add(nac);
    const intake = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 20), brass);
    intake.position.set(0.42 * side, -0.02, 0.19);
    group.add(intake);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.14, 20, 1, true), steel);
    bell.rotation.x = Math.PI / 2;
    bell.position.set(0.42 * side, -0.02, 0.97);
    group.add(bell);
    nozzles.push(new THREE.Vector3(0.42 * side, -0.02, 1.04));
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, 0.34), brass);
    fin.position.set(0.13 * side, 0.2, 0.74);
    fin.rotation.z = -0.38 * side;
    group.add(fin);
  }

  // Exhaust: glowing nozzle discs and plumes that lengthen with thrust.
  const plumeMat = plumeMaterial(u);
  const discMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.35, 1.0) });
  const plumes: THREE.Mesh[] = [];
  const plumeGeo = new THREE.ConeGeometry(0.1, 1.6, 20, 1, true);
  plumeGeo.translate(0, 0.8, 0);
  for (const n of nozzles) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.095, 20), discMat);
    disc.position.copy(n);
    group.add(disc);
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.copy(n);
    plume.rotation.x = Math.PI / 2;
    plume.userData = { keep: true, exhaust: true };
    group.add(plume);
    plumes.push(plume);
  }

  // Navigation lights: red port, green starboard, white tail.
  const light = (color: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    m.userData.keep = true;
    group.add(m);
    return m;
  };
  const port = light(0xff2030, -1.27, 0.02, 0.8);
  const star = light(0x20ff60, 1.27, 0.02, 0.8);
  const tail = light(0xffffff, 0, 0.36, 0.86);
  const navColors = [new THREE.Color(0xff2030).multiplyScalar(6), new THREE.Color(0x20ff60).multiplyScalar(6), new THREE.Color(0xffffff).multiplyScalar(2.5)];

  let level = 0;
  return {
    group,
    nozzles: nozzles.map((n) => n.clone().setZ(n.z + 0.08)),
    update(dt, thrust, time) {
      level += (thrust - level) * Math.min(1, dt * 5);
      plumeMat.uniforms.uThrust.value = 0.06 + level * 0.55;
      for (const p of plumes) p.scale.set(1 + level * 0.15, 0.35 + level * 1.2, 1 + level * 0.15);
      discMat.color.setRGB(0.12 + level * 0.6, 0.25 + level * 0.9, 0.7 + level * 1.6);
      const blink = (time % 1.2) < 0.08;
      const strobe = (time % 1.7) < 0.05;
      (port.material as THREE.MeshBasicMaterial).color.copy(navColors[0]).multiplyScalar(blink ? 1 : 0.15);
      (star.material as THREE.MeshBasicMaterial).color.copy(navColors[1]).multiplyScalar(blink ? 1 : 0.15);
      (tail.material as THREE.MeshBasicMaterial).color.copy(navColors[2]).multiplyScalar(strobe ? 1 : 0.05);
    },
  };
}
