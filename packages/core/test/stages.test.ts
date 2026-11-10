import { describe, it, expect } from 'vitest';
import { validateStage } from '../src/stage';
import { ENEMIES, ENEMY_LIST, scaleEnemy } from '../src/data/enemies';
import {
  STAGE_REFS,
  buildStageData,
  loadStage,
  getStageRef,
  stagesForChapter,
} from '../src/data/stages';

describe('enemy catalog', () => {
  it('has wiki enemies and bosses', () => {
    expect(ENEMY_LIST.length).toBeGreaterThanOrEqual(15);
    expect(ENEMIES.orbling_lv12_boss.w).toBe(2);
    expect(ENEMIES.spinetrich_lv9.family).toBe('boss');
    expect(ENEMIES.wee_orbling.name).toBe('Wee Orbling');
    expect(ENEMIES.gorf_lv4.fixedStats).toBe(true);
  });

  it('wiki snapshots do not scale; placeholders still can', () => {
    // Authentic wiki rows stay fixed
    const orbling = ENEMIES.orbling_lv3;
    expect(scaleEnemy(orbling, 1).maxHp).toBe(orbling.maxHp);
    expect(scaleEnemy(orbling, 5).maxHp).toBe(orbling.maxHp);

    // Non-wiki placeholders may still grow
    const placeholder = ENEMIES.soldier;
    expect(placeholder.fixedStats).toBeFalsy();
    expect(scaleEnemy(placeholder, 5).maxHp).toBeGreaterThan(placeholder.maxHp);
  });
});

describe('chapter stages (wiki-backed early, generated later)', () => {
  it('matches wiki subzone counts for chapters 1–7', () => {
    expect(stagesForChapter(1)).toHaveLength(5);
    expect(stagesForChapter(2)).toHaveLength(5);
    expect(stagesForChapter(3)).toHaveLength(5);
    expect(stagesForChapter(4)).toHaveLength(10);
    expect(stagesForChapter(7)).toHaveLength(10);
    expect(stagesForChapter(8)).toHaveLength(0);
  });

  it('1-1 has 3 battles (wiki Borderlands) and validates', () => {
    const data = loadStage(1, 1)!;
    expect(data.waves).toHaveLength(3);
    expect(validateStage(data)).toEqual([]);
    expect(data.waves.flat().every((p) => p.unit.name === 'Wee Orbling')).toBe(true);
  });

  it('1-5 final wave includes Orbling', () => {
    const data = loadStage(1, 5)!;
    expect(data.waves).toHaveLength(3);
    const boss = data.waves[2].find((p) => p.unit.name === 'Orbling');
    expect(boss).toBeDefined();
    expect(validateStage(data)).toEqual([]);
  });

  it('2-1 matches wiki five-battle structure', () => {
    const data = loadStage(2, 1)!;
    expect(data.waves).toHaveLength(5);
    expect(validateStage(data)).toEqual([]);
  });

  it('3-1 uses Lizardfolk from Melting Pot wiki', () => {
    const data = loadStage(3, 1)!;
    expect(data.waves).toHaveLength(5);
    const names = data.waves.flat().map((p) => p.unit.name);
    expect(names.some((n) => n.includes('Lizardfolk'))).toBe(true);
    expect(validateStage(data)).toEqual([]);
  });

  it('4-10 final wave recruits Ba\'gunar boss', () => {
    const data = loadStage(4, 10)!;
    const last = data.waves[data.waves.length - 1];
    expect(last.some((p) => p.unit.name === "Ba'gunar")).toBe(true);
    expect(validateStage(data)).toEqual([]);
  });

  it('7-1 uses Mantle / Wyvern from Molten Menace', () => {
    const data = loadStage(7, 1)!;
    expect(data.waves.length).toBeGreaterThanOrEqual(4);
    const names = new Set(data.waves.flat().map((p) => p.unit.name));
    expect(names.has('Mantle Slime') || names.has('Wyvern')).toBe(true);
    expect(validateStage(data)).toEqual([]);
  });

  it('2-2 ends with 2x2 Orbling boss', () => {
    const data = loadStage(2, 2)!;
    const boss = data.waves[data.waves.length - 1].find((p) => p.unit.w === 2);
    expect(boss?.unit.name).toBe('Orbling');
    expect(validateStage(data)).toEqual([]);
  });

  it('every authored stage validates', () => {
    for (const ref of STAGE_REFS) {
      const data = buildStageData(ref);
      const errors = validateStage(data);
      expect(errors, ref.id).toEqual([]);
      expect(data.waves.length).toBe(ref.waves.length);
    }
  });

  it('getStageRef looks up by chapter/stage', () => {
    expect(getStageRef(1, 5)?.name).toContain('Borderlands');
    expect(getStageRef(1, 6)).toBeUndefined();
    expect(getStageRef(2, 5)?.name).toContain('Capital');
    expect(getStageRef(4, 10)?.name).toContain('Tower');
    expect(getStageRef(8, 1)).toBeUndefined();
  });
});
