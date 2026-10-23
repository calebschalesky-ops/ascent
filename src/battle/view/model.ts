/**
 * The view-model boundary: everything the battle view reads each frame, and nothing else. The view never reaches into
 * a simulation; a feed produces these frames: simFeed.ts over the real engine (src/battle/sim), or stubFeed.ts behind
 * `?stub` for comparison.
 * Plain data only: no three.js, no React, so a feed can be tested in Node and serialised by the probe.
 */
import type { NationId } from '../../lib/nations';

export type V3 = [number, number, number];
export type Side = 0 | 1;
/** The sim's battle hulls (src/battle/sim BattleClass), plus 'fighter' for the stub. The scene picks the art per class. */
export type ShipCls = 'capital' | 'destroyer' | 'cruiser' | 'carrier' | 'escort' | 'fighter';
/**
 * alive: fighting. broken: in the field, running. The rest are out of the battle: fled (a broken ship jumped away),
 * withdrawn (jumped away on orders), struck (colours struck: dark, surrendered, capturable), wrecked (broken apart).
 */
export type ShipStatus = 'alive' | 'broken' | 'fled' | 'withdrawn' | 'struck' | 'wrecked';
/** In the field: still drawn as a ship under way. */
export const underWay = (s: ShipStatus) => s === 'alive' || s === 'broken';
/** The four shield sides, as the sim names them: fore along the heading, port to its left of the sim's yaw. */
export type ShieldFace = 'fore' | 'aft' | 'port' | 'starboard';
export const SHIELD_FACES: ShieldFace[] = ['fore', 'aft', 'port', 'starboard'];

export interface ShipColours { hull: string; accent: string; glow: string }

export interface ShipView {
  id: string;
  /** The ship's name, for comms. */
  name?: string;
  /** Side 0 is the player's. Read every frame: a captured ship changes side, and its colours with it. */
  side: Side;
  flagship?: boolean;
  /** The house's nation: picks the ship art (styles/) and the colours. */
  house: NationId;
  cls: ShipCls;
  /** World position, in battle units (a cruiser is about 5 long). */
  pos: V3;
  /** Unit vector the bow points along. */
  heading: V3;
  status: ShipStatus;
  colours: ShipColours;
  /**
   * The shield sides that are down. Set only on the player's own ships (VISION §7a "Seeing is not knowing"): an enemy's
   * shields reach the view only as hit flashes, never as state.
   */
  open?: ShieldFace[];
}

/** A shot fired this frame: the view draws its tracer flying from `from` to `to` over `flight` seconds. */
export interface ShotView {
  shooter: string;
  target: string;
  side: Side;
  kind: 'gun' | 'rail' | 'laser' | 'missile' | 'pd';
  from: V3;
  to: V3;
  flight: number;
  hit: boolean;
  /** On a hit: the target's shield side it struck (the flash lands there), and whether it went through to the hull. */
  face?: ShieldFace;
  hull?: boolean;
}

/** PKG-25: a fighter wing out of its hangar (flying its task, or heading home). */
export interface WingView {
  id: string;
  side: Side;
  /** Fighters left in it (whole craft). */
  craft: number;
  returning: boolean;
  pos: V3;
  heading: V3;
}

export interface BattleEvent { t: number; kind: string; ship?: string; text: string }

export interface SideInfo { side: Side; house: NationId; name: string; colours: ShipColours }

export interface BattleFrame {
  /** Battle time in seconds since the start. */
  t: number;
  seed: number;
  sides: [SideInfo, SideInfo];
  ships: ShipView[];
  /** Shots fired in this step only. */
  shots: ShotView[];
  /** Events raised in this step only. */
  events: BattleEvent[];
  /** Set when the battle is over. */
  outcome?: Ending;
  /** PKG-25: fighter wings out of their hangars. Absent: none. */
  wings?: WingView[];
}

/** One side's tally for the end screen (from the sim's summarise()). */
export interface SideTally { lost: number; broken: number; struck: number; fled: number; captured: number }

export interface Ending {
  winner: Side | null;
  /** The headline from the player's seat: Victory, Defeat, Drawn. */
  text: string;
  /** How it ended (the sim's outcome kind) and why, in words. */
  kind?: string;
  reason?: string;
  tally?: [SideTally, SideTally];
}

/** What the view (and the probe) drive. A feed steps on a fixed timestep; the view only reads its frames. */
export interface BattleFeed {
  readonly name: string;
  /** Game seconds per real second for the frame loop (1 by default; the tactical view may slow it to 0.25). */
  timeScale: number;
  reset(seed: number): BattleFrame;
  step(dt: number): BattleFrame;
  frame(): BattleFrame;
}
