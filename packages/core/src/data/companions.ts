/**
 * Companion data model and seed set — true to Terra Battle mechanics.
 * Placeholder names kept as internal reference labels (reskin before release).
 *
 * Sources: terrabattle.fandom.com Companions, Companions/Upgrade, individual pages
 * (Fire Visor, Healing Ring, etc.) and the comprehensive list structure.
 */

export type CompanionRarity = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'Z';

export type SkillTrigger = 'pincer' | 'chain' | 'equip' | 'self';

export type SkillTarget =
  | 'self'
  | 'target'
  | 'row'
  | 'column'
  | 'cross1'
  | 'crossAll'
  | 'surround2'
  | 'allies';

export interface CompanionSkill {
  id: string;
  name: string;
  /** Short mechanical description */
  description: string;
  trigger: SkillTrigger;
  target: SkillTarget;
  /** Frequency at level 1 and at max level (percent). Linear interpolate between. */
  frequencyMin: number;
  frequencyMax: number;
  /** Used for Skill Boost farming calculations (wiki SB%). */
  sbPercent: number;
  /** Optional power multiplier / effect magnitude (heal power, damage multi, etc.) */
  power?: number;
  /** Optional hard cap (e.g. heal cap 700) */
  cap?: number;
  /** Element for elemental skills / shields */
  element?: string;
  /** Duration in turns where relevant */
  duration?: number;
}

export interface CompanionStats {
  atk: number;
  def: number;
  matk: number;
  mdef: number;
}

export interface EvolveCost {
  coins: number;
  items: { id: string; qty: number }[];
}

export interface CompanionDef {
  id: string;
  name: string;
  rarity: CompanionRarity;
  /** Max level for this form */
  maxLevel: number;
  /** Character job level required to equip (effects inactive below this) */
  levelRequired: number;
  /** Stats at level 1 */
  statsMin: CompanionStats;
  /** Stats at max level */
  statsMax: CompanionStats;
  skill: CompanionSkill;
  /** EXP multiplier when this companion is used as upgrade material: EXP = level × upgradeExp */
  upgradeExp: number;
  /** Sell price = sellPerLevel × current level */
  sellPerLevel: number;
  /** Total EXP needed to reach max level from 1 (wiki tables by class) */
  totalExpToMax: number;
  /** Next form id, if any */
  evolveTo?: string;
  evolveCost?: EvolveCost;
  /** Sources: CoT = Companions of Truth, CoF = Companions of Fellowship, drop, event */
  sources: string[];
  /** Flavor / notes (placeholder) */
  description?: string;
}

/** Linear interpolation used by the original for all companion stats and frequencies. */
export function valueAtLevel(
  min: number,
  max: number,
  level: number,
  maxLevel: number
): number {
  if (maxLevel <= 1) return max;
  const t = (level - 1) / (maxLevel - 1);
  return min + (max - min) * t;
}

export function statsAtLevel(def: CompanionDef, level: number): CompanionStats {
  const lv = Math.max(1, Math.min(level, def.maxLevel));
  return {
    atk: Math.round(valueAtLevel(def.statsMin.atk, def.statsMax.atk, lv, def.maxLevel)),
    def: Math.round(valueAtLevel(def.statsMin.def, def.statsMax.def, lv, def.maxLevel)),
    matk: Math.round(valueAtLevel(def.statsMin.matk, def.statsMax.matk, lv, def.maxLevel)),
    mdef: Math.round(valueAtLevel(def.statsMin.mdef, def.statsMax.mdef, lv, def.maxLevel)),
  };
}

export function frequencyAtLevel(def: CompanionDef, level: number): number {
  const lv = Math.max(1, Math.min(level, def.maxLevel));
  return valueAtLevel(def.skill.frequencyMin, def.skill.frequencyMax, lv, def.maxLevel);
}

/** Coin cost to fuse `componentCount` materials into a base companion of the given level. */
export function upgradeCoinCost(baseLevel: number, componentCount: number): number {
  return 50 * baseLevel * componentCount;
}

/** EXP granted by feeding one material companion of the given def + level. */
export function materialExp(def: CompanionDef, materialLevel: number, sameName = false): number {
  const base = materialLevel * def.upgradeExp;
  return sameName ? base * 2 : base;
}

// ---------------------------------------------------------------------------
// Seed data — first set (healing line, fire-shield line, attack/counter samples,
// EXP materials). Expand from wiki comprehensive list later.
// ---------------------------------------------------------------------------

const zero = { atk: 0, def: 0, matk: 0, mdef: 0 };

export const COMPANIONS: Record<string, CompanionDef> = {
  // ----- Healing line (D → C) -----
  healing_ring: {
    id: 'healing_ring',
    name: 'Healing Ring',
    rarity: 'D',
    maxLevel: 10,
    levelRequired: 5,
    statsMin: { ...zero, def: 1 },
    statsMax: { ...zero, def: 5 },
    skill: {
      id: 'mega_heal',
      name: 'Mega Heal',
      description: 'Heal with power 2 (cap 700)',
      trigger: 'chain',
      target: 'allies',
      frequencyMin: 10,
      frequencyMax: 30,
      sbPercent: 100,
      power: 2,
      cap: 700,
    },
    upgradeExp: 86,
    sellPerLevel: 100,
    totalExpToMax: 6642,
    evolveTo: 'white_pendant',
    evolveCost: {
      coins: 6000,
      items: [
        { id: 'white_ring', qty: 15 },
        { id: 'spirit_tears', qty: 3 },
        { id: 'spirit_particle', qty: 3 },
      ],
    },
    sources: ['CoF'],
    description: 'A ring imbued with the powers of healing.',
  },

  white_pendant: {
    id: 'white_pendant',
    name: 'White Pendant',
    rarity: 'C',
    maxLevel: 20,
    levelRequired: 10,
    statsMin: { ...zero, def: 3 },
    statsMax: { ...zero, def: 10 },
    skill: {
      id: 'mega_heal',
      name: 'Mega Heal',
      description: 'Heal with power 2 (cap 700)',
      trigger: 'chain',
      target: 'allies',
      frequencyMin: 15,
      frequencyMax: 40,
      sbPercent: 100,
      power: 2,
      cap: 700,
    },
    upgradeExp: 120,
    sellPerLevel: 200,
    totalExpToMax: 40611,
    evolveTo: 'healing_wand',
    evolveCost: {
      coins: 12000,
      items: [
        { id: 'white_ring', qty: 20 },
        { id: 'spirit_tears', qty: 5 },
        { id: 'spirit_particle', qty: 5 },
      ],
    },
    sources: ['CoF', 'evolve'],
    description: 'A pendant that amplifies restorative energy.',
  },

  healing_wand: {
    id: 'healing_wand',
    name: 'Healing Wand',
    rarity: 'B',
    maxLevel: 30,
    levelRequired: 15,
    statsMin: { ...zero, def: 5 },
    statsMax: { ...zero, def: 15 },
    skill: {
      id: 'giga_heal',
      name: 'Giga Heal',
      description: 'Heal with power 3 (cap 1300)',
      trigger: 'chain',
      target: 'allies',
      frequencyMin: 20,
      frequencyMax: 50,
      sbPercent: 80,
      power: 3,
      cap: 1300,
    },
    upgradeExp: 180,
    sellPerLevel: 400,
    totalExpToMax: 137280,
    sources: ['CoT', 'evolve'],
    description: 'A wand used by field medics of the old capital.',
  },

  // ----- Fire shield line (D → …) — matches build-plan example -----
  fire_visor: {
    id: 'fire_visor',
    name: 'Fire Visor',
    rarity: 'D',
    maxLevel: 10,
    levelRequired: 5,
    statsMin: { ...zero, mdef: 1 },
    statsMax: { ...zero, mdef: 5 },
    skill: {
      id: 'anti_fire_shield',
      name: 'Anti-Fire Shield',
      description: 'Reduce fire damage by 10% for 2 turns',
      trigger: 'chain',
      target: 'self',
      frequencyMin: 10,
      frequencyMax: 30,
      sbPercent: 30,
      element: 'Fire',
      duration: 2,
    },
    upgradeExp: 79,
    sellPerLevel: 100,
    totalExpToMax: 6642,
    evolveTo: 'fire_helmet',
    evolveCost: {
      coins: 6000,
      items: [
        { id: 'fire_ring', qty: 15 },
        { id: 'sea_tears', qty: 3 },
        { id: 'warped_particle', qty: 3 },
      ],
    },
    sources: ['CoF', 'drop'],
    description: 'A hat designed to guard against heat.',
  },

  fire_helmet: {
    id: 'fire_helmet',
    name: 'Fire Helmet',
    rarity: 'C',
    maxLevel: 20,
    levelRequired: 10,
    statsMin: { ...zero, mdef: 3 },
    statsMax: { ...zero, mdef: 12 },
    skill: {
      id: 'anti_fire_shield',
      name: 'Anti-Fire Shield',
      description: 'Reduce fire damage by 15% for 2 turns',
      trigger: 'chain',
      target: 'self',
      frequencyMin: 15,
      frequencyMax: 40,
      sbPercent: 30,
      element: 'Fire',
      duration: 2,
    },
    upgradeExp: 110,
    sellPerLevel: 200,
    totalExpToMax: 40611,
    evolveTo: 'fire_shield',
    evolveCost: {
      coins: 12000,
      items: [
        { id: 'fire_ring', qty: 20 },
        { id: 'sea_tears', qty: 5 },
        { id: 'warped_particle', qty: 5 },
      ],
    },
    sources: ['evolve'],
    description: 'Reinforced headgear for volcanic campaigns.',
  },

  fire_shield: {
    id: 'fire_shield',
    name: 'Fire Shield',
    rarity: 'B',
    maxLevel: 30,
    levelRequired: 15,
    statsMin: { ...zero, def: 2, mdef: 5 },
    statsMax: { ...zero, def: 8, mdef: 18 },
    skill: {
      id: 'anti_fire_barrier',
      name: 'Anti-Fire Barrier',
      description: 'Reduce fire damage by 20% for 3 turns (self + adjacent)',
      trigger: 'chain',
      target: 'surround2',
      frequencyMin: 20,
      frequencyMax: 50,
      sbPercent: 40,
      element: 'Fire',
      duration: 3,
    },
    upgradeExp: 160,
    sellPerLevel: 400,
    totalExpToMax: 137280,
    evolveTo: 'scorching_shield',
    evolveCost: {
      coins: 25000,
      items: [
        { id: 'fire_ring', qty: 30 },
        { id: 'sea_tears', qty: 8 },
        { id: 'warped_particle', qty: 8 },
        { id: 'rare_ore', qty: 2 },
      ],
    },
    sources: ['evolve'],
    description: 'A shield that turns flame aside.',
  },

  scorching_shield: {
    id: 'scorching_shield',
    name: 'Scorching Shield',
    rarity: 'A',
    maxLevel: 30,
    levelRequired: 20,
    statsMin: { ...zero, def: 4, mdef: 8 },
    statsMax: { ...zero, def: 12, mdef: 25 },
    skill: {
      id: 'scorching_aegis',
      name: 'Scorching Aegis',
      description: 'Reduce fire damage by 25% and reflect a portion as fire damage',
      trigger: 'chain',
      target: 'self',
      frequencyMin: 25,
      frequencyMax: 60,
      sbPercent: 50,
      element: 'Fire',
      duration: 3,
    },
    upgradeExp: 220,
    sellPerLevel: 800,
    totalExpToMax: 344820,
    sources: ['evolve'],
    description: 'The perfected fire ward of the old order.',
  },

  // ----- Attack / buff samples -----
  silver_sword: {
    id: 'silver_sword',
    name: 'Silver Sword',
    rarity: 'B',
    maxLevel: 30,
    levelRequired: 10,
    statsMin: { atk: 5, def: 0, matk: 0, mdef: 0 },
    statsMax: { atk: 20, def: 0, matk: 0, mdef: 0 },
    skill: {
      id: 'power_slash',
      name: 'Power Slash',
      description: 'Physical damage boost on pincer',
      trigger: 'pincer',
      target: 'target',
      frequencyMin: 20,
      frequencyMax: 50,
      sbPercent: 40,
      power: 1.2,
    },
    upgradeExp: 150,
    sellPerLevel: 350,
    totalExpToMax: 137280,
    sources: ['CoT', 'CoF'],
    description: 'A reliable sidearm for front-line fighters.',
  },

  combat_shield: {
    id: 'combat_shield',
    name: 'Combat Shield',
    rarity: 'B',
    maxLevel: 30,
    levelRequired: 10,
    statsMin: { atk: 0, def: 5, matk: 0, mdef: 0 },
    statsMax: { atk: 0, def: 20, matk: 0, mdef: 0 },
    skill: {
      id: 'guard',
      name: 'Guard',
      description: 'Raise DEF for 2 turns',
      trigger: 'chain',
      target: 'self',
      frequencyMin: 15,
      frequencyMax: 40,
      sbPercent: 30,
      duration: 2,
    },
    upgradeExp: 150,
    sellPerLevel: 350,
    totalExpToMax: 137280,
    sources: ['CoT', 'CoF'],
  },

  // ----- Counter sample -----
  punishers: {
    id: 'punishers',
    name: 'Punishers',
    rarity: 'A',
    maxLevel: 30,
    levelRequired: 15,
    statsMin: { atk: 8, def: 0, matk: 0, mdef: 0 },
    statsMax: { atk: 20, def: 0, matk: 0, mdef: 0 },
    skill: {
      id: 'counterattack',
      name: 'Counterattack',
      description: 'Counter when hit',
      trigger: 'self',
      target: 'target',
      frequencyMin: 20,
      frequencyMax: 100,
      sbPercent: 30,
    },
    upgradeExp: 200,
    sellPerLevel: 600,
    totalExpToMax: 344820,
    evolveTo: 'avengers',
    evolveCost: {
      coins: 20000,
      items: [
        { id: 'weapon_material', qty: 20 },
        { id: 'rare_ore', qty: 5 },
      ],
    },
    sources: ['CoT'],
  },

  avengers: {
    id: 'avengers',
    name: 'Avengers',
    rarity: 'S',
    maxLevel: 30,
    levelRequired: 20,
    statsMin: { atk: 12, def: 0, matk: 0, mdef: 0 },
    statsMax: { atk: 25, def: 0, matk: 0, mdef: 0 },
    skill: {
      id: 'counterattack',
      name: 'Counterattack',
      description: 'Counter when hit',
      trigger: 'self',
      target: 'target',
      frequencyMin: 30,
      frequencyMax: 100,
      sbPercent: 30,
    },
    upgradeExp: 280,
    sellPerLevel: 1200,
    totalExpToMax: 982422,
    sources: ['CoT', 'evolve'],
  },

  // ----- EXP materials -----
  metal_minion: {
    id: 'metal_minion',
    name: 'Metal Minion',
    rarity: 'B',
    maxLevel: 1,
    levelRequired: 1,
    statsMin: zero,
    statsMax: zero,
    skill: {
      id: 'none',
      name: '—',
      description: 'No skill (EXP material)',
      trigger: 'equip',
      target: 'self',
      frequencyMin: 0,
      frequencyMax: 0,
      sbPercent: 0,
    },
    upgradeExp: 3000,
    sellPerLevel: 50,
    totalExpToMax: 0,
    evolveTo: 'metal_minion_lambda',
    evolveCost: {
      coins: 0,
      items: [{ id: 'metal_minion', qty: 10 }], // 10 of self → Λ (special case)
    },
    sources: ['Metal Zone'],
    description: 'Pure experience fodder.',
  },

  metal_minion_lambda: {
    id: 'metal_minion_lambda',
    name: 'Metal Minion Λ',
    rarity: 'A',
    maxLevel: 1,
    levelRequired: 1,
    statsMin: zero,
    statsMax: zero,
    skill: {
      id: 'none',
      name: '—',
      description: 'No skill (EXP material)',
      trigger: 'equip',
      target: 'self',
      frequencyMin: 0,
      frequencyMax: 0,
      sbPercent: 0,
    },
    upgradeExp: 50000,
    sellPerLevel: 500,
    totalExpToMax: 0,
    sources: ['Metal Zone 3+', 'evolve'],
  },

  hisos_tear: {
    id: 'hisos_tear',
    name: "Hiso's Tear",
    rarity: 'D',
    maxLevel: 10,
    levelRequired: 1,
    statsMin: zero,
    statsMax: zero,
    skill: {
      id: 'none',
      name: '—',
      description: 'No skill (high EXP material)',
      trigger: 'equip',
      target: 'self',
      frequencyMin: 0,
      frequencyMax: 0,
      sbPercent: 0,
    },
    upgradeExp: 600,
    sellPerLevel: 80,
    totalExpToMax: 4118,
    sources: ['CoF', 'Chapter 19-7'],
    description: 'Condensed experience from a fallen Hiso.',
  },
};

export const COMPANION_LIST = Object.values(COMPANIONS);

export function getCompanion(id: string): CompanionDef | undefined {
  return COMPANIONS[id];
}

/** Simple owned-instance type for later inventory / equip systems. */
export interface CompanionInstance {
  uid: string;
  defId: string;
  level: number;
  exp: number;
}

export function createInstance(defId: string, level = 1): CompanionInstance {
  return {
    uid: `${defId}_${Math.random().toString(36).slice(2, 9)}`,
    defId,
    level,
    exp: 0,
  };
}
