import { describe, expect, it } from 'vitest';
import { chainUnits, detectPincers, parseBoard } from '../src';

const chainOf = (rows: string[], opts = {}) => {
  const board = parseBoard(rows);
  const scan = detectPincers(board, 'ally');
  return chainUnits(board, scan.pincers[0]!, 'ally', opts);
};

describe('chains', () => {
  it('allies sharing a row or column with a flanker join, even far away and non-adjacent', () => {
    const chain = chainOf([
      '. 3 . . . .',
      '. . . . . .',
      '. 1 x 2 . 5',
      '. . . . 4 .',
    ]);
    expect([...chain].sort()).toEqual(['3', '5']); // 4 is not aligned with a flanker
  });

  it('an enemy between the ally and the flanker blocks the chain', () => {
    const chain = chainOf(['. 3 . . . .', '. . . . . .', '. y . . . .', '. 1 x 2 . .']);
    expect(chain).toEqual([]);
  });

  it('a wall blocks the chain', () => {
    expect(chainOf(['. 3 . . . .', '. # . . . .', '. 1 x 2 . .'])).toEqual([]);
  });

  it('lists each unit once and never lists flankers', () => {
    const chain = chainOf(['3 1 x 2 4 .', '. 5 . . . .']);
    expect(new Set(chain).size).toBe(chain.length);
    expect(chain).not.toContain('1');
    expect(chain).not.toContain('2');
  });

  it('chains pass through other allies', () => {
    expect([...chainOf(['4 3 1 x 2 .'])].sort()).toEqual(['3', '4']);
  });

  it('chainThroughEmpty=false requires an unbroken run of allies', () => {
    expect(chainOf(['3 . 1 x 2 .'], { throughEmpty: false })).toEqual([]);
    expect(chainOf(['3 . 1 x 2 .'], { throughEmpty: true })).toEqual(['3']);
  });
});
