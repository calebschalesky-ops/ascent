/**
 * `commsTick(battle)`: the one call PKG-06 adds to step(), after the captains think and before anything moves or
 * fires. It turns PKG-02's requests and the engine's events into reports, times decisions out by the captain's
 * Judgement and trait, folds status traffic, refills command points and applies the flagship crew's standing orders.
 */
import { breakThreshold } from '../captains';
import { activeShips, dist, focusSplit, pushLog, round2, setShieldPower, shipById } from '../ships';
import { SHIELD_SIDES, inField, otherSide } from '../types';
import type { Battle, LogEvent, Order, Request, ShieldSide, Ship } from '../types';
import {
  addReport, captainSpeaker, closeReport, comms, officerLine, officerSpeaker, openFor, onCooldown, recordTimeout, reportedHull,
  say, startCooldown, status, timeoutFor,
} from './core';
import { DOING, LABEL, MARINE, OFFICER, STATUS, SUMMARY, SYSTEM_SAY } from './lines';
import { COMMS, POINTS } from './numbers';
import { crewEffects } from './officers';
import { marineTimeout, marineWatch } from './marines';
import type { Answer, CommsState, Report, ReportType } from './types';
import { drawPick } from '../rng';
import { onShot, sideWatch } from './sides';
import { shownCards } from './shown';

export function ans(key: string, orders: { ship: string; order: Order }[] = [], choice: string | null = null, vars: Record<string, string> = {}): Answer {
  return { key, label: LABEL[key].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? k), choice, orders };
}

export function commsTick(b: Battle): void {
  const c = comms(b);
  for (const side of ['player', 'enemy'] as const) c.points[side] = Math.min(POINTS.max, c.points[side] + POINTS.refillPerS * b.dt);
  crewEffects(b);
  newRequests(b, c);
  readLog(b, c);
  if (b.tick % Math.round(1 / b.dt) === 0) watch(b, c);
  expire(b, c);
  if (b.t - c.lastFold >= COMMS.foldEveryS) fold(b, c);
}

// ── PKG-02's requests become decision reports ───────────────────────────────────────────────────────────────────────
function newRequests(b: Battle, c: CommsState): void {
  for (const req of b.requests) {
    if (req.id <= c.requestSeen) continue;
    c.requestSeen = req.id;
    const s = shipById(b, req.ship);
    if (!s) continue;
    const urgent = req.kind === 'withdraw' && s.hull / s.hullMax < 0.25;
    // The captain's patience sets the clock (PKG-02 gave every request the same 8 s).
    req.deadline = req.t + timeoutFor(s.captain, urgent);
    if (s.side !== c.side) continue;
    requestReport(b, c, s, req, urgent);
  }
}


function requestReport(b: Battle, c: CommsState, s: Ship, req: Request, urgent: boolean): void {
  const about = shipById(b, req.about);
  let answers: Answer[];
  if (req.kind === 'withdraw') answers = [ans('withdraw', [], 'withdraw'), ans('stay', [], 'stay'), ans('fallBack', [{ ship: s.id, order: { kind: 'followFlagship' } }], 'stay')];
  else if (req.kind === 'pursue') answers = [ans('pursue', [], 'pursue'), ans('hold', [], 'hold')];
  else answers = [ans('cover', [], 'cover'), ans('hold', [], 'hold')];
  const hull = req.kind === 'withdraw' ? reportedHull(b, s) : Math.round(100 * s.hull / s.hullMax);
  addReport(b, {
    level: urgent ? 'urgent' : 'decision', type: req.kind, ship: s.id, about: req.about, from: captainSpeaker(s),
    text: say(c, req.kind, s.captain, { ship: s.name, about: about?.name, hull }), answers, deadline: req.deadline, requestId: req.id,
  });
}

// ── The engine's events become reports ──────────────────────────────────────────────────────────────────────────────
type AnyEvent = { kind: string; t: number; [k: string]: unknown };
const BOARDING: Record<string, ReportType> = {
  boardLaunch: 'boardLaunch', boardDeflected: 'boardDeflected', breach: 'boardBreach', boardFight: 'boardFight',
  captured: 'captured', repelled: 'repelled', scuttled: 'scuttled',
};

function readLog(b: Battle, c: CommsState): void {
  const start = Math.max(0, c.logSeen - b.logDropped);
  for (let i = start; i < b.log.length; i++) onEvent(b, c, b.log[i]);
  c.logSeen = b.logDropped + b.log.length;
}

function onEvent(b: Battle, c: CommsState, e: LogEvent): void {
  if (BOARDING[e.kind]) { boarding(b, c, e as unknown as AnyEvent); return; }
  switch (e.kind) {
    case 'shieldDown': {
      const s = shipById(b, e.ship);
      if (!s || s.side !== c.side || s.flagship || s.status !== 'active') return;
      if (openFor(b, s.id).length || onCooldown(b, 'shieldDown', s.id)) return;
      startCooldown(b, 'shieldDown', s.id);
      // PKG-22 (F-08): the answers match the request. A captain who asks to turn gets "Turn a fresh side" on Q.
      const text = say(c, 'shieldDown', s.captain, { ship: s.name, side: e.side });
      const reinforce = ans('reinforce', [{ ship: s.id, order: { kind: 'shieldPower', split: focusSplit(e.side) } }], null, { side: e.side });
      const turn = ans('turn', [{ ship: s.id, order: { kind: 'maneuver', name: 'defensiveWheel' } }]);
      addReport(b, {
        level: 'decision', type: 'shieldDown', ship: s.id, from: captainSpeaker(s), text,
        // Fall back stays as a fourth button (no key): a Protector who is not answered still falls back on the flagship.
        answers: [...(/turn/i.test(text) ? [turn, reinforce] : [reinforce, turn]), ans('carryOn'), ans('fallBack', [{ ship: s.id, order: { kind: 'followFlagship' } }])],
        deadline: b.t + timeoutFor(s.captain, false),
      });
      return;
    }
    case 'systemOut': {
      const s = shipById(b, e.ship);
      if (!s || s.side !== c.side || s.status !== 'active') return;
      if (s.flagship) {
        status(b, 'breach', s.id, officerSpeaker(b, c, 'engineering'), `We have lost ${SYSTEM_SAY[e.system]} on the flagship. Damage control is on it.`, false);
        return;
      }
      if (openFor(b, s.id).some((r) => r.level === 'urgent') || onCooldown(b, 'breach', s.id)) return;
      startCooldown(b, 'breach', s.id);
      addReport(b, {
        level: 'urgent', type: 'breach', ship: s.id, from: captainSpeaker(s),
        text: say(c, 'breach', s.captain, { ship: s.name, system: SYSTEM_SAY[e.system], hull: reportedHull(b, s) }),
        answers: [ans('carryOn'), ans('withdraw', [{ ship: s.id, order: { kind: 'withdraw' } }])],
        deadline: b.t + timeoutFor(s.captain, true),
      });
      return;
    }
    case 'shot':
      onShot(b, c, e);
      return;
    case 'out': {
      const s = shipById(b, e.ship);
      if (!s) return;
      for (const r of [...c.open]) if ((r.ship === s.id && !r.from.officer) || (r.type === 'sideOpen' && r.about === s.id)) closeReport(b, r);
      // PKG-22 (F-14): the flagship's officers went with her; what they had open closes, and nobody speaks as them again.
      if (s.side === c.side && s.id === b.sides[c.side].flagshipId) for (const r of [...c.open]) if (r.from.officer) closeReport(b, r);
      if (s.side === c.side) {
        status(b, 'lost', s.id, officerSpeaker(b, c, 'flagLieutenant'), fillOne(c, 'lost', { ship: s.name }), false);
      } else {
        const by = shipById(b, s.lastAttacker);
        const credit = by && by.side === c.side ? by : null;
        status(b, 'kill', credit?.id ?? s.id, credit ? captainSpeaker(credit) : officerSpeaker(b, c, 'flagLieutenant'),
          fillOne(c, 'kill', { ship: credit?.name ?? 'The line', about: s.name }), true, s.id);
      }
      return;
    }
    case 'break': {
      const s = shipById(b, e.ship);
      if (!s || s.side !== c.side) return;
      for (const r of [...c.open]) if (r.ship === s.id && !r.from.officer && r.requestId === null) closeReport(b, r);
      status(b, 'broke', s.id, officerSpeaker(b, c, 'flagLieutenant'), fillOne(c, 'broke', { ship: s.name }), false);
      return;
    }
    case 'decision': {
      const s = shipById(b, e.ship);
      if (!s || s.side !== c.side) return;
      if (!e.timeout) { status(b, 'selfDecision', s.id, captainSpeaker(s), e.decision, true); return; }
      // A PKG-02 request timed out in battle.ts: say what the captain chose, and tag the decision with the report.
      const r = c.open.find((x) => x.ship === s.id && x.requestId !== null && e.decision.startsWith(x.type)
        && !b.requests.some((q) => q.id === x.requestId));
      if (!r) return;
      const choice = e.decision.slice(e.decision.lastIndexOf(': ') + 2);
      const i = Math.max(0, r.answers.findIndex((a) => a.choice === choice));
      const d = [...b.stats.timeoutDecisions].reverse().find((x) => x.ship === s.id && x.t === e.t);
      if (d) { d.report = r.id; d.choice = r.answers[i].key; }
      timedOut(b, c, s, r, i);
      return;
    }
  }
}

const fillOne = (c: CommsState, type: ReportType, vars: Record<string, string>) =>
  drawPick(c.rng, STATUS[type] ?? [type]).replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? k);

/**
 * PKG-05's boarding events, read off the log by kind (their files are not imported). Their shape: `ship` is the boarded
 * ship, except boardLaunch, where `ship` launches at `target`; `by` is the boarders' side where the event has one.
 */
function boarding(b: Battle, c: CommsState, e: AnyEvent): void {
  const type = BOARDING[e.kind];
  const str = (k: string) => (typeof e[k] === 'string' ? (e[k] as string) : null);
  const launch = type === 'boardLaunch';
  const from = launch ? shipById(b, str('ship')) : undefined;
  const at = shipById(b, launch ? str('target') : str('ship'));
  if (!at) return;
  // For captured, `by` is the new owner and the ship has already changed sides; `from` names the side that lost her.
  const victim = type === 'captured' && (e.from === 'player' || e.from === 'enemy') ? e.from : at.side;
  const boarders = from?.side ?? (e.by === 'player' || e.by === 'enemy' ? e.by : otherSide(victim));
  if (victim !== c.side && boarders !== c.side) return;
  const againstUs = victim === c.side;
  const inbound = launch && againstUs;
  const rtype: ReportType = inbound ? 'boardersInbound' : type;
  const vars: Record<string, string> = { ship: (inbound ? at : from)?.name ?? '', about: at.name, side: str('side') ?? 'near' };
  // PKG-14: their boarders on our ship take the 'Us' lines, so a capture of ours reads as a loss and one by us as a win.
  const key = againstUs && !inbound && MARINE[`${rtype}Us`] ? `${rtype}Us`
    : e.repowered === true && MARINE[`${rtype}Repowered`] ? `${rtype}Repowered` : rtype;
  const text = drawPick(c.rng, MARINE[key] ?? [rtype]).replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? k);
  const speaker = officerSpeaker(b, c, 'marines');
  const flag = b.sides[c.side].flagshipId;
  if (type === 'captured') {
    // PKG-22 (F-07): a capture, either way, is its own card that stays up: the news, then what the scoreboard now says.
    for (const r of [...c.open]) if (r.about === at.id && r.type !== 'captured') closeReport(b, r);
    const side = at.side;
    const total = b.ships.filter((x) => x.side === side).length;
    const taken = b.ships.filter((x) => x.side === side && x.capturedFrom !== undefined && x.capturedFrom !== side).length;
    const nums: Record<string, string | number> = { house: b.sides[side].house, total, own: total - taken, taken };
    const score = drawPick(c.rng, OFFICER.score).replace(/\{(\w+)\}/g, (_, k: string) => String(nums[k] ?? k));
    addReport(b, { level: 'status', type: 'captured', ship: flag, about: at.id, from: speaker, text: `${text} ${score}`, deadline: b.t + COMMS.captureShowS });
    return;
  }
  if (inbound || (type === 'boardBreach' && againstUs)) {
    // Urgent (BRIDGE §4): boarders inbound, a breach. The answer is what the boarded ship does. PKG-22 (F-08): pods
    // inbound are answered with shields on the side they are aiming at (an up side throws pods off).
    const aim = str('side');
    const shields = inbound && at.status === 'active' && at.side === c.side && aim && (SHIELD_SIDES as readonly string[]).includes(aim)
      ? [ans('shieldsTo', [{ ship: at.id, order: { kind: 'shieldPower', split: focusSplit(aim as ShieldSide) } }], null, { side: aim })] : [];
    addReport(b, {
      level: 'urgent', type: rtype, ship: flag, about: at.id, from: speaker, text,
      answers: at.status === 'active' && !at.flagship && at.side === c.side
        ? [...shields, ans('carryOn'), ans('fallBack', [{ ship: at.id, order: { kind: 'followFlagship' } }])]
        : [...shields, ans('escortsClose', escorts(b, c)), ans('carryOn')],
      deadline: b.t + COMMS.timeoutBase,
    });
    return;
  }
  status(b, rtype, flag, speaker, text, type === 'boardFight' || (type === 'boardDeflected' && e.repowered !== true), at.id);
}

const escorts = (b: Battle, c: CommsState) => activeShips(b, c.side).filter((s) => s.cls === 'escort' && !s.flagship)
  .map((s) => ({ ship: s.id, order: { kind: 'followFlagship' } as Order }));

// ── Watching the fleet: a captain about to break, the flagship threatened ──────────────────────────────────────────
function watch(b: Battle, c: CommsState): void {
  marineWatch(b, c);
  sideWatch(b, c);
  for (const s of activeShips(b, c.side)) {
    if (s.flagship) continue;
    if (s.morale >= breakThreshold(s.captain) + COMMS.breakWarnMargin) continue;
    if (openFor(b, s.id).some((r) => r.level === 'urgent') || onCooldown(b, 'breaking', s.id)) continue;
    startCooldown(b, 'breaking', s.id);
    addReport(b, {
      level: 'urgent', type: 'breaking', ship: s.id, from: captainSpeaker(s),
      text: say(c, 'breaking', s.captain, { ship: s.name }),
      answers: [ans('standFast'), ans('withdraw', [{ ship: s.id, order: { kind: 'withdraw' } }]), ans('fallBack', [{ ship: s.id, order: { kind: 'followFlagship' } }])],
      deadline: b.t + timeoutFor(s.captain, true),
    });
  }
  const flag = shipById(b, b.sides[c.side].flagshipId);
  if (!flag || flag.status !== 'active' || onCooldown(b, 'flagshipThreatened', flag.id)) return;
  const near = activeShips(b, otherSide(c.side)).filter((f) => dist(f.pos, flag.pos) <= COMMS.threatRange).length;
  const hullFrac = flag.hull / flag.hullMax;
  if (hullFrac >= COMMS.flagshipThreatHull && near < COMMS.flagshipThreatShips) return;
  startCooldown(b, 'flagshipThreatened', flag.id);
  const all = activeShips(b, c.side).filter((s) => !s.flagship).map((s) => ({ ship: s.id, order: { kind: 'followFlagship' } as Order }));
  addReport(b, {
    level: 'urgent', type: 'flagshipThreatened', ship: flag.id, from: officerSpeaker(b, c, 'helm'),
    text: officerLine(c, hullFrac < COMMS.flagshipThreatHull ? 'threatenedHull' : 'threatenedShips', { hull: Math.round(hullFrac * 100), n: near }),
    answers: [ans('escortsClose', escorts(b, c)), ans('allCover', all), ans('carryOn')],
    deadline: b.t + timeoutFor(flag.captain, true),
  });
}

// ── Timeouts: the captain decides by Judgement and trait ───────────────────────────────────────────────────────────
function expire(b: Battle, c: CommsState): void {
  for (const r of [...c.open]) {
    if (r.requestId !== null) {
      // battle.ts times requests out (readLog has already said what the captain chose); one answered elsewhere or
      // dropped because the ship left just closes.
      if (!b.requests.some((q) => q.id === r.requestId)) closeReport(b, r);
      continue;
    }
    if (r.deadline === null || b.t < r.deadline) continue;
    if (r.level === 'status' || !r.answers.length) { closeReport(b, r); continue; }
    // PKG-14: the marine commander decides his own report by his Judgement.
    if (r.type === 'boardDecision') { marineTimeout(b, c, r); continue; }
    const s = shipById(b, r.from.officer && r.from.officer !== 'helm' ? null : r.ship);
    if (!s || s.status !== 'active') { closeReport(b, r); continue; }
    const { i, why } = decide(s, r);
    applyAnswer(b, r.answers[i], s.captain.trait);
    if (r.pending && r.answers[i].key === 'confirm') applyOrder(b, r.pending.ship, r.pending.order, why);
    recordTimeout(b, s, r, r.answers[i], why);
    timedOut(b, c, s, r, i);
  }
}

function timedOut(b: Battle, c: CommsState, s: Ship, r: Report, i: number): void {
  const a = r.answers[i];
  // PKG-22 (F-09): a card the admiral never saw (another from the same captain was on screen) times out as before, but
  // what the captain chose goes into the flag lieutenant's summary instead of a line that seems to contradict him.
  const unseen = !r.from.officer && !shownCards(c.open).has(r);
  pushLog(b, { t: round2(b.t), kind: 'commsAnswer', report: r.id, ship: s.id, answer: i, label: a.label, by: 'timeout' });
  closeReport(b, r);
  const doing = (DOING[a.key] ?? a.label).replace('{side}', a.label.split(' ').pop() ?? '');
  const speaker = r.from.officer ? r.from : captainSpeaker(s);
  status(b, 'timeoutChoice', s.id, speaker, say(c, 'timeoutChoice', s.captain, { do: doing, ship: s.name }), unseen);
}

/**
 * Which answer a captain takes when nobody answers. Index into r.answers, and the trait or ability that decided it.
 * Answer orders are built so index 0 is the careful option except where noted.
 */
function decide(s: Ship, r: Report): { i: number; why: string } {
  const c = s.captain;
  const T = c.trait;
  const J = c.abilities.judgement;
  const careful = J >= COMMS.careJudgement;
  const idx = (key: string) => Math.max(0, r.answers.findIndex((a) => a.key === key));
  switch (r.type) {
    case 'shieldDown':
      if (T === 'Glory-hound' || T === 'Bold') return { i: idx('carryOn'), why: T };
      if (T === 'Cautious' || T === 'By-the-book') return { i: idx('reinforce'), why: T };
      if (T === 'Protector') return { i: idx('fallBack'), why: T };
      return { i: careful ? idx('reinforce') : idx('carryOn'), why: `Judgement ${J}` };
    case 'breach':
      if (T === 'Glory-hound' || T === 'Fanatic' || T === 'Bold') return { i: idx('carryOn'), why: T };
      if (T === 'Cautious') return { i: idx('withdraw'), why: T };
      return { i: careful && s.hull / s.hullMax < 0.4 ? idx('withdraw') : idx('carryOn'), why: `Judgement ${J}` };
    case 'breaking':
      if (T === 'Glory-hound' || T === 'Fanatic' || T === 'Bold') return { i: idx('standFast'), why: T };
      if (T === 'Cautious') return { i: idx('withdraw'), why: T };
      if (T === 'Protector' || T === 'By-the-book') return { i: idx('fallBack'), why: T };
      return { i: careful ? idx('withdraw') : idx('standFast'), why: `Judgement ${J}` };
    case 'flagshipThreatened':
      if (T === 'Glory-hound' || T === 'Bold') return { i: idx('carryOn'), why: T };
      if (T === 'Protector' || T === 'Cautious') return { i: idx('allCover'), why: T };
      return { i: careful ? idx('escortsClose') : idx('carryOn'), why: `Judgement ${J}` };
    case 'protest':
      if (T === 'By-the-book' || T === 'Glory-hound') return { i: idx('confirm'), why: T };
      if (T === 'Cautious' || T === 'Pessimist') return { i: idx('belay'), why: T };
      return { i: c.loyalty >= 50 ? idx('confirm') : idx('belay'), why: `loyalty ${Math.round(c.loyalty)}` };
    default:
      if (T === 'Glory-hound') return { i: r.answers.length - 1, why: T };
      return { i: 0, why: `Judgement ${J}` };
  }
}

/** A captain acting on their own answer: the effect of the orders, without spending the admiral's command. */
function applyAnswer(b: Battle, a: Answer, why: string): void {
  for (const { ship, order } of a.orders) applyOrder(b, ship, order, why);
}

function applyOrder(b: Battle, shipId: string, o: Order, why: string): void {
  const s = shipById(b, shipId);
  if (!s || s.status !== 'active') return;
  if (o.kind === 'shieldPower' && o.split) setShieldPower(s, o.split);
  else if (o.kind === 'withdraw') { s.order = null; s.stance = { mode: 'withdraw', target: null, side: null, present: null, why }; }
  else if (o.kind === 'followFlagship') { s.order = null; s.stance = { mode: 'follow', target: null, side: null, present: s.stance.present, why }; }
  else if (o.kind === 'holdPosition') { s.order = null; s.stance = { mode: 'hold', target: null, side: null, present: s.stance.present, why }; }
  else if ((o.kind === 'attack' || o.kind === 'focusSide') && o.target) {
    const t = shipById(b, o.target);
    if (!t || !inField(t.status)) return;
    s.order = { kind: o.kind, target: o.target, ...(o.side ? { side: o.side } : {}) };
    s.stance = { mode: 'engage', target: o.target, side: o.side ?? null, present: s.stance.present, why };
  }
}

// ── The flag lieutenant folds status traffic ──────────────────────────────────────────────────────────────────────
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
/** A count as a person says it: words up to ninety-nine, figures beyond. */
export function countWord(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  return String(n);
}
const upper = (s: string) => s.replace(/^./, (x) => x.toUpperCase());

/**
 * The flag lieutenant's fold (PKG-14): one row that reads like a person ("Eleven reports, Admiral. Three ships trimming
 * shields, six retargeting."), never the same opening twice running and never the same sentence twice in one row.
 */
export function fold(b: Battle, c: CommsState): void {
  c.lastFold = b.t;
  if (!c.pendingStatus.length) return;
  const lines = c.pendingStatus;
  c.pendingStatus = [];
  const shields = new Set(lines.filter((l) => l.type === 'selfDecision' && /shield|side/.test(l.text)).map((l) => l.ship)).size;
  const targets = lines.filter((l) => l.type === 'selfDecision' && l.text.startsWith('engage')).length;
  const notable = [...new Set(lines.filter((l) => l.type !== 'selfDecision').map((l) => l.text))].slice(-2);
  const n = lines.length;
  const heads = SUMMARY.head.filter((h) => h !== c.lastHead);
  const head = drawPick(c.rng, heads.length ? heads : SUMMARY.head);
  c.lastHead = head;
  const parts = [upper(head.replace('{N}', upper(countWord(n))).replace('{n}', countWord(n)).replace('{reports}', n === 1 ? 'report' : 'reports'))];
  const bits: string[] = [];
  if (shields) bits.push(shields === 1 ? SUMMARY.shields[1] : SUMMARY.shields[0].replace('{n}', countWord(shields)));
  if (targets) bits.push(targets === 1 ? SUMMARY.targets[1] : SUMMARY.targets[0].replace('{n}', countWord(targets)));
  if (bits.length) parts.push(upper(`${bits.join(', ')}.`));
  for (const t of notable) if (!parts.includes(t)) parts.push(t);
  if (!notable.length && !bits.length) parts.push(drawPick(c.rng, SUMMARY.quiet));
  for (const r of [...c.open]) if (r.type === 'summary') closeReport(b, r);
  const rep = addReport(b, {
    level: 'status', type: 'summary', ship: b.sides[c.side].flagshipId, from: officerSpeaker(b, c, 'flagLieutenant'), text: parts.join(' '),
  });
  rep.folded = lines.length;
}

