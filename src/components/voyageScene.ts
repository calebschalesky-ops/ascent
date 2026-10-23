import * as THREE from 'three';
import { COLOR, PLANET_NAME, PLANET_ORDER } from '../lib/bodies';
import type { PlanetId } from '../lib/bodies';
import { LABEL_FONT, circleLine, textSprite } from './three-helpers';
import type { Dest } from '../lib/nav';
import type { SpaceUniforms, SurfaceKind } from './space/materials';
import { cloudMaterial, crystalMaterial, ringMaterial, starField, surfaceMaterial, withLogDepth } from './space/materials';
import { ATMO, atmosphereShell } from './fx/atmosphere';
import { corona } from './fx/sun';

import { BODY, COSMOS, VR, destGeometry } from '../lib/nav';
export { BODY, LIMIT, VR, zoneOf } from '../lib/nav';

/** Axial tilt (degrees) and a display spin rate (rad/s; negative = retrograde, as Venus turns). */
const SPIN: Record<PlanetId | 'earth', [number, number]> = {
  moon: [6.7, 0.004], mercury: [0.03, 0.006], venus: [177.4, -0.003], sun: [7.25, 0.012],
  mars: [25.2, 0.05], jupiter: [3.1, 0.12], saturn: [26.7, 0.11], earth: [23.44, 0.05],
};

const mobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
/** Segments round a body's sphere when you are close to it (its horizon stays round to under a pixel). */
const NEAR_SEGS = mobile ? 256 : 384;
const geoCache = new Map<string, THREE.SphereGeometry>();
/** Past this many radii a body is under about two pixels across: its sphere is not drawn and a beacon shows it. */
const FAR_RADII = 700;
/**
 * Radius of the sky sphere that rides with the camera (stars, beacons): past where you park at any body, or the stars
 * draw over it. 1e6 until ships went ×5 smaller (2026-10-21); in COSMOS, so it follows the world's scale.
 */
const SKY_R = 170 * COSMOS;
/** Vertices in an orbit's near arc. */
const ARC = 65;
const tmp = new THREE.Vector3();
const sphereGeo = (r: number, seg: number) => {
  const k = `${r}:${seg}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.SphereGeometry(r, seg, seg / 2));
  return geoCache.get(k)!;
};

/** arrive: distance that counts as arriving; stop: where autopilot parks. */
export interface Target { id: Dest; pos: THREE.Vector3; arrive: number; stop: number; size: number }

export function glowTexture(inner = '#fff6d0', outer = 'rgba(255,200,80,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const gr = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.12, 'rgba(255,230,170,.75)');
  gr.addColorStop(0.35, 'rgba(255,190,90,.18)');
  gr.addColorStop(1, outer);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface VoyageWorld {
  targets: Target[];
  pickables: THREE.Object3D[];
  /** Each body's spinning object, surface material and radius, for the planet-side views (components/planet). */
  frames: Map<string, BodyFrame>;
  /** The stars, the Milky Way and the edge's light: the sky inside an atmosphere dims them. */
  sky: THREE.Object3D[];
  /** Each atmosphere's scattering shell (graphics), tagged userData.airBody; hidden while flying inside that air. */
  airShells: THREE.Object3D[];
  update: (dt: number, time: number, camera: THREE.Camera) => void;
  /** A body's frames (conquest hangs sites on them): its tilted equator, and inside it the surface that turns. */
  bodyFrame: (id: string) => BodyFrame | undefined;
  dispose: () => void;
}
/** A body's frames: conquest hangs sites on tilt/spin; atmo-flight reads the spin's LOD, surface material and radius. */
export interface BodyFrame { tilt: THREE.Object3D; spin: THREE.Object3D; surface: THREE.Material | null; radius: number }

/** The cosmos: each planet sits on its own ring at its fixed angle (bodies.ts LAYOUT). */
export function buildVoyageScene(scene: THREE.Scene, u: SpaceUniforms): VoyageWorld {
  const textures: THREE.Texture[] = [];
  const pickables: THREE.Object3D[] = [];
  const targets: Target[] = [];
  const holders = new Map<PlanetId, THREE.Group>();
  const spinning: [THREE.Object3D, number][] = [];
  const frames: VoyageWorld['frames'] = new Map();
  const sky: THREE.Object3D[] = [];
  const airShells: THREE.Object3D[] = []; // graphics' scattering shells, seen from space; atmo-flight's dome takes over inside
  // The planets' ring lines. Seen edge-on, from anywhere near the plane they lie in, all seven stack into one bundle of
  // coloured stripes across the frame; they fade as the view flattens and come back as you climb above the plane.
  const rings: { line: THREE.LineLoop; R: number; base: number }[] = [];

  // Fill light for the ships, coloured like the sky around them: cool above, a warm violet below.
  scene.add(new THREE.AmbientLight(0x6070a8, 0.08));
  scene.add(new THREE.HemisphereLight(0x8f9ce8, 0x5a2c50, 1.0));
  const sunLight = new THREE.PointLight(0xfff1d6, 1.6, 0, 0);
  scene.add(sunLight);

  /**
   * A sphere in three levels of detail by distance from its centre: fine enough close up that the horizon of a body
   * a thousand ship lengths across stays round, coarse far off. Returns the LOD and its middle mesh (for picking).
   */
  const sphere = (radius: number, mat: THREE.Material, near = NEAR_SEGS) => {
    const lod = new THREE.LOD();
    const levels: [number, number][] = [[near, 0], [96, radius * 4], [32, radius * 30]];
    const meshes = levels.map(([seg, at]) => {
      const m = new THREE.Mesh(sphereGeo(radius, seg), mat);
      lod.addLevel(m, at);
      return m;
    });
    lod.addLevel(new THREE.Object3D(), radius * FAR_RADII); // under two pixels across: not drawn, its beacon shows it
    return { lod, mesh: meshes[1] };
  };
  const body = (kind: SurfaceKind | 'earth', radius: number) => {
    const [tilt, rate] = SPIN[kind];
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.z = (tilt * Math.PI) / 180;
    const { lod, mesh } = sphere(radius, surfaceMaterial(kind, u));
    tiltGroup.add(lod);
    spinning.push([lod, rate]);
    frames.set(kind, { tilt: tiltGroup, spin: lod, surface: mesh.material as THREE.Material, radius });
    return { tiltGroup, mesh };
  };

  // Earth at the centre, with clouds and air.
  {
    const { tiltGroup, mesh } = body('earth', VR.earth);
    mesh.userData.dest = 'earth';
    pickables.push(mesh);
    const clouds = sphere(VR.earth * 1.012, cloudMaterial(u)).lod;
    tiltGroup.add(clouds);
    spinning.push([clouds, 0.058]);
    { const shell = atmosphereShell(VR.earth, ATMO.earth, u); shell.userData.airBody = 'earth'; airShells.push(shell); tiltGroup.add(shell); }
    scene.add(tiltGroup);
    const label = textSprite('EARTH', LABEL_FONT, '#dfe9ff', 0.022, true);
    label.center.set(0.5, -0.2);
    label.position.set(0, VR.earth * 1.05, 0);
    scene.add(label);
  }

  // Three crystal shells around Earth: scenery, unlabelled.
  ([[VR.water, 0x6c9cd0], [VR.air, 0xd8dce8], [VR.fire, 0xff8a3c]] as const).forEach(([r, col]) => {
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(r, 96, 48), crystalMaterial(col, 0.045, 0.0002)));
    scene.add(circleLine(r, col, 0.12, 256));
  });

  // The bodies, and each one's true orbit as a hairline: the planets' round the Sun, the Moon's round Earth, and in the
  // Sun's colour Earth's own path round it. Until real scale these were seven crystal rings round Earth.
  const geo = destGeometry();
  const posOf = (id: string) => new THREE.Vector3(...geo.find((g) => g.id === id)!.pos);
  const sunPos = posOf('sun');
  const orbits: { centre: THREE.Vector3; r: number; arc: THREE.Line; buf: THREE.BufferAttribute }[] = [];
  const ATMOS: Partial<Record<PlanetId, keyof typeof ATMO>> = { venus: 'venus', mars: 'mars', jupiter: 'jupiter', saturn: 'saturn' };
  const far: { obj: THREE.Object3D; at: THREE.Vector3; size: number }[] = [];
  for (const p of PLANET_ORDER) {
    const col = COLOR[p];
    const at = posOf(p);
    {
      // Earth's orbit stands in for the Sun's ring; the Moon's is round Earth.
      const centre = p === 'moon' ? new THREE.Vector3() : sunPos.clone();
      const r = p === 'sun' ? sunPos.length() : at.distanceTo(centre);
      const line = circleLine(r, new THREE.Color(col).multiplyScalar(1.4), 0.55, 2048);
      line.position.copy(centre);
      scene.add(line);
      // Near an orbit, its stretch beside you is redrawn each frame from a point on it, so it holds still (origin.ts).
      const buf = new THREE.BufferAttribute(new Float32Array(ARC * 3), 3);
      const arc = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', buf), line.material as THREE.Material);
      arc.frustumCulled = false;
      arc.visible = false;
      scene.add(arc);
      orbits.push({ centre, r, arc, buf });
    }

    const size = BODY[p];
    const holder = new THREE.Group();
    holder.position.copy(at);
    scene.add(holder);
    holders.set(p, holder);

    const { tiltGroup, mesh } = body(p, size);
    mesh.userData.dest = p;
    pickables.push(mesh);
    holder.add(tiltGroup);
    far.push({ obj: tiltGroup, at, size });

    if (p === 'sun') {
      for (const [scale, op] of [[3.2, 0.5], [6.5, 0.06]] as const) {
        const tex = glowTexture();
        textures.push(tex);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(1.1, 0.95, 0.75), transparent: true, opacity: op * 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.scale.set(size * scale, size * scale, 1);
        holder.add(glow);
      }
      holder.add(corona(size, u));
    }
    const atmo = ATMOS[p];
    if (atmo) { const shell = atmosphereShell(size, ATMO[atmo], u); shell.userData.airBody = p; airShells.push(shell); tiltGroup.add(shell); }
    if (p === 'saturn') {
      const inner = size * 1.24;
      const outer = size * 2.27;
      const rings = new THREE.Mesh(new THREE.RingGeometry(inner, outer, NEAR_SEGS * 2, 1), ringMaterial(inner, outer, size, u));
      rings.rotation.x = Math.PI / 2; // in Saturn's equatorial plane
      tiltGroup.add(rings);
    }

    const name = textSprite(PLANET_NAME[p].toUpperCase(), LABEL_FONT, '#ffffff', 0.02, true);
    name.center.set(0.5, -0.3);
    name.position.set(0, size * 1.05, 0);
    name.userData.dest = p;
    holder.add(name);
    pickables.push(name);
  }

  // The stars of every colour, on a sphere that rides with the camera: they are at infinity, and a sphere 3e9 units
  // across would put every star billions of units from the origin. The Milky Way is painted into the sky (fx/sky.ts).
  const skyRig = new THREE.Group();
  scene.add(skyRig);
  {
    const stars = starField(SKY_R, 9000, u);
    skyRig.add(stars);
    sky.push(stars);
  }

  // Beacons: every body too far to be a disc is a point of its own colour, so the sky still shows where it is.
  const beaconIds: PlanetId[] = PLANET_ORDER;
  const beaconPos = new THREE.BufferAttribute(new Float32Array(beaconIds.length * 3), 3);
  const beaconCol = new THREE.BufferAttribute(new Float32Array(beaconIds.length * 3), 3);
  beaconIds.forEach((p, i) => { const c = new THREE.Color(COLOR[p]).lerp(new THREE.Color(1, 1, 1), 0.55); if (p === 'sun') c.setRGB(1.6, 1.4, 1.0); beaconCol.setXYZ(i, c.r, c.g, c.b); });
  const beacons = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', beaconPos).setAttribute('color', beaconCol),
    new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }),
  );
  beacons.frustumCulled = false;
  skyRig.add(beacons);

  // The edge: light at the rim of everything. Scenery, unlabelled.
  {
    const mat = withLogDepth(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV;
        void main(){ float f = clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0); gl_FragColor = vec4(vec3(1.0, 0.78, 0.55) * pow(f, 7.0) * 0.6, 1.0); }`,
    }));
    const rim = new THREE.Mesh(new THREE.SphereGeometry(VR.edge, 96, 48), mat);
    rim.position.copy(sunPos); // the edge is a sphere round the Sun
    scene.add(rim);
    sky.push(rim);
  }

  // Where each destination sits, arrives and parks comes from the navigation maths, so the two never disagree.
  for (const d of geo) targets.push({ id: d.id, pos: new THREE.Vector3(...d.pos), arrive: d.arrive, stop: d.stop, size: d.size });

  // Dust drifting past the ship, so speed is felt. Ship-sized, not cosmos-sized: it is what you fly through.
  // Drawn relative to the camera: the wrap is worked out on the CPU in double precision, so it stays steady far out.
  const dust = (() => {
    const n = 900;
    const box = 16;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pos[i] = Math.random() * box;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = withLogDepth(new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uBox: { value: box }, uPR: { value: Math.min(window.devicePixelRatio || 1, 2) } },
      vertexShader: /* glsl */ `
        uniform vec3 uCam; uniform float uBox; uniform float uPR; // uCam: the camera's position, modulo the box
        varying float vA;
        void main(){
          vec3 p = mod(position - uCam, uBox) - uBox * 0.5; // from the camera
          vec4 mv = vec4(mat3(viewMatrix) * p, 1.0);
          float d = -mv.z;
          vA = smoothstep(uBox * 0.5, uBox * 0.15, d) * smoothstep(0.5, 3.0, d);
          gl_PointSize = 1.6 * uPR;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vec3(0.7, 0.75, 0.9) * (1.0 - r) * vA * 0.5, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return mat;
  })();

  function update(dt: number, time: number, camera: THREE.Camera) {
    u.uTime.value = time;
    const sun = holders.get('sun')!;
    u.uSun.value.copy(sun.position);
    sunLight.position.copy(sun.position);
    for (const [o, rate] of spinning) o.rotation.y += rate * dt;
    // The sky rides with the camera; beacons along each far body's direction.
    skyRig.position.copy(camera.position);
    beaconIds.forEach((p, i) => {
      const h = holders.get(p)!;
      tmp.copy(h.position).sub(camera.position);
      const d = tmp.length();
      const hide = d < BODY[p] * FAR_RADII * 0.9; // the disc is drawn: no beacon on top of it
      tmp.multiplyScalar(hide ? 0 : SKY_R * 0.98 / d);
      beaconPos.setXYZ(i, tmp.x, tmp.y, tmp.z);
    });
    beaconPos.needsUpdate = true;
    for (const f of far) f.obj.visible = camera.position.distanceTo(f.at) < f.size * FAR_RADII;
    for (const o of orbits) {
      // The point on the orbit nearest the camera; near it, a short arc drawn from there, in doubles.
      tmp.copy(camera.position).sub(o.centre).setY(0);
      const gap = Math.hypot(tmp.length() - o.r, camera.position.y - o.centre.y);
      o.arc.visible = gap < o.r * 0.01;
      if (!o.arc.visible) continue;
      const a0 = Math.atan2(tmp.z, tmp.x);
      const span = Math.min(0.2, Math.max(1e-5, (gap * 6) / o.r));
      o.arc.position.set(o.centre.x + o.r * Math.cos(a0), o.centre.y, o.centre.z + o.r * Math.sin(a0));
      for (let i = 0; i < ARC; i++) {
        const a = a0 + span * ((i / (ARC - 1)) * 2 - 1);
        o.buf.setXYZ(i, o.centre.x + o.r * Math.cos(a) - o.arc.position.x, 0, o.centre.z + o.r * Math.sin(a) - o.arc.position.z);
      }
      o.buf.needsUpdate = true;
    }
    const b = dust.uniforms.uBox.value as number;
    const m = (v: number) => ((v % b) + b) % b;
    dust.uniforms.uCam.value.set(m(camera.position.x), m(camera.position.y), m(camera.position.z));
    const c = camera.position;
    const rho = Math.hypot(c.x, c.z);
    for (const r of rings) {
      const sinEl = Math.abs(c.y) / Math.max(1e-6, Math.hypot(rho - r.R, c.y)); // the ring's nearest stretch, seen from how high
      (r.line.material as THREE.LineBasicMaterial).opacity = r.base * (0.12 + 0.88 * THREE.MathUtils.smoothstep(sinEl, 0.03, 0.3));
    }
  }

  return {
    targets,
    pickables,
    frames,
    sky,
    airShells,
    update,
    bodyFrame: (id: string) => frames.get(id),
    dispose: () => textures.forEach((t) => t.dispose()),
  };
}
