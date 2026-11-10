import { describe, it, expect } from 'vitest';
import {
  COMPANIONS,
  statsAtLevel,
  frequencyAtLevel,
  valueAtLevel,
  upgradeCoinCost,
  materialExp,
  getCompanion,
} from '../src/data/companions';

describe('companion helpers', () => {
  it('linear valueAtLevel matches wiki formula', () => {
    // Fire Visor MDEF 1 → 5 over levels 1–10
    expect(valueAtLevel(1, 5, 1, 10)).toBe(1);
    expect(valueAtLevel(1, 5, 10, 10)).toBe(5);
    expect(valueAtLevel(1, 5, 5.5, 10)).toBeCloseTo(3, 5);
  });

  it('Fire Visor stats and frequency at level bounds', () => {
    const def = COMPANIONS.fire_visor;
    expect(statsAtLevel(def, 1).mdef).toBe(1);
    expect(statsAtLevel(def, 10).mdef).toBe(5);
    expect(frequencyAtLevel(def, 1)).toBe(10);
    expect(frequencyAtLevel(def, 10)).toBe(30);
  });

  it('Healing Ring heals and evolves', () => {
    const def = COMPANIONS.healing_ring;
    expect(def.skill.name).toBe('Mega Heal');
    expect(def.evolveTo).toBe('white_pendant');
    expect(def.evolveCost?.coins).toBe(6000);
  });

  it('upgrade coin cost formula', () => {
    expect(upgradeCoinCost(1, 4)).toBe(200);
    expect(upgradeCoinCost(10, 2)).toBe(1000);
  });

  it('material EXP with same-name bonus', () => {
    const tear = COMPANIONS.hisos_tear;
    expect(materialExp(tear, 1)).toBe(600);
    expect(materialExp(tear, 10)).toBe(6000);
    expect(materialExp(tear, 1, true)).toBe(1200);
  });

  it('Metal Minion is pure EXP fodder', () => {
    const m = COMPANIONS.metal_minion;
    expect(m.maxLevel).toBe(1);
    expect(m.upgradeExp).toBe(3000);
    expect(statsAtLevel(m, 1)).toEqual({ atk: 0, def: 0, matk: 0, mdef: 0 });
  });

  it('full fire evolution chain exists', () => {
    let id: string | undefined = 'fire_visor';
    const chain: string[] = [];
    while (id) {
      const def = getCompanion(id);
      expect(def).toBeDefined();
      chain.push(def!.name);
      id = def!.evolveTo;
    }
    expect(chain).toEqual(['Fire Visor', 'Fire Helmet', 'Fire Shield', 'Scorching Shield']);
  });
});
