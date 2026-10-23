/**
 * PKG-20: the setup registry. `?skirmish&setup=<id>` and `npm run sim -- --setup <id>` pick a setup by id; the default
 * stays `saturn-12v12`. An id may carry a roster fixture after a plus, `<setup>+<roster>` (EXP-10's
 * `saturn-12v12+candour-mix`, EXP-11's `europa-12v12+pushback-mix`).
 *
 * Every id is a start state a script names (vision/scripts/EXP-07..15, WORLD-03..06), and nothing else:
 *   europa-12v11 (EXP-07) · titan-haze-12v11, phobos-13v12 (EXP-08) · europa-12v12-wings (EXP-09, WORLD-04) ·
 *   saturn-12v12+candour-mix (EXP-10) · europa-12v12+pushback-mix (EXP-11) · saturn-16v16-reinforced (EXP-12) ·
 *   titan-14v12-defector (EXP-13) · europa-12v12 (EXP-14, EXP-15) · phobos-12v12, moon-12v12, mercury-12v12 (EXP-15,
 *   WORLD-06) · ref-03, ref-05, ref-08, ref-10, ref-11, ref-22, ref-24, ref-27, ref-28 (WORLD-03).
 *
 * `startBattle` is createBattle plus what the setup adds (a roster fixture, wings). For a setup with neither (and so for
 * saturn-12v12) it is exactly createBattle.
 */
import { createBattle, VARIANTS } from '../battle';
import type { CreateOptions } from '../battle';
import type { Battle, BattleSetup, BodyId } from '../types';
import { SATURN_12V12 } from './saturn-12v12';
import { EUROPA_12V11, EUROPA_12V12, EUROPA_12V12_WINGS, REF_11 } from './europa';
import { REF_22, TITAN_14V12_DEFECTOR, TITAN_HAZE_12V11 } from './titan';
import { PHOBOS_12V12, PHOBOS_13V12, REF_10, REF_27 } from './phobos';
import { MOON_12V12, REF_24 } from './moon';
import { MERCURY_12V12, REF_28 } from './mercury';
import { REF_03, REF_05, REF_08, SATURN_16V16_REINFORCED } from './saturn';
import { ROSTERS } from './rosters';
import { applyRoster, applyWings, restartMorale } from './apply';

export const DEFAULT_SETUP = 'saturn-12v12';

/** The registry: one line per setup (append-only; two packages adding lines keep both). */
export const SETUPS: Record<string, BattleSetup> = Object.fromEntries([
  SATURN_12V12,
  EUROPA_12V11, EUROPA_12V12, EUROPA_12V12_WINGS,
  TITAN_HAZE_12V11, TITAN_14V12_DEFECTOR,
  PHOBOS_13V12, PHOBOS_12V12,
  MOON_12V12, MERCURY_12V12,
  SATURN_16V16_REINFORCED,
  REF_03, REF_05, REF_08, REF_10, REF_11, REF_22, REF_24, REF_27, REF_28,
].map((s) => [s.name, s]));

/** Every id a script names that carries a roster after a plus. */
export const ROSTER_IDS = ['saturn-12v12+candour-mix', 'europa-12v12+pushback-mix'];

export const setupIds = () => [...Object.keys(SETUPS), ...ROSTER_IDS];

/** A setup by id (`<setup>` or `<setup>+<roster>`); throws on an unknown one, naming the registered ids. */
export function setupById(id: string = DEFAULT_SETUP): BattleSetup {
  const [base, roster] = id.split('+');
  const s = SETUPS[base];
  if (!s) throw new Error(`unknown setup "${base}". Registered: ${setupIds().join(', ')}`);
  if (!roster) return s;
  if (!ROSTERS[roster]) throw new Error(`unknown roster "${roster}". Registered: ${Object.keys(ROSTERS).join(', ')}`);
  return { ...s, name: id, roster };
}

/** The body a setup is fought at, and how the header says where. */
export const bodyOf = (s: BattleSetup): BodyId => s.body ?? 'saturn';
export const placeOf = (s: BattleSetup): string => s.place ?? 'Saturn’s rings';

/** createBattle, then the setup's roster fixture and wings. A variant is applied after the roster, as createBattle would. */
export function startBattle(setup: BattleSetup, seed: number, opts: CreateOptions = {}): Battle {
  if (!setup.roster && !setup.wings?.length) return createBattle(setup, seed, opts);
  const b = createBattle(setup, seed, setup.roster ? { ...opts, variant: null } : opts);
  if (setup.roster) {
    applyRoster(b, ROSTERS[setup.roster]);
    if (opts.variant) {
      const v = VARIANTS[opts.variant];
      if (!v) throw new Error(`unknown variant "${opts.variant}"`);
      b.variant = opts.variant;
      v(b);
      restartMorale(b);
    }
  }
  applyWings(b, setup);
  return b;
}
