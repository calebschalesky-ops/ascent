/**
 * The skirmish scene: a battle above Saturn's rings, drawn from model.ts frames only.
 *
 * Saturn, its rings and the stars are the voyage scene's own materials (space/materials.ts, read-only import); the
 * ships are each house's art (space/styles via fleet.ts's styledModel and liven, read-only import), one template per
 * house and class, cloned so every ship shares its geometry and materials. Gunfire is one instanced mesh of tracers
 * and one of flashes, so the whole battle's fire is two draw calls.
 *
 * Nothing here decides anything about the battle; it reads a frame and draws it.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { COLOR } from '../../lib/bodies';
import type { NationId } from '../../lib/nations';
import { peopleOf } from '../../lib/races';
import { liven, modelLength, styledModel } from '../../components/space/fleet';
import { makeSpaceUniforms, ringMaterial, starField, surfaceMaterial } from '../../components/space/materials';
import type { BodyId } from '../sim/index';
import { bodyMaterial, hasRings } from './body'; // PKG-20
import { createWingLayer } from './fighters'; // PKG-25
import type { CameraRig } from './camera';
import { CAM } from './camera';
import type { BattleFrame, ShieldFace, ShipCls, ShipStatus, ShipView, ShotView, V3 } from './model';
import { SHIELD_FACES, underWay } from './model';

/** The scene's tunable numbers (look, not rules). First-pass. */
export const LOOK = {
  saturnRadius: 300,
  /** Rings, in planet radii: as the voyage scene draws them. */
  ringInner: 1.24,
  ringOuter: 2.27,
  /** Saturn's axial tilt, degrees: the battle frame is tilted with the ring plane. */
  tilt: 26.7,
  /** Where the battle's origin sits in Saturn's equatorial frame: over the B ring, a little above the plane. */
  battleAt: [0, 22, 560] as V3,
  /** The Sun, in Saturn's equatorial frame: low and to one side, so the planet is a lit crescent with a long shadow. */
  sun: [-9000, 2600, 5200] as V3,
  sunIntensity: 2.6,
  ambient: 0.16,
  envIntensity: 0.45,
  exposure: 1.1,
  bloom: { strength: 0.75, radius: 0.45, threshold: 0.9 },
  /** Ship lengths in battle units, by class (a unit is 40 m of the sim: simFeed.ts SIM_VIEW). */
  length: { capital: 20, destroyer: 9.5, cruiser: 7, carrier: 13, escort: 4.5, fighter: 2 } as Record<ShipCls, number>,
  /** Which of a house's three hull arts draws each class (styles/ has capital, cruiser and fighter). */
  art: { capital: 'capital', destroyer: 'cruiser', cruiser: 'cruiser', carrier: 'capital', escort: 'fighter', fighter: 'fighter' } as Record<ShipCls, 'capital' | 'cruiser' | 'fighter'>,
  tracer: { gun: { len: 7, width: 0.28, glow: 5 }, rail: { len: 26, width: 0.38, glow: 9 }, laser: { len: 60, width: 0.14, glow: 7 }, missile: { len: 3, width: 0.5, glow: 4 }, pd: { len: 2, width: 0.12, glow: 3 } },
  flash: { life: 0.4, size: 2.2, glow: 4 },
  /** A hit on a shield flares on the side struck, in the shield-holder's glow; a hit through an open side is hull fire. */
  hit: { shieldSize: 0.9, shieldWhite: 0.35, hullSize: 1.3, hullColour: '#ff9b52', hullLife: 0.6 },
  /** His own ships' shield panels: an ellipsoid of these multiples of the ship's length; glow when quiet and when hit.
   * PKG-15: the panel is drawn as a rim (fresnel, `rimPow`), clear in the middle (`fill` of the rim's strength) and
   * fading out at its own edges (`edge`, in the panel's 0-1 surface coordinates), so the hull reads first. `base` is a
   * quiet side, `hitGlow` a side's flash when struck. */
  shield: { along: 0.62, up: 0.3, across: 0.42, gap: 0.14, base: 0.45, hitGlow: 3.2, hitLife: 0.6, rimPow: 3, fill: 0.03, edge: 0.22 },
  /** A broken ship runs: engines flared, running lights stuttering (Hz). */
  broken: { flare: 1.8, blink: 2.4 },
  /** A jump out: a flash this size, the hull stretching along its course and gone in `stretch` seconds. */
  jump: { flash: 11, life: 0.9, stretch: 0.45, stretchBy: 7 },
  /** Colours struck: hull darkened to this fraction, lights out, rolling slowly (rad/s). */
  struck: { dark: 0.3, roll: 0.05 },
  /** A wreck: a fireball, embers, the hull split in two, halves parting (units/s) and tumbling (rad/s), drifting on. */
  wreck: { flash: 5, life: 1.2, colour: '#ff8a3a', embers: 7, dark: 0.22, part: 0.35, spin: 0.16, drift: 0.8, maxAge: 240 },
  /** Engine glow (PKG-17): the sprite is `perLength` of the hull's class length across, so an escort's glow sits inside
   * its hull in a close shot and a capital's is the bigger light; never under `minPx` device pixels, so a line still
   * reads by its lights from across the battle. First-pass. */
  engine: { perLength: 0.4, minPx: 3, glow: 2.4 },
  maxTracers: 768,
  maxFlashes: 192,
  stars: { radius: 14000, count: 7000 },
  fov: 46,
  /** The opening shot stands off this many times the battle's radius, so both fleets are in frame. */
  holdBoth: 2.2,
};

interface Tracer { from: THREE.Vector3; to: THREE.Vector3; born: number; flight: number; kind: ShotView['kind']; color: THREE.Color; hit: boolean; target: string; face?: ShieldFace; hull?: boolean; hitColor?: THREE.Color }
interface Flash { at: THREE.Vector3; born: number; color: THREE.Color; size: number; life?: number }

const WHITE = new THREE.Color(1, 1, 1);

export interface BattleView {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  /** Feed one fixed step's frame (dt seconds) to the view: moves ships, spawns and ages fire. */
  ingest(frame: BattleFrame, dt: number): void;
  /** Draw one frame now (by hand: works with the pane hidden). */
  render(): void;
  resize(): void;
  /** Clear fire and snap the camera (a new seed). */
  reset(frame: BattleFrame): void;
  info(): { calls: number; triangles: number; geometries: number; textures: number; tracers: number; flashes: number };
  dispose(): void;
  /** PKG-11 director: the scene, for the picture-in-picture camera's second pass. */
  scene: THREE.Scene;
  /** PKG-11 director: a battle-frame point in world space. */
  toWorld(p: V3): THREE.Vector3;
  /** PKG-11 director: place any camera at a battle-frame eye, looking at a battle-frame point, Saturn's way up. */
  aim(cam: THREE.PerspectiveCamera, eye: V3, target: V3): void;
  /** PKG-11 director: drawn after the main frame each render (the inset pass); counted in info(). */
  afterRender: (() => void)[];
}

const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);

export function createBattleView(host: HTMLElement, rig: CameraRig, body: BodyId = 'saturn'): BattleView {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x010208, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LOOK.exposure;
  renderer.localClippingEnabled = true; // a wreck's two halves are its hull cut by a plane
  renderer.info.autoReset = false; // the composer renders several passes; count them all per frame
  renderer.domElement.className = 'skirmish-canvas';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(LOOK.fov, 1, 0.5, LOOK.stars.radius * 1.5);
  const u = makeSpaceUniforms();

  // Saturn's equatorial frame: the planet at its origin, tilted; the battle hangs in it above the rings.
  const system = new THREE.Group();
  system.rotation.z = (LOOK.tilt * Math.PI) / 180;
  scene.add(system);
  const sunLocal = v3(LOOK.sun);
  system.updateMatrixWorld(true);
  u.uSun.value.copy(sunLocal).applyMatrix4(system.matrixWorld);

  const R = LOOK.saturnRadius;
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 96), body === 'saturn' ? surfaceMaterial('saturn', u) : bodyMaterial(body, u)); // PKG-20: the setup's body
  system.add(planet);
  const inner = R * LOOK.ringInner, outer = R * LOOK.ringOuter;
  const rings = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 384, 1), ringMaterial(inner, outer, R, u));
  rings.rotation.x = Math.PI / 2; // in the equatorial plane
  rings.visible = hasRings(body); // PKG-20: only Saturn has rings
  system.add(rings);
  const stars = starField(LOOK.stars.radius, LOOK.stars.count, u);
  scene.add(stars);

  // Light for the ships: the Sun, a cool fill from the sky, and something for the metal to reflect.
  const sun = new THREE.DirectionalLight(0xfff1dc, LOOK.sunIntensity);
  sun.position.copy(u.uSun.value).normalize().multiplyScalar(1000);
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0x8fa8ff, 0x2a1d10, LOOK.ambient));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = LOOK.envIntensity;

  const battle = new THREE.Group();
  battle.position.copy(v3(LOOK.battleAt));
  system.add(battle);

  // Ship templates: one per house and class, coloured by the house, fitted to its class length.
  const templates = new Map<string, THREE.Object3D>();
  const template = (house: NationId, cls: ShipCls) => {
    const key = `${house}:${cls}`;
    let t = templates.get(key);
    if (!t) {
      // Dressed as the voyage game dresses it (fleet.ts: styledModel + liven in the house colour), then the running
      // lights recoloured to the people's glow (races.ts palette): Saturn indigo and Jupiter violet are close hues,
      // and amber against magenta lights tells the two lines apart at a glance. Saturn is seen by its lights.
      const color = house === 'earth' ? '#3f7fd0' : COLOR[house];
      const model = styledModel(LOOK.art[cls], { id: house, color });
      liven(model, color);
      const glow = new THREE.Color(peopleOf(house).palette.glow);
      model.traverse((o) => {
        if (!o.userData.runningLights) return;
        const m = new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(2.2), toneMapped: false });
        (o as THREE.Mesh).material = m;
      });
      const k = LOOK.length[cls] / modelLength(model);
      model.scale.setScalar(k);
      model.updateMatrixWorld(true);
      // Where a wreck splits: across the hull's middle, in the model's own (unscaled) frame.
      model.userData.midZ = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()).z / k;
      t = model;
      templates.set(key, t);
    }
    return t;
  };

  /**
   * One ship on screen. `since` is the view clock when its status last changed, so each change plays once: a broken
   * ship's lights stutter, a jump stretches and vanishes in a flash, a struck ship goes dark and rolls, a wreck splits
   * in two and drifts. Materials a ship changes are its own clones (`owned`), so no other ship changes with it.
   */
  interface ShipObj {
    g: THREE.Group;
    model: THREE.Object3D;
    house: NationId;
    cls: ShipCls;
    status: ShipStatus;
    since: number;
    owned: THREE.Material[];
    lights: THREE.MeshBasicMaterial | null;
    halves: { o: THREE.Object3D; plane: THREE.Plane; local: THREE.Plane; dir: number; spin: THREE.Vector3 }[];
    drift: THREE.Vector3;
  }
  const ships = new Map<string, ShipObj>();
  camera.userData.shipGroups = () => [...ships.values()].map((o) => o.g); // PKG-09: the comms UI's lookup (pick, project)

  const forget = (o: ShipObj) => {
    battle.remove(o.g);
    o.owned.forEach((m) => m.dispose());
    ships.delete(o.g.userData.id);
  };

  /** Hull materials of `root` replaced by darkened clones; running lights and exhaust hidden. */
  const darken = (o: ShipObj, root: THREE.Object3D, k: number, plane?: THREE.Plane) => {
    root.traverse((c) => {
      if (c instanceof THREE.Line || c instanceof THREE.Points) {
        // Edge lines and light points in the house glow go out with the lights.
        c.visible = false;
        return;
      }
      if (!(c instanceof THREE.Mesh)) return;
      // Lights out: running lights, exhaust, and any self-lit glow strip in the house colour.
      if (c.userData.runningLights || c.userData.exhaust || c.userData.role === 'glow' || c.material instanceof THREE.MeshBasicMaterial) { c.visible = false; return; }
      const m = (c.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
      if (m.color) m.color.multiplyScalar(k);
      if (m.emissive) m.emissive.setRGB(0, 0, 0);
      if (plane) { m.clippingPlanes = [plane]; m.side = THREE.DoubleSide; }
      c.material = m;
      o.owned.push(m);
    });
  };

  const shipFor = (s: ShipView) => {
    let o = ships.get(s.id);
    // A captured ship changes side: draw it in its new house's art and colours from this frame on.
    if (o && (o.house !== s.house || o.cls !== s.cls)) { forget(o); o = undefined; }
    if (!o) {
      const g = new THREE.Group();
      const model = template(s.house, s.cls).clone();
      g.add(model);
      g.userData.id = s.id;
      battle.add(g);
      o = { g, model, house: s.house, cls: s.cls, status: 'alive', since: -1e9, owned: [], lights: null, halves: [], drift: new THREE.Vector3() };
      ships.set(s.id, o);
      if (s.status !== 'alive') change(o, s, true);
    }
    return o;
  };

  /** A status change, played once. `quiet`: already so when first seen (a reset mid-way), so no flash. */
  const change = (o: ShipObj, s: ShipView, quiet = false) => {
    o.status = s.status;
    o.since = quiet ? -1e9 : clock;
    const at = v3(s.pos);
    const glow = new THREE.Color(s.colours.glow);
    if (s.status === 'broken') {
      // Running for it: the lights stutter (its own clone of the light material).
      o.model.traverse((c) => {
        if (!(c instanceof THREE.Mesh) || !c.userData.runningLights) return;
        const m = (c.material as THREE.MeshBasicMaterial).clone();
        c.material = m;
        o.owned.push(m);
        o.lights = m;
      });
    } else if (s.status === 'struck') {
      darken(o, o.model, LOOK.struck.dark);
    } else if (s.status === 'fled' || s.status === 'withdrawn') {
      if (!quiet) flashes.push({ at, born: clock, color: glow.clone().lerp(WHITE, 0.5), size: LOOK.jump.flash, life: LOOK.jump.life });
    } else if (s.status === 'wrecked') {
      o.model.visible = false;
      const len = LOOK.length[s.cls];
      for (const dir of [1, -1]) {
        const half = template(s.house, s.cls).clone();
        const local = new THREE.Plane(new THREE.Vector3(0, 0, dir), -dir * (template(s.house, s.cls).userData.midZ as number));
        const plane = local.clone();
        darken(o, half, LOOK.wreck.dark, plane);
        o.g.add(half);
        const r = (salt: number) => Math.sin(s.id.length * 12.9898 + salt * 78.233 + dir * 3.1) * 0.5;
        o.halves.push({ o: half, plane, local, dir, spin: new THREE.Vector3(r(1), r(2), r(3)).multiplyScalar(LOOK.wreck.spin) });
      }
      o.drift.set(s.heading[0], 0.15, s.heading[2]).multiplyScalar(LOOK.wreck.drift);
      if (!quiet) {
        flashes.push({ at, born: clock, color: new THREE.Color(LOOK.wreck.colour), size: LOOK.wreck.flash * (len / 7) ** 0.5, life: LOOK.wreck.life });
        for (let i = 0; i < LOOK.wreck.embers; i++) {
          const a = (i / LOOK.wreck.embers) * Math.PI * 2;
          const off = new THREE.Vector3(Math.cos(a), Math.sin(a * 1.7) * 0.4, Math.sin(a)).multiplyScalar(len * 0.35);
          flashes.push({ at: at.clone().add(off), born: clock + 0.15 + i * 0.18, color: new THREE.Color(LOOK.wreck.colour), size: len * 0.12 + 0.6, life: 0.5 });
        }
      }
    }
  };

  // Engine glow: one point per ship at its stern, in its people's glow colour, so a line reads by its lights from
  // across the battle (ART-DIRECTION: in Saturn's dim light you see a ship by its lights). One draw call for all.
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const MAX_SHIPS = 256;
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_SHIPS * 3), 3));
  glowGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_SHIPS * 3), 3));
  // PKG-17: a size per ship (its class length times LOOK.engine.perLength), still one draw call: the stock points
  // shader reads an `aSize` attribute and holds a floor of `minPx` after perspective.
  glowGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MAX_SHIPS), 1));
  const engineMat = new THREE.PointsMaterial({ size: 1, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  engineMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('uniform float size;', 'uniform float size;\nattribute float aSize;')
      .replace('gl_PointSize = size;', 'gl_PointSize = size * aSize;')
      .replace('#include <logdepthbuf_vertex>', `gl_PointSize = max(gl_PointSize, ${LOOK.engine.minPx.toFixed(1)});\n#include <logdepthbuf_vertex>`);
  };
  const engines = new THREE.Points(glowGeo, engineMat);
  engines.frustumCulled = false;
  battle.add(engines);
  const engineColour = new THREE.Color();

  // His own ships' shields: four faint panels round each hull (one instanced mesh for the fleet). A side that is down
  // is a gap; a side that is hit flares. Enemy ships get no shimmer: what he sees of their shields is the hit flash.
  const PANELS = MAX_SHIPS;
  const arc = Math.PI / 2 - LOOK.shield.gap;
  // PKG-15: a thin rim, not a filled bubble. The instance colour is the side's glow times its strength (quiet or hit);
  // the shader lights the panel by how edge-on it is to the eye and fades it out at the panel's own borders, so the
  // four sides read as four seams of light round a hull that stays clear. Front faces only: no doubled back wall.
  const panelMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 8, Math.PI - arc / 2, arc, 0.35, Math.PI - 0.7),
    new THREE.ShaderMaterial({
      uniforms: { uPow: { value: LOOK.shield.rimPow }, uFill: { value: LOOK.shield.fill }, uEdge: { value: LOOK.shield.edge } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying vec2 vUv;
        void main() {
          mat4 mv = modelViewMatrix * instanceMatrix;
          vec4 p = mv * vec4(position, 1.0);
          vN = normalize(transpose(inverse(mat3(mv))) * normal);
          vV = normalize(-p.xyz);
          vCol = instanceColor;
          vUv = uv;
          gl_Position = projectionMatrix * p;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uPow; uniform float uFill; uniform float uEdge;
        varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying vec2 vUv;
        void main() {
          float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow);
          float e = smoothstep(0.0, uEdge, vUv.x) * smoothstep(0.0, uEdge, 1.0 - vUv.x) * smoothstep(0.0, uEdge, vUv.y) * smoothstep(0.0, uEdge, 1.0 - vUv.y);
          gl_FragColor = vec4(vCol * (rim + uFill) * e, 1.0);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
    }),
    PANELS,
  );
  panelMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PANELS * 3), 3);
  panelMesh.frustumCulled = false;
  panelMesh.count = 0;
  battle.add(panelMesh);
  /** Rotation about y that turns the panel (centred on +x) to each side, in a ship frame whose +x is the bow. */
  const FACE_YAW: Record<ShieldFace, number> = { fore: 0, port: -Math.PI / 2, aft: Math.PI, starboard: Math.PI / 2 };
  const shieldHits = new Map<string, number>();

  /** World offset (battle frame) from a ship's centre to its shield side `f`, at `r` units. */
  const faceOffset = (s: ShipView, f: ShieldFace, r: number, out: THREE.Vector3) => {
    const h = Math.atan2(s.heading[2], s.heading[0]) - FACE_YAW[f]; // the sim's yaw of that side
    return out.set(Math.cos(h) * r, 0, Math.sin(h) * r);
  };

  const look = new THREE.Vector3();
  const pm = new THREE.Matrix4();
  const pr = new THREE.Matrix4();
  const ps = new THREE.Matrix4();
  const pf = new THREE.Matrix4();
  const byId = new Map<string, ShipView>();
  const placeShips = (frame: BattleFrame) => {
    const ep = glowGeo.attributes.position as THREE.BufferAttribute;
    const ec = glowGeo.attributes.color as THREE.BufferAttribute;
    const es = glowGeo.attributes.aSize as THREE.BufferAttribute;
    let e = 0;
    let p = 0;
    byId.clear();
    for (const s of frame.ships) {
      byId.set(s.id, s);
      const o = shipFor(s);
      if (o.status !== s.status) change(o, s);
      const age = clock - o.since;
      const g = o.g;
      g.position.set(s.pos[0], s.pos[1], s.pos[2]);
      g.scale.set(1, 1, 1);
      // Models face −z; lookAt points +z at its target, so look at the point behind the ship.
      look.set(s.pos[0] - s.heading[0], s.pos[1] - s.heading[1], s.pos[2] - s.heading[2]);
      g.lookAt(look.applyMatrix4(battle.matrixWorld));

      if (s.status === 'fled' || s.status === 'withdrawn') {
        // The jump: the hull stretches along its course and is gone inside LOOK.jump.stretch seconds.
        const k = Math.min(1, age / LOOK.jump.stretch);
        g.visible = k < 1;
        g.scale.set(1 - 0.85 * k, 1 - 0.85 * k, 1 + LOOK.jump.stretchBy * k * k);
        g.translateZ(-LOOK.length[s.cls] * LOOK.jump.stretchBy * 0.5 * k * k);
      } else if (s.status === 'struck') {
        g.visible = true;
        g.rotateZ(Math.max(0, age) * LOOK.struck.roll); // dead in space, rolling
      } else if (s.status === 'wrecked') {
        g.visible = true;
        const t = Math.max(0, Math.min(age, LOOK.wreck.maxAge));
        g.position.addScaledVector(o.drift, t);
        for (const h of o.halves) {
          h.o.position.set(0, 0, h.dir * LOOK.wreck.part * t);
          h.o.rotation.set(h.spin.x * t, h.spin.y * t, h.spin.z * t);
        }
        g.updateMatrixWorld(true);
        for (const h of o.halves) h.plane.copy(h.local).applyMatrix4(h.o.matrixWorld);
      } else {
        g.visible = true;
      }

      if (underWay(s.status) && e < MAX_SHIPS) {
        const back = LOOK.length[s.cls] * 0.5;
        ep.setXYZ(e, s.pos[0] - s.heading[0] * back, s.pos[1] - s.heading[1] * back, s.pos[2] - s.heading[2] * back);
        const broken = s.status === 'broken';
        engineColour.set(s.colours.glow).multiplyScalar(LOOK.engine.glow * (broken ? LOOK.broken.flare : 1) * (s.cls === 'capital' ? 1.4 : 1));
        ec.setXYZ(e, engineColour.r, engineColour.g, engineColour.b);
        es.setX(e, LOOK.length[s.cls] * LOOK.engine.perLength);
        e++;
      }
      if (o.lights && s.status === 'broken') {
        const on = Math.sin(clock * Math.PI * 2 * LOOK.broken.blink + s.id.length) > -0.2;
        o.lights.color.set(s.colours.glow).multiplyScalar(on ? 2.2 : 0.25);
      }

      // Shields: his ships only, while they are under way.
      if (s.side === 0 && underWay(s.status) && p + 4 <= PANELS) {
        const len = LOOK.length[s.cls];
        const h = Math.atan2(s.heading[2], s.heading[0]);
        pm.makeTranslation(s.pos[0], s.pos[1], s.pos[2]).multiply(pr.makeRotationY(-h));
        pm.multiply(ps.makeScale(len * LOOK.shield.along, len * LOOK.shield.up, len * LOOK.shield.across));
        const open = s.open ?? [];
        for (const f of SHIELD_FACES) {
          if (open.includes(f)) continue; // a side that is down is a gap in the shimmer
          panelMesh.setMatrixAt(p, pf.copy(pm).multiply(pr.makeRotationY(FACE_YAW[f])));
          const hitAt = shieldHits.get(`${s.id}:${f}`) ?? -1e9;
          const flare = LOOK.shield.hitGlow * Math.max(0, 1 - (clock - hitAt) / LOOK.shield.hitLife);
          const shimmer = LOOK.shield.base * (0.8 + 0.2 * Math.sin(clock * 2.1 + p));
          panelMesh.setColorAt(p, col.set(s.colours.glow).multiplyScalar(shimmer + flare));
          p++;
        }
      }
    }
    for (const [id, o] of ships) if (!byId.has(id)) forget(o);
    glowGeo.setDrawRange(0, e);
    ep.needsUpdate = true;
    ec.needsUpdate = true;
    es.needsUpdate = true;
    panelMesh.count = p;
    panelMesh.instanceMatrix.needsUpdate = true;
    if (panelMesh.instanceColor) panelMesh.instanceColor.needsUpdate = true;
  };

  // Fire: tracers and flashes, each one instanced mesh with per-instance colour (HDR, so the bloom picks it up).
  const tracerMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), LOOK.maxTracers);
  tracerMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(LOOK.maxTracers * 3), 3);
  tracerMesh.frustumCulled = false;
  tracerMesh.count = 0;
  battle.add(tracerMesh);
  const flashMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), LOOK.maxFlashes);
  flashMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(LOOK.maxFlashes * 3), 3);
  flashMesh.frustumCulled = false;
  flashMesh.count = 0;
  battle.add(flashMesh);

  let tracers: Tracer[] = [];
  let flashes: Flash[] = [];
  let clock = 0;
  const wingLayer = createWingLayer(battle); // PKG-25: fighter wings
  const sideGlow = (frame: BattleFrame, side: number) => new THREE.Color(frame.sides[side].colours.glow);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const dir = new THREE.Vector3();
  const head = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();

  const drawFire = () => {
    let n = 0;
    const keep: Tracer[] = [];
    for (const tr of tracers) {
      const p = (clock - tr.born) / tr.flight;
      if (p >= 1) {
        if (tr.hit) {
          const born = tr.born + tr.flight;
          if (tr.hull) {
            flashes.push({ at: tr.to.clone(), born, color: new THREE.Color(LOOK.hit.hullColour), size: LOOK.hit.hullSize * (tr.kind === 'rail' || tr.kind === 'missile' ? 1.5 : 1), life: LOOK.hit.hullLife });
          } else {
            flashes.push({ at: tr.to.clone(), born, color: tr.hitColor ?? tr.color, size: LOOK.hit.shieldSize * (tr.kind === 'rail' || tr.kind === 'missile' ? 1.6 : 1) });
            if (tr.face) shieldHits.set(`${tr.target}:${tr.face}`, born);
          }
        }
        continue;
      }
      keep.push(tr);
      if (n >= LOOK.maxTracers || p < 0) continue;
      const spec = LOOK.tracer[tr.kind];
      dir.subVectors(tr.to, tr.from);
      const total = dir.length();
      dir.divideScalar(total || 1);
      head.copy(tr.from).addScaledVector(dir, total * p);
      const len = Math.min(spec.len, total * p + 0.01);
      mid.copy(head).addScaledVector(dir, -len / 2);
      q.setFromUnitVectors(zAxis, dir);
      scl.set(spec.width, spec.width, len);
      tracerMesh.setMatrixAt(n, m4.compose(mid, q, scl));
      tracerMesh.setColorAt(n, col.copy(tr.color).multiplyScalar(spec.glow));
      n++;
    }
    tracers = keep;
    tracerMesh.count = n;
    tracerMesh.instanceMatrix.needsUpdate = true;
    if (tracerMesh.instanceColor) tracerMesh.instanceColor.needsUpdate = true;

    let f = 0;
    flashes = flashes.filter((fl) => clock - fl.born < (fl.life ?? LOOK.flash.life));
    for (const fl of flashes) {
      if (f >= LOOK.maxFlashes) break;
      if (clock < fl.born) continue; // an ember not yet lit
      const a = Math.max(0, (clock - fl.born) / (fl.life ?? LOOK.flash.life));
      const s = fl.size * (0.4 + a * 0.9);
      q.identity();
      scl.set(s, s, s);
      flashMesh.setMatrixAt(f, m4.compose(fl.at, q, scl));
      flashMesh.setColorAt(f, col.copy(fl.color).lerp(new THREE.Color(1, 0.95, 0.85), 0.25).multiplyScalar(LOOK.flash.glow * (1 - a) * (1 - a)));
      f++;
    }
    flashMesh.count = f;
    flashMesh.instanceMatrix.needsUpdate = true;
    if (flashMesh.instanceColor) flashMesh.instanceColor.needsUpdate = true;
  };

  // Post: bloom for the fire and the engines, filmic tone mapping on the way out.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), LOOK.bloom.strength, LOOK.bloom.radius, LOOK.bloom.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const centre = (frame: BattleFrame): V3 => {
    const focus = rig.state.focus && frame.ships.find((s) => s.id === rig.state.focus && s.status !== 'fled' && s.status !== 'withdrawn');
    if (focus) return [...focus.pos];
    const field = frame.ships.filter((s) => underWay(s.status));
    const live = field.length ? field : frame.ships.filter((s) => s.status === 'struck' || s.status === 'wrecked');
    if (!live.length) return [0, 0, 0];
    const c: V3 = [0, 0, 0];
    for (const s of live) for (let i = 0; i < 3; i++) c[i] += s.pos[i] / live.length;
    return c;
  };

  // Until the player takes the camera, pull back far enough to hold both fleets (EXP-01 step 2's "in view"). This is
  // not the director of EXP-04; it only keeps the opening wide shot honest while the lines close.
  const frameBoth = (frame: BattleFrame, dt: number) => {
    const c = centre(frame);
    if (rig.state.mode === 'director' && !rig.state.focus) {
      let r = 0;
      for (const s of frame.ships) if (underWay(s.status)) r = Math.max(r, Math.hypot(s.pos[0] - c[0], s.pos[1] - c[1], s.pos[2] - c[2]));
      const want = Math.min(CAM.maxDist, Math.max(CAM.dist, r * LOOK.holdBoth));
      rig.state.dist = dt > 0 ? rig.state.dist + (want - rig.state.dist) * (1 - Math.exp(-CAM.follow * dt)) : want;
    }
    if (dt > 0) rig.follow(c, dt); else rig.snap(c);
  };

  const placeCamera = () => {
    const e = rig.state.eye, t = rig.state.target;
    battle.updateMatrixWorld(true);
    camera.position.copy(v3(e)).applyMatrix4(battle.matrixWorld);
    camera.up.set(0, 1, 0).transformDirection(system.matrixWorld);
    camera.lookAt(v3(t).applyMatrix4(battle.matrixWorld));
  };

  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  const view: BattleView = {
    renderer,
    camera,
    ingest(frame, dt) {
      clock += dt;
      battle.updateMatrixWorld(true);
      placeShips(frame);
      wingLayer.place(frame); // PKG-25
      for (const s of frame.shots) {
        const tr: Tracer = { from: v3(s.from), to: v3(s.to), born: clock, flight: Math.max(0.03, s.flight), kind: s.kind, color: sideGlow(frame, s.side), hit: s.hit, target: s.target, face: s.face, hull: s.hull };
        const tgt = byId.get(s.target);
        if (s.hit && s.face && tgt) {
          // The flash lands on the side struck: on the shield's skin, or on the hull through an open side.
          const len = LOOK.length[tgt.cls];
          tr.to.add(faceOffset(tgt, s.face, len * (s.hull ? 0.28 : LOOK.shield.along), dir));
          tr.hitColor = new THREE.Color(tgt.colours.glow).lerp(WHITE, LOOK.hit.shieldWhite);
        }
        tracers.push(tr);
        flashes.push({ at: v3(s.from), born: clock, color: sideGlow(frame, s.side), size: LOOK.flash.size * (s.kind === 'laser' ? 0.3 : 0.45) });
      }
      frameBoth(frame, dt);
    },
    render() {
      u.uTime.value = clock;
      drawFire();
      placeCamera();
      renderer.info.reset();
      composer.render();
      for (const fn of view.afterRender) fn();
    },
    resize,
    reset(frame) {
      tracers = [];
      flashes = [];
      shieldHits.clear();
      for (const o of [...ships.values()]) forget(o);
      battle.updateMatrixWorld(true);
      placeShips(frame);
      wingLayer.place(frame); // PKG-25
      rig.snap(centre(frame));
      frameBoth(frame, 0);
    },
    info() {
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, tracers: tracerMesh.count, flashes: flashMesh.count };
    },
    dispose() {
      composer.dispose();
      env.dispose();
      pmrem.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) mat.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
    scene,
    toWorld: (p) => { battle.updateMatrixWorld(true); return v3(p).applyMatrix4(battle.matrixWorld); },
    aim(cam, e, t) {
      battle.updateMatrixWorld(true);
      cam.position.copy(v3(e)).applyMatrix4(battle.matrixWorld);
      cam.up.set(0, 1, 0).transformDirection(system.matrixWorld);
      cam.lookAt(v3(t).applyMatrix4(battle.matrixWorld));
    },
    afterRender: [],
  };
  return view;
}
