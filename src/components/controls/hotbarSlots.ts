/**
 * The hotbar (mc-controls, R4): nine slots along the bottom, Minecraft-shaped. 1–4 are the fitted weapons, 5 the drone
 * swarm (pressing 5 again cycles its role), 6 the bay's fighters, 7 the infantry carrier, 8 a repair charge, 9 the
 * countermeasure. Number keys pick a slot, the wheel cycles them, F swaps back to the weapon used before. Pure.
 */
import type { SwarmRole } from '../../lib/swarm/roles';
import { SWARM_ROLES } from '../../lib/swarm/roles';
import { UNLOCKS } from '../../lib/progression/levels';
import { carrierSlots } from '../../lib/infantry/carrier';

export type SlotKind = 'weapon' | 'swarm' | 'fighters' | 'infantry' | 'repair' | 'counter';
export const SLOT_KINDS: SlotKind[] = ['weapon', 'weapon', 'weapon', 'weapon', 'swarm', 'fighters', 'infantry', 'repair', 'counter'];
export const SLOTS = SLOT_KINDS.length;
export const SWARM_SLOT = 4;

/**
 * Slot 8, the "golden apple". Nothing in the arsenal or progression is a repair or shield charge you carry and use:
 * the repair drone works on its own and stations repair the hull. The slot shows locked until such an item exists,
 * and its numbers are Palamedes's to prove, not invented here.
 */
export const REPAIR_SLOT = { locked: true, why: 'Repair charge: not in the game yet' } as const;

/**
 * What opens a slot the player does not have yet, so a locked slot reads as a reward with its price on it, not as a
 * dead box (GAMEPLAY.md GP-04). These are today's gates, read from the code that enforces them; the rung list
 * (GP-05, `lib/campaign/rungs.ts`) replaces them when it lands.
 */
export const FIGHTER_LEVEL = UNLOCKS.find((u) => u.baySlots > 0)!.level;
export const CARRIER_LEVEL = UNLOCKS.find((u) => carrierSlots(u.level) > 0)!.level;

/** A locked slot: the short tag on the slot, and the full line for its tooltip. */
export interface SlotGate { unlock: string; why: string }

/**
 * Whether slot `i` is locked for this pilot, and by what. `weapons` is the fit's weapon count, `hullGuns` how many the
 * hull carries (2 for the cruiser). Fighters, the carrier and the countermeasure are locked only while they cannot be
 * had; once open and simply empty, the slot says so instead.
 */
export function slotGate(i: number, s: { level: number; hullGuns: number; counter: boolean }): SlotGate | null {
  const kind = SLOT_KINDS[i];
  if (kind === 'weapon') {
    if (i < s.hullGuns) return null;
    return i === 2
      ? { unlock: 'Destroyer', why: `Slot ${i + 1}: a third gun needs a destroyer's hull. Your cruiser carries ${s.hullGuns}.` }
      : { unlock: 'Capital', why: `Slot ${i + 1}: a fourth gun needs a capital ship.` };
  }
  if (kind === 'fighters' && s.level < FIGHTER_LEVEL) return { unlock: `Lv ${FIGHTER_LEVEL}`, why: `Fighters: your bay opens at level ${FIGHTER_LEVEL}, with a wingman in it.` };
  if (kind === 'infantry' && s.level < CARRIER_LEVEL) return { unlock: `Lv ${CARRIER_LEVEL}`, why: `Infantry carrier: comes aboard at level ${CARRIER_LEVEL}, to land troops on a world's sites.` };
  if (kind === 'repair') return { unlock: 'Soon', why: REPAIR_SLOT.why };
  if (kind === 'counter' && !s.counter) return { unlock: 'Shipyard', why: 'Countermeasure: none fitted. Flares or a jammer from the Shipyard go in your support slot.' };
  return null;
}

export const isWeaponSlot = (i: number) => SLOT_KINDS[i] === 'weapon';

/** The wheel: one slot along per notch, wrapping round (down the wheel is to the right, as in Minecraft). */
export const scrollSlot = (cur: number, deltaY: number) => (deltaY === 0 ? cur : (cur + (deltaY > 0 ? 1 : -1) + SLOTS) % SLOTS);

export interface SlotMemory { last: number; prev: number }
export const newSlotMemory = (): SlotMemory => ({ last: 0, prev: 0 });

/** Remember weapon slots as they are picked, for F. */
export function noteSlot(m: SlotMemory, i: number): SlotMemory {
  if (!isWeaponSlot(i) || i === m.last) return m;
  return { last: i, prev: m.last };
}

/** F: from a weapon slot, the weapon slot used before it; from any other slot, back to the weapon in hand. */
export const swapTarget = (cur: number, m: SlotMemory) => (isWeaponSlot(cur) ? m.prev : m.last);

/** Pressing 5 while the swarm slot is picked cycles its role. */
export const nextRole = (r: SwarmRole): SwarmRole => SWARM_ROLES[(SWARM_ROLES.indexOf(r) + 1) % SWARM_ROLES.length];
