/**
 * `player-answers-first` (PKG-06): answers every report that takes an answer with its first option, at once, so a
 * run can be compared against idle. Acts only through answerTop(), the same key the player presses.
 */
import type { Battle, SideId } from '../types';
import { answerable, answerTop } from './queue';

export function playerAnswersFirst(b: Battle, side: SideId): void {
  if (!b.comms || side !== b.comms.side) return;
  for (let n = 0; n < 50 && answerable(b).length; n++) answerTop(b, 0);
}
