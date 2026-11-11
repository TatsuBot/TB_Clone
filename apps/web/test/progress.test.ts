import { afterEach, describe, expect, it } from 'vitest';
import { CHARACTERS, characterXpToNextLevel, createCharacterInstance, type CharacterInstance, type RewardResult } from '@game/core';
import { ownedCharacters } from '../src/ui/inventory';
import { applyClearRewards, progress } from '../src/ui/progress';

const originalCharacters = ownedCharacters.map((character) => structuredClone(character));
const originalProgress = structuredClone(progress);

afterEach(() => {
  ownedCharacters.splice(0, ownedCharacters.length, ...originalCharacters.map((c) => structuredClone(c)));
  Object.assign(progress, structuredClone(originalProgress));
});

describe('character XP from stage clears', () => {
  it('splits the party pool across deployed characters and levels their active jobs', () => {
    const first = createCharacterInstance('bahl');
    const second = createCharacterInstance('bahl', { job: 2 });
    const reserve = createCharacterInstance('kuscah');
    ownedCharacters.splice(0, ownedCharacters.length, first, second);
    const job1Xp = characterXpToNextLevel(CHARACTERS.bahl.jobs[0]!, 1);
    const job2Xp = characterXpToNextLevel(CHARACTERS.bahl.jobs[1]!, 1);
    const share = Math.max(job1Xp, job2Xp);
    const reward: RewardResult = { coins: 0, xp: share * 2 + 1, items: [], lines: [] };

    const awarded = applyClearRewards('test-stage', reward, 0);

    expect(awarded.map(({ xp }) => xp)).toEqual([share + 1, share]);
    expect(first.jobLevels).toEqual([2, 1, 1]);
    expect(first.jobXp).toEqual([share + 1 - job1Xp, 0, 0]);
    expect(second.jobLevels).toEqual([1, 2, 1]);
    expect(second.jobXp).toEqual([0, share - job2Xp, 0]);
    expect(reserve.jobLevels).toEqual([1, 1, 1]);
  });

  it('shares XP only with the first six deployed characters', () => {
    const party: CharacterInstance[] = Array.from({ length: 7 }, (_, i) =>
      createCharacterInstance(['bahl', 'grace', 'kuscah', 'samatha', 'ellvern', 'palpa', 'amina'][i]!),
    );
    ownedCharacters.splice(0, ownedCharacters.length, ...party);
    const xpPerCharacter = Math.max(
      ...party.slice(0, 6).map((character) =>
        characterXpToNextLevel(CHARACTERS[character.defId]!.jobs[0]!, 1),
      ),
    );
    const reward: RewardResult = { coins: 0, xp: xpPerCharacter * 6, items: [], lines: [] };

    const awarded = applyClearRewards('test-stage', reward, 0);

    expect(awarded).toHaveLength(6);
    expect(party.slice(0, 6).every((character) => character.jobLevels[0] === 2)).toBe(true);
    expect(party[6]!.jobLevels[0]).toBe(1);
  });
});
