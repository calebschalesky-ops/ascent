/**
 * The player's first ship: their nation's own cruiser (ART-DIRECTION.md, styles/), painted with the trim and hull
 * finish chosen in the opening, fitted to the length the flight expects (ship.ts SHIP_MODEL_LENGTH), with engine
 * plumes in the nation's engine colour that grow with thrust. Used by the hangar view and in flight.
 */
import * as THREE from 'three';
import type { NationId } from '../../lib/nations';
import type { ShipLook } from '../../lib/opening/profile';
import { SHIP_FINISHES, shipTrims } from '../../lib/opening/profile';
import type { Loadout } from '../../lib/modules';
import type { MunitionId } from '../../lib/munitions';
import type { Hardpoints } from './hardpoints';
import { buildHardpoints } from './hardpoints';
import type { Ship } from './ship';
import { SHIP_MODEL_LENGTH } from './ship';
import type { StyleMaterials } from './styles';
import { STYLES } from './styles';
import { withLogDepth } from './materials';

/** The nation's style materials with the chosen trim and finish. */
export function pilotMaterials(nation: NationId, look: Pick<ShipLook, 'trim' | 'finish'>): StyleMaterials {
  const trims = shipTrims(nation);
  const mats = STYLES[nation].materials(trims[look.trim]?.value ?? trims[0].value);
  const tone = SHIP_FINISHES[look.finish]?.tone ?? 0;
  for (const role of ['hull', 'panel'] as const) {
    const m = mats[role] as THREE.MeshStandardMaterial;
    if (tone > 0) m.color.lerp(new THREE.Color(1, 1, 1), tone);
    else if (tone < 0) m.color.multiplyScalar(1 + tone);
    if (tone > 0) m.roughness = Math.max(0.12, m.roughness - 0.15);
  }
  return mats;
}

function plumeMat(color: THREE.Color) {
  return withLogDepth(new THREE.ShaderMaterial({
    uniforms: { uThrust: { value: 0 }, uTime: { value: 0 }, uColor: { value: color } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uThrust; uniform float uTime; uniform vec3 uColor;
      varying vec2 vUv;
      void main(){
        float along = 1.0 - vUv.y;
        float flick = 0.85 + 0.15 * sin(uTime * 60.0 + along * 20.0);
        float a = pow(clamp(along, 0.0, 1.0), 1.6) * flick * uThrust;
        vec3 col = mix(uColor * 0.5, vec3(1.0, 0.97, 0.9), pow(clamp(along, 0.0, 1.0), 3.0));
        gl_FragColor = vec4(col * a * 1.1, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
}

/** The player's ship: a Ship that can be refitted, its hardware changing with what is fitted (hardpoints.ts). */
export interface PilotShip extends Ship {
  /** Put the hardware for `loadout` on the hull, replacing what was there. */
  refit: (loadout: Loadout | null) => void;
  /** The selected weapon: its hardware glows brighter. */
  arm: (w: MunitionId | null) => void;
}

/**
 * The cruiser, centred, nose toward −z, fitted to SHIP_MODEL_LENGTH (nose at about −1.02, stern at about +1.04 as the
 * old courier). Engines are the glow parts in the rear fifth of the hull; each gets a plume.
 */
export function buildPilotShip(nation: NationId, look: Pick<ShipLook, 'trim' | 'finish'>, loadout: Loadout | null = null): PilotShip {
  const mats = pilotMaterials(nation, look);
  const model = STYLES[nation].cruiser(mats);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = SHIP_MODEL_LENGTH / Math.max(size.z, 1e-6);
  const centre = box.getCenter(new THREE.Vector3());
  model.position.set(-centre.x * k, -centre.y * k, -centre.z * k);
  model.scale.setScalar(k);
  const group = new THREE.Group();
  group.add(model);

  // Engines: glow meshes whose centre is in the rear fifth, merged when they sit close together.
  const glowMat = mats.glow as THREE.MeshBasicMaterial;
  const baseGlow = glowMat.color.clone();
  const spots: { p: THREE.Vector3; r: number }[] = [];
  model.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(model);
  const rear = fitted.max.z - (fitted.max.z - fitted.min.z) * 0.2;
  for (const c of model.children) {
    const m = c as THREE.Mesh;
    if (m.userData.role !== 'glow') continue;
    const b = new THREE.Box3().setFromObject(m);
    const cz = (b.min.z + b.max.z) / 2;
    if (cz < rear) continue;
    const p = b.getCenter(new THREE.Vector3());
    const r = Math.max(0.04, Math.min(b.max.x - b.min.x, b.max.y - b.min.y) * 0.5);
    const near = spots.find((s) => s.p.distanceTo(p) < Math.max(s.r, r) * 1.5);
    if (near) near.r = Math.max(near.r, r);
    else spots.push({ p: new THREE.Vector3(p.x, p.y, b.max.z), r });
  }
  if (!spots.length) spots.push({ p: new THREE.Vector3(0, 0, SHIP_MODEL_LENGTH / 2), r: 0.12 });
  spots.sort((a, b) => b.r - a.r).splice(6);
  const pm = plumeMat(baseGlow.clone().multiplyScalar(0.7));
  const geo = new THREE.ConeGeometry(1, 1.6, 16, 1, true);
  geo.translate(0, 0.8, 0);
  const plumes = spots.map((s) => {
    const plume = new THREE.Mesh(geo, pm);
    plume.position.copy(s.p);
    plume.rotation.x = Math.PI / 2;
    plume.userData = { keep: true, exhaust: true, r: Math.min(0.16, s.r) };
    group.add(plume);
    return plume;
  });

  // Hardware for the loadout, in the model's own units (so it is fitted to length with the hull).
  const modelNozzles = spots.map((s) => s.p.clone().sub(model.position).divideScalar(k));
  let hw: Hardpoints | null = null;
  let armed: MunitionId | null = null;
  const refit = (l: Loadout | null) => {
    if (hw) { model.remove(hw.group); hw.dispose(); hw = null; }
    if (!l) return;
    const pos = model.position.clone(), sc = model.scale.clone();
    model.position.set(0, 0, 0); model.scale.setScalar(1);
    hw = buildHardpoints(model, nation, l, mats, modelNozzles);
    model.position.copy(pos); model.scale.copy(sc);
    model.add(hw.group);
    armed = l.weapons.includes(armed as MunitionId) ? armed : l.weapons[0] ?? null;
  };
  refit(loadout);

  let level = 0;
  return {
    group,
    nozzles: spots.map((s) => s.p.clone()),
    refit,
    arm(w) { armed = w; },
    update(dt, thrust, time) {
      hw?.update(time, armed);
      level += (thrust - level) * Math.min(1, dt * 5);
      pm.uniforms.uThrust.value = 0.06 + level * 0.55;
      pm.uniforms.uTime.value = time;
      for (const p of plumes) { const r = p.userData.r as number; p.scale.set(r * (1 + level * 0.15), 0.35 + level * 1.2, r * (1 + level * 0.15)); }
      glowMat.color.copy(baseGlow).multiplyScalar(0.75 + level * 0.5);
    },
  };
}
