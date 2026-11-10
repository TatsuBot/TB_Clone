/**
 * Enemy catalog — early entries from Terra Battle wiki chapter pages
 * (Borderlands, To the Capital, Module:Enemy/Data, Orbling, Gorf, etc.).
 * Later-tier fillers remain until those chapter pages are ingested the same way.
 *
 * Stats are snapshot values from the wiki for the listed level; placement
 * uses that row as-is (no extra scale) when `fixedStats` is true.
 */

export type EnemyFamily =
  | 'grunt'
  | 'archer'
  | 'mage'
  | 'tank'
  | 'healer'
  | 'flyer'
  | 'boss'
  | 'elite'
  | 'metal';

export interface EnemyDef {
  id: string;
  name: string;
  family: EnemyFamily;
  level: number;
  maxHp: number;
  atk: number;
  def: number;
  matk?: number;
  mdef?: number;
  move?: number;
  w?: number;
  h?: number;
  /** Species label from wiki */
  species?: string;
  weapon?: string;
  element?: string;
  skillNote?: string;
  /** When true, scaleEnemy leaves numbers alone (wiki snapshot). */
  fixedStats?: boolean;
  /** Rough chapter band for generators */
  tier: number;
  source?: string;
  /** If set, clearing a stage whose final wave includes this enemy unlocks this adventurer id */
  recruitId?: string;
  /** Wiki item drops for this enemy row (weights ≈ relative %) */
  drops?: Array<{ itemId: string; weight: number; qty?: [number, number] }>;
}

export const ENEMIES: Record<string, EnemyDef> = {
  // ----- Borderlands / tutorial (wiki: Borderlands, Wee Orbling) -----
  wee_orbling: {
    id: 'wee_orbling',
    name: 'Wee Orbling',
    family: 'grunt',
    level: 1,
    maxHp: 40,
    atk: 12,
    def: 2,
    matk: 8,
    mdef: 8,
    move: 5,
    species: 'Wild Beast',
    skillNote: 'Basic physical',
    fixedStats: true,
    tier: 1,
    source: 'wiki:Borderlands 1.1–1.5',
  },

  // ----- Orbling variants (wiki: Orbling page) -----
  orbling_lv3: {
    id: 'orbling_lv3',
    name: 'Orbling',
    family: 'grunt',
    level: 3,
    maxHp: 101,
    atk: 21,
    def: 4,
    matk: 12,
    mdef: 15,
    move: 5,
    species: 'Wild Beast',
    skillNote: 'Slash, Lateral (1) x1.5 sword',
    fixedStats: true,
    tier: 1,
    source: 'wiki:Orbling Ch1-5 / Ch2-1',
  },
  orbling_lv3_ch2: {
    id: 'orbling_lv3_ch2',
    name: 'Orbling',
    family: 'grunt',
    level: 3,
    maxHp: 193,
    atk: 30,
    def: 20,
    matk: 12,
    mdef: 22,
    move: 5,
    species: 'Wild Beast',
    fixedStats: true,
    tier: 1,
    source: 'wiki:Orbling Chapter 2-1',
    drops: [{ itemId: 'serenity_shoot', weight: 4 }, { itemId: 'terra_swordsteel', weight: 4 }],
  },
  orbling_lv8: {
    id: 'orbling_lv8',
    name: 'Orbling',
    family: 'grunt',
    level: 8,
    maxHp: 281,
    atk: 30,
    def: 33,
    matk: 17,
    mdef: 35,
    move: 5,
    species: 'Wild Beast',
    fixedStats: true,
    tier: 1,
    source: 'wiki:Orbling Chapter 2-1',
    drops: [{ itemId: 'serenity_shoot', weight: 4 }, { itemId: 'terra_swordsteel', weight: 4 }],
  },
  /** 2x2 boss form (wiki lists Boss 2x2 on Ch2-2) */
  orbling_lv12_boss: {
    id: 'orbling_lv12_boss',
    name: 'Orbling',
    family: 'boss',
    level: 12,
    maxHp: 1987,
    atk: 34,
    def: 39,
    matk: 21,
    mdef: 43,
    move: 2,
    w: 2,
    h: 2,
    species: 'Wild Beast',
    skillNote: 'Breath Attack area',
    fixedStats: true,
    tier: 1,
    source: 'wiki:Orbling Chapter 2-2 boss',
    drops: [{ itemId: 'benevolent_fang', weight: 4 }, { itemId: 'terra_swordsteel', weight: 4 }],
  },

  // ----- Gorf (wiki: Gorf, Module:Enemy/Data CH2_KERORAN) -----
  gorf_lv3: {
    id: 'gorf_lv3',
    name: 'Gorf',
    family: 'healer',
    level: 3,
    maxHp: 120,
    atk: 22,
    def: 12,
    matk: 22,
    mdef: 18,
    move: 6,
    species: 'Wild Beast',
    weapon: 'Staff',
    element: 'Healing',
    skillNote: 'Heal, Area (1) power 1.5',
    fixedStats: true,
    tier: 1,
    source: 'wiki:To the Capital (inferred early)',
  },
  gorf_lv4: {
    id: 'gorf_lv4',
    name: 'Gorf',
    family: 'healer',
    level: 4,
    maxHp: 158,
    atk: 28,
    def: 16,
    matk: 26,
    mdef: 21,
    move: 6,
    species: 'Wild Beast',
    weapon: 'Staff',
    element: 'Healing',
    skillNote: 'Heal, Area (1) power 1.5',
    fixedStats: true,
    tier: 1,
    source: 'wiki:Gorf / Module:Enemy/Data CH2_KERORAN',
    drops: [{ itemId: 'serenity_shoot', weight: 4 }, { itemId: 'white_ring', weight: 4 }],
  },
  gorf_lv6: {
    id: 'gorf_lv6',
    name: 'Gorf',
    family: 'healer',
    level: 6,
    maxHp: 317,
    atk: 28,
    def: 21,
    matk: 34,
    mdef: 27,
    move: 6,
    species: 'Wild Beast',
    weapon: 'Staff',
    element: 'Healing',
    skillNote: 'Heal, Area (1)',
    fixedStats: true,
    tier: 1,
    source: 'wiki:Module:Enemy/Data CH2_KERORAN_WB',
    drops: [{ itemId: 'serenity_shoot', weight: 4 }, { itemId: 'white_ring', weight: 4 }, { itemId: 'sentient_flame', weight: 1 }],
  },

  // ----- Ch2 extras from Module:Enemy/Data -----
  dracorin_lv5: {
    id: 'dracorin_lv5',
    name: 'Dracorin',
    family: 'archer',
    level: 5,
    maxHp: 411,
    atk: 28,
    def: 28,
    matk: 34,
    mdef: 28,
    move: 4,
    species: 'Wild Beast',
    weapon: 'Bow',
    element: 'Lightning',
    fixedStats: true,
    tier: 2,
    source: 'wiki:Module:Enemy/Data CH2_KIRIN',
  },
  spinetrich_lv9: {
    id: 'spinetrich_lv9',
    name: 'Spinetrich',
    family: 'boss',
    level: 9,
    maxHp: 3949,
    atk: 36,
    def: 49,
    matk: 38,
    mdef: 51,
    move: 3,
    w: 2,
    h: 2,
    species: 'Wild Beast',
    weapon: 'Spear',
    element: 'Lightning',
    fixedStats: true,
    tier: 2,
    source: 'wiki:Module:Enemy/Data CH2_NEEDALA Boss 2x2',
  },

  // ----- Ch7 sample (wiki: Molten Menace) — names + levels; stats band-estimated until full rows -----
  // ----- Chapter 3 Melting Pot (wiki) -----
  lizardfolk_warrior: {
    id: 'lizardfolk_warrior', name: 'Lizardfolk Warrior', family: 'grunt', level: 3,
    maxHp: 220, atk: 32, def: 18, species: 'Lizardfolk', weapon: 'Sword',
    fixedStats: true, tier: 2, source: 'wiki:Melting Pot 3.1',
  },
  lizardfolk_knight: {
    id: 'lizardfolk_knight', name: 'Lizardfolk Knight', family: 'tank', level: 3,
    maxHp: 280, atk: 28, def: 28, species: 'Lizardfolk', weapon: 'Spear',
    fixedStats: true, tier: 2, source: 'wiki:Melting Pot 3.1',
  },
  lizardfolk_healer: {
    id: 'lizardfolk_healer', name: 'Lizardfolk Healer', family: 'healer', level: 3,
    maxHp: 200, atk: 20, def: 16, matk: 30, mdef: 24, species: 'Lizardfolk', weapon: 'Staff', element: 'Healing',
    fixedStats: true, tier: 2, source: 'wiki:Melting Pot 3.2',
  },
  lizardfolk_archer: {
    id: 'lizardfolk_archer', name: 'Lizardfolk Archer', family: 'archer', level: 3,
    maxHp: 190, atk: 34, def: 14, species: 'Lizardfolk', weapon: 'Bow',
    fixedStats: true, tier: 2, source: 'wiki:Melting Pot 3.2',
  },
  beastfolk_warrior: {
    id: 'beastfolk_warrior', name: 'Beastfolk Warrior', family: 'grunt', level: 3,
    maxHp: 230, atk: 34, def: 16, species: 'Beastfolk', weapon: 'Sword',
    fixedStats: true, tier: 2, source: 'wiki:Melting Pot 3.3',
  },
  beastfolk_knight: {
    id: 'beastfolk_knight', name: 'Beastfolk Knight', family: 'tank', level: 3,
    maxHp: 290, atk: 30, def: 26, species: 'Beastfolk', weapon: 'Spear',
    fixedStats: true, tier: 2, source: 'wiki:Melting Pot 3.3',
  },
  beastfolk_mage: {
    id: 'beastfolk_mage', name: 'Beastfolk Mage', family: 'mage', level: 3,
    maxHp: 180, atk: 22, def: 12, matk: 36, mdef: 22, species: 'Beastfolk', weapon: 'Staff',
    fixedStats: true, tier: 2, source: 'wiki:Melting Pot 3.3',
  },
  beastfolk_healer: {
    id: 'beastfolk_healer', name: 'Beastfolk Healer', family: 'healer', level: 3,
    maxHp: 200, atk: 18, def: 15, matk: 32, mdef: 26, species: 'Beastfolk', weapon: 'Staff', element: 'Healing',
    fixedStats: true, tier: 2, source: 'wiki:Melting Pot 3.4',
  },
  beastfolk_archer: {
    id: 'beastfolk_archer', name: 'Beastfolk Archer', family: 'archer', level: 3,
    maxHp: 195, atk: 35, def: 14, species: 'Beastfolk', weapon: 'Bow',
    fixedStats: true, tier: 2, source: 'wiki:Melting Pot 3.4',
  },

  // ----- Chapter 4 Into the Tower (wiki) -----
  white_sabertooth: {
    id: 'white_sabertooth', name: 'White Sabertooth', family: 'grunt', level: 7,
    maxHp: 360, atk: 40, def: 24, species: 'Wild Beast',
    fixedStats: true, tier: 2, source: 'wiki:Into the Tower 4.1',
  },
  white_sabertooth_lv10: {
    id: 'white_sabertooth_lv10', name: 'White Sabertooth', family: 'grunt', level: 10,
    maxHp: 480, atk: 48, def: 30, species: 'Wild Beast',
    fixedStats: true, tier: 2, source: 'wiki:Into the Tower 4.2',
  },
  devil_bat: {
    id: 'devil_bat', name: 'Devil Bat', family: 'flyer', level: 9,
    maxHp: 280, atk: 42, def: 18, species: 'Wild Beast',
    fixedStats: true, tier: 2, source: 'wiki:Into the Tower 4.1',
  },
  devil_bat_lv13: {
    id: 'devil_bat_lv13', name: 'Devil Bat', family: 'flyer', level: 13,
    maxHp: 400, atk: 52, def: 22, species: 'Wild Beast',
    fixedStats: true, tier: 3, source: 'wiki:Descent 5.1',
  },
  spinetrich_lv5: {
    id: 'spinetrich_lv5', name: 'Spinetrich', family: 'elite', level: 5,
    maxHp: 520, atk: 36, def: 32, species: 'Wild Beast', weapon: 'Spear', element: 'Lightning',
    fixedStats: true, tier: 2, source: 'wiki:Into the Tower 4.2',
  },
  sabertooth_king: {
    id: 'sabertooth_king', name: 'Sabertooth King', family: 'boss', level: 9,
    maxHp: 2200, atk: 55, def: 40, w: 2, h: 2, species: 'Wild Beast',
    fixedStats: true, tier: 2, source: 'wiki:Into the Tower 4.3',
  },
  ba_gunar_boss: {
    id: 'ba_gunar_boss',
    name: "Ba'gunar",
    family: 'boss',
    level: 15,
    maxHp: 9263,
    atk: 52,
    def: 61,
    matk: 42,
    mdef: 56,
    move: 0,
    w: 2,
    h: 2,
    species: 'Lizardfolk',
    weapon: 'Sword',
    element: 'Lightning',
    skillNote: 'Sever/Thunder; 100% recruit',
    fixedStats: true,
    tier: 2,
    source: "wiki:Ba'gunar (Enemy)",
    recruitId: 'ba_gunar',
  },

  triscorp: {
    id: 'triscorp', name: 'Triscorp', family: 'elite', level: 9,
    maxHp: 600, atk: 45, def: 35, species: 'Wild Beast',
    fixedStats: true, tier: 2, source: 'wiki:Into the Tower 4.4',
  },


  mudtoad: {
    id: 'mudtoad', name: 'Mudtoad', family: 'grunt', level: 12,
    maxHp: 480, atk: 44, def: 30, species: 'Wild Beast',
    fixedStats: true, tier: 2, source: 'wiki:Into the Tower 4.5',
    drops: [{ itemId: 'serenity_shoot', weight: 40 }, { itemId: 'benevolent_fang', weight: 20 }],
  },
  horned_slug: {
    id: 'horned_slug', name: 'Horned Slug', family: 'tank', level: 11,
    maxHp: 418, atk: 43, def: 30, matk: 21, mdef: 25, species: 'Wild Beast',
    fixedStats: true, tier: 2, source: 'wiki:Horned_Slug',
  },
  fungibird: {
    id: 'fungibird', name: 'Fungibird', family: 'archer', level: 10,
    maxHp: 673, atk: 47, def: 50, matk: 75, mdef: 59, species: 'Wild Beast', weapon: 'Bow',
    fixedStats: true, tier: 3, source: 'wiki:Fungibird',
    drops: [{ itemId: 'claw_of_fate', weight: 4 }, { itemId: 'terra_bowstring', weight: 4 }],
  },
  slugosaur: {
    id: 'slugosaur', name: 'Slugosaur', family: 'boss', level: 20,
    maxHp: 2500, atk: 60, def: 50, w: 2, h: 2, species: 'Wild Beast',
    fixedStats: true, tier: 3, source: 'wiki:Descent 5.4',
    drops: [{ itemId: 'claw_of_fate', weight: 30 }],
  },

  // ----- Chapter 5 Descent (wiki) -----
  antenna_orbling: {
    id: 'antenna_orbling', name: 'Antenna Orbling', family: 'grunt', level: 12,
    maxHp: 450, atk: 48, def: 28, species: 'Wild Beast',
    fixedStats: true, tier: 3, source: 'wiki:Descent 5.1',
  },
  whitewyrm: {
    id: 'whitewyrm', name: 'Whitewyrm', family: 'flyer', level: 16,
    maxHp: 700, atk: 58, def: 32, species: 'Wild Beast',
    fixedStats: true, tier: 3, source: 'wiki:Descent 5.1',
  },
  aeropede: {
    id: 'aeropede', name: 'Aeropede', family: 'grunt', level: 13,
    maxHp: 420, atk: 46, def: 26, species: 'Wild Beast',
    fixedStats: true, tier: 3, source: 'wiki:Descent 5.5',
  },
  blastosaur: {
    id: 'blastosaur', name: 'Blastosaur', family: 'elite', level: 14,
    maxHp: 650, atk: 55, def: 34, species: 'Wild Beast',
    fixedStats: true, tier: 3, source: 'wiki:Descent 5.5',
  },
  wyvern_lv12: {
    id: 'wyvern_lv12', name: 'Wyvern', family: 'flyer', level: 12,
    maxHp: 580, atk: 52, def: 30, species: 'Wild Beast',
    fixedStats: true, tier: 3, source: 'wiki:Descent 5.6',
  },

  // ----- Chapter 6 The City Below (wiki) -----
  mech_orbling: {
    id: 'mech_orbling', name: 'Mech Orbling', family: 'grunt', level: 18,
    maxHp: 620, atk: 60, def: 40, species: 'Machine',
    fixedStats: true, tier: 4, source: 'wiki:The City Below',
  },
  slashbot: {
    id: 'slashbot', name: 'Slashbot', family: 'grunt', level: 15,
    maxHp: 500, atk: 58, def: 32, species: 'Machine',
    fixedStats: true, tier: 4, source: 'wiki:The City Below',
  },
  cybermummy: {
    id: 'cybermummy', name: 'Cybermummy', family: 'tank', level: 14,
    maxHp: 700, atk: 45, def: 48, species: 'Machine',
    fixedStats: true, tier: 4, source: 'wiki:The City Below',
  },
  impalebot: {
    id: 'impalebot', name: 'Impalebot', family: 'elite', level: 15,
    maxHp: 550, atk: 62, def: 34, species: 'Machine',
    fixedStats: true, tier: 4, source: 'wiki:The City Below',
  },
  teksura: {
    id: 'teksura', name: 'Teksura', family: 'elite', level: 17,
    maxHp: 720, atk: 65, def: 38, species: 'Machine',
    fixedStats: true, tier: 4, source: 'wiki:The City Below',
  },
  power_pyramid: {
    id: 'power_pyramid', name: 'Power Pyramid', family: 'tank', level: 15,
    maxHp: 800, atk: 50, def: 55, species: 'Machine',
    fixedStats: true, tier: 4, source: 'wiki:The City Below 6.4',
  },
  arachnobot_lv15: {
    id: 'arachnobot_lv15', name: 'Arachnobot', family: 'elite', level: 15,
    maxHp: 900, atk: 58, def: 42, species: 'Machine',
    fixedStats: true, tier: 4, source: 'wiki:The City Below 6.6',
  },
  arachnobot: {
    id: 'arachnobot', name: 'Arachnobot', family: 'boss', level: 22,
    maxHp: 3500, atk: 70, def: 50, w: 2, h: 2, species: 'Machine',
    fixedStats: true, tier: 4, source: 'wiki:The City Below 6.5 boss',
  },

  // ----- Chapter 7 Molten Menace (wiki) -----
  mantle_slime: {
    id: 'mantle_slime', name: 'Mantle Slime', family: 'grunt', level: 18,
    maxHp: 520, atk: 55, def: 30, element: 'Fire',
    fixedStats: true, tier: 4, source: 'wiki:Molten Menace 7.1',
  },
  wyvern: {
    id: 'wyvern', name: 'Wyvern', family: 'flyer', level: 18,
    maxHp: 680, atk: 70, def: 35,
    fixedStats: true, tier: 4, source: 'wiki:Molten Menace 7.1',
  },
  heat_sparker: {
    id: 'heat_sparker', name: 'Heat Sparker', family: 'mage', level: 18,
    maxHp: 480, atk: 72, def: 28, element: 'Fire',
    fixedStats: true, tier: 4, source: 'wiki:Molten Menace 7.1',
  },
  rockburn: {
    id: 'rockburn', name: 'Rockburn', family: 'tank', level: 18,
    maxHp: 900, atk: 60, def: 55, element: 'Fire',
    fixedStats: true, tier: 4, source: 'wiki:Molten Menace 7.2',
  },
  magma_eye: {
    id: 'magma_eye', name: 'Magma Eye', family: 'elite', level: 21,
    maxHp: 1100, atk: 80, def: 40, element: 'Fire',
    fixedStats: true, tier: 4, source: 'wiki:Molten Menace 7.3',
  },
  magma_mummy: {
    id: 'magma_mummy', name: 'Magma Mummy', family: 'tank', level: 9,
    maxHp: 800, atk: 50, def: 45, element: 'Fire',
    fixedStats: true, tier: 4, source: 'wiki:Molten Menace 7.3',
  },
  phi_orbling: {
    id: 'phi_orbling', name: 'Phi Orbling', family: 'elite', level: 55,
    maxHp: 2400, atk: 90, def: 60,
    fixedStats: true, tier: 5, source: 'wiki:Molten Menace 7.3',
  },
  mantle_tortoise: {
    id: 'mantle_tortoise', name: 'Mantle Tortoise', family: 'boss', level: 20,
    maxHp: 2800, atk: 65, def: 70, w: 2, h: 2, element: 'Fire',
    fixedStats: true, tier: 4, source: 'wiki:Molten Menace 7.5',
  },
  // ----- Placeholder tier ladder (non-wiki) for ch3–10 generators until those pages are ingested -----
  soldier: {
    id: 'soldier',
    name: 'Soldier',
    family: 'grunt',
    level: 10,
    maxHp: 45,
    atk: 13,
    def: 3,
    tier: 2,
    source: 'placeholder',
  },
  crossbowman: {
    id: 'crossbowman',
    name: 'Crossbowman',
    family: 'archer',
    level: 10,
    maxHp: 34,
    atk: 15,
    def: 1,
    tier: 2,
    source: 'placeholder',
  },
  heavy_infantry: {
    id: 'heavy_infantry',
    name: 'Heavy Infantry',
    family: 'tank',
    level: 12,
    maxHp: 70,
    atk: 11,
    def: 6,
    tier: 2,
    source: 'placeholder',
  },
  captain: {
    id: 'captain',
    name: 'Captain',
    family: 'elite',
    level: 14,
    maxHp: 80,
    atk: 18,
    def: 4,
    tier: 2,
    source: 'placeholder',
  },
  apprentice_mage: {
    id: 'apprentice_mage',
    name: 'Apprentice Mage',
    family: 'mage',
    level: 11,
    maxHp: 30,
    atk: 16,
    def: 1,
    tier: 2,
    source: 'placeholder',
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    family: 'grunt',
    level: 16,
    maxHp: 60,
    atk: 17,
    def: 4,
    tier: 3,
    source: 'placeholder',
  },
  dark_acolyte: {
    id: 'dark_acolyte',
    name: 'Dark Acolyte',
    family: 'mage',
    level: 16,
    maxHp: 40,
    atk: 20,
    def: 2,
    element: 'Darkness',
    tier: 3,
    source: 'placeholder',
  },
  iron_guard: {
    id: 'iron_guard',
    name: 'Iron Guard',
    family: 'tank',
    level: 18,
    maxHp: 95,
    atk: 14,
    def: 8,
    tier: 3,
    source: 'placeholder',
  },
  warlord: {
    id: 'warlord',
    name: 'Warlord',
    family: 'boss',
    level: 20,
    maxHp: 220,
    atk: 20,
    def: 6,
    w: 2,
    h: 2,
    tier: 3,
    source: 'placeholder',
  },
  siege_golem: {
    id: 'siege_golem',
    name: 'Siege Golem',
    family: 'boss',
    level: 15,
    maxHp: 180,
    atk: 16,
    def: 5,
    w: 2,
    h: 2,
    tier: 2,
    source: 'placeholder',
  },
  shadow_blade: {
    id: 'shadow_blade',
    name: 'Shadow Blade',
    family: 'elite',
    level: 22,
    maxHp: 75,
    atk: 22,
    def: 4,
    tier: 4,
    source: 'placeholder',
  },
  storm_mage: {
    id: 'storm_mage',
    name: 'Storm Mage',
    family: 'mage',
    level: 22,
    maxHp: 48,
    atk: 24,
    def: 2,
    tier: 4,
    source: 'placeholder',
  },
  fortress_knight: {
    id: 'fortress_knight',
    name: 'Fortress Knight',
    family: 'tank',
    level: 24,
    maxHp: 120,
    atk: 16,
    def: 10,
    tier: 4,
    source: 'placeholder',
  },
  colossus: {
    id: 'colossus',
    name: 'Colossus',
    family: 'boss',
    level: 25,
    maxHp: 280,
    atk: 22,
    def: 8,
    w: 2,
    h: 2,
    tier: 4,
    source: 'placeholder',
  },
  void_spawn: {
    id: 'void_spawn',
    name: 'Void Spawn',
    family: 'grunt',
    level: 28,
    maxHp: 70,
    atk: 20,
    def: 5,
    tier: 5,
    source: 'placeholder',
  },
  void_archon: {
    id: 'void_archon',
    name: 'Void Archon',
    family: 'boss',
    level: 30,
    maxHp: 320,
    atk: 26,
    def: 9,
    w: 2,
    h: 2,
    tier: 5,
    source: 'placeholder',
  },
  // legacy ids used by old ch1 hand layouts — map to wiki names
  slime: {
    id: 'slime',
    name: 'Wee Orbling',
    family: 'grunt',
    level: 1,
    maxHp: 40,
    atk: 12,
    def: 2,
    fixedStats: true,
    tier: 1,
    source: 'alias→wee_orbling',
  },
  goblin: {
    id: 'goblin',
    name: 'Orbling',
    family: 'grunt',
    level: 3,
    maxHp: 101,
    atk: 21,
    def: 4,
    fixedStats: true,
    tier: 1,
    source: 'alias→orbling_lv3',
  },
  wolf: {
    id: 'wolf',
    name: 'Orbling',
    family: 'grunt',
    level: 3,
    maxHp: 101,
    atk: 21,
    def: 4,
    fixedStats: true,
    tier: 1,
    source: 'alias→orbling_lv3',
  },
  bandit: {
    id: 'bandit',
    name: 'Orbling',
    family: 'grunt',
    level: 8,
    maxHp: 281,
    atk: 30,
    def: 33,
    fixedStats: true,
    tier: 1,
    source: 'alias→orbling_lv8',
  },
  archer_scout: {
    id: 'archer_scout',
    name: 'Dracorin',
    family: 'archer',
    level: 5,
    maxHp: 411,
    atk: 28,
    def: 28,
    fixedStats: true,
    tier: 2,
    source: 'alias→dracorin_lv5',
  },
  hedge_mage: {
    id: 'hedge_mage',
    name: 'Gorf',
    family: 'healer',
    level: 4,
    maxHp: 158,
    atk: 28,
    def: 16,
    fixedStats: true,
    tier: 1,
    source: 'alias→gorf_lv4',
  },
  shield_thug: {
    id: 'shield_thug',
    name: 'Gorf',
    family: 'healer',
    level: 6,
    maxHp: 317,
    atk: 28,
    def: 21,
    fixedStats: true,
    tier: 1,
    source: 'alias→gorf_lv6',
  },
  alpha_wolf: {
    id: 'alpha_wolf',
    name: 'Orbling',
    family: 'elite',
    level: 8,
    maxHp: 281,
    atk: 30,
    def: 33,
    fixedStats: true,
    tier: 1,
    source: 'alias→orbling_lv8',
  },
  brigand_chief: {
    id: 'brigand_chief',
    name: 'Orbling',
    family: 'boss',
    level: 12,
    maxHp: 1987,
    atk: 34,
    def: 39,
    w: 2,
    h: 2,
    fixedStats: true,
    tier: 1,
    source: 'alias→orbling_lv12_boss',
  },
};

export const ENEMY_LIST = Object.values(ENEMIES);

export function getEnemy(id: string): EnemyDef | undefined {
  return ENEMIES[id];
}

export function enemiesByTier(tier: number): EnemyDef[] {
  return ENEMY_LIST.filter((e) => e.tier === tier);
}

/** Wiki snapshots stay fixed; placeholders still grow mildly by stage number. */
export function scaleEnemy(def: EnemyDef, stageNumber: number): EnemyDef {
  if (def.fixedStats) return { ...def };
  const factor = 1 + Math.max(0, stageNumber - 1) * 0.04;
  return {
    ...def,
    maxHp: Math.round(def.maxHp * factor),
    atk: Math.round(def.atk * factor),
    def: def.def,
  };
}
