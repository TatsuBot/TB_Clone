const SPEEDS = [0.5, 1, 2] as const;
const SPEED_KEY = 'pincer-battle-speed-v1';

export function getBattleSpeed(): number {
  try {
    const speed = Number(localStorage.getItem(SPEED_KEY));
    return SPEEDS.includes(speed as (typeof SPEEDS)[number]) ? speed : 2;
  } catch {
    return 2;
  }
}

export function cycleBattleSpeed(): number {
  const current = getBattleSpeed();
  const next = SPEEDS[(SPEEDS.indexOf(current as (typeof SPEEDS)[number]) + 1) % SPEEDS.length];
  try { localStorage.setItem(SPEED_KEY, String(next)); } catch { /* Keep the selected speed for this page session. */ }
  return next;
}

export function formatBattleSpeed(speed = getBattleSpeed()): string {
  return `×${speed}`;
}
