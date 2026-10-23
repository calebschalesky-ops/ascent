/**
 * The pilot (PKG-10; path-following since PKG-18): flies a plotted course one fixed step at a time inside the ship's own
 * movement limits, the same turn rate and acceleration standing-orders steering uses (battle.ts move()): rate = class
 * turn × Helm multiplier (a quarter with the engines out), accel = class accel × Helm multiplier (none with the engines
 * out).
 *
 * PKG-18: the helmsman follows each leg as a line, not a bearing to its end point. He steers for a point a lookahead
 * ahead of him on the line (shorter for higher Helm: he holds the line tighter), turns in for the next leg where a fillet
 * of his turning radius meets both legs (as much of it as his Helm anticipates), slows for a sharp turn to a speed that
 * is the same for every captain (so the better turn rate makes the tighter turn), and brakes into a hold so he stops on
 * the point instead of drifting past it. The first leg of a course has no line behind it and is flown as a bearing to
 * its end point, as before.
 *
 * The preview and the flight run this same function from the same start, so the ghost line is the path flown.
 * Pure arithmetic: no randomness, no wall time.
 */
import { ABILITY, CLASS, DAMAGE } from '../numbers';
import { wrap } from '../ships';
import type { Ship } from '../types';
import { MAN } from './numbers';
import type { Leg, PilotState } from './types';

export interface PilotLimits {
  /** Max heading change per step (rad). */
  rate: number;
  /** Max speed change per step (m/s). */
  accel: number;
  /** Cruise speed (m/s). */
  cruise: number;
  /** The class's top speed (m/s): the sharp-turn speed is a fraction of it, the same for every captain. */
  top: number;
  /** Waypoint capture radius (m) with no turn after it. */
  capture: number;
  /** Fraction of the ideal turn-in distance this helmsman anticipates. */
  anticip: number;
  /** Steps between course readings (late turns). */
  lagTicks: number;
  /** Turning radius at cruise (m), for "we passed it". */
  radius: number;
  /** How far ahead on the leg's line he steers for (m): shorter holds the line tighter. */
  look: number;
}

export function limitsOf(s: Ship, dt: number): PilotLimits {
  const c = CLASS[s.cls];
  const H = s.captain.abilities.helm;
  const helm = ABILITY.helmBase + ABILITY.helmPer * H;
  const engines = s.systems.engines > 0;
  const rate = c.turn * helm * (engines ? 1 : DAMAGE.enginesOutTurn) * dt;
  const cruise = c.maxSpeed * Math.min(1, MAN.speedBase + MAN.speedPer * H);
  const radius = cruise / Math.max(1e-6, rate / dt);
  return {
    rate,
    accel: engines ? c.accel * helm * dt : 0,
    cruise,
    top: c.maxSpeed,
    capture: MAN.captureBase,
    anticip: Math.min(1, MAN.anticipPer * H),
    lagTicks: Math.round(MAN.lagPer * Math.max(0, 10 - H) / dt),
    radius,
    look: radius * (MAN.lookBase + MAN.lookPer * Math.max(0, 10 - H)),
  };
}

export function startPilot(s: Ship): PilotState {
  return { pose: { x: s.pos.x, z: s.pos.z, h: s.heading, v: s.speed }, leg: 0, held: 0, want: s.heading, lag: 0, ticks: 0, best: 1e12, first: 1e12 };
}

export interface StepResult {
  done: boolean;
  /** Board legs passed this step. */
  boards: Extract<Leg, { k: 'board' }>[];
}

type Go = Extract<Leg, { k: 'go' }>;

/** Where the go leg at `i` starts: the previous go leg's end (past boards and holds), or null for the first go leg. */
function fromOf(legs: Leg[], i: number): Go | null {
  for (let j = i - 1; j >= 0; j--) {
    const l = legs[j];
    if (l.k === 'go') return l;
  }
  return null;
}

/** Distance along the course from the pose to the next hold (Infinity if the course ends without one). */
function toHold(legs: Leg[], i: number, pose: { x: number; z: number }): number {
  let d = 0;
  let from = pose;
  for (let j = i; j < legs.length; j++) {
    const l = legs[j];
    if (l.k === 'hold') return d;
    if (l.k === 'go') { d += Math.hypot(l.x - from.x, l.z - from.z); from = l; }
  }
  return Infinity;
}

/** Advance the pilot one step of `dt`. Mutates `p`. */
export function pilotStep(p: PilotState, legs: Leg[], L: PilotLimits, dt: number): StepResult {
  const boards: StepResult['boards'] = [];
  const pose = p.pose;
  // Pass every leg already satisfied (waypoints reached, pods launched).
  while (p.leg < legs.length) {
    const leg = legs[p.leg];
    if (leg.k === 'board') { boards.push(leg); p.leg++; continue; }
    if (leg.k === 'go') {
      const d = Math.hypot(leg.x - pose.x, leg.z - pose.z);
      const A = fromOf(legs, p.leg);
      const next = legs[p.leg + 1];
      if (!A && p.first >= 1e12) p.first = d;
      const len = A ? Math.hypot(leg.x - A.x, leg.z - A.z) : p.first;
      // Turn in early for the next leg (a fillet of the turning radius), as far as this helmsman anticipates, but not
      // before he has flown half of this leg (PKG-18: on a short leg a full fillet would cut the corner off entirely).
      let capture = L.capture;
      if (next && next.k === 'go') {
        const inH = A ? Math.atan2(leg.z - A.z, leg.x - A.x) : Math.atan2(leg.z - pose.z, leg.x - pose.x);
        const turn = Math.min(Math.abs(wrap(Math.atan2(next.z - leg.z, next.x - leg.x) - inH)), MAN.maxFillet);
        capture = Math.max(capture, Math.min(L.anticip * L.radius * Math.tan(turn / 2), MAN.filletLegFrac * len));
      }
      if (A) {
        // On a line: measured along it, so a ship that has come abreast of the end moves on instead of circling back.
        const remaining = len < 1 ? 0 : ((leg.x - pose.x) * (leg.x - A.x) + (leg.z - pose.z) * (leg.z - A.z)) / len;
        if (d <= L.capture || remaining <= capture) { p.leg++; continue; }
      } else {
        // The first leg: a bearing to its end. Reached; or came within a turning circle of it and is now opening.
        const passed = p.best < 2 * L.radius && p.best < p.first - L.capture && d > p.best + 1;
        if (d <= capture || passed) { p.leg++; p.best = 1e12; p.first = 1e12; continue; }
        p.best = Math.min(p.best, d);
      }
    }
    if (leg.k === 'hold' && p.held >= leg.dur) { p.leg++; p.held = 0; continue; }
    break;
  }
  if (p.leg >= legs.length) return { done: true, boards };
  p.ticks++;
  const leg = legs[p.leg];
  let target = 0;
  if (leg.k === 'go') {
    if (p.lag <= 0) {
      const A = fromOf(legs, p.leg);
      if (A) {
        // Steer for a point `look` ahead on the leg's line.
        const sx = leg.x - A.x, sz = leg.z - A.z;
        const len = Math.max(1e-6, Math.hypot(sx, sz));
        const ux = sx / len, uz = sz / len;
        const ahead = (pose.x - A.x) * ux + (pose.z - A.z) * uz + L.look;
        p.want = Math.atan2(A.z + uz * ahead - pose.z, A.x + ux * ahead - pose.x);
      } else p.want = Math.atan2(leg.z - pose.z, leg.x - pose.x);
      p.lag = L.lagTicks;
    } else p.lag--;
    target = L.cruise * leg.v;
    // Slow into a turn: from top speed with the bow on course down to sharpTurnSpeed of top at sharpTurn off it, the same
    // for every captain, so the one with the better turn rate turns tighter.
    const err = Math.min(1, Math.abs(wrap(p.want - pose.h)) / MAN.sharpTurn);
    target = Math.min(target, L.top * (1 - (1 - MAN.sharpTurnSpeed) * err) * leg.v);
    // Brake into a hold: arrive slow enough to stop on the point (counting the course still to fly before it).
    const d = toHold(legs, p.leg, pose);
    if (d < Infinity) {
      const a = MAN.brakeAccel * L.accel / dt;
      target = Math.min(target, Math.max(MAN.brakeFloor * L.top, Math.sqrt(2 * a * Math.max(0, d - MAN.brakeAt * L.capture))));
    }
  } else if (leg.k === 'hold') {
    // Stop first, then turn to face: turning while still under way would drift him off the point sideways.
    p.want = pose.v > MAN.brakeFloor * L.top ? pose.h : (leg.face ?? pose.h);
    p.lag = 0;
    p.held += dt;
  }
  const delta = wrap(p.want - pose.h);
  pose.h = wrap(pose.h + Math.max(-L.rate, Math.min(L.rate, delta)));
  pose.v += Math.max(-L.accel, Math.min(L.accel, target - pose.v));
  pose.x += Math.cos(pose.h) * pose.v * dt;
  pose.z += Math.sin(pose.h) * pose.v * dt;
  return { done: false, boards };
}
