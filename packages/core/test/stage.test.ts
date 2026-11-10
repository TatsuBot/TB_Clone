import { describe, expect, it } from 'vitest';
import { Battle, assertValidStage, parseBoard, renderBoard, spawnWave, buildStageBoard, validateStage, type StageData } from '../src';

const t = (id: string, extra = {}) => ({ id, name: id, maxHp: 10, atk: 1, def: 0, ...extra });
const base = (): StageData => ({
  id: 's',
  name: 's',
  rows: 8,
  cols: 6,
  allies: [
    { unit: t('a'), row: 7, col: 0 },
    { unit: t('b'), row: 7, col: 1 },
  ],
  waves: [[{ unit: t('x'), row: 0, col: 0 }]],
});

describe('stage validation', () => {
  it('accepts a good stage', () => {
    expect(validateStage(base())).toEqual([]);
    expect(() => new Battle(base())).not.toThrow();
  });

  it('fails loudly on content typos', () => {
    const off = base();
    off.waves[0]![0]!.row = 99;
    expect(validateStage(off).join()).toMatch(/off the board/);

    const overlap = base();
    overlap.allies[1]!.col = 0;
    expect(validateStage(overlap).join()).toMatch(/share cell/);

    const dup = base();
    dup.waves[0]!.push({ unit: t('a'), row: 1, col: 1 });
    expect(validateStage(dup).join()).toMatch(/Duplicate unit id "a"/);

    const noWaves = base();
    noWaves.waves = [];
    expect(validateStage(noWaves).join()).toMatch(/no waves/);

    const lone = base();
    lone.allies.pop();
    expect(() => assertValidStage(lone)).toThrow(/at least 2 allies/);
  });

  it('spawns on the nearest free cell when an ally stands on the spawn point', () => {
    const s = base();
    s.waves[0]![0]!.row = 7;
    s.waves[0]![0]!.col = 0; // ally "a" is here
    const board = buildStageBoard(s);
    spawnWave(board, s, 0);
    expect(board.originOf('x')).not.toEqual({ row: 7, col: 0 });
    expect(Math.abs(board.originOf('x').row - 7) + Math.abs(board.originOf('x').col)).toBe(1);
  });
});

describe('ascii fixtures', () => {
  it('round-trips', () => {
    const rows = ['. # 1', 'x . 2'];
    expect(renderBoard(parseBoard(rows))).toEqual(rows);
  });
  it('rejects bosses that are not filled rectangles', () => {
    expect(() => parseBoard(['X X', 'X .'])).toThrow(/rectangle/);
  });
});
