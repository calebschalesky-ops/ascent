import { describe, expect, it } from 'vitest';
import { ACTIONS, ACTION_GROUPS, DEFAULT_BINDS, actionFor, codeOf, keyLabel, migrateBinds, mouseCode, rebind } from './bindings';

describe('key bindings', () => {
  it('every action has a default, no key is bound twice, and every action is on the keybinds page', () => {
    const codes = ACTIONS.map((a) => DEFAULT_BINDS[a]);
    expect(codes.every((c) => c.length > 0)).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
    const listed = ACTION_GROUPS.flatMap((g) => g.actions.map((x) => x.id)).sort();
    expect(listed).toEqual([...ACTIONS].sort());
  });
  it('reads physical keys, folding left and right modifiers together', () => {
    expect(codeOf({ code: 'KeyW', key: 'w' })).toBe('KeyW');
    expect(codeOf({ code: 'ShiftRight', key: 'Shift' })).toBe('Shift');
    expect(codeOf({ code: 'ControlLeft', key: 'Control' })).toBe('Control');
    expect(codeOf({ code: 'AltRight', key: 'Alt' })).toBe('Alt');
    // eve-controls: a key event with no code (some synthetic input) still finds + and − for the camera zoom.
    expect(codeOf({ code: '', key: '=' })).toBe('Equal');
    expect(codeOf({ code: '', key: '+' })).toBe('Equal');
    expect(codeOf({ code: '', key: '-' })).toBe('Minus');
    expect(actionFor(DEFAULT_BINDS, 'Equal')).toBe('zoomIn');
    expect(actionFor(DEFAULT_BINDS, 'Minus')).toBe('zoomOut');
    // A synthetic event with no code (the in-app browser's Space) is read from its key.
    expect(codeOf({ code: '', key: ' ' })).toBe('Space');
    expect(codeOf({ code: '', key: 'g' })).toBe('KeyG');
    expect(codeOf({ key: '5' })).toBe('Digit5');
  });
  it('finds the action for a key or button', () => {
    expect(actionFor(DEFAULT_BINDS, 'KeyW')).toBe('forward');
    expect(actionFor(DEFAULT_BINDS, 'Space')).toBe('up');
    expect(actionFor(DEFAULT_BINDS, mouseCode(2))).toBe('use');
    expect(actionFor(DEFAULT_BINDS, 'KeyP')).toBeNull();
    expect(actionFor(DEFAULT_BINDS, '')).toBeNull();
  });
  it('rebinding a key that is in use leaves the other action unbound', () => {
    const b = rebind(DEFAULT_BINDS, 'boost', 'KeyC');
    expect(b.boost).toBe('KeyC');
    const c = rebind(b, 'stop', 'KeyC');
    expect(c.stop).toBe('KeyC');
    expect(c.boost).toBe('');
    expect(actionFor(c, 'KeyC')).toBe('stop');
    expect(DEFAULT_BINDS.boost).toBe('Control'); // the defaults are never changed
  });
  it('migrates any saved table: fills gaps, drops junk and Escape, unbinds duplicates', () => {
    expect(migrateBinds(undefined)).toEqual(DEFAULT_BINDS);
    expect(migrateBinds('nonsense')).toEqual(DEFAULT_BINDS);
    const m = migrateBinds({ forward: 'ArrowUp', stop: 'Escape', bogus: 'KeyQ', back: 7 });
    expect(m.forward).toBe('ArrowUp');
    expect(m.pitchUp).toBe(''); // ArrowUp went to forward, which comes first in the table
    expect(m.stop).toBe(DEFAULT_BINDS.stop);
    expect(m.back).toBe(DEFAULT_BINDS.back);
    expect('bogus' in m).toBe(false);
  });
  it('names keys the way a player reads them', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('Digit5')).toBe('5');
    expect(keyLabel('Mouse2')).toBe('Right click');
    expect(keyLabel('Control')).toBe('Ctrl');
    expect(keyLabel('')).toBe('—');
  });
});
