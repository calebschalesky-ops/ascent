/**
 * The headless, deterministic battle engine (PKG-02). `createBattle(setup, seed)` returns plain serialisable state;
 * `step(battle)` advances it one fixed step of 1/30 s. The sim never reads wall time and draws randomness only from the
 * battle's seeded RNG; every draw's inputs are logged with the shot or decision it decided.
 *
 * Order of a step: controllers → captains' questions time out → captains think → movement → shield regen → gunnery →
 * (each second) morale, side breaks → broken and withdrawing ships try to jump → end check.
 */
import { breakThreshold, flipAbility, generateCaptain, moodOf, moraleLossMul, startingMorale } from './captains';
import { fairRosters } from './captains'; // PKG-13
import { ABILITY, CLASS, DAMAGE, DT, ESCAPE, GUN, MORALE, MOVE, REQUEST, RUN, SHIELD, STRENGTH, SYSTEMS_BEHIND, TRAIT, sideOffset } from './numbers';
import { fleetLosses, lossesText } from './losses';
import { POLICIES } from './policies';
import { commsTick } from './comms/tick';
import { stepBoarding } from './boarding/boarding';
import { stepFighters } from './fighters/fighters'; // PKG-25
import { stepManeuvers } from './maneuvers/fly';
import { massLocked } from './boarding/masslock';
import { shieldOrderStands } from './comms/standing';
import { draw, makeRng } from './rng';
import {
  EVEN_SPLIT, activeShips, bearing, centroid, dist, fieldShips, focusSplit, forward, headingToPresent, nearest,
  pushLog, recordDecision, round2, setShieldPower, shipById, sideFacing, sideMax, v3, wrap,
} from './ships';
import { SHIELD_SIDES, SIDES, inField, otherSide } from './types';
import type {
  Battle, BattleSetup, Gun, GunKind, Outcome, Request, RequestKind, ShieldSide, Ship, ShipStatus, SideId, SideSetup, SystemId, V3,
} from './types';

export interface CreateOptions {
  maxMinutes?: number;
  variant?: string | null;
  controllers?: Partial<Record<SideId, string>>;
  /** Seed for the captains. Default: the setup's rosterSeed, else the battle seed. */
  rosterSeed?: number;
}

// ── Variants: changes to the generated battle, for paired runs ─────────────────────────────────────────────────────
export const VARIANTS: Record<string, (b: Battle) => void> = {
  /** WORLD-01 check 6: the player's captains' Nerve and Judgement flipped high↔low. */
  'swap-nerve-judgement': (b) => {
    for (const s of b.ships) {
      if (s.side !== 'player') continue;
      s.captain.abilities.nerve = flipAbility(s.captain.abilities.nerve);
      s.captain.abilities.judgement = flipAbility(s.captain.abilities.judgement);
    }
  },
};

// ── What each system does at zero (NAVY §1) ─────────────────────────────────────────────────────────────────────────
/** Engines out: no thrust (the ship still turns, slowly). */
export const canThrust = (s: Ship) => s.systems.engines > 0;
/** Guns out: no fire. */
export const canFire = (s: Ship) => s.systems.guns > 0;
/** Point defence out: nothing stops missiles (or, later, boarders). */
export const pdChance = (s: Ship) => CLASS[s.cls].pd * (s.systems.pd / 100);
/** Hangar out: no launches. Boarding (the next package) reads this. */
export const canLaunch = (s: Ship) => s.status === 'active' && s.systems.hangar > 0;
/** Jump drive out: cannot flee by jumping; a broken ship strikes instead. */
export const canJump = (s: Ship, b?: Battle) => s.systems.jump > 0 && !(b && massLocked(b, s));

// ── Create ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export function createBattle(setup: BattleSetup, seed: number, opts: CreateOptions = {}): Battle {
  const rng = makeRng(seed);
  const rosterSeed = opts.rosterSeed ?? setup.rosterSeed ?? seed;
  // Captains come from their own stream, so the same roster can fight under different dice.
  const roster = makeRng(rosterSeed ^ 0x2545f491);
  const b: Battle = {
    v: 1, seed, rosterSeed, setup: setup.name, variant: opts.variant ?? null, tick: 0, t: 0, dt: DT,
    maxT: (opts.maxMinutes ?? 15) * 60, rng, ships: [],
    sides: {
      player: sideState(setup.player),
      enemy: sideState(setup.enemy),
    },
    controllers: {
      player: opts.controllers?.player ?? setup.player.controller,
      enemy: opts.controllers?.enemy ?? setup.enemy.controller,
    },
    requests: [], nextRequestId: 1, log: [], logDropped: 0,
    stats: {
      sides: { player: sideStats(), enemy: sideStats() },
      decisions: [], decisionsDropped: 0, selfDecisions: 0, timeoutDecisions: [], orders: 0, boardingAttempts: 0,
      moraleSeries: [],
    },
    outcome: null, winner: null, reason: null, ended: false, endT: null,
  };
  for (const side of SIDES) {
    if (!POLICIES[b.controllers[side]]) throw new Error(`unknown controller "${b.controllers[side]}"`);
  }
  const taken = new Set<string>();
  for (const side of SIDES) {
    const ss = side === 'player' ? setup.player : setup.enemy;
    const n = ss.ships.length;
    const x = (side === 'player' ? -1 : 1) * setup.separationM / 2;
    const heading = side === 'player' ? 0 : Math.PI;
    ss.ships.forEach((sh, i) => {
      const c = CLASS[sh.cls];
      const captain = generateCaptain(roster, taken);
      const guns: Gun[] = [];
      for (const kind of ['rail', 'laser', 'missile'] as GunKind[]) {
        for (let g = 0; g < (c.guns[kind] ?? 0); g++) guns.push({ kind, cd: draw(rng) * GUN[kind].reload });
      }
      const id = `${side === 'player' ? 'p' : 'e'}${i + 1}`;
      const ship: Ship = {
        id, name: sh.name, side, cls: sh.cls, flagship: !!sh.flagship, captain,
        pos: v3(x, 0, (i - (n - 1) / 2) * MOVE.lineSpacing), heading, speed: 0,
        hull: c.hull, hullMax: c.hull, shieldTotal: c.shield,
        shields: { fore: c.shield / 4, aft: c.shield / 4, port: c.shield / 4, starboard: c.shield / 4 },
        open: { fore: false, aft: false, port: false, starboard: false },
        split: { ...EVEN_SPLIT },
        lastHit: { fore: -1e9, aft: -1e9, port: -1e9, starboard: -1e9 },
        systems: { engines: 100, guns: 100, pd: 100, hangar: 100, jump: 100 },
        crew: c.crew, crewMax: c.crew, marines: c.marines, marinesMax: c.marines,
        morale: 0, moraleStart: 0, status: 'active', brokenAt: null, outAt: null, guns, order: null,
        // Escorts screen the flagship under standing orders; everyone else engages.
        stance: { mode: sh.cls === 'escort' ? 'follow' : 'engage', target: null, side: null, present: null, why: 'standing orders' },
        nextThink: 0, spool: 0, pinned: 0, lastHullHitAt: -1e9, lastDefence: -1e9, lastAttacker: null, asked: [], dealt: 0,
      };
      b.ships.push(ship);
      if (ship.flagship) b.sides[side].flagshipId = id;
    });
    if (!b.sides[side].flagshipId) b.sides[side].flagshipId = b.ships.find((s) => s.side === side)!.id;
  }
  if (ABILITY.fairRosters) fairRosters(b.ships, roster); // PKG-13
  if (b.variant) {
    const v = VARIANTS[b.variant];
    if (!v) throw new Error(`unknown variant "${b.variant}"`);
    v(b);
  }
  for (const s of b.ships) {
    s.morale = s.moraleStart = startingMorale(s.captain);
    s.captain.mood = moodOf(s.captain, s.morale);
    s.nextThink = draw(rng) * 2;
  }
  for (const side of SIDES) b.sides[side].morale = meanMorale(b, side);
  sampleMorale(b);
  return b;
}

function sideState(ss: SideSetup) {
  return {
    house: ss.house, world: ss.world, initial: ss.ships.length, flagshipId: '', morale: 0, broken: false,
    brokenAt: null, brokenReason: null, standing: { ...ss.standing }, inFieldAtBreak: 0, fleetTarget: null,
  };
}
const sideStats = () => ({ damageDealt: 0, damageAt60: 0, shots: 0, hits: 0 });

// ── Step ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const every = (b: Battle, seconds: number) => b.tick % Math.round(seconds / b.dt) === 0;

export function step(b: Battle): void {
  if (b.ended) return;
  b.tick++;
  b.t = b.tick * b.dt;
  if (every(b, RUN.policyEveryS)) for (const side of SIDES) POLICIES[b.controllers[side]](b, side);
  timeoutRequests(b);
  for (const s of b.ships) if (s.status === 'active' && b.t >= s.nextThink) think(b, s);
  commsTick(b);
  for (const s of b.ships) if (inField(s.status)) move(b, s);
  stepManeuvers(b);
  for (const s of b.ships) if (inField(s.status)) regen(b, s);
  for (const s of b.ships) if (s.status === 'active') gunnery(b, s);
  stepFighters(b); // PKG-25
  stepBoarding(b);
  if (every(b, 1)) {
    for (const s of b.ships) if (s.status === 'active') moraleTick(b, s);
    for (const side of SIDES) { b.sides[side].morale = meanMorale(b, side); sideCheck(b, side); }
  }
  for (const s of b.ships) if (s.status === 'broken' || (s.status === 'active' && s.stance.mode === 'withdraw')) escape(b, s);
  if (b.tick === Math.round(60 / b.dt)) for (const side of SIDES) b.stats.sides[side].damageAt60 = b.stats.sides[side].damageDealt;
  if (every(b, MORALE.sampleS)) sampleMorale(b);
  checkEnd(b);
}

/** Run until the battle ends or `seconds` pass. */
export function run(b: Battle, seconds = Infinity): Battle {
  const stopAt = b.tick + Math.round(Math.min(seconds, b.maxT + 1) / b.dt) + 1;
  while (!b.ended && b.tick < stopAt) step(b);
  return b;
}

// ── Captains: thinking, self-decisions, questions ───────────────────────────────────────────────────────────────────
function think(b: Battle, s: Ship): void {
  const J = s.captain.abilities.judgement;
  s.nextThink = b.t + ABILITY.thinkBase + ABILITY.thinkPer * (10 - J);
  s.captain.mood = moodOf(s.captain, s.morale);
  const foe = otherSide(s.side);

  if (s.order) {
    const t = shipById(b, s.order.target);
    if ((s.order.kind === 'attack' || s.order.kind === 'focusSide') && (!t || !inField(t.status))) s.order = null;
  }
  if (!s.order && s.stance.mode !== 'withdraw') {
    const cur = shipById(b, s.stance.target);
    const curOk = !!cur && inField(cur.status);
    if (s.stance.mode === 'pursue' && !curOk) setStance(s, 'engage', null, 'standing orders');
    if (s.stance.mode === 'cover' && b.sides[s.side].flagshipId && !inField(shipById(b, b.sides[s.side].flagshipId)!.status)) {
      setStance(s, 'engage', null, 'standing orders');
    }
    if (s.stance.mode === 'engage' || s.stance.mode === 'hold' || s.stance.mode === 'follow') chooseTarget(b, s);
    else if (s.stance.mode === 'cover') {
      const flag = shipById(b, b.sides[s.side].flagshipId)!;
      const threat = nearest(flag, activeShips(b, foe));
      s.stance.target = threat?.id ?? null;
    }
  }

  // Questions to the admiral.
  // The flagship carries the admiral: its captain does not ask to leave (assumed).
  if (!s.flagship && s.hull / s.hullMax < REQUEST.withdrawAtHullFrac && s.stance.mode !== 'withdraw') ask(b, s, 'withdraw', null, ['withdraw', 'stay']);
  const flag = shipById(b, b.sides[s.side].flagshipId);
  if (flag && flag !== s && flag.status === 'active' && flag.hull / flag.hullMax < REQUEST.coverAtFlagshipHullFrac
    && s.stance.mode !== 'cover' && s.stance.mode !== 'withdraw') ask(b, s, 'cover', flag.id, ['cover', 'hold']);

  shieldManagement(b, s);
}

function setStance(s: Ship, mode: Ship['stance']['mode'], target: string | null, why: string) {
  s.stance = { mode, target, side: null, present: s.stance.present, why };
}

/** Standing orders, no admiral input: who to shoot is the captain's call, by trait first, then Judgement. */
function chooseTarget(b: Battle, s: Ship): void {
  const foes = activeShips(b, otherSide(s.side));
  if (!foes.length) { s.stance.target = null; return; }
  const c = s.captain;
  const J = c.abilities.judgement;
  let pick: Ship | null = null;
  let why = '';
  const flag = shipById(b, b.sides[otherSide(s.side)].flagshipId);
  if (c.trait === 'Glory-hound' && flag && flag.status === 'active') { pick = flag; why = 'Glory-hound: the flagship'; }
  else if (c.trait === 'Grudge-holder' && s.lastAttacker) {
    const g = shipById(b, s.lastAttacker);
    if (g && g.status === 'active') { pick = g; why = 'Grudge-holder: whoever hit us'; }
  } else if (c.trait === 'Ambitious') {
    const reach = CLASS[s.cls].prefRange * 1.3;
    const inReach = foes.filter((f) => dist(s.pos, f.pos) <= reach);
    const pool = inReach.length ? inReach : foes;
    pick = pool.reduce((a, f) => (f.hullMax > a.hullMax || (f.hullMax === a.hullMax && dist(s.pos, f.pos) < dist(s.pos, a.pos)) ? f : a));
    why = 'Ambitious: the biggest prize';
  } else if (c.trait === 'By-the-book') { pick = nearest(s, foes); why = 'By-the-book: nearest'; }
  if (!pick) {
    if (J >= ABILITY.smartTargetJudgement) {
      let best = Infinity;
      for (const f of foes) {
        const facing = sideFacing(f, s.pos);
        const m = sideMax(f, facing);
        const open = SHIELD_SIDES.filter((k) => f.open[k]).length;
        const score = dist(s.pos, f.pos) / 1000 + 10 * (m > 0 ? f.shields[facing] / m : 0) + 5 * (f.hull / f.hullMax) - 3 * open;
        if (score < best) { best = score; pick = f; }
      }
      why = `Judgement ${J}: the weakest side in reach`;
    } else { pick = nearest(s, foes); why = `Judgement ${J}: nearest`; }
  }
  if (pick && pick.id !== s.stance.target) {
    s.stance.target = pick.id;
    s.stance.why = why;
    recordDecision(b, s, `engage ${pick.name}`, why, false);
  }
}

/** Shift power to the threatened side, or turn a fresh side to the threat: the ship's own defence. */
function shieldManagement(b: Battle, s: Ship): void {
  if (b.t - s.lastDefence < SHIELD.decisionCooldown) return;
  const J = s.captain.abilities.judgement;
  const H = s.captain.abilities.helm;
  const foes = activeShips(b, otherSide(s.side)).filter((f) => dist(s.pos, f.pos) <= GUN.rail.range);
  if (!foes.length) return;
  const threat: Record<ShieldSide, number> = { fore: 0, aft: 0, port: 0, starboard: 0 };
  for (const f of foes) threat[sideFacing(s, f.pos)] += f.guns.length;
  const total = SHIELD_SIDES.reduce((a, k) => a + threat[k], 0);
  const top = SHIELD_SIDES.reduce((a, k) => (threat[k] > threat[a] ? k : a), 'fore' as ShieldSide);
  // PKG-14 (EXP-02 s8): a standing shield order from the admiral holds; the captain trims only once it is released.
  const ordered = shieldOrderStands(b, s, threat);
  if (!ordered && J >= ABILITY.shieldShiftJudgement && total > 0) {
    const share = threat[top] / total;
    if (share >= SHIELD.threatShare && s.split[top] < SHIELD.focus - 0.05) {
      setShieldPower(s, focusSplit(top));
      s.lastDefence = b.t;
      recordDecision(b, s, `shift shield power to ${top}`, `Judgement ${J}`, false);
    } else if (share < 0.35 && Math.abs(s.split.fore - 0.25) > 0.01) {
      setShieldPower(s, EVEN_SPLIT);
      s.lastDefence = b.t;
      recordDecision(b, s, 'spread shield power evenly', `Judgement ${J}`, false);
    }
  }
  if (J + H >= ABILITY.freshSideJudgementHelm && s.stance.target) {
    const t = shipById(b, s.stance.target);
    if (t) {
      const facing = sideFacing(s, t.pos);
      const m = sideMax(s, facing);
      if (m <= 0 || s.shields[facing] / m < 0.3) {
        let bestSide: ShieldSide = facing;
        let bestFrac = -1;
        for (const k of SHIELD_SIDES) {
          const mk = sideMax(s, k);
          const fr = mk > 0 ? s.shields[k] / mk : 0;
          if (k !== facing && fr > bestFrac) { bestFrac = fr; bestSide = k; }
        }
        if (bestFrac > 0.5 && s.stance.present !== bestSide) {
          s.stance.present = bestSide;
          s.lastDefence = b.t;
          recordDecision(b, s, `turn ${bestSide} side to ${t.name}`, `Judgement ${J} + Helm ${H}`, false);
        }
      }
    }
  }
}

function ask(b: Battle, s: Ship, kind: RequestKind, about: string | null, options: string[]): void {
  const key = `${kind}:${about ?? ''}`;
  if (s.asked.includes(key)) return;
  s.asked.push(key);
  const id = b.nextRequestId++;
  const req: Request = { id, t: round2(b.t), ship: s.id, kind, about, options, deadline: b.t + REQUEST.timeoutBase };
  b.requests.push(req);
  pushLog(b, { t: req.t, kind: 'request', ship: s.id, request: kind, about, id });
}

/** The admiral answers a captain's question (player or AI policy). Returns false if it is gone or the choice is not offered. */
export function answer(b: Battle, requestId: number, choice: string): boolean {
  const i = b.requests.findIndex((r) => r.id === requestId);
  if (i < 0) return false;
  const req = b.requests[i];
  if (!req.options.includes(choice)) return false;
  b.requests.splice(i, 1);
  pushLog(b, { t: round2(b.t), kind: 'answer', id: requestId, choice });
  const s = shipById(b, req.ship);
  if (s && s.status === 'active') applyChoice(s, req, choice, 'admiral');
  return true;
}

function applyChoice(s: Ship, req: Request, choice: string, why: string): void {
  if (req.kind === 'withdraw' && choice === 'withdraw') { s.order = null; setStance(s, 'withdraw', null, why); }
  if (req.kind === 'pursue' && choice === 'pursue') { s.order = null; setStance(s, 'pursue', req.about, why); }
  if (req.kind === 'cover' && choice === 'cover') { s.order = null; setStance(s, 'cover', null, why); }
}

/** BRIDGE §4 Timeouts: unanswered, the captain decides by Judgement and trait. */
function timeoutRequests(b: Battle): void {
  if (!b.requests.length) return;
  const keep: Request[] = [];
  for (const req of b.requests) {
    const s = shipById(b, req.ship);
    if (!s || s.status !== 'active') continue;
    if (b.t < req.deadline) { keep.push(req); continue; }
    const { choice, why } = timeoutChoice(b, s, req);
    if (s.captain.trait === 'Grudge-holder') s.captain.loyalty = Math.max(0, s.captain.loyalty - REQUEST.grudgeLoyalty);
    applyChoice(s, req, choice, why);
    const about = shipById(b, req.about);
    recordDecision(b, s, `${req.kind}${about ? ` ${about.name}` : ''}: ${choice}`, why, true);
  }
  b.requests = keep;
}

function timeoutChoice(b: Battle, s: Ship, req: Request): { choice: string; why: string } {
  const c = s.captain;
  const J = c.abilities.judgement;
  const T = c.trait;
  if (req.kind === 'withdraw') {
    if (T === 'Cautious') return { choice: 'withdraw', why: T };
    if (T === 'Fanatic' || T === 'Bold' || T === 'Glory-hound') return { choice: 'stay', why: T };
    return J >= 6 ? { choice: 'withdraw', why: `Judgement ${J}` } : { choice: 'stay', why: `Judgement ${J}` };
  }
  if (req.kind === 'pursue') {
    const target = shipById(b, req.about);
    if (!target || !inField(target.status)) return { choice: 'hold', why: 'target gone' };
    if (T === 'Bold' || T === 'Glory-hound' || T === 'Ambitious') return { choice: 'pursue', why: T };
    if (T === 'Cautious' || T === 'By-the-book') return { choice: 'hold', why: T };
    return J >= 6 && s.hull / s.hullMax > 0.5 ? { choice: 'pursue', why: `Judgement ${J}` } : { choice: 'hold', why: `Judgement ${J}` };
  }
  if (T === 'Protector') return { choice: 'cover', why: T };
  return J >= 7 ? { choice: 'cover', why: `Judgement ${J}` } : { choice: 'hold', why: `Judgement ${J}` };
}

// ── Movement ────────────────────────────────────────────────────────────────────────────────────────────────────────
interface Goal { point: V3 | null; speed: number; face: number | null }

function prefRange(s: Ship): number {
  return CLASS[s.cls].prefRange * TRAIT[s.captain.trait].rangeMul;
}

function faceToward(s: Ship, at: V3): number {
  const br = bearing(s.pos, at);
  return s.stance.present ? headingToPresent(br, s.stance.present) : br;
}

function goalOf(b: Battle, s: Ship): Goal {
  const c = CLASS[s.cls];
  const foes = fieldShips(b, otherSide(s.side));
  const near = nearest(s, foes.filter((f) => f.status === 'active')) ?? nearest(s, foes);
  const mode = s.status === 'broken' ? 'flee' : s.stance.mode;
  if (mode === 'flee' || mode === 'withdraw') {
    const cen = centroid(foes);
    if (!cen) return { point: null, speed: 0, face: null };
    return { point: v3(2 * s.pos.x - cen.x, 0, 2 * s.pos.z - cen.z), speed: c.maxSpeed, face: null };
  }
  if (mode === 'follow' || mode === 'cover') {
    const flag = shipById(b, b.sides[s.side].flagshipId);
    if (flag && flag !== s && inField(flag.status) && dist(s.pos, flag.pos) > MOVE.followRange) {
      return { point: flag.pos, speed: c.maxSpeed, face: null };
    }
    const t = shipById(b, s.stance.target) ?? near;
    return { point: null, speed: 0, face: t ? faceToward(s, t.pos) : null };
  }
  if (mode === 'hold') return { point: null, speed: 0, face: near ? faceToward(s, near.pos) : null };
  const t = shipById(b, s.stance.target);
  if (!t || !inField(t.status)) return { point: null, speed: 0, face: near ? faceToward(s, near.pos) : null };
  const R = mode === 'pursue' ? MOVE.pursueRange : prefRange(s);
  if (s.stance.side) {
    const p = forward(t.heading + sideOffset[s.stance.side]);
    const want = v3(t.pos.x + p.x * R, 0, t.pos.z + p.z * R);
    if (dist(s.pos, want) > MOVE.rangeBand) return { point: want, speed: c.maxSpeed, face: null };
    return { point: null, speed: 0, face: faceToward(s, t.pos) };
  }
  const d = dist(s.pos, t.pos);
  if (d > R + MOVE.rangeBand) return { point: t.pos, speed: c.maxSpeed, face: null };
  if (d < R - MOVE.rangeBand) return { point: v3(2 * s.pos.x - t.pos.x, 0, 2 * s.pos.z - t.pos.z), speed: c.maxSpeed * 0.6, face: null };
  return { point: null, speed: 0, face: faceToward(s, t.pos) };
}

function move(b: Battle, s: Ship): void {
  const c = CLASS[s.cls];
  const helm = ABILITY.helmBase + ABILITY.helmPer * s.captain.abilities.helm;
  const engines = canThrust(s);
  const g = goalOf(b, s);
  const want = g.point ? bearing(s.pos, g.point) : g.face ?? s.heading;
  const rate = c.turn * helm * (engines ? 1 : DAMAGE.enginesOutTurn) * b.dt;
  const delta = wrap(want - s.heading);
  s.heading = wrap(s.heading + Math.max(-rate, Math.min(rate, delta)));
  if (engines) {
    let target = g.point ? g.speed : 0;
    if (Math.abs(delta) > Math.PI / 3) target *= 0.3;
    const a = c.accel * helm * b.dt;
    s.speed += Math.max(-a, Math.min(a, target - s.speed));
  }
  const f = forward(s.heading);
  s.pos = v3(s.pos.x + f.x * s.speed * b.dt, 0, s.pos.z + f.z * s.speed * b.dt);
}

function regen(b: Battle, s: Ship): void {
  const r = CLASS[s.cls].regen;
  for (const side of SHIELD_SIDES) {
    const max = sideMax(s, side);
    if (max <= 0 || b.t - s.lastHit[side] < SHIELD.regenDelay) continue;
    s.shields[side] = Math.min(max, s.shields[side] + r * max * b.dt);
    if (s.open[side] && s.shields[side] >= SHIELD.reopenFrac * max) s.open[side] = false;
  }
}

// ── Gunnery ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const crewEff = (s: Ship) => DAMAGE.crewEffBase + (1 - DAMAGE.crewEffBase) * (s.crew / s.crewMax);

function gunnery(b: Battle, s: Ship): void {
  if (!canFire(s)) return;
  const foes = fieldShips(b, otherSide(s.side));
  if (!foes.length) return;
  const stanceTarget = shipById(b, s.stance.target);
  for (const g of s.guns) {
    g.cd -= b.dt;
    if (g.cd > 0) continue;
    const spec = GUN[g.kind];
    let tgt: Ship | null = null;
    if (stanceTarget && inField(stanceTarget.status) && dist(s.pos, stanceTarget.pos) <= spec.range) tgt = stanceTarget;
    else tgt = nearest(s, foes, spec.range);
    if (!tgt) { g.cd = 0.5; continue; }
    fire(b, s, g.kind, tgt);
    g.cd = spec.reload / crewEff(s);
  }
}

/** One shot, resolved: hit roll, PD roll for missiles, shield or hull and systems. Public for tests and later packages. */
export function fire(b: Battle, s: Ship, kind: GunKind, tgt: Ship): void {
  const spec = GUN[kind];
  const ab = s.captain.abilities;
  const range = dist(s.pos, tgt.pos);
  const side = sideFacing(tgt, s.pos);
  const facingMul = side === 'fore' || side === 'aft' ? SHIELD.endOnProfile : SHIELD.broadsideProfile;
  const evade = ABILITY.evadeBase - ABILITY.evadePer * tgt.captain.abilities.helm;
  const raw = spec.baseHit * (1 - spec.rangeFalloff * range / spec.range) * (ABILITY.gunHitBase + ABILITY.gunHitPer * ab.gunnery)
    * CLASS[tgt.cls].profile * facingMul * evade;
  const p = Math.max(0.02, Math.min(0.98, raw));
  const roll = draw(b.rng);
  let hit = roll < p;
  let pd: { p: number; roll: number; stopped: boolean } | undefined;
  if (hit && kind === 'missile') {
    const pp = pdChance(tgt);
    const pr = draw(b.rng);
    pd = { p: round4(pp), roll: round4(pr), stopped: pr < pp };
    if (pd.stopped) hit = false;
  }
  const st = b.stats.sides[s.side];
  st.shots++;
  let shieldDmg = 0;
  let hullDmg = 0;
  let system: SystemId | undefined;
  let systemDmg: number | undefined;
  if (hit) {
    st.hits++;
    tgt.lastHit[side] = b.t;
    tgt.lastAttacker = s.id;
    if (!tgt.open[side] && tgt.shields[side] > 0) {
      const sd = spec.damage * spec.shieldMul * (ABILITY.gunShieldBase + ABILITY.gunShieldPer * ab.gunnery);
      shieldDmg = Math.min(sd, tgt.shields[side]);
      tgt.shields[side] -= shieldDmg;
      if (tgt.shields[side] <= 1e-6) {
        tgt.shields[side] = 0;
        tgt.open[side] = true;
        pushLog(b, { t: round2(b.t), kind: 'shieldDown', ship: tgt.id, side });
        loseMorale(tgt, MORALE.sideDown);
      }
    } else {
      hullDmg = Math.min(spec.damage * spec.hullMul, tgt.hull);
      tgt.hull -= hullDmg;
      tgt.lastHullHitAt = b.t;
      tgt.crew = Math.max(0, tgt.crew - hullDmg / tgt.hullMax * tgt.crewMax * DAMAGE.crewPerHull);
      loseMorale(tgt, hullDmg / tgt.hullMax * MORALE.hullLoss);
      for (const sys of SYSTEMS_BEHIND[side]) {
        const d = hullDmg / tgt.hullMax * 100 * DAMAGE.systemDamageMul;
        const before = tgt.systems[sys];
        tgt.systems[sys] = Math.max(0, before - d);
        if (!system) { system = sys; systemDmg = d; }
        if (before > 0 && tgt.systems[sys] <= 0) pushLog(b, { t: round2(b.t), kind: 'systemOut', ship: tgt.id, system: sys });
      }
    }
    const dealt = shieldDmg + hullDmg;
    st.damageDealt += dealt;
    s.dealt += dealt;
  }
  pushLog(b, {
    t: round2(b.t), kind: 'shot', ship: s.id, target: tgt.id, gun: kind, range: Math.round(range), p: round4(p),
    roll: round4(roll), hit, side, ...(pd ? { pd } : {}), shieldDmg: round2(shieldDmg), hullDmg: round2(hullDmg),
    ...(system ? { system, systemDmg: round2(systemDmg!) } : {}),
  });
  if (tgt.hull <= 0 && inField(tgt.status)) shipOut(b, tgt, 'wrecked');
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;

// ── Morale, breaking, escape ────────────────────────────────────────────────────────────────────────────────────────
function loseMorale(s: Ship, amount: number): void {
  s.morale = Math.max(0, s.morale - amount * moraleLossMul(s.captain));
}

function moraleTick(b: Battle, s: Ship): void {
  const own = activeShips(b, s.side).length;
  const foe = activeShips(b, otherSide(s.side)).length;
  const ratio = own > 0 ? foe / own : 0;
  if (ratio > MORALE.outnumberedAt) loseMorale(s, MORALE.outnumberedPerS * (ratio - 1));
  if (b.t - s.lastHullHitAt > MORALE.calmAfter && s.morale < s.moraleStart) s.morale = Math.min(s.moraleStart, s.morale + MORALE.recoverPerS);
  s.captain.mood = moodOf(s.captain, s.morale);
  // The flagship carries the admiral: it breaks only with the fleet, never on its own captain's nerve (assumed).
  if (!s.flagship && s.morale < breakThreshold(s.captain)) breakShip(b, s, `morale ${Math.round(s.morale)} under Nerve ${s.captain.abilities.nerve}`);
}

export function breakShip(b: Battle, s: Ship, reason: string): void {
  if (s.status !== 'active') return;
  s.status = 'broken';
  s.brokenAt = b.t;
  s.order = null;
  s.stance = { mode: 'flee', target: null, side: null, present: null, why: reason };
  s.captain.mood = moodOf(s.captain, Math.min(s.morale, MORALE.strained - 1));
  pushLog(b, { t: round2(b.t), kind: 'break', ship: s.id, reason, morale: Math.round(s.morale) });
  const fanatic = s.captain.trait === 'Fanatic';
  if (!fanatic && (!canJump(s) || s.hull / s.hullMax < ESCAPE.strikeHullFrac)) {
    shipOut(b, s, 'struck');
    return;
  }
  const hunters = activeShips(b, otherSide(s.side));
  const h = nearest(s, hunters);
  if (h && !b.sides[h.side].broken) ask(b, h, 'pursue', s.id, ['pursue', 'hold']);
}

function escape(b: Battle, s: Ship): void {
  const locked = activeShips(b, otherSide(s.side)).some((f) => dist(s.pos, f.pos) <= ESCAPE.massLockRange);
  if (locked) {
    s.spool = 0;
    if (s.status === 'broken') {
      s.pinned += b.dt;
      if (s.pinned >= ESCAPE.strikeWhenPinnedS && s.captain.trait !== 'Fanatic') shipOut(b, s, 'struck');
    }
    return;
  }
  if (!canJump(s)) return;
  s.spool += b.dt;
  if (s.spool >= ESCAPE.jumpSpool) shipOut(b, s, s.status === 'broken' ? 'fled' : 'withdrawn');
}

/**
 * The morale shock of losing `s` to its side (PKG-08's per-strength shock): its friends lose, its enemies gain, scaled by
 * what the ship was worth (STRENGTH) × `mul`. Call while `s` is still on the side that lost it. shipOut() uses it; a
 * capture is meant to (PKG-08 request 1), held back by PKG-14 on measurement: see boarding.ts capture().
 */
export function lossShock(b: Battle, s: Ship, mul = 1): void {
  const scale = STRENGTH[s.cls] * mul;
  for (const o of b.ships) {
    if (o === s || o.status !== 'active') continue;
    if (o.side === s.side) loseMorale(o, scale * (dist(o.pos, s.pos) <= MORALE.nearRange ? MORALE.friendLostNearPerStrength : MORALE.friendLostPerStrength));
    else o.morale = Math.min(100, o.morale + MORALE.enemyLostPerStrength * scale);
  }
}

export function shipOut(b: Battle, s: Ship, how: ShipStatus): void {
  if (!inField(s.status)) return;
  s.status = how;
  s.outAt = b.t;
  s.order = null;
  pushLog(b, { t: round2(b.t), kind: 'out', ship: s.id, how });
  b.requests = b.requests.filter((r) => r.ship !== s.id);
  // PKG-08: the shock scales with what the ship was worth to its fleet (STRENGTH), and a ship that ran costs less heart
  // than one that died.
  lossShock(b, s, how === 'withdrawn' ? MORALE.withdrawnShock : how === 'fled' ? MORALE.fledShock : 1);
  if (s.flagship) {
    for (const o of b.ships) if (o.side === s.side && inField(o.status)) o.morale = Math.max(0, o.morale - MORALE.flagshipLost);
    pushLog(b, { t: round2(b.t), kind: 'flagshipLost', side: s.side, ship: s.id, moraleDrop: MORALE.flagshipLost });
  }
}

function meanMorale(b: Battle, side: SideId): number {
  const f = fieldShips(b, side);
  return f.length ? f.reduce((a, s) => a + s.morale, 0) / f.length : 0;
}

function sideCheck(b: Battle, side: SideId): void {
  const st = b.sides[side];
  if (st.broken) return;
  // PKG-08: losses are counted once, by fleetLosses (strength-weighted, prizes credited), for the break rule, the reason
  // and the tally alike.
  const losses = fleetLosses(b, side);
  const flag = shipById(b, st.flagshipId);
  let reason: string | null = null;
  if (flag && !inField(flag.status)) reason = `flagship ${flag.name} ${flag.status}`;
  else if (flag && flag.status === 'broken') reason = `flagship ${flag.name} broke`;
  else if (losses.frac >= MORALE.sideBreakStrength) reason = lossesText(losses);
  else if (st.morale < MORALE.sideBreak) reason = `fleet morale ${Math.round(st.morale)}`;
  if (!reason) return;
  st.broken = true;
  st.brokenAt = b.t;
  st.brokenReason = reason;
  st.inFieldAtBreak = fieldShips(b, side).length;
  pushLog(b, { t: round2(b.t), kind: 'sideBroken', side, reason });
  for (const s of b.ships) if (s.side === side && s.status === 'active') breakShip(b, s, `the line broke: ${reason}`);
  if (b.winner === null) b.winner = otherSide(side);
  else if (b.winner === side) b.winner = 'draw';
}

function checkEnd(b: Battle): void {
  const broken = SIDES.filter((s) => b.sides[s].broken);
  if (broken.length) {
    const first = broken.reduce((a, s) => (b.sides[s].brokenAt! < b.sides[a].brokenAt! ? s : a));
    const cleared = broken.every((s) => fieldShips(b, s).length === 0);
    // PKG-23 (QA-05 F-06): a broken side with no ship still fighting gets one jump spool for its runners, not the whole
    // pursuit window; its pinned or drive-dead stragglers no longer hold the battle open for up to three minutes.
    const spent = broken.some((s) => activeShips(b, s).length === 0 && b.t >= b.sides[s].brokenAt! + ESCAPE.jumpSpool);
    if (cleared || spent || b.t >= b.sides[first].brokenAt! + ESCAPE.pursuitWindow || b.t >= b.maxT) end(b, first);
    return;
  }
  if (b.t >= b.maxT) end(b, null);
}

function end(b: Battle, loser: SideId | null): void {
  b.ended = true;
  b.endT = b.t;
  let outcome: Outcome;
  if (!loser) { outcome = 'timeout'; b.winner = null; b.reason = 'time ran out with both fleets in the field'; }
  else {
    const st = b.sides[loser];
    const when = clock(st.brokenAt!);
    if (b.winner === 'draw') outcome = 'withdrawal';
    else if (loser === 'enemy') outcome = 'victory';
    else {
      const mine = b.ships.filter((s) => s.side === 'player');
      const away = mine.filter((s) => s.status === 'fled' || s.status === 'withdrawn').length;
      const lost = mine.filter((s) => s.status !== 'active' && s.status !== 'fled' && s.status !== 'withdrawn').length;
      outcome = away > lost ? 'withdrawal' : 'defeat';
    }
    b.reason = `${st.house} broke at ${when}: ${st.brokenReason}`;
  }
  b.outcome = outcome;
  pushLog(b, { t: round2(b.t), kind: 'end', outcome, reason: b.reason! });
  sampleMorale(b);
}

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function sampleMorale(b: Battle): void {
  const last = b.stats.moraleSeries[b.stats.moraleSeries.length - 1];
  if (last && last.t === round2(b.t)) return;
  b.stats.moraleSeries.push({ t: round2(b.t), player: Math.round(meanMorale(b, 'player') * 10) / 10, enemy: Math.round(meanMorale(b, 'enemy') * 10) / 10 });
}

