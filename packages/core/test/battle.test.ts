import { describe, expect, it } from 'vitest';
import { Battle, type Placement, type StageData, type UnitTemplate } from '../src';

const ally = (id: string, row: number, col: number, over: Partial<UnitTemplate> = {}): Placement => ({
  unit: { id, name: id, maxHp: 100, atk: 10, def: 0, ...over },
  row,
  col,
});

const stage = (allies: Placement[], ...waves: Placement[][]): StageData => ({
  id: 't',
  name: 't',
  rows: 8,
  cols: 6,
  allies,
  waves,
});

describe('battle flow', () => {
  it('unmoved units attack: pincers belong to the board, not the drag', () => {
    const b = new Battle(stage([ally('1', 3, 1), ally('2', 3, 3), ally('3', 0, 0)], [ally('x', 3, 2)]));
    const s = b.startDrag('3')!;
    s.step('down'); // the mover ends up nowhere near the pincer or its rows/columns
    const report = b.commitDrag(s)!;
    expect(report.resolution.attacks.map((a) => a.attacker)).toEqual(['1', '2']);
    expect(b.board.getUnit('x').hp).toBe(80);
    expect(b.phase).toBe('enemy');
  });

  it('a drag that never moves is not a turn', () => {
    const b = new Battle(stage([ally('1', 3, 1), ally('2', 3, 3)], [ally('x', 0, 0)]));
    expect(b.commitDrag(b.startDrag('1')!)).toBeNull();
    expect(b.phase).toBe('player');
  });

  it('clearing the last wave is victory', () => {
    const b = new Battle(stage([ally('1', 3, 1), ally('2', 4, 4)], [ally('x', 3, 2, { maxHp: 15 })]));
    const s = b.startDrag('2')!;
    s.step('up');
    s.step('left'); // lands on (3,3): 1 x 2 on one row
    const r = b.commitDrag(s)!;
    expect(r.resolution.defeated).toEqual(['x']);
    expect(b.phase).toBe('victory');
  });

  it('clearing a wave spawns the next and the player keeps the turn', () => {
    const b = new Battle(
      stage([ally('1', 3, 1), ally('2', 4, 4)], [ally('x', 3, 2, { maxHp: 15 })], [ally('y', 0, 0), ally('z', 0, 5)]),
    );
    const s = b.startDrag('2')!;
    s.step('up');
    s.step('left');
    const r = b.commitDrag(s)!;
    expect(r.spawned).toEqual(['y', 'z']);
    expect(b.waveIndex).toBe(1);
    expect(b.phase).toBe('player');
  });

  it('an enemy pair moves to flank a stationary ally and damages it on the enemy turn', () => {
    const b = new Battle(stage([ally('1', 4, 2), ally('2', 0, 5)], [ally('x', 4, 0), ally('y', 4, 4)]));
    const s = b.startDrag('2')!;
    s.step('down');
    b.commitDrag(s);
    const r = b.runEnemyTurn();
    expect(r.enemyMoves.map((m) => m.id)).toEqual(['x', 'y']);
    expect(b.board.getUnit('1').hp).toBe(80);
    expect(b.phase).toBe('player');
  });

  it('defeat when the squad drops to one unit', () => {
    const b = new Battle(stage([ally('1', 4, 1, { maxHp: 5 }), ally('2', 0, 5)], [ally('x', 4, 0), ally('y', 4, 2)]));
    const s = b.startDrag('2')!;
    s.step('down');
    b.commitDrag(s);
    b.runEnemyTurn();
    expect(b.board.unitsOf('ally')).toHaveLength(1);
    expect(b.phase).toBe('defeat');
    expect(b.startDrag('2')).toBeNull();
  });

  it('is deterministic for the same stage, seed and moves', () => {
    const play = (seed: number) => {
      const b = new Battle(
        stage([ally('1', 4, 2), ally('2', 0, 5), ally('3', 7, 0)], [ally('x', 1, 1), ally('y', 6, 5), ally('z', 3, 3)]),
        seed,
      );
      for (let i = 0; i < 3; i++) {
        const s = b.startDrag('2')!;
        s.step(i % 2 ? 'up' : 'down');
        b.commitDrag(s);
        if (b.phase === 'enemy') b.runEnemyTurn();
      }
      return JSON.stringify(b.log);
    };
    expect(play(42)).toEqual(play(42));
  });

  it('only allies can be dragged, and only on the player turn', () => {
    const b = new Battle(stage([ally('1', 3, 1), ally('2', 3, 3)], [ally('x', 0, 0)]));
    expect(b.startDrag('x')).toBeNull();
    expect(b.startDrag('nope')).toBeNull();
  });
});
