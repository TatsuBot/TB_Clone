import { Board } from './board';
import type { UnitStats } from './types';

export type StatOverrides = Record<string, Partial<UnitStats>>;

/**
 * Build a board from text. Tokens are separated by spaces:
 *   .  empty        #  wall
 *   1-9 an ally (id is the digit)
 *   a-z an enemy (id is the letter)
 *   A-Z a multi-cell boss (id is the letter; its cells form a filled rectangle)
 * Used for test fixtures and quick stage sketches.
 */
export function parseBoard(rows: string[], stats: StatOverrides = {}): Board {
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const cols = grid[0]?.length ?? 0;
  if (grid.some((r) => r.length !== cols)) throw new Error('parseBoard: ragged rows');
  const board = new Board(grid.length, cols);
  const bosses = new Map<string, { r0: number; c0: number; r1: number; c1: number; n: number }>();

  const make = (id: string, side: 'ally' | 'enemy', w = 1, h = 1) => {
    const base: UnitStats = { maxHp: 100, atk: 10, def: 0, ...stats[id] };
    return { id, name: id, side, stats: base, hp: base.maxHp, w, h };
  };

  grid.forEach((row, r) =>
    row.forEach((tok, c) => {
      if (tok === '.') return;
      if (tok === '#') return board.setTerrain({ row: r, col: c }, 'wall');
      if (/^[1-9]$/.test(tok)) return board.place(make(tok, 'ally'), { row: r, col: c });
      if (/^[a-z]$/.test(tok)) return board.place(make(tok, 'enemy'), { row: r, col: c });
      if (/^[A-Z]$/.test(tok)) {
        const b = bosses.get(tok);
        if (!b) bosses.set(tok, { r0: r, c0: c, r1: r, c1: c, n: 1 });
        else Object.assign(b, { r1: Math.max(b.r1, r), c1: Math.max(b.c1, c), n: b.n + 1 });
        return;
      }
      throw new Error(`parseBoard: bad token "${tok}"`);
    }),
  );

  for (const [id, b] of bosses) {
    const w = b.c1 - b.c0 + 1;
    const h = b.r1 - b.r0 + 1;
    if (w * h !== b.n) throw new Error(`parseBoard: boss "${id}" is not a filled rectangle`);
    board.place(make(id, 'enemy', w, h), { row: b.r0, col: b.c0 });
  }
  return board;
}

/** Inverse of parseBoard, for asserting whole boards in tests. Ids must be one character. */
export function renderBoard(board: Board): string[] {
  const out: string[] = [];
  for (let r = 0; r < board.rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < board.cols; c++) {
      const p = { row: r, col: c };
      row.push(board.terrainAt(p) === 'wall' ? '#' : (board.idAt(p) ?? '.'));
    }
    out.push(row.join(' '));
  }
  return out;
}
