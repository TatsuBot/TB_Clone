import type { StageData, UnitTemplate } from '@game/core';

/** Placeholder content. Names are neutral labels on purpose; replace with your own cast. */
const ally = (n: number, over: Partial<UnitTemplate> = {}): UnitTemplate => ({
  id: String(n),
  name: String(n),
  maxHp: 60,
  atk: 14,
  def: 2,
  ...over,
});
const grunt = (id: string, over: Partial<UnitTemplate> = {}): UnitTemplate => ({
  id,
  name: id,
  maxHp: 30,
  atk: 8,
  def: 1,
  ...over,
});

export const stage1: StageData = {
  id: 'stage-1',
  name: 'Practice Board',
  rows: 8,
  cols: 6,
  allies: [
    { unit: ally(1), row: 6, col: 0 },
    { unit: ally(2), row: 6, col: 1 },
    { unit: ally(3), row: 6, col: 2 },
    { unit: ally(4), row: 6, col: 3 },
    { unit: ally(5), row: 6, col: 4 },
    { unit: ally(6), row: 6, col: 5 },
  ],
  waves: [
    [
      { unit: grunt('a'), row: 1, col: 1 },
      { unit: grunt('b'), row: 1, col: 3 },
      { unit: grunt('c'), row: 2, col: 4 },
    ],
    [
      { unit: grunt('d'), row: 0, col: 0 },
      { unit: grunt('e'), row: 0, col: 5 },
      { unit: grunt('f'), row: 1, col: 2 },
      { unit: grunt('g'), row: 1, col: 4 },
    ],
    [{ unit: { id: 'B', name: 'B', maxHp: 120, atk: 12, def: 3, w: 2, h: 2 }, row: 0, col: 2 }],
  ],
};
