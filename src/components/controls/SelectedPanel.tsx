/**
 * EVE's selected-item panel (E4) and right-click menu (E5): the thing clicked, and what you can tell the ship to do
 * about it. Both offer the same actions, in the same order; the stance ones use the R stances' distances.
 */
export interface SelInfo {
  key: string; // 's<id>' for a ship, 'b<dest>' for a body or station
  name: string;
  sub: string; // a ship's class and nation; a body's kind
  dist: string;
  vel: string;
  ship: boolean;
  hostile: boolean;
  lock: 'none' | 'locking' | 'locked'; // ships only
  dock: boolean; // a station in docking reach
  enter: boolean; // a body in entering reach
}

export type SelAction = 'approach' | 'orbit' | 'range' | 'lock' | 'unlock' | 'dock' | 'enter' | 'fly' | 'look';

/** The actions for a selection, in order. */
export function selActions(s: SelInfo): { id: SelAction; label: string }[] {
  const out: { id: SelAction; label: string }[] = [
    { id: 'approach', label: 'Approach' }, { id: 'orbit', label: 'Orbit' }, { id: 'range', label: 'Keep at range' },
  ];
  if (s.ship && s.hostile) out.push(s.lock === 'none' ? { id: 'lock', label: 'Lock' } : { id: 'unlock', label: s.lock === 'locked' ? 'Unlock' : 'Stop locking' });
  if (s.dock) out.push({ id: 'dock', label: 'Dock' });
  if (s.enter) out.push({ id: 'enter', label: 'Enter' });
  out.push({ id: 'fly', label: s.ship ? 'Fly to' : 'Warp to (autopilot)' }, { id: 'look', label: 'Look at' });
  return out;
}

export default function SelectedPanel({ sel, onAction, onClose, stance }: { sel: SelInfo; onAction: (a: SelAction) => void; onClose: () => void; stance: string | null }) {
  return (
    <div className={`sel-panel${sel.hostile ? ' hostile' : ''}`} role="region" aria-label="Selected item" onContextMenu={(e) => e.preventDefault()}>
      <div className="sel-head">
        <span className="sel-name">{sel.name}</span>
        <button className="sel-x" onClick={onClose} aria-label="Clear the selection">✕</button>
      </div>
      <div className="sel-sub">{sel.sub}</div>
      <dl className="sel-kv">
        <div><dt>Distance</dt><dd>{sel.dist}</dd></div>
        <div><dt>Velocity</dt><dd>{sel.vel}</dd></div>
        {sel.ship && sel.hostile && <div><dt>Lock</dt><dd>{sel.lock === 'locked' ? 'locked' : sel.lock === 'locking' ? 'locking…' : '—'}</dd></div>}
        {stance && <div><dt>Ship</dt><dd>{stance}</dd></div>}
      </dl>
      <div className="sel-btns">
        {selActions(sel).map((a) => (
          <button key={a.id} className={`sel-btn sel-${a.id}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onAction(a.id)}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}

/** The right-click menu on an object (E5), at the cursor. */
export function ContextMenu({ sel, x, y, onAction, onClose }: { sel: SelInfo; x: number; y: number; onAction: (a: SelAction) => void; onClose: () => void }) {
  return (
    <div className="ctx-menu" role="menu" aria-label={`${sel.name}: actions`} style={{ left: x, top: y }} onContextMenu={(e) => e.preventDefault()}
      onMouseLeave={onClose}>
      <div className="ctx-title">{sel.name} <span className="ctx-dist">{sel.dist}</span></div>
      {selActions(sel).map((a) => (
        <button key={a.id} role="menuitem" className="ctx-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { onAction(a.id); onClose(); }}>{a.label}</button>
      ))}
    </div>
  );
}

/** The locked targets (E6): one icon each, the active one framed. Click to make it active; again to fire on it. */
export interface LockIcon { id: number; name: string; progress: number; locked: boolean; active: boolean; dist: string }

export function LockRow({ locks, onClick, onUnlock }: { locks: LockIcon[]; onClick: (id: number) => void; onUnlock: (id: number) => void }) {
  if (!locks.length) return null;
  return (
    <div className="lock-row" role="toolbar" aria-label="Locked targets">
      {locks.map((l) => (
        <button key={l.id} className={`lock-icon${l.locked ? ' locked' : ''}${l.active ? ' active' : ''}`} style={{ ['--k' as string]: l.progress.toFixed(3) }}
          onMouseDown={(e) => e.preventDefault()} onClick={() => onClick(l.id)} onContextMenu={(e) => { e.preventDefault(); onUnlock(l.id); }}
          aria-pressed={l.active} aria-label={`${l.name}, ${l.locked ? 'locked' : 'locking'}${l.active ? ', active target' : ''}. Click: ${l.active ? 'fire on it' : 'make it active'}; right click: unlock`}>
          <span className="li-ring" />
          <span className="li-name">{l.name}</span>
          <span className="li-dist">{l.locked ? l.dist : `${Math.round(l.progress * 100)}%`}</span>
        </button>
      ))}
    </div>
  );
}
