/**
 * The first ship's level-1 fit: what the ship screen offers in each of the cruiser's slots. Only tier-1 modules
 * (progression's catalog.ts), and the first weapon slot is always a gun, so every pilot can do the laser lesson.
 */
import type { NationId } from '../nations';
import type { Fit, Module, SlotKind } from '../progression/catalog';
import { MODULES, SLOTS, SLOT_KINDS, fitProblem, loadoutOf } from '../progression/catalog';
import type { ModuleId } from '../progression/refs';
import { ENGINE_WEAPON } from '../progression/refs';

export const FIRST_TIER = 1;

/** The modules on offer for slot `index` of `kind`. */
export function slotOptions(kind: SlotKind, index: number): Module[] {
  return MODULES.filter((m) => m.kind === kind && m.tier <= FIRST_TIER && (kind !== 'weapon' || index > 0 || ENGINE_WEAPON[m.id] === 'laser'));
}

/** The nation's own level-1 cruiser fit, copied. */
export const standardFit = (n: NationId): Fit => {
  const f = loadoutOf(n, 'cruiser');
  return { weapon: [...f.weapon], defence: [...f.defence], support: [...f.support] };
};

/** Put `id` in slot `index` of `kind`. */
export function setSlot(f: Fit, kind: SlotKind, index: number, id: ModuleId): Fit {
  const next = { weapon: [...f.weapon], defence: [...f.defence], support: [...f.support] };
  next[kind][index] = id;
  return next;
}

/** Why a first fit is not allowed, or null. */
export function firstFitProblem(f: Fit): string | null {
  const p = fitProblem(f, 'cruiser', FIRST_TIER);
  if (p) return p;
  for (const k of SLOT_KINDS) if (f[k].length !== SLOTS.cruiser[k]) return `${k}: ${f[k].length} of ${SLOTS.cruiser[k]} slots filled`;
  if (ENGINE_WEAPON[f.weapon[0]] !== 'laser') return 'the first weapon slot takes a gun';
  return null;
}

export const sameFit = (a: Fit, b: Fit) => SLOT_KINDS.every((k) => a[k].join() === b[k].join());
