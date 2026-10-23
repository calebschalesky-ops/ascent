/**
 * The key and button table (mc-controls, R11). Every flight action reads its key from here, so the keybinds page can
 * rebind any of them, Minecraft style: one key or mouse button per action. Saved with the flight settings.
 *
 * Keys are physical (KeyboardEvent.code), so the layout does not move them: W is where W is on a QWERTY board.
 * Left and right modifier keys count as one ("Shift", "Control", "Alt"). Mouse buttons are "Mouse0" (left),
 * "Mouse1" (middle), "Mouse2" (right), "Mouse3" and "Mouse4" (the side buttons). Esc is the menu and is not bindable.
 */
export type Action =
  | 'forward' | 'back' | 'left' | 'right' | 'up' | 'down' | 'boost' | 'stop' | 'freelook'
  | 'turnLeft' | 'turnRight' | 'pitchUp' | 'pitchDown'
  | 'slot1' | 'slot2' | 'slot3' | 'slot4' | 'slot5' | 'slot6' | 'slot7' | 'slot8' | 'slot9' | 'swap'
  | 'fire' | 'use' | 'pick' | 'stance' | 'overview'
  | 'counter' | 'loadout' | 'enter' | 'autopilot' | 'hyperspace' | 'command' | 'fleetAttack' | 'board' | 'nav'
  | 'hud' | 'camera' | 'fullscreen'
  | 'zoomIn' | 'zoomOut' | 'lock';

export type Binds = Record<Action, string>;

export const DEFAULT_BINDS: Binds = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', up: 'Space', down: 'Shift', boost: 'Control', stop: 'KeyX',
  freelook: 'Alt',
  turnLeft: 'ArrowLeft', turnRight: 'ArrowRight', pitchUp: 'ArrowUp', pitchDown: 'ArrowDown',
  slot1: 'Digit1', slot2: 'Digit2', slot3: 'Digit3', slot4: 'Digit4', slot5: 'Digit5', slot6: 'Digit6', slot7: 'Digit7',
  slot8: 'Digit8', slot9: 'Digit9', swap: 'KeyF',
  fire: 'Mouse0', use: 'Mouse2', pick: 'Mouse1', stance: 'KeyR', overview: 'Tab',
  counter: 'KeyQ', loadout: 'KeyE', enter: 'Enter', autopilot: 'KeyG', hyperspace: 'KeyJ', command: 'KeyT', fleetAttack: 'KeyZ', board: 'KeyB',
  nav: 'KeyM', hud: 'F1', camera: 'F5', fullscreen: 'F11',
  zoomIn: 'Equal', zoomOut: 'Minus', // eve-controls (E2): + and - zoom the orbit camera
  lock: 'KeyC', // eve-controls (E6): lock the selected ship (or Ctrl+click it)
};

/**
 * The mouse's EVE moves (eve-controls E2-E7), shown on the keybinds page and the controls list. They are gestures, not
 * one key each, so they are fixed: the table's one-key-per-action rule cannot hold a double-click or a modifier.
 */
export const MOUSE_GESTURES: [string, string][] = [
  ['Double-click space', 'Fly that way: the ship turns there and holds it (from a stop, the engines open)'],
  ['Left click', 'Select a ship, station, moon or planet (on the active locked target: fire at it)'],
  ['Ctrl + left click', 'Lock a hostile ship (up to three)'],
  ['Right click an object', 'Its menu: approach, orbit, keep at range, lock, dock or enter, fly to, look at'],
  ['Left-drag', 'Swing the camera round the ship'],
  ['Right button + wheel', 'Zoom the camera'],
  ['Wheel', 'Move along the hotbar'],
];

/** The keybinds page, in order, grouped. */
export const ACTION_GROUPS: { title: string; actions: { id: Action; label: string }[] }[] = [
  {
    title: 'Movement', actions: [
      { id: 'forward', label: 'Throttle up' }, { id: 'back', label: 'Throttle down' }, { id: 'left', label: 'Strafe left (double-tap: dodge)' },
      { id: 'right', label: 'Strafe right (double-tap: dodge)' }, { id: 'up', label: 'Thrust up' }, { id: 'down', label: 'Thrust down' },
      { id: 'boost', label: 'Boost (or double-tap throttle up)' }, { id: 'stop', label: 'Full stop' }, { id: 'freelook', label: 'Look ahead (hold): camera behind the nose' },
      { id: 'turnLeft', label: 'Turn left (keyboard steering)' }, { id: 'turnRight', label: 'Turn right' }, { id: 'pitchUp', label: 'Pitch up' }, { id: 'pitchDown', label: 'Pitch down' },
    ],
  },
  {
    title: 'Combat', actions: [
      { id: 'fire', label: 'Fire (left button: a click on the active locked target; a key: fires while held)' }, { id: 'use', label: 'Slot special on empty space: shield, deploy, dock' }, { id: 'pick', label: 'Select under the cursor' },
      { id: 'lock', label: 'Lock the selected ship (or Ctrl+click it)' },
      { id: 'stance', label: 'Stance: approach, orbit, keep at range (hold + scroll: distance)' }, { id: 'overview', label: 'Overview (hold, when not pinned)' },
      { id: 'counter', label: 'Countermeasure' }, { id: 'swap', label: 'Swap to last weapon' },
    ],
  },
  {
    title: 'Hotbar', actions: [
      { id: 'slot1', label: 'Slot 1' }, { id: 'slot2', label: 'Slot 2' }, { id: 'slot3', label: 'Slot 3' }, { id: 'slot4', label: 'Slot 4' },
      { id: 'slot5', label: 'Slot 5: drone swarm' }, { id: 'slot6', label: 'Slot 6: fighters' }, { id: 'slot7', label: 'Slot 7: infantry carrier' },
      { id: 'slot8', label: 'Slot 8: repair' }, { id: 'slot9', label: 'Slot 9: countermeasure' },
    ],
  },
  {
    title: 'Ship and fleet', actions: [
      { id: 'loadout', label: 'Ship and loadout' }, { id: 'enter', label: 'Enter a body / continue the route' }, { id: 'autopilot', label: 'Autopilot to destination' }, { id: 'hyperspace', label: 'Hyperspace: jump to the target (under 5 s)' },
      { id: 'command', label: 'Fleet command mode' }, { id: 'fleetAttack', label: 'Fleet: attack my target' }, { id: 'board', label: 'Board the locked ship (capital)' },
      { id: 'nav', label: 'Navigation: map, computer, route' },
    ],
  },
  {
    title: 'View', actions: [
      { id: 'hud', label: 'Hide the HUD' }, { id: 'camera', label: 'Camera: orbit, cockpit, rear' }, { id: 'fullscreen', label: 'Full screen' },
      { id: 'zoomIn', label: 'Camera zoom in (or right button + wheel)' }, { id: 'zoomOut', label: 'Camera zoom out' },
    ],
  },
];

export const ACTIONS = Object.keys(DEFAULT_BINDS) as Action[];

/** A keyboard event's binding code: the physical key, with left and right modifiers folded together. */
export function codeOf(e: { code?: string; key?: string }): string {
  const c = e.code || '';
  if (c === 'ShiftLeft' || c === 'ShiftRight') return 'Shift';
  if (c === 'ControlLeft' || c === 'ControlRight') return 'Control';
  if (c === 'AltLeft' || c === 'AltRight') return 'Alt';
  if (c === 'MetaLeft' || c === 'MetaRight') return 'Meta';
  if (c) return c;
  // No code (some synthetic events): guess it from the key.
  const k = e.key || '';
  if (k === ' ') return 'Space';
  if (k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'Meta' || k === 'Tab' || k === 'Enter' || k === 'Escape') return k;
  if (/^[a-z]$/i.test(k)) return `Key${k.toUpperCase()}`;
  if (/^[0-9]$/.test(k)) return `Digit${k}`;
  if (/^Arrow|^F\d+$/.test(k)) return k;
  // Punctuation by the key it is printed on (eve-controls: + and − zoom), shifted or not.
  const punct: Record<string, string> = { '=': 'Equal', '+': 'Equal', '-': 'Minus', _: 'Minus', '[': 'BracketLeft', ']': 'BracketRight', ';': 'Semicolon', "'": 'Quote', ',': 'Comma', '.': 'Period', '/': 'Slash', '\\': 'Backslash', '`': 'Backquote' };
  if (punct[k]) return punct[k];
  return k;
}
export const mouseCode = (button: number) => `Mouse${button}`;

/** The action a key or button is bound to, if any. */
export function actionFor(binds: Binds, code: string): Action | null {
  if (!code) return null;
  for (const a of ACTIONS) if (binds[a] === code) return a;
  return null;
}

/** Bind `action` to `code`; an action that had the same key is left unbound (shown as such, to bind again). */
export function rebind(binds: Binds, action: Action, code: string): Binds {
  const out = { ...binds };
  for (const a of ACTIONS) if (a !== action && out[a] === code) out[a] = '';
  out[action] = code;
  return out;
}

/** Codes that cannot be bound: the menu key. */
export const UNBINDABLE = new Set(['Escape']);

/** Any saved table made whole: unknown actions dropped, missing or bad ones take the default, duplicates unbound. */
export function migrateBinds(raw: unknown): Binds {
  const out = { ...DEFAULT_BINDS };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  for (const a of ACTIONS) {
    const v = r[a];
    if (typeof v === 'string' && !UNBINDABLE.has(v) && v.length < 40) out[a] = v;
  }
  // A key bound twice keeps the first action in table order; the later one is unbound.
  const seen = new Set<string>();
  for (const a of ACTIONS) {
    const c = out[a];
    if (!c) continue;
    if (seen.has(c)) out[a] = ''; else seen.add(c);
  }
  return out;
}

/** A key or button as the player reads it. */
export function keyLabel(code: string): string {
  if (!code) return '—';
  const mouse: Record<string, string> = { Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5' };
  if (mouse[code]) return mouse[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  const named: Record<string, string> = { Space: 'Space', Control: 'Ctrl', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', CapsLock: 'Caps Lock' };
  return named[code] ?? code;
}
