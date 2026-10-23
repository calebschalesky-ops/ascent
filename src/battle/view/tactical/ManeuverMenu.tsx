/**
 * The "Maneuver" lines of the comms order menu (PKG-12): the six maneuvers as buttons. In the order menu on an enemy the
 * target is already chosen, so the ghost line shows at once; in the selected ship's bar it asks for a target click.
 * Mounted from CommsHud.tsx; draws only while the `tactical` flag is on and the picker is wired.
 *
 * PKG-21: `ship` is the ship the bar or menu names, passed straight to the picker (F-13: the maneuver is always for
 * the ship on screen, never re-read from the selection). A maneuver that ship can never fly (a Boarding run with no
 * boarding hangar, TRC05-7) says why on the button and in its title; it still opens, so the panel can say it too.
 */
import type { CommsController } from '../comms/controller';
import { MANEUVER_LABELS, MANEUVER_ORDER } from './picker';

export default function ManeuverMenu({ ctl, ship, target = null, onChosen }: { ctl: CommsController; ship: string | null; target?: string | null; onChosen?: () => void }) {
  const m = ctl.maneuvers;
  if (!m || !m.enabled() || !ship) return null;
  return (
    <div className="cx-menu-row tac-maneuvers" role="group" aria-label="Maneuver">
      <span className="cx-dim">Maneuver</span>
      {MANEUVER_ORDER.map((name) => {
        const cannot = m.cannot?.(name, ship) ?? null;
        return (
          <button key={name} type="button" role="menuitem" data-id={`maneuver-${name}`} className={cannot ? 'tac-cannot' : undefined}
            onClick={() => { m.choose(name, target, ship); onChosen?.(); }}
            title={cannot ? `Cannot: ${cannot}` : target ? 'Shows the ghost line; Enter or Commit to order it, Esc to cancel' : 'Then click an enemy ship for the target'}>
            {MANEUVER_LABELS[name]}{cannot && <span className="tac-cannot-why"> · {cannot.includes('hangar') ? 'no hangar' : 'cannot'}</span>}
          </button>
        );
      })}
    </div>
  );
}
