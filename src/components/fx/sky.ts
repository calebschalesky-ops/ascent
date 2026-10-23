/**
 * The sky behind everything: nebulae in several hues, dust lanes, the Milky Way and a haze of faint stars, painted
 * once at start into a cube map. It is the scene's background (so it costs one texture read per pixel, not a noise
 * shader) and, brightened, the environment the ship's metal and glass reflect.
 */
import * as THREE from 'three';
import { NOISE } from '../space/materials';
import { isMobile } from './quality';

const SKY_FRAG = /* glsl */ `
uniform vec3 uPole; uniform vec3 uCentre; uniform float uBoost; uniform float uFloor;
varying vec3 vDir;
${NOISE}

float cloud(vec3 p, float s){
  vec3 q = p * s;
  vec3 w = vec3(fbm(q + 3.1), fbm(q + 7.7), fbm(q + 1.3));
  return fbm(q + 1.6 * w);
}
float lobe(vec3 p, vec3 c, float width){ float d = 1.0 - dot(p, normalize(c)); return exp(-d / width); }
float stars(vec3 p, float scale, float thresh){
  vec3 c = floor(p * scale);
  vec3 h = hash3(c);
  vec3 f = fract(p * scale) - h;            // star sits at a random spot in its cell
  float d = length(f);
  float on = step(thresh, h.x);
  return on * smoothstep(0.35, 0.0, d) * (0.4 + 2.0 * pow(h.y, 6.0));
}

void main(){
  vec3 p = normalize(vDir);
  // Base: a deep indigo that is never black, warmer toward the galactic centre.
  float b = dot(p, uPole);
  float ang = acos(clamp(dot(p, uCentre), -1.0, 1.0));
  vec3 col = mix(vec3(0.0018, 0.0028, 0.0090), vec3(0.0040, 0.0026, 0.0085), 0.5 + 0.5 * p.y);

  // The Milky Way: a bright band with a bulge, cut by dark dust.
  float band = exp(-b * b / 0.012);
  float wide = exp(-b * b / 0.08);
  float mwClouds = 0.45 + 0.55 * cloud(p, 3.0);
  float dust = smoothstep(0.0, 0.45, fbm(p * 7.0 + 3.0) + 0.25 * fbm(p * 19.0)) * exp(-b * b / 0.003);
  float bulge = exp(-ang * ang / 0.25) * exp(-b * b / 0.025);
  float mw = (band * mwClouds * 0.9 + wide * 0.18) * (1.0 - 0.85 * dust) + bulge * 1.6 * (1.0 - 0.6 * dust);
  col += mix(vec3(0.030, 0.040, 0.080), vec3(0.110, 0.075, 0.040), clamp(bulge * 1.6, 0.0, 1.0)) * mw;

  // Nebulae: emission clouds of their own colour, each in a broad region of the sky.
  float n1 = pow(smoothstep(0.0, 0.7, cloud(p, 1.8)), 1.6) * lobe(p, vec3(0.55, 0.25, -0.8), 0.35);
  float n2 = pow(smoothstep(-0.05, 0.6, cloud(p + 5.0, 2.2)), 1.4) * lobe(p, vec3(-0.7, -0.15, 0.55), 0.45);
  float n3 = pow(smoothstep(0.05, 0.7, cloud(p + 11.0, 2.6)), 1.5) * lobe(p, vec3(0.1, 0.75, 0.6), 0.35);
  float n4 = pow(smoothstep(0.15, 0.75, cloud(p + 17.0, 3.0)), 1.8) * lobe(p, vec3(-0.35, -0.6, -0.7), 0.18);
  float lanes = smoothstep(0.1, 0.5, fbm(p * 6.0 + 9.0));      // dark filaments through the glow
  vec3 neb = vec3(0.0);
  neb += n1 * mix(vec3(0.20, 0.015, 0.110), vec3(0.26, 0.050, 0.070), cloud(p, 4.0) * 0.5 + 0.5);   // rose and magenta
  neb += n2 * mix(vec3(0.010, 0.080, 0.130), vec3(0.040, 0.150, 0.140), cloud(p, 5.0) * 0.5 + 0.5); // teal
  neb += n3 * mix(vec3(0.070, 0.030, 0.160), vec3(0.120, 0.060, 0.200), cloud(p, 4.5) * 0.5 + 0.5); // violet
  neb += n4 * vec3(0.24, 0.060, 0.018);                                                             // amber
  neb *= 1.0 - 0.7 * lanes;
  // Bright knots where the gas is densest.
  float knots = pow(max(cloud(p * 1.7, 6.0), 0.0), 3.0) * (n1 + n2 + n3 + n4);
  neb += knots * vec3(0.5, 0.35, 0.45);
  col += neb;

  // A haze of faint stars, thicker along the Milky Way; a few brighter ones.
  float st = stars(p, 260.0, 0.82) * (0.25 + 1.2 * band) + stars(p + 0.37, 120.0, 0.93) * 0.8;
  col += st * vec3(0.20, 0.21, 0.26);

  // For reflections only: a soft studio floor so polished metal never goes black, lighter overhead.
  if (uFloor > 0.0) col = min(col, vec3(0.06));   // no hot spots in reflections
  col += uFloor * mix(vec3(0.6, 0.55, 0.7), vec3(1.0, 0.98, 1.05), 0.5 + 0.5 * p.y);
  gl_FragColor = vec4(col * uBoost, 1.0);
}`;

function skyMaterial(pole: THREE.Vector3, centre: THREE.Vector3, boost: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uPole: { value: pole.clone().normalize() }, uCentre: { value: centre.clone().normalize() }, uBoost: { value: boost }, uFloor: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: SKY_FRAG,
    defines: { OCTAVES: 5 },
    side: THREE.BackSide,
    depthWrite: false,
  });
}

export interface Sky { background: THREE.Texture; environment: THREE.Texture; dispose: () => void }

/** Paint the sky into a cube map once. `pole` and `centre` place the Milky Way. */
export function createSky(renderer: THREE.WebGLRenderer, pole: THREE.Vector3, centre: THREE.Vector3): Sky {
  const res = isMobile ? 512 : 1024;
  const skyScene = new THREE.Scene();
  const mat = skyMaterial(pole, centre, 1);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), mat);
  skyScene.add(mesh);

  const rt = new THREE.WebGLCubeRenderTarget(res, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const cubeCam = new THREE.CubeCamera(0.1, 100, rt);
  const prevTM = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  cubeCam.update(renderer, skyScene);

  // The environment for reflections: the same sky, brighter, so metal picks up its colours.
  mat.uniforms.uBoost.value = 5;
  mat.uniforms.uFloor.value = 0.03;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(skyScene, 0, 0.1, 100).texture;
  renderer.toneMapping = prevTM;
  pmrem.dispose();
  mesh.geometry.dispose();
  mat.dispose();

  return {
    background: rt.texture,
    environment: env,
    dispose: () => { rt.dispose(); env.dispose(); },
  };
}
