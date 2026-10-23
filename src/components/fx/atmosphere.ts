/**
 * Atmospheres by scattering: a shell around the body; each pixel marches the view ray through the shell (stopping at
 * the surface), adding light where the air is sunlit and dimming it by the air in front. That gives the blue limb on
 * Earth, haze over the disc, a warm band at the terminator and a bright ring when the planet is backlit.
 * All sizes come from the mesh's own scale and the body radius, so a rescaled planet keeps its air.
 */
import * as THREE from 'three';
import type { SpaceUniforms } from '../space/materials';
import { fxQuality } from './quality';
import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS } from './glsl';

export interface AtmoLook {
  /** Shell radius as a multiple of the body radius. */
  height: number;
  /** Day colour of the scattered light (linear). */
  day: THREE.ColorRepresentation;
  /** Colour near the terminator. */
  dusk: THREE.ColorRepresentation;
  /** Overall brightness. */
  strength: number;
  /** How fast the air thins with height (higher = thinner, hugging the surface). */
  falloff: number;
  /** Forward scattering when backlit (0 none .. 1 strong). */
  mie: number;
  /** How much haze lies over the disc itself (0..1). */
  haze: number;
}

export const ATMO: Record<'earth' | 'venus' | 'mars' | 'jupiter' | 'saturn', AtmoLook> = {
  earth: { height: 1.045, day: 0x3a7dff, dusk: 0xff8a4a, strength: 2.4, falloff: 4.2, mie: 0.6, haze: 0.55 },
  venus: { height: 1.07, day: 0xffc870, dusk: 0xff7a30, strength: 1.25, falloff: 2.6, mie: 0.45, haze: 0.5 }, // graphics-pass: at 2.0 / 0.9 the sunward disc burned white
  mars: { height: 1.03, day: 0xf0a070, dusk: 0x6a90ff, strength: 1.1, falloff: 5.0, mie: 0.5, haze: 0.35 },
  jupiter: { height: 1.035, day: 0xffd0a0, dusk: 0xff7a40, strength: 0.8, falloff: 3.6, mie: 0.6, haze: 0.18 },
  saturn: { height: 1.035, day: 0xffd898, dusk: 0xffa050, strength: 0.75, falloff: 3.6, mie: 0.6, haze: 0.18 },
};

const VERT = /* glsl */ `
${LOGDEPTH_VERT_PARS}
uniform float uRp;
uniform float uRa;
varying vec3 vWorld;
varying vec3 vCentre;
varying float vRp;
varying float vRa;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vCentre = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length(modelMatrix[0].xyz);
  vRp = uRp * s;
  vRa = uRa * s;
  gl_Position = projectionMatrix * viewMatrix * w;
  ${LOGDEPTH_VERT}
}`;

const FRAG = /* glsl */ `
${LOGDEPTH_FRAG_PARS}
uniform vec3 uSun;
uniform vec3 uDay;
uniform vec3 uDusk;
uniform float uStrength;
uniform float uFalloff;
uniform float uMie;
uniform float uHaze;
uniform int uSteps;
varying vec3 vWorld;
varying vec3 vCentre;
varying float vRp;
varying float vRa;

vec2 hitSphere(vec3 ro, vec3 rd, vec3 c, float r){
  vec3 oc = ro - c;
  float b = dot(oc, rd);
  float h = b * b - (dot(oc, oc) - r * r);
  if (h < 0.0) return vec2(1e20, -1e20);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

void main(){
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorld - ro);
  vec2 ta = hitSphere(ro, rd, vCentre, vRa);
  if (ta.y < 0.0) discard;
  vec2 tp = hitSphere(ro, rd, vCentre, vRp);
  float t0 = max(ta.x, 0.0);
  bool ground = tp.x > 0.0 && tp.x < ta.y;
  float t1 = ground ? tp.x : ta.y;
  float thick = vRa - vRp;
  float ds = (t1 - t0) / float(uSteps);
  vec3 L = normalize(uSun - vCentre);
  vec3 inscatter = vec3(0.0);
  float depth = 0.0;
  for (int i = 0; i < 16; i++){
    if (i >= uSteps) break;
    vec3 x = ro + rd * (t0 + ds * (float(i) + 0.5));
    vec3 up = x - vCentre;
    float r = length(up);
    float h = clamp((r - vRp) / thick, 0.0, 1.0);
    float dens = exp(-h * uFalloff) * (1.0 - h);
    float d = dens * ds / thick;
    depth += d;
    float mu = dot(up / r, L);
    float lit = smoothstep(-0.14, 0.3, mu);
    // Light that reaches here low over the terminator has crossed more air: redden it.
    vec3 tint = mix(uDusk, uDay, smoothstep(-0.08, 0.22, mu));
    inscatter += tint * lit * d * exp(-depth * 0.6);
  }
  float cosA = dot(rd, L);
  float g = 0.76;
  float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosA, 1.5) * 0.08;
  vec3 col = inscatter * (1.0 + uMie * hg * 6.0);
  if (ground) col *= uHaze * mix(0.45, 1.0, smoothstep(-0.05, 0.3, dot(normalize(ro + rd * t1 - vCentre), L)));
  gl_FragColor = vec4(col * uStrength, 1.0);
  ${LOGDEPTH_FRAG}
}`;

/** An air shell for a body of radius `radius` (in the parent's units). Add it beside the body, at its centre. */
export function atmosphereShell(radius: number, look: AtmoLook, u: SpaceUniforms): THREE.Mesh {
  const ra = radius * look.height;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSun: u.uSun, uRp: { value: radius }, uRa: { value: ra },
      uDay: { value: new THREE.Color(look.day) }, uDusk: { value: new THREE.Color(look.dusk) },
      uStrength: { value: look.strength }, uFalloff: { value: look.falloff }, uMie: { value: look.mie }, uHaze: { value: look.haze },
      uSteps: { value: 10 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(ra, 96, 48), mat);
  const c = new THREE.Vector3();
  // Outside the shell draw its front faces; inside it, the back faces, so the sky glows around you near the ground.
  mesh.onBeforeRender = (_r, _s, cam) => {
    mesh.getWorldPosition(c);
    const s = mesh.matrixWorld.elements[0] ** 2 + mesh.matrixWorld.elements[1] ** 2 + mesh.matrixWorld.elements[2] ** 2;
    const inside = cam.position.distanceToSquared(c) < ra * ra * s * 1.002;
    mat.side = inside ? THREE.BackSide : THREE.FrontSide;
    mat.uniforms.uSteps.value = fxQuality.high ? 8 : 4;
  };
  return mesh;
}
