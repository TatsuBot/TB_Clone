/** Locked rule constants. Changing one is a design decision, not a bug fix. See docs/core-rules.md. */
export const RULES = {
  rows: 8,
  cols: 6,
  maxSquad: 6,
  /** Starts on the first successful grid step, not on press. */
  moveTimerMs: 4000,
  /**
   * Diagonal steps ("cutting a corner") slide past the two squares being skirted. One blocked
   * neighbour (enemy or wall) doesn't stop it; a gap with both neighbours blocked does. Allies
   * never block and aren't displaced.
   */
  diagonalMoves: true,
  /** A stage is lost when fewer than this many allies remain. */
  minAlliesToFight: 2,
  /**
   * Chain walk: do empty cells keep a chain alive? The plan only requires
   * "no enemy in between", so the default is yes. Flip to test the stricter reading.
   */
  chainThroughEmpty: true,
} as const;
