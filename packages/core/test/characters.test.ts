import { describe, it, expect } from 'vitest';
import {
  CHARACTERS,
  CHARACTER_LIST,
  charStatsAtLevel,
  skillsUnlocked,
  getCharacter,
} from '../src/data/characters';

describe('characters', () => {
  it('has at least 15 seed adventurers', () => {
    expect(CHARACTER_LIST.length).toBeGreaterThanOrEqual(15);
  });

  it('Bahl job 1 stats at level bounds', () => {
    const bahl = CHARACTERS.bahl;
    const job1 = bahl.jobs[0];
    expect(charStatsAtLevel(job1, 1).hp).toBe(321);
    expect(charStatsAtLevel(job1, 90).hp).toBe(2957);
    expect(charStatsAtLevel(job1, 1).atk).toBe(31);
  });

  it('Bahl unlocks Gigasword at job level 35', () => {
    const job1 = CHARACTERS.bahl.jobs[0];
    expect(skillsUnlocked(job1, 1).map((s) => s.name)).toContain('Counterattack');
    expect(skillsUnlocked(job1, 34).map((s) => s.id)).not.toContain('gigasword');
    expect(skillsUnlocked(job1, 35).map((s) => s.id)).toContain('gigasword');
  });

  it('Samatha is SS spear lightning', () => {
    const s = getCharacter('samatha')!;
    expect(s.rarity).toBe('SS');
    expect(s.jobs[0].weapon).toBe('Spear');
    expect(s.jobs[0].element).toBe('Lightning');
  });

  it('starters include Bahl, Grace, Kuscah, Healer', () => {
    for (const id of ['bahl', 'grace', 'kuscah', 'healer']) {
      expect(CHARACTERS[id]).toBeDefined();
    }
  });
});
