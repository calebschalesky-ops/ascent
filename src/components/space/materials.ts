import * as THREE from 'three';
import { earthMapTexture } from './earthMap';

/**
 * Procedural, GPU-generated materials for the voyage. Every surface is computed per pixel from 3D noise
 * in the body's own coordinates, so there are no texture seams, nothing to download, and clouds,
 * bands and the Sun's surface can move.
 */

// 3D simplex noise: Ian McEwan, Ashima Arts / Stefan Gustavson, "webgl-noise" (MIT licence).
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float a=0.5,s=0.0;
  for(int i=0;i<OCTAVES;i++){ s+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; }
  return s;
}
vec3 hash3(vec3 p){
  p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));
  return fract(sin(p)*43758.5453123);
}
// Distance to the nearest feature point, with a smooth minimum: a plain minimum leaves a crease where two cells meet,
// which shows as a straight seam across the ground when you fly a few ship lengths over it.
float worley(vec3 p){
  vec3 i=floor(p),f=fract(p);
  float s=0.0;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
    vec3 o=vec3(float(x),float(y),float(z));
    vec3 r=o+hash3(i+o)-f;
    s+=exp(-14.0*length(r));
  }
  return max(-log(s)/14.0, 0.0);
}
// A bowl with a raised rim; zero away from craters.
float crater(vec3 p){
  float d=worley(p);
  float k=(d-0.52)*9.0;
  return (smoothstep(0.0,0.55,d)-1.0)*0.8+0.45*exp(-k*k);
}
vec3 lin(vec3 c){ return pow(c,vec3(2.2)); }
// Fine detail that appears as you come close: octaves past 'base' are added for as long as they are bigger than a pixel
// on the surface, so a body that fills the sky still has texture, and one far off costs one octave. Roughly -1..1.
#ifndef DETAIL
#define DETAIL 1
#endif
float detail(vec3 p, float base){
  float fw = max(length(fwidth(p)), 1e-9);
  float s = 0.0, a = 0.5, f = base;
  for (int i = 0; i < DETAIL; i++){
    float k = 1.0 - smoothstep(0.08, 0.3, f * fw); // gone before it is under about three pixels across
    if (k <= 0.0) break;
    s += a * k * snoise(p * f + vec3(float(i) * 7.31, float(i) * 3.17, 0.0));
    a *= 0.5; f *= 2.07;
  }
  return s * 2.0;
}
`;

/**
 * Every custom shader here writes the logarithmic depth the renderer uses (Voyage turns on logarithmicDepthBuffer,
 * because the cosmos is half a million ship lengths across). The chunks are no-ops when it is off.
 */
const LOGDEPTH_VERT = /* glsl */ `
#include <logdepthbuf_pars_vertex>
#ifdef USE_LOGDEPTHBUF
bool isPerspectiveMatrix(mat4 m){ return m[2][3] == -1.0; }
#endif
`;
export function withLogDepth<T extends THREE.ShaderMaterial>(m: T): T {
  const v = m.vertexShader;
  const end = v.lastIndexOf('}');
  m.vertexShader = LOGDEPTH_VERT + v.slice(0, end) + '\n#include <logdepthbuf_vertex>\n' + v.slice(end);
  m.fragmentShader = '#include <logdepthbuf_pars_fragment>\n' + m.fragmentShader.replace(/void main\(\)\s*\{/, (x) => `${x}\n#include <logdepthbuf_fragment>\n`);
  return m;
}

const mobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const OCTAVES = mobile ? 4 : 6;
const DETAIL = mobile ? 9 : 15; // the most extra octaves close to a surface (real scale: five more, for 32× the radius)

/** Uniforms shared by every material: the Sun's world position and the clock. */
export interface SpaceUniforms {
  uSun: { value: THREE.Vector3 };
  uTime: { value: number };
}
export const makeSpaceUniforms = (): SpaceUniforms => ({ uSun: { value: new THREE.Vector3() }, uTime: { value: 0 } });

export type SurfaceKind = 'moon' | 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'sun';

// Positions go through modelViewMatrix (composed on the CPU in double precision) rather than modelMatrix and viewMatrix
// one after the other, which in single precision would shake a surface you are skimming 200,000 units from the origin.
// The view and Sun directions are taken back into the body's frame the same way (rotation only: these are not scaled).
const SURFACE_VERT = /* glsl */ `
uniform vec3 uSun;
varying vec3 vObj;
varying vec3 vSunObj;
varying vec3 vViewObj;
void main(){
  vObj = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  mat3 toObj = transpose(mat3(modelViewMatrix));
  vSunObj = toObj * ((viewMatrix * vec4(uSun, 1.0)).xyz - mv.xyz);
  vViewObj = toObj * (-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const SURFACE_FRAG = /* glsl */ `
uniform float uTime;
varying vec3 vObj;
varying vec3 vSunObj;
varying vec3 vViewObj;
${NOISE}

// Bump from screen-space derivatives of the height field: one height sample per pixel.
vec3 bumpNormal(vec3 p, vec3 n, float h, float scale){
  vec3 dpx = dFdx(p), dpy = dFdy(p);
  float dhx = dFdx(h) * scale, dhy = dFdy(h) * scale;
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  vec3 b = abs(det) * n - grad;
  return dot(b, b) > 1e-20 ? normalize(b) : n;
}

// A direction from latitude and longitude in degrees (east positive, as conquest's anchors read the body's frame).
vec3 dirLL(float lat, float lon){ float a = radians(lat), o = radians(lon); return vec3(cos(a) * cos(o), sin(a), -cos(a) * sin(o)); }
// Arc from a point, in units of r degrees (below 1 inside the cap).
float capD(vec3 p, float lat, float lon, float r){ return acos(clamp(dot(p, dirLL(lat, lon)), -1.0, 1.0)) / radians(r); }
float latDeg(vec3 p){ return degrees(asin(clamp(p.y, -1.0, 1.0))); }
float lonDeg(vec3 p){ return degrees(atan(-p.z, p.x)); }
// Ray streaks round a crater: bright spokes fading with distance.
float rays(vec3 p, float lat, float lon, float reach, float seed){
  vec3 c = dirLL(lat, lon);
  float d = acos(clamp(dot(p, c), -1.0, 1.0));
  vec3 t1 = normalize(cross(c, abs(c.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 t2 = cross(c, t1);
  float az = atan(dot(p, t2), dot(p, t1));
  float s = smoothstep(0.55, 0.95, snoise(vec3(cos(az) * 9.0, sin(az) * 9.0, seed)) * 0.5 + 0.5);
  return s * exp(-d / radians(reach)) * smoothstep(radians(1.5), radians(3.0), d);
}
#if defined(MOONLET)
// A major moon (moonScene.ts): three hand-picked colours and a style, so each reads as itself from orbit.
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uStyle; uniform float uSeed;
#endif
#if defined(EARTH)
uniform sampler2D uLand;
vec3 earthMap(vec3 p, float warp){
  float lat = asin(clamp(p.y, -1.0, 1.0));
  float lon = atan(-p.z, p.x);
  vec2 uv = vec2(lon / 6.2831853 + 0.5, lat / 3.1415927 + 0.5) + warp * vec2(0.006, 0.008);
  return texture2D(uLand, uv).rgb;
}
#endif

float height(vec3 p, float d){
#if defined(MOON)
  float h = 0.2 * fbm(p * 3.0);
  h += 0.32 * crater(p * 4.0);
  h += 0.16 * crater(p * 9.0 + 3.1);
  h += 0.07 * crater(p * 21.0 + 7.7) * (1.0 - smoothstep(0.1, 0.5, length(fwidth(p)) * 21.0));
  return h + 0.004 * d;
#elif defined(MERCURY)
  float h = 0.3 * fbm(p * 3.0);
  h += 0.5 * crater(p * 5.0);
  h += 0.28 * crater(p * 11.0 + 3.1);
  h += 0.14 * crater(p * 23.0 + 7.7);
  h += 0.06 * crater(p * 61.0 + 1.9) * (1.0 - smoothstep(0.1, 0.5, length(fwidth(p)) * 61.0));
  return h + 0.006 * d;
#elif defined(MARS)
  float h = 0.35 * fbm(p * 2.5) + 0.09 * crater(p * 9.0) + 0.08 * fbm(p * 16.0) + 0.005 * d; // craters softer than the Moon's
  // The Tharsis shields and Olympus Mons stand up; the canyon cuts down.
  h += 0.9 * exp(-pow(capD(p, 18.4, -134.0, 6.5), 2.0)) - 0.5 * exp(-pow(capD(p, 18.4, -134.0, 1.1), 2.0));
  h += 0.5 * (exp(-pow(capD(p, -8.4, -120.5, 3.2), 2.0)) + exp(-pow(capD(p, 0.8, -113.4, 3.0), 2.0)) + exp(-pow(capD(p, 11.8, -104.5, 3.2), 2.0)));
  float lo = lonDeg(p), la = latDeg(p);
  float vm = smoothstep(-96.0, -88.0, lo) * (1.0 - smoothstep(-40.0, -30.0, lo));
  h -= 0.8 * vm * exp(-pow((la + 8.0 + 2.5 * sin(radians(lo) * 9.0) * 0.3 + 1.6 * fbm(p * 7.0)) / 1.6, 2.0));
  return h;
#elif defined(MOONLET)
  vec3 q = p + vec3(uSeed);
  if (uStyle > 2.5 && uStyle < 3.5) return 0.0; // Titan: the haze hides the ground
  float cr = uStyle > 1.5 && uStyle < 2.5 ? 0.06 : uStyle > 3.5 && uStyle < 4.5 ? 0.12 : uStyle > 0.5 && uStyle < 1.5 ? 0.05 : 0.34;
  return 0.18 * fbm(q * 3.0) + cr * crater(q * 4.5) + cr * 0.5 * crater(q * 10.0 + 3.1) + 0.004 * d;
#elif defined(EARTH)
  vec3 m = earthMap(p, fbm(p * 18.0));
  float land = smoothstep(0.42, 0.6, m.r + 0.12 * fbm(p * 26.0));
  return land * (0.6 + 1.1 * m.b + 0.5 * fbm(p * 9.0)) + land * 0.004 * d;
#else
  return 0.0;
#endif
}

void main(){
  vec3 p = normalize(vObj);
  vec3 L = normalize(vSunObj);
  vec3 V = normalize(vViewObj);
  float dt = detail(p, 2.2 * pow(2.03, float(OCTAVES)));
  float h = height(p, dt);
  vec3 col;

#if defined(SUN)
  float t = uTime;
  float big = fbm(p * 4.0 + vec3(0.0, t * 0.015, 0.0));
  float gran = snoise(p * 55.0 + vec3(t * 0.08)) * 0.7 + 0.3 * dt;
  float mu = clamp(dot(p, V), 0.0, 1.0);
  // Kept in range so granulation and the orange limb survive tone mapping; bloom supplies the glare.
  float cells = worley(p * 38.0 + vec3(t * 0.03));
  col = mix(lin(vec3(1.0, 0.38, 0.05)), lin(vec3(1.0, 0.86, 0.55)), clamp(0.5 + 0.7 * big, 0.0, 1.0));
  col *= (0.7 + 0.3 * gran) * (0.62 + 0.5 * smoothstep(0.05, 0.6, cells));
  col = mix(col * vec3(1.0, 0.55, 0.25), col, pow(mu, 0.6));
  col *= (0.30 + 0.70 * pow(mu, 0.5)) * 2.1;
  gl_FragColor = vec4(col, 1.0);
  return;
#else

  vec3 n = p;
  float spec = 0.0;
  vec3 glow = vec3(0.0);

#if defined(MOON)
  // The near side as it is: pale highlands, the maria where they are, Copernicus and Tycho with their rays.
  n = bumpNormal(p, p, h, 0.032);
  vec3 pw = normalize(p + 0.05 * vec3(fbm(p * 4.0 + 1.0), fbm(p * 4.0 + 7.0), fbm(p * 4.0 + 13.0)));
  float mare = 0.0;
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, 33.0, -16.0, 17.0)));  // Imbrium
  mare = max(mare, smoothstep(1.0, 0.65, capD(pw, 20.0, -55.0, 21.0))); // Procellarum
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, -2.0, -38.0, 13.0)));
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, 28.0, 17.5, 9.5)));   // Serenitatis
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, 8.5, 31.0, 10.5)));   // Tranquillitatis
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, 17.0, 59.0, 7.5)));   // Crisium
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, -8.0, 51.0, 8.0)));   // Fecunditatis
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, -15.0, 35.0, 5.0)));  // Nectaris
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, -21.0, -17.0, 9.0))); // Nubium
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, -10.0, -23.0, 6.0))); // Cognitum
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, -24.0, -39.0, 5.0))); // Humorum
  mare = max(mare, smoothstep(1.0, 0.7, capD(pw, 13.0, 4.0, 4.5)));    // Vaporum
  mare = max(mare, smoothstep(1.0, 0.6, abs(latDeg(pw) - 56.0) / 5.0) * smoothstep(60.0, 40.0, abs(lonDeg(pw))) * 0.85); // Frigoris
  mare *= 0.75 + 0.25 * fbm(p * 9.0);
  col = mix(lin(vec3(0.70, 0.69, 0.66)), lin(vec3(0.31, 0.31, 0.33)), mare);
  col *= 0.9 + 0.16 * fbm(p * 14.0);
  col *= 1.0 + 0.22 * clamp(h, -0.5, 0.6);
  float ray = rays(p, -43.3, -11.2, 18.0, 1.0) + 0.7 * rays(p, 9.6, -20.1, 8.0, 5.0) + 0.5 * rays(p, 8.1, -38.0, 5.0, 9.0);
  col = mix(col, lin(vec3(0.82, 0.81, 0.78)), clamp(ray, 0.0, 1.0) * 0.55);
  col = mix(col, lin(vec3(0.86, 0.85, 0.82)), smoothstep(1.0, 0.6, capD(p, -43.3, -11.2, 1.4)) + smoothstep(1.0, 0.6, capD(p, 9.6, -20.1, 1.3)));
  col *= 1.0 + 0.1 * dt;
#elif defined(MERCURY)
  // Dark grey rock, cratered, a few bright young craters with rays.
  n = bumpNormal(p, p, h, 0.05);
  col = mix(lin(vec3(0.44, 0.42, 0.40)), lin(vec3(0.30, 0.29, 0.28)), smoothstep(-0.2, 0.4, fbm(p * 2.0)));
  col *= 0.85 + 0.25 * fbm(p * 20.0);
  col *= 1.0 + 0.3 * clamp(h, -0.5, 0.6);
  col = mix(col, lin(vec3(0.66, 0.64, 0.6)), clamp(rays(p, -12.0, 30.0, 9.0, 3.0) + rays(p, 40.0, -140.0, 7.0, 4.0), 0.0, 1.0) * 0.45);
  col *= 1.0 + 0.12 * dt;
#elif defined(VENUS)
  // A pale cream cloud deck with soft streaks swept along the latitudes, and the faint Y the cloud tops draw.
  float la = radians(latDeg(p));
  vec3 q = vec3(p.x, p.y * 4.0, p.z) + 0.35 * vec3(fbm(p * 2.0 + vec3(uTime * 0.004, 0.0, 0.0)), 0.0, fbm(p * 2.0 + 5.0));
  float c = fbm(q * 1.6 + vec3(uTime * 0.008, 0.0, 0.0));
  float streak = fbm(vec3(p.x * 1.2, p.y * 9.0 + 0.6 * sin(atan(-p.z, p.x) * 2.0) * (1.0 - abs(p.y)), p.z * 1.2) * 2.2);
  col = mix(lin(vec3(0.96, 0.92, 0.78)), lin(vec3(0.86, 0.77, 0.56)), smoothstep(-0.35, 0.6, c * 0.6 + streak * 0.5));
  col = mix(col, lin(vec3(0.97, 0.95, 0.86)), smoothstep(0.55, 0.95, abs(sin(la))) * 0.35);
  // Held well under the bloom threshold: at 0.74 the whole disc burned to a white blob in the sunward views.
  col *= 0.5 + 0.03 * dt;
  col = mix(col, col * vec3(1.05, 0.95, 0.78), 0.6); // a little more sulphur, so it is cream and not white
  // The night side (GRAPHICS-PASS-3 #3) was a black disc: now the hot ground's ember glow seeps up through the thin
  // parts of the deck, and the Nephelai's floating cities show as clusters of gold lamps, the odd one emerald, adrift
  // in the cloud bands.
  float thin = 1.0 - smoothstep(-0.2, 0.5, c * 0.6 + streak * 0.5);
  glow = lin(vec3(0.62, 0.2, 0.06)) * (0.008 + 0.045 * thin * thin * thin);
  float city = smoothstep(0.64, 0.86, snoise(q * 26.0) * 0.5 + 0.5) * smoothstep(0.35, 0.75, fbm(p * 5.0 + 7.0) + 0.3);
  city *= (0.35 + 0.65 * smoothstep(-0.1, 0.5, dt)) * smoothstep(0.92, 0.6, abs(p.y));
  glow += city * mix(lin(vec3(1.0, 0.76, 0.34)), lin(vec3(0.3, 1.0, 0.5)), step(0.8, fract(sin(dot(floor(q * 26.0), vec3(127.1, 311.7, 74.7))) * 43758.5453))) * 0.32;
#elif defined(MARS)
  // Rust, with its real dark lands, the Tharsis volcanoes, Valles Marineris, Hellas and the north polar cap.
  n = bumpNormal(p, p, h, 0.03);
  vec3 pw = normalize(p + 0.06 * vec3(fbm(p * 3.0), fbm(p * 3.0 + 4.0), fbm(p * 3.0 + 9.0)));
  float dark = 0.0;
  dark = max(dark, smoothstep(1.0, 0.55, capD(pw, 8.0, 69.0, 11.0)));    // Syrtis Major
  dark = max(dark, smoothstep(1.0, 0.55, capD(pw, 46.0, -30.0, 14.0)));  // Acidalia
  dark = max(dark, smoothstep(1.0, 0.55, capD(pw, -3.0, 2.0, 9.0)) * 0.8); // Meridiani
  dark = max(dark, smoothstep(1.0, 0.55, capD(pw, -24.0, -38.0, 16.0)) * 0.85); // Erythraeum
  dark = max(dark, smoothstep(1.0, 0.55, capD(pw, -16.0, 108.0, 15.0)) * 0.85); // Tyrrhenum
  dark = max(dark, smoothstep(1.0, 0.55, capD(pw, -22.0, 148.0, 18.0)) * 0.85); // Cimmerium
  dark = max(dark, smoothstep(1.0, 0.55, capD(pw, -32.0, -153.0, 14.0)) * 0.8); // Sirenum
  dark = max(dark, smoothstep(1.0, 0.55, capD(pw, 60.0, 150.0, 18.0)) * 0.5);  // Utopia's dark rim
  dark *= 0.7 + 0.4 * fbm(p * 8.0);
  // Butterscotch and rust rather than one flat orange, with a broad mottle so every face of the planet has dark ground
  // on it (the hero view looks at Amazonis, which has none of the named dark lands).
  dark = max(dark, smoothstep(0.05, 0.55, fbm(pw * 2.6 + 11.0)) * 0.55);
  col = mix(lin(vec3(0.68, 0.38, 0.24)), lin(vec3(0.34, 0.18, 0.13)), clamp(dark, 0.0, 1.0));
  col = mix(col, lin(vec3(0.84, 0.58, 0.40)), smoothstep(0.3, 0.75, fbm(p * 5.0)) * 0.35);
  col = mix(col, lin(vec3(0.60, 0.26, 0.16)), smoothstep(0.2, 0.7, fbm(p * 11.0 + 3.0)) * 0.25);
  col = mix(col, lin(vec3(0.84, 0.6, 0.42)), smoothstep(1.0, 0.5, capD(pw, -42.0, 70.0, 14.0)) * 0.6); // Hellas
  // Tharsis: pale shields with dark summit calderas.
  float shield = exp(-pow(capD(p, 18.4, -134.0, 6.5), 2.0)) + exp(-pow(capD(p, -8.4, -120.5, 3.2), 2.0)) + exp(-pow(capD(p, 0.8, -113.4, 3.0), 2.0)) + exp(-pow(capD(p, 11.8, -104.5, 3.2), 2.0));
  col = mix(col, lin(vec3(0.82, 0.52, 0.32)), clamp(shield, 0.0, 1.0) * 0.5);
  float cald = smoothstep(1.0, 0.6, capD(p, 18.4, -134.0, 0.9)) + smoothstep(1.0, 0.6, capD(p, -8.4, -120.5, 0.6)) + smoothstep(1.0, 0.6, capD(p, 0.8, -113.4, 0.5)) + smoothstep(1.0, 0.6, capD(p, 11.8, -104.5, 0.6));
  col = mix(col, lin(vec3(0.36, 0.17, 0.1)), clamp(cald, 0.0, 1.0) * 0.8);
  // Valles Marineris: a dark canyon with lit walls, the Noctis Labyrinthus maze at its western head.
  float lo = lonDeg(p), la = latDeg(p);
  float run = smoothstep(-96.0, -88.0, lo) * (1.0 - smoothstep(-40.0, -30.0, lo));
  float cy = la + 8.0 + 0.75 * sin(radians(lo) * 9.0) + 1.6 * fbm(p * 7.0);
  float canyon = run * exp(-pow(cy / 1.3, 2.0));
  float walls = run * exp(-pow((abs(cy) - 1.7) / 0.7, 2.0));
  float noctis = smoothstep(1.0, 0.4, capD(p, -7.0, -102.0, 5.0)) * smoothstep(0.55, 0.9, abs(snoise(p * 60.0)));
  col = mix(col, lin(vec3(0.3, 0.12, 0.08)), clamp(canyon + noctis * 0.6, 0.0, 1.0));
  col = mix(col, lin(vec3(0.9, 0.6, 0.4)), walls * 0.35);
  float cap = smoothstep(80.5, 83.0, la + 2.5 * fbm(p * 8.0)) + smoothstep(-85.0, -87.0, la + 1.5 * fbm(p * 8.0));
  cap *= 1.0 - 0.35 * smoothstep(0.4, 0.8, abs(snoise(p * 18.0))) * smoothstep(84.0, 88.0, abs(la)) ;
  col *= 1.0 + 0.12 * dt;
  col = mix(col, lin(vec3(0.96, 0.95, 0.93)), clamp(cap, 0.0, 1.0));
#elif defined(MOONLET)
  vec3 q = p + vec3(uSeed);
  float la = latDeg(p);
  n = bumpNormal(p, p, h, 0.03);
  float f1 = fbm(q * 2.2), f2 = fbm(q * 7.0 + 4.0);
  col = mix(uA, uB, smoothstep(-0.25, 0.45, f1));
  if (uStyle < 0.5) {
    // Old cratered ice and rock: bright young craters with rays sprinkled over a darker crust.
    float spots = smoothstep(0.80, 0.97, 1.0 - worley(q * 9.0)) + 0.6 * smoothstep(0.85, 0.98, 1.0 - worley(q * 21.0 + 2.0));
    col = mix(col, uC, clamp(spots, 0.0, 1.0) * 0.8);
    col *= 0.85 + 0.3 * clamp(h, -0.4, 0.6);
  } else if (uStyle < 1.5) {
    // Io: sulphur yellow and orange, dark lava calderas ringed with red plumes, white frost on the plains.
    float frost = smoothstep(0.35, 0.7, f2);
    col = mix(col, lin(vec3(0.93, 0.92, 0.80)), frost * 0.45);
    float w = worley(q * 6.0);
    float cald = smoothstep(0.16, 0.05, w);
    float ring = exp(-pow((w - 0.22) / 0.07, 2.0)) * smoothstep(0.3, 0.8, fbm(q * 13.0) + 0.5);
    col = mix(col, uC, ring * 0.7);
    col = mix(col, lin(vec3(0.06, 0.04, 0.03)), cald);
    glow = cald * lin(vec3(1.0, 0.35, 0.08)) * 0.6 * smoothstep(0.08, 0.02, w);
  } else if (uStyle < 2.5) {
    // Europa: a cracked white shell, rust-red lineae crossing it in long arcs, mottled chaos terrain.
    float l1 = abs(snoise(vec3(q.x * 3.0, q.y * 3.0, q.z * 3.0) + 1.0));
    float l2 = abs(snoise(q * 6.5 + 9.0));
    float lines = smoothstep(0.06, 0.0, l1) + 0.7 * smoothstep(0.045, 0.0, l2);
    col = mix(col, uC, clamp(lines, 0.0, 1.0) * 0.8);
    col = mix(col, uC * 1.2, smoothstep(0.35, 0.7, f2) * 0.35);
  } else if (uStyle < 3.5) {
    // Titan: an orange smog with soft bands and a darker north hood; the limb thickens to a blue haze.
    col = mix(uA, uB, smoothstep(-0.3, 0.6, fbm(vec3(p.x * 1.5, p.y * 6.0, p.z * 1.5) + 2.0) * 0.5 + 0.3 * sin(radians(la) * 5.0)));
    col = mix(col, uB * 0.7, smoothstep(45.0, 75.0, la) * 0.6);
    float limb = pow(1.0 - max(dot(p, V), 0.0), 3.0);
    col = mix(col, uC, limb * 0.8);
  } else if (uStyle < 4.5) {
    // Enceladus: the whitest thing in the system, smooth plains in the south cut by four blue tiger stripes.
    float south = smoothstep(-35.0, -60.0, la);
    float stripe = smoothstep(0.08, 0.0, abs(sin((p.x * 0.8 + p.z * 0.6) * 14.0 + 0.6 * snoise(q * 4.0))));
    col = mix(col, uC, stripe * south * 0.9);
    col *= 1.0 - 0.1 * (1.0 - south) * smoothstep(0.2, 0.6, 1.0 - worley(q * 12.0));
  } else if (uStyle < 5.5) {
    // Iapetus: one hemisphere coal-dark, the other snow-white, and the equatorial ridge across the dark one.
    float lead = dot(p, normalize(vec3(1.0, 0.0, 0.3))) + 0.25 * f1;
    col = mix(uB, uA, smoothstep(-0.15, 0.25, lead));
    col = mix(col, uC, exp(-pow(la / 2.5, 2.0)) * smoothstep(0.1, -0.2, lead) * 0.6);
    col *= 0.85 + 0.3 * clamp(h, -0.4, 0.6);
  } else {
    // Ganymede: dark old terrain broken by bright grooved bands, frosty poles.
    float band = smoothstep(-0.1, 0.25, fbm(q * 1.6 + 7.0));
    float groove = 0.5 + 0.5 * sin(dot(q, vec3(23.0, 9.0, 17.0)) + 6.0 * f2);
    col = mix(uB, uA, band);
    col = mix(col, uA * 1.15, band * groove * 0.35);
    col = mix(col, uC, smoothstep(55.0, 75.0, abs(la)) * 0.7);
    col *= 0.85 + 0.3 * clamp(h, -0.4, 0.6);
  }
  col *= 1.0 + 0.1 * dt;
  // Sunlit ice is the brightest thing in the sky; held under the bloom threshold so it reads as a world, not a lamp.
  col *= 0.62;
#elif defined(EARTH)
  // The real continents (earthMap.ts), coast cut finer by noise; forests, deserts, mountains, ice; blue oceans.
  float wp = fbm(p * 18.0);
  vec3 m = earthMap(p, wp);
  float land = smoothstep(0.42, 0.6, m.r + 0.12 * fbm(p * 26.0));
  float la = latDeg(p);
  float shelf = smoothstep(0.08, 0.45, m.r) * (1.0 - land);
  vec3 ocean = mix(lin(vec3(0.02, 0.09, 0.27)), lin(vec3(0.05, 0.27, 0.45)), shelf * 0.8);
  ocean *= 0.92 + 0.12 * fbm(p * 6.0);
  float tropic = 1.0 - smoothstep(10.0, 28.0, abs(la));
  vec3 green = mix(lin(vec3(0.20, 0.34, 0.13)), lin(vec3(0.08, 0.22, 0.07)), tropic * 0.8);
  green = mix(green, lin(vec3(0.30, 0.34, 0.18)), smoothstep(45.0, 62.0, abs(la)) * 0.6);
  float dry = clamp(m.g * (0.8 + 0.4 * fbm(p * 11.0)), 0.0, 1.0);
  vec3 ground = mix(green, lin(vec3(0.74, 0.61, 0.40)), smoothstep(0.2, 0.75, dry));
  ground = mix(ground, lin(vec3(0.45, 0.40, 0.34)), smoothstep(0.25, 0.8, m.b) * 0.7);
  ground *= 0.88 + 0.22 * fbm(p * 30.0);
  ground *= 1.0 + 0.18 * dt;
  ocean *= 1.0 + 0.04 * dt;
  col = mix(ocean, ground, land);
  float snow = land * smoothstep(0.5, 0.9, m.b) * smoothstep(25.0, 45.0, abs(la));
  float ice = smoothstep(63.0, 70.0, -la + 3.0 * fbm(p * 6.0)) + land * smoothstep(64.0, 72.0, la + 4.0 * fbm(p * 6.0)) + smoothstep(78.0, 84.0, la + 3.0 * fbm(p * 6.0));
  ice = clamp(ice + snow * 0.7, 0.0, 1.0);
  col = mix(col, lin(vec3(0.92, 0.95, 0.98)), ice);
  n = bumpNormal(p, p, h, 0.02 * land);
  vec3 H = normalize(L + V);
  spec = (1.0 - land) * (1.0 - ice) * pow(max(dot(n, H), 0.0), 60.0) * 1.6;
  // City lights on the night side: clustered specks on land, away from the ice.
  float town = smoothstep(0.55, 0.8, snoise(p * 60.0) * 0.5 + 0.5) * smoothstep(0.2, 0.6, fbm(p * 7.0 + 2.0) + 0.3) * (1.0 - dry);
  town *= 0.35 + 0.65 * smoothstep(-0.1, 0.5, dt); // close up, a city breaks into its lights
  glow = land * (1.0 - ice) * town * vec3(1.0, 0.72, 0.38) * 0.35;
#elif defined(JUPITER) || defined(SATURN)
  float t = uTime * 0.004;
  float la = latDeg(p);
  float lo = radians(lonDeg(p));
  // Turbulent band edges: the latitude wobbles with longitude and noise.
  float wob = 1.4 * fbm(vec3(p.x * 2.5, p.y * 7.0, p.z * 2.5) + vec3(t, 0.0, 0.0)) + 0.06 * dt;
#if defined(JUPITER)
  float L2 = la + wob;
  vec3 cream = lin(vec3(0.95, 0.91, 0.82));
  vec3 tan_ = lin(vec3(0.82, 0.67, 0.50));
  vec3 rust = lin(vec3(0.66, 0.40, 0.27));
  vec3 polar = lin(vec3(0.70, 0.64, 0.58));
  // Belts by latitude: the North and South Equatorial Belts rusty, the temperate belts tan, the zones cream.
  float neb = smoothstep(6.0, 8.5, L2) * (1.0 - smoothstep(16.5, 19.0, L2));
  float seb = smoothstep(-6.5, -9.0, L2) * (1.0 - smoothstep(-18.0, -20.5, L2));
  float ntb = smoothstep(23.0, 25.0, L2) * (1.0 - smoothstep(30.0, 32.0, L2));
  float stb = smoothstep(-26.0, -28.0, L2) * (1.0 - smoothstep(-32.0, -34.0, L2));
  float nn = smoothstep(35.0, 37.0, L2) * (1.0 - smoothstep(40.0, 42.0, L2));
  float ss = smoothstep(-37.0, -39.0, L2) * (1.0 - smoothstep(-42.0, -44.0, L2));
  col = cream;
  col = mix(col, tan_, (ntb + stb) * 0.85 + (nn + ss) * 0.6);
  col = mix(col, rust, neb * 0.9 + seb * 0.75);
  col = mix(col, mix(rust, cream, 0.45), seb * smoothstep(0.2, 0.8, fbm(vec3(lo * 3.0, L2 * 0.5, 2.0))) * 0.6); // the SEB's lighter core
  col = mix(col, polar, smoothstep(44.0, 55.0, abs(L2)));
  // Fine streaks along the bands, and festoons trailing from the equatorial belts.
  col *= 0.9 + 0.2 * fbm(vec3(p.x * 5.0, p.y * 40.0, p.z * 5.0) + vec3(t * 2.0, 0.0, 0.0));
  float fest = smoothstep(0.6, 0.9, snoise(vec3(lo * 6.0, L2 * 0.6, 3.0))) * exp(-pow((abs(L2) - 6.0) / 2.0, 2.0));
  col = mix(col, lin(vec3(0.42, 0.40, 0.45)), fest * 0.35);
  // The Great Red Spot at 22° south, with its pale collar; a string of white ovals below it.
  float dlo = atan(sin(lo - radians(60.0)), cos(lo - radians(60.0)));
  vec2 s = vec2(degrees(dlo) * cos(radians(22.0)) / 11.0, (la + 22.0) / 6.0);
  float r = length(s);
  col = mix(col, lin(vec3(0.97, 0.92, 0.84)), smoothstep(1.35, 1.05, r) * (1.0 - smoothstep(0.9, 0.75, r)) * 0.8);
  col = mix(col, mix(lin(vec3(0.78, 0.36, 0.22)), lin(vec3(0.68, 0.30, 0.2)), smoothstep(0.0, 0.8, r)), smoothstep(0.95, 0.7, r));
  for (int k = 0; k < 4; k++) {
    float ol = radians(160.0 + float(k) * 34.0);
    vec2 w = vec2(degrees(atan(sin(lo - ol), cos(lo - ol))) * cos(radians(40.0)) / 3.0, (la + 40.0) / 1.8);
    col = mix(col, cream, smoothstep(1.0, 0.6, length(w)) * 0.8);
  }
  col *= 1.0 + 0.06 * dt;
#else
  float L2 = la + wob * 0.5;
  vec3 gold = lin(vec3(0.93, 0.85, 0.66));
  vec3 butter = lin(vec3(0.84, 0.70, 0.47));
  float b = 0.5 + 0.5 * sin(radians(L2) * 22.0);
  // Bands that read (GRAPHICS-PASS-3 #4): at 0.45 of butter on gold, under the full Sun, the disc burned to a plain
  // cream ball. Wider butter belts, a tawny belt pair each side of the bright equator, and the albedo held under the
  // bloom threshold, as Venus's deck was in pass 1.
  vec3 tawny = lin(vec3(0.72, 0.52, 0.3));
  col = mix(gold, butter, b * 0.75 * smoothstep(4.0, 12.0, abs(L2)));
  col = mix(col, tawny, exp(-pow((abs(L2) - 17.0) / 3.5, 2.0)) * 0.55 + exp(-pow((abs(L2) - 33.0) / 2.5, 2.0)) * 0.35);
  col = mix(col, lin(vec3(0.97, 0.92, 0.76)), exp(-pow(L2 / 8.0, 2.0)) * 0.5);
  col *= 0.9 + 0.2 * fbm(vec3(p.x * 4.0, p.y * 30.0, p.z * 4.0));
  col = mix(col, lin(vec3(0.62, 0.66, 0.68)), smoothstep(62.0, 80.0, abs(L2)) * 0.45);
  col *= (1.0 + 0.05 * dt) * 0.64;
#endif
#endif

  float ndl = dot(n, L);
  // Thick atmospheres soften the terminator; airless bodies cut sharply.
#if defined(VENUS) || defined(JUPITER) || defined(SATURN) || defined(EARTH)
  float diff = smoothstep(-0.12, 0.5, ndl) * max(dot(p, L) + 0.15, 0.0) / 1.15;
#elif defined(MOONLET)
  float haze = uStyle > 2.5 && uStyle < 3.5 ? 1.0 : 0.0;
  float diff = mix(max(ndl, 0.0) * smoothstep(-0.05, 0.08, dot(p, L)), smoothstep(-0.12, 0.5, ndl) * max(dot(p, L) + 0.15, 0.0) / 1.15, haze);
#else
  float diff = max(ndl, 0.0) * smoothstep(-0.05, 0.08, dot(p, L));
#endif
  // Lighting: sunlit side, a warm band at the terminator on bodies with air, a faint cool fill on the night side
  // (light from the sky) so it is never pure black, and a rim of light where the limb faces the Sun.
  float mu = dot(p, L);
#if defined(VENUS) || defined(JUPITER) || defined(SATURN) || defined(EARTH) || defined(MARS)
  vec3 dusk = mix(vec3(1.0), vec3(1.2, 0.86, 0.68), exp(-pow(mu * 7.0, 2.0)) * smoothstep(-0.12, 0.05, mu));
#else
  vec3 dusk = vec3(1.0);
#endif
  float night = 1.0 - smoothstep(-0.25, 0.1, mu);
  float rim = pow(1.0 - max(dot(p, V), 0.0), 4.0) * smoothstep(-0.1, 0.4, mu);
  col = col * (diff * 1.55 * dusk + vec3(0.006, 0.009, 0.020) * (0.4 + night) + rim * 0.35)
      + vec3(spec) * vec3(1.0, 0.92, 0.8)
      + glow * night * 1.6;
  gl_FragColor = vec4(col, 1.0);
#endif
}`;

export function surfaceMaterial(kind: SurfaceKind, u: SpaceUniforms): THREE.ShaderMaterial {
  return withLogDepth(new THREE.ShaderMaterial({
    // Earth reads its continents from a map drawn at load (earthMap.ts); every other body is pure noise and shapes.
    uniforms: kind === 'earth' ? { uSun: u.uSun, uTime: u.uTime, uLand: { value: earthMapTexture() } } : { uSun: u.uSun, uTime: u.uTime },
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_FRAG,
    defines: { [kind.toUpperCase()]: '', OCTAVES, DETAIL },
  }));
}

/** Earth's cloud deck: a lit, drifting, semi-transparent shell. */
/** A major moon's surface (moonScene.ts): the planets' shader with three colours and a style. */
export function moonletMaterial(style: number, a: string, b: string, c: string, seed: number, u: SpaceUniforms): THREE.ShaderMaterial {
  const lin = (h: string) => { const k = new THREE.Color(h); return new THREE.Vector3(k.r, k.g, k.b); }; // THREE.Color is linear already
  return withLogDepth(new THREE.ShaderMaterial({
    uniforms: { uSun: u.uSun, uTime: u.uTime, uA: { value: lin(a) }, uB: { value: lin(b) }, uC: { value: lin(c) }, uStyle: { value: style }, uSeed: { value: seed } },
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_FRAG,
    defines: { MOONLET: '', OCTAVES, DETAIL },
  }));
}

export function cloudMaterial(u: SpaceUniforms): THREE.ShaderMaterial {
  return withLogDepth(new THREE.ShaderMaterial({
    uniforms: { uSun: u.uSun, uTime: u.uTime },
    vertexShader: SURFACE_VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vObj; varying vec3 vSunObj; varying vec3 vViewObj;
      ${NOISE}
      void main(){
        vec3 p = normalize(vObj);
        vec3 q = p + 0.25 * vec3(fbm(p * 2.0 + uTime * 0.004), 0.0, fbm(p * 2.0 + 4.0));
        float c = fbm(q * 3.2 + vec3(uTime * 0.006, 0.0, 0.0)) + 0.12 * detail(p, 3.2 * pow(2.03, float(OCTAVES)));
        float a = smoothstep(0.05, 0.55, c) * 0.85;
        float diff = smoothstep(-0.1, 0.4, dot(p, normalize(vSunObj)));
        gl_FragColor = vec4(vec3(diff * 1.4 + 0.01), a * (0.25 + 0.75 * diff));
      }`,
    defines: { OCTAVES, DETAIL },
    transparent: true,
    depthWrite: false,
  }));
}

/** Rim glow of an atmosphere, brightest on the day side. */
export function atmosphereMaterial(color: THREE.ColorRepresentation, strength: number, u: SpaceUniforms): THREE.ShaderMaterial {
  return withLogDepth(new THREE.ShaderMaterial({
    uniforms: { uSun: u.uSun, uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      uniform vec3 uSun;
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0); // in view space, for precision far from the origin
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vL = normalize((viewMatrix * vec4(uSun, 1.0)).xyz - mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uStrength;
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      void main(){
        float rim = pow(clamp(1.0 - dot(normalize(vN), normalize(vV)), 0.0, 1.0), 3.0);
        float day = smoothstep(-0.35, 0.5, dot(normalize(vN), normalize(vL)));
        gl_FragColor = vec4(uColor * rim * day * uStrength, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
}

/** Saturn's rings: banded density, the Cassini division, and the planet's shadow across them. */
export function ringMaterial(inner: number, outer: number, planetRadius: number, u: SpaceUniforms): THREE.ShaderMaterial {
  return withLogDepth(new THREE.ShaderMaterial({
    uniforms: { uSun: u.uSun, uInner: { value: inner }, uOuter: { value: outer }, uR: { value: planetRadius } },
    vertexShader: /* glsl */ `
      uniform vec3 uSun;
      varying vec3 vP; varying vec3 vSun;
      void main(){
        vP = position;
        vSun = transpose(mat3(modelViewMatrix)) * ((viewMatrix * vec4(uSun, 1.0)).xyz - (modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uInner; uniform float uOuter; uniform float uR;
      varying vec3 vP; varying vec3 vSun;
      ${NOISE}
      void main(){
        float r = (length(vP.xy) - uInner) / (uOuter - uInner);
        float dens = smoothstep(0.0, 0.03, r) * (1.0 - smoothstep(0.97, 1.0, r));
        dens *= 0.55 + 0.45 * snoise(vec3(r * 70.0, 0.3, 0.7));
        dens *= 0.8 + 0.2 * snoise(vec3(r * 260.0, 1.1, 2.3));
        dens *= mix(0.25, 1.0, smoothstep(0.12, 0.28, r));           // faint C ring
        dens *= 1.0 - (smoothstep(0.685, 0.695, r) * (1.0 - smoothstep(0.755, 0.765, r))) * 0.92; // Cassini division
        dens *= 1.0 - (smoothstep(0.935, 0.94, r) * (1.0 - smoothstep(0.95, 0.955, r))) * 0.7;   // Encke gap
        vec3 L = normalize(vSun);
        // Shadow of the planet on the rings.
        float tca = dot(-vP, L);
        float shadow = 1.0;
        if (tca > 0.0) { float d2 = dot(vP, vP) - tca * tca; shadow = smoothstep(uR * uR * 0.92, uR * uR * 1.05, d2); }
        float lit = (0.25 + 0.75 * abs(L.z)) * shadow;
        vec3 col = pow(vec3(0.86, 0.79, 0.64), vec3(2.2)) * (lit * 1.4 + 0.02);
        gl_FragColor = vec4(col, clamp(dens, 0.0, 1.0) * 0.92);
      }`,
    defines: { OCTAVES },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
}

/** A crystalline sphere: nearly invisible face-on, a coloured edge where you look across it. */
export function crystalMaterial(color: THREE.ColorRepresentation, rim = 0.5, base = 0.012): THREE.ShaderMaterial {
  return withLogDepth(new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uRim: { value: rim }, uBase: { value: base } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; varying vec3 vC;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vP = mv.xyz; vN = normalize(normalMatrix * normal); vC = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uRim; uniform float uBase;
      varying vec3 vN; varying vec3 vP; varying vec3 vC;
      void main(){
        // View space (planet scale's precision rule); the camera is at the origin.
        float f = clamp(1.0 - abs(dot(normalize(vN), normalize(-vP))), 0.0, 1.0);
        // Fade out near the shell itself, so flying past one never puts a glowing wall across the view (graphics).
        float R = length(vP - vC);
        float near = smoothstep(0.0, R * 0.25, abs(length(vC) - R));
        gl_FragColor = vec4(uColor * (uBase + uRim * pow(f, 7.0)) * near, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide, // the far rim only: half the fill of both sides, and from inside a shell it is all you see
    blending: THREE.AdditiveBlending,
  }));
}

/** Stars of different colour temperatures and brightness, gently scintillating. */
export function starField(radius: number, count: number, u: SpaceUniforms): THREE.Points {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const temps: [number, number, number, number][] = [
    // r, g, b, weight  (blue-white O/B to orange K/M)
    [0.62, 0.72, 1.0, 0.08], [0.80, 0.86, 1.0, 0.17], [1.0, 1.0, 1.0, 0.25], [1.0, 0.95, 0.85, 0.22], [1.0, 0.84, 0.62, 0.18], [1.0, 0.70, 0.48, 0.10],
  ];
  for (let i = 0; i < count; i++) {
    const z = rnd() * 2 - 1;
    const t = rnd() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);
    const r = radius * (0.99 + rnd() * 0.02);
    pos.set([r * s * Math.cos(t), r * z, r * s * Math.sin(t)], i * 3);
    let w = rnd();
    let c = temps[0];
    for (const tt of temps) { if (w < tt[3]) { c = tt; break; } w -= tt[3]; }
    col.set([c[0], c[1], c[2]], i * 3);
    const m = Math.pow(rnd(), 9); // a few bright stars, many faint ones
    size[i] = 1.1 + m * 5.5;
    phase[i] = rnd();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const mat = withLogDepth(new THREE.ShaderMaterial({
    uniforms: { uTime: u.uTime, uPR: { value: Math.min(window.devicePixelRatio || 1, 2) } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uPR;
      varying vec3 vC; varying float vB;
      void main(){
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPR;
        vC = aColor;
        vB = (0.8 + 0.2 * sin(uTime * (1.5 + aPhase * 3.0) + aPhase * 40.0)) * (0.35 + aSize * 0.25);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vB;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float core = exp(-r * r * 6.0);
        gl_FragColor = vec4(pow(vC, vec3(2.2)) * core * vB * 1.6, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  return new THREE.Points(geo, mat);
}

/** The Milky Way: a dusty band on the plane of the galaxy, tilted about 60 degrees to the plane the bodies lie in. */
export function milkyWay(radius: number, galacticPole: THREE.Vector3, galacticCentre: THREE.Vector3): THREE.Mesh {
  const mat = withLogDepth(new THREE.ShaderMaterial({
    uniforms: { uPole: { value: galacticPole.clone().normalize() }, uCentre: { value: galacticCentre.clone().normalize() } },
    vertexShader: /* glsl */ `
      varying vec3 vP;
      void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uPole; uniform vec3 uCentre;
      varying vec3 vP;
      ${NOISE}
      void main(){
        vec3 p = normalize(vP);
        float b = dot(p, uPole);
        float band = exp(-b * b / 0.018);
        float wide = exp(-b * b / 0.09) * 0.35;
        float clouds = 0.55 + 0.45 * fbm(p * 5.0);
        float dust = smoothstep(-0.05, 0.35, fbm(p * 9.0 + 3.0)) * exp(-b * b / 0.004);
        float ang = acos(clamp(dot(p, uCentre), -1.0, 1.0));
        float bulge = exp(-ang * ang / 0.35) * exp(-b * b / 0.03);
        float i = (band * clouds + wide) * (1.0 - 0.75 * dust) + bulge * 1.4;
        vec3 col = mix(vec3(0.55, 0.62, 0.85), vec3(1.0, 0.85, 0.65), clamp(bulge * 1.5, 0.0, 1.0));
        gl_FragColor = vec4(pow(col, vec3(2.2)) * i * 0.22, 1.0);
      }`,
    defines: { OCTAVES },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat);
}

/** Exhaust: a hot core fading to blue along the length, flickering. */
export function plumeMaterial(u: SpaceUniforms): THREE.ShaderMaterial {
  // Log depth through withLogDepth only (integration pass 2: graphics' own includes doubled it and broke the compile).
  return withLogDepth(new THREE.ShaderMaterial({
    uniforms: { uTime: u.uTime, uThrust: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vFacing;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFacing = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uThrust;
      varying vec2 vUv; varying float vFacing;
      void main(){
        float along = clamp(1.0 - vUv.y, 0.0, 1.0); // 1 at the nozzle, 0 at the tip
        float flick = 0.85 + 0.15 * sin(uTime * 60.0 + along * 20.0);
        // Shock diamonds: bright knots spaced down the plume, sharper with thrust.
        float diamonds = 0.6 + 0.4 * pow(0.5 + 0.5 * cos((1.0 - along) * 34.0 - uTime * 4.0), 3.0) * smoothstep(0.1, 0.6, along);
        float a = pow(along, 1.4) * flick * uThrust * diamonds * pow(vFacing, 1.2);
        vec3 col = mix(vec3(0.12, 0.30, 1.0), vec3(0.75, 0.9, 1.0), pow(along, 2.0));
        col = mix(col, vec3(1.0, 0.97, 0.9), pow(along, 6.0));
        gl_FragColor = vec4(col * a * 1.6, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }));
}
