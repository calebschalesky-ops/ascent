import { describe, expect, it } from 'vitest';
import { FORCE, forceSize } from '../lib/shipTypes';
import { navyLine } from './ConquestHud';

describe('the planet panel', () => {
  it('counts every ship a world flies, the destroyer too (player notes 5.4)', () => {
    expect(navyLine(FORCE)).toBe(`${forceSize(FORCE)} ships: 1 capital ship, 2 cruisers, 4 fighters, 1 destroyer`);
    expect(navyLine({ capital: 0, cruiser: 1, fighter: 0, destroyer: 0 })).toBe('1 ship: 1 cruiser');
    expect(navyLine({ capital: 0, cruiser: 0, fighter: 0, destroyer: 0 })).toBe('none flying');
  });
});
