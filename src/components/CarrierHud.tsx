import { useEffect, useState } from 'react';
import type { CarrierView } from './infantry';

const PHASE: Record<CarrierView['phase'], string> = {
  docked: 'with you', standby: 'waiting', transit: 'en route', descent: 'descending', unload: 'unloading', fight: 'fighting',
  hold: 'holding', lift: 'lifting off', return: 'returning', lost: 'lost', gone: 'gone',
};

/** The infantry carriers out (the player's and any enemy landing): hull, troops, the fight's balance and the last word. */
export default function CarrierHud({ view }: { view: () => CarrierView[] }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, []);
  const cs = view().filter((c) => c.side === 'player' || c.phase !== 'docked');
  if (!cs.length) return null;
  return (
    <div className="carrier-hud" role="status" aria-label="Infantry carriers">
      <div className="ch-head">Infantry carriers</div>
      {cs.map((c) => (
        <div key={c.id} className={`ch-car${c.side === 'player' ? '' : ' enemy'}${c.phase === 'lost' ? ' lost' : ''}`} data-phase={c.phase}>
          <span className="ch-name">{c.side === 'player' ? '' : 'Enemy · '}{c.name} <small>{c.men} men{c.enemy ? ` vs ${c.enemy}` : ''}</small></span>
          <span className="ch-phase">{PHASE[c.phase]}</span>
          {c.phase !== 'lost' && <span className="ch-bar" title={`Hull ${Math.round(c.hp)} / ${c.max}`}><span style={{ width: `${(c.hp / c.max) * 100}%` }} /></span>}
          {c.balance !== null && <span className="ch-bar fire" title="Balance of fire on the ground"><span style={{ width: `${c.balance * 100}%` }} /></span>}
          <span className="ch-note">{c.note}</span>
        </div>
      ))}
    </div>
  );
}
