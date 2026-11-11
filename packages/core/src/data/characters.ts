import type { DamageComponent, ElementType, WeaponType } from "../types";

/**
 * Adventurer data from the Terra Battle wiki character module.
 * Names and mechanical numbers kept as internal reference labels (reskin before release).
 * Stat and experience curves use the wiki's level 99 formula bounds; playable levels cap at 90.
 */

export type CharacterRarity = "C" | "B" | "A" | "S" | "SS" | "Z";

export interface SkillUnlock {
  /** Job level at which this skill unlocks */
  level: number;
  id: string;
  name: string;
  description: string;
  trigger: "pincer" | "chain" | "equip" | "counter" | "tap";
  target?: string;
  frequency?: number;
  power?: number;
  damageComponents?: DamageComponent[];
}

export interface JobDef {
  jobIndex: 1 | 2 | 3;
  title: string;
  weapon: WeaponType;
  element: ElementType;
  /** Stats at job level 1 */
  statsMin: {
    hp: number;
    atk: number;
    def: number;
    matk: number;
    mdef: number;
  };
  /** Stat ceiling used by the wiki's level 99 growth formula. */
  statsMax: {
    hp: number;
    atk: number;
    def: number;
    matk: number;
    mdef: number;
  };
  statCoefficients: {
    hp: number;
    atk: number;
    def: number;
    matk: number;
    mdef: number;
  };
  /** Cumulative experience at the formula ceiling (level 99). */
  expMax: number;
  expCoeff: number;
  skills: SkillUnlock[];
  /** Cost to unlock this job (job 1 is free / starter) */
  unlockCost?: { coins: number; items: { id: string; qty: number }[] };
}

export type CharacterVerification = "Y" | "N" | null;

export interface CharacterDef {
  id: string;
  name: string;
  rarity: CharacterRarity;
  verified: CharacterVerification;
  species: string;
  gender?: string;
  jobs: JobDef[];
  sources: string[];
  description?: string;
}

type CuratedJobDef = Omit<JobDef, "statCoefficients" | "expMax" | "expCoeff"> &
  Partial<Pick<JobDef, "statCoefficients" | "expMax" | "expCoeff">>;
type CuratedCharacterDef = Omit<CharacterDef, "jobs"> & { jobs: CuratedJobDef[] };

/** Calculate character stats with the wiki's per-stat growth coefficients. */
export function charStatsAtLevel(
  job: JobDef,
  level: number,
  maxLevel = 90,
): { hp: number; atk: number; def: number; matk: number; mdef: number } {
  const lv = Math.max(1, Math.min(level, maxLevel));
  const t = (lv - 1) / 98;
  const growth = (stat: keyof JobDef["statsMin"]) =>
    Math.floor(
      job.statsMin[stat] +
        (job.statsMax[stat] - job.statsMin[stat]) *
          t ** job.statCoefficients[stat],
    );
  return {
    hp: growth("hp"),
    atk: growth("atk"),
    def: growth("def"),
    matk: growth("matk"),
    mdef: growth("mdef"),
  };
}

/** Experience accumulated by the given level using the wiki's level 99 curve. */
export function characterXpAtLevel(job: JobDef, level: number): number {
  const lv = Math.max(1, Math.min(99, Math.floor(level)));
  const t = (lv - 1) / 98;
  return Math.floor(job.expMax * t ** job.expCoeff);
}

/** XP needed to advance from the given level, based on this job's wiki curve. */
export function characterXpToNextLevel(job: JobDef, level: number): number {
  const currentLevel = Math.max(1, Math.min(90, Math.floor(level)));
  if (currentLevel >= 90) return 0;
  return characterXpAtLevel(job, currentLevel + 1) - characterXpAtLevel(job, currentLevel);
}

export function skillsUnlocked(job: JobDef, jobLevel: number): SkillUnlock[] {
  return job.skills.filter((s) => jobLevel >= s.level);
}

// ---------------------------------------------------------------------------
// Seed roster of named adventurers from the wiki
// ---------------------------------------------------------------------------

const CURATED_CHARACTERS: Record<string, CuratedCharacterDef> = {
  // --- Starters ---
  bahl: {
    id: "bahl",
    name: "Bahl",
    rarity: "B",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Starter", "Pact of Truth"],
    description:
      "A swordswoman who lost her family young and fights with wild abandon.",
    jobs: [
      {
        jobIndex: 1,
        title: "Dark Duelist",
        weapon: "Sword",
        element: "—",
        statsMin: { hp: 321, atk: 31, def: 26, matk: 13, mdef: 15 },
        statsMax: { hp: 2957, atk: 284, def: 238, matk: 119, mdef: 138 },
        skills: [
          {
            level: 1,
            id: "counter",
            name: "Counterattack",
            description: "x1.5 weapon damage",
            trigger: "counter",
            frequency: 30,
          },
          {
            level: 15,
            id: "atk_up",
            name: "Attack +10%",
            description: "ATK +10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "gigasword",
            name: "Gigasword",
            description: "x2 sword damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
          {
            level: 65,
            id: "counter2",
            name: "Counterattack",
            description: "x2 weapon damage",
            trigger: "counter",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Dark Warrior",
        weapon: "Sword",
        element: "—",
        statsMin: { hp: 385, atk: 33, def: 31, matk: 16, mdef: 18 },
        statsMax: { hp: 3546, atk: 302, def: 283, matk: 146, mdef: 165 },
        skills: [
          {
            level: 1,
            id: "def_up",
            name: "Defense +10%",
            description: "DEF +10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 15,
            id: "megasword",
            name: "Megasword",
            description: "x1 sword damage",
            trigger: "pincer",
            frequency: 50,
            power: 1,
          },
          {
            level: 35,
            id: "hp_up",
            name: "HP +10%",
            description: "Passive HP +10%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "phys_x15",
            name: "Physical Damage x1.5",
            description: "Physical damage x1.5 for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
        ],
        unlockCost: { coins: 0, items: [{ id: "terra_fragment", qty: 1 }] },
      },
      {
        jobIndex: 3,
        title: "Dark Hero",
        weapon: "Sword",
        element: "—",
        statsMin: { hp: 442, atk: 39, def: 32, matk: 19, mdef: 21 },
        statsMax: { hp: 4072, atk: 356, def: 293, matk: 174, mdef: 193 },
        skills: [
          {
            level: 1,
            id: "atk_eq",
            name: "Attack +10%",
            description: "Passive ATK +10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "def_eq",
            name: "Defense +10%",
            description: "Passive DEF +10%",
            trigger: "equip",
          },
          {
            level: 35,
            id: "counter",
            name: "Counterattack",
            description: "x1.5 weapon damage",
            trigger: "counter",
            frequency: 35,
          },
          {
            level: 65,
            id: "terasword",
            name: "Terasword",
            description: "x3 sword damage",
            trigger: "pincer",
            frequency: 30,
            power: 3,
          },
        ],
        unlockCost: {
          coins: 16000,
          items: [
            { id: "wisdom_flower", qty: 15 },
            { id: "terra_swordsteel", qty: 15 },
            { id: "spirit_particle", qty: 3 },
          ],
        },
      },
    ],
  },

  grace: {
    id: "grace",
    name: "Grace",
    rarity: "B",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Starter", "Pact of Truth"],
    description: "An archer with a calm aim and a quiet resolve.",
    jobs: [
      {
        jobIndex: 1,
        title: "Archer",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 318, atk: 31, def: 24, matk: 15, mdef: 17 },
        statsMax: { hp: 2942, atk: 284, def: 220, matk: 137, mdef: 155 },
        skills: [
          {
            level: 1,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow damage",
            trigger: "pincer",
            frequency: 50,
            power: 1,
          },
          {
            level: 15,
            id: "atk_up",
            name: "Attack +10%",
            description: "ATK +10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "def_down_beast",
            name: "Defense -10%",
            description: "DEF -10% on Wild Beast (2 turns)",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "poison_arrows",
            name: "Poison Arrows",
            description: "x1 bow + poison",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Markswoman",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 379, atk: 34, def: 27, matk: 18, mdef: 20 },
        statsMax: { hp: 3506, atk: 311, def: 247, matk: 165, mdef: 183 },
        skills: [
          {
            level: 1,
            id: "def_up",
            name: "Defense +10%",
            description: "DEF +10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 15,
            id: "megabow_area",
            name: "Megabow",
            description: "x1 bow damage (area 1)",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 35,
            id: "hp_up",
            name: "HP +10%",
            description: "Passive HP +10%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "terabow",
            name: "Terabow",
            description: "x3 bow damage",
            trigger: "pincer",
            frequency: 30,
            power: 3,
          },
        ],
        unlockCost: { coins: 0, items: [{ id: "terra_fragment", qty: 1 }] },
      },
      {
        jobIndex: 3,
        title: "Ranger",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 437, atk: 37, def: 30, matk: 21, mdef: 23 },
        statsMax: { hp: 4043, atk: 339, def: 275, matk: 192, mdef: 210 },
        skills: [
          {
            level: 1,
            id: "atk_eq",
            name: "Attack +10%",
            description: "Passive ATK +10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 35,
            id: "def_eq",
            name: "Defense +10%",
            description: "Passive DEF +10%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "gigabow",
            name: "Gigabow",
            description: "x2 bow damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
        ],
        unlockCost: {
          coins: 16000,
          items: [
            { id: "wisdom_flower", qty: 15 },
            { id: "terra_bowstring", qty: 15 },
            { id: "spirit_particle", qty: 3 },
          ],
        },
      },
    ],
  },

  kuscah: {
    id: "kuscah",
    name: "Kuscah",
    rarity: "B",
    verified: "N",
    species: "Human",
    gender: "Male",
    sources: ["Limited Starter", "Pact of Truth"],
    description: "A cheerful old acolyte still sharp in a fight.",
    jobs: [
      {
        jobIndex: 1,
        title: "Acolyte",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 293, atk: 12, def: 17, matk: 29, mdef: 26 },
        statsMax: { hp: 2734, atk: 110, def: 157, matk: 266, mdef: 238 },
        skills: [
          {
            level: 1,
            id: "mega_heal",
            name: "Mega Heal",
            description: "Heal power 2 (cap 700)",
            trigger: "chain",
            frequency: 100,
            power: 2,
          },
          {
            level: 15,
            id: "def_up",
            name: "Defense +10%",
            description: "DEF +10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "mega_heal_self",
            name: "Mega Heal",
            description: "Self heal power 2",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "restorative_counter",
            name: "Restorative Counter",
            description: "Counter heal power 2",
            trigger: "counter",
            frequency: 50,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Priest",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 353, atk: 15, def: 20, matk: 32, mdef: 29 },
        statsMax: { hp: 3294, atk: 137, def: 185, matk: 293, mdef: 266 },
        skills: [
          {
            level: 1,
            id: "def_eq",
            name: "Defense +10%",
            description: "Passive DEF +10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "heal_all",
            name: "Mega Heal",
            description: "Heal all allies",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 35,
            id: "sleep_ward",
            name: "Anti-Sleep",
            description: "Sleep immunity",
            trigger: "equip",
          },
          {
            level: 65,
            id: "revive",
            name: "Resurrection",
            description: "Revive ally next turn at 1 HP",
            trigger: "equip",
          },
        ],
        unlockCost: {
          coins: 8000,
          items: [
            { id: "serenity_shoot", qty: 15 },
            { id: "terra_staffwood", qty: 15 },
            { id: "rainbow_tears", qty: 3 },
          ],
        },
      },
      {
        jobIndex: 3,
        title: "Healer",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 417, atk: 18, def: 23, matk: 35, mdef: 32 },
        statsMax: { hp: 3891, atk: 165, def: 212, matk: 321, mdef: 293 },
        skills: [
          {
            level: 1,
            id: "hp_up",
            name: "HP +10%",
            description: "Passive HP +10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "giga_heal",
            name: "Giga Heal",
            description: "Heal power 3 (cap 1300)",
            trigger: "chain",
            frequency: 40,
            power: 3,
          },
          {
            level: 35,
            id: "matk_up",
            name: "Magic Attack +10%",
            description: "Passive MATK +10%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "party_heal",
            name: "Party Heal",
            description: "Heal all allies power 2",
            trigger: "chain",
            frequency: 35,
          },
        ],
        unlockCost: {
          coins: 16000,
          items: [
            { id: "white_ring", qty: 15 },
            { id: "wisdom_flower", qty: 15 },
            { id: "spirit_particle", qty: 3 },
          ],
        },
      },
    ],
  },

  samatha: {
    id: "samatha",
    name: "Samatha",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    description: "A tomboyish spearmaiden with a strong sense of justice.",
    jobs: [
      {
        jobIndex: 1,
        title: "Spearmaiden",
        weapon: "Spear",
        element: "Lightning",
        statsMin: { hp: 456, atk: 30, def: 26, matk: 38, mdef: 33 },
        statsMax: { hp: 4183, atk: 275, def: 238, matk: 348, mdef: 302 },
        skills: [
          {
            level: 1,
            id: "matk_up",
            name: "Magic Attack +10%",
            description: "MATK +10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 15,
            id: "thunder_strike",
            name: "Thunder Strike",
            description: "x1 lightning and x0.5 spear damage",
            trigger: "pincer",
            frequency: 80,
          },
          {
            level: 35,
            id: "dark_damage_down",
            name: "Dark Damage Down 20%",
            description: "Reduce darkness damage by 20% for adjacent allies",
            trigger: "equip",
            target: "adjacent",
          },
          {
            level: 65,
            id: "lightning_strike_area",
            name: "Lightning Strike, Area (1)",
            description: "x2 lightning and x0.7 spear damage",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Huntress",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 595, atk: 43, def: 35, matk: 20, mdef: 25 },
        statsMax: { hp: 5458, atk: 394, def: 321, matk: 183, mdef: 231 },
        skills: [
          {
            level: 1,
            id: "megaspear",
            name: "Megaspear",
            description: "x1 spear damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 15,
            id: "atk_eq",
            name: "Attack +10%, Equip",
            description: "Boost ATK by 10%",
            trigger: "equip",
          },
          {
            level: 35,
            id: "gigaspear",
            name: "Gigaspear",
            description: "x2 spear damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
          {
            level: 65,
            id: "negotiator",
            name: "Negotiator",
            description:
              "Increases recruiting rate of pincered, defeated monsters by 200%",
            trigger: "chain",
            frequency: 30,
          },
        ],
        unlockCost: {
          coins: 10000,
          items: [
            { id: "serenity_shoot", qty: 15 },
            { id: "terra_spearbronze", qty: 15 },
            { id: "orichalcum", qty: 3 },
          ],
        },
      },
      {
        jobIndex: 3,
        title: "Foestalker",
        weapon: "Spear",
        element: "Lightning",
        statsMin: { hp: 575, atk: 35, def: 34, matk: 43, mdef: 38 },
        statsMax: { hp: 5274, atk: 321, def: 311, matk: 394, mdef: 348 },
        skills: [
          {
            level: 1,
            id: "anti_darkness_shield",
            name: "Anti-Darkness Shield",
            description: "Reduce darkness damage by 40%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "matk_eq",
            name: "Magic Attack +10%, Equip",
            description: "Boost MATK by 10%",
            trigger: "equip",
          },
          {
            level: 35,
            id: "thunder_strike_column",
            name: "Thunder Strike, 1 Column",
            description: "x1 lightning and x0.5 spear damage",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "tempest_strike",
            name: "Tempest Strike",
            description: "x3 lightning and x0.9 spear damage",
            trigger: "pincer",
            frequency: 40,
          },
        ],
        unlockCost: {
          coins: 20000,
          items: [
            { id: "wisdom_flower", qty: 15 },
            { id: "vajra", qty: 3 },
            { id: "dark_matter", qty: 3 },
          ],
        },
      },
    ],
  },

  // --- Additional early roster (wiki stats page names / common recruits) ---
  ellvern: {
    id: "ellvern",
    name: "Ellvern",
    rarity: "S",
    verified: "N",
    species: "Human",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Apothecary",
        weapon: "Staff",
        element: "Remedy",
        statsMin: { hp: 348, atk: 21, def: 21, matk: 36, mdef: 29 },
        statsMax: { hp: 3192, atk: 192, def: 192, matk: 330, mdef: 266 },
        skills: [
          {
            level: 1,
            id: "remedy",
            name: "Remedy",
            description: "Clear status ailments",
            trigger: "chain",
            frequency: 40,
          },
          {
            level: 20,
            id: "mega_heal",
            name: "Mega Heal",
            description: "Heal power 2",
            trigger: "chain",
            frequency: 50,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Physician",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 457, atk: 34, def: 29, matk: 25, mdef: 22 },
        statsMax: { hp: 4192, atk: 311, def: 266, matk: 229, mdef: 201 },
        skills: [
          {
            level: 1,
            id: "megaspear",
            name: "Megaspear",
            description: "x1 spear damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 15,
            id: "levitation_all",
            name: "Levitation, All",
            description:
              "All allies evade ground attacks and floor traps for 3 turns",
            trigger: "chain",
            target: "all",
            frequency: 100,
          },
          {
            level: 35,
            id: "megaspear_column",
            name: "Megaspear, 1 Column",
            description: "x1 spear damage on caster's column",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "powered_point_amp",
            name: "Powered Point Amp",
            description: "Charge power points 20% faster",
            trigger: "equip",
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Surgeon",
        weapon: "Staff",
        element: "Remedy",
        statsMin: { hp: 469, atk: 27, def: 27, matk: 42, mdef: 35 },
        statsMax: { hp: 4302, atk: 247, def: 247, matk: 385, mdef: 321 },
        skills: [
          {
            level: 1,
            id: "def_eq",
            name: "Defense +10%, Equip",
            description: "Boost DEF by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "giga_regen",
            name: "Giga Regen",
            description: "Apply Regen with power 2 (cap 600) for 3 turns",
            trigger: "chain",
            frequency: 90,
          },
          {
            level: 35,
            id: "hp_eq_20",
            name: "HP +20%, Equip",
            description: "Boost HP by 20%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "venom_column",
            name: "Venom, 1 Column",
            description:
              "Apply poison with power 3 on caster's column for 3 turns with an 80% chance",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
    ],
  },

  sorman: {
    id: "sorman",
    name: "Sorman",
    rarity: "B",
    verified: "N",
    species: "Human",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Sage",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 289, atk: 12, def: 18, matk: 29, mdef: 26 },
        statsMax: { hp: 2697, atk: 110, def: 166, matk: 266, mdef: 238 },
        skills: [
          {
            level: 1,
            id: "mega_heal",
            name: "Mega Heal",
            description: "Heal with power 2 (cap 700)",
            trigger: "chain",
            frequency: 100,
          },
          {
            level: 15,
            id: "def_up",
            name: "Defense +10%",
            description: "Boost DEF by 10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "mega_heal_self",
            name: "Mega Heal, Self",
            description: "Heal with power 2 (cap 700)",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 65,
            id: "ally_revival",
            name: "Ally Revival",
            description:
              "Revive a defeated ally with 1 HP when starting a new floor",
            trigger: "equip",
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Shaman",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 341, atk: 15, def: 21, matk: 32, mdef: 29 },
        statsMax: { hp: 3182, atk: 137, def: 194, matk: 293, mdef: 266 },
        skills: [
          {
            level: 1,
            id: "def_eq",
            name: "Defense +10%, Equip",
            description: "Boost DEF by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "heal_all",
            name: "Heal, All",
            description: "Heal all allies with power 1 (cap 700)",
            trigger: "chain",
            target: "all",
            frequency: 30,
          },
          {
            level: 35,
            id: "confusion_guard",
            name: "Confusion Guard",
            description: "+50% resistance to confusion",
            trigger: "equip",
          },
          {
            level: 65,
            id: "restorative_counter",
            name: "Restorative Counter",
            description: "Heal self with power 2 (cap 700)",
            trigger: "counter",
            frequency: 50,
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Seraph",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 405, atk: 18, def: 24, matk: 35, mdef: 32 },
        statsMax: { hp: 3779, atk: 165, def: 222, matk: 321, mdef: 293 },
        skills: [
          {
            level: 1,
            id: "hp_up",
            name: "HP +10%",
            description: "Boost HP by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "control_time",
            name: "Control Time +2 Sec",
            description: "Extends this unit's move timer by 2 seconds",
            trigger: "equip",
          },
          {
            level: 35,
            id: "giga_heal",
            name: "Giga Heal",
            description: "Heal with power 2.5 (cap 1300)",
            trigger: "chain",
            frequency: 90,
            power: 2.5,
          },
          {
            level: 65,
            id: "heal_x15_all",
            name: "Heal x1.5, All",
            description: "Increase healing by x1.5 for all allies for 2 turns",
            trigger: "chain",
            target: "all",
            frequency: 30,
          },
        ],
      },
    ],
  },

  // Placeholder SS/S names from common early pulls (stats approximate from class bands)
  amina: {
    id: "amina",
    name: "Amina",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Nurse",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 361, atk: 21, def: 22, matk: 42, mdef: 39 },
        statsMax: { hp: 3311, atk: 192, def: 201, matk: 385, mdef: 357 },
        skills: [
          {
            level: 1,
            id: "mega_heal",
            name: "Mega Heal",
            description: "Heal with power 2 (cap 700)",
            trigger: "chain",
            frequency: 100,
            power: 2,
          },
          {
            level: 15,
            id: "matk_def_up",
            name: "Magic Defense +10%",
            description: "Boost MDEF by 10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "mega_heal_self",
            name: "Mega Heal, Self",
            description: "Heal with power 2 (cap 700)",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 65,
            id: "ally_revival",
            name: "Ally Revival",
            description:
              "Revive a defeated ally with 1 HP when starting a new floor",
            trigger: "equip",
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Medic",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 425, atk: 24, def: 25, matk: 45, mdef: 42 },
        statsMax: { hp: 3898, atk: 220, def: 229, matk: 412, mdef: 385 },
        skills: [
          {
            level: 1,
            id: "mdef_eq",
            name: "Magic Defense +10%, Equip",
            description: "Boost MDEF by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "giga_heal",
            name: "Giga Heal",
            description: "Heal with power 2.5 (cap 1300)",
            trigger: "chain",
            frequency: 90,
            power: 2.5,
          },
          {
            level: 35,
            id: "poison_guard",
            name: "Poison Guard",
            description: "+50% resistance to poison",
            trigger: "equip",
          },
          {
            level: 65,
            id: "heal_x15_all",
            name: "Heal x1.5, All",
            description: "Increase healing by x1.5 for all allies for 2 turns",
            trigger: "chain",
            target: "all",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Saint",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 486, atk: 27, def: 28, matk: 48, mdef: 45 },
        statsMax: { hp: 4449, atk: 247, def: 256, matk: 440, mdef: 412 },
        skills: [
          {
            level: 1,
            id: "hp_up",
            name: "HP +10%",
            description: "Boost HP by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "control_time",
            name: "Control Time +2 Sec",
            description: "Extends this unit's move timer by 2 seconds",
            trigger: "equip",
          },
          {
            level: 35,
            id: "tera_heal",
            name: "Tera Heal",
            description: "Heal with power 3 (cap 2500)",
            trigger: "chain",
            frequency: 80,
            power: 3,
          },
          {
            level: 65,
            id: "party_revival",
            name: "Party Revival",
            description:
              "Revive all defeated allies with 1 HP when starting a new floor",
            trigger: "equip",
          },
        ],
      },
    ],
  },

  palpa: {
    id: "palpa",
    name: "Palpa",
    rarity: "S",
    verified: "N",
    species: "Stonefolk",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Princess Palpa",
        weapon: "Staff",
        element: "Remedy",
        statsMin: { hp: 315, atk: 16, def: 19, matk: 35, mdef: 30 },
        statsMax: { hp: 2889, atk: 146, def: 174, matk: 321, mdef: 275 },
        skills: [
          {
            level: 1,
            id: "mega_regen",
            name: "Mega Regen",
            description: "Apply Regen with power 1.5 (cap 300) for 3 turns",
            trigger: "chain",
            frequency: 100,
          },
          {
            level: 15,
            id: "def_up",
            name: "Defense +10%",
            description: "Boost DEF by 10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "rise_and_shine",
            name: "Rise and Shine, Area (2)",
            description: "Cure caster's area of sleep",
            trigger: "chain",
            frequency: 100,
          },
          {
            level: 65,
            id: "control_time",
            name: "Control Time +2 Sec",
            description:
              "Extends chained allies' move timers by 2 seconds for 2 turns",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Queen Palpa",
        weapon: "Staff",
        element: "Remedy",
        statsMin: { hp: 379, atk: 19, def: 22, matk: 38, mdef: 33 },
        statsMax: { hp: 3476, atk: 174, def: 201, matk: 348, mdef: 302 },
        skills: [
          {
            level: 1,
            id: "antidote_area",
            name: "Antidote, Area (2)",
            description: "Cure caster's area of poison",
            trigger: "chain",
            frequency: 100,
          },
          {
            level: 15,
            id: "hp_up",
            name: "HP +10%",
            description: "Boost HP by 10%",
            trigger: "equip",
          },
          {
            level: 35,
            id: "locomotion_area",
            name: "Locomotion, Area (2)",
            description: "Cure caster's area of paralysis",
            trigger: "chain",
            frequency: 100,
          },
          {
            level: 65,
            id: "regen",
            name: "Regen",
            description: "Regen with power 1",
            trigger: "equip",
          },
        ],
      },
      {
        jobIndex: 3,
        title: "High Queen Palpa",
        weapon: "Staff",
        element: "Remedy",
        statsMin: { hp: 433, atk: 22, def: 25, matk: 41, mdef: 37 },
        statsMax: { hp: 3972, atk: 201, def: 229, matk: 376, mdef: 339 },
        skills: [
          {
            level: 1,
            id: "clarity_area",
            name: "Clarity, Area (2)",
            description: "Cure caster's area of confusion",
            trigger: "chain",
            frequency: 100,
          },
          {
            level: 15,
            id: "giga_regen",
            name: "Giga Regen",
            description: "Apply Regen with power 2 (cap 600) for 3 turns",
            trigger: "chain",
            frequency: 90,
          },
          {
            level: 35,
            id: "esprit_de_corps_area",
            name: "Esprit de Corps, Area (2)",
            description: "Cure caster's area of demoralization",
            trigger: "chain",
            frequency: 100,
          },
          {
            level: 65,
            id: "panacea_area",
            name: "Panacea, Area (2)",
            description: "Cure allies of all status effects",
            trigger: "chain",
            target: "all",
            frequency: 100,
          },
        ],
      },
    ],
  },

  ba_gunar: {
    id: "ba_gunar",
    name: "Ba'gunar",
    rarity: "B",
    verified: "N",
    species: "Lizardfolk",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Highborn",
        weapon: "Sword",
        element: "Lightning",
        statsMin: { hp: 358, atk: 24, def: 23, matk: 30, mdef: 24 },
        statsMax: { hp: 3284, atk: 220, def: 210, matk: 275, mdef: 220 },
        skills: [
          {
            level: 1,
            id: "thunder_blade",
            name: "Thunder Blade",
            description: "x1 lightning and x0.5 sword damage",
            trigger: "pincer",
            frequency: 80,
          },
          {
            level: 15,
            id: "anti_darkness_capsule",
            name: "Anti-Darkness Capsule",
            description:
              "Create a capsule point that reduces darkness damage by 10% per capsule for all allies",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 35,
            id: "mdef_up",
            name: "Magic Defense +10%",
            description: "Boost MDEF by 10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 65,
            id: "lightning_blade_cross",
            name: "Lightning Blade, Cross (1)",
            description: "x2 lightning and x0.7 sword damage",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Regal",
        weapon: "Sword",
        element: "Lightning",
        statsMin: { hp: 416, atk: 28, def: 28, matk: 32, mdef: 23 },
        statsMax: { hp: 3816, atk: 256, def: 256, matk: 293, mdef: 210 },
        skills: [
          {
            level: 1,
            id: "outflank",
            name: "Outflank",
            description:
              "Deal 50% more damage to completely surrounded enemies",
            trigger: "equip",
          },
          {
            level: 15,
            id: "hp_up",
            name: "HP +10%",
            description: "Boost HP by 10%",
            trigger: "equip",
          },
          {
            level: 35,
            id: "lightning_blade",
            name: "Lightning Blade",
            description: "x2 lightning and x0.7 sword damage",
            trigger: "pincer",
            frequency: 60,
            power: 2,
          },
          {
            level: 65,
            id: "paralyzing_blade",
            name: "Paralyzing Blade, Lateral (1)",
            description:
              "x1 sword damage with an 80% chance to apply paralysis for 3 turns",
            trigger: "pincer",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 3,
        title: "August",
        weapon: "Sword",
        element: "Lightning",
        statsMin: { hp: 476, atk: 31, def: 31, matk: 35, mdef: 26 },
        statsMax: { hp: 4366, atk: 284, def: 284, matk: 321, mdef: 238 },
        skills: [
          {
            level: 1,
            id: "matk_eq",
            name: "Magic Attack +10%, Equip",
            description: "Boost MATK by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "anti_darkness_shield",
            name: "Anti-Darkness Shield",
            description: "Reduce darkness damage by 40% for 3 turns",
            trigger: "chain",
            target: "self",
            frequency: 50,
          },
          {
            level: 35,
            id: "paralysis_guard",
            name: "Paralysis Guard",
            description: "+50% resistance to paralysis",
            trigger: "equip",
          },
          {
            level: 65,
            id: "tempest_blade",
            name: "Tempest Blade",
            description: "x3 lightning and x0.9 sword damage",
            trigger: "pincer",
            frequency: 40,
          },
        ],
      },
    ],
  },

  gigojago: {
    id: "gigojago",
    name: "Gigojago",
    rarity: "B",
    verified: "N",
    species: "Beastfolk",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Archer",
        weapon: "Bow",
        element: "Ice",
        statsMin: { hp: 382, atk: 24, def: 23, matk: 32, mdef: 23 },
        statsMax: { hp: 3504, atk: 220, def: 210, matk: 293, mdef: 210 },
        skills: [
          {
            level: 1,
            id: "ice_arrows",
            name: "Ice Arrows",
            description: "x1 ice and x0.5 bow damage",
            trigger: "pincer",
            frequency: 80,
          },
          {
            level: 15,
            id: "mdef_up",
            name: "Magic Defense +10%",
            description: "Boost MDEF by 10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "anti_fire_capsule",
            name: "Anti-Fire Capsule",
            description:
              "Create a capsule point that reduces fire damage by 10% per capsule for all allies",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "glacial_arrows",
            name: "Glacial Arrows, Area (1)",
            description: "x2 ice and x0.7 bow damage",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Marksman",
        weapon: "Staff",
        element: "Ice",
        statsMin: { hp: 412, atk: 19, def: 22, matk: 38, mdef: 29 },
        statsMax: { hp: 3779, atk: 174, def: 201, matk: 348, mdef: 266 },
        skills: [
          {
            level: 1,
            id: "mdef_eq",
            name: "Magic Defense +10%, Equip",
            description: "Boost MDEF by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "poison_guard_adjacent",
            name: "Poison Guard, Adjacent",
            description: "+50% resistance to poison for adjacent allies",
            trigger: "equip",
            target: "adjacent",
          },
          {
            level: 35,
            id: "hp_eq_20",
            name: "HP +20%, Equip",
            description: "Boost HP by 20%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "glacier_area",
            name: "Glacier, Pincer Area (1)",
            description: "x2 ice damage",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Sniper",
        weapon: "Bow",
        element: "Ice",
        statsMin: { hp: 502, atk: 30, def: 29, matk: 38, mdef: 29 },
        statsMax: { hp: 4605, atk: 275, def: 266, matk: 348, mdef: 266 },
        skills: [
          {
            level: 1,
            id: "anti_fire_shield",
            name: "Anti-Fire Shield",
            description: "Reduce fire damage by 40% for 3 turns",
            trigger: "chain",
            target: "self",
            frequency: 50,
          },
          {
            level: 15,
            id: "poison_guard",
            name: "Poison Guard",
            description: "+50% resistance to poison",
            trigger: "equip",
          },
          {
            level: 35,
            id: "ice_arrows_cross",
            name: "Ice Arrows, Cross (2)",
            description: "x1 ice and x0.5 bow damage",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "absolute_zero_arrows",
            name: "Absolute Zero Arrows",
            description: "x3 ice and x0.9 bow damage",
            trigger: "pincer",
            frequency: 40,
          },
        ],
      },
    ],
  },

  sh_berdan: {
    id: "sh_berdan",
    name: "Sh'berdan",
    rarity: "B",
    verified: "N",
    species: "Lizardfolk",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Malodorous",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 317, atk: 29, def: 24, matk: 29, mdef: 21 },
        statsMax: { hp: 2907, atk: 266, def: 220, matk: 266, mdef: 192 },
        skills: [
          {
            level: 1,
            id: "megaspear",
            name: "Megaspear",
            description: "x1 spear damage",
            trigger: "pincer",
            frequency: 30,
          },
          {
            level: 15,
            id: "def_up",
            name: "Defense +10%",
            description: "Boost DEF by 10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "gigaspear",
            name: "Gigaspear",
            description: "x2 spear damage",
            trigger: "pincer",
            frequency: 30,
            power: 2,
          },
          {
            level: 65,
            id: "healing_fragrance_area",
            name: "Healing Fragrance, Area (2)",
            description: "Heal with power 2 (cap 700)",
            trigger: "chain",
            frequency: 30,
            power: 2,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Noxious",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 371, atk: 32, def: 27, matk: 32, mdef: 24 },
        statsMax: { hp: 3403, atk: 293, def: 247, matk: 293, mdef: 220 },
        skills: [
          {
            level: 1,
            id: "thunder_strike",
            name: "Thunder Strike",
            description: "x1 lightning and x0.5 spear damage",
            trigger: "pincer",
            frequency: 60,
          },
          {
            level: 15,
            id: "outflank",
            name: "Outflank",
            description:
              "Deal 50% more damage to completely surrounded enemies",
            trigger: "equip",
          },
          {
            level: 35,
            id: "lightning_strike",
            name: "Lightning Strike",
            description: "x2 lightning and x0.7 spear damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
          {
            level: 65,
            id: "lightning_attack_x15",
            name: "Lightning Attack x1.5",
            description: "Increase lightning damage by x1.5 for self",
            trigger: "equip",
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Stink Master",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 434, atk: 35, def: 30, matk: 35, mdef: 27 },
        statsMax: { hp: 3981, atk: 321, def: 275, matk: 321, mdef: 247 },
        skills: [
          {
            level: 1,
            id: "shadow_strike",
            name: "Shadow Strike",
            description: "x1 darkness and x0.5 spear damage",
            trigger: "pincer",
            frequency: 60,
          },
          {
            level: 15,
            id: "def_eq",
            name: "Defense +10%, Equip",
            description: "Boost DEF by 10%",
            trigger: "equip",
          },
          {
            level: 35,
            id: "abyss_strike",
            name: "Abyss Strike",
            description: "x2 darkness and x0.7 spear damage",
            trigger: "chain",
            frequency: 40,
            power: 2,
          },
          {
            level: 65,
            id: "darkness_attack_x15",
            name: "Darkness Attack x1.5",
            description: "Increase darkness damage by x1.5 for self",
            trigger: "equip",
          },
        ],
      },
    ],
  },

  ma_curi: {
    id: "ma_curi",
    name: "Ma'curi",
    rarity: "B",
    verified: "N",
    species: "Lizardfolk",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Tormented",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 318, atk: 40, def: 25, matk: 12, mdef: 14 },
        statsMax: { hp: 2942, atk: 366, def: 229, matk: 110, mdef: 128 },
        skills: [
          {
            level: 1,
            id: "megaspear",
            name: "Megaspear",
            description: "x1 spear damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 15,
            id: "atk_up",
            name: "Attack +10%",
            description: "Boost ATK by 10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "thousand_spears",
            name: "Thousand Spears",
            description: "Inflict 1000 damage",
            trigger: "pincer",
            frequency: 30,
          },
          {
            level: 65,
            id: "gigaspear_cross",
            name: "Gigaspear, Cross (1)",
            description: "x2 spear damage",
            trigger: "chain",
            frequency: 30,
            power: 2,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Tortured",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 379, atk: 41, def: 28, matk: 15, mdef: 18 },
        statsMax: { hp: 3506, atk: 376, def: 256, matk: 137, mdef: 165 },
        skills: [
          {
            level: 1,
            id: "outflank",
            name: "Outflank",
            description:
              "Deal 50% more damage to completely surrounded enemies",
            trigger: "equip",
          },
          {
            level: 15,
            id: "paralysis_guard",
            name: "Paralysis Guard",
            description: "+50% resistance to paralysis",
            trigger: "equip",
          },
          {
            level: 35,
            id: "gigaspear",
            name: "Gigaspear",
            description: "x2 spear damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
          {
            level: 65,
            id: "phys_x15",
            name: "Physical Damage x1.5",
            description:
              "Increase physical damage by x1.5 for self for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Martyr",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 436, atk: 43, def: 31, matk: 18, mdef: 21 },
        statsMax: { hp: 4034, atk: 394, def: 284, matk: 165, mdef: 192 },
        skills: [
          {
            level: 1,
            id: "atk_eq",
            name: "Attack +10%, Equip",
            description: "Boost ATK by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "hp_up",
            name: "HP +10%",
            description: "Boost HP by 10%",
            trigger: "equip",
          },
          {
            level: 35,
            id: "megaspear_column",
            name: "Megaspear, 1 Column",
            description: "x1 spear damage on caster's column",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "teraspear",
            name: "Teraspear",
            description: "x3 spear damage",
            trigger: "pincer",
            frequency: 30,
            power: 3,
          },
        ],
      },
    ],
  },

  // --- Expanded roster (wiki-inspired mechanical placeholders) ---
  gatz: {
    id: "gatz",
    name: "Gatz",
    rarity: "S",
    verified: "N",
    species: "Human",
    gender: "Male",
    sources: ["Pact of Truth", "Pact of Fate"],
    description: "A straightforward fighter with more brawn than tact.",
    jobs: [
      {
        jobIndex: 1,
        title: "The Filcher",
        weapon: "Sword",
        element: "—",
        statsMin: { hp: 341, atk: 33, def: 27, matk: 22, mdef: 30 },
        statsMax: { hp: 3128, atk: 305, def: 247, matk: 201, mdef: 275 },
        skills: [
          {
            level: 1,
            id: "levitation_all",
            name: "Levitation, All",
            description:
              "All allies evade ground attacks and floor traps for 3 turns",
            trigger: "chain",
            target: "all",
            frequency: 100,
          },
          {
            level: 15,
            id: "levitation_equip",
            name: "Levitation, Equip",
            description: "Evade ground attacks and floor traps",
            trigger: "equip",
          },
          {
            level: 35,
            id: "megasword",
            name: "Megasword",
            description: "x1 sword damage",
            trigger: "pincer",
            frequency: 50,
            power: 1,
          },
          {
            level: 65,
            id: "leeching_blade",
            name: "Leeching Blade",
            description: "x2 magical damage and absorb HP (cap 700)",
            trigger: "pincer",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "The Thief",
        weapon: "Sword",
        element: "—",
        statsMin: { hp: 400, atk: 36, def: 30, matk: 25, mdef: 34 },
        statsMax: { hp: 3669, atk: 331, def: 275, matk: 229, mdef: 311 },
        skills: [
          {
            level: 1,
            id: "def_eq",
            name: "Defense +10%, Equip",
            description: "Boost DEF by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "disarm_bomb",
            name: "Disarm Bomb",
            description: "Moving over bombs removes them without exploding",
            trigger: "equip",
          },
          {
            level: 35,
            id: "hp_eq_20",
            name: "HP +20%, Equip",
            description: "Boost HP by 20%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "treasure_hunter",
            name: "Treasure Hunter",
            description: "Increases rate of item drops by 25% of the base rate",
            trigger: "equip",
          },
        ],
        unlockCost: {
          coins: 10000,
          items: [
            { id: "serenity_shoot", qty: 15 },
            { id: "terra_swordsteel", qty: 15 },
            { id: "dark_matter", qty: 3 },
          ],
        },
      },
      {
        jobIndex: 3,
        title: "The Phantom",
        weapon: "Sword",
        element: "—",
        statsMin: { hp: 460, atk: 41, def: 33, matk: 28, mdef: 38 },
        statsMax: { hp: 4219, atk: 376, def: 302, matk: 256, mdef: 348 },
        skills: [
          {
            level: 1,
            id: "atk_eq",
            name: "Attack +10%, Equip",
            description: "Boost ATK by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "sleep_guard_adjacent",
            name: "Sleep Guard, Adjacent",
            description: "+50% resistance to sleep for adjacent allies",
            trigger: "equip",
            target: "adjacent",
          },
          {
            level: 35,
            id: "gigasword",
            name: "Gigasword",
            description: "x2 sword damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
          {
            level: 65,
            id: "panacea_area",
            name: "Panacea, Area (2)",
            description:
              "Cure allies of sleep, poison, paralysis, confusion, demoralization, petrification, icebind, and shadowbind",
            trigger: "chain",
            target: "all",
            frequency: 100,
          },
        ],
        unlockCost: {
          coins: 20000,
          items: [
            { id: "wisdom_flower", qty: 15 },
            { id: "terra_swordsteel", qty: 15 },
            { id: "animaton", qty: 3 },
          ],
        },
      },
    ],
  },

  camellia: {
    id: "camellia",
    name: "Camellia",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Pleasure Seeker",
        weapon: "Sword",
        element: "—",
        statsMin: { hp: 429, atk: 31, def: 24, matk: 25, mdef: 22 },
        statsMax: { hp: 3935, atk: 284, def: 220, matk: 229, mdef: 201 },
        skills: [
          {
            level: 1,
            id: "femme_fatale_def_10",
            name: "Femme Fatale, Defense +10%, Equip",
            description:
              "Boost DEF by 2% for each male squad member, up to 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "megasword",
            name: "Megasword",
            description: "x1 sword damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 35,
            id: "femme_fatale_atk_10",
            name: "Femme Fatale, Attack +10%, Equip",
            description:
              "Boost ATK by 2% for each male squad member, up to 10%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "gigasword",
            name: "Gigasword",
            description: "x2 sword damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Fallen",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 489, atk: 34, def: 27, matk: 28, mdef: 25 },
        statsMax: { hp: 4485, atk: 311, def: 247, matk: 256, mdef: 229 },
        skills: [
          {
            level: 1,
            id: "femme_fatale_def_15",
            name: "Femme Fatale, Defense +15%, Equip",
            description:
              "Boost DEF by 3% for each male squad member, up to 15%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 35,
            id: "femme_fatale_atk_15",
            name: "Femme Fatale, Attack +15%, Equip",
            description:
              "Boost ATK by 3% for each male squad member, up to 15%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "terabow",
            name: "Terabow",
            description: "x3 bow damage",
            trigger: "pincer",
            frequency: 30,
            power: 3,
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Hedonist",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 549, atk: 37, def: 30, matk: 31, mdef: 28 },
        statsMax: { hp: 5036, atk: 339, def: 275, matk: 284, mdef: 256 },
        skills: [
          {
            level: 1,
            id: "femme_fatale_def_25",
            name: "Femme Fatale, Defense +25%, Equip",
            description:
              "Boost DEF by 5% for each male squad member, up to 25%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "megaspear",
            name: "Megaspear",
            description: "x1 spear damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 35,
            id: "femme_fatale_atk_25",
            name: "Femme Fatale, Attack +25%, Equip",
            description:
              "Boost ATK by 5% for each male squad member, up to 25%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "teraspear",
            name: "Teraspear",
            description: "x3 spear damage",
            trigger: "pincer",
            frequency: 30,
            power: 3,
          },
        ],
      },
    ],
  },

  daiana: {
    id: "daiana",
    name: "Daiana",
    rarity: "A",
    verified: "N",
    species: "Stonefolk",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Firedrinker",
        weapon: "Staff",
        element: "Fire",
        statsMin: { hp: 317, atk: 18, def: 20, matk: 37, mdef: 28 },
        statsMax: { hp: 2907, atk: 166, def: 183, matk: 339, mdef: 256 },
        skills: [
          {
            level: 1,
            id: "fire_area",
            name: "Fire, Pincer Area (1)",
            description: "Inflict x1 fire damage",
            trigger: "chain",
            frequency: 50,
          },
          {
            level: 15,
            id: "mdef_up",
            name: "Magic Defense +10%",
            description: "Boost MDEF by 10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 35,
            id: "anti_ice_capsule",
            name: "Anti-Ice Capsule",
            description:
              "Create a capsule point that reduces ice damage by 10% per capsule for all allies",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "mantle_chunk",
            name: "Mantle Chunk, Cross (1)",
            description: "Inflict x1.5 fire damage",
            trigger: "chain",
            frequency: 30,
            power: 1.5,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Firemane",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 383, atk: 33, def: 26, matk: 19, mdef: 19 },
        statsMax: { hp: 3513, atk: 305, def: 238, matk: 174, mdef: 174 },
        skills: [
          {
            level: 1,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 15,
            id: "atk_eq",
            name: "Attack +10%, Equip",
            description: "Boost ATK by 10%",
            trigger: "equip",
          },
          {
            level: 35,
            id: "petrification_guard",
            name: "Petrification Guard",
            description: "+50% resistance to petrification",
            trigger: "equip",
          },
          {
            level: 65,
            id: "gigabow_area",
            name: "Gigabow, Area (1)",
            description: "Inflict x2 bow damage",
            trigger: "chain",
            frequency: 30,
            power: 2,
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Firemantle",
        weapon: "Staff",
        element: "Fire",
        statsMin: { hp: 435, atk: 24, def: 26, matk: 44, mdef: 34 },
        statsMax: { hp: 3990, atk: 222, def: 238, matk: 403, mdef: 311 },
        skills: [
          {
            level: 1,
            id: "anti_ice_shield",
            name: "Anti-Ice Shield",
            description: "Reduce ice damage by 40%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "inferno_area",
            name: "Inferno, Pincer Area (1)",
            description: "Inflict x2 fire damage",
            trigger: "chain",
            frequency: 30,
            power: 2,
          },
          {
            level: 35,
            id: "blazing_counter",
            name: "Blazing Counter",
            description: "Inflict x1.5 fire damage",
            trigger: "counter",
            frequency: 30,
          },
          {
            level: 65,
            id: "solar_wind",
            name: "Solar Wind, Pincer Area (1)",
            description: "Inflict x3 fire damage",
            trigger: "chain",
            frequency: 30,
            power: 3,
          },
        ],
      },
    ],
  },

  lewto: {
    id: "lewto",
    name: "Lewto",
    rarity: "SS",
    verified: "N",
    species: "Stonefolk",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Keeper",
        weapon: "Staff",
        element: "Fire",
        statsMin: { hp: 365, atk: 20, def: 23, matk: 43, mdef: 40 },
        statsMax: { hp: 3348, atk: 183, def: 210, matk: 392, mdef: 368 },
        skills: [
          {
            level: 1,
            id: "fire_area",
            name: "Fire, Pincer Area (1)",
            description: "Inflict x1 fire damage",
            trigger: "chain",
            frequency: 50,
          },
          {
            level: 15,
            id: "anti_ice_capsule",
            name: "Anti-Ice Capsule",
            description:
              "Create a capsule point that reduces ice damage by 10% per capsule for all allies",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 35,
            id: "hp_eq_20",
            name: "HP +20%, Equip",
            description: "Boost HP by 20%",
            trigger: "equip",
          },
          {
            level: 65,
            id: "one_time_revival",
            name: "One-Time Revival",
            description: "Revive self with 25% HP once per quest",
            trigger: "equip",
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Tamer",
        weapon: "Staff",
        element: "Fire",
        statsMin: { hp: 427, atk: 23, def: 26, matk: 46, mdef: 43 },
        statsMax: { hp: 3917, atk: 210, def: 238, matk: 420, mdef: 396 },
        skills: [
          {
            level: 1,
            id: "mdef_eq",
            name: "Magic Defense +10%, Equip",
            description: "Boost MDEF by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "fire_column",
            name: "Fire, Pincer Area (Column)",
            description:
              "Inflict x1 fire damage on entire columns of pincered units",
            trigger: "chain",
            frequency: 20,
          },
          {
            level: 35,
            id: "inferno_area",
            name: "Inferno, Pincer Area (1)",
            description: "Inflict x2 fire damage",
            trigger: "chain",
            frequency: 30,
            power: 2,
          },
          {
            level: 65,
            id: "regen",
            name: "Regen",
            description: "Regen with power 1",
            trigger: "equip",
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Master",
        weapon: "Staff",
        element: "Fire",
        statsMin: { hp: 489, atk: 26, def: 29, matk: 49, mdef: 46 },
        statsMax: { hp: 4485, atk: 238, def: 266, matk: 447, mdef: 423 },
        skills: [
          {
            level: 1,
            id: "anti_ice_shield",
            name: "Anti-Ice Shield",
            description: "Reduce ice damage by 40%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "mega_heal_self",
            name: "Mega Heal, Self",
            description: "Heal with power 2 (cap 700)",
            trigger: "chain",
            target: "self",
            frequency: 30,
            power: 2,
          },
          {
            level: 35,
            id: "inferno_row",
            name: "Inferno, Pincer Area (Row)",
            description:
              "Inflict x2 fire damage on entire rows of pincered units",
            trigger: "chain",
            frequency: 20,
            power: 2,
          },
          {
            level: 65,
            id: "solar_wind",
            name: "Solar Wind, Pincer Area (1)",
            description: "Inflict x3 fire damage",
            trigger: "chain",
            frequency: 30,
            power: 3,
          },
        ],
      },
    ],
  },

  koko: {
    id: "koko",
    name: "Koko",
    rarity: "SS",
    verified: "N",
    species: "Stonefolk",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Igneous",
        weapon: "Spear",
        element: "Fire",
        statsMin: { hp: 494, atk: 29, def: 25, matk: 39, mdef: 31 },
        statsMax: { hp: 4531, atk: 266, def: 229, matk: 357, mdef: 286 },
        skills: [
          {
            level: 1,
            id: "fire_strike",
            name: "Fire Strike",
            description: "x1 fire and x0.5 spear damage",
            trigger: "pincer",
            frequency: 80,
          },
          {
            level: 15,
            id: "sleep_guard",
            name: "Sleep Guard",
            description: "+50% resistance to sleep",
            trigger: "equip",
          },
          {
            level: 35,
            id: "mdef_up",
            name: "Magic Defense +10%",
            description: "Boost MDEF by 10% for 2 turns",
            trigger: "chain",
            target: "self",
            frequency: 30,
          },
          {
            level: 65,
            id: "inferno_strike_area",
            name: "Inferno Strike, Area (1)",
            description: "x2 fire and x0.7 spear damage",
            trigger: "chain",
            frequency: 30,
            power: 2,
          },
        ],
      },
      {
        jobIndex: 2,
        title: "Molten",
        weapon: "Spear",
        element: "Fire",
        statsMin: { hp: 586, atk: 34, def: 29, matk: 40, mdef: 33 },
        statsMax: { hp: 5375, atk: 311, def: 266, matk: 366, mdef: 305 },
        skills: [
          {
            level: 1,
            id: "mdef_eq",
            name: "Magic Defense +10%, Equip",
            description: "Boost MDEF by 10%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "anti_ice_capsule",
            name: "Anti-Ice Capsule",
            description:
              "Create a capsule point that reduces ice damage by 10% per capsule for all allies",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 35,
            id: "inferno_strike",
            name: "Inferno Strike",
            description: "x2 fire and x0.7 spear damage",
            trigger: "pincer",
            frequency: 60,
            power: 2,
          },
          {
            level: 65,
            id: "life_drain_area",
            name: "Life Drain, Area (1)",
            description: "Inflict x1.5 magical damage and absorb HP (cap 700)",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
      {
        jobIndex: 3,
        title: "Magma",
        weapon: "Spear",
        element: "Fire",
        statsMin: { hp: 641, atk: 36, def: 32, matk: 42, mdef: 36 },
        statsMax: { hp: 5880, atk: 330, def: 293, matk: 385, mdef: 333 },
        skills: [
          {
            level: 1,
            id: "anti_ice_shield",
            name: "Anti-Ice Shield",
            description: "Reduce ice damage by 40%",
            trigger: "equip",
          },
          {
            level: 15,
            id: "hp_up",
            name: "HP +10%",
            description: "Boost HP by 10%",
            trigger: "equip",
          },
          {
            level: 35,
            id: "fire_strike_column",
            name: "Fire Strike, 1 Column",
            description: "x1 fire and x0.5 spear damage",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "solar_wind_strike",
            name: "Solar Wind Strike",
            description: "x3 fire and x0.9 spear damage",
            trigger: "pincer",
            frequency: 40,
            power: 3,
          },
        ],
      },
    ],
  },

  zenzoze: {
    id: "zenzoze",
    name: "Zenzoze",
    rarity: "S",
    verified: "N",
    species: "Lizardfolk",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Thunder Mage",
        weapon: "Staff",
        element: "Lightning",
        statsMin: { hp: 345, atk: 18, def: 22, matk: 39, mdef: 30 },
        statsMax: { hp: 3180, atk: 165, def: 200, matk: 360, mdef: 275 },
        skills: [
          {
            level: 1,
            id: "thunder",
            name: "Thunder",
            description: "Lightning damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 30,
            id: "giga_thunder",
            name: "Giga Thunder",
            description: "x2 lightning damage",
            trigger: "pincer",
            frequency: 35,
            power: 2,
          },
        ],
      },
    ],
  },

  puprope: {
    id: "puprope",
    name: "Pupropé",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Thunder Dancer",
        weapon: "Spear",
        element: "Lightning",
        statsMin: { hp: 430, atk: 32, def: 28, matk: 40, mdef: 34 },
        statsMax: { hp: 3950, atk: 295, def: 255, matk: 370, mdef: 310 },
        skills: [
          {
            level: 1,
            id: "megaspear",
            name: "Megaspear",
            description: "x1 spear damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 25,
            id: "thunder",
            name: "Thunder",
            description: "Lightning damage",
            trigger: "pincer",
            frequency: 40,
          },
        ],
      },
    ],
  },

  zerro: {
    id: "zerro",
    name: "Zerro",
    rarity: "S",
    verified: "N",
    species: "Human",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Storm Knight",
        weapon: "Sword",
        element: "Lightning",
        statsMin: { hp: 390, atk: 35, def: 30, matk: 24, mdef: 26 },
        statsMax: { hp: 3600, atk: 320, def: 275, matk: 220, mdef: 240 },
        skills: [
          {
            level: 1,
            id: "megasword",
            name: "Megasword",
            description: "x1 sword damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 30,
            id: "thunder_blade",
            name: "Thunder Blade",
            description: "Lightning sword damage",
            trigger: "pincer",
            frequency: 40,
          },
        ],
      },
    ],
  },

  amerpact: {
    id: "amerpact",
    name: "A'merpact",
    rarity: "S",
    verified: "N",
    species: "Beastfolk",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Fire Spearman",
        weapon: "Spear",
        element: "Fire",
        statsMin: { hp: 380, atk: 34, def: 28, matk: 22, mdef: 22 },
        statsMax: { hp: 3500, atk: 315, def: 255, matk: 200, mdef: 200 },
        skills: [
          {
            level: 1,
            id: "megaspear",
            name: "Megaspear",
            description: "x1 spear damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 25,
            id: "fire",
            name: "Fire",
            description: "Fire damage",
            trigger: "pincer",
            frequency: 40,
          },
        ],
      },
    ],
  },

  pizfer: {
    id: "pizfer",
    name: "Piz'fer",
    rarity: "S",
    verified: "N",
    species: "Lizardfolk",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Flame Guard",
        weapon: "Sword",
        element: "Fire",
        statsMin: { hp: 400, atk: 33, def: 32, matk: 20, mdef: 24 },
        statsMax: { hp: 3680, atk: 305, def: 295, matk: 185, mdef: 220 },
        skills: [
          {
            level: 1,
            id: "megasword",
            name: "Megasword",
            description: "x1 sword damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 30,
            id: "fire_guard",
            name: "Fire Guard",
            description: "DEF + fire resist",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
    ],
  },

  jennish: {
    id: "jennish",
    name: "Jennish",
    rarity: "S",
    verified: "N",
    species: "Human",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Dark Archer",
        weapon: "Bow",
        element: "Darkness",
        statsMin: { hp: 355, atk: 36, def: 22, matk: 26, mdef: 24 },
        statsMax: { hp: 3250, atk: 330, def: 200, matk: 240, mdef: 220 },
        skills: [
          {
            level: 1,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 25,
            id: "shadow",
            name: "Shadow",
            description: "Darkness damage",
            trigger: "pincer",
            frequency: 40,
          },
        ],
      },
    ],
  },

  pupropu: {
    id: "pupropu",
    name: "Pupropu",
    rarity: "S",
    verified: "N",
    species: "Beastfolk",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Shadow Mage",
        weapon: "Staff",
        element: "Darkness",
        statsMin: { hp: 340, atk: 17, def: 21, matk: 40, mdef: 32 },
        statsMax: { hp: 3120, atk: 155, def: 190, matk: 370, mdef: 295 },
        skills: [
          {
            level: 1,
            id: "shadow",
            name: "Shadow",
            description: "Darkness damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 30,
            id: "death",
            name: "Death",
            description: "Chance instant KO",
            trigger: "chain",
            frequency: 15,
          },
        ],
      },
    ],
  },

  kirue: {
    id: "kirue",
    name: "Kir'ue",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Graviton Mage",
        weapon: "Staff",
        element: "Graviton",
        statsMin: { hp: 410, atk: 20, def: 28, matk: 45, mdef: 36 },
        statsMax: { hp: 3780, atk: 180, def: 255, matk: 410, mdef: 330 },
        skills: [
          {
            level: 1,
            id: "graviton",
            name: "Graviton",
            description: "Graviton damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 30,
            id: "crush",
            name: "Crush",
            description: "Area graviton damage",
            trigger: "chain",
            frequency: 35,
          },
        ],
      },
    ],
  },

  sayu: {
    id: "sayu",
    name: "Sayu",
    rarity: "S",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Gravity Blade",
        weapon: "Sword",
        element: "Graviton",
        statsMin: { hp: 375, atk: 35, def: 26, matk: 28, mdef: 24 },
        statsMax: { hp: 3450, atk: 320, def: 240, matk: 255, mdef: 220 },
        skills: [
          {
            level: 1,
            id: "megasword",
            name: "Megasword",
            description: "x1 sword damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 25,
            id: "graviton",
            name: "Graviton",
            description: "Graviton damage",
            trigger: "pincer",
            frequency: 40,
          },
        ],
      },
    ],
  },

  mogha: {
    id: "mogha",
    name: "Mogha",
    rarity: "S",
    verified: "N",
    species: "Beastfolk",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Photon Archer",
        weapon: "Bow",
        element: "Photon",
        statsMin: { hp: 350, atk: 35, def: 22, matk: 30, mdef: 26 },
        statsMax: { hp: 3220, atk: 320, def: 200, matk: 275, mdef: 240 },
        skills: [
          {
            level: 1,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 25,
            id: "photon",
            name: "Photon",
            description: "Photon damage",
            trigger: "pincer",
            frequency: 40,
          },
        ],
      },
    ],
  },

  violet: {
    id: "violet",
    name: "Violet",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Photon Mage",
        weapon: "Staff",
        element: "Photon",
        statsMin: { hp: 405, atk: 19, def: 27, matk: 44, mdef: 38 },
        statsMax: { hp: 3720, atk: 175, def: 250, matk: 405, mdef: 350 },
        skills: [
          {
            level: 1,
            id: "photon",
            name: "Photon",
            description: "Photon damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 30,
            id: "radiance",
            name: "Radiance",
            description: "Area photon damage",
            trigger: "chain",
            frequency: 35,
          },
        ],
      },
    ],
  },

  calista: {
    id: "calista",
    name: "Calista",
    rarity: "S",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Cleric",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 365, atk: 16, def: 24, matk: 36, mdef: 34 },
        statsMax: { hp: 3360, atk: 150, def: 220, matk: 330, mdef: 310 },
        skills: [
          {
            level: 1,
            id: "mega_heal",
            name: "Mega Heal",
            description: "Heal power 2",
            trigger: "chain",
            frequency: 80,
          },
          {
            level: 25,
            id: "giga_heal",
            name: "Giga Heal",
            description: "Heal power 3",
            trigger: "chain",
            frequency: 40,
          },
        ],
      },
    ],
  },

  olber: {
    id: "olber",
    name: "Olber",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "High Priest",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 420, atk: 18, def: 28, matk: 40, mdef: 38 },
        statsMax: { hp: 3850, atk: 165, def: 255, matk: 370, mdef: 350 },
        skills: [
          {
            level: 1,
            id: "giga_heal",
            name: "Giga Heal",
            description: "Heal power 3",
            trigger: "chain",
            frequency: 60,
          },
          {
            level: 30,
            id: "party_heal",
            name: "Party Heal",
            description: "Heal all allies",
            trigger: "chain",
            frequency: 35,
          },
          {
            level: 50,
            id: "revive",
            name: "Resurrection",
            description: "Revive ally",
            trigger: "equip",
          },
        ],
      },
    ],
  },

  haruhikari: {
    id: "haruhikari",
    name: "Haruhikari",
    rarity: "Z",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Fate"],
    jobs: [
      {
        jobIndex: 1,
        title: "Dawn Blade",
        weapon: "Sword",
        element: "Photon",
        statsMin: { hp: 520, atk: 48, def: 36, matk: 32, mdef: 30 },
        statsMax: { hp: 4800, atk: 440, def: 330, matk: 290, mdef: 275 },
        skills: [
          {
            level: 1,
            id: "gigasword",
            name: "Gigasword",
            description: "x2 sword damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
          {
            level: 30,
            id: "photon",
            name: "Photon",
            description: "Photon damage",
            trigger: "pincer",
            frequency: 40,
          },
          {
            level: 60,
            id: "terasword",
            name: "Terasword",
            description: "x3 sword damage",
            trigger: "pincer",
            frequency: 30,
            power: 3,
          },
        ],
      },
    ],
  },

  mizury: {
    id: "mizury",
    name: "Mizury",
    rarity: "Z",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Fate"],
    jobs: [
      {
        jobIndex: 1,
        title: "Tide Caller",
        weapon: "Staff",
        element: "Ice",
        statsMin: { hp: 500, atk: 24, def: 34, matk: 50, mdef: 42 },
        statsMax: { hp: 4600, atk: 220, def: 310, matk: 460, mdef: 385 },
        skills: [
          {
            level: 1,
            id: "blizzard",
            name: "Blizzard",
            description: "Area ice damage",
            trigger: "chain",
            frequency: 45,
          },
          {
            level: 30,
            id: "giga_heal",
            name: "Giga Heal",
            description: "Heal power 3",
            trigger: "chain",
            frequency: 40,
          },
          {
            level: 60,
            id: "absolute_zero",
            name: "Absolute Zero",
            description: "x3 ice damage",
            trigger: "pincer",
            frequency: 30,
            power: 3,
          },
        ],
      },
    ],
  },

  thirty6ais: {
    id: "thirty6ais",
    name: "36AIS",
    rarity: "SS",
    verified: "N",
    species: "Machine",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Combat Frame",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 440, atk: 38, def: 30, matk: 30, mdef: 28 },
        statsMax: { hp: 4050, atk: 350, def: 275, matk: 275, mdef: 255 },
        skills: [
          {
            level: 1,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 25,
            id: "gigabow",
            name: "Gigabow",
            description: "x2 bow damage",
            trigger: "pincer",
            frequency: 35,
            power: 2,
          },
        ],
      },
    ],
  },

  lucia: {
    id: "lucia",
    name: "Lucia",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Holy Knight",
        weapon: "Spear",
        element: "Photon",
        statsMin: { hp: 460, atk: 36, def: 34, matk: 28, mdef: 32 },
        statsMax: { hp: 4200, atk: 330, def: 310, matk: 255, mdef: 295 },
        skills: [
          {
            level: 1,
            id: "megaspear",
            name: "Megaspear",
            description: "x1 spear damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 25,
            id: "photon",
            name: "Photon",
            description: "Photon damage",
            trigger: "pincer",
            frequency: 40,
          },
          {
            level: 50,
            id: "def_up",
            name: "Defense +10%",
            description: "DEF +10% for 2 turns",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
    ],
  },

  eileen: {
    id: "eileen",
    name: "Eileen",
    rarity: "S",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Scout",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 348, atk: 35, def: 22, matk: 18, mdef: 20 },
        statsMax: { hp: 3200, atk: 320, def: 200, matk: 165, mdef: 185 },
        skills: [
          {
            level: 1,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 25,
            id: "poison_arrows",
            name: "Poison Arrows",
            description: "Bow + poison",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
    ],
  },

  clara: {
    id: "clara",
    name: "Clara",
    rarity: "S",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Medic",
        weapon: "Staff",
        element: "Healing",
        statsMin: { hp: 355, atk: 15, def: 23, matk: 35, mdef: 33 },
        statsMax: { hp: 3260, atk: 140, def: 210, matk: 320, mdef: 300 },
        skills: [
          {
            level: 1,
            id: "mega_heal",
            name: "Mega Heal",
            description: "Heal power 2",
            trigger: "chain",
            frequency: 90,
          },
          {
            level: 30,
            id: "remedy",
            name: "Remedy",
            description: "Clear status",
            trigger: "chain",
            frequency: 40,
          },
        ],
      },
    ],
  },

  maldor: {
    id: "maldor",
    name: "Maldor",
    rarity: "S",
    verified: "N",
    species: "Human",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Heavy Knight",
        weapon: "Spear",
        element: "—",
        statsMin: { hp: 430, atk: 32, def: 36, matk: 14, mdef: 22 },
        statsMax: { hp: 3950, atk: 295, def: 330, matk: 130, mdef: 200 },
        skills: [
          {
            level: 1,
            id: "megaspear",
            name: "Megaspear",
            description: "x1 spear damage",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 25,
            id: "def_up",
            name: "Defense +10%",
            description: "DEF +10% for 2 turns",
            trigger: "chain",
            frequency: 35,
          },
          {
            level: 50,
            id: "hp_up",
            name: "HP +10%",
            description: "Passive HP +10%",
            trigger: "equip",
          },
        ],
      },
    ],
  },

  sheena: {
    id: "sheena",
    name: "Sheena",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Sword Saint",
        weapon: "Sword",
        element: "—",
        statsMin: { hp: 450, atk: 42, def: 30, matk: 20, mdef: 24 },
        statsMax: { hp: 4120, atk: 385, def: 275, matk: 185, mdef: 220 },
        skills: [
          {
            level: 1,
            id: "gigasword",
            name: "Gigasword",
            description: "x2 sword damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
          {
            level: 30,
            id: "counter",
            name: "Counterattack",
            description: "x1.5 weapon damage",
            trigger: "counter",
            frequency: 35,
          },
          {
            level: 55,
            id: "terasword",
            name: "Terasword",
            description: "x3 sword damage",
            trigger: "pincer",
            frequency: 30,
            power: 3,
          },
        ],
      },
    ],
  },

  leviathan: {
    id: "leviathan",
    name: "Leviathan",
    rarity: "Z",
    verified: "N",
    species: "Monster",
    sources: ["Eidolon"],
    jobs: [
      {
        jobIndex: 1,
        title: "Sea Sovereign",
        weapon: "Staff",
        element: "Ice",
        statsMin: { hp: 600, atk: 28, def: 40, matk: 52, mdef: 44 },
        statsMax: { hp: 5500, atk: 255, def: 365, matk: 475, mdef: 400 },
        skills: [
          {
            level: 1,
            id: "blizzard",
            name: "Blizzard",
            description: "Area ice damage",
            trigger: "chain",
            frequency: 50,
          },
          {
            level: 40,
            id: "absolute_zero",
            name: "Absolute Zero",
            description: "x3 ice damage",
            trigger: "pincer",
            frequency: 30,
            power: 3,
          },
        ],
      },
    ],
  },

  bahamut: {
    id: "bahamut",
    name: "Bahamut",
    rarity: "Z",
    verified: "N",
    species: "Monster",
    sources: ["Eidolon"],
    jobs: [
      {
        jobIndex: 1,
        title: "Dragon King",
        weapon: "Sword",
        element: "Fire",
        statsMin: { hp: 620, atk: 50, def: 38, matk: 40, mdef: 36 },
        statsMax: { hp: 5700, atk: 455, def: 350, matk: 365, mdef: 330 },
        skills: [
          {
            level: 1,
            id: "gigasword",
            name: "Gigasword",
            description: "x2 sword damage",
            trigger: "pincer",
            frequency: 45,
            power: 2,
          },
          {
            level: 40,
            id: "inferno",
            name: "Inferno",
            description: "Area fire damage",
            trigger: "chain",
            frequency: 35,
          },
        ],
      },
    ],
  },

  odin: {
    id: "odin",
    name: "Odin",
    rarity: "Z",
    verified: "N",
    species: "Monster",
    sources: ["Eidolon"],
    jobs: [
      {
        jobIndex: 1,
        title: "Allfather",
        weapon: "Spear",
        element: "Lightning",
        statsMin: { hp: 580, atk: 48, def: 36, matk: 36, mdef: 34 },
        statsMax: { hp: 5350, atk: 440, def: 330, matk: 330, mdef: 310 },
        skills: [
          {
            level: 1,
            id: "gigaspear",
            name: "Gigaspear",
            description: "x2 spear damage",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
          {
            level: 40,
            id: "giga_thunder",
            name: "Giga Thunder",
            description: "x2 lightning damage",
            trigger: "pincer",
            frequency: 35,
            power: 2,
          },
        ],
      },
    ],
  },

  yukken: {
    id: "yukken",
    name: "Yukken",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Chatterbox",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 348, atk: 33, def: 30, matk: 25, mdef: 22 },
        statsMax: { hp: 3192, atk: 302, def: 275, matk: 229, mdef: 202 },
        skills: [
          {
            level: 1,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 15,
            id: "def_up",
            name: "Defense +10%",
            description: "DEF +10% 2 turns",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 35,
            id: "mega_heal",
            name: "Mega Heal",
            description: "Heal power 2",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 65,
            id: "chaos_arrows",
            name: "Chaos Arrows",
            description: "Bow + confusion",
            trigger: "chain",
            frequency: 30,
          },
        ],
      },
    ],
  },
  rikken: {
    id: "rikken",
    name: "Rikken",
    rarity: "SS",
    verified: "N",
    species: "Human",
    gender: "Female",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Persuasive",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 345, atk: 32, def: 30, matk: 26, mdef: 24 },
        statsMax: { hp: 3164, atk: 293, def: 276, matk: 238, mdef: 220 },
        skills: [
          {
            level: 1,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow",
            trigger: "pincer",
            frequency: 50,
          },
        ],
      },
    ],
  },
  harold: {
    id: "harold",
    name: "Harold",
    rarity: "A",
    verified: "N",
    species: "Human",
    gender: "Male",
    sources: ["Pact of Truth"],
    jobs: [
      {
        jobIndex: 1,
        title: "Roughrider",
        weapon: "Bow",
        element: "—",
        statsMin: { hp: 361, atk: 37, def: 26, matk: 14, mdef: 16 },
        statsMax: { hp: 3311, atk: 339, def: 238, matk: 128, mdef: 146 },
        skills: [
          {
            level: 1,
            id: "def_up",
            name: "Defense +10%",
            description: "DEF +10% 2 turns",
            trigger: "chain",
            frequency: 30,
          },
          {
            level: 15,
            id: "megabow",
            name: "Megabow",
            description: "x1 bow",
            trigger: "pincer",
            frequency: 50,
          },
          {
            level: 65,
            id: "gigabow",
            name: "Gigabow",
            description: "x2 bow",
            trigger: "pincer",
            frequency: 40,
            power: 2,
          },
        ],
      },
    ],
  },
  peyrna: {
    id: "peyrna",
    name: "Peyrna",
    rarity: "Z",
    verified: "N",
    species: "Stonefolk",
    gender: "Female",
    sources: ["Pact of Truth", "Pact of Fate"],
    jobs: [
      {
        jobIndex: 1,
        title: "The Ashen",
        weapon: "Sword",
        element: "Graviton",
        statsMin: { hp: 557, atk: 38, def: 35, matk: 44, mdef: 39 },
        statsMax: { hp: 5109, atk: 345, def: 318, matk: 400, mdef: 354 },
        skills: [
          {
            level: 1,
            id: "crushing_blade",
            name: "Crushing Blade",
            description: "x1 graviton and x0.5 sword damage",
            trigger: "pincer",
            frequency: 80,
            damageComponents: [
              { type: "magic", element: "Graviton", multiplier: 1 },
              { type: "weapon", multiplier: 0.5 },
            ],
          },
          {
            level: 30,
            id: "anti_photon_shield",
            name: "Anti-Photon Shield",
            description: "Reduce photon damage received by 40%",
            trigger: "equip",
            target: "self",
          },
          {
            level: 50,
            id: "augment_magic",
            name: "Augment Magic, All",
            description: "All allies' MATK +30% for 1 turn (3 charges)",
            trigger: "tap",
            target: "all",
          },
          {
            level: 80,
            id: "augment_magic_defense",
            name: "Augment Magic Defense, All",
            description: "All allies' MDEF +30% for 1 turn (3 charges)",
            trigger: "tap",
            target: "all",
          },
        ],
      },
      {
        jobIndex: 2,
        title: "The Solitary",
        weapon: "Sword",
        element: "Graviton",
        statsMin: { hp: 584, atk: 41, def: 38, matk: 46, mdef: 42 },
        statsMax: { hp: 5357, atk: 372, def: 345, matk: 418, mdef: 381 },
        skills: [
          {
            level: 1,
            id: "gravity_blade",
            name: "Gravity Blade",
            description: "x2 graviton and x0.7 sword damage",
            trigger: "pincer",
            frequency: 60,
            damageComponents: [
              { type: "magic", element: "Graviton", multiplier: 2 },
              { type: "weapon", multiplier: 0.7 },
            ],
          },
          {
            level: 30,
            id: "atk_eq",
            name: "Attack +10%, Equip",
            description: "ATK +10%",
            trigger: "equip",
          },
          {
            level: 50,
            id: "augment_attack",
            name: "Augment Attack, All",
            description: "All allies' ATK +30% for 1 turn (3 charges)",
            trigger: "tap",
            target: "all",
          },
          {
            level: 80,
            id: "augment_defense",
            name: "Augment Defense, All",
            description: "All allies' DEF +30% for 1 turn (3 charges)",
            trigger: "tap",
            target: "all",
          },
        ],
        unlockCost: {
          coins: 14000,
          items: [
            { id: "forlorn_stone", qty: 15 },
            { id: "graviton_ring", qty: 15 },
            { id: "dark_matter", qty: 3 },
          ],
        },
      },
      {
        jobIndex: 3,
        title: "The Beloved",
        weapon: "Sword",
        element: "Graviton",
        statsMin: { hp: 643, atk: 44, def: 41, matk: 49, mdef: 45 },
        statsMax: { hp: 5898, atk: 400, def: 372, matk: 445, mdef: 409 },
        skills: [
          {
            level: 1,
            id: "control_time_4",
            name: "Control Time +4 Sec, Self",
            description: "Control time +4 sec",
            trigger: "equip",
            target: "self",
          },
          {
            level: 30,
            id: "crush_sword_column",
            name: "Crush & Sword, Pincer Column",
            description: "x0.8 graviton and x0.8 sword damage",
            trigger: "pincer",
            frequency: 30,
            damageComponents: [
              { type: "magic", element: "Graviton", multiplier: 0.8 },
              { type: "weapon", multiplier: 0.8 },
            ],
          },
          {
            level: 50,
            id: "gravity_sword_row",
            name: "Gravity & Sword, Pincer Row",
            description: "x1.6 graviton and x1.6 sword damage",
            trigger: "pincer",
            frequency: 30,
            damageComponents: [
              { type: "magic", element: "Graviton", multiplier: 1.6 },
              { type: "weapon", multiplier: 1.6 },
            ],
          },
          {
            level: 80,
            id: "supergravity_sword",
            name: "Supergravity & Sword",
            description: "x2.6 graviton and x2.6 sword damage",
            trigger: "pincer",
            frequency: 30,
            damageComponents: [
              { type: "magic", element: "Graviton", multiplier: 2.6 },
              { type: "weapon", multiplier: 2.6 },
            ],
          },
        ],
        unlockCost: {
          coins: 28000,
          items: [
            { id: "shell_of_madness", qty: 15 },
            { id: "heartwood_sword", qty: 1 },
            { id: "dark_star", qty: 50 },
          ],
        },
      },
    ],
  },
};

const WIKI_ADVENTURERS: Record<string, Omit<CharacterDef, "verified">> = {
  "bahl": {
    id: "bahl",
    name: "Bahl",
    rarity: "B",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 321,
          atk: 31,
          def: 26,
          matk: 13,
          mdef: 15
        },
        statsMax: {
          hp: 3210,
          atk: 310,
          def: 260,
          matk: 130,
          mdef: 150
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 2000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 385,
          atk: 33,
          def: 31,
          matk: 16,
          mdef: 18
        },
        statsMax: {
          hp: 3850,
          atk: 330,
          def: 310,
          matk: 160,
          mdef: 180
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1.05,
          matk: 1,
          mdef: 0.95
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 442,
          atk: 39,
          def: 32,
          matk: 19,
          mdef: 21
        },
        statsMax: {
          hp: 4420,
          atk: 390,
          def: 320,
          matk: 190,
          mdef: 210
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1.05,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "samatha": {
    id: "samatha",
    name: "Samatha",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Lightning",
        statsMin: {
          hp: 456,
          atk: 30,
          def: 26,
          matk: 38,
          mdef: 33
        },
        statsMax: {
          hp: 4560,
          atk: 300,
          def: 260,
          matk: 380,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 595,
          atk: 43,
          def: 35,
          matk: 20,
          mdef: 25
        },
        statsMax: {
          hp: 5950,
          atk: 430,
          def: 350,
          matk: 200,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "Lightning",
        statsMin: {
          hp: 575,
          atk: 35,
          def: 34,
          matk: 43,
          mdef: 38
        },
        statsMax: {
          hp: 5750,
          atk: 350,
          def: 340,
          matk: 430,
          mdef: 380
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "grace": {
    id: "grace",
    name: "Grace",
    rarity: "B",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 318,
          atk: 31,
          def: 24,
          matk: 15,
          mdef: 17
        },
        statsMax: {
          hp: 3180,
          atk: 310,
          def: 240,
          matk: 150,
          mdef: 170
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 379,
          atk: 34,
          def: 27,
          matk: 18,
          mdef: 20
        },
        statsMax: {
          hp: 3790,
          atk: 340,
          def: 270,
          matk: 180,
          mdef: 200
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 437,
          atk: 37,
          def: 30,
          matk: 21,
          mdef: 23
        },
        statsMax: {
          hp: 4370,
          atk: 370,
          def: 300,
          matk: 210,
          mdef: 230
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "kuscah": {
    id: "kuscah",
    name: "Kuscah",
    rarity: "B",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 293,
          atk: 12,
          def: 17,
          matk: 29,
          mdef: 26
        },
        statsMax: {
          hp: 2930,
          atk: 120,
          def: 170,
          matk: 290,
          mdef: 260
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 2000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 353,
          atk: 15,
          def: 20,
          matk: 32,
          mdef: 29
        },
        statsMax: {
          hp: 3530,
          atk: 150,
          def: 200,
          matk: 320,
          mdef: 290
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 417,
          atk: 18,
          def: 23,
          matk: 35,
          mdef: 32
        },
        statsMax: {
          hp: 4170,
          atk: 180,
          def: 230,
          matk: 350,
          mdef: 320
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ellvern": {
    id: "ellvern",
    name: "Ellvern",
    rarity: "S",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 348,
          atk: 21,
          def: 21,
          matk: 36,
          mdef: 29
        },
        statsMax: {
          hp: 3480,
          atk: 210,
          def: 210,
          matk: 360,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 457,
          atk: 34,
          def: 29,
          matk: 25,
          mdef: 22
        },
        statsMax: {
          hp: 4570,
          atk: 340,
          def: 290,
          matk: 250,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 469,
          atk: 27,
          def: 27,
          matk: 42,
          mdef: 35
        },
        statsMax: {
          hp: 4690,
          atk: 270,
          def: 270,
          matk: 420,
          mdef: 350
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "a_merpact": {
    id: "a_merpact",
    name: "A'merpact",
    rarity: "A",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 361,
          atk: 17,
          def: 20,
          matk: 37,
          mdef: 27
        },
        statsMax: {
          hp: 3610,
          atk: 170,
          def: 200,
          matk: 370,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 425,
          atk: 20,
          def: 23,
          matk: 40,
          mdef: 30
        },
        statsMax: {
          hp: 4250,
          atk: 200,
          def: 230,
          matk: 400,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 489,
          atk: 23,
          def: 26,
          matk: 43,
          mdef: 33
        },
        statsMax: {
          hp: 4890,
          atk: 230,
          def: 260,
          matk: 430,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "djugan": {
    id: "djugan",
    name: "Djugan",
    rarity: "S",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 462,
          atk: 32,
          def: 27,
          matk: 19,
          mdef: 18
        },
        statsMax: {
          hp: 4620,
          atk: 320,
          def: 270,
          matk: 190,
          mdef: 180
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 525,
          atk: 35,
          def: 30,
          matk: 22,
          mdef: 21
        },
        statsMax: {
          hp: 5250,
          atk: 350,
          def: 300,
          matk: 220,
          mdef: 210
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 582,
          atk: 38,
          def: 33,
          matk: 25,
          mdef: 24
        },
        statsMax: {
          hp: 5820,
          atk: 380,
          def: 330,
          matk: 250,
          mdef: 240
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "olber": {
    id: "olber",
    name: "Olber",
    rarity: "SS",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 446,
          atk: 35,
          def: 32,
          matk: 25,
          mdef: 21
        },
        statsMax: {
          hp: 4460,
          atk: 350,
          def: 320,
          matk: 250,
          mdef: 210
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 438,
          atk: 23,
          def: 25,
          matk: 37,
          mdef: 36
        },
        statsMax: {
          hp: 4380,
          atk: 230,
          def: 250,
          matk: 370,
          mdef: 360
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 568,
          atk: 41,
          def: 38,
          matk: 31,
          mdef: 27
        },
        statsMax: {
          hp: 5680,
          atk: 410,
          def: 380,
          matk: 310,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "sheena": {
    id: "sheena",
    name: "Sheena",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 372,
          atk: 38,
          def: 28,
          matk: 31,
          mdef: 23
        },
        statsMax: {
          hp: 3720,
          atk: 380,
          def: 280,
          matk: 310,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 0.9,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 432,
          atk: 41,
          def: 31,
          matk: 34,
          mdef: 26
        },
        statsMax: {
          hp: 4320,
          atk: 410,
          def: 310,
          matk: 340,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 0.9,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 492,
          atk: 44,
          def: 34,
          matk: 37,
          mdef: 29
        },
        statsMax: {
          hp: 4920,
          atk: 440,
          def: 340,
          matk: 370,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 0.9,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ma_curi": {
    id: "ma_curi",
    name: "Ma'curi",
    rarity: "B",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 318,
          atk: 40,
          def: 25,
          matk: 12,
          mdef: 14
        },
        statsMax: {
          hp: 3180,
          atk: 400,
          def: 250,
          matk: 120,
          mdef: 140
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 379,
          atk: 41,
          def: 28,
          matk: 15,
          mdef: 18
        },
        statsMax: {
          hp: 3790,
          atk: 410,
          def: 280,
          matk: 150,
          mdef: 180
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 436,
          atk: 43,
          def: 31,
          matk: 18,
          mdef: 21
        },
        statsMax: {
          hp: 4360,
          atk: 430,
          def: 310,
          matk: 180,
          mdef: 210
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "gatz": {
    id: "gatz",
    name: "Gatz",
    rarity: "S",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 341,
          atk: 33,
          def: 27,
          matk: 22,
          mdef: 30
        },
        statsMax: {
          hp: 3410,
          atk: 330,
          def: 270,
          matk: 220,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 400,
          atk: 36,
          def: 30,
          matk: 25,
          mdef: 34
        },
        statsMax: {
          hp: 4000,
          atk: 360,
          def: 300,
          matk: 250,
          mdef: 340
        },
        statCoefficients: {
          hp: 1,
          atk: 0.95,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 460,
          atk: 41,
          def: 33,
          matk: 28,
          mdef: 38
        },
        statsMax: {
          hp: 4600,
          atk: 410,
          def: 330,
          matk: 280,
          mdef: 380
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "eileen": {
    id: "eileen",
    name: "Eileen",
    rarity: "A",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 298,
          atk: 20,
          def: 18,
          matk: 34,
          mdef: 27
        },
        statsMax: {
          hp: 2980,
          atk: 200,
          def: 180,
          matk: 340,
          mdef: 270
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 357,
          atk: 23,
          def: 21,
          matk: 37,
          mdef: 30
        },
        statsMax: {
          hp: 3570,
          atk: 230,
          def: 210,
          matk: 370,
          mdef: 300
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 406,
          atk: 26,
          def: 24,
          matk: 40,
          mdef: 34
        },
        statsMax: {
          hp: 4060,
          atk: 260,
          def: 240,
          matk: 400,
          mdef: 340
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "yukken": {
    id: "yukken",
    name: "Yukken",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 348,
          atk: 33,
          def: 30,
          matk: 25,
          mdef: 22
        },
        statsMax: {
          hp: 3480,
          atk: 330,
          def: 300,
          matk: 250,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 4500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 408,
          atk: 36,
          def: 33,
          matk: 28,
          mdef: 25
        },
        statsMax: {
          hp: 4080,
          atk: 360,
          def: 330,
          matk: 280,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 5000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 467,
          atk: 39,
          def: 36,
          matk: 31,
          mdef: 28
        },
        statsMax: {
          hp: 4670,
          atk: 390,
          def: 360,
          matk: 310,
          mdef: 280
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 5000000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "rikken": {
    id: "rikken",
    name: "Rikken",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 345,
          atk: 32,
          def: 30,
          matk: 26,
          mdef: 24
        },
        statsMax: {
          hp: 3450,
          atk: 320,
          def: 300,
          matk: 260,
          mdef: 240
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 406,
          atk: 35,
          def: 33,
          matk: 29,
          mdef: 27
        },
        statsMax: {
          hp: 4060,
          atk: 350,
          def: 330,
          matk: 290,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 468,
          atk: 38,
          def: 36,
          matk: 32,
          mdef: 30
        },
        statsMax: {
          hp: 4680,
          atk: 380,
          def: 360,
          matk: 320,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "ka_pori": {
    id: "ka_pori",
    name: "Ka'pori",
    rarity: "A",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 436,
          atk: 31,
          def: 28,
          matk: 12,
          mdef: 12
        },
        statsMax: {
          hp: 4360,
          atk: 310,
          def: 280,
          matk: 120,
          mdef: 120
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3500000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 491,
          atk: 34,
          def: 31,
          matk: 15,
          mdef: 15
        },
        statsMax: {
          hp: 4910,
          atk: 340,
          def: 310,
          matk: 150,
          mdef: 150
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 558,
          atk: 37,
          def: 34,
          matk: 18,
          mdef: 18
        },
        statsMax: {
          hp: 5580,
          atk: 370,
          def: 340,
          matk: 180,
          mdef: 180
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "sh_berdan": {
    id: "sh_berdan",
    name: "Sh'berdan",
    rarity: "B",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 317,
          atk: 29,
          def: 24,
          matk: 29,
          mdef: 21
        },
        statsMax: {
          hp: 3170,
          atk: 290,
          def: 240,
          matk: 290,
          mdef: 210
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 371,
          atk: 32,
          def: 27,
          matk: 32,
          mdef: 24
        },
        statsMax: {
          hp: 3710,
          atk: 320,
          def: 270,
          matk: 320,
          mdef: 240
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 434,
          atk: 35,
          def: 30,
          matk: 35,
          mdef: 27
        },
        statsMax: {
          hp: 4340,
          atk: 350,
          def: 300,
          matk: 350,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "s_naip": {
    id: "s_naip",
    name: "S'naip",
    rarity: "A",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 364,
          atk: 40,
          def: 24,
          matk: 12,
          mdef: 15
        },
        statsMax: {
          hp: 3640,
          atk: 400,
          def: 240,
          matk: 120,
          mdef: 150
        },
        statCoefficients: {
          hp: 1,
          atk: 1.05,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 421,
          atk: 43,
          def: 27,
          matk: 15,
          mdef: 18
        },
        statsMax: {
          hp: 4210,
          atk: 430,
          def: 270,
          matk: 150,
          mdef: 180
        },
        statCoefficients: {
          hp: 1,
          atk: 1.05,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 487,
          atk: 46,
          def: 30,
          matk: 19,
          mdef: 22
        },
        statsMax: {
          hp: 4870,
          atk: 460,
          def: 300,
          matk: 190,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1.05,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "r_zonand": {
    id: "r_zonand",
    name: "R'zonand",
    rarity: "A",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 362,
          atk: 19,
          def: 16,
          matk: 33,
          mdef: 27
        },
        statsMax: {
          hp: 3620,
          atk: 190,
          def: 160,
          matk: 330,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.9,
          matk: 1.05,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 423,
          atk: 22,
          def: 19,
          matk: 36,
          mdef: 30
        },
        statsMax: {
          hp: 4230,
          atk: 220,
          def: 190,
          matk: 360,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.9,
          matk: 1.05,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 483,
          atk: 25,
          def: 22,
          matk: 39,
          mdef: 33
        },
        statsMax: {
          hp: 4830,
          atk: 250,
          def: 220,
          matk: 390,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.9,
          matk: 1.05,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "gugba": {
    id: "gugba",
    name: "Gugba",
    rarity: "SS",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 531,
          atk: 41,
          def: 29,
          matk: 19,
          mdef: 17
        },
        statsMax: {
          hp: 5310,
          atk: 410,
          def: 290,
          matk: 190,
          mdef: 170
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 593,
          atk: 44,
          def: 32,
          matk: 22,
          mdef: 20
        },
        statsMax: {
          hp: 5930,
          atk: 440,
          def: 320,
          matk: 220,
          mdef: 200
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 653,
          atk: 47,
          def: 35,
          matk: 25,
          mdef: 23
        },
        statsMax: {
          hp: 6530,
          atk: 470,
          def: 350,
          matk: 250,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "zuzu": {
    id: "zuzu",
    name: "Zuzu",
    rarity: "S",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 423,
          atk: 40,
          def: 30,
          matk: 19,
          mdef: 19
        },
        statsMax: {
          hp: 4230,
          atk: 400,
          def: 300,
          matk: 190,
          mdef: 190
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 489,
          atk: 43,
          def: 33,
          matk: 22,
          mdef: 22
        },
        statsMax: {
          hp: 4890,
          atk: 430,
          def: 330,
          matk: 220,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 543,
          atk: 46,
          def: 35,
          matk: 25,
          mdef: 25
        },
        statsMax: {
          hp: 5430,
          atk: 460,
          def: 350,
          matk: 250,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "gaiga": {
    id: "gaiga",
    name: "Gaiga",
    rarity: "SS",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Darkness",
        statsMin: {
          hp: 412,
          atk: 30,
          def: 27,
          matk: 38,
          mdef: 31
        },
        statsMax: {
          hp: 4120,
          atk: 300,
          def: 270,
          matk: 380,
          mdef: 310
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Darkness",
        statsMin: {
          hp: 473,
          atk: 33,
          def: 35,
          matk: 37,
          mdef: 30
        },
        statsMax: {
          hp: 4730,
          atk: 330,
          def: 350,
          matk: 370,
          mdef: 300
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Darkness",
        statsMin: {
          hp: 539,
          atk: 36,
          def: 38,
          matk: 40,
          mdef: 33
        },
        statsMax: {
          hp: 5390,
          atk: 360,
          def: 380,
          matk: 400,
          mdef: 330
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "kana": {
    id: "kana",
    name: "Kana",
    rarity: "A",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 293,
          atk: 19,
          def: 17,
          matk: 34,
          mdef: 28
        },
        statsMax: {
          hp: 2930,
          atk: 190,
          def: 170,
          matk: 340,
          mdef: 280
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 355,
          atk: 22,
          def: 20,
          matk: 37,
          mdef: 31
        },
        statsMax: {
          hp: 3550,
          atk: 220,
          def: 200,
          matk: 370,
          mdef: 310
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 411,
          atk: 25,
          def: 23,
          matk: 40,
          mdef: 34
        },
        statsMax: {
          hp: 4110,
          atk: 250,
          def: 230,
          matk: 400,
          mdef: 340
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "gegonago": {
    id: "gegonago",
    name: "Gegonago",
    rarity: "S",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 381,
          atk: 21,
          def: 20,
          matk: 36,
          mdef: 28
        },
        statsMax: {
          hp: 3810,
          atk: 210,
          def: 200,
          matk: 360,
          mdef: 280
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 450,
          atk: 37,
          def: 26,
          matk: 18,
          mdef: 19
        },
        statsMax: {
          hp: 4500,
          atk: 370,
          def: 260,
          matk: 180,
          mdef: 190
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 501,
          atk: 26,
          def: 26,
          matk: 40,
          mdef: 34
        },
        statsMax: {
          hp: 5010,
          atk: 260,
          def: 260,
          matk: 400,
          mdef: 340
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "amina": {
    id: "amina",
    name: "Amina",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 361,
          atk: 21,
          def: 22,
          matk: 42,
          mdef: 39
        },
        statsMax: {
          hp: 3610,
          atk: 210,
          def: 220,
          matk: 420,
          mdef: 390
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 425,
          atk: 24,
          def: 25,
          matk: 45,
          mdef: 42
        },
        statsMax: {
          hp: 4250,
          atk: 240,
          def: 250,
          matk: 450,
          mdef: 420
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 485,
          atk: 27,
          def: 28,
          matk: 48,
          mdef: 45
        },
        statsMax: {
          hp: 4850,
          atk: 270,
          def: 280,
          matk: 480,
          mdef: 450
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "a_misandra": {
    id: "a_misandra",
    name: "A'misandra",
    rarity: "SS",
    species: "Lizardfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 379,
          atk: 21,
          def: 23,
          matk: 42,
          mdef: 38
        },
        statsMax: {
          hp: 3790,
          atk: 210,
          def: 230,
          matk: 420,
          mdef: 380
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 437,
          atk: 24,
          def: 26,
          matk: 45,
          mdef: 41
        },
        statsMax: {
          hp: 4370,
          atk: 240,
          def: 260,
          matk: 450,
          mdef: 410
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 490,
          atk: 27,
          def: 29,
          matk: 48,
          mdef: 44
        },
        statsMax: {
          hp: 4900,
          atk: 270,
          def: 290,
          matk: 480,
          mdef: 440
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "amimari": {
    id: "amimari",
    name: "Amimari",
    rarity: "SS",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 364,
          atk: 22,
          def: 22,
          matk: 41,
          mdef: 35
        },
        statsMax: {
          hp: 3640,
          atk: 220,
          def: 220,
          matk: 410,
          mdef: 350
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 428,
          atk: 35,
          def: 32,
          matk: 20,
          mdef: 22
        },
        statsMax: {
          hp: 4280,
          atk: 350,
          def: 320,
          matk: 200,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 484,
          atk: 32,
          def: 30,
          matk: 47,
          mdef: 41
        },
        statsMax: {
          hp: 4840,
          atk: 320,
          def: 300,
          matk: 470,
          mdef: 410
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "amazora": {
    id: "amazora",
    name: "Amazora",
    rarity: "B",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Fire",
        statsMin: {
          hp: 323,
          atk: 25,
          def: 24,
          matk: 31,
          mdef: 24
        },
        statsMax: {
          hp: 3230,
          atk: 250,
          def: 240,
          matk: 310,
          mdef: 240
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "Fire",
        statsMin: {
          hp: 384,
          atk: 27,
          def: 28,
          matk: 37,
          mdef: 26
        },
        statsMax: {
          hp: 3840,
          atk: 270,
          def: 280,
          matk: 370,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "Fire",
        statsMin: {
          hp: 447,
          atk: 36,
          def: 29,
          matk: 37,
          mdef: 29
        },
        statsMax: {
          hp: 4470,
          atk: 360,
          def: 290,
          matk: 370,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ba_gunar": {
    id: "ba_gunar",
    name: "Ba'gunar",
    rarity: "B",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Lightning",
        statsMin: {
          hp: 358,
          atk: 24,
          def: 23,
          matk: 30,
          mdef: 24
        },
        statsMax: {
          hp: 3580,
          atk: 240,
          def: 230,
          matk: 300,
          mdef: 240
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "Lightning",
        statsMin: {
          hp: 416,
          atk: 28,
          def: 28,
          matk: 32,
          mdef: 23
        },
        statsMax: {
          hp: 4160,
          atk: 280,
          def: 280,
          matk: 320,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "Lightning",
        statsMin: {
          hp: 476,
          atk: 31,
          def: 31,
          matk: 35,
          mdef: 26
        },
        statsMax: {
          hp: 4760,
          atk: 310,
          def: 310,
          matk: 350,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "burbaba": {
    id: "burbaba",
    name: "Burbaba",
    rarity: "A",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 320,
          atk: 32,
          def: 28,
          matk: 14,
          mdef: 14
        },
        statsMax: {
          hp: 3200,
          atk: 320,
          def: 280,
          matk: 140,
          mdef: 140
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 381,
          atk: 35,
          def: 31,
          matk: 17,
          mdef: 17
        },
        statsMax: {
          hp: 3810,
          atk: 350,
          def: 310,
          matk: 170,
          mdef: 170
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 448,
          atk: 38,
          def: 34,
          matk: 20,
          mdef: 20
        },
        statsMax: {
          hp: 4480,
          atk: 380,
          def: 340,
          matk: 200,
          mdef: 200
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "zan": {
    id: "zan",
    name: "Zan",
    rarity: "B",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 328,
          atk: 29,
          def: 23,
          matk: 29,
          mdef: 22
        },
        statsMax: {
          hp: 3280,
          atk: 290,
          def: 230,
          matk: 290,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.8
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 389,
          atk: 32,
          def: 26,
          matk: 32,
          mdef: 25
        },
        statsMax: {
          hp: 3890,
          atk: 320,
          def: 260,
          matk: 320,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.8
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 447,
          atk: 35,
          def: 29,
          matk: 35,
          mdef: 28
        },
        statsMax: {
          hp: 4470,
          atk: 350,
          def: 290,
          matk: 350,
          mdef: 280
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.8
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "czekras": {
    id: "czekras",
    name: "Czekras",
    rarity: "SS",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Ice",
        statsMin: {
          hp: 443,
          atk: 31,
          def: 26,
          matk: 38,
          mdef: 32
        },
        statsMax: {
          hp: 4430,
          atk: 310,
          def: 260,
          matk: 380,
          mdef: 320
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "Ice",
        statsMin: {
          hp: 510,
          atk: 33,
          def: 31,
          matk: 41,
          mdef: 34
        },
        statsMax: {
          hp: 5100,
          atk: 330,
          def: 310,
          matk: 410,
          mdef: 340
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "Ice",
        statsMin: {
          hp: 562,
          atk: 36,
          def: 34,
          matk: 44,
          mdef: 37
        },
        statsMax: {
          hp: 5620,
          atk: 360,
          def: 340,
          matk: 440,
          mdef: 370
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ra_prow": {
    id: "ra_prow",
    name: "Ra'prow",
    rarity: "B",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 365,
          atk: 30,
          def: 25,
          matk: 13,
          mdef: 14
        },
        statsMax: {
          hp: 3650,
          atk: 300,
          def: 250,
          matk: 130,
          mdef: 140
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 428,
          atk: 33,
          def: 28,
          matk: 16,
          mdef: 17
        },
        statsMax: {
          hp: 4280,
          atk: 330,
          def: 280,
          matk: 160,
          mdef: 170
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 484,
          atk: 35,
          def: 31,
          matk: 19,
          mdef: 20
        },
        statsMax: {
          hp: 4840,
          atk: 350,
          def: 310,
          matk: 190,
          mdef: 200
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "zenzoze": {
    id: "zenzoze",
    name: "Zenzoze",
    rarity: "B",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Darkness",
        statsMin: {
          hp: 347,
          atk: 25,
          def: 23,
          matk: 31,
          mdef: 24
        },
        statsMax: {
          hp: 3470,
          atk: 250,
          def: 230,
          matk: 310,
          mdef: 240
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "Darkness",
        statsMin: {
          hp: 431,
          atk: 27,
          def: 23,
          matk: 32,
          mdef: 22
        },
        statsMax: {
          hp: 4310,
          atk: 270,
          def: 230,
          matk: 320,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "Darkness",
        statsMin: {
          hp: 496,
          atk: 30,
          def: 26,
          matk: 35,
          mdef: 25
        },
        statsMax: {
          hp: 4960,
          atk: 300,
          def: 260,
          matk: 350,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "koko": {
    id: "koko",
    name: "Koko",
    rarity: "SS",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Fire",
        statsMin: {
          hp: 494,
          atk: 29,
          def: 25,
          matk: 39,
          mdef: 31
        },
        statsMax: {
          hp: 4940,
          atk: 290,
          def: 250,
          matk: 390,
          mdef: 310
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "Fire",
        statsMin: {
          hp: 586,
          atk: 34,
          def: 29,
          matk: 40,
          mdef: 33
        },
        statsMax: {
          hp: 5860,
          atk: 340,
          def: 290,
          matk: 400,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "Fire",
        statsMin: {
          hp: 641,
          atk: 36,
          def: 32,
          matk: 42,
          mdef: 36
        },
        statsMax: {
          hp: 6410,
          atk: 360,
          def: 320,
          matk: 420,
          mdef: 360
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "alika": {
    id: "alika",
    name: "Alika",
    rarity: "S",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Lightning",
        statsMin: {
          hp: 343,
          atk: 27,
          def: 24,
          matk: 35,
          mdef: 29
        },
        statsMax: {
          hp: 3430,
          atk: 270,
          def: 240,
          matk: 350,
          mdef: 290
        },
        statCoefficients: {
          hp: 0.8,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 0.8
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Lightning",
        statsMin: {
          hp: 406,
          atk: 27,
          def: 27,
          matk: 36,
          mdef: 32
        },
        statsMax: {
          hp: 4060,
          atk: 270,
          def: 270,
          matk: 360,
          mdef: 320
        },
        statCoefficients: {
          hp: 1,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Lightning",
        statsMin: {
          hp: 510,
          atk: 30,
          def: 30,
          matk: 39,
          mdef: 33
        },
        statsMax: {
          hp: 5100,
          atk: 300,
          def: 300,
          matk: 390,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "o_pari": {
    id: "o_pari",
    name: "O'pari",
    rarity: "B",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Fire",
        statsMin: {
          hp: 284,
          atk: 24,
          def: 24,
          matk: 30,
          mdef: 25
        },
        statsMax: {
          hp: 2840,
          atk: 240,
          def: 240,
          matk: 300,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Fire",
        statsMin: {
          hp: 349,
          atk: 28,
          def: 31,
          matk: 32,
          mdef: 23
        },
        statsMax: {
          hp: 3490,
          atk: 280,
          def: 310,
          matk: 320,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Fire",
        statsMin: {
          hp: 401,
          atk: 31,
          def: 34,
          matk: 35,
          mdef: 26
        },
        statsMax: {
          hp: 4010,
          atk: 310,
          def: 340,
          matk: 350,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "gigojago": {
    id: "gigojago",
    name: "Gigojago",
    rarity: "B",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Ice",
        statsMin: {
          hp: 382,
          atk: 24,
          def: 23,
          matk: 32,
          mdef: 23
        },
        statsMax: {
          hp: 3820,
          atk: 240,
          def: 230,
          matk: 320,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 412,
          atk: 19,
          def: 22,
          matk: 38,
          mdef: 29
        },
        statsMax: {
          hp: 4120,
          atk: 190,
          def: 220,
          matk: 380,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Ice",
        statsMin: {
          hp: 502,
          atk: 30,
          def: 29,
          matk: 38,
          mdef: 29
        },
        statsMax: {
          hp: 5020,
          atk: 300,
          def: 290,
          matk: 380,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "manmer": {
    id: "manmer",
    name: "Manmer",
    rarity: "A",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 332,
          atk: 31,
          def: 29,
          matk: 14,
          mdef: 17
        },
        statsMax: {
          hp: 3320,
          atk: 310,
          def: 290,
          matk: 140,
          mdef: 170
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 3500000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 429,
          atk: 21,
          def: 19,
          matk: 34,
          mdef: 29
        },
        statsMax: {
          hp: 4290,
          atk: 210,
          def: 190,
          matk: 340,
          mdef: 290
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 4000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 443,
          atk: 37,
          def: 35,
          matk: 20,
          mdef: 23
        },
        statsMax: {
          hp: 4430,
          atk: 370,
          def: 350,
          matk: 200,
          mdef: 230
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 4000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "korin": {
    id: "korin",
    name: "Korin",
    rarity: "A",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 317,
          atk: 30,
          def: 25,
          matk: 25,
          mdef: 21
        },
        statsMax: {
          hp: 3170,
          atk: 300,
          def: 250,
          matk: 250,
          mdef: 210
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 386,
          atk: 33,
          def: 28,
          matk: 28,
          mdef: 24
        },
        statsMax: {
          hp: 3860,
          atk: 330,
          def: 280,
          matk: 280,
          mdef: 240
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 445,
          atk: 36,
          def: 31,
          matk: 31,
          mdef: 27
        },
        statsMax: {
          hp: 4450,
          atk: 360,
          def: 310,
          matk: 310,
          mdef: 270
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "kem": {
    id: "kem",
    name: "Kem",
    rarity: "A",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 312,
          atk: 30,
          def: 25,
          matk: 24,
          mdef: 21
        },
        statsMax: {
          hp: 3120,
          atk: 300,
          def: 250,
          matk: 240,
          mdef: 210
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1.1
        },
        expMax: 2500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 376,
          atk: 33,
          def: 28,
          matk: 27,
          mdef: 24
        },
        statsMax: {
          hp: 3760,
          atk: 330,
          def: 280,
          matk: 270,
          mdef: 240
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1.1
        },
        expMax: 2500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 433,
          atk: 36,
          def: 31,
          matk: 30,
          mdef: 27
        },
        statsMax: {
          hp: 4330,
          atk: 360,
          def: 310,
          matk: 300,
          mdef: 270
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1.1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "pahrl": {
    id: "pahrl",
    name: "Pahrl",
    rarity: "A",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 327,
          atk: 30,
          def: 24,
          matk: 26,
          mdef: 22
        },
        statsMax: {
          hp: 3270,
          atk: 300,
          def: 240,
          matk: 260,
          mdef: 220
        },
        statCoefficients: {
          hp: 0.8,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1.1
        },
        expMax: 2500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 380,
          atk: 33,
          def: 27,
          matk: 29,
          mdef: 25
        },
        statsMax: {
          hp: 3800,
          atk: 330,
          def: 270,
          matk: 290,
          mdef: 250
        },
        statCoefficients: {
          hp: 0.8,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1.1
        },
        expMax: 2500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 446,
          atk: 36,
          def: 30,
          matk: 32,
          mdef: 28
        },
        statsMax: {
          hp: 4460,
          atk: 360,
          def: 300,
          matk: 320,
          mdef: 280
        },
        statCoefficients: {
          hp: 0.8,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1.1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "nakupi": {
    id: "nakupi",
    name: "Nakupí",
    rarity: "A",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 326,
          atk: 31,
          def: 26,
          matk: 24,
          mdef: 20
        },
        statsMax: {
          hp: 3260,
          atk: 310,
          def: 260,
          matk: 240,
          mdef: 200
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 386,
          atk: 34,
          def: 29,
          matk: 27,
          mdef: 23
        },
        statsMax: {
          hp: 3860,
          atk: 340,
          def: 290,
          matk: 270,
          mdef: 230
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 442,
          atk: 37,
          def: 32,
          matk: 30,
          mdef: 26
        },
        statsMax: {
          hp: 4420,
          atk: 370,
          def: 320,
          matk: 300,
          mdef: 260
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "samupi": {
    id: "samupi",
    name: "Samupí",
    rarity: "A",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 311,
          atk: 31,
          def: 26,
          matk: 25,
          mdef: 20
        },
        statsMax: {
          hp: 3110,
          atk: 310,
          def: 260,
          matk: 250,
          mdef: 200
        },
        statCoefficients: {
          hp: 1,
          atk: 0.8,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 377,
          atk: 34,
          def: 29,
          matk: 28,
          mdef: 23
        },
        statsMax: {
          hp: 3770,
          atk: 340,
          def: 290,
          matk: 280,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 0.8,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 432,
          atk: 37,
          def: 32,
          matk: 31,
          mdef: 26
        },
        statsMax: {
          hp: 4320,
          atk: 370,
          def: 320,
          matk: 310,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 0.8,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "metupi": {
    id: "metupi",
    name: "Metupí",
    rarity: "A",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 319,
          atk: 32,
          def: 25,
          matk: 24,
          mdef: 19
        },
        statsMax: {
          hp: 3190,
          atk: 320,
          def: 250,
          matk: 240,
          mdef: 190
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 374,
          atk: 35,
          def: 28,
          matk: 27,
          mdef: 22
        },
        statsMax: {
          hp: 3740,
          atk: 350,
          def: 280,
          matk: 270,
          mdef: 220
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 432,
          atk: 38,
          def: 31,
          matk: 30,
          mdef: 25
        },
        statsMax: {
          hp: 4320,
          atk: 380,
          def: 310,
          matk: 300,
          mdef: 250
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "u_nasag": {
    id: "u_nasag",
    name: "U'nasag",
    rarity: "B",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Ice",
        statsMin: {
          hp: 364,
          atk: 25,
          def: 23,
          matk: 31,
          mdef: 24
        },
        statsMax: {
          hp: 3640,
          atk: 250,
          def: 230,
          matk: 310,
          mdef: 240
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "Ice",
        statsMin: {
          hp: 425,
          atk: 25,
          def: 24,
          matk: 36,
          mdef: 23
        },
        statsMax: {
          hp: 4250,
          atk: 250,
          def: 240,
          matk: 360,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "Ice",
        statsMin: {
          hp: 487,
          atk: 28,
          def: 27,
          matk: 39,
          mdef: 26
        },
        statsMax: {
          hp: 4870,
          atk: 280,
          def: 270,
          matk: 390,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "daiana": {
    id: "daiana",
    name: "Daiana",
    rarity: "A",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 317,
          atk: 18,
          def: 20,
          matk: 37,
          mdef: 28
        },
        statsMax: {
          hp: 3170,
          atk: 180,
          def: 200,
          matk: 370,
          mdef: 280
        },
        statCoefficients: {
          hp: 1,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 383,
          atk: 33,
          def: 26,
          matk: 19,
          mdef: 19
        },
        statsMax: {
          hp: 3830,
          atk: 330,
          def: 260,
          matk: 190,
          mdef: 190
        },
        statCoefficients: {
          hp: 1,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 435,
          atk: 24,
          def: 26,
          matk: 44,
          mdef: 34
        },
        statsMax: {
          hp: 4350,
          atk: 240,
          def: 260,
          matk: 440,
          mdef: 340
        },
        statCoefficients: {
          hp: 1,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "sha_plar": {
    id: "sha_plar",
    name: "Sha'plar",
    rarity: "S",
    species: "Lizardfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Darkness",
        statsMin: {
          hp: 351,
          atk: 26,
          def: 24,
          matk: 36,
          mdef: 29
        },
        statsMax: {
          hp: 3510,
          atk: 260,
          def: 240,
          matk: 360,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 410,
          atk: 21,
          def: 24,
          matk: 42,
          mdef: 34
        },
        statsMax: {
          hp: 4100,
          atk: 210,
          def: 240,
          matk: 420,
          mdef: 340
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "Darkness",
        statsMin: {
          hp: 473,
          atk: 32,
          def: 30,
          matk: 42,
          mdef: 35
        },
        statsMax: {
          hp: 4730,
          atk: 320,
          def: 300,
          matk: 420,
          mdef: 350
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 4500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "sorman": {
    id: "sorman",
    name: "Sorman",
    rarity: "B",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 289,
          atk: 12,
          def: 18,
          matk: 29,
          mdef: 26
        },
        statsMax: {
          hp: 2890,
          atk: 120,
          def: 180,
          matk: 290,
          mdef: 260
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 2000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 341,
          atk: 15,
          def: 21,
          matk: 32,
          mdef: 29
        },
        statsMax: {
          hp: 3410,
          atk: 150,
          def: 210,
          matk: 320,
          mdef: 290
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 405,
          atk: 18,
          def: 24,
          matk: 35,
          mdef: 32
        },
        statsMax: {
          hp: 4050,
          atk: 180,
          def: 240,
          matk: 350,
          mdef: 320
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "zafitte": {
    id: "zafitte",
    name: "Zafitte",
    rarity: "S",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 339,
          atk: 21,
          def: 20,
          matk: 32,
          mdef: 28
        },
        statsMax: {
          hp: 3390,
          atk: 210,
          def: 200,
          matk: 320,
          mdef: 280
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.8,
          matk: 1,
          mdef: 0.8
        },
        expMax: 3500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 393,
          atk: 24,
          def: 23,
          matk: 35,
          mdef: 31
        },
        statsMax: {
          hp: 3930,
          atk: 240,
          def: 230,
          matk: 350,
          mdef: 310
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.8,
          matk: 1,
          mdef: 0.8
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 455,
          atk: 27,
          def: 26,
          matk: 38,
          mdef: 34
        },
        statsMax: {
          hp: 4550,
          atk: 270,
          def: 260,
          matk: 380,
          mdef: 340
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 0.8
        },
        expMax: 4500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "bonna": {
    id: "bonna",
    name: "Bonna",
    rarity: "S",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 334,
          atk: 20,
          def: 21,
          matk: 33,
          mdef: 27
        },
        statsMax: {
          hp: 3340,
          atk: 200,
          def: 210,
          matk: 330,
          mdef: 270
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.8,
          matk: 1,
          mdef: 0.8
        },
        expMax: 3500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 396,
          atk: 23,
          def: 24,
          matk: 36,
          mdef: 30
        },
        statsMax: {
          hp: 3960,
          atk: 230,
          def: 240,
          matk: 360,
          mdef: 300
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.8,
          matk: 1,
          mdef: 0.8
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 458,
          atk: 26,
          def: 27,
          matk: 39,
          mdef: 33
        },
        statsMax: {
          hp: 4580,
          atk: 260,
          def: 270,
          matk: 390,
          mdef: 330
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 0.8
        },
        expMax: 4500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "zeera": {
    id: "zeera",
    name: "Zeera",
    rarity: "S",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 339,
          atk: 20,
          def: 20,
          matk: 32,
          mdef: 28
        },
        statsMax: {
          hp: 3390,
          atk: 200,
          def: 200,
          matk: 320,
          mdef: 280
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.8,
          matk: 1,
          mdef: 0.8
        },
        expMax: 3500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 396,
          atk: 23,
          def: 23,
          matk: 35,
          mdef: 31
        },
        statsMax: {
          hp: 3960,
          atk: 230,
          def: 230,
          matk: 350,
          mdef: 310
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.8,
          matk: 1,
          mdef: 0.8
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 452,
          atk: 26,
          def: 26,
          matk: 38,
          mdef: 34
        },
        statsMax: {
          hp: 4520,
          atk: 260,
          def: 260,
          matk: 380,
          mdef: 340
        },
        statCoefficients: {
          hp: 0.9,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 0.8
        },
        expMax: 4500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "puprope": {
    id: "puprope",
    name: "Pupropé",
    rarity: "S",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 331,
          atk: 19,
          def: 21,
          matk: 39,
          mdef: 33
        },
        statsMax: {
          hp: 3310,
          atk: 190,
          def: 210,
          matk: 390,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.8,
          matk: 0.9,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 399,
          atk: 22,
          def: 24,
          matk: 42,
          mdef: 36
        },
        statsMax: {
          hp: 3990,
          atk: 220,
          def: 240,
          matk: 420,
          mdef: 360
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.8,
          matk: 0.9,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 452,
          atk: 25,
          def: 27,
          matk: 45,
          mdef: 39
        },
        statsMax: {
          hp: 4520,
          atk: 250,
          def: 270,
          matk: 450,
          mdef: 390
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.8,
          matk: 0.9,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "pupropu": {
    id: "pupropu",
    name: "Pupropu",
    rarity: "S",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 337,
          atk: 19,
          def: 22,
          matk: 39,
          mdef: 32
        },
        statsMax: {
          hp: 3370,
          atk: 190,
          def: 220,
          matk: 390,
          mdef: 320
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.8,
          matk: 0.9,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 394,
          atk: 22,
          def: 25,
          matk: 42,
          mdef: 35
        },
        statsMax: {
          hp: 3940,
          atk: 220,
          def: 250,
          matk: 420,
          mdef: 350
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.8,
          matk: 0.9,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 458,
          atk: 25,
          def: 28,
          matk: 45,
          mdef: 38
        },
        statsMax: {
          hp: 4580,
          atk: 250,
          def: 280,
          matk: 450,
          mdef: 380
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.8,
          matk: 0.9,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "lunato": {
    id: "lunato",
    name: "Lunato",
    rarity: "S",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 439,
          atk: 37,
          def: 32,
          matk: 21,
          mdef: 18
        },
        statsMax: {
          hp: 4390,
          atk: 370,
          def: 320,
          matk: 210,
          mdef: 180
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 493,
          atk: 40,
          def: 35,
          matk: 24,
          mdef: 21
        },
        statsMax: {
          hp: 4930,
          atk: 400,
          def: 350,
          matk: 240,
          mdef: 210
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 551,
          atk: 43,
          def: 38,
          matk: 27,
          mdef: 24
        },
        statsMax: {
          hp: 5510,
          atk: 430,
          def: 380,
          matk: 270,
          mdef: 240
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.9,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "lunaken": {
    id: "lunaken",
    name: "Lunaken",
    rarity: "S",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 420,
          atk: 37,
          def: 32,
          matk: 21,
          mdef: 19
        },
        statsMax: {
          hp: 4200,
          atk: 370,
          def: 320,
          matk: 210,
          mdef: 190
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 4000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 482,
          atk: 40,
          def: 35,
          matk: 24,
          mdef: 22
        },
        statsMax: {
          hp: 4820,
          atk: 400,
          def: 350,
          matk: 240,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 4000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 541,
          atk: 43,
          def: 38,
          matk: 27,
          mdef: 25
        },
        statsMax: {
          hp: 5410,
          atk: 430,
          def: 380,
          matk: 270,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.9
        },
        expMax: 5000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "lewto": {
    id: "lewto",
    name: "Lewto",
    rarity: "SS",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 365,
          atk: 20,
          def: 23,
          matk: 43,
          mdef: 40
        },
        statsMax: {
          hp: 3650,
          atk: 200,
          def: 230,
          matk: 430,
          mdef: 400
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 0.95
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 427,
          atk: 23,
          def: 26,
          matk: 46,
          mdef: 43
        },
        statsMax: {
          hp: 4270,
          atk: 230,
          def: 260,
          matk: 460,
          mdef: 430
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 0.95
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 489,
          atk: 26,
          def: 29,
          matk: 49,
          mdef: 46
        },
        statsMax: {
          hp: 4890,
          atk: 260,
          def: 290,
          matk: 490,
          mdef: 460
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 0.95
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "piz_fer": {
    id: "piz_fer",
    name: "Piz'fer",
    rarity: "SS",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 364,
          atk: 21,
          def: 22,
          matk: 43,
          mdef: 40
        },
        statsMax: {
          hp: 3640,
          atk: 210,
          def: 220,
          matk: 430,
          mdef: 400
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1.05,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 422,
          atk: 24,
          def: 25,
          matk: 46,
          mdef: 43
        },
        statsMax: {
          hp: 4220,
          atk: 240,
          def: 250,
          matk: 460,
          mdef: 430
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1.05,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 488,
          atk: 27,
          def: 28,
          matk: 49,
          mdef: 46
        },
        statsMax: {
          hp: 4880,
          atk: 270,
          def: 280,
          matk: 490,
          mdef: 460
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1.05,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "jennish": {
    id: "jennish",
    name: "Jennish",
    rarity: "SS",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 370,
          atk: 20,
          def: 23,
          matk: 43,
          mdef: 40
        },
        statsMax: {
          hp: 3700,
          atk: 200,
          def: 230,
          matk: 430,
          mdef: 400
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 424,
          atk: 23,
          def: 26,
          matk: 46,
          mdef: 43
        },
        statsMax: {
          hp: 4240,
          atk: 230,
          def: 260,
          matk: 460,
          mdef: 430
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 486,
          atk: 26,
          def: 29,
          matk: 49,
          mdef: 46
        },
        statsMax: {
          hp: 4860,
          atk: 260,
          def: 290,
          matk: 490,
          mdef: 460
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "zerro": {
    id: "zerro",
    name: "Zerro",
    rarity: "SS",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 368,
          atk: 21,
          def: 22,
          matk: 43,
          mdef: 40
        },
        statsMax: {
          hp: 3680,
          atk: 210,
          def: 220,
          matk: 430,
          mdef: 400
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1.05,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 425,
          atk: 24,
          def: 25,
          matk: 46,
          mdef: 43
        },
        statsMax: {
          hp: 4250,
          atk: 240,
          def: 250,
          matk: 460,
          mdef: 430
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1.05,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 487,
          atk: 27,
          def: 28,
          matk: 49,
          mdef: 46
        },
        statsMax: {
          hp: 4870,
          atk: 270,
          def: 280,
          matk: 490,
          mdef: 460
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1.05,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "palpa": {
    id: "palpa",
    name: "Palpa",
    rarity: "S",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 315,
          atk: 16,
          def: 19,
          matk: 35,
          mdef: 30
        },
        statsMax: {
          hp: 3150,
          atk: 160,
          def: 190,
          matk: 350,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 379,
          atk: 19,
          def: 22,
          matk: 38,
          mdef: 33
        },
        statsMax: {
          hp: 3790,
          atk: 190,
          def: 220,
          matk: 380,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 433,
          atk: 22,
          def: 25,
          matk: 41,
          mdef: 37
        },
        statsMax: {
          hp: 4330,
          atk: 220,
          def: 250,
          matk: 410,
          mdef: 370
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "36ais": {
    id: "36ais",
    name: "36AIS",
    rarity: "SS",
    species: "Oxsecian",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 312,
          atk: 16,
          def: 18,
          matk: 31,
          mdef: 28
        },
        statsMax: {
          hp: 3120,
          atk: 160,
          def: 180,
          matk: 310,
          mdef: 280
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 372,
          atk: 19,
          def: 21,
          matk: 34,
          mdef: 31
        },
        statsMax: {
          hp: 3720,
          atk: 190,
          def: 210,
          matk: 340,
          mdef: 310
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 480,
          atk: 25,
          def: 28,
          matk: 44,
          mdef: 41
        },
        statsMax: {
          hp: 4800,
          atk: 250,
          def: 280,
          matk: 440,
          mdef: 410
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "54b2": {
    id: "54b2",
    name: "54B2",
    rarity: "Z",
    species: "Oxsecian",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 631,
          atk: 49,
          def: 43,
          matk: 22,
          mdef: 27
        },
        statsMax: {
          hp: 5679,
          atk: 490,
          def: 387,
          matk: 220,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 693,
          atk: 52,
          def: 46,
          matk: 25,
          mdef: 30
        },
        statsMax: {
          hp: 6237,
          atk: 520,
          def: 414,
          matk: 250,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 752,
          atk: 55,
          def: 49,
          matk: 28,
          mdef: 33
        },
        statsMax: {
          hp: 6768,
          atk: 550,
          def: 441,
          matk: 280,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "maralme": {
    id: "maralme",
    name: "Maralme",
    rarity: "A",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Fire",
        statsMin: {
          hp: 323,
          atk: 27,
          def: 28,
          matk: 31,
          mdef: 22
        },
        statsMax: {
          hp: 3230,
          atk: 270,
          def: 280,
          matk: 310,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "Lightning",
        statsMin: {
          hp: 383,
          atk: 30,
          def: 29,
          matk: 34,
          mdef: 24
        },
        statsMax: {
          hp: 3830,
          atk: 300,
          def: 290,
          matk: 340,
          mdef: 240
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 443,
          atk: 33,
          def: 32,
          matk: 31,
          mdef: 26
        },
        statsMax: {
          hp: 4430,
          atk: 330,
          def: 320,
          matk: 310,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "velraine": {
    id: "velraine",
    name: "Velraine",
    rarity: "A",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Ice",
        statsMin: {
          hp: 310,
          atk: 25,
          def: 25,
          matk: 31,
          mdef: 21
        },
        statsMax: {
          hp: 3100,
          atk: 250,
          def: 250,
          matk: 310,
          mdef: 210
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "Darkness",
        statsMin: {
          hp: 370,
          atk: 28,
          def: 28,
          matk: 34,
          mdef: 23
        },
        statsMax: {
          hp: 3700,
          atk: 280,
          def: 280,
          matk: 340,
          mdef: 230
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 440,
          atk: 31,
          def: 31,
          matk: 31,
          mdef: 25
        },
        statsMax: {
          hp: 4400,
          atk: 310,
          def: 310,
          matk: 310,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "leviathan": {
    id: "leviathan",
    name: "Leviathan",
    rarity: "S",
    species: "Dragon",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 467,
          atk: 22,
          def: 26,
          matk: 40,
          mdef: 31
        },
        statsMax: {
          hp: 4670,
          atk: 220,
          def: 260,
          matk: 400,
          mdef: 310
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 528,
          atk: 31,
          def: 29,
          matk: 43,
          mdef: 37
        },
        statsMax: {
          hp: 5280,
          atk: 310,
          def: 290,
          matk: 430,
          mdef: 370
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 589,
          atk: 37,
          def: 32,
          matk: 46,
          mdef: 43
        },
        statsMax: {
          hp: 5890,
          atk: 370,
          def: 320,
          matk: 460,
          mdef: 430
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2,
        skills: []
      }
    ]
  },
  "bahamut": {
    id: "bahamut",
    name: "Bahamut",
    rarity: "S",
    species: "Dragon",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 473,
          atk: 24,
          def: 25,
          matk: 40,
          mdef: 30
        },
        statsMax: {
          hp: 4730,
          atk: 240,
          def: 250,
          matk: 400,
          mdef: 300
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 535,
          atk: 33,
          def: 28,
          matk: 43,
          mdef: 35
        },
        statsMax: {
          hp: 5350,
          atk: 330,
          def: 280,
          matk: 430,
          mdef: 350
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 592,
          atk: 39,
          def: 31,
          matk: 46,
          mdef: 41
        },
        statsMax: {
          hp: 5920,
          atk: 390,
          def: 310,
          matk: 460,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2,
        skills: []
      }
    ]
  },
  "odin": {
    id: "odin",
    name: "Odin",
    rarity: "S",
    species: "Celestial",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 464,
          atk: 39,
          def: 28,
          matk: 16,
          mdef: 20
        },
        statsMax: {
          hp: 4640,
          atk: 390,
          def: 280,
          matk: 160,
          mdef: 200
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 521,
          atk: 42,
          def: 31,
          matk: 22,
          mdef: 26
        },
        statsMax: {
          hp: 5210,
          atk: 420,
          def: 310,
          matk: 220,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 583,
          atk: 45,
          def: 36,
          matk: 28,
          mdef: 32
        },
        statsMax: {
          hp: 5830,
          atk: 450,
          def: 360,
          matk: 280,
          mdef: 320
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2,
        skills: []
      }
    ]
  },
  "dracorin": {
    id: "dracorin",
    name: "Dracorin",
    rarity: "B",
    species: "Wild Beast",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Lightning",
        statsMin: {
          hp: 298,
          atk: 23,
          def: 24,
          matk: 29,
          mdef: 24
        },
        statsMax: {
          hp: 3576,
          atk: 253,
          def: 288,
          matk: 319,
          mdef: 288
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.15,
          def: 1.1,
          matk: 1.15,
          mdef: 1.1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Lightning",
        statsMin: {
          hp: 366,
          atk: 29,
          def: 29,
          matk: 33,
          mdef: 29
        },
        statsMax: {
          hp: 3660,
          atk: 290,
          def: 290,
          matk: 330,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Lightning",
        statsMin: {
          hp: 409,
          atk: 32,
          def: 30,
          matk: 36,
          mdef: 30
        },
        statsMax: {
          hp: 4090,
          atk: 320,
          def: 300,
          matk: 360,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "jaguna": {
    id: "jaguna",
    name: "Jaguna",
    rarity: "B",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 329,
          atk: 13,
          def: 25,
          matk: 18,
          mdef: 20
        },
        statsMax: {
          hp: 3290,
          atk: 130,
          def: 250,
          matk: 180,
          mdef: 200
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 389,
          atk: 16,
          def: 28,
          matk: 21,
          mdef: 23
        },
        statsMax: {
          hp: 3890,
          atk: 160,
          def: 280,
          matk: 210,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 449,
          atk: 19,
          def: 31,
          matk: 36,
          mdef: 31
        },
        statsMax: {
          hp: 4490,
          atk: 190,
          def: 310,
          matk: 360,
          mdef: 310
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 2500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "suoh": {
    id: "suoh",
    name: "Suoh",
    rarity: "SS",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 437,
          atk: 38,
          def: 27,
          matk: 26,
          mdef: 20
        },
        statsMax: {
          hp: 4370,
          atk: 380,
          def: 270,
          matk: 260,
          mdef: 200
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 497,
          atk: 41,
          def: 30,
          matk: 29,
          mdef: 23
        },
        statsMax: {
          hp: 4970,
          atk: 410,
          def: 300,
          matk: 290,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 557,
          atk: 44,
          def: 33,
          matk: 32,
          mdef: 26
        },
        statsMax: {
          hp: 5570,
          atk: 440,
          def: 330,
          matk: 320,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "camellia": {
    id: "camellia",
    name: "Camellia",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 429,
          atk: 31,
          def: 24,
          matk: 25,
          mdef: 22
        },
        statsMax: {
          hp: 4290,
          atk: 310,
          def: 240,
          matk: 250,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 489,
          atk: 34,
          def: 27,
          matk: 28,
          mdef: 25
        },
        statsMax: {
          hp: 4890,
          atk: 340,
          def: 270,
          matk: 280,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 549,
          atk: 37,
          def: 30,
          matk: 31,
          mdef: 28
        },
        statsMax: {
          hp: 5490,
          atk: 370,
          def: 300,
          matk: 310,
          mdef: 280
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "rejin": {
    id: "rejin",
    name: "Rejin",
    rarity: "S",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 340,
          atk: 28,
          def: 23,
          matk: 28,
          mdef: 27
        },
        statsMax: {
          hp: 4080,
          atk: 336,
          def: 276,
          matk: 336,
          mdef: 324
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 402,
          atk: 31,
          def: 26,
          matk: 31,
          mdef: 30
        },
        statsMax: {
          hp: 4824,
          atk: 372,
          def: 312,
          matk: 372,
          mdef: 360
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 461,
          atk: 34,
          def: 29,
          matk: 34,
          mdef: 33
        },
        statsMax: {
          hp: 5532,
          atk: 408,
          def: 348,
          matk: 408,
          mdef: 396
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "pupru": {
    id: "pupru",
    name: "Pupru",
    rarity: "S",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 324,
          atk: 32,
          def: 30,
          matk: 22,
          mdef: 22
        },
        statsMax: {
          hp: 3240,
          atk: 320,
          def: 300,
          matk: 220,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 383,
          atk: 35,
          def: 33,
          matk: 25,
          mdef: 25
        },
        statsMax: {
          hp: 3830,
          atk: 350,
          def: 330,
          matk: 250,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 442,
          atk: 39,
          def: 36,
          matk: 28,
          mdef: 28
        },
        statsMax: {
          hp: 4420,
          atk: 390,
          def: 360,
          matk: 280,
          mdef: 280
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "bajanna": {
    id: "bajanna",
    name: "Bajanna",
    rarity: "SS",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 447,
          atk: 39,
          def: 28,
          matk: 24,
          mdef: 24
        },
        statsMax: {
          hp: 4470,
          atk: 390,
          def: 280,
          matk: 240,
          mdef: 240
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 504,
          atk: 42,
          def: 31,
          matk: 27,
          mdef: 27
        },
        statsMax: {
          hp: 5040,
          atk: 420,
          def: 310,
          matk: 270,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 569,
          atk: 45,
          def: 34,
          matk: 30,
          mdef: 30
        },
        statsMax: {
          hp: 5690,
          atk: 450,
          def: 340,
          matk: 300,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "y_apkar": {
    id: "y_apkar",
    name: "Y'apkar",
    rarity: "S",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 419,
          atk: 30,
          def: 26,
          matk: 34,
          mdef: 28
        },
        statsMax: {
          hp: 4190,
          atk: 300,
          def: 260,
          matk: 340,
          mdef: 280
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 478,
          atk: 33,
          def: 29,
          matk: 37,
          mdef: 31
        },
        statsMax: {
          hp: 4780,
          atk: 330,
          def: 290,
          matk: 370,
          mdef: 310
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4500000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 538,
          atk: 36,
          def: 32,
          matk: 40,
          mdef: 34
        },
        statsMax: {
          hp: 5380,
          atk: 360,
          def: 320,
          matk: 400,
          mdef: 340
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "harold": {
    id: "harold",
    name: "Harold",
    rarity: "A",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 361,
          atk: 37,
          def: 26,
          matk: 14,
          mdef: 16
        },
        statsMax: {
          hp: 3610,
          atk: 370,
          def: 260,
          matk: 140,
          mdef: 160
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 413,
          atk: 40,
          def: 29,
          matk: 17,
          mdef: 19
        },
        statsMax: {
          hp: 4130,
          atk: 400,
          def: 290,
          matk: 170,
          mdef: 190
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 472,
          atk: 43,
          def: 32,
          matk: 20,
          mdef: 23
        },
        statsMax: {
          hp: 4720,
          atk: 430,
          def: 320,
          matk: 200,
          mdef: 230
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "yulia": {
    id: "yulia",
    name: "Yulia",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 395,
          atk: 39,
          def: 29,
          matk: 22,
          mdef: 21
        },
        statsMax: {
          hp: 3871,
          atk: 382,
          def: 284,
          matk: 215,
          mdef: 205
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 463,
          atk: 42,
          def: 32,
          matk: 25,
          mdef: 24
        },
        statsMax: {
          hp: 4537,
          atk: 411,
          def: 313,
          matk: 245,
          mdef: 235
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 514,
          atk: 45,
          def: 35,
          matk: 28,
          mdef: 27
        },
        statsMax: {
          hp: 5037,
          atk: 441,
          def: 343,
          matk: 274,
          mdef: 264
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 0.95,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "invincible": {
    id: "invincible",
    name: "Invincible",
    rarity: "Z",
    species: "Celestial",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 573,
          atk: 26,
          def: 27,
          matk: 45,
          mdef: 38
        },
        statsMax: {
          hp: 5730,
          atk: 260,
          def: 270,
          matk: 450,
          mdef: 380
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6500000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 640,
          atk: 31,
          def: 31,
          matk: 48,
          mdef: 42
        },
        statsMax: {
          hp: 6400,
          atk: 310,
          def: 310,
          matk: 480,
          mdef: 420
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 8500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 706,
          atk: 35,
          def: 34,
          matk: 51,
          mdef: 45
        },
        statsMax: {
          hp: 7060,
          atk: 350,
          def: 340,
          matk: 510,
          mdef: 450
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "zael": {
    id: "zael",
    name: "Zael",
    rarity: "S",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 346,
          atk: 35,
          def: 27,
          matk: 19,
          mdef: 19
        },
        statsMax: {
          hp: 3460,
          atk: 350,
          def: 270,
          matk: 190,
          mdef: 190
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 406,
          atk: 38,
          def: 30,
          matk: 22,
          mdef: 22
        },
        statsMax: {
          hp: 4060,
          atk: 380,
          def: 300,
          matk: 220,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 466,
          atk: 41,
          def: 33,
          matk: 25,
          mdef: 25
        },
        statsMax: {
          hp: 4660,
          atk: 410,
          def: 330,
          matk: 250,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "calista": {
    id: "calista",
    name: "Calista",
    rarity: "S",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 317,
          atk: 22,
          def: 22,
          matk: 34,
          mdef: 29
        },
        statsMax: {
          hp: 3170,
          atk: 220,
          def: 220,
          matk: 340,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 379,
          atk: 25,
          def: 25,
          matk: 37,
          mdef: 32
        },
        statsMax: {
          hp: 3790,
          atk: 250,
          def: 250,
          matk: 370,
          mdef: 320
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 438,
          atk: 34,
          def: 28,
          matk: 37,
          mdef: 35
        },
        statsMax: {
          hp: 4380,
          atk: 340,
          def: 280,
          matk: 370,
          mdef: 350
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "seiryu": {
    id: "seiryu",
    name: "Seiryu",
    rarity: "Z",
    species: "Dragon",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 552,
          atk: 24,
          def: 36,
          matk: 46,
          mdef: 35
        },
        statsMax: {
          hp: 5520,
          atk: 240,
          def: 360,
          matk: 460,
          mdef: 350
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 8500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 611,
          atk: 33,
          def: 33,
          matk: 50,
          mdef: 41
        },
        statsMax: {
          hp: 6110,
          atk: 330,
          def: 330,
          matk: 500,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 671,
          atk: 37,
          def: 36,
          matk: 49,
          mdef: 44
        },
        statsMax: {
          hp: 6710,
          atk: 370,
          def: 360,
          matk: 490,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "lich_lambda": {
    id: "lich_lambda",
    name: "Lich Λ",
    rarity: "S",
    species: "Wild Beast",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 422,
          atk: 37,
          def: 27,
          matk: 28,
          mdef: 31
        },
        statsMax: {
          hp: 4220,
          atk: 370,
          def: 270,
          matk: 280,
          mdef: 310
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 467,
          atk: 31,
          def: 29,
          matk: 42,
          mdef: 37
        },
        statsMax: {
          hp: 4670,
          atk: 310,
          def: 290,
          matk: 420,
          mdef: 370
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 529,
          atk: 36,
          def: 32,
          matk: 45,
          mdef: 40
        },
        statsMax: {
          hp: 5290,
          atk: 360,
          def: 320,
          matk: 450,
          mdef: 400
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "marilith_lambda": {
    id: "marilith_lambda",
    name: "Marilith Λ",
    rarity: "S",
    species: "Wild Beast",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 453,
          atk: 38,
          def: 27,
          matk: 28,
          mdef: 27
        },
        statsMax: {
          hp: 4530,
          atk: 380,
          def: 270,
          matk: 280,
          mdef: 270
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 508,
          atk: 41,
          def: 30,
          matk: 31,
          mdef: 30
        },
        statsMax: {
          hp: 5080,
          atk: 410,
          def: 300,
          matk: 310,
          mdef: 300
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 565,
          atk: 44,
          def: 33,
          matk: 34,
          mdef: 33
        },
        statsMax: {
          hp: 5650,
          atk: 440,
          def: 330,
          matk: 340,
          mdef: 330
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "samatha_lambda": {
    id: "samatha_lambda",
    name: "Samatha Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Lightning",
        statsMin: {
          hp: 729,
          atk: 41,
          def: 42,
          matk: 51,
          mdef: 43
        },
        statsMax: {
          hp: 7290,
          atk: 410,
          def: 420,
          matk: 510,
          mdef: 430
        },
        statCoefficients: {
          hp: 1.15,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "olber_lambda": {
    id: "olber_lambda",
    name: "Olber Λ",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 731,
          atk: 44,
          def: 46,
          matk: 37,
          mdef: 34
        },
        statsMax: {
          hp: 7310,
          atk: 440,
          def: 460,
          matk: 370,
          mdef: 340
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.15,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "yukken_lambda": {
    id: "yukken_lambda",
    name: "Yukken Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 634,
          atk: 46,
          def: 41,
          matk: 36,
          mdef: 37
        },
        statsMax: {
          hp: 6340,
          atk: 460,
          def: 410,
          matk: 360,
          mdef: 370
        },
        statCoefficients: {
          hp: 1.3,
          atk: 1.3,
          def: 1.3,
          matk: 1.3,
          mdef: 1.3
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "a_misandra_lambda": {
    id: "a_misandra_lambda",
    name: "A'misandra Λ",
    rarity: "Z",
    species: "Lizardfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 619,
          atk: 29,
          def: 32,
          matk: 56,
          mdef: 45
        },
        statsMax: {
          hp: 6190,
          atk: 290,
          def: 320,
          matk: 560,
          mdef: 450
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "koko_lambda": {
    id: "koko_lambda",
    name: "Koko Λ",
    rarity: "Z",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Fire",
        statsMin: {
          hp: 800,
          atk: 43,
          def: 40,
          matk: 49,
          mdef: 43
        },
        statsMax: {
          hp: 8000,
          atk: 430,
          def: 400,
          matk: 490,
          mdef: 430
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.05
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "lewto_lambda": {
    id: "lewto_lambda",
    name: "Lewto Λ",
    rarity: "Z",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 648,
          atk: 29,
          def: 33,
          matk: 56,
          mdef: 53
        },
        statsMax: {
          hp: 6480,
          atk: 290,
          def: 330,
          matk: 560,
          mdef: 530
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.15,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "piz_fer_lambda": {
    id: "piz_fer_lambda",
    name: "Piz'fer Λ",
    rarity: "Z",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 647,
          atk: 28,
          def: 32,
          matk: 56,
          mdef: 53
        },
        statsMax: {
          hp: 6470,
          atk: 280,
          def: 320,
          matk: 560,
          mdef: 530
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.15,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "jennish_lambda": {
    id: "jennish_lambda",
    name: "Jennish Λ",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 645,
          atk: 29,
          def: 33,
          matk: 56,
          mdef: 53
        },
        statsMax: {
          hp: 6450,
          atk: 290,
          def: 330,
          matk: 560,
          mdef: 530
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.15,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "zerro_lambda": {
    id: "zerro_lambda",
    name: "Zerro Λ",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 646,
          atk: 28,
          def: 32,
          matk: 56,
          mdef: 53
        },
        statsMax: {
          hp: 6460,
          atk: 280,
          def: 320,
          matk: 560,
          mdef: 530
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.15,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "bahamut_lambda": {
    id: "bahamut_lambda",
    name: "Bahamut Λ",
    rarity: "Z",
    species: "Dragon",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 699,
          atk: 35,
          def: 33,
          matk: 51,
          mdef: 42
        },
        statsMax: {
          hp: 6990,
          atk: 350,
          def: 330,
          matk: 510,
          mdef: 420
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "odin_lambda": {
    id: "odin_lambda",
    name: "Odin Λ",
    rarity: "Z",
    species: "Celestial",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 688,
          atk: 46,
          def: 41,
          matk: 33,
          mdef: 33
        },
        statsMax: {
          hp: 6880,
          atk: 460,
          def: 410,
          matk: 330,
          mdef: 330
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "leviathan_lambda": {
    id: "leviathan_lambda",
    name: "Leviathan Λ",
    rarity: "Z",
    species: "Dragon",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 682,
          atk: 33,
          def: 34,
          matk: 51,
          mdef: 44
        },
        statsMax: {
          hp: 6820,
          atk: 330,
          def: 340,
          matk: 510,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "jade_dragon": {
    id: "jade_dragon",
    name: "Jade Dragon",
    rarity: "A",
    species: "Dragon",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Lightning",
        statsMin: {
          hp: 452,
          atk: 28,
          def: 25,
          matk: 33,
          mdef: 26
        },
        statsMax: {
          hp: 4520,
          atk: 280,
          def: 250,
          matk: 330,
          mdef: 260
        },
        statCoefficients: {
          hp: 1.1,
          atk: 0.95,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Lightning",
        statsMin: {
          hp: 488,
          atk: 31,
          def: 28,
          matk: 36,
          mdef: 29
        },
        statsMax: {
          hp: 4880,
          atk: 310,
          def: 280,
          matk: 360,
          mdef: 290
        },
        statCoefficients: {
          hp: 1.05,
          atk: 0.95,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Lightning",
        statsMin: {
          hp: 541,
          atk: 34,
          def: 31,
          matk: 39,
          mdef: 32
        },
        statsMax: {
          hp: 5410,
          atk: 340,
          def: 310,
          matk: 390,
          mdef: 320
        },
        statCoefficients: {
          hp: 1,
          atk: 0.95,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 3000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "rejin_lambda": {
    id: "rejin_lambda",
    name: "Rejin Λ",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 619,
          atk: 40,
          def: 35,
          matk: 38,
          mdef: 38
        },
        statsMax: {
          hp: 6190,
          atk: 440,
          def: 385,
          matk: 418,
          mdef: 418
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "alika_lambda": {
    id: "alika_lambda",
    name: "Alika Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Lightning",
        statsMin: {
          hp: 635,
          atk: 36,
          def: 36,
          matk: 45,
          mdef: 38
        },
        statsMax: {
          hp: 6350,
          atk: 360,
          def: 360,
          matk: 450,
          mdef: 380
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "gegonago_lambda": {
    id: "gegonago_lambda",
    name: "Gegonago Λ",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 648,
          atk: 30,
          def: 33,
          matk: 45,
          mdef: 42
        },
        statsMax: {
          hp: 6480,
          atk: 300,
          def: 330,
          matk: 450,
          mdef: 420
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "puprope_lambda": {
    id: "puprope_lambda",
    name: "Pupropé Λ",
    rarity: "Z",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 622,
          atk: 27,
          def: 32,
          matk: 50,
          mdef: 44
        },
        statsMax: {
          hp: 6220,
          atk: 270,
          def: 320,
          matk: 500,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "lucia": {
    id: "lucia",
    name: "Lucia",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 512,
          atk: 29,
          def: 30,
          matk: 46,
          mdef: 43
        },
        statsMax: {
          hp: 5017,
          atk: 284,
          def: 294,
          matk: 450,
          mdef: 421
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "lucia_lambda": {
    id: "lucia_lambda",
    name: "Lucia Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 604,
          atk: 35,
          def: 30,
          matk: 41,
          mdef: 36
        },
        statsMax: {
          hp: 6040,
          atk: 350,
          def: 300,
          matk: 410,
          mdef: 360
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "echo": {
    id: "echo",
    name: "Echo",
    rarity: "S",
    species: "Spirit",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 315,
          atk: 32,
          def: 22,
          matk: 32,
          mdef: 28
        },
        statsMax: {
          hp: 3150,
          atk: 320,
          def: 220,
          matk: 320,
          mdef: 280
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 5000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 377,
          atk: 35,
          def: 25,
          matk: 35,
          mdef: 31
        },
        statsMax: {
          hp: 3770,
          atk: 350,
          def: 250,
          matk: 350,
          mdef: 310
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 5500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 436,
          atk: 38,
          def: 28,
          matk: 38,
          mdef: 34
        },
        statsMax: {
          hp: 4360,
          atk: 380,
          def: 280,
          matk: 380,
          mdef: 340
        },
        statCoefficients: {
          hp: 0.95,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 0.95
        },
        expMax: 5500000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "jaguna_lambda": {
    id: "jaguna_lambda",
    name: "Jaguna Λ",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Remedy",
        statsMin: {
          hp: 611,
          atk: 40,
          def: 41,
          matk: 46,
          mdef: 44
        },
        statsMax: {
          hp: 6110,
          atk: 460,
          def: 469,
          matk: 499,
          mdef: 539
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.8,
          def: 1.8,
          matk: 1.8,
          mdef: 1.8
        },
        expMax: 12000000,
        expCoeff: 2.2,
        skills: []
      }
    ]
  },
  "amazora_lambda": {
    id: "amazora_lambda",
    name: "Amazora Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Fire",
        statsMin: {
          hp: 693,
          atk: 42,
          def: 44,
          matk: 44,
          mdef: 39
        },
        statsMax: {
          hp: 6930,
          atk: 420,
          def: 440,
          matk: 440,
          mdef: 390
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.05,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ellvern_lambda": {
    id: "ellvern_lambda",
    name: "Ellvern Λ",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 606,
          atk: 28,
          def: 31,
          matk: 52,
          mdef: 52
        },
        statsMax: {
          hp: 6060,
          atk: 280,
          def: 310,
          matk: 520,
          mdef: 520
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.15,
          matk: 1.1,
          mdef: 1.05
        },
        expMax: 12000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "captive_golem": {
    id: "captive_golem",
    name: "Captive Golem",
    rarity: "S",
    species: "Wild Beast",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "None",
        element: "—",
        statsMin: {
          hp: 481,
          atk: 37,
          def: 27,
          matk: 28,
          mdef: 20
        },
        statsMax: {
          hp: 4810,
          atk: 370,
          def: 270,
          matk: 280,
          mdef: 200
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 542,
          atk: 40,
          def: 19,
          matk: 34,
          mdef: 32
        },
        statsMax: {
          hp: 5420,
          atk: 400,
          def: 190,
          matk: 340,
          mdef: 320
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 600,
          atk: 43,
          def: 22,
          matk: 40,
          mdef: 35
        },
        statsMax: {
          hp: 6000,
          atk: 430,
          def: 220,
          matk: 400,
          mdef: 350
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "nakupi_lambda": {
    id: "nakupi_lambda",
    name: "Nakupí Λ",
    rarity: "Z",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 676,
          atk: 42,
          def: 43,
          matk: 48,
          mdef: 43
        },
        statsMax: {
          hp: 6084,
          atk: 378,
          def: 387,
          matk: 432,
          mdef: 387
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 11500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "bonna_lambda": {
    id: "bonna_lambda",
    name: "Bonna Λ",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 651,
          atk: 48,
          def: 34,
          matk: 40,
          mdef: 39
        },
        statsMax: {
          hp: 6510,
          atk: 480,
          def: 340,
          matk: 400,
          mdef: 390
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.2,
          mdef: 1.2
        },
        expMax: 12000000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "andelucia": {
    id: "andelucia",
    name: "Andelucia",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Graviton",
        statsMin: {
          hp: 554,
          atk: 37,
          def: 38,
          matk: 46,
          mdef: 38
        },
        statsMax: {
          hp: 5540,
          atk: 370,
          def: 380,
          matk: 460,
          mdef: 380
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "Graviton",
        statsMin: {
          hp: 603,
          atk: 40,
          def: 41,
          matk: 49,
          mdef: 41
        },
        statsMax: {
          hp: 6030,
          atk: 400,
          def: 410,
          matk: 490,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "Graviton",
        statsMin: {
          hp: 667,
          atk: 43,
          def: 44,
          matk: 52,
          mdef: 44
        },
        statsMax: {
          hp: 6670,
          atk: 430,
          def: 440,
          matk: 520,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "edg_low": {
    id: "edg_low",
    name: "Edg'low",
    rarity: "Z",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Photon",
        statsMin: {
          hp: 579,
          atk: 28,
          def: 27,
          matk: 47,
          mdef: 34
        },
        statsMax: {
          hp: 5790,
          atk: 280,
          def: 270,
          matk: 470,
          mdef: 340
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 638,
          atk: 31,
          def: 30,
          matk: 50,
          mdef: 37
        },
        statsMax: {
          hp: 6380,
          atk: 310,
          def: 300,
          matk: 500,
          mdef: 370
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "None",
        element: "—",
        statsMin: {
          hp: 697,
          atk: 40,
          def: 33,
          matk: 53,
          mdef: 38
        },
        statsMax: {
          hp: 6970,
          atk: 400,
          def: 330,
          matk: 530,
          mdef: 380
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "zavison": {
    id: "zavison",
    name: "Zavison",
    rarity: "Z",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 502,
          atk: 43,
          def: 34,
          matk: 25,
          mdef: 30
        },
        statsMax: {
          hp: 5020,
          atk: 430,
          def: 340,
          matk: 250,
          mdef: 300
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 561,
          atk: 44,
          def: 37,
          matk: 28,
          mdef: 33
        },
        statsMax: {
          hp: 5610,
          atk: 440,
          def: 370,
          matk: 280,
          mdef: 330
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 622,
          atk: 47,
          def: 40,
          matk: 31,
          mdef: 36
        },
        statsMax: {
          hp: 6220,
          atk: 470,
          def: 400,
          matk: 310,
          mdef: 360
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "sayu": {
    id: "sayu",
    name: "Sayu",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Photon",
        statsMin: {
          hp: 522,
          atk: 23,
          def: 28,
          matk: 50,
          mdef: 44
        },
        statsMax: {
          hp: 5220,
          atk: 230,
          def: 280,
          matk: 500,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Photon",
        statsMin: {
          hp: 585,
          atk: 26,
          def: 31,
          matk: 53,
          mdef: 47
        },
        statsMax: {
          hp: 5850,
          atk: 260,
          def: 310,
          matk: 530,
          mdef: 470
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Photon",
        statsMin: {
          hp: 649,
          atk: 29,
          def: 34,
          matk: 57,
          mdef: 50
        },
        statsMax: {
          hp: 6490,
          atk: 290,
          def: 340,
          matk: 570,
          mdef: 500
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "schweiz": {
    id: "schweiz",
    name: "Schweiz",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Remedy",
        statsMin: {
          hp: 478,
          atk: 42,
          def: 30,
          matk: 35,
          mdef: 37
        },
        statsMax: {
          hp: 4780,
          atk: 420,
          def: 300,
          matk: 350,
          mdef: 370
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Remedy",
        statsMin: {
          hp: 536,
          atk: 44,
          def: 33,
          matk: 38,
          mdef: 39
        },
        statsMax: {
          hp: 5360,
          atk: 440,
          def: 330,
          matk: 380,
          mdef: 390
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Remedy",
        statsMin: {
          hp: 600,
          atk: 46,
          def: 36,
          matk: 41,
          mdef: 41
        },
        statsMax: {
          hp: 6000,
          atk: 460,
          def: 360,
          matk: 410,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "peyrna": {
    id: "peyrna",
    name: "Peyrna",
    rarity: "Z",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Graviton",
        statsMin: {
          hp: 557,
          atk: 38,
          def: 35,
          matk: 44,
          mdef: 39
        },
        statsMax: {
          hp: 5570,
          atk: 380,
          def: 350,
          matk: 440,
          mdef: 390
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "Graviton",
        statsMin: {
          hp: 584,
          atk: 41,
          def: 38,
          matk: 46,
          mdef: 42
        },
        statsMax: {
          hp: 5840,
          atk: 410,
          def: 380,
          matk: 460,
          mdef: 420
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "Graviton",
        statsMin: {
          hp: 643,
          atk: 44,
          def: 41,
          matk: 49,
          mdef: 45
        },
        statsMax: {
          hp: 6430,
          atk: 440,
          def: 410,
          matk: 490,
          mdef: 450
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "beau_ne": {
    id: "beau_ne",
    name: "Beau'ne",
    rarity: "Z",
    species: "Lizardfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Photon",
        statsMin: {
          hp: 595,
          atk: 37,
          def: 35,
          matk: 46,
          mdef: 35
        },
        statsMax: {
          hp: 5950,
          atk: 370,
          def: 350,
          matk: 460,
          mdef: 350
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "Photon",
        statsMin: {
          hp: 656,
          atk: 40,
          def: 38,
          matk: 49,
          mdef: 38
        },
        statsMax: {
          hp: 6560,
          atk: 400,
          def: 380,
          matk: 490,
          mdef: 380
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "Photon",
        statsMin: {
          hp: 715,
          atk: 43,
          def: 41,
          matk: 52,
          mdef: 41
        },
        statsMax: {
          hp: 7150,
          atk: 430,
          def: 410,
          matk: 520,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "myne": {
    id: "myne",
    name: "Myne",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Photon",
        statsMin: {
          hp: 537,
          atk: 36,
          def: 34,
          matk: 44,
          mdef: 40
        },
        statsMax: {
          hp: 5370,
          atk: 360,
          def: 340,
          matk: 440,
          mdef: 400
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Photon",
        statsMin: {
          hp: 597,
          atk: 39,
          def: 37,
          matk: 47,
          mdef: 43
        },
        statsMax: {
          hp: 5970,
          atk: 390,
          def: 370,
          matk: 470,
          mdef: 430
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Photon",
        statsMin: {
          hp: 656,
          atk: 42,
          def: 40,
          matk: 50,
          mdef: 46
        },
        statsMax: {
          hp: 6560,
          atk: 420,
          def: 400,
          matk: 500,
          mdef: 460
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "mogha": {
    id: "mogha",
    name: "Mogha",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 528,
          atk: 22,
          def: 27,
          matk: 50,
          mdef: 46
        },
        statsMax: {
          hp: 5280,
          atk: 220,
          def: 270,
          matk: 500,
          mdef: 460
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 581,
          atk: 25,
          def: 30,
          matk: 53,
          mdef: 49
        },
        statsMax: {
          hp: 5810,
          atk: 250,
          def: 300,
          matk: 530,
          mdef: 490
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 644,
          atk: 28,
          def: 33,
          matk: 57,
          mdef: 52
        },
        statsMax: {
          hp: 6440,
          atk: 280,
          def: 330,
          matk: 570,
          mdef: 520
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "gatz_lambda": {
    id: "gatz_lambda",
    name: "Gatz Λ",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 663,
          atk: 49,
          def: 36,
          matk: 37,
          mdef: 37
        },
        statsMax: {
          hp: 6630,
          atk: 490,
          def: 360,
          matk: 370,
          mdef: 370
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "palpa_lambda": {
    id: "palpa_lambda",
    name: "Palpa Λ",
    rarity: "Z",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 566,
          atk: 27,
          def: 31,
          matk: 42,
          mdef: 40
        },
        statsMax: {
          hp: 5660,
          atk: 270,
          def: 310,
          matk: 420,
          mdef: 400
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1,
          mdef: 1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "eileen_lambda": {
    id: "eileen_lambda",
    name: "Eileen Λ",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 631,
          atk: 31,
          def: 30,
          matk: 43,
          mdef: 43
        },
        statsMax: {
          hp: 6310,
          atk: 310,
          def: 300,
          matk: 430,
          mdef: 430
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "suoh_lambda": {
    id: "suoh_lambda",
    name: "Suoh Λ",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 753,
          atk: 47,
          def: 45,
          matk: 41,
          mdef: 41
        },
        statsMax: {
          hp: 7530,
          atk: 470,
          def: 450,
          matk: 410,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "camellia_lambda": {
    id: "camellia_lambda",
    name: "Camellia Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 691,
          atk: 40,
          def: 33,
          matk: 40,
          mdef: 43
        },
        statsMax: {
          hp: 6910,
          atk: 400,
          def: 330,
          matk: 400,
          mdef: 430
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "korin_lambda": {
    id: "korin_lambda",
    name: "Korin Λ",
    rarity: "SS",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 631,
          atk: 44,
          def: 39,
          matk: 29,
          mdef: 39
        },
        statsMax: {
          hp: 6310,
          atk: 440,
          def: 390,
          matk: 290,
          mdef: 390
        },
        statCoefficients: {
          hp: 0.8,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "sh_berdan_lambda": {
    id: "sh_berdan_lambda",
    name: "Sh'berdan Λ",
    rarity: "S",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 597,
          atk: 45,
          def: 33,
          matk: 47,
          mdef: 43
        },
        statsMax: {
          hp: 5970,
          atk: 450,
          def: 330,
          matk: 470,
          mdef: 430
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "daiana_lambda": {
    id: "daiana_lambda",
    name: "Daiana Λ",
    rarity: "SS",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 601,
          atk: 31,
          def: 29,
          matk: 51,
          mdef: 54
        },
        statsMax: {
          hp: 6010,
          atk: 310,
          def: 290,
          matk: 510,
          mdef: 540
        },
        statCoefficients: {
          hp: 1,
          atk: 0.9,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "shin_en_lambda": {
    id: "shin_en_lambda",
    name: "Shin'en Λ",
    rarity: "Z",
    species: "Riftworlder",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 856,
          atk: 51,
          def: 44,
          matk: 62,
          mdef: 62
        },
        statsMax: {
          hp: 8560,
          atk: 510,
          def: 440,
          matk: 620,
          mdef: 620
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "mutoh_lambda": {
    id: "mutoh_lambda",
    name: "Mutoh Λ",
    rarity: "Z",
    species: "Riftworlder",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 888,
          atk: 46,
          def: 42,
          matk: 67,
          mdef: 61
        },
        statsMax: {
          hp: 8880,
          atk: 460,
          def: 420,
          matk: 670,
          mdef: 610
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "amina_lambda": {
    id: "amina_lambda",
    name: "Amina Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 608,
          atk: 30,
          def: 32,
          matk: 55,
          mdef: 48
        },
        statsMax: {
          hp: 6080,
          atk: 300,
          def: 320,
          matk: 550,
          mdef: 480
        },
        statCoefficients: {
          hp: 1.15,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "burbaba_lambda": {
    id: "burbaba_lambda",
    name: "Burbaba Λ",
    rarity: "SS",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 748,
          atk: 48,
          def: 37,
          matk: 28,
          mdef: 30
        },
        statsMax: {
          hp: 7480,
          atk: 480,
          def: 370,
          matk: 280,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "kem_lambda": {
    id: "kem_lambda",
    name: "Kem Λ",
    rarity: "SS",
    species: "Stonefolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 602,
          atk: 44,
          def: 39,
          matk: 30,
          mdef: 42
        },
        statsMax: {
          hp: 6020,
          atk: 440,
          def: 390,
          matk: 300,
          mdef: 420
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "s_naip_lambda": {
    id: "s_naip_lambda",
    name: "S'naip Λ",
    rarity: "SS",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 606,
          atk: 48,
          def: 32,
          matk: 27,
          mdef: 28
        },
        statsMax: {
          hp: 6060,
          atk: 480,
          def: 320,
          matk: 270,
          mdef: 280
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.15,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "mizell": {
    id: "mizell",
    name: "Mizell",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 534,
          atk: 24,
          def: 29,
          matk: 50,
          mdef: 46
        },
        statsMax: {
          hp: 5340,
          atk: 240,
          def: 290,
          matk: 500,
          mdef: 460
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.15
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 591,
          atk: 27,
          def: 32,
          matk: 54,
          mdef: 49
        },
        statsMax: {
          hp: 5910,
          atk: 270,
          def: 320,
          matk: 540,
          mdef: 490
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.15
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 654,
          atk: 30,
          def: 35,
          matk: 59,
          mdef: 51
        },
        statsMax: {
          hp: 6540,
          atk: 300,
          def: 350,
          matk: 590,
          mdef: 510
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.15
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "mizell_lambda": {
    id: "mizell_lambda",
    name: "Mizell Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 837,
          atk: 36,
          def: 40,
          matk: 68,
          mdef: 64
        },
        statsMax: {
          hp: 8370,
          atk: 360,
          def: 400,
          matk: 680,
          mdef: 640
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "lacuma": {
    id: "lacuma",
    name: "Lacuma",
    rarity: "Z",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Graviton",
        statsMin: {
          hp: 548,
          atk: 37,
          def: 35,
          matk: 45,
          mdef: 35
        },
        statsMax: {
          hp: 5480,
          atk: 370,
          def: 350,
          matk: 450,
          mdef: 350
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.15,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Graviton",
        statsMin: {
          hp: 607,
          atk: 40,
          def: 37,
          matk: 48,
          mdef: 38
        },
        statsMax: {
          hp: 6070,
          atk: 400,
          def: 370,
          matk: 480,
          mdef: 380
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.15,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Graviton",
        statsMin: {
          hp: 671,
          atk: 43,
          def: 40,
          matk: 51,
          mdef: 41
        },
        statsMax: {
          hp: 6710,
          atk: 430,
          def: 400,
          matk: 510,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.15,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "lacuma_lambda": {
    id: "lacuma_lambda",
    name: "Lacuma Λ",
    rarity: "Z",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Graviton",
        statsMin: {
          hp: 849,
          atk: 48,
          def: 43,
          matk: 55,
          mdef: 51
        },
        statsMax: {
          hp: 8490,
          atk: 480,
          def: 430,
          matk: 550,
          mdef: 510
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.15,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "okklitot": {
    id: "okklitot",
    name: "Okklitot",
    rarity: "S",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 434,
          atk: 40,
          def: 31,
          matk: 16,
          mdef: 18
        },
        statsMax: {
          hp: 4340,
          atk: 400,
          def: 310,
          matk: 160,
          mdef: 180
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 496,
          atk: 42,
          def: 34,
          matk: 19,
          mdef: 21
        },
        statsMax: {
          hp: 4960,
          atk: 420,
          def: 340,
          matk: 190,
          mdef: 210
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 551,
          atk: 45,
          def: 37,
          matk: 22,
          mdef: 24
        },
        statsMax: {
          hp: 5510,
          atk: 450,
          def: 370,
          matk: 220,
          mdef: 240
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "nia": {
    id: "nia",
    name: "Nia",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 343,
          atk: 32,
          def: 28,
          matk: 32,
          mdef: 27
        },
        statsMax: {
          hp: 3430,
          atk: 320,
          def: 280,
          matk: 320,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "Ice",
        statsMin: {
          hp: 412,
          atk: 28,
          def: 27,
          matk: 40,
          mdef: 33
        },
        statsMax: {
          hp: 4120,
          atk: 280,
          def: 270,
          matk: 400,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 0.95,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 464,
          atk: 33,
          def: 33,
          matk: 42,
          mdef: 38
        },
        statsMax: {
          hp: 4640,
          atk: 330,
          def: 330,
          matk: 420,
          mdef: 380
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 0.95,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "nia_lambda": {
    id: "nia_lambda",
    name: "Nia Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "None",
        element: "—",
        statsMin: {
          hp: 597,
          atk: 39,
          def: 36,
          matk: 44,
          mdef: 39
        },
        statsMax: {
          hp: 5970,
          atk: 390,
          def: 360,
          matk: 440,
          mdef: 390
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "bahl_lambda": {
    id: "bahl_lambda",
    name: "Bahl Λ",
    rarity: "S",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 555,
          atk: 46,
          def: 35,
          matk: 29,
          mdef: 29
        },
        statsMax: {
          hp: 5550,
          atk: 460,
          def: 350,
          matk: 290,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.05,
          mdef: 1.05
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "sha_plar_lambda": {
    id: "sha_plar_lambda",
    name: "Sha'plar Λ",
    rarity: "Z",
    species: "Lizardfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Darkness",
        statsMin: {
          hp: 677,
          atk: 40,
          def: 37,
          matk: 47,
          mdef: 36
        },
        statsMax: {
          hp: 6770,
          atk: 400,
          def: 370,
          matk: 470,
          mdef: 360
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "a_merpact_lambda": {
    id: "a_merpact_lambda",
    name: "A'merpact Λ",
    rarity: "SS",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 636,
          atk: 28,
          def: 30,
          matk: 49,
          mdef: 52
        },
        statsMax: {
          hp: 6360,
          atk: 280,
          def: 300,
          matk: 490,
          mdef: 520
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1,
          mdef: 1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ra_prow_lambda": {
    id: "ra_prow_lambda",
    name: "Ra'prow Λ",
    rarity: "S",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 629,
          atk: 48,
          def: 38,
          matk: 27,
          mdef: 31
        },
        statsMax: {
          hp: 6290,
          atk: 480,
          def: 380,
          matk: 270,
          mdef: 310
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.05,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "senala": {
    id: "senala",
    name: "Senala",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Photon",
        statsMin: {
          hp: 501,
          atk: 21,
          def: 26,
          matk: 54,
          mdef: 51
        },
        statsMax: {
          hp: 5010,
          atk: 210,
          def: 260,
          matk: 540,
          mdef: 510
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 563,
          atk: 23,
          def: 29,
          matk: 57,
          mdef: 54
        },
        statsMax: {
          hp: 5630,
          atk: 230,
          def: 290,
          matk: 570,
          mdef: 540
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 622,
          atk: 25,
          def: 33,
          matk: 60,
          mdef: 57
        },
        statsMax: {
          hp: 6220,
          atk: 250,
          def: 330,
          matk: 600,
          mdef: 570
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "senala_lambda": {
    id: "senala_lambda",
    name: "Senala Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 735,
          atk: 29,
          def: 38,
          matk: 68,
          mdef: 67
        },
        statsMax: {
          hp: 7350,
          atk: 290,
          def: 380,
          matk: 680,
          mdef: 670
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ella_lambda": {
    id: "ella_lambda",
    name: "Ella Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 615,
          atk: 33,
          def: 32,
          matk: 55,
          mdef: 49
        },
        statsMax: {
          hp: 6150,
          atk: 330,
          def: 320,
          matk: 550,
          mdef: 490
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "clara": {
    id: "clara",
    name: "Clara",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 438,
          atk: 39,
          def: 32,
          matk: 19,
          mdef: 19
        },
        statsMax: {
          hp: 4380,
          atk: 390,
          def: 320,
          matk: 190,
          mdef: 190
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 498,
          atk: 42,
          def: 35,
          matk: 22,
          mdef: 22
        },
        statsMax: {
          hp: 4980,
          atk: 420,
          def: 350,
          matk: 220,
          mdef: 220
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 557,
          atk: 45,
          def: 38,
          matk: 25,
          mdef: 25
        },
        statsMax: {
          hp: 5570,
          atk: 450,
          def: 380,
          matk: 250,
          mdef: 250
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "clara_lambda": {
    id: "clara_lambda",
    name: "Clara Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 644,
          atk: 50,
          def: 45,
          matk: 30,
          mdef: 31
        },
        statsMax: {
          hp: 6440,
          atk: 500,
          def: 450,
          matk: 300,
          mdef: 310
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "grace_lambda": {
    id: "grace_lambda",
    name: "Grace Λ",
    rarity: "S",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 574,
          atk: 48,
          def: 35,
          matk: 30,
          mdef: 32
        },
        statsMax: {
          hp: 5740,
          atk: 480,
          def: 350,
          matk: 300,
          mdef: 320
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "invincible_lambda": {
    id: "invincible_lambda",
    name: "Invincible Λ",
    rarity: "Z",
    species: "Celestial",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 772,
          atk: 39,
          def: 36,
          matk: 56,
          mdef: 47
        },
        statsMax: {
          hp: 7720,
          atk: 390,
          def: 360,
          matk: 560,
          mdef: 470
        },
        statCoefficients: {
          hp: 1.15,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "echo_lambda": {
    id: "echo_lambda",
    name: "Echo Λ",
    rarity: "Z",
    species: "Spirit",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 597,
          atk: 40,
          def: 32,
          matk: 41,
          mdef: 46
        },
        statsMax: {
          hp: 5970,
          atk: 400,
          def: 320,
          matk: 410,
          mdef: 460
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "violet": {
    id: "violet",
    name: "Violet",
    rarity: "Z",
    species: "Celestial",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 586,
          atk: 25,
          def: 28,
          matk: 52,
          mdef: 38
        },
        statsMax: {
          hp: 5860,
          atk: 250,
          def: 280,
          matk: 520,
          mdef: 380
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 646,
          atk: 28,
          def: 31,
          matk: 55,
          mdef: 41
        },
        statsMax: {
          hp: 6460,
          atk: 280,
          def: 310,
          matk: 550,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 709,
          atk: 31,
          def: 34,
          matk: 58,
          mdef: 44
        },
        statsMax: {
          hp: 7090,
          atk: 310,
          def: 340,
          matk: 580,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.15,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "scarlet": {
    id: "scarlet",
    name: "Scarlet",
    rarity: "Z",
    species: "Celestial",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 588,
          atk: 48,
          def: 41,
          matk: 26,
          mdef: 31
        },
        statsMax: {
          hp: 5880,
          atk: 480,
          def: 410,
          matk: 260,
          mdef: 310
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 648,
          atk: 53,
          def: 44,
          matk: 28,
          mdef: 34
        },
        statsMax: {
          hp: 6480,
          atk: 530,
          def: 440,
          matk: 280,
          mdef: 340
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 711,
          atk: 55,
          def: 47,
          matk: 31,
          mdef: 37
        },
        statsMax: {
          hp: 7110,
          atk: 550,
          def: 470,
          matk: 310,
          mdef: 370
        },
        statCoefficients: {
          hp: 1.15,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "seiryu_lambda": {
    id: "seiryu_lambda",
    name: "Seiryu Λ",
    rarity: "Z",
    species: "Dragon",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Darkness",
        statsMin: {
          hp: 723,
          atk: 40,
          def: 38,
          matk: 54,
          mdef: 48
        },
        statsMax: {
          hp: 7230,
          atk: 400,
          def: 380,
          matk: 540,
          mdef: 480
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "nephrite_dragon": {
    id: "nephrite_dragon",
    name: "Nephrite Dragon",
    rarity: "A",
    species: "Dragon",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Darkness",
        statsMin: {
          hp: 446,
          atk: 29,
          def: 25,
          matk: 34,
          mdef: 26
        },
        statsMax: {
          hp: 4460,
          atk: 290,
          def: 250,
          matk: 340,
          mdef: 260
        },
        statCoefficients: {
          hp: 1,
          atk: 0.95,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 10000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Darkness",
        statsMin: {
          hp: 505,
          atk: 33,
          def: 29,
          matk: 37,
          mdef: 29
        },
        statsMax: {
          hp: 5050,
          atk: 330,
          def: 290,
          matk: 370,
          mdef: 290
        },
        statCoefficients: {
          hp: 1,
          atk: 0.95,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 10000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Darkness",
        statsMin: {
          hp: 565,
          atk: 36,
          def: 33,
          matk: 40,
          mdef: 32
        },
        statsMax: {
          hp: 5650,
          atk: 360,
          def: 330,
          matk: 400,
          mdef: 320
        },
        statCoefficients: {
          hp: 1,
          atk: 0.95,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 10000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "engi": {
    id: "engi",
    name: "Engi",
    rarity: "Z",
    species: "Wild Beast",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 557,
          atk: 47,
          def: 43,
          matk: 25,
          mdef: 26
        },
        statsMax: {
          hp: 5570,
          atk: 470,
          def: 430,
          matk: 250,
          mdef: 260
        },
        statCoefficients: {
          hp: 1.15,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 612,
          atk: 50,
          def: 46,
          matk: 27,
          mdef: 29
        },
        statsMax: {
          hp: 6120,
          atk: 500,
          def: 460,
          matk: 270,
          mdef: 290
        },
        statCoefficients: {
          hp: 1.15,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 674,
          atk: 53,
          def: 49,
          matk: 30,
          mdef: 32
        },
        statsMax: {
          hp: 6740,
          atk: 530,
          def: 490,
          matk: 300,
          mdef: 320
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.15,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 11000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "annu": {
    id: "annu",
    name: "Annu",
    rarity: "Z",
    species: "Wild Beast",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Ice",
        statsMin: {
          hp: 535,
          atk: 35,
          def: 41,
          matk: 48,
          mdef: 38
        },
        statsMax: {
          hp: 5350,
          atk: 350,
          def: 410,
          matk: 480,
          mdef: 380
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Ice",
        statsMin: {
          hp: 591,
          atk: 37,
          def: 44,
          matk: 51,
          mdef: 41
        },
        statsMax: {
          hp: 5910,
          atk: 370,
          def: 440,
          matk: 510,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Ice",
        statsMin: {
          hp: 653,
          atk: 40,
          def: 47,
          matk: 54,
          mdef: 44
        },
        statsMax: {
          hp: 6530,
          atk: 400,
          def: 470,
          matk: 540,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "maldor": {
    id: "maldor",
    name: "Maldor",
    rarity: "SS",
    species: "Wild Beast",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 528,
          atk: 19,
          def: 20,
          matk: 39,
          mdef: 43
        },
        statsMax: {
          hp: 5280,
          atk: 190,
          def: 200,
          matk: 390,
          mdef: 430
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 587,
          atk: 22,
          def: 23,
          matk: 41,
          mdef: 46
        },
        statsMax: {
          hp: 5870,
          atk: 220,
          def: 230,
          matk: 410,
          mdef: 460
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Lightning",
        statsMin: {
          hp: 649,
          atk: 25,
          def: 26,
          matk: 43,
          mdef: 49
        },
        statsMax: {
          hp: 6490,
          atk: 250,
          def: 260,
          matk: 430,
          mdef: 490
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "kir_ue": {
    id: "kir_ue",
    name: "Kir'ue",
    rarity: "SS",
    species: "Wild Beast",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Photon",
        statsMin: {
          hp: 483,
          atk: 33,
          def: 29,
          matk: 40,
          mdef: 34
        },
        statsMax: {
          hp: 4830,
          atk: 330,
          def: 290,
          matk: 400,
          mdef: 340
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "Photon",
        statsMin: {
          hp: 547,
          atk: 36,
          def: 32,
          matk: 43,
          mdef: 37
        },
        statsMax: {
          hp: 5470,
          atk: 360,
          def: 320,
          matk: 430,
          mdef: 370
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "Photon",
        statsMin: {
          hp: 605,
          atk: 39,
          def: 35,
          matk: 46,
          mdef: 40
        },
        statsMax: {
          hp: 6050,
          atk: 390,
          def: 350,
          matk: 460,
          mdef: 400
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "iskar": {
    id: "iskar",
    name: "Iskar",
    rarity: "A",
    species: "Wild Beast",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Photon",
        statsMin: {
          hp: 388,
          atk: 28,
          def: 26,
          matk: 36,
          mdef: 28
        },
        statsMax: {
          hp: 3880,
          atk: 280,
          def: 260,
          matk: 360,
          mdef: 280
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 1.05
        },
        expMax: 3500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Photon",
        statsMin: {
          hp: 447,
          atk: 31,
          def: 29,
          matk: 39,
          mdef: 31
        },
        statsMax: {
          hp: 4470,
          atk: 310,
          def: 290,
          matk: 390,
          mdef: 310
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 1.05
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Photon",
        statsMin: {
          hp: 508,
          atk: 34,
          def: 32,
          matk: 42,
          mdef: 34
        },
        statsMax: {
          hp: 5080,
          atk: 340,
          def: 320,
          matk: 420,
          mdef: 340
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 1.05
        },
        expMax: 4000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "jag": {
    id: "jag",
    name: "Jag",
    rarity: "SS",
    species: "Wild Beast",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 525,
          atk: 20,
          def: 24,
          matk: 49,
          mdef: 47
        },
        statsMax: {
          hp: 5250,
          atk: 200,
          def: 240,
          matk: 490,
          mdef: 470
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 1.05
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 585,
          atk: 23,
          def: 26,
          matk: 52,
          mdef: 51
        },
        statsMax: {
          hp: 5850,
          atk: 230,
          def: 260,
          matk: 520,
          mdef: 510
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 1.05
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 642,
          atk: 26,
          def: 29,
          matk: 55,
          mdef: 54
        },
        statsMax: {
          hp: 6420,
          atk: 260,
          def: 290,
          matk: 550,
          mdef: 540
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1.05,
          mdef: 1.05
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "noctis": {
    id: "noctis",
    name: "Noctis",
    rarity: "S",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 333,
          atk: 37,
          def: 28,
          matk: 31,
          mdef: 27
        },
        statsMax: {
          hp: 3330,
          atk: 370,
          def: 280,
          matk: 310,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 393,
          atk: 40,
          def: 31,
          matk: 34,
          mdef: 30
        },
        statsMax: {
          hp: 3930,
          atk: 400,
          def: 310,
          matk: 340,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 453,
          atk: 43,
          def: 34,
          matk: 37,
          mdef: 33
        },
        statsMax: {
          hp: 4530,
          atk: 430,
          def: 340,
          matk: 370,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "velraine_lambda": {
    id: "velraine_lambda",
    name: "Velraine Λ",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 604,
          atk: 43,
          def: 42,
          matk: 42,
          mdef: 34
        },
        statsMax: {
          hp: 6040,
          atk: 430,
          def: 420,
          matk: 420,
          mdef: 340
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "dracorin_lambda": {
    id: "dracorin_lambda",
    name: "Dracorin Λ",
    rarity: "S",
    species: "Wild Beast",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Lightning",
        statsMin: {
          hp: 472,
          atk: 35,
          def: 33,
          matk: 39,
          mdef: 30
        },
        statsMax: {
          hp: 4720,
          atk: 350,
          def: 330,
          matk: 390,
          mdef: 300
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 8000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "nazuna": {
    id: "nazuna",
    name: "Nazuna",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 454,
          atk: 20,
          def: 27,
          matk: 52,
          mdef: 49
        },
        statsMax: {
          hp: 4540,
          atk: 200,
          def: 270,
          matk: 520,
          mdef: 490
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 515,
          atk: 22,
          def: 30,
          matk: 55,
          mdef: 52
        },
        statsMax: {
          hp: 5150,
          atk: 220,
          def: 300,
          matk: 550,
          mdef: 520
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 576,
          atk: 24,
          def: 33,
          matk: 58,
          mdef: 55
        },
        statsMax: {
          hp: 5760,
          atk: 240,
          def: 330,
          matk: 580,
          mdef: 550
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "nazuna_lambda": {
    id: "nazuna_lambda",
    name: "Nazuna Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 657,
          atk: 28,
          def: 36,
          matk: 66,
          mdef: 65
        },
        statsMax: {
          hp: 6570,
          atk: 280,
          def: 360,
          matk: 660,
          mdef: 650
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "tronic_gal": {
    id: "tronic_gal",
    name: "Tronic Gal",
    rarity: "Z",
    species: "Machine",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Sun",
        statsMin: {
          hp: 515,
          atk: 22,
          def: 22,
          matk: 53,
          mdef: 54
        },
        statsMax: {
          hp: 5150,
          atk: 220,
          def: 220,
          matk: 530,
          mdef: 540
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 8000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Moon",
        statsMin: {
          hp: 605,
          atk: 26,
          def: 28,
          matk: 59,
          mdef: 59
        },
        statsMax: {
          hp: 6050,
          atk: 260,
          def: 280,
          matk: 590,
          mdef: 590
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 671,
          atk: 32,
          def: 33,
          matk: 65,
          mdef: 66
        },
        statsMax: {
          hp: 6710,
          atk: 320,
          def: 330,
          matk: 650,
          mdef: 660
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "feno": {
    id: "feno",
    name: "Feno",
    rarity: "Z",
    species: "Oxsecian",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Moon",
        statsMin: {
          hp: 543,
          atk: 22,
          def: 29,
          matk: 56,
          mdef: 47
        },
        statsMax: {
          hp: 5430,
          atk: 220,
          def: 290,
          matk: 560,
          mdef: 470
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Moon",
        statsMin: {
          hp: 603,
          atk: 25,
          def: 32,
          matk: 59,
          mdef: 50
        },
        statsMax: {
          hp: 6030,
          atk: 250,
          def: 320,
          matk: 590,
          mdef: 500
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Moon",
        statsMin: {
          hp: 663,
          atk: 28,
          def: 35,
          matk: 62,
          mdef: 53
        },
        statsMax: {
          hp: 6630,
          atk: 280,
          def: 350,
          matk: 620,
          mdef: 530
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "hakann": {
    id: "hakann",
    name: "Hakann",
    rarity: "Z",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Sun",
        statsMin: {
          hp: 572,
          atk: 40,
          def: 40,
          matk: 41,
          mdef: 33
        },
        statsMax: {
          hp: 5720,
          atk: 400,
          def: 400,
          matk: 410,
          mdef: 330
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Sun",
        statsMin: {
          hp: 632,
          atk: 43,
          def: 43,
          matk: 44,
          mdef: 36
        },
        statsMax: {
          hp: 6320,
          atk: 430,
          def: 430,
          matk: 440,
          mdef: 360
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Sun",
        statsMin: {
          hp: 696,
          atk: 46,
          def: 46,
          matk: 47,
          mdef: 39
        },
        statsMax: {
          hp: 6960,
          atk: 460,
          def: 460,
          matk: 470,
          mdef: 390
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1,
          mdef: 1.1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "marcus": {
    id: "marcus",
    name: "Marcus",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Sun",
        statsMin: {
          hp: 515,
          atk: 22,
          def: 30,
          matk: 52,
          mdef: 43
        },
        statsMax: {
          hp: 5150,
          atk: 220,
          def: 300,
          matk: 520,
          mdef: 430
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Sun",
        statsMin: {
          hp: 577,
          atk: 26,
          def: 33,
          matk: 55,
          mdef: 46
        },
        statsMax: {
          hp: 5770,
          atk: 260,
          def: 330,
          matk: 550,
          mdef: 460
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Sun",
        statsMin: {
          hp: 634,
          atk: 29,
          def: 36,
          matk: 58,
          mdef: 49
        },
        statsMax: {
          hp: 6340,
          atk: 290,
          def: 360,
          matk: 580,
          mdef: 490
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ashe": {
    id: "ashe",
    name: "Ashe",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Moon",
        statsMin: {
          hp: 518,
          atk: 34,
          def: 36,
          matk: 47,
          mdef: 39
        },
        statsMax: {
          hp: 5180,
          atk: 340,
          def: 360,
          matk: 470,
          mdef: 390
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "Moon",
        statsMin: {
          hp: 576,
          atk: 37,
          def: 39,
          matk: 50,
          mdef: 42
        },
        statsMax: {
          hp: 5760,
          atk: 370,
          def: 390,
          matk: 500,
          mdef: 420
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "Moon",
        statsMin: {
          hp: 639,
          atk: 40,
          def: 42,
          matk: 53,
          mdef: 45
        },
        statsMax: {
          hp: 6390,
          atk: 400,
          def: 420,
          matk: 530,
          mdef: 450
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 11000000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "dahlia": {
    id: "dahlia",
    name: "Dahlia",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Moon",
        statsMin: {
          hp: 521,
          atk: 32,
          def: 34,
          matk: 49,
          mdef: 40
        },
        statsMax: {
          hp: 5210,
          atk: 320,
          def: 340,
          matk: 490,
          mdef: 400
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Moon",
        statsMin: {
          hp: 583,
          atk: 35,
          def: 37,
          matk: 52,
          mdef: 43
        },
        statsMax: {
          hp: 5830,
          atk: 350,
          def: 370,
          matk: 520,
          mdef: 430
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "Moon",
        statsMin: {
          hp: 644,
          atk: 38,
          def: 40,
          matk: 55,
          mdef: 46
        },
        statsMax: {
          hp: 6440,
          atk: 380,
          def: 400,
          matk: 550,
          mdef: 460
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "shay": {
    id: "shay",
    name: "Shay",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 524,
          atk: 47,
          def: 38,
          matk: 28,
          mdef: 38
        },
        statsMax: {
          hp: 5240,
          atk: 470,
          def: 380,
          matk: 280,
          mdef: 380
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 581,
          atk: 31,
          def: 33,
          matk: 58,
          mdef: 59
        },
        statsMax: {
          hp: 5810,
          atk: 310,
          def: 330,
          matk: 580,
          mdef: 590
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 644,
          atk: 53,
          def: 44,
          matk: 43,
          mdef: 44
        },
        statsMax: {
          hp: 6440,
          atk: 530,
          def: 440,
          matk: 430,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 11000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "arionne": {
    id: "arionne",
    name: "Arionne",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 506,
          atk: 23,
          def: 30,
          matk: 55,
          mdef: 56
        },
        statsMax: {
          hp: 5060,
          atk: 230,
          def: 300,
          matk: 550,
          mdef: 560
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 569,
          atk: 24,
          def: 33,
          matk: 59,
          mdef: 60
        },
        statsMax: {
          hp: 5690,
          atk: 240,
          def: 330,
          matk: 590,
          mdef: 600
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 626,
          atk: 29,
          def: 36,
          matk: 61,
          mdef: 62
        },
        statsMax: {
          hp: 6260,
          atk: 290,
          def: 360,
          matk: 610,
          mdef: 620
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "morgana": {
    id: "morgana",
    name: "Morgana",
    rarity: "S",
    species: "Machine",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "None",
        element: "—",
        statsMin: {
          hp: 354,
          atk: 35,
          def: 28,
          matk: 35,
          mdef: 28
        },
        statsMax: {
          hp: 3540,
          atk: 350,
          def: 280,
          matk: 350,
          mdef: 280
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 9000000,
        expCoeff: 2.2,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "None",
        element: "—",
        statsMin: {
          hp: 418,
          atk: 38,
          def: 31,
          matk: 38,
          mdef: 31
        },
        statsMax: {
          hp: 4180,
          atk: 380,
          def: 310,
          matk: 380,
          mdef: 310
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 10000000,
        expCoeff: 2.2,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "None",
        element: "—",
        statsMin: {
          hp: 476,
          atk: 41,
          def: 34,
          matk: 41,
          mdef: 34
        },
        statsMax: {
          hp: 4760,
          atk: 410,
          def: 340,
          matk: 410,
          mdef: 340
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 11000000,
        expCoeff: 2.2,
        skills: []
      }
    ]
  },
  "haruhikari": {
    id: "haruhikari",
    name: "Haruhikari",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 418,
          atk: 22,
          def: 30,
          matk: 51,
          mdef: 51
        },
        statsMax: {
          hp: 4180,
          atk: 220,
          def: 300,
          matk: 510,
          mdef: 510
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 477,
          atk: 25,
          def: 33,
          matk: 54,
          mdef: 54
        },
        statsMax: {
          hp: 4770,
          atk: 250,
          def: 330,
          matk: 540,
          mdef: 540
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 539,
          atk: 28,
          def: 36,
          matk: 57,
          mdef: 57
        },
        statsMax: {
          hp: 5390,
          atk: 280,
          def: 360,
          matk: 570,
          mdef: 570
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "zaldor": {
    id: "zaldor",
    name: "Zaldor",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 542,
          atk: 42,
          def: 38,
          matk: 41,
          mdef: 31
        },
        statsMax: {
          hp: 5420,
          atk: 420,
          def: 380,
          matk: 410,
          mdef: 310
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 602,
          atk: 45,
          def: 41,
          matk: 44,
          mdef: 34
        },
        statsMax: {
          hp: 6020,
          atk: 450,
          def: 410,
          matk: 440,
          mdef: 340
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 661,
          atk: 48,
          def: 44,
          matk: 47,
          mdef: 37
        },
        statsMax: {
          hp: 6610,
          atk: 480,
          def: 440,
          matk: 470,
          mdef: 370
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ginny": {
    id: "ginny",
    name: "Ginny",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 515,
          atk: 48,
          def: 42,
          matk: 24,
          mdef: 27
        },
        statsMax: {
          hp: 5150,
          atk: 480,
          def: 420,
          matk: 240,
          mdef: 270
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 576,
          atk: 53,
          def: 45,
          matk: 26,
          mdef: 30
        },
        statsMax: {
          hp: 5760,
          atk: 530,
          def: 450,
          matk: 260,
          mdef: 300
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 632,
          atk: 56,
          def: 48,
          matk: 28,
          mdef: 33
        },
        statsMax: {
          hp: 6320,
          atk: 560,
          def: 480,
          matk: 280,
          mdef: 330
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 11000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "haggo": {
    id: "haggo",
    name: "Haggo",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 536,
          atk: 24,
          def: 28,
          matk: 50,
          mdef: 45
        },
        statsMax: {
          hp: 5360,
          atk: 240,
          def: 280,
          matk: 500,
          mdef: 450
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 595,
          atk: 27,
          def: 31,
          matk: 53,
          mdef: 48
        },
        statsMax: {
          hp: 5950,
          atk: 270,
          def: 310,
          matk: 530,
          mdef: 480
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 654,
          atk: 30,
          def: 34,
          matk: 56,
          mdef: 51
        },
        statsMax: {
          hp: 6540,
          atk: 300,
          def: 340,
          matk: 560,
          mdef: 510
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ba_gunar_lambda": {
    id: "ba_gunar_lambda",
    name: "Ba'gunar Λ",
    rarity: "S",
    species: "Lizardfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Photon",
        statsMin: {
          hp: 614,
          atk: 44,
          def: 34,
          matk: 52,
          mdef: 41
        },
        statsMax: {
          hp: 6140,
          atk: 440,
          def: 340,
          matk: 520,
          mdef: 410
        },
        statCoefficients: {
          hp: 1,
          atk: 1.05,
          def: 1,
          matk: 1.05,
          mdef: 1
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "djugan_lambda": {
    id: "djugan_lambda",
    name: "Djugan Λ",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "—",
        statsMin: {
          hp: 736,
          atk: 53,
          def: 48,
          matk: 36,
          mdef: 37
        },
        statsMax: {
          hp: 7360,
          atk: 530,
          def: 480,
          matk: 360,
          mdef: 370
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "feno_lambda": {
    id: "feno_lambda",
    name: "Feno Λ",
    rarity: "Z",
    species: "Human",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Moon",
        statsMin: {
          hp: 681,
          atk: 29,
          def: 37,
          matk: 69,
          mdef: 57
        },
        statsMax: {
          hp: 6810,
          atk: 290,
          def: 370,
          matk: 690,
          mdef: 570
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "sayu_lambda": {
    id: "sayu_lambda",
    name: "Sayu Λ",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Photon",
        statsMin: {
          hp: 698,
          atk: 30,
          def: 36,
          matk: 68,
          mdef: 58
        },
        statsMax: {
          hp: 6980,
          atk: 300,
          def: 360,
          matk: 680,
          mdef: 580
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "andelucia_lambda": {
    id: "andelucia_lambda",
    name: "Andelucia Λ",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Graviton",
        statsMin: {
          hp: 702,
          atk: 49,
          def: 51,
          matk: 56,
          mdef: 54
        },
        statsMax: {
          hp: 7020,
          atk: 490,
          def: 510,
          matk: 560,
          mdef: 540
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "beau_ne_lambda": {
    id: "beau_ne_lambda",
    name: "Beau'ne Λ",
    rarity: "Z",
    species: "Lizardfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Photon",
        statsMin: {
          hp: 741,
          atk: 45,
          def: 41,
          matk: 60,
          mdef: 57
        },
        statsMax: {
          hp: 7410,
          atk: 450,
          def: 410,
          matk: 600,
          mdef: 570
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ginny_lambda": {
    id: "ginny_lambda",
    name: "Ginny Λ",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 727,
          atk: 57,
          def: 50,
          matk: 32,
          mdef: 35
        },
        statsMax: {
          hp: 7270,
          atk: 570,
          def: 500,
          matk: 320,
          mdef: 350
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12500000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "zafitte_lambda": {
    id: "zafitte_lambda",
    name: "Zafitte Λ",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Remedy",
        statsMin: {
          hp: 649,
          atk: 47,
          def: 35,
          matk: 63,
          mdef: 62
        },
        statsMax: {
          hp: 6490,
          atk: 470,
          def: 350,
          matk: 630,
          mdef: 620
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "pahrl_lambda": {
    id: "pahrl_lambda",
    name: "Pahrl Λ",
    rarity: "SS",
    species: "Stonefolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 627,
          atk: 44,
          def: 39,
          matk: 30,
          mdef: 41
        },
        statsMax: {
          hp: 6270,
          atk: 440,
          def: 390,
          matk: 300,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "renova": {
    id: "renova",
    name: "Renova",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Sun",
        statsMin: {
          hp: 522,
          atk: 23,
          def: 29,
          matk: 57,
          mdef: 44
        },
        statsMax: {
          hp: 5220,
          atk: 230,
          def: 290,
          matk: 570,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Sun",
        statsMin: {
          hp: 584,
          atk: 26,
          def: 32,
          matk: 63,
          mdef: 48
        },
        statsMax: {
          hp: 5840,
          atk: 260,
          def: 320,
          matk: 630,
          mdef: 480
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Sun",
        statsMin: {
          hp: 645,
          atk: 29,
          def: 35,
          matk: 69,
          mdef: 52
        },
        statsMax: {
          hp: 6450,
          atk: 290,
          def: 350,
          matk: 690,
          mdef: 520
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "varve": {
    id: "varve",
    name: "Varve",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Spear",
        element: "Sun",
        statsMin: {
          hp: 503,
          atk: 34,
          def: 37,
          matk: 45,
          mdef: 41
        },
        statsMax: {
          hp: 5030,
          atk: 340,
          def: 370,
          matk: 450,
          mdef: 410
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Spear",
        element: "Sun",
        statsMin: {
          hp: 564,
          atk: 38,
          def: 41,
          matk: 50,
          mdef: 47
        },
        statsMax: {
          hp: 5640,
          atk: 380,
          def: 410,
          matk: 500,
          mdef: 470
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Spear",
        element: "Sun",
        statsMin: {
          hp: 627,
          atk: 42,
          def: 45,
          matk: 55,
          mdef: 53
        },
        statsMax: {
          hp: 6270,
          atk: 420,
          def: 450,
          matk: 550,
          mdef: 530
        },
        statCoefficients: {
          hp: 1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 11000000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  },
  "lio": {
    id: "lio",
    name: "Lio",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Moon",
        statsMin: {
          hp: 549,
          atk: 37,
          def: 39,
          matk: 40,
          mdef: 41
        },
        statsMax: {
          hp: 5490,
          atk: 370,
          def: 390,
          matk: 400,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Moon",
        statsMin: {
          hp: 602,
          atk: 42,
          def: 45,
          matk: 45,
          mdef: 46
        },
        statsMax: {
          hp: 6020,
          atk: 420,
          def: 450,
          matk: 450,
          mdef: 460
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Moon",
        statsMin: {
          hp: 664,
          atk: 47,
          def: 49,
          matk: 50,
          mdef: 51
        },
        statsMax: {
          hp: 6640,
          atk: 470,
          def: 490,
          matk: 500,
          mdef: 510
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "gigojago_lambda": {
    id: "gigojago_lambda",
    name: "Gigojago Λ",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "—",
        statsMin: {
          hp: 668,
          atk: 54,
          def: 46,
          matk: 51,
          mdef: 41
        },
        statsMax: {
          hp: 6680,
          atk: 540,
          def: 460,
          matk: 510,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 12000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "rowlow": {
    id: "rowlow",
    name: "Rowlow",
    rarity: "Z",
    species: "Beastfolk",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 507,
          atk: 20,
          def: 28,
          matk: 56,
          mdef: 44
        },
        statsMax: {
          hp: 5070,
          atk: 200,
          def: 280,
          matk: 560,
          mdef: 440
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 569,
          atk: 23,
          def: 31,
          matk: 59,
          mdef: 47
        },
        statsMax: {
          hp: 5690,
          atk: 230,
          def: 310,
          matk: 590,
          mdef: 470
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "—",
        statsMin: {
          hp: 628,
          atk: 26,
          def: 34,
          matk: 62,
          mdef: 50
        },
        statsMax: {
          hp: 6280,
          atk: 260,
          def: 340,
          matk: 620,
          mdef: 500
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "djagos": {
    id: "djagos",
    name: "Djagos",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 522,
          atk: 21,
          def: 24,
          matk: 52,
          mdef: 47
        },
        statsMax: {
          hp: 5220,
          atk: 210,
          def: 240,
          matk: 520,
          mdef: 470
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 581,
          atk: 24,
          def: 27,
          matk: 55,
          mdef: 50
        },
        statsMax: {
          hp: 5810,
          atk: 240,
          def: 270,
          matk: 550,
          mdef: 500
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.05,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Fire",
        statsMin: {
          hp: 641,
          atk: 27,
          def: 30,
          matk: 58,
          mdef: 53
        },
        statsMax: {
          hp: 6410,
          atk: 270,
          def: 300,
          matk: 580,
          mdef: 530
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.05,
        skills: []
      }
    ]
  },
  "tsutsura": {
    id: "tsutsura",
    name: "Tsutsura",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 512,
          atk: 20,
          def: 25,
          matk: 53,
          mdef: 46
        },
        statsMax: {
          hp: 5120,
          atk: 200,
          def: 250,
          matk: 530,
          mdef: 460
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 571,
          atk: 23,
          def: 28,
          matk: 56,
          mdef: 49
        },
        statsMax: {
          hp: 5710,
          atk: 230,
          def: 280,
          matk: 560,
          mdef: 490
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Ice",
        statsMin: {
          hp: 633,
          atk: 26,
          def: 31,
          matk: 59,
          mdef: 52
        },
        statsMax: {
          hp: 6330,
          atk: 260,
          def: 310,
          matk: 590,
          mdef: 520
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 11000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "chirol": {
    id: "chirol",
    name: "Chirol",
    rarity: "Z",
    species: "Machine",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 542,
          atk: 21,
          def: 27,
          matk: 55,
          mdef: 43
        },
        statsMax: {
          hp: 5420,
          atk: 210,
          def: 270,
          matk: 550,
          mdef: 430
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.05,
          matk: 1.1,
          mdef: 1.05
        },
        expMax: 9000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 603,
          atk: 24,
          def: 30,
          matk: 58,
          mdef: 46
        },
        statsMax: {
          hp: 6030,
          atk: 240,
          def: 300,
          matk: 580,
          mdef: 460
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.05,
          matk: 1.1,
          mdef: 1.05
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Graviton",
        statsMin: {
          hp: 664,
          atk: 27,
          def: 33,
          matk: 61,
          mdef: 49
        },
        statsMax: {
          hp: 6640,
          atk: 270,
          def: 330,
          matk: 610,
          mdef: 490
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.05,
          matk: 1.1,
          mdef: 1.05
        },
        expMax: 11000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "ryoma": {
    id: "ryoma",
    name: "Ryoma",
    rarity: "Z",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 528,
          atk: 42,
          def: 38,
          matk: 40,
          mdef: 35
        },
        statsMax: {
          hp: 5280,
          atk: 420,
          def: 380,
          matk: 400,
          mdef: 350
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 589,
          atk: 45,
          def: 41,
          matk: 43,
          mdef: 38
        },
        statsMax: {
          hp: 5890,
          atk: 450,
          def: 410,
          matk: 430,
          mdef: 380
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 647,
          atk: 48,
          def: 44,
          matk: 46,
          mdef: 41
        },
        statsMax: {
          hp: 6470,
          atk: 480,
          def: 440,
          matk: 460,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "roland": {
    id: "roland",
    name: "Roland",
    rarity: "SS",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Bow",
        element: "Photon",
        statsMin: {
          hp: 451,
          atk: 33,
          def: 31,
          matk: 39,
          mdef: 34
        },
        statsMax: {
          hp: 4510,
          atk: 330,
          def: 310,
          matk: 390,
          mdef: 340
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Bow",
        element: "Photon",
        statsMin: {
          hp: 511,
          atk: 36,
          def: 34,
          matk: 42,
          mdef: 37
        },
        statsMax: {
          hp: 5110,
          atk: 360,
          def: 340,
          matk: 420,
          mdef: 370
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Bow",
        element: "Darkness",
        statsMin: {
          hp: 572,
          atk: 39,
          def: 37,
          matk: 45,
          mdef: 40
        },
        statsMax: {
          hp: 5720,
          atk: 390,
          def: 370,
          matk: 450,
          mdef: 400
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "elga": {
    id: "elga",
    name: "Elga",
    rarity: "Z",
    species: "Wild Beast",
    gender: "Unisex",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 561,
          atk: 47,
          def: 42,
          matk: 23,
          mdef: 27
        },
        statsMax: {
          hp: 5610,
          atk: 470,
          def: 420,
          matk: 230,
          mdef: 270
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1.1,
          def: 1.05,
          matk: 1.1,
          mdef: 1.05
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 621,
          atk: 50,
          def: 45,
          matk: 26,
          mdef: 30
        },
        statsMax: {
          hp: 6210,
          atk: 500,
          def: 450,
          matk: 260,
          mdef: 300
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1.1,
          def: 1.05,
          matk: 1.1,
          mdef: 1.05
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "—",
        statsMin: {
          hp: 682,
          atk: 53,
          def: 48,
          matk: 29,
          mdef: 33
        },
        statsMax: {
          hp: 6820,
          atk: 530,
          def: 480,
          matk: 290,
          mdef: 330
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1.1,
          def: 1.05,
          matk: 1.1,
          mdef: 1.05
        },
        expMax: 11000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "koh": {
    id: "koh",
    name: "Koh",
    rarity: "SS",
    species: "Human",
    gender: "Male",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Sword",
        element: "Fire",
        statsMin: {
          hp: 477,
          atk: 32,
          def: 29,
          matk: 38,
          mdef: 35
        },
        statsMax: {
          hp: 4770,
          atk: 320,
          def: 290,
          matk: 380,
          mdef: 350
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Sword",
        element: "Fire",
        statsMin: {
          hp: 536,
          atk: 35,
          def: 32,
          matk: 41,
          mdef: 38
        },
        statsMax: {
          hp: 5360,
          atk: 350,
          def: 320,
          matk: 410,
          mdef: 380
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Sword",
        element: "Fire",
        statsMin: {
          hp: 595,
          atk: 38,
          def: 35,
          matk: 44,
          mdef: 41
        },
        statsMax: {
          hp: 5950,
          atk: 380,
          def: 350,
          matk: 440,
          mdef: 410
        },
        statCoefficients: {
          hp: 1.05,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 6000000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "mizury": {
    id: "mizury",
    name: "Mizury",
    rarity: "Z",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 407,
          atk: 21,
          def: 31,
          matk: 51,
          mdef: 52
        },
        statsMax: {
          hp: 4070,
          atk: 210,
          def: 310,
          matk: 510,
          mdef: 520
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 9500000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 466,
          atk: 24,
          def: 34,
          matk: 54,
          mdef: 55
        },
        statsMax: {
          hp: 4660,
          atk: 240,
          def: 340,
          matk: 540,
          mdef: 550
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10000000,
        expCoeff: 2.1,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 524,
          atk: 27,
          def: 37,
          matk: 57,
          mdef: 58
        },
        statsMax: {
          hp: 5240,
          atk: 270,
          def: 370,
          matk: 570,
          mdef: 580
        },
        statCoefficients: {
          hp: 1.1,
          atk: 1.1,
          def: 1.1,
          matk: 1.1,
          mdef: 1.1
        },
        expMax: 10500000,
        expCoeff: 2.1,
        skills: []
      }
    ]
  },
  "lew": {
    id: "lew",
    name: "Lew",
    rarity: "SS",
    species: "Human",
    gender: "Female",
    sources: [],
    jobs: [
      {
        jobIndex: 1,
        title: "Job 1",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 373,
          atk: 19,
          def: 23,
          matk: 44,
          mdef: 40
        },
        statsMax: {
          hp: 3730,
          atk: 190,
          def: 230,
          matk: 440,
          mdef: 400
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5000000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 2,
        title: "Job 2",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 432,
          atk: 22,
          def: 26,
          matk: 47,
          mdef: 43
        },
        statsMax: {
          hp: 4320,
          atk: 220,
          def: 260,
          matk: 470,
          mdef: 430
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.15,
        skills: []
      },
      {
        jobIndex: 3,
        title: "Job 3",
        weapon: "Staff",
        element: "Healing",
        statsMin: {
          hp: 491,
          atk: 25,
          def: 31,
          matk: 50,
          mdef: 46
        },
        statsMax: {
          hp: 4910,
          atk: 250,
          def: 310,
          matk: 500,
          mdef: 460
        },
        statCoefficients: {
          hp: 1,
          atk: 1,
          def: 1,
          matk: 1,
          mdef: 1
        },
        expMax: 5500000,
        expCoeff: 2.15,
        skills: []
      }
    ]
  }
};

export const CHARACTERS: Record<string, CharacterDef> = (() => {
  const curatedByName = new Map(
    Object.values(CURATED_CHARACTERS).map((character) => [character.name, character]),
  );
  const characters: Record<string, CharacterDef> = {};
  for (const source of Object.values(WIKI_ADVENTURERS)) {
    const curated = curatedByName.get(source.name);
    const id = curated?.id ?? source.id;
    characters[id] = {
      ...source,
      id,
      verified: "Y",
      sources: curated?.sources ?? source.sources,
      description: curated?.description,
      jobs: source.jobs.map((job) => {
        const previous = curated?.jobs[job.jobIndex - 1];
        return {
          ...job,
          title: previous?.title ?? job.title,
          skills: previous?.skills ?? job.skills,
          unlockCost: previous?.unlockCost,
        };
      }),
    };
  }
  return characters;
})();

export const CHARACTER_LIST = Object.values(CHARACTERS);

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS[id];
}

/** Owned character instance (progress). */
export interface CharacterInstance {
  uid: string;
  defId: string;
  activeJob: 1 | 2 | 3;
  jobLevels: [number, number, number];
  /** XP accumulated toward the next level for each job. */
  jobXp: [number, number, number];
  jobsUnlocked: 1 | 2 | 3;
  skillBoost: number;
  luck: number;
  companionUid?: string;
}

/** Add XP to one job, returning its level after applying all earned level-ups. */
export function addCharacterJobXp(
  instance: CharacterInstance,
  job: JobDef,
  amount: number,
): { xpAwarded: number; levelsGained: number } {
  const index = job.jobIndex - 1;
  const xpAwarded = Math.max(0, Math.floor(amount));
  if (instance.jobLevels[index] >= 90) {
    instance.jobXp[index] = 0;
    return { xpAwarded: 0, levelsGained: 0 };
  }

  instance.jobXp[index] += xpAwarded;
  let levelsGained = 0;
  while (instance.jobLevels[index] < 90) {
    const needed = characterXpToNextLevel(job, instance.jobLevels[index]);
    if (instance.jobXp[index] < needed) break;
    instance.jobXp[index] -= needed;
    instance.jobLevels[index] += 1;
    levelsGained += 1;
  }
  if (instance.jobLevels[index] >= 90) instance.jobXp[index] = 0;
  return { xpAwarded, levelsGained };
}

export function createCharacterInstance(
  defId: string,
  opts?: {
    job?: 1 | 2 | 3;
    levels?: [number, number, number];
    jobsUnlocked?: 1 | 2 | 3;
  },
): CharacterInstance {
  return {
    uid: `${defId}_${Math.random().toString(36).slice(2, 9)}`,
    defId,
    activeJob: opts?.job ?? 1,
    jobLevels: opts?.levels ?? [1, 1, 1],
    jobXp: [0, 0, 0],
    jobsUnlocked: opts?.jobsUnlocked ?? 1,
    skillBoost: 0,
    luck: 0,
  };
}
