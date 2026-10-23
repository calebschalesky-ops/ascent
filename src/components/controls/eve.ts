/**
 * EVE Online's control model (thread eve-controls, rulings E1-E3): the cursor is always free and never turns the ship.
 * The camera orbits the ship (left-drag on empty space; right button + wheel or +/- to zoom), and the ship is flown by
 * commands: double-click in space and it turns that way at its own turn rates and holds it. Pure maths, unit-tested.
 *
 * The camera's angles are the flight model's (yaw 0 looks along −z, positive yaw to the left, positive pitch up): the
 * camera sits behind the ship along the direction it looks, so yaw = the ship's yaw and a little negative pitch is the
 * old chase view.
 */
import type { V3 } from '../../lib/nav';

export const EVE = {
  /** Camera orbit per pixel of left-drag at camera sensitivity 1: half a turn for a 900-pixel drag. */
  radPerPx: Math.PI / 900,
  /** The camera never goes past straight above or below the ship (radians), so the view cannot flip over. */
  pitchLimit: 1.45,
  /** Where the camera starts and comes back to after a respawn: a little above the ship, looking along its nose. */
  pitch0: -0.22,
  /** Zoom, as a multiple of the chase distance (4.6 hull scale units behind; the capital ship's is 4× that). */
  zoomMin: 0.4,
  zoomMax: 25,
  /** Each wheel notch (right button held) or press of + / − zooms by this factor. */
  notch: 1.15,
  /** Mouse travel (pixels) before a left press counts as a drag rather than a click. */
  slop: 5,
  /** Two clicks within this long (seconds) and this close (pixels) are a double-click. */
  dblTime: 0.35,
  dblDist: 8,
  /** A left press held still this long (seconds) fires the weapon (until E6 puts firing on the lock). */
  holdFire: 0.2,
  /**
   * Double-click from a stop: the throttle this sets (0..1, logarithmic: 0.3 is about 15 units/s, 40 ship lengths a
   * second). The brief said full; full is 74,000 units/s and would leave any fight in a second, so this is a cruise.
   */
  goThrottle: 0.3,
  /** The double-click marker shows this long (seconds). */
  markLife: 1.1,
  /** The heading marker hides once the nose is within this angle of the commanded direction (radians, 2°). */
  onHeading: (2 * Math.PI) / 180,
  /**
   * E6, the guns track the selected target: while a selected ship's lead point is within this angle of the nose
   * (radians, 60°: a cruiser turns at 0.9 rad/s against a fighter's 2.4, and at 40° a strafing fighter was in the arc
   * about a tenth of the time) and within `gunReach` × the weapon's range, the guns fire at the lead point, not along the nose.
   * Outside it they fire along the nose, so the ship's heading still matters (EVE's skill is the positioning).
   */
  gunArc: (60 * Math.PI) / 180,
  gunReach: 1.2,
} as const;

export interface Orbit { yaw: number; pitch: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Left-drag: move the mouse right and the camera swings round to the ship's left (the world turns with the hand, as
 * dragging a globe); move it down and the camera rises to look down on the ship. Invert flips up and down.
 */
export function orbitDrag(o: Orbit, dx: number, dy: number, sensitivity = 1, invert = false): Orbit {
  const k = EVE.radPerPx * sensitivity;
  return { yaw: wrap(o.yaw - dx * k), pitch: clamp(o.pitch + (invert ? dy : -dy) * k, -EVE.pitchLimit, EVE.pitchLimit) };
}

/** Zoom in (`dir` < 0) or out (`dir` > 0) one notch, held within the range. */
export const zoomStep = (zoom: number, dir: number) =>
  clamp(dir > 0 ? zoom * EVE.notch : dir < 0 ? zoom / EVE.notch : zoom, EVE.zoomMin, EVE.zoomMax);

/** The camera's place relative to the ship: `dist` back along the direction it looks. */
export function orbitOffset(o: Orbit, dist: number): [number, number, number] {
  const cp = Math.cos(o.pitch);
  // forward at (yaw, pitch) is (−sin yaw·cos pitch, sin pitch, −cos yaw·cos pitch); the camera is behind it.
  return [Math.sin(o.yaw) * cp * dist, -Math.sin(o.pitch) * dist, Math.cos(o.yaw) * cp * dist];
}

export interface Click { t: number; x: number; y: number }

/** Whether a click at (`x`, `y`) at time `t` (seconds) is the second of a double-click after `last`. */
export const isDoubleClick = (last: Click | null, t: number, x: number, y: number) =>
  !!last && t - last.t <= EVE.dblTime && Math.hypot(x - last.x, y - last.y) <= EVE.dblDist;

/**
 * The double-click command: the heading to hold, and the throttle. From a stop the engines open to EVE.goThrottle;
 * moving, the throttle stays where it was.
 */
export function flyCommand(throttle: number): number {
  return throttle <= 0.005 ? EVE.goThrottle : throttle;
}

/**
 * E6: where the guns point. `from` the gun, `nose` the unit nose, `target` the selected ship (null: none) with its
 * velocity and, when known, its acceleration, `speed` the shot speed, `range` the weapon's reach. The lead is solved
 * for constant acceleration by fixed-point iteration on the flight time: a fighter in a 2.4 rad/s turn curves 7-12
 * units off a straight-line lead in a 0.3 s bolt flight, which is why straight-line leads missed by a median 12 units.
 * With the acceleration term the error on that circle is under half a unit. `inArc` is false only when a target is
 * selected and out of the arc.
 */
export function trackedGun(
  from: V3, nose: V3, target: { pos: V3; vel: V3; acc?: V3 } | null, speed: number, range: number,
): { dir: V3; inArc: boolean; tracking: boolean } {
  if (!target) return { dir: nose, inArc: true, tracking: false };
  const a = target.acc ?? [0, 0, 0];
  const at = (t: number): V3 => [0, 1, 2].map((i) => target.pos[i] + target.vel[i] * t + 0.5 * a[i] * t * t) as V3;
  let t = Math.hypot(target.pos[0] - from[0], target.pos[1] - from[1], target.pos[2] - from[2]) / Math.max(speed, 1e-6);
  for (let k = 0; k < 6; k++) { const p = at(t); t = Math.hypot(p[0] - from[0], p[1] - from[1], p[2] - from[2]) / Math.max(speed, 1e-6); }
  const aim = at(t);
  const d: V3 = [aim[0] - from[0], aim[1] - from[1], aim[2] - from[2]];
  const n = Math.hypot(d[0], d[1], d[2]);
  if (n < 1e-9) return { dir: nose, inArc: true, tracking: false };
  const dir: V3 = [d[0] / n, d[1] / n, d[2] / n];
  const cos = Math.max(-1, Math.min(1, dir[0] * nose[0] + dir[1] * nose[1] + dir[2] * nose[2]));
  const ok = Math.acos(cos) <= EVE.gunArc && n <= range * EVE.gunReach;
  return ok ? { dir, inArc: true, tracking: true } : { dir: nose, inArc: false, tracking: false };
}
