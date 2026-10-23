/**
 * The warship's brain (cruisers and capital ships): positional play rather than dogfighting.
 *
 *   close  → far from its slot: fly there
 *   hold   → at its slot: a cruiser keeps its standoff with its turrets on the player (backing off if the player
 *            comes in close); a capital ship circles the player broadside on, so its batteries bear and its
 *            motion spoils the player's lead
 *   cover  → its shield is low: it moves to put a body, a station, an asteroid or another ship between itself and
 *            the player, waits for the shield to come back, then comes out
 *
 * The fleet's plan (lib/tactics fleetPlan) gives it a slot: the capital ship on the line, cruisers on the flanks.
 * Pure; the scene flies the order with flyFree and keeps it out of bodies with avoidBodies.
 */
import type { V3 } from './nav';
import { add, cross, dist, dot, len, scale, sub, unit } from './nav';
import type { Knobs } from './aiKnobs';
import { AI } from './aiKnobs';
import type { Occluder } from './tactics';
import { bestCover, broadsideFace, hidden, orbitVel } from './tactics';
import { arrive } from './pilot';

export type WarshipMode = 'close' | 'hold' | 'cover';
export interface WarshipView {
  cls: 'cruiser' | 'capital' | 'destroyer';
  t: number;
  pos: V3;
  vel: V3;
  fwd: V3;
  id: number;
  r: number; // its hit radius
  /** The player; `fwd` (its nose) lets a destroyer stay out of its guns. */
  target: { pos: V3; vel: V3; fwd?: V3 };
  shield: number; // 0..1 of full
  standoff: number;
  slot: V3 | null; // from the fleet's plan
  occluders: Occluder[];
  speed: number; // top speed
  accel: number;
  coverPref: number; // doctrine 0..1
  k: number;
}
export interface WarshipMem { mode: WarshipMode; since: number; cover: V3 | null; sense: 1 | -1 }
export interface WarshipOrder { mode: WarshipMode; wantVel: V3; face: V3; goal: V3; hidden: boolean }

export const newWarshipMem = (t = 0, sense: 1 | -1 = 1): WarshipMem => ({ mode: 'close', since: t, cover: null, sense });

/** The shield fraction under which it runs for cover, from the knob and its doctrine. */
export const coverThreshold = (pref: number, knobs: Knobs = AI) => knobs.coverAt * (0.5 + pref);

export function warshipThink(v: WarshipView, mem: WarshipMem, knobs: Knobs = AI): WarshipOrder {
  const toP = sub(v.target.pos, v.pos);
  const d = len(toP);
  const goalSlot = v.slot ?? add(v.target.pos, scale(unit(sub(v.pos, v.target.pos)), v.standoff));
  const isHidden = hidden(v.pos, v.id, v.target.pos, v.occluders);

  // ---- Cover: in when the shield runs low, out when it is back ----
  if (mem.mode !== 'cover' && v.shield < coverThreshold(v.coverPref, knobs)) {
    const c = bestCover(v.pos, v.r, v.id, v.target.pos, v.occluders, v.standoff, v.standoff * 3);
    if (c) { mem.mode = 'cover'; mem.since = v.t; mem.cover = c.point; }
  } else if (mem.mode === 'cover') {
    if (v.shield >= knobs.uncoverAt) { mem.mode = 'close'; mem.since = v.t; mem.cover = null; }
    else {
      // The player moves: keep re-picking the hiding place.
      const c = bestCover(v.pos, v.r, v.id, v.target.pos, v.occluders, v.standoff, v.standoff * 3);
      mem.cover = c ? c.point : mem.cover;
    }
  }
  if (mem.mode !== 'cover') {
    const off = dist(v.pos, goalSlot);
    if (mem.mode === 'close' && off < v.standoff * 0.25) { mem.mode = 'hold'; mem.since = v.t; }
    else if (mem.mode === 'hold' && off > v.standoff * 0.6) { mem.mode = 'close'; mem.since = v.t; }
  }

  let wantVel: V3;
  let face: V3;
  let goal = goalSlot;
  if (mem.mode === 'cover' && mem.cover) {
    goal = mem.cover;
    wantVel = arrive(v.pos, goal, v.speed, v.accel);
    face = v.cls === 'capital' ? broadsideFace(v.fwd, toP) : unit(toP);
  } else if (v.cls === 'destroyer') {
    // Hunter: run in at full speed, then circle the player at speed with its turrets on it, turning away from the
    // player's nose; it does not hold a slot. Agility is its armour (claude/destroyer-a8ff7d DESTROYER.md).
    const r = v.standoff * knobs.huntOrbit;
    const top = v.speed * knobs.huntSpeed;
    if (d > v.standoff * 1.3) wantVel = scale(unit(toP), top);
    else {
      const out = unit(scale(toP, -1));
      const nose = v.target.fwd && len(v.target.fwd) > 1e-6 ? unit(v.target.fwd) : len(v.target.vel) > 1e-6 ? unit(v.target.vel) : scale(out, -1);
      const axis = unit(cross(nose, out));
      let tangent = unit(cross(len(axis) > 1e-6 ? axis : ([0, 1, 0] as V3), out));
      if (dot(tangent, nose) > 0) tangent = scale(tangent, -1);
      wantVel = scale(unit(add(tangent, scale(out, (1.5 * (r - d)) / Math.max(r, 1e-6)))), top);
    }
    face = unit(len(wantVel) > 1e-6 ? wantVel : toP);
  } else if (v.cls === 'capital') {
    // Circle the player at standoff, broadside on; drift toward the slot as it goes.
    const ring = orbitVel(v.pos, v.target.pos, v.standoff, v.speed * 0.6, mem.sense);
    const toSlot = arrive(v.pos, goalSlot, v.speed * 0.5, v.accel);
    wantVel = mem.mode === 'close' ? arrive(v.pos, goalSlot, v.speed, v.accel) : add(scale(ring, 0.7), scale(toSlot, 0.3));
    face = mem.mode === 'close' && d > v.standoff * 1.6 ? unit(wantVel) : broadsideFace(v.fwd, toP);
  } else {
    // Cruiser: to the slot, then hold the range with its guns on the player; back away if it comes inside.
    wantVel = arrive(v.pos, goalSlot, v.speed, v.accel);
    if (d < v.standoff * 0.7) wantVel = add(wantVel, scale(unit(toP), -v.speed * 0.6));
    face = d < v.standoff * 1.5 || mem.mode === 'hold' ? unit(toP) : unit(len(wantVel) > 1e-6 ? wantVel : toP);
  }
  return { mode: mem.mode, wantVel, face, goal, hidden: isHidden };
}
