import { Board } from "./board";
import { chainUnits, type ChainOptions } from "./chain";
import { orderPincers } from "./order";
import { detectPincers, type Pincer, type PincerScan } from "./pincer";
import { RULES } from "./rules";
import {
  SKILL_POWER_TIER_VALUES,
  type ActiveBuff,
  type ElementType,
  type Pos,
  type Side,
  type Skill,
  type SkillEffectType,
  type SkillEvent,
  type SkillShape,
  type SkillTargetMode,
  type SkillTrigger,
  type StatusEffect,
  type StatusType,
  type Unit,
  type UnitStats,
  type WeaponType,
} from "./types";

export interface Attack {
  /** Position in resolution order (0 = first pincer to resolve). */
  step: number;
  /** Index of the pincer in `scan.pincers` (detection order). */
  pincerIndex: number;
  attacker: string;
  target: string;
  role:
    | "flanker"
    | "chain"
    | "direct"
    | "counter"
    | "aoe"
    | "heal"
    | "buff"
    | "debuff"
    | "cure";
  damage: number;
  targetHp: number;
  effect?: SkillEffectType;
  skillName?: string;
  skillId?: string;
  stat?: "atk" | "def" | "matk" | "mdef";
  impactIcon?: { kind: "weapon" | "element"; value: WeaponType | ElementType };
}

/** Snapshot of a unit at the moment it fell, so the UI can still show it. */
export interface Fallen {
  unit: Unit;
  origin: Pos;
}

/** One pincer, fully resolved before the next one starts. */
export interface ResolutionStep {
  step: number;
  pincerIndex: number;
  pincer: Pincer;
  attacks: Attack[];
  impactTiles?: Array<{
    position: Pos;
    icon: NonNullable<Attack["impactIcon"]>;
  }>;
  defeated: string[];
  fallen: Fallen[];
}

export interface Resolution {
  scan: PincerScan;
  /** Pincers in the order they resolved. Pincers whose targets were all already defeated are skipped. */
  steps: ResolutionStep[];
  /** Flat views of `steps`, in resolution order. */
  attacks: Attack[];
  /** Single-unit attacks against orthogonally adjacent targets. */
  directAttacks?: Attack[];
  directFallen?: Fallen[];
  defeated: string[];
}

export interface DirectAttackResolution {
  attacks: Attack[];
  defeated: string[];
  fallen: Fallen[];
}

export interface ResolveOptions extends ChainOptions {
  /** The unit the player just moved. Pincers it flanks resolve first. */
  moverId?: string;
}

function impactIconFor(
  attacker: Unit,
  event?: Pick<SkillEvent, "damageComponents" | "element" | "skillName" | "description">,
): Attack["impactIcon"] {
  const component = event?.damageComponents?.[0];
  if (component?.type === "weapon") return attacker.weapon ? { kind: "weapon", value: attacker.weapon } : undefined;
  const skillText = `${event?.skillName ?? ""} ${event?.description ?? ""}`.toLowerCase();
  const namedElement: ElementType | undefined =
    /darkness|\bdark\b/.test(skillText) ? "Darkness"
      : /\bfire\b/.test(skillText) ? "Fire"
        : /\bice\b/.test(skillText) ? "Ice"
          : /lightning|\bthunder\b|\bbolt\b/.test(skillText) ? "Lightning"
            : /photon/.test(skillText) ? "Photon"
              : /graviton/.test(skillText) ? "Graviton"
                : /\bsun\b/.test(skillText) ? "Sun"
                  : /\bmoon\b/.test(skillText) ? "Moon"
                    : undefined;
  const element = component?.element ?? event?.element ?? namedElement ??
    (event && attacker.weapon === "Staff" ? attacker.element : undefined);
  if (component?.type === "magic" && element && element !== "Healing" && element !== "Remedy") {
    return { kind: "element", value: element };
  }
  if (element && element !== "Healing" && element !== "Remedy") {
    return { kind: "element", value: element };
  }
  return attacker.weapon ? { kind: "weapon", value: attacker.weapon } : undefined;
}

const weaponAdvantage: Record<WeaponType, WeaponType | null> = {
  Sword: "Bow",
  Spear: "Sword",
  Bow: "Spear",
  Staff: null,
  None: null,
};

const elementAdvantage: Record<ElementType, ElementType | null> = {
  Fire: "Ice",
  Ice: "Fire",
  Lightning: "Darkness",
  Darkness: "Lightning",
  Photon: "Graviton",
  Graviton: "Photon",
  Sun: "Moon",
  Moon: "Sun",
  Healing: null,
  Remedy: null,
  "—": null,
};

let weaponAdvantageMultiplier: number = RULES.weaponTriangleAdvantage;

export function getWeaponAdvantageMultiplier(): number {
  return weaponAdvantageMultiplier;
}

export function setWeaponAdvantageMultiplier(val: number): void {
  weaponAdvantageMultiplier = val;
}

/** Cycle between 1.75x (Current), 2.0x (TB Wiki Classic), and 1.5x (Balanced). */
export function cycleWeaponAdvantagePreset(): number {
  if (Math.abs(weaponAdvantageMultiplier - 1.75) < 0.05) {
    weaponAdvantageMultiplier = 2.0;
  } else if (Math.abs(weaponAdvantageMultiplier - 2.0) < 0.05) {
    weaponAdvantageMultiplier = 1.5;
  } else {
    weaponAdvantageMultiplier = 1.75;
  }
  return weaponAdvantageMultiplier;
}

export function weaponTriangleFactor(
  attacker: Pick<Unit, "weapon">,
  target: Pick<Unit, "weapon">,
): number {
  const a = attacker.weapon ?? "Sword";
  const b = target.weapon ?? "Sword";
  if (a === b) return 1;
  const mult = weaponAdvantageMultiplier;
  const disadv = Math.round((1 / mult) * 1000) / 1000;
  if (weaponAdvantage[a] === b) return mult;
  if (weaponAdvantage[b] === a) return disadv;
  return 1;
}

export function elementalFactor(
  attacker: Pick<Unit, "element">,
  target: Pick<Unit, "element">,
): number {
  const a = attacker.element ?? "—";
  const b = target.element ?? "—";
  if (a === "—" || b === "—" || a === b) return 1;
  if (elementAdvantage[a] === b) return 1.5;
  if (elementAdvantage[b] === a) return 0.75;
  return 1;
}

/** Compute unit stat with active buffs applied, capped at +/- 200%. */
export function getEffectiveStat(unit: Unit, stat: keyof UnitStats): number {
  const base =
    unit.stats[stat] ??
    (stat === "matk" ? unit.stats.atk : stat === "mdef" ? unit.stats.def : 0);
  if (!unit.buffs || unit.buffs.length === 0) return base;
  const statBuffs = unit.buffs.filter((b) => b.stat === stat);
  if (statBuffs.length === 0) return base;
  const totalPercent = statBuffs.reduce((sum, b) => sum + b.percent, 0);
  const clamped = Math.max(-200, Math.min(200, totalPercent));
  return Math.max(1, Math.round(base * (1 + clamped / 100)));
}

export function applyBuff(unit: Unit, buff: ActiveBuff): void {
  if (!unit.buffs) unit.buffs = [];
  const existing = unit.buffs.find(
    (b) => b.id === buff.id && b.stat === buff.stat,
  );
  if (existing) {
    existing.percent = buff.percent;
    existing.duration = Math.max(existing.duration, buff.duration);
  } else {
    unit.buffs.push({ ...buff });
  }
}

export function applyStatus(unit: Unit, status: StatusEffect): void {
  if (!unit.statuses) unit.statuses = [];
  const existing = unit.statuses.find((s) => s.type === status.type);
  if (existing) {
    existing.duration = Math.max(existing.duration, status.duration);
    if (status.power) existing.power = status.power;
  } else {
    unit.statuses.push({ ...status });
  }
}

export function cureStatus(
  unit: Unit,
  toCure: StatusType | "all",
): StatusType[] {
  if (!unit.statuses || unit.statuses.length === 0) return [];
  if (toCure === "all") {
    const cured = unit.statuses.map((s) => s.type);
    unit.statuses = [];
    return cured;
  }
  const removed: StatusType[] = [];
  unit.statuses = unit.statuses.filter((s) => {
    if (s.type === toCure) {
      removed.push(s.type);
      return false;
    }
    return true;
  });
  return removed;
}

export function skillPowerMultiplier(
  skill: Pick<Skill, "name" | "power" | "tier">,
): number {
  if (typeof skill.power === "number") return skill.power;
  const tier =
    skill.tier ??
    (skill.name?.match(/^(Mega|Giga|Tera|Peta)\b/i)?.[1] as
      | keyof typeof SKILL_POWER_TIER_VALUES
      | undefined);
  if (!tier) return 1;
  return (
    SKILL_POWER_TIER_VALUES[tier as keyof typeof SKILL_POWER_TIER_VALUES] ?? 1
  );
}

export function shouldActivateSkill(
  skill: { trigger: SkillTrigger; frequency?: number },
  trigger: SkillTrigger | undefined,
  random: () => number = Math.random,
): boolean {
  if (skill.trigger === "equip") return true;
  if (trigger !== skill.trigger) return false;
  if (typeof skill.frequency === "undefined") return true;
  if (skill.frequency <= 0) return false;
  if (skill.frequency >= 100) return true;
  return random() * 100 < skill.frequency;
}

/** Read every stat named before a signed percentage, e.g. ATK/MATK/DEF/MDEF +30%. */
export function inferSkillStatChanges(
  skill: Skill,
): Array<{ stat: "atk" | "def" | "matk" | "mdef"; percent: number }> {
  if (skill.stat && skill.statPercent !== undefined) {
    return [{ stat: skill.stat, percent: skill.statPercent }];
  }
  const text = `${skill.name ?? ""} ${skill.description ?? ""}`.toLowerCase();
  const percentage = /([+-]\d+)%/.exec(text);
  if (!percentage || percentage.index === undefined) return [];

  const statText = text.slice(0, percentage.index);
  const aliases: Record<string, "atk" | "def" | "matk" | "mdef"> = {
    attack: "atk", atk: "atk", "magic attack": "matk", matk: "matk",
    defense: "def", defence: "def", def: "def", "magic defense": "mdef",
    "magic defence": "mdef", mdef: "mdef",
  };
  const stats = new Set<"atk" | "def" | "matk" | "mdef">();
  const statPattern = /\b(magic\s+attack|magic\s+defen[cs]e|attack|defen[cs]e|matk|mdef|atk|def)\b/g;
  for (const match of statText.matchAll(statPattern)) {
    const stat = aliases[match[1] ?? ""];
    if (stat) stats.add(stat);
  }
  return [...stats].map((stat) => ({ stat, percent: Number.parseInt(percentage[1]!, 10) }));
}

/** Infer AoE shape, effect type, stat buff info, and target mode from skill data and descriptions. */
export function inferSkillAttributes(skill: Skill): {
  shape: SkillShape;
  radius: number;
  targetMode: SkillTargetMode;
  effect: SkillEffectType;
  stat?: "atk" | "def" | "matk" | "mdef";
  statPercent?: number;
  duration?: number;
  cureStatus?: StatusType | "all";
  targetWeapons?: WeaponType[];
  targetElements?: ElementType[];
  targetSpecies?: string[];
} {
  const text = `${skill.name ?? ""} ${skill.description ?? ""}`.toLowerCase();

  let effect: SkillEffectType = skill.effect ?? "damage";
  const statChanges = inferSkillStatChanges(skill);
  let stat: "atk" | "def" | "matk" | "mdef" | undefined = statChanges[0]?.stat ?? skill.stat;
  let statPercent: number | undefined = statChanges[0]?.percent ?? skill.statPercent;
  let duration: number | undefined = skill.duration ?? 2;
  let cureStatus: StatusType | "all" | undefined = skill.cureStatus;

  if (
    text.includes("heal") ||
    text.includes("party heal") ||
    skill.element === "Healing"
  ) {
    effect = "heal";
  } else if (
    text.includes("panacea") ||
    text.includes("remedy") ||
    text.includes("cure all")
  ) {
    effect = "cure";
    cureStatus = "all";
  } else if (
    text.includes("antidote") ||
    (text.includes("cure") && text.includes("poison"))
  ) {
    effect = "cure";
    cureStatus = "poison";
  } else if (
    text.includes("locomotion") ||
    (text.includes("cure") && text.includes("paralysis"))
  ) {
    effect = "cure";
    cureStatus = "paralysis";
  } else if (
    text.includes("rise and shine") ||
    (text.includes("cure") && text.includes("sleep"))
  ) {
    effect = "cure";
    cureStatus = "sleep";
  } else if (
    text.includes("clarity") ||
    (text.includes("cure") && text.includes("confusion"))
  ) {
    effect = "cure";
    cureStatus = "confusion";
  } else if (/levitat|ground attacks|floor traps/.test(text)) {
    effect = "levitation";
    const durMatch = text.match(/for\s*(\d+)\s*turn/);
    duration = durMatch
      ? parseInt(durMatch[1], 10)
      : skill.trigger === "equip"
        ? -1
        : 3;
  } else if (statChanges.length > 0) {
    effect = statChanges[0]!.percent >= 0 ? "buff" : "debuff";
    const durMatch = text.match(/for\s*(\d+)\s*turn/);
    if (durMatch) duration = parseInt(durMatch[1], 10);
  }

  let shape: SkillShape = skill.shape ?? "single";
  let radius: number = skill.radius ?? 1;

  if (skill.shape) {
    shape = skill.shape;
  } else if (/pincer\s*area\s*\(\s*column\s*\)/i.test(text)) {
    shape = "pincerAreaColumn";
  } else if (/pincer\s*area\s*\(\s*row\s*\)/i.test(text)) {
    shape = "pincerAreaRow";
  } else if (/pincer\s*ring/i.test(text)) {
    shape = "pincerRing";
  } else if (/pincer\s*area/i.test(text)) {
    shape = "pincerArea";
  } else if (/pincer\s*column/i.test(text)) {
    shape = "pincerColumn";
  } else if (/pincer\s*row/i.test(text)) {
    shape = "pincerRow";
  } else if (/pincer/i.test(text)) {
    shape = "pincer";
  } else if (/area\s*\(\s*(\d+)\s*\)/i.test(text)) {
    shape = "area";
    radius = Number(text.match(/area\s*\(\s*(\d+)\s*\)/i)?.[1] ?? 1);
  } else if (/(\d+)\s+columns?/i.test(text)) {
    const count = Number(text.match(/(\d+)\s+columns?/i)?.[1] ?? 1);
    shape = count > 1 ? "columnBand" : "column";
    radius = Math.floor(count / 2);
  } else if (/(\d+)\s+rows?/i.test(text)) {
    const count = Number(text.match(/(\d+)\s+rows?/i)?.[1] ?? 1);
    shape = count > 1 ? "rowBand" : "row";
    radius = Math.floor(count / 2);
  } else if (/cross\s*\(\s*all\s*\)/i.test(text)) {
    shape = "cross"; radius = 0;
  } else if (/cross\s*\(\s*(\d+)\s*\)/i.test(text)) {
    shape = "cross";
    radius = Number(text.match(/cross\s*\(\s*(\d+)\s*\)/i)?.[1] ?? 1);
  } else if (/diamond/i.test(text)) {
    shape = "diamond";
  } else if (/corner/i.test(text)) {
    shape = "corners";
  } else if (/outer\s+rows?/i.test(text)) {
    shape = "outerRows";
  } else if (/outer\s+columns?/i.test(text)) {
    shape = "outerColumns";
  } else if (/4\s*x\s*6|interior/i.test(text)) {
    shape = "interior";
  } else if (/border/i.test(text)) {
    shape = "border";
  } else if (/ring/i.test(text)) {
    shape = "ring";
  } else if (/vertical\s*\(\s*(\d+)\s*\)/i.test(text)) {
    shape = "vertical";
    radius = Number(text.match(/vertical\s*\(\s*(\d+)\s*\)/i)?.[1] ?? 1);
  } else if (/cross/i.test(text)) {
    shape = "cross";
    radius = 1;
  } else if (/column/i.test(text)) {
    shape = "column";
  } else if (/row/i.test(text)) {
    shape = "row";
  } else if (/lateral/i.test(text)) {
    shape = "lateral";
    radius = Number(text.match(/lateral\s*\(\s*(\d+)\s*\)/i)?.[1] ?? 1);
  } else if (/adjacent|surround/i.test(text)) {
    shape = "adjacent";
  } else if (
    /all allies|all targets|heal all/i.test(text) ||
    skill.target === "all"
  ) {
    shape = "all";
  }

  let targetMode: SkillTargetMode = skill.target ?? "enemy";
  if (effect === "levitation") {
    targetMode = skill.trigger === "equip" || text.includes("self") ? "self" : "ally";
  } else if (effect === "heal" || effect === "cure" || effect === "buff") {
    if (skill.target === "self" || text.includes("self")) {
      targetMode = "self";
    } else if (
      text.includes("allies") ||
      text.includes("all") ||
      shape === "all"
    ) {
      targetMode = "ally";
    } else {
      targetMode = "ally";
    }
  } else if (effect === "debuff") {
    targetMode = "enemy";
  }

  return {
    shape,
    radius,
    targetMode,
    effect,
    stat,
    statPercent,
    duration,
    cureStatus,
    targetWeapons: parseDescriptorTargets(skill.description ?? "", ["sword", "spear", "bow"], "weapon") as WeaponType[] | undefined,
    targetElements: parseDescriptorTargets(skill.description ?? "", ["fire", "ice", "lightning", "darkness", "photon", "graviton", "sun", "moon"], "element") as ElementType[] | undefined,
    targetSpecies: parseDescriptorTargets(skill.description ?? "", ["wild beast", "dragon", "machine", "oxsecian"], "species"),
  };
}

function parseDescriptorTargets(text: string, values: string[], kind: "weapon" | "element" | "species"): string[] | undefined {
  const descriptor = text.split(/[;:]/, 1)[0] ?? "";
  const found = values.filter((value) => new RegExp(`\\b${value.replace(/ /g, "\\s+")}\\b`, "i").test(descriptor));
  return found.length ? found.map((value) => kind === "weapon" ? value[0]!.toUpperCase() + value.slice(1) : kind === "element" ? value[0]!.toUpperCase() + value.slice(1) : value) : undefined;
}

export function getCellsInShape(
  board: Board,
  origin: Pos,
  shape: SkillShape,
  radius = 1,
  anchors: Pos[] = [origin],
): Pos[] {
  const cells: Pos[] = [];
  const add = (p: Pos) => { if (board.inBounds(p)) cells.push(p); };
  if (shape === "pincerAndRing") {
    const pincered = getCellsInShape(board, origin, "pincer", radius, anchors);
    const ring = getCellsInShape(board, origin, "ring", radius);
    return [...new Map([...pincered, ...ring].map(p => [`${p.row},${p.col}`, p])).values()];
  }
  if (shape.startsWith("pincer")) {
    const out = new Map<string, Pos>();
    for (const anchor of anchors) {
      let base: SkillShape = "pincer";
      if (shape === "pincerArea") base = "area";
      else if (shape === "pincerRow" || shape === "pincerAreaRow") base = "row";
      else if (shape === "pincerColumn" || shape === "pincerAreaColumn") base = "column";
      else if (shape === "pincerRing") base = "ring";
      const points = base === "pincer" ? [anchor] : getCellsInShape(board, anchor, base, base === "area" ? 1 : radius);
      for (const p of points) out.set(`${p.row},${p.col}`, p);
      if (shape === "pincerAreaRow" || shape === "pincerAreaColumn") {
        const band = shape === "pincerAreaRow" ? "rowBand" : "columnBand";
        for (const p of getCellsInShape(board, anchor, band, 1)) out.set(`${p.row},${p.col}`, p);
      }
    }
    return [...out.values()];
  }
  switch (shape) {
    case "single":
      if (board.inBounds(origin)) cells.push(origin);
      break;
    case "area":
      for (let r = origin.row - radius; r <= origin.row + radius; r++) {
        for (let c = origin.col - radius; c <= origin.col + radius; c++) {
          const p = { row: r, col: c };
          if (board.inBounds(p)) cells.push(p);
        }
      }
      break;
    case "column":
      for (let r = 0; r < board.rows; r++) {
        cells.push({ row: r, col: origin.col });
      }
      break;
    case "columnBand":
      for (let c = origin.col - radius; c <= origin.col + radius; c++)
        for (let r = 0; r < board.rows; r++) add({ row: r, col: c });
      break;
    case "row":
      for (let c = 0; c < board.cols; c++) {
        cells.push({ row: origin.row, col: c });
      }
      break;
    case "rowBand":
      for (let r = origin.row - radius; r <= origin.row + radius; r++)
        for (let c = 0; c < board.cols; c++) add({ row: r, col: c });
      break;
    case "cross":
      if (radius === 0) {
        for (let r = 0; r < board.rows; r++)
          cells.push({ row: r, col: origin.col });
        for (let c = 0; c < board.cols; c++) {
          if (c !== origin.col) cells.push({ row: origin.row, col: c });
        }
      } else {
        for (let d = -radius; d <= radius; d++) {
          const pr = { row: origin.row + d, col: origin.col };
          if (board.inBounds(pr)) cells.push(pr);
          if (d !== 0) {
            const pc = { row: origin.row, col: origin.col + d };
            if (board.inBounds(pc)) cells.push(pc);
          }
        }
      }
      break;
    case "lateral":
      for (let d = -radius; d <= radius; d++) {
        const p = { row: origin.row, col: origin.col + d };
        if (board.inBounds(p)) cells.push(p);
      }
      break;
    case "vertical":
      for (let d = -radius; d <= radius; d++) add({ row: origin.row + d, col: origin.col });
      break;
    case "diamond": {
      const cross = getCellsInShape(board, origin, "cross", 2);
      const area = getCellsInShape(board, origin, "area", 1);
      return [...new Map([...cross, ...area].map(p => [`${p.row},${p.col}`, p])).values()];
    }
    case "ring":
      for (let r = origin.row - 2; r <= origin.row + 2; r++) for (let c = origin.col - 2; c <= origin.col + 2; c++)
        if (Math.max(Math.abs(r-origin.row), Math.abs(c-origin.col)) === 2) add({ row:r, col:c });
      break;
    case "corners":
      [[0,0],[0,board.cols-1],[board.rows-1,0],[board.rows-1,board.cols-1]].forEach(([row,col]) => add({row: row!, col: col!}));
      break;
    case "border":
      for (let r=0;r<board.rows;r++) for(let c=0;c<board.cols;c++) if(r===0||c===0||r===board.rows-1||c===board.cols-1) add({row:r,col:c});
      break;
    case "outerRows":
      for (const r of [1,board.rows-2]) for(let c=0;c<board.cols;c++) add({row:r,col:c});
      break;
    case "outerColumns":
      for (const c of [1,board.cols-2]) for(let r=0;r<board.rows;r++) add({row:r,col:c});
      break;
    case "interior":
      for(let r=1;r<board.rows-1;r++) for(let c=1;c<board.cols-1;c++) add({row:r,col:c});
      break;
    case "adjacent":
      for (let r = origin.row - 1; r <= origin.row + 1; r++) {
        for (let c = origin.col - 1; c <= origin.col + 1; c++) {
          if (r === origin.row && c === origin.col) continue;
          const p = { row: r, col: c };
          if (board.inBounds(p)) cells.push(p);
        }
      }
      break;
    case "all":
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          cells.push({ row: r, col: c });
        }
      }
      break;
  }
  return cells;
}

export function getTargetsInShape(
  board: Board,
  origin: Pos,
  shape: SkillShape,
  radius: number,
  targetMode: SkillTargetMode,
  attacker: Unit,
  anchors?: Pos[],
  filters?: Pick<SkillEvent, "targetWeapons" | "targetElements" | "targetSpecies">,
): Unit[] {
  const cells = getCellsInShape(board, origin, shape, radius, anchors);
  const matchedUnitIds = new Set<string>();
  const units: Unit[] = [];

  for (const p of cells) {
    const id = board.idAt(p);
    if (!id || matchedUnitIds.has(id)) continue;
    matchedUnitIds.add(id);
    const u = board.getUnit(id);
    const matchesFilters = (!filters?.targetWeapons?.length || filters.targetWeapons.includes(u.weapon ?? "None")) &&
      (!filters?.targetElements?.length || filters.targetElements.includes(u.element ?? "—")) &&
      (!filters?.targetSpecies?.length || filters.targetSpecies.some(s => (u.species ?? "").toLowerCase().includes(s.toLowerCase())));
    if (!matchesFilters) continue;
    if (targetMode === "self") {
      if (u.id === attacker.id) units.push(u);
    } else if (targetMode === "ally") {
      if (u.side === attacker.side) units.push(u);
    } else if (targetMode === "enemy") {
      if (u.side !== attacker.side) units.push(u);
    } else {
      units.push(u);
    }
  }
  return units;
}

export interface SkillEventContext {
  trigger?: SkillTrigger;
  sourceUnitId?: string;
  targetUnitIds?: string[];
  random?: () => number;
  order?: number;
}

export function buildSkillEvents(
  attacker: Pick<Unit, "id" | "name" | "skills">,
  context: SkillEventContext = {},
  randomOverride?: () => number,
): SkillEvent[] {
  const random = randomOverride ?? context.random ?? Math.random;
  const active = (attacker.skills ?? []).filter((skill) => {
    if (skill.trigger === "equip") return true;
    if (!context.trigger) return false;
    return shouldActivateSkill(skill, context.trigger, random);
  });

  return active.map((skill, index) => {
    const attr = inferSkillAttributes(skill);
    return {
      skillId: skill.id,
      skillName: skill.name ?? skill.id,
      description: skill.description,
      trigger: skill.trigger,
      sourceUnitId: context.sourceUnitId ?? attacker.id,
      targetUnitIds: context.targetUnitIds ?? [],
      activated: true,
      multiplier: skillPowerMultiplier(skill),
      damageComponents: skill.damageComponents,
      element: skill.element,
      chance: skill.frequency,
      order: typeof context.order === "number" ? context.order + index : index,
      effect: attr.effect,
      shape: attr.shape,
      radius: attr.radius,
      targetMode: attr.targetMode,
      stat: attr.stat,
      statPercent: attr.statPercent,
      duration: attr.duration,
      cureStatus: attr.cureStatus,
      targetWeapons: attr.targetWeapons,
      targetElements: attr.targetElements,
      targetSpecies: attr.targetSpecies,
    };
  });
}

export interface DamageContext {
  trigger?: SkillTrigger;
  random?: () => number;
}

export function damageSkillMultiplier(
  attacker: Pick<Unit, "skills">,
  trigger: SkillTrigger | undefined,
  random: () => number = Math.random,
): number {
  const active = buildSkillEvents(
    attacker as Pick<Unit, "id" | "name" | "skills">,
    {
      trigger,
      random,
    },
  );
  if (active.length === 0) return 1;
  return active.reduce(
    (total, skillEvent) =>
      total * (skillEvent.damageComponents?.length ? 1 : skillEvent.multiplier),
    1,
  );
}

function damageForComponent(
  attacker: Unit,
  target: Unit,
  component: NonNullable<Skill["damageComponents"]>[number],
): number {
  const isMagic = component.type === "magic";
  const attackStat = isMagic
    ? getEffectiveStat(attacker, "matk")
    : getEffectiveStat(attacker, "atk");
  const defenseStat = isMagic
    ? getEffectiveStat(target, "mdef")
    : getEffectiveStat(target, "def");
  const base = Math.max(1, attackStat - defenseStat);
  const matchup = isMagic
    ? elementalFactor(
        { element: component.element ?? attacker.element },
        target,
      )
    : weaponTriangleFactor(attacker, target);
  return base * component.multiplier * matchup;
}

export function computeDamage(
  attacker: Unit,
  target: Unit,
  context: DamageContext = {},
): number {
  const skillEvents = buildSkillEvents(attacker, {
    trigger: context.trigger,
    random: context.random ?? Math.random,
  });
  const hybridEvents = skillEvents.filter(
    (event) => event.damageComponents && event.damageComponents.length > 0,
  );
  const scalarMultiplier = skillEvents.reduce(
    (total, event) =>
      total * (event.damageComponents?.length ? 1 : event.multiplier),
    1,
  );

  if (hybridEvents.length > 0) {
    const componentDamage = hybridEvents.reduce(
      (total, event) =>
        total +
        (event.damageComponents ?? []).reduce(
          (sum, component) =>
            sum + damageForComponent(attacker, target, component),
          0,
        ),
      0,
    );
    return Math.max(1, Math.round(componentDamage * scalarMultiplier));
  }

  const attackStat =
    attacker.weapon === "Staff"
      ? getEffectiveStat(attacker, "matk")
      : getEffectiveStat(attacker, "atk");
  const defenseStat =
    target.weapon === "Staff"
      ? getEffectiveStat(target, "mdef")
      : getEffectiveStat(target, "def");
  const base = Math.max(1, attackStat - defenseStat);
  const modifier =
    weaponTriangleFactor(attacker, target) *
    elementalFactor(attacker, target) *
    scalarMultiplier;
  return Math.max(1, Math.round(base * modifier));
}

/**
 * Resolve one side's attacks:
 *  1. detect every pincer and chain and FREEZE each pincer's attacker roster,
 *  2. put the pincers in order (mover's pincer first, then top-left to bottom-right; see order.ts),
 *  3. resolve them ONE AT A TIME:
 *     - Support skills (heal, buff, remedy) apply to targets in shape.
 *     - AoE skills damage enemies across the designated shape.
 *     - Flankers & chains strike pincer targets.
 *  4. Clean up any units defeated across the entire board.
 * Mutates `board`.
 */
export function resolveAttacks(
  board: Board,
  attackers: Side,
  opts: ResolveOptions = {},
): Resolution {
  const scan = detectPincers(board, attackers);

  const rosters = scan.pincers.map((pincer) => [
    ...pincer.flankers.map((id) => ({ id, role: "flanker" as const })),
    ...chainUnits(board, pincer, attackers, opts).map((id) => ({
      id,
      role: "chain" as const,
    })),
  ]);
  const ordered = orderPincers(board, scan.pincers, opts.moverId);

  const steps: ResolutionStep[] = [];
  for (const { pincer, index } of ordered) {
    const targets = pincer.targets.filter((id) => board.hasUnit(id));
    if (targets.length === 0) continue;

    const step = steps.length;
    const attacks: Attack[] = [];
    const impactTiles: NonNullable<ResolutionStep["impactTiles"]> = [];

    for (const { id, role } of rosters[index] ?? []) {
      if (!board.hasUnit(id)) continue;
      const attacker = board.getUnit(id);
      if (attacker.hp <= 0) continue;

      const trigger = role === "flanker" ? "pincer" : "chain";
      const skillEvents = buildSkillEvents(attacker, { trigger });
      // A chain-wide Levitation on the pincer lead should also protect the
      // chain members joining that pincer, while other chain skills retain
      // their normal chain-only trigger.
      if (role === "flanker" && (rosters[index] ?? []).some((member) => member.role === "chain")) {
        const leadLevitation = buildSkillEvents(attacker, { trigger: "chain" })
          .filter((event) => event.effect === "levitation" && event.trigger === "chain");
        skillEvents.push(...leadLevitation);
      }

      // 1. Support skills: heals, buffs, remedies
      for (const event of skillEvents) {
        // Equip Levitation is initialized as a permanent unit state in Battle.initUnits.
        // It should not be re-applied as an action effect on every pincer.
        if (event.effect === "levitation" && event.trigger === "equip") continue;
        if (event.effect === "heal") {
          const origin = board.originOf(attacker.id);
          const healTargets = getTargetsInShape(
            board,
            origin,
            event.shape ?? "all",
            event.radius ?? 1,
            event.targetMode ?? "ally",
            attacker,
          );
          const matk = getEffectiveStat(attacker, "matk");
          let rawHeal = Math.max(1, Math.round(matk * event.multiplier));
          const text = (event.skillName ?? "").toLowerCase();
          const capMatch = text.match(/cap\s*(\d+)/);
          if (capMatch) rawHeal = Math.min(rawHeal, parseInt(capMatch[1], 10));

          for (const targetAlly of healTargets) {
            const healAmount = Math.min(
              targetAlly.stats.maxHp - targetAlly.hp,
              rawHeal,
            );
            targetAlly.hp += healAmount;
            attacks.push({
              step,
              pincerIndex: index,
              attacker: id,
              target: targetAlly.id,
              role: "heal",
              damage: healAmount,
              targetHp: targetAlly.hp,
              effect: "heal",
              skillName: event.skillName,
            });
          }
        } else if (event.effect === "buff") {
          const origin = board.originOf(attacker.id);
          const buffTargets = getTargetsInShape(
            board,
            origin,
            event.shape ?? "all",
            event.radius ?? 1,
            event.targetMode ?? "ally",
            attacker,
          );
          for (const targetAlly of buffTargets) {
            applyBuff(targetAlly, {
              id: event.skillId,
              stat: event.stat ?? "atk",
              percent: event.statPercent ?? 10,
              duration: event.duration ?? 2,
            });
            attacks.push({
              step,
              pincerIndex: index,
              attacker: id,
              target: targetAlly.id,
              role: "buff",
              damage: 0,
              targetHp: targetAlly.hp,
              effect: "buff",
              skillName: event.skillName,
              stat: event.stat,
            });
          }
        } else if (event.effect === "debuff") {
          const origin = board.originOf(attacker.id);
          const debuffTargets = getTargetsInShape(
            board,
            origin,
            event.shape ?? "all",
            event.radius ?? 1,
            "enemy",
            attacker,
          );
          for (const targetEnemy of debuffTargets) {
            applyBuff(targetEnemy, {
              id: event.skillId,
              stat: event.stat ?? "def",
              percent: event.statPercent ?? -20,
              duration: event.duration ?? 2,
            });
            attacks.push({
              step,
              pincerIndex: index,
              attacker: id,
              target: targetEnemy.id,
              role: "debuff",
              damage: 0,
              targetHp: targetEnemy.hp,
              effect: "debuff",
              skillName: event.skillName,
              stat: event.stat,
            });
          }
        } else if (event.effect === "cure") {
          const origin = board.originOf(attacker.id);
          const cureTargets = getTargetsInShape(
            board,
            origin,
            event.shape ?? "all",
            event.radius ?? 1,
            "ally",
            attacker,
          );
          for (const targetAlly of cureTargets) {
            cureStatus(targetAlly, event.cureStatus ?? "all");
            attacks.push({
              step,
              pincerIndex: index,
              attacker: id,
              target: targetAlly.id,
              role: "cure",
              damage: 0,
              targetHp: targetAlly.hp,
              effect: "cure",
              skillName: event.skillName,
            });
          }
        } else if (event.effect === "levitation") {
          const origin = board.originOf(attacker.id);
          const levitationTargets = getTargetsInShape(
            board,
            origin,
            event.shape ?? "single",
            event.radius ?? 1,
            event.targetMode ?? "ally",
            attacker,
          );
          for (const targetAlly of levitationTargets) {
            const duration = event.duration ?? 3;
            targetAlly.levitationTurns = targetAlly.levitationTurns === -1
              ? -1
              : duration < 0
                ? -1
                : Math.max(targetAlly.levitationTurns ?? 0, duration);
            attacks.push({
              step,
              pincerIndex: index,
              attacker: id,
              target: targetAlly.id,
              role: "buff",
              damage: 0,
              targetHp: targetAlly.hp,
              effect: "levitation",
              skillName: event.skillName,
              skillId: event.skillId,
            });
          }
        }
      }

      // 2. AoE Damage Skills
      const aoeEvents = skillEvents.filter(
        (e) => e.effect === "damage" && e.shape && e.shape !== "single",
      );
      const hitTargetsThisAttacker = new Set<string>();

      for (const aoe of aoeEvents) {
        // Origin: if caster-centered (column/row/adjacent), use attacker origin; otherwise pincer target origin
        const isCasterCentered =
          aoe.shape === "column" ||
          aoe.shape === "row" ||
          aoe.shape === "adjacent" ||
          aoe.shape === "lateral" ||
          (aoe.skillName ?? "").toLowerCase().includes("caster");
        const origin = isCasterCentered
          ? board.originOf(attacker.id)
          : board.originOf(targets[0]);

        const anchors = targets.map(targetId => board.originOf(targetId));
        const impactIcon = impactIconFor(attacker, aoe);
        if (impactIcon) {
          for (const position of getCellsInShape(board, origin, aoe.shape ?? "area", aoe.radius ?? 1, anchors)) {
            if (board.terrainAt(position) === "floor") impactTiles.push({ position, icon: impactIcon });
          }
        }

        const aoeTargets = getTargetsInShape(
          board,
          origin,
          aoe.shape ?? "area",
          aoe.radius ?? 1,
          "enemy",
          attacker,
          anchors,
          aoe,
        );

        for (const targetEnemy of aoeTargets) {
          if (targetEnemy.hp <= 0) continue;
          hitTargetsThisAttacker.add(targetEnemy.id);
          const damage = computeDamage(attacker, targetEnemy, { trigger });
          targetEnemy.hp -= damage;
          attacks.push({
            step,
            pincerIndex: index,
            attacker: id,
            target: targetEnemy.id,
            role: "aoe",
            damage,
            targetHp: targetEnemy.hp,
            effect: "damage",
            skillName: aoe.skillName,
          });

          // Check counter on surviving target
          if (targetEnemy.hp > 0) {
            const counterSkills = (targetEnemy.skills ?? []).filter(
              (skill) => skill.trigger === "counter",
            );
            if (counterSkills.length > 0) {
              const counterDamage = computeDamage(targetEnemy, attacker, {
                trigger: "counter",
              });
              attacker.hp -= counterDamage;
              attacks.push({
                step,
                pincerIndex: index,
                attacker: targetEnemy.id,
                target: id,
                role: "counter",
                damage: counterDamage,
                targetHp: attacker.hp,
                impactIcon: impactIconFor(targetEnemy, targetEnemy.skills?.find((skill) => skill.trigger === "counter")),
              });
            }
          }
        }
      }

      // 3. Primary Pincer Target Attacks (hits any primary target not yet struck by AoE)
      for (const targetId of targets) {
        if (!board.hasUnit(targetId)) continue;
        const target = board.getUnit(targetId);
        if (target.hp <= 0 || hitTargetsThisAttacker.has(targetId)) continue;

        const damage = computeDamage(attacker, target, { trigger });
        target.hp -= damage;
        attacks.push({
          step,
          pincerIndex: index,
          attacker: id,
          target: targetId,
          role,
          damage,
          targetHp: target.hp,
          effect: "damage",
          impactIcon: impactIconFor(attacker, skillEvents.find((event) => event.effect === "damage")),
        });

        if (target.hp > 0) {
          const counterSkills = (target.skills ?? []).filter(
            (skill) => skill.trigger === "counter",
          );
          if (counterSkills.length > 0) {
            const counterDamage = computeDamage(target, attacker, {
              trigger: "counter",
            });
            attacker.hp -= counterDamage;
            attacks.push({
              step,
              pincerIndex: index,
              attacker: targetId,
              target: id,
              role: "counter",
              damage: counterDamage,
              targetHp: attacker.hp,
              impactIcon: impactIconFor(target, target.skills?.find((skill) => skill.trigger === "counter")),
            });
          }
        }
      }
    }

    // 4. Defeated unit collection across the entire board (handles AoE kills)
    const defeated: string[] = [];
    const fallen: Fallen[] = [];
    for (const unit of board.allUnits()) {
      if (unit.hp <= 0) {
        fallen.push({
          unit: { ...unit, stats: { ...unit.stats } },
          origin: board.originOf(unit.id),
        });
        defeated.push(unit.id);
      }
    }
    defeated.forEach((id) => board.remove(id));
    steps.push({
      step,
      pincerIndex: index,
      pincer,
      attacks,
      ...(impactTiles.length ? { impactTiles } : {}),
      defeated,
      fallen,
    });
  }

  return {
    scan,
    steps,
    attacks: steps.flatMap((s) => s.attacks),
    defeated: steps.flatMap((s) => s.defeated),
  };
}

/** Resolve one basic attack for each unit beside a target, excluding units already in a pincer. */
export function resolveAdjacentAttacks(
  board: Board,
  attackers: Side,
  excludedAttackers: ReadonlySet<string> = new Set(),
): DirectAttackResolution {
  const targetSide = attackers === "ally" ? "enemy" : "ally";
  const attacks: Attack[] = [];
  let step = 0;

  for (const attacker of board.unitsOf(attackers)) {
    if (attacker.hp <= 0 || excludedAttackers.has(attacker.id)) continue;
    const attackerCells = board.cellsOf(attacker.id);
    const target = board.unitsOf(targetSide).find((candidate) => {
      if (candidate.hp <= 0) return false;
      return attackerCells.some((a) => board.cellsOf(candidate.id).some((t) =>
        Math.abs(a.row - t.row) + Math.abs(a.col - t.col) === 1,
      ));
    });
    if (!target) continue;

    const damage = computeDamage(attacker, target, { trigger: "pincer" });
    target.hp -= damage;
    attacks.push({
      step,
      pincerIndex: -1,
      attacker: attacker.id,
      target: target.id,
      role: "direct",
      damage,
      targetHp: target.hp,
      effect: "damage",
      impactIcon: impactIconFor(attacker),
    });

    if (target.hp > 0 && (target.skills ?? []).some((skill) => skill.trigger === "counter")) {
      const counterDamage = computeDamage(target, attacker, { trigger: "counter" });
      attacker.hp -= counterDamage;
      attacks.push({
        step,
        pincerIndex: -1,
        attacker: target.id,
        target: attacker.id,
        role: "counter",
        damage: counterDamage,
        targetHp: attacker.hp,
        impactIcon: impactIconFor(target, target.skills?.find((skill) => skill.trigger === "counter")),
      });
    }
    step++;
  }

  const defeated: string[] = [];
  const fallen: Fallen[] = [];
  for (const unit of board.allUnits()) {
    if (unit.hp <= 0) {
      fallen.push({ unit: { ...unit, stats: { ...unit.stats } }, origin: board.originOf(unit.id) });
      defeated.push(unit.id);
    }
  }
  defeated.forEach((id) => board.remove(id));
  return { attacks, defeated, fallen };
}
