/**
 * PKG-21 (PKG-16's request, TRC05-5): an escort on its screen (standing orders: it follows the flagship) that the
 * player orders at an enemy leaves the flagship open. The order menu and the maneuver panel say so in one line before
 * the commit; nothing blocks the order. PKG-16 measured why it matters (reports/PKG-16.md section 5: escorts left on
 * their screen turned 27 worse seeds of 30 into 6).
 *
 * The comms HUD draws from the controller's snapshot, which carries no stance; the skirmish hands this module the
 * battle once (`setBattleSource`) so the HUD can ask without a new field in someone else's snapshot.
 */
import type { Battle } from '../../sim/index';

export const ESCORT_WARNING = 'Escort leaves the screen';

let source: (() => Battle | null) | null = null;

/** Called once by Skirmish.tsx with the live battle (and again with null on unmount). */
export function setBattleSource(fn: (() => Battle | null) | null): void { source = fn; }

export function battleNow(): Battle | null { return source?.() ?? null; }

/** True when `shipId` is an escort still screening its flagship: an order at an enemy takes it off that screen. */
export function escortOnScreen(b: Battle | null, shipId: string | null): boolean {
  if (!b || !shipId) return false;
  const s = b.ships.find((x) => x.id === shipId);
  return !!s && s.cls === 'escort' && !s.flagship && s.status === 'active' && s.stance.mode === 'follow';
}
