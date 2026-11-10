import { describe, it, expect } from 'vitest';
import {
  grantStageRewards,
  rewardsForStage,
  rollLootTable,
  BORDERLANDS_CHEST,
  createRewardRng,
} from '../src/data/rewards';
import { ITEMS } from '../src/data/items';

describe('rewards', () => {
  it('has wiki materials in the item catalog', () => {
    expect(ITEMS.terra_swordsteel.name).toBe('Terra Swordsteel');
    expect(ITEMS.serenity_shoot.name).toBe('Serenity Shoot');
    expect(ITEMS.claw_of_fate.name).toBe('Claw of Fate');
  });

  it('1-1 uses wiki coin/xp overrides', () => {
    const def = rewardsForStage({ id: '1-1', chapter: 1, stage: 1, stamina: 1 });
    expect(def.coins).toBe(30);
    expect(def.xp).toBe(720);
    expect(def.staminaCost).toBe(1);
  });

  it('grantStageRewards returns lines and items', () => {
    const def = rewardsForStage({ id: '1-1', chapter: 1, stage: 1, stamina: 1 });
    const result = grantStageRewards(def, 42);
    expect(result.coins).toBe(30);
    expect(result.xp).toBe(720);
    expect(result.lines[0]).toContain('Coins');
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });

  it('loot table rolls are deterministic for a seed', () => {
    const a = rollLootTable(BORDERLANDS_CHEST, createRewardRng(99));
    const b = rollLootTable(BORDERLANDS_CHEST, createRewardRng(99));
    expect(a).toEqual(b);
  });
});
