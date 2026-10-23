/**
 * PKG-22 (F-09): one captain, one card on screen. QA-05 run 1: Pnyx sent "We have lost the guns" and "Request
 * permission to withdraw" at once, the admiral answered one, and the other timed out with "Carrying on".
 *
 * The rule is about what the admiral sees, never about what the captains do: every card still times out exactly as it
 * did (so an idle battle runs the same), but of a captain's open cards only one is shown and answerable: his oldest
 * PKG-02 request if he has one (battle.ts will not drop it), else his newest card. Answering it closes the others.
 */
import type { Report } from './types';

export function shownCards(open: Report[]): Set<Report> {
  const pick = new Map<string, Report>();
  for (const r of open) {
    if (r.from.officer !== null || r.level === 'status') continue;
    const cur = pick.get(r.ship);
    if (!cur) { pick.set(r.ship, r); continue; }
    const better = cur.requestId !== null
      ? r.requestId !== null && r.id < cur.id
      : r.requestId !== null || r.id > cur.id;
    if (better) pick.set(r.ship, r);
  }
  return new Set(pick.values());
}
