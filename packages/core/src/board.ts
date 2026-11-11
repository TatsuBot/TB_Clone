import { RULES } from './rules';
import type { Hazard, Pos, Side, Terrain, Unit } from './types';

/**
 * The battle grid. `occupancy` is the single source of truth for where units are;
 * positions are always derived from it, never stored on the unit.
 */
export class Board {
  readonly rows: number;
  readonly cols: number;
  private occupancy: (string | null)[];
  private terrain: Terrain[];
  private hazards: (Hazard | null)[];
  private units = new Map<string, Unit>();

  constructor(rows: number = RULES.rows, cols: number = RULES.cols) {
    this.rows = rows;
    this.cols = cols;
    this.occupancy = new Array(rows * cols).fill(null);
    this.terrain = new Array<Terrain>(rows * cols).fill('floor');
    this.hazards = new Array(rows * cols).fill(null);
  }

  clone(): Board {
    const b = new Board(this.rows, this.cols);
    b.occupancy = [...this.occupancy];
    b.terrain = [...this.terrain];
    b.hazards = [...this.hazards];
    for (const [id, u] of this.units) {
      b.units.set(id, {
        ...u,
        stats: { ...u.stats },
        skills: u.skills ? u.skills.map((s) => ({ ...s })) : undefined,
        buffs: u.buffs ? u.buffs.map((buff) => ({ ...buff })) : undefined,
        statuses: u.statuses ? u.statuses.map((status) => ({ ...status })) : undefined,
        tapCharges: u.tapCharges ? { ...u.tapCharges } : undefined,
      });
    }
    return b;
  }

  inBounds(p: Pos): boolean {
    return p.row >= 0 && p.row < this.rows && p.col >= 0 && p.col < this.cols;
  }

  private idx(p: Pos): number {
    return p.row * this.cols + p.col;
  }

  terrainAt(p: Pos): Terrain {
    return this.terrain[this.idx(p)] ?? 'wall';
  }
  setTerrain(p: Pos, t: Terrain): void {
    this.terrain[this.idx(p)] = t;
  }
  hazardAt(p: Pos): Hazard | null {
    return this.hazards[this.idx(p)] ?? null;
  }
  setHazard(p: Pos, h: Hazard | null): void {
    this.hazards[this.idx(p)] = h;
  }

  idAt(p: Pos): string | null {
    if (!this.inBounds(p)) return null;
    return this.occupancy[this.idx(p)] ?? null;
  }
  unitAt(p: Pos): Unit | undefined {
    const id = this.idAt(p);
    return id === null ? undefined : this.units.get(id);
  }

  hasUnit(id: string): boolean {
    return this.units.has(id);
  }
  getUnit(id: string): Unit {
    const u = this.units.get(id);
    if (!u) throw new Error(`No unit with id "${id}"`);
    return u;
  }
  allUnits(): Unit[] {
    return [...this.units.values()];
  }
  unitsOf(side: Side): Unit[] {
    return this.allUnits().filter((u) => u.side === side);
  }

  /** Every cell the unit occupies, in row-major order. */
  cellsOf(id: string): Pos[] {
    const out: Pos[] = [];
    for (let i = 0; i < this.occupancy.length; i++) {
      if (this.occupancy[i] === id) out.push({ row: Math.floor(i / this.cols), col: i % this.cols });
    }
    return out;
  }

  /** Top-left cell of the unit's footprint. */
  originOf(id: string): Pos {
    const first = this.cellsOf(id)[0];
    if (!first) throw new Error(`Unit "${id}" is not on the board`);
    return first;
  }

  footprint(unit: Unit, origin: Pos): Pos[] {
    const cells: Pos[] = [];
    for (let r = 0; r < unit.h; r++) {
      for (let c = 0; c < unit.w; c++) cells.push({ row: origin.row + r, col: origin.col + c });
    }
    return cells;
  }

  canPlace(unit: Unit, origin: Pos): boolean {
    return this.footprint(unit, origin).every(
      (p) => this.inBounds(p) && this.terrainAt(p) === 'floor' && this.idAt(p) === null,
    );
  }

  place(unit: Unit, origin: Pos): void {
    if (this.units.has(unit.id)) throw new Error(`Duplicate unit id "${unit.id}"`);
    if (!this.canPlace(unit, origin)) {
      throw new Error(`Cannot place "${unit.id}" at row ${origin.row}, col ${origin.col}`);
    }
    for (const p of this.footprint(unit, origin)) this.occupancy[this.idx(p)] = unit.id;
    this.units.set(unit.id, unit);
  }

  remove(id: string): void {
    for (let i = 0; i < this.occupancy.length; i++) if (this.occupancy[i] === id) this.occupancy[i] = null;
    this.units.delete(id);
  }

  /**
   * Swap the contents of two cells. Both must be floor and hold either nothing or a 1x1 unit.
   * A plain move is a swap with an empty cell; pull-back displacement is a swap with an ally.
   */
  swapCells(a: Pos, b: Pos): void {
    for (const p of [a, b]) {
      if (!this.inBounds(p) || this.terrainAt(p) !== 'floor') throw new Error('swapCells: bad cell');
      const u = this.unitAt(p);
      if (u && (u.w !== 1 || u.h !== 1)) throw new Error('swapCells: cannot move multi-cell unit');
    }
    const ia = this.idx(a);
    const ib = this.idx(b);
    [this.occupancy[ia], this.occupancy[ib]] = [this.occupancy[ib] ?? null, this.occupancy[ia] ?? null];
  }
}
