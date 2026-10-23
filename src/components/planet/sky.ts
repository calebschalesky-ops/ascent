/**
 * The air seen from inside it: a sky dome around the camera that goes from black to the planet's sky as you descend
 * and hides the stars by day; the gas giants' cloud decks; and the plasma glow round the ship on entry.
 *
 * Not the atmosphere seen from space: the rim glows round each planet stay with the space-view materials (another
 * branch is replacing them with scattering shaders). The one exception is a boundary rim for the Moon and Mercury,
 * which had no air before; it reuses the space-view atmosphereMaterial rather than adding a second one.
 */
import * as THREE from 'three';
import { SNOISE, logDepth } from './glsl';
import type { AirUniforms } from './terrainMesh';

/**
 * Cloud layers seen from inside a thick air (GRAPHICS-PASS #8): shells at fixed heights above the datum (fractions of
 * R), banded in the planet's own colours. Drawn in the sky dome by meeting each view ray with the shells, so they
 * stay visible however thick the haze over the near scene is. Venus and the giants only.
 */
export interface CloudLayer {
  h: number; // height above the datum, fraction of R
  a: [number, number, number]; // the two band colours, linear RGB
  b: [number, number, number];
  cover: number; // 0 clear .. 1 overcast
  freq: number; // pattern units per R
  bands: number; // bands per radian of latitude
}
const JUPITER_LAYERS: CloudLayer[] = [
  { h: 0.009, a: [1.0, 0.97, 0.9], b: [0.84, 0.66, 0.46], cover: 0.45, freq: 230, bands: 90 }, // ammonia cirrus
  { h: -0.0003, a: [0.95, 0.86, 0.68], b: [0.68, 0.33, 0.16], cover: 0.6, freq: 150, bands: 140 }, // the cloud tops: cream zones, rust belts
  { h: -0.0055, a: [0.55, 0.26, 0.12], b: [0.8, 0.52, 0.28], cover: 0.85, freq: 110, bands: 110 }, // the deep deck
];
const SATURN_LAYERS: CloudLayer[] = [
  { h: 0.009, a: [1.0, 0.96, 0.82], b: [0.88, 0.74, 0.46], cover: 0.45, freq: 210, bands: 80 }, // high haze
  { h: -0.0003, a: [0.97, 0.88, 0.58], b: [0.74, 0.5, 0.18], cover: 0.6, freq: 140, bands: 120 }, // the cloud tops: butter and gold
  { h: -0.0055, a: [0.7, 0.48, 0.22], b: [0.52, 0.36, 0.2], cover: 0.85, freq: 100, bands: 100 },
];
const VENUS_LAYERS: CloudLayer[] = [
  { h: 0.05, a: [1.0, 0.95, 0.78], b: [0.9, 0.8, 0.56], cover: 0.35, freq: 90, bands: 40 }, // the bright upper haze
  { h: 0.036, a: [0.96, 0.84, 0.54], b: [0.78, 0.57, 0.28], cover: 0.65, freq: 70, bands: 55 }, // the sulphuric deck
  { h: 0.024, a: [0.82, 0.6, 0.3], b: [0.62, 0.42, 0.2], cover: 0.75, freq: 60, bands: 35 }, // the lower deck, in its shadow
];
export const CLOUD_LAYERS: Partial<Record<string, CloudLayer[]>> = { jupiter: JUPITER_LAYERS, saturn: SATURN_LAYERS, venus: VENUS_LAYERS };

const LAYERS = 3;
export interface Dome {
  mesh: THREE.Mesh;
  u: {
    uUp: { value: THREE.Vector3 }; uSunDir: { value: THREE.Vector3 }; uZenith: { value: THREE.Color }; uHorizon: { value: THREE.Color };
    uCover: { value: number }; uSunCol: { value: THREE.Color };
    /** 0 in clear air; toward 1 in a thick one: the Sun's disc softens and widens into a halo. */
    uSunHaze: { value: number };
    uAxis: { value: THREE.Vector3 }; uCamH: { value: number }; uTime: { value: number }; uCount: { value: number };
    uLayH: { value: number[] }; uLayA: { value: THREE.Color[] }; uLayB: { value: THREE.Color[] };
    uLayCov: { value: number[] }; uLayFreq: { value: number[] }; uLayBands: { value: number[] };
    /** Light reaching each layer: less under the layers above it, and less deep in a giant. */
    uLayLight: { value: number[] };
    uVis: { value: number }; // how far (fraction of R) a layer stays clear before it fades into the sky
  };
}

export function createDome(): Dome {
  const n = <T,>(f: () => T) => Array.from({ length: LAYERS }, f);
  const u: Dome['u'] = {
    uUp: { value: new THREE.Vector3(0, 1, 0) }, uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    uZenith: { value: new THREE.Color(0, 0, 0) }, uHorizon: { value: new THREE.Color(0, 0, 0) },
    uCover: { value: 0 }, uSunCol: { value: new THREE.Color(1, 0.95, 0.85) }, uSunHaze: { value: 0 },
    uAxis: { value: new THREE.Vector3(0, 1, 0) }, uCamH: { value: 0 }, uTime: { value: 0 }, uCount: { value: 0 },
    uLayH: { value: n(() => 0) }, uLayA: { value: n(() => new THREE.Color()) }, uLayB: { value: n(() => new THREE.Color()) },
    uLayCov: { value: n(() => 0) }, uLayFreq: { value: n(() => 1) }, uLayBands: { value: n(() => 1) }, uLayLight: { value: n(() => 1) },
    uVis: { value: 0.03 },
  };
  const mat = logDepth(new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      #define LAYERS ${LAYERS}
      uniform vec3 uUp; uniform vec3 uSunDir; uniform vec3 uZenith; uniform vec3 uHorizon; uniform float uCover; uniform vec3 uSunCol;
      uniform float uSunHaze; uniform vec3 uAxis; uniform float uCamH; uniform float uTime; uniform int uCount;
      uniform float uLayH[LAYERS]; uniform vec3 uLayA[LAYERS]; uniform vec3 uLayB[LAYERS]; uniform float uLayCov[LAYERS];
      uniform float uLayFreq[LAYERS]; uniform float uLayBands[LAYERS]; uniform float uLayLight[LAYERS]; uniform float uVis;
      varying vec3 vDir;
      ${SNOISE}
      // One layer along this ray: its colour and alpha, and the distance to it (fraction of R) in t; t < 0 on a miss.
      vec4 layer(int i, vec3 dir, float mu, float s, out float t){
        float hl = uLayH[i];
        float r = 1.0 + uCamH;
        float b = r * mu;
        float c = (uCamH - hl) * (2.0 + uCamH + hl); // |P|^2 - rl^2, without the cancellation
        float disc = b * b - c;
        t = -1.0;
        if (disc < 0.0) return vec4(0.0);
        float sq = sqrt(disc);
        t = c < 0.0 ? -b + sq : -b - sq; // inside the shell: where the ray leaves it; outside: where it first meets it
        if (t <= 0.0) { t = -1.0; return vec4(0.0); }
        vec3 n = normalize(uUp * r + dir * t);
        float lat = dot(n, uAxis);
        vec3 p = n * uLayFreq[i];
        p += uAxis * dot(p, uAxis) * 2.5; // squashed along the axis: the clouds stream along the bands
        float seed = float(i) * 17.3;
        float warp = fbm4(p * 0.3 + seed);
        float band = 0.5 + 0.5 * sin(lat * uLayBands[i] + warp * 2.6);
        float d = fbm4(p + vec3(uTime * 0.004, 0.0, seed) + warp * 0.8) * 0.5 + 0.5;
        float a = smoothstep(1.0 - uLayCov[i] - 0.18, 1.0 - uLayCov[i] + 0.18, d);
        vec3 col = mix(uLayA[i], uLayB[i], smoothstep(0.25, 0.75, band));
        float above = hl > uCamH ? 1.0 : 0.0;
        // From above: lit tops, the thick parts brighter; from below: a darker underside, thin edges lit toward the Sun.
        float sunUp = dot(uSunDir, uUp);
        float lit = mix(0.72 + 0.5 * (d - 0.5) + 0.25 * max(sunUp, 0.0), 0.95 - 0.55 * a + 0.9 * pow(s, 6.0) * (1.0 - a * 0.6), above);
        col *= lit * uLayLight[i];
        // Far away, the layer thins into the sky.
        return vec4(col, a * exp(-t / uVis));
      }
      void main(){
        vec3 dir = normalize(vDir);
        float mu = dot(dir, uUp);
        vec3 col = mix(uZenith, uHorizon, mu > 0.0 ? pow(1.0 - mu, 3.0) : 1.0);
        col *= mu < 0.0 ? mix(1.0, 0.6, smoothstep(0.0, -0.5, mu)) : 1.0; // below the horizon: haze over the ground
        float s = max(dot(dir, uSunDir), 0.0);
        // The Sun's disc, softened and spread into a halo by a thick air.
        float disc = pow(s, mix(1400.0, 500.0, uSunHaze)) * mix(40.0, 5.0, uSunHaze);
        float halo = pow(s, mix(14.0, 48.0, uSunHaze)) * (0.4 + 1.1 * uSunHaze) + pow(s, 4.0) * 0.25 * uSunHaze;
        col += uSunCol * (disc + halo * uCover);
        // Cloud layers, nearest first.
        vec4 L[LAYERS];
        float T[LAYERS];
        for (int i = 0; i < LAYERS; i++) { L[i] = vec4(0.0); T[i] = -1.0; if (i < uCount) L[i] = layer(i, dir, mu, s, T[i]); }
        vec3 acc = vec3(0.0);
        float tr = 1.0;
        for (int k = 0; k < LAYERS; k++) {
          int best = -1;
          float bt = 1e9;
          for (int i = 0; i < LAYERS; i++) if (T[i] > 0.0 && T[i] < bt) { bt = T[i]; best = i; }
          if (best < 0) break;
          vec4 c = vec4(0.0);
          for (int i = 0; i < LAYERS; i++) if (i == best) { c = L[i]; T[i] = -1.0; }
          acc += tr * c.a * c.rgb;
          tr *= 1.0 - c.a;
        }
        col = acc + tr * col;
        // The glare still comes through: a thick air scatters it round the clouds.
        col += uSunCol * halo * uCover * 0.35 * (1.0 - tr);
        gl_FragColor = vec4(col, uCover);
      }`,
  }));
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  mesh.renderOrder = -1; // before every other transparent thing: the stars are dimmed separately (fadeStars)
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.name = 'air-sky';
  return { mesh, u };
}

/** Load a body's cloud layers into the dome, for a camera `camH` (fraction of R) above the datum. */
export function setDomeLayers(d: Dome, layers: CloudLayer[] | undefined, camH: number, scale: number, surface: boolean) {
  // Deep in a giant, the layers overhead are seen only by the little light that gets down: they darken with you.
  const camDark = !surface && camH < 0 ? Math.exp((camH / scale) * 0.35) : 1;
  const u = d.u;
  const L = (layers ?? []).slice(0, LAYERS);
  u.uCount.value = L.length;
  u.uCamH.value = camH;
  L.forEach((l, i) => {
    u.uLayH.value[i] = l.h;
    u.uLayA.value[i].setRGB(...l.a);
    u.uLayB.value[i].setRGB(...l.b);
    u.uLayCov.value[i] = l.cover;
    u.uLayFreq.value[i] = l.freq;
    u.uLayBands.value[i] = l.bands;
    // Each layer is in the shade of the ones above it, and a giant's air darkens with depth below the datum.
    const over = L.filter((o) => o.h > l.h).length;
    const deep = !surface && l.h < 0 ? Math.exp((l.h / scale) * 0.35) : 1;
    u.uLayLight.value[i] = Math.pow(0.78, over) * deep * (l.h > camH ? camDark : 1);
  });
  u.uVis.value = surface ? 0.06 : 0.025;
}

/**
 * Dim the additive stars, Milky Way and rim behind the sky. Uses the blend constant, so their shaders are untouched:
 * additive blending becomes dst + src × (1 − cover). Restores plain additive blending at cover 0.
 */
export function fadeStars(objects: THREE.Object3D[], cover: number) {
  for (const o of objects) {
    const mats = (o as THREE.Mesh).material;
    for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      if (cover <= 0.001) {
        if (m.userData.airFaded) { m.blending = THREE.AdditiveBlending; m.userData.airFaded = false; m.needsUpdate = true; }
        continue;
      }
      if (!m.userData.airFaded) {
        m.blending = THREE.CustomBlending;
        m.blendEquation = THREE.AddEquation;
        m.blendSrc = THREE.ConstantColorFactor;
        m.blendDst = THREE.OneFactor;
        m.userData.airFaded = true;
        m.needsUpdate = true;
      }
      m.blendColor.setScalar(1 - cover);
    }
  }
}

/** A gas giant's cloud deck: banded, patchy, lit by the Sun, faded into the haze with distance. */
export function cloudDeck(radius: number, tint: [number, number, number], u: AirUniforms & { uTime: { value: number } }, seed: number): THREE.Mesh {
  const mat = logDepth(new THREE.ShaderMaterial({
    uniforms: { ...u, uTint: { value: new THREE.Color(...tint) }, uSeed: { value: seed } },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform vec3 uSun;
      varying vec3 vObj; varying vec3 vMV; varying vec3 vL; varying vec3 vN;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vObj = position; vMV = mv.xyz;
        vN = normalize(normalMatrix * normal);
        vL = normalize((viewMatrix * vec4(uSun, 1.0)).xyz - mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHazeColor; uniform float uHaze; uniform vec3 uTint; uniform float uTime; uniform float uSeed;
      varying vec3 vObj; varying vec3 vMV; varying vec3 vL; varying vec3 vN;
      ${SNOISE}
      void main(){
        vec3 p = normalize(vObj);
        float t = uTime * 0.01;
        float band = sin(p.y * 70.0 + 2.0 * fbm4(p * vec3(5.0, 22.0, 5.0) + uSeed));
        float c = fbm4(p * vec3(30.0, 120.0, 30.0) + vec3(t, 0.0, uSeed));
        // Finer puffs close up, gone before they are under a few pixels.
        float fw = max(length(fwidth(vObj)), 1e-6);
        float f = 0.08;
        float a = 0.35;
        for (int i = 0; i < 4; i++){ c += a * (1.0 - smoothstep(0.1, 0.4, f * fw)) * snoise(vObj * f + uSeed); f *= 2.9; a *= 0.55; }
        float alpha = smoothstep(-0.15, 0.35, c + band * 0.15) * 0.9;
        vec3 col = uTint * (0.85 + 0.25 * band);
        float lit = smoothstep(-0.15, 0.4, dot(normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0), normalize(vL))) * 0.8 + 0.2;
        col *= lit;
        float haze = 1.0 - exp(-length(vMV) * uHaze);
        gl_FragColor = vec4(mix(col, uHazeColor, haze), alpha * (1.0 - haze * 0.6));
      }`,
  }));
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 256, 128), mat);
  m.name = 'air-cloud-deck';
  return m;
}

/** The plasma sheath on entry: a glowing shell stretched along the ship's motion, brightest at the front. */
export function plasmaGlow(): { mesh: THREE.Mesh; u: { uGlow: { value: number } } } {
  const u = { uGlow: { value: 0 } };
  const mat = logDepth(new THREE.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying float vFront;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        vFront = -normalize(position).z; // +1 at the nose (the mesh faces -z)
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uGlow;
      varying vec3 vN; varying vec3 vV; varying float vFront;
      void main(){
        // A bow shock: bright at the nose and along its edge, nothing over the tail.
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
        float front = smoothstep(0.0, 1.0, vFront);
        vec3 col = mix(vec3(1.0, 0.3, 0.06), vec3(1.0, 0.85, 0.65), front * front);
        gl_FragColor = vec4(col * (rim * 1.4 + front * front * 0.35) * front * uGlow * 2.0, 1.0);
      }`,
  }));
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat);
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.name = 'air-plasma';
  return { mesh, u };
}
