export type Side = 'ally' | 'enemy';
export const opposite = (s: Side): Side => (s === 'ally' ? 'enemy' : 'ally');

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

export interface Pos {
  row: number;
  col: number;
}

export const DELTA: Record<Dir, Pos> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

/** A single movement step of a drag: orthogonal or diagonal. */
export type DiagDir = 'up-left' | 'up-right' | 'down-left' | 'down-right';
export type StepDir = Dir | DiagDir;

export const STEP_DELTA: Record<StepDir, Pos> = {
  ...DELTA,
  'up-left': { row: -1, col: -1 },
  'up-right': { row: -1, col: 1 },
  'down-left': { row: 1, col: -1 },
  'down-right': { row: 1, col: 1 },
};

/** Direction name for a one-cell step with the given signs (each of dr, dc in -1..1, not both 0). */
export function stepDirFor(dr: number, dc: number): StepDir {
  const v = dr < 0 ? 'up' : 'down';
  const h = dc < 0 ? 'left' : 'right';
  if (dr === 0) return h;
  if (dc === 0) return v;
  return `${v}-${h}` as DiagDir;
}

export const addDir = (p: Pos, d: Dir): Pos => ({
  row: p.row + DELTA[d].row,
  col: p.col + DELTA[d].col,
});

export const samePos = (a: Pos, b: Pos): boolean => a.row === b.row && a.col === b.col;

export interface UnitStats {
  maxHp: number;
  atk: number;
  def: number;
}

/**
 * Runtime unit. NOTE: a unit has no position field. Position lives only in the
 * board's occupancy grid (single source of truth); ask the board where a unit is.
 */
export interface Unit {
  id: string;
  name: string;
  side: Side;
  stats: UnitStats;
  hp: number;
  /** Footprint in cells. Allies are always 1x1; bosses may be larger. */
  w: number;
  h: number;
}

export type Terrain = 'floor' | 'wall';

/** Reserved floor hazards (Phase 0, step 5). Stored as cell data; they do nothing yet. */
export type Hazard = 'spikes' | 'lava' | 'bomb';
