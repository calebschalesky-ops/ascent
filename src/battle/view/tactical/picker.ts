/**
 * The maneuver picker (PKG-12, BRIDGE §12b rule 3): choose a maneuver for the selected ship (or ships), click a target,
 * see the ghost line and its time to completion, then commit or cancel. No DOM: the menu, the clicks, Enter/Esc and the
 * probe all call these methods.
 *
 * The ghost line is PKG-10's `previewManeuver()`, recomputed as the battle moves, and once more at the instant of the
 * commit so the line shown is the course ordered. The commit goes through PKG-06's `command()` (points, pushback,
 * refusals out loud) with `{kind: 'maneuver', name, target, group}`.
 */
import type { Battle, CommandResult, ManeuverName, ManeuverPreview, SideId } from '../../sim/index';
import { MANEUVER_NAMES, command, plan, previewManeuver } from '../../sim/index';

export const MANEUVER_LABELS: Record<ManeuverName, string> = {
  broadsidePass: 'Broadside pass',
  crossingLine: 'Crossing the line',
  flankingArc: 'Flanking arc',
  boardingRun: 'Boarding run',
  defensiveWheel: 'Defensive wheel',
  fightingWithdrawal: 'Fighting withdrawal',
};
export const MANEUVER_ORDER: ManeuverName[] = [...MANEUVER_NAMES];

/** Maneuvers whose threat defaults to the nearest enemy, so they preview before a target is clicked. */
const THREAT_DEFAULT = new Set<ManeuverName>(['defensiveWheel', 'fightingWithdrawal']);

/** `refused`: a target is chosen but no ship in the group can fly it (PKG-21, F-05 / TRC05-7: a Boarding run from a ship
 * with no boarding hangar). The panel shows why; Enter or Commit then closes the pick and says it out loud. */
export type Stage = 'idle' | 'target' | 'ghost' | 'refused';

/** What the comms UI (order menu, clicks on the battle) sees of the picker. Set on the comms controller by mount.ts. */
export interface ManeuverHooks {
  enabled(): boolean;
  /** Start choosing `name` for `ship` (the ship whose bar or menu the button sits in; PKG-21 F-13: never re-read from the
   * selection, so the ship the bar names is the ship the maneuver is for); with a target the ghost shows at once. */
  choose(name: ManeuverName, target?: string | null, ship?: string | null): void;
  /** Why `ship` can never fly `name`, whatever the target (a Boarding run with no hangar); null when it can. */
  cannot?(name: ManeuverName, ship: string): string | null;
  /** A click on a ship while choosing: true when the picker took it (the comms UI then does nothing else). */
  intercept(id: string, own: boolean): boolean;
}

export interface PickerState {
  stage: Stage;
  name: ManeuverName | null;
  label: string | null;
  ships: string[];
  target: string | null;
  preview: ManeuverPreview | null;
  /** Why the pick cannot be committed as it stands (stage `refused`, or `target` with nothing chosen). */
  why: string | null;
  /** The last commit: what was ordered, the ghost it showed, and the answer. */
  last: { t: number; name: ManeuverName; ships: string[]; target: string | null; preview: ManeuverPreview; result: CommandResult } | null;
}

export interface Picker {
  state(): PickerState;
  /** Choose a maneuver for these ships (the lead first). With a target, the ghost shows at once. */
  choose(name: ManeuverName, ships: string[], target?: string | null): PickerState;
  /** Add or remove one of his ships to the group while choosing (shift-click). */
  toggleShip(id: string): PickerState;
  /** An enemy clicked as the target. */
  target(id: string): PickerState;
  /** Re-plot the ghost from where the ships are now (called as the battle moves). */
  refresh(): void;
  /** Enter or the Commit button. `ghost`: the order goes. `refused`: the pick closes and the result says why (no points
   * spent). `target` with no target: nothing is ordered and the result says what is missing; the pick stays open. */
  commit(): CommandResult | null;
  cancel(): void;
  /** A new battle: nothing chosen, nothing remembered. */
  reset(): void;
  active(): boolean;
}

export function createPicker(battle: () => Battle, side: () => SideId, changed: () => void): Picker {
  let st: PickerState = { stage: 'idle', name: null, label: null, ships: [], target: null, preview: null, why: null, last: null };
  let at = -1;

  const own = (id: string) => battle().ships.some((s) => s.id === id && s.side === side() && s.status === 'active');
  const enemy = (id: string) => battle().ships.some((s) => s.id === id && s.side !== side() && (s.status === 'active' || s.status === 'broken'));
  const plot = () => {
    const b = battle();
    at = b.t;
    st = { ...st, preview: st.name && st.ships.length ? previewManeuver(b, st.ships, st.name, st.target) : null };
    const flies = !!st.preview && Object.keys(st.preview.path).length > 0;
    const refused = !flies && !!st.preview?.refused.length && (!!st.target || (!!st.name && THREAT_DEFAULT.has(st.name)));
    st.stage = flies ? 'ghost' : refused ? 'refused' : 'target';
    st.why = refused ? refusalText(b, st.name!, st.preview!.refused) : null;
  };
  const done = () => { changed(); return st; };

  const picker: Picker = {
    state: () => st,
    choose(name, ships, target = null) {
      const lead = ships.filter(own);
      st = { ...st, stage: 'target', name, label: MANEUVER_LABELS[name], ships: [...new Set(lead)], target: target && enemy(target) ? target : null, preview: null, why: null };
      if (!st.ships.length) { st = { ...st, stage: 'idle', name: null, label: null }; return done(); }
      if (st.target || THREAT_DEFAULT.has(name)) plot();
      return done();
    },
    toggleShip(id) {
      if (st.stage === 'idle' || !own(id)) return st;
      st = { ...st, ships: st.ships.includes(id) ? st.ships.filter((x) => x !== id) : [...st.ships, id] };
      if (!st.ships.length) { picker.cancel(); return st; }
      if (st.target || (st.name && THREAT_DEFAULT.has(st.name))) plot();
      return done();
    },
    target(id) {
      if (st.stage === 'idle' || !enemy(id)) return st;
      st = { ...st, target: id };
      plot();
      return done();
    },
    refresh() {
      if (st.stage !== 'ghost' && st.stage !== 'refused') return;
      const b = battle();
      if (b.t === at) return;
      st = { ...st, ships: st.ships.filter(own), target: st.target && enemy(st.target) ? st.target : null };
      if (!st.ships.length) { picker.cancel(); return; }
      plot();
      changed();
    },
    commit() {
      if (st.stage === 'idle' || !st.name) return null;
      if (st.stage === 'target') {
        // Nothing to order yet: say what is missing, keep the pick open (Esc closes it).
        st = { ...st, why: 'Click an enemy ship for the target first.' };
        changed();
        return { ok: false, reason: st.why, protest: null };
      }
      if (st.stage === 'refused') {
        const b = battle();
        const r: CommandResult = { ok: false, reason: st.why, protest: null };
        st = { stage: 'idle', name: null, label: null, ships: [], target: null, preview: null, why: null, last: { t: b.t, name: st.name, ships: st.ships, target: st.target, preview: st.preview!, result: r } };
        changed();
        return r;
      }
      plot(); // the ghost at the instant of the order is the course ordered
      const b = battle();
      const [lead, ...group] = st.ships;
      const preview = st.preview!;
      const target = st.target; // null for a wheel or a withdrawal: the sim takes the nearest enemy, as the preview did
      const r = command(b, lead, { kind: 'maneuver', name: st.name, ...(target ? { target } : {}), ...(group.length ? { group } : {}) });
      st = { stage: 'idle', name: null, label: null, ships: [], target: null, preview: null, why: null, last: { t: b.t, name: preview.name, ships: [lead, ...group], target, preview, result: r } };
      changed();
      return r;
    },
    cancel() {
      if (st.stage === 'idle') return;
      st = { ...st, stage: 'idle', name: null, label: null, ships: [], target: null, preview: null, why: null };
      changed();
    },
    reset() {
      st = { stage: 'idle', name: null, label: null, ships: [], target: null, preview: null, why: null, last: null };
      changed();
    },
    active: () => st.stage !== 'idle',
  };
  return picker;
}

/** "Agora cannot fly the Boarding run: no boarding hangar in the group." One sentence per reason, ships named. */
export function refusalText(b: Battle, name: ManeuverName, refused: { ship: string; reason: string }[]): string {
  const by = new Map<string, string[]>();
  for (const r of refused) by.set(r.reason, [...(by.get(r.reason) ?? []), b.ships.find((s) => s.id === r.ship)?.name ?? r.ship]);
  return [...by].map(([reason, ships]) => `${ships.join(', ')} cannot fly the ${MANEUVER_LABELS[name]}: ${reason}.`).join(' ');
}

/** Why one ship can never fly `name`, whatever enemy it is aimed at (tried against every enemy in the field); null when
 * some target works. Only the Boarding run has such a reason today (a ship with no boarding hangar). */
export function cannotFly(b: Battle, ship: string, name: ManeuverName): string | null {
  if (name !== 'boardingRun') return null;
  const s = b.ships.find((x) => x.id === ship);
  if (!s) return null;
  const foes = b.ships.filter((x) => x.side !== s.side && (x.status === 'active' || x.status === 'broken') && !x.flagship);
  let why: string | null = null;
  for (const f of foes) {
    const p = plan(b, [ship], name, f.id);
    if (p.plans.length) return null;
    why = p.refused.find((r) => r.ship === ship)?.reason ?? why;
  }
  return why;
}
