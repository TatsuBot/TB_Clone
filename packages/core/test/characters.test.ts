import { describe, it, expect } from "vitest";
import {
  CHARACTERS,
  CHARACTER_LIST,
  charStatsAtLevel,
  skillsUnlocked,
  getCharacter,
} from "../src/data/characters";

describe("characters", () => {
  it("has a named adventurer roster without generic class placeholders", () => {
    expect(CHARACTER_LIST.length).toBeGreaterThanOrEqual(35);
    for (const id of [
      "warrior",
      "knight",
      "archer",
      "mage",
      "healer",
      "lizard_warrior",
      "beast_warrior",
    ]) {
      expect(CHARACTERS[id]).toBeUndefined();
    }
  });

  it("Bahl job 1 stats at level bounds", () => {
    const bahl = CHARACTERS.bahl;
    const job1 = bahl.jobs[0];
    expect(charStatsAtLevel(job1, 1).hp).toBe(321);
    expect(charStatsAtLevel(job1, 90).hp).toBe(2957);
    expect(charStatsAtLevel(job1, 1).atk).toBe(31);
  });

  it("Bahl unlocks Gigasword at job level 35", () => {
    const job1 = CHARACTERS.bahl.jobs[0];
    expect(skillsUnlocked(job1, 1).map((s) => s.name)).toContain(
      "Counterattack",
    );
    expect(skillsUnlocked(job1, 34).map((s) => s.id)).not.toContain(
      "gigasword",
    );
    expect(skillsUnlocked(job1, 35).map((s) => s.id)).toContain("gigasword");
  });

  it("Samatha is SS spear lightning", () => {
    const s = getCharacter("samatha")!;
    expect(s.rarity).toBe("SS");
    expect(s.jobs[0].weapon).toBe("Spear");
    expect(s.jobs[0].element).toBe("Lightning");
  });

  it("Gatz matches the wiki class, jobs, and stat bounds", () => {
    const gatz = getCharacter("gatz")!;
    expect(gatz.rarity).toBe("S");
    expect(gatz.jobs.map((job) => job.title)).toEqual([
      "The Filcher",
      "The Thief",
      "The Phantom",
    ]);
    expect(gatz.jobs[0].statsMin).toEqual({
      hp: 341,
      atk: 33,
      def: 27,
      matk: 22,
      mdef: 30,
    });
    expect(gatz.jobs[2].statsMax).toEqual({
      hp: 4219,
      atk: 376,
      def: 302,
      matk: 256,
      mdef: 348,
    });
  });

  it("keeps verified wiki class, species, and job counts", () => {
    const expectedProfiles = [
      ["gatz", "S", "Human"],
      ["samatha", "SS", "Human"],
      ["ellvern", "S", "Human"],
      ["sorman", "B", "Human"],
      ["amina", "SS", "Human"],
      ["palpa", "S", "Stonefolk"],
      ["ba_gunar", "B", "Lizardfolk"],
      ["gigojago", "B", "Beastfolk"],
      ["sh_berdan", "B", "Lizardfolk"],
      ["ma_curi", "B", "Lizardfolk"],
      ["camellia", "SS", "Human"],
      ["daiana", "A", "Stonefolk"],
      ["lewto", "SS", "Stonefolk"],
      ["koko", "SS", "Stonefolk"],
    ] as const;

    for (const [id, rarity, species] of expectedProfiles) {
      const character = getCharacter(id)!;
      expect(character.rarity).toBe(rarity);
      expect(character.species).toBe(species);
      expect(character.jobs.map((job) => job.jobIndex)).toEqual([1, 2, 3]);
    }
  });

  it("includes Z-class and elemental coverage", () => {
    expect(getCharacter("haruhikari")?.rarity).toBe("Z");
    expect(getCharacter("daiana")?.jobs[0].element).toBe("Fire");
    expect(getCharacter("bahamut")?.species).toBe("Monster");
  });

  it("starters include Bahl, Grace, and Kuscah", () => {
    for (const id of ["bahl", "grace", "kuscah"]) {
      expect(CHARACTERS[id]).toBeDefined();
    }
  });
});
