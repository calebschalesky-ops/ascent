/**
 * The fighter's brain: a state machine that approaches, attacks, breaks off and evades, flying named maneuvers.
 *
 *   approach  → from range: straight in, round to the player's six, or out of the Sun first
 *   attack    → pursuit on the lead point, guns firing when it lines up (a boom-and-zoom pass at full throttle)
 *   breakoff  → the pass is over (too close, or too long): extend away, then come back round
 *   evade     → something is on it: a missile homing (it turns to beam the missile and drops a flare), the player
 *               on its six, or a hit; it jinks, barrel-rolls (a spiral round its line of flight) or breaks hard
 *   screen    → holds a point in front of its capital ship until the player comes close or it is hit
 *
 * Pure: `fighterThink` reads a view of the fight and its own memory, returns an order, and updates the memory.
 * Randomness comes in through `rand` (seeded per ship in the scene, fixed in tests).
 */
import type { V3 } from './nav';
import { add, cross, dist, dot, len, scale, sub, unit } from './nav';
import type { Knobs } from './aiKnobs';
import { AI, bySkill } from './aiKnobs';
import { perpendicular, sunApproach } from './tactics';
import { offAngle } from './weapons';
import { leadDir } from './pilot';

export type FighterMode = 'approach' | 'attack' | 'breakoff' | 'evade' | 'screen';
export type Maneuver = 'straight' | 'sixHunt' | 'sunEntry' | 'pursuit' | 'extend' | 'jink' | 'spiral' | 'breakTurn' | 'beamMissile' | 'hold';

export interface Threat { pos: V3; vel: V3; homingOnMe: boolean }
export interface FighterView {
  t: number;
  pos: V3;
  vel: V3;
  fwd: V3;
  target: { pos: V3; vel: V3; fwd: V3 };
  threats: Threat[];
  hurt: boolean; // took a hit in the last half second
  gunSpeed: number; // its primary gun's shot speed (for the lead)
  skill: number;
  aggression: number;
  sun: V3 | null;
  sunPref: number; // 0..1 doctrine
  screen: V3 | null; // a point to hold (null: free to strike)
  k: number; // world scale
}
export interface FighterMem {
  mode: FighterMode;
  maneuver: Maneuver;
  since: number; // when the mode began
  until: number; // when the current maneuver ends (evade)
  jink: V3;
  jinkAt: number;
  side: 1 | -1;
  entry: V3 | null;
  picked: boolean; // the approach has chosen how to come in
}
export interface FighterOrder { mode: FighterMode; maneuver: Maneuver; wantDir: V3; throttle: number; flare: boolean }

export const newFighterMem = (t = 0): FighterMem => ({ mode: 'approach', maneuver: 'straight', since: t, until: 0, jink: [0, 0, 0], jinkAt: 0, side: 1, entry: null, picked: false });

/** Seconds until a missile reaches the ship at its closing speed (Infinity if it is not closing). */
export function timeToImpact(self: V3, selfVel: V3, m: Threat): number {
  const to = sub(self, m.pos);
  const d = len(to);
  const closing = dot(sub(m.vel, selfVel), unit(to));
  return closing > 1e-6 ? d / closing : Infinity;
}
/** Is the player sitting on its six: close, behind it, and pointing at it? */
export function onSix(v: FighterView, knobs: Knobs = AI): boolean {
  const to = sub(v.target.pos, v.pos);
  if (len(to) > knobs.sixRange * v.k) return false;
  return dot(unit(v.fwd), unit(to)) < -0.2 && offAngle(v.target.pos, v.target.fwd, v.pos) < knobs.sixCone;
}

/** Turn hard across a threat's line: perpendicular to the line to it, on the side nearest where the nose already is. */
export function breakDir(fwd: V3, toThreat: V3, side: 1 | -1): V3 {
  const t = unit(toThreat);
  let p = sub(fwd, scale(t, dot(fwd, t)));
  if (len(p) < 1e-3) p = scale(perpendicular(t), side);
  return unit(p);
}
/** A barrel roll: the nose circles round `base` at `angle`, `rate` radians a second. */
export function spiralDir(base: V3, t: number, rate: number, angle: number): V3 {
  const b = unit(base);
  const a = perpendicular(b);
  const c = unit(cross(b, a));
  const w = t * rate;
  return unit(add(scale(b, Math.cos(angle)), scale(add(scale(a, Math.cos(w)), scale(c, Math.sin(w))), Math.sin(angle))));
}

function pick(rand: () => number, w: Partial<Record<Maneuver, number>>): Maneuver {
  const ks = Object.keys(w) as Maneuver[];
  let x = rand() * ks.reduce((s, q) => s + (w[q] ?? 0), 0);
  for (const q of ks) { x -= w[q] ?? 0; if (x < 0) return q; }
  return ks[ks.length - 1];
}
const setMode = (mem: FighterMem, mode: FighterMode, man: Maneuver, t: number) => { mem.mode = mode; mem.maneuver = man; mem.since = t; mem.picked = false; };

export function fighterThink(v: FighterView, mem: FighterMem, rand: () => number, knobs: Knobs = AI): FighterOrder {
  const k = v.k;
  const toP = sub(v.target.pos, v.pos);
  const d = len(toP);
  const t = v.t;

  // ---- What is on it? ----
  let missile: Threat | null = null;
  let tti = Infinity;
  for (const m of v.threats) {
    if (!m.homingOnMe) continue;
    const x = timeToImpact(v.pos, v.vel, m);
    if (x < tti) { tti = x; missile = m; }
  }
  const missileClose = missile && tti < knobs.missileReact * (0.6 + 0.4 * v.skill);
  const flare = !!missile && dist(missile.pos, v.pos) < knobs.flareRange * k;
  const six = onSix(v, knobs);

  // ---- Transitions ----
  if (missileClose && mem.maneuver !== 'beamMissile') {
    setMode(mem, 'evade', 'beamMissile', t);
    mem.until = t + 1.5;
    mem.side = rand() < 0.5 ? 1 : -1;
  } else if ((six || v.hurt) && mem.mode !== 'evade') {
    setMode(mem, 'evade', pick(rand, { breakTurn: 1 + v.skill, spiral: 1, jink: 1 }), t);
    mem.until = t + bySkill(knobs.evadeTime, rand());
    mem.side = rand() < 0.5 ? 1 : -1;
  }
  if (mem.mode === 'evade' && t >= mem.until && !missileClose) {
    // Shaken off? Break off and come back round; still on its six? Keep maneuvering, with something new.
    if (six) { mem.maneuver = pick(rand, { breakTurn: 1, spiral: 1 + v.skill, jink: 1 }); mem.until = t + bySkill(knobs.evadeTime, rand()); }
    else setMode(mem, 'breakoff', 'extend', t);
  }
  if (mem.mode !== 'evade') {
    if (v.screen && mem.mode !== 'attack' && !v.hurt && dist(v.target.pos, v.screen) > knobs.attackRange * 0.5 * k) {
      if (mem.mode !== 'screen') setMode(mem, 'screen', 'hold', t);
    } else if (mem.mode === 'screen') setMode(mem, 'approach', 'straight', t);

    if (mem.mode === 'approach') {
      if (!mem.picked) {
        mem.picked = true;
        // How to come in: out of the Sun, round to the six, or straight at it.
        const sunW = v.sun ? v.sunPref * 2 : 0;
        mem.maneuver = pick(rand, { sunEntry: sunW, sixHunt: 0.5 + v.skill, straight: 1 });
        mem.entry = mem.maneuver === 'sunEntry' && v.sun ? sunApproach(v.target.pos, v.sun, knobs.attackRange * 0.7 * k) : null;
      }
      if (d < knobs.attackRange * k && mem.maneuver !== 'sunEntry') setMode(mem, 'attack', 'pursuit', t);
      else if (mem.maneuver === 'sunEntry' && (!mem.entry || dist(v.pos, mem.entry) < 25 * k || d < knobs.attackRange * 0.4 * k)) setMode(mem, 'attack', 'pursuit', t);
    } else if (mem.mode === 'attack') {
      if (d < knobs.breakRange * k || t - mem.since > knobs.attackTime * (0.5 + v.aggression)) setMode(mem, 'breakoff', 'extend', t);
    } else if (mem.mode === 'breakoff') {
      if (d > knobs.extendRange * k || t - mem.since > 4) setMode(mem, 'approach', 'straight', t);
    }
  }

  // ---- The maneuver ----
  let wantDir: V3 = unit(toP);
  let throttle = 1;
  const away = scale(unit(toP), -1);
  switch (mem.maneuver) {
    case 'beamMissile':
      wantDir = breakDir(v.fwd, missile ? sub(missile.pos, v.pos) : away, mem.side);
      break;
    case 'breakTurn':
      wantDir = breakDir(v.fwd, toP, mem.side);
      break;
    case 'spiral':
      wantDir = spiralDir(v.fwd, t, knobs.spiralRate, knobs.spiralAngle);
      break;
    case 'jink':
      if (t >= mem.jinkAt) {
        mem.jink = scale(rotateRand(v.fwd, rand), 0.9);
        mem.jinkAt = t + bySkill(knobs.jinkPeriod, rand());
      }
      wantDir = unit(add(v.fwd, mem.jink));
      break;
    case 'extend':
      // Away, and off the line the player would follow it down.
      wantDir = unit(add(add(away, scale(perpendicular(away), 0.5 * mem.side)), [0, 0.25, 0]));
      break;
    case 'sunEntry':
      wantDir = mem.entry ? unit(sub(mem.entry, v.pos)) : unit(toP);
      break;
    case 'sixHunt': {
      // Round to the player's six: aim for a point behind it, curving in.
      const six = sub(v.target.pos, scale(unit(v.target.fwd), knobs.sixDist * k));
      wantDir = unit(sub(six, v.pos));
      if (dist(v.pos, six) < knobs.sixDist * 1.5 * k) setMode(mem, 'attack', 'pursuit', t);
      break;
    }
    case 'pursuit':
      wantDir = leadDir(v.pos, v.vel, v.gunSpeed + len(v.vel), v.target.pos, v.target.vel);
      throttle = d > knobs.breakRange * 4 * k ? 1 : 0.75;
      break;
    case 'hold': {
      const s = v.screen ?? v.pos;
      const off = sub(s, v.pos);
      // Fly to the point, then circle it.
      wantDir = len(off) > 12 * k ? unit(off) : unit(add(cross([0, 1, 0], unit(sub(v.pos, s))), scale(off, 0.05 / k)));
      throttle = len(off) > 12 * k ? 1 : 0.45;
      break;
    }
    default:
      break;
  }
  return { mode: mem.mode, maneuver: mem.maneuver, wantDir, throttle, flare };
}

/** A random direction near `v`'s perpendicular plane, for a jink. */
function rotateRand(v: V3, rand: () => number): V3 {
  const a = perpendicular(v);
  const b = unit(cross(unit(v), a));
  const w = rand() * Math.PI * 2;
  return add(scale(a, Math.cos(w)), scale(b, Math.sin(w)));
}
