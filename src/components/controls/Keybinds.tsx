import { useEffect, useState } from 'react';
import type { Action, Binds } from './bindings';
import { ACTION_GROUPS, DEFAULT_BINDS, MOUSE_GESTURES, UNBINDABLE, codeOf, keyLabel, mouseCode, rebind } from './bindings';

interface Props {
  binds: Binds;
  onChange: (b: Binds) => void;
}

/**
 * The keybinds page (R11), Minecraft-style: click an action, then press the key or mouse button for it. Esc cancels.
 * A key already in use moves to the new action and leaves the old one unbound (shown as — until it is bound again).
 */
export default function Keybinds({ binds, onChange }: Props) {
  const [listening, setListening] = useState<Action | null>(null);

  useEffect(() => {
    if (!listening) return;
    // Capture phase on the window: the flight's own key handler never sees the key being bound.
    const take = (code: string) => { onChange(rebind(binds, listening, code)); setListening(null); };
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const code = codeOf(e);
      if (code === 'Escape') { setListening(null); return; }
      if (!code || UNBINDABLE.has(code)) return;
      take(code);
    };
    const onMouse = (e: MouseEvent) => { e.preventDefault(); e.stopImmediatePropagation(); take(mouseCode(e.button)); };
    const noMenu = (e: MouseEvent) => e.preventDefault();
    // The click that started listening is already over; the next press is the binding.
    const t = setTimeout(() => {
      addEventListener('keydown', onKey, true);
      addEventListener('mousedown', onMouse, true);
      addEventListener('contextmenu', noMenu, true);
    }, 0);
    return () => {
      clearTimeout(t);
      removeEventListener('keydown', onKey, true);
      removeEventListener('mousedown', onMouse, true);
      removeEventListener('contextmenu', noMenu, true);
    };
  }, [listening, binds, onChange]);

  const changed = (Object.keys(DEFAULT_BINDS) as Action[]).some((a) => binds[a] !== DEFAULT_BINDS[a]);
  return (
    <div className="keybinds">
      {ACTION_GROUPS.map((g) => (
        <div key={g.title} className="kb-group">
          <div className="kb-title">{g.title}</div>
          {g.actions.map((a) => (
            <div key={a.id} className="kb-row">
              <span className="kb-label">{a.label}</span>
              <button className={`kb-key${listening === a.id ? ' listening' : ''}${!binds[a.id] ? ' unbound' : ''}`}
                onClick={() => setListening(listening === a.id ? null : a.id)} aria-label={`${a.label}: ${keyLabel(binds[a.id])}. Click to change`}>
                {listening === a.id ? '> press a key <' : keyLabel(binds[a.id])}
              </button>
            </div>
          ))}
        </div>
      ))}
      <div className="kb-group">
        <div className="kb-title">Mouse (EVE, fixed)</div>
        {MOUSE_GESTURES.map(([g, what]) => (
          <div key={g} className="kb-row"><span className="kb-label">{what}</span><span className="kb-key fixed">{g}</span></div>
        ))}
      </div>
      <div className="kb-foot">
        <span className="muted small">Esc opens the menu and cannot be bound. The mouse moves above are fixed: Ctrl+click locks whatever Ctrl is bound to.</span>
        <button className="btn ghost" disabled={!changed} onClick={() => { setListening(null); onChange({ ...DEFAULT_BINDS }); }}>Reset to defaults</button>
      </div>
    </div>
  );
}
