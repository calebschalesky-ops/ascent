/**
 * Paths for drawing (PKG-12): a maneuver's remaining path in flight, and the distance from a point to a path. Pure.
 *
 * The remaining path is PKG-10's own pilot flown forward on a copy of the flight's pilot state, over the same legs and
 * the ship's current limits: what the ship will fly unless it is damaged or given a new order. It never touches the
 * battle or its RNG. It is re-flown every TAC.pathRefreshS battle seconds (a hit to the engines changes it).
 */
import type { Battle, Flight, PilotState } from '../../sim/index';
import { MAN, flightOf, limitsOf, pilotStep } from '../../sim/index';
import { TAC } from './numbers';

export interface XZ { x: number; z: number }
export interface TimedPath { pts: XZ[]; times: number[] }

interface Cached { key: string; at: number; path: TimedPath }
export type PathCache = Map<string, Cached>;

const keyOf = (f: Flight) => `${f.name}@${f.t0}`;

/** Fly a copy of the flight's pilot to the end: points every MAN.sampleS from now. */
export function flyRest(b: Battle, f: Flight): TimedPath {
  const s = b.ships.find((x) => x.id === f.ship);
  if (!s) return { pts: [], times: [] };
  const L = limitsOf(s, b.dt);
  const pilot = JSON.parse(JSON.stringify(f.pilot)) as PilotState;
  const pts: XZ[] = [{ x: pilot.pose.x, z: pilot.pose.z }];
  const times = [b.t];
  const every = Math.max(1, Math.round(MAN.sampleS / b.dt));
  const max = Math.round(MAN.maxS / b.dt);
  let k = 0;
  for (; k < max; k++) {
    const r = pilotStep(pilot, f.legs, L, b.dt);
    if (r.done) break;
    if ((k + 1) % every === 0) { pts.push({ x: pilot.pose.x, z: pilot.pose.z }); times.push(b.t + (k + 1) * b.dt); }
  }
  pts.push({ x: pilot.pose.x, z: pilot.pose.z });
  times.push(b.t + k * b.dt);
  return { pts, times };
}

/** The rest of a ship's maneuver from where it is now, or null when it is not flying one. */
export function remainingPath(b: Battle, shipId: string, cache: PathCache): TimedPath | null {
  const f = flightOf(b, shipId);
  const s = b.ships.find((x) => x.id === shipId);
  if (!f || !s) { cache.delete(shipId); return null; }
  let c = cache.get(shipId);
  if (!c || c.key !== keyOf(f) || b.t - c.at >= TAC.pathRefreshS || b.t < c.at) {
    c = { key: keyOf(f), at: b.t, path: flyRest(b, f) };
    cache.set(shipId, c);
  }
  const pts: XZ[] = [{ x: s.pos.x, z: s.pos.z }];
  const times = [b.t];
  c.path.times.forEach((t, i) => { if (t > b.t) { pts.push(c!.path.pts[i]); times.push(t); } });
  return thin({ pts, times }, TAC.pathMaxPts);
}

/** At most n points, evenly, always keeping the first and the last. */
export function thin(p: TimedPath, n: number): TimedPath {
  if (p.pts.length <= n) return p;
  const pts: XZ[] = [], times: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = Math.round((i * (p.pts.length - 1)) / (n - 1));
    pts.push(p.pts[j]);
    times.push(p.times[j]);
  }
  return { pts, times };
}

/** Shortest distance from a point to a polyline, metres. */
export function distToPath(p: XZ, pts: XZ[]): number {
  if (!pts.length) return Infinity;
  if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.z - pts[0].z);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], c = pts[i];
    const dx = c.x - a.x, dz = c.z - a.z;
    const L2 = dx * dx + dz * dz;
    const u = L2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L2)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + u * dx), p.z - (a.z + u * dz)));
  }
  return best;
}
