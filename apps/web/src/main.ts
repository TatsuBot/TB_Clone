import "./errors";
import {
  Battle,
  MoveTimer,
  stepDirFor,
  grantStageRewards,
  rewardsForStage,
  getStageRef,
  recruitForStage,
  charStatsAtLevel,
  frequencyAtLevel,
  skillsUnlocked,
  statsAtLevel,
  type DragSession,
  type Dir,
  type Pos,
  type StepDir,
  type TurnReport,
} from "@game/core";
import { Renderer } from "./renderer";
import { stage1, stageFor } from "./stage1";
import { stageWithSquad } from "./squad";
import {
  characterByUid,
  companionByUid,
  getCharacterDef,
  getCompanionDef,
  ownedCharacters,
} from "./ui/inventory";
import {
  applyClearRewards,
  progress,
  isCleared,
  tryRecruitBoss,
} from "./ui/progress";
import { saveToLocalStorage } from "./ui/save";
import { UI } from "./ui/ui";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("board");
const timerBar = $("timer-bar");
const waveEl = $("wave");
const statusEl = $("status");
const messageEl = $("message");
const unitDescription = $<HTMLElement>("unit-description");
const unitDescriptionTitle = $("unit-description-title");
const unitDescriptionMeta = $("unit-description-meta");
const unitDescriptionStats = $("unit-description-stats");
const unitDescriptionCompanionSection = $("unit-description-companion-section");
const unitDescriptionCompanion = $("unit-description-companion");
const unitDescriptionSkills = $("unit-description-skills");

let battle = new Battle(stage1, Date.now() & 0xffff);
let session: DragSession | null = null;
let timer = new MoveTimer();
let busy = false;
let rewardsGranted = false;

const renderer = new Renderer(canvas, () => session?.board ?? battle.board);

interface InspectableSkill {
  name: string;
  description: string;
  trigger: string;
  target?: string;
}

function skillPattern(skill: InspectableSkill): string {
  const targets: Record<string, string> = {
    self: "Self",
    target: "Single target",
    row: "Row",
    column: "Column",
    cross1: "Cross (1)",
    crossAll: "Cross (all)",
    surround2: "Surround (2)",
    allies: "All allies",
    all: "All targets",
    adjacent: "Adjacent allies",
  };
  if (skill.target && targets[skill.target]) return targets[skill.target];
  const match = `${skill.name} ${skill.description}`.match(
    /\b(area\s*\(\s*\d+\s*\)|cross\s*\(\s*\d+\s*\)|lateral(?:\s*\(\s*\d+\s*\))?|row|column|adjacent|all)\b/i,
  );
  if (match) return match[0].replace(/\s+/g, " ");
  if (skill.trigger === "equip") return "Passive";
  if (skill.trigger === "counter") return "Counter target";
  return "Single target";
}

function weaponGlyph(weapon?: string): string | undefined {
  switch (weapon) {
    case "Sword":
      return "⚔️";
    case "Spear":
      return "🔱";
    case "Bow":
      return "🏹";
    case "Staff":
      return "🔮";
    default:
      return undefined;
  }
}

function skillGlyph(skill: InspectableSkill, weapon?: string): string {
  const text = `${skill.name} ${skill.description}`.toLowerCase();
  if (/fire|inferno|blazing|solar wind/.test(text)) return "🔥";
  if (/ice|frost|blizzard|glacier|absolute zero/.test(text)) return "❄️";
  if (/thunder|lightning/.test(text)) return "⚡";
  if (/darkness|shadow|abyss/.test(text)) return "🌑";
  if (/photon|radiance/.test(text)) return "✨";
  if (/graviton|gravity|crush/.test(text)) return "🌀";
  if (/heal|regen|revival|restorative/.test(text)) return "💚";
  if (/remedy|antidote|poison|venom|panacea/.test(text)) return "🧪";
  if (/sword|blade/.test(text)) return "⚔️";
  if (/spear|lance/.test(text)) return "🔱";
  if (/bow|arrow/.test(text)) return "🏹";
  if (/magic|matk|mdef|magical/.test(text)) return "🔮";
  if (/weapon damage|physical damage|attack|damage|counter|strike/.test(text)) {
    return weaponGlyph(weapon) ?? "⚔️";
  }
  if (/defense|defence|guard|shield|resist/.test(text)) return "🛡️";
  if (skill.trigger === "equip") return "🛡️";
  return "✦";
}

function addSkillRow(
  skill: InspectableSkill,
  source: string,
  activation: string,
  weapon?: string,
): void {
  const row = document.createElement("div");
  row.className = "unit-skill-row";
  const icon = document.createElement("span");
  icon.className = "unit-skill-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = skillGlyph(skill, weapon);
  const content = document.createElement("div");
  const name = document.createElement("div");
  name.className = "unit-skill-name";
  name.textContent = skill.name;
  const meta = document.createElement("div");
  meta.className = "unit-skill-meta";
  meta.textContent = `${source} · ${skill.trigger} · ${skillPattern(skill)} · ${activation}`;
  const description = document.createElement("div");
  description.className = "unit-skill-description";
  description.textContent = skill.description;
  content.append(name, meta, description);
  row.append(icon, content);
  unitDescriptionSkills.append(row);
}

function addStatRow(label: string, value: string): void {
  const row = document.createElement("div");
  row.className = "unit-stat-row";
  const name = document.createElement("span");
  name.textContent = label;
  const result = document.createElement("strong");
  result.textContent = value;
  row.append(name, result);
  unitDescriptionStats.append(row);
}

function closeUnitDescription(): void {
  unitDescription.hidden = true;
}

function showUnitDescription(
  unitId: string,
  clientX: number,
  clientY: number,
): void {
  const unit = battle.board.getUnit(unitId);
  unitDescriptionTitle.textContent = unit.name;
  unitDescriptionStats.replaceChildren();
  unitDescriptionCompanion.replaceChildren();
  unitDescriptionSkills.replaceChildren();

  const instance = unit.side === "ally" ? characterByUid(unit.id) : undefined;
  const character = instance ? getCharacterDef(instance) : undefined;
  const job = character?.jobs.find(
    (candidate) => candidate.jobIndex === instance?.activeJob,
  );
  const level = instance
    ? instance.jobLevels[instance.activeJob - 1]
    : undefined;
  const baseStats = job && level ? charStatsAtLevel(job, level) : undefined;
  const companionInstance = instance
    ? companionByUid(instance.companionUid)
    : undefined;
  const companion = companionInstance
    ? getCompanionDef(companionInstance)
    : undefined;
  const companionActive = Boolean(
    companion && level !== undefined && level >= companion.levelRequired,
  );
  const companionStats =
    companion && companionInstance
      ? statsAtLevel(companion, companionInstance.level)
      : { atk: 0, def: 0, matk: 0, mdef: 0 };
  const activeBonuses = companionActive
    ? companionStats
    : { atk: 0, def: 0, matk: 0, mdef: 0 };

  unitDescriptionMeta.textContent =
    character && job && instance && level !== undefined
      ? `${character.rarity} · ${character.species} · Job ${instance.activeJob}: ${job.title} · ${job.weapon} / ${job.element} · Lv. ${level} · Luck ${instance.luck} · Bonus ${instance.skillBoost}%`
      : `${unit.side === "ally" ? "Ally" : "Enemy"}${unit.weapon ? ` · ${unit.weapon}` : ""}`;

  if (baseStats) {
    addStatRow("HP", `${Math.max(0, unit.hp)} / ${baseStats.hp}`);
    for (const [label, base, bonus] of [
      ["ATK", baseStats.atk, activeBonuses.atk],
      ["MATK", baseStats.matk, activeBonuses.matk],
      ["DEF", baseStats.def, activeBonuses.def],
      ["MDEF", baseStats.mdef, activeBonuses.mdef],
    ] as const) {
      addStatRow(label, `${base} + ${bonus} = ${base + bonus}`);
    }
  } else {
    addStatRow("HP", `${Math.max(0, unit.hp)} / ${unit.stats.maxHp}`);
    addStatRow("ATK", String(unit.stats.atk));
    addStatRow(
      "MATK",
      unit.stats.matk === undefined ? "—" : String(unit.stats.matk),
    );
    addStatRow("DEF", String(unit.stats.def));
    addStatRow(
      "MDEF",
      unit.stats.mdef === undefined ? "—" : String(unit.stats.mdef),
    );
  }

  unitDescriptionCompanionSection.hidden = unit.side !== "ally";
  if (unit.side === "ally") {
    if (companion && companionInstance) {
      const activeLabel = companionActive
        ? "Active"
        : `Inactive until Job Lv. ${companion.levelRequired}`;
      unitDescriptionCompanion.textContent = `${companion.name} · Lv. ${companionInstance.level}/${companion.maxLevel} · ${activeLabel} · ATK +${companionStats.atk} · MATK +${companionStats.matk} · DEF +${companionStats.def} · MDEF +${companionStats.mdef}`;
    } else {
      unitDescriptionCompanion.textContent = "None equipped";
    }
  }

  if (job && level !== undefined) {
    for (const skill of skillsUnlocked(job, level)) {
      const activation =
        skill.trigger === "equip"
          ? "Always active"
          : `${Math.min(100, (skill.frequency ?? 100) + (instance?.skillBoost ?? 0))}%`;
      addSkillRow(skill, `Job Lv. ${skill.level}`, activation, job.weapon);
    }
    if (companionActive && companion) {
      const companionFrequency = frequencyAtLevel(
        companion,
        companionInstance!.level,
      );
      addSkillRow(
        companion.skill,
        companion.name,
        companion.skill.trigger === "equip"
          ? "Always active"
          : `${Math.round(companionFrequency)}%`,
        job.weapon,
      );
    }
  } else if (unit.description) {
    addSkillRow(
      {
        name: "Known ability",
        description: unit.description,
        trigger: "enemy",
      },
      "Enemy",
      "—",
      unit.weapon,
    );
  } else {
    const empty = document.createElement("div");
    empty.className = "unit-description-empty";
    empty.textContent = "No skill data available.";
    unitDescriptionSkills.append(empty);
  }
  unitDescription.hidden = false;
  const margin = 12;
  const panelWidth = unitDescription.offsetWidth;
  const panelHeight = unitDescription.offsetHeight;
  const boardRect = canvas.getBoundingClientRect();
  const canPlaceRight =
    boardRect.right + panelWidth + margin <= window.innerWidth - margin;
  const canPlaceLeft = boardRect.left - panelWidth - margin >= margin;
  const left = canPlaceRight
    ? boardRect.right + margin
    : canPlaceLeft
      ? boardRect.left - panelWidth - margin
      : Math.max(
          margin,
          Math.min(clientX + margin, window.innerWidth - panelWidth - margin),
        );
  const canPlaceAbove = clientY - panelHeight - margin >= margin;
  const canPlaceBelow =
    clientY + panelHeight + margin <= window.innerHeight - margin;
  const preferAbove = clientY > boardRect.top + boardRect.height / 2;
  const top =
    (preferAbove && canPlaceAbove) || !canPlaceBelow
      ? Math.max(margin, clientY - panelHeight - margin)
      : clientY + margin;
  unitDescription.style.left = `${left}px`;
  unitDescription.style.top = `${top}px`;
}

// --- UI shell ---
const ui = new UI();
/** Active squad = first 6 owned characters (matches pre-battle strip). */
function currentSquadStage(): ReturnType<typeof stageFor> {
  const { chapter, stage } = ui.getSelectedStage();
  return stageWithSquad(stageFor(chapter, stage), ownedCharacters);
}

ui.setBattleCallback(() => {
  const data = currentSquadStage();
  battle = new Battle(data, Date.now() & 0xffff);
  session = null;
  busy = false;
  rewardsGranted = false;
  renderer.setDrag(null);
  renderer.reset();
  renderer.resize();
  const names = data.allies.map((a) => a.unit.name).join(", ");
  hud(`Squad: ${names}`);
});

$("btn-leave-battle")?.addEventListener("click", () => {
  session = null;
  busy = false;
  renderer.setDrag(null);
  ui.show("map");
});

function tryGrantRewards(): string | undefined {
  if (battle.phase !== "victory" || rewardsGranted) return undefined;
  rewardsGranted = true;
  const { chapter, stage } = ui.getSelectedStage();
  const ref = getStageRef(chapter, stage);
  if (!ref) return "Stage cleared.";
  const def = rewardsForStage(ref);
  // Seed from stage id so re-clear is stable; still grant coins/xp every clear
  const seed =
    Array.from(ref.id).reduce((a, c) => a + c.charCodeAt(0), 0) +
    progress.coins;
  const ids: string[] = [];
  if (ref.waves) {
    for (const w of ref.waves) for (const e of w) ids.push(e.enemyId);
  }
  const reward = grantStageRewards(def, seed ^ (Date.now() & 0xffff), ids);
  applyClearRewards(ref.id, reward, def.staminaCost ?? ref.stamina);
  const recruit = recruitForStage(ref.id);
  let recruitLine = "";
  if (recruit && tryRecruitBoss(recruit)) {
    recruitLine = ` · Recruited ${recruit.name}!`;
  }
  saveToLocalStorage();
  return `Cleared ${ref.name}! ${reward.lines.join(" · ")} · Rank ${progress.rank} · ${progress.coins} coins${recruitLine}`;
}

function hud(text?: string): void {
  waveEl.textContent = `Wave ${battle.waveIndex + 1}/${battle.waveCount}`;
  const phase = battle.phase;
  statusEl.textContent =
    phase === "victory"
      ? "Victory!"
      : phase === "defeat"
        ? "Defeat"
        : phase === "enemy"
          ? "Enemy turn…"
          : "Your turn";
  const grantMsg = phase === "victory" ? tryGrantRewards() : undefined;
  messageEl.textContent =
    text ??
    grantMsg ??
    (phase === "victory"
      ? "Stage cleared. Press Restart to play again."
      : phase === "defeat"
        ? "Fewer than two allies remain. Press Restart to try again."
        : "Drag one unit. Units you pass through drop back into the cell you left. Flank an enemy to attack.");
}

function describe(r: TurnReport): string {
  const hits = r.resolution.attacks.length;
  const down = r.resolution.defeated.length;
  const pincers = r.resolution.steps.length;
  const who = r.actor === "player" ? "You" : "Enemies";
  if (hits === 0)
    return r.actor === "player" ? "No pincer formed." : "Enemies moved.";
  return `${who} resolved ${pincers} pincer${pincers === 1 ? "" : "s"}: ${hits} hit${hits === 1 ? "" : "s"}${down ? `, ${down} defeated` : ""}.`;
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
    const vertical: Dir = dr < 0 ? "up" : "down";
    const horizontal: Dir = dc < 0 ? "left" : "right";
    const order: Dir[] =
      Math.abs(dr) >= Math.abs(dc)
        ? [vertical, horizontal]
        : [horizontal, vertical];
    // Cut the corner when both axes still need covering (the core refuses if the squares aren't
    // fully open); otherwise, or if refused, slide along orthogonally.
    const options: StepDir[] = [];
    if (dr !== 0 && dc !== 0)
      options.push(stepDirFor(Math.sign(dr), Math.sign(dc)));
    for (const d of order)
      if (d === vertical ? dr !== 0 : dc !== 0) options.push(d);
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
  if (battle.phase === "enemy") {
    busy = true;
    // let the player's pincers finish playing, then the enemy takes its turn
    window.setTimeout(
      () => {
        const r = battle.runEnemyTurn();
        const enemyPlayback = renderer.playResolution(
          r.resolution,
          performance.now(),
        );
        hud(describe(r));
        window.setTimeout(() => (busy = false), enemyPlayback);
      },
      Math.max(550, playback + 300),
    );
  } else if (playback > 0) {
    busy = true; // a new wave or the end screen: let the hits play out first
    window.setTimeout(() => (busy = false), playback);
  }
}

canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || busy || session || battle.phase !== "player") return;
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

canvas.addEventListener("pointermove", (e) => {
  if (!session) return;
  renderer.setDrag(session.moverId, e.clientX, e.clientY);
  const cell = renderer.cellFromClient(e.clientX, e.clientY);
  if (cell) advanceTo(cell, performance.now());
});

const release = () => endDrag(performance.now());
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

canvas.addEventListener("dblclick", (e) => {
  if (busy || session || battle.phase !== "player") return;
  const cell = renderer.cellFromClient(e.clientX, e.clientY);
  if (!cell) return;
  const unitId = battle.board.idAt(cell);
  if (!unitId) return;
  const report = battle.activateTap(unitId);
  if (report) {
    renderer.showTapFeedback(report);
    hud(
      `${report.unitName} used ${report.skill.name ?? "Tap Skill"}! (${report.remainingCharges} charges left)`,
    );
  }
});

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const cell = renderer.cellFromClient(e.clientX, e.clientY);
  const unitId = cell ? battle.board.idAt(cell) : null;
  if (unitId) showUnitDescription(unitId, e.clientX, e.clientY);
  else closeUnitDescription();
});

$("unit-description-close").addEventListener("click", closeUnitDescription);
document.addEventListener("pointerdown", (e) => {
  if (e.button === 0 && !unitDescription.contains(e.target as Node)) {
    closeUnitDescription();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeUnitDescription();
});

$("restart").addEventListener("click", () => {
  const data = currentSquadStage();
  battle = new Battle(data, Date.now() & 0xffff);
  session = null;
  busy = false;
  rewardsGranted = false;
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
