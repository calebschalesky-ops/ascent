/**
 * Fleet command: the data every order, formation and ship brain works on. Pure (no three.js), so all of it is
 * unit-tested, and so an enemy fleet can run on exactly the same brains later.
 *
 * Distances are world units unless a name says otherwise; `L` (the player ship's length in world units) turns the
 * per-type numbers in spec.ts, which are in ship lengths, into world units.
 */
import type { V3 } from '../nav';
import type { ShipType } from '../shipTypes';

/** 0 is the player's side, 1 is hostile. Nations at war with each other are a later question. */
export type Side = 0 | 1;

export type Stance = 'aggressive' | 'defensive' | 'holdFire' | 'evasive';
export type FormationId = 'wedge' | 'line' | 'column' | 'screen';

export type Order =
  /** Form up on a ship (the flagship, usually) in the wing's formation. */
  | { kind: 'follow'; leader: number }
  /** Hold a point, facing one way, in formation. */
  | { kind: 'hold'; at: V3; facing: V3 }
  /** Every ship in the wing goes for one target (focus fire). */
  | { kind: 'attack'; target: number }
  /** Escort a ship: keep station on it and engage anything that attacks it or comes near. */
  | { kind: 'defend'; ward: number }
  /** Fly a drawn path in formation; loop it (a patrol) or hold at the last point. */
  | { kind: 'path'; points: V3[]; loop: boolean; next: number }
  /** Fly back to a carrier and dock in its bay. */
  | { kind: 'recall'; carrier: number };

export type OrderKind = Order['kind'];

export interface Agent {
  id: number;
  side: Side;
  type: ShipType;
  pos: V3;
  vel: V3;
  fwd: V3; // unit
  speed: number;
  hp: number;
  maxHp: number;
  radius: number; // hit radius, world units
  alive: boolean;
  /** Moved by a brain. Patrol ships and the player's own ship are not; their pose is copied in each frame. */
  driven: boolean;
  wing: number | null;
  target: number | null;
  cooldown: number;
  /** The last ship that hit this one, and when (world time), so escorts know who to go after. */
  hitBy: number | null;
  hitAt: number;
  docked: boolean;
  /** Pulling away after an attack run, before it turns in again. */
  breaking?: boolean;
}

export interface Wing {
  id: number;
  name: string;
  side: Side;
  order: Order;
  formation: FormationId;
  stance: Stance;
  members: number[];
  /** Where the formation is centred and which way it faces; moved along a path, pinned to a leader, or fixed. */
  anchor: { pos: V3; fwd: V3; speed: number } | null;
  /**
   * Where this wing's formation sits on the ship it follows or defends, as [right, up, back] in multiples of that
   * ship's hit radius, so two wings on one flagship do not share slots. Default: centred on it.
   */
  station?: V3;
  /** The player's own ship's wing (its turrets): not listed, and not given orders. */
  own?: boolean;
}

export interface Bolt { pos: V3; vel: V3; age: number; life: number; side: Side; damage: number; from: number }

export interface Body { pos: V3; size: number }

export interface FleetStats { shots: number; hits: number; kills: number; lost: number; docked: number }

export interface FleetWorld {
  time: number;
  /** The player ship's length in world units. */
  L: number;
  agents: Map<number, Agent>;
  wings: Wing[];
  bolts: Bolt[];
  bodies: Body[];
  stats: FleetStats;
}

export const newStats = (): FleetStats => ({ shots: 0, hits: 0, kills: 0, lost: 0, docked: 0 });
