import { describe, expect, it } from 'vitest';
import { detectPincers, orderPincers, parseBoard, resolveAttacks } from '../src';

const order = (rows: string[], moverId?: string) => {
  const board = parseBoard(rows);
  const scan = detectPincers(board, 'ally');
  return orderPincers(board, scan.pincers, moverId).map((o) => o.pincer.targets[0]);
};

describe('pincer resolution order', () => {
  it('without a mover: reading order, top row first', () => {
    // vertical pincer on x is further right but starts on row 0; horizontal pincer on y starts on row 3
    expect(
      order(['. . . . 1 .', '. . . . x .', '. . . . 2 .', '3 y 4 . . .']),
    ).toEqual(['x', 'y']);
  });

  it('same row: leftmost first', () => {
    expect(order(['. . . . . . .', '1 x 2 . 3 y 4'])).toEqual(['x', 'y']);
    expect(order(['3 y 4 . 1 x 2'])).toEqual(['y', 'x']);
  });

  it("the mover's pincer jumps the queue, even from the bottom-right", () => {
    const rows = ['1 x 2 . . .', '. . . . . .', '. . . 3 y 4'];
    expect(order(rows)).toEqual(['x', 'y']);
    expect(order(rows, '4')).toEqual(['y', 'x']);
    expect(order(rows, '1')).toEqual(['x', 'y']);
  });

  it('a mover that only chains (does not flank) gets no priority', () => {
    // 5 is chained into the lower pincer but flanks nothing
    expect(order(['1 x 2 . . .', '. . . . . .', '5 . . 3 y 4'], '5')).toEqual(['x', 'y']);
  });

  it('one enemy flanked on both axes: the pincer that starts higher goes first', () => {
    expect(order(['. 1 .', '2 x 3', '. 4 .'])).toEqual(['x', 'x']);
    const board = parseBoard(['. 1 .', '2 x 3', '. 4 .']);
    const axes = orderPincers(board, detectPincers(board, 'ally').pincers).map((o) => o.pincer.axis);
    expect(axes).toEqual(['vertical', 'horizontal']);
  });

  it('is deterministic', () => {
    const rows = ['1 x 2 . 3 y 4', '. . . . . . .', '5 z 6 . . . .'];
    expect(order(rows)).toEqual(order(rows));
  });
});

describe('separate resolution', () => {
  it('each pincer is its own step, in order, with its own attacks', () => {
    const board = parseBoard(['1 x 2 . . .', '. . . . . .', '. . . 3 y 4']);
    const res = resolveAttacks(board, 'ally', { moverId: '4' });
    expect(res.steps.map((s) => s.pincer.targets)).toEqual([['y'], ['x']]);
    expect(res.steps[0]!.attacks.every((a) => a.step === 0 && a.target === 'y')).toBe(true);
    expect(res.steps[1]!.attacks.every((a) => a.step === 1 && a.target === 'x')).toBe(true);
    expect(res.attacks.map((a) => a.step)).toEqual([...res.attacks.map((a) => a.step)].sort());
  });

  it('a unit defeated by an earlier pincer is removed before the next one and is not hit again', () => {
    // x is flanked on both axes and dies to the first pincer's two hits (hp 15, 10 each)
    const board = parseBoard(['. 1 .', '2 x 3', '. 4 .'], { x: { maxHp: 15 } });
    const res = resolveAttacks(board, 'ally');
    expect(res.steps).toHaveLength(1);
    expect(res.steps[0]!.defeated).toEqual(['x']);
    expect(res.attacks).toHaveLength(2);
    expect(board.hasUnit('x')).toBe(false);
  });

  it("overkill inside one pincer still lands; removal happens at the end of that pincer", () => {
    const board = parseBoard(['1 x 2'], { x: { maxHp: 15 } });
    const res = resolveAttacks(board, 'ally');
    expect(res.steps[0]!.attacks).toHaveLength(2);
    expect(res.steps[0]!.fallen[0]).toMatchObject({ origin: { row: 0, col: 1 } });
  });

  it('a defeated target in one pincer does not stop other targets in a later pincer', () => {
    const board = parseBoard(['1 x 2 . . .', '. . . . . .', '. . . 3 y 4'], { x: { maxHp: 5 } });
    const res = resolveAttacks(board, 'ally', { moverId: '4' });
    expect(res.steps.map((s) => s.defeated)).toEqual([[], ['x']]);
    expect(board.getUnit('y').hp).toBe(80);
  });
});
