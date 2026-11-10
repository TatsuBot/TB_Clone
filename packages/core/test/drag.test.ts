import { describe, expect, it } from 'vitest';
import { DragSession, applyStep, parseBoard, renderBoard, replayPath } from '../src';

describe('pull-back displacement', () => {
  it('drag up through one ally: the ally ends one square BELOW its start', () => {
    const board = parseBoard(['. . .', '. 2 .', '. 1 .']);
    const s = new DragSession(board, '1');
    const r = s.step('up');
    expect(r).toMatchObject({ ok: true, displaced: '2' });
    expect(renderBoard(s.board)).toEqual(['. . .', '. 1 .', '. 2 .']);
  });

  it.each([
    ['up', ['. 2 .', '. 1 .', '. . .'], ['. 1 .', '. 2 .', '. . .']],
    ['down', ['. . .', '. 1 .', '. 2 .'], ['. . .', '. 2 .', '. 1 .']],
    ['left', ['2 1 .'], ['1 2 .']],
    ['right', ['. 1 2'], ['. 2 1']],
  ] as const)('step %s drops the ally into the mover\'s previous cell', (dir, before, after) => {
    const s = new DragSession(parseBoard([...before]), '1');
    s.step(dir);
    expect(renderBoard(s.board)).toEqual([...after]);
  });

  it('drag through three allies in a column: all three shift one square toward the origin', () => {
    const board = parseBoard(['. 4 .', '. 3 .', '. 2 .', '. 1 .']);
    const s = new DragSession(board, '1');
    s.step('up');
    s.step('up');
    s.step('up');
    // each ally moved ONE square back toward the mover's start; none moved forward
    expect(renderBoard(s.board)).toEqual(['. 1 .', '. 4 .', '. 3 .', '. 2 .']);
  });

  it('attempting to drag through an enemy: rejected, board unchanged by that step', () => {
    const board = parseBoard(['. x .', '. 1 .']);
    const s = new DragSession(board, '1');
    const before = renderBoard(s.board);
    expect(s.step('up')).toEqual({ ok: false, reason: 'enemy' });
    expect(renderBoard(s.board)).toEqual(before);
    expect(s.path).toEqual([]);
  });

  it('a full loop back to the start cell accounts for every crossed ally, no shared cells', () => {
    const board = parseBoard(['. . .', '2 3 .', '1 . .']);
    const s = replayPath(board, '1', ['up', 'right', 'down', 'left']);
    expect(renderBoard(s.board)).toEqual(['. . .', '3 . .', '1 2 .']);
    expect(s.position).toEqual(s.start);
    for (const id of ['1', '2', '3']) expect(s.board.cellsOf(id)).toHaveLength(1);
  });

  it('rejected steps (off board, wall) keep the drag alive', () => {
    const board = parseBoard(['. 1 #']);
    const s = new DragSession(board, '1');
    expect(s.step('up')).toEqual({ ok: false, reason: 'off-board' });
    expect(s.step('right')).toEqual({ ok: false, reason: 'wall' });
    expect(s.step('left')).toMatchObject({ ok: true });
    expect(s.path).toEqual(['left']);
  });

  it('does not touch the real board until committed', () => {
    const board = parseBoard(['. 1 .']);
    new DragSession(board, '1').step('right');
    expect(renderBoard(board)).toEqual(['. 1 .']);
  });

  it('replay is deterministic', () => {
    const board = parseBoard(['3 . .', '2 . .', '1 . .']);
    const a = replayPath(board, '1', ['up', 'up', 'right']);
    const b = replayPath(board, '1', ['up', 'up', 'right']);
    expect(renderBoard(a.board)).toEqual(renderBoard(b.board));
  });

  it('only 1x1 allies can be dragged', () => {
    const board = parseBoard(['1 x']);
    expect(() => new DragSession(board, 'x')).toThrow();
    expect(applyStep(board.clone(), '1', 'right')).toEqual({ ok: false, reason: 'enemy' });
  });
});

describe('diagonal steps (cutting corners)', () => {
  it('slips past an ally in a skirted square without displacing it', () => {
    const s = new DragSession(parseBoard(['2 . .', '1 3 .']), '1');
    // mover (1,0) -> (0,1); skirted squares are (0,0)=2 and (1,1)=3, both allies
    expect(s.step('up-right')).toMatchObject({ ok: true, displaced: null });
    expect(renderBoard(s.board)).toEqual(['2 1 .', '. 3 .']);
  });

  it('two allies on a diagonal swap places, even with another ally in a skirted square', () => {
    // 2 at (2,0) slides diagonally onto 4 at (1,1); 3 sits in a skirted square
    const s = new DragSession(parseBoard(['. . .', '. 4 .', '2 3 .']), '2');
    expect(s.step('up-right')).toMatchObject({ ok: true, displaced: '4' });
    expect(renderBoard(s.board)).toEqual(['. . .', '. 2 .', '4 3 .']);
  });

  it('moves diagonally through fully open squares and displaces nobody', () => {
    const s = new DragSession(parseBoard(['. . .', '. . .', '1 . .']), '1');
    expect(s.step('up-right')).toEqual({
      ok: true,
      from: { row: 2, col: 0 },
      to: { row: 1, col: 1 },
      displaced: null,
    });
    expect(renderBoard(s.board)).toEqual(['. . .', '. 1 .', '. . .']);
  });

  it.each(['x', '#'])('slides past ONE blocked neighbour ("%s"): only the target square matters', (blocker) => {
    for (const rows of [
      [`${blocker} . .`, '1 . .'],
      ['. . .', `1 ${blocker} .`],
    ]) {
      const s = new DragSession(parseBoard(rows), '1');
      expect(s.step('up-right')).toMatchObject({ ok: true });
      expect(s.position).toEqual({ row: 0, col: 1 });
    }
  });

  it('is refused when BOTH neighbours are blocked: nothing to squeeze through', () => {
    for (const rows of [['x . .', '1 y .'], ['# . .', '1 x .'], ['x . .', '1 # .']]) {
      const s = new DragSession(parseBoard(rows), '1');
      const before = renderBoard(s.board);
      expect(s.step('up-right')).toEqual({ ok: false, reason: 'corner' });
      expect(renderBoard(s.board)).toEqual(before);
      expect(s.path).toEqual([]);
    }
  });

  it('slides along an obstacle: a refused diagonal still lets orthogonal steps through', () => {
    const s = new DragSession(parseBoard(['x . .', '1 y .']), '1');
    expect(s.step('up-right').ok).toBe(false);
    expect(s.step('up').ok).toBe(false); // x is directly above: cannot enter
    expect(s.step('down-right').ok).toBe(false); // off board
    expect(s.step('right').ok).toBe(false); // y is an enemy
    expect(s.path).toEqual([]);
    const t = new DragSession(parseBoard(['x . .', '1 . .', '. . .']), '1');
    expect(t.step('down').ok).toBe(true);
    expect(t.step('right').ok).toBe(true);
    expect(t.path).toEqual(['down', 'right']);
  });

  it('regression: ally slides diagonally onto another ally beside an enemy and they truly swap', () => {
    // rows 3-4, cols 2-3 of the reported board: 4 at top-left, enemy c top-right, 5 bottom-right
    const s = new DragSession(parseBoard(['4 c', '. 5']), '5');
    expect(s.step('up-left')).toMatchObject({ ok: true, displaced: '4' });
    expect(renderBoard(s.board)).toEqual(['5 c', '. 4']);
  });

  it('an ally on the diagonal target is displaced into the vacated square', () => {
    const s = new DragSession(parseBoard(['. 2 .', '1 . .']), '1');
    expect(s.step('up-right')).toMatchObject({ ok: true, displaced: '2' });
    expect(renderBoard(s.board)).toEqual(['. 1 .', '2 . .']);
  });

  it('cannot enter an enemy or a wall on the diagonal target', () => {
    expect(new DragSession(parseBoard(['. x .', '1 . .']), '1').step('up-right')).toEqual({ ok: false, reason: 'enemy' });
    expect(new DragSession(parseBoard(['. # .', '1 . .']), '1').step('up-right')).toEqual({ ok: false, reason: 'wall' });
  });

  it('diagonal moves are rejected off the board', () => {
    expect(new DragSession(parseBoard(['1 .']), '1').step('up-right')).toEqual({ ok: false, reason: 'off-board' });
  });

  it('diagonals let a drag avoid displacing allies that orthogonal movement would have shuffled', () => {
    const board = parseBoard(['. 2 .', '. 3 .', '. 1 .']);
    // orthogonal route up the column shuffles 3 and 2...
    expect(renderBoard(replayPath(board, '1', ['up', 'up']).board)).toEqual(['. 1 .', '. 2 .', '. 3 .']);
    // ...but a diagonal detour through the open squares beside them disturbs nobody
    const side = parseBoard(['. 2 .', '. 3 .', '. 1 .', '. . .']);
    const wide = replayPath(side, '1', ['down-left', 'left'] as const).board;
    expect(renderBoard(wide)).toEqual(['. 2 .', '. 3 .', '. . .', '1 . .']);
  });
});
