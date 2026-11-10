/**
 * Owned roster + companion equip rules.
 * Each CompanionInstance has a unique uid and may be equipped to at most one character.
 */
import {
  type CompanionInstance,
  type CharacterInstance,
  createInstance,
  createCharacterInstance,
  COMPANIONS,
  CHARACTERS,
} from '@game/core';

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

export const ownedCharacters: CharacterInstance[] = [
  createCharacterInstance('bahl', { levels: [12, 1, 1], jobsUnlocked: 1 }),
  createCharacterInstance('grace', { levels: [11, 1, 1], jobsUnlocked: 1 }),
  createCharacterInstance('kuscah', { levels: [10, 1, 1], jobsUnlocked: 1 }),
  createCharacterInstance('healer', { levels: [8, 1, 1], jobsUnlocked: 1 }),
  createCharacterInstance('warrior', { levels: [6, 1, 1], jobsUnlocked: 1 }),
  createCharacterInstance('knight', { levels: [6, 1, 1], jobsUnlocked: 1 }),
  createCharacterInstance('samatha', { levels: [18, 5, 1], jobsUnlocked: 2 }),
  createCharacterInstance('ellvern', { levels: [14, 1, 1], jobsUnlocked: 1 }),
  createCharacterInstance('palpa', { levels: [12, 1, 1], jobsUnlocked: 1 }),
  createCharacterInstance('amina', { levels: [9, 1, 1], jobsUnlocked: 1 }),
];

ownedCharacters[0].companionUid = ownedCompanions[0].uid;

/** Ordered battle party (up to 6 character uids). */
export let battlePartyUids: string[] = ownedCharacters.slice(0, 6).map((c) => c.uid);

export function setBattleParty(uids: string[]): void {
  const unique = [...new Set(uids)].filter((uid) => ownedCharacters.some((c) => c.uid === uid));
  battlePartyUids = unique.slice(0, 6);
  void import('./save').then((s) => s.saveToLocalStorage());
}

export function getBattleParty(): CharacterInstance[] {
  return battlePartyUids
    .map((uid) => ownedCharacters.find((c) => c.uid === uid))
    .filter((c): c is CharacterInstance => !!c)
    .slice(0, 6);
}

export function companionByUid(uid: string | undefined): CompanionInstance | undefined {
  if (!uid) return undefined;
  return ownedCompanions.find((c) => c.uid === uid);
}

export function characterByUid(uid: string): CharacterInstance | undefined {
  return ownedCharacters.find((c) => c.uid === uid);
}

/** Who currently has this companion equipped (if anyone). */
export function equippedBy(companionUid: string): CharacterInstance | undefined {
  return ownedCharacters.find((c) => c.companionUid === companionUid);
}

/**
 * Equip a specific companion *instance* to a character.
 * - Unequips that instance from any other character first (no sharing).
 * - Pass companionUid undefined to clear the slot.
 */
export function equipCompanion(charUid: string, companionUid: string | undefined): { ok: true } | { ok: false; error: string } {
  const ch = characterByUid(charUid);
  if (!ch) return { ok: false, error: 'Character not found' };

  if (companionUid) {
    const inst = companionByUid(companionUid);
    if (!inst) return { ok: false, error: 'Companion instance not found' };
    // Strip this exact instance from every character
    for (const c of ownedCharacters) {
      if (c.companionUid === companionUid) c.companionUid = undefined;
    }
  }

  ch.companionUid = companionUid;
  void import('./save').then((s) => s.saveToLocalStorage());
  return { ok: true };
}

/** Count owned instances per companion defId (for UI stock display). */
export function companionStock(): Array<{
  defId: string;
  name: string;
  rarity: string;
  total: number;
  free: number;
  instances: CompanionInstance[];
}> {
  const map = new Map<string, CompanionInstance[]>();
  for (const c of ownedCompanions) {
    const arr = map.get(c.defId) ?? [];
    arr.push(c);
    map.set(c.defId, arr);
  }
  return [...map.entries()].map(([defId, instances]) => {
    const def = COMPANIONS[defId];
    const free = instances.filter((i) => !equippedBy(i.uid)).length;
    return {
      defId,
      name: def?.name ?? defId,
      rarity: def?.rarity ?? '?',
      total: instances.length,
      free,
      instances,
    };
  });
}

export function getCompanionDef(inst: CompanionInstance) {
  return COMPANIONS[inst.defId];
}

export function getCharacterDef(inst: CharacterInstance) {
  return CHARACTERS[inst.defId];
}

/** Portrait glyph from weapon / rarity (lightweight “icon”). */
export function characterIcon(defId: string): string {
  const def = CHARACTERS[defId];
  if (!def) return '👤';
  const job = def.jobs[0];
  const w = job?.weapon;
  if (w === 'Sword') return '⚔️';
  if (w === 'Bow') return '🏹';
  if (w === 'Spear') return '🔱';
  if (w === 'Staff') return '🔮';
  return '👤';
}

export function companionIcon(defId: string): string {
  const def = COMPANIONS[defId];
  if (!def) return '💍';
  const id = defId.toLowerCase();
  if (id.includes('heal') || id.includes('pendant') || id.includes('ring')) return '💚';
  if (id.includes('sword') || id.includes('blade')) return '🗡️';
  if (id.includes('shield') || id.includes('visor')) return '🛡️';
  if (id.includes('minion') || id.includes('metal')) return '🤖';
  if (id.includes('tear')) return '💧';
  if (id.includes('punish')) return '⚡';
  return '💍';
}

export function rarityClass(r: string): string {
  return `rarity-${r.toLowerCase()}`;
}
