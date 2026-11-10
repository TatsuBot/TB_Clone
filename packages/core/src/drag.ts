import { Board } from './board';
import { RULES } from './rules';
import { STEP_DELTA, type Pos, type StepDir } from './types';

export type StepResult =
  | { ok: true; from: Pos; to: Pos; displaced: string | null }
  | { ok: false; reason: 'off-board' | 'wall' | 'enemy' | 'corner' };

/**
 * Apply ONE step of a drag, fully resolved before the next step is considered.
 *
 * Pull-back displacement: if the target cell holds an ally, that ally drops into the cell
 * the mover just vacated (opposite the direction of travel). It is never pushed forward.
 * Enemies cannot be entered, displaced or passed through. A blocked step is rejected, which is
 * what makes a unit "slide along" an obstacle while the pointer keeps moving.
 * Diagonal steps slide past the two skirted squares untouched. They are refused only when BOTH
 * skirted squares hold an enemy or a wall (see RULES.diagonalMoves).
 *
 * Mutates `board`. Rejected steps leave it untouched.
 */
export function applyStep(board: Board, moverId: string, dir: StepDir): StepResult {
  const from = board.originOf(moverId);
  const d = STEP_DELTA[dir];
  const to = { row: from.row + d.row, col: from.col + d.col };
  const diagonal = d.row !== 0 && d.col !== 0;

  if (!board.inBounds(to)) return { ok: false, reason: 'off-board' };
  if (board.terrainAt(to) === 'wall') return { ok: false, reason: 'wall' };

  if (diagonal) {
    // Cutting a corner slides past the two squares beside the path without touching them.
    // One blocked neighbour (enemy or wall) is fine, like sliding along a wall; allies never block.
    // Only a gap with BOTH neighbours blocked is refused: there is nothing to squeeze through.
    if (!RULES.diagonalMoves) return { ok: false, reason: 'corner' };
    const sides = [
      { row: from.row + d.row, col: from.col },
      { row: from.row, col: from.col + d.col },
    ];
    const blocked = (p: Pos) => board.terrainAt(p) === 'wall' || board.unitAt(p)?.side === 'enemy';
    if (sides.every(blocked)) return { ok: false, reason: 'corner' };
  }

  const occupant = board.unitAt(to);
  if (occupant && occupant.side === 'enemy') return { ok: false, reason: 'enemy' };

  // Swapping the two cells is exactly "ally drops into the vacated cell, mover advances".
  board.swapCells(from, to);
  return { ok: true, from, to, displaced: occupant ? occupant.id : null };
}

/** An in-progress drag. Works on a clone so the real board is untouched until commit. */
export class DragSession {
  readonly board: Board;
  readonly path: StepDir[] = [];
  readonly start: Pos;

  constructor(source: Board, readonly moverId: string) {
    const mover = source.getUnit(moverId);
    if (mover.side !== 'ally' || mover.w !== 1 || mover.h !== 1) {
      throw new Error(`"${moverId}" cannot be dragged`);
    }
    this.board = source.clone();
    this.start = this.board.originOf(moverId);
  }

  get position(): Pos {
    return this.board.originOf(this.moverId);
  }

  /** A rejected step does not end the drag; the player can steer elsewhere. */
  step(dir: StepDir): StepResult {
    const result = applyStep(this.board, this.moverId, dir);
    if (result.ok) this.path.push(dir);
    return result;
  }
}

/** Deterministic replay: the same board and the same path always give the same result. */
export function replayPath(board: Board, moverId: string, path: readonly StepDir[]): DragSession {
  const session = new DragSession(board, moverId);
  for (const d of path) session.step(d);
  return session;
}
