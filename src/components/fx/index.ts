/**
 * The graphics layer of the flight view, in one place so Voyage only needs a few hooks:
 * the painted sky and reflections, light around the ship (engine glow, rim, a coloured fill), engine trails, speed
 * streaks, weapon and explosion effects, and the cinematic post pass. Everything heavy follows Settings → Graphics.
 */
import * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createSky } from './sky';
import { createEffects, spawnTrail } from './effects';
import { createCinematic } from './post';
import { createStreaks } from './streaks';
import { Ribbon } from './ribbon';
import { fxQuality } from './quality';

export { spawnImpact, spawnExplosion, spawnTrail, spawnShieldHit, spawnMuzzle, fxStats } from './effects';
export { fxQuality } from './quality';

/** Galactic north pole and centre in this scene (y up): lon 180.0°, lat +29.8° and lon 266.8°, lat −5.5°. */
const eclDir = (lonDeg: number, latDeg: number) => {
  const l = (lonDeg * Math.PI) / 180;
  const b = (latDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(b) * Math.cos(l), Math.sin(b), -Math.cos(b) * Math.sin(l));
};

export interface GraphicsInput {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  shipObj: THREE.Object3D;
  /** Engine nozzle positions in the ship model's own units. */
  nozzles: THREE.Vector3[];
  shipScale: number;
}

export interface FrameState {
  dt: number;
  time: number;
  camera: THREE.PerspectiveCamera;
  high: boolean;
  shipVel: THREE.Vector3;
  thrust: number; // 0..1
  boosting: boolean;
  /** Every body (nav DestGeo): the Sun lights the flare, the rest can hide it. */
  bodies: readonly { id: string; pos: readonly [number, number, number]; size: number }[];
  /** False while inside a body or going in: trails are cleared so they do not streak across a jump. */
  flying: boolean;
}

export function createGraphics(g: GraphicsInput) {
  const { renderer, scene, composer, bloom, shipObj, nozzles, shipScale } = g;
  const sky = createSky(renderer, eclDir(180.0, 29.8), eclDir(266.8, -5.5));
  scene.background = sky.background;
  scene.backgroundIntensity = 1;
  const prevEnv = scene.environment;
  scene.environment = sky.environment;

  // Bloom tuned for HDR: only what is genuinely bright glows, but it glows wide.
  bloom.strength = 0.85;
  bloom.radius = 0.6;
  bloom.threshold = 0.95;
  renderer.toneMappingExposure = 1.0;

  const cine = createCinematic();
  const outIdx = composer.passes.findIndex((p) => p instanceof OutputPass);
  composer.insertPass(cine.pass, outIdx >= 0 ? outIdx : composer.passes.length);

  const fx = createEffects(scene);
  const streaks = createStreaks(scene, shipScale);

  // Light on the ship: an engine glow at the tail, and a cool rim from behind it as the camera sees it.
  const engineLight = new THREE.PointLight(0x7aa8ff, 0, shipScale * 4, 2);
  engineLight.position.set(0, 0.0, 2.8);
  shipObj.add(engineLight);
  const rim = new THREE.DirectionalLight(0xa8b8ff, 0.35);
  scene.add(rim, rim.target);

  // Engine trails: one ion ribbon per nozzle.
  const ribbons = nozzles.map(() => new Ribbon(48, shipScale * 0.09, 0.35, new THREE.Color(0.35, 0.6, 1.6)));
  for (const r of ribbons) scene.add(r.mesh);
  const nz = new THREE.Vector3();
  const back = new THREE.Vector3();
  let lastNozzle: THREE.Vector3[] = [];
  let wasFlying = true;
  let bodiesSeen: FrameState['bodies'] | null = null;
  let sun: { pos: THREE.Vector3; size: number } | null = null;
  let blockers: { pos: THREE.Vector3; size: number }[] = [];

  return {
    /** World-position uniforms the render origin rebases during the draw (space/origin.ts). */
    worldUniforms: [...streaks.worldUniforms],
    update(f: FrameState) {
      fxQuality.high = f.high;
      fx.update(f.dt, f.time);
      streaks.update(f.camera.position, f.shipVel, f.boosting);

      const thrust = f.thrust * (f.boosting ? 1.3 : 1);
      engineLight.intensity = (0.01 + thrust * 0.035) * (shipScale / 0.18) ** 2;
      engineLight.color.setRGB(0.45 + thrust * 0.2, 0.65 + thrust * 0.1, 1.0);

      back.subVectors(shipObj.position, f.camera.position).normalize();
      rim.position.copy(shipObj.position).addScaledVector(back, 10).add(new THREE.Vector3(0, -2, 0));
      rim.target.position.copy(shipObj.position);

      // Trails follow the nozzles in the world; they vanish when the engines are idle.
      if (!f.flying && wasFlying) { for (const r of ribbons) r.reset(); lastNozzle = []; }
      wasFlying = f.flying;
      const speed = f.shipVel.length();
      nozzles.forEach((n, i) => {
        shipObj.localToWorld(nz.copy(n));
        const r = ribbons[i];
        r.width = shipScale * (0.06 + thrust * 0.05);
        r.life = 0.12 + Math.min(0.35, speed * 0.01) + (f.boosting ? 0.15 : 0);
        r.fade = THREE.MathUtils.smoothstep(thrust, 0.2, 0.8);
        r.maxJump = Math.max(shipScale * 6, speed * f.dt * 4);
        r.near = shipScale * 5;
        r.update(nz, f.time, f.camera.position);
        // Ion sparks at the nozzles, only for the last stretch behind them: at speed a frame's whole path would put
        // particles between the camera and the ship.
        if (f.boosting && f.high && f.flying && lastNozzle[i]) {
          const from = lastNozzle[i].distanceTo(nz) > shipScale * 1.5 ? nz.clone().lerp(lastNozzle[i], (shipScale * 1.5) / lastNozzle[i].distanceTo(nz)) : lastNozzle[i];
          spawnTrail(from, nz, { style: 'ion', scale: shipScale * 0.6 });
        }
        lastNozzle[i] = nz.clone();
      });

      if (f.bodies !== bodiesSeen) {
        bodiesSeen = f.bodies;
        const all = f.bodies.filter((b) => b.size > 0).map((b) => ({ id: b.id, pos: new THREE.Vector3(...b.pos), size: b.size }));
        sun = all.find((b) => b.id === 'sun') ?? null;
        blockers = all.filter((b) => b.id !== 'sun');
      }
      cine.update(f.camera, sun, blockers, f.boosting && f.flying ? 1 : 0, f.time);
    },
    dispose() {
      fx.dispose();
      streaks.dispose();
      for (const r of ribbons) { scene.remove(r.mesh); r.dispose(); }
      shipObj.remove(engineLight);
      scene.remove(rim, rim.target);
      scene.environment = prevEnv;
      scene.background = null;
      sky.dispose();
    },
  };
}

export type Graphics = ReturnType<typeof createGraphics>;
