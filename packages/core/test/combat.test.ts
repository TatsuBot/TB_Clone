import { describe, expect, it, beforeEach } from "vitest";
import {
  buildSkillEvents,
  computeDamage,
  parseBoard,
  resolveAttacks,
  setWeaponAdvantageMultiplier,
  getWeaponAdvantageMultiplier,
} from "../src";

describe("combat resolution", () => {
  beforeEach(() => {
    setWeaponAdvantageMultiplier(1.75);
  });
  it("damage is atk - def, minimum 1", () => {
    const board = parseBoard(["1 x"], { "1": { atk: 10 }, x: { def: 3 } });
    expect(computeDamage(board.getUnit("1"), board.getUnit("x"))).toBe(7);
    board.getUnit("x").stats.def = 99;
    expect(computeDamage(board.getUnit("1"), board.getUnit("x"))).toBe(1);
  });

  it("a three-enemy line is hit at full damage by each flanker, no splitting", () => {
    const board = parseBoard(["1 x y z 2 ."]);
    resolveAttacks(board, "ally");
    for (const id of ["x", "y", "z"]) expect(board.getUnit(id).hp).toBe(80);
  });

  it("chained allies add their attacks; flankers act first, then the chain", () => {
    const board = parseBoard(["3 . 1 x 2 ."]);
    const res = resolveAttacks(board, "ally");
    expect(res.attacks.map((a) => [a.attacker, a.role])).toEqual([
      ["1", "flanker"],
      ["2", "flanker"],
      ["3", "chain"],
    ]);
    expect(board.getUnit("x").hp).toBe(70);
  });

  it("a unit in two separate pincers attacks once in each", () => {
    const board = parseBoard([". 3 . .", ". y . .", ". 1 x 4"]);
    const res = resolveAttacks(board, "ally");
    expect(res.scan.pincers).toHaveLength(2);
    expect(res.attacks.filter((a) => a.attacker === "1")).toHaveLength(2);
    expect(board.getUnit("x").hp).toBe(80);
    expect(board.getUnit("y").hp).toBe(80);
  });

  it("removes defeated units after all attacks are applied", () => {
    const board = parseBoard(["1 x 2"], { x: { maxHp: 15 } });
    const res = resolveAttacks(board, "ally");
    expect(res.defeated).toEqual(["x"]);
    expect(board.hasUnit("x")).toBe(false);
    expect(res.attacks).toHaveLength(2); // overkill still logged: both hits landed
  });

  it("a board with no pincer produces no attacks at all", () => {
    const res = resolveAttacks(parseBoard(["1 . x . 2"]), "ally");
    expect(res.attacks).toEqual([]);
    expect(res.defeated).toEqual([]);
  });

  it("weapon triangle and element advantage multiply the attack", () => {
    const board = parseBoard(["1 x"], {
      "1": { atk: 30, def: 5, matk: 20, mdef: 5 },
      x: { def: 10, matk: 10, mdef: 10 },
    });
    const attacker = board.getUnit("1");
    const target = board.getUnit("x");

    attacker.weapon = "Sword";
    attacker.element = "Fire";
    target.weapon = "Bow";
    target.element = "Ice";

    // Default weapon multiplier is 1.75: base 20 * 1.75 * 1.5 = 52.5 => 53
    expect(computeDamage(attacker, target)).toBe(53);

    // Can be configured to 1.5: base 20 * 1.5 * 1.5 = 45
    setWeaponAdvantageMultiplier(1.5);
    expect(computeDamage(attacker, target)).toBe(45);

    // Can be configured to 2.0 (TB wiki standard): base 20 * 2.0 * 1.5 = 60
    setWeaponAdvantageMultiplier(2.0);
    expect(computeDamage(attacker, target)).toBe(60);
  });

  it("magical attacks use matk vs mdef with a weapon/element advantage", () => {
    const board = parseBoard(["1 x"], {
      "1": { atk: 10, def: 5, matk: 24, mdef: 4 },
      x: { def: 7, matk: 8, mdef: 12 },
    });
    const attacker = board.getUnit("1");
    const target = board.getUnit("x");

    attacker.weapon = "Staff";
    attacker.element = "Fire";
    target.weapon = "Staff";
    target.element = "Ice";

    expect(computeDamage(attacker, target)).toBe(18);
  });

  it("pincer-triggered skills add a multiplier to the attack", () => {
    const board = parseBoard(["1 x"], {
      "1": { atk: 30, def: 5 },
      x: { def: 10 },
    });
    const attacker = board.getUnit("1");
    const target = board.getUnit("x");

    attacker.skills = [{ id: "gigasword", trigger: "pincer", power: 2 }];

    expect(computeDamage(attacker, target, { trigger: "pincer" })).toBe(40);
  });

  it("resolves hybrid magic and weapon damage through separate stats and matchups", () => {
    const combinations = [
      ["Graviton", "Sword", "Photon", "Bow"],
      ["Ice", "Spear", "Fire", "Sword"],
      ["Photon", "Bow", "Graviton", "Spear"],
    ] as const;

    for (const [element, weapon, targetElement, targetWeapon] of combinations) {
      const board = parseBoard(["1 x"], {
        "1": { atk: 30, def: 5, matk: 24, mdef: 4 },
        x: { def: 10, mdef: 8 },
      });
      const attacker = board.getUnit("1");
      const target = board.getUnit("x");

      attacker.weapon = weapon;
      attacker.element = element;
      target.weapon = targetWeapon;
      target.element = targetElement;
      attacker.skills = [
        {
          id: "hybrid_attack",
          trigger: "pincer",
          frequency: 100,
          damageComponents: [
            { type: "magic", element, multiplier: 1 },
            { type: "weapon", multiplier: 0.5 },
          ],
        },
      ];

      // Magic: (24 - 8) * 1.5 = 24. Weapon: (30 - 10) * 0.5 * 1.75 = 17.5. Total = 41.5 => 42
      expect(computeDamage(attacker, target, { trigger: "pincer" })).toBe(42);
    }
  });

  it("chain-triggered skills add a multiplier to chain attacks", () => {
    const board = parseBoard(["1 x"], {
      "1": { atk: 20, def: 5 },
      x: { def: 10 },
    });
    const attacker = board.getUnit("1");
    const target = board.getUnit("x");

    attacker.skills = [{ id: "chain-shot", trigger: "chain", power: 2 }];

    expect(computeDamage(attacker, target, { trigger: "chain" })).toBe(20);
  });

  it("skill-name prefixes map to the documented power tiers", () => {
    const board = parseBoard(["1 x"], {
      "1": { atk: 30, def: 5 },
      x: { def: 10 },
    });
    const attacker = board.getUnit("1");
    const target = board.getUnit("x");

    attacker.skills = [{ id: "giga", trigger: "pincer", name: "Giga Slash" }];

    expect(computeDamage(attacker, target, { trigger: "pincer" })).toBe(40);
  });

  it("builds a skill event object for each triggered skill", () => {
    const board = parseBoard(["1 x"], {
      "1": { atk: 30, def: 5 },
      x: { def: 10 },
    });
    const attacker = board.getUnit("1");

    attacker.skills = [
      {
        id: "giga",
        name: "Giga Slash",
        trigger: "pincer",
        frequency: 100,
        power: 2,
      },
    ];

    const events = buildSkillEvents(attacker, { trigger: "pincer" }, () => 0);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      skillId: "giga",
      trigger: "pincer",
      activated: true,
      multiplier: 2,
    });
  });

  it("Area(1) skills carry their target shape in the skill event", () => {
    const board = parseBoard(["1 x y"], {
      "1": { atk: 30, def: 5 },
      x: { def: 10 },
      y: { def: 10 },
    });
    const attacker = board.getUnit("1");

    attacker.skills = [
      {
        id: "fireburst",
        name: "Fireburst",
        trigger: "pincer",
        frequency: 100,
        power: 3,
        shape: "area",
        radius: 1,
        target: "enemy",
      },
    ];

    const events = buildSkillEvents(attacker, { trigger: "pincer" }, () => 0);

    expect(events[0]).toMatchObject({
      skillId: "fireburst",
      shape: "area",
      radius: 1,
      targetMode: "enemy",
      effect: "damage",
    });
  });

  it("equip skills apply even without an explicit trigger", () => {
    const board = parseBoard(["1 x"], {
      "1": { atk: 30, def: 5 },
      x: { def: 10 },
    });
    const attacker = board.getUnit("1");
    const target = board.getUnit("x");

    attacker.skills = [{ id: "atk-up", trigger: "equip", power: 1.2 }];

    expect(computeDamage(attacker, target)).toBe(24);
    expect(computeDamage(attacker, target, { trigger: "pincer" })).toBe(24);
  });

  it("counter skills retaliate after the unit is hit", () => {
    const board = parseBoard(["1 x 2"], {
      "1": { atk: 20, def: 0, maxHp: 100 },
      "2": { atk: 20, def: 0, maxHp: 100 },
      x: { atk: 12, def: 0, maxHp: 30 },
    });
    const target = board.getUnit("x");

    target.skills = [{ id: "counter", trigger: "counter", power: 2 }];

    resolveAttacks(board, "ally");

    expect(board.getUnit("1").hp).toBe(76);
    expect(board.getUnit("2").hp).toBe(100);
    expect(board.hasUnit("x")).toBe(false);
  });

  it("skills with 0% frequency never activate", () => {
    const board = parseBoard(["1 x"], {
      "1": { atk: 30, def: 5 },
      x: { def: 10 },
    });
    const attacker = board.getUnit("1");
    const target = board.getUnit("x");

    attacker.skills = [
      { id: "never", trigger: "pincer", frequency: 0, power: 2 },
    ];

    expect(computeDamage(attacker, target, { trigger: "pincer" })).toBe(20);
  });

  it("skills with 100% frequency always activate", () => {
    const board = parseBoard(["1 x"], {
      "1": { atk: 30, def: 5 },
      x: { def: 10 },
    });
    const attacker = board.getUnit("1");
    const target = board.getUnit("x");

    attacker.skills = [
      { id: "always", trigger: "pincer", frequency: 100, power: 2 },
    ];

    expect(computeDamage(attacker, target, { trigger: "pincer" })).toBe(40);
  });

  it("is symmetric: enemies pincer and damage allies the same way", () => {
    const board = parseBoard(["x 1 y"]);
    resolveAttacks(board, "enemy");
    expect(board.getUnit("1").hp).toBe(80);
  });
});
