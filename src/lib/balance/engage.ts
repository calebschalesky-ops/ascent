/**
 * One shooter against one ship, headless. Reuses the game's own rules rather than copies of them: the weapon numbers
 * and the missile, dodge, lead and hit maths from lib/weapons.ts, the ship table from lib/shipTypes.ts, and the patrol
 * ring from lib/nations.ts. Only the pilot is modelled: a parked shooter who leads every bolt (as the lead indicator
 * shows) with a Gaussian aiming error, and who holds the reticle on the target long enough to lock missiles.
 *
 * Left out (say so when quoting it): other ships nearby, the shooter moving, the reticle-versus-gun offset, the
 * lock's 3° cone (the lock is taken as held once LOCK.time has passed), and anything the target does but patrol and
 * dodge.
 */
import type { DestGeo, V3 } from '../nav';
import { add, destGeometry, dist, scale, sub, unit } from '../nav';
import type { NationId } from '../nations';
import { patrolPos } from '../nations';
import { craftStats } from '../craftStats';
import type { ShipType } from '../shipTypes';
import { SHIP_SPECS, bodyRadius } from '../shipTypes';
import type { Missile, WeaponId } from '../weapons';
import { DODGE, LASER, LOCK, MISSILE, dodgeDir, intercept, stepMissile, sweptHit, wantsDodge } from '../weapons';
import type { Rng } from './rng';
import { gauss } from './rng';

/** The player ship's length in world units (SHIP × SHIP_MODEL_LENGTH), as measured by the ship-types thread. */
export const PLAYER_LENGTH = 0.3708;

export interface EngageOpts {
  range: number; // units between shooter and target at the start
  aimError: number; // radians, 1σ on each axis across the line of fire
  homeSize: number; // radius of the body the target patrols (sets its ring and lap speed)
  maxTime: number; // seconds before the run is called off
  dodge?: number; // override the dodge chance (for what-if sweeps)
  nation?: NationId; // the target's race: its loadout adds hit points and dodge, as in the game (craftStats)
  missileTurn?: number; // override MISSILE.turn (what-if); the game's stepMissile reads MISSILE.turn, so this swaps it for the run
  dt?: number;
}

/**
 * `shots` counts only shots that resolved: a hit, or a miss (it has flown past its closest approach to the target, or
 * run out of life). Shots still closing when the target dies are left out, so the hit rate is not diluted by them.
 */
export interface EngageResult { killed: boolean; time: number; shots: number; fired: number; hits: number; dodges: number; damage: number }

export const DEG = Math.PI / 180;
/** Mars as the game lays it out (its radius from destGeometry, so a rescale carries through), 60 units out, 0.5° aim. */
export const MARS_SIZE = destGeometry().find((g) => g.id === 'mars')!.size;
export const DEFAULT_ENGAGE: EngageOpts = { range: 60, aimError: 0.5 * DEG, homeSize: MARS_SIZE, maxTime: 60 };

/** Two unit vectors across `d`, for the aiming error. */
function across(d: V3): [V3, V3] {
  const ref: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const a = unit([d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]]);
  const b: V3 = [d[1] * a[2] - d[2] * a[1], d[2] * a[0] - d[0] * a[2], d[0] * a[1] - d[1] * a[0]];
  return [a, b];
}
const jitter = (d: V3, err: number, r: Rng): V3 => {
  const [a, b] = across(d);
  return unit(add(d, add(scale(a, gauss(r) * err), scale(b, gauss(r) * err))));
};

export function engage(type: ShipType, weapon: WeaponId, r: Rng, o: EngageOpts = DEFAULT_ENGAGE): EngageResult {
  const dt = o.dt ?? 1 / 60;
  const spec = SHIP_SPECS[type];
  const body = bodyRadius(type, PLAYER_LENGTH);
  const home: DestGeo = { id: 'mars', pos: [0, 0, 0], size: o.homeSize, arrive: 0, stop: 0, clear: 0 };
  const phase = r() * 1000;
  const ring = (t: number) => patrolPos(home, 0, 4, phase + t, type);

  // The shooter parks outside the ring, `range` from where the target starts, a little above it.
  const p0 = ring(0);
  const out = unit(add(sub(p0, home.pos), [0, 0.3, 0]));
  const shooter = add(p0, scale(out, o.range));

  const race = o.nation ? craftStats(o.nation, type) : { hp: spec.hp, dodge: spec.dodge };
  let hp = race.hp;
  let offset: V3 = [0, 0, 0];
  let dodgeVel: V3 = [0, 0, 0];
  let dodgeT = 0;
  let pos = p0;
  let vel: V3 = [0, 0, 0];
  const bolts: { pos: V3; vel: V3; age: number; near: number; done: boolean }[] = [];
  const missiles: (Missile & { rolled: boolean; near: number; done: boolean })[] = [];
  let cooldown = weapon === 'missile' ? LOCK.time : 0; // a missile needs the lock first
  const res: EngageResult = { killed: false, time: 0, shots: 0, fired: 0, hits: 0, dodges: 0, damage: 0 };

  for (let t = 0; t < o.maxTime; t += dt) {
    res.time = t;
    // The target: its patrol ring plus any dodge, as combat.ts moves it.
    if (dodgeT > 0) { offset = add(offset, scale(dodgeVel, dt)); dodgeT -= dt; } else offset = scale(offset, Math.exp(-dt * 0.6));
    const next = add(ring(t), offset);
    if (t > 0) vel = scale(sub(next, pos), 1 / dt);
    pos = next;

    cooldown -= dt;
    if (cooldown <= 0) {
      if (weapon === 'laser') {
        const hit = intercept(shooter, LASER.speed, pos, vel);
        const dir = jitter(unit(sub(hit ? hit.point : pos, shooter)), o.aimError, r);
        bolts.push({ pos: shooter, vel: scale(dir, LASER.speed), age: 0, near: Infinity, done: false });
        cooldown += 1 / LASER.rate;
      } else {
        const dir = jitter(unit(sub(pos, shooter)), o.aimError, r);
        const sp = 8; // a parked ship launches at the game's minimum
        missiles.push({ pos: shooter, vel: scale(dir, sp), speed: sp, age: 0, target: 1, homing: true, rolled: false, near: Infinity, done: false });
        cooldown += 1 / MISSILE.rate;
      }
      res.fired++;
    }

    // A shot has missed once it starts to draw away from the target (counted once).
    const passed = (x: { near: number; done: boolean }, at: V3) => {
      const d = dist(at, pos);
      const gone = !x.done && d > x.near + 1e-6;
      x.near = Math.min(x.near, d);
      if (gone) x.done = true;
      return gone;
    };
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      const from = b.pos;
      b.pos = add(b.pos, scale(b.vel, dt));
      b.age += dt;
      if (sweptHit(from, b.pos, pos, LASER.radius + body)) { if (!b.done) res.shots++; hp -= LASER.damage; res.hits++; res.damage += LASER.damage; bolts.splice(i, 1); continue; }
      if (passed(b, b.pos)) res.shots++;
      if (b.age > LASER.life) { if (!b.done) res.shots++; bolts.splice(i, 1); }
    }
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      const [a, b] = stepMissile(m, pos, dt, MISSILE.speed + 40);
      if (!m.rolled && !m.homing && dist(m.pos, pos) < MISSILE.homingOff) {
        m.rolled = true;
        if (wantsDodge(m, pos, r(), o.dodge ?? race.dodge)) { dodgeVel = scale(dodgeDir(m.vel, r() - 0.5), DODGE.speed); dodgeT = DODGE.time; res.dodges++; }
      }
      if (sweptHit(a, b, pos, MISSILE.radius + body)) { if (!m.done) res.shots++; hp -= MISSILE.damage; res.hits++; res.damage += MISSILE.damage; missiles.splice(i, 1); continue; }
      if (!m.homing && passed(m, m.pos)) res.shots++;
      if (m.age > MISSILE.life) { if (!m.done) res.shots++; missiles.splice(i, 1); }
    }
    if (hp <= 0) { res.killed = true; break; }
  }
  return res;
}

export interface EngageStats {
  type: ShipType; weapon: WeaponId; runs: number; killRate: number;
  ttkMean: number; ttkP90: number; hitRate: number; dps: number; dodgeRate: number;
}

/** Many runs of one matchup: kill rate, time to kill (mean and 90th percentile, kills only), hit rate, damage per second. */
export function engageMany(type: ShipType, weapon: WeaponId, runs: number, r: Rng, o: EngageOpts = DEFAULT_ENGAGE): EngageStats {
  const ttk: number[] = [];
  let shots = 0, hits = 0, dmg = 0, time = 0, dodges = 0, kills = 0;
  for (let i = 0; i < runs; i++) {
    const e = engage(type, weapon, r, o);
    shots += e.shots; hits += e.hits; dmg += e.damage; time += e.time; dodges += e.dodges;
    if (e.killed) { kills++; ttk.push(e.time); }
  }
  ttk.sort((a, b) => a - b);
  return {
    type, weapon, runs, killRate: kills / runs,
    ttkMean: ttk.length ? ttk.reduce((a, b) => a + b, 0) / ttk.length : Infinity,
    ttkP90: ttk.length ? ttk[Math.min(ttk.length - 1, Math.floor(ttk.length * 0.9))] : Infinity,
    hitRate: shots ? hits / shots : 0, dps: time ? dmg / time : 0, dodgeRate: weapon === 'missile' && shots ? Math.min(1, dodges / shots) : 0,
  };
}
