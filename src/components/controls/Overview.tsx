/**
 * The overview (R9; eve-controls E7): the nearest contacts, hostiles first. Pinned at the right edge by default (the
 * cursor is always free now, so it can stay up while you fly); hold Tab for it when it is not pinned. Click a row to
 * select; Ctrl+click a row to lock.
 */
export interface OverviewRow {
  key: string; // 's<id>' for a ship, 'b<dest>' for a body or station
  name: string;
  cls: string; // the class of ship, or planet / moon / station
  dist: string;
  hostile: boolean;
  locking: '' | 'locking' | 'LOCKED'; // whether it is locking the player
  picked: boolean;
  mine?: 'none' | 'locking' | 'locked'; // the player's own lock on it (E6)
}

interface Props {
  rows: OverviewRow[];
  filter: 'ships' | 'all';
  onFilter: (f: 'ships' | 'all') => void;
  onPick: (key: string) => void;
  onLock?: (key: string) => void;
  pickKey: string;
  pinned?: boolean;
}

export default function Overview({ rows, filter, onFilter, onPick, onLock, pickKey, pinned = false }: Props) {
  return (
    <div className={`overview${pinned ? ' pinned' : ''}`} role="dialog" aria-label="Overview" onContextMenu={(e) => e.preventDefault()}>
      <div className="ov-head">
        <span className="ov-title">Overview</span>
        <div className="seg ov-filter">
          <button aria-selected={filter === 'ships'} onMouseDown={(e) => { e.preventDefault(); onFilter('ships'); }}>Ships</button>
          <button aria-selected={filter === 'all'} onMouseDown={(e) => { e.preventDefault(); onFilter('all'); }}>Everything</button>
        </div>
      </div>
      {rows.length === 0 ? <p className="ov-empty">Nothing in range</p> : (
        <table className="ov-table">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={`${r.hostile ? 'hostile' : ''}${r.key === pickKey ? ' picked' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); if (e.button !== 0) return; if (e.ctrlKey && onLock) onLock(r.key); else onPick(r.key); }}>
                <td className="ov-mine" title={r.mine === 'locked' ? 'Locked' : r.mine === 'locking' ? 'Locking' : ''}>{r.mine === 'locked' ? '◉' : r.mine === 'locking' ? '◎' : ''}</td>
                <td className="ov-name">{r.name}</td>
                <td className="ov-cls">{r.cls}</td>
                <td className="ov-dist">{r.dist}</td>
                <td className="ov-lock">{r.locking}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="ov-foot">Click: select · Ctrl+click: lock{pinned ? '' : ' · let go of Tab to fly'}</p>
    </div>
  );
}
