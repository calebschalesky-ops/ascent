import type { Loadout, Module, Slot } from '../lib/modules';
import { SLOT_LABEL, SLOT_MAX, modulesFor, sanitizeLoadout } from '../lib/modules';
import type { MunitionId } from '../lib/munitions';
import type { CounterId, DroneId } from '../lib/tech';

interface Props {
  loadout: Loadout;
  onChange: (l: Loadout) => void;
}

const SLOTS: Slot[] = ['weapon', 'shield', 'drone', 'counter', 'targeting', 'reactor', 'armour', 'engine'];
const OPTIONAL: Partial<Record<Slot, true>> = { counter: true, armour: true };
const MK = ['I', 'II', 'III'];

/**
 * The loadout screen (pause menu): pick what is fitted. Every module is open to try for now; how upgrades are earned
 * and what they cost is the economy, which is undecided. Fitting refills the shield, capacitor and ammunition.
 */
export default function LoadoutPanel({ loadout, onChange }: Props) {
  const l = sanitizeLoadout(loadout);
  const set = (p: Partial<Loadout>) => onChange(sanitizeLoadout({ ...l, ...p }));
  const fittedIn = (slot: Slot): string[] => {
    switch (slot) {
      case 'weapon': return l.weapons;
      case 'drone': return l.drones;
      case 'shield': return [l.shield];
      case 'counter': return l.counter ? [l.counter] : [];
      case 'targeting': return [l.targeting];
      case 'reactor': return [l.reactor];
      case 'armour': return l.armour ? [l.armour] : [];
      case 'engine': return [l.engine];
    }
  };
  const toggle = (slot: Slot, m: Module) => {
    const on = fittedIn(slot).includes(m.id);
    if (slot === 'weapon') set({ weapons: (on ? l.weapons.filter((w) => w !== m.id) : [...l.weapons, m.id]) as MunitionId[] });
    else if (slot === 'drone') set({ drones: (on ? l.drones.filter((w) => w !== m.id) : [...l.drones, m.id]) as DroneId[] });
    else if (slot === 'counter') set({ counter: on ? null : (m.id as CounterId) });
    else if (slot === 'armour') set({ armour: on ? null : m.id });
    else set({ [slot]: m.id } as Partial<Loadout>);
  };

  return (
    <div className="loadout">
      <p className="small muted">Fitting refills the shield, capacitor and ammunition. G cycles the fitted weapons. Costs and how upgrades are earned are not decided yet.</p>
      {SLOTS.map((slot) => {
        const on = fittedIn(slot);
        const multi = SLOT_MAX[slot] > 1;
        const full = multi && on.length >= SLOT_MAX[slot];
        return (
          <fieldset key={slot} className="loadout-slot">
            <legend>{SLOT_LABEL[slot]}{multi ? ` (${on.length}/${SLOT_MAX[slot]})` : OPTIONAL[slot] ? ' (optional)' : ''}</legend>
            {modulesFor(slot).map((m) => {
              const isOn = on.includes(m.id);
              const locked = (multi && !isOn && full) || (slot === 'weapon' && isOn && on.length === 1) || (!multi && !OPTIONAL[slot] && isOn);
              return (
                <label key={m.id} className={`loadout-row${isOn ? ' on' : ''}`}>
                  <input type={multi || OPTIONAL[slot] ? 'checkbox' : 'radio'} name={slot} checked={isOn} disabled={locked && !(!multi && !OPTIONAL[slot] && isOn)}
                    onChange={() => { if (!locked) toggle(slot, m); }} />
                  <span className="loadout-name">{m.name} <span className="loadout-tier">T{m.tier}{slot === 'weapon' || slot === 'drone' || slot === 'counter' ? '' : ` · Mk ${MK[m.tier - 1]}`}</span></span>
                  <span className="loadout-what">{m.changes}</span>
                </label>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}
