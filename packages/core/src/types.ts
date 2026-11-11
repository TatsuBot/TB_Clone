export type Side = "ally" | "enemy";
export const opposite = (s: Side): Side => (s === "ally" ? "enemy" : "ally");

export type Dir = "up" | "down" | "left" | "right";
export const DIRS: readonly Dir[] = ["up", "down", "left", "right"];

export interface Pos {
  row: number;
  col: number;
}

export const DELTA: Record<Dir, Pos> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

/** A single movement step of a drag: orthogonal or diagonal. */
export type DiagDir = "up-left" | "up-right" | "down-left" | "down-right";
export type StepDir = Dir | DiagDir;

export const STEP_DELTA: Record<StepDir, Pos> = {
  ...DELTA,
  "up-left": { row: -1, col: -1 },
  "up-right": { row: -1, col: 1 },
  "down-left": { row: 1, col: -1 },
  "down-right": { row: 1, col: 1 },
};

/** Direction name for a one-cell step with the given signs (each of dr, dc in -1..1, not both 0). */
export function stepDirFor(dr: number, dc: number): StepDir {
  const v = dr < 0 ? "up" : "down";
  const h = dc < 0 ? "left" : "right";
  if (dr === 0) return h;
  if (dc === 0) return v;
  return `${v}-${h}` as DiagDir;
}

export const addDir = (p: Pos, d: Dir): Pos => ({
  row: p.row + DELTA[d].row,
  col: p.col + DELTA[d].col,
});

export const samePos = (a: Pos, b: Pos): boolean =>
  a.row === b.row && a.col === b.col;

export type WeaponType = "Sword" | "Spear" | "Bow" | "Staff" | "None";
export type ElementType =
  | "—"
  | "Fire"
  | "Ice"
  | "Lightning"
  | "Darkness"
  | "Healing"
  | "Remedy"
  | "Photon"
  | "Graviton"
  | "Sun"
  | "Moon";
export type SkillTrigger = "pincer" | "chain" | "counter" | "equip" | "tap";

export type SkillPowerTier = "Mega" | "Giga" | "Tera" | "Peta";

export const SKILL_POWER_TIER_VALUES: Record<SkillPowerTier, number> = {
  Mega: 1,
  Giga: 2,
  Tera: 3,
  Peta: 3.5,
};

export type SkillShape =
  | "single"
  | "area"
  | "row"
  | "column"
  | "cross"
  | "adjacent"
  | "lateral"
  | "all";
export type SkillTargetMode = "enemy" | "ally" | "self" | "all";
export type SkillEffectType =
  | "damage"
  | "heal"
  | "buff"
  | "debuff"
  | "status"
  | "cure"
  | "utility";

export interface ActiveBuff {
  id: string;
  stat: "atk" | "def" | "matk" | "mdef";
  percent: number;
  duration: number; // turns remaining
  isTap?: boolean;
}

export type StatusType = "poison" | "paralysis" | "sleep" | "confusion";

export interface StatusEffect {
  type: StatusType;
  duration: number;
  power?: number;
}

export interface DamageComponent {
  /** Weapon uses ATK/DEF and the weapon triangle; magic uses MATK/MDEF and an element. */
  type: "weapon" | "magic";
  multiplier: number;
  /** Magic element; omit to inherit the unit element or use "—" for neutral magic. */
  element?: ElementType;
}

export interface Skill {
  id: string;
  name?: string;
  description?: string;
  trigger: SkillTrigger;
  /** Percent chance to activate when the trigger fires, 0–100. Equip skills ignore this and are always active. */
  frequency?: number;
  /** Explicit numeric override for the skill's power multiplier. */
  power?: number;
  /** Skill element or 'Healing'. */
  element?: ElementType | "Healing";
  /** Separate channels for hybrid attacks; when active these replace the default hit. */
  damageComponents?: DamageComponent[];
  /** Optional explicit tier label; if omitted, the tier is inferred from the skill name prefix. */
  tier?: SkillPowerTier;
  /** Shape of the effect: single target, area burst, row, column, etc. */
  shape?: SkillShape;
  /** Radius in cells for area skills, e.g. Area(1) => 1. */
  radius?: number;
  /** Who the skill targets. */
  target?: SkillTargetMode;
  effect?: SkillEffectType;
  stat?: "atk" | "def" | "matk" | "mdef";
  statPercent?: number;
  duration?: number;
  cureStatus?: StatusType | "all";
  tapCharges?: number;
}

export interface SkillEvent {
  skillId: string;
  skillName?: string;
  trigger: SkillTrigger;
  sourceUnitId?: string;
  targetUnitIds: string[];
  activated: boolean;
  multiplier: number;
  damageComponents?: DamageComponent[];
  chance?: number;
  order: number;
  effect: SkillEffectType;
  shape?: SkillShape;
  radius?: number;
  targetMode?: SkillTargetMode;
  stat?: "atk" | "def" | "matk" | "mdef";
  statPercent?: number;
  duration?: number;
  cureStatus?: StatusType | "all";
}

export interface UnitStats {
  maxHp: number;
  atk: number;
  def: number;
  matk?: number;
  mdef?: number;
}

/**
 * Runtime unit. NOTE: a unit has no position field. Position lives only in the
 * board's occupancy grid (single source of truth); ask the board where a unit is.
 */
export interface Unit {
  id: string;
  name: string;
  side: Side;
  stats: UnitStats;
  hp: number;
  description?: string;
  weapon?: WeaponType;
  element?: ElementType;
  skills?: Skill[];
  /** Footprint in cells. Allies are always 1x1; bosses may be larger. */
  w: number;
  h: number;
  buffs?: ActiveBuff[];
  statuses?: StatusEffect[];
  tapCharges?: Record<string, number>;
}

export interface TapReport {
  unitId: string;
  unitName: string;
  skill: Skill;
  category: "debuff" | "buff";
  remainingCharges: number;
  stat?: "atk" | "def" | "matk" | "mdef";
  percent: number;
  duration: number;
  targets: string[];
}

export type Terrain = "floor" | "wall";

/** Reserved floor hazards (Phase 0, step 5). Stored as cell data; they do nothing yet. */
export type Hazard = "spikes" | "lava" | "bomb";
