/**
 * Tavern pacts — roll adventurers / companions, spend energy/coins.
 * Rates approximate wiki Pact of Truth bands (simplified).
 */
import {
  CHARACTERS,
  COMPANIONS,
  CHARACTER_LIST,
  COMPANION_LIST,
  createCharacterInstance,
  createInstance,
  type CharacterRarity,
  type CompanionRarity,
} from '@game/core';
import { ownedCharacters, ownedCompanions } from './inventory';
import { progress } from './progress';
import { saveToLocalStorage } from './save';

export type PactId = 'truth' | 'fellowship' | 'companions';

export interface PactDef {
  id: PactId;
  name: string;
  /** energy cost (0 if coin-only) */
  energy: number;
  /** coin cost */
  coins: number;
  kind: 'adventurer' | 'companion' | 'mixed';
}

export const PACTS: Record<PactId, PactDef> = {
  truth: {
    id: 'truth',
    name: 'Pact of Truth',
    energy: 5,
    coins: 0,
    kind: 'adventurer',
  },
  fellowship: {
    id: 'fellowship',
    name: 'Pact of Fellowship',
    energy: 0,
    coins: 3000,
    kind: 'mixed',
  },
  companions: {
    id: 'companions',
    name: 'Companions of Truth',
    energy: 3,
    coins: 0,
    kind: 'companion',
  },
};

/** Wiki-ish rarity weights for Pact of Truth (adventurers). */
const TRUTH_RARITY: Array<{ rarity: CharacterRarity; weight: number }> = [
  { rarity: 'Z', weight: 4 },
  { rarity: 'SS', weight: 10 },
  { rarity: 'S', weight: 15 },
  { rarity: 'A', weight: 35 },
  { rarity: 'B', weight: 36 },
];

const COMPANION_RARITY: Array<{ rarity: CompanionRarity; weight: number }> = [
  { rarity: 'Z', weight: 2 },
  { rarity: 'SS', weight: 5 },
  { rarity: 'S', weight: 10 },
  { rarity: 'A', weight: 20 },
  { rarity: 'B', weight: 30 },
  { rarity: 'C', weight: 20 },
  { rarity: 'D', weight: 13 },
];

function pickWeighted<T extends { weight: number }>(rows: T[], rand: () => number): T {
  const total = rows.reduce((a, r) => a + r.weight, 0);
  let r = rand() * total;
  for (const row of rows) {
    r -= row.weight;
    if (r <= 0) return row;
  }
  return rows[rows.length - 1];
}

function rng(): () => number {
  // Math.random is fine for gacha preview
  return Math.random;
}

export interface RollResult {
  ok: true;
  kind: 'character' | 'companion';
  defId: string;
  name: string;
  rarity: string;
  duplicate: boolean;
  message: string;
}

export type RollFail = { ok: false; error: string };

export function canAfford(pact: PactDef): boolean {
  if (progress.energy < pact.energy) return false;
  if (progress.coins < pact.coins) return false;
  return true;
}

function spend(pact: PactDef): void {
  progress.energy -= pact.energy;
  progress.coins -= pact.coins;
}

function poolCharacters(rarities: CharacterRarity[]): string[] {
  return CHARACTER_LIST.filter((c) => rarities.includes(c.rarity)).map((c) => c.id);
}

function poolCompanions(rarities: CompanionRarity[]): string[] {
  return COMPANION_LIST.filter((c) => rarities.includes(c.rarity)).map((c) => c.id);
}

function rollCharacter(rand: () => number): RollResult {
  const band = pickWeighted(TRUTH_RARITY, rand);
  let pool = poolCharacters([band.rarity]);
  // Fallback down the ladder if empty
  if (pool.length === 0) {
    pool = poolCharacters(['B', 'A', 'S', 'SS', 'Z', 'C']);
  }
  const defId = pool[Math.floor(rand() * pool.length)];
  const def = CHARACTERS[defId];
  const already = ownedCharacters.some((c) => c.defId === defId);
  if (already) {
    // Skill boost +1 on first owned copy
    const inst = ownedCharacters.find((c) => c.defId === defId)!;
    inst.skillBoost = Math.min(100, (inst.skillBoost ?? 0) + 1);
    return {
      ok: true,
      kind: 'character',
      defId,
      name: def.name,
      rarity: def.rarity,
      duplicate: true,
      message: `Duplicate ${def.rarity} ${def.name} — Skill Boost +1 (now ${inst.skillBoost}%)`,
    };
  }
  ownedCharacters.push(createCharacterInstance(defId));
  return {
    ok: true,
    kind: 'character',
    defId,
    name: def.name,
    rarity: def.rarity,
    duplicate: false,
    message: `Recruited ${def.rarity} ${def.name}!`,
  };
}

function rollCompanion(rand: () => number): RollResult {
  const band = pickWeighted(COMPANION_RARITY, rand);
  let pool = poolCompanions([band.rarity]);
  if (pool.length === 0) pool = COMPANION_LIST.map((c) => c.id);
  const defId = pool[Math.floor(rand() * pool.length)];
  const def = COMPANIONS[defId];
  ownedCompanions.push(createInstance(defId, 1));
  return {
    ok: true,
    kind: 'companion',
    defId,
    name: def.name,
    rarity: def.rarity,
    duplicate: false,
    message: `Obtained companion ${def.rarity} ${def.name}!`,
  };
}

export function rollPact(pactId: PactId): RollResult | RollFail {
  const pact = PACTS[pactId];
  if (!pact) return { ok: false, error: 'Unknown pact' };
  if (!canAfford(pact)) {
    if (progress.energy < pact.energy) return { ok: false, error: `Need ${pact.energy} Energy (have ${progress.energy})` };
    return { ok: false, error: `Need ${pact.coins} Coins (have ${progress.coins})` };
  }
  spend(pact);
  const rand = rng();
  let result: RollResult;
  if (pact.kind === 'adventurer') {
    result = rollCharacter(rand);
  } else if (pact.kind === 'companion') {
    result = rollCompanion(rand);
  } else {
    // Fellowship: 70% companion-ish / lower adventurers, 30% character
    result = rand() < 0.35 ? rollCharacter(rand) : rollCompanion(rand);
  }
  saveToLocalStorage();
  return result;
}

/** Debug / QA helper */
export function addEnergy(n = 1): void {
  progress.energy += n;
  saveToLocalStorage();
}
