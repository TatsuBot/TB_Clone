import { Board } from './board';
import { detectPincers } from './pincer';
import type { Rng } from './rng';
import { addDir, DIRS, type Pos } from './types';

export interface EnemyMove {
  id: string;
  from: Pos;
  to: Pos;
}

const manhattan = (a: Pos, b: Pos) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

function score(board: Board, at: Pos): number {
  const allies = board.unitsOf('ally');
  const nearest = Math.min(...allies.map((a) => manhattan(at, board.originOf(a.id))));
  const pincered = detectPincers(board, 'enemy').pincered.size;
  // completing a pincer on an ally outweighs everything; otherwise move closer
  return pincered * 100 - nearest;
}

/**
 * First, deliberately simple AI. Each 1x1 enemy, one at a time, may step into an adjacent empty
 * cell (it never displaces or passes through anyone). It takes the best-scoring option, and only
 * moves if that beats standing still. Ties are broken with the seeded RNG. Multi-cell bosses hold.
 */
export function runEnemyMoves(board: Board, rng: Rng): EnemyMove[] {
  const moves: EnemyMove[] = [];
  if (board.unitsOf('ally').length === 0) return moves;
  const establishedPincers = detectPincers(board, 'enemy').pincering;

  for (const enemy of board.unitsOf('enemy')) {
    if (enemy.w !== 1 || enemy.h !== 1) continue;
    // Keep a pincer that is already in position intact so it can resolve this turn.
    if (establishedPincers.has(enemy.id)) continue;
    const from = board.originOf(enemy.id);
    let best: { to: Pos; score: number } | null = null;
    const stay = score(board, from);

    for (const dir of rng.shuffle(DIRS)) {
      const to = addDir(from, dir);
      if (!board.inBounds(to) || board.terrainAt(to) !== 'floor' || board.idAt(to) !== null) continue;
      board.swapCells(from, to);
      const s = score(board, to);
      board.swapCells(from, to); // undo the trial
      if (s > stay && (!best || s > best.score)) best = { to, score: s };
    }

    if (best) {
      board.swapCells(from, best.to);
      moves.push({ id: enemy.id, from, to: best.to });
    }
  }
  return moves;
}
