/** Screen identifiers for the UI router. */
export type ScreenId =
  | 'title'
  | 'hub'
  | 'map'
  | 'stage-select'
  | 'pre-battle'
  | 'battle'
  | 'tavern'
  | 'recruit'
  | 'shop'
  | 'party'
  | 'character-detail'
  | 'options'
  | 'results';

export interface ScreenMeta {
  id: ScreenId;
  title: string;
  showStatusBar: boolean;
  showBottomNav: boolean;
}

export const SCREENS: Record<ScreenId, ScreenMeta> = {
  title: { id: 'title', title: 'Title', showStatusBar: false, showBottomNav: false },
  hub: { id: 'hub', title: 'Home', showStatusBar: true, showBottomNav: true },
  map: { id: 'map', title: 'Map', showStatusBar: true, showBottomNav: true },
  'stage-select': { id: 'stage-select', title: 'Stages', showStatusBar: true, showBottomNav: false },
  'pre-battle': { id: 'pre-battle', title: 'Confirm Party', showStatusBar: true, showBottomNav: false },
  battle: { id: 'battle', title: 'Battle', showStatusBar: false, showBottomNav: false },
  tavern: { id: 'tavern', title: 'Tavern', showStatusBar: true, showBottomNav: true },
  recruit: { id: 'recruit', title: 'Recruit', showStatusBar: true, showBottomNav: false },
  shop: { id: 'shop', title: 'Shop', showStatusBar: true, showBottomNav: false },
  party: { id: 'party', title: 'Party', showStatusBar: true, showBottomNav: true },
  'character-detail': { id: 'character-detail', title: 'Character', showStatusBar: true, showBottomNav: false },
  options: { id: 'options', title: 'Options', showStatusBar: true, showBottomNav: true },
  results: { id: 'results', title: 'Results', showStatusBar: false, showBottomNav: false },
};

/** Placeholder chapter data for the map UI. */
export const CHAPTERS = [
  { id: 1, title: 'Borderlands', stages: 10, cleared: true, unlocked: true },
  { id: 2, title: 'Road to the Capital', stages: 10, cleared: true, unlocked: true },
  { id: 3, title: 'Crucible City', stages: 10, cleared: false, unlocked: true },
  { id: 4, title: 'Tower of Temptation', stages: 10, cleared: false, unlocked: true },
  { id: 5, title: 'Deep Gate', stages: 10, cleared: false, unlocked: false },
  { id: 6, title: 'Underground Town', stages: 10, cleared: false, unlocked: false },
  { id: 7, title: 'Mantle', stages: 10, cleared: false, unlocked: false },
  { id: 8, title: 'Machine Wall', stages: 10, cleared: false, unlocked: false },
  { id: 9, title: 'Machine Interior', stages: 10, cleared: false, unlocked: false },
  { id: 10, title: 'Stonefolk Town', stages: 10, cleared: false, unlocked: false },
];

/** Placeholder stages for a chapter. */
export function stagesForChapter(chapterId: number) {
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  if (!ch) return [];
  return Array.from({ length: ch.stages }, (_, i) => ({
    id: i + 1,
    name: `Stage ${chapterId}-${i + 1}`,
    stamina: 5 + Math.floor(i / 2),
    difficulty: Math.min(5, 1 + Math.floor(i / 2)),
    waves: 2 + (i % 3),
    cleared: ch.cleared || (chapterId === 1 && i < 3),
  }));
}

/** Placeholder roster for party screen. */
export const PLACEHOLDER_UNITS = [
  { id: 'u1', name: 'Blade', rarity: 'B', weapon: 'Sword', element: '—', level: 12, job: 1 },
  { id: 'u2', name: 'Archer', rarity: 'B', weapon: 'Bow', element: '—', level: 11, job: 1 },
  { id: 'u3', name: 'Spear', rarity: 'SS', weapon: 'Spear', element: 'Lightning', level: 18, job: 2 },
  { id: 'u4', name: 'Healer', rarity: 'B', weapon: 'Staff', element: 'Healing', level: 10, job: 1 },
  { id: 'u5', name: 'Mage', rarity: 'SS', weapon: 'Staff', element: 'Fire', level: 20, job: 2 },
  { id: 'u6', name: 'Utility', rarity: 'S', weapon: 'Sword', element: '—', level: 15, job: 1 },
];
