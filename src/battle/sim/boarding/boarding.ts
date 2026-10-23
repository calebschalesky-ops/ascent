/**
 * Boarding (PKG-05; NAVY-DESIGN §3, BRIDGE-DESIGN §7, VISION §7). Headless and deterministic like the rest of the sim:
 * every random draw comes from the battle's RNG and its inputs are logged.
 *
 * 1. Launch: a carrier or capital with a working hangar sends a group of pods at an enemy ship (ordered, or its captain's
 *    own call when Judgement sees an open side).
 * 2. Cross: the target's point defence gets one shot at each pod; a pod lost is its marines lost.
 * 3. Arrive: a side that is not open deflects them (they return). Through an open side: a 2.5 s breach costs a little hull.
 * 4. Fight inside: lib/boarding/troops.ts's Lanchester model, marines (by quality) against marines plus armed crew.
 *    While boarded, the defender's gunnery drops. More pods can reinforce; pull-back ends it.
 * 5. Outcome: captured (the ship flips side and fights as a prize), repelled (the boarders are lost), or scuttled
 *    (a losing Fanatic blows the reactor: a wreck, and the boarders die with it).
 */
import { LANCHESTER } from '../../../lib/boarding/troops';
import type { TroopForce } from '../../../lib/boarding/troops';
import { canLaunch, lossShock, shipOut } from '../battle';
import { podPdChance } from '../fighters/fighters'; // PKG-25
import { moodOf, moraleLossMul, startingMorale } from '../captains';
import { MORALE, sideOffset } from '../numbers';
import { draw } from '../rng';
import { dist, forward, openSides, pushLog, recordDecision, round2, shipById, sideFacing, v3 } from '../ships';
import { inField } from '../types';
import type { Battle, ShieldSide, Ship, SideId } from '../types';
import { BOARDING, BOARD_TRAIT, QUALITY_TRAIT } from './numbers';
import type { BoardFight, BoardingState, PodGroup } from './types';

// ── State ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** The battle's boarding state, created on first use (a battle from before PKG-05 has none). */
export function boarding(b: Battle): BoardingState {
  if (!b.boarding) {
    b.boarding = { pods: [], fights: [], nextId: 1, unordered: 0, captured: { player: 0, enemy: 0 }, lastLaunch: {} };
  }
  return b.boarding;
}

const every = (b: Battle, seconds: number) => b.tick % Math.round(seconds / b.dt) === 0;

export const hasHangar = (s: Ship) => BOARDING.hangarClasses.includes(s.cls);
/** Marines this ship can send now (it keeps BOARDING.marineReserve to defend itself). */
export const spareMarines = (s: Ship) => Math.max(0, Math.floor(s.marines - BOARDING.marineReserve));

/** Quality of the marines a ship sends: the captain's trait, and (later) the admiral leading them. */
export function marineQuality(s: Ship, ledByAdmiral = false): number {
  return BOARDING.marineQuality * (QUALITY_TRAIT[s.captain.trait] ?? 1) * (ledByAdmiral ? BOARDING.ledByAdmiral : 1);
}

/** The defenders of `t` as a fighting force: its marines and the armed share of its crew. */
export function defenders(t: Ship): { force: TroopForce; marines: number; armed: number } {
  const marines = t.marines;
  const armed = t.crew * BOARDING.armedCrewFrac;
  const strength = marines + armed;
  const mul = QUALITY_TRAIT[t.captain.trait] ?? 1;
  const quality = strength > 0 ? mul * (marines * BOARDING.marineQuality + armed * BOARDING.crewQuality) / strength : 0;
  return { force: { strength, quality }, marines, armed };
}

export const fightOn = (b: Battle, targetId: string, side?: SideId): BoardFight | undefined =>
  boarding(b).fights.find((f) => f.target === targetId && (!side || f.side === side));

/** Is this ship being boarded right now? */
export const isBoarded = (b: Battle, s: Ship) => !!b.boarding?.fights.some((f) => f.target === s.id);

// ── Launch ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Why `s` cannot board `t` now, or null if it can. `ordered`: the admiral ordered it (PKG-14: the flagship's own marine
 * commander may then send pods at the enemy flagship, VISION §7a, ruled by Daedalus 2026-10-21 over NAVY §3).
 */
export function cannotBoard(s: Ship | undefined, t: Ship | undefined, ordered = false): BoardRefusal | null {
  if (!s || s.status !== 'active') return 'ship not active';
  if (!hasHangar(s)) return 'no boarding hangar';
  if (!canLaunch(s)) return 'hangar out';
  if (spareMarines(s) < BOARDING.minLaunch) return 'not enough marines';
  if (!t || t.side === s.side || t.status !== 'active') return 'no enemy target';
  // NAVY §3: only the admiral leading in person may board a flagship. VISION §7a gives the flagship's marine commander
  // "Send the pods at their flagship", and VISION outranks NAVY (Daedalus's ruling, on Caleb's list to overrule).
  if (t.flagship && !(ordered && s.flagship)) return 'flagship: only the admiral leading may board it';
  if (dist(s.pos, t.pos) > BOARDING.launchRange) return 'out of range';
  return null;
}

/** The open side of `t` nearest to `from`, else the side facing it. */
function aimSide(t: Ship, from: Ship): ShieldSide {
  const facing = sideFacing(t, from.pos);
  const open = openSides(t);
  if (!open.length || open.includes(facing)) return facing;
  const toFrom = Math.atan2(from.pos.z - t.pos.z, from.pos.x - t.pos.x);
  let best = open[0];
  let bestD = Infinity;
  for (const side of open) {
    const a = t.heading + sideOffset[side];
    const d = Math.abs(Math.atan2(Math.sin(a - toFrom), Math.cos(a - toFrom)));
    if (d < bestD) { bestD = d; best = side; }
  }
  return best;
}

/**
 * Launch a group of pods from `s` at `targetId`. `side` aims at a shield side (an ordered run at a side that is still up
 * is deflected); omitted, the pods aim at the open side nearest. A fight already going on the target makes it a
 * reinforcement. Returns false (and launches nothing) if `cannotBoard`.
 */
export function launchBoarding(b: Battle, s: Ship, targetId: string, side: ShieldSide | undefined, ordered: boolean): boolean {
  const t = shipById(b, targetId);
  const why = cannotBoard(s, t, ordered);
  if (why || !t) {
    if (ordered) lastRefusal = why ?? 'no enemy target';
    return false;
  }
  const st = boarding(b);
  const reinforcing = !!fightOn(b, t.id, s.side);
  const aim = side ?? aimSide(t, s);
  const marines = Math.min(BOARDING.podsPerLaunch * BOARDING.marinesPerPod, spareMarines(s));
  const pods = Math.ceil(marines / BOARDING.marinesPerPod);
  s.marines -= marines;
  const g: PodGroup = {
    id: st.nextId++, side: s.side, from: s.id, target: t.id, aim, pos: v3(s.pos.x, 0, s.pos.z), pods, marines,
    quality: marineQuality(s), phase: 'flying', breachLeft: BOARDING.breachS, pdDone: false, reinforcing, ordered, escorts: null,
    openAtLaunch: ordered && t.open[aim] ? { t: b.t, split: t.split[aim] } : null,
  };
  st.pods.push(g);
  st.lastLaunch[s.id] = b.t;
  b.stats.boardingAttempts++;
  if (!ordered) st.unordered++;
  pushLog(b, { t: round2(b.t), kind: 'boardLaunch', ship: s.id, target: t.id, group: g.id, pods, marines, side: aim, reinforcing, ordered });
  return true;
}

/** Pull back: end `side`'s fight on `targetId`; the boarders still standing get back (BOARDING.pullBackSurvive). */
export function pullBack(b: Battle, side: SideId, targetId: string | undefined): boolean {
  const st = boarding(b);
  const f = st.fights.find((x) => x.side === side && (!targetId || x.target === targetId));
  // Pods still flying at that target turn back too.
  const flying = st.pods.filter((g) => g.side === side && (!targetId || g.target === targetId) && (!f || g.target === f.target));
  if (!f && !flying.length) { lastRefusal = 'nothing to pull back'; return false; }
  for (const g of flying) returnMarines(b, g.from, side, g.marines);
  st.pods = st.pods.filter((g) => !flying.includes(g));
  if (f) {
    const back = f.fight.attackers.strength * BOARDING.pullBackSurvive;
    const total = f.from.reduce((a, x) => a + x.marines, 0) || 1;
    for (const x of f.from) returnMarines(b, x.ship, side, back * x.marines / total);
    st.fights = st.fights.filter((x) => x !== f);
    pushLog(b, { t: round2(b.t), kind: 'boardPullBack', ship: f.target, by: side, returned: Math.round(back) });
  }
  return true;
}

/** Every reason a launch or a pull-back can be refused, as the marine commander would say it (never "not ready"). */
export type BoardRefusal = 'ship not active' | 'no boarding hangar' | 'hangar out' | 'not enough marines' | 'no enemy target'
  | 'flagship: only the admiral leading may board it' | 'out of range' | 'nothing to pull back';
export const REFUSAL_SAY: Record<BoardRefusal, string> = {
  'ship not active': 'That ship is out of the fight.',
  'no boarding hangar': 'No pods aboard. Only a carrier or a capital carries boarding pods.',
  'hangar out': 'The hangar is down. Nothing launches until it is repaired.',
  'not enough marines': 'Not enough marines left to send. We keep a guard aboard.',
  'no enemy target': 'No enemy ship there to board.',
  'flagship: only the admiral leading may board it': 'Only the flagship’s own marines may board their flagship.',
  'out of range': 'Out of range. The pods cannot reach her from here.',
  'nothing to pull back': 'We have no boarders on her to pull back.',
};
/** The last ordered launch or pull-back's refusal, for refused() (set and read within one order() call). */
let lastRefusal: BoardRefusal | null = null;

/**
 * order() logs an order as accepted before its case runs; a board or pull-back that turns out impossible (no hangar,
 * no marines, out of range, nothing to pull back) marks that log entry refused and logs the true reason (PKG-14), which
 * comms' command() hands back to the admiral. Returns false.
 */
export function refused(b: Battle): false {
  const e = b.log[b.log.length - 1];
  if (e && e.kind === 'order') {
    e.ok = false;
    const reason = REFUSAL_SAY[lastRefusal ?? 'no enemy target'];
    pushLog(b, { t: round2(b.t), kind: 'commsRefused', ship: e.ship, order: e.order, reason });
  }
  lastRefusal = null;
  return false;
}

function returnMarines(b: Battle, shipId: string, side: SideId, n: number): void {
  const s = shipById(b, shipId);
  if (s && inField(s.status) && s.side === side) s.marines = Math.min(s.marinesMax, s.marines + n);
}

// ── The per-tick step (one call line in battle.ts step()) ──────────────────────────────────────────────────────────
export function stepBoarding(b: Battle): void {
  if (every(b, BOARDING.thinkS)) for (const s of b.ships) captainBoards(b, s);
  if (!b.boarding) return;
  movePods(b);
  fights(b);
  gunneryDrag(b);
}

function movePods(b: Battle): void {
  const st = boarding(b);
  const keep: PodGroup[] = [];
  for (const g of st.pods) {
    const t = shipById(b, g.target);
    if (!t || !inField(t.status) || t.side === g.side) { returnMarines(b, g.from, g.side, g.marines); continue; }
    if (g.phase === 'breaching') {
      g.pos = v3(t.pos.x, 0, t.pos.z);
      g.breachLeft -= b.dt;
      if (g.breachLeft > 0) { keep.push(g); continue; }
      const hullDmg = Math.max(0, Math.min(t.hullMax * BOARDING.breachHullFrac, t.hull - 1));
      t.hull -= hullDmg;
      pushLog(b, { t: round2(b.t), kind: 'breach', ship: t.id, side: g.aim, group: g.id, marines: Math.round(g.marines), hullDmg: round2(hullDmg) });
      joinFight(b, g, t);
      continue;
    }
    // Flying: aim off the chosen side, close, and take the point defence's shot on the way in.
    const off = forward(t.heading + sideOffset[g.aim]);
    const aimPt = v3(t.pos.x + off.x * BOARDING.standoff, 0, t.pos.z + off.z * BOARDING.standoff);
    const d = dist(g.pos, aimPt);
    const stepM = BOARDING.podSpeed * b.dt;
    if (d > stepM) g.pos = v3(g.pos.x + (aimPt.x - g.pos.x) / d * stepM, 0, g.pos.z + (aimPt.z - g.pos.z) / d * stepM);
    else g.pos = aimPt;
    if (!g.pdDone && dist(g.pos, t.pos) <= BOARDING.pdRange) {
      g.pdDone = true;
      const p = podPdChance(b, g, t); // PKG-25: pdChance × pdKillScale, cut while an escort wing is on the pods
      let lost = 0;
      for (let i = 0; i < g.pods; i++) if (draw(b.rng) < p) lost++;
      if (lost) {
        const n = g.marines * lost / g.pods;
        g.pods -= lost;
        g.marines -= n;
        pushLog(b, { t: round2(b.t), kind: 'boardLost', ship: t.id, group: g.id, pods: lost, n: Math.round(n), p: Math.round(p * 10000) / 10000 });
      }
      if (g.pods <= 0) continue;
    }
    if (d > Math.max(BOARDING.arriveRange, stepM)) { keep.push(g); continue; }
    // Arrived.
    if (g.reinforcing && fightOn(b, t.id, g.side)) { joinFight(b, g, t); continue; }
    const side = sideFacing(t, g.pos);
    // PKG-14 (item 7): a side that was down at launch is still collapsed on arrival, unless re-powered since.
    const o = g.openAtLaunch;
    const repowered = !!o && side === g.aim && t.split[side] > o.split + BOARDING.repowerSplit;
    const collapsed = !!o && side === g.aim && !repowered && b.t - o.t <= BOARDING.collapsedHoldS;
    if (!t.open[side] && !collapsed) {
      pushLog(b, { t: round2(b.t), kind: 'boardDeflected', ship: t.id, side, group: g.id, pods: g.pods, marines: Math.round(g.marines), ...(repowered ? { repowered: true } : {}) });
      returnMarines(b, g.from, g.side, g.marines);
      continue;
    }
    g.aim = side;
    g.phase = 'breaching';
    keep.push(g);
  }
  st.pods = keep;
}

function joinFight(b: Battle, g: PodGroup, t: Ship): void {
  const st = boarding(b);
  const f = fightOn(b, t.id, g.side);
  const force: TroopForce = { strength: g.marines, quality: g.quality };
  if (f) {
    LANCHESTER.reinforce(f.fight, force);
    const c = f.from.find((x) => x.ship === g.from);
    if (c) c.marines += g.marines; else f.from.push({ ship: g.from, marines: g.marines });
    return;
  }
  const d = defenders(t);
  st.fights.push({
    target: t.id, side: g.side, fight: LANCHESTER.start(force, d.force), def: { marines: d.marines, armed: d.armed },
    from: [{ ship: g.from, marines: g.marines }], scuttleRolled: false, nextReport: b.t, startT: b.t,
  });
}

function fights(b: Battle): void {
  const st = boarding(b);
  const keep: BoardFight[] = [];
  for (const f of st.fights) {
    const t = shipById(b, f.target);
    // The ship left the battle some other way (wrecked by gunfire, fled, struck): the boarders aboard are lost.
    if (!t || !inField(t.status) || t.side === f.side) continue;
    const before = f.fight.defenders.strength;
    LANCHESTER.step(f.fight, b.dt * BOARDING.fightTimeScale);
    const r = before > 0 ? f.fight.defenders.strength / before : 0;
    const armedLost = f.def.armed * (1 - r);
    f.def.marines *= r;
    f.def.armed *= r;
    t.marines = f.def.marines;
    t.crew = Math.max(0, t.crew - armedLost);
    if (b.t >= f.nextReport) {
      f.nextReport = b.t + BOARDING.fightReportS;
      pushLog(b, { t: round2(b.t), kind: 'boardFight', ship: t.id, by: f.side, attackers: Math.round(f.fight.attackers.strength), defenders: Math.round(f.fight.defenders.strength) });
    }
    // Scuttle: a losing Fanatic may blow the reactor and take the boarders with it.
    if (!f.scuttleRolled && t.captain.trait === 'Fanatic' && f.fight.outcome !== 'repelled'
      && f.fight.defenders.strength <= f.fight.start.defenders * BOARDING.scuttleAt) {
      f.scuttleRolled = true;
      const roll = draw(b.rng);
      if (roll < BOARDING.scuttleChance) {
        pushLog(b, { t: round2(b.t), kind: 'scuttled', ship: t.id, by: f.side, marinesLost: Math.round(f.fight.attackers.strength), p: BOARDING.scuttleChance, roll: Math.round(roll * 10000) / 10000 });
        t.hull = 0;
        shipOut(b, t, 'wrecked');
        continue;
      }
    }
    if (f.fight.outcome === 'captured') { capture(b, f, t); continue; }
    if (f.fight.outcome === 'repelled') {
      pushLog(b, { t: round2(b.t), kind: 'repelled', ship: t.id, by: f.side, marinesLost: Math.round(f.fight.start.attackers) });
      continue;
    }
    keep.push(f);
  }
  st.fights = st.fights.filter((f) => keep.includes(f));
}

/** Crew pulled off guns while boarded, and a prize's thin crew: both slow the guns (rate of fire × the multiplier). */
function gunneryDrag(b: Battle): void {
  for (const s of b.ships) {
    if (s.status !== 'active') continue;
    let mul = 1;
    if (isBoarded(b, s)) mul *= BOARDING.crewOffGunsMul;
    if (s.prize) mul *= BOARDING.prizeGunneryMul;
    if (mul >= 1) continue;
    for (const g of s.guns) g.cd += b.dt * (1 - mul);
  }
}

/** The gunnery multiplier a ship fights at now (1 = full). For tests and reports. */
export function gunneryMul(b: Battle, s: Ship): number {
  return (isBoarded(b, s) ? BOARDING.crewOffGunsMul : 1) * (s.prize ? BOARDING.prizeGunneryMul : 1);
}

// ── Capture ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function capture(b: Battle, f: BoardFight, t: Ship): void {
  const st = boarding(b);
  const from = t.side;
  const by = f.side;
  const survivors = f.fight.attackers.strength;
  const lead = shipById(b, [...f.from].sort((x, y) => y.marines - x.marines)[0]?.ship);
  pushLog(b, { t: round2(b.t), kind: 'captured', ship: t.id, by, from, marines: Math.round(survivors) });
  st.captured[by]++;
  // The ship strikes and is lost to its side as a ship lost is (morale), then fights for the captor as a prize.
  // PKG-14 measured the per-strength shock (battle.ts lossShock(b, t), PKG-08 request 1) and held it back: on
  // claude/game @ a09724e it moved WORLD-02 check 3 from 9/10 to 7/10 and WORLD-01 check 6 from 8/10 to 6/10, and it
  // fails admiral.test.ts's seed-1 range test. Swapping it in is one line, once Palamedes has re-tuned around it.
  // PKG-16: re-tried under the amended checks; MORALE.captureShockPerStrength picks the shock the sims proved.
  if (MORALE.captureShockPerStrength) lossShock(b, t);
  else for (const o of b.ships) {
    if (o === t || o.status !== 'active') continue;
    if (o.side === from) {
      const loss = dist(o.pos, t.pos) <= MORALE.nearRange ? MORALE.friendLostNear : MORALE.friendLost;
      o.morale = Math.max(0, o.morale - loss * moraleLossMul(o.captain));
    } else o.morale = Math.min(100, o.morale + MORALE.enemyLost);
  }
  if (t.flagship) {
    t.flagship = false;
    for (const o of b.ships) if (o.side === from && inField(o.status)) o.morale = Math.max(0, o.morale - MORALE.flagshipLost);
    pushLog(b, { t: round2(b.t), kind: 'flagshipLost', side: from, ship: t.id, moraleDrop: MORALE.flagshipLost });
  }
  t.side = by;
  t.prize = true;
  t.capturedFrom = from;
  t.status = 'active';
  // ASSUMED: the prize is commanded by a prize master from the ship that sent most of the boarders.
  if (lead) {
    t.captain = {
      ...lead.captain, abilities: { ...lead.captain.abilities }, name: `prize master from ${lead.name}`, trait: 'By-the-book',
    };
  }
  t.crew = t.crewMax * BOARDING.prizeCrewFrac;
  t.marines = survivors;
  t.morale = t.moraleStart = startingMorale(t.captain);
  t.captain.mood = moodOf(t.captain, t.morale);
  t.order = null;
  t.stance = { mode: 'engage', target: null, side: null, present: null, why: 'prize crew' };
  t.asked = [];
  t.spool = 0;
  t.pinned = 0;
  t.lastAttacker = null;
  t.nextThink = b.t + 1;
  // Nobody keeps shooting at a ship that is now their own.
  for (const o of b.ships) {
    if (o.side !== by) continue;
    if (o.stance.target === t.id) o.stance.target = null;
    if (o.order?.target === t.id) o.order = null;
  }
  if (b.sides[by].fleetTarget === t.id) b.sides[by].fleetTarget = null;
  b.requests = b.requests.filter((r) => r.ship !== t.id && r.about !== t.id);
  // Pods of the captor still flying at it turn back on their next move (movePods).
}

/**
 * The captain's estimate: under Lanchester's square law (troops.ts) with both sides breaking at the same share of their
 * start, the boarders win exactly when quality × strength² beats the defenders'. Same answer as troops.ts resolve(),
 * without stepping a fight (a test pins the two together).
 */
export function wouldCapture(a: TroopForce, d: TroopForce): boolean {
  return a.quality * a.strength * a.strength > d.quality * d.strength * d.strength;
}

// ── Captains board on their own ─────────────────────────────────────────────────────────────────────────────────────
/** The Judgement a captain needs to launch unordered, after trait and standing orders. */
export function boardBar(b: Battle, s: Ship): number {
  return BOARDING.selfJudgement + (BOARD_TRAIT[s.captain.trait] ?? 0) - (b.sides[s.side].standing.boarding ? BOARDING.standingBonus : 0);
}

function captainBoards(b: Battle, s: Ship): void {
  if (s.status !== 'active' || !hasHangar(s) || s.stance.mode === 'withdraw') return;
  // Under an attack or focus order a captain may still board the ship they were sent at; other orders rule it out.
  if (s.order && s.order.kind !== 'attack' && s.order.kind !== 'focusSide') return;
  if (!canLaunch(s) || spareMarines(s) < BOARDING.minLaunch) return;
  // PKG-16: a launcher keeps one full boarding party (BOARDING.unorderedKeep) for its admiral's own push; its captain
  // launches on his own only from what is above that.
  if (BOARDING.unorderedKeep > 0 && spareMarines(s) < BOARDING.unorderedKeep + BOARDING.podsPerLaunch * BOARDING.marinesPerPod) return;
  const last = b.boarding?.lastLaunch[s.id];
  if (last !== undefined && b.t - last < BOARDING.cooldownS) return;
  const J = s.captain.abilities.judgement;
  const bar = boardBar(b, s);
  if (J < bar) return;
  const T = s.captain.trait;
  const why = (BOARD_TRAIT[T] ?? 0) < 0 && J < BOARDING.selfJudgement ? T : `Judgement ${J}`;
  const foes = b.ships.filter((t) => t.side !== s.side && !cannotBoard(s, t) && (!s.order || s.order.target === t.id));
  const flying = (t: Ship) => !!b.boarding?.pods.some((g) => g.side === s.side && g.target === t.id);
  // Reinforce a fight our side is losing.
  for (const t of foes) {
    const f = fightOn(b, t.id, s.side);
    if (!f || flying(t)) continue;
    if (f.fight.attackers.strength < BOARDING.reinforceBelow * f.fight.defenders.strength) {
      if (launchBoarding(b, s, t.id, undefined, false)) recordDecision(b, s, `reinforce the boarders on ${t.name}`, why, false);
      return;
    }
  }
  // A new boarding through an open side.
  let pick: Ship | null = null;
  let best = Infinity;
  for (const t of foes) {
    if (!openSides(t).length || fightOn(b, t.id) || flying(t)) continue;
    const d = defenders(t).force.strength;
    // A captain with Judgement 7+ runs the numbers first and does not send marines to a fight they would lose.
    if (J >= 7) {
      const sent = Math.min(BOARDING.podsPerLaunch * BOARDING.marinesPerPod, spareMarines(s));
      if (!wouldCapture({ strength: sent, quality: marineQuality(s) }, defenders(t).force)) continue;
    }
    const score = d + dist(s.pos, t.pos) / 100;
    if (score < best) { best = score; pick = t; }
  }
  if (!pick) return;
  const side = aimSide(pick, s);
  if (launchBoarding(b, s, pick.id, side, false)) recordDecision(b, s, `board ${pick.name} through the open ${side} side`, why, false);
}
