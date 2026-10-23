/** PKG-25: the wings reach the view model (simFeed frame.wings) in battle units, flying and returning only. */
import { describe, expect, it } from 'vitest';
import { flagOn } from '../../flags';
import { createSimFeed, SIM_VIEW } from './simFeed';
import { wingViews } from './fighters';

describe('PKG-25 wings in the frame', () => {
  it('no fighter order: no wings in the frame', () => {
    const feed = createSimFeed(1);
    expect(feed.step(1).wings).toEqual([]);
  });

  it('ordered out: each flying wing is in the frame at its sim position over metresPerUnit, by side', () => {
    const feed = createSimFeed(1);
    expect(feed.order('p6', { kind: 'fighters', task: 'screen' })).toBe(true);
    const f = feed.step(5);
    const b = feed.battle();
    const flying = b.fighters!.wings.filter((w) => w.state === 'flying');
    expect(f.wings!.length).toBe(flying.length);
    for (const v of f.wings!) {
      const w = flying.find((x) => x.id === v.id)!;
      expect(v.side).toBe(0);
      expect(v.pos[0]).toBeCloseTo(w.pos.x / SIM_VIEW.metresPerUnit, 6);
      expect(v.pos[2]).toBeCloseTo(w.pos.z / SIM_VIEW.metresPerUnit, 6);
      expect(v.craft).toBe(Math.ceil(w.craft));
    }
    expect(wingViews(b, SIM_VIEW.metresPerUnit)).toEqual(f.wings);
  });

  it('the fighters flag is registered and on (its steps pass)', () => {
    expect(flagOn('fighters')).toBe(true);
  });
});
