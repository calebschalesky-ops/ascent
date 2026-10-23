/**
 * Step 3 of a new game: your first ship, your people's own cruiser, turning in the hangar. Name it, paint it within
 * your nation's palette, and fit its four slots from level-1 tools only.
 */
import type { NationId } from '../../lib/nations';
import type { Fit, SlotKind } from '../../lib/progression/catalog';
import { SLOTS, SLOT_KINDS, SLOT_LABEL, fitStats, moduleOf } from '../../lib/progression/catalog';
import type { ModuleId } from '../../lib/progression/refs';
import { ENGINE_WEAPON, raceRef } from '../../lib/progression/refs';
import type { ShipLook } from '../../lib/opening/profile';
import { NAME_MAX, SHIP_FINISHES, SHIP_NAMES, shipTrims } from '../../lib/opening/profile';
import { sameFit, setSlot, slotOptions, standardFit } from '../../lib/opening/fit';
import { fitLoadout } from '../../lib/progression/progress';
import ShipViewer from './ShipViewer';

interface Props { nation: NationId; look: ShipLook; fit: Fit; onLook: (l: ShipLook) => void; onFit: (f: Fit) => void }

const SLOT_NAME: Record<SlotKind, (i: number) => string> = {
  weapon: (i) => (i === 0 ? 'Main gun' : 'Second weapon'),
  defence: () => 'Defence',
  support: () => 'Support',
};

export default function ShipStep({ nation, look, fit, onLook, onFit }: Props) {
  const ref = raceRef(nation);
  const trims = shipTrims(nation);
  const s = fitStats(fit);
  const std = standardFit(nation);
  const missile = fit.weapon.some((m) => ENGINE_WEAPON[m] === 'missile');
  const set = (p: Partial<ShipLook>) => onLook({ ...look, ...p });
  return (
    <div className="op-ship">
      <div className="op-hangar">
        <ShipViewer nation={nation} look={look} loadout={fitLoadout(fit)} label={`${look.name}, a ${ref.ships.cruiser}-class cruiser`} />
        <p className="op-hangar-name"><strong>{look.name || '—'}</strong> <span className="muted">{ref.demonym} {ref.ships.cruiser} · cruiser</span></p>
        <p className="op-hangar-stats small">
          {s.dps} damage/s · {s.shield ? `${s.shield} shield` : 'no shield'}{s.hp ? ` · +${s.hp} hull` : ''}{s.dodge ? ` · ${Math.round(s.dodge * 100)}% dodge` : ''}{s.lock < 1 ? ' · locks 20% faster' : ''}{s.regen ? ` · repairs ${s.regen}/s` : ''}
        </p>
        <p className="small muted op-hint-drag">Drag the ship to turn it.</p>
      </div>
      <div className="op-form">
        <label className="op-field op-name">
          <span className="op-label">Ship name</span>
          <input className="field" value={look.name} maxLength={NAME_MAX} onChange={(e) => set({ name: e.target.value })} aria-label="Ship name" />
        </label>
        <div className="op-chips" aria-label="Suggested names">
          {SHIP_NAMES[nation].map((n) => <button key={n} className={n === look.name ? 'op-chip on' : 'op-chip'} onClick={() => set({ name: n })}>{n}</button>)}
        </div>
        <fieldset className="op-field">
          <legend>Trim <span className="muted">· {trims[look.trim].label}</span></legend>
          <div className="op-swatches" role="radiogroup" aria-label="Trim colour">
            {trims.map((t, i) => (
              <button key={t.label} role="radio" aria-checked={i === look.trim} aria-label={t.label} title={t.label}
                className={i === look.trim ? 'op-swatch on' : 'op-swatch'} style={{ ['--s' as string]: t.value }} onClick={() => set({ trim: i })} />
            ))}
          </div>
        </fieldset>
        <fieldset className="op-field">
          <legend>Hull finish</legend>
          <div className="op-seg" role="radiogroup" aria-label="Hull finish">
            {SHIP_FINISHES.map((f, i) => (
              <button key={f.label} role="radio" aria-checked={i === look.finish} className={i === look.finish ? 'on' : ''} title={f.line} onClick={() => set({ finish: i })}>{f.label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset className="op-field">
          <legend>Fit <span className="muted">· level-1 tools</span></legend>
          {SLOT_KINDS.flatMap((k) => Array.from({ length: SLOTS.cruiser[k] }, (_, i) => (
            <label key={`${k}${i}`} className="op-slot">
              <span className="op-slot-kind">{SLOT_NAME[k](i)}<span className="sr"> ({SLOT_LABEL[k]})</span></span>
              <select className="field" value={fit[k][i]} onChange={(e) => onFit(setSlot(fit, k, i, e.target.value as ModuleId))}>
                {slotOptions(k, i).map((m) => <option key={m.id} value={m.id}>{m.label}{std[k][i] === m.id ? ' (standard)' : ''}</option>)}
              </select>
              <span className="op-slot-line small muted">{moduleOf(fit[k][i]).line}</span>
            </label>
          )))}
          <div className="op-fit-foot">
            <button className="btn ghost small" disabled={sameFit(fit, std)} onClick={() => onFit(std)}>Standard {ref.demonym} fit</button>
            {!missile && <span className="small op-warn">No missile: you will fire bolts only, and the tutorial skips lock-on.</span>}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
