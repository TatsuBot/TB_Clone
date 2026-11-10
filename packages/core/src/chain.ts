import { Board } from './board';
import { RULES } from './rules';
import { addDir, DIRS, type Side } from './types';
import type { Pincer } from './pincer';

export interface ChainOptions {
  throughEmpty?: boolean;
}

/**
 * Units that join a pincer's attack as a chain: friendly units in the same row or column as a
 * flanker with no enemy (or wall) between them and that flanker. Not adjacency only.
 * Returned nearest-first per flanker, each unit once, flankers themselves excluded.
 */
export function chainUnits(
  board: Board,
  pincer: Pincer,
  attackers: Side,
  opts: ChainOptions = {},
): string[] {
  const throughEmpty = opts.throughEmpty ?? RULES.chainThroughEmpty;
  const flankers = new Set<string>(pincer.flankers);
  const found: string[] = [];

  for (const flankerId of pincer.flankers) {
    for (const start of board.cellsOf(flankerId)) {
      for (const dir of DIRS) {
        let p = addDir(start, dir);
        while (board.inBounds(p)) {
          if (board.terrainAt(p) === 'wall') break;
          const u = board.unitAt(p);
          if (u) {
            if (u.side !== attackers) break; // an enemy blocks the line
            if (!flankers.has(u.id) && !found.includes(u.id)) found.push(u.id);
          } else if (!throughEmpty) {
            break;
          }
          p = addDir(p, dir);
        }
      }
    }
  }
  return found;
}
