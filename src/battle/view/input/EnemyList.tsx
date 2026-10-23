/**
 * PKG-21 (PKG-17's request; TRC-03's misses): the enemy ships as a list he can pick from, so an enemy that is off the
 * screen or under a panel can still be ordered against. A row does exactly what a click on that ship in the battle
 * does: while a maneuver wants a target it becomes the target, while "Guns on…" or "Pods at…" is armed the order goes,
 * with a ship selected the order menu opens (beside the list), otherwise it marks the target.
 * Each row says where the ship is drawn now: on screen, off screen, or under a panel.
 */
import { useState, useSyncExternalStore } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { CommsController } from '../comms/controller';
import { battleNow } from './escort';
import './input.css';

type Where = 'on screen' | 'off screen' | 'under a panel';

function whereIs(ctl: CommsController, id: string): Where {
  const p = ctl.screenOf(id);
  if (!p || p.x < 0 || p.y < 0 || p.x > window.innerWidth || p.y > window.innerHeight) return 'off screen';
  const el = document.elementFromPoint(p.x, p.y);
  return el && el.tagName === 'CANVAS' ? 'on screen' : 'under a panel';
}

export default function EnemyList({ ctl }: { ctl: CommsController }) {
  const s = useSyncExternalStore(ctl.subscribe, ctl.snapshot);
  const [open, setOpen] = useState(false);
  const b = battleNow();
  if (!b) return null;
  const side = b.comms?.side ?? 'player';
  const foes = b.ships.filter((x) => x.side !== side && (x.status === 'active' || x.status === 'broken'));
  const pick = (id: string, e: ReactMouseEvent) => {
    setOpen(false);
    if (ctl.maneuvers?.intercept(id, false)) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ctl.targetShip(id, { x: r.right + 8, y: r.top });
  };
  return (
    <div className="in-enemies">
      <button type="button" className="in-enemies-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Enemy ships <b>{foes.length}</b>
      </button>
      {open && (
        <ul role="menu" aria-label="Enemy ships">
          {foes.map((f) => {
            const w = whereIs(ctl, f.id);
            return (
              <li key={f.id}>
                <button type="button" role="menuitem" className={s.target === f.id ? 'in-sel' : undefined} onClick={(e) => pick(f.id, e)}>
                  <b>{f.name}{f.flagship ? ' ★' : ''}</b> <span>{f.cls}{f.status === 'broken' ? ' · broken' : ''}</span>
                  {w !== 'on screen' && <span className="in-where"> · {w}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
