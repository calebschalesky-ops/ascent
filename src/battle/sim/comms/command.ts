/**
 * The admiral's side of comms (BRIDGE §4–§6, VISION §8): direct orders paced by command points, captains who protest
 * or refuse out loud, the all-hands broadcast, and asking a captain for a report. Everything ends in `order()`.
 */
import { order } from '../orders';
import { draw } from '../rng';
import { shipById } from '../ships';
import type { Battle, Order, Ship, SideId } from '../types';
import { addReport, captainSpeaker, comms, logRefusal, officerLine, officerSpeaker, reportedHull, say, status, timeoutFor } from './core';
import { DOING } from './lines';
import { POINTS, PUSHBACK } from './numbers';
import { isOfficerKind, shieldReply } from './officers';
import { standShieldOrder } from './standing';
import { ans } from './tick';
import type { CommandResult } from './types';

const no = (reason: string): CommandResult => ({ ok: false, reason, protest: null });

/** Spend command points, or refuse with the reason said out loud by the flag lieutenant. */
function spend(b: Battle, side: SideId, cost: number, ship: string, o: Order | null): string | null {
  const c = comms(b);
  if (c.points[side] + 1e-9 >= cost) {
    c.points[side] -= cost;
    return null;
  }
  const reason = officerLine(c, 'noPoints', { cost, have: Math.floor(c.points[side] * 10) / 10 });
  if (side === c.side) status(b, 'noPoints', ship, officerSpeaker(b, c, 'flagLieutenant'), reason, false);
  logRefusal(b, ship, o, reason);
  return reason;
}

/** How a captain takes a direct order: go, protest (wants a confirm), or refuse. Seeded from comms' stream. */
export function pushback(b: Battle, s: Ship, o: Order): 'go' | 'protest' | 'refuse' {
  const c = comms(b);
  const cap = s.captain;
  if (cap.trait === 'Fanatic' && o.kind === 'withdraw') return 'refuse';
  if (cap.loyalty < PUSHBACK.refuseLoyalty) {
    const p = PUSHBACK.refuseChanceAtZero * (1 - cap.loyalty / PUSHBACK.refuseLoyalty);
    if (draw(c.rng) < p) return 'refuse';
  }
  const risky = (o.kind === 'attack' || o.kind === 'focusSide')
    && (s.hull / s.hullMax < PUSHBACK.riskyHull || cap.mood === 'strained' || cap.mood === 'panicked');
  if (risky && cap.trait !== 'By-the-book') {
    const p = PUSHBACK.protestBase - (cap.abilities.nerve + cap.abilities.judgement) / 20;
    if (draw(c.rng) < p) return 'protest';
  }
  return 'go';
}

/**
 * A direct order from the admiral to one ship, or to the flagship's own crew. Costs command points; a captain may
 * protest or refuse, always out loud. Returns ok only when the order was given and taken.
 */
export function command(b: Battle, shipId: string, o: Order, side: SideId = 'player'): CommandResult {
  const c = comms(b);
  const s = shipById(b, shipId);
  if (!s || s.side !== side || s.status !== 'active') {
    const reason = 'That ship is not under your command.';
    logRefusal(b, shipId, o, reason);
    return no(reason);
  }
  const crew = s.flagship;
  const short = spend(b, side, crew || isOfficerKind(o.kind) ? POINTS.officer : POINTS.direct, s.id, o);
  if (short) return no(short);
  if (crew || isOfficerKind(o.kind)) {
    const ok = order(b, s.id, o, side);
    if (ok && o.kind === 'shieldPower') { standShieldOrder(b, s); shieldReply(b, s); }
    else if (ok && !isOfficerKind(o.kind) && side === c.side) {
      status(b, 'ack', s.id, officerSpeaker(b, c, 'helm'), say(c, 'ack', s.captain, doing(b, o, s)), false);
    }
    return ok ? { ok, reason: null, protest: null } : no(lastRefusal(b) ?? 'The order could not be carried out.');
  }
  const verdict = pushback(b, s, o);
  if (verdict === 'refuse') {
    const text = say(c, 'refuse', s.captain, { ship: s.name });
    if (side === c.side) status(b, 'refuse', s.id, captainSpeaker(s), text, false);
    logRefusal(b, s.id, o, text);
    return no(text);
  }
  if (verdict === 'protest') {
    const text = say(c, 'protest', s.captain, { ship: s.name, hull: reportedHull(b, s) });
    const r = addReport(b, {
      level: 'decision', type: 'protest', ship: s.id, from: captainSpeaker(s), text,
      answers: [ans('confirm'), ans('belay')], pending: { ship: s.id, order: o }, deadline: b.t + timeoutFor(s.captain, false),
    });
    return { ok: false, reason: text, protest: r.id };
  }
  const ok = order(b, s.id, o, side);
  if (!ok) return no(lastRefusal(b) ?? 'The order is not valid.');
  if (o.kind === 'shieldPower') standShieldOrder(b, s);
  if (side === c.side) status(b, 'ack', s.id, captainSpeaker(s), say(c, 'ack', s.captain, doing(b, o, s)), false);
  return { ok: true, reason: null, protest: null };
}

function doing(b: Battle, o: Order, s: Ship) {
  const t = shipById(b, o.target);
  return { ship: s.name, do: (DOING[o.kind] ?? o.kind).replace('{target}', t?.name ?? '').replace('{side}', o.side ?? '') };
}

function lastRefusal(b: Battle): string | null {
  const e = b.log[b.log.length - 1];
  return e && e.kind === 'commsRefused' ? e.reason : null;
}

/** All hands (BRIDGE §4): one order to every ship but the flagship. Costs the most; each captain answers in character. */
export function broadcast(b: Battle, o: Order, side: SideId = 'player'): { ok: boolean; reason: string | null; took: string[]; refused: string[]; protested: string[] } {
  const c = comms(b);
  const flag = b.sides[side].flagshipId;
  const short = spend(b, side, POINTS.broadcast, flag, o);
  if (short) return { ok: false, reason: short, took: [], refused: [], protested: [] };
  const took: string[] = [];
  const refused: string[] = [];
  const protested: string[] = [];
  for (const s of b.ships) {
    if (s.side !== side || s.status !== 'active' || s.flagship) continue;
    // Points are spent once for the broadcast: hand each captain a free direct order.
    c.points[side] += POINTS.direct;
    const r = command(b, s.id, o, side);
    if (r.ok) took.push(s.id);
    else if (r.protest !== null) protested.push(s.id);
    else refused.push(s.id);
  }
  return { ok: took.length > 0, reason: null, took, refused, protested };
}

/** Asking (BRIDGE §4): "Status?" The answer is the captain's own figure, shaped by Candour and mood. Free. */
export function ping(b: Battle, shipId: string): { reported: number; report: number } | null {
  const c = comms(b);
  const s = shipById(b, shipId);
  if (!s || s.side !== c.side || s.status !== 'active') return null;
  const reported = reportedHull(b, s);
  const r = status(b, 'ping', s.id, captainSpeaker(s), say(c, 'ping', s.captain, { ship: s.name, hull: reported }), false);
  return { reported, report: r!.id };
}
