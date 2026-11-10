import { describe, expect, it } from 'vitest';
import { constrainToken, type Rect } from '../src/constrain';

const home: Rect = { x: 0, y: 0, w: 100, h: 100 };
const enemyRight: Rect = { x: 100, y: 0, w: 100, h: 100 };
const R = 40;

const gap = (p: { x: number; y: number }, r: Rect) => {
  const qx = Math.max(r.x, Math.min(r.x + r.w, p.x));
  const qy = Math.max(r.y, Math.min(r.y + r.h, p.y));
  return Math.hypot(p.x - qx, p.y - qy);
};

describe('dragged token drawing', () => {
  it('follows the pointer when nothing blocks it', () => {
    expect(constrainToken({ x: 30, y: 60 }, home, [], R, 25)).toEqual({ x: 30, y: 60 });
  });

  it('stops flush against an enemy instead of overlapping it', () => {
    const p = constrainToken({ x: 150, y: 50 }, home, [enemyRight], R, 25);
    expect(p).toEqual({ x: 60, y: 50 });
    expect(gap(p, enemyRight)).toBeGreaterThanOrEqual(R - 1e-9);
  });

  it('cannot tunnel through to the far side when the pointer is beyond the enemy', () => {
    const p = constrainToken({ x: 400, y: 50 }, home, [enemyRight], R, 25);
    expect(p.x).toBeLessThanOrEqual(60);
  });

  it('slides along the obstacle while the pointer moves along it', () => {
    const p = constrainToken({ x: 150, y: 90 }, home, [enemyRight], R, 25);
    expect(p.x).toBe(60);
    expect(p.y).toBe(90);
  });

  it('is also pushed out of a diagonal obstacle', () => {
    const diag: Rect = { x: 100, y: 100, w: 100, h: 100 };
    const p = constrainToken({ x: 125, y: 125 }, home, [diag], R, 25);
    expect(gap(p, diag)).toBeGreaterThanOrEqual(R - 1e-9);
  });
});
