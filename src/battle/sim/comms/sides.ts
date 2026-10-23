/**
 * The master of guns on an enemy's open side (PKG-22, F-03; battle 1 at 4:00 "Their bow is open", battle 4 "Bow
 * shield's down now"). He watches the ship his guns are on and the ship the admiral has picked out as his target. When
 * our rounds go through one of her sides to the hull, he says so as a decision the admiral can take with one key:
 * Send the pods (at that side) or Keep firing. A hit that splashes on that side's shield again closes the report.
 *
 * Seeing is not knowing (VISION §7a): this reads only our own shots off the log, the same evidence the tactical view's
 * arcs use (view/tactical/intel.ts), never the enemy's true shield state.
 */
import { cannotBoard } from '../boarding/boarding';
import { shipById } from '../ships';
import type { Battle, LogEvent, Order, Ship } from '../types';
import { addReport, closeReport, comms, officerLine, officerSpeaker, status } from './core';
import { OPEN_SAY } from './lines';
import { launcher } from './marines';
import { COMMS } from './numbers';
import { ans } from './tick';
import type { Answer, CommsState, Report } from './types';

type Shot = Extract<LogEvent, { kind: 'shot' }>;

/** The admiral picked an enemy out as his target (the UI's target ring), or cleared it: the master of guns watches her. */
export function watchShip(b: Battle, id: string | null): void {
  comms(b).watching = id;
}

/** The enemy ships the master of guns is watching: his guns' target and the admiral's. */
export function watchedShips(c: CommsState): Set<string> {
  const out = new Set<string>();
  const guns = c.crew[c.side].guns;
  if (guns.mode === 'on' && guns.target) out.add(guns.target);
  if (c.watching) out.add(c.watching);
  return out;
}

/** The side a sideOpen report is about (carried on its Send-the-pods order; a report with no pods carries none). */
export const sideOf = (r: Report) => r.answers.find((a) => a.key === 'sendPods')?.orders[0]?.order.side ?? null;

/** One of our hits, read off the log by commsTick. */
export function onShot(b: Battle, c: CommsState, e: Shot): void {
  if (!e.hit) return;
  const by = shipById(b, e.ship);
  const t = shipById(b, e.target);
  if (!by || !t || by.side !== c.side || t.side === c.side || t.status !== 'active') return;
  const open = c.open.find((r) => r.type === 'sideOpen' && r.about === t.id);
  const flag = b.sides[c.side].flagshipId;
  const vars = { about: t.name, open: OPEN_SAY[e.side] ?? e.side };
  if (e.hullDmg <= 0) {
    // A hit that splashed on the shield of the side he reported: it is back up, and pods would bounce.
    if (e.shieldDmg > 0 && open && sideOf(open) === e.side) {
      closeReport(b, open);
      status(b, 'sideClosed', flag, officerSpeaker(b, c, 'guns'), officerLine(c, 'sideClosed', vars), false, t.id);
    }
    return;
  }
  if (open || !watchedShips(c).has(t.id)) return;
  // Our pods are already flying at her or our marines are aboard: the marine commander has that fight, not the guns.
  if (b.boarding?.pods.some((g) => g.side === c.side && g.target === t.id) || b.boarding?.fights.some((f) => f.side === c.side && f.target === t.id)) return;
  const key = `sideOpen:${t.id}`;
  if ((c.cooldown[key] ?? -Infinity) > b.t) return;
  c.cooldown[key] = b.t + COMMS.sideOpenCooldownS;
  const from = launcher(b, c, t, true);
  const text = officerLine(c, 'sideOpen', vars);
  if (!from) {
    status(b, 'sideOpen', flag, officerSpeaker(b, c, 'guns'), `${text} ${officerLine(c, 'sideOpenNoReach', vars)}`, false, t.id);
    return;
  }
  addReport(b, {
    level: 'decision', type: 'sideOpen', ship: flag, about: t.id, from: officerSpeaker(b, c, 'guns'), text,
    answers: [ans('sendPods', [podsAt(from, t, e.side)]), ans('keepFiring')],
    deadline: b.t + COMMS.sideOpenS,
  });
}

/** The order that sends the pods: the flagship's marine commander's own, or a board order on the nearest launcher. */
function podsAt(from: Ship, t: Ship, side: Shot['side']): Answer['orders'][number] {
  const o: Order = from.flagship ? { kind: 'launchPods', target: t.id, side } : { kind: 'board', target: t.id, side };
  return { ship: from.id, order: o };
}

/** Once a second: a report about a ship that left the fight, or that nothing of ours can reach any more, closes. */
export function sideWatch(b: Battle, c: CommsState): void {
  for (const r of [...c.open]) {
    if (r.type !== 'sideOpen') continue;
    const t = shipById(b, r.about);
    const pods = r.answers.find((a) => a.key === 'sendPods')?.orders[0];
    const from = shipById(b, pods?.ship);
    if (!t || t.status !== 'active' || t.side === c.side || !from || cannotBoard(from, t, true)) closeReport(b, r);
  }
}
