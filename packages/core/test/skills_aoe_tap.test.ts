import { describe, expect, it, beforeEach } from "vitest";
import {
  parseBoard,
  resolveAttacks,
  Battle,
  type StageData,
  getCellsInShape,
  getTargetsInShape,
  getEffectiveStat,
  applyBuff,
  applyStatus,
  cureStatus,
  getWeaponAdvantageMultiplier,
  setWeaponAdvantageMultiplier,
  cycleWeaponAdvantagePreset,
  computeDamage,
  type Unit,
  type Skill,
} from "../src";

describe("AoE Skill Shapes", () => {
  it("computes cells in shape accurately", () => {
    const board = parseBoard([
      ". . . . . .",
      ". . . . . .",
      ". . . . . .",
      ". . . . . .",
      ". . . . . .",
      ". . . . . .",
      ". . . . . .",
      ". . . . . .",
    ]);

    const center = { row: 3, col: 2 };

    // Area(1): 3x3 square = 9 cells
    const area1 = getCellsInShape(board, center, "area", 1);
    expect(area1).toHaveLength(9);
    expect(area1).toContainEqual({ row: 2, col: 1 });
    expect(area1).toContainEqual({ row: 4, col: 3 });

    // Area(2): 5x5 square = 25 cells
    const area2 = getCellsInShape(board, center, "area", 2);
    expect(area2).toHaveLength(25);

    // Column: all cells in col 2 (8 rows = 8 cells)
    const colCells = getCellsInShape(board, center, "column");
    expect(colCells).toHaveLength(8);
    for (let r = 0; r < 8; r++) {
      expect(colCells).toContainEqual({ row: r, col: 2 });
    }

    // Row: all cells in row 3 (6 cols = 6 cells)
    const rowCells = getCellsInShape(board, center, "row");
    expect(rowCells).toHaveLength(6);
    for (let c = 0; c < 6; c++) {
      expect(rowCells).toContainEqual({ row: 3, col: c });
    }

    // Cross(1): center + up + down + left + right = 5 cells
    const cross1 = getCellsInShape(board, center, "cross", 1);
    expect(cross1).toHaveLength(5);
    expect(cross1).toContainEqual({ row: 3, col: 2 });
    expect(cross1).toContainEqual({ row: 2, col: 2 });
    expect(cross1).toContainEqual({ row: 4, col: 2 });
    expect(cross1).toContainEqual({ row: 3, col: 1 });
    expect(cross1).toContainEqual({ row: 3, col: 3 });

    // Cross(all) (radius = 0): entire row + entire col = 8 + 6 - 1 = 13 cells
    const crossAll = getCellsInShape(board, center, "cross", 0);
    expect(crossAll).toHaveLength(13);

    // Lateral(1): center + left + right = 3 cells
    const lateral1 = getCellsInShape(board, center, "lateral", 1);
    expect(lateral1).toHaveLength(3);
    expect(lateral1).toContainEqual({ row: 3, col: 1 });
    expect(lateral1).toContainEqual({ row: 3, col: 2 });
    expect(lateral1).toContainEqual({ row: 3, col: 3 });

    // Adjacent / Surround: 8 surrounding cells (center excluded)
    const adj = getCellsInShape(board, center, "adjacent");
    expect(adj).toHaveLength(8);
    expect(adj).not.toContainEqual(center);

    // All: board.rows * board.cols = 8 * 6 = 48 cells
    const all = getCellsInShape(board, center, "all");
    expect(all).toHaveLength(48);
  });

  it("resolves AoE damage skills across the board", () => {
    // 1 pincers x with 2.
    // 1 has an Area(1) fire skill that also damages y who is adjacent to 1.
    const board = parseBoard([
      ". . . . .",
      ". 1 x 2 .",
      ". y . . .",
      ". . . . .",
    ], {
      "1": { atk: 30, maxHp: 100, hp: 100 },
      "2": { atk: 30, maxHp: 100, hp: 100 },
      x: { def: 10, maxHp: 100, hp: 100 },
      y: { def: 10, maxHp: 100, hp: 100 },
    });

    const unit1 = board.getUnit("1");
    unit1.skills = [
      {
        id: "fire_burst_area1",
        name: "Fire, Area (1)",
        trigger: "pincer",
        frequency: 100,
        shape: "area",
        radius: 1,
        power: 1.5,
      },
    ];

    const res = resolveAttacks(board, "ally");

    // Both x (pincered) and y (in Area(1) of unit 1) should have taken damage
    expect(board.getUnit("x").hp).toBeLessThan(100);
    expect(board.getUnit("y").hp).toBeLessThan(100);

    // An aoe attack record should exist in res.attacks
    const aoeHits = res.attacks.filter((a) => a.role === "aoe");
    expect(aoeHits.length).toBeGreaterThan(0);
    expect(aoeHits.some((a) => a.target === "y")).toBe(true);
  });
});

describe("Healing, Buffs, and Status Remedies", () => {
  it("resolves healing skills for damaged allies in shape", () => {
    const board = parseBoard([
      "1 x 2 .",
      "3 . . .",
    ], {
      "1": { atk: 20, maxHp: 100, hp: 100 },
      "2": { atk: 20, maxHp: 100, hp: 100 },
      "3": { atk: 10, matk: 40, maxHp: 100, hp: 30 }, // ally 3 is hurt
      x: { def: 5, maxHp: 100, hp: 100 },
    });

    const unit1 = board.getUnit("1");
    unit1.skills = [
      {
        id: "heal_all",
        name: "Heal, All",
        trigger: "pincer",
        frequency: 100,
        effect: "heal",
        shape: "all",
        power: 1.0,
      },
    ];

    const res = resolveAttacks(board, "ally");
    expect(board.getUnit("3").hp).toBeGreaterThan(30);
    expect(res.attacks.some((s) => s.role === "heal" && s.target === "3")).toBe(true);
  });

  it("applies stat buffs and clamps them to +/-200%", () => {
    const unit: Unit = {
      id: "hero",
      side: "ally",
      name: "Hero",
      job: 1,
      level: 50,
      stats: { maxHp: 1000, atk: 100, def: 50, matk: 80, mdef: 40 },
      hp: 1000,
      skills: [],
    };

    expect(getEffectiveStat(unit, "atk")).toBe(100);

    // Apply +50% ATK buff
    applyBuff(unit, {
      id: "buff_atk_1",
      name: "Attack +50%",
      stat: "atk",
      percent: 50,
      duration: 2,
    });
    expect(getEffectiveStat(unit, "atk")).toBe(150);

    // Apply another +180% ATK buff -> sum is +230%, clamped to +200% (max 3x base)
    applyBuff(unit, {
      id: "buff_atk_2",
      name: "Attack +180%",
      stat: "atk",
      percent: 180,
      duration: 2,
    });
    expect(getEffectiveStat(unit, "atk")).toBe(300); // 100 * (1 + 2.0) = 300

    // Test debuff clamping: -250% clamped to -200% (stats have minimum of 1)
    applyBuff(unit, {
      id: "debuff_def",
      name: "Defense -250%",
      stat: "def",
      percent: -250,
      duration: 2,
    });
    expect(getEffectiveStat(unit, "def")).toBe(1);
  });

  it("handles status infliction, remedies, and turn end ticks", () => {
    const board = parseBoard(["1 . x ."]);
    const unit = board.getUnit("1");

    // Inflict poison and paralysis
    applyStatus(unit, { type: "poison", duration: 3, power: 25 });
    applyStatus(unit, { type: "paralysis", duration: 2 });
    expect(unit.statuses).toHaveLength(2);

    // Remedy antidote cures poison only
    const cured = cureStatus(unit, "poison");
    expect(cured).toEqual(["poison"]);
    expect(unit.statuses).toHaveLength(1);
    expect(unit.statuses?.[0].type).toBe("paralysis");

    // Panacea cures all
    applyStatus(unit, { type: "sleep", duration: 1 });
    const allCured = cureStatus(unit, "all");
    expect(allCured).toContain("paralysis");
    expect(allCured).toContain("sleep");
    expect(unit.statuses).toHaveLength(0);
  });
});

describe("Manual Tap Skills", () => {
  it("burns charges and prioritizes debuff taps first then buff taps", () => {
    const stage: StageData = {
      id: "test_tap",
      name: "Test Tap",
      rows: 8,
      cols: 6,
      allies: [
        {
          row: 3,
          col: 2,
          unit: {
            id: "tapper",
            name: "Mage",
            maxHp: 500,
            atk: 50,
            def: 30,
            skills: [
              {
                id: "tap_atk_buff",
                name: "Attack +10%, Tap",
                description: "Attack +10%, Self, Tap",
                trigger: "tap",
                effect: "buff",
                stat: "atk",
                statPercent: 10,
              },
              {
                id: "tap_def_debuff",
                name: "Defense -20%, Tap",
                description: "Defense -20%, Area(1), Tap",
                trigger: "tap",
                effect: "debuff",
                stat: "def",
                statPercent: -20,
              },
            ],
          },
        },
        {
          row: 3,
          col: 3,
          unit: { id: "ally2", name: "Ally", maxHp: 100, atk: 10, def: 5 },
        },
      ],
      waves: [
        [
          {
            row: 4,
            col: 2,
            unit: {
              id: "goblin",
              name: "Goblin",
              maxHp: 100,
              atk: 10,
              def: 5,
            },
          },
        ],
      ],
    };

    const battle = new Battle(stage);

    const unit = battle.board.getUnit("tapper");
    // Initial charges: 3 per tap skill (total 6)
    expect(unit.tapCharges?.["tap_atk_buff"]).toBe(3);
    expect(unit.tapCharges?.["tap_def_debuff"]).toBe(3);

    // First 3 taps MUST activate debuff skill until exhausted
    const tap1 = battle.activateTap("tapper");
    expect(tap1).not.toBeNull();
    expect(tap1!.skill.id).toBe("tap_def_debuff");
    expect(tap1!.remainingCharges).toBe(2);

    const tap2 = battle.activateTap("tapper");
    expect(tap2).not.toBeNull();
    expect(tap2!.skill.id).toBe("tap_def_debuff");
    expect(tap2!.remainingCharges).toBe(1);

    const tap3 = battle.activateTap("tapper");
    expect(tap3).not.toBeNull();
    expect(tap3!.skill.id).toBe("tap_def_debuff");
    expect(tap3!.remainingCharges).toBe(0);

    // Debuff skill now exhausted! Tap 4 should now move to buff skill
    const tap4 = battle.activateTap("tapper");
    expect(tap4).not.toBeNull();
    expect(tap4!.skill.id).toBe("tap_atk_buff");
    expect(tap4!.category).toBe("buff");
    expect(tap4!.remainingCharges).toBe(2);

    // Tapping also applies the buff to allies
    expect(unit.buffs?.some((b) => b.stat === "atk")).toBe(true);

    const tap5 = battle.activateTap("tapper");
    expect(tap5!.remainingCharges).toBe(1);

    const tap6 = battle.activateTap("tapper");
    expect(tap6!.remainingCharges).toBe(0);

    // All tap skills exhausted: activateTap returns null
    const tap7 = battle.activateTap("tapper");
    expect(tap7).toBeNull();
  });
});

describe("Weapon Advantage Multiplier Toggle", () => {
  beforeEach(() => {
    setWeaponAdvantageMultiplier(1.75);
  });

  it("defaults to 1.75 and cycles presets correctly", () => {
    expect(getWeaponAdvantageMultiplier()).toBe(1.75);

    // Cycle 1: 1.75 -> 2.0 (TB wiki standard)
    const p1 = cycleWeaponAdvantagePreset();
    expect(p1).toBe(2.0);
    expect(getWeaponAdvantageMultiplier()).toBe(2.0);

    // Cycle 2: 2.0 -> 1.5 (Balanced)
    const p2 = cycleWeaponAdvantagePreset();
    expect(p2).toBe(1.5);
    expect(getWeaponAdvantageMultiplier()).toBe(1.5);

    // Cycle 3: 1.5 -> 1.75
    const p3 = cycleWeaponAdvantagePreset();
    expect(p3).toBe(1.75);
    expect(getWeaponAdvantageMultiplier()).toBe(1.75);
  });
});
