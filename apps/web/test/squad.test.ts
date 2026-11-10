import { describe, it, expect } from 'vitest';
import { createCharacterInstance } from '@game/core';
import { placementsFromSquad, stageWithSquad } from '../src/squad';
import { stage1 } from '../src/stage1';

describe('squad → battle allies', () => {
  it('places up to 6 characters on bottom row with real names', () => {
    const squad = [
      createCharacterInstance('bahl', { levels: [12, 1, 1] }),
      createCharacterInstance('grace', { levels: [11, 1, 1] }),
      createCharacterInstance('kuscah', { levels: [10, 1, 1] }),
    ];
    const places = placementsFromSquad(squad);
    expect(places).toHaveLength(3);
    expect(places[0].unit.name).toBe('Bahl');
    expect(places[1].unit.name).toBe('Grace');
    expect(places[0].row).toBe(6);
    expect(places[0].col).toBe(0);
    expect(places[0].unit.maxHp).toBeGreaterThan(50);
    expect(places[0].unit.atk).toBeGreaterThan(5);
  });

  it('stageWithSquad replaces default allies', () => {
    const squad = [
      createCharacterInstance('bahl', { levels: [12, 1, 1] }),
      createCharacterInstance('healer', { levels: [8, 1, 1] }),
    ];
    const data = stageWithSquad(stage1, squad);
    expect(data.allies).toHaveLength(2);
    expect(data.allies.map((a) => a.unit.name).sort()).toEqual(['Bahl', 'Healer']);
    expect(data.waves.length).toBe(stage1.waves.length);
  });
});
