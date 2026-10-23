/**
 * The queue as the UI draws it, and the keys that work it (BRIDGE §4): Q/E/R = answerTop(b, 0/1/2) on the selected
 * report, Tab = tabNext(b). `queue()` is a pure read of battle state plus the comms slice: it changes nothing.
 */
import { answer } from '../battle';
import { order } from '../orders';
import { pushLog, round2, shipById } from '../ships';
import type { Battle } from '../types';
import { captainSpeaker, closeReport, comms, fill, say, status } from './core';
import { BODY, DOING } from './lines';
import { drawPick } from '../rng';
import { COMMS } from './numbers';
import { standShieldOrder } from './standing';
import { isOfficerKind } from './officers';
import { shownCards } from './shown';
import type { CommandResult, QueueItem, Report } from './types';

const LEVEL_RANK = { urgent: 0, decision: 1, status: 2 } as const;

/** The reports that take an answer, in the order the queue shows them: urgent first, then by how soon they close. */
export function answerable(b: Battle): Report[] {
  if (!b.comms) return [];
  const shown = shownCards(b.comms.open);
  return b.comms.open
    .filter((r) => r.level !== 'status' && r.answers.length > 0 && (r.from.officer !== null || shown.has(r)))
    .sort((x, y) => LEVEL_RANK[x.level] - LEVEL_RANK[y.level] || (x.deadline ?? Infinity) - (y.deadline ?? Infinity) || x.id - y.id);
}

/**
 * The selected report (PKG-22, F-04): the one Tab moved to, by id, while it is still waiting; otherwise the one at the
 * cursor. Selecting by id means a report arriving above it does not move the selection onto another captain's card.
 */
export function selectedReport(b: Battle): Report | null {
  const list = answerable(b);
  if (!list.length || !b.comms) return null;
  const c = b.comms;
  if (c.cursorId === undefined) return list[Math.min(c.cursor, list.length - 1)];
  // The card Tab chose closed (timed out, answered by click): back to the top, not to whatever slid into its slot.
  return list.find((r) => r.id === c.cursorId) ?? list[0];
}

/** What the UI draws, top to bottom: urgent, decisions, then status (newest first, the flag lieutenant's summary last). */
export function queue(b: Battle): QueueItem[] {
  if (!b.comms) return [];
  const c = b.comms;
  const top = answerable(b);
  const sel = selectedReport(b);
  const shown = shownCards(c.open);
  const rest = c.open.filter((r) => !top.includes(r) && (r.level === 'status' || r.from.officer !== null || shown.has(r)))
    .sort((x, y) => LEVEL_RANK[x.level] - LEVEL_RANK[y.level] || Number(x.type === 'summary') - Number(y.type === 'summary') || y.t - x.t || y.id - x.id);
  return [...top, ...rest].map((r) => ({
    id: r.id, level: r.level, type: r.type, from: r.from, text: r.text, answers: r.answers.map((a) => a.label),
    secondsLeft: r.deadline === null ? null : Math.max(0, round2(r.deadline - b.t)), selected: r === sel, folded: r.folded, about: r.about,
  }));
}

/** Tab: select the next report that takes an answer (wraps). */
export function tabNext(b: Battle): number {
  const list = answerable(b);
  const n = list.length;
  const c = comms(b);
  const at = selectedReport(b);
  const from = at ? list.indexOf(at) : Math.min(c.cursor, Math.max(0, n - 1));
  c.cursor = n ? (from + 1) % n : 0;
  c.cursorId = n ? list[c.cursor].id : undefined;
  return c.cursor;
}

const COUNT = ['no', 'one', 'two', 'three'];
const KEYS = ['Q', 'E', 'R'];

/**
 * Q/E/R: answer the selected report with answer i (0/1/2). Answering is free (BRIDGE §5). `id` (PKG-22, F-04): the
 * report the admiral is looking at (the UI passes the highlighted card); a report that closed before the key landed is
 * said out loud and nothing else is answered in its place.
 */
export function answerTop(b: Battle, i: number, id?: number): CommandResult {
  const c = comms(b);
  const list = answerable(b);
  const r = id === undefined ? selectedReport(b) : list.find((x) => x.id === id) ?? null;
  if (!r) {
    if (id === undefined || !list.length) return { ok: false, reason: 'No report is waiting for an answer.', protest: null };
    const gone = [...c.history].reverse().find((x) => x.id === id);
    return { ok: false, reason: `Too late: ${gone ? `${gone.from.ship || gone.from.name} already decided` : 'that report has closed'}.`, protest: null };
  }
  const a = r.answers[i];
  if (!a) {
    const keys = r.answers.map((x, k) => `${KEYS[k]} ${x.label}`).join(', ');
    return { ok: false, reason: `That report has ${COUNT[r.answers.length] ?? r.answers.length} answers: ${keys}.`, protest: null };
  }
  const side = c.side;
  if (r.requestId !== null && a.choice) answer(b, r.requestId, a.choice);
  for (const { ship, order: o } of a.orders) {
    const ok = order(b, ship, o, side);
    // PKG-14: a shield split the admiral picks from a report stands like one he ordered.
    const s = shipById(b, ship);
    if (ok && o.kind === 'shieldPower' && s) standShieldOrder(b, s);
  }
  if (r.pending && a.key === 'confirm') order(b, r.pending.ship, r.pending.order, side);
  const s = shipById(b, r.ship);
  if (a.key === 'standFast' && s && s.status === 'active') s.morale = Math.min(100, s.morale + COMMS.standFastMorale);
  pushLog(b, { t: round2(b.t), kind: 'commsAnswer', report: r.id, ship: r.ship, answer: i, label: a.label, by: 'admiral' });
  closeReport(b, r);
  // PKG-22 (F-09): the admiral's word stands for that captain. His other cards that were waiting unseen close with it
  // (a request of PKG-02's stays: it becomes his card on screen next).
  if (!r.from.officer) for (const x of [...c.open]) if (x.ship === r.ship && !x.from.officer && x.level !== 'status' && x.requestId === null) closeReport(b, x);
  c.cursor = 0;
  c.cursorId = undefined;
  // The captain acknowledges on comms (an officer's report is acknowledged by the officer).
  // PKG-22: an officer who took the order has already said so in his own reply; no second acknowledgement.
  const replied = a.orders.some(({ ship, order: o }) => isOfficerKind(o.kind) && shipById(b, ship)?.flagship);
  if (s && s.status === 'active' && !replied) {
    const doing = (DOING[a.key] ?? a.label).replace('{side}', a.label.split(' ').pop() ?? '');
    const from = r.from.officer ? r.from : captainSpeaker(s);
    // PKG-14: an officer acknowledges in his own steady voice, not with the flag captain's trait.
    const text = r.from.officer ? fill(drawPick(c.rng, BODY.ack!.steady), { do: doing, ship: s.name }) : say(c, 'ack', s.captain, { do: doing, ship: s.name });
    status(b, 'ack', s.id, from, text, false);
  }
  return { ok: true, reason: null, protest: null };
}
