import { describe, expect, it } from 'vitest';
import { SATURN_12V12, createBattle } from '../../sim/index';
import type { RosterCard } from '../comms/logic';
import { rosterOf } from '../comms/logic';
import { escortOnScreen } from './escort';
import { emptySlots, stableRoster } from './roster';

const card = (id: string, extra: Partial<RosterCard> = {}): RosterCard => ({
  id, name: id.toUpperCase(), cls: 'cruiser', captain: 'C', initials: 'C', mood: 'steady', moodToken: 'x', word: 'On station',
  reported: null, flagship: false, prize: false, inField: true, hangar: false, ...extra,
} as RosterCard);

describe('stable roster (PKG-21 F-13)', () => {
  it('a ship that leaves keeps its slot, greyed; nobody slides into it', () => {
    const slots = emptySlots();
    const first = stableRoster(slots, [card('p6', { flagship: true }), card('p1'), card('p2'), card('p3'), card('p4')]);
    expect(first.map((s) => s.card.id)).toEqual(['p6', 'p1', 'p2', 'p3', 'p4']);
    // p2 is captured: gone from his list. rosterOf would also sort a ship out of the field to the end.
    const after = stableRoster(slots, [card('p6', { flagship: true }), card('p1'), card('p4'), card('p3', { inField: false })]);
    expect(after.map((s) => s.card.id)).toEqual(['p6', 'p1', 'p2', 'p3', 'p4']);
    expect(after.map((s) => s.gone)).toEqual([false, false, true, false, false]);
  });

  it('a prize takes a new slot at the end; the flagship stays first', () => {
    const slots = emptySlots();
    stableRoster(slots, [card('p1'), card('p6', { flagship: true }), card('p2')]);
    const after = stableRoster(slots, [card('p6', { flagship: true }), card('p1'), card('p2'), card('e11', { prize: true })]);
    expect(after.map((s) => s.card.id)).toEqual(['p6', 'p1', 'p2', 'e11']);
  });

  it('every slot of the real roster stays put across a battle step that moves a ship out of the field', () => {
    const b = createBattle(SATURN_12V12, 1);
    const slots = emptySlots();
    const before = stableRoster(slots, rosterOf(b)).map((s) => s.card.id);
    const s = b.ships.find((x) => x.side === 'player' && !x.flagship)!;
    s.status = 'fled';
    const after = stableRoster(slots, rosterOf(b)).map((x) => x.card.id);
    expect(after).toEqual(before);
    expect(rosterOf(b).map((x) => x.id)).not.toEqual(before); // what the strip used to draw
  });
});

describe('escort warning (PKG-21, PKG-16 request, TRC05-5)', () => {
  it('only an escort still on its screen warns', () => {
    const b = createBattle(SATURN_12V12, 1);
    const esc = b.ships.find((x) => x.side === 'player' && x.cls === 'escort')!;
    const cru = b.ships.find((x) => x.side === 'player' && x.cls === 'cruiser')!;
    expect(escortOnScreen(b, esc.id)).toBe(true);
    expect(escortOnScreen(b, cru.id)).toBe(false);
    esc.stance = { ...esc.stance, mode: 'engage' };
    expect(escortOnScreen(b, esc.id)).toBe(false);
    expect(escortOnScreen(null, esc.id)).toBe(false);
  });
});
