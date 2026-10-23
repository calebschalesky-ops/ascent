/**
 * Paying the pilot for conquest: experience and credits from a kill at levy rates, a site taken, or income. Mirrors
 * progression's applyKill (level-up lines, the free fighter when the bay opens) for any amount, so a levy's half pay
 * and a capture's reward level the pilot up the same way a kill does.
 */
import type { Progress } from '../progression/progress';
import { baySlotsAt, levelOf, unlocksBetween } from '../progression/levels';
import { raceRef } from '../progression/refs';

export function grant(p: Progress, xp: number, credits: number, kills = 0): { p: Progress; lines: string[] } {
  const before = levelOf(p.xp);
  const nx = p.xp + Math.max(0, xp);
  const after = levelOf(nx);
  const lines = after > before ? [`Level ${after}`, ...unlocksBetween(before, after)] : [];
  let fighters = p.fighters;
  if (baySlotsAt(before) === 0 && baySlotsAt(after) > 0) {
    fighters = Math.max(fighters, 1);
    lines.push(`A ${raceRef(p.nation).ships.fighter} fighter joins your bay`);
  }
  return { p: { ...p, xp: nx, credits: p.credits + Math.max(0, credits), kills: p.kills + kills, fighters }, lines };
}
