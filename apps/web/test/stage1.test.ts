import { describe, expect, it } from 'vitest';
import { Battle, DIRS, createRng, validateStage, type StepDir } from '@game/core';

const ALL_STEPS: StepDir[] = [...DIRS, 'up-left', 'up-right', 'down-left', 'down-right'];
import { stage1 } from '../src/stage1';

describe('stage 1', () => {
  it('is a valid stage file', () => {
    expect(validateStage(stage1)).toEqual([]);
  });

  it('survives a random-bot soak: invariants hold and every game terminates sanely', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = createRng(seed);
      const b = new Battle(stage1, seed);
      for (let turn = 0; turn < 300 && (b.phase === 'player' || b.phase === 'enemy'); turn++) {
        if (b.phase === 'enemy') b.runEnemyTurn();
        else {
          const allies = b.board.unitsOf('ally');
          const pick = allies[Math.floor(rng.next() * allies.length)]!;
          const s = b.startDrag(pick.id)!;
          const steps = 1 + Math.floor(rng.next() * 8);
          for (let i = 0; i < steps; i++) s.step(rng.shuffle(ALL_STEPS)[0]!);
          b.commitDrag(s);
        }
        // invariants: every unit occupies exactly its footprint; nothing is lost or duplicated
        for (const u of b.board.allUnits()) expect(b.board.cellsOf(u.id)).toHaveLength(u.w * u.h);
        const occupied = b.board.allUnits().reduce((n, u) => n + u.w * u.h, 0);
        let cells = 0;
        for (let r = 0; r < b.board.rows; r++)
          for (let c = 0; c < b.board.cols; c++) if (b.board.idAt({ row: r, col: c })) cells++;
        expect(cells).toBe(occupied);
        for (const u of b.board.allUnits()) expect(u.hp).toBeGreaterThan(0);
      }
    }
  });
});
