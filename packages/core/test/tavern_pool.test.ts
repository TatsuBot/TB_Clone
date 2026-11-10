import { describe, it, expect } from 'vitest';
import { CHARACTER_LIST, COMPANION_LIST } from '../src';

describe('tavern pools', () => {
  it('has adventurers across rarities for Pact of Truth', () => {
    const rarities = new Set(CHARACTER_LIST.map((c) => c.rarity));
    expect(rarities.has('B') || rarities.has('A')).toBe(true);
    expect(CHARACTER_LIST.length).toBeGreaterThan(20);
  });
  it('has companions for companion pact', () => {
    expect(COMPANION_LIST.length).toBeGreaterThan(5);
  });
});
