import { describe, it, expect } from "vitest";
import {
  buildStageBoard,
  CHARACTERS,
  createCharacterInstance,
} from "@game/core";
import { placementsFromSquad, stageWithSquad } from "../src/squad";
import { stage1 } from "../src/stage1";

describe("squad → battle allies", () => {
  it("places up to 6 characters on bottom row with real names", () => {
    const squad = [
      createCharacterInstance("bahl", { levels: [12, 1, 1] }),
      createCharacterInstance("grace", { levels: [11, 1, 1] }),
      createCharacterInstance("kuscah", { levels: [10, 1, 1] }),
    ];
    const places = placementsFromSquad(squad);
    expect(places).toHaveLength(3);
    expect(places[0].unit.name).toBe("Bahl");
    expect(places[1].unit.name).toBe("Grace");
    expect(places[0].row).toBe(6);
    expect(places[0].col).toBe(0);
    expect(places[0].unit.maxHp).toBeGreaterThan(50);
    expect(places[0].unit.atk).toBeGreaterThan(5);
    expect(places[0].unit.description).toBe(CHARACTERS.bahl.description);
    expect(stage1.waves[0][0].unit.description).toBeTruthy();
    expect(places.map((place) => place.unit.element)).toEqual([
      "—",
      "—",
      "Healing",
    ]);
  });

  it("stageWithSquad replaces default allies", () => {
    const squad = [
      createCharacterInstance("bahl", { levels: [12, 1, 1] }),
      createCharacterInstance("kuscah", { levels: [10, 1, 1] }),
    ];
    const data = stageWithSquad(stage1, squad);
    expect(data.allies).toHaveLength(2);
    expect(data.allies.map((a) => a.unit.name).sort()).toEqual([
      "Bahl",
      "Kuscah",
    ]);
    expect(data.waves.length).toBe(stage1.waves.length);
    const board = buildStageBoard(data);
    expect(board.getUnit(data.allies[0].unit.id).weapon).toBe("Sword");
    expect(board.getUnit(data.allies[1].unit.id).weapon).toBe("Staff");
    expect(board.getUnit(data.allies[1].unit.id).element).toBe("Healing");
    expect(board.getUnit(data.allies[0].unit.id).description).toBe(
      CHARACTERS.bahl.description,
    );
  });
});
