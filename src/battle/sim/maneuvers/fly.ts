/**
 * Flying maneuvers (PKG-10): the `maneuver` order, the preview (ghost line), the per-tick flight, the override and the
 * flag captain's helm order.
 *
 * Rule 1 (the look never changes the result): a flight moves the ship only through the pilot, which keeps the ship's
 * own turn and acceleration limits. Nothing here touches gunnery, shields, morale or the RNG; hit chance stays gunnery ×
 * range × facing, whatever the geometry came from.
 */
import { order } from '../orders';
import { cannotBoard } from '../boarding/boarding';
import { pushLog, round2, shipById, v3 } from '../ships';
import type { Battle, Order, ShieldSide, Ship } from '../types';
import { MAN } from './numbers';
import { limitsOf, pilotStep, startPilot } from './pilot';
import { plan } from './shapes';
import { MANEUVER_NAMES } from './types';
import type { Flight, ManeuverName, ManeuverPreview, ManeuverState, PilotState } from './types';

/** Orders that set a ship's course: any of them breaks off a maneuver in flight (§12b rule 4). */
const COURSE_ORDERS = new Set(['attack', 'focusSide', 'holdPosition', 'followFlagship', 'withdraw']);

/** PKG-06's helm maneuvers, flown as the library's shapes. holdStation is the hold-position order; ram is not built. */
export const HELM_MANEUVER: Record<string, ManeuverName | 'holdPosition' | null> = {
  close: 'broadsidePass', crossBow: 'crossingLine', freshSide: 'defensiveWheel', openRange: 'fightingWithdrawal',
  holdStation: 'holdPosition', ram: null,
};

export const isManeuver = (name: unknown): name is ManeuverName => (MANEUVER_NAMES as unknown[]).includes(name);

export function maneuvers(b: Battle): ManeuverState {
  if (!b.maneuvers) b.maneuvers = { flights: [], logSeen: b.logDropped + b.log.length };
  return b.maneuvers;
}

export const flightOf = (b: Battle, shipId: string): Flight | undefined => b.maneuvers?.flights.find((f) => f.ship === shipId);

function refuseAloud(b: Battle, ship: string, o: Order | null, reason: string): void {
  pushLog(b, { t: round2(b.t), kind: 'commsRefused', ship, order: o, reason });
}

// ── The order ──────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * `order(b, lead, {kind:'maneuver', name, target, side?, group?})`: the lead and its group fly the named maneuver. Every
 * ship that cannot is refused out loud (rule 2). Returns false only if no ship can fly it.
 */
export function startManeuver(b: Battle, lead: Ship, o: Order): boolean {
  const name = o.name;
  if (!isManeuver(name)) {
    markRefused(b);
    refuseAloud(b, lead.id, o, `There is no maneuver called "${name ?? ''}".`);
    return false;
  }
  return fly(b, [lead.id, ...(o.group ?? [])], name, o.target ?? null, o.side ?? null, o, true);
}

/** The order event just logged becomes not-ok (the same as boarding's refused()). */
function markRefused(b: Battle): void {
  const e = b.log[b.log.length - 1];
  if (e && e.kind === 'order') e.ok = false;
}

function fly(b: Battle, ids: string[], name: ManeuverName, target: string | null, side: ShieldSide | null, o: Order, fromOrder: boolean): boolean {
  const p = plan(b, ids, name, target, side);
  if (!p.plans.length && fromOrder) markRefused(b);
  for (const r of p.refused) refuseAloud(b, r.ship, o, `Cannot fly the ${name}: ${r.reason}.`);
  if (!p.plans.length) return false;
  const st = maneuvers(b);
  const pre = previewOf(b, p, name);
  for (const pl of p.plans) {
    const s = shipById(b, pl.ship)!;
    st.flights = st.flights.filter((f) => f.ship !== s.id);
    st.flights.push({ ship: s.id, name, target: p.target, side: p.side, legs: pl.legs, pilot: startPilot(s), t0: b.t });
    s.order = { kind: 'maneuver', name, ...(p.target ? { target: p.target } : {}), ...(p.side ? { side: p.side } : {}) };
    s.stance = { mode: 'engage', target: p.target, side: null, present: s.stance.present, why: 'order' };
    const times = pre.times[s.id];
    pushLog(b, { t: round2(b.t), kind: 'maneuver', ship: s.id, name, target: p.target, phase: 'start', eta: round2(times[times.length - 1] - b.t) });
  }
  return true;
}

// ── The preview (the ghost line) ───────────────────────────────────────────────────────────────────────────────────
/**
 * The path each ship will fly and the time to completion, without changing the battle. It runs the same pilot over the
 * same plotted course the order would, so the flown track is this path (until the ship is damaged, or a new order).
 */
export function previewManeuver(b: Battle, shipIds: string[], name: ManeuverName, target: string | null, side?: ShieldSide | null): ManeuverPreview {
  return previewOf(b, plan(b, shipIds, name, target, side ?? null), name);
}

function previewOf(b: Battle, p: ReturnType<typeof plan>, name: ManeuverName): ManeuverPreview {
  const out: ManeuverPreview = { name, path: {}, times: {}, eta: 0, complete: true, marks: [], refused: p.refused };
  const every = Math.max(1, Math.round(MAN.sampleS / b.dt));
  const maxTicks = Math.round(MAN.maxS / b.dt);
  for (const pl of p.plans) {
    const s = shipById(b, pl.ship)!;
    const L = limitsOf(s, b.dt);
    const pilot: PilotState = startPilot(s);
    const pts = [v3(pilot.pose.x, 0, pilot.pose.z)];
    const ts = [round2(b.t)];
    let k = 0;
    for (; k < maxTicks; k++) {
      const r = pilotStep(pilot, pl.legs, L, b.dt);
      for (let j = 0; j < r.boards.length; j++) out.marks.push({ ship: s.id, kind: 'board', t: round2(b.t + (k + 1) * b.dt), at: v3(pilot.pose.x, 0, pilot.pose.z) });
      if (r.done) break;
      if ((k + 1) % every === 0) { pts.push(v3(pilot.pose.x, 0, pilot.pose.z)); ts.push(round2(b.t + (k + 1) * b.dt)); }
    }
    if (k >= maxTicks) out.complete = false;
    if (ts[ts.length - 1] !== round2(b.t + k * b.dt)) { pts.push(v3(pilot.pose.x, 0, pilot.pose.z)); ts.push(round2(b.t + k * b.dt)); }
    out.path[s.id] = pts;
    out.times[s.id] = ts;
    out.eta = Math.max(out.eta, round2(k * b.dt));
  }
  return out;
}

// ── The flight (one call line in step(), after movement) ───────────────────────────────────────────────────────────
/**
 * Called once per step after standing-orders movement: every ship on a maneuver takes its pose from its pilot instead,
 * one step further along the course. A course order, a broken ship, or a withdrawal breaks the maneuver off; the ship
 * then turns under standing-orders steering, inside the same turn-rate limit (no snap).
 */
export function stepManeuvers(b: Battle): void {
  helmOrders(b);
  const st = b.maneuvers;
  if (!st || !st.flights.length) return;
  const keep: Flight[] = [];
  for (const f of st.flights) {
    const s = shipById(b, f.ship);
    if (!s) continue;
    if (s.status !== 'active' || s.stance.mode === 'withdraw' || (s.order && COURSE_ORDERS.has(s.order.kind))) {
      pushLog(b, { t: round2(b.t), kind: 'maneuver', ship: s.id, name: f.name, target: f.target, phase: 'brokenOff' });
      continue;
    }
    const r = pilotStep(f.pilot, f.legs, limitsOf(s, b.dt), b.dt);
    for (const leg of r.boards) launch(b, s, leg.target, leg.side);
    if (r.done) {
      if (s.order?.kind === 'maneuver') s.order = null;
      pushLog(b, { t: round2(b.t), kind: 'maneuver', ship: s.id, name: f.name, target: f.target, phase: 'done' });
      continue;
    }
    s.pos = v3(f.pilot.pose.x, 0, f.pilot.pose.z);
    s.heading = f.pilot.pose.h;
    s.speed = f.pilot.pose.v;
    keep.push(f);
  }
  st.flights = keep;
}

/** The pods go at the closest point, through PKG-05's `board` order; if they cannot, the captain says why. */
function launch(b: Battle, s: Ship, target: string, side: ShieldSide): void {
  const o: Order = { kind: 'board', target, side };
  const why = cannotBoard(s, shipById(b, target));
  if (!order(b, s.id, o, s.side)) refuseAloud(b, s.id, o, `Pods cannot launch: ${why ?? 'refused'}.`);
}

// ── The flag captain's helm (PKG-06 stores `helm {maneuver}`; this flies it) ───────────────────────────────────────
function helmOrders(b: Battle): void {
  let from: number;
  if (b.maneuvers) from = Math.max(0, b.maneuvers.logSeen - b.logDropped);
  else {
    // No maneuver yet: read back only over the last step (nothing older is new).
    const since = round2(b.t - b.dt);
    from = b.log.length;
    while (from > 0 && b.log[from - 1].t >= since) from--;
  }
  for (let i = from; i < b.log.length; i++) {
    const e = b.log[i];
    if (e.kind !== 'order' || !e.ok || e.order.kind !== 'helm') continue;
    const flag = shipById(b, e.ship);
    const m = e.order.maneuver;
    if (!flag || !m || b.comms?.crew[flag.side].helm !== m) continue;
    const what = HELM_MANEUVER[m];
    maneuvers(b);
    if (what === undefined) continue;
    if (what === null) refuseAloud(b, flag.id, e.order, 'Helm: a ram is not in the maneuver library yet. Holding our course.');
    else if (what === 'holdPosition') order(b, flag.id, { kind: 'holdPosition' }, flag.side);
    else fly(b, [flag.id], what, helmTarget(b, flag), null, e.order, false);
  }
  if (b.maneuvers) b.maneuvers.logSeen = b.logDropped + b.log.length;
}

/** The flag captain flies at what the guns are on, else what the flagship is fighting, else the nearest enemy. */
function helmTarget(b: Battle, flag: Ship): string | null {
  const ok = (id: string | null | undefined) => {
    const t = shipById(b, id);
    return t && t.side !== flag.side && t.status === 'active' ? t.id : null;
  };
  let near: string | null = null;
  let bd = Infinity;
  for (const f of b.ships) {
    if (f.side === flag.side || f.status !== 'active') continue;
    const d = Math.hypot(f.pos.x - flag.pos.x, f.pos.z - flag.pos.z);
    if (d < bd) { bd = d; near = f.id; }
  }
  return ok(b.comms?.crew[flag.side].guns.target) ?? ok(flag.stance.target) ?? near;
}
