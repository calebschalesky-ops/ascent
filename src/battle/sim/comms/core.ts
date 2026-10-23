/**
 * The comms slice's plumbing (PKG-06): creating it, picking and filling lines, adding and closing reports, the
 * timeout clock, and Candour-shaped numbers. Imports nothing from battle.ts, so orders.ts and policies.ts can use it.
 */
import { FAMILY_NAMES, GIVEN_NAMES } from '../captains';
import { draw, drawPick, makeRng } from '../rng';
import { pushLog, recordDecision, round2, shipById } from '../ships';
import type { Battle, Captain, Decision, Order, Ship, SideId } from '../types';
import { BODY, FAMILY, OFFICER, TAIL } from './lines';
import { CANDOUR, COMMS, PATIENCE, POINTS } from './numbers';
import type { Answer, CommsState, FlagshipCrew, OfficerId, Report, ReportLevel, ReportType, Speaker } from './types';

const freshCrew = (): FlagshipCrew => ({ guns: { mode: 'free', target: null }, power: 'normal', helm: null, fighters: null, pods: null });

const OFFICER_IDS: OfficerId[] = ['guns', 'engineering', 'helm', 'marines', 'fighters', 'flagLieutenant'];

/** The battle's comms slice, created on first use. Its stream is seeded from the battle seed, not drawn from b.rng. */
export function comms(b: Battle): CommsState {
  if (b.comms) return b.comms;
  const rng = makeRng((b.seed ^ 0x51ed270b) >>> 0);
  const taken = new Set(b.ships.map((s) => s.captain.name));
  // PKG-14: no surname more than twice in the player's fleet, counting the flagship's officers with its captains.
  const surname = (n: string) => n.slice(n.lastIndexOf(' ') + 1);
  const count: Record<string, number> = {};
  for (const s of b.ships) if (s.side === 'player') count[surname(s.captain.name)] = (count[surname(s.captain.name)] ?? 0) + 1;
  const officers = {} as Record<OfficerId, string>;
  for (const id of OFFICER_IDS) {
    let name = '';
    for (let i = 0; i < 50; i++) {
      name = `${drawPick(rng, GIVEN_NAMES)} ${drawPick(rng, FAMILY_NAMES)}`;
      if (!taken.has(name) && (count[surname(name)] ?? 0) < COMMS.maxSurname) break;
    }
    taken.add(name);
    count[surname(name)] = (count[surname(name)] ?? 0) + 1;
    officers[id] = name;
  }
  b.comms = {
    side: 'player', rng, nextId: 1, open: [], history: [], historyDropped: 0, pendingStatus: [], lastFold: b.t, cursor: 0,
    points: { player: POINTS.start, enemy: POINTS.start }, logSeen: 0, requestSeen: 0, cooldown: {}, accuracy: {},
    crew: { player: freshCrew(), enemy: freshCrew() }, officers,
  };
  return b.comms;
}

export function fill(text: string, vars: Record<string, string | number | undefined>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] === undefined ? `{${k}}` : String(vars[k])));
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** A captain's line: body by type and mood, tail by trait. */
export function say(c: CommsState, type: ReportType, captain: Captain, vars: Record<string, string | number | undefined>): string {
  const byMood = BODY[type];
  if (!byMood) return fill(type, vars);
  const body = drawPick(c.rng, byMood[captain.mood]);
  const fam = FAMILY[type];
  const tail = fam ? drawPick(c.rng, TAIL[fam][captain.trait]) : '';
  return cap(fill(tail ? `${body} ${tail}` : body, vars));
}

export const officerLine = (c: CommsState, key: string, vars: Record<string, string | number | undefined>) =>
  cap(fill(drawPick(c.rng, OFFICER[key] ?? [key]), vars));

export function captainSpeaker(s: Ship): Speaker {
  return { portrait: `captain:${s.id}`, name: s.captain.name, ship: s.name, mood: s.captain.mood, trait: s.captain.trait, officer: null };
}

/** PKG-22 (F-14): who passes the flagship's traffic once she is gone. The senior captain still in the fight. */
const RANK: Record<string, number> = { capital: 5, carrier: 4, cruiser: 3, destroyer: 2, escort: 1 };
export function relayShip(b: Battle, side: SideId): Ship | undefined {
  // Still fighting first; a captain running (broken) still has a radio.
  const live = (s: Ship) => (s.status === 'active' ? 2 : s.status === 'broken' ? 1 : 0);
  return b.ships.filter((s) => s.side === side && live(s) > 0 && s.id !== b.sides[side].flagshipId)
    .sort((x, y) => live(y) - live(x) || (RANK[y.cls] ?? 0) - (RANK[x.cls] ?? 0) || (x.id < y.id ? -1 : 1))[0];
}

export function officerSpeaker(b: Battle, c: CommsState, officer: OfficerId, side: SideId = c.side): Speaker {
  const flag = shipById(b, b.sides[side].flagshipId);
  // PKG-22 (F-14): an officer whose ship is gone stops reporting; the senior captain passes the word instead.
  if (!flag || flag.status !== 'active') {
    const relay = relayShip(b, side);
    if (relay) return { ...captainSpeaker(relay), officer };
    return { portrait: `officer:${officer}`, name: c.officers[officer], ship: '', mood: 'steady', trait: null, officer };
  }
  // The flag captain is the flagship's own captain; the rest are staff with names of their own.
  if (officer === 'helm' && flag) return { ...captainSpeaker(flag), portrait: 'officer:helm', officer };
  return { portrait: `officer:${officer}`, name: c.officers[officer], ship: flag?.name ?? '', mood: 'steady', trait: null, officer };
}

export interface NewReport {
  level: ReportLevel;
  type: ReportType;
  ship: string;
  about?: string | null;
  from: Speaker;
  text: string;
  answers?: Answer[];
  deadline?: number | null;
  requestId?: number | null;
  pending?: { ship: string; order: Order } | null;
  fold?: boolean;
}

export function addReport(b: Battle, r: NewReport): Report {
  const c = comms(b);
  const rep: Report = {
    id: c.nextId++, t: round2(b.t), level: r.level, type: r.type, ship: r.ship, about: r.about ?? null, from: r.from, text: r.text,
    answers: r.answers ?? [], deadline: r.deadline ?? null, requestId: r.requestId ?? null, pending: r.pending ?? null,
    fold: r.fold ?? false, folded: 0,
  };
  c.open.push(rep);
  return rep;
}

export function closeReport(b: Battle, r: Report): void {
  const c = comms(b);
  const i = c.open.indexOf(r);
  if (i >= 0) c.open.splice(i, 1);
  c.history.push(r);
  if (c.history.length > COMMS.historyCap) {
    c.history.shift();
    c.historyDropped++;
  }
}

/** A status line: folded into the next summary, or shown on its own for a few seconds (acks, officers, choices). */
export function status(b: Battle, type: ReportType, ship: string, from: Speaker, text: string, fold: boolean, about: string | null = null): Report | null {
  const c = comms(b);
  if (fold) {
    c.pendingStatus.push({ t: round2(b.t), type, ship, text });
    return null;
  }
  return addReport(b, { level: 'status', type, ship, about, from, text, deadline: b.t + COMMS.showStatusS });
}

/** How long a captain's decision waits: BRIDGE §4, 4–12 s, shorter if urgent, longer if patient. */
export function timeoutFor(captain: Captain, urgent: boolean): number {
  const t = COMMS.timeoutBase - (urgent ? COMMS.urgentLess : 0) + PATIENCE[captain.trait];
  return Math.max(COMMS.timeoutMin, Math.min(COMMS.timeoutMax, t));
}

export const onCooldown = (b: Battle, type: ReportType, ship: string) => (comms(b).cooldown[`${type}:${ship}`] ?? -Infinity) > b.t;
export function startCooldown(b: Battle, type: ReportType, ship: string): void {
  comms(b).cooldown[`${type}:${ship}`] = b.t + COMMS.cooldownS;
}

export const openFor = (b: Battle, ship: string) => comms(b).open.filter((r) => r.ship === ship && r.level !== 'status');

/**
 * A captain's own hull figure, as they report it (BRIDGE §3). Candour 10 reports the truth; lower Candour lets trait,
 * mood and noise lean it. Every figure is scored in the captain's report-accuracy record. Returns a whole percentage.
 */
export function reportedHull(b: Battle, s: Ship): number {
  const c = comms(b);
  const truth = s.hull / s.hullMax;
  const lean = (CANDOUR.trait[s.captain.trait] ?? 0) + CANDOUR.mood[s.captain.mood] + (draw(c.rng) * 2 - 1) * CANDOUR.noise;
  const dishonesty = (10 - s.captain.abilities.candour) / 9;
  const said = Math.max(0.01, Math.min(1, truth + lean * dishonesty));
  const pct = Math.round(said * 100);
  const err = pct / 100 - truth;
  const a = (c.accuracy[s.id] ??= { reports: 0, accurate: 0, bias: 0, absErr: 0 });
  a.reports++;
  if (Math.abs(err) <= COMMS.accurateWithin) a.accurate++;
  a.bias = round4(a.bias + err);
  a.absErr = round4(a.absErr + Math.abs(err));
  return pct;
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;

/** A captain decided on a timeout: the decision event and row, tagged with the report and the answer taken. */
export function recordTimeout(b: Battle, s: Ship, r: Report, a: Answer, why: string): Decision {
  recordDecision(b, s, `${r.type}${r.about ? ` ${shipById(b, r.about)?.name ?? r.about}` : ''}: ${a.label}`, why, true);
  const d = b.stats.timeoutDecisions[b.stats.timeoutDecisions.length - 1];
  d.report = r.id;
  d.choice = a.key;
  if (s.captain.trait === 'Grudge-holder') s.captain.loyalty = Math.max(0, s.captain.loyalty - COMMS.grudgeLoyalty);
  return d;
}

export function logRefusal(b: Battle, ship: string, order: Order | null, reason: string): void {
  pushLog(b, { t: round2(b.t), kind: 'commsRefused', ship, order, reason });
}
