/**
 * Set pieces: the parts of each god's armour that stand off the shell (ART-REFIT.md): Earth's shipyard ring, Mercury's
 * wings and hats, Venus's lamp towers, Mars's eagle standard and the spears to its moon forts, Zeus's ring and lightning
 * spires, Kronos's blade deck, hourglasses and pylon. Each is a few simple solids, written in the structure's own axes
 * (armour.ts axesOf) in planet radii and placed in world space here, so the scene draws them from the same numbers
 * and the ship cannot fly through them.
 *
 * Pure geometry, like armour.ts: no three.js.
 */
import { ARMOUR_HOMES, SHAPE, axesOf, venusHalf } from './armour';
import type { ArmourFrame, ArmourHome, V3 } from './armour';

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a); return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const D = Math.PI / 180;
const TAU = Math.PI * 2;

/** A solid, world space, scene units. */
export type Solid =
  | { kind: 'sphere'; c: V3; r: number }
  | { kind: 'capsule'; a: V3; b: V3; r: number }
  /** An oriented box: centre, three unit axes and half sizes. */
  | { kind: 'box'; c: V3; u: V3; v: V3; n: V3; hu: number; hv: number; hn: number }
  /**
   * A flat ring round `n` (half thickness `h`), from `rIn` to `rOut` in its plane. `sweep`: only between these azimuths
   * (radians, from `ref` toward `side`), with the inner radius `inner(u)` at fraction `u` along the sweep (Saturn's blade).
   */
  | { kind: 'annulus'; c: V3; n: V3; ref: V3; side: V3; rIn: number; rOut: number; h: number; sweep?: [number, number]; inner?: (u: number) => number };

/** A world's set pieces, and the sphere round all of them (scene units) for a quick reject. */
export interface SetPieces { home: ArmourHome; solids: Solid[]; reach: number }

/** What a world's set pieces need from outside the armour: where the moons they reach to sit. */
export interface SetPieceInputs { moons?: { id: string; pos: V3; size: number }[] }

// ---------- shapes in the structure's axes (planet radii), shared with the scene ----------

/** Mercury's wings: the arm from root to tip, and the feathers hanging from it. `s` is out along ±z, `t` up (y). */
export function mercuryWing(): { arm: [number, number][]; feathers: { at: [number, number]; dir: [number, number]; len: number; w: number }[] } {
  const arm: [number, number][] = [[1.05, 0.0], [1.3, 0.22], [1.58, 0.56], [1.86, 0.92]];
  const feathers: { at: [number, number]; dir: [number, number]; len: number; w: number }[] = [];
  const N = 14;
  for (let k = 0; k < N; k++) {
    const f = 1 - k / (N - 1); // 1 at the tip, 0 at the root
    // A point along the arm, by arc fraction f.
    const seg = Math.min(arm.length - 2, Math.floor(f * (arm.length - 1)));
    const lf = f * (arm.length - 1) - seg;
    const at: [number, number] = [arm[seg][0] + (arm[seg + 1][0] - arm[seg][0]) * lf, arm[seg][1] + (arm[seg + 1][1] - arm[seg][1]) * lf];
    const a = -(50 + 28 * f) * D; // down and outward; the tip's feathers hang steeper
    feathers.push({ at, dir: [Math.cos(a), Math.sin(a)], len: 0.2 + 0.45 * f, w: 0.11 });
  }
  return { arm, feathers };
}

/** Jupiter's spires: foot, knee and tip (r out from the axis, y up) of an upward spire; down spires mirror y. */
export const JUPITER_SPIRE: [number, number][] = [[1.235, 0.03], [1.27, 0.48], [1.31, 0.97]];
/** Jupiter's ring: deck and outer rim (r from the axis, half thickness). */
export const JUPITER_RING = { deck: [1.06, 1.222] as const, deckHalf: 0.012, rim: [1.222, 1.25] as const, rimHalf: 0.03 };
/** Saturn's blade deck: the wall's inner face, the blade's greatest width, its thickness (y from, y to). */
export const SATURN_DECK = { outer: 2.295, width: 0.2, y: [-0.022, 0.03] as const };
export const saturnInner = (u: number) => SATURN_DECK.outer - SATURN_DECK.width * Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.8);
/** Saturn's hourglasses: centre height, half height, radius of the frame's discs. */
export const SATURN_GLASS = { y: 1.36, half: 0.23, r: 0.17 };
/** Mars's standard: the mast from the pole to the eagle, the eagle's centre and size. */
export const MARS_STANDARD = { foot: 0.99, top: 1.82, eagle: 1.95, span: 0.5 };
/** Mercury's hats: height of the brim, brim radius, crown radius and height (north; south scaled by `south`). */
export const MERCURY_HAT = { y: 1.13, brim: 0.5, crown: 0.24, crownH: 0.09, south: 0.75 };
/** Venus's lamp towers under the girdle: how many, from where to where, and the lantern. */
export const VENUS_LAMPS = { n: 28, r: 1.128, top: -0.03, bottom: -0.17, lantern: 0.026 };
/** The longitudes of the lamp towers that hang clear of the clamshell's lower half. */
export function venusLamps(): number[] {
  const L = VENUS_LAMPS;
  const out: number[] = [];
  for (let k = 0; k < L.n; k++) {
    const lon = (k / L.n) * TAU;
    const clear = [L.top, (L.top + L.bottom) / 2, L.bottom].every((y) => venusHalf(unit([Math.cos(lon) * L.r, y, Math.sin(lon) * L.r])).half === 0);
    if (clear) out.push(lon);
  }
  return out;
}
/** Earth's ring: the deck and the outer rim (r from the axis, half thickness). */
export const EARTH_RING = { deck: [1.13, 1.4] as const, deckHalf: 0.016, rim: [1.4, 1.425] as const, rimHalf: 0.036 };
/** The Moon's listening dishes on the crescent's back: longitude, latitude, radius (dish size), height of the dish's centre. */
export const MOON_DISHES: [number, number, number, number][] = [[86, 10, 0.075, 1.27], [90, -4, 0.09, 1.29], [84, -17, 0.06, 1.25], [92, 21, 0.05, 1.24], [95, -24, 0.05, 1.23]];

// ---------- building the solids ----------

function placer(f: ArmourFrame) {
  const a = axesOf(f);
  const R = f.R;
  const P = (g: V3): V3 => add(f.centre, mul(add(add(mul(a.x, g[0]), mul(a.y, g[1])), mul(a.z, g[2])), R));
  const Dv = (g: V3): V3 => unit(add(add(mul(a.x, g[0]), mul(a.y, g[1])), mul(a.z, g[2])));
  /** A point at azimuth `lon` (radians, from x toward z), distance `r` from the axis, height `y`. */
  const cyl = (lon: number, r: number, y: number): V3 => P([Math.cos(lon) * r, y, Math.sin(lon) * r]);
  return { a, R, P, Dv, cyl };
}

const cache = new Map<string, SetPieces>();

/** A world's set pieces. `inputs.moons` places Mars's spears; without it they are left out. */
export function setPieces(f: ArmourFrame, inputs: SetPieceInputs = {}): SetPieces {
  const key = `${f.home}:${f.centre.join(',')}:${f.R}:${(inputs.moons ?? []).map((m) => m.id + m.pos.join(',')).join(';')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { a, R, P, Dv, cyl } = placer(f);
  const s: Solid[] = [];
  const ring = (rIn: number, rOut: number, h: number, y = 0, sweep?: [number, number], inner?: (u: number) => number) =>
    s.push({ kind: 'annulus', c: P([0, y, 0]), n: a.y, ref: a.x, side: a.z, rIn: rIn * R, rOut: rOut * R, h: h * R, sweep, inner: inner && ((u) => inner(u) * R) });
  const cap = (p: V3, q: V3, r: number) => s.push({ kind: 'capsule', a: P(p), b: P(q), r: r * R });
  const ball = (p: V3, r: number) => s.push({ kind: 'sphere', c: P(p), r: r * R });
  switch (f.home) {
    case 'earth':
      ring(EARTH_RING.deck[0], EARTH_RING.deck[1], EARTH_RING.deckHalf);
      ring(EARTH_RING.rim[0], EARTH_RING.rim[1], EARTH_RING.rimHalf);
      break;
    case 'moon':
      for (const [lon, lat, size, h] of MOON_DISHES) ball(mul([Math.cos(lat * D) * Math.cos(lon * D), Math.sin(lat * D), Math.cos(lat * D) * Math.sin(lon * D)], h), size * 1.1);
      break;
    case 'mercury': {
      const H = MERCURY_HAT;
      for (const [sy, k] of [[1, 1], [-1, H.south]] as const) {
        ring(0, H.brim * k, 0.012, sy * H.y);
        ring(0, H.crown * k, (H.crownH * k) / 2, sy * (H.y + (H.crownH * k) / 2));
      }
      const w = mercuryWing();
      for (const side of [1, -1]) {
        const at = (p: [number, number]): V3 => [0, p[1], side * p[0]];
        for (let i = 0; i < w.arm.length - 1; i++) cap(at(w.arm[i]), at(w.arm[i + 1]), 0.03);
        for (const fe of w.feathers) {
          const tip: [number, number] = [fe.at[0] + fe.dir[0] * fe.len, fe.at[1] + fe.dir[1] * fe.len];
          const c = P(mul(add(at(fe.at), at(tip)), 0.5));
          const u = unit(sub(P(at(tip)), P(at(fe.at))));
          const n = Dv([1, 0, 0]); // the wing lies in the y–z plane: its thin axis is x
          s.push({ kind: 'box', c, u, v: unit(cross(n, u)), n, hu: (fe.len / 2) * R, hv: (fe.w / 2) * R, hn: 0.012 * R });
        }
      }
      break;
    }
    case 'venus': {
      const L = VENUS_LAMPS;
      for (const lon of venusLamps()) {
        cap([Math.cos(lon) * L.r, L.top, Math.sin(lon) * L.r], [Math.cos(lon) * L.r, L.bottom, Math.sin(lon) * L.r], L.lantern);
      }
      const b = SHAPE.venus.boss * D;
      ball([Math.cos(b) * 1.17, 0, Math.sin(b) * 1.17], 0.05);
      break;
    }
    case 'mars': {
      const M = MARS_STANDARD;
      cap([0, M.foot, 0], [0, M.top + 0.12, 0], 0.012);
      ball([0, M.eagle, 0], M.span * 0.55);
      for (const m of inputs.moons ?? []) {
        if (m.id !== 'phobos' && m.id !== 'deimos') continue;
        // From the ring, straight out to the moon and a spear's head past it.
        const rel = sub(m.pos, f.centre);
        const along = sub(rel, mul(a.y, dot(rel, a.y)));
        const out = unit(along);
        const foot = add(f.centre, mul(out, f.rOut));
        const dir = unit(sub(m.pos, foot));
        s.push({ kind: 'capsule', a: foot, b: add(m.pos, mul(dir, m.size * 3 + 0.12 * R)), r: 0.01 * R });
        s.push({ kind: 'sphere', c: m.pos, r: m.size * 1.9 });
      }
      break;
    }
    case 'jupiter': {
      const J = JUPITER_RING;
      ring(J.deck[0], J.deck[1], J.deckHalf);
      ring(J.rim[0], J.rim[1], J.rimHalf);
      for (let k = 0; k < 8; k++) {
        const lon = (k / 8) * TAU;
        for (const sy of [1, -1]) {
          // The down spires are two thirds as long.
          const pts = JUPITER_SPIRE.map(([r, y], i) => cyl(lon, r, sy * (sy > 0 || !i ? y : JUPITER_SPIRE[0][1] + (y - JUPITER_SPIRE[0][1]) * 0.68)));
          for (let i = 0; i < pts.length - 1; i++) s.push({ kind: 'capsule', a: pts[i], b: pts[i + 1], r: (i ? 0.018 : 0.028) * R });
        }
      }
      break;
    }
    case 'saturn': {
      const S = SHAPE.saturn;
      const sweep: [number, number] = [S.from * D, S.to * D];
      const Y = SATURN_DECK.y;
      ring(saturnInner(0), SATURN_DECK.outer, (Y[1] - Y[0]) / 2, (Y[1] + Y[0]) / 2, sweep, saturnInner);
      // The architrave on the colonnade, where the blade is full height.
      const top = 2.315 * Math.sin(S.colTop * D);
      const t0 = S.from + (S.to - S.from) / 7;
      const t1 = S.to - (S.to - S.from) / 7;
      ring(2.29, 2.34, 0.008, top, [t0 * D, t1 * D]);
      const G = SATURN_GLASS;
      for (const sy of [1, -1]) cap([0, sy * (G.y - G.half - 0.05), 0], [0, sy * (G.y + G.half), 0], G.r + 0.01);
      // The pylon from the north glass down to the middle of the wall, bowed out round the planet.
      const mid = ((S.from + S.to) / 2) * D;
      const foot: V3 = [Math.cos(mid) * 2.29, 0.1, Math.sin(mid) * 2.29];
      const top0: V3 = [0, G.y - G.half, 0];
      const m = mul(add(foot, top0), 0.5);
      const bow = mul(m, 1.36 / len(m));
      cap(top0, bow, 0.02);
      cap(bow, foot, 0.02);
      break;
    }
  }
  let reach = 0;
  for (const x of s) {
    const far = x.kind === 'sphere' ? len(sub(x.c, f.centre)) + x.r
      : x.kind === 'capsule' ? Math.max(len(sub(x.a, f.centre)), len(sub(x.b, f.centre))) + x.r
        : x.kind === 'box' ? len(sub(x.c, f.centre)) + Math.hypot(x.hu, x.hv, x.hn)
          : Math.hypot(len(sub(x.c, f.centre)) + x.rOut, x.h);
    reach = Math.max(reach, far);
  }
  const out = { home: f.home, solids: s, reach };
  cache.set(key, out);
  return out;
}

// ---------- collision ----------

/** Push a point of radius `pad` out of one solid. `prev` (where it was) says which side of a thin solid it came from. */
export function solidPush(x: Solid, pos: V3, prev: V3, pad: number): V3 | null {
  switch (x.kind) {
    case 'sphere': {
      const d = sub(pos, x.c);
      const l = len(d);
      if (l >= x.r + pad) return null;
      return add(x.c, mul(l > 1e-9 ? mul(d, 1 / l) : [0, 1, 0], x.r + pad));
    }
    case 'capsule': {
      const ab = sub(x.b, x.a);
      const t = clamp(dot(sub(pos, x.a), ab) / Math.max(dot(ab, ab), 1e-12), 0, 1);
      const q = add(x.a, mul(ab, t));
      const d = sub(pos, q);
      const l = len(d);
      if (l >= x.r + pad) return null;
      let n = l > 1e-9 ? mul(d, 1 / l) : unit(cross(ab, [0, 1, 0]));
      if (len(n) < 0.5) n = [1, 0, 0];
      return add(q, mul(n, x.r + pad));
    }
    case 'box': {
      const r = sub(pos, x.c);
      const lu = dot(r, x.u), lv = dot(r, x.v), ln = dot(r, x.n);
      const pu = x.hu + pad - Math.abs(lu), pv = x.hv + pad - Math.abs(lv), pn = x.hn + pad - Math.abs(ln);
      if (pu <= 0 || pv <= 0 || pn <= 0) return null;
      // Thin across n: come back out on the side it came from.
      const pln = dot(sub(prev, x.c), x.n);
      if (pn <= pu && pn <= pv || Math.sign(pln) !== Math.sign(ln)) {
        const sgn = Math.abs(pln) > 1e-9 ? Math.sign(pln) : Math.sign(ln) || 1;
        return add(pos, mul(x.n, sgn * (x.hn + pad) - ln));
      }
      if (pu <= pv) return add(pos, mul(x.u, Math.sign(lu) * pu));
      return add(pos, mul(x.v, Math.sign(lv) * pv));
    }
    case 'annulus': {
      const r = sub(pos, x.c);
      const y = dot(r, x.n);
      if (Math.abs(y) >= x.h + pad) return null;
      const w = sub(r, mul(x.n, y));
      const rho = len(w);
      if (rho > x.rOut + pad) return null;
      let rIn = x.rIn;
      if (x.sweep) {
        let phi = Math.atan2(dot(w, x.side), dot(w, x.ref));
        while (phi < x.sweep[0]) phi += TAU;
        while (phi >= x.sweep[0] + TAU) phi -= TAU;
        const u = (phi - x.sweep[0]) / (x.sweep[1] - x.sweep[0]);
        if (u < 0 || u > 1) return null;
        if (x.inner) rIn = x.inner(u);
      }
      if (rho < rIn - pad) return null;
      const py = dot(sub(prev, x.c), x.n);
      const radial = rho > 1e-9 ? mul(w, 1 / rho) : x.ref;
      const outY = x.h + pad - Math.abs(y);
      const outR = x.rOut + pad - rho;
      const inR = rIn > 0 ? rho - (rIn - pad) : Infinity;
      // Came from above or below the deck: back out that way, however deep it got in one step.
      if (Math.abs(py) >= x.h && Math.sign(py) !== Math.sign(y)) return add(pos, mul(x.n, Math.sign(py) * (x.h + pad) - y));
      if (outY <= outR && outY <= inR) return add(pos, mul(x.n, (Math.sign(y) || 1) * outY));
      if (outR <= inR) return add(pos, mul(radial, outR));
      return add(pos, mul(radial, -inR));
    }
  }
}

/** Keep a point out of every solid of a world's set pieces. Returns the corrected point and how deep it was, or null. */
export function setPiecePush(sp: SetPieces, centre: V3, pos: V3, prev: V3, pad: number): { pos: V3; depth: number } | null {
  if (len(sub(pos, centre)) > sp.reach + pad) return null;
  let p = pos;
  let depth = 0;
  for (const x of sp.solids) {
    const q = solidPush(x, p, prev, pad);
    if (q) { depth = Math.max(depth, len(sub(q, p))); p = q; }
  }
  return depth > 0 ? { pos: p, depth } : null;
}

/** Every world's set pieces, for a frame per world. */
export const allSetPieces = (frames: Record<ArmourHome, ArmourFrame>, inputs: Partial<Record<ArmourHome, SetPieceInputs>> = {}) =>
  Object.fromEntries(ARMOUR_HOMES.map((h) => [h, setPieces(frames[h], inputs[h])])) as Record<ArmourHome, SetPieces>;
