/**
 * Story stage definitions — wave layouts reference the enemy catalog.
 * Allies are still provided by the battle entry point (squad from roster).
 * Placeholder ally blocks keep stages playable standalone for tests.
 */

import type { StageData, UnitTemplate, Placement } from "../stage";
import { ENEMIES, scaleEnemy, type EnemyDef } from "./enemies";

export interface StageRef {
  /** "1-1", "1-2", ... */
  id: string;
  chapter: number;
  stage: number;
  name: string;
  stamina: number;
  difficulty: number; // 1–5 stars
  /** Enemy placements per wave (enemyDefId + board position) */
  waves: Array<Array<{ enemyId: string; row: number; col: number }>>;
  walls?: Array<{ row: number; col: number }>;
}

let _seq = 0;
function nextInstanceId(prefix: string): string {
  _seq += 1;
  return `${prefix}_${_seq}`;
}

export function enemyToTemplate(
  def: EnemyDef,
  instanceId?: string,
): UnitTemplate {
  return {
    id: instanceId ?? nextInstanceId(def.id),
    name: def.name,
    maxHp: def.maxHp,
    atk: def.atk,
    def: def.def,
    description:
      def.skillNote ?? `${def.species ?? def.family} unit, level ${def.level}.`,
    w: def.w,
    h: def.h,
  };
}

function placementsFromWave(
  wave: Array<{ enemyId: string; row: number; col: number }>,
  stageNumber: number,
): Placement[] {
  return wave.map(({ enemyId, row, col }) => {
    const base = ENEMIES[enemyId];
    if (!base) throw new Error(`Unknown enemy id: ${enemyId}`);
    const def = scaleEnemy(base, stageNumber);
    return {
      unit: enemyToTemplate(def),
      row,
      col,
    };
  });
}

/** Default practice squad so stages validate/run without the meta roster. */
function defaultAllies(): Placement[] {
  const ally = (n: number): UnitTemplate => ({
    id: String(n),
    name: `Ally ${n}`,
    maxHp: 60,
    atk: 14,
    def: 2,
  });
  return [
    { unit: ally(1), row: 6, col: 0 },
    { unit: ally(2), row: 6, col: 1 },
    { unit: ally(3), row: 6, col: 2 },
    { unit: ally(4), row: 6, col: 3 },
    { unit: ally(5), row: 6, col: 4 },
    { unit: ally(6), row: 6, col: 5 },
  ];
}

export function buildStageData(ref: StageRef): StageData {
  _seq = 0; // stable ids within a single build
  return {
    id: ref.id,
    name: ref.name,
    rows: 8,
    cols: 6,
    walls: ref.walls,
    allies: defaultAllies(),
    waves: ref.waves.map((w) => placementsFromWave(w, ref.stage)),
  };
}

// ---------------------------------------------------------------------------
// Chapter 1 — Borderlands (10 stages)
// Wave counts ramp: early 2 waves, mid 3, bosses on 5 / 10
// ---------------------------------------------------------------------------

export const STAGE_REFS: StageRef[] = [
  {
    id: "1-1",
    chapter: 1,
    stage: 1,
    name: "1.1 Borderlands",
    stamina: 1,
    difficulty: 1,
    waves: [
      [{ enemyId: "wee_orbling", row: 1, col: 2 }],
      [{ enemyId: "wee_orbling", row: 1, col: 3 }],
      [{ enemyId: "wee_orbling", row: 2, col: 2 }],
    ],
  },
  {
    id: "1-2",
    chapter: 1,
    stage: 2,
    name: "1.2 Borderlands",
    stamina: 1,
    difficulty: 2,
    waves: [
      [{ enemyId: "wee_orbling", row: 1, col: 2 }],
      [
        { enemyId: "wee_orbling", row: 1, col: 1 },
        { enemyId: "wee_orbling", row: 1, col: 4 },
      ],
      [
        { enemyId: "wee_orbling", row: 1, col: 2 },
        // Recruit battle on wiki; treat extra slot as another Wee Orbling for now
        { enemyId: "wee_orbling", row: 2, col: 3 },
      ],
    ],
  },
  {
    id: "1-3",
    chapter: 1,
    stage: 3,
    name: "1.3 Borderlands",
    stamina: 1,
    difficulty: 3,
    waves: [
      [{ enemyId: "wee_orbling", row: 1, col: 2 }],
      [{ enemyId: "wee_orbling", row: 1, col: 3 }],
      [
        { enemyId: "wee_orbling", row: 1, col: 1 },
        { enemyId: "wee_orbling", row: 1, col: 4 },
      ],
    ],
  },
  {
    id: "1-4",
    chapter: 1,
    stage: 4,
    name: "1.4 Borderlands",
    stamina: 1,
    difficulty: 4,
    waves: [
      [
        { enemyId: "wee_orbling", row: 1, col: 1 },
        { enemyId: "wee_orbling", row: 1, col: 4 },
      ],
      [{ enemyId: "wee_orbling", row: 1, col: 2 }],
      [
        { enemyId: "wee_orbling", row: 1, col: 1 },
        { enemyId: "wee_orbling", row: 1, col: 4 },
      ],
    ],
  },
  {
    id: "1-5",
    chapter: 1,
    stage: 5,
    name: "1.5 Borderlands",
    stamina: 1,
    difficulty: 4,
    waves: [
      [
        { enemyId: "wee_orbling", row: 1, col: 1 },
        { enemyId: "wee_orbling", row: 1, col: 4 },
      ],
      [
        { enemyId: "wee_orbling", row: 1, col: 1 },
        { enemyId: "wee_orbling", row: 1, col: 4 },
      ],
      [
        { enemyId: "wee_orbling", row: 1, col: 0 },
        { enemyId: "wee_orbling", row: 1, col: 5 },
        // Boss Orbling LV 3 (1x1 on wiki boss tag for 1.5; larger form appears in Ch2)
        { enemyId: "orbling_lv3", row: 0, col: 2 },
      ],
    ],
  },
  // Fill 1-6..1-10 as continued Borderlands-style (wiki page continues; using Orbling ramp)
  {
    id: "2-1",
    chapter: 2,
    stage: 1,
    name: "2.1 To the Capital",
    stamina: 2,
    difficulty: 2,
    waves: [
      // Battle 1: Orbling LV3 x2
      [
        { enemyId: "orbling_lv3_ch2", row: 1, col: 1 },
        { enemyId: "orbling_lv3_ch2", row: 1, col: 4 },
      ],
      // Battle 2: Orbling LV3 x3
      [
        { enemyId: "orbling_lv3_ch2", row: 1, col: 0 },
        { enemyId: "orbling_lv3_ch2", row: 1, col: 2 },
        { enemyId: "orbling_lv3_ch2", row: 1, col: 4 },
      ],
      // Battle 3: Orbling LV3 x3
      [
        { enemyId: "orbling_lv3_ch2", row: 0, col: 1 },
        { enemyId: "orbling_lv3_ch2", row: 0, col: 3 },
        { enemyId: "orbling_lv3_ch2", row: 1, col: 2 },
      ],
      // Battle 4: Orbling LV3 x1, Gorf LV3 x1
      [
        { enemyId: "orbling_lv3_ch2", row: 1, col: 1 },
        { enemyId: "gorf_lv3", row: 1, col: 4 },
      ],
      // Battle 5: Orbling LV8 x2, Gorf LV4 x2
      [
        { enemyId: "orbling_lv8", row: 0, col: 1 },
        { enemyId: "orbling_lv8", row: 0, col: 4 },
        { enemyId: "gorf_lv4", row: 1, col: 0 },
        { enemyId: "gorf_lv4", row: 1, col: 5 },
      ],
    ],
  },
  {
    id: "2-2",
    chapter: 2,
    stage: 2,
    name: "2.2 To the Capital",
    stamina: 2,
    difficulty: 2,
    waves: [
      // Battle 1: Gorf LV4 x3
      [
        { enemyId: "gorf_lv4", row: 1, col: 1 },
        { enemyId: "gorf_lv4", row: 1, col: 3 },
        { enemyId: "gorf_lv4", row: 1, col: 5 },
      ],
      // Battle 2: Orbling LV3 x1, Orbling LV8 x1, Gorf LV4 x1
      [
        { enemyId: "orbling_lv3_ch2", row: 1, col: 1 },
        { enemyId: "orbling_lv8", row: 1, col: 3 },
        { enemyId: "gorf_lv4", row: 1, col: 5 },
      ],
      // Battle 3: Orbling LV3 x4
      [
        { enemyId: "orbling_lv3_ch2", row: 0, col: 1 },
        { enemyId: "orbling_lv3_ch2", row: 0, col: 4 },
        { enemyId: "orbling_lv3_ch2", row: 1, col: 0 },
        { enemyId: "orbling_lv3_ch2", row: 1, col: 5 },
      ],
      // Battle 4: Gorf LV4 x4
      [
        { enemyId: "gorf_lv4", row: 0, col: 0 },
        { enemyId: "gorf_lv4", row: 0, col: 2 },
        { enemyId: "gorf_lv4", row: 0, col: 4 },
        { enemyId: "gorf_lv4", row: 1, col: 3 },
      ],
      // Battle 5: Orbling LV12 x1 (boss 2x2), Gorf LV6 x2
      [
        { enemyId: "orbling_lv12_boss", row: 0, col: 2 },
        { enemyId: "gorf_lv6", row: 2, col: 0 },
        { enemyId: "gorf_lv6", row: 2, col: 5 },
      ],
    ],
  },
  {
    id: "2-3",
    chapter: 2,
    stage: 3,
    name: "2.3 To the Capital",
    stamina: 3,
    difficulty: 3,
    waves: [
      [
        { enemyId: "orbling_lv8", row: 1, col: 1 },
        { enemyId: "orbling_lv8", row: 1, col: 4 },
        { enemyId: "gorf_lv4", row: 2, col: 2 },
      ],
      [
        { enemyId: "gorf_lv6", row: 0, col: 2 },
        { enemyId: "orbling_lv8", row: 1, col: 0 },
        { enemyId: "orbling_lv8", row: 1, col: 5 },
      ],
      [
        { enemyId: "dracorin_lv5", row: 0, col: 1 },
        { enemyId: "dracorin_lv5", row: 0, col: 4 },
        { enemyId: "gorf_lv6", row: 1, col: 2 },
      ],
    ],
  },
  {
    id: "2-4",
    chapter: 2,
    stage: 4,
    name: "2.4 To the Capital",
    stamina: 3,
    difficulty: 3,
    waves: [
      [
        { enemyId: "orbling_lv8", row: 1, col: 0 },
        { enemyId: "orbling_lv8", row: 1, col: 2 },
        { enemyId: "orbling_lv8", row: 1, col: 4 },
      ],
      [
        { enemyId: "gorf_lv6", row: 0, col: 1 },
        { enemyId: "gorf_lv6", row: 0, col: 4 },
        { enemyId: "dracorin_lv5", row: 1, col: 2 },
      ],
      [
        { enemyId: "orbling_lv8", row: 0, col: 0 },
        { enemyId: "orbling_lv8", row: 0, col: 5 },
        { enemyId: "gorf_lv6", row: 1, col: 2 },
        { enemyId: "dracorin_lv5", row: 2, col: 1 },
        { enemyId: "dracorin_lv5", row: 2, col: 4 },
      ],
    ],
  },
  {
    id: "2-5",
    chapter: 2,
    stage: 5,
    name: "2.5 To the Capital",
    stamina: 3,
    difficulty: 4,
    waves: [
      [
        { enemyId: "orbling_lv8", row: 1, col: 1 },
        { enemyId: "gorf_lv6", row: 1, col: 3 },
        { enemyId: "dracorin_lv5", row: 1, col: 5 },
      ],
      [
        { enemyId: "gorf_lv6", row: 0, col: 0 },
        { enemyId: "gorf_lv6", row: 0, col: 5 },
        { enemyId: "orbling_lv8", row: 1, col: 2 },
        { enemyId: "dracorin_lv5", row: 2, col: 1 },
        { enemyId: "dracorin_lv5", row: 2, col: 4 },
      ],
      [
        { enemyId: "spinetrich_lv9", row: 0, col: 2 },
        { enemyId: "gorf_lv6", row: 2, col: 0 },
        { enemyId: "orbling_lv8", row: 2, col: 5 },
      ],
    ],
  },
  {
    id: "3-1",
    chapter: 3,
    stage: 1,
    name: "3.1 Melting Pot",
    stamina: 1,
    difficulty: 4,
    waves: [
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "lizardfolk_knight", row: 0, col: 2 },
        { enemyId: "lizardfolk_knight", row: 0, col: 3 },
      ],
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 2 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 3 },
        { enemyId: "lizardfolk_knight", row: 0, col: 4 },
        { enemyId: "lizardfolk_knight", row: 0, col: 5 },
      ],
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 2 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 3 },
        { enemyId: "lizardfolk_knight", row: 0, col: 4 },
        { enemyId: "lizardfolk_knight", row: 0, col: 5 },
      ],
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "lizardfolk_knight", row: 0, col: 2 },
        { enemyId: "lizardfolk_knight", row: 0, col: 3 },
      ],
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 2 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 3 },
        { enemyId: "lizardfolk_knight", row: 0, col: 4 },
        { enemyId: "lizardfolk_knight", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "3-2",
    chapter: 3,
    stage: 2,
    name: "3.2 Melting Pot",
    stamina: 1,
    difficulty: 4,
    waves: [
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 2 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 3 },
      ],
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 2 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 3 },
        { enemyId: "lizardfolk_knight", row: 0, col: 4 },
        { enemyId: "lizardfolk_knight", row: 0, col: 5 },
      ],
      [
        { enemyId: "lizardfolk_knight", row: 0, col: 0 },
        { enemyId: "lizardfolk_knight", row: 0, col: 1 },
        { enemyId: "lizardfolk_knight", row: 0, col: 2 },
        { enemyId: "lizardfolk_knight", row: 0, col: 3 },
        { enemyId: "lizardfolk_healer", row: 0, col: 4 },
        { enemyId: "lizardfolk_healer", row: 0, col: 5 },
      ],
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "lizardfolk_knight", row: 0, col: 2 },
        { enemyId: "lizardfolk_knight", row: 0, col: 3 },
        { enemyId: "lizardfolk_archer", row: 0, col: 4 },
        { enemyId: "lizardfolk_archer", row: 0, col: 5 },
      ],
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "lizardfolk_knight", row: 0, col: 2 },
        { enemyId: "lizardfolk_knight", row: 0, col: 3 },
        { enemyId: "lizardfolk_healer", row: 0, col: 4 },
        { enemyId: "lizardfolk_healer", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "3-3",
    chapter: 3,
    stage: 3,
    name: "3.3 Melting Pot",
    stamina: 1,
    difficulty: 4,
    waves: [
      [
        { enemyId: "beastfolk_knight", row: 0, col: 0 },
        { enemyId: "beastfolk_knight", row: 0, col: 1 },
        { enemyId: "beastfolk_mage", row: 0, col: 2 },
        { enemyId: "beastfolk_mage", row: 0, col: 3 },
      ],
      [
        { enemyId: "beastfolk_knight", row: 0, col: 0 },
        { enemyId: "beastfolk_knight", row: 0, col: 1 },
        { enemyId: "beastfolk_knight", row: 0, col: 2 },
        { enemyId: "beastfolk_knight", row: 0, col: 3 },
        { enemyId: "beastfolk_mage", row: 0, col: 4 },
        { enemyId: "beastfolk_mage", row: 0, col: 5 },
      ],
      [
        { enemyId: "beastfolk_mage", row: 0, col: 0 },
        { enemyId: "beastfolk_mage", row: 0, col: 1 },
        { enemyId: "beastfolk_mage", row: 0, col: 2 },
        { enemyId: "beastfolk_mage", row: 0, col: 3 },
      ],
      [
        { enemyId: "beastfolk_warrior", row: 0, col: 0 },
        { enemyId: "beastfolk_warrior", row: 0, col: 1 },
        { enemyId: "beastfolk_warrior", row: 0, col: 2 },
        { enemyId: "beastfolk_warrior", row: 0, col: 3 },
        { enemyId: "beastfolk_warrior", row: 0, col: 4 },
        { enemyId: "beastfolk_warrior", row: 0, col: 5 },
      ],
      [
        { enemyId: "beastfolk_warrior", row: 0, col: 0 },
        { enemyId: "beastfolk_warrior", row: 0, col: 1 },
        { enemyId: "beastfolk_mage", row: 0, col: 2 },
        { enemyId: "beastfolk_mage", row: 0, col: 3 },
        { enemyId: "beastfolk_mage", row: 0, col: 4 },
        { enemyId: "beastfolk_mage", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "3-4",
    chapter: 3,
    stage: 4,
    name: "3.4 Melting Pot",
    stamina: 1,
    difficulty: 4,
    waves: [
      [
        { enemyId: "beastfolk_healer", row: 0, col: 0 },
        { enemyId: "beastfolk_healer", row: 0, col: 1 },
        { enemyId: "beastfolk_warrior", row: 0, col: 2 },
        { enemyId: "beastfolk_warrior", row: 0, col: 3 },
        { enemyId: "beastfolk_warrior", row: 0, col: 4 },
        { enemyId: "beastfolk_warrior", row: 0, col: 5 },
      ],
      [
        { enemyId: "beastfolk_healer", row: 0, col: 0 },
        { enemyId: "beastfolk_healer", row: 0, col: 1 },
        { enemyId: "beastfolk_archer", row: 0, col: 2 },
        { enemyId: "beastfolk_archer", row: 0, col: 3 },
      ],
      [
        { enemyId: "beastfolk_knight", row: 0, col: 0 },
        { enemyId: "beastfolk_knight", row: 0, col: 1 },
        { enemyId: "beastfolk_knight", row: 0, col: 2 },
        { enemyId: "beastfolk_knight", row: 0, col: 3 },
        { enemyId: "beastfolk_knight", row: 0, col: 4 },
        { enemyId: "beastfolk_knight", row: 0, col: 5 },
      ],
      [
        { enemyId: "beastfolk_archer", row: 0, col: 0 },
        { enemyId: "beastfolk_archer", row: 0, col: 1 },
        { enemyId: "beastfolk_healer", row: 0, col: 2 },
        { enemyId: "beastfolk_healer", row: 0, col: 3 },
        { enemyId: "beastfolk_warrior", row: 0, col: 4 },
        { enemyId: "beastfolk_warrior", row: 0, col: 5 },
      ],
      [
        { enemyId: "beastfolk_knight", row: 0, col: 0 },
        { enemyId: "beastfolk_knight", row: 0, col: 1 },
        { enemyId: "beastfolk_healer", row: 0, col: 2 },
        { enemyId: "beastfolk_healer", row: 0, col: 3 },
        { enemyId: "beastfolk_warrior", row: 0, col: 4 },
        { enemyId: "beastfolk_warrior", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "3-5",
    chapter: 3,
    stage: 5,
    name: "3.5 Melting Pot",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "lizardfolk_warrior", row: 0, col: 0 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 1 },
        { enemyId: "beastfolk_warrior", row: 0, col: 2 },
        { enemyId: "beastfolk_warrior", row: 0, col: 3 },
      ],
      [
        { enemyId: "lizardfolk_knight", row: 0, col: 0 },
        { enemyId: "lizardfolk_knight", row: 0, col: 1 },
        { enemyId: "beastfolk_knight", row: 0, col: 2 },
        { enemyId: "beastfolk_knight", row: 0, col: 3 },
      ],
      [
        { enemyId: "lizardfolk_healer", row: 0, col: 0 },
        { enemyId: "lizardfolk_healer", row: 0, col: 1 },
        { enemyId: "beastfolk_mage", row: 0, col: 2 },
        { enemyId: "beastfolk_mage", row: 0, col: 3 },
      ],
      [
        { enemyId: "beastfolk_archer", row: 0, col: 0 },
        { enemyId: "beastfolk_archer", row: 0, col: 1 },
        { enemyId: "lizardfolk_archer", row: 0, col: 2 },
        { enemyId: "lizardfolk_archer", row: 0, col: 3 },
      ],
      [
        { enemyId: "lizardfolk_knight", row: 0, col: 0 },
        { enemyId: "lizardfolk_knight", row: 0, col: 1 },
        { enemyId: "beastfolk_knight", row: 0, col: 2 },
        { enemyId: "beastfolk_knight", row: 0, col: 3 },
        { enemyId: "beastfolk_healer", row: 0, col: 4 },
        { enemyId: "beastfolk_healer", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "4-1",
    chapter: 4,
    stage: 1,
    name: "4.1 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "white_sabertooth", row: 0, col: 0 },
        { enemyId: "white_sabertooth", row: 0, col: 1 },
      ],
      [
        { enemyId: "white_sabertooth", row: 0, col: 0 },
        { enemyId: "devil_bat", row: 0, col: 1 },
        { enemyId: "devil_bat", row: 0, col: 2 },
      ],
      [
        { enemyId: "white_sabertooth", row: 0, col: 0 },
        { enemyId: "white_sabertooth", row: 0, col: 1 },
        { enemyId: "white_sabertooth", row: 0, col: 2 },
        { enemyId: "devil_bat", row: 0, col: 3 },
        { enemyId: "devil_bat", row: 0, col: 4 },
      ],
    ],
  },
  {
    id: "4-2",
    chapter: 4,
    stage: 2,
    name: "4.2 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "spinetrich_lv5", row: 0, col: 0 },
        { enemyId: "spinetrich_lv5", row: 0, col: 1 },
      ],
      [
        { enemyId: "spinetrich_lv5", row: 0, col: 0 },
        { enemyId: "spinetrich_lv5", row: 0, col: 1 },
        { enemyId: "devil_bat", row: 0, col: 2 },
        { enemyId: "devil_bat", row: 0, col: 3 },
      ],
      [
        { enemyId: "spinetrich_lv5", row: 0, col: 0 },
        { enemyId: "spinetrich_lv5", row: 0, col: 1 },
        { enemyId: "devil_bat", row: 0, col: 2 },
        { enemyId: "white_sabertooth", row: 0, col: 3 },
        { enemyId: "white_sabertooth", row: 0, col: 4 },
      ],
      [
        { enemyId: "white_sabertooth_lv10", row: 0, col: 0 },
        { enemyId: "white_sabertooth_lv10", row: 0, col: 1 },
      ],
      [
        { enemyId: "spinetrich_lv5", row: 0, col: 0 },
        { enemyId: "spinetrich_lv5", row: 0, col: 1 },
        { enemyId: "devil_bat", row: 0, col: 2 },
        { enemyId: "devil_bat", row: 0, col: 3 },
        { enemyId: "white_sabertooth", row: 0, col: 4 },
        { enemyId: "white_sabertooth", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "4-3",
    chapter: 4,
    stage: 3,
    name: "4.3 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "spinetrich_lv5", row: 0, col: 0 },
        { enemyId: "spinetrich_lv5", row: 0, col: 1 },
        { enemyId: "white_sabertooth", row: 0, col: 2 },
        { enemyId: "white_sabertooth", row: 0, col: 3 },
        { enemyId: "devil_bat", row: 0, col: 4 },
        { enemyId: "devil_bat", row: 0, col: 5 },
      ],
      [
        { enemyId: "spinetrich_lv5", row: 0, col: 0 },
        { enemyId: "spinetrich_lv5", row: 0, col: 1 },
        { enemyId: "white_sabertooth", row: 0, col: 2 },
        { enemyId: "white_sabertooth", row: 0, col: 3 },
      ],
      [
        { enemyId: "spinetrich_lv5", row: 0, col: 0 },
        { enemyId: "spinetrich_lv5", row: 0, col: 1 },
        { enemyId: "white_sabertooth", row: 0, col: 2 },
        { enemyId: "white_sabertooth", row: 0, col: 3 },
        { enemyId: "white_sabertooth", row: 0, col: 4 },
        { enemyId: "white_sabertooth", row: 0, col: 5 },
      ],
      [
        { enemyId: "devil_bat", row: 0, col: 0 },
        { enemyId: "devil_bat", row: 0, col: 1 },
        { enemyId: "devil_bat", row: 0, col: 2 },
      ],
      [{ enemyId: "sabertooth_king", row: 0, col: 2 }],
    ],
  },
  {
    id: "4-4",
    chapter: 4,
    stage: 4,
    name: "4.4 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [{ enemyId: "triscorp", row: 0, col: 0 }],
      [
        { enemyId: "triscorp", row: 0, col: 0 },
        { enemyId: "gorf_lv6", row: 0, col: 1 },
        { enemyId: "gorf_lv6", row: 0, col: 2 },
      ],
      [
        { enemyId: "triscorp", row: 0, col: 0 },
        { enemyId: "gorf_lv6", row: 0, col: 1 },
        { enemyId: "gorf_lv6", row: 0, col: 2 },
        { enemyId: "spinetrich_lv5", row: 0, col: 3 },
        { enemyId: "spinetrich_lv5", row: 0, col: 4 },
      ],
      [
        { enemyId: "gorf_lv6", row: 0, col: 0 },
        { enemyId: "gorf_lv6", row: 0, col: 1 },
        { enemyId: "gorf_lv6", row: 0, col: 2 },
        { enemyId: "gorf_lv6", row: 0, col: 3 },
        { enemyId: "gorf_lv6", row: 0, col: 4 },
      ],
      [
        { enemyId: "triscorp", row: 0, col: 0 },
        { enemyId: "triscorp", row: 0, col: 1 },
        { enemyId: "spinetrich_lv5", row: 0, col: 2 },
        { enemyId: "spinetrich_lv5", row: 0, col: 3 },
      ],
    ],
  },
  {
    id: "4-5",
    chapter: 4,
    stage: 5,
    name: "4.5 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mudtoad", row: 0, col: 0 },
        { enemyId: "mudtoad", row: 0, col: 1 },
        { enemyId: "mudtoad", row: 0, col: 2 },
      ],
      [
        { enemyId: "mudtoad", row: 0, col: 0 },
        { enemyId: "mudtoad", row: 0, col: 1 },
        { enemyId: "triscorp", row: 0, col: 2 },
        { enemyId: "triscorp", row: 0, col: 3 },
      ],
      [
        { enemyId: "mudtoad", row: 0, col: 0 },
        { enemyId: "mudtoad", row: 0, col: 1 },
        { enemyId: "triscorp", row: 0, col: 2 },
        { enemyId: "gorf_lv6", row: 0, col: 3 },
        { enemyId: "gorf_lv6", row: 0, col: 4 },
      ],
      [
        { enemyId: "mudtoad", row: 0, col: 0 },
        { enemyId: "mudtoad", row: 0, col: 1 },
        { enemyId: "mudtoad", row: 0, col: 2 },
        { enemyId: "mudtoad", row: 0, col: 3 },
        { enemyId: "mudtoad", row: 0, col: 4 },
        { enemyId: "mudtoad", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "4-6",
    chapter: 4,
    stage: 6,
    name: "4.6 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mudtoad", row: 0, col: 0 },
        { enemyId: "mudtoad", row: 0, col: 1 },
        { enemyId: "mudtoad", row: 0, col: 2 },
        { enemyId: "triscorp", row: 0, col: 3 },
      ],
      [
        { enemyId: "mudtoad", row: 0, col: 0 },
        { enemyId: "mudtoad", row: 0, col: 1 },
        { enemyId: "gorf_lv6", row: 0, col: 2 },
        { enemyId: "gorf_lv6", row: 0, col: 3 },
        { enemyId: "gorf_lv6", row: 0, col: 4 },
        { enemyId: "gorf_lv6", row: 0, col: 5 },
      ],
      [
        { enemyId: "triscorp", row: 0, col: 0 },
        { enemyId: "triscorp", row: 0, col: 1 },
      ],
      [
        { enemyId: "mudtoad", row: 0, col: 0 },
        { enemyId: "mudtoad", row: 0, col: 1 },
        { enemyId: "triscorp", row: 0, col: 2 },
        { enemyId: "gorf_lv6", row: 0, col: 3 },
        { enemyId: "gorf_lv6", row: 0, col: 4 },
      ],
      [
        { enemyId: "mudtoad", row: 0, col: 0 },
        { enemyId: "mudtoad", row: 0, col: 1 },
        { enemyId: "triscorp", row: 0, col: 2 },
        { enemyId: "triscorp", row: 0, col: 3 },
        { enemyId: "gorf_lv6", row: 0, col: 4 },
      ],
    ],
  },
  {
    id: "4-7",
    chapter: 4,
    stage: 7,
    name: "4.7 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "horned_slug", row: 0, col: 0 },
        { enemyId: "horned_slug", row: 0, col: 1 },
        { enemyId: "triscorp", row: 0, col: 2 },
        { enemyId: "triscorp", row: 0, col: 3 },
      ],
      [
        { enemyId: "triscorp", row: 0, col: 0 },
        { enemyId: "triscorp", row: 0, col: 1 },
        { enemyId: "triscorp", row: 0, col: 2 },
        { enemyId: "triscorp", row: 0, col: 3 },
      ],
      [
        { enemyId: "horned_slug", row: 0, col: 0 },
        { enemyId: "horned_slug", row: 0, col: 1 },
        { enemyId: "horned_slug", row: 0, col: 2 },
        { enemyId: "horned_slug", row: 0, col: 3 },
        { enemyId: "triscorp", row: 0, col: 4 },
        { enemyId: "triscorp", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "4-8",
    chapter: 4,
    stage: 8,
    name: "4.8 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "horned_slug", row: 0, col: 0 },
        { enemyId: "horned_slug", row: 0, col: 1 },
        { enemyId: "triscorp", row: 0, col: 2 },
        { enemyId: "triscorp", row: 0, col: 3 },
      ],
      [
        { enemyId: "horned_slug", row: 0, col: 0 },
        { enemyId: "horned_slug", row: 0, col: 1 },
        { enemyId: "triscorp", row: 0, col: 2 },
        { enemyId: "triscorp", row: 0, col: 3 },
        { enemyId: "triscorp", row: 0, col: 4 },
        { enemyId: "triscorp", row: 0, col: 5 },
      ],
      [
        { enemyId: "horned_slug", row: 0, col: 0 },
        { enemyId: "horned_slug", row: 0, col: 1 },
        { enemyId: "horned_slug", row: 0, col: 2 },
        { enemyId: "horned_slug", row: 0, col: 3 },
        { enemyId: "triscorp", row: 0, col: 4 },
        { enemyId: "triscorp", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "4-9",
    chapter: 4,
    stage: 9,
    name: "4.9 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "lizardfolk_knight", row: 0, col: 0 },
        { enemyId: "lizardfolk_knight", row: 0, col: 1 },
        { enemyId: "lizardfolk_knight", row: 0, col: 2 },
        { enemyId: "horned_slug", row: 0, col: 3 },
      ],
      [
        { enemyId: "lizardfolk_knight", row: 0, col: 0 },
        { enemyId: "lizardfolk_knight", row: 0, col: 1 },
        { enemyId: "lizardfolk_knight", row: 0, col: 2 },
        { enemyId: "lizardfolk_knight", row: 0, col: 3 },
        { enemyId: "lizardfolk_knight", row: 0, col: 4 },
        { enemyId: "lizardfolk_knight", row: 0, col: 5 },
      ],
      [
        { enemyId: "lizardfolk_knight", row: 0, col: 0 },
        { enemyId: "lizardfolk_knight", row: 0, col: 1 },
        { enemyId: "lizardfolk_knight", row: 0, col: 2 },
        { enemyId: "horned_slug", row: 0, col: 3 },
      ],
      [
        { enemyId: "lizardfolk_knight", row: 0, col: 0 },
        { enemyId: "lizardfolk_knight", row: 0, col: 1 },
        { enemyId: "lizardfolk_knight", row: 0, col: 2 },
        { enemyId: "lizardfolk_knight", row: 0, col: 3 },
        { enemyId: "lizardfolk_archer", row: 0, col: 4 },
        { enemyId: "lizardfolk_archer", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "4-10",
    chapter: 4,
    stage: 10,
    name: "4.10 Into the Tower",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "lizardfolk_knight", row: 0, col: 0 },
        { enemyId: "lizardfolk_knight", row: 0, col: 1 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 2 },
        { enemyId: "lizardfolk_warrior", row: 0, col: 3 },
      ],
      [
        { enemyId: "lizardfolk_archer", row: 0, col: 0 },
        { enemyId: "lizardfolk_archer", row: 0, col: 1 },
        { enemyId: "horned_slug", row: 0, col: 2 },
        { enemyId: "horned_slug", row: 0, col: 3 },
      ],
      [{ enemyId: "ba_gunar_boss", row: 0, col: 2 }],
    ],
  },
  {
    id: "5-1",
    chapter: 5,
    stage: 1,
    name: "5.1 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "antenna_orbling", row: 0, col: 2 },
      ],
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "devil_bat_lv13", row: 0, col: 2 },
        { enemyId: "devil_bat_lv13", row: 0, col: 3 },
      ],
      [
        { enemyId: "devil_bat_lv13", row: 0, col: 0 },
        { enemyId: "devil_bat_lv13", row: 0, col: 1 },
        { enemyId: "devil_bat_lv13", row: 0, col: 2 },
        { enemyId: "devil_bat_lv13", row: 0, col: 3 },
        { enemyId: "devil_bat_lv13", row: 0, col: 4 },
        { enemyId: "devil_bat_lv13", row: 0, col: 5 },
      ],
      [
        { enemyId: "devil_bat_lv13", row: 0, col: 0 },
        { enemyId: "devil_bat_lv13", row: 0, col: 1 },
        { enemyId: "whitewyrm", row: 0, col: 2 },
        { enemyId: "whitewyrm", row: 0, col: 3 },
      ],
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "antenna_orbling", row: 0, col: 2 },
        { enemyId: "antenna_orbling", row: 0, col: 3 },
        { enemyId: "whitewyrm", row: 0, col: 4 },
      ],
    ],
  },
  {
    id: "5-2",
    chapter: 5,
    stage: 2,
    name: "5.2 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "devil_bat_lv13", row: 0, col: 0 },
        { enemyId: "devil_bat_lv13", row: 0, col: 1 },
        { enemyId: "whitewyrm", row: 0, col: 2 },
        { enemyId: "whitewyrm", row: 0, col: 3 },
      ],
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "antenna_orbling", row: 0, col: 2 },
        { enemyId: "antenna_orbling", row: 0, col: 3 },
      ],
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "antenna_orbling", row: 0, col: 2 },
        { enemyId: "antenna_orbling", row: 0, col: 3 },
      ],
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "devil_bat_lv13", row: 0, col: 2 },
        { enemyId: "devil_bat_lv13", row: 0, col: 3 },
        { enemyId: "whitewyrm", row: 0, col: 4 },
        { enemyId: "whitewyrm", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "5-3",
    chapter: 5,
    stage: 3,
    name: "5.3 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [{ enemyId: "wyvern_lv12", row: 0, col: 0 }],
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "wyvern_lv12", row: 0, col: 2 },
        { enemyId: "wyvern_lv12", row: 0, col: 3 },
      ],
      [
        { enemyId: "wyvern_lv12", row: 0, col: 0 },
        { enemyId: "wyvern_lv12", row: 0, col: 1 },
        { enemyId: "wyvern_lv12", row: 0, col: 2 },
      ],
      [
        { enemyId: "wyvern_lv12", row: 0, col: 0 },
        { enemyId: "wyvern_lv12", row: 0, col: 1 },
        { enemyId: "wyvern_lv12", row: 0, col: 2 },
        { enemyId: "wyvern_lv12", row: 0, col: 3 },
        { enemyId: "antenna_orbling", row: 0, col: 4 },
        { enemyId: "antenna_orbling", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "5-4",
    chapter: 5,
    stage: 4,
    name: "5.4 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "blastosaur", row: 0, col: 0 },
        { enemyId: "blastosaur", row: 0, col: 1 },
      ],
      [
        { enemyId: "blastosaur", row: 0, col: 0 },
        { enemyId: "blastosaur", row: 0, col: 1 },
        { enemyId: "blastosaur", row: 0, col: 2 },
        { enemyId: "blastosaur", row: 0, col: 3 },
      ],
      [{ enemyId: "slugosaur", row: 0, col: 2 }],
    ],
  },
  {
    id: "5-5",
    chapter: 5,
    stage: 5,
    name: "5.5 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "aeropede", row: 0, col: 4 },
        { enemyId: "aeropede", row: 0, col: 5 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "antenna_orbling", row: 0, col: 2 },
        { enemyId: "antenna_orbling", row: 0, col: 3 },
      ],
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "blastosaur", row: 0, col: 2 },
        { enemyId: "blastosaur", row: 0, col: 3 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "aeropede", row: 0, col: 4 },
        { enemyId: "aeropede", row: 0, col: 5 },
      ],
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "antenna_orbling", row: 0, col: 2 },
        { enemyId: "antenna_orbling", row: 0, col: 3 },
        { enemyId: "blastosaur", row: 0, col: 4 },
        { enemyId: "blastosaur", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "5-6",
    chapter: 5,
    stage: 6,
    name: "5.6 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "wyvern_lv12", row: 0, col: 0 },
        { enemyId: "wyvern_lv12", row: 0, col: 1 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
      ],
      [
        { enemyId: "antenna_orbling", row: 0, col: 0 },
        { enemyId: "antenna_orbling", row: 0, col: 1 },
        { enemyId: "blastosaur", row: 0, col: 2 },
        { enemyId: "blastosaur", row: 0, col: 3 },
      ],
      [
        { enemyId: "devil_bat_lv13", row: 0, col: 0 },
        { enemyId: "devil_bat_lv13", row: 0, col: 1 },
        { enemyId: "whitewyrm", row: 0, col: 2 },
        { enemyId: "whitewyrm", row: 0, col: 3 },
      ],
      [
        { enemyId: "wyvern_lv12", row: 0, col: 0 },
        { enemyId: "wyvern_lv12", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "antenna_orbling", row: 0, col: 4 },
        { enemyId: "antenna_orbling", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "5-7",
    chapter: 5,
    stage: 7,
    name: "5.7 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "fungibird", row: 0, col: 4 },
      ],
      [
        { enemyId: "fungibird", row: 0, col: 0 },
        { enemyId: "fungibird", row: 0, col: 1 },
        { enemyId: "fungibird", row: 0, col: 2 },
        { enemyId: "whitewyrm", row: 0, col: 3 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "aeropede", row: 0, col: 4 },
        { enemyId: "aeropede", row: 0, col: 5 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "fungibird", row: 0, col: 4 },
        { enemyId: "fungibird", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "5-8",
    chapter: 5,
    stage: 8,
    name: "5.8 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "fungibird", row: 0, col: 4 },
        { enemyId: "fungibird", row: 0, col: 5 },
      ],
      [
        { enemyId: "fungibird", row: 0, col: 0 },
        { enemyId: "fungibird", row: 0, col: 1 },
        { enemyId: "fungibird", row: 0, col: 2 },
        { enemyId: "fungibird", row: 0, col: 3 },
        { enemyId: "fungibird", row: 0, col: 4 },
        { enemyId: "fungibird", row: 0, col: 5 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "fungibird", row: 0, col: 4 },
        { enemyId: "fungibird", row: 0, col: 5 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "whitewyrm", row: 0, col: 4 },
        { enemyId: "whitewyrm", row: 0, col: 5 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "antenna_orbling", row: 0, col: 4 },
        { enemyId: "antenna_orbling", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "5-9",
    chapter: 5,
    stage: 9,
    name: "5.9 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "whitewyrm", row: 0, col: 0 },
        { enemyId: "whitewyrm", row: 0, col: 1 },
        { enemyId: "whitewyrm", row: 0, col: 2 },
        { enemyId: "whitewyrm", row: 0, col: 3 },
        { enemyId: "wyvern_lv12", row: 0, col: 4 },
        { enemyId: "wyvern_lv12", row: 0, col: 5 },
      ],
      [
        { enemyId: "fungibird", row: 0, col: 0 },
        { enemyId: "fungibird", row: 0, col: 1 },
        { enemyId: "fungibird", row: 0, col: 2 },
        { enemyId: "fungibird", row: 0, col: 3 },
        { enemyId: "wyvern_lv12", row: 0, col: 4 },
        { enemyId: "wyvern_lv12", row: 0, col: 5 },
      ],
      [
        { enemyId: "fungibird", row: 0, col: 0 },
        { enemyId: "fungibird", row: 0, col: 1 },
        { enemyId: "fungibird", row: 0, col: 2 },
        { enemyId: "fungibird", row: 0, col: 3 },
        { enemyId: "fungibird", row: 0, col: 4 },
        { enemyId: "fungibird", row: 0, col: 5 },
      ],
      [
        { enemyId: "fungibird", row: 0, col: 0 },
        { enemyId: "fungibird", row: 0, col: 1 },
        { enemyId: "whitewyrm", row: 0, col: 2 },
        { enemyId: "whitewyrm", row: 0, col: 3 },
        { enemyId: "wyvern_lv12", row: 0, col: 4 },
        { enemyId: "wyvern_lv12", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "5-10",
    chapter: 5,
    stage: 10,
    name: "5.10 Descent",
    stamina: 1,
    difficulty: 5,
    waves: [
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "aeropede", row: 0, col: 4 },
        { enemyId: "aeropede", row: 0, col: 5 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "antenna_orbling", row: 0, col: 2 },
        { enemyId: "antenna_orbling", row: 0, col: 3 },
        { enemyId: "whitewyrm", row: 0, col: 4 },
        { enemyId: "whitewyrm", row: 0, col: 5 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "aeropede", row: 0, col: 4 },
        { enemyId: "aeropede", row: 0, col: 5 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "fungibird", row: 0, col: 4 },
        { enemyId: "whitewyrm", row: 0, col: 5 },
      ],
      [
        { enemyId: "aeropede", row: 0, col: 0 },
        { enemyId: "aeropede", row: 0, col: 1 },
        { enemyId: "aeropede", row: 0, col: 2 },
        { enemyId: "aeropede", row: 0, col: 3 },
        { enemyId: "antenna_orbling", row: 0, col: 4 },
        { enemyId: "antenna_orbling", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "6-1",
    chapter: 6,
    stage: 1,
    name: "6.1 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mech_orbling", row: 0, col: 0 },
        { enemyId: "mech_orbling", row: 0, col: 1 },
      ],
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "cybermummy", row: 0, col: 2 },
        { enemyId: "cybermummy", row: 0, col: 3 },
      ],
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
        { enemyId: "mech_orbling", row: 0, col: 4 },
        { enemyId: "mech_orbling", row: 0, col: 5 },
      ],
      [
        { enemyId: "cybermummy", row: 0, col: 0 },
        { enemyId: "cybermummy", row: 0, col: 1 },
        { enemyId: "mech_orbling", row: 0, col: 2 },
        { enemyId: "mech_orbling", row: 0, col: 3 },
        { enemyId: "slashbot", row: 0, col: 4 },
        { enemyId: "slashbot", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "6-2",
    chapter: 6,
    stage: 2,
    name: "6.2 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
      ],
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
        { enemyId: "mech_orbling", row: 0, col: 4 },
        { enemyId: "mech_orbling", row: 0, col: 5 },
      ],
      [
        { enemyId: "cybermummy", row: 0, col: 0 },
        { enemyId: "cybermummy", row: 0, col: 1 },
        { enemyId: "cybermummy", row: 0, col: 2 },
        { enemyId: "cybermummy", row: 0, col: 3 },
      ],
      [
        { enemyId: "mech_orbling", row: 0, col: 0 },
        { enemyId: "mech_orbling", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
      ],
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
        { enemyId: "slashbot", row: 0, col: 4 },
        { enemyId: "slashbot", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "6-3",
    chapter: 6,
    stage: 3,
    name: "6.3 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
      ],
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "impalebot", row: 0, col: 3 },
        { enemyId: "impalebot", row: 0, col: 4 },
        { enemyId: "impalebot", row: 0, col: 5 },
      ],
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "impalebot", row: 0, col: 1 },
        { enemyId: "impalebot", row: 0, col: 2 },
        { enemyId: "impalebot", row: 0, col: 3 },
        { enemyId: "impalebot", row: 0, col: 4 },
        { enemyId: "impalebot", row: 0, col: 5 },
      ],
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "impalebot", row: 0, col: 2 },
        { enemyId: "impalebot", row: 0, col: 3 },
      ],
    ],
  },
  {
    id: "6-4",
    chapter: 6,
    stage: 4,
    name: "6.4 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [{ enemyId: "teksura", row: 0, col: 0 }],
      [
        { enemyId: "power_pyramid", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
      ],
      [
        { enemyId: "impalebot", row: 0, col: 0 },
        { enemyId: "impalebot", row: 0, col: 1 },
        { enemyId: "power_pyramid", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
      ],
      [{ enemyId: "teksura", row: 0, col: 0 }],
      [
        { enemyId: "power_pyramid", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
        { enemyId: "slashbot", row: 0, col: 4 },
        { enemyId: "teksura", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "6-5",
    chapter: 6,
    stage: 5,
    name: "6.5 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [
        { enemyId: "cybermummy", row: 0, col: 0 },
        { enemyId: "cybermummy", row: 0, col: 1 },
        { enemyId: "teksura", row: 0, col: 2 },
        { enemyId: "teksura", row: 0, col: 3 },
      ],
      [
        { enemyId: "cybermummy", row: 0, col: 0 },
        { enemyId: "cybermummy", row: 0, col: 1 },
        { enemyId: "teksura", row: 0, col: 2 },
        { enemyId: "teksura", row: 0, col: 3 },
        { enemyId: "teksura", row: 0, col: 4 },
        { enemyId: "teksura", row: 0, col: 5 },
      ],
      [{ enemyId: "arachnobot", row: 0, col: 2 }],
    ],
  },
  {
    id: "6-6",
    chapter: 6,
    stage: 6,
    name: "6.6 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [
        { enemyId: "arachnobot_lv15", row: 0, col: 0 },
        { enemyId: "arachnobot_lv15", row: 0, col: 1 },
        { enemyId: "arachnobot_lv15", row: 0, col: 2 },
        { enemyId: "arachnobot_lv15", row: 0, col: 3 },
        { enemyId: "arachnobot_lv15", row: 0, col: 4 },
        { enemyId: "arachnobot_lv15", row: 0, col: 5 },
      ],
      [
        { enemyId: "arachnobot_lv15", row: 0, col: 0 },
        { enemyId: "arachnobot_lv15", row: 0, col: 1 },
        { enemyId: "arachnobot_lv15", row: 0, col: 2 },
        { enemyId: "arachnobot_lv15", row: 0, col: 3 },
        { enemyId: "teksura", row: 0, col: 4 },
        { enemyId: "teksura", row: 0, col: 5 },
      ],
      [
        { enemyId: "arachnobot_lv15", row: 0, col: 0 },
        { enemyId: "arachnobot_lv15", row: 0, col: 1 },
        { enemyId: "arachnobot_lv15", row: 0, col: 2 },
        { enemyId: "arachnobot_lv15", row: 0, col: 3 },
        { enemyId: "power_pyramid", row: 0, col: 4 },
        { enemyId: "power_pyramid", row: 0, col: 5 },
      ],
      [
        { enemyId: "arachnobot_lv15", row: 0, col: 0 },
        { enemyId: "arachnobot_lv15", row: 0, col: 1 },
        { enemyId: "arachnobot_lv15", row: 0, col: 2 },
        { enemyId: "arachnobot_lv15", row: 0, col: 3 },
        { enemyId: "teksura", row: 0, col: 4 },
        { enemyId: "teksura", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "6-7",
    chapter: 6,
    stage: 7,
    name: "6.7 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "impalebot", row: 0, col: 3 },
        { enemyId: "impalebot", row: 0, col: 4 },
      ],
      [
        { enemyId: "impalebot", row: 0, col: 0 },
        { enemyId: "impalebot", row: 0, col: 1 },
        { enemyId: "mech_orbling", row: 0, col: 2 },
        { enemyId: "mech_orbling", row: 0, col: 3 },
      ],
      [
        { enemyId: "arachnobot_lv15", row: 0, col: 0 },
        { enemyId: "arachnobot_lv15", row: 0, col: 1 },
        { enemyId: "arachnobot_lv15", row: 0, col: 2 },
        { enemyId: "arachnobot_lv15", row: 0, col: 3 },
        { enemyId: "mech_orbling", row: 0, col: 4 },
        { enemyId: "mech_orbling", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "6-8",
    chapter: 6,
    stage: 8,
    name: "6.8 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "teksura", row: 0, col: 3 },
        { enemyId: "teksura", row: 0, col: 4 },
      ],
      [
        { enemyId: "impalebot", row: 0, col: 0 },
        { enemyId: "impalebot", row: 0, col: 1 },
        { enemyId: "impalebot", row: 0, col: 2 },
        { enemyId: "cybermummy", row: 0, col: 3 },
        { enemyId: "cybermummy", row: 0, col: 4 },
      ],
      [
        { enemyId: "arachnobot_lv15", row: 0, col: 0 },
        { enemyId: "arachnobot_lv15", row: 0, col: 1 },
        { enemyId: "arachnobot_lv15", row: 0, col: 2 },
        { enemyId: "arachnobot_lv15", row: 0, col: 3 },
        { enemyId: "power_pyramid", row: 0, col: 4 },
        { enemyId: "power_pyramid", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "6-9",
    chapter: 6,
    stage: 9,
    name: "6.9 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
        { enemyId: "teksura", row: 0, col: 4 },
        { enemyId: "teksura", row: 0, col: 5 },
      ],
      [
        { enemyId: "cybermummy", row: 0, col: 0 },
        { enemyId: "cybermummy", row: 0, col: 1 },
        { enemyId: "impalebot", row: 0, col: 2 },
        { enemyId: "impalebot", row: 0, col: 3 },
      ],
      [
        { enemyId: "arachnobot_lv15", row: 0, col: 0 },
        { enemyId: "arachnobot_lv15", row: 0, col: 1 },
        { enemyId: "arachnobot_lv15", row: 0, col: 2 },
        { enemyId: "arachnobot_lv15", row: 0, col: 3 },
        { enemyId: "mech_orbling", row: 0, col: 4 },
        { enemyId: "mech_orbling", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "6-10",
    chapter: 6,
    stage: 10,
    name: "6.10 The City Below",
    stamina: 7,
    difficulty: 5,
    waves: [
      [
        { enemyId: "teksura", row: 0, col: 0 },
        { enemyId: "teksura", row: 0, col: 1 },
        { enemyId: "slashbot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 3 },
      ],
      [
        { enemyId: "impalebot", row: 0, col: 0 },
        { enemyId: "impalebot", row: 0, col: 1 },
        { enemyId: "cybermummy", row: 0, col: 2 },
        { enemyId: "cybermummy", row: 0, col: 3 },
      ],
      [
        { enemyId: "arachnobot", row: 0, col: 2 },
        { enemyId: "slashbot", row: 0, col: 0 },
        { enemyId: "slashbot", row: 0, col: 1 },
      ],
    ],
  },
  {
    id: "7-1",
    chapter: 7,
    stage: 1,
    name: "7.1 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "mantle_slime", row: 0, col: 4 },
        { enemyId: "mantle_slime", row: 0, col: 5 },
      ],
      [
        { enemyId: "wyvern", row: 0, col: 0 },
        { enemyId: "wyvern", row: 0, col: 1 },
      ],
      [
        { enemyId: "heat_sparker", row: 0, col: 0 },
        { enemyId: "heat_sparker", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "mantle_slime", row: 0, col: 4 },
        { enemyId: "mantle_slime", row: 0, col: 5 },
      ],
      [
        { enemyId: "heat_sparker", row: 0, col: 0 },
        { enemyId: "heat_sparker", row: 0, col: 1 },
        { enemyId: "heat_sparker", row: 0, col: 2 },
      ],
      [
        { enemyId: "wyvern", row: 0, col: 0 },
        { enemyId: "wyvern", row: 0, col: 1 },
        { enemyId: "heat_sparker", row: 0, col: 2 },
        { enemyId: "heat_sparker", row: 0, col: 3 },
      ],
    ],
  },
  {
    id: "7-2",
    chapter: 7,
    stage: 2,
    name: "7.2 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [{ enemyId: "rockburn", row: 0, col: 0 }],
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "mantle_slime", row: 0, col: 4 },
        { enemyId: "mantle_slime", row: 0, col: 5 },
        { enemyId: "rockburn", row: 1, col: 0 },
      ],
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "heat_sparker", row: 0, col: 4 },
        { enemyId: "heat_sparker", row: 0, col: 5 },
      ],
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "rockburn", row: 0, col: 4 },
        { enemyId: "rockburn", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "7-3",
    chapter: 7,
    stage: 3,
    name: "7.3 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [{ enemyId: "magma_eye", row: 0, col: 0 }],
      [
        { enemyId: "magma_eye", row: 0, col: 0 },
        { enemyId: "magma_eye", row: 0, col: 1 },
        { enemyId: "magma_mummy", row: 0, col: 2 },
      ],
      [
        { enemyId: "rockburn", row: 0, col: 0 },
        { enemyId: "rockburn", row: 0, col: 1 },
        { enemyId: "magma_mummy", row: 0, col: 2 },
      ],
      [
        { enemyId: "magma_eye", row: 0, col: 0 },
        { enemyId: "magma_eye", row: 0, col: 1 },
        { enemyId: "rockburn", row: 0, col: 2 },
      ],
      [{ enemyId: "phi_orbling", row: 0, col: 0 }],
    ],
  },
  {
    id: "7-4",
    chapter: 7,
    stage: 4,
    name: "7.4 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
      ],
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "mantle_slime", row: 0, col: 4 },
        { enemyId: "magma_mummy", row: 0, col: 5 },
      ],
      [
        { enemyId: "magma_eye", row: 0, col: 0 },
        { enemyId: "magma_eye", row: 0, col: 1 },
        { enemyId: "magma_eye", row: 0, col: 2 },
        { enemyId: "magma_eye", row: 0, col: 3 },
      ],
      [
        { enemyId: "magma_mummy", row: 0, col: 0 },
        { enemyId: "magma_mummy", row: 0, col: 1 },
        { enemyId: "magma_mummy", row: 0, col: 2 },
      ],
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "magma_eye", row: 0, col: 4 },
        { enemyId: "magma_eye", row: 0, col: 5 },
      ],
    ],
  },
  {
    id: "7-5",
    chapter: 7,
    stage: 5,
    name: "7.5 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [{ enemyId: "mantle_tortoise", row: 0, col: 2 }],
      [
        { enemyId: "phi_orbling", row: 0, col: 0 },
        { enemyId: "phi_orbling", row: 0, col: 1 },
      ],
      [
        { enemyId: "mantle_tortoise", row: 0, col: 2 },
        { enemyId: "heat_sparker", row: 0, col: 0 },
        { enemyId: "heat_sparker", row: 0, col: 1 },
        { enemyId: "heat_sparker", row: 0, col: 4 },
      ],
    ],
  },
  {
    id: "7-6",
    chapter: 7,
    stage: 6,
    name: "7.6 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "heat_sparker", row: 0, col: 4 },
        { enemyId: "heat_sparker", row: 0, col: 5 },
      ],
      [
        { enemyId: "rockburn", row: 0, col: 0 },
        { enemyId: "magma_eye", row: 0, col: 1 },
        { enemyId: "magma_eye", row: 0, col: 2 },
      ],
      [
        { enemyId: "wyvern", row: 0, col: 0 },
        { enemyId: "wyvern", row: 0, col: 1 },
        { enemyId: "magma_mummy", row: 0, col: 2 },
        { enemyId: "magma_mummy", row: 0, col: 3 },
      ],
    ],
  },
  {
    id: "7-7",
    chapter: 7,
    stage: 7,
    name: "7.7 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "heat_sparker", row: 0, col: 4 },
        { enemyId: "heat_sparker", row: 0, col: 5 },
      ],
      [
        { enemyId: "rockburn", row: 0, col: 0 },
        { enemyId: "magma_eye", row: 0, col: 1 },
        { enemyId: "magma_eye", row: 0, col: 2 },
      ],
      [
        { enemyId: "wyvern", row: 0, col: 0 },
        { enemyId: "wyvern", row: 0, col: 1 },
        { enemyId: "magma_mummy", row: 0, col: 2 },
        { enemyId: "magma_mummy", row: 0, col: 3 },
      ],
    ],
  },
  {
    id: "7-8",
    chapter: 7,
    stage: 8,
    name: "7.8 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "heat_sparker", row: 0, col: 4 },
        { enemyId: "heat_sparker", row: 0, col: 5 },
      ],
      [
        { enemyId: "rockburn", row: 0, col: 0 },
        { enemyId: "magma_eye", row: 0, col: 1 },
        { enemyId: "magma_eye", row: 0, col: 2 },
      ],
      [
        { enemyId: "wyvern", row: 0, col: 0 },
        { enemyId: "wyvern", row: 0, col: 1 },
        { enemyId: "magma_mummy", row: 0, col: 2 },
        { enemyId: "magma_mummy", row: 0, col: 3 },
      ],
    ],
  },
  {
    id: "7-9",
    chapter: 7,
    stage: 9,
    name: "7.9 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "heat_sparker", row: 0, col: 4 },
        { enemyId: "heat_sparker", row: 0, col: 5 },
      ],
      [
        { enemyId: "rockburn", row: 0, col: 0 },
        { enemyId: "magma_eye", row: 0, col: 1 },
        { enemyId: "magma_eye", row: 0, col: 2 },
      ],
      [
        { enemyId: "wyvern", row: 0, col: 0 },
        { enemyId: "wyvern", row: 0, col: 1 },
        { enemyId: "magma_mummy", row: 0, col: 2 },
        { enemyId: "magma_mummy", row: 0, col: 3 },
      ],
    ],
  },
  {
    id: "7-10",
    chapter: 7,
    stage: 10,
    name: "7.10 Molten Menace",
    stamina: 8,
    difficulty: 5,
    waves: [
      [
        { enemyId: "mantle_slime", row: 0, col: 0 },
        { enemyId: "mantle_slime", row: 0, col: 1 },
        { enemyId: "mantle_slime", row: 0, col: 2 },
        { enemyId: "mantle_slime", row: 0, col: 3 },
        { enemyId: "heat_sparker", row: 0, col: 4 },
        { enemyId: "heat_sparker", row: 0, col: 5 },
      ],
      [
        { enemyId: "rockburn", row: 0, col: 0 },
        { enemyId: "magma_eye", row: 0, col: 1 },
        { enemyId: "magma_eye", row: 0, col: 2 },
      ],
      [
        { enemyId: "wyvern", row: 0, col: 0 },
        { enemyId: "wyvern", row: 0, col: 1 },
        { enemyId: "magma_mummy", row: 0, col: 2 },
        { enemyId: "magma_mummy", row: 0, col: 3 },
      ],
    ],
  },
];

export function getStageRef(
  chapter: number,
  stage: number,
): StageRef | undefined {
  return STAGE_REFS.find((s) => s.chapter === chapter && s.stage === stage);
}

export function getStageRefById(id: string): StageRef | undefined {
  return STAGE_REFS.find((s) => s.id === id);
}

export function stagesForChapter(chapter: number): StageRef[] {
  return STAGE_REFS.filter((s) => s.chapter === chapter);
}

/** Build playable StageData for a chapter/stage number. */
export function loadStage(
  chapter: number,
  stage: number,
): StageData | undefined {
  const ref = getStageRef(chapter, stage);
  return ref ? buildStageData(ref) : undefined;
}
