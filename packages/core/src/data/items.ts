/**
 * Items / materials — names from Terra Battle wiki loot tables
 * (Borderlands, To the Capital luck chests & enemy drops).
 */

export type ItemCategory = 'material' | 'currency' | 'equipment_mat' | 'consumable';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  description?: string;
  /** Sell value in coins if applicable */
  sell?: number;
  source?: string;
}

export const ITEMS: Record<string, ItemDef> = {
  coins: {
    id: 'coins',
    name: 'Coins',
    category: 'currency',
    source: 'wiki',
  },
  terra_swordsteel: {
    id: 'terra_swordsteel',
    name: 'Terra Swordsteel',
    category: 'equipment_mat',
    description: 'Weapon upgrade material (sword)',
    sell: 50,
    source: 'wiki:Borderlands chests',
  },
  terra_bowstring: {
    id: 'terra_bowstring',
    name: 'Terra Bowstring',
    category: 'equipment_mat',
    description: 'Weapon upgrade material (bow)',
    sell: 50,
    source: 'wiki:Borderlands chests',
  },
  terra_spearbronze: {
    id: 'terra_spearbronze',
    name: 'Terra Spearbronze',
    category: 'equipment_mat',
    description: 'Weapon upgrade material (spear)',
    sell: 50,
    source: 'wiki:Borderlands chests',
  },
  terra_staffwood: {
    id: 'terra_staffwood',
    name: 'Terra Staffwood',
    category: 'equipment_mat',
    description: 'Weapon upgrade material (staff)',
    sell: 50,
    source: 'wiki:Borderlands chests',
  },
  serenity_shoot: {
    id: 'serenity_shoot',
    name: 'Serenity Shoot',
    category: 'material',
    description: 'Common crafting material',
    sell: 20,
    source: 'wiki:Gorf drops / chests',
  },
  benevolent_fang: {
    id: 'benevolent_fang',
    name: 'Benevolent Fang',
    category: 'material',
    sell: 20,
    source: 'wiki:Borderlands chests',
  },
  forlorn_stone: {
    id: 'forlorn_stone',
    name: 'Forlorn Stone',
    category: 'material',
    sell: 20,
    source: 'wiki:Borderlands chests',
  },
  claw_of_fate: {
    id: 'claw_of_fate',
    name: 'Claw of Fate',
    category: 'material',
    sell: 40,
    source: 'wiki:Luck 100 chests',
  },
  white_ring: {
    id: 'white_ring',
    name: 'White Ring',
    category: 'material',
    sell: 30,
    source: 'wiki:Gorf item drops',
  },
  lightning_ring: {
    id: 'lightning_ring',
    name: 'Lightning Ring',
    category: 'material',
    sell: 30,
    source: 'wiki:Dracorin drops',
  },
  photon_ring: {
    id: 'photon_ring',
    name: 'Photon Ring',
    category: 'material',
    sell: 30,
    source: 'wiki:Dracorin drops',
  },
  sentient_flame: {
    id: 'sentient_flame',
    name: 'Sentient Flame',
    category: 'material',
    sell: 80,
    source: 'wiki:rare Gorf drop',
  },
};

export const ITEM_LIST = Object.values(ITEMS);

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}
