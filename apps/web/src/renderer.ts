import type { Board, Pos, Resolution, Unit } from '@game/core';
import { constrainToken, type Rect } from './constrain';

interface FloatText { text: string; x: number; y: number; born: number }

const TOKEN_R = 0.4; // token radius in cells
const LIFT = 1.1; // dragged tokens are drawn slightly larger
const COLORS = { ally: '#4aa3ff', enemy: '#ff6b6b', cellA: '#1d2233', cellB: '#222840', wall: '#0b0d12' };

/** Draws whatever board it is handed. Reads state, never decides outcomes. */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cell = 0;
  private visual = new Map<string, { x: number; y: number }>();
  private floats: FloatText[] = [];
  private flash = new Map<string, number>();
  private dragId: string | null = null;
  private pointer: { x: number; y: number } | null = null;

  constructor(private canvas: HTMLCanvasElement, private getBoard: () => Board) {
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const board = this.getBoard();
    const host = this.canvas.parentElement as HTMLElement;
    const cell = Math.floor(Math.min(host.clientWidth / board.cols, host.clientHeight / board.rows));
    this.cell = Math.max(24, cell);
    const w = this.cell * board.cols;
    const h = this.cell * board.rows;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  cellFromClient(clientX: number, clientY: number): Pos | null {
    const r = this.canvas.getBoundingClientRect();
    const board = this.getBoard();
    const col = Math.floor((clientX - r.left) / this.cell);
    const row = Math.floor((clientY - r.top) / this.cell);
    return row >= 0 && row < board.rows && col >= 0 && col < board.cols ? { row, col } : null;
  }

  setDrag(id: string | null, clientX?: number, clientY?: number): void {
    this.dragId = id;
    if (id === null || clientX === undefined || clientY === undefined) {
      this.pointer = null;
      return;
    }
    const r = this.canvas.getBoundingClientRect();
    this.pointer = { x: clientX - r.left, y: clientY - r.top };
  }

  /** Floating damage numbers and a brief flash on attackers. */
  playResolution(res: Resolution, board: Board, now: number): void {
    for (const a of res.attacks) {
      this.flash.set(a.attacker, now + 250);
      const where = board.cellsOf(a.target)[0] ?? this.lastKnown.get(a.target);
      if (!where) continue;
      this.floats.push({ text: `-${a.damage}`, x: (where.col + 0.5) * this.cell, y: (where.row + 0.3) * this.cell, born: now });
    }
  }
  private lastKnown = new Map<string, Pos>();

  draw(now: number): void {
    const board = this.getBoard();
    const { ctx, cell } = this;
    ctx.clearRect(0, 0, board.cols * cell, board.rows * cell);

    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const p = { row: r, col: c };
        ctx.fillStyle = board.terrainAt(p) === 'wall' ? COLORS.wall : (r + c) % 2 ? COLORS.cellA : COLORS.cellB;
        ctx.fillRect(c * cell, r * cell, cell, cell);
        const hz = board.hazardAt(p);
        if (hz) {
          ctx.fillStyle = '#ffb34755';
          ctx.fillRect(c * cell + 4, r * cell + 4, cell - 8, cell - 8);
        }
      }
    }

    for (const unit of board.allUnits()) {
      const origin = board.originOf(unit.id);
      this.lastKnown.set(unit.id, origin);
      const target = { x: origin.col * cell, y: origin.row * cell };
      let v = this.visual.get(unit.id);
      if (!v) this.visual.set(unit.id, (v = { ...target }));
      if (unit.id === this.dragId && this.pointer) {
        // follow the pointer, but never visually enter an enemy, wall or the board edge
        const c = this.constrainDragged(board, origin);
        v.x = c.x - (unit.w * cell) / 2;
        v.y = c.y - (unit.h * cell) / 2;
      } else {
        v.x += (target.x - v.x) * 0.35;
        v.y += (target.y - v.y) * 0.35;
      }
      this.drawUnit(unit, v.x, v.y, unit.id === this.dragId, (this.flash.get(unit.id) ?? 0) > now);
    }

    this.floats = this.floats.filter((f) => now - f.born < 900);
    ctx.font = `bold ${Math.round(cell * 0.32)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (const f of this.floats) {
      const t = (now - f.born) / 900;
      ctx.fillStyle = `rgba(255,255,255,${1 - t})`;
      ctx.fillText(f.text, f.x, f.y - t * cell * 0.5);
    }
  }

  private constrainDragged(board: Board, origin: Pos): { x: number; y: number } {
    const { cell } = this;
    const blocked: Rect[] = [];
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const p = { row: r, col: c };
        if (board.terrainAt(p) === 'wall' || board.unitAt(p)?.side === 'enemy') {
          blocked.push({ x: c * cell, y: r * cell, w: cell, h: cell });
        }
      }
    }
    const home: Rect = { x: origin.col * cell, y: origin.row * cell, w: cell, h: cell };
    const radius = cell * TOKEN_R * LIFT;
    const t = constrainToken(this.pointer as { x: number; y: number }, home, blocked, radius, cell * 0.25);
    return {
      x: Math.max(radius, Math.min(board.cols * cell - radius, t.x)),
      y: Math.max(radius, Math.min(board.rows * cell - radius, t.y)),
    };
  }

  private drawUnit(u: Unit, x: number, y: number, lifted: boolean, flashing: boolean): void {
    const { ctx, cell } = this;
    const w = u.w * cell;
    const h = u.h * cell;
    const pad = cell * 0.08;
    ctx.save();
    if (lifted) ctx.globalAlpha = 0.9;
    ctx.fillStyle = flashing ? '#ffffff' : COLORS[u.side];
    if (u.w === 1 && u.h === 1) {
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, cell * TOKEN_R * (lifted ? LIFT : 1), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, w - pad * 2, h - pad * 2, cell * 0.2);
      ctx.fill();
    }
    ctx.fillStyle = '#0b0d12';
    ctx.font = `bold ${Math.round(cell * 0.4)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(u.name.slice(0, 2), x + w / 2, y + h / 2);
    // hp bar
    const bw = w - pad * 4;
    ctx.fillStyle = '#00000088';
    ctx.fillRect(x + pad * 2, y + h - pad * 2.2, bw, cell * 0.08);
    ctx.fillStyle = '#7dff9a';
    ctx.fillRect(x + pad * 2, y + h - pad * 2.2, bw * Math.max(0, u.hp / u.stats.maxHp), cell * 0.08);
    ctx.restore();
  }
}
