/**
 * Meta progress: coins, XP, stamina, cleared stages, item bag.
 * Persisted through save.ts.
 */

import type { GrantedItem, RewardResult, RecruitBoss } from '@game/core';
import { ownedCharacters } from './inventory';
import { createCharacterInstance, CHARACTERS } from '@game/core';

export interface ProgressState {
  rank: number;
  xp: number;
  /** XP required for next rank (simple curve) */
  xpToRank: number;
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

export const progress: ProgressState = {
  rank: 12,
  xp: 0,
  xpToRank: 1000,
  stamina: 42,
  staminaMax: 50,
  energy: 18,
  coins: 24500,
  cleared: {},
  bag: {},
};

export function isCleared(stageId: string): boolean {
  return !!progress.cleared[stageId];
}

export function addItems(items: GrantedItem[]): void {
  for (const it of items) {
    progress.bag[it.itemId] = (progress.bag[it.itemId] ?? 0) + it.qty;
  }
}

export function addXp(amount: number): void {
  progress.xp += amount;
  while (progress.xp >= progress.xpToRank) {
    progress.xp -= progress.xpToRank;
    progress.rank += 1;
    progress.xpToRank = Math.round(progress.xpToRank * 1.15);
    progress.staminaMax += 1;
    progress.stamina = progress.staminaMax;
  }
}

/** Apply a clear: mark stage, grant rewards, spend stamina. Returns false if already applied this session flag handled by caller. */
export function applyClearRewards(
  stageId: string,
  reward: RewardResult,
  staminaCost: number
): void {
  progress.cleared[stageId] = true;
  progress.coins += reward.coins;
  addXp(reward.xp);
  addItems(reward.items);
  progress.stamina = Math.max(0, progress.stamina - staminaCost);
  progress.lastClear = {
    stageId,
    reward,
    at: new Date().toISOString(),
  };
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
  if (typeof data.rank === 'number') progress.rank = data.rank;
  if (typeof data.xp === 'number') progress.xp = data.xp;
  if (typeof data.xpToRank === 'number') progress.xpToRank = data.xpToRank;
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
