import { Board } from "./board";
import { chainUnits, type ChainOptions } from "./chain";
import { orderPincers } from "./order";
import { detectPincers, type Pincer, type PincerScan } from "./pincer";
import {
  SKILL_POWER_TIER_VALUES,
  type ElementType,
  type Pos,
  type Side,
  type Skill,
  type SkillEvent,
  type SkillTrigger,
  type Unit,
  type WeaponType,
} from "./types";

export interface Attack {
  /** Position in resolution order (0 = first pincer to resolve). */
  step: number;
  /** Index of the pincer in `scan.pincers` (detection order). */
  pincerIndex: number;
  attacker: string;
  target: string;
  role: "flanker" | "chain" | "counter";
  damage: number;
  targetHp: number;
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
  defeated: string[];
  fallen: Fallen[];
}

export interface Resolution {
  scan: PincerScan;
  /** Pincers in the order they resolved. Pincers whose targets were all already defeated are skipped. */
  steps: ResolutionStep[];
  /** Flat views of `steps`, in resolution order. */
  attacks: Attack[];
  defeated: string[];
}

export interface ResolveOptions extends ChainOptions {
  /** The unit the player just moved. Pincers it flanks resolve first. */
  moverId?: string;
}

const weaponAdvantage: Record<WeaponType, WeaponType | null> = {
  Sword: "Bow",
  Spear: "Sword",
  Bow: "Spear",
  Staff: null,
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

export function weaponTriangleFactor(
  attacker: Pick<Unit, "weapon">,
  target: Pick<Unit, "weapon">,
): number {
  const a = attacker.weapon ?? "Sword";
  const b = target.weapon ?? "Sword";
  if (a === b) return 1;
  if (weaponAdvantage[a] === b) return 1.5;
  if (weaponAdvantage[b] === a) return 0.75;
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

/** Phase 3 foundation: use the weapon triangle, elemental advantage, and trigger-based skills on top of the attack/defense delta. */
export interface DamageContext {
  trigger?: SkillTrigger;
  random?: () => number;
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

  return active.map((skill, index) => ({
    skillId: skill.id,
    skillName: skill.name ?? skill.id,
    trigger: skill.trigger,
    sourceUnitId: context.sourceUnitId ?? attacker.id,
    targetUnitIds: context.targetUnitIds ?? [],
    activated: true,
    multiplier: skillPowerMultiplier(skill),
    damageComponents: skill.damageComponents,
    chance: skill.frequency,
    order: typeof context.order === "number" ? context.order + index : index,
    effect: "damage",
    shape: skill.shape ?? "single",
    radius: skill.radius ?? 0,
    targetMode: skill.target ?? "enemy",
  }));
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
    ? (attacker.stats.matk ?? attacker.stats.atk)
    : attacker.stats.atk;
  const defenseStat = isMagic
    ? (target.stats.mdef ?? target.stats.def)
    : target.stats.def;
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
      ? (attacker.stats.matk ?? attacker.stats.atk)
      : attacker.stats.atk;
  const defenseStat =
    target.weapon === "Staff"
      ? (target.stats.mdef ?? target.stats.def)
      : target.stats.def;
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
 *  3. resolve them ONE AT A TIME: apply that pincer's damage (flankers first, then chain
 *     nearest-first), then remove whatever it defeated before the next pincer starts.
 * Targets already defeated by an earlier pincer are not hit again. Each unit attacks once per
 * pincer it belongs to. Mutates `board`.
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
    for (const { id, role } of rosters[index] ?? []) {
      const attacker = board.getUnit(id);
      const trigger = role === "flanker" ? "pincer" : "chain";
      for (const targetId of targets) {
        const target = board.getUnit(targetId);
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
            });
          }
        }
      }
    }

    const defeated: string[] = [];
    const fallen: Fallen[] = [];
    for (const id of targets) {
      const unit = board.getUnit(id);
      if (unit.hp > 0) continue;
      fallen.push({
        unit: { ...unit, stats: { ...unit.stats } },
        origin: board.originOf(id),
      });
      defeated.push(id);
    }
    defeated.forEach((id) => board.remove(id));
    steps.push({ step, pincerIndex: index, pincer, attacks, defeated, fallen });
  }

  return {
    scan,
    steps,
    attacks: steps.flatMap((s) => s.attacks),
    defeated: steps.flatMap((s) => s.defeated),
  };
}
