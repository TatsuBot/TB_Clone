import { describe, expect, it } from 'vitest';
import { DragSession, MoveTimer, parseBoard } from '../src';

describe('move timer', () => {
  it('planning time before the first move is unlimited', () => {
    const t = new MoveTimer();
    expect(t.expired(1_000_000)).toBe(false);
    expect(t.remainingMs(1_000_000)).toBe(4000);
  });

  it('starts on the first step only, and expires 4s later', () => {
    const t = new MoveTimer();
    t.start(1000);
    t.start(3000); // later calls do nothing
    expect(t.expired(4999)).toBe(false);
    expect(t.expired(5000)).toBe(true);
    expect(t.fraction(3000)).toBe(0.5);
  });

  it('timer expiry mid-drag: the unit stops wherever it currently is', () => {
    const session = new DragSession(parseBoard(['1 . . . . .']), '1');
    const timer = new MoveTimer();
    let now = 0;
    for (let i = 0; i < 5; i++) {
      now += 1000;
      if (timer.expired(now)) break; // the controller ends the move here
      if (session.step('right').ok) timer.start(now);
    }
    // steps at t=1000..4000 are allowed (timer started at 1000, expires at 5000)
    expect(session.position).toEqual({ row: 0, col: 4 });
    expect(timer.expired(5000)).toBe(true);
  });
});
