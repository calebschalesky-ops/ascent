/**
 * Every swarm and every ship at once: blasts, beams, shields soaking, and the point defence and flak that thin a
 * swarm. Pure; the scene turns the events into damage on its ships and into light.
 */
import type { V3 } from '../nav';
import { add, closest, dist, scale, sub, unit } from '../nav';
import type { Side } from './refs';
import { areaFalloff } from './refs';
import type { SwarmRole } from './roles';
import { CONTACT, FLAK_VS_DRONES, PD, ROLES, focusDps } from './roles';
import type { Swarm, SwarmWorld } from './swarm';
import { FLYING, dronesNear, hurtMember, killMember, memberPos, memberVel, rngOf, stepSwarm } from './swarm';

export interface Events {
  /** Damage to ships, for the scene to apply. `ship` 0 is the player. */
  damage: { ship: number; amount: number; by: Side; role: SwarmRole }[];
  blasts: { pos: V3; r: number; side: Side }[];
  /** Beams drawn this step, flat: ax, ay, az, bx, by, bz per beam; `beamSide` holds each one's side. */
  beams: number[];
  beamSide: number[];
  /** Point-defence tracers, flat like beams. */
  tracers: number[];
  flak: { pos: V3; r: number }[];
  /** Where a shield drone took a hit. */
  soaks: V3[];
  deaths: { pos: V3; role: SwarmRole; side: Side }[];
}
export const newEvents = (): Events => ({ damage: [], blasts: [], beams: [], beamSide: [], tracers: [], flak: [], soaks: [], deaths: [] });
function clearEvents(e: Events) {
  e.damage.length = 0; e.blasts.length = 0; e.beams.length = 0; e.beamSide.length = 0; e.tracers.length = 0;
  e.flak.length = 0; e.soaks.length = 0; e.deaths.length = 0;
}

export interface BattleStats {
  pdShots: number;
  pdKills: number;
  flakBursts: number;
  flakKills: number;
  /** Shots, beams and blasts that a shield drone took instead of its ward. */
  soaked: number;
  blasts: number;
}

export interface Battle {
  swarms: Swarm[];
  events: Events;
  /** Fractional shots owed per ship, so a 3-a-second gun fires 3 a second at any frame rate. */
  guns: Map<number, { pd: number; flak: number }>;
  stats: BattleStats;
  rng: () => number;
}

export const makeBattle = (seed = 1): Battle => ({
  swarms: [], events: newEvents(), guns: new Map(),
  stats: { pdShots: 0, pdKills: 0, flakBursts: 0, flakKills: 0, soaked: 0, blasts: 0 }, rng: rngOf(seed),
});

/** Hurt a drone and log its death. */
function hurt(b: Battle, s: Swarm, i: number, amount: number): boolean {
  const p = memberPos(s, i);
  if (!hurtMember(s, i, amount)) return false;
  b.events.deaths.push({ pos: p, role: s.role, side: s.side });
  return true;
}

/**
 * The shield drone that stops a shot flying a→b, if any: the first one along the line, of a side other than the
 * shooter's, whose field the line passes through. Friendly shots pass (the field knows its own side).
 */
export function shieldBlock(b: Battle, a: V3, to: V3, shooter: Side, L: number): { s: Swarm; i: number; t: number } | null {
  const field = ROLES.shield.area * L;
  let best: { s: Swarm; i: number; t: number } | null = null;
  for (const s of b.swarms) {
    if (s.role !== 'shield' || s.side === shooter || s.flying === 0) continue;
    if (closest(a, to, s.centroid).d > s.spread + field) continue;
    for (let i = 0; i < s.size; i++) {
      if (s.state[i] !== FLYING) continue;
      const h = closest(a, to, memberPos(s, i));
      if (h.d <= field && (!best || h.t < best.t)) best = { s, i, t: h.t };
    }
  }
  return best;
}

/** The hostile shield drone whose field `p` is inside, if any. */
function fieldAt(b: Battle, p: V3, side: Side, L: number): { s: Swarm; i: number } | null {
  const field = ROLES.shield.area * L;
  for (const s of b.swarms) {
    if (s.role !== 'shield' || s.side === side || s.flying === 0) continue;
    if (dist(s.centroid, p) > s.spread + field) continue;
    for (let i = 0; i < s.size; i++) {
      if (s.state[i] !== FLYING) continue;
      if (Math.hypot(s.pos[i * 3] - p[0], s.pos[i * 3 + 1] - p[1], s.pos[i * 3 + 2] - p[2]) <= field) return { s, i };
    }
  }
  return null;
}

/** A shield drone takes a hit meant for its ward. */
export function soak(b: Battle, hit: { s: Swarm; i: number }, amount: number) {
  b.events.soaks.push(memberPos(hit.s, hit.i));
  hit.s.stats.work++;
  b.stats.soaked++;
  hurt(b, hit.s, hit.i, amount);
}

/** An explosive drone goes off at `p`: ships and hostile drones in the blast take damage with arsenal's falloff. */
function detonate(b: Battle, w: SwarmWorld, s: Swarm, i: number, p: V3) {
  const spec = ROLES.explosive;
  const r = spec.area * w.L;
  b.events.blasts.push({ pos: p, r, side: s.side });
  b.stats.blasts++;
  s.stats.work++;
  for (const sh of w.ships.values()) {
    if (!sh.alive || sh.side === s.side) continue;
    const d = Math.max(0, dist(p, sh.pos) - sh.radius);
    const f = areaFalloff(d, r);
    if (f > 0) { b.events.damage.push({ ship: sh.id, amount: spec.damage * f, by: s.side, role: 'explosive' }); s.stats.damage += spec.damage * f; }
  }
  for (const t of dronesNear(b.swarms, s.side, p, r)) hurt(b, t.s, t.i, spec.damage * areaFalloff(t.d, r));
  // The drone itself is spent: its job, not a loss.
  killMember(s, i);
  s.stats.lost--;
  s.stats.spent++;
}

function explosives(b: Battle, w: SwarmWorld, s: Swarm, dt: number) {
  const L = w.L;
  const reach = CONTACT * L;
  for (let i = 0; i < s.size; i++) {
    if (s.state[i] !== FLYING) continue;
    let p = memberPos(s, i);
    // A hull: the ship it dives on, or any hostile one it runs into. Swept over this step's flight: at 30 frames a
    // second a diving drone covers more than a capital ship's radius in one frame and would pass straight through.
    const v = memberVel(s, i);
    const from: V3 = [p[0] - v[0] * dt, p[1] - v[1] * dt, p[2] - v[2] * dt];
    let hit = false;
    for (const sh of w.ships.values()) {
      if (!sh.alive || sh.side === s.side) continue;
      // Relative to the ship, which also moved this step.
      const shFrom: V3 = [sh.pos[0] - sh.vel[0] * dt, sh.pos[1] - sh.vel[1] * dt, sh.pos[2] - sh.vel[2] * dt];
      const rel = closest(sub(from, shFrom), sub(p, sh.pos), [0, 0, 0]);
      if (rel.d <= sh.radius + reach) { hit = true; p = add(from, scale(sub(p, from), rel.t)); break; }
    }
    // A hostile shield's field stops it where it is: the shield drone takes the blast.
    if (!hit) {
      const fld = fieldAt(b, p, s.side, L);
      if (fld) { b.events.soaks.push(memberPos(fld.s, fld.i)); fld.s.stats.work++; b.stats.soaked++; hit = true; }
    }
    // Any other hostile drone it touches (an escort is sent straight at them).
    if (!hit && dronesNear(b.swarms, s.side, p, reach).length) hit = true;
    if (hit) detonate(b, w, s, i, p);
  }
}

function lasers(b: Battle, w: SwarmWorld, s: Swarm, dt: number) {
  const L = w.L;
  const spec = ROLES.attack;
  const range = spec.range * L;
  const tgt = s.target !== null && s.order.kind === 'attack' ? w.ships.get(s.target) : undefined;
  if (tgt && tgt.alive && s.aim) {
    // Focus: every member in range lays its beam on the one aim point; a hostile shield drone in the way takes it.
    let on = 0;
    for (let i = 0; i < s.size; i++) {
      if (s.state[i] !== FLYING) continue;
      const p = memberPos(s, i);
      if (dist(p, s.aim) > range) continue;
      const blk = shieldBlock(b, p, s.aim, s.side, L);
      const end = blk ? memberPos(blk.s, blk.i) : s.aim;
      b.events.beams.push(p[0], p[1], p[2], end[0], end[1], end[2]);
      b.events.beamSide.push(s.side);
      if (blk) soak(b, blk, spec.damage * dt);
      else on++;
    }
    if (on) {
      const dmg = focusDps(on) * dt;
      b.events.damage.push({ ship: tgt.id, amount: dmg, by: s.side, role: 'attack' });
      s.stats.damage += dmg;
      s.stats.work += on * dt;
    }
    return;
  }
  // Escorting: each member burns the nearest hostile drone in range (point defence with lasers).
  if (s.order.kind !== 'defend' && s.order.kind !== 'follow') return;
  const threats = dronesNear(b.swarms, s.side, s.centroid, range + s.spread);
  if (!threats.length) return;
  for (let i = 0; i < s.size; i++) {
    if (s.state[i] !== FLYING) continue;
    const p = memberPos(s, i);
    let best: { s: Swarm; i: number } | null = null;
    let bd = range;
    for (const t of threats) {
      if (t.s.state[t.i] !== FLYING) continue;
      const d = dist(p, memberPos(t.s, t.i));
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) continue;
    const q = memberPos(best.s, best.i);
    b.events.beams.push(p[0], p[1], p[2], q[0], q[1], q[2]);
    b.events.beamSide.push(s.side);
    hurt(b, best.s, best.i, spec.damage * dt);
    s.stats.work += dt;
  }
}

/** The nearest hostile drone to a ship between `min` and `range`. */
function nearestDrone(b: Battle, side: Side, p: V3, range: number, min = 0): { s: Swarm; i: number; d: number } | null {
  let best: { s: Swarm; i: number; d: number } | null = null;
  for (const s of b.swarms) {
    if (s.side === side || s.flying === 0) continue;
    if (dist(s.centroid, p) - s.spread > range) continue;
    for (let i = 0; i < s.size; i++) {
      if (s.state[i] !== FLYING) continue;
      const d = Math.hypot(s.pos[i * 3] - p[0], s.pos[i * 3 + 1] - p[1], s.pos[i * 3 + 2] - p[2]);
      if (d <= range && d >= min && (!best || d < best.d)) best = { s, i, d };
    }
  }
  return best;
}

/** Point defence and flak: every armed ship shoots at the nearest hostile drone in reach. */
function defence(b: Battle, w: SwarmWorld, dt: number) {
  const L = w.L;
  const r = b.rng;
  for (const sh of w.ships.values()) {
    if (!sh.alive || (sh.pd <= 0 && sh.flak <= 0)) continue;
    let g = b.guns.get(sh.id);
    if (!g) { g = { pd: 0, flak: 0 }; b.guns.set(sh.id, g); }
    g.pd = Math.min(sh.pd, g.pd + sh.pd * PD.rate * dt);
    g.flak = Math.min(sh.flak, g.flak + sh.flak * FLAK_VS_DRONES.rate * dt);
    while (g.pd >= 1) {
      const t = nearestDrone(b, sh.side, sh.pos, PD.range * L);
      if (!t) { g.pd = Math.min(g.pd, 1); break; }
      g.pd -= 1;
      b.stats.pdShots++;
      const q = memberPos(t.s, t.i);
      b.events.tracers.push(sh.pos[0], sh.pos[1], sh.pos[2], q[0], q[1], q[2]);
      if (r() < PD.chance && hurt(b, t.s, t.i, PD.damage)) b.stats.pdKills++;
    }
    while (g.flak >= 1) {
      const t = nearestDrone(b, sh.side, sh.pos, FLAK_VS_DRONES.range * L, sh.radius + FLAK_VS_DRONES.arm * L);
      if (!t) { g.flak = Math.min(g.flak, 1); break; }
      g.flak -= 1;
      b.stats.flakBursts++;
      // The shell bursts near where it aimed, scattered with range.
      const miss = t.d * FLAK_VS_DRONES.scatter * Math.sqrt(r());
      const at = add(memberPos(t.s, t.i), scale(unit([r() - 0.5, r() - 0.5, r() - 0.5]), miss));
      const area = FLAK_VS_DRONES.area * L;
      b.events.flak.push({ pos: at, r: area });
      for (const d of dronesNear(b.swarms, sh.side, at, area)) if (hurt(b, d.s, d.i, FLAK_VS_DRONES.damage * areaFalloff(d.d, area))) b.stats.flakKills++;
    }
  }
}

/** One step of the whole battle: move every swarm, then blasts, beams and defensive fire. */
export function stepBattle(b: Battle, w: SwarmWorld, dt: number) {
  clearEvents(b.events);
  for (const s of b.swarms) stepSwarm(s, w, b.swarms, dt);
  for (const s of b.swarms) {
    if (s.flying === 0) continue;
    if (s.role === 'explosive') explosives(b, w, s, dt);
    else if (s.role === 'attack') lasers(b, w, s, dt);
  }
  defence(b, w, dt);
}
