export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Where to DRAW the dragged token. It follows the pointer, but can never overlap a blocked
 * rectangle (enemy, wall) and can't stray more than `margin` outside its logical cell, so it
 * can't tunnel through an obstacle to the far side. Purely visual: the core decides the real move.
 */
export function constrainToken(pointer: Pt, home: Rect, blocked: Rect[], radius: number, margin: number): Pt {
  let x = clamp(pointer.x, home.x - margin, home.x + home.w + margin);
  let y = clamp(pointer.y, home.y - margin, home.y + home.h + margin);

  for (let pass = 0; pass < 3; pass++) {
    for (const r of blocked) {
      const qx = clamp(x, r.x, r.x + r.w);
      const qy = clamp(y, r.y, r.y + r.h);
      const dx = x - qx;
      const dy = y - qy;
      const d = Math.hypot(dx, dy);
      if (d >= radius) continue;
      if (d > 0) {
        x = qx + (dx / d) * radius;
        y = qy + (dy / d) * radius;
      } else {
        // centre is inside the rectangle: leave on the side facing the token's own cell
        const vx = home.x + home.w / 2 - (r.x + r.w / 2);
        const vy = home.y + home.h / 2 - (r.y + r.h / 2);
        if (Math.abs(vx) >= Math.abs(vy)) x = vx < 0 ? r.x - radius : r.x + r.w + radius;
        else y = vy < 0 ? r.y - radius : r.y + r.h + radius;
      }
    }
  }
  return { x, y };
}
