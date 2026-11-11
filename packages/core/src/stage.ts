import { Board } from "./board";
import { RULES } from "./rules";
import type { ElementType, Hazard, Pos, Unit } from "./types";
import type { WeaponType } from "./types";

export interface UnitTemplate {
  id: string;
  name: string;
  maxHp: number;
  atk: number;
  def: number;
  description?: string;
  element?: ElementType;
  /** Footprint; omit for 1x1. Only enemies may be larger. */
  w?: number;
  h?: number;
  weapon?: WeaponType;
}

export interface Placement {
  unit: UnitTemplate;
  row: number;
  col: number;
}

/** Stage file format. Content is data: authored as JSON, validated on import. */
export interface StageData {
  id: string;
  name: string;
  rows: number;
  cols: number;
  walls?: Pos[];
  hazards?: Array<Pos & { kind: Hazard }>;
  allies: Placement[];
  waves: Placement[][];
}

const footprint = (p: Placement): Pos[] => {
  const cells: Pos[] = [];
  for (let r = 0; r < (p.unit.h ?? 1); r++) {
    for (let c = 0; c < (p.unit.w ?? 1); c++)
      cells.push({ row: p.row + r, col: p.col + c });
  }
  return cells;
};

/** Returns a list of human-readable problems; empty means the stage is valid. */
export function validateStage(stage: StageData): string[] {
  const errors: string[] = [];
  const inBounds = (p: Pos) =>
    p.row >= 0 && p.row < stage.rows && p.col >= 0 && p.col < stage.cols;
  const key = (p: Pos) => `${p.row},${p.col}`;
  const walls = new Set((stage.walls ?? []).map(key));

  for (const w of stage.walls ?? [])
    if (!inBounds(w)) errors.push(`Wall at ${key(w)} is off the board`);
  for (const h of stage.hazards ?? [])
    if (!inBounds(h)) errors.push(`Hazard at ${key(h)} is off the board`);

  if (stage.allies.length < RULES.minAlliesToFight)
    errors.push(`Needs at least ${RULES.minAlliesToFight} allies`);
  if (stage.allies.length > RULES.maxSquad)
    errors.push(`More than ${RULES.maxSquad} allies`);
  if (stage.waves.length === 0) errors.push("Stage has no waves");

  const ids = new Set<string>();
  const checkGroup = (
    label: string,
    group: Placement[],
    mustBe1x1: boolean,
  ) => {
    const used = new Set<string>();
    if (group.length === 0) errors.push(`${label} is empty`);
    for (const p of group) {
      if (ids.has(p.unit.id)) errors.push(`Duplicate unit id "${p.unit.id}"`);
      ids.add(p.unit.id);
      if (mustBe1x1 && ((p.unit.w ?? 1) !== 1 || (p.unit.h ?? 1) !== 1)) {
        errors.push(`${label}: "${p.unit.id}" must be 1x1`);
      }
      for (const cell of footprint(p)) {
        if (!inBounds(cell))
          errors.push(
            `${label}: "${p.unit.id}" is off the board at ${key(cell)}`,
          );
        else if (walls.has(key(cell)))
          errors.push(`${label}: "${p.unit.id}" is on a wall at ${key(cell)}`);
        else if (used.has(key(cell)))
          errors.push(`${label}: two units share cell ${key(cell)}`);
        used.add(key(cell));
      }
    }
  };
  checkGroup("Allies", stage.allies, true);
  stage.waves.forEach((w, i) => checkGroup(`Wave ${i + 1}`, w, false));
  return errors;
}

export function assertValidStage(stage: StageData): void {
  const errors = validateStage(stage);
  if (errors.length)
    throw new Error(`Invalid stage "${stage.id}":\n - ${errors.join("\n - ")}`);
}

export function makeUnit(t: UnitTemplate, side: Unit["side"]): Unit {
  return {
    id: t.id,
    name: t.name,
    side,
    stats: { maxHp: t.maxHp, atk: t.atk, def: t.def },
    hp: t.maxHp,
    description: t.description,
    weapon: t.weapon,
    element: t.element,
    w: t.w ?? 1,
    h: t.h ?? 1,
  };
}

/** Board with terrain, hazards and the starting allies. Enemies arrive via spawnWave. */
export function buildStageBoard(stage: StageData): Board {
  assertValidStage(stage);
  const board = new Board(stage.rows, stage.cols);
  stage.walls?.forEach((w) => board.setTerrain(w, "wall"));
  stage.hazards?.forEach((h) => board.setHazard(h, h.kind));
  for (const a of stage.allies)
    board.place(makeUnit(a.unit, "ally"), { row: a.row, col: a.col });
  return board;
}

/**
 * Place a wave's enemies. If an ally is standing on a spawn cell, the enemy takes the nearest
 * free cell that fits instead. Returns the spawned ids.
 */
export function spawnWave(
  board: Board,
  stage: StageData,
  waveIndex: number,
): string[] {
  const wave = stage.waves[waveIndex];
  if (!wave) throw new Error(`No wave ${waveIndex}`);
  const spawned: string[] = [];
  for (const p of wave) {
    const unit = makeUnit(p.unit, "enemy");
    const candidates: Pos[] = [];
    for (let r = 0; r < board.rows; r++)
      for (let c = 0; c < board.cols; c++) candidates.push({ row: r, col: c });
    const dist = (o: Pos) => Math.abs(o.row - p.row) + Math.abs(o.col - p.col);
    candidates.sort((a, b) => dist(a) - dist(b));
    const origin = candidates.find((o) => board.canPlace(unit, o));
    if (!origin) throw new Error(`No room to spawn "${unit.id}"`);
    board.place(unit, origin);
    spawned.push(unit.id);
  }
  return spawned;
}
