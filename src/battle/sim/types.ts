/**
 * The battle sim's state shapes (PKG-02). Everything here is plain data: a Battle round-trips through JSON unchanged,
 * which is what lets a test, a replay or a later save hold it. No functions, Maps, classes or undefined-vs-missing
 * fields live in the state.
 *
 * Frame: battle-local, metres, at Saturn's rings. The ring plane is XZ; Y is up and stays 0 in Phase A.
 */
import type { AdmiralState } from './admiral/state';
import type { Rng } from './rng';
import type { BoardingState } from './boarding/types';

export type SideId = 'player' | 'enemy';
export const SIDES: SideId[] = ['player', 'enemy'];
export const otherSide = (s: SideId): SideId => (s === 'player' ? 'enemy' : 'player');

export type ShieldSide = 'fore' | 'aft' | 'port' | 'starboard';
export const SHIELD_SIDES: ShieldSide[] = ['fore', 'aft', 'port', 'starboard'];

export type SystemId = 'engines' | 'guns' | 'pd' | 'hangar' | 'jump';
export const SYSTEMS: SystemId[] = ['engines', 'guns', 'pd', 'hangar', 'jump'];

/**
 * Battle hull classes. capital, destroyer and cruiser are lib/shipTypes.ts's ShipType rows at battle scale; carrier and
 * escort are battle-only hulls (NAVY §2 names carriers; escorts are the point-defence screen). Fighters are wings, not
 * ships, and are not modelled in Phase A's sim.
 */
export type BattleClass = 'capital' | 'destroyer' | 'cruiser' | 'carrier' | 'escort';

export type GunKind = 'rail' | 'laser' | 'missile';

/** BRIDGE-DESIGN §1: Bold, Cautious, Veteran, Ambitious, Fanatic, plus the six bridge traits. */
export type Trait =
  | 'Bold' | 'Cautious' | 'Veteran' | 'Ambitious' | 'Fanatic'
  | 'Glory-hound' | 'By-the-book' | 'Grudge-holder' | 'Protector' | 'Pessimist' | 'Optimist';
export const TRAITS: Trait[] = [
  'Bold', 'Cautious', 'Veteran', 'Ambitious', 'Fanatic',
  'Glory-hound', 'By-the-book', 'Grudge-holder', 'Protector', 'Pessimist', 'Optimist',
];

export type Mood = 'confident' | 'steady' | 'strained' | 'panicked' | 'defiant';

export interface Abilities { gunnery: number; helm: number; nerve: number; judgement: number; candour: number }
export type AbilityId = keyof Abilities;

export interface Captain {
  name: string;
  abilities: Abilities;
  trait: Trait;
  /** Fast: moves within a battle, derived from morale and trait. */
  mood: Mood;
  /** Slow: 0–100, moves over a campaign; in battle only a Grudge-holder's ignored request touches it. */
  loyalty: number;
}

export interface V3 { x: number; y: number; z: number }

/** active: fighting. broken: in the field, running. The rest are out of the battle. */
export type ShipStatus = 'active' | 'broken' | 'fled' | 'withdrawn' | 'struck' | 'wrecked';
export const inField = (s: ShipStatus) => s === 'active' || s === 'broken';

export type Mode = 'engage' | 'hold' | 'follow' | 'withdraw' | 'pursue' | 'cover' | 'flee';

export interface Gun { kind: GunKind; cd: number }

export interface Stance {
  mode: Mode;
  target: string | null;
  /** focusSide: the side of the target this ship manoeuvres to hit. */
  side: ShieldSide | null;
  /** The side this ship tries to show its main threat (a fresh side), or null to fly bow-on. */
  present: ShieldSide | null;
  /** Why the current stance was chosen: 'order', or the captain's reason. */
  why: string;
}

export type OrderKind = 'attack' | 'focusSide' | 'holdPosition' | 'followFlagship' | 'withdraw' | 'shieldPower' | 'board' | 'pullBack'
  | 'gunsOn' | 'holdFire' | 'overloadGuns' | 'feedEngines' | 'helm' | 'launchPods' | 'fighters'
  | 'maneuver';
export const ORDER_KINDS: OrderKind[] = ['attack', 'focusSide', 'holdPosition', 'followFlagship', 'withdraw', 'shieldPower', 'board', 'pullBack',
  'gunsOn', 'holdFire', 'overloadGuns', 'feedEngines', 'helm', 'launchPods', 'fighters',
  'maneuver'];

export interface Order {
  kind: OrderKind;
  target?: string;
  side?: ShieldSide;
  split?: Record<ShieldSide, number>;
  /** helm: the maneuver's name (PKG-06 stores it; the flying is EXP-03). */
  maneuver?: string;
  /** fighters: the wings' task (escort, screen, hunt); `target` is the ship to escort or screen (PKG-25: the wings fly it). */
  task?: string;
  /** maneuver (PKG-10): the maneuver's name (maneuvers/types.ts MANEUVER_NAMES). */
  name?: string;
  /** maneuver (PKG-10): the other ships that fly it with this one (boarding run, wheel, withdrawal). */
  group?: string[];
}

export interface Ship {
  id: string;
  name: string;
  side: SideId;
  cls: BattleClass;
  flagship: boolean;
  captain: Captain;
  pos: V3;
  /** Yaw in radians in the XZ plane; forward = (cos h, 0, sin h). */
  heading: number;
  /** Speed along the heading, m/s. */
  speed: number;
  hull: number;
  hullMax: number;
  /** Total shield capacity across the four sides at an even split. */
  shieldTotal: number;
  shields: Record<ShieldSide, number>;
  /** A side is open from the moment it hits zero until it regains SHIELD.reopenFrac of its max. */
  open: Record<ShieldSide, boolean>;
  /** Power split across the sides; sums to 1. A side's max is shieldTotal × split. */
  split: Record<ShieldSide, number>;
  /** Battle time each side was last hit (regen waits after a hit). */
  lastHit: Record<ShieldSide, number>;
  systems: Record<SystemId, number>;
  crew: number;
  crewMax: number;
  marines: number;
  marinesMax: number;
  morale: number;
  moraleStart: number;
  status: ShipStatus;
  brokenAt: number | null;
  outAt: number | null;
  guns: Gun[];
  order: Order | null;
  stance: Stance;
  nextThink: number;
  /** Seconds of jump spool accumulated (resets when mass-locked). */
  spool: number;
  /** Seconds spent mass-locked while broken. */
  pinned: number;
  lastHullHitAt: number;
  /** Battle time of this ship's last shield shift or fresh-side turn (they wait SHIELD.decisionCooldown). */
  lastDefence: number;
  lastAttacker: string | null;
  /** Requests this captain has already raised, by kind, so each is asked once per cause. */
  asked: string[];
  dealt: number;
  /** PKG-05: captured by boarding and fighting for its captor with a prize crew. Absent on a ship never taken. */
  prize?: boolean;
  /** PKG-05: the side it was taken from. */
  capturedFrom?: SideId;
}

export interface StandingOrders {
  /** 'captains': each captain picks targets by Judgement and trait. */
  engage: 'captains';
  boarding: boolean;
}

export interface SideState {
  house: string;
  world: string;
  initial: number;
  flagshipId: string;
  morale: number;
  broken: boolean;
  brokenAt: number | null;
  brokenReason: string | null;
  standing: StandingOrders;
  /** Ships of this side in the field when it broke. */
  inFieldAtBreak: number;
  /** The ship this side's controller is concentrating on (doctrine controllers only). */
  fleetTarget: string | null;
  /** The AI admiral's memory (PKG-07), present only on a side an admiral commands. */
  admiral?: AdmiralState;
}

export type RequestKind = 'withdraw' | 'pursue' | 'cover';

/** A captain's question to the admiral. Unanswered by its deadline, the captain decides (a timeout decision). */
export interface Request {
  id: number;
  t: number;
  ship: string;
  kind: RequestKind;
  about: string | null;
  options: string[];
  deadline: number;
}

export interface Decision {
  t: number;
  ship: string;
  side: SideId;
  decision: string;
  /** The trait or ability that decided it. */
  why: string;
  trait: Trait;
  timeout: boolean;
  /** Comms report the decision answered (PKG-06). */
  report?: number;
  /** The answer key the captain took (PKG-06). */
  choice?: string;
}

export type LogEvent =
  | { t: number; kind: 'shot'; ship: string; target: string; gun: GunKind; range: number; p: number; roll: number; hit: boolean; side: ShieldSide; pd?: { p: number; roll: number; stopped: boolean }; shieldDmg: number; hullDmg: number; system?: SystemId; systemDmg?: number }
  | { t: number; kind: 'order'; ship: string; order: Order; ok: boolean; by: SideId }
  | { t: number; kind: 'decision'; ship: string; decision: string; why: string; timeout: boolean }
  | { t: number; kind: 'request'; ship: string; request: RequestKind; about: string | null; id: number }
  | { t: number; kind: 'answer'; id: number; choice: string }
  | { t: number; kind: 'shieldDown'; ship: string; side: ShieldSide }
  | { t: number; kind: 'systemOut'; ship: string; system: SystemId }
  | { t: number; kind: 'break'; ship: string; reason: string; morale: number }
  | { t: number; kind: 'out'; ship: string; how: ShipStatus }
  | { t: number; kind: 'flagshipLost'; side: SideId; ship: string; moraleDrop: number }
  | { t: number; kind: 'sideBroken'; side: SideId; reason: string }
  | { t: number; kind: 'end'; outcome: Outcome; reason: string }
  | { t: number; kind: 'commsAnswer'; report: number; ship: string; answer: number; label: string; by: 'admiral' | 'timeout' }
  | { t: number; kind: 'commsRefused'; ship: string; order: Order | null; reason: string }
  // PKG-05 boarding events (`ship` is the target, except boardLaunch's launcher):
  | { t: number; kind: 'boardLaunch'; ship: string; target: string; group: number; pods: number; marines: number; side: ShieldSide; reinforcing: boolean; ordered: boolean }
  | { t: number; kind: 'boardDeflected'; ship: string; side: ShieldSide; group: number; pods: number; marines: number; repowered?: boolean }
  | { t: number; kind: 'boardLost'; ship: string; group: number; pods: number; n: number; p: number }
  | { t: number; kind: 'breach'; ship: string; side: ShieldSide; group: number; marines: number; hullDmg: number }
  | { t: number; kind: 'boardFight'; ship: string; by: SideId; attackers: number; defenders: number }
  | { t: number; kind: 'captured'; ship: string; by: SideId; from: SideId; marines: number }
  | { t: number; kind: 'repelled'; ship: string; by: SideId; marinesLost: number }
  | { t: number; kind: 'scuttled'; ship: string; by: SideId; marinesLost: number; p: number; roll: number }
  | { t: number; kind: 'boardPullBack'; ship: string; by: SideId; returned: number }
  | { t: number; kind: 'telegraph'; side: SideId; target: string; targetSide: ShieldSide; launchAt: number }
  // PKG-10: a maneuver started (with its time to completion), finished, or was broken off by a new order.
  | { t: number; kind: 'maneuver'; ship: string; name: string; target: string | null; phase: 'start' | 'done' | 'brokenOff'; eta?: number }
  // PKG-25: fighter wings launched, came home, were lost; a wing's pass shot down pods.
  | { t: number; kind: 'wingLaunch'; wing: string; side: SideId; from: string; task: string; craft: number }
  | { t: number; kind: 'wingHome'; wing: string; side: SideId; ship: string; craft: number }
  | { t: number; kind: 'wingLost'; wing: string; side: SideId; how: 'lost' | 'gone'; why: string }
  | { t: number; kind: 'podIntercept'; wing: string; side: SideId; group: number; target: string; pods: number; n: number; p: number };

export type Outcome = 'victory' | 'defeat' | 'withdrawal' | 'timeout';

export interface SideStats {
  damageDealt: number;
  damageAt60: number;
  shots: number;
  hits: number;
}

export interface Stats {
  sides: Record<SideId, SideStats>;
  decisions: Decision[];
  decisionsDropped: number;
  selfDecisions: number;
  timeoutDecisions: Decision[];
  orders: number;
  boardingAttempts: number;
  /** Mean ship morale per side, sampled every N.moraleSampleS. */
  moraleSeries: { t: number; player: number; enemy: number }[];
}

export interface Battle {
  v: 1;
  seed: number;
  /** The seed the captains were generated from (see BattleSetup.rosterSeed). */
  rosterSeed: number;
  setup: string;
  variant: string | null;
  tick: number;
  t: number;
  dt: number;
  maxT: number;
  rng: Rng;
  ships: Ship[];
  sides: Record<SideId, SideState>;
  controllers: Record<SideId, string>;
  requests: Request[];
  nextRequestId: number;
  log: LogEvent[];
  logDropped: number;
  stats: Stats;
  outcome: Outcome | null;
  winner: SideId | 'draw' | null;
  reason: string | null;
  ended: boolean;
  endT: number | null;
  /** The comms queue, command points and the flagship's crew (PKG-06), created on first use. */
  comms?: import('./comms/types').CommsState;
  /** PKG-05: pods in flight and fights inside hulls; created on the first boarding tick. */
  boarding?: BoardingState;
  /** PKG-10: ships flying maneuvers; created on the first maneuver. */
  maneuvers?: import('./maneuvers/types').ManeuverState;
  /** PKG-25: fighter wings; created on the first fighter-command order of either side. */
  fighters?: import('./fighters/types').FighterState;
}

/** One ship in a setup: data only. */
export interface ShipSetup { name: string; cls: BattleClass; flagship?: boolean }
export interface SideSetup { house: string; world: string; ships: ShipSetup[]; standing: StandingOrders; controller: string }
export interface BattleSetup {
  name: string;
  player: SideSetup;
  enemy: SideSetup;
  separationM: number;
  /**
   * Captains are people, not dice: when set, every battle on this setup has the same captains whatever the battle seed,
   * and the seed varies only the dice. Unset: captains are generated from the battle seed.
   */
  rosterSeed?: number;
  /** PKG-20: the body the battle is fought at (the scene draws it). Unset: Saturn, at its rings. */
  body?: BodyId;
  /** PKG-20: where the battle is, as the skirmish header says it ("Saturn’s rings"). Unset: from the body. */
  place?: string;
  /** PKG-20: a fixed captain roster fixture (setups/rosters/), applied by setups' startBattle. */
  roster?: string;
  /** PKG-20: wings, by ship name, each placed at an offset from its side's line (metres, battle frame). */
  wings?: WingSetup[];
  /** PKG-20: ships that arrive later. Data only: a later package fires them (none does yet). */
  reinforcements?: ReinforcementSetup[];
  /** PKG-20: non-combat ships a side must protect (tankers). Data only: the sim has no tanker class yet. */
  convoy?: { side: SideId; ships: string[] }[];
  /** PKG-20: ships whose house the other side is courting (EXP-13, ref-22). Data only: defection is a later package. */
  courted?: { side: SideId; ships: string[]; by: SideId }[];
  /** PKG-20: the admiral style each side is meant to fight with (mars, jupiter, moon, mercury); the AI2 package reads it. */
  styles?: Partial<Record<SideId, string>>;
  /** PKG-20: what this setup needs that no package has built yet (terrain, a depot, a comms array): start state only. */
  needs?: string[];
}
/** PKG-20: the bodies a battle can be fought at. */
export type BodyId = 'saturn' | 'europa' | 'titan' | 'phobos' | 'moon' | 'mercury';
/** PKG-20: a wing: ships of one side, moved together off the line abreast by `offset` metres. */
export interface WingSetup { side: SideId; name: string; ships: string[]; offset: { x: number; z: number } }
/** PKG-20: a reinforcement wave: `ships` of `house` arrive for `side` at `atS` seconds, by jump, `atM` from the centre. */
export interface ReinforcementSetup { side: SideId; atS: number; via: 'jump'; house: string; world: string; ships: ShipSetup[]; atM: { x: number; z: number } }
