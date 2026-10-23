import { describe, expect, it } from 'vitest';
import { defaultLoadout } from './modules';
import { migrate } from './store';
import { DEFAULT_BINDS } from '../components/controls/bindings';

describe('store', () => {
  it('reads an older save: keeps the journey and flight settings, drops everything else', () => {
    const old = {
      app: 'the-ascent', version: 3,
      players: { p1: { id: 'p1' } }, dates: [{ id: 'x' }],
      journey: { momentId: 'now', shifted: null, ship: { pos: [1, 2, 3], yaw: 0.5, pitch: 0, target: 'mars' }, savedAt: 9 },
      settings: { place: { name: 'Home', lat: 33.6, lon: -117.7 }, layers: { a: true }, flight: { invert: true } },
    };
    const d = migrate(old);
    expect(d.app).toBe('ascent-flight');
    expect(d.version).toBe(1);
    expect(d.journey).toEqual({ ship: { pos: [1, 2, 3], yaw: 0.5, pitch: 0, target: 'mars' }, savedAt: 9 });
    expect(d.settings).toEqual({ flight: { invert: true, assist: true, look: 1, sensitivity: 1, quality: 'high', binds: DEFAULT_BINDS, ovPinned: true }, loadout: defaultLoadout() });
    expect('players' in d).toBe(false);
    expect('dates' in d).toBe(false);
  });
  it('keeps a saved loadout, made valid', () => {
    const d = migrate({ settings: { loadout: { weapons: ['rail', 'bogus'], shield: 'bifacet-2', drones: ['repair'] } } });
    expect(d.settings.loadout.weapons).toEqual(['rail']);
    expect(d.settings.loadout.shield).toBe('bifacet-2');
    expect(d.settings.loadout.drones).toEqual(['repair']);
  });

  it('keeps the prizes taken by boarding; a save from before boarding has none', () => {
    const prize = { nation: 'mars', type: 'cruiser', idx: 1, hp: 90, maxHp: 140, crew: 12, quality: 1.6, at: 1 };
    expect(migrate({ prizes: [prize] }).prizes).toEqual([prize]);
    expect(migrate({ journey: null }).prizes).toEqual([]);
  });
  it('drops the old steer setting (cursor or drag) and keeps the rest of the flight settings', () => {
    const d = migrate({ settings: { flight: { invert: false, assist: false, steer: 'drag', sensitivity: 1.5, quality: 'low' } } });
    expect(d.settings.flight).toEqual({ invert: false, assist: false, look: 1, sensitivity: 1.5, quality: 'low', binds: DEFAULT_BINDS, ovPinned: true });
    expect('steer' in d.settings.flight).toBe(false);
  });
  it('holds mouse look sensitivity in range and replaces nonsense with the defaults', () => {
    expect(migrate({ settings: { flight: { look: 9 } } }).settings.flight.look).toBe(2);
    expect(migrate({ settings: { flight: { look: 'fast', quality: 'ultra', invert: 1 } } }).settings.flight).toEqual({ invert: false, assist: true, look: 1, sensitivity: 1, quality: 'high', binds: DEFAULT_BINDS, ovPinned: true });
  });
  it('starts fresh from nothing', () => {
    expect(migrate(null).journey).toBeNull();
  });
});

describe('eve-controls settings', () => {
  it('the overview is pinned by default; a saved choice is kept, nonsense takes the default (E7)', () => {
    expect(migrate({ settings: { flight: {} } }).settings.flight.ovPinned).toBe(true);
    expect(migrate({ settings: { flight: { ovPinned: false } } }).settings.flight.ovPinned).toBe(false);
    expect(migrate({ settings: { flight: { ovPinned: 'yes' } } }).settings.flight.ovPinned).toBe(true);
  });
  it('a mouse-look save loads without error: sensitivity and invert carry over to the camera (E1)', () => {
    const f = migrate({ settings: { flight: { look: 1.6, invert: true, binds: { freelook: 'Alt', fire: 'Mouse0' } } } }).settings.flight;
    expect(f.look).toBe(1.6);
    expect(f.invert).toBe(true);
    expect(f.binds.zoomIn).toBe('Equal');
    expect(f.binds.lock).toBe('KeyC');
  });
});
