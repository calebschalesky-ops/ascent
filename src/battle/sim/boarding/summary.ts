/**
 * Boarding's part of summarise() (PKG-05): ships taken by capture and what they were worth. A capture counts the
 * ship's whole PRIZE.value; a wreck of an enemy ship counts PRIZE.wreckFrac of it (EXP-05 step 9: less than a capture).
 */
import { otherSide } from '../types';
import type { Battle, SideId } from '../types';
import { PRIZE } from './numbers';

export function prizeSummary(b: Battle, side: SideId): { captured: number; prizeValue: number } {
  const foe = otherSide(side);
  let captured = 0;
  let value = 0;
  for (const s of b.ships) {
    if (s.capturedFrom === foe && s.side === side) { captured++; value += PRIZE.value[s.cls]; }
    else if ((s.capturedFrom ?? s.side) === foe && s.status === 'wrecked') value += PRIZE.value[s.cls] * PRIZE.wreckFrac;
  }
  return { captured, prizeValue: Math.round(value * 100) / 100 };
}
