/**
 * Meta progress: coins, stamina, cleared stages, item bag.
 * Persisted through save.ts.
 */

import type { GrantedItem, RewardResult, RecruitBoss } from '@game/core';
import { ownedCharacters } from './inventory';
import { addCharacterJobXp, characterXpAtLevel, characterXpToNextLevel, createCharacterInstance, CHARACTERS } from '@game/core';

export interface ProgressState {
  stamina: number;
  staminaMax: number;
  energy: number;
  coins: number;
  /** stage id → cleared */
  cleared: Record<string, boolean>;
  /** itemId → qty */
  bag: Record<string, number>;
  /** Last victory summary for UI */
  lastClear?: {
    stageId: string;
    reward: RewardResult;
    at: string;
  };
}

const STARTING_PROGRESS: Omit<ProgressState, 'lastClear'> = {
  stamina: 42,
  staminaMax: 50,
  energy: 18,
  coins: 24500,
  cleared: {},
  bag: {},
};

export const progress: ProgressState = structuredClone(STARTING_PROGRESS);

export function resetProgress(): void {
  Object.assign(progress, structuredClone(STARTING_PROGRESS));
  delete progress.lastClear;
}

export function isCleared(stageId: string): boolean {
  return !!progress.cleared[stageId];
}

export function addItems(items: GrantedItem[]): void {
  for (const it of items) {
    progress.bag[it.itemId] = (progress.bag[it.itemId] ?? 0) + it.qty;
  }
}

/** Apply stage rewards and distribute its XP pool across the deployed characters. */
export function applyClearRewards(
  stageId: string,
  reward: RewardResult,
  staminaCost: number,
  participants = ownedCharacters.slice(0, 6),
): { name: string; job: number; xp: number; level: number; levelsGained: number; totalXp: number; xpIntoLevel: number; xpToNextLevel: number }[] {
  progress.cleared[stageId] = true;
  progress.coins += reward.coins;
  addItems(reward.items);
  progress.stamina = Math.max(0, progress.stamina - staminaCost);
  const xpEach = participants.length > 0 ? Math.floor(reward.xp / participants.length) : 0;
  const remainder = participants.length > 0 ? reward.xp % participants.length : 0;
  const characterXp = participants.map((character, index) => {
    const xp = xpEach + (index < remainder ? 1 : 0);
    const job = character.activeJob;
    const jobDef = CHARACTERS[character.defId]?.jobs[job - 1];
    const result = jobDef
      ? addCharacterJobXp(character, jobDef, xp)
      : { xpAwarded: 0, levelsGained: 0 };
    return {
      name: CHARACTERS[character.defId]?.name ?? character.defId,
      job,
      xp: result.xpAwarded,
      level: character.jobLevels[job - 1],
      levelsGained: result.levelsGained,
      totalXp: jobDef ? characterXpAtLevel(jobDef, character.jobLevels[job - 1]) + character.jobXp[job - 1] : 0,
      xpIntoLevel: character.jobXp[job - 1],
      xpToNextLevel: jobDef ? characterXpToNextLevel(jobDef, character.jobLevels[job - 1]) : 0,
    };
  });
  progress.lastClear = {
    stageId,
    reward,
    at: new Date().toISOString(),
  };
  return characterXp;
}

export function canAffordStage(staminaCost: number): boolean {
  return progress.stamina >= staminaCost;
}

/** Snapshot for save file. */
export function progressSnapshot(): ProgressState {
  return structuredClone(progress);
}

export function applyProgressSnapshot(data: Partial<ProgressState> | undefined): void {
  if (!data) return;
  if (typeof data.stamina === 'number') progress.stamina = data.stamina;
  if (typeof data.staminaMax === 'number') progress.staminaMax = data.staminaMax;
  if (typeof data.energy === 'number') progress.energy = data.energy;
  if (typeof data.coins === 'number') progress.coins = data.coins;
  if (data.cleared && typeof data.cleared === 'object') progress.cleared = { ...data.cleared };
  if (data.bag && typeof data.bag === 'object') progress.bag = { ...data.bag };
}


/** Add recruit boss to roster if not already owned. Returns true if newly recruited. */
export function tryRecruitBoss(recruit: RecruitBoss): boolean {
  if (ownedCharacters.some((c) => c.defId === recruit.characterId)) return false;
  if (!CHARACTERS[recruit.characterId]) return false;
  ownedCharacters.push(createCharacterInstance(recruit.characterId, { levels: [1, 1, 1] }));
  return true;
}
