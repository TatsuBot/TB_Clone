import { beforeEach, describe, expect, it } from 'vitest';
import { createCharacterInstance, createInstance } from '@game/core';
import { applySave, buildSave, isUsableCharacter } from '../src/ui/save';
import { ownedCharacters, ownedCompanions } from '../src/ui/inventory';

const snapshot = () => ownedCharacters.map((c) => c.uid).join();

describe('loading a save never leaves the game unusable', () => {
  beforeEach(() => {
    // each test starts from the same starter roster
    expect(ownedCharacters.length).toBeGreaterThan(5);
  });

  it('round-trips a normal save', () => {
    const before = snapshot();
    expect(applySave(JSON.parse(JSON.stringify(buildSave())))).toEqual({ ok: true });
    expect(snapshot()).toBe(before);
  });

  it('migrates characters from older saves without per-job XP', () => {
    const save = buildSave();
    const legacyCharacter = { ...save.characters[0] } as Record<string, unknown>;
    delete legacyCharacter.jobXp;
    save.characters = save.characters.map((character, index) =>
      index === 0 ? legacyCharacter as never : character,
    );

    expect(applySave(save)).toEqual({ ok: true });
    expect(ownedCharacters[0].jobXp).toEqual([0, 0, 0]);
  });

  it('rejects a save with no usable characters and keeps the current roster', () => {
    const before = snapshot();
    const save = buildSave();
    save.characters = [{ uid: 'x', defId: 'removed_from_game', activeJob: 1, jobLevels: [1, 1, 1], skillBoost: 0, luck: 0 } as never];
    expect(applySave(save)).toMatchObject({ ok: false });
    expect(snapshot()).toBe(before);
  });

  it('drops broken entries but keeps the good ones', () => {
    const save = buildSave();
    const good = save.characters.length;
    (save.characters[0] as { jobLevels: unknown }).jobLevels = null;
    expect(applySave(save)).toEqual({ ok: true });
    expect(ownedCharacters.length).toBe(good - 1);
    expect(ownedCharacters.every(isUsableCharacter)).toBe(true);
  });

  it('unequips a companion that is missing from the save', () => {
    const save = buildSave();
    const c = createCharacterInstance('bahl', { levels: [3, 1, 1] });
    c.companionUid = 'ghost_companion';
    save.characters = [c, ...save.characters.slice(1)];
    save.companions = [createInstance('fire_visor', 2)];
    expect(applySave(save)).toEqual({ ok: true });
    expect(ownedCharacters[0].companionUid).toBeUndefined();
    expect(ownedCompanions).toHaveLength(1);
  });

  it('rejects wrong versions and non-objects', () => {
    expect(applySave({ ...buildSave(), version: 99 })).toMatchObject({ ok: false });
    expect(applySave(null as never)).toMatchObject({ ok: false });
  });
});
