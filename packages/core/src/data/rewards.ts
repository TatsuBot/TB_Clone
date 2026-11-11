/**
 * Stage clear rewards + loot tables (wiki-shaped).
 *
 * Wiki pattern:
 * - Fixed coins / XP per stage
 * - Luck chests with weighted possible rewards
 * - Enemy drop lines (optional, rolled per clear for now as a small bonus table)
 */

import type { StageRef } from './stages';
import { ITEMS } from './items';
import { ENEMIES } from './enemies';

export interface LootEntry {
  itemId: string;
  /** Weight relative to siblings in the same table (higher = more common) */
  weight: number;
  /** Min–max quantity when this entry is chosen */
  qty?: [number, number];
}

export interface LootTable {
  id: string;
  /** How many independent rolls from this table */
  rolls: number;
  entries: LootEntry[];
}

export interface StageRewardDef {
  /** Fixed coin grant on clear (wiki "Coins earned") */
  coins: number;
  /** Total XP pool for the stage, split across participating characters on clear. */
  xp: number;
  /** Optional stamina refund note — actual spend handled by meta */
  staminaCost?: number;
  /** Luck / clear chests */
  chests?: LootTable[];
  /** Small clear bonus table (stand-in for aggregated enemy drops) */
  drops?: LootTable;
}

export interface GrantedItem {
  itemId: string;
  name: string;
  qty: number;
}

export interface RewardResult {
  coins: number;
  xp: number;
  items: GrantedItem[];
  /** Human-readable lines for the victory HUD */
  lines: string[];
}

/** Deterministic-ish RNG from a numeric seed (battle seed works). */

/** Roll one enemy's drop table (wiki % → weights). Chance of any drop ≈ sum of weights if < 100 treated as % scale. */
export function rollEnemyDrops(enemyId: string, rand: () => number): GrantedItem[] {
  const def = ENEMIES[enemyId];
  if (!def?.drops?.length) return [];
  const out: GrantedItem[] = [];
  for (const entry of def.drops) {
    // weight treated as percent chance when ≤ 100
    const chance = entry.weight <= 100 ? entry.weight / 100 : entry.weight / (entry.weight + 100);
    if (rand() <= chance) {
      const [lo, hi] = entry.qty ?? [1, 1];
      const qty = lo === hi ? lo : lo + Math.floor(rand() * (hi - lo + 1));
      out.push({ itemId: entry.itemId, name: ITEMS[entry.itemId]?.name ?? entry.itemId, qty });
    }
  }
  return out;
}

/** Aggregate drop rolls for all enemy def ids that appeared in a clear (unique ids once each for now). */
export function rollDropsForEnemies(enemyIds: string[], seed: number): GrantedItem[] {
  const rand = createRewardRng(seed ^ 0xde7);
  const seen = new Set<string>();
  const items: GrantedItem[] = [];
  for (const id of enemyIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    items.push(...rollEnemyDrops(id, rand));
  }
  return items;
}

export function createRewardRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pickWeighted(entries: LootEntry[], rand: () => number): LootEntry | undefined {
  if (entries.length === 0) return undefined;
  const total = entries.reduce((a, e) => a + e.weight, 0);
  let r = rand() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

function qtyFor(entry: LootEntry, rand: () => number): number {
  const [lo, hi] = entry.qty ?? [1, 1];
  if (lo === hi) return lo;
  return lo + Math.floor(rand() * (hi - lo + 1));
}

export function rollLootTable(table: LootTable, rand: () => number): GrantedItem[] {
  const out: GrantedItem[] = [];
  for (let i = 0; i < table.rolls; i++) {
    const entry = pickWeighted(table.entries, rand);
    if (!entry) continue;
    const def = ITEMS[entry.itemId];
    out.push({
      itemId: entry.itemId,
      name: def?.name ?? entry.itemId,
      qty: qtyFor(entry, rand),
    });
  }
  return out;
}

export function grantStageRewards(def: StageRewardDef, seed: number, enemyIds: string[] = []): RewardResult {
  const rand = createRewardRng(seed);
  const items: GrantedItem[] = [];
  for (const chest of def.chests ?? []) {
    items.push(...rollLootTable(chest, rand));
  }
  if (def.drops) items.push(...rollLootTable(def.drops, rand));
  items.push(...rollDropsForEnemies(enemyIds, seed));

  // Merge duplicate item ids
  const merged = new Map<string, GrantedItem>();
  for (const it of items) {
    const prev = merged.get(it.itemId);
    if (prev) prev.qty += it.qty;
    else merged.set(it.itemId, { ...it });
  }
  const flat = [...merged.values()];

  const lines = [
    `+${def.coins} Coins`,
    `+${def.xp} XP`,
    ...flat.map((i) => `+${i.qty} ${i.name}`),
  ];

  return { coins: def.coins, xp: def.xp, items: flat, lines };
}

/** Default luck chest pools from Borderlands wiki examples. */
export const BORDERLANDS_CHEST: LootTable = {
  id: 'borderlands_luck',
  rolls: 1,
  entries: [
    { itemId: 'terra_bowstring', weight: 20 },
    { itemId: 'terra_swordsteel', weight: 20 },
    { itemId: 'terra_staffwood', weight: 15 },
    { itemId: 'terra_spearbronze', weight: 15 },
    { itemId: 'serenity_shoot', weight: 25 },
    { itemId: 'benevolent_fang', weight: 20 },
    { itemId: 'forlorn_stone', weight: 15 },
    { itemId: 'claw_of_fate', weight: 5 },
  ],
};

export const GORF_DROPS: LootTable = {
  id: 'gorf_drops',
  rolls: 1,
  entries: [
    { itemId: 'serenity_shoot', weight: 40 },
    { itemId: 'white_ring', weight: 30 },
    { itemId: 'sentient_flame', weight: 5 },
  ],
};

/** Wiki-ish defaults by chapter/stage when a stage has no explicit override. */
export function defaultRewardsFor(chapter: number, stage: number): StageRewardDef {
  const coins = 20 + chapter * 15 + stage * 8;
  const xp = 400 + chapter * 200 + stage * 80;
  const chests: LootTable[] =
    stage % 5 === 0
      ? [{ ...BORDERLANDS_CHEST, rolls: 2 }]
      : stage <= 3 && chapter === 1
        ? [{ ...BORDERLANDS_CHEST, rolls: 1 }]
        : [{ ...BORDERLANDS_CHEST, rolls: 1 }];

  return {
    coins,
    xp,
    staminaCost: Math.min(10, 1 + Math.floor((chapter + stage) / 3)),
    chests,
    drops: chapter >= 2 ? GORF_DROPS : undefined,
  };
}

/** Explicit overrides for early wiki stages (coins from chapter pages). */
export const STAGE_REWARD_OVERRIDES: Record<string, Partial<StageRewardDef>> = {

  '1-1': { coins: 30, xp: 720, staminaCost: 1 },

  '1-2': { coins: 50, xp: 1223, staminaCost: 1 },

  '1-3': { coins: 40, xp: 960, staminaCost: 1 },

  '1-4': { coins: 50, xp: 1200, staminaCost: 1 },

  '1-5': { coins: 78, xp: 1726, staminaCost: 1 },

  '2-1': { coins: 210, xp: 1500, staminaCost: 1 },

  '2-2': { coins: 260, xp: 1800, staminaCost: 1 },

  '2-3': { coins: 280, xp: 2000, staminaCost: 1 },

  '2-4': { coins: 300, xp: 2200, staminaCost: 1 },

  '2-5': { coins: 340, xp: 2500, staminaCost: 1 },

  '3-1': { coins: 224, xp: 2000, staminaCost: 1 },

  '3-2': { coins: 244, xp: 7263, staminaCost: 1 },

  '3-3': { coins: 236, xp: 6594, staminaCost: 1 },

  '3-4': { coins: 312, xp: 3000, staminaCost: 1 },

  '3-5': { coins: 330, xp: 3200, staminaCost: 1 },

  '4-1': { coins: 200, xp: 2500, staminaCost: 1 },

  '4-2': { coins: 220, xp: 2800, staminaCost: 1 },

  '4-3': { coins: 240, xp: 3000, staminaCost: 1 },

  '4-4': { coins: 260, xp: 3200, staminaCost: 1 },

  '4-5': { coins: 280, xp: 3400, staminaCost: 1 },

  '4-10': { coins: 500, xp: 5000, staminaCost: 1 },

  '5-1': { coins: 350, xp: 5000, staminaCost: 1 },

  '5-5': { coins: 416, xp: 8250, staminaCost: 1 },

  '5-6': { coins: 410, xp: 7500, staminaCost: 1 },

  '6-1': { coins: 304, xp: 6410, staminaCost: 7 },

  '6-5': { coins: 178, xp: 4725, staminaCost: 7 },

  '7-1': { coins: 473, xp: 8500, staminaCost: 8 },

  '7-2': { coins: 554, xp: 9500, staminaCost: 8 },

  '7-3': { coins: 240, xp: 6000, staminaCost: 8 },

  '7-4': { coins: 636, xp: 11400, staminaCost: 8 },

  '7-5': { coins: 500, xp: 9000, staminaCost: 8 },

  '4-8': { coins: 300, xp: 3500, staminaCost: 1 },

  '5-4': { coins: 94, xp: 2950, staminaCost: 1 },

  '5-9': { coins: 408, xp: 8000, staminaCost: 1 },

  '5-10': { coins: 423, xp: 7500, staminaCost: 1 },

  '6-2': { coins: 484, xp: 10400, staminaCost: 7 },

  '6-3': { coins: 280, xp: 5760, staminaCost: 7 },

  '6-4': { coins: 202, xp: 3800, staminaCost: 7 },

};

export function rewardsForStage(ref: Pick<StageRef, 'id' | 'chapter' | 'stage' | 'stamina'>): StageRewardDef {
  const base = defaultRewardsFor(ref.chapter, ref.stage);
  const over = STAGE_REWARD_OVERRIDES[ref.id] ?? {};
  return {
    ...base,
    ...over,
    staminaCost: over.staminaCost ?? ref.stamina ?? base.staminaCost,
    chests: over.chests ?? base.chests,
    drops: over.drops ?? base.drops,
  };
}
