
/**
 * Add Jobs / Recode / Shop — spendable meta actions.
 */
import {
  CHARACTERS,
  type CharacterInstance,
  type CharacterRarity,
} from '@game/core';
import { ownedCharacters } from './inventory';
import { progress } from './progress';
import { saveToLocalStorage } from './save';

/** Wiki pattern: Job 2 needs Serenity Shoot ×15 (+ coins); Job 3 needs Wisdom Flower ×15. */
export function jobUnlockCost(
  rarity: CharacterRarity,
  targetJob: 2 | 3
): { coins: number; items: Array<{ itemId: string; qty: number }> } {
  const tier =
    rarity === 'Z' || rarity === 'SS' ? 3 : rarity === 'S' || rarity === 'A' ? 2 : 1;
  if (targetJob === 2) {
    return {
      coins: 5000 * tier,
      items: [{ itemId: 'serenity_shoot', qty: 10 + tier * 5 }],
    };
  }
  return {
    coins: 12000 * tier,
    items: [
      { itemId: 'terra_swordsteel', qty: 10 + tier * 5 },
      { itemId: 'claw_of_fate', qty: 3 },
    ],
  };
}

function hasItems(need: Array<{ itemId: string; qty: number }>): boolean {
  return need.every((n) => (progress.bag[n.itemId] ?? 0) >= n.qty);
}

function spendItems(need: Array<{ itemId: string; qty: number }>): void {
  for (const n of need) {
    progress.bag[n.itemId] = (progress.bag[n.itemId] ?? 0) - n.qty;
  }
}

export type JobUnlockResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export function unlockNextJob(charUid: string): JobUnlockResult {
  const ch = ownedCharacters.find((c) => c.uid === charUid);
  if (!ch) return { ok: false, error: 'Character not found' };
  const def = CHARACTERS[ch.defId];
  if (!def) return { ok: false, error: 'Unknown character' };
  const unlocked = ch.jobsUnlocked ?? 1;
  if (unlocked >= 3) return { ok: false, error: 'All jobs already unlocked' };
  if (unlocked >= def.jobs.length) {
    return { ok: false, error: `${def.name} only has ${def.jobs.length} job(s) in data` };
  }
  const target = (unlocked + 1) as 2 | 3;
  if (!def.jobs.some((j) => j.jobIndex === target)) {
    return { ok: false, error: `No Job ${target} defined for ${def.name}` };
  }
  const cost = jobUnlockCost(def.rarity, target);
  if (progress.coins < cost.coins) {
    return { ok: false, error: `Need ${cost.coins} coins` };
  }
  if (!hasItems(cost.items)) {
    const miss = cost.items
      .filter((i) => (progress.bag[i.itemId] ?? 0) < i.qty)
      .map((i) => `${i.itemId}×${i.qty}`)
      .join(', ');
    return { ok: false, error: `Need materials: ${miss}` };
  }
  progress.coins -= cost.coins;
  spendItems(cost.items);
  ch.jobsUnlocked = target;
  saveToLocalStorage();
  return { ok: true, message: `Unlocked Job ${target} for ${def.name}` };
}

export function setActiveJob(charUid: string, job: 1 | 2 | 3): JobUnlockResult {
  const ch = ownedCharacters.find((c) => c.uid === charUid);
  if (!ch) return { ok: false, error: 'Character not found' };
  if (job > (ch.jobsUnlocked ?? 1)) {
    return { ok: false, error: `Job ${job} not unlocked yet` };
  }
  const def = CHARACTERS[ch.defId];
  if (!def?.jobs.some((j) => j.jobIndex === job)) {
    return { ok: false, error: 'Job not on character def' };
  }
  ch.activeJob = job;
  saveToLocalStorage();
  return { ok: true, message: `Active job set to ${job}` };
}

/** Recode DNA (simplified): all three jobs ≥ 50 and unlocked → +5 SB or message. Full Λ forms later. */
export function tryRecode(charUid: string): JobUnlockResult {
  const ch = ownedCharacters.find((c) => c.uid === charUid);
  if (!ch) return { ok: false, error: 'Character not found' };
  const def = CHARACTERS[ch.defId];
  if (!def) return { ok: false, error: 'Unknown character' };
  if ((ch.jobsUnlocked ?? 1) < 3) {
    return { ok: false, error: 'Need Job 3 unlocked' };
  }
  if (ch.jobLevels.some((lv) => lv < 50)) {
    return { ok: false, error: 'Need all jobs at Lv 50+ (wiki uses 80 for true Λ)' };
  }
  if (progress.coins < 20000) return { ok: false, error: 'Need 20,000 coins' };
  progress.coins -= 20000;
  ch.skillBoost = Math.min(100, (ch.skillBoost ?? 0) + 5);
  saveToLocalStorage();
  return {
    ok: true,
    message: `Recode ritual complete for ${def.name}: Skill Boost +5 (now ${ch.skillBoost}%). Full Λ unit swap not in data yet.`,
  };
}

export type ShopItemId =
  | 'restore_stamina'
  | 'energy_5'
  | 'energy_15'
  | 'mat_serenity'
  | 'mat_swordsteel'
  | 'mat_claw';

export function buyShopItem(id: ShopItemId): JobUnlockResult {
  switch (id) {
    case 'restore_stamina':
      if (progress.energy < 1) return { ok: false, error: 'Need 1 Energy' };
      progress.energy -= 1;
      progress.stamina = progress.staminaMax;
      saveToLocalStorage();
      return { ok: true, message: 'Stamina fully restored' };
    case 'energy_5':
      if (progress.coins < 5000) return { ok: false, error: 'Need 5,000 coins' };
      progress.coins -= 5000;
      progress.energy += 5;
      saveToLocalStorage();
      return { ok: true, message: '+5 Energy' };
    case 'energy_15':
      if (progress.coins < 12000) return { ok: false, error: 'Need 12,000 coins' };
      progress.coins -= 12000;
      progress.energy += 15;
      saveToLocalStorage();
      return { ok: true, message: '+15 Energy' };
    case 'mat_serenity':
      if (progress.coins < 800) return { ok: false, error: 'Need 800 coins' };
      progress.coins -= 800;
      progress.bag.serenity_shoot = (progress.bag.serenity_shoot ?? 0) + 5;
      saveToLocalStorage();
      return { ok: true, message: '+5 Serenity Shoot' };
    case 'mat_swordsteel':
      if (progress.coins < 1200) return { ok: false, error: 'Need 1,200 coins' };
      progress.coins -= 1200;
      progress.bag.terra_swordsteel = (progress.bag.terra_swordsteel ?? 0) + 5;
      saveToLocalStorage();
      return { ok: true, message: '+5 Terra Swordsteel' };
    case 'mat_claw':
      if (progress.coins < 2000) return { ok: false, error: 'Need 2,000 coins' };
      progress.coins -= 2000;
      progress.bag.claw_of_fate = (progress.bag.claw_of_fate ?? 0) + 1;
      saveToLocalStorage();
      return { ok: true, message: '+1 Claw of Fate' };
    default:
      return { ok: false, error: 'Unknown shop item' };
  }
}

/** Grant starter materials so Add Jobs is testable. */
export function seedJobMaterials(): void {
  progress.bag.serenity_shoot = (progress.bag.serenity_shoot ?? 0) + 30;
  progress.bag.terra_swordsteel = (progress.bag.terra_swordsteel ?? 0) + 20;
  progress.bag.claw_of_fate = (progress.bag.claw_of_fate ?? 0) + 5;
  saveToLocalStorage();
}
