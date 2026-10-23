import type { Binds } from './bindings';
import { ACTION_GROUPS, DEFAULT_BINDS, MOUSE_GESTURES, keyLabel } from './bindings';

/** The controls list in the pause menu (R13): every action with its key now, and the moves that are not one key. */
export default function ControlsList({ binds = DEFAULT_BINDS }: { binds?: Binds }) {
  const k = (a: keyof Binds) => keyLabel(binds[a]);
  const extras: [string, string][] = [
    ['Mouse', 'Never turns the ship: the cursor is always free (EVE controls)'],
    ...MOUSE_GESTURES,
    [`${k('zoomIn')} ${k('zoomOut')}`, `Zoom the camera (hold ${k('freelook')}: camera back behind the nose)`],
    ['1–4 again', 'The weapon in hand: switch it on at the active locked target (with no lock, a gun fires ahead), or off'],
    [`Arrow keys`, 'Turn the ship by hand; let go and it holds the heading'],
    [`Double-tap ${k('left')} or ${k('right')}`, 'Dodge sideways (costs energy, 2.5 s to recharge)'],
    [`Double-tap ${k('forward')} and hold`, `Boost (or hold ${k('boost')}; Ctrl+W closes a browser tab)`],
    [`Hold ${k('stance')} + scroll`, 'Set the stance distance'],
    [`${k('use')}`, 'On empty space: gun: shield block · 5–9: deploy or recall. On an object: its menu'],
    ['Esc', 'Menu'],
  ];
  return (
    <div className="controls-list">
      <dl className="kv">
        {extras.map(([a, b]) => (<div key={a} className="cl-row"><dt>{a}</dt><dd>{b}</dd></div>))}
      </dl>
      {ACTION_GROUPS.map((g) => (
        <div key={g.title} className="cl-group">
          <div className="kb-title">{g.title}</div>
          <dl className="kv">
            {g.actions.map((x) => (<div key={x.id} className="cl-row"><dt>{keyLabel(binds[x.id])}</dt><dd>{x.label}</dd></div>))}
          </dl>
        </div>
      ))}
      <p className="small muted">Change any of these in Settings, Key bindings. A gamepad and touch steer as before.</p>
    </div>
  );
}
