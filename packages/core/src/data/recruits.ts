
/**
 * Recruit bosses — wiki story bosses that join the party after their stage is cleared.
 */
import { ENEMIES } from './enemies';
import type { StageData } from '../stage';

export interface RecruitBoss {
  enemyId: string;
  characterId: string;
  stageId: string;
  name: string;
}

/** Known recruit-on-clear mappings (expand as wiki chapters are ingested). */
export const RECRUIT_BOSSES: RecruitBoss[] = [
  {
    enemyId: 'ba_gunar_boss',
    characterId: 'ba_gunar',
    stageId: '4-10',
    name: "Ba'gunar",
  },
];

/** If this stage's waves include a recruit boss enemy, return the recruit entry. */
export function recruitForStage(stageId: string, stage?: StageData): RecruitBoss | undefined {
  const byStage = RECRUIT_BOSSES.find((r) => r.stageId === stageId);
  if (byStage) return byStage;
  if (!stage) return undefined;
  for (const wave of stage.waves) {
    for (const p of wave) {
      const def = ENEMIES[p.unit.id.split('_').slice(0, -1).join('_')] // weak
      // match by unit name
      for (const r of RECRUIT_BOSSES) {
        if (p.unit.name === r.name || p.unit.name === ENEMIES[r.enemyId]?.name) return r;
      }
    }
  }
  return undefined;
}

export function recruitFromEnemyDefId(enemyDefId: string): RecruitBoss | undefined {
  return RECRUIT_BOSSES.find((r) => r.enemyId === enemyDefId);
}
