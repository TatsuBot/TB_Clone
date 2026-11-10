import type { Board } from './board';
import type { Pincer } from './pincer';
import type { Pos } from './types';

const AXIS_RANK = { horizontal: 0, vertical: 1, corner: 2 } as const;

/** Top-left-most cell (reading order) of everything a pincer covers: both flankers and its targets. */
export function pincerAnchor(board: Board, pincer: Pincer): Pos {
  const cells = [...pincer.flankers, ...pincer.targets].flatMap((id) => board.cellsOf(id));
  const first = cells[0] as Pos;
  return cells.reduce((best, c) => (c.row < best.row || (c.row === best.row && c.col < best.col) ? c : best), first);
}

export interface OrderedPincer {
  pincer: Pincer;
  /** Index into the original (detection-order) list. */
  index: number;
}

/**
 * The order pincers resolve in, one at a time:
 *  1. any pincer the moving unit helped form as a flanker comes first;
 *  2. then reading order of each pincer's anchor: top row first, then leftmost;
 *  3. exact ties fall back to axis (horizontal, vertical, corner) and then flanker ids,
 *     so the order is always fully deterministic.
 */
export function orderPincers(board: Board, pincers: readonly Pincer[], moverId?: string): OrderedPincer[] {
  const keyed = pincers.map((pincer, index) => ({
    pincer,
    index,
    mover: moverId !== undefined && pincer.flankers.includes(moverId) ? 0 : 1,
    anchor: pincerAnchor(board, pincer),
  }));
  keyed.sort(
    (a, b) =>
      a.mover - b.mover ||
      a.anchor.row - b.anchor.row ||
      a.anchor.col - b.anchor.col ||
      AXIS_RANK[a.pincer.axis] - AXIS_RANK[b.pincer.axis] ||
      a.pincer.flankers.join().localeCompare(b.pincer.flankers.join()),
  );
  return keyed.map(({ pincer, index }) => ({ pincer, index }));
}
