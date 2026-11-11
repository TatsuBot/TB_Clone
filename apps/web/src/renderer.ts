import type { Board, Fallen, Pos, Resolution, Unit } from "@game/core";
import { constrainToken, type Rect } from "./constrain";

interface FloatText {
  text: string;
  x: number;
  y: number;
  born: number;
}

const TOKEN_R = 0.4; // token radius in cells
const LIFT = 1.1; // dragged tokens are drawn slightly larger
const COLORS = {
  ally: "#4aa3ff",
  enemy: "#ff6b6b",
  cellA: "#1d2233",
  cellB: "#222840",
  wall: "#0b0d12",
};
const WEAPON_GLYPHS: Partial<Record<NonNullable<Unit["weapon"]>, string>> = {
  Sword: "⚔️",
  Bow: "🏹",
  Spear: "🔱",
  Staff: "🔮",
};
const ELEMENT_COLORS: Partial<Record<NonNullable<Unit["element"]>, string>> = {
  Fire: "#ff6947",
  Ice: "#75d9ff",
  Lightning: "#ffd84d",
  Darkness: "#a78bfa",
  Photon: "#fff3a6",
  Graviton: "#5eead4",
  Sun: "#ffad4a",
  Moon: "#c4b5fd",
};

/** Draws whatever board it is handed. Reads state, never decides outcomes. */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cell = 0;
  private visual = new Map<string, { x: number; y: number }>();
  private floats: FloatText[] = [];
  private flash = new Map<string, number>();
  private dragId: string | null = null;
  private pointer: { x: number; y: number } | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private getBoard: () => Board,
  ) {
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const board = this.getBoard();
    const host = this.canvas.parentElement as HTMLElement;
    const cell = Math.floor(
      Math.min(host.clientWidth / board.cols, host.clientHeight / board.rows),
    );
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
    return row >= 0 && row < board.rows && col >= 0 && col < board.cols
      ? { row, col }
      : null;
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

  private queue: Array<{ at: number; run: (now: number) => void }> = [];
  private ghosts: Array<{ unit: Unit; origin: Pos; until: number }> = [];
  private shownHp = new Map<string, number>();

  /** Forget all animation state (used on restart). */
  reset(): void {
    this.visual.clear();
    this.floats = [];
    this.flash.clear();
    this.queue = [];
    this.ghosts = [];
    this.shownHp.clear();
  }

  /**
   * Play a resolution back one pincer at a time: each step's hits land in turn, health bars and
   * damage numbers update as they land, and defeated units stay on screen until their step ends.
   * Returns how long the playback takes in ms so the caller can wait before the next phase.
   */
  playResolution(res: Resolution, now: number): number {
    const HIT_MS = 120;
    const STEP_PAUSE_MS = 450;
    const board = this.getBoard();

    const before = new Map<string, number>();
    for (const a of res.attacks)
      if (!before.has(a.target)) before.set(a.target, a.targetHp + a.damage);
    before.forEach((hp, id) => this.shownHp.set(id, hp));

    const fallen = new Map<string, Fallen>();
    res.steps.forEach((s) => s.fallen.forEach((f) => fallen.set(f.unit.id, f)));

    let t = 0;
    for (const step of res.steps) {
      step.attacks.forEach((a, i) => {
        const at = now + t + i * HIT_MS;
        const origin = board.hasUnit(a.target)
          ? board.originOf(a.target)
          : fallen.get(a.target)?.origin;
        this.queue.push({
          at,
          run: (nowRun) => {
            this.flash.set(a.attacker, nowRun + 220);
            this.shownHp.set(a.target, Math.max(0, a.targetHp));
            if (origin) {
              this.floats.push({
                text: `-${a.damage}`,
                x: (origin.col + 0.5) * this.cell,
                y: (origin.row + 0.3) * this.cell,
                born: nowRun,
              });
            }
          },
        });
      });
      t += step.attacks.length * HIT_MS + STEP_PAUSE_MS;
      step.fallen.forEach((f) =>
        this.ghosts.push({
          unit: f.unit,
          origin: f.origin,
          until: now + t - STEP_PAUSE_MS / 2,
        }),
      );
    }
    this.queue.push({ at: now + t, run: () => this.shownHp.clear() });
    return t;
  }

  draw(now: number): void {
    const board = this.getBoard();
    const { ctx, cell } = this;
    ctx.clearRect(0, 0, board.cols * cell, board.rows * cell);
    const due = this.queue.filter((q) => q.at <= now);
    if (due.length) {
      this.queue = this.queue.filter((q) => q.at > now);
      due.forEach((q) => q.run(now));
    }

    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const p = { row: r, col: c };
        ctx.fillStyle =
          board.terrainAt(p) === "wall"
            ? COLORS.wall
            : (r + c) % 2
              ? COLORS.cellA
              : COLORS.cellB;
        ctx.fillRect(c * cell, r * cell, cell, cell);
        const hz = board.hazardAt(p);
        if (hz) {
          ctx.fillStyle = "#ffb34755";
          ctx.fillRect(c * cell + 4, r * cell + 4, cell - 8, cell - 8);
        }
      }
    }

    for (const unit of board.allUnits()) {
      const origin = board.originOf(unit.id);
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
      this.drawUnit(
        unit,
        v.x,
        v.y,
        unit.id === this.dragId,
        (this.flash.get(unit.id) ?? 0) > now,
        this.shownHp.get(unit.id) ?? unit.hp,
      );
    }

    this.ghosts = this.ghosts.filter((g) => g.until > now);
    for (const g of this.ghosts) {
      this.drawUnit(
        g.unit,
        g.origin.col * cell,
        g.origin.row * cell,
        false,
        false,
        this.shownHp.get(g.unit.id) ?? 0,
      );
    }

    this.floats = this.floats.filter((f) => now - f.born < 900);
    ctx.font = `bold ${Math.round(cell * 0.32)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    for (const f of this.floats) {
      const t = (now - f.born) / 900;
      ctx.fillStyle = `rgba(255,255,255,${1 - t})`;
      ctx.fillText(f.text, f.x, f.y - t * cell * 0.5);
    }
  }

  private constrainDragged(
    board: Board,
    origin: Pos,
  ): { x: number; y: number } {
    const { cell } = this;
    const blocked: Rect[] = [];
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const p = { row: r, col: c };
        if (
          board.terrainAt(p) === "wall" ||
          board.unitAt(p)?.side === "enemy"
        ) {
          blocked.push({ x: c * cell, y: r * cell, w: cell, h: cell });
        }
      }
    }
    const home: Rect = {
      x: origin.col * cell,
      y: origin.row * cell,
      w: cell,
      h: cell,
    };
    const radius = cell * TOKEN_R * LIFT;
    const t = constrainToken(
      this.pointer as { x: number; y: number },
      home,
      blocked,
      radius,
      cell * 0.25,
    );
    return {
      x: Math.max(radius, Math.min(board.cols * cell - radius, t.x)),
      y: Math.max(radius, Math.min(board.rows * cell - radius, t.y)),
    };
  }

  private drawUnit(
    u: Unit,
    x: number,
    y: number,
    lifted: boolean,
    flashing: boolean,
    hp: number,
  ): void {
    const { ctx, cell } = this;
    const w = u.w * cell;
    const h = u.h * cell;
    const pad = cell * 0.08;
    ctx.save();
    if (lifted) ctx.globalAlpha = 0.9;
    ctx.fillStyle = flashing ? "#ffffff" : COLORS[u.side];
    const singleCell = u.w === 1 && u.h === 1;
    if (singleCell && u.side === "ally") {
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, w - pad * 2, h - pad * 2, cell * 0.1);
      ctx.fill();
    } else if (singleCell) {
      ctx.beginPath();
      ctx.arc(
        x + w / 2,
        y + h / 2,
        cell * TOKEN_R * (lifted ? LIFT : 1),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, w - pad * 2, h - pad * 2, cell * 0.2);
      ctx.fill();
    }
    ctx.fillStyle = "#0b0d12";
    const label =
      u.side === "ally" ? u.name.trim().split(/\s+/)[0] : u.name.slice(0, 2);
    const maxLabelWidth = w - pad * 4 - (u.side === "ally" ? cell * 0.12 : 0);
    let labelSize = Math.round(cell * (u.side === "ally" ? 0.3 : 0.4));
    ctx.font = `bold ${labelSize}px system-ui, sans-serif`;
    while (ctx.measureText(label).width > maxLabelWidth && labelSize > 8) {
      labelSize -= 1;
      ctx.font = `bold ${labelSize}px system-ui, sans-serif`;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2);
    const weaponGlyph =
      u.side === "ally" && u.weapon ? WEAPON_GLYPHS[u.weapon] : undefined;
    if (weaponGlyph && u.w === 1 && u.h === 1) {
      const tokenRadius = cell * TOKEN_R * (lifted ? LIFT : 1);
      const badgeRadius = Math.max(5, cell * 0.13);
      const badgeX = x + w / 2 + tokenRadius * 0.55;
      const badgeY = y + h / 2 - tokenRadius * 0.55;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#101522";
      ctx.fill();
      ctx.strokeStyle = "#dce4f2";
      ctx.lineWidth = Math.max(1, cell * 0.025);
      ctx.stroke();
      ctx.font = `${Math.round(badgeRadius * 1.55)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(weaponGlyph, badgeX, badgeY);
    }
    if (u.side === "ally" && singleCell && u.element && u.element !== "—") {
      const markerX = x + w - pad * 2.2;
      const markerY = y + h - pad * 3.8;
      if (u.element === "Healing" || u.element === "Remedy") {
        ctx.beginPath();
        ctx.arc(markerX, markerY, Math.max(2.5, cell * 0.065), 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#101522";
        ctx.lineWidth = Math.max(1, cell * 0.025);
        ctx.stroke();
      } else {
        const elementColor = ELEMENT_COLORS[u.element];
        if (elementColor) {
          const markerSize = cell * 0.17;
          ctx.beginPath();
          ctx.moveTo(markerX - markerSize / 2, markerY - markerSize / 2);
          ctx.lineTo(markerX + markerSize / 2, markerY - markerSize / 2);
          ctx.lineTo(markerX, markerY + markerSize / 2);
          ctx.closePath();
          ctx.fillStyle = elementColor;
          ctx.fill();
          ctx.strokeStyle = "#101522";
          ctx.lineWidth = Math.max(1, cell * 0.025);
          ctx.stroke();
        }
      }
    }
    // hp bar
    const bw = w - pad * 4;
    ctx.fillStyle = "#00000088";
    ctx.fillRect(x + pad * 2, y + h - pad * 2.2, bw, cell * 0.08);
    ctx.fillStyle = "#7dff9a";
    ctx.fillRect(
      x + pad * 2,
      y + h - pad * 2.2,
      bw * Math.max(0, hp / u.stats.maxHp),
      cell * 0.08,
    );
    ctx.restore();
  }
}
