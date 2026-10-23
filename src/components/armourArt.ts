/**
 * The god armour's look (ART-REFIT.md): each world's structure sculpted to its accepted reference sheet
 * (art-refit/01-PLANETS-AND-ARMOR.md and refs/<planet>.webp). Built from the same numbers the collision uses
 * (megastructure/armour.ts SHAPE, setpieces.ts), in the structure's own axes (x toward the inner system, y north, z east)
 * and in planet radii; armourScene.ts scales and turns it into place.
 *
 * Everything static is merged into one mesh per world with one material, so a structure is one draw call; columns are
 * one instanced mesh; the few moving parts (Mercury's train, Zeus's lightning) are small meshes of their own. The
 * ornament (meander key, leaf relief, lit window rows, mosaic, panel seams) is drawn in the material from per-vertex
 * pattern ids, with a bump from the pattern's height, so it costs no textures and no triangles.
 */
import * as THREE from 'three';
import {
  SHAPE, jupiterWallTop, mercurySpine, moonCircles, saturnTaper, venusBoss, venusRim,
} from '../lib/megastructure/armour';
import type { ArmourHome } from '../lib/megastructure/armour';
import {
  EARTH_RING, JUPITER_RING, JUPITER_SPIRE, MARS_STANDARD, MERCURY_HAT, MOON_DISHES, SATURN_DECK, SATURN_GLASS, VENUS_LAMPS,
  mercuryWing, saturnInner, venusLamps,
} from '../lib/megastructure/setpieces';

const D = Math.PI / 180;
const TAU = Math.PI * 2;
const frac = (x: number) => x - Math.floor(x);
type V = THREE.Vector3;
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
/** A unit direction from latitude and longitude (radians) in the structure's axes: longitude from x toward z. */
const sph = (lat: number, lon: number) => v3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
/** A point at azimuth `lon`, distance `r` from the y axis, height `y`. */
const cylP = (lon: number, r: number, y: number) => v3(Math.cos(lon) * r, y, Math.sin(lon) * r);
/** A stable 0..1 hash. */
const hash = (i: number, j = 0) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- the look of a surface ----------

/** Pattern ids, read by the material (patternChunk). */
export const PAT = { panel: 0, meander: 1, leaf: 2, windows: 3, mosaic: 4, smooth: 5, glow: 6, cloth: 7, slits: 8 } as const;

export interface Look {
  color: THREE.Color;
  pat: number;
  /** Emissive strength: a glow strip's brightness, or a window row's. Above about 1 it blooms. */
  glow: number;
  metal: number;
  rough: number;
  /** Pattern units per planet radius along u and v (a panel, a key, a window, a tile). */
  su: number; sv: number;
  /** A band pattern (meander, leaf, windows): the v range of the band, mapped to 0..1 across it. */
  band?: [number, number];
}
export const look = (color: number | THREE.Color, pat: number = PAT.panel, o: Partial<Look> = {}): Look => ({
  color: color instanceof THREE.Color ? color.clone() : new THREE.Color(color), pat, glow: 0, metal: 0.5, rough: 0.5, su: 40, sv: 40, ...o,
});

// ---------- a mesh builder: triangles with colour, pattern and material per vertex ----------

export class Mesher {
  private P: number[] = [];
  private N: number[] = [];
  private C: number[] = [];
  private A: number[] = [];
  private M: number[] = [];
  get count() { return this.P.length / 3; }

  private vert(p: V, n: V, L: Look, u: number, w: number) {
    this.P.push(p.x, p.y, p.z);
    this.N.push(n.x, n.y, n.z);
    this.C.push(L.color.r, L.color.g, L.color.b);
    this.A.push(u, w, L.pat, L.glow);
    this.M.push(L.metal, L.rough);
  }

  /** A quad (p0 p1 p2 p3 round its edge) with per-corner normals and pattern coordinates. */
  quad(p: V[], n: V[], L: Look, uv: [number, number][]) {
    const f = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0]));
    const flip = f.dot(n[0].clone().add(n[1]).add(n[2]).add(n[3])) < 0;
    const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const k of order) this.vert(p[k], n[k], L, uv[k][0], uv[k][1]);
  }

  tri(p: V[], n: V[], L: Look, uv: [number, number][]) {
    const f = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0]));
    const flip = f.dot(n[0].clone().add(n[1]).add(n[2])) < 0;
    for (const k of flip ? [0, 2, 1] : [0, 1, 2]) this.vert(p[k], n[k], L, uv[k][0], uv[k][1]);
  }

  /**
   * A surface over u, v in 0..1: `f` the point, `L` the look of each cell (by its centre), `out` which way is out (for the
   * normal's sign). `len` the surface's size in planet radii along u and v, for the pattern's scale.
   */
  surface(nu: number, nv: number, f: (u: number, v: number) => V, L: Look | ((u: number, v: number) => Look), len: [number, number], out?: (p: V, u: number, v: number) => V) {
    const pts: V[][] = [];
    const nrm: V[][] = [];
    for (let i = 0; i <= nu; i++) {
      pts.push([]);
      for (let j = 0; j <= nv; j++) pts[i].push(f(i / nu, j / nv));
    }
    const eps = 1e-3;
    for (let i = 0; i <= nu; i++) {
      nrm.push([]);
      for (let j = 0; j <= nv; j++) {
        const u = i / nu;
        const v = j / nv;
        const du = f(Math.min(1, u + eps), v).sub(f(Math.max(0, u - eps), v));
        const dv = f(u, Math.min(1, v + eps)).sub(f(u, Math.max(0, v - eps)));
        let n = du.cross(dv);
        if (n.lengthSq() < 1e-20) n = pts[i][j].clone();
        n.normalize();
        if (out && n.dot(out(pts[i][j], u, v)) < 0) n.negate();
        nrm[i].push(n);
      }
    }
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const uc = (i + 0.5) / nu;
        const vc = (j + 0.5) / nv;
        const lk = typeof L === 'function' ? L(uc, vc) : L;
        const uvAt = (a: number, b: number): [number, number] => {
          const u = a / nu;
          const v = b / nv;
          const U = u * len[0] * lk.su;
          const Vv = lk.band ? (v - lk.band[0]) / (lk.band[1] - lk.band[0]) : v * len[1] * lk.sv;
          return [U, Vv];
        };
        this.quad([pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1]], [nrm[i][j], nrm[i + 1][j], nrm[i + 1][j + 1], nrm[i][j + 1]], lk,
          [uvAt(i, j), uvAt(i + 1, j), uvAt(i + 1, j + 1), uvAt(i, j + 1)]);
      }
    }
  }

  /**
   * A slab: the surface `f` and under it a copy pushed in along `inward` by `thick`, closed round its four edges.
   * `top`, `bottom`, `side` are the looks; `sides` which edges to close (u0, u1, v0, v1).
   */
  slab(nu: number, nv: number, f: (u: number, v: number) => V, inward: (p: V, u: number, v: number) => V, thick: number,
    top: Look | ((u: number, v: number) => Look), bottom: Look, side: Look | ((edge: number, t: number) => Look), len: [number, number],
    sides: [boolean, boolean, boolean, boolean] = [true, true, true, true]) {
    const g = (u: number, v: number) => { const p = f(u, v); return p.clone().addScaledVector(inward(p, u, v), thick); };
    const outOf = (p: V, u: number, v: number) => inward(p, u, v).clone().negate();
    this.surface(nu, nv, f, top, len, outOf);
    this.surface(nu, nv, g, bottom, len, (p, u, v) => inward(p, u, v));
    // Sides: a strip along each edge, from the top surface to the bottom one.
    const edges: [number, (t: number) => [number, number], number][] = [
      [0, (t) => [0, t], nv], [1, (t) => [1, t], nv], [2, (t) => [t, 0], nu], [3, (t) => [t, 1], nu],
    ];
    for (const [e, at, n] of edges) {
      if (!sides[e]) continue;
      const L = (t: number) => (typeof side === 'function' ? side(e, t) : side);
      const lenAlong = e < 2 ? len[1] : len[0];
      // Out of the side: away from the slab's middle.
      const mid = f(0.5, 0.5);
      this.surface(n, 1, (t, s) => { const [u, v] = at(t); const p = f(u, v); return p.addScaledVector(inward(p, u, v), thick * s); },
        (t) => L(t), [lenAlong, thick], () => {
          const [u, v] = at(0.5);
          const q = f(u, v);
          const d = q.clone().sub(mid);
          // The side's outward: away from the middle, in the surface's tangent plane.
          const nIn = inward(q, u, v);
          d.addScaledVector(nIn, -d.dot(nIn));
          return d.lengthSq() > 1e-12 ? d : nIn;
        });
    }
  }

  /** A three.js geometry, posed by `m`, in one look. Its own uv (times `uvScale`) feeds the pattern. */
  add(geo: THREE.BufferGeometry, m: THREE.Matrix4, L: Look, uvScale: [number, number] = [1, 1]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(m);
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute | undefined;
    const P = new THREE.Vector3();
    const N = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      P.fromBufferAttribute(p, i);
      N.fromBufferAttribute(n, i).normalize();
      this.vert(P, N, L, uv ? uv.getX(i) * uvScale[0] : 0, uv ? uv.getY(i) * uvScale[1] : 0);
    }
    g.dispose();
    geo.dispose();
  }

  /** A tube along points, radius `r(t)` at fraction t, in one look (or a look by t), `seg` round. */
  tube(pts: V[], r: (t: number) => number, L: Look | ((t: number) => Look), seg = 10, uvLen = 1) {
    const n = pts.length;
    const T: V[] = pts.map((_p, i) => pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize());
    // Parallel transport of a normal along the line.
    let N = new THREE.Vector3(0, 1, 0);
    if (Math.abs(N.dot(T[0])) > 0.9) N = new THREE.Vector3(1, 0, 0);
    N.sub(T[0].clone().multiplyScalar(N.dot(T[0]))).normalize();
    const Ns: V[] = [];
    const Bs: V[] = [];
    for (let i = 0; i < n; i++) {
      if (i) {
        const ax = new THREE.Vector3().crossVectors(T[i - 1], T[i]);
        const s = ax.length();
        if (s > 1e-9) N.applyAxisAngle(ax.normalize(), Math.asin(Math.min(1, s)));
      }
      Ns.push(N.clone());
      Bs.push(new THREE.Vector3().crossVectors(T[i], N).normalize());
    }
    let acc = 0;
    const along: number[] = [0];
    for (let i = 1; i < n; i++) { acc += pts[i].distanceTo(pts[i - 1]); along.push(acc); }
    for (let i = 0; i < n - 1; i++) {
      const lk = typeof L === 'function' ? L((i + 0.5) / (n - 1)) : L;
      for (let k = 0; k < seg; k++) {
        const ring = (ii: number, kk: number) => {
          const a = (kk / seg) * TAU;
          const d = Ns[ii].clone().multiplyScalar(Math.cos(a)).addScaledVector(Bs[ii], Math.sin(a));
          return { p: pts[ii].clone().addScaledVector(d, r(ii / (n - 1))), n: d };
        };
        const q = [ring(i, k), ring(i + 1, k), ring(i + 1, k + 1), ring(i, k + 1)];
        const uv = (ii: number, kk: number): [number, number] => [along[ii] * lk.su * uvLen, (kk / seg) * 2];
        this.quad(q.map((x) => x.p), q.map((x) => x.n), lk, [uv(i, k), uv(i + 1, k), uv(i + 1, k + 1), uv(i, k + 1)]);
      }
    }
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('aPat', new THREE.Float32BufferAttribute(this.A, 4));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.M, 2));
    g.computeBoundingSphere();
    return g;
  }
}

// ---------- the material: PBR plus ornament ----------

/** One world's trim (the meander's and the relief's raised colour) and glow colour. */
export interface ArtStyle {
  trim: number; glow: number; bump: number;
  /** Panel seams filled with this colour (lit faintly) instead of drawn as a darker line of the panel's own. */
  seam?: number;
}

/** Shader for the pattern ids. Kept separate so the base stations (stationArt.ts) share it. */
export const PATTERN_GLSL = /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Finer and finer plating as the camera closes in (GRAPHICS-PASS-3 #2): grids at 16, 64, 256 and 1024 per pattern
// unit, each with its own seams and a tone per plate, each faded in only once its plates are several pixels wide. Since
// ships went x5 smaller against the world a berth looks at a few metres of a plate 2 km wide; this keeps it plated.
// x: brightness (seams and tones), y: height for the bump.
vec2 fineGrid(vec2 q, float fw){
  float b = 1.0;
  float h = 0.0;
  float k = 16.0;
  for (int i = 0; i < 4; i++){
    float on = 1.0 - smoothstep(0.06, 0.25, fw * k);
    if (on <= 0.0) break;
    vec2 qk = q * k;
    vec2 f = fract(qk);
    float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float seam = smoothstep(0.0, 0.03 + fw * k * 0.6, e);
    float tone = 0.9 + 0.2 * h21(floor(qk) + k * 0.37);
    b *= mix(1.0, mix(0.62, 1.0, seam) * tone, on);
    h += on * seam * 0.35;
    k *= 4.0;
  }
  return vec2(b, h);
}
// One period of the Greek key: a 6 x 6 grid, rows from the bottom, columns from the left.
float meanderBit(vec2 q){
  vec2 c = vec2(fract(q.x) * 6.0, clamp(q.y, 0.0, 0.999) * 6.0);
  int col = int(c.x);
  int row = int(c.y);
  int m = row == 0 ? 63 : row == 1 ? 1 : row == 2 ? 29 : row == 3 ? 21 : row == 4 ? 17 : 31;
  float on = float((m >> col) & 1);
  // A bevel inside each cell so the key reads as raised metal.
  vec2 f = fract(c);
  float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  return on * (0.75 + 0.25 * smoothstep(0.0, 0.25, e));
}
// Leaf relief: a stem along the band's middle with leaves on alternate sides, one pair per unit.
float leafRelief(vec2 q){
  float y = q.y - 0.5;
  float l = smoothstep(0.07, 0.02, abs(y)) * 0.5;
  for (int k = 0; k < 2; k++) {
    float side = k == 0 ? 1.0 : -1.0;
    float x = fract(q.x + (k == 0 ? 0.0 : 0.5)) - 0.5;
    vec2 p = vec2(x, y - side * 0.17);
    float a = side * 0.55;
    vec2 r = vec2(cos(a) * p.x + sin(a) * p.y, -sin(a) * p.x + cos(a) * p.y);
    float e = length(r / vec2(0.36, 0.13));
    float vein = 1.0 - 0.35 * smoothstep(0.015, 0.0, abs(r.y)) * step(e, 0.9);
    l = max(l, smoothstep(1.0, 0.8, e) * (1.0 - 0.35 * e * e) * vein);
  }
  return l;
}
`;

/**
 * The armour material: standard PBR from vertex colour and per-vertex metal and roughness, plus the pattern's colour,
 * bump and glow. Built-in material, so it writes the logarithmic depth itself.
 */
export function armourMaterial(style: ArtStyle): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 1, roughness: 1, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  const uTrim = { value: new THREE.Color(style.trim) };
  const uGlow = { value: new THREE.Color(style.glow) };
  const uSeam = { value: new THREE.Color(style.seam ?? 0) };
  const uSeamOn = { value: style.seam === undefined ? 0 : 1 };
  const uTime = { value: 0 };
  m.userData.uTime = uTime;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTrim = uTrim;
    sh.uniforms.uGlowCol = uGlow;
    sh.uniforms.uSeam = uSeam;
    sh.uniforms.uSeamOn = uSeamOn;
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aPat;
attribute vec2 aMat;
varying vec4 vPat;
varying vec2 vMat;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vPat = aPat;
vMat = aMat;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uTrim;
uniform vec3 uGlowCol;
uniform vec3 uSeam;
uniform float uSeamOn;
uniform float uTime;
varying vec4 vPat;
varying vec2 vMat;
${PATTERN_GLSL}
vec3 ppNormal(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir){
  vec3 vSigmaX = normalize(dFdx(surf_pos));
  vec3 vSigmaY = normalize(dFdy(surf_pos));
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
float gH = 0.0;      // the pattern's height, for the bump
vec3 gEmit = vec3(0.0);
float gMetal = 0.5;
float gRough = 0.5;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  int id = int(vPat.z + 0.5);
  vec2 q = vPat.xy;
  float glow = vPat.w;
  gMetal = vMat.x;
  gRough = vMat.y;
  // How many pattern units a pixel spans: patterns fade to their average when too fine to draw.
  float fw = max(fwidth(q.x), fwidth(q.y));
  float near = 1.0 - smoothstep(0.25, 0.9, fw);
  float near4 = 1.0 - smoothstep(0.06, 0.22, fw);
  vec3 base = diffuseColor.rgb;
  if (id == 0 || id == 3 || id == 8) {
    // Panels: seams on the unit grid, a tone per panel, sub-panels and rivets close up.
    vec2 c = floor(q);
    vec2 f = fract(q);
    float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float seam = mix(1.0, smoothstep(0.0, 0.035 + fw * 0.6, e), near);
    float tone = mix(1.0, 0.86 + 0.26 * h21(c), near * 0.9 + 0.1);
    vec2 f4 = fract(q * 4.0);
    float e4 = min(min(f4.x, 1.0 - f4.x), min(f4.y, 1.0 - f4.y));
    float sub = mix(1.0, 0.86 + 0.14 * smoothstep(0.0, 0.06, e4), near4);
    diffuseColor.rgb = base * tone * mix(0.42, 1.0, seam) * sub;
    if (uSeamOn > 0.5) {
      // Coloured seams: a wider line in the world's own seam colour, and a little of it left in the far average.
      float wide = mix(1.0, smoothstep(0.0, 0.06 + fw * 0.8, e), near);
      diffuseColor.rgb = mix(uSeam, base * tone * sub, wide);
      diffuseColor.rgb = mix(diffuseColor.rgb, uSeam, 0.14 * (1.0 - near));
      gEmit += uSeam * (1.0 - wide) * 0.35;
    }
    vec2 fg = fineGrid(q, fw);
    diffuseColor.rgb *= fg.x;
    gH = seam * 0.6 + (sub - 0.86) * 2.0 + fg.y;
  }
  if (id == 3) {
    // Window rows: across the band, rows at 0.3..0.7 of each unit; along it, a window per unit, lit by hash.
    vec2 c = vec2(floor(q.x), floor(q.y));
    vec2 f = fract(q);
    float w = step(0.22, f.x) * step(f.x, 0.78) * step(0.32, f.y) * step(f.y, 0.68);
    float lit = step(0.28, h21(c + 7.0));
    float on = w * lit * near + (1.0 - near) * 0.18;
    diffuseColor.rgb = mix(diffuseColor.rgb, base * 0.25, w * near);
    gEmit += uGlowCol * on * glow;
  }
  if (id == 8) {
    // Slits: tall narrow lights, sparse.
    vec2 c = floor(q);
    vec2 f = fract(q);
    float w = step(0.44, f.x) * step(f.x, 0.56) * step(0.12, f.y) * step(f.y, 0.88);
    float lit = step(0.55, h21(c + 3.0));
    gEmit += uGlowCol * (w * lit * near + (1.0 - near) * 0.06) * glow;
  }
  if (id == 1) {
    float k = meanderBit(q);
    float kk = mix(0.55, k, near);
    diffuseColor.rgb = mix(base * 0.45, uTrim, kk);
    gMetal = mix(gMetal, 0.9, kk);
    gRough = mix(gRough, 0.28, kk);
    gH = k * near;
  }
  if (id == 2) {
    float l = leafRelief(q);
    float ll = mix(0.35, l, near);
    diffuseColor.rgb = mix(base * 0.7, mix(base, uTrim, 0.55) * 1.15, ll);
    gH = l * near;
  }
  if (id == 4) {
    // Mosaic: small square tiles, grout, a tone per tile and the odd coloured one.
    vec2 c = floor(q);
    vec2 f = fract(q);
    float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float grout = mix(1.0, smoothstep(0.0, 0.09, e), near);
    float t = h21(c);
    vec3 tile = base * (0.82 + 0.36 * t);
    tile = mix(tile, uTrim, step(0.93, t) * near);
    diffuseColor.rgb = mix(base * 0.4, tile, grout);
    gH = grout * 0.5;
    gRough = mix(gRough, 0.22 + 0.25 * t, near);
  }
  if (id == 6) {
    // Lit strips: close up they break into tiled light panels with dark mullions, not one flat sheet of glow.
    vec2 fg = fineGrid(q, fw);
    gEmit += base * glow * fg.x * fg.x;
    diffuseColor.rgb = base * 0.3;
    gH = fg.y;
  }
  if (id == 5) {
    // Smooth metal and glass: the faintest plating close up, so a wide face is never one flat colour.
    vec2 fg = fineGrid(q, fw);
    diffuseColor.rgb *= mix(1.0, fg.x, 0.5);
    gH = fg.y * 0.5;
  }
  if (id == 7) {
    // Cloth: a soft weave and folds.
    diffuseColor.rgb = base * (0.85 + 0.15 * sin(q.x * 40.0) * near) * (0.8 + 0.2 * sin(q.y * 6.0));
    gMetal = 0.0;
    gRough = 0.85;
  }
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = gRough;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = gMetal;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec2 dH = vec2(dFdx(gH), dFdy(gH)) * ${style.bump.toFixed(2)};
  normal = ppNormal(-vViewPosition, normal, dH, faceDirection);
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += gEmit;`);
  };
  m.customProgramCacheKey = () => `armourArt:${style.bump}`;
  return m;
}

// ---------- shared shapes ----------

/** A fluted column along +y from 0 to 1, radius 1 (scale it), `flutes` grooves. */
export function flutedColumn(flutes = 12, seg = 36): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(1, 1, 1, seg, 1, false).translate(0, 0.5, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    const a = Math.atan2(z, x);
    const k = 1 - 0.09 * Math.pow(Math.abs(Math.cos((a * flutes) / 2)), 3);
    p.setX(i, (x / r) * k);
    p.setZ(i, (z / r) * k);
  }
  g.computeVertexNormals();
  return g;
}

/** A frame (a matrix) at `o` with its y along `up` and its z as close to `fwd` as possible. */
export function frameAt(o: V, up: V, fwd: V, s: number | V = 1): THREE.Matrix4 {
  const y = up.clone().normalize();
  const z = fwd.clone().addScaledVector(y, -fwd.dot(y));
  if (z.lengthSq() < 1e-10) z.set(1, 0, 0).addScaledVector(y, -y.x);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const sc = typeof s === 'number' ? v3(s, s, s) : s;
  return new THREE.Matrix4().makeBasis(x.multiplyScalar(sc.x), y.multiplyScalar(sc.y), z.multiplyScalar(sc.z)).setPosition(o);
}

/** A laurel wreath (leaves round a circle) lying in the plane with normal `n`, radius `r`, leaf size `s`. */
export function wreath(M: Mesher, c: V, n: V, r: number, s: number, L: Look, leaves = 36) {
  const a = Math.abs(n.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
  const e1 = new THREE.Vector3().crossVectors(n, a).normalize();
  const e2 = new THREE.Vector3().crossVectors(n, e1).normalize();
  M.add(new THREE.TorusGeometry(r, s * 0.12, 6, 48), frameAt(c, n, e1).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), L);
  for (let k = 0; k < leaves; k++) {
    // Two branches meeting at the bottom, leaves in pairs either side of the stem.
    const t = (k / leaves) * TAU;
    for (const side of [1, -1]) {
      const rr = r + side * s * 0.38;
      const p = c.clone().addScaledVector(e1, Math.cos(t) * rr).addScaledVector(e2, Math.sin(t) * rr);
      const tang = e1.clone().multiplyScalar(-Math.sin(t)).addScaledVector(e2, Math.cos(t));
      const rad = e1.clone().multiplyScalar(Math.cos(t)).addScaledVector(e2, Math.sin(t));
      const dir = tang.clone().multiplyScalar(Math.cos(0.6)).addScaledVector(rad, side * Math.sin(0.6));
      const m = frameAt(p, n, dir, v3(s * 0.32, s * 0.1, s * 0.9));
      M.add(new THREE.SphereGeometry(0.5, 8, 4), m, L);
    }
  }
}

// ---------- the seven ----------

/** What a world's art is: static mesh, instanced columns, moving parts, and the parts that turn with the planet. */
export interface WorldArt {
  style: ArtStyle;
  mesh: Mesher;
  /** Columns: one geometry (with aPat/aMat), many matrices. */
  columns?: { geo: THREE.BufferGeometry; mats: THREE.Matrix4[] };
  /** Moving parts, built here, animated by `update`. */
  moving?: THREE.Object3D[];
  update?: (time: number) => void;
  /** Parts fixed to the turning planet (Earth's ring, tether and Pharos), in the planet's spin frame, planet radii. */
  spin?: Mesher;
  /** Parts far out in the world, in scene units relative to the planet's centre and in world axes (Mars's spears). */
  far?: Mesher;
}

/** An instanced column geometry carrying one look in its pattern attributes. */
function columnGeo(L: Look, flutes = 12): THREE.BufferGeometry {
  const M = new Mesher();
  M.add(flutedColumn(flutes), new THREE.Matrix4(), L, [1, 4]);
  return M.build();
}

// ===== Earth: Gaia's cradle =====
function earth(quito: { lat: number; lon: number }): WorldArt {
  const E = SHAPE.earth;
  const GOLD = 0xc9a14a, GUN = 0x3a3f48, SKY = 0x3f7fd0, BANNER = 0x29466e;
  const gold = look(GOLD, PAT.smooth, { metal: 0.85, rough: 0.38 });
  const goldLeaf = look(GOLD, PAT.leaf, { metal: 0.85, rough: 0.34, su: 30 });
  const goldKey = look(GOLD, PAT.meander, { metal: 0.85, rough: 0.32, su: 34 });
  const gun = look(GUN, PAT.panel, { metal: 0.55, rough: 0.5, su: 45, sv: 45 });
  const gunWin = look(GUN, PAT.windows, { glow: 1.3, metal: 0.5, rough: 0.5, su: 160 });
  const blue = look(0x4f7dff, PAT.glow, { glow: 3.2 });
  const sky = look(SKY, PAT.panel, { metal: 0.5, rough: 0.45 });
  const M = new Mesher();
  const S = new Mesher();
  const rIn = 1.1, rOut = 1.125;
  const radial = (p: V) => p.clone().normalize().negate();
  // Twelve ribs pole to pole: a leaf-relief middle between raised gold lips; blue-lit windows down their sides.
  for (let k = 0; k < E.ribs; k++) {
    const lon0 = ((k * 360) / E.ribs) * D;
    const t0 = E.hub * D * 0.9;
    const t1 = Math.PI - E.southHub * D * 0.9;
    const w = E.ribHalf * D;
    const at = (u: number, v: number, r: number) => {
      const t = t0 + (t1 - t0) * u;
      return sph(Math.PI / 2 - t, lon0 + ((v * 2 - 1) * w) / Math.max(Math.sin(t), 0.15)).multiplyScalar(r);
    };
    const len: [number, number] = [(t1 - t0) * rOut, 2 * w * rOut];
    const strips: [number, number, number, Look][] = [[0, 0.2, rOut + 0.004, gold], [0.2, 0.8, rOut, goldLeaf], [0.8, 1, rOut + 0.004, gold]];
    for (const [a, b, r, L] of strips) {
      M.slab(150, 2, (u, v) => at(u, a + (b - a) * v, r), radial, r - rIn, L.pat === PAT.leaf ? { ...L, band: [0, 1] } : L, gun, gunWin, [len[0], len[1] * (b - a)], [false, false, a === 0, b === 1]);
    }
  }
  // The hubs: gunmetal caps with a meander rim and a gold drum, a blue ring of light round it.
  for (const [north, ang] of [[1, E.hub], [-1, E.southHub]] as const) {
    const t1 = ang * D;
    M.slab(64, 6, (u, v) => sph(north * (Math.PI / 2 - t1 * v), u * TAU).multiplyScalar(rOut), radial, rOut - rIn, gun, gun,
      (e) => (e === 3 ? { ...goldKey, band: [0, 1] } : gun), [TAU * rOut * Math.sin(t1), t1 * rOut], [false, false, false, true]);
    const c = v3(0, north * (rOut + 0.002), 0);
    const up = v3(0, north, 0);
    const s = north > 0 ? 1 : 0.7;
    M.add(new THREE.CylinderGeometry(0.075 * s, 0.09 * s, 0.03 * s, 64), frameAt(c.clone().addScaledVector(up, 0.015 * s), up, v3(1, 0, 0)), gold);
    M.add(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.025 * s, 48), frameAt(c.clone().addScaledVector(up, 0.042 * s), up, v3(1, 0, 0)), sky);
    M.add(new THREE.TorusGeometry(0.083 * s, 0.004 * s, 6, 64), frameAt(c.clone().addScaledVector(up, 0.031 * s), up, v3(1, 0, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), blue);
  }

  // ---- The shipyard ring, the tether and Pharos turn with the planet (spin frame). ----
  const R = EARTH_RING;
  const ringLen = TAU * R.deck[1];
  // Deck: gunmetal plating, top and bottom, with blue lane lights; a gold inner edge.
  S.surface(360, 8, (u, v) => cylP(u * TAU, R.deck[0] + (R.deck[1] - R.deck[0]) * v, R.deckHalf), gun, [ringLen, R.deck[1] - R.deck[0]], () => v3(0, 1, 0));
  S.surface(360, 8, (u, v) => cylP(u * TAU, R.deck[0] + (R.deck[1] - R.deck[0]) * v, -R.deckHalf), gun, [ringLen, R.deck[1] - R.deck[0]], () => v3(0, -1, 0));
  S.surface(360, 1, (u, v) => cylP(u * TAU, R.deck[0], -R.deckHalf + 2 * R.deckHalf * v), gold, [ringLen, 2 * R.deckHalf], (p) => v3(-p.x, 0, -p.z));
  for (const r of [1.16, 1.37]) S.surface(360, 1, (u, v) => cylP(u * TAU, r + 0.004 * v, R.deckHalf + 0.0006), blue, [ringLen, 0.004], () => v3(0, 1, 0));
  // Rim: meander on top, olive relief over a row of blue windows on the outside, lit windows facing the deck.
  const [a, b] = R.rim;
  const h = R.rimHalf;
  S.surface(360, 2, (u, v) => cylP(u * TAU, a + (b - a) * v, h), { ...goldKey, band: [0, 1], su: 34 }, [TAU * b, b - a], () => v3(0, 1, 0));
  S.surface(360, 1, (u, v) => cylP(u * TAU, a + (b - a) * v, -h), gun, [TAU * b, b - a], () => v3(0, -1, 0));
  const outer = (u: number, v: number) => cylP(u * TAU, b, -h + 2 * h * v);
  S.surface(720, 6, outer, (_u, v) => (v > 0.58 ? { ...goldLeaf, band: [0.58, 1], su: 40 } : v > 0.3 ? { ...gunWin, band: [0.3, 0.58] } : gold),
    [TAU * b, 2 * h], (p) => v3(p.x, 0, p.z));
  S.surface(360, 2, (u, v) => cylP(u * TAU, a, R.deckHalf + (h - R.deckHalf) * v), { ...gunWin, band: [0, 1] }, [TAU * a, h - R.deckHalf], (p) => v3(-p.x, 0, -p.z));
  S.surface(360, 1, (u, v) => cylP(u * TAU, a, -h + (h - R.deckHalf) * v), gun, [TAU * a, h - R.deckHalf], (p) => v3(-p.x, 0, -p.z));
  // Twelve blue banners under the rim, between the cradles' gold bars.
  const cloth = look(BANNER, PAT.cloth, { metal: 0, rough: 0.85, su: 8, sv: 8 });
  for (let k = 0; k < 12; k++) {
    const lon = (k / 12) * TAU + (15 * D);
    const t = v3(-Math.sin(lon), 0, Math.cos(lon));
    const o = cylP(lon, b + 0.002, -h);
    S.surface(6, 10, (u, v) => o.clone().addScaledVector(t, (u - 0.5) * 0.045).add(v3(0, -0.12 * v, 0)).addScaledVector(cylP(lon, 1, 0), 0.006 * Math.sin(v * 5 + u * 2) * v),
      (u, v) => (v > 0.88 && Math.abs(u - 0.5) < 0.25 ? look(GOLD, PAT.smooth, { metal: 0.85, rough: 0.38 }) : cloth), [0.045, 0.12], (p) => v3(p.x, 0, p.z));
    S.add(new THREE.BoxGeometry(0.056, 0.006, 0.006), frameAt(o.clone().add(v3(0, -0.003, 0)), v3(0, 1, 0), cylP(lon, 1, 0)), gold);
  }
  // Ships under construction in twelve cradles on the deck.
  for (let k = 0; k < 12; k++) {
    const lon = (k / 12) * TAU;
    const c = cylP(lon, 1.29, R.deckHalf);
    const t = v3(-Math.sin(lon), 0, Math.cos(lon));
    const F = frameAt(c, v3(0, 1, 0), t);
    const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
    S.add(new THREE.BoxGeometry(0.07, 0.004, 0.13), F.clone().multiply(at(0, 0.002, 0)), gun);
    for (const x of [-0.032, 0.032]) S.add(new THREE.BoxGeometry(0.006, 0.02, 0.12), F.clone().multiply(at(x, 0.012, 0)), gold);
    for (const z of [-0.045, 0, 0.045]) S.add(new THREE.TorusGeometry(0.03, 0.0025, 4, 16, Math.PI), F.clone().multiply(at(0, 0.004, z)), gun);
    // The hull on the slip: gold, a sky-blue spine, half plated.
    S.add(new THREE.CylinderGeometry(0.012, 0.016, 0.085, 8).rotateX(Math.PI / 2), F.clone().multiply(at(0, 0.02, 0.004)), gold);
    S.add(new THREE.ConeGeometry(0.012, 0.03, 8).rotateX(Math.PI / 2), F.clone().multiply(at(0, 0.02, 0.06)), gold);
    S.add(new THREE.BoxGeometry(0.004, 0.004, 0.07), F.clone().multiply(at(0, 0.033, 0)), sky);
    S.add(new THREE.BoxGeometry(0.05, 0.003, 0.003), F.clone().multiply(at(0, 0.026, -0.035)), blue);
  }
  // The tether from Quito, through the ring, to Pharos: the lighthouse every colony ship sailed from (stn-earth-1).
  const qd = sph(quito.lat * D, quito.lon * D);
  const qe = v3(qd.x, 0, qd.z).normalize();
  const top = 1.62;
  const tether = [qd.clone().multiplyScalar(0.995), qe.clone().multiplyScalar(top)];
  S.tube(tether, () => 0.0028, look(0xd8dde6, PAT.panel, { metal: 0.9, rough: 0.25, su: 300 }), 8);
  for (const f of [1.07, 1.52]) S.add(new THREE.BoxGeometry(0.012, 0.012, 0.02), frameAt(qe.clone().multiplyScalar(f), v3(0, 1, 0), qe), { ...gunWin, band: [0, 1] });
  // The anchor where the tether meets the ring's inner edge, and the gate at its rim.
  for (const [r, s] of [[R.deck[0], 1], [b, 0.8]] as const) {
    const o = qe.clone().multiplyScalar(r);
    S.add(new THREE.BoxGeometry(0.05 * s, 0.07 * s, 0.05 * s), frameAt(o, v3(0, 1, 0), qe), gold);
    S.add(new THREE.TorusGeometry(0.03 * s, 0.004, 6, 24), frameAt(o, qe, v3(0, 1, 0)), blue);
  }
  pharos(S, qe.clone().multiplyScalar(top), qe, 1);
  return { style: { trim: 0xe0b85a, glow: 0x5c8bff, bump: 1.4 }, mesh: M, spin: S };
}

/**
 * Pharos Station (refs/bases/stn-earth-1): a ring-and-spoke wheel of brushed steel with bands of blue windows, the tether
 * arriving into its hub, and above the hub a tall lighthouse with a blazing blue beacon. `o` the hub, `up` the way out,
 * `s` its scale (planet radii per unit).
 */
export function pharos(M: Mesher, o: V, up: V, s = 1) {
  const steel = look(0xb9c0c9, PAT.panel, { metal: 0.85, rough: 0.3, su: 120, sv: 120 });
  const gold = look(0xc9a14a, PAT.smooth, { metal: 0.85, rough: 0.38 });
  const win = look(0x3a3f48, PAT.windows, { glow: 2.6, metal: 0.5, rough: 0.5, su: 900, band: [0, 1] });
  const beacon = look(0x7aa6ff, PAT.glow, { glow: 7 });
  const side = Math.abs(up.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
  const F = (p: V, scale: V | number = 1) => frameAt(p, up, side, scale);
  const W = 0.06 * s;
  // The wheel: a torus of window bands, six spokes, the hub.
  M.add(new THREE.TorusGeometry(W, W * 0.13, 10, 72), F(o).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), steel, [6, 1]);
  M.add(new THREE.CylinderGeometry(W * 1.02, W * 1.02, W * 0.12, 72, 1, true), F(o), win, [1, 1]);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    const m = F(o).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeTranslation(W * 0.5, 0, 0)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    M.add(new THREE.CylinderGeometry(W * 0.03, W * 0.03, W * 0.9, 6), m, steel);
  }
  M.add(new THREE.CylinderGeometry(W * 0.2, W * 0.24, W * 0.3, 24), F(o), gold);
  // The lighthouse: a tapering tower in gold bands, a gallery, the lantern and the beacon.
  const T = 0.11 * s;
  M.add(new THREE.CylinderGeometry(W * 0.1, W * 0.17, T, 16), F(o.clone().addScaledVector(up, T / 2 + W * 0.15)), steel);
  for (let k = 1; k < 4; k++) M.add(new THREE.CylinderGeometry(W * 0.17 - k * 0.018 * W, W * 0.17 - k * 0.018 * W, W * 0.04, 16), F(o.clone().addScaledVector(up, W * 0.15 + (k / 4) * T)), gold);
  const top = o.clone().addScaledVector(up, W * 0.15 + T);
  M.add(new THREE.CylinderGeometry(W * 0.2, W * 0.2, W * 0.03, 20), F(top), gold);
  M.add(new THREE.SphereGeometry(W * 0.1, 16, 10), F(top.clone().addScaledVector(up, W * 0.1)), beacon);
  M.add(new THREE.ConeGeometry(W * 0.13, W * 0.12, 16), F(top.clone().addScaledVector(up, W * 0.24)), gold);
}

// ===== The Moon: Selene's crescent =====
function moon(): WorldArt {
  const MS = SHAPE.moon;
  const BONE = 0xe6e3da, STEEL = 0xb8c0cc, BLUE = 0x2f5fc4, SILVER = 0xd9dee6, DEEP = 0x14307e;
  const bone = look(BONE, PAT.panel, { metal: 0.2, rough: 0.45, su: 36, sv: 36 });
  const boneSmooth = look(BONE, PAT.smooth, { metal: 0.2, rough: 0.4 });
  const steel = look(STEEL, PAT.panel, { metal: 0.6, rough: 0.4, su: 40, sv: 40 });
  const blueBand = look(BLUE, PAT.panel, { metal: 0.5, rough: 0.4, su: 30, sv: 30 });
  const deepBand = look(DEEP, PAT.smooth, { metal: 0.6, rough: 0.3 });
  const silverKey = look(SILVER, PAT.meander, { metal: 0.85, rough: 0.28, su: 26 });
  const winBlue = look(0x8a93a3, PAT.windows, { glow: 2.4, metal: 0.4, rough: 0.5, su: 140 });
  const slot = look(0x9ab8ff, PAT.glow, { glow: 3 });
  const M = new Mesher();
  const { a, b } = moonCircles();
  const A = v3(...a);
  const B = v3(...b);
  const e1 = v3(0, 1, 0);
  const e2 = v3(0, 0, 1);
  const dirAt = (rho: number, psi: number) => A.clone().multiplyScalar(Math.cos(rho)).addScaledVector(e1.clone().multiplyScalar(Math.cos(psi)).addScaledVector(e2, Math.sin(psi)), Math.sin(rho));
  const outerR = MS.outer * D;
  const inner = MS.inner * D;
  // The inner edge at each angle round the face: the smallest arc from the face outside the cut-out circle.
  const rhoIn = (psi: number) => {
    let lo = 0;
    let hi = outerR;
    if (dirAt(hi, psi).angleTo(B) <= inner) return outerR;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (dirAt(m, psi).angleTo(B) > inner) hi = m; else lo = m; }
    return hi;
  };
  // The crescent's span of psi: from its north horn round the east to its south horn.
  let p0 = 90 * D;
  while (p0 > -180 * D && rhoIn(p0 - D) < outerR - 1e-4) p0 -= D;
  let p1 = 90 * D;
  while (p1 < 270 * D && rhoIn(p1 + D) < outerR - 1e-4) p1 += D;
  const psiAt = (u: number) => p0 + (p1 - p0) * u;
  const rIn = 1.08, rOut = 1.18;
  const radial = (p: V) => p.clone().normalize().negate();
  const width = (u: number) => outerR - rhoIn(psiAt(u));
  const galleryV = (u: number) => Math.min(MS.gallery * D, 0.45 * width(u));
  const P = (u: number, s: number, r: number) => {
    const psi = psiAt(u);
    const ri = rhoIn(psi);
    return dirAt(ri + (outerR - ri) * s, psi).multiplyScalar(r);
  };
  const span = (p1 - p0) * 1.18;
  const NU = 260;
  // The body, from behind the gallery out to the limb: a silver-gold meander along the inner rim, plates seamed in
  // deep blue, a second meander between blue fillets, the blue band, a bone lip.
  const g = (u: number) => galleryV(u) / Math.max(width(u), 1e-6);
  const body = (u: number, v: number, r: number) => P(u, g(u) + (1 - g(u)) * v, r);
  M.slab(NU, 18, (u, v) => body(u, v, rOut), radial, rOut - rIn,
    (_u, v) => (v < 0.09 ? { ...silverKey, band: [0, 0.09] } : v < 0.105 ? deepBand
      : v > 0.69 && v < 0.705 ? deepBand : v >= 0.705 && v < 0.775 ? { ...silverKey, band: [0.705, 0.775] } : v >= 0.775 && v < 0.79 ? deepBand
      : v > 0.81 && v < 0.9 ? blueBand : v >= 0.9 ? boneSmooth : bone), steel,
    (e) => (e === 3 ? { ...look(0xc9cfd8, PAT.windows, { glow: 2.2, su: 120, metal: 0.3, rough: 0.5 }), band: [0.25, 0.75] } : e === 2 ? { ...winBlue, band: [0, 1] } : boneSmooth),
    [span, 0.9], [true, true, true, true]);
  // Blue light in long slots across the plates.
  for (const v of [0.4, 0.62]) {
    M.surface(NU, 1, (u, s) => body(u, v + 0.012 * s, rOut + 0.0008), (u) => (frac(u * 23) < 0.7 ? slot : boneSmooth), [span, 0.01], (p) => p);
  }
  // The gallery: a thin roof and floor along the inner edge, white columns between, lit from behind.
  const gal = (u: number, v: number, r: number) => P(u, g(u) * v, r);
  M.slab(NU, 3, (u, v) => gal(u, v, rOut), radial, 0.02, { ...silverKey, band: [0, 1] }, boneSmooth, boneSmooth, [span, 0.08], [true, true, true, false]);
  M.slab(NU, 3, (u, v) => gal(u, v, rIn + 0.016), radial, 0.016, steel, steel, boneSmooth, [span, 0.08], [true, true, true, false]);
  M.surface(NU, 2, (u, s) => P(u, g(u) * 0.97, rIn + 0.016 + (rOut - 0.02 - rIn - 0.016) * s), { ...winBlue, band: [0, 1], su: 90 }, [span, 0.06], (p) => p.clone().negate());
  const cols: THREE.Matrix4[] = [];
  const colLen = rOut - 0.02 - (rIn + 0.016);
  let acc = 0;
  let last = P(0, 0, rIn + 0.016);
  for (let i = 0; i <= 2000; i++) {
    const u = i / 2000;
    const p = P(u, g(u) * 0.35, rIn + 0.016);
    acc += p.distanceTo(last);
    last = p;
    if (acc < 0.02 || g(u) * width(u) < 1.5 * D) continue;
    acc = 0;
    cols.push(frameAt(p, p.clone().normalize(), v3(0, 1, 0), v3(0.0062, colLen, 0.0062)));
  }
  // A laurel wreath worked into the plates where the crescent is widest, low on its eastern side.
  {
    const u = 0.62;
    const c = P(u, 0.55, rOut + 0.002);
    wreath(M, c, c.clone().normalize(), 0.07, 0.03, look(SILVER, PAT.smooth, { metal: 0.85, rough: 0.3 }), 30);
  }
  // The listening dishes on the crescent's back, turned outward and away from Earth.
  const white = look(0xf2f0ea, PAT.smooth, { metal: 0.2, rough: 0.35 });
  for (const [lon, lat, size, hgt] of MOON_DISHES) {
    const d = sph(lat * D, lon * D);
    const c = d.clone().multiplyScalar(hgt);
    const aim = d.clone().add(v3(-0.35, 0.15, 0.6)).normalize();
    const pts = Array.from({ length: 12 }, (_, i) => { const x = (i / 11) * size; return new THREE.Vector2(x, (x * x) / (size * 2.8)); });
    M.add(new THREE.LatheGeometry(pts, 40), frameAt(c, aim, v3(0, 1, 0)), white);
    M.add(new THREE.CylinderGeometry(size * 0.06, size * 0.1, size * 0.5, 8), frameAt(c.clone().addScaledVector(aim, size * 0.5), aim, v3(0, 1, 0)), steel);
    M.add(new THREE.SphereGeometry(size * 0.08, 10, 8), frameAt(c.clone().addScaledVector(aim, size * 0.78), aim, v3(0, 1, 0)), slot);
    for (let k = 0; k < 3; k++) {
      const q = new THREE.Vector3(Math.cos((k * TAU) / 3), 0, Math.sin((k * TAU) / 3)).applyMatrix4(frameAt(v3(), aim, v3(0, 1, 0)));
      const rim = c.clone().addScaledVector(q, size * 0.92).addScaledVector(aim, size * 0.33);
      const tip = c.clone().addScaledVector(aim, size * 0.76);
      M.tube([rim, tip], () => size * 0.018, steel, 4);
    }
    // The pylon down to the crescent.
    const foot = d.clone().multiplyScalar(rOut - 0.01);
    M.tube([foot, c.clone().addScaledVector(aim, -size * 0.1)], () => size * 0.09, steel, 8);
  }
  // Trim is the meander's raised key: pale gold on the silver ground. Seams: the sheet's deep blue.
  return { style: { trim: 0xe9cf86, glow: 0x9ab8ff, bump: 1.2, seam: 0x1c3fa8 }, mesh: M, columns: { geo: columnGeo(look(0xf1eee6, PAT.smooth, { metal: 0.15, rough: 0.4 }), 16), mats: cols } };
}

// ===== Mercury: the kerykeion of Hermes =====
function mercury(): WorldArt {
  const H = SHAPE.mercury;
  const BRONZE = 0x6e4a26, IRON = 0x1b1713, YELLOW = 0xe3c52c, RUST = 0x8e3a22;
  const bronze = look(BRONZE, PAT.panel, { metal: 0.85, rough: 0.36, su: 34, sv: 34 });
  const bronzeSmooth = look(0x8a6232, PAT.smooth, { metal: 0.85, rough: 0.38 });
  const iron = look(IRON, PAT.panel, { metal: 0.6, rough: 0.55, su: 40, sv: 40 });
  const yellow = look(YELLOW, PAT.smooth, { metal: 0.7, rough: 0.35 });
  const amber = look(0xffb000, PAT.glow, { glow: 3 });
  const amberWin = look(IRON, PAT.windows, { glow: 2.6, metal: 0.5, rough: 0.5, su: 150 });
  const key = look(BRONZE, PAT.meander, { metal: 0.85, rough: 0.32, su: 30 });
  const M = new Mesher();
  // The two spines: bronze tubes in iron collars, amber lights along their backs.
  for (const s of [1, -1]) {
    const pts: V[] = [];
    for (let i = 0; i <= 400; i++) {
      const t = (2 + (176 * i) / 400) * D;
      const ph = mercurySpine(s, t);
      pts.push(v3(Math.sin(t) * Math.cos(ph), Math.cos(t), Math.sin(t) * Math.sin(ph)).multiplyScalar(H.spineMid));
    }
    M.tube(pts, () => H.spineR, (t) => (frac(t * 70) < 0.12 ? iron : bronze), 14, 1);
    for (let i = 8; i < pts.length - 8; i += 16) M.add(new THREE.BoxGeometry(0.008, 0.008, 0.008), frameAt(pts[i].clone().multiplyScalar(1 + H.spineR / H.spineMid), pts[i], pts[i + 1].clone().sub(pts[i])), amber);
  }
  // The rail ring: a bronze band, two iron rails on its face, amber running lights along its edges.
  const r0 = 1.078, r1 = 1.1;
  const hb = Math.sin(H.rail * D) * r1;
  M.slab(720, 4, (u, v) => cylP(u * TAU, r1, -hb + 2 * hb * v), (p) => v3(-p.x, 0, -p.z).normalize(), r1 - r0,
    (_u, v) => (v < 0.2 || v > 0.8 ? { ...amberWin, band: v < 0.2 ? [0, 0.2] : [0.8, 1] } : bronze), iron, bronzeSmooth, [TAU * r1, 2 * hb], [false, false, true, true]);
  for (const y of [-0.35, 0.35]) M.surface(720, 1, (u, v) => cylP(u * TAU, r1 + 0.003, (y + 0.06 * v) * hb), iron, [TAU * r1, 0.002], (p) => v3(p.x, 0, p.z));
  // Hats on both poles: a wide brim with a meander edge and amber lights beneath, an iron crown with a yellow band.
  const Hh = MERCURY_HAT;
  for (const [sy, k] of [[1, 1], [-1, Hh.south]] as const) {
    const up = v3(0, sy, 0);
    const base = v3(0, sy * Hh.y, 0);
    const F = (p: V) => frameAt(p, up, v3(1, 0, 0));
    M.add(new THREE.CylinderGeometry(Hh.brim * k, Hh.brim * k * 0.97, 0.024 * k, 128, 1), F(base), { ...bronze, su: 30, sv: 30 }, [30, 30]);
    M.add(new THREE.CylinderGeometry(Hh.brim * k * 1.005, Hh.brim * k * 1.005, 0.026 * k, 128, 1, true), F(base), { ...key, band: [0, 1] }, [60 * k, 1]);
    M.add(new THREE.TorusGeometry(Hh.brim * k, 0.008 * k, 8, 128), F(base.clone().addScaledVector(up, 0.012 * k)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), bronzeSmooth);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      M.add(new THREE.BoxGeometry(0.008, 0.004, 0.008), F(base.clone().add(v3(Math.cos(a) * Hh.brim * k * 0.92, -sy * 0.014 * k, Math.sin(a) * Hh.brim * k * 0.92))), amber);
    }
    const cr = Hh.crown * k;
    const ch = Hh.crownH * k;
    M.add(new THREE.CylinderGeometry(cr * 0.86, cr, ch, 96), F(base.clone().addScaledVector(up, ch / 2 + 0.012 * k)), iron, [20, 4]);
    M.add(new THREE.CylinderGeometry(cr * 1.01, cr * 1.01, ch * 0.22, 96, 1, true), F(base.clone().addScaledVector(up, 0.012 * k + ch * 0.18)), yellow);
    M.add(new THREE.SphereGeometry(cr * 0.86, 64, 12, 0, TAU, 0, Math.PI / 2), F(base.clone().addScaledVector(up, ch + 0.012 * k)).multiply(new THREE.Matrix4().makeScale(1, 0.3, 1)), bronze, [20, 4]);
  }
  // The wings: a bronze arm from an iron root block, primary feathers bronze, coverts iron, rust-red under-feathers.
  const w = mercuryWing();
  for (const side of [1, -1]) {
    const at = (p: [number, number], x = 0) => v3(x, p[1], side * p[0]);
    const arm = new THREE.CatmullRomCurve3(w.arm.map((p) => at(p))).getPoints(60);
    M.tube(arm, (t) => 0.03 - 0.016 * t, (t) => (frac(t * 9) < 0.1 ? yellow : bronzeSmooth), 12, 1);
    M.add(new THREE.BoxGeometry(0.07, 0.11, 0.09), frameAt(at([1.085, 0.02]), v3(0, 1, 0), v3(0, 0, side)), iron);
    M.add(new THREE.BoxGeometry(0.074, 0.02, 0.094), frameAt(at([1.085, 0.065]), v3(0, 1, 0), v3(0, 0, side)), yellow);
    M.add(new THREE.BoxGeometry(0.076, 0.05, 0.02), frameAt(at([1.13, 0.0]), v3(0, 1, 0), v3(0, 0, side)), { ...amberWin, band: [0, 1], su: 300 });
    const feather = (len: number, wd: number) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, -wd / 2);
      sh.lineTo(len * 0.8, -wd * 0.46);
      sh.quadraticCurveTo(len * 1.02, -wd * 0.2, len, 0);
      sh.quadraticCurveTo(len * 0.96, wd * 0.36, len * 0.8, wd * 0.46);
      sh.lineTo(0, wd / 2);
      sh.lineTo(0, -wd / 2);
      return new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 6 });
    };
    w.feathers.forEach((fe, i) => {
      const dir = v3(0, fe.dir[1], side * fe.dir[0]).normalize();
      const o = at(fe.at);
      // Feather frame: x along the feather, y across it in the wing's plane, z through the wing (structure x).
      const mk = (off: number, depthX: number) => {
        const xA = dir.clone();
        const zA = v3(1, 0, 0);
        const yA = new THREE.Vector3().crossVectors(zA, xA).normalize();
        return new THREE.Matrix4().makeBasis(xA, yA, zA).setPosition(o.clone().addScaledVector(dir, off).add(v3(depthX, 0, 0)));
      };
      // Seen from either side: rust-red under-feathers in the middle, bronze primaries and darker coverts both ways.
      M.add(feather(fe.len * 1.04, fe.w * 0.7), mk(0.02, -0.005), look(RUST, PAT.cloth, { su: 30, sv: 30 }), [30, 30]);
      for (const sx of [1, -1]) {
        M.add(feather(fe.len, fe.w), mk(0, sx * 0.008 - 0.005), look(i % 2 ? 0x9a6a36 : 0x8a5e30, PAT.panel, { metal: 0.6, rough: 0.42 }), [8, 1.5]);
        M.add(feather(fe.len * 0.42, fe.w * 1.05), mk(-0.004, sx * 0.018 - 0.005), look(0x5a3d22, PAT.panel, { metal: 0.6, rough: 0.5 }), [8, 1.5]);
      }
    });
  }
  // The train: a long iron train of carriages with amber windows, running on the rail ring.
  const T = new Mesher();
  const cars = 18;
  for (let k = 0; k < cars; k++) {
    const lon = (k * 0.042) / r1;
    const c = cylP(lon, r1 + 0.008, 0);
    const F = frameAt(c, c.clone().setY(0).normalize(), v3(-Math.sin(lon), 0, Math.cos(lon)));
    T.add(new THREE.BoxGeometry(0.016, 0.012, 0.036), F, k === cars - 1 ? bronzeSmooth : { ...amberWin, band: [0, 1], su: 400 }, [1, 1]);
    T.add(new THREE.BoxGeometry(0.018, 0.003, 0.03), F.clone().multiply(new THREE.Matrix4().makeTranslation(0.009, 0, 0)), bronze);
  }
  const train = new THREE.Group();
  train.userData.mesher = T;
  return {
    style: { trim: 0xe3c52c, glow: 0xffb000, bump: 1.3 }, mesh: M, moving: [train],
    update: (time) => { train.rotation.y = -time * 0.012; },
  };
}

// ===== Venus: the shell of Aphrodite =====
function venus(): WorldArt {
  const V = SHAPE.venus;
  const GOLD = 0xc9a227, DGREEN = 0x0f4a33, EMER = 0x1d8f5c;
  const gold = look(GOLD, PAT.smooth, { metal: 0.85, rough: 0.38 });
  const mosaic = look(GOLD, PAT.mosaic, { metal: 0.85, rough: 0.32, su: 220, sv: 220 });
  const groove = look(0x9a7a1c, PAT.mosaic, { metal: 0.85, rough: 0.4, su: 220, sv: 220 });
  // Emerald enamel laid between the gold ribs: the people's own green, glassy, so the shell reads against the cream.
  const enamel = look(0x138a52, PAT.mosaic, { metal: 0.35, rough: 0.22, su: 220, sv: 220 });
  const green = look(DGREEN, PAT.panel, { metal: 0.5, rough: 0.35, su: 50, sv: 50 });
  const emerald = look(0x1dbf6c, PAT.glow, { glow: 2.6 });
  const rimDots = look(GOLD, PAT.windows, { glow: 1.6, metal: 0.9, rough: 0.3, su: 160 });
  const M = new Mesher();
  const { b, n, e } = venusBoss();
  const Bv = v3(...b), Nv = v3(...n), Ev = v3(...e);
  const dirBoss = (rho: number, alpha: number) => Bv.clone().multiplyScalar(Math.cos(rho)).addScaledVector(Nv.clone().multiplyScalar(Math.cos(alpha)).addScaledVector(Ev, Math.sin(alpha)), Math.sin(rho));
  // The girdle: gold lips, a deep green band set with glowing emeralds in gold collets, mosaic on its faces.
  const gr = Math.sin(V.girdle * D);
  const g0 = 1.1, g1 = 1.135;
  M.slab(720, 6, (u, v) => sph(Math.asin(-gr + 2 * gr * v), u * TAU).multiplyScalar(g1), (p) => p.clone().normalize().negate(), g1 - g0,
    (_u, v) => (v < 0.22 || v > 0.78 ? gold : green), green, mosaic, [TAU * g1, 2 * gr * g1], [false, false, true, true]);
  for (let k = 0; k < 140; k++) {
    const lon = (k / 140) * TAU;
    const d = sph(0, lon);
    M.add(new THREE.IcosahedronGeometry(0.0105, 1), frameAt(d.clone().multiplyScalar(g1 + 0.006), d, v3(0, 1, 0), v3(1, 1, 0.75)), emerald);
    M.add(new THREE.TorusGeometry(0.012, 0.0022, 4, 14), frameAt(d.clone().multiplyScalar(g1 + 0.002), d, v3(0, 1, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), gold);
  }
  // The clamshell: two fans from the boss, polished gold ribs with emerald enamel between, dark gold grooves, green beneath.
  for (const [from, to] of [V.upper, V.lower] as const) {
    const NU = V.ribs * 14;
    const top = (u: number, v: number) => {
      const k = u * V.ribs;
      const rib = Math.pow(Math.abs(Math.sin(frac(k) * Math.PI)), 0.6);
      return 0.012 + 0.058 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.55 + 0.45 * v * v)), 0.7) + 0.012 * rib * Math.sin(Math.PI * v);
    };
    const at = (u: number, v: number) => {
      const alpha = (from + (to - from) * u) * D;
      const rim = venusRim(alpha, from, to);
      const rho = V.hub * D + (rim - V.hub * D) * v;
      return dirBoss(rho, alpha).multiplyScalar(1.1 + top(u, v));
    };
    M.slab(NU, 40, at, (p) => p.clone().normalize().negate(), 0.012,
      (u) => { const f = frac(u * V.ribs); return f > 0.34 && f < 0.66 ? (f > 0.44 && f < 0.56 ? gold : mosaic) : f < 0.05 || f > 0.95 ? groove : enamel; },
      green, (edge) => (edge === 3 ? { ...rimDots, band: [0.2, 0.8] } : gold), [((to - from) * D) * 1.1, V.reach * D * 1.1], [true, true, false, true]);
  }
  // The boss: a jewel in gold rings where the shell is hinged.
  {
    const c = Bv.clone().multiplyScalar(1.13);
    const F = (r: number) => frameAt(Bv.clone().multiplyScalar(r), Bv, v3(0, 1, 0));
    M.add(new THREE.CylinderGeometry(0.085, 0.09, 0.03, 64), F(1.13), green, [20, 2]);
    M.add(new THREE.TorusGeometry(0.088, 0.01, 10, 64), F(1.145).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), gold);
    M.add(new THREE.TorusGeometry(0.058, 0.007, 10, 48), F(1.15).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), gold);
    M.add(new THREE.SphereGeometry(0.042, 32, 16), F(1.145).multiply(new THREE.Matrix4().makeScale(1, 0.55, 1)), emerald);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU;
      const p = c.clone().addScaledVector(Nv.clone().multiplyScalar(Math.cos(a)).addScaledVector(Ev, Math.sin(a)), 0.073).addScaledVector(Bv, 0.017);
      M.add(new THREE.IcosahedronGeometry(0.0075, 1), frameAt(p, Bv, Nv), emerald);
    }
  }
  // The lamp towers of the Polykandelon, hanging under the girdle: gold rods, tiered lanterns with green fire.
  const L = VENUS_LAMPS;
  for (const lon of venusLamps()) {
    const topP = cylP(lon, L.r, L.top);
    const bot = cylP(lon, L.r, L.bottom);
    M.tube([topP, bot.clone().add(v3(0, 0.03, 0))], () => 0.0035, gold, 6);
    const F = (y: number, s = 1) => frameAt(cylP(lon, L.r, L.bottom + y), v3(0, 1, 0), cylP(lon, 1, 0), s);
    M.add(new THREE.ConeGeometry(0.024, 0.02, 8), F(0.04), gold);
    M.add(new THREE.CylinderGeometry(0.018, 0.018, 0.034, 8, 1, true), F(0.014), look(GOLD, PAT.windows, { glow: 2.2, su: 1, band: [0, 1], metal: 0.9, rough: 0.3 }), [6, 1]);
    M.add(new THREE.SphereGeometry(0.012, 10, 8), F(0.014), emerald);
    M.add(new THREE.ConeGeometry(0.014, 0.022, 8).rotateX(Math.PI), F(-0.012), gold);
    M.add(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 16), F(0.03), gold);
  }
  // The green dome on the north pole, ribbed in gold, with a finial.
  {
    const r = 1.1;
    const dr = Math.sin(V.dome * D) * r;
    const base = v3(0, Math.cos(V.dome * D) * r, 0);
    M.add(new THREE.SphereGeometry(dr, 48, 16, 0, TAU, 0, Math.PI / 2), frameAt(base, v3(0, 1, 0), v3(1, 0, 0)).multiply(new THREE.Matrix4().makeScale(1, 0.62, 1)), look(EMER, PAT.mosaic, { metal: 0.5, rough: 0.3, su: 160, sv: 160 }), [40, 12]);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const arc: V[] = [];
      for (let i = 0; i <= 16; i++) { const t = (i / 16) * Math.PI / 2; arc.push(base.clone().add(v3(Math.cos(a) * Math.cos(t) * dr * 1.01, Math.sin(t) * dr * 0.62 * 1.01, Math.sin(a) * Math.cos(t) * dr * 1.01))); }
      M.tube(arc, () => 0.004, gold, 6);
    }
    M.add(new THREE.TorusGeometry(dr, 0.008, 8, 64), frameAt(base, v3(0, 1, 0), v3(1, 0, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), gold);
    M.add(new THREE.ConeGeometry(0.012, 0.05, 12), frameAt(base.clone().add(v3(0, dr * 0.62 + 0.022, 0)), v3(0, 1, 0), v3(1, 0, 0)), gold);
  }
  return { style: { trim: 0x2fd27a, glow: 0x3dff9a, bump: 1.0 }, mesh: M };
}

// ===== Mars: the shield wall of the legion =====
function mars(): WorldArt {
  const MS = SHAPE.mars;
  const RED = 0xcc2131, CRIMSON = 0xa8232c, STEEL = 0x8a8f96, DSTEEL = 0x5d6269, GOLD = 0xd6aa48;
  const gold = look(GOLD, PAT.smooth, { metal: 0.85, rough: 0.38 });
  const dsteel = look(DSTEEL, PAT.panel, { metal: 0.7, rough: 0.45, su: 30, sv: 30 });
  const steel = look(STEEL, PAT.panel, { metal: 0.8, rough: 0.35, su: 40, sv: 40 });
  const ice = look(0xbfefff, PAT.glow, { glow: 3.4 });
  const slit = look(0x7fd8ff, PAT.glow, { glow: 1.1 }); // a cool line between shields, not a lamp: at 3.4 they bloomed into white bars
  const M = new Mesher();
  const N = MS.shields;
  // Each scutum stands on its own, with a lit slit between neighbours (refs/mars.webp): when they overlapped, the wall
  // read from orbit as one flat red band with gold dots on it.
  const halfW = (360 / N / 2) * 0.84 * D;
  const hy = Math.sin(MS.half * D) * 1.45;
  for (let k = 0; k < N; k++) {
    const c = (k / N) * TAU;
    const r0 = 1.452 + (k % 2 ? 0.0 : 0.006);
    const enamel = look(k % 2 ? CRIMSON : RED, PAT.panel, { metal: 0.3, rough: 0.34, su: 3.2, sv: 2.4 });
    const win = look(k % 2 ? CRIMSON : RED, PAT.windows, { glow: 1.1, metal: 0.3, rough: 0.4, su: 140 });
    const at = (u: number, v: number, lift = 0) => {
      const x = u * 2 - 1, y = v * 2 - 1;
      const r = r0 + 0.055 * (1 - x * x) + 0.012 * (1 - y * y) + lift; // a deep curve, so each shield catches the light
      return cylP(c + x * halfW, r, y * hy);
    };
    const inward = (p: V) => v3(-p.x, 0, -p.z).normalize();
    // The face: crimson enamel, two rows of windows under the top rim; a gold rim all round.
    M.slab(28, 24, (u, v) => at(u, v), inward, 0.01,
      (u, v) => (v > 0.8 && v < 0.84 && u > 0.1 && u < 0.9 ? { ...win, band: [0.8, 0.84] } : v > 0.74 && v < 0.78 && u > 0.1 && u < 0.9 ? { ...win, band: [0.74, 0.78] } : enamel), dsteel, dsteel, [halfW * 2 * 1.45, 2 * hy]);
    const rim = (u0: number, u1: number, v0: number, v1: number) =>
      M.slab(Math.max(2, Math.round((u1 - u0) * 28)), Math.max(1, Math.round((v1 - v0) * 24)), (u, v) => at(u0 + (u1 - u0) * u, v0 + (v1 - v0) * v, 0.004), inward, 0.006, gold, gold, gold, [1, 1]);
    rim(0, 1, 0.91, 1); rim(0, 1, 0, 0.09); rim(0, 0.08, 0.09, 0.91); rim(0.92, 1, 0.09, 0.91);
    rim(0.47, 0.53, 0.14, 0.36); rim(0.47, 0.53, 0.64, 0.86); // the spina, above and below the boss
    // The boss.
    const bc = at(0.5, 0.5, 0.004);
    const out = v3(bc.x, 0, bc.z).normalize();
    M.add(new THREE.SphereGeometry(0.048, 24, 12, 0, TAU, 0, Math.PI / 2), frameAt(bc, out, v3(0, 1, 0)).multiply(new THREE.Matrix4().makeScale(1, 0.6, 1)), gold);
    M.add(new THREE.TorusGeometry(0.054, 0.008, 8, 32), frameAt(bc, out, v3(0, 1, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), gold);
    // Ice-blue light in the slit to the next shield.
    const sl = c + (360 / N / 2) * D;
    M.surface(1, 8, (u, v) => cylP(sl + (u - 0.5) * 0.009, 1.447, (v * 2 - 1) * hy * 0.92), slit, [0.013, 2 * hy], (p) => v3(p.x, 0, p.z));
    // A bracket back to the rail.
    for (const y of [-0.6, 0.6]) M.add(new THREE.BoxGeometry(0.03, 0.012, 0.012), frameAt(cylP(c, 1.441, y * hy), v3(0, 1, 0), cylP(c, 1, 0)), dsteel);
  }
  // The rail behind the shields: a steel band with an ice-blue light along it, inside and out.
  M.slab(720, 6, (u, v) => cylP(u * TAU, 1.432, -0.05 + 0.1 * v), (p) => v3(-p.x, 0, -p.z).normalize(), 0.012,
    (_u, v) => (v > 0.42 && v < 0.58 ? ice : steel), steel, dsteel, [TAU * 1.43, 0.1], [false, false, true, true]);
  M.surface(720, 1, (u, v) => cylP(u * TAU, 1.4195, -0.006 + 0.012 * v), ice, [TAU * 1.42, 0.012], (p) => v3(-p.x, 0, -p.z));
  // The eagle standard on the north pole: a spear-shaft mast in gold bands, the eagle with spread wings in a wreath.
  const S = MARS_STANDARD;
  M.tube([v3(0, S.foot, 0), v3(0, S.top, 0)], () => 0.0075, steel, 10);
  for (let k = 0; k < 5; k++) M.add(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 16), frameAt(v3(0, S.foot + 0.1 + k * 0.14, 0), v3(0, 1, 0), v3(1, 0, 0)), gold);
  M.add(new THREE.BoxGeometry(0.008, 0.008, 0.16), frameAt(v3(0, S.top - 0.04, 0), v3(0, 1, 0), v3(1, 0, 0)), gold);
  aquila(M, v3(0, S.eagle, 0), v3(1, 0, 0), S.span, gold);
  wreath(M, v3(-0.012, S.eagle, 0), v3(1, 0, 0), S.span * 0.5, 0.05, gold, 30);
  return { style: { trim: 0xe0b45a, glow: 0xbfefff, bump: 1.1 }, mesh: M };
}

/** The legion's eagle (aquila): wings raised and spread, head turned, facing `fwd`, `span` wide, at `c`. */
export function aquila(M: Mesher, c: V, fwd: V, span: number, L: Look) {
  const s = span;
  const up = v3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(up, fwd).normalize();
  const F = (p: V, sc: V) => frameAt(p, up, fwd, sc);
  M.add(new THREE.SphereGeometry(0.5, 16, 12), F(c.clone(), v3(s * 0.16, s * 0.34, s * 0.14)), L);
  M.add(new THREE.SphereGeometry(0.5, 12, 10), F(c.clone().addScaledVector(up, s * 0.21).addScaledVector(side, s * 0.03), v3(s * 0.1, s * 0.1, s * 0.12)), L);
  M.add(new THREE.ConeGeometry(s * 0.025, s * 0.07, 8).rotateZ(-Math.PI / 2), frameAt(c.clone().addScaledVector(up, s * 0.2).addScaledVector(side, s * 0.1), up, fwd), L);
  // Wings: feathers fanning up and out from each shoulder.
  for (const sd of [1, -1]) {
    for (let k = 0; k < 7; k++) {
      const a = (18 + k * 10) * D;
      const len = s * (0.3 + 0.035 * k);
      const dir = side.clone().multiplyScalar(sd * Math.cos(a)).addScaledVector(up, Math.sin(a));
      const root = c.clone().addScaledVector(up, s * 0.08).addScaledVector(side, sd * s * 0.06);
      const mid = root.clone().addScaledVector(dir, len / 2);
      M.add(new THREE.BoxGeometry(1, 1, 1), frameAt(mid, dir, fwd, v3(s * 0.05, len, s * 0.012)), L);
    }
  }
  // Tail fan and the perch.
  for (let k = -2; k <= 2; k++) {
    const dir = up.clone().multiplyScalar(-1).addScaledVector(side, k * 0.18).normalize();
    M.add(new THREE.BoxGeometry(1, 1, 1), frameAt(c.clone().addScaledVector(up, -s * 0.22).addScaledVector(dir, s * 0.07), dir, fwd, v3(s * 0.045, s * 0.15, s * 0.01)), L);
  }
  M.add(new THREE.BoxGeometry(1, 1, 1), F(c.clone().addScaledVector(up, -s * 0.3), v3(s * 0.32, s * 0.03, s * 0.05)), L);
}

// ===== Jupiter: the crown of Zeus =====
function jupiter(): WorldArt {
  const J = SHAPE.jupiter;
  const HULL = 0x24133a, PLATE = 0x4a2a78, TRIM = 0x7442ad, GOLD = 0xc9a24a;
  const hull = look(HULL, PAT.panel, { metal: 0.6, rough: 0.45, su: 40, sv: 40 });
  const plate = look(PLATE, PAT.panel, { metal: 0.55, rough: 0.42, su: 40, sv: 40 });
  const trim = look(TRIM, PAT.smooth, { metal: 0.7, rough: 0.35 });
  const gold = look(GOLD, PAT.smooth, { metal: 0.85, rough: 0.38 });
  const goldKey = look(PLATE, PAT.meander, { metal: 0.7, rough: 0.35, su: 30 });
  const oak = look(PLATE, PAT.leaf, { metal: 0.6, rough: 0.4, su: 22 });
  const win = look(HULL, PAT.windows, { glow: 2.6, metal: 0.5, rough: 0.5, su: 140 });
  const mag = look(0xff2fd0, PAT.glow, { glow: 3.4 });
  // The bolt inlaid down each spire glows, but under the arcs: at the arcs' 3.4 every spire bloomed into a neon pillar
  // and hid the violet blade and its gold edge.
  const magCore = look(0xe23cc4, PAT.glow, { glow: 1.25 });
  const M = new Mesher();
  // The ring: a plated deck with magenta lane lights, and a rim of lit windows between gold edges, a meander on top.
  const R = JUPITER_RING;
  const L0 = TAU * R.deck[1];
  M.surface(720, 8, (u, v) => cylP(u * TAU, R.deck[0] + (R.deck[1] - R.deck[0]) * v, R.deckHalf), plate, [L0, R.deck[1] - R.deck[0]], () => v3(0, 1, 0));
  M.surface(720, 8, (u, v) => cylP(u * TAU, R.deck[0] + (R.deck[1] - R.deck[0]) * v, -R.deckHalf), hull, [L0, R.deck[1] - R.deck[0]], () => v3(0, -1, 0));
  M.surface(720, 1, (u, v) => cylP(u * TAU, R.deck[0], -R.deckHalf + 2 * R.deckHalf * v), trim, [L0, 0.02], (p) => v3(-p.x, 0, -p.z));
  for (const r of [1.085, 1.205]) M.surface(720, 1, (u, v) => cylP(u * TAU, r + 0.003 * v, R.deckHalf + 0.0005), mag, [L0, 0.003], () => v3(0, 1, 0));
  const [a, b] = R.rim;
  const h = R.rimHalf;
  M.surface(720, 2, (u, v) => cylP(u * TAU, a + (b - a) * v, h), { ...goldKey, band: [0, 1], su: 30 }, [TAU * b, b - a], () => v3(0, 1, 0));
  M.surface(720, 2, (u, v) => cylP(u * TAU, a + (b - a) * v, -h), hull, [TAU * b, b - a], () => v3(0, -1, 0));
  M.surface(1440, 8, (u, v) => cylP(u * TAU, b, -h + 2 * h * v), (_u, v) => (v > 0.8 || v < 0.2 ? gold : { ...win, band: [0.2, 0.8], sv: 1 }), [TAU * b, 2 * h], (p) => v3(p.x, 0, p.z));
  M.surface(720, 2, (u, v) => cylP(u * TAU, a, R.deckHalf + (h - R.deckHalf) * v), plate, [TAU * a, h], (p) => v3(-p.x, 0, -p.z));
  M.surface(720, 2, (u, v) => cylP(u * TAU, a, -h + (h - R.deckHalf) * v), plate, [TAU * a, h], (p) => v3(-p.x, 0, -p.z));
  // The crown wall: windows at its foot, an oak-leaf relief band, plates, a gold meander under a purple cap.
  const rIn = 1.105, rOut = 1.13;
  const wallAt = (u: number, v: number, r: number) => {
    const lon = u * TAU;
    const top = jupiterWallTop(lon) * D;
    const lat = 0.6 * D + (top - 0.6 * D) * v;
    return sph(lat, lon).multiplyScalar(r);
  };
  M.slab(1440, 24, (u, v) => wallAt(u, v, rOut), (p) => p.clone().normalize().negate(), rOut - rIn,
    (_u, v) => (v < 0.12 ? { ...win, band: [0, 0.12] } : v < 0.58 ? { ...oak, band: [0.12, 0.58] } : v < 0.8 ? plate : v < 0.92 ? { ...goldKey, band: [0.8, 0.92] } : trim),
    hull, (e) => (e === 3 ? gold : trim), [TAU * rOut, 0.2], [false, false, true, true]);
  // Eight pillars before the wall, each crowned by an eagle's head looking out.
  const colTop = Math.sin(J.pillarTop * D) * 1.14;
  const cols: THREE.Matrix4[] = [];
  for (let k = 0; k < J.pillars; k++) {
    const lon = ((k + 0.5) / J.pillars) * TAU;
    const p = cylP(lon, 1.155, R.deckHalf);
    const out = cylP(lon, 1, 0);
    cols.push(frameAt(p, v3(0, 1, 0), out, v3(0.034, colTop - R.deckHalf, 0.034)));
    M.add(new THREE.BoxGeometry(0.09, 0.02, 0.09), frameAt(p.clone().add(v3(0, 0.01, 0)), v3(0, 1, 0), out), gold);
    const topP = cylP(lon, 1.155, colTop);
    M.add(new THREE.BoxGeometry(0.088, 0.018, 0.088), frameAt(topP.clone().add(v3(0, 0.009, 0)), v3(0, 1, 0), out), gold);
    M.add(new THREE.CylinderGeometry(0.042, 0.036, 0.016, 24), frameAt(topP.clone().add(v3(0, -0.005, 0)), v3(0, 1, 0), out), gold);
    eagleHead(M, topP.clone().add(v3(0, 0.018, 0)), out, 0.085, { hull, plate, gold, eye: mag });
  }
  // Sixteen lightning spires on the rim, eight up and eight down: violet blades, a magenta bolt down each, gold tips.
  const bolt = (s: number) => {
    const pts: [number, number][] = [[-0.05, 0], [0.05, 0], [0.04, 0.38], [0.09, 0.4], [0.018, 0.69], [0.062, 0.7], [0, 0.97], [-0.036, 0.6], [-0.08, 0.6], [-0.012, 0.32], [-0.058, 0.33]];
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * s, y)));
    return sh;
  };
  const blade = new THREE.ExtrudeGeometry(bolt(1), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 }).translate(0, 0, -0.015);
  const edge = new THREE.ExtrudeGeometry(bolt(1.12), { depth: 0.022, bevelEnabled: false }).translate(0, -0.01, -0.011);
  const core = new THREE.ExtrudeGeometry(bolt(0.22), { depth: 0.036, bevelEnabled: false }).translate(0, 0.02, -0.018);
  for (let k = 0; k < 8; k++) {
    const lon = (k / 8) * TAU;
    const out = cylP(lon, 1, 0);
    for (const sy of [1, -1]) {
      const foot = cylP(lon, JUPITER_SPIRE[0][0], sy * JUPITER_SPIRE[0][1]);
      // Blade frame: x along the ring (tangent), y up the spire (leaning out), z out (thickness).
      const tan = v3(-Math.sin(lon), 0, Math.cos(lon));
      const tipFull = cylP(lon, JUPITER_SPIRE[2][0], sy * JUPITER_SPIRE[2][1]);
      const upD = tipFull.clone().sub(foot).normalize();
      const zA = new THREE.Vector3().crossVectors(tan, upD).normalize();
      const len = (foot.distanceTo(tipFull) * (sy > 0 ? 1 : 0.68)) / 0.97; // the down spires two thirds as long
      const tipP = foot.clone().addScaledVector(upD, len * 0.97);
      const m = new THREE.Matrix4().makeBasis(tan.clone(), upD.clone().multiplyScalar(len), zA).setPosition(foot);
      M.add(blade.clone(), m, look(TRIM, PAT.panel, { metal: 0.55, rough: 0.4, su: 5, sv: 5 }), [5, 5]);
      M.add(edge.clone(), m, look(GOLD, PAT.smooth, { metal: 0.9, rough: 0.36 }));
      M.add(core.clone(), m, magCore);
      if (sy > 0) M.add(new THREE.ConeGeometry(0.016, 0.07, 6), frameAt(tipP.clone().addScaledVector(upD, 0.015), upD, out), gold);
      M.add(new THREE.BoxGeometry(0.1, 0.05, 0.06), frameAt(foot, v3(0, sy, 0), out), plate);
      M.add(new THREE.BoxGeometry(0.104, 0.012, 0.064), frameAt(foot.clone().add(v3(0, sy * 0.022, 0)), v3(0, sy, 0), out), gold);
    }
  }
  blade.dispose(); core.dispose(); edge.dispose();
  // Lightning: jagged arcs between the up-spires' tips and down into the cloud tops, three shapes flickered in turn.
  const arcs: THREE.Group[] = [];
  for (let variant = 0; variant < 3; variant++) {
    const A = new Mesher();
    let seed = variant * 101 + 7;
    const rnd = () => { seed += 1; return hash(seed, variant) - 0.5; };
    const jag = (p: V, q: V, n: number, amp: number) => {
      const pts: V[] = [];
      const d = q.clone().sub(p);
      const l = d.length();
      const s1 = new THREE.Vector3().crossVectors(d, v3(0, 1, 0)).normalize();
      if (s1.lengthSq() < 0.5) s1.set(1, 0, 0);
      const s2 = new THREE.Vector3().crossVectors(d, s1).normalize();
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const env = Math.sin(Math.PI * t);
        pts.push(p.clone().addScaledVector(d, t).addScaledVector(s1, rnd() * amp * l * env).addScaledVector(s2, rnd() * amp * l * env));
      }
      return pts;
    };
    for (let k = 0; k < 8; k++) {
      if (hash(k, variant) < 0.25) continue;
      const p = cylP((k / 8) * TAU, JUPITER_SPIRE[2][0], JUPITER_SPIRE[2][1] + 0.02);
      const q = cylP(((k + 1) / 8) * TAU, JUPITER_SPIRE[2][0], JUPITER_SPIRE[2][1] + 0.02);
      const mid = p.clone().add(q).multiplyScalar(0.5).multiplyScalar(1.08);
      A.tube([...jag(p, mid, 7, 0.09), ...jag(mid, q, 7, 0.09).slice(1)], () => 0.0035, mag, 5);
    }
    for (let k = 0; k < 3; k++) {
      const s = Math.floor(hash(k + 30, variant) * 8);
      const p = cylP((s / 8) * TAU, JUPITER_SPIRE[2][0], JUPITER_SPIRE[2][1]);
      const q = sph((25 + 15 * hash(k, variant + 9)) * D, (s / 8) * TAU + 0.15).multiplyScalar(1.0);
      A.tube(jag(p, q, 12, 0.12), () => 0.003, mag, 5);
    }
    const g = new THREE.Group();
    g.userData.mesher = A;
    arcs.push(g);
  }
  let shown = 0;
  let next = 0;
  return {
    style: { trim: 0xd6ad5a, glow: 0xff2fd0, bump: 1.2 }, mesh: M, moving: arcs,
    columns: { geo: columnGeo(look(PLATE, PAT.panel, { metal: 0.55, rough: 0.4, su: 2, sv: 8 }), 16), mats: cols },
    update: (time) => {
      if (time < next) return;
      next = time + 0.06 + 0.22 * hash(Math.floor(time * 10));
      shown = hash(Math.floor(time * 13), 3) < 0.12 ? -1 : (shown + 1 + Math.floor(hash(Math.floor(time * 7)) * 2)) % 3;
      arcs.forEach((g, i) => { g.visible = i === shown; });
    },
  };
}

/** An eagle's head on a pillar, looking out along `out`: violet with a hooked gold beak and magenta eyes. */
function eagleHead(M: Mesher, c: V, out: V, s: number, L: { hull: Look; plate: Look; gold: Look; eye: Look }) {
  const up = v3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(up, out).normalize();
  M.add(new THREE.CylinderGeometry(s * 0.32, s * 0.42, s * 0.6, 12), frameAt(c.clone().addScaledVector(up, s * 0.3), up, out), L.plate);
  M.add(new THREE.SphereGeometry(0.5, 16, 12), frameAt(c.clone().addScaledVector(up, s * 0.72).addScaledVector(out, s * 0.08), up, out, v3(s * 0.62, s * 0.56, s * 0.78)), L.plate);
  M.add(new THREE.BoxGeometry(1, 1, 1), frameAt(c.clone().addScaledVector(up, s * 0.86).addScaledVector(out, s * 0.18), up, out, v3(s * 0.64, s * 0.1, s * 0.4)), L.hull);
  const beak = new THREE.ConeGeometry(s * 0.14, s * 0.42, 10).rotateX(Math.PI / 2).rotateX(0.5);
  M.add(beak, frameAt(c.clone().addScaledVector(up, s * 0.66).addScaledVector(out, s * 0.5), up, out), L.gold);
  for (const sd of [1, -1]) M.add(new THREE.SphereGeometry(s * 0.06, 8, 6), frameAt(c.clone().addScaledVector(up, s * 0.78).addScaledVector(out, s * 0.3).addScaledVector(side, sd * s * 0.2), up, out), L.eye);
  // The ruff of feathers at the neck.
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    const d = out.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a));
    M.add(new THREE.ConeGeometry(s * 0.07, s * 0.26, 4), frameAt(c.clone().addScaledVector(up, s * 0.42).addScaledVector(d, s * 0.33), up.clone().multiplyScalar(-1).addScaledVector(d, 0.6).normalize(), d), L.hull);
  }
}

// ===== Saturn: the sickle of Kronos =====
function saturn(): WorldArt {
  const S = SHAPE.saturn;
  const HULL = 0x16161e, PLATE = 0x2a2850, ACC = 0x33307a, EMBER = 0xff8a1e;
  const hull = look(HULL, PAT.panel, { metal: 0.5, rough: 0.55, su: 30, sv: 30 });
  const plate = look(PLATE, PAT.panel, { metal: 0.5, rough: 0.5, su: 30, sv: 30 });
  const acc = look(ACC, PAT.smooth, { metal: 0.6, rough: 0.4 });
  const slits = look(0x1d1c2a, PAT.slits, { glow: 3, metal: 0.4, rough: 0.55, su: 22, sv: 1 });
  const key = look(ACC, PAT.meander, { metal: 0.55, rough: 0.4, su: 24 });
  const ember = look(EMBER, PAT.glow, { glow: 2.2 });
  const M = new Mesher();
  const from = S.from * D, to = S.to * D;
  const lonAt = (u: number) => from + (to - from) * u;
  const NU = 900;
  const arc = (to - from) * 2.33;
  // The blade's deck on the rings: plated indigo with ember seams, its cutting edge in the inner curve.
  const Y = SATURN_DECK.y;
  const deck = (u: number, v: number, y: number) => cylP(lonAt(u), saturnInner(u) + (SATURN_DECK.outer - saturnInner(u)) * v, y);
  M.surface(NU, 6, (u, v) => deck(u, v, Y[1]), plate, [arc, SATURN_DECK.width], () => v3(0, 1, 0));
  M.surface(NU, 6, (u, v) => deck(u, v, Y[0]), hull, [arc, SATURN_DECK.width], () => v3(0, -1, 0));
  M.surface(NU, 2, (u, v) => cylP(lonAt(u), saturnInner(u) - 0.012 * (1 - Math.abs(v * 2 - 1)), Y[0] + (Y[1] - Y[0]) * v), acc, [arc, Y[1] - Y[0]], (p) => v3(-p.x, 0, -p.z));
  for (const v of [0.3, 0.7]) M.surface(NU, 1, (u, s) => deck(u, v + 0.02 * s, Y[1] + 0.0006), (u) => (frac(u * 60) < 0.55 ? ember : plate), [arc, 0.004], () => v3(0, 1, 0));
  // The wall on the rings' outer edge, tapering to a point at both ends: a plinth, black plates with ember slits,
  // a meander frieze. Inside, the colonnade glowing ember from within under an architrave.
  const r1 = 2.335, r0 = 2.295;
  const wallY = (u: number, v: number) => { const t = saturnTaper(u); return r1 * Math.sin((S.low * t + (S.high - S.low) * t * v) * D); };
  M.slab(NU, 12, (u, v) => cylP(lonAt(u), r1, wallY(u, v)), (p) => v3(-p.x, 0, -p.z).normalize(), r1 - r0,
    (_u, v) => (v < 0.16 ? acc : v < 0.84 ? { ...slits, band: [0.16, 0.84] } : { ...key, band: [0.84, 1] }), hull, acc, [arc, 0.15]);
  const colTop = (u: number) => r1 * Math.sin(S.colTop * saturnTaper(u) * D);
  const wTop = (u: number) => wallY(u, 1);
  M.surface(NU, 4, (u, v) => cylP(lonAt(u), 2.302, wTop(u) + (colTop(u) - wTop(u)) * v), ember, [arc, 0.1], (p) => v3(p.x, 0, p.z));
  M.slab(NU, 2, (u, v) => cylP(lonAt(u), 2.29 + 0.05 * v, colTop(u) + 0.008), () => v3(0, -1, 0), 0.016, plate, hull, acc, [arc, 0.05]);
  const cols: THREE.Matrix4[] = [];
  let acc0 = 0;
  for (let i = 0; i <= 4000; i++) {
    const u = i / 4000;
    acc0 += ((to - from) / 4000) * 2.32;
    if (acc0 < 0.034) continue;
    acc0 = 0;
    const t = saturnTaper(u);
    if (t < 0.12) continue;
    const y0 = wTop(u);
    cols.push(frameAt(cylP(lonAt(u), 2.322, y0), v3(0, 1, 0), cylP(lonAt(u), 1, 0), v3(0.0085, colTop(u) - y0, 0.0085)));
  }
  // The hourglasses on both poles: dark frames on four posts, ember sand in the glass, a neck down to the cloud tops.
  const G = SATURN_GLASS;
  for (const sy of [1, -1]) {
    const up = v3(0, sy, 0);
    const c = v3(0, sy * G.y, 0);
    const F = (p: V, s: number | V = 1) => frameAt(p, up, v3(1, 0, 0), s);
    for (const e of [-1, 1]) {
      M.add(new THREE.CylinderGeometry(G.r, G.r, 0.024, 48), F(c.clone().addScaledVector(up, e * G.half)), plate, [10, 2]);
      M.add(new THREE.TorusGeometry(G.r, 0.006, 6, 48), F(c.clone().addScaledVector(up, e * (G.half + 0.013))).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), look(EMBER, PAT.glow, { glow: 1.6 }));
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      M.add(new THREE.CylinderGeometry(0.008, 0.008, G.half * 2, 8), F(c.clone().add(v3(Math.cos(a) * G.r * 0.86, 0, Math.sin(a) * G.r * 0.86))), acc);
    }
    // The glass: two bulbs drawn as dark gloss, the sand in them glowing.
    const glass = look(0x2a2850, PAT.smooth, { metal: 0.2, rough: 0.08 });
    M.add(new THREE.CylinderGeometry(G.r * 0.78, 0.012, G.half * 0.95, 32, 1, true), F(c.clone().addScaledVector(up, G.half * 0.5)), glass);
    M.add(new THREE.CylinderGeometry(0.012, G.r * 0.78, G.half * 0.95, 32, 1, true), F(c.clone().addScaledVector(up, -G.half * 0.5)), glass);
    M.add(new THREE.ConeGeometry(G.r * 0.62, G.half * 0.5, 32), F(c.clone().addScaledVector(up, -G.half * 0.72)), look(EMBER, PAT.glow, { glow: 2.4 }));
    M.add(new THREE.CylinderGeometry(G.r * 0.4, 0.01, G.half * 0.38, 32), F(c.clone().addScaledVector(up, G.half * 0.3)), look(EMBER, PAT.glow, { glow: 2.4 }));
    M.add(new THREE.CylinderGeometry(0.003, 0.003, G.half * 0.9, 6), F(c.clone().addScaledVector(up, -G.half * 0.2)), look(EMBER, PAT.glow, { glow: 4 }));
    M.add(new THREE.CylinderGeometry(0.03, 0.05, G.y - G.half - 0.97, 24), F(c.clone().addScaledVector(up, -(G.half + (G.y - G.half - 0.97) / 2))), hull);
  }
  // The pylon from the north glass down to the middle of the wall, bowed out round the planet, ember lights along it.
  const mid = ((S.from + S.to) / 2) * D;
  const foot = cylP(mid, 2.29, 0.1);
  const top0 = v3(0, G.y - G.half, 0);
  const bow = top0.clone().add(foot).multiplyScalar(0.5);
  bow.multiplyScalar(1.36 / bow.length());
  const curve = new THREE.QuadraticBezierCurve3(top0, bow.clone().multiplyScalar(2).sub(top0.clone().add(foot).multiplyScalar(0.5)), foot);
  const pp = curve.getPoints(120);
  M.tube(pp, () => 0.02, (t) => (frac(t * 40) < 0.08 ? look(EMBER, PAT.glow, { glow: 2 }) : plate), 12);
  return {
    style: { trim: 0xc87a3a, glow: 0xff8a1e, bump: 1.1 }, mesh: M,
    columns: { geo: columnGeo(look(0x24233a, PAT.smooth, { metal: 0.5, rough: 0.45 }), 12), mats: cols },
  };
}

/** Each world's art, in its structure's axes and planet radii. `quito` places Earth's tether (latitude, longitude). */
export function worldArt(home: ArmourHome, opts: { quito: { lat: number; lon: number } }): WorldArt {
  switch (home) {
    case 'earth': return earth(opts.quito);
    case 'moon': return moon();
    case 'mercury': return mercury();
    case 'venus': return venus();
    case 'mars': return mars();
    case 'jupiter': return jupiter();
    case 'saturn': return saturn();
  }
}

/** Mars's spears to its moon forts, and the forts (Castra Phobos, Castra Deimos), in the structure's axes, planet radii. */
export function marsSpears(M: Mesher, moons: { id: string; at: V; size: number }[]) {
  const steel = look(0x8a8f96, PAT.panel, { metal: 0.85, rough: 0.3, su: 200, sv: 40 });
  const gold = look(0xd6aa48, PAT.smooth, { metal: 0.85, rough: 0.38 });
  for (const m of moons) {
    const flat = v3(m.at.x, 0, m.at.z).normalize();
    const foot = flat.clone().multiplyScalar(1.48);
    const dir = m.at.clone().sub(foot).normalize();
    const end = m.at.clone().addScaledVector(dir, m.size * 3 + 0.04);
    M.tube([foot, end], () => 0.006, steel, 8);
    M.add(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 12), frameAt(foot.clone().addScaledVector(dir, 0.015), dir, v3(0, 1, 0)), gold);
    // The spearhead: a long leaf blade past the fort.
    const leaf = [new THREE.Vector2(0, 0), new THREE.Vector2(0.02, 0.03), new THREE.Vector2(0.026, 0.07), new THREE.Vector2(0.012, 0.13), new THREE.Vector2(0, 0.16)];
    M.add(new THREE.LatheGeometry(leaf, 4), frameAt(end, dir, v3(0, 1, 0), v3(1, 1, 0.25)), steel);
    M.add(new THREE.CylinderGeometry(0.01, 0.012, 0.03, 10), frameAt(end.clone().addScaledVector(dir, -0.012), dir, v3(0, 1, 0)), gold);
    castra(M, m.at, m.at.clone().normalize(), m.size);
  }
}

/** Castra (refs/bases/stn-mars-1-2): a walled legionary camp on a flat wedge platform built onto a small moon. */
export function castra(M: Mesher, c: V, out: V, size: number) {
  const s = size * 1.5;
  const steel = look(0x8a8f96, PAT.panel, { metal: 0.75, rough: 0.4, su: 20 / s, sv: 20 / s });
  const dsteel = look(0x5d6269, PAT.panel, { metal: 0.7, rough: 0.45, su: 20 / s, sv: 20 / s });
  const red = look(0xcc2131, PAT.smooth, { metal: 0.4, rough: 0.4 });
  const gold = look(0xd6aa48, PAT.smooth, { metal: 0.85, rough: 0.38 });
  const win = look(0x5d6269, PAT.windows, { glow: 2.4, metal: 0.5, rough: 0.5, su: 8 / s, band: [0, 1] });
  const F = (x: number, y: number, z: number, sc: V) => frameAt(c.clone().addScaledVector(out, s * 0.55).add(new THREE.Vector3(x, y, z).applyMatrix4(new THREE.Matrix4().extractRotation(frameAt(v3(), out, v3(0, 1, 0))))), out, v3(0, 1, 0), sc);
  // The platform: a flat wedge, its point toward the planet's way round.
  M.add(new THREE.CylinderGeometry(1, 1.15, 1, 3), F(0, 0, 0, v3(s * 1.6, s * 0.35, s * 1.6)), dsteel);
  // The camp: four walls with a red crest, corner towers, a gate.
  const half = s * 0.8;
  for (const [x, z, w, d] of [[0, half, 2 * half, 0.1 * s], [0, -half, 2 * half, 0.1 * s], [half, 0, 0.1 * s, 2 * half], [-half, 0, 0.1 * s, 2 * half]] as const) {
    M.add(new THREE.BoxGeometry(1, 1, 1), F(x, s * 0.35, z, v3(w, s * 0.36, d)), steel);
    M.add(new THREE.BoxGeometry(1, 1, 1), F(x, s * 0.55, z, v3(w * 1.01, s * 0.05, d * 1.2)), red);
    M.add(new THREE.BoxGeometry(1, 1, 1), F(x, s * 0.3, z, v3(w * 0.9, s * 0.08, d * 1.05)), win);
  }
  for (const x of [-half, half]) for (const z of [-half, half]) M.add(new THREE.CylinderGeometry(s * 0.13, s * 0.15, s * 0.6, 12), F(x, s * 0.45, z, v3(1, 1, 1)), steel);
  // The command tower, and its gold eagle.
  M.add(new THREE.BoxGeometry(1, 1, 1), F(0, s * 0.7, 0, v3(s * 0.4, s * 1.0, s * 0.4)), steel);
  M.add(new THREE.BoxGeometry(1, 1, 1), F(0, s * 0.85, 0, v3(s * 0.42, s * 0.1, s * 0.42)), win);
  aquila(M, c.clone().addScaledVector(out, s * 0.55 + s * 1.35), out.clone().cross(v3(0, 1, 0)).normalize(), s * 0.55, gold);
  // The hangar slot along one edge, lit.
  M.add(new THREE.BoxGeometry(1, 1, 1), F(0, s * 0.05, -s * 1.15, v3(s * 1.2, s * 0.14, s * 0.2)), look(0x0c0d10, PAT.smooth, { metal: 0.2, rough: 0.9 }));
  M.add(new THREE.BoxGeometry(1, 1, 1), F(0, s * 0.13, -s * 1.2, v3(s * 1.22, s * 0.02, s * 0.1)), look(0xeaf6ff, PAT.glow, { glow: 3 }));
}

