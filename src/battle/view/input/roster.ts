/**
 * PKG-21 F-13: the roster strip keeps every card in the slot it first had. QA-05 run 4: Pnyx was taken, the cards after
 * it slid left, and a click where Bema had been selected Agora. Two things moved cards: `rosterOf` sorts ships out of
 * the field to the end, and a captured ship leaves his side's list altogether.
 *
 * `stableRoster` is pure: given the slots so far and this frame's cards, it returns the cards in slot order. A ship
 * that left the list keeps its slot as a `gone` card (greyed, not clickable); a new ship (a prize) takes a new slot at
 * the end. The flagship stays first.
 */
import { useRef } from 'react';
import type { RosterCard } from '../comms/logic';

export interface Slot { card: RosterCard; gone: boolean }

export interface Slots { order: string[]; last: Map<string, RosterCard> }

export const emptySlots = (): Slots => ({ order: [], last: new Map() });

export function stableRoster(slots: Slots, cards: RosterCard[]): Slot[] {
  const now = new Map(cards.map((c) => [c.id, c]));
  // First sight: the flagship first, then the order the list gave.
  const fresh = cards.filter((c) => !slots.order.includes(c.id));
  fresh.sort((a, b) => Number(b.flagship) - Number(a.flagship));
  for (const c of fresh) slots.order.push(c.id);
  for (const c of cards) slots.last.set(c.id, c);
  return slots.order.map((id) => {
    const c = now.get(id);
    return c ? { card: c, gone: false } : { card: slots.last.get(id)!, gone: true };
  });
}

/** The hook the roster strip uses; the slots reset when the battle restarts (a new battle object). */
export function useStableRoster(cards: RosterCard[], battleKey: object | null): Slot[] {
  const ref = useRef<{ key: object | null; slots: Slots }>({ key: battleKey, slots: emptySlots() });
  if (ref.current.key !== battleKey) ref.current = { key: battleKey, slots: emptySlots() };
  return stableRoster(ref.current.slots, cards);
}
