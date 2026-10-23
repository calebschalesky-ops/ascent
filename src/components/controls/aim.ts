/**
 * Heading steering. mc-controls (R1) built this for mouse aim; eve-controls (E1) took the mouse off it, and now a held
 * heading (a double-click in space, controls/eve.ts) is what the ship turns toward at its own turn rates, settling with
 * its nose on it. The mouse never moves it. Pure maths (no three.js), unit-tested.
 *
 * Directions are world unit vectors. `up` is the way "up" for the turn: world +y in space, the local vertical in an
 * atmosphere. Yaw turns about `up`; pitch is elevation above the plane square to `up`. Positive yaw is to the left
 * (the flight model's convention: A turned left and raised the yaw), positive pitch is up.
 */
import type { V3 } from '../../lib/nav';
import { cross, dot, scale, unit, add } from '../../lib/nav';

export const AIM = {
  /** How far the aim may look above or below the horizon (radians), the same limit as the ship's own pitch. */
  pitchLimit: 1.4,
  /**
   * Turn rate asked for per radian of aim error (1/s), on the error the turn will have left after `lead` seconds at the
   * present rate. With the flight model's eased turn (5/s) gain 8 and lead 0.2 s are just past critical damping: the
   * nose settles on the crosshair without swinging past it, about 0.8 s for a small correction.
   */
  gain: 8,
  lead: 0.2,
  /**
   * The gun arc (R5): within this angle of the nose (40°) the guns fire toward the crosshair; past it they fire along
   * the nose and the crosshair says "out of arc".
   */
  gunArc: (40 * Math.PI) / 180,
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Elevation of `v` above the plane square to `up`, radians. */
export const elevation = (v: V3, up: V3) => Math.asin(clamp(dot(unit(v), up), -1, 1));

/** A horizontal reference square to `up`: the direction's own projection, or any square direction when it is vertical. */
function horizontal(v: V3, up: V3): V3 {
  const h = add(v, scale(up, -dot(v, up)));
  const l = Math.hypot(h[0], h[1], h[2]);
  if (l > 1e-6) return scale(h, 1 / l);
  const side: V3 = Math.abs(up[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
  return unit(cross(up, side));
}

/** The direction at heading `h` (horizontal, unit) raised by `el` radians toward `up`. */
const raise = (h: V3, up: V3, el: number): V3 => unit(add(scale(h, Math.cos(el)), scale(up, Math.sin(el))));

/** Rotate a horizontal unit vector about `up` by `a` radians (positive: to the left, seen from above). */
function spin(h: V3, up: V3, a: number): V3 {
  const left = cross(up, h); // up × forward points left
  return unit(add(scale(h, Math.cos(a)), scale(left, Math.sin(a))));
}

/**
 * Move the aim by `dYaw` (left positive) and `dPitch` (up positive) radians. The elevation is held within
 * AIM.pitchLimit, so looking straight up never flips the view over.
 */
export function look(aim: V3, up: V3, dYaw: number, dPitch: number, limit: number = AIM.pitchLimit): V3 {
  const h = spin(horizontal(aim, up), up, dYaw);
  return raise(h, up, clamp(elevation(aim, up) + dPitch, -limit, limit));
}

/**
 * How far the aim is from the nose: yaw about `up` (left positive) and pitch (aim's elevation minus the nose's).
 * In space with up = +y these are exactly the differences of the flight model's yaw and pitch angles.
 */
export function aimError(aim: V3, fwd: V3, up: V3): { yaw: number; pitch: number } {
  const fh = horizontal(fwd, up);
  const ah = horizontal(aim, up);
  const right = cross(fh, up);
  const yaw = Math.atan2(-dot(ah, right), dot(ah, fh));
  return { yaw, pitch: elevation(aim, up) - elevation(fwd, up) };
}

/**
 * The turn rates (rad/s) that bring the nose onto the aim: proportional to the error still left after AIM.lead seconds
 * at the present turn `rate`, capped at the hull's rates.
 */
export function aimRates(err: { yaw: number; pitch: number }, maxYaw: number, maxPitch: number, rate = { yaw: 0, pitch: 0 }, gain: number = AIM.gain) {
  return {
    yaw: clamp((err.yaw - rate.yaw * AIM.lead) * gain, -maxYaw, maxYaw),
    pitch: clamp((err.pitch - rate.pitch * AIM.lead) * gain, -maxPitch, maxPitch),
  };
}

/** Angle between two directions, radians. */
export const angleBetween = (a: V3, b: V3) => Math.acos(clamp(dot(unit(a), unit(b)), -1, 1));

/** Yaw and pitch angles of a world direction in the flight model's convention (forward is −z at yaw 0). */
export const anglesOf = (v: V3) => ({ yaw: Math.atan2(-v[0], -v[2]), pitch: Math.asin(clamp(v[1] / Math.max(1e-9, Math.hypot(v[0], v[1], v[2])), -1, 1)) });
