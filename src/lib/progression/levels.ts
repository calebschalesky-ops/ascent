/**
 * Levels: experience, the curve, and what each level opens (bay slots and tech tiers). FIRST PASS numbers.
 *
 * Total experience to reach level L is 50 × L × (L − 1): 100 for level 2, 300 for 3, 600 for 4 … 4,500 for 10.
 * Each level asks for 100 more than the last, so at 40 per cruiser it is 3 kills to level 2 and 12 more to level 4.
 */
export const MAX_LEVEL = 10;

export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelOf(xp: number): number {
  let l = 1;
  while (l < MAX_LEVEL && xp >= xpForLevel(l + 1)) l++;
  return l;
}

/** Experience into this level and the size of the step to the next (null at the cap). */
export function levelProgress(xp: number): { level: number; into: number; need: number | null } {
  const level = levelOf(xp);
  if (level >= MAX_LEVEL) return { level, into: xp - xpForLevel(level), need: null };
  return { level, into: xp - xpForLevel(level), need: xpForLevel(level + 1) - xpForLevel(level) };
}

export interface Unlock { level: number; baySlots: number; tier: number; note: string }

/** What is open at each level: total bay slots and the highest tech tier on sale. */
export const UNLOCKS: Unlock[] = [
  { level: 1, baySlots: 0, tier: 1, note: 'Your race’s cruiser and tier-1 tech.' },
  { level: 2, baySlots: 1, tier: 1, note: 'Fighter bay: the first slot, and a fighter for it.' },
  { level: 3, baySlots: 1, tier: 2, note: 'Tier-2 tech.' },
  { level: 4, baySlots: 2, tier: 2, note: 'Second bay slot.' },
  { level: 5, baySlots: 2, tier: 3, note: 'Tier-3 tech.' },
  { level: 6, baySlots: 3, tier: 3, note: 'Third bay slot.' },
  { level: 7, baySlots: 3, tier: 4, note: 'Tier-4 tech.' },
  { level: 8, baySlots: 4, tier: 4, note: 'Fourth bay slot.' },
  { level: 9, baySlots: 4, tier: 4, note: 'Nothing yet.' },
  { level: 10, baySlots: 4, tier: 4, note: 'Nothing yet (room for a capital-ship command).' },
];

export const unlockAt = (level: number): Unlock => UNLOCKS[Math.max(1, Math.min(MAX_LEVEL, level)) - 1];
export const baySlotsAt = (level: number) => unlockAt(level).baySlots;
export const tierAt = (level: number) => unlockAt(level).tier;

/** Lines for what opened between two levels, for the level-up toast. */
export function unlocksBetween(from: number, to: number): string[] {
  const out: string[] = [];
  for (let l = from + 1; l <= to; l++) {
    const a = unlockAt(l - 1);
    const b = unlockAt(l);
    if (b.baySlots > a.baySlots) out.push(`Bay slot ${b.baySlots} open`);
    if (b.tier > a.tier) out.push(`Tier-${b.tier} tech on sale`);
  }
  return out;
}
