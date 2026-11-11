/**
 * In-memory inventory for the UI preview.
 * Later this moves to a real save layer.
 */
import {
  type CompanionInstance,
  type CharacterInstance,
  createInstance,
  createCharacterInstance,
  COMPANIONS,
  CHARACTERS,
} from '@game/core';

export type { CharacterInstance, CompanionInstance };

/** Starter owned companions at various levels. */
export const ownedCompanions: CompanionInstance[] = [
  createInstance('fire_visor', 7),
  createInstance('fire_visor', 3),
  createInstance('healing_ring', 10),
  createInstance('healing_ring', 5),
  createInstance('white_pendant', 12),
  createInstance('silver_sword', 15),
  createInstance('combat_shield', 10),
  createInstance('punishers', 8),
  createInstance('metal_minion', 1),
  createInstance('hisos_tear', 5),
];

/** Starter roster the player "owns". */
export const ownedCharacters: CharacterInstance[] = [
  createCharacterInstance('bahl', { levels: [12, 1, 1] }),
  createCharacterInstance('grace', { levels: [11, 1, 1] }),
  createCharacterInstance('kuscah', { levels: [10, 1, 1] }),
  createCharacterInstance('samatha', { levels: [18, 5, 1] }),
  createCharacterInstance('ellvern', { levels: [14, 1, 1] }),
  createCharacterInstance('palpa', { levels: [12, 1, 1] }),
  createCharacterInstance('amina', { levels: [9, 1, 1] }),
];

// Equip Fire Visor on Bahl by default
ownedCharacters[0].companionUid = ownedCompanions[0].uid;

export function companionByUid(uid: string | undefined): CompanionInstance | undefined {
  if (!uid) return undefined;
  return ownedCompanions.find((c) => c.uid === uid);
}

export function characterByUid(uid: string): CharacterInstance | undefined {
  return ownedCharacters.find((c) => c.uid === uid);
}

export function equipCompanion(charUid: string, companionUid: string | undefined): void {
  const ch = characterByUid(charUid);
  if (!ch) return;
  // Unequip from anyone else first
  if (companionUid) {
    for (const c of ownedCharacters) {
      if (c.companionUid === companionUid) c.companionUid = undefined;
    }
  }
  ch.companionUid = companionUid;
  // Persist after equip changes (lazy import to avoid cycles at module init)
  void import('./save').then((s) => s.saveToLocalStorage());
}

export function getCompanionDef(inst: CompanionInstance) {
  return COMPANIONS[inst.defId];
}

export function getCharacterDef(inst: CharacterInstance) {
  return CHARACTERS[inst.defId];
}
