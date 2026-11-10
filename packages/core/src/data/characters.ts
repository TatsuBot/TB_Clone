/**
 * Adventurer / character data — first batch from Terra Battle wiki.
 * Names and mechanical numbers kept as internal reference labels (reskin before release).
 * Stats are Lv1 / Lv90 bounds per job where the wiki provided them.
 */

export type WeaponType = 'Sword' | 'Spear' | 'Bow' | 'Staff';
export type ElementType =
  | '—'
  | 'Fire'
  | 'Ice'
  | 'Lightning'
  | 'Darkness'
  | 'Healing'
  | 'Remedy'
  | 'Photon'
  | 'Graviton';
export type CharacterRarity = 'C' | 'B' | 'A' | 'S' | 'SS' | 'Z';

export interface SkillUnlock {
  /** Job level at which this skill unlocks */
  level: number;
  id: string;
  name: string;
  description: string;
  trigger: 'pincer' | 'chain' | 'equip' | 'counter';
  target?: string;
  frequency?: number;
  power?: number;
}

export interface JobDef {
  jobIndex: 1 | 2 | 3;
  title: string;
  weapon: WeaponType;
  element: ElementType;
  /** Stats at job level 1 */
  statsMin: { hp: number; atk: number; def: number; matk: number; mdef: number };
  /** Stats at job level 90 (wiki max) */
  statsMax: { hp: number; atk: number; def: number; matk: number; mdef: number };
  skills: SkillUnlock[];
  /** Cost to unlock this job (job 1 is free / starter) */
  unlockCost?: { coins: number; items: { id: string; qty: number }[] };
}

export interface CharacterDef {
  id: string;
  name: string;
  rarity: CharacterRarity;
  species: string;
  gender?: string;
  jobs: JobDef[];
  sources: string[];
  description?: string;
}

/** Linear interpolate character stats the same way companions do. */
export function charStatsAtLevel(
  job: JobDef,
  level: number,
  maxLevel = 90
): { hp: number; atk: number; def: number; matk: number; mdef: number } {
  const lv = Math.max(1, Math.min(level, maxLevel));
  const t = maxLevel <= 1 ? 1 : (lv - 1) / (maxLevel - 1);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return {
    hp: lerp(job.statsMin.hp, job.statsMax.hp),
    atk: lerp(job.statsMin.atk, job.statsMax.atk),
    def: lerp(job.statsMin.def, job.statsMax.def),
    matk: lerp(job.statsMin.matk, job.statsMax.matk),
    mdef: lerp(job.statsMin.mdef, job.statsMax.mdef),
  };
}

export function skillsUnlocked(job: JobDef, jobLevel: number): SkillUnlock[] {
  return job.skills.filter((s) => jobLevel >= s.level);
}

// ---------------------------------------------------------------------------
// Seed roster (~20 adventurers / generics from wiki)
// ---------------------------------------------------------------------------

export const CHARACTERS: Record<string, CharacterDef> = {
  // --- Starters ---
  bahl: {
    id: 'bahl',
    name: 'Bahl',
    rarity: 'B',
    species: 'Human',
    gender: 'Female',
    sources: ['Starter', 'Pact of Truth'],
    description: 'A swordswoman who lost her family young and fights with wild abandon.',
    jobs: [
      {
        jobIndex: 1,
        title: 'Dark Duelist',
        weapon: 'Sword',
        element: '—',
        statsMin: { hp: 321, atk: 31, def: 26, matk: 13, mdef: 15 },
        statsMax: { hp: 2957, atk: 284, def: 238, matk: 119, mdef: 138 },
        skills: [
          { level: 1, id: 'counter', name: 'Counterattack', description: 'x1.5 weapon damage', trigger: 'counter', frequency: 30 },
          { level: 15, id: 'atk_up', name: 'Attack +10%', description: 'ATK +10% for 2 turns', trigger: 'chain', target: 'self', frequency: 30 },
          { level: 35, id: 'gigasword', name: 'Gigasword', description: 'x2 sword damage', trigger: 'pincer', frequency: 40, power: 2 },
          { level: 65, id: 'counter2', name: 'Counterattack', description: 'x2 weapon damage', trigger: 'counter', frequency: 30 },
        ],
      },
      {
        jobIndex: 2,
        title: 'Dark Warrior',
        weapon: 'Sword',
        element: '—',
        statsMin: { hp: 385, atk: 33, def: 31, matk: 16, mdef: 18 },
        statsMax: { hp: 3546, atk: 302, def: 283, matk: 146, mdef: 165 },
        skills: [
          { level: 1, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', target: 'self', frequency: 30 },
          { level: 15, id: 'megasword', name: 'Megasword', description: 'x1 sword damage', trigger: 'pincer', frequency: 50, power: 1 },
          { level: 35, id: 'hp_up', name: 'HP +10%', description: 'Passive HP +10%', trigger: 'equip' },
          { level: 65, id: 'phys_x15', name: 'Physical Damage x1.5', description: 'Physical damage x1.5 for 2 turns', trigger: 'chain', target: 'self', frequency: 30 },
        ],
        unlockCost: { coins: 0, items: [{ id: 'terra_fragment', qty: 1 }] },
      },
      {
        jobIndex: 3,
        title: 'Dark Hero',
        weapon: 'Sword',
        element: '—',
        statsMin: { hp: 442, atk: 39, def: 32, matk: 19, mdef: 21 },
        statsMax: { hp: 4072, atk: 356, def: 293, matk: 174, mdef: 193 },
        skills: [
          { level: 1, id: 'atk_eq', name: 'Attack +10%', description: 'Passive ATK +10%', trigger: 'equip' },
          { level: 15, id: 'def_eq', name: 'Defense +10%', description: 'Passive DEF +10%', trigger: 'equip' },
          { level: 35, id: 'counter', name: 'Counterattack', description: 'x1.5 weapon damage', trigger: 'counter', frequency: 35 },
          { level: 65, id: 'terasword', name: 'Terasword', description: 'x3 sword damage', trigger: 'pincer', frequency: 30, power: 3 },
        ],
        unlockCost: {
          coins: 16000,
          items: [
            { id: 'wisdom_flower', qty: 15 },
            { id: 'terra_swordsteel', qty: 15 },
            { id: 'spirit_particle', qty: 3 },
          ],
        },
      },
    ],
  },

  grace: {
    id: 'grace',
    name: 'Grace',
    rarity: 'B',
    species: 'Human',
    gender: 'Female',
    sources: ['Starter', 'Pact of Truth'],
    description: 'An archer with a calm aim and a quiet resolve.',
    jobs: [
      {
        jobIndex: 1,
        title: 'Archer',
        weapon: 'Bow',
        element: '—',
        statsMin: { hp: 318, atk: 31, def: 24, matk: 15, mdef: 17 },
        statsMax: { hp: 2942, atk: 284, def: 220, matk: 137, mdef: 155 },
        skills: [
          { level: 1, id: 'megabow', name: 'Megabow', description: 'x1 bow damage', trigger: 'pincer', frequency: 50, power: 1 },
          { level: 15, id: 'atk_up', name: 'Attack +10%', description: 'ATK +10% for 2 turns', trigger: 'chain', target: 'self', frequency: 30 },
          { level: 35, id: 'def_down_beast', name: 'Defense -10%', description: 'DEF -10% on Wild Beast (2 turns)', trigger: 'chain', frequency: 30 },
          { level: 65, id: 'poison_arrows', name: 'Poison Arrows', description: 'x1 bow + poison', trigger: 'chain', frequency: 30 },
        ],
      },
      {
        jobIndex: 2,
        title: 'Markswoman',
        weapon: 'Bow',
        element: '—',
        statsMin: { hp: 379, atk: 34, def: 27, matk: 18, mdef: 20 },
        statsMax: { hp: 3506, atk: 311, def: 247, matk: 165, mdef: 183 },
        skills: [
          { level: 1, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', target: 'self', frequency: 30 },
          { level: 15, id: 'megabow_area', name: 'Megabow', description: 'x1 bow damage (area 1)', trigger: 'chain', frequency: 30 },
          { level: 35, id: 'hp_up', name: 'HP +10%', description: 'Passive HP +10%', trigger: 'equip' },
          { level: 65, id: 'terabow', name: 'Terabow', description: 'x3 bow damage', trigger: 'pincer', frequency: 30, power: 3 },
        ],
        unlockCost: { coins: 0, items: [{ id: 'terra_fragment', qty: 1 }] },
      },
      {
        jobIndex: 3,
        title: 'Ranger',
        weapon: 'Bow',
        element: '—',
        statsMin: { hp: 437, atk: 37, def: 30, matk: 21, mdef: 23 },
        statsMax: { hp: 4043, atk: 339, def: 275, matk: 192, mdef: 210 },
        skills: [
          { level: 1, id: 'atk_eq', name: 'Attack +10%', description: 'Passive ATK +10%', trigger: 'equip' },
          { level: 15, id: 'megabow', name: 'Megabow', description: 'x1 bow damage', trigger: 'pincer', frequency: 50 },
          { level: 35, id: 'def_eq', name: 'Defense +10%', description: 'Passive DEF +10%', trigger: 'equip' },
          { level: 65, id: 'gigabow', name: 'Gigabow', description: 'x2 bow damage', trigger: 'pincer', frequency: 40, power: 2 },
        ],
        unlockCost: {
          coins: 16000,
          items: [
            { id: 'wisdom_flower', qty: 15 },
            { id: 'terra_bowstring', qty: 15 },
            { id: 'spirit_particle', qty: 3 },
          ],
        },
      },
    ],
  },

  kuscah: {
    id: 'kuscah',
    name: 'Kuscah',
    rarity: 'B',
    species: 'Human',
    gender: 'Male',
    sources: ['Limited Starter', 'Pact of Truth'],
    description: 'A cheerful old acolyte still sharp in a fight.',
    jobs: [
      {
        jobIndex: 1,
        title: 'Acolyte',
        weapon: 'Staff',
        element: 'Healing',
        statsMin: { hp: 293, atk: 12, def: 17, matk: 29, mdef: 26 },
        statsMax: { hp: 2734, atk: 110, def: 157, matk: 266, mdef: 238 },
        skills: [
          { level: 1, id: 'mega_heal', name: 'Mega Heal', description: 'Heal power 2 (cap 700)', trigger: 'chain', frequency: 100, power: 2 },
          { level: 15, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', target: 'self', frequency: 30 },
          { level: 35, id: 'mega_heal_self', name: 'Mega Heal', description: 'Self heal power 2', trigger: 'chain', frequency: 30 },
          { level: 65, id: 'restorative_counter', name: 'Restorative Counter', description: 'Counter heal power 2', trigger: 'counter', frequency: 50 },
        ],
      },
      {
        jobIndex: 2,
        title: 'Priest',
        weapon: 'Staff',
        element: 'Healing',
        statsMin: { hp: 353, atk: 15, def: 20, matk: 32, mdef: 29 },
        statsMax: { hp: 3294, atk: 137, def: 185, matk: 293, mdef: 266 },
        skills: [
          { level: 1, id: 'def_eq', name: 'Defense +10%', description: 'Passive DEF +10%', trigger: 'equip' },
          { level: 15, id: 'heal_all', name: 'Mega Heal', description: 'Heal all allies', trigger: 'chain', frequency: 30 },
          { level: 35, id: 'sleep_ward', name: 'Anti-Sleep', description: 'Sleep immunity', trigger: 'equip' },
          { level: 65, id: 'revive', name: 'Resurrection', description: 'Revive ally next turn at 1 HP', trigger: 'equip' },
        ],
        unlockCost: {
          coins: 8000,
          items: [
            { id: 'serenity_shoot', qty: 15 },
            { id: 'terra_staffwood', qty: 15 },
            { id: 'rainbow_tears', qty: 3 },
          ],
        },
      },
      {
        jobIndex: 3,
        title: 'Healer',
        weapon: 'Staff',
        element: 'Healing',
        statsMin: { hp: 417, atk: 18, def: 23, matk: 35, mdef: 32 },
        statsMax: { hp: 3891, atk: 165, def: 212, matk: 321, mdef: 293 },
        skills: [
          { level: 1, id: 'hp_up', name: 'HP +10%', description: 'Passive HP +10%', trigger: 'equip' },
          { level: 15, id: 'giga_heal', name: 'Giga Heal', description: 'Heal power 3 (cap 1300)', trigger: 'chain', frequency: 40, power: 3 },
          { level: 35, id: 'matk_up', name: 'Magic Attack +10%', description: 'Passive MATK +10%', trigger: 'equip' },
          { level: 65, id: 'party_heal', name: 'Party Heal', description: 'Heal all allies power 2', trigger: 'chain', frequency: 35 },
        ],
        unlockCost: {
          coins: 16000,
          items: [
            { id: 'white_ring', qty: 15 },
            { id: 'wisdom_flower', qty: 15 },
            { id: 'spirit_particle', qty: 3 },
          ],
        },
      },
    ],
  },

  samatha: {
    id: 'samatha',
    name: 'Samatha',
    rarity: 'SS',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    description: 'A tomboyish spearmaiden with a strong sense of justice.',
    jobs: [
      {
        jobIndex: 1,
        title: 'Spearmaiden',
        weapon: 'Spear',
        element: 'Lightning',
        statsMin: { hp: 456, atk: 30, def: 26, matk: 38, mdef: 33 },
        statsMax: { hp: 4183, atk: 275, def: 238, matk: 348, mdef: 302 },
        skills: [
          { level: 1, id: 'megaspear', name: 'Megaspear', description: 'x1 spear damage', trigger: 'pincer', frequency: 50 },
          { level: 20, id: 'thunder', name: 'Thunder', description: 'Lightning damage', trigger: 'pincer', frequency: 40 },
          { level: 40, id: 'atk_up', name: 'Attack +10%', description: 'ATK +10% for 2 turns', trigger: 'chain', frequency: 30 },
          { level: 60, id: 'gigaspear', name: 'Gigaspear', description: 'x2 spear damage', trigger: 'pincer', frequency: 35, power: 2 },
        ],
      },
      {
        jobIndex: 2,
        title: 'Lancer',
        weapon: 'Spear',
        element: '—',
        statsMin: { hp: 595, atk: 43, def: 35, matk: 20, mdef: 25 },
        statsMax: { hp: 5450, atk: 390, def: 320, matk: 180, mdef: 230 },
        skills: [
          { level: 1, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', frequency: 30 },
          { level: 20, id: 'megaspear', name: 'Megaspear', description: 'x1 spear damage', trigger: 'pincer', frequency: 50 },
          { level: 40, id: 'hp_up', name: 'HP +10%', description: 'Passive HP +10%', trigger: 'equip' },
          { level: 60, id: 'teraspear', name: 'Teraspear', description: 'x3 spear damage', trigger: 'pincer', frequency: 30, power: 3 },
        ],
      },
      {
        jobIndex: 3,
        title: 'Thunder Lance',
        weapon: 'Spear',
        element: 'Lightning',
        statsMin: { hp: 575, atk: 35, def: 34, matk: 43, mdef: 38 },
        statsMax: { hp: 5280, atk: 320, def: 310, matk: 395, mdef: 350 },
        skills: [
          { level: 1, id: 'matk_eq', name: 'Magic Attack +10%', description: 'Passive MATK +10%', trigger: 'equip' },
          { level: 20, id: 'thunder_row', name: 'Thunder Row', description: 'Lightning damage on a row', trigger: 'pincer', frequency: 35 },
          { level: 40, id: 'def_eq', name: 'Defense +10%', description: 'Passive DEF +10%', trigger: 'equip' },
          { level: 60, id: 'giga_thunder', name: 'Giga Thunder', description: 'x2 lightning damage', trigger: 'pincer', frequency: 30, power: 2 },
        ],
        unlockCost: {
          coins: 20000,
          items: [
            { id: 'wisdom_flower', qty: 15 },
            { id: 'vajra', qty: 3 },
            { id: 'dark_matter', qty: 3 },
          ],
        },
      },
    ],
  },

  // --- Tutorial / generic recruits ---
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    rarity: 'C',
    species: 'Human',
    sources: ['Tutorial'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Warrior',
        weapon: 'Sword',
        element: '—',
        statsMin: { hp: 315, atk: 30, def: 23, matk: 12, mdef: 14 },
        statsMax: { hp: 2800, atk: 270, def: 210, matk: 110, mdef: 130 },
        skills: [
          { level: 1, id: 'megasword', name: 'Megasword', description: 'x1 sword damage', trigger: 'pincer', frequency: 50 },
          { level: 20, id: 'atk_up', name: 'Attack +10%', description: 'ATK +10% for 2 turns', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  knight: {
    id: 'knight',
    name: 'Knight',
    rarity: 'C',
    species: 'Human',
    sources: ['Tutorial', 'Tavern'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Knight',
        weapon: 'Spear',
        element: '—',
        statsMin: { hp: 317, atk: 30, def: 23, matk: 12, mdef: 14 },
        statsMax: { hp: 2820, atk: 268, def: 220, matk: 110, mdef: 130 },
        skills: [
          { level: 1, id: 'megaspear', name: 'Megaspear', description: 'x1 spear damage', trigger: 'pincer', frequency: 50 },
          { level: 20, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  archer: {
    id: 'archer',
    name: 'Archer',
    rarity: 'C',
    species: 'Human',
    sources: ['Tutorial'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Archer',
        weapon: 'Bow',
        element: '—',
        statsMin: { hp: 316, atk: 30, def: 23, matk: 12, mdef: 14 },
        statsMax: { hp: 2810, atk: 270, def: 210, matk: 115, mdef: 132 },
        skills: [
          { level: 1, id: 'megabow', name: 'Megabow', description: 'x1 bow damage', trigger: 'pincer', frequency: 50 },
          { level: 20, id: 'atk_up', name: 'Attack +10%', description: 'ATK +10% for 2 turns', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  mage: {
    id: 'mage',
    name: 'Mage',
    rarity: 'C',
    species: 'Human',
    sources: ['Tutorial'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Mage',
        weapon: 'Staff',
        element: 'Fire',
        statsMin: { hp: 249, atk: 12, def: 14, matk: 27, mdef: 25 },
        statsMax: { hp: 2300, atk: 110, def: 130, matk: 250, mdef: 230 },
        skills: [
          { level: 1, id: 'fire', name: 'Fire', description: 'Fire damage', trigger: 'pincer', frequency: 50 },
          { level: 20, id: 'matk_up', name: 'Magic Attack +10%', description: 'MATK +10% for 2 turns', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  healer: {
    id: 'healer',
    name: 'Healer',
    rarity: 'C',
    species: 'Human',
    sources: ['Starter'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Healer',
        weapon: 'Staff',
        element: 'Healing',
        statsMin: { hp: 245, atk: 12, def: 14, matk: 24, mdef: 25 },
        statsMax: { hp: 2280, atk: 105, def: 128, matk: 240, mdef: 235 },
        skills: [
          { level: 1, id: 'mega_heal', name: 'Mega Heal', description: 'Heal power 2 (cap 700)', trigger: 'chain', frequency: 100, power: 2 },
          { level: 20, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  // --- Additional early roster (wiki stats page names / common recruits) ---
  ellvern: {
    id: 'ellvern',
    name: 'Ellvern',
    rarity: 'S',
    species: 'Human',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Remedist',
        weapon: 'Staff',
        element: 'Remedy',
        statsMin: { hp: 348, atk: 21, def: 21, matk: 36, mdef: 29 },
        statsMax: { hp: 3200, atk: 190, def: 190, matk: 330, mdef: 270 },
        skills: [
          { level: 1, id: 'remedy', name: 'Remedy', description: 'Clear status ailments', trigger: 'chain', frequency: 40 },
          { level: 20, id: 'mega_heal', name: 'Mega Heal', description: 'Heal power 2', trigger: 'chain', frequency: 50 },
        ],
      },
    ],
  },

  sorman: {
    id: 'sorman',
    name: 'Sorman',
    rarity: 'B',
    species: 'Human',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Healer',
        weapon: 'Staff',
        element: 'Healing',
        statsMin: { hp: 300, atk: 14, def: 18, matk: 28, mdef: 26 },
        statsMax: { hp: 2750, atk: 125, def: 165, matk: 255, mdef: 240 },
        skills: [
          { level: 1, id: 'mega_heal', name: 'Mega Heal', description: 'Heal power 2', trigger: 'chain', frequency: 100 },
        ],
      },
    ],
  },

  // Placeholder SS/S names from common early pulls (stats approximate from class bands)
  amina: {
    id: 'amina',
    name: 'Amina',
    rarity: 'SS',
    species: 'Human',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Mystic',
        weapon: 'Staff',
        element: 'Ice',
        statsMin: { hp: 420, atk: 22, def: 28, matk: 42, mdef: 36 },
        statsMax: { hp: 3900, atk: 200, def: 260, matk: 380, mdef: 330 },
        skills: [
          { level: 1, id: 'ice', name: 'Ice', description: 'Ice damage', trigger: 'pincer', frequency: 50 },
          { level: 30, id: 'blizzard', name: 'Blizzard', description: 'Area ice damage', trigger: 'chain', frequency: 35 },
        ],
      },
    ],
  },

  palpa: {
    id: 'palpa',
    name: 'Palpa',
    rarity: 'S',
    species: 'Human',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Cleric',
        weapon: 'Staff',
        element: 'Healing',
        statsMin: { hp: 360, atk: 18, def: 24, matk: 34, mdef: 32 },
        statsMax: { hp: 3350, atk: 165, def: 220, matk: 310, mdef: 295 },
        skills: [
          { level: 1, id: 'mega_heal', name: 'Mega Heal', description: 'Heal power 2', trigger: 'chain', frequency: 80 },
          { level: 25, id: 'giga_heal', name: 'Giga Heal', description: 'Heal power 3', trigger: 'chain', frequency: 40 },
        ],
      },
    ],
  },

  ba_gunar: {
    id: 'ba_gunar',
    name: "Ba'gunar",
    rarity: 'S',
    species: 'Beastfolk',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Dark Mage',
        weapon: 'Staff',
        element: 'Darkness',
        statsMin: { hp: 340, atk: 20, def: 22, matk: 38, mdef: 30 },
        statsMax: { hp: 3150, atk: 180, def: 200, matk: 350, mdef: 280 },
        skills: [
          { level: 1, id: 'shadow', name: 'Shadow', description: 'Darkness damage', trigger: 'pincer', frequency: 50 },
        ],
      },
    ],
  },

  gigojago: {
    id: 'gigojago',
    name: 'Gigojago',
    rarity: 'S',
    species: 'Lizardfolk',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Fire Mage',
        weapon: 'Staff',
        element: 'Fire',
        statsMin: { hp: 335, atk: 19, def: 21, matk: 37, mdef: 29 },
        statsMax: { hp: 3100, atk: 175, def: 195, matk: 345, mdef: 270 },
        skills: [
          { level: 1, id: 'fire', name: 'Fire', description: 'Fire damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'inferno', name: 'Inferno', description: 'Area fire damage', trigger: 'chain', frequency: 35 },
        ],
      },
    ],
  },

  sh_berdan: {
    id: 'sh_berdan',
    name: "Sh'berdan",
    rarity: 'S',
    species: 'Beastfolk',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Spear Guard',
        weapon: 'Spear',
        element: '—',
        statsMin: { hp: 400, atk: 34, def: 30, matk: 16, mdef: 20 },
        statsMax: { hp: 3700, atk: 310, def: 280, matk: 145, mdef: 185 },
        skills: [
          { level: 1, id: 'megaspear', name: 'Megaspear', description: 'x1 spear damage', trigger: 'pincer', frequency: 50 },
          { level: 20, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  ma_curi: {
    id: 'ma_curi',
    name: "Ma'curi",
    rarity: 'S',
    species: 'Beastfolk',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Bow Hunter',
        weapon: 'Bow',
        element: '—',
        statsMin: { hp: 355, atk: 36, def: 24, matk: 18, mdef: 20 },
        statsMax: { hp: 3280, atk: 330, def: 220, matk: 165, mdef: 185 },
        skills: [
          { level: 1, id: 'megabow', name: 'Megabow', description: 'x1 bow damage', trigger: 'pincer', frequency: 50 },
        ],
      },
    ],
  },

  // Lizardfolk / Beastfolk generics from stats page
  lizard_warrior: {
    id: 'lizard_warrior',
    name: 'Lizardfolk Warrior',
    rarity: 'C',
    species: 'Lizardfolk',
    sources: ['Story'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Warrior',
        weapon: 'Sword',
        element: '—',
        statsMin: { hp: 323, atk: 30, def: 23, matk: 12, mdef: 13 },
        statsMax: { hp: 2900, atk: 275, def: 210, matk: 110, mdef: 120 },
        skills: [
          { level: 1, id: 'megasword', name: 'Megasword', description: 'x1 sword damage', trigger: 'pincer', frequency: 50 },
        ],
      },
    ],
  },

  beast_warrior: {
    id: 'beast_warrior',
    name: 'Beastfolk Warrior',
    rarity: 'C',
    species: 'Beastfolk',
    sources: ['Story'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Warrior',
        weapon: 'Sword',
        element: '—',
        statsMin: { hp: 315, atk: 31, def: 23, matk: 12, mdef: 14 },
        statsMax: { hp: 2850, atk: 280, def: 210, matk: 110, mdef: 125 },
        skills: [
          { level: 1, id: 'megasword', name: 'Megasword', description: 'x1 sword damage', trigger: 'pincer', frequency: 50 },
        ],
      },
    ],
  },

  // --- Expanded roster (wiki-inspired mechanical placeholders) ---
  gatz: {
    id: 'gatz',
    name: 'Gatz',
    rarity: 'SS',
    species: 'Human',
    gender: 'Male',
    sources: ['Pact of Truth'],
    description: 'A straightforward fighter with more brawn than tact.',
    jobs: [
      {
        jobIndex: 1,
        title: 'Brawler',
        weapon: 'Sword',
        element: '—',
        statsMin: { hp: 480, atk: 40, def: 30, matk: 14, mdef: 18 },
        statsMax: { hp: 4400, atk: 365, def: 275, matk: 130, mdef: 165 },
        skills: [
          { level: 1, id: 'megasword', name: 'Megasword', description: 'x1 sword damage', trigger: 'pincer', frequency: 50 },
          { level: 20, id: 'atk_up', name: 'Attack +10%', description: 'ATK +10% for 2 turns', trigger: 'chain', frequency: 30 },
          { level: 40, id: 'gigasword', name: 'Gigasword', description: 'x2 sword damage', trigger: 'pincer', frequency: 35, power: 2 },
          { level: 60, id: 'counter', name: 'Counterattack', description: 'x1.5 weapon damage', trigger: 'counter', frequency: 35 },
        ],
      },
    ],
  },

  camellia: {
    id: 'camellia',
    name: 'Camellia',
    rarity: 'S',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Fencer',
        weapon: 'Sword',
        element: '—',
        statsMin: { hp: 370, atk: 36, def: 28, matk: 16, mdef: 20 },
        statsMax: { hp: 3400, atk: 330, def: 255, matk: 145, mdef: 185 },
        skills: [
          { level: 1, id: 'megasword', name: 'Megasword', description: 'x1 sword damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  daiana: {
    id: 'daiana',
    name: 'Daiana',
    rarity: 'SS',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Ice Mage',
        weapon: 'Staff',
        element: 'Ice',
        statsMin: { hp: 400, atk: 18, def: 26, matk: 44, mdef: 36 },
        statsMax: { hp: 3700, atk: 165, def: 240, matk: 400, mdef: 330 },
        skills: [
          { level: 1, id: 'ice', name: 'Ice', description: 'Ice damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'blizzard', name: 'Blizzard', description: 'Area ice damage', trigger: 'chain', frequency: 35 },
          { level: 50, id: 'matk_up', name: 'Magic Attack +10%', description: 'MATK +10% for 2 turns', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  lewto: {
    id: 'lewto',
    name: 'Lewto',
    rarity: 'S',
    species: 'Human',
    gender: 'Male',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Frost Acolyte',
        weapon: 'Staff',
        element: 'Ice',
        statsMin: { hp: 350, atk: 16, def: 22, matk: 38, mdef: 32 },
        statsMax: { hp: 3200, atk: 150, def: 200, matk: 350, mdef: 295 },
        skills: [
          { level: 1, id: 'ice', name: 'Ice', description: 'Ice damage', trigger: 'pincer', frequency: 50 },
          { level: 30, id: 'mega_heal', name: 'Mega Heal', description: 'Heal power 2', trigger: 'chain', frequency: 40 },
        ],
      },
    ],
  },

  koko: {
    id: 'koko',
    name: 'Koko',
    rarity: 'S',
    species: 'Beastfolk',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Ice Archer',
        weapon: 'Bow',
        element: 'Ice',
        statsMin: { hp: 360, atk: 34, def: 22, matk: 28, mdef: 24 },
        statsMax: { hp: 3300, atk: 310, def: 200, matk: 260, mdef: 220 },
        skills: [
          { level: 1, id: 'megabow', name: 'Megabow', description: 'x1 bow damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'ice_arrow', name: 'Ice Arrow', description: 'Ice bow damage', trigger: 'pincer', frequency: 40 },
        ],
      },
    ],
  },

  zenzoze: {
    id: 'zenzoze',
    name: 'Zenzoze',
    rarity: 'S',
    species: 'Lizardfolk',
    gender: 'Male',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Thunder Mage',
        weapon: 'Staff',
        element: 'Lightning',
        statsMin: { hp: 345, atk: 18, def: 22, matk: 39, mdef: 30 },
        statsMax: { hp: 3180, atk: 165, def: 200, matk: 360, mdef: 275 },
        skills: [
          { level: 1, id: 'thunder', name: 'Thunder', description: 'Lightning damage', trigger: 'pincer', frequency: 50 },
          { level: 30, id: 'giga_thunder', name: 'Giga Thunder', description: 'x2 lightning damage', trigger: 'pincer', frequency: 35, power: 2 },
        ],
      },
    ],
  },

  puprope: {
    id: 'puprope',
    name: 'Pupropé',
    rarity: 'SS',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Thunder Dancer',
        weapon: 'Spear',
        element: 'Lightning',
        statsMin: { hp: 430, atk: 32, def: 28, matk: 40, mdef: 34 },
        statsMax: { hp: 3950, atk: 295, def: 255, matk: 370, mdef: 310 },
        skills: [
          { level: 1, id: 'megaspear', name: 'Megaspear', description: 'x1 spear damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'thunder', name: 'Thunder', description: 'Lightning damage', trigger: 'pincer', frequency: 40 },
        ],
      },
    ],
  },

  zerro: {
    id: 'zerro',
    name: 'Zerro',
    rarity: 'S',
    species: 'Human',
    gender: 'Male',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Storm Knight',
        weapon: 'Sword',
        element: 'Lightning',
        statsMin: { hp: 390, atk: 35, def: 30, matk: 24, mdef: 26 },
        statsMax: { hp: 3600, atk: 320, def: 275, matk: 220, mdef: 240 },
        skills: [
          { level: 1, id: 'megasword', name: 'Megasword', description: 'x1 sword damage', trigger: 'pincer', frequency: 50 },
          { level: 30, id: 'thunder_blade', name: 'Thunder Blade', description: 'Lightning sword damage', trigger: 'pincer', frequency: 40 },
        ],
      },
    ],
  },

  amerpact: {
    id: 'amerpact',
    name: "A'merpact",
    rarity: 'S',
    species: 'Beastfolk',
    gender: 'Male',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Fire Spearman',
        weapon: 'Spear',
        element: 'Fire',
        statsMin: { hp: 380, atk: 34, def: 28, matk: 22, mdef: 22 },
        statsMax: { hp: 3500, atk: 315, def: 255, matk: 200, mdef: 200 },
        skills: [
          { level: 1, id: 'megaspear', name: 'Megaspear', description: 'x1 spear damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'fire', name: 'Fire', description: 'Fire damage', trigger: 'pincer', frequency: 40 },
        ],
      },
    ],
  },

  pizfer: {
    id: 'pizfer',
    name: "Piz'fer",
    rarity: 'S',
    species: 'Lizardfolk',
    gender: 'Male',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Flame Guard',
        weapon: 'Sword',
        element: 'Fire',
        statsMin: { hp: 400, atk: 33, def: 32, matk: 20, mdef: 24 },
        statsMax: { hp: 3680, atk: 305, def: 295, matk: 185, mdef: 220 },
        skills: [
          { level: 1, id: 'megasword', name: 'Megasword', description: 'x1 sword damage', trigger: 'pincer', frequency: 50 },
          { level: 30, id: 'fire_guard', name: 'Fire Guard', description: 'DEF + fire resist', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  jennish: {
    id: 'jennish',
    name: 'Jennish',
    rarity: 'S',
    species: 'Human',
    gender: 'Male',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Dark Archer',
        weapon: 'Bow',
        element: 'Darkness',
        statsMin: { hp: 355, atk: 36, def: 22, matk: 26, mdef: 24 },
        statsMax: { hp: 3250, atk: 330, def: 200, matk: 240, mdef: 220 },
        skills: [
          { level: 1, id: 'megabow', name: 'Megabow', description: 'x1 bow damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'shadow', name: 'Shadow', description: 'Darkness damage', trigger: 'pincer', frequency: 40 },
        ],
      },
    ],
  },

  pupropu: {
    id: 'pupropu',
    name: 'Pupropu',
    rarity: 'S',
    species: 'Beastfolk',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Shadow Mage',
        weapon: 'Staff',
        element: 'Darkness',
        statsMin: { hp: 340, atk: 17, def: 21, matk: 40, mdef: 32 },
        statsMax: { hp: 3120, atk: 155, def: 190, matk: 370, mdef: 295 },
        skills: [
          { level: 1, id: 'shadow', name: 'Shadow', description: 'Darkness damage', trigger: 'pincer', frequency: 50 },
          { level: 30, id: 'death', name: 'Death', description: 'Chance instant KO', trigger: 'chain', frequency: 15 },
        ],
      },
    ],
  },

  kirue: {
    id: 'kirue',
    name: "Kir'ue",
    rarity: 'SS',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Graviton Mage',
        weapon: 'Staff',
        element: 'Graviton',
        statsMin: { hp: 410, atk: 20, def: 28, matk: 45, mdef: 36 },
        statsMax: { hp: 3780, atk: 180, def: 255, matk: 410, mdef: 330 },
        skills: [
          { level: 1, id: 'graviton', name: 'Graviton', description: 'Graviton damage', trigger: 'pincer', frequency: 50 },
          { level: 30, id: 'crush', name: 'Crush', description: 'Area graviton damage', trigger: 'chain', frequency: 35 },
        ],
      },
    ],
  },

  sayu: {
    id: 'sayu',
    name: 'Sayu',
    rarity: 'S',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Gravity Blade',
        weapon: 'Sword',
        element: 'Graviton',
        statsMin: { hp: 375, atk: 35, def: 26, matk: 28, mdef: 24 },
        statsMax: { hp: 3450, atk: 320, def: 240, matk: 255, mdef: 220 },
        skills: [
          { level: 1, id: 'megasword', name: 'Megasword', description: 'x1 sword damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'graviton', name: 'Graviton', description: 'Graviton damage', trigger: 'pincer', frequency: 40 },
        ],
      },
    ],
  },

  mogha: {
    id: 'mogha',
    name: 'Mogha',
    rarity: 'S',
    species: 'Beastfolk',
    gender: 'Male',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Photon Archer',
        weapon: 'Bow',
        element: 'Photon',
        statsMin: { hp: 350, atk: 35, def: 22, matk: 30, mdef: 26 },
        statsMax: { hp: 3220, atk: 320, def: 200, matk: 275, mdef: 240 },
        skills: [
          { level: 1, id: 'megabow', name: 'Megabow', description: 'x1 bow damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'photon', name: 'Photon', description: 'Photon damage', trigger: 'pincer', frequency: 40 },
        ],
      },
    ],
  },

  violet: {
    id: 'violet',
    name: 'Violet',
    rarity: 'SS',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Photon Mage',
        weapon: 'Staff',
        element: 'Photon',
        statsMin: { hp: 405, atk: 19, def: 27, matk: 44, mdef: 38 },
        statsMax: { hp: 3720, atk: 175, def: 250, matk: 405, mdef: 350 },
        skills: [
          { level: 1, id: 'photon', name: 'Photon', description: 'Photon damage', trigger: 'pincer', frequency: 50 },
          { level: 30, id: 'radiance', name: 'Radiance', description: 'Area photon damage', trigger: 'chain', frequency: 35 },
        ],
      },
    ],
  },

  calista: {
    id: 'calista',
    name: 'Calista',
    rarity: 'S',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Cleric',
        weapon: 'Staff',
        element: 'Healing',
        statsMin: { hp: 365, atk: 16, def: 24, matk: 36, mdef: 34 },
        statsMax: { hp: 3360, atk: 150, def: 220, matk: 330, mdef: 310 },
        skills: [
          { level: 1, id: 'mega_heal', name: 'Mega Heal', description: 'Heal power 2', trigger: 'chain', frequency: 80 },
          { level: 25, id: 'giga_heal', name: 'Giga Heal', description: 'Heal power 3', trigger: 'chain', frequency: 40 },
        ],
      },
    ],
  },

  olber: {
    id: 'olber',
    name: 'Olber',
    rarity: 'SS',
    species: 'Human',
    gender: 'Male',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'High Priest',
        weapon: 'Staff',
        element: 'Healing',
        statsMin: { hp: 420, atk: 18, def: 28, matk: 40, mdef: 38 },
        statsMax: { hp: 3850, atk: 165, def: 255, matk: 370, mdef: 350 },
        skills: [
          { level: 1, id: 'giga_heal', name: 'Giga Heal', description: 'Heal power 3', trigger: 'chain', frequency: 60 },
          { level: 30, id: 'party_heal', name: 'Party Heal', description: 'Heal all allies', trigger: 'chain', frequency: 35 },
          { level: 50, id: 'revive', name: 'Resurrection', description: 'Revive ally', trigger: 'equip' },
        ],
      },
    ],
  },

  haruhikari: {
    id: 'haruhikari',
    name: 'Haruhikari',
    rarity: 'Z',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Fate'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Dawn Blade',
        weapon: 'Sword',
        element: 'Photon',
        statsMin: { hp: 520, atk: 48, def: 36, matk: 32, mdef: 30 },
        statsMax: { hp: 4800, atk: 440, def: 330, matk: 290, mdef: 275 },
        skills: [
          { level: 1, id: 'gigasword', name: 'Gigasword', description: 'x2 sword damage', trigger: 'pincer', frequency: 40, power: 2 },
          { level: 30, id: 'photon', name: 'Photon', description: 'Photon damage', trigger: 'pincer', frequency: 40 },
          { level: 60, id: 'terasword', name: 'Terasword', description: 'x3 sword damage', trigger: 'pincer', frequency: 30, power: 3 },
        ],
      },
    ],
  },

  mizury: {
    id: 'mizury',
    name: 'Mizury',
    rarity: 'Z',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Fate'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Tide Caller',
        weapon: 'Staff',
        element: 'Ice',
        statsMin: { hp: 500, atk: 24, def: 34, matk: 50, mdef: 42 },
        statsMax: { hp: 4600, atk: 220, def: 310, matk: 460, mdef: 385 },
        skills: [
          { level: 1, id: 'blizzard', name: 'Blizzard', description: 'Area ice damage', trigger: 'chain', frequency: 45 },
          { level: 30, id: 'giga_heal', name: 'Giga Heal', description: 'Heal power 3', trigger: 'chain', frequency: 40 },
          { level: 60, id: 'absolute_zero', name: 'Absolute Zero', description: 'x3 ice damage', trigger: 'pincer', frequency: 30, power: 3 },
        ],
      },
    ],
  },

  thirty6ais: {
    id: 'thirty6ais',
    name: '36AIS',
    rarity: 'SS',
    species: 'Machine',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Combat Frame',
        weapon: 'Bow',
        element: '—',
        statsMin: { hp: 440, atk: 38, def: 30, matk: 30, mdef: 28 },
        statsMax: { hp: 4050, atk: 350, def: 275, matk: 275, mdef: 255 },
        skills: [
          { level: 1, id: 'megabow', name: 'Megabow', description: 'x1 bow damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'gigabow', name: 'Gigabow', description: 'x2 bow damage', trigger: 'pincer', frequency: 35, power: 2 },
        ],
      },
    ],
  },

  lucia: {
    id: 'lucia',
    name: 'Lucia',
    rarity: 'SS',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Holy Knight',
        weapon: 'Spear',
        element: 'Photon',
        statsMin: { hp: 460, atk: 36, def: 34, matk: 28, mdef: 32 },
        statsMax: { hp: 4200, atk: 330, def: 310, matk: 255, mdef: 295 },
        skills: [
          { level: 1, id: 'megaspear', name: 'Megaspear', description: 'x1 spear damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'photon', name: 'Photon', description: 'Photon damage', trigger: 'pincer', frequency: 40 },
          { level: 50, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  eileen: {
    id: 'eileen',
    name: 'Eileen',
    rarity: 'S',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Scout',
        weapon: 'Bow',
        element: '—',
        statsMin: { hp: 348, atk: 35, def: 22, matk: 18, mdef: 20 },
        statsMax: { hp: 3200, atk: 320, def: 200, matk: 165, mdef: 185 },
        skills: [
          { level: 1, id: 'megabow', name: 'Megabow', description: 'x1 bow damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'poison_arrows', name: 'Poison Arrows', description: 'Bow + poison', trigger: 'chain', frequency: 30 },
        ],
      },
    ],
  },

  clara: {
    id: 'clara',
    name: 'Clara',
    rarity: 'S',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Medic',
        weapon: 'Staff',
        element: 'Healing',
        statsMin: { hp: 355, atk: 15, def: 23, matk: 35, mdef: 33 },
        statsMax: { hp: 3260, atk: 140, def: 210, matk: 320, mdef: 300 },
        skills: [
          { level: 1, id: 'mega_heal', name: 'Mega Heal', description: 'Heal power 2', trigger: 'chain', frequency: 90 },
          { level: 30, id: 'remedy', name: 'Remedy', description: 'Clear status', trigger: 'chain', frequency: 40 },
        ],
      },
    ],
  },

  maldor: {
    id: 'maldor',
    name: 'Maldor',
    rarity: 'S',
    species: 'Human',
    gender: 'Male',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Heavy Knight',
        weapon: 'Spear',
        element: '—',
        statsMin: { hp: 430, atk: 32, def: 36, matk: 14, mdef: 22 },
        statsMax: { hp: 3950, atk: 295, def: 330, matk: 130, mdef: 200 },
        skills: [
          { level: 1, id: 'megaspear', name: 'Megaspear', description: 'x1 spear damage', trigger: 'pincer', frequency: 50 },
          { level: 25, id: 'def_up', name: 'Defense +10%', description: 'DEF +10% for 2 turns', trigger: 'chain', frequency: 35 },
          { level: 50, id: 'hp_up', name: 'HP +10%', description: 'Passive HP +10%', trigger: 'equip' },
        ],
      },
    ],
  },

  sheena: {
    id: 'sheena',
    name: 'Sheena',
    rarity: 'SS',
    species: 'Human',
    gender: 'Female',
    sources: ['Pact of Truth'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Sword Saint',
        weapon: 'Sword',
        element: '—',
        statsMin: { hp: 450, atk: 42, def: 30, matk: 20, mdef: 24 },
        statsMax: { hp: 4120, atk: 385, def: 275, matk: 185, mdef: 220 },
        skills: [
          { level: 1, id: 'gigasword', name: 'Gigasword', description: 'x2 sword damage', trigger: 'pincer', frequency: 40, power: 2 },
          { level: 30, id: 'counter', name: 'Counterattack', description: 'x1.5 weapon damage', trigger: 'counter', frequency: 35 },
          { level: 55, id: 'terasword', name: 'Terasword', description: 'x3 sword damage', trigger: 'pincer', frequency: 30, power: 3 },
        ],
      },
    ],
  },

  leviathan: {
    id: 'leviathan',
    name: 'Leviathan',
    rarity: 'Z',
    species: 'Monster',
    sources: ['Eidolon'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Sea Sovereign',
        weapon: 'Staff',
        element: 'Ice',
        statsMin: { hp: 600, atk: 28, def: 40, matk: 52, mdef: 44 },
        statsMax: { hp: 5500, atk: 255, def: 365, matk: 475, mdef: 400 },
        skills: [
          { level: 1, id: 'blizzard', name: 'Blizzard', description: 'Area ice damage', trigger: 'chain', frequency: 50 },
          { level: 40, id: 'absolute_zero', name: 'Absolute Zero', description: 'x3 ice damage', trigger: 'pincer', frequency: 30, power: 3 },
        ],
      },
    ],
  },

  bahamut: {
    id: 'bahamut',
    name: 'Bahamut',
    rarity: 'Z',
    species: 'Monster',
    sources: ['Eidolon'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Dragon King',
        weapon: 'Sword',
        element: 'Fire',
        statsMin: { hp: 620, atk: 50, def: 38, matk: 40, mdef: 36 },
        statsMax: { hp: 5700, atk: 455, def: 350, matk: 365, mdef: 330 },
        skills: [
          { level: 1, id: 'gigasword', name: 'Gigasword', description: 'x2 sword damage', trigger: 'pincer', frequency: 45, power: 2 },
          { level: 40, id: 'inferno', name: 'Inferno', description: 'Area fire damage', trigger: 'chain', frequency: 35 },
        ],
      },
    ],
  },

  odin: {
    id: 'odin',
    name: 'Odin',
    rarity: 'Z',
    species: 'Monster',
    sources: ['Eidolon'],
    jobs: [
      {
        jobIndex: 1,
        title: 'Allfather',
        weapon: 'Spear',
        element: 'Lightning',
        statsMin: { hp: 580, atk: 48, def: 36, matk: 36, mdef: 34 },
        statsMax: { hp: 5350, atk: 440, def: 330, matk: 330, mdef: 310 },
        skills: [
          { level: 1, id: 'gigaspear', name: 'Gigaspear', description: 'x2 spear damage', trigger: 'pincer', frequency: 40, power: 2 },
          { level: 40, id: 'giga_thunder', name: 'Giga Thunder', description: 'x2 lightning damage', trigger: 'pincer', frequency: 35, power: 2 },
        ],
      },
    ],
  },

};

export const CHARACTER_LIST = Object.values(CHARACTERS);

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS[id];
}

/** Owned character instance (progress). */
export interface CharacterInstance {
  uid: string;
  defId: string;
  /** Active job index (1–3) */
  activeJob: 1 | 2 | 3;
  /** Level per job */
  jobLevels: [number, number, number];
  skillBoost: number;
  luck: number;
  /** Equipped companion instance uid, if any */
  companionUid?: string;
}

export function createCharacterInstance(
  defId: string,
  opts?: { job?: 1 | 2 | 3; levels?: [number, number, number] }
): CharacterInstance {
  return {
    uid: `${defId}_${Math.random().toString(36).slice(2, 9)}`,
    defId,
    activeJob: opts?.job ?? 1,
    jobLevels: opts?.levels ?? [1, 1, 1],
    skillBoost: 0,
    luck: 0,
  };
}
