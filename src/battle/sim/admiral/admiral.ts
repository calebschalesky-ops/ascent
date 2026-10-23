/**
 * The AI admiral's operations layer (PKG-07; VISION §9). It is a controller on its side's slot, the same slot a player
 * policy uses, and it acts ONLY through `order()` with the player's order kinds.
 *
 * What it reads. The sim does not yet separate a side's sensor picture from the true state, so the admiral restricts
 * itself by hand to what its own side can see:
 * - enemy ships: position, heading, class, status, which one is the flagship;
 * - hits seen: its own side's shot events (a hit that reached the hull means that side is open; a hit absorbed by a
 *   shield means it is closed) and the collapse of an enemy shield side (only its own fire can cause one);
 * - its own ships: everything (its own captains, morale, hull, systems).
 * It never reads an enemy ship's shield values, hull, morale, systems or captain.
 *
 * Styles: `jupiter` (methodical range, the setup's enemy), `mars` (the aggressive control for WORLD-02 check 7: every
 * ship, escorts too, attacks the nearest enemy), `good` (the scripted-good player policy for check 3: Jupiter's focus and
 * boarding, flagship held back, no withdrawals, no delay). `bad` is the scripted-bad player policy (check 4).
 */
import { cannotBoard } from '../boarding/boarding';
import { BOARDING } from '../boarding/numbers';
import { breakThreshold } from '../captains';
import { fleetLosses } from '../losses';
import { CLASS, GUN, MORALE, STRENGTH, sideOffset } from '../numbers';
import { order } from '../orders';
import { draw } from '../rng';
import { activeShips, bearing, centroid, dist, pushLog, round2, shipById, sideFacing } from '../ships';
import { ORDER_KINDS, SHIELD_SIDES, otherSide } from '../types';
import type { Battle, Order, ShieldSide, Ship, SideId } from '../types';
import { DIFFICULTY, JUPITER, OPS, OPS_LOG_CAP, PHASE_A_DIFFICULTY, SCRIPTED, SENSE, TARGET, TELEGRAPH } from './numbers';
import { newAdmiralState } from './state';
import type { AdmiralState, AdmiralStyle, Push, SeenShip } from './state';
import { FIGHTERS } from '../fighters/numbers'; // PKG-25

type Controller = (b: Battle, side: SideId) => void;

const deg = 180 / Math.PI;
const OPPOSITE: Record<ShieldSide, ShieldSide> = { fore: 'aft', aft: 'fore', port: 'starboard', starboard: 'port' };
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** True once the boarding package has added `board` to the player's order set. */
export const boardOrderExists = () => (ORDER_KINDS as readonly string[]).includes('board');

function note(b: Battle, a: AdmiralState, text: string): void {
  const last = a.opsLog[a.opsLog.length - 1];
  if (last && last.slice(last.indexOf(' ') + 1) === text) return; // the same call again: one line is enough
  if (a.opsLog.length < OPS_LOG_CAP) a.opsLog.push(`${clock(b.t)} ${text}`);
}

function stateOf(b: Battle, side: SideId, style: AdmiralStyle, difficulty: string): AdmiralState {
  const st = b.sides[side];
  if (!st.admiral) st.admiral = newAdmiralState(style, difficulty);
  return st.admiral;
}

// ── Sensors: only what this side's own hits show ──────────────────────────────────────────────────────────────────
function seenOf(a: AdmiralState, id: string): SeenShip {
  let m = a.seen[id];
  if (!m) {
    const never = () => ({ openAt: -1e9, closedAt: -1e9 });
    m = a.seen[id] = { hullDmg: 0, sides: { fore: never(), aft: never(), port: never(), starboard: never() } };
  }
  return m;
}

function sense(b: Battle, side: SideId, a: AdmiralState): void {
  for (let i = Math.max(0, a.logRead - b.logDropped); i < b.log.length; i++) {
    const e = b.log[i];
    if (e.kind === 'shot') {
      const shooter = shipById(b, e.ship);
      if (!shooter || shooter.side !== side) continue;
      a.shotRangeSum += e.range;
      a.shotN++;
      if (!e.hit) continue;
      const m = seenOf(a, e.target);
      if (e.hullDmg > 0) { m.hullDmg += e.hullDmg; m.sides[e.side].openAt = e.t; }
      else if (e.shieldDmg > 0 && m.sides[e.side].openAt < e.t) m.sides[e.side].closedAt = e.t;
    } else if (e.kind === 'shieldDown') {
      const t = shipById(b, e.ship);
      if (t && t.side !== side) seenOf(a, e.ship).sides[e.side].openAt = e.t;
    } else if ((e as { kind: string }).kind === 'boardLaunch') {
      // The boarding package's launch event: the moment boarders actually leave (WORLD-02 check 6).
      const ev = e as unknown as Record<string, unknown>;
      for (const p of a.pushes) {
        if (p.status !== 'launched' || p.launchEventAt !== null || p.launchedAt === null || (ev.t as number) < p.launchedAt) continue;
        if (p.launchers.some((id) => Object.values(ev).includes(id))) p.launchEventAt = ev.t as number;
      }
    }
  }
  a.logRead = b.logDropped + b.log.length;
}

function seenOpen(b: Battle, a: AdmiralState, id: string, side: ShieldSide): boolean {
  const s = a.seen[id]?.sides[side];
  return !!s && s.openAt > s.closedAt && b.t - s.openAt <= SENSE.openForgetS;
}

/** Hull fraction left, as estimated from the hull damage this side has seen its own hits do. */
const estHull = (a: AdmiralState, f: Ship) => Math.max(0, 1 - (a.seen[f.id]?.hullDmg ?? 0) / CLASS[f.cls].hull);

// ── Orders: every one goes through order(), counted ───────────────────────────────────────────────────────────────
function issue(b: Battle, side: SideId, a: AdmiralState, shipId: string, o: Order): boolean {
  const ok = order(b, shipId, o, side);
  a.issued++;
  a.kinds[o.kind] = (a.kinds[o.kind] ?? 0) + 1;
  if (!ok) a.refused++;
  return ok;
}

const sameOrder = (x: Order | null | undefined, o: Order) =>
  !!x && x.kind === o.kind && (x.target ?? null) === (o.target ?? null) && (x.side ?? null) === (o.side ?? null);

/** Queue an order behind the reaction delay (or issue it now with none). Skips an order the ship already has or awaits. */
function queue(b: Battle, side: SideId, a: AdmiralState, ship: Ship, o: Order, why: string): void {
  if (sameOrder(ship.order, o)) return;
  const waiting = a.pending.find((p) => p.ship === ship.id);
  if (waiting && sameOrder(waiting.order, o)) return;
  a.pending = a.pending.filter((p) => p.ship !== ship.id);
  const delay = DIFFICULTY[a.difficulty].reactionDelayS;
  if (delay <= 0) { issue(b, side, a, ship.id, o); return; }
  a.pending.push({ at: b.t + delay, ship: ship.id, order: o, why });
}

function flushPending(b: Battle, side: SideId, a: AdmiralState): void {
  if (!a.pending.length) return;
  const keep = [];
  for (const p of a.pending) {
    if (b.t + 1e-9 < p.at) { keep.push(p); continue; }
    issue(b, side, a, p.ship, p.order);
  }
  a.pending = keep;
}

const withdrawing = (a: AdmiralState, s: Ship) =>
  s.order?.kind === 'withdraw' || s.stance.mode === 'withdraw' || a.pending.some((p) => p.ship === s.id && p.order.kind === 'withdraw');

const launchers = (b: Battle, side: SideId) =>
  activeShips(b, side).filter((s) => (s.cls === 'capital' || s.cls === 'carrier') && s.systems.hangar > 0);

// ── Engagement range (WORLD-02 check 7) ───────────────────────────────────────────────────────────────────────────
function sampleRange(b: Battle, side: SideId, a: AdmiralState): void {
  if (b.sides.player.broken || b.sides.enemy.broken) return;
  const foes = activeShips(b, otherSide(side));
  if (!foes.length) return;
  for (const s of activeShips(b, side)) {
    if (withdrawing(a, s)) continue;
    let d = Infinity;
    for (const f of foes) d = Math.min(d, dist(s.pos, f.pos));
    if (d <= GUN.rail.range) { a.rangeSum += d; a.rangeN++; }
  }
}

// ── The withdrawal watch: pull a ship before it breaks (Jupiter) ──────────────────────────────────────────────────
function watch(b: Battle, side: SideId, a: AdmiralState): void {
  const own = activeShips(b, side);
  // PKG-13 (PKG-08 request 2): the break rule's own measure, strength-weighted. A ship already ordered out but still in
  // the field is counted as the withdrawal it is about to be.
  const l = fleetLosses(b, side);
  const leaving = own.filter((x) => withdrawing(a, x)).reduce((t, x) => t + STRENGTH[x.cls] * MORALE.withdrawnLossFrac, 0);
  for (const s of own) {
    if (s.flagship || withdrawing(a, s)) continue;
    if (a.withdrawn.length >= JUPITER.maxWithdrawals && !a.withdrawn.includes(s.id)) continue;
    const after = l.startStrength > 0 ? (l.strengthLost + leaving + STRENGTH[s.cls] * MORALE.withdrawnLossFrac) / l.startStrength : 0;
    if (after >= MORALE.sideBreakStrength) continue; // a withdrawal that would break the side is worse than the ship breaking
    const margin = s.morale - breakThreshold(s.captain);
    const hull = s.hull / s.hullMax;
    if (margin < JUPITER.withdrawMoraleMargin || hull < JUPITER.withdrawHullFrac) {
      // A captain's own timeout decision (cover) can cancel a withdraw order; the admiral then repeats it.
      if (!a.withdrawn.includes(s.id)) a.withdrawn.push(s.id);
      note(b, a, `withdraw ${s.name} (morale ${Math.round(s.morale)}, ${Math.round(margin)} above breaking; hull ${Math.round(hull * 100)}%)`);
      queue(b, side, a, s, { kind: 'withdraw' }, 'before it breaks');
    }
  }
}

// ── Range keeping: a line ship being closed on engages the closer ship, which backs it off to its range (Jupiter) ──
const nearestFoe = (s: Ship, foes: Ship[]) => {
  let best: Ship | null = null;
  let bd = Infinity;
  for (const f of foes) { const d = dist(s.pos, f.pos); if (d < bd) { bd = d; best = f; } }
  return { foe: best, d: bd };
};
const inPush = (a: AdmiralState, s: Ship) =>
  !!a.push && (a.push.status === 'planned' || a.push.status === 'telegraph') && a.push.launchers.includes(s.id);

function keepRange(b: Battle, side: SideId, a: AdmiralState): void {
  const foes = activeShips(b, otherSide(side));
  if (!foes.length) return;
  for (const s of activeShips(b, side)) {
    if (s.cls === 'escort' || withdrawing(a, s) || inPush(a, s)) continue;
    const { foe, d } = nearestFoe(s, foes);
    if (!foe || d >= JUPITER.minRangeM) continue;
    if (s.order?.kind === 'attack' && s.order.target === foe.id) continue;
    if (a.pending.some((p) => p.ship === s.id && p.order.kind === 'attack' && p.order.target === foe.id)) continue;
    note(b, a, `${s.name}: ${foe.name} inside ${Math.round(d)} m, engage it and hold the range`);
    queue(b, side, a, s, { kind: 'attack', target: foe.id }, 'keep the range');
  }
}

// ── Operations: what to break, where to attack, when to commit boarders ───────────────────────────────────────────
function ops(b: Battle, side: SideId, a: AdmiralState): void {
  const own = activeShips(b, side);
  const foes = activeShips(b, otherSide(side));
  if (!own.length || !foes.length) return;
  const free = own.filter((s) => !withdrawing(a, s));
  const line = free.filter((s) => s.cls !== 'escort');
  const escorts = free.filter((s) => s.cls === 'escort');
  const c = centroid(line.length ? line : own)!;

  if (a.style === 'mars') {
    let t = foes[0];
    for (const f of foes) if (dist(c, f.pos) < dist(c, t.pos)) t = f;
    if (a.focus?.target !== t.id) note(b, a, `all ships close on ${t.name} (nearest)`);
    a.focus = { target: t.id, side: sideFacing(t, c), since: b.t };
    // PKG-13: Mars goes round to the far side of what it closes on (focusSide), so its ships fly in through the enemy's
    // laser range instead of halting at their preferred range as an attack order does: the brawling control for check 7.
    const far = OPPOSITE[sideFacing(t, c)];
    for (const s of free) queue(b, side, a, s, { kind: 'focusSide', target: t.id, side: far }, 'close the range');
    return;
  }

  // What to break: one side of one ship, held until that ship leaves the field.
  let f = a.focus;
  const cur = shipById(b, f?.target);
  if (!f || !cur || cur.status !== 'active') {
    // Effort to break it, from the class numbers (the rules, public) and the hull damage seen; shields assumed full.
    const effort = (x: Ship) => (CLASS[x.cls].hull * estHull(a, x) + CLASS[x.cls].shield) / 1000;
    const score = (x: Ship) => (TARGET.perKm * dist(c, x.pos)) / 1000 + TARGET.effortPerK * effort(x)
      - (SHIELD_SIDES.some((k) => seenOpen(b, a, x.id, k)) ? TARGET.openBonus : 0);
    // Methodical range: only what the line can reach from where it stands (railgun range of its centre), when anything is.
    const reach = foes.filter((x) => dist(c, x.pos) <= GUN.rail.range);
    const ranked = [...(reach.length ? reach : foes)].sort((x, y) => score(x) - score(y) || (x.id < y.id ? -1 : 1));
    let pick = ranked[0];
    const rate = DIFFICULTY[a.difficulty].mistakeRate;
    if (rate > 0 && ranked.length > 1 && draw(b.rng) < rate) {
      pick = ranked[1];
      a.mistakes++;
      note(b, a, `mistake: takes ${pick.name} over the better target ${ranked[0].name}`);
    }
    f = { target: pick.id, side: sideFacing(pick, c), since: b.t };
    note(b, a, `focus ${pick.name} (${pick.cls}), ${f.side} side`);
  }
  const tgt = shipById(b, f.target)!;
  // Keep the focus side while it faces our line; one that has swung away would pull the line round the target and
  // into close range, so the line takes whichever side now faces it (methodical range over the chosen side).
  const facesUs = (k: ShieldSide) => Math.cos(bearing(tgt.pos, c) - (tgt.heading + sideOffset[k])) > 0;
  const openNow = (k: ShieldSide) => seenOpen(b, a, tgt.id, k) && facesUs(k);
  const open = openNow(f.side) ? f.side : SHIELD_SIDES.find(openNow);
  if (open && open !== f.side) {
    note(b, a, `${tgt.name}'s ${open} side seen open: shift the focus to it`);
    f = { ...f, side: open };
  } else if (!open && !facesUs(f.side)) {
    const now = sideFacing(tgt, c);
    note(b, a, `${tgt.name} has turned: focus its ${now} side, the one facing the line`);
    f = { ...f, side: now };
  }
  a.focus = f;

  // Where to attack: the line on the focus side, at its captains' ranges (railgun range); escorts screen.
  const pushing = !!a.push && (a.push.status === 'planned' || a.push.status === 'telegraph');
  for (const s of line) {
    if (pushing && a.push!.launchers.includes(s.id)) continue;
    if (a.style === 'jupiter' && nearestFoe(s, foes).d < JUPITER.minRangeM + JUPITER.rangeHysteresisM) continue; // still keeping the range
    if (a.style === 'good' && s.flagship) { queue(b, side, a, s, { kind: 'holdPosition' }, 'protect the flagship'); continue; }
    // Jupiter's line attacks from where it stands: an attack order backs a captain off to its preferred range, and a
    // line standing together hits the side of the target that faces it (the focus side). focusSide would send each ship
    // round to a point off that side, through the enemy's laser range (measured: PKG-07 report, check 7 history).
    if (a.style === 'jupiter') queue(b, side, a, s, { kind: 'attack', target: tgt.id }, 'focus');
    else queue(b, side, a, s, { kind: 'focusSide', target: tgt.id, side: f.side }, 'focus');
  }
  if (!pushing) {
    for (const s of escorts) if (s.order && s.order.kind !== 'followFlagship') queue(b, side, a, s, { kind: 'followFlagship' }, 'screen the flagship');
  }

  // When to commit boarders: the focus side seen open, no enemy escort near it, a launcher to send.
  if (a.style === 'jupiter') {
    if (!a.push && b.t >= a.nextPushAt) jupiterPush(b, side, a, foes, tgt, open && open === f.side ? open : null);
  } else if (!a.push && b.t >= a.nextPushAt && open && open === f.side) {
    const screen = foes.filter((x) => x.cls === 'escort' && dist(x.pos, tgt.pos) <= JUPITER.laneClearM);
    const ls = launchers(b, side).filter((s) => !withdrawing(a, s));
    if (screen.length) note(b, a, `${tgt.name}'s ${open} side is open but ${screen.length} escort(s) cover it: no push`);
    else if (ls.length) {
      a.push = {
        target: tgt.id, side: open, decidedAt: b.t, telegraphAt: null, launchDue: null, status: 'planned', launchedAt: null,
        launchEventAt: null, launchers: ls.map((s) => s.id), boardOrdersOk: 0, escortStartM: null, escortsCloserM: null,
        capitalStartHeading: {}, capitalTurnDeg: null, abortReason: null,
      };
      note(b, a, `boarding push decided: ${tgt.name}'s ${open} side, launchers ${ls.map((s) => s.name).join(', ')}`);
    }
  }
}

/**
 * Jupiter's boarding push (PKG-13, PKG-08 request 4; pillar 3: a Jupiter admiral still boards, methodically).
 * - A target it may board: not their flagship (NAVY §3), with a side this side has seen open, within launch reach of at
 *   least one of its launchers (positions and the flagship are public; the boarding rules are the player's rules too).
 * - Its lane is clear when no enemy escort other than the target itself is within `laneClearM` of the target. (Before
 *   PKG-13 the target counted as its own screen, so an escort focus could never be boarded: the 3 no-push seeds.)
 * - Before `pushDecisionS`, or once a push has gone in, only the focus side is boarded. Past it with no push yet, any
 *   open, clear, reachable side will do, the focus first and then the nearest to the line.
 */
function jupiterPush(b: Battle, side: SideId, a: AdmiralState, foes: Ship[], tgt: Ship, focusOpen: ShieldSide | null): void {
  const ls = launchers(b, side).filter((s) => !withdrawing(a, s));
  if (!ls.length) return;
  const reachM = BOARDING.launchRange * JUPITER.launchReachFrac;
  const late = b.t >= JUPITER.pushDecisionS && !a.pushes.some((p) => p.status === 'launched');
  const c = centroid(ls)!;
  const pool: { x: Ship; sides: ShieldSide[] }[] = [];
  if (focusOpen) pool.push({ x: tgt, sides: [focusOpen] });
  if (late) {
    const rest = foes.filter((x) => x.id !== tgt.id).sort((x, y) => dist(c, x.pos) - dist(c, y.pos) || (x.id < y.id ? -1 : 1));
    for (const x of [tgt, ...rest]) pool.push({ x, sides: SHIELD_SIDES.filter((k) => seenOpen(b, a, x.id, k)) });
  }
  let covered: string | null = null;
  for (const { x, sides } of pool) {
    if (!sides.length || x.flagship) continue;
    // The player's own boarding rules (cannotBoard: marines to spare, hangar up, not their flagship), read, not changed.
    const reach = ls.filter((l) => dist(l.pos, x.pos) <= reachM && cannotBoard(l, x) === null);
    if (!reach.length) continue;
    const screen = foes.filter((e) => e.cls === 'escort' && e.id !== x.id && dist(e.pos, x.pos) <= JUPITER.laneClearM);
    if (screen.length) { covered ??= `${x.name}'s ${sides[0]} side is open but ${screen.length} escort(s) cover it: no push`; continue; }
    a.push = {
      target: x.id, side: sides[0], decidedAt: b.t, telegraphAt: null, launchDue: null, status: 'planned', launchedAt: null,
      launchEventAt: null, launchers: reach.map((s) => s.id), boardOrdersOk: 0, escortStartM: null, escortsCloserM: null,
      capitalStartHeading: {}, capitalTurnDeg: null, abortReason: null,
    };
    note(b, a, `boarding push decided: ${x.name}'s ${sides[0]} side${x.id === tgt.id ? '' : ' (not the focus: no push yet)'}, launchers ${reach.map((s) => s.name).join(', ')}`);
    return;
  }
  if (covered) note(b, a, covered);
}

/** The telegraph showed (WORLD-02 check 6, BATTLE-RULES rule 8): escorts measurably closer, or a launcher measurably turned. */
const telegraphSeen = (p: Push) =>
  (p.escortsCloserM ?? 0) >= TELEGRAPH.minEscortCloseM || (p.capitalTurnDeg ?? 0) >= TELEGRAPH.minCapitalTurnDeg;

const meanEscortRange = (escorts: Ship[], t: Ship) =>
  escorts.length ? escorts.reduce((s, e) => s + dist(e.pos, t.pos), 0) / escorts.length : null;

/** The boarding push: telegraph (escorts forward, capitals turning), then launch `telegraphLeadS` later. */
function pushTick(b: Battle, side: SideId, a: AdmiralState): void {
  const p = a.push;
  if (!p) return;
  const tgt = shipById(b, p.target);
  const lead = a.style === 'good' ? 0 : JUPITER.telegraphLeadS;
  const finish = (status: Push['status'], reason: string | null) => {
    p.status = status;
    p.abortReason = reason;
    a.pushes.push(p);
    a.push = null;
    // PKG-13: a Jupiter push called off before its boarders left may be tried again sooner.
    a.nextPushAt = b.t + (a.style === 'jupiter' && status === 'aborted' ? JUPITER.abortCooldownS : JUPITER.pushCooldownS);
  };
  if (p.status === 'planned') {
    if (b.t + 1e-9 < p.decidedAt + DIFFICULTY[a.difficulty].reactionDelayS) return;
    if (!tgt || tgt.status !== 'active') { note(b, a, 'push called off: target gone'); finish('aborted', 'target gone'); return; }
    const escorts = activeShips(b, side).filter((s) => s.cls === 'escort' && !withdrawing(a, s));
    for (const s of escorts) issue(b, side, a, s.id, { kind: 'attack', target: tgt.id });
    // PKG-25: fighters forward with the telegraph (VISION §9), through fighter command: the player's own order. Off
    // until re-balanced (FIGHTERS.admiralEscortsPush).
    const flag = shipById(b, b.sides[side].flagshipId);
    if (FIGHTERS.admiralEscortsPush && flag?.status === 'active' && b.fighters?.orders[side].task !== 'escort') issue(b, side, a, flag.id, { kind: 'fighters', task: 'escort' });
    for (const id of p.launchers) {
      const s = shipById(b, id);
      if (!s || s.status !== 'active') continue;
      p.capitalStartHeading[id] = s.heading;
      issue(b, side, a, id, { kind: 'focusSide', target: tgt.id, side: p.side });
    }
    p.escortStartM = meanEscortRange(escorts, tgt);
    p.telegraphAt = round2(b.t);
    p.launchDue = b.t + lead;
    p.status = 'telegraph';
    pushLog(b, { t: round2(b.t), kind: 'telegraph', side, target: tgt.id, targetSide: p.side, launchAt: round2(b.t + lead) });
    note(b, a, `TELEGRAPH: escorts forward on ${tgt.name}, ${p.launchers.length} launcher(s) turning to its ${p.side} side; boarders in ${lead} s`);
  }
  if (p.status === 'telegraph' && b.t + 1e-9 >= p.launchDue!) {
    const escorts = activeShips(b, side).filter((s) => s.cls === 'escort' && !withdrawing(a, s));
    if (tgt) {
      const now = meanEscortRange(escorts, tgt);
      p.escortsCloserM = p.escortStartM !== null && now !== null ? Math.round(p.escortStartM - now) : null;
    }
    let turn = 0;
    for (const [id, h0] of Object.entries(p.capitalStartHeading)) {
      const s = shipById(b, id);
      if (s) turn = Math.max(turn, Math.abs(Math.atan2(Math.sin(s.heading - h0), Math.cos(s.heading - h0))) * deg);
    }
    p.capitalTurnDeg = Math.round(turn);
    if (!tgt || tgt.status !== 'active') { note(b, a, 'push called off: target gone'); finish('aborted', 'target gone'); return; }
    if (!seenOpen(b, a, tgt.id, p.side)) { note(b, a, `push called off: ${tgt.name}'s ${p.side} side closed again`); finish('aborted', 'side closed'); return; }
    // PKG-13 (PKG-08 request 3): boarders never go without a telegraph the player could have seen. Hold them while the
    // move has not yet shown; if it still has not after `telegraphHoldS`, there is no push.
    if (a.style !== 'good' && !telegraphSeen(p)) {
      if (b.t + 1e-9 < p.launchDue! + JUPITER.telegraphHoldS) return;
      note(b, a, `push called off: the telegraph did not show (escorts ${p.escortsCloserM ?? '-'} m closer, launchers turned ${p.capitalTurnDeg} deg)`);
      finish('aborted', 'telegraph not seen');
      return;
    }
    p.launchedAt = round2(b.t);
    if (!boardOrderExists()) {
      note(b, a, `would launch boarders at ${tgt.name}'s ${p.side} side (no board order in this build)`);
      finish('no-board-order', null);
      return;
    }
    const why: string[] = [];
    for (const id of p.launchers) {
      const no = cannotBoard(shipById(b, id), tgt);
      // `board` comes from the boarding package (PKG-05): { kind: 'board', target, side }.
      if (issue(b, side, a, id, { kind: 'board', target: tgt.id, side: p.side } as unknown as Order)) p.boardOrdersOk++;
      else if (no) why.push(`${shipById(b, id)?.name ?? id}: ${no}`);
    }
    note(b, a, `BOARD: ${p.boardOrdersOk} of ${p.launchers.length} launcher(s) send boarders at ${tgt.name}'s ${p.side} side${why.length ? ` (refused: ${why.join('; ')})` : ''}`);
    // PKG-13: a push whose every board order was refused launched nothing; check 6 counts only boarders that went.
    if (!p.boardOrdersOk) { p.launchedAt = null; finish('aborted', 'board refused'); return; }
    finish('launched', null);
  }
}

// ── The controllers ───────────────────────────────────────────────────────────────────────────────────────────────
export function admiral(style: AdmiralStyle, difficulty = PHASE_A_DIFFICULTY): Controller {
  return (b, side) => {
    const a = stateOf(b, side, style, difficulty);
    sense(b, side, a);
    flushPending(b, side, a);
    sampleRange(b, side, a);
    pushTick(b, side, a);
    if (style === 'jupiter' && b.t + 1e-9 >= a.nextWatch) { keepRange(b, side, a); watch(b, side, a); a.nextWatch = b.t + OPS.watchEveryS; }
    if (b.t + 1e-9 >= a.nextOps) { ops(b, side, a); a.nextOps = b.t + OPS.everyS; }
  };
}

/**
 * scripted-bad (WORLD-02 check 4): split fire across all targets, board into closed shields, send the flagship forward
 * alone against theirs.
 */
export const scriptedBad: Controller = (b, side) => {
  const a = stateOf(b, side, 'bad', 'script');
  sense(b, side, a);
  sampleRange(b, side, a);
  const own = activeShips(b, side);
  const foes = activeShips(b, otherSide(side)).sort((x, y) => (x.id < y.id ? -1 : 1));
  if (!own.length || !foes.length) return;
  if (b.t + 1e-9 >= a.nextOps) {
    a.nextOps = b.t + OPS.everyS;
    const theirFlag = shipById(b, b.sides[otherSide(side)].flagshipId);
    let i = 0;
    for (const s of own) {
      if (s.flagship) {
        const t = theirFlag && theirFlag.status === 'active' ? theirFlag : foes[0];
        queue(b, side, a, s, { kind: 'attack', target: t.id }, 'flagship forward alone');
        continue;
      }
      queue(b, side, a, s, { kind: 'attack', target: foes[i++ % foes.length].id }, 'split fire');
    }
  }
  if (boardOrderExists() && b.t + 1e-9 >= a.nextPushAt) {
    a.nextPushAt = b.t + SCRIPTED.badBoardEveryS;
    for (const l of launchers(b, side)) {
      let t = foes[0];
      for (const f of foes) if (dist(l.pos, f.pos) < dist(l.pos, t.pos)) t = f;
      const facing = sideFacing(t, l.pos);
      const closed = seenOpen(b, a, t.id, facing) ? SHIELD_SIDES.find((k) => !seenOpen(b, a, t.id, k)) ?? facing : facing;
      issue(b, side, a, l.id, { kind: 'board', target: t.id, side: closed } as unknown as Order);
      note(b, a, `board ${t.name}'s ${closed} side (closed)`);
    }
  }
};

/** The controllers this package registers (HOUSE-RULES rule 9: policy entries in policies.ts). */
export const ADMIRAL_POLICIES: Record<string, Controller> = {
  'admiral-jupiter': admiral('jupiter'),
  'aggressive-admiral': admiral('mars'),
  'scripted-good': admiral('good', 'script'),
  'scripted-bad': scriptedBad,
};
