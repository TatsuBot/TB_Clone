import { Board } from './board';
import { opposite, type Pos, type Side } from './types';

export interface Pincer {
  axis: 'horizontal' | 'vertical' | 'corner';
  /** The two units forming the pincer. */
  flankers: [string, string];
  /** Every enemy (from the attacker's view) caught by it, each listed once. */
  targets: string[];
}

export interface PincerScan {
  pincers: Pincer[];
  pincered: Set<string>;
  pincering: Set<string>;
}

/**
 * Scan the WHOLE board for pincers formed by `attackers`. Any correctly placed units attack,
 * including ones that never moved. Detection only collects sets; it never deals damage.
 */
export function detectPincers(board: Board, attackers: Side): PincerScan {
  const targetSide = opposite(attackers);
  const pincers: Pincer[] = [];

  const scanLine = (cells: Pos[], axis: 'horizontal' | 'vertical'): void => {
    const sideAt = (i: number) => board.unitAt(cells[i] as Pos)?.side;
    let i = 0;
    while (i < cells.length) {
      if (sideAt(i) !== attackers) {
        i++;
        continue;
      }
      // pattern: attacker, one or more targets in an unbroken line, attacker
      let j = i + 1;
      const targets: string[] = [];
      while (j < cells.length && sideAt(j) === targetSide) {
        const id = board.idAt(cells[j] as Pos) as string;
        if (!targets.includes(id)) targets.push(id);
        j++;
      }
      if (targets.length > 0 && j < cells.length && sideAt(j) === attackers) {
        pincers.push({
          axis,
          flankers: [board.idAt(cells[i] as Pos) as string, board.idAt(cells[j] as Pos) as string],
          targets,
        });
      }
      i = j > i + 1 ? j : i + 1; // a closing flanker can open the next segment
    }
  };

  for (let r = 0; r < board.rows; r++) {
    scanLine(Array.from({ length: board.cols }, (_, c) => ({ row: r, col: c })), 'horizontal');
  }
  for (let c = 0; c < board.cols; c++) {
    scanLine(Array.from({ length: board.rows }, (_, r) => ({ row: r, col: c })), 'vertical');
  }

  // Corners: a corner enemy is pincered by attackers on its only two open sides.
  const last = { row: board.rows - 1, col: board.cols - 1 };
  const corners: Array<[Pos, Pos, Pos]> = [
    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }],
    [{ row: 0, col: last.col }, { row: 0, col: last.col - 1 }, { row: 1, col: last.col }],
    [{ row: last.row, col: 0 }, { row: last.row, col: 1 }, { row: last.row - 1, col: 0 }],
    [{ row: last.row, col: last.col }, { row: last.row, col: last.col - 1 }, { row: last.row - 1, col: last.col }],
  ];
  for (const [corner, a, b] of corners) {
    const t = board.unitAt(corner);
    const ua = board.unitAt(a);
    const ub = board.unitAt(b);
    if (t?.side === targetSide && ua?.side === attackers && ub?.side === attackers) {
      pincers.push({ axis: 'corner', flankers: [ua.id, ub.id], targets: [t.id] });
    }
  }

  const pincered = new Set<string>();
  const pincering = new Set<string>();
  for (const p of pincers) {
    p.targets.forEach((t) => pincered.add(t));
    p.flankers.forEach((f) => pincering.add(f));
  }
  return { pincers, pincered, pincering };
}
