import { describe, expect, it } from 'vitest';
import { detectPincers, parseBoard } from '../src';

describe('pincer detection', () => {
  it('simple horizontal pincer hits once', () => {
    const scan = detectPincers(parseBoard(['. . . . . .', '. 1 x 2 . .']), 'ally');
    expect(scan.pincers).toEqual([{ axis: 'horizontal', flankers: ['1', '2'], targets: ['x'] }]);
  });

  it('simple vertical pincer hits once', () => {
    const scan = detectPincers(parseBoard(['. 1 .', '. x .', '. 2 .']), 'ally');
    expect(scan.pincers).toEqual([{ axis: 'vertical', flankers: ['1', '2'], targets: ['x'] }]);
  });

  it('a three-enemy line between two allies catches all three', () => {
    const scan = detectPincers(parseBoard(['1 x y z 2 .']), 'ally');
    expect(scan.pincers).toHaveLength(1);
    expect(scan.pincers[0]?.targets).toEqual(['x', 'y', 'z']);
  });

  it('a corner enemy is pincered by its two edge allies (all four corners)', () => {
    expect(detectPincers(parseBoard(['x 1 .', '2 . .', '. . .']), 'ally').pincers).toEqual([
      { axis: 'corner', flankers: ['1', '2'], targets: ['x'] },
    ]);
    expect(detectPincers(parseBoard(['. 1 x', '. . 2', '. . .']), 'ally').pincered).toEqual(new Set(['x']));
    expect(detectPincers(parseBoard(['. . .', '2 . .', 'x 1 .']), 'ally').pincered).toEqual(new Set(['x']));
    expect(detectPincers(parseBoard(['. . .', '. . 1', '. 2 x']), 'ally').pincered).toEqual(new Set(['x']));
  });

  it('a board with no pincer produces nothing', () => {
    for (const rows of [['1 . x . 2 .'], ['1 x . 2 . .'], ['1 x # 2 . .'], ['1 x . . . .']]) {
      const scan = detectPincers(parseBoard(rows), 'ally');
      expect(scan.pincers).toEqual([]);
      expect(scan.pincered.size).toBe(0);
    }
  });

  it('one ally can close one pincer and open the next', () => {
    const scan = detectPincers(parseBoard(['1 x 2 y 3 .']), 'ally');
    expect(scan.pincers.map((p) => p.targets)).toEqual([['x'], ['y']]);
  });

  it('flags both axes when an enemy is flanked twice', () => {
    const scan = detectPincers(parseBoard(['. 1 .', '2 x 3', '. 4 .']), 'ally');
    expect(scan.pincers.map((p) => p.axis).sort()).toEqual(['horizontal', 'vertical']);
    expect(scan.pincered).toEqual(new Set(['x']));
  });

  it('multi-square boss: contact with any of its squares counts, listed once', () => {
    const horizontal = detectPincers(parseBoard(['1 X X 2 . .', '. X X . . .']), 'ally');
    expect(horizontal.pincers).toEqual([{ axis: 'horizontal', flankers: ['1', '2'], targets: ['X'] }]);
    const vertical = detectPincers(parseBoard(['. 1 . .', '. X X .', '. X X .', '. 2 . .']), 'ally');
    expect(vertical.pincers).toEqual([{ axis: 'vertical', flankers: ['1', '2'], targets: ['X'] }]);
  });

  it('is symmetric: enemies can pincer allies', () => {
    const scan = detectPincers(parseBoard(['x 1 y']), 'enemy');
    expect(scan.pincers[0]).toMatchObject({ flankers: ['x', 'y'], targets: ['1'] });
  });

  it('does not mutate the board (detection never deals damage)', () => {
    const board = parseBoard(['1 x 2']);
    detectPincers(board, 'ally');
    expect(board.getUnit('x').hp).toBe(100);
  });
});
