import { describe, expect, it } from 'vitest';
import { computeDamage, parseBoard, resolveAttacks } from '../src';

describe('combat resolution', () => {
  it('damage is atk - def, minimum 1', () => {
    const board = parseBoard(['1 x'], { '1': { atk: 10 }, x: { def: 3 } });
    expect(computeDamage(board.getUnit('1'), board.getUnit('x'))).toBe(7);
    board.getUnit('x').stats.def = 99;
    expect(computeDamage(board.getUnit('1'), board.getUnit('x'))).toBe(1);
  });

  it('a three-enemy line is hit at full damage by each flanker, no splitting', () => {
    const board = parseBoard(['1 x y z 2 .']);
    resolveAttacks(board, 'ally');
    for (const id of ['x', 'y', 'z']) expect(board.getUnit(id).hp).toBe(80);
  });

  it('chained allies add their attacks; flankers act first, then the chain', () => {
    const board = parseBoard(['3 . 1 x 2 .']);
    const res = resolveAttacks(board, 'ally');
    expect(res.attacks.map((a) => [a.attacker, a.role])).toEqual([
      ['1', 'flanker'],
      ['2', 'flanker'],
      ['3', 'chain'],
    ]);
    expect(board.getUnit('x').hp).toBe(70);
  });

  it('a unit in two separate pincers attacks once in each', () => {
    const board = parseBoard(['. 3 . .', '. y . .', '. 1 x 4']);
    const res = resolveAttacks(board, 'ally');
    expect(res.scan.pincers).toHaveLength(2);
    expect(res.attacks.filter((a) => a.attacker === '1')).toHaveLength(2);
    expect(board.getUnit('x').hp).toBe(80);
    expect(board.getUnit('y').hp).toBe(80);
  });

  it('removes defeated units after all attacks are applied', () => {
    const board = parseBoard(['1 x 2'], { x: { maxHp: 15 } });
    const res = resolveAttacks(board, 'ally');
    expect(res.defeated).toEqual(['x']);
    expect(board.hasUnit('x')).toBe(false);
    expect(res.attacks).toHaveLength(2); // overkill still logged: both hits landed
  });

  it('a board with no pincer produces no attacks at all', () => {
    const res = resolveAttacks(parseBoard(['1 . x . 2']), 'ally');
    expect(res.attacks).toEqual([]);
    expect(res.defeated).toEqual([]);
  });

  it('is symmetric: enemies pincer and damage allies the same way', () => {
    const board = parseBoard(['x 1 y']);
    resolveAttacks(board, 'enemy');
    expect(board.getUnit('1').hp).toBe(80);
  });
});
