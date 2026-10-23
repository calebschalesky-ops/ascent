import { MODULES, SLOTS, SLOT_KINDS, SLOT_LABEL, moduleOf } from '../lib/progression/catalog';
import { ECONOMY, priceOf } from '../lib/progression/economy';
import { levelOf, tierAt, unlockAt } from '../lib/progression/levels';
import type { Progress } from '../lib/progression/progress';
import { baySlots, buy, buyFighter, buyProblem, fighterProblem, fitFromHold, shipName } from '../lib/progression/progress';
import type { ModuleId } from '../lib/progression/refs';
import { raceRef } from '../lib/progression/refs';
import { fitLoadout } from '../lib/progression/progress';
import ShipViewer from './opening/ShipViewer';
import type { ShipLook } from '../lib/opening/profile';

/**
 * The shipyard (pause menu): the cruiser's slots and hold, the fighter bay, and the tech on sale at this level.
 * FIRST PASS: the stations branch's Upgrade screen is where this belongs once it lands.
 */
export default function Shipyard({ progress: p, look, onChange, onBack }: { progress: Progress; look?: Pick<ShipLook, 'trim' | 'finish'>; onChange: (p: Progress) => void; onBack: () => void }) {
  const level = levelOf(p.xp);
  const tier = tierAt(level);
  const fp = fighterProblem(p);
  return (
    <div className="shipyard">
      <h2>Shipyard</h2>
      <p className="small">{shipName(p)} · level {level} · tier {tier} tech · <strong>₡ {p.credits}</strong></p>
      <h3>Your cruiser</h3>
      <div className="sy-ship"><ShipViewer nation={p.nation} look={look ?? { trim: 0, finish: 0 }} loadout={fitLoadout(p.fit)} label={`${shipName(p)}, fitted as it flies`} /></div>
      {SLOT_KINDS.filter((k) => SLOTS.cruiser[k] > 0).map((k) => (
        <div key={k} className="sy-row">
          <span className="sy-kind">{SLOT_LABEL[k]}</span>
          {Array.from({ length: SLOTS.cruiser[k] }, (_, i) => {
            const id = p.fit[k][i];
            const hold = [...new Set(p.inventory.filter((m) => moduleOf(m).kind === k))];
            return (
              <span key={i} className="sy-slot">
                {id ? moduleOf(id).label : <em>empty</em>}
                {hold.length > 0 && (
                  <select aria-label={`Fit ${SLOT_LABEL[k]} slot ${i + 1}`} value="" onChange={(e) => onChange(fitFromHold(p, k, i, e.target.value as ModuleId))}>
                    <option value="">Swap…</option>
                    {hold.map((m) => <option key={m} value={m}>{moduleOf(m).label}</option>)}
                  </select>
                )}
              </span>
            );
          })}
        </div>
      ))}
      {p.inventory.length > 0 && <p className="small">Hold: {p.inventory.map((m) => moduleOf(m).label).join(', ')}</p>}
      <h3>Fighter bay</h3>
      <p className="small">
        {baySlots(p) ? `${p.fighters} of ${baySlots(p)} slots filled with ${raceRef(p.nation).ships.fighter} fighters. Next slot: ${unlockNext(level)}` : 'The bay opens at level 2.'}
      </p>
      <button className="btn small" disabled={!!fp} onClick={() => onChange(buyFighter(p))}>Buy a fighter · ₡ {ECONOMY.fighterPrice}</button>
      {fp && <span className="small muted"> {fp}</span>}
      <h3>Tech</h3>
      <ul className="sy-tech">
        {MODULES.map((m) => {
          const why = buyProblem(p, m.id);
          const locked = m.tier > tier;
          return (
            <li key={m.id} className={locked ? 'locked' : ''}>
              <span className="sy-name"><strong>{m.label}</strong> <span className="muted">· {m.kind} · tier {m.tier}</span><br /><span className="small muted">{m.line}</span></span>
              <button className="btn small" disabled={!!why} onClick={() => onChange(buy(p, m.id))} title={why ?? ''}>
                {locked ? `Level ${firstLevelFor(m.tier)}` : `Buy · ₡ ${priceOf(m.id)}`}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="small muted">First-pass prices; credits come from kills.</p>
      <div className="menu-col"><button className="btn" onClick={onBack}>Back</button></div>
    </div>
  );
}

const firstLevelFor = (tier: number) => { for (let l = 1; l <= 10; l++) if (tierAt(l) >= tier) return l; return 10; };
function unlockNext(level: number): string {
  for (let l = level + 1; l <= 10; l++) if (unlockAt(l).baySlots > unlockAt(level).baySlots) return `level ${l}.`;
  return 'none; the bay is at its largest.';
}
