/**
 * Map owned roster → battle ally placements.
 * Uses active job stats at current job level (wiki-scale HP/ATK/DEF).
 */
import {
  type CharacterInstance,
  type StageData,
  type Placement,
  type UnitTemplate,
  CHARACTERS,
  charStatsAtLevel,
  type Skill,
} from "@game/core";

const ALLY_ROW = 6;

/** Build up to 6 ally placements along the bottom row. */
export function placementsFromSquad(squad: CharacterInstance[]): Placement[] {
  const chosen = squad.slice(0, 6);
  return chosen.map((inst, i) => {
    const def = CHARACTERS[inst.defId];
    const job =
      def?.jobs.find((j) => j.jobIndex === inst.activeJob) ?? def?.jobs[0];
    const level = inst.jobLevels[(inst.activeJob - 1) as 0 | 1 | 2] ?? 1;
    const stats = job
      ? charStatsAtLevel(job, level)
      : { hp: 60, atk: 14, def: 2, matk: 10, mdef: 10 };
    const skills: Skill[] = (job?.skills ?? []).flatMap((skill) => {
      if (
        skill.level > level ||
        skill.trigger === "tap" ||
        !skill.damageComponents
      ) {
        return [];
      }
      return [
        {
          id: skill.id,
          name: skill.name,
          trigger: skill.trigger,
          frequency: skill.frequency,
          power: skill.power,
          damageComponents: skill.damageComponents,
        },
      ];
    });

    const unit: UnitTemplate = {
      id: inst.uid,
      name: def?.name ?? inst.defId,
      description: def?.description,
      maxHp: Math.max(1, stats.hp),
      atk: Math.max(1, stats.atk),
      def: Math.max(0, stats.def),
      weapon: job?.weapon,
      element: job?.element,
      skills,
    };

    return {
      unit,
      row: ALLY_ROW,
      col: i, // cols 0..5
    };
  });
}

/** Clone stage data with squad allies replacing the practice defaults. */
export function stageWithSquad(
  stage: StageData,
  squad: CharacterInstance[],
): StageData {
  const allies = placementsFromSquad(squad);
  // Need ≥2 allies for RULES.minAlliesToFight — if roster is tiny, keep defaults partially
  if (allies.length < 2) {
    return stage;
  }
  return {
    ...stage,
    allies,
  };
}
