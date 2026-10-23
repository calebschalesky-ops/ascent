/**
 * How a station fights. Pure and tested; components/stationDefense.ts draws it and lands its shots.
 *
 * - **Sections** hold the structure and the shields: arsenal's `Defence` (makeDefence / applyHit / regenerate), with the
 *   shield scaled up for a structure this size. A section at or below half its structure is suppressed (conquest's
 *   rule): every mount on it stops working, and conquest may capture it.
 * - **Mounts** are the fitted hardpoints. A gun can be shot off; a destroyed mount is rebuilt only while the drydock works.
 * - **Alert** climbs calm → wary → engaged → siege, and drops back after a quiet spell; fallen is the end.
 * - **Fire**: each working gun picks a target it can see (not behind its own plating, not through the planet), leads
 *   it, and fires its arsenal munition at a station's rate. Point defence takes missiles first.
 */
import type { V3 } from '../nav';
import { add, closest, dist, dot, len, scale, sub, unit } from '../nav';
import type { Munition, MunitionId } from '../munitions';
import { MUNITIONS } from '../munitions';
import type { Defence, HitResult } from '../shields';
import { SHIELDS, applyHit, makeDefence, regenerate, shieldFrac } from '../shields';
import { intercept } from '../weapons';
import type { Hardpoint } from './mounts';
import type { Tier } from './civic';
import { TIERS, gunOf } from './civic';
import type { Boon, StationProfile } from './profiles';

export type Alert = 'calm' | 'wary' | 'engaged' | 'siege' | 'fallen';
export const ALERTS: Alert[] = ['calm', 'wary', 'engaged', 'siege', 'fallen'];

export type ContactKind = 'player' | 'fighter' | 'cruiser' | 'capital' | 'missile';
/**
 * Something the station's sensors see. `hostile`: the caller's word that it belongs to someone the station may fight.
 * `war`: its house is weapons free on it (a blood enemy, or a challenged ship that stayed; diplomacy/territory.ts), so
 * the station fights it on sight instead of waiting to be shot first (scale-jump-danger D2).
 */
export interface Contact { id: string; kind: ContactKind; pos: V3; vel: V3; r: number; hostile: boolean; war?: boolean }

/** FIRST PASS numbers. Distances in scene units (one ship length is 0.371). */
export const DEFENCE = {
  sensor: 1500, // contacts inside this are tracked (× 1.25 with Selene's night watch)
  shieldCap: 8, // a section's shield capacity against the same shield on a ship
  shieldRegen: 3, // and its regeneration
  gunRate: 0.25, // a station gun fires at this share of the munition's rate: it has many guns, not fast ones
  beamTick: 0.5, // a beam (continuous) is fired as ticks this many seconds apart
  accuracy: 0.004, // radians of scatter on each shot (half a unit at 130 units)
  provoke: 1, // hits from an attacker before the station fights it (× 2 with Aphrodite's charm)
  quiet: 90, // seconds with no new provocation before it stands down
  siegeHull: 0.75, // any section below this share of structure, or any section's shield down, is a siege
  suppressAt: 0.5, // conquest's SITE_RULES.suppressAt: a section at or below this stops working
  repairDelay: 45, // conquest: seconds after the last hit before structure mends
  repair: 0.01, // conquest: share of structure mended a second
  rebuild: 240, // conquest: seconds to rebuild a destroyed mount, while the drydock works
  mountHp: { turret: 150, pointDefence: 80 } as Partial<Record<Hardpoint['kind'], number>>,
  mountHpOther: 200,
  /** Threat weights for choosing a target. */
  threat: { capital: 3, cruiser: 2, player: 2, fighter: 1, missile: 0.5 } as Record<ContactKind, number>,
};

export interface SectionState { def: Defence; sinceHit: number }
export interface MountState { hp: number; maxHp: number; cd: number; down: number; munition: MunitionId | null }
export interface StationSys {
  id: string;
  home: StationProfile['home'];
  tier: Tier;
  alert: Alert;
  provoked: Record<string, number>; // attacker id → hits taken from it
  quiet: number; // seconds since the last provocation
  struck: boolean; // has been hit since it last stood down (Ares's avenger)
  sections: Record<string, SectionState>;
  mounts: Record<string, MountState>;
  stats: { shots: number; hitsTaken: number; damageTaken: number; mountsLost: number };
}

const GUNS = new Set<Hardpoint['kind']>(['turret', 'pointDefence']);

/** A fresh station, its fitted mounts armed with its world's guns. */
export function newStation(id: string, profile: StationProfile, fit: Hardpoint[], tier: Tier): StationSys {
  const spec = TIERS[tier];
  const sections: Record<string, SectionState> = {};
  for (const s of new Set(fit.map((m) => m.section))) {
    const def = makeDefence(SHIELDS[profile.shield], spec.hull, spec.mk);
    def.maxShield *= DEFENCE.shieldCap;
    def.shield = def.shield.map(() => def.maxShield);
    def.regen *= DEFENCE.shieldRegen;
    sections[s] = { def, sinceHit: 99 };
  }
  const mounts: Record<string, MountState> = {};
  const turrets = fit.filter((m) => m.kind === 'turret');
  for (const m of fit) {
    const hp = DEFENCE.mountHp[m.kind] ?? DEFENCE.mountHpOther;
    const munition = GUNS.has(m.kind) ? gunOf(profile, m, turrets.indexOf(m), tier) : m.kind === 'minelayer' ? 'mine' : null;
    mounts[m.id] = { hp, maxHp: hp, cd: 0, down: 0, munition };
  }
  return { id, home: profile.home, tier, alert: 'calm', provoked: {}, quiet: 0, struck: false, sections, mounts, stats: { shots: 0, hitsTaken: 0, damageTaken: 0, mountsLost: 0 } };
}

export const suppressed = (s: SectionState) => s.def.hull <= s.def.maxHull * DEFENCE.suppressAt;
/** Mounts that work: fitted, not shot off, on a section that is not suppressed. */
export const workingMounts = (sys: StationSys, fit: Hardpoint[]) =>
  fit.filter((m) => sys.mounts[m.id] && sys.mounts[m.id].hp > 0 && !suppressed(sys.sections[m.section]));

/** An attacker hit the station or its world's ships near it. */
export function provoke(sys: StationSys, attacker: string) {
  if (sys.alert === 'fallen') return;
  sys.provoked[attacker] = (sys.provoked[attacker] ?? 0) + 1;
  sys.quiet = 0;
  sys.struck = true;
}
/** Has this attacker done enough to be fought? */
export const isProvokedBy = (sys: StationSys, attacker: string, boon: Boon | null) =>
  (sys.provoked[attacker] ?? 0) >= DEFENCE.provoke * (boon === 'charm' ? 2 : 1);

/** A shot lands on a section: arsenal's split between shield and structure. */
export function hitSection(sys: StationSys, section: string, munition: MunitionId, amount: number, attacker: string): HitResult | null {
  const s = sys.sections[section];
  if (!s) return null;
  const before = s.def.hull;
  const r = applyHit(s.def, MUNITIONS[munition], amount);
  s.sinceHit = 0;
  sys.stats.hitsTaken++;
  sys.stats.damageTaken += before - s.def.hull + r.toShield;
  provoke(sys, attacker);
  return r;
}

/** A shot lands on a mount (its own small structure; it is not behind the section's shield). True when it is destroyed. */
export function hitMount(sys: StationSys, mount: string, munition: MunitionId, amount: number, attacker: string): boolean {
  const m = sys.mounts[mount];
  if (!m || m.hp <= 0) return false;
  m.hp = Math.max(0, m.hp - amount * MUNITIONS[munition].hullMul);
  sys.stats.hitsTaken++;
  provoke(sys, attacker);
  if (m.hp > 0) return false;
  m.down = 0;
  sys.stats.mountsLost++;
  return true;
}

/**
 * The alert ladder. `contacts` are what the sensors see; `range` is the sensor reach. Wary while a hostile is in
 * range; engaged once provoked; siege when a section is badly hurt or a gun is lost; fallen when every section is
 * suppressed. A quiet spell with no new provocation stands it down.
 */
export function stepAlert(sys: StationSys, contacts: Contact[], at: V3, range: number, dt: number, boon: Boon | null): Alert {
  if (sys.alert === 'fallen') return sys.alert;
  const secs = Object.values(sys.sections);
  if (secs.every(suppressed)) { sys.alert = 'fallen'; return sys.alert; }
  sys.quiet += dt;
  const near = contacts.some((c) => c.hostile && dist(c.pos, at) < range);
  // At war: a contact in range is fought as if it had fired (it is a provocation, so the quiet clock restarts).
  for (const c of contacts) if (c.war && c.hostile && dist(c.pos, at) < range) { sys.provoked[c.id] = Math.max(sys.provoked[c.id] ?? 0, DEFENCE.provoke * 2); sys.quiet = 0; }
  const fighting = sys.quiet < DEFENCE.quiet && Object.keys(sys.provoked).some((a) => isProvokedBy(sys, a, boon));
  if (!fighting) {
    if (sys.quiet >= DEFENCE.quiet) { sys.provoked = {}; sys.struck = false; } // forgotten only after a quiet spell
    sys.alert = near ? 'wary' : 'calm';
    return sys.alert;
  }
  const hurt = secs.some((s) => s.def.hull < s.def.maxHull * DEFENCE.siegeHull || shieldFrac(s.def) <= 0.001) || sys.stats.mountsLost > 0;
  sys.alert = hurt ? 'siege' : 'engaged';
  return sys.alert;
}

/**
 * Shields regenerate (arsenal's rule, times the power the emitters get); structure mends after `repairDelay`
 * unhit (conquest's rule); destroyed mounts come back after `rebuild` seconds while the drydock works.
 */
export function stepRepair(sys: StationSys, dt: number, shieldPower: number, drydock: boolean) {
  for (const s of Object.values(sys.sections)) {
    s.sinceHit += dt;
    regenerate(s.def, dt * shieldPower);
    if (s.sinceHit >= DEFENCE.repairDelay) s.def.hull = Math.min(s.def.maxHull, s.def.hull + s.def.maxHull * DEFENCE.repair * dt);
  }
  for (const m of Object.values(sys.mounts)) {
    if (m.hp > 0) { m.cd = Math.max(0, m.cd - dt); continue; }
    if (!drydock) continue;
    m.down += dt;
    if (m.down >= DEFENCE.rebuild) { m.hp = m.maxHp; m.down = 0; }
  }
}

/** Can a mount see `target`? In front of its own plating, and not through the planet. */
export function canSee(m: Pick<Hardpoint, 'pos' | 'normal'>, target: V3, planet: { pos: V3; r: number } | null): boolean {
  const to = sub(target, m.pos);
  if (dot(to, m.normal) < -0.05 * len(to)) return false;
  return !planet || closest(m.pos, target, planet.pos).d > planet.r;
}

export interface FireOrder { mount: string; target: string; munition: MunitionId; from: V3; dir: V3; speed: number; damage: number; delivery: Munition['delivery'] }

export interface FireCtx {
  contacts: Contact[];
  planet: { pos: V3; r: number } | null;
  power: { turret: number; pointDefence: number; minelayer: number };
  boon: Boon | null;
  rand: () => number;
}

/** Turn `d` by up to `err` radians at random. */
export function scatter(d: V3, err: number, rand: () => number): V3 {
  const r: V3 = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
  return unit(add(d, scale(r, err * 2)));
}

/** Who a gun shoots at, best first: provokers, then threat, then the nearest. */
function choose(sys: StationSys, m: Hardpoint, mu: Munition, ctx: FireCtx): Contact | null {
  const pd = m.kind === 'pointDefence';
  let best: Contact | null = null;
  let bestScore = -Infinity;
  for (const c of ctx.contacts) {
    if (!c.hostile) continue;
    const d = dist(c.pos, m.pos);
    if (d > mu.range || !canSee(m, c.pos, ctx.planet)) continue;
    if (pd ? c.kind !== 'missile' && c.kind !== 'fighter' : c.kind === 'missile') continue;
    if (c.kind !== 'missile' && sys.alert !== 'engaged' && sys.alert !== 'siege') continue; // only missiles are shot while wary
    const score = (pd && c.kind === 'missile' ? 100 : 0) + ((sys.provoked[c.id] ?? 0) > 0 ? 10 : 0) + DEFENCE.threat[c.kind] - d / mu.range;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  return best;
}

/** One frame of fire: every working gun that is ready and has a target fires once. Mutates cooldowns and stats. */
export function fireOrders(sys: StationSys, working: Hardpoint[], ctx: FireCtx): FireOrder[] {
  if (sys.alert === 'calm' || sys.alert === 'fallen') return [];
  const out: FireOrder[] = [];
  for (const m of working) {
    if (m.kind !== 'turret' && m.kind !== 'pointDefence' && m.kind !== 'minelayer') continue;
    const st = sys.mounts[m.id];
    const id = st.munition;
    if (!id || st.cd > 0) continue;
    const mu = MUNITIONS[id];
    const power = m.kind === 'minelayer' ? ctx.power.minelayer : m.kind === 'pointDefence' ? ctx.power.pointDefence : ctx.power.turret;
    if (power <= 0.05) continue;
    if (m.kind === 'minelayer') {
      if (sys.alert !== 'engaged' && sys.alert !== 'siege') continue;
      out.push({ mount: m.id, target: '', munition: id, from: m.pos, dir: m.normal, speed: Math.abs(mu.speed), damage: mu.damage, delivery: 'mine' });
      st.cd = 1 / (mu.rate * power);
      sys.stats.shots++;
      continue;
    }
    const c = choose(sys, m, mu, ctx);
    if (!c) continue;
    let dir: V3;
    if (mu.delivery === 'bolt' || mu.delivery === 'burst') {
      const hit = intercept(m.pos, mu.speed, c.pos, c.vel);
      dir = unit(sub(hit ? hit.point : c.pos, m.pos));
    } else dir = unit(sub(c.pos, m.pos));
    dir = scatter(dir, DEFENCE.accuracy, ctx.rand);
    const beam = mu.delivery === 'beam';
    const rate = (beam ? 1 / DEFENCE.beamTick : mu.rate * DEFENCE.gunRate) * power * (ctx.boon === 'avenger' && sys.struck ? 1.25 : 1);
    const heavy = ctx.boon === 'thunderbolt' && m.kind === 'turret' && id !== 'pulse' && sys.tier === 3 ? 1.2 : 1;
    out.push({ mount: m.id, target: c.id, munition: id, from: m.pos, dir, speed: mu.speed, damage: (beam ? mu.damage * DEFENCE.beamTick : mu.damage) * heavy, delivery: mu.delivery });
    st.cd = 1 / rate;
    sys.stats.shots++;
  }
  return out;
}

/**
 * For god-armour, to light, darken or wreck the plating: a mount is 'up' (working), 'down' (its section is suppressed)
 * or 'wrecked' (shot off); a section's shield is up or down.
 */
export function mountState(sys: StationSys, mount: Pick<Hardpoint, 'id' | 'section'>): 'up' | 'down' | 'wrecked' {
  const m = sys.mounts[mount.id];
  if (m && m.hp <= 0) return 'wrecked';
  const s = sys.sections[mount.section];
  return s && suppressed(s) ? 'down' : 'up';
}
export const shieldUp = (sys: StationSys, section: string) => !!sys.sections[section] && shieldFrac(sys.sections[section].def) > 0.001;

/** The station as a whole, for a HUD or a card: structure and shield shares, guns up, and the alert. */
export function status(sys: StationSys) {
  const secs = Object.values(sys.sections);
  const hull = secs.reduce((a, s) => a + s.def.hull, 0) / secs.reduce((a, s) => a + s.def.maxHull, 0);
  const shield = secs.reduce((a, s) => a + shieldFrac(s.def), 0) / secs.length;
  const guns = Object.values(sys.mounts).filter((m) => m.munition && m.munition !== 'mine');
  return { alert: sys.alert, hull, shield, guns: guns.filter((m) => m.hp > 0).length, gunsFitted: guns.length };
}
