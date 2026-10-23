/**
 * Tactics shared by every enemy ship: line of sight and cover, standoff ranges, weapon arcs, the fleet's plan
 * (flanks, pincer, the fighter screen, focus fire), approaches out of the Sun, and not flying into things.
 * Pure maths, unit-tested; the scene (components/enemyAI.ts) only moves and draws.
 *
 * The environment is a list of `Occluder`s: bodies (planets, moons, the Sun), ships, and, once the stations and
 * asteroid branches merge, stations and asteroids. Anything with a centre and a radius can block a shot or hide a ship.
 */
import type { V3 } from './nav';
import { add, closest, cross, dist, dot, len, scale, sub, unit } from './nav';
import type { Munition } from './munitions';
import type { Knobs } from './aiKnobs';
import { AI } from './aiKnobs';
import type { ShipClass } from './enemyArms';

/**
 * Something that blocks a line of fire. `kind` 'station' and 'asteroid' have no source on this branch yet (stand-ins
 * for claude/stations-moons-629924 and an asteroid field): feed them in through combat's `extraOccluders`.
 */
export interface Occluder { pos: V3; r: number; kind: 'body' | 'station' | 'asteroid' | 'ship'; id?: number }

/** The first occluder that the segment a→b passes through (not one that contains either end), or null. */
export function blockedBy(a: V3, b: V3, occ: Occluder[], ignore: (o: Occluder) => boolean = () => false): Occluder | null {
  let best: Occluder | null = null;
  let bt = Infinity;
  for (const o of occ) {
    if (ignore(o) || dist(a, o.pos) <= o.r || dist(b, o.pos) <= o.r) continue;
    const h = closest(a, b, o.pos);
    if (h.d < o.r && h.t > 0 && h.t < 1 && h.t < bt) { best = o; bt = h.t; }
  }
  return best;
}
/** Can a shot from `from` reach `to`? Nothing in between but the shooter itself and the target. */
export const clearShot = (from: V3, to: V3, occ: Occluder[], selfId?: number, targetId?: number) =>
  blockedBy(from, to, occ, (o) => o.id !== undefined && (o.id === selfId || o.id === targetId)) === null;

// ---------- Ranges ----------
/** How far a munition is worth firing: a share of its reach (bolts scatter at range; a beam is exact). */
export function effectiveRange(m: Munition, knobs: Knobs = AI): number {
  const reach = m.delivery === 'bolt' || m.delivery === 'burst' ? m.speed * m.life : m.range;
  return reach * knobs.effRange[m.delivery];
}
export const reachOf = (ms: Munition[], knobs: Knobs = AI) => ms.reduce((r, m) => Math.max(r, effectiveRange(m, knobs)), 0);

/**
 * Where a warship holds: the reach of its weapons, or, when it outranges the player, just outside the player's reach
 * (it kites). Never closer than its class's minimum, never past the maximum. `k` is the world scale.
 */
export function standoffRange(cls: Exclude<ShipClass, 'fighter'>, own: Munition[], player: Munition[], temper = 1, k = 1, knobs: Knobs = AI): number {
  const mine = reachOf(own, knobs);
  const theirs = reachOf(player, knobs);
  const lo = knobs.minStandoff[cls] * k;
  const hi = knobs.maxStandoff * k;
  let r = mine * 0.85;
  if (mine > theirs * knobs.kite * 1.05) r = Math.min(mine * 0.9, theirs * knobs.kite);
  return Math.max(lo, Math.min(hi, r * temper));
}

// ---------- Arcs ----------
export type Arc = 'nose' | 'forward' | 'broadside' | 'turret';
/** The destroyer's three turrets bear all round (claude/destroyer-a8ff7d). */
export const ARC: Record<ShipClass, Arc> = { fighter: 'nose', cruiser: 'forward', capital: 'broadside', destroyer: 'turret' };
const angleBetween = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));
/**
 * Do a ship's guns bear on a direction? Fighters' guns point down the nose (the fire cone is checked apart);
 * cruisers' turrets cover the forward hemisphere; capital ships' batteries fire to either side.
 */
export function bears(arc: Arc, fwd: V3, to: V3, noseCone = 0.09): boolean {
  const a = angleBetween(fwd, to);
  if (arc === 'nose') return a <= noseCone;
  if (arc === 'forward') return a <= 1.2;
  if (arc === 'turret') return true;
  return Math.abs(a - Math.PI / 2) <= 1.0;
}
/** The heading that puts a target square on the beam: perpendicular to the line to it, nearest the current heading. */
export function broadsideFace(fwd: V3, to: V3): V3 {
  const t = unit(to);
  const p = sub(fwd, scale(t, dot(fwd, t)));
  if (len(p) > 1e-6) return unit(p);
  return perpendicular(t);
}
export function perpendicular(v: V3): V3 {
  const u = unit(v);
  const ref: V3 = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return unit(cross(u, ref));
}
/** Rotate `v` round the unit `axis` by `a` radians (Rodrigues). */
export function rotateAbout(v: V3, axis: V3, a: number): V3 {
  const k = unit(axis);
  const c = Math.cos(a), s = Math.sin(a);
  return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
}

/**
 * A velocity that circles `centre` at `radius`: along the tangent (sense ±1), corrected in or out toward the ring.
 * A capital ship flying this stays broadside on to the player while it moves, which spoils the player's lead.
 */
export function orbitVel(pos: V3, centre: V3, radius: number, speed: number, sense: 1 | -1, up: V3 = [0, 1, 0]): V3 {
  const r = sub(pos, centre);
  const d = len(r) || 1;
  const radial = scale(r, 1 / d);
  let tan = cross(up, radial);
  if (len(tan) < 1e-6) tan = perpendicular(radial);
  const correct = Math.max(-1, Math.min(1, (radius - d) / Math.max(radius * 0.3, 1e-6)));
  return scale(unit(add(scale(unit(tan), sense), scale(radial, correct * 1.2))), speed);
}

// ---------- Cover ----------
export interface CoverPick { point: V3; behind: Occluder; score: number }
/**
 * The best place to hide from the player: behind an occluder on the player's line, far enough back to clear it, near
 * the ship's standoff range and not far to go. Ships smaller than the hider still count (they hide its centre line,
 * and the player's shots meet them first). Null when nothing is close enough to be worth it.
 */
export function bestCover(self: V3, selfR: number, selfId: number | undefined, player: V3, occ: Occluder[], standoff: number, maxTravel: number): CoverPick | null {
  let best: CoverPick | null = null;
  for (const o of occ) {
    if (o.id !== undefined && o.id === selfId) continue;
    const toO = sub(o.pos, player);
    const dO = len(toO);
    if (dO < 1e-6 || dO <= o.r) continue;
    const back = Math.max(standoff, dO + o.r + selfR * 2);
    const point = add(player, scale(unit(toO), back));
    const travel = dist(self, point);
    if (travel > maxTravel) continue;
    if (occ.some((b) => b.kind !== 'ship' && dist(point, b.pos) < b.r + selfR * 2)) continue; // not inside anything
    // Bigger cover is worth more; distance to go and distance off the standoff ring cost.
    const size = Math.min(1, o.r / Math.max(selfR, 1e-6));
    const score = size * 2 + (o.kind === 'ship' ? 0 : 0.5) - travel / maxTravel - Math.abs(back - standoff) / Math.max(standoff, 1e-6);
    if (!best || score > best.score) best = { point, behind: o, score };
  }
  return best;
}
/** Is `ship` hidden from `player` by something (other than itself)? */
export const hidden = (ship: V3, shipId: number | undefined, player: V3, occ: Occluder[]) =>
  blockedBy(player, ship, occ, (o) => o.id !== undefined && o.id === shipId) !== null;

// ---------- The Sun ----------
/** A point `d` from the player on the Sun's side: come at the player from there and the player looks into the Sun. */
export const sunApproach = (player: V3, sun: V3, d: number): V3 => add(player, scale(unit(sub(sun, player)), d));
/** Is `target`, seen from `eye`, within `cone` of the Sun's disc? */
export function inGlare(eye: V3, target: V3, sun: V3, sunR: number, cone: number): boolean {
  const ds = dist(eye, sun);
  if (ds <= sunR) return true;
  return angleBetween(sub(target, eye), sub(sun, eye)) <= Math.asin(Math.min(1, sunR / ds)) + cone;
}

// ---------- Not flying into things ----------
/**
 * A velocity that keeps clear of every solid occluder (bodies, stations, asteroids) over the next `lookahead`
 * seconds: if the straight path would come within `margin` of a surface, it bends away, keeping its speed.
 */
export function avoidBodies(pos: V3, vel: V3, occ: Occluder[], margin: number, lookahead: number): V3 {
  const speed = len(vel);
  if (speed < 1e-9) return vel;
  let v = vel;
  for (const o of occ) {
    if (o.kind === 'ship') continue;
    const rel = sub(o.pos, pos);
    const reach = o.r + margin;
    const d0 = len(rel);
    if (d0 < reach) { v = add(v, scale(unit(scale(rel, -1)), speed * 2 * (1 - d0 / reach) + speed * 0.5)); continue; }
    const t = Math.max(0, Math.min(lookahead, dot(rel, v) / (speed * speed)));
    if (t <= 0) continue;
    const p = add(pos, scale(v, t));
    const gap = dist(p, o.pos) - reach;
    if (gap >= 0) continue;
    let away = sub(p, o.pos);
    if (len(away) < 1e-6) away = perpendicular(v);
    v = add(v, scale(unit(away), speed * Math.min(2.5, (-gap / reach) * 3 + 0.3)));
  }
  return scale(unit(v), speed);
}

// ---------- The fleet ----------
export type Role = 'line' | 'flank' | 'screen' | 'strike' | 'hunt';
export interface FleetShip { id: number; cls: ShipClass; pos: V3; standoff: number }
export interface FleetSlot { role: Role; slot: V3 | null }

/**
 * Where each ship of an engaged nation goes. The fleet's line runs from the player toward `anchor` (the capital ship,
 * or the nation's home when it has none: something that does not move with the ships being placed, or a lone
 * cruiser would chase its own flank slot round the player), swung toward the Sun by `sunPull`. Capital ships hold the line at their standoff; cruisers take flank slots either side of it,
 * a pincer; fighters screen in front of the capital ship until the player comes close to it, then all of them strike.
 */
export function fleetPlan(ships: FleetShip[], player: V3, anchor: V3, sun: V3 | null, sunPull: number, k = 1, knobs: Knobs = AI): Map<number, FleetSlot> {
  const out = new Map<number, FleetSlot>();
  if (!ships.length) return out;
  let line = unit(sub(anchor, player));
  if (len(line) < 1e-6) line = [1, 0, 0];
  if (sun && sunPull > 0) line = unit(add(scale(line, 1 - sunPull), scale(unit(sub(sun, player)), sunPull)));
  const lateral = perpendicular(line);
  const up = unit(cross(lateral, line));
  const capital = ships.find((s) => s.cls === 'capital');

  let flank = 0;
  for (const s of ships) {
    if (s.cls === 'capital') out.set(s.id, { role: 'line', slot: add(player, scale(line, s.standoff)) });
    // A destroyer hunts on its own: no slot, it circles the player (warshipAI).
    else if (s.cls === 'destroyer') out.set(s.id, { role: 'hunt', slot: null });
    else if (s.cls === 'cruiser') {
      const side = flank % 2 === 0 ? 1 : -1;
      const tier = Math.floor(flank / 2);
      const dir = rotateAbout(rotateAbout(line, up, side * knobs.pincer), lateral, tier * 0.5 * (tier % 2 ? 1 : -1));
      out.set(s.id, { role: 'flank', slot: add(player, scale(dir, s.standoff)) });
      flank++;
    }
  }
  const fighters = ships.filter((s) => s.cls === 'fighter');
  const screening = capital && dist(player, capital.pos) > knobs.screenRadius * k ? Math.ceil(fighters.length / 2) : 0;
  fighters.forEach((s, i) => {
    if (i < screening && capital) {
      const ahead = unit(sub(player, capital.pos));
      const spread = (i - (screening - 1) / 2) * knobs.screenDist * 0.6 * k;
      out.set(s.id, { role: 'screen', slot: add(add(capital.pos, scale(ahead, knobs.screenDist * k)), scale(perpendicular(ahead), spread)) });
    } else out.set(s.id, { role: 'strike', slot: null });
  });
  return out;
}

/** Focus fire: of the candidates, the one the fleet should all shoot. Threat first, then the most hurt, then nearest. */
export interface Candidate { id: number; pos: V3; hullFrac: number; threat: number }
export function focusTarget(cands: Candidate[], fleetCentre: V3, scaleDist: number): number | null {
  let best: Candidate | null = null;
  let bs = -Infinity;
  for (const c of cands) {
    const s = c.threat * 2 + (1 - c.hullFrac) - dist(c.pos, fleetCentre) / Math.max(scaleDist, 1e-6);
    if (s > bs) { bs = s; best = c; }
  }
  return best ? best.id : null;
}
