/**
 * The ship brain and the fleet step. Each driven ship, every step: find its post (orders.ts), choose a target
 * (targeting.ts), then either keep its post or go and fight, within its stance's leash; then fly (steer.ts) and fire.
 * The same brain flies the player's wings and, later, enemy fleets: nothing here knows which side is the player's.
 */
import type { V3 } from '../nav';
import { add, cross, dist, dot, len, scale, sub, unit } from '../nav';
import { BOLT, COMBAT, STANCES } from './spec';
import { frameOf } from './formation';
import { activeMembers, postOf, updateAnchor } from './orders';
import { avoidBodies, fly, leadPoint, separation } from './steer';
import { chooseTarget, isEnemy, nearestFighter } from './targeting';
import type { Agent, Bolt, FleetWorld, Wing } from './types';
import { sweptHit } from '../weapons';

export interface Intent { want: V3; speed: number; mode: 'post' | 'engage' | 'dock' | 'idle' }

/** What `a` wants to do this step. Sets `a.target`. */
export function think(a: Agent, w: Wing, world: FleetWorld): Intent {
  const spec = COMBAT[a.type];
  const st = STANCES[w.stance];
  const L = world.L;
  if (!w.anchor && w.order.kind !== 'attack') updateAnchor(w, world, 0);
  const post = postOf(a, w, world);
  a.target = chooseTarget(a, w, world, post?.pos ?? null);
  const t = a.target !== null ? world.agents.get(a.target)! : null;

  if (w.order.kind === 'recall' && post) {
    const to = sub(post.pos, a.pos);
    return { want: to, speed: Math.min(spec.speed * L, len(to) * 1.5 + post.speed), mode: 'dock' };
  }

  const ordered = w.order.kind === 'attack' && t && t.id === w.order.target;
  const defending = w.order.kind === 'defend';
  // Leash: how far from its post it may chase. An ordered target, or a threat to the ward, is chased anywhere.
  const leash = spec.range * L * Math.max(st.leash, defending ? 1.5 : 0);
  if (t && (ordered || !post || defending || dist(post.pos, t.pos) < leash)) {
    const to = sub(t.pos, a.pos);
    const d = len(to);
    const standoff = spec.range * L * st.standoff;
    if (a.type === 'destroyer') {
      // The hunter (claude/destroyer-a8ff7d): in flat out, then circle its target at speed with its turrets on it,
      // turning away from the target's nose, so a fixed-gun cruiser cannot bring its guns round.
      if (d > standoff * 1.3) return { want: sub(leadPoint(a.pos, t.pos, t.vel, spec.speed * L), a.pos), speed: spec.speed * L, mode: 'engage' };
      const out = scale(unit(to), -1);
      let tan = unit(cross(out, [0, 1, 0]));
      if (len(tan) < 1e-6) tan = [1, 0, 0];
      if (dot(tan, t.fwd) > 0) tan = scale(tan, -1);
      const r = Math.max(standoff, t.radius + a.radius + L);
      return { want: add(tan, scale(out, (1.5 * (r - d)) / r)), speed: spec.speed * L, mode: 'engage' };
    }
    if (a.type === 'capital') {
      // Close to its standoff, then turn broadside and hold there: its guns are turrets.
      const want = d > standoff ? to : cross(to, [0, 1, 0]);
      return { want, speed: d > standoff ? spec.speed * L : spec.speed * L * 0.25, mode: 'engage' };
    }
    // Attack runs: in at the lead point with the guns on, break away past it, swing round and come in again.
    const inner = Math.max(standoff * 0.35, t.radius + a.radius + L);
    if (a.breaking && d > Math.min(standoff * 1.6, spec.range * L * 0.9) + t.radius) a.breaking = false;
    else if (!a.breaking && d < inner) a.breaking = true;
    const want = a.breaking
      ? add(scale(unit(to), -1), scale(unit(cross(to, [0, 1, 0])), 0.6)) // out and to one side
      : sub(leadPoint(a.pos, t.pos, t.vel, BOLT.speed * L), a.pos);
    return { want, speed: spec.speed * L, mode: 'engage' };
  }
  if (post) {
    const to = sub(post.pos, a.pos);
    const d = len(to);
    if (d < L * 0.6) return { want: post.fwd, speed: post.speed, mode: 'post' };
    return { want: to, speed: Math.min(spec.speed * L, post.speed + d * 1.2), mode: 'post' };
  }
  return { want: a.fwd, speed: 0, mode: 'idle' };
}

function shoot(world: FleetWorld, a: Agent, t: Agent) {
  const L = world.L;
  const aim = sub(leadPoint(a.pos, t.pos, t.vel, BOLT.speed * L), a.pos);
  const dir = unit(aim);
  const nose = add(a.pos, scale(a.fwd, a.radius * 0.6));
  world.bolts.push({ pos: nose, vel: add(scale(dir, BOLT.speed * L), a.vel), age: 0, life: BOLT.life, side: a.side, damage: COMBAT[a.type].damage, from: a.id });
  world.stats.shots++;
}

/** Fire this step, if the stance allows, the target is in range and (for fixed guns) on the nose. */
export function fireStep(a: Agent, w: Wing, world: FleetWorld, dt: number) {
  const spec = COMBAT[a.type];
  a.cooldown -= dt;
  if (a.cooldown > 0) return;
  const st = STANCES[w.stance];
  const t = a.target !== null ? world.agents.get(a.target) : undefined;
  const direct = w.order.kind === 'attack' && t && t.id === w.order.target; // a direct order is obeyed even under hold fire
  if (!st.fire && !direct) return;
  const range = spec.range * world.L;
  let fired = false;
  for (let g = 0; g < spec.guns; g++) {
    // A capital ship's second pair of guns is point defence: the nearest enemy fighter first.
    const pick = a.type === 'capital' && g >= 2 ? nearestFighter(a, world, range * 0.6) ?? t : t;
    if (!pick || !isEnemy(a, pick)) continue;
    const to = sub(pick.pos, a.pos);
    const d = len(to);
    if (d > range) continue;
    if (spec.cone < Math.PI && Math.acos(Math.max(-1, Math.min(1, dot(unit(to), a.fwd)))) > spec.cone) continue;
    shoot(world, a, pick);
    fired = true;
  }
  if (fired) a.cooldown = 1 / spec.rate;
}

export interface Hit { target: Agent; damage: number; from: number; at: V3 }

/**
 * Move every bolt and test it against every ship of the other side. Hits are returned; with `apply` they also take
 * the hit points off here (the tests do; the game lets combat.ts do it, so explosions and kill counts stay there).
 */
export function stepBolts(world: FleetWorld, dt: number, apply: boolean): Hit[] {
  const hits: Hit[] = [];
  for (let i = world.bolts.length - 1; i >= 0; i--) {
    const b: Bolt = world.bolts[i];
    const from = b.pos;
    b.pos = add(b.pos, scale(b.vel, dt));
    b.age += dt;
    let gone = b.age > b.life;
    if (!gone) {
      for (const s of world.agents.values()) {
        if (!s.alive || s.docked || s.side === b.side) continue;
        if (sweptHit(from, b.pos, s.pos, s.radius)) {
          hits.push({ target: s, damage: b.damage, from: b.from, at: b.pos });
          s.hitBy = b.from;
          s.hitAt = world.time;
          world.stats.hits++;
          if (apply) {
            s.hp -= b.damage;
            if (s.hp <= 0) { s.alive = false; if (s.side === 0) world.stats.lost++; else world.stats.kills++; }
          }
          gone = true;
          break;
        }
      }
    }
    if (!gone) for (const body of world.bodies) if (body.size > 0 && dist(b.pos, body.pos) < body.size) { gone = true; break; }
    if (gone) world.bolts.splice(i, 1);
  }
  return hits;
}

/** How a weave bends a heading: a slow sideways swing, different per ship. */
function jink(a: Agent, want: V3, amount: number, time: number): V3 {
  if (amount <= 0) return want;
  const fr = frameOf(want);
  const s = Math.sin(time * 2.3 + a.id * 1.7) * amount * 0.6;
  const u = Math.cos(time * 1.7 + a.id * 0.9) * amount * 0.3;
  return add(unit(want), add(scale(fr.right, s), scale(fr.up, u)));
}

/** One step of every wing: anchors, then each driven ship thinks, flies and fires; then the bolts. */
export function stepFleet(world: FleetWorld, dt: number, apply = true): Hit[] {
  world.time += dt;
  const L = world.L;
  for (const w of world.wings) {
    updateAnchor(w, world, dt);
    const ms = activeMembers(w, world);
    const st = STANCES[w.stance];
    for (const a of ms) {
      if (!a.driven) {
        // Flown by someone else (the player's capital ship): its turrets still choose and fire for themselves.
        if (a.type === 'capital') { a.target = chooseTarget(a, w, world, a.pos); fireStep(a, w, world, dt); }
        continue;
      }
      const it = think(a, w, world);
      let want = it.want;
      if (it.mode === 'dock') {
        const c = w.order.kind === 'recall' ? world.agents.get(w.order.carrier) : undefined;
        if (c && dist(a.pos, c.pos) < c.radius + a.radius * 2) { a.docked = true; a.speed = 0; world.stats.docked++; continue; }
      }
      if (it.mode !== 'dock') want = jink(a, want, it.mode === 'engage' ? st.jink : st.jink * 0.3, world.time);
      want = add(unit(want), scale(separation(a, ms, L * 1.2), 1.5));
      want = avoidBodies(a.pos, want, world.bodies, Math.max(a.speed * 2, L * 4), a.radius + L);
      fly(a, want, it.speed, L, dt, world.bodies);
      fireStep(a, w, world, dt);
    }
  }
  return stepBolts(world, dt, apply);
}
