/**
 * The marine commander's decision while our marines fight inside an enemy ship (PKG-14, EXP-05 steps 5–6; BRIDGE §7,
 * NAVY §3 step 5), and the captain's word that the boarded ship's fire has slackened.
 *
 * Every second, for each fight our side has going: once the boarders have been aboard `MARINES.askAfterS`, the marine
 * commander raises a decision: Reinforce (a `board` order at that ship from the best launcher), Pull back (`pullBack`),
 * Carry on. Q/E/R reach it like any report. Unanswered, the marine commander decides by his own Judgement: careful
 * (Judgement ≥ COMMS.careJudgement) sends more pods to a fight he is losing, or pulls out if he has none to send, and
 * lets a winning fight carry on; a rash commander always carries on.
 */
import { cannotBoard, launchBoarding, pullBack } from '../boarding/boarding';
import { BOARDING } from '../boarding/numbers';
import { draw, drawPick } from '../rng';
import { dist, pushLog, recordDecision, round2, shipById } from '../ships';
import type { Battle, Ship } from '../types';
import { addReport, captainSpeaker, closeReport, fill, officerLine, officerSpeaker, onCooldown, startCooldown, status } from './core';
import { DOING, STATUS } from './lines';
import { COMMS, MARINES } from './numbers';
import { ans } from './tick';
import type { CommsState, Report } from './types';

/** The marine commander's Judgement, drawn once from comms' own stream (an ability 1–10, bunched to the middle). */
export function marineJudgement(c: CommsState): number {
  const j = (c.officerJudgement ??= {});
  if (j.marines === undefined) j.marines = Math.max(1, Math.min(10, Math.round((draw(c.rng) * 10 + draw(c.rng) * 10) / 2 + 0.5)));
  return j.marines;
}

/** Who can send pods at `t` now: the flagship first (its marine commander's own pods), then the nearest launcher. */
export function launcher(b: Battle, c: CommsState, t: Ship, ordered: boolean): Ship | null {
  const ours = b.ships.filter((s) => s.side === c.side && !cannotBoard(s, t, ordered));
  ours.sort((x, y) => Number(y.flagship) - Number(x.flagship) || dist(x.pos, t.pos) - dist(y.pos, t.pos));
  return ours[0] ?? null;
}

const losing = (f: { fight: { attackers: { strength: number }; defenders: { strength: number } } }) =>
  f.fight.attackers.strength < BOARDING.reinforceBelow * f.fight.defenders.strength;

/** Once a second, from commsTick's watch. */
export function marineWatch(b: Battle, c: CommsState): void {
  const st = b.boarding;
  for (const r of [...c.open]) {
    if (r.type !== 'boardDecision') continue;
    if (!st?.fights.some((f) => f.side === c.side && f.target === r.about)) closeReport(b, r);
  }
  if (!st) return;
  const flag = shipById(b, b.sides[c.side].flagshipId);
  for (const f of st.fights) {
    if (f.side !== c.side) continue;
    const t = shipById(b, f.target);
    if (!t || t.status !== 'active' || t.side === f.side) continue;
    const aboard = b.t - f.startT;
    // EXP-05 s5: the drag on her guns is real (boarding.ts gunneryDrag); a captain who is shooting at her says so.
    if (aboard >= MARINES.slackAfterS && t.systems.guns > 0 && !onCooldown(b, 'fireSlack', t.id)) {
      startCooldown(b, 'fireSlack', t.id);
      const by = b.ships.filter((s) => s.side === c.side && s.status === 'active' && !s.flagship && s.stance.target === t.id)
        .sort((x, y) => dist(x.pos, t.pos) - dist(y.pos, t.pos))[0];
      const from = by ? captainSpeaker(by) : officerSpeaker(b, c, 'helm');
      status(b, 'fireSlack', by?.id ?? flag?.id ?? t.id, from, fill(drawPick(c.rng, STATUS.fireSlack!), { about: t.name }), false, t.id);
    }
    if (!flag || flag.status !== 'active' || aboard < MARINES.askAfterS) continue;
    if (c.open.some((r) => r.type === 'boardDecision' && r.about === t.id) || onCooldown(b, 'boardDecision', t.id)) continue;
    startCooldown(b, 'boardDecision', t.id);
    const from = launcher(b, c, t, true);
    const answers = [
      ...(from ? [ans('reinforceBoard', [{ ship: from.id, order: { kind: 'board', target: t.id } }])] : []),
      ans('pullBack', [{ ship: flag.id, order: { kind: 'pullBack', target: t.id } }]),
      ans('carryOn'),
    ];
    // PKG-22 (TRC05-6): one source of truth. He quotes the deck fight's own last report when there is one, and his
    // words follow those figures: behind is losing, ahead but under the reinforce margin is close, else holding.
    const deck = lastDeck(b, t.id, c.side);
    const ours = deck?.attackers ?? Math.round(f.fight.attackers.strength);
    const theirs = deck?.defenders ?? Math.round(f.fight.defenders.strength);
    const vars = { about: t.name, ours, theirs };
    const word = ours < theirs ? 'boardLosing' : losing(f) ? 'boardClose' : 'boardHolding';
    const text = officerLine(c, word, vars) + (from ? '' : ` ${officerLine(c, 'boardNoPods', vars)}`);
    addReport(b, {
      level: 'decision', type: 'boardDecision', ship: flag.id, about: t.id, from: officerSpeaker(b, c, 'marines'), text, answers,
      deadline: b.t + MARINES.decisionS,
    });
  }
}

/** The deck fight's last logged figures on `ship` for `side`'s boarders (boarding.ts logs one every fightReportS). */
function lastDeck(b: Battle, ship: string, side: string): { attackers: number; defenders: number } | null {
  for (let i = b.log.length - 1; i >= 0; i--) {
    const e = b.log[i];
    if (e.kind === 'boardFight' && e.ship === ship && e.by === side) return { attackers: e.attackers, defenders: e.defenders };
  }
  return null;
}

/**
 * The decision timed out: the marine commander takes it by his Judgement. He acts on his own authority (the boarding
 * functions, not `order()`), so it is not an admiral's order and costs no command points. Recorded like a captain's
 * timeout decision, with the flagship as the ship and "marine commander, Judgement N" as the reason.
 */
export function marineTimeout(b: Battle, c: CommsState, r: Report): void {
  const flag = shipById(b, r.ship);
  const t = shipById(b, r.about);
  const f = b.boarding?.fights.find((x) => x.side === c.side && x.target === r.about);
  if (!flag || flag.status !== 'active' || !t || !f) { closeReport(b, r); return; }
  const J = marineJudgement(c);
  const why = `marine commander, Judgement ${J}`;
  let key = 'carryOn';
  if (J >= COMMS.careJudgement && losing(f)) {
    const from = launcher(b, c, t, false);
    if (from && launchBoarding(b, from, t.id, undefined, false)) key = 'reinforceBoard';
    else if (pullBack(b, c.side, t.id)) key = 'pullBack';
  }
  const i = Math.max(0, r.answers.findIndex((a) => a.key === key));
  const a = r.answers[i];
  recordDecision(b, flag, `${r.type} ${t.name}: ${a.label}`, why, true);
  const d = b.stats.timeoutDecisions[b.stats.timeoutDecisions.length - 1];
  d.report = r.id;
  d.choice = key;
  pushLog(b, { t: round2(b.t), kind: 'commsAnswer', report: r.id, ship: flag.id, answer: i, label: a.label, by: 'timeout' });
  closeReport(b, r);
  status(b, 'timeoutChoice', flag.id, r.from, officerLine(c, 'marineOwnCall', { do: DOING[key] ?? a.label, about: t.name }), false, t.id);
}
