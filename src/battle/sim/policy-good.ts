/**
 * PKG-19: `scripted-good` (WORLD-02 check 3), the good plan written in reports/PKG-19.md section 1 before any seed was
 * run. Each move (G1–G9) is marked where it is built. Acts only through `order()`, like every policy (policies.ts), and
 * reads only what the player's side can see: positions, classes, statuses, which ship is their flagship, its own ships,
 * and what its own hits show (`sight`). Numbers: `PLAN_GOOD` in numbers.ts.
 */
import { cannotBoard, fightOn, hasHangar } from './boarding/boarding';
import { fleetLosses } from './losses';
import { CLASS, GUN, PLAN_GOOD } from './numbers';
import { order } from './orders';
import { activeShips, centroid, dist, sideFacing, shipById } from './ships';
import { SHIELD_SIDES, otherSide } from './types';
import type { Battle, Order, ShieldSide, Ship, SideId } from './types';

// ── What this side's own hits show (VISION §7a "Seeing is not knowing") ──────────────────────────────────────────
interface SeenSide { openAt: number; closedAt: number }
interface Sight { read: number; hullDmg: Record<string, number>; sides: Record<string, Record<ShieldSide, SeenSide>> }
interface PlanState { sight: Sight; nextAt: number; focus: string | null; leaveAt: number | null; flagLeft: boolean; nextBoardAt: number }

const states = new WeakMap<Battle, Partial<Record<SideId, PlanState>>>();

export function planState(b: Battle, side: SideId): PlanState {
  let m = states.get(b);
  if (!m) states.set(b, (m = {}));
  return (m[side] ??= { sight: { read: 0, hullDmg: {}, sides: {} }, nextAt: 0, focus: null, leaveAt: null, flagLeft: false, nextBoardAt: 0 });
}

function sidesOf(sg: Sight, id: string): Record<ShieldSide, SeenSide> {
  const never = () => ({ openAt: -1e9, closedAt: -1e9 });
  return (sg.sides[id] ??= { fore: never(), aft: never(), port: never(), starboard: never() });
}

/** Read the log since last time: this side's own shots, and enemy shield sides its own fire took down. */
export function look(b: Battle, side: SideId, sg: Sight): void {
  for (let i = Math.max(0, sg.read - b.logDropped); i < b.log.length; i++) {
    const e = b.log[i];
    if (e.kind === 'shot') {
      if (!e.hit || shipById(b, e.ship)?.side !== side) continue;
      const m = sidesOf(sg, e.target)[e.side];
      if (e.hullDmg > 0) { sg.hullDmg[e.target] = (sg.hullDmg[e.target] ?? 0) + e.hullDmg; m.openAt = e.t; }
      else if (e.shieldDmg > 0 && m.openAt < e.t) m.closedAt = e.t;
    } else if (e.kind === 'shieldDown') {
      const t = shipById(b, e.ship);
      if (t && t.side !== side) sidesOf(sg, e.ship)[e.side].openAt = e.t;
    }
  }
  sg.read = b.logDropped + b.log.length;
}

export function seenOpen(b: Battle, sg: Sight, id: string, k: ShieldSide, forgetS = PLAN_GOOD.openForgetS): boolean {
  const s = sg.sides[id]?.[k];
  return !!s && s.openAt > s.closedAt && b.t - s.openAt <= forgetS;
}

export const sameOrder = (x: Order | null | undefined, o: Order) =>
  !!x && x.kind === o.kind && (x.target ?? null) === (o.target ?? null) && (x.side ?? null) === (o.side ?? null);

/** Give the order unless the ship already has it. */
export function give(b: Battle, side: SideId, s: Ship, o: Order): boolean {
  if (sameOrder(s.order, o)) return false;
  return order(b, s.id, o, side);
}

const leaving = (s: Ship) => s.order?.kind === 'withdraw' || s.stance.mode === 'withdraw';

// ── G1: one target at a time ─────────────────────────────────────────────────────────────────────────────────────
function pickTarget(b: Battle, sg: Sight, line: Ship[], foes: Ship[]): Ship {
  const c = centroid(line)!;
  const effort = (x: Ship) => (CLASS[x.cls].hull * Math.max(0, 1 - (sg.hullDmg[x.id] ?? 0) / CLASS[x.cls].hull) + CLASS[x.cls].shield) / 1000;
  const score = (x: Ship) => (PLAN_GOOD.perKm * dist(c, x.pos)) / 1000 + PLAN_GOOD.effortPerK * effort(x)
    - (SHIELD_SIDES.some((k) => seenOpen(b, sg, x.id, k)) ? PLAN_GOOD.openBonus : 0);
  const reach = foes.filter((x) => dist(c, x.pos) <= GUN.rail.range);
  return [...(reach.length ? reach : foes)].sort((x, y) => score(x) - score(y) || (x.id < y.id ? -1 : 1))[0];
}

/** The open side of `t` our hits have shown, nearest to `from` first; null when none is known open. */
function openSideOf(b: Battle, sg: Sight, t: Ship, from: Ship): ShieldSide | null {
  const facing = sideFacing(t, from.pos);
  if (seenOpen(b, sg, t.id, facing)) return facing;
  return SHIELD_SIDES.find((k) => seenOpen(b, sg, t.id, k)) ?? null;
}

// ── G5 / G6: board through a side confirmed open, with no escort covering it ──────────────────────────────────────
function boardIfOpen(b: Battle, side: SideId, sg: Sight, l: Ship, t: Ship, foes: Ship[]): void {
  if (cannotBoard(l, t, true) !== null) return;
  const k = openSideOf(b, sg, t, l);
  if (!k) return;
  const covered = foes.some((e) => e.cls === 'escort' && e.id !== t.id && dist(e.pos, t.pos) <= PLAN_GOOD.laneClearM);
  // Reinforcing a fight already aboard needs no clear lane to start it, only the side still open (battle 1, 5:10).
  if (covered && !fightOn(b, t.id, side)) return;
  order(b, l.id, { kind: 'board', target: t.id, side: k }, side);
}

export function scriptedGood(b: Battle, side: SideId): void {
  const st = planState(b, side);
  look(b, side, st.sight);
  if (b.t + 1e-9 < st.nextAt) return;
  st.nextAt = b.t + PLAN_GOOD.everyS;
  const own = activeShips(b, side);
  const foes = activeShips(b, otherSide(side)); // G7: only active ships are ever targeted
  if (!own.length || !foes.length) return;
  const flag = shipById(b, b.sides[side].flagshipId);

  // G9: leave before anything breaks.
  if (st.leaveAt === null && b.t >= PLAN_GOOD.leaveNotBeforeS) {
    const mine = fleetLosses(b, side).frac;
    const theirs = fleetLosses(b, otherSide(side)).frac;
    if (mine >= PLAN_GOOD.leaveAtLossFrac && mine - theirs >= PLAN_GOOD.leaveBehindBy) st.leaveAt = b.t;
  }
  if (st.leaveAt !== null) {
    for (const s of own) if (!s.flagship && !leaving(s)) give(b, side, s, { kind: 'withdraw' });
    // "then the flagship": on the next order tick after the fleet's.
    if (flag && flag.status === 'active' && b.t > st.leaveAt + 1e-9 && !leaving(flag)) give(b, side, flag, { kind: 'withdraw' });
    return;
  }

  const free = own.filter((s) => !leaving(s));
  const line = free.filter((s) => s.cls !== 'escort');
  const escorts = free.filter((s) => s.cls === 'escort');

  // G1: hold the focus until it leaves the field.
  const cur = shipById(b, st.focus);
  const tgt = cur && cur.status === 'active' ? cur : pickTarget(b, st.sight, line.length ? line : own, foes);
  st.focus = tgt.id;

  // G2 + G4: the whole line, flagship included, fires from where it stands.
  for (const s of line) give(b, side, s, { kind: 'attack', target: tgt.id });
  // G3: escorts keep their screen.
  for (const s of escorts) give(b, side, s, { kind: 'followFlagship' });

  // G5: launchers other than the flagship board the focus through a side seen open.
  for (const l of line) if (!l.flagship && hasHangar(l)) boardIfOpen(b, side, st.sight, l, tgt, foes);
  // G6: the admiral leads the boarding of their flagship once a side of it is seen open.
  const theirFlag = shipById(b, b.sides[otherSide(side)].flagshipId);
  if (flag && flag.status === 'active' && !leaving(flag) && theirFlag && theirFlag.status === 'active') {
    boardIfOpen(b, side, st.sight, flag, theirFlag, foes);
  }
}
