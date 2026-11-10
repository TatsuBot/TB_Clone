import { runEnemyMoves, type EnemyMove } from './ai';
import { Board } from './board';
import { resolveAttacks, type Resolution } from './combat';
import { DragSession } from './drag';
import { createRng, type Rng } from './rng';
import { RULES } from './rules';
import { buildStageBoard, spawnWave, type StageData } from './stage';

export type Phase = 'player' | 'enemy' | 'victory' | 'defeat';

export interface TurnReport {
  actor: 'player' | 'enemy';
  enemyMoves: EnemyMove[];
  resolution: Resolution;
  spawned: string[];
  phase: Phase;
}

/**
 * Facade over one stage. Presentation reads `board`/`phase` and plays back reports;
 * it never decides an outcome. All randomness is seeded, so a (stage, seed, drags) triple replays exactly.
 */
export class Battle {
  board: Board;
  phase: Phase = 'player';
  waveIndex = 0;
  readonly log: TurnReport[] = [];
  private rng: Rng;

  constructor(readonly stage: StageData, readonly seed: number = 1) {
    this.rng = createRng(seed);
    this.board = buildStageBoard(stage);
    spawnWave(this.board, stage, 0);
  }

  get waveCount(): number {
    return this.stage.waves.length;
  }

  startDrag(unitId: string): DragSession | null {
    if (this.phase !== 'player') return null;
    const u = this.board.hasUnit(unitId) ? this.board.getUnit(unitId) : null;
    if (!u || u.side !== 'ally') return null;
    return new DragSession(this.board, unitId);
  }

  /**
   * Finish the player's turn with a drag session (released or timed out).
   * A drag that never moved is not a turn and returns null.
   */
  commitDrag(session: DragSession): TurnReport | null {
    if (this.phase !== 'player') throw new Error('Not the player turn');
    if (session.path.length === 0) return null;

    this.board = session.board;
    const resolution = resolveAttacks(this.board, 'ally');
    const spawned: string[] = [];

    if (this.board.unitsOf('enemy').length === 0) {
      if (this.waveIndex + 1 < this.waveCount) {
        this.waveIndex++;
        spawned.push(...spawnWave(this.board, this.stage, this.waveIndex));
        this.phase = 'player'; // a fresh wave arrives; the player keeps the initiative
      } else {
        this.phase = 'victory';
      }
    } else {
      this.phase = 'enemy';
    }
    this.checkDefeat();
    return this.record({ actor: 'player', enemyMoves: [], resolution, spawned });
  }

  runEnemyTurn(): TurnReport {
    if (this.phase !== 'enemy') throw new Error('Not the enemy turn');
    const enemyMoves = runEnemyMoves(this.board, this.rng);
    const resolution = resolveAttacks(this.board, 'enemy');
    this.phase = 'player';
    this.checkDefeat();
    return this.record({ actor: 'enemy', enemyMoves, resolution, spawned: [] });
  }

  private checkDefeat(): void {
    if (this.board.unitsOf('ally').length < RULES.minAlliesToFight) this.phase = 'defeat';
  }

  private record(r: Omit<TurnReport, 'phase'>): TurnReport {
    const report: TurnReport = { ...r, phase: this.phase };
    this.log.push(report);
    return report;
  }
}
