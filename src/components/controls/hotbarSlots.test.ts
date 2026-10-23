import { describe, expect, it } from 'vitest';
import { CARRIER_LEVEL, FIGHTER_LEVEL, REPAIR_SLOT, SLOT_KINDS, newSlotMemory, nextRole, noteSlot, scrollSlot, slotGate, swapTarget } from './hotbarSlots';

describe('hotbar', () => {
  it('has nine slots in the agreed order', () => {
    expect(SLOT_KINDS).toEqual(['weapon', 'weapon', 'weapon', 'weapon', 'swarm', 'fighters', 'infantry', 'repair', 'counter']);
    expect(REPAIR_SLOT.locked).toBe(true);
  });
  it('the wheel moves one slot per notch and wraps', () => {
    expect(scrollSlot(0, 100)).toBe(1);
    expect(scrollSlot(0, -3)).toBe(8);
    expect(scrollSlot(8, 53)).toBe(0);
    expect(scrollSlot(4, 0)).toBe(4);
  });
  it('F swaps between the last two weapon slots, and from a utility slot back to the weapon in hand', () => {
    let m = newSlotMemory();
    m = noteSlot(m, 1);
    expect(swapTarget(1, m)).toBe(0);
    m = noteSlot(m, 0);
    expect(swapTarget(0, m)).toBe(1);
    m = noteSlot(m, 5); // a utility slot is not remembered
    expect(m).toEqual({ last: 0, prev: 1 });
    expect(swapTarget(5, m)).toBe(0);
    m = noteSlot(m, 0); // picking the same slot again changes nothing
    expect(swapTarget(0, m)).toBe(1);
  });
  it('pressing the swarm slot again cycles explosive, shield, attack', () => {
    expect(nextRole('explosive')).toBe('shield');
    expect(nextRole('shield')).toBe('attack');
    expect(nextRole('attack')).toBe('explosive');
  });
  it('a slot the pilot cannot have yet is locked, and says what opens it (GP-04)', () => {
    const lv1 = { level: 1, hullGuns: 2, counter: false };
    const open = [0, 1, 4].map((i) => slotGate(i, lv1));
    expect(open).toEqual([null, null, null]); // the two guns and the drones are the level-1 kit
    for (const i of [2, 3, 5, 6, 7, 8]) {
      const g = slotGate(i, lv1);
      expect(g, `slot ${i + 1}`).not.toBeNull();
      expect(g!.unlock.length).toBeGreaterThan(0);
      expect(g!.why.length).toBeGreaterThan(20);
    }
    expect(slotGate(5, lv1)!.unlock).toBe(`Lv ${FIGHTER_LEVEL}`);
    expect(slotGate(6, lv1)!.unlock).toBe(`Lv ${CARRIER_LEVEL}`);
    expect(FIGHTER_LEVEL).toBe(2);
    expect(CARRIER_LEVEL).toBe(3);
    const lv3 = { level: 3, hullGuns: 2, counter: true };
    expect(slotGate(5, lv3)).toBeNull();
    expect(slotGate(6, lv3)).toBeNull();
    expect(slotGate(8, lv3)).toBeNull();
    expect(slotGate(2, { ...lv3, hullGuns: 4 })).toBeNull(); // a capital ship's four guns
  });
});
