import { Battle, MoveTimer, stepDirFor, type DragSession, type Dir, type Pos, type StepDir, type TurnReport } from '@game/core';
import { Renderer } from './renderer';
import { stage1 } from './stage1';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('board');
const timerBar = $('timer-bar');
const waveEl = $('wave');
const statusEl = $('status');
const messageEl = $('message');

let battle = new Battle(stage1, Date.now() & 0xffff);
let session: DragSession | null = null;
let timer = new MoveTimer();
let busy = false;

const renderer = new Renderer(canvas, () => session?.board ?? battle.board);

function hud(text?: string): void {
  waveEl.textContent = `Wave ${battle.waveIndex + 1}/${battle.waveCount}`;
  const phase = battle.phase;
  statusEl.textContent =
    phase === 'victory' ? 'Victory!' : phase === 'defeat' ? 'Defeat' : phase === 'enemy' ? 'Enemy turn…' : 'Your turn';
  messageEl.textContent =
    text ??
    (phase === 'victory'
      ? 'Stage cleared. Press Restart to play again.'
      : phase === 'defeat'
        ? 'Fewer than two allies remain. Press Restart to try again.'
        : 'Drag one unit. Units you pass through drop back into the cell you left. Flank an enemy to attack.');
}

function describe(r: TurnReport): string {
  const hits = r.resolution.attacks.length;
  const down = r.resolution.defeated.length;
  const pincers = r.resolution.steps.length;
  const who = r.actor === 'player' ? 'You' : 'Enemies';
  if (hits === 0) return r.actor === 'player' ? 'No pincer formed.' : 'Enemies moved.';
  return `${who} resolved ${pincers} pincer${pincers === 1 ? '' : 's'}: ${hits} hit${hits === 1 ? '' : 's'}${down ? `, ${down} defeated` : ''}.`;
}

/** Walk the dragged unit toward the pointer cell, one resolved grid step at a time. */
function advanceTo(target: Pos, now: number): void {
  if (!session) return;
  for (let guard = 0; guard < 24; guard++) {
    if (timer.expired(now)) return endDrag(now);
    const cur = session.position;
    const dr = target.row - cur.row;
    const dc = target.col - cur.col;
    if (dr === 0 && dc === 0) return;
    const vertical: Dir = dr < 0 ? 'up' : 'down';
    const horizontal: Dir = dc < 0 ? 'left' : 'right';
    const order: Dir[] = Math.abs(dr) >= Math.abs(dc) ? [vertical, horizontal] : [horizontal, vertical];
    // Cut the corner when both axes still need covering (the core refuses if the squares aren't
    // fully open); otherwise, or if refused, slide along orthogonally.
    const options: StepDir[] = [];
    if (dr !== 0 && dc !== 0) options.push(stepDirFor(Math.sign(dr), Math.sign(dc)));
    for (const d of order) if (d === vertical ? dr !== 0 : dc !== 0) options.push(d);
    let moved = false;
    for (const dir of options) {
      if (session.step(dir).ok) {
        timer.start(now); // the clock starts on the first successful step
        moved = true;
        break;
      }
    }
    if (!moved) return; // blocked: keep the drag alive so the player can steer elsewhere
  }
}

function endDrag(now: number): void {
  if (!session) return;
  const s = session;
  session = null;
  renderer.setDrag(null);
  const report = battle.commitDrag(s);
  if (!report) return hud();
  const playback = renderer.playResolution(report.resolution, now);
  hud(describe(report));
  if (battle.phase === 'enemy') {
    busy = true;
    // let the player's pincers finish playing, then the enemy takes its turn
    window.setTimeout(() => {
      const r = battle.runEnemyTurn();
      const enemyPlayback = renderer.playResolution(r.resolution, performance.now());
      hud(describe(r));
      window.setTimeout(() => (busy = false), enemyPlayback);
    }, Math.max(550, playback + 300));
  } else if (playback > 0) {
    busy = true; // a new wave or the end screen: let the hits play out first
    window.setTimeout(() => (busy = false), playback);
  }
}

canvas.addEventListener('pointerdown', (e) => {
  if (busy || session || battle.phase !== 'player') return;
  const cell = renderer.cellFromClient(e.clientX, e.clientY);
  if (!cell) return;
  const id = battle.board.idAt(cell);
  const s = id ? battle.startDrag(id) : null;
  if (!s) return;
  session = s;
  timer = new MoveTimer();
  canvas.setPointerCapture(e.pointerId);
  renderer.setDrag(id, e.clientX, e.clientY);
});

canvas.addEventListener('pointermove', (e) => {
  if (!session) return;
  renderer.setDrag(session.moverId, e.clientX, e.clientY);
  const cell = renderer.cellFromClient(e.clientX, e.clientY);
  if (cell) advanceTo(cell, performance.now());
});

const release = () => endDrag(performance.now());
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

$('restart').addEventListener('click', () => {
  battle = new Battle(stage1, Date.now() & 0xffff);
  session = null;
  busy = false;
  renderer.setDrag(null);
  renderer.reset();
  renderer.resize();
  hud();
});

function frame(now: number): void {
  if (session && timer.expired(now)) endDrag(now); // time's up: the unit stops where it is
  timerBar.style.transform = `scaleX(${session ? timer.fraction(now) : 1})`;
  renderer.draw(now);
  requestAnimationFrame(frame);
}

hud();
requestAnimationFrame(frame);
