/**
 * The comms slice of battle state (PKG-06, BRIDGE-DESIGN §2–§6). Plain data, like the rest of the battle: it round-trips
 * through JSON, lives on `battle.comms`, and the queue the UI draws is a pure function of it plus the battle.
 */
import type { Rng } from '../rng';
import type { Mood, Order, ShieldSide, SideId, Trait } from '../types';

export type ReportLevel = 'urgent' | 'decision' | 'status';

/** What a report is about. Keys into lines.ts. */
export type ReportType =
  // decisions, from PKG-02's requests
  | 'withdraw' | 'pursue' | 'cover'
  // decisions and urgents comms raises from engine state and events
  | 'shieldDown' | 'breach' | 'breaking' | 'flagshipThreatened' | 'protest'
  // marine commander, from PKG-05's boarding events (read off the log by kind)
  | 'boardersInbound' | 'boardBreach' | 'boardFight' | 'boardDeflected' | 'boardLaunch' | 'captured' | 'repelled' | 'scuttled'
  // PKG-14: the marine commander's reinforce / pull-back decision; a captain's word that a boarded ship's fire slackened;
  // an officer saying a standing shield order cannot hold
  | 'boardDecision' | 'fireSlack' | 'shieldHold'
  // PKG-22: the master of guns saw an enemy shield side go down (F-03); a side he reported came back up
  | 'sideOpen' | 'sideClosed'
  // status
  | 'ack' | 'timeoutChoice' | 'refuse' | 'ping' | 'kill' | 'lost' | 'broke' | 'selfDecision' | 'officer' | 'noPoints' | 'summary';

export type OfficerId = 'guns' | 'engineering' | 'helm' | 'marines' | 'fighters' | 'flagLieutenant';

/** Who speaks: a captain (by ship) or one of the flagship's officers. */
export interface Speaker {
  /** Portrait key the UI resolves: `captain:<shipId>` or `officer:<officerId>`. */
  portrait: string;
  name: string;
  /** Ship name ("" for the flag lieutenant's summary). */
  ship: string;
  mood: Mood;
  trait: Trait | null;
  officer: OfficerId | null;
}

/** One answer button: a choice for a PKG-02 request and/or a set of orders. Either may be empty ("carry on"). */
export interface Answer {
  /** Key into lines.ts LABEL / DOING. */
  key: string;
  label: string;
  /** The option string handed to battle.answer() for a request-backed report. */
  choice: string | null;
  orders: { ship: string; order: Order }[];
}

export interface Report {
  id: number;
  t: number;
  level: ReportLevel;
  type: ReportType;
  /** Ship id of the speaker's ship (the flagship for officers). */
  ship: string;
  about: string | null;
  from: Speaker;
  text: string;
  answers: Answer[];
  /** Battle time it closes by itself: decisions time out; shown status lines fade. */
  deadline: number | null;
  /** PKG-02 request id when the report is a captain's request. */
  requestId: number | null;
  /** A protest: the order the captain wants confirmed. */
  pending: { ship: string; order: Order } | null;
  /** Status lines that fold into the flag lieutenant's summary. */
  fold: boolean;
  /** The summary row: how many status lines it folds. */
  folded: number;
}

export interface FlagshipCrew {
  guns: { mode: 'free' | 'on' | 'hold'; target: string | null };
  power: 'normal' | 'overload' | 'engines';
  helm: string | null;
  fighters: string | null;
  pods: string | null;
}

export interface Accuracy {
  reports: number;
  /** Reports within COMMS.accurateWithin of the truth. */
  accurate: number;
  /** Sum of (reported − true) hull fraction: positive = understated damage. */
  bias: number;
  /** Sum of |reported − true|. */
  absErr: number;
}

export interface CommsState {
  side: SideId;
  /** Comms' own stream, seeded from the battle seed, so picking a line never moves the battle's dice. */
  rng: Rng;
  nextId: number;
  open: Report[];
  /** Closed reports, newest last, capped (COMMS.historyCap). */
  history: Report[];
  historyDropped: number;
  /** Status lines waiting for the next fold. */
  pendingStatus: { t: number; type: ReportType; ship: string; text: string }[];
  lastFold: number;
  /** Index into the answerable part of the queue (Tab). */
  cursor: number;
  points: Record<SideId, number>;
  /** Absolute log index (logDropped + i) comms has read up to. */
  logSeen: number;
  /** Highest PKG-02 request id comms has seen. */
  requestSeen: number;
  /** `${type}:${ship}` → battle time it may be raised again. */
  cooldown: Record<string, number>;
  accuracy: Record<string, Accuracy>;
  crew: Record<SideId, FlagshipCrew>;
  officers: Record<OfficerId, string>;
  /** PKG-14: the admiral's standing shield orders, by ship id (comms/standing.ts). Absent until the first one. */
  shieldOrders?: Record<string, { t: number; side: SideId; split: Record<ShieldSide, number> }>;
  /** PKG-14: officers' abilities, drawn from comms' stream the first time one decides (the marine commander's Judgement). */
  officerJudgement?: Partial<Record<OfficerId, number>>;
  /** PKG-14: the flag lieutenant's last opening line, so the next summary opens differently. */
  lastHead?: string;
  /** PKG-22 (F-04): the report the admiral moved the selection to with Tab, by id, so new reports do not move it. */
  cursorId?: number;
  /** PKG-22 (F-03): the enemy ship the admiral has picked out as his target; the master of guns watches her sides. */
  watching?: string | null;
}

/** What the UI draws: one row of the queue. */
export interface QueueItem {
  id: number;
  level: ReportLevel;
  type: ReportType;
  from: Speaker;
  text: string;
  answers: string[];
  secondsLeft: number | null;
  selected: boolean;
  /** For the summary row: how many status lines it folds. */
  folded: number;
  /** PKG-22: the ship the report is about (a capture card's prize), or null. */
  about: string | null;
}

export interface CommandResult {
  ok: boolean;
  /** Said out loud when not ok (or when the captain protests instead). */
  reason: string | null;
  /** A protest report is waiting for confirmation. */
  protest: number | null;
}
