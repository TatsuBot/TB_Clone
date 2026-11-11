import { describe, it, expect } from "vitest";
import {
  CHARACTERS,
  CHARACTER_LIST,
  charStatsAtLevel,
  addCharacterJobXp,
  characterXpAtLevel,
  characterXpToNextLevel,
  createCharacterInstance,
  skillsUnlocked,
  getCharacter,
} from "../src/data/characters";

describe("characters", () => {
  it("levels an individual job from accumulated XP and carries XP forward", () => {
    const character = createCharacterInstance("bahl");
    const job = CHARACTERS.bahl.jobs[0]!;
    const firstLevelXp = characterXpToNextLevel(job, 1);
    const secondLevelXp = characterXpToNextLevel(job, 2);

    expect(characterXpAtLevel(job, 1)).toBe(0);
    expect(characterXpAtLevel(job, 99)).toBe(job.expMax);
    expect(addCharacterJobXp(character, job, firstLevelXp + secondLevelXp)).toEqual({
      xpAwarded: firstLevelXp + secondLevelXp,
      levelsGained: 2,
    });
    expect(character.jobLevels).toEqual([3, 1, 1]);
    expect(character.jobXp).toEqual([0, 0, 0]);
  });

  it("has a named adventurer roster without generic class placeholders", () => {
    expect(CHARACTER_LIST).toHaveLength(202);
    expect(CHARACTER_LIST.every((character) => character.verified === "Y")).toBe(true);
    expect(
      CHARACTER_LIST.every((character) =>
        character.jobs.every((job) => job.expMax > 0 && job.expCoeff > 0),
      ),
    ).toBe(true);
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
    expect(charStatsAtLevel(gatz.jobs[2]!, 90)).toEqual({
      hp: 4219,
      atk: 376,
      def: 302,
      matk: 256,
      mdef: 348,
    });
  });

  it("includes Peyrna's three jobs, stats, Tap skills, and job costs", () => {
    const peyrna = getCharacter("peyrna")!;
    expect(peyrna.rarity).toBe("Z");
    expect(peyrna.species).toBe("Stonefolk");
    expect(peyrna.gender).toBe("Female");
    expect(peyrna.jobs.map((job) => job.title)).toEqual([
      "The Ashen",
      "The Solitary",
      "The Beloved",
    ]);
    expect(peyrna.jobs[0].statsMin).toEqual({
      hp: 557,
      atk: 38,
      def: 35,
      matk: 44,
      mdef: 39,
    });
    expect(charStatsAtLevel(peyrna.jobs[2]!, 90)).toEqual({
      hp: 5898,
      atk: 400,
      def: 372,
      matk: 445,
      mdef: 409,
    });
    expect(
      peyrna.jobs[0].skills.filter((skill) => skill.trigger === "tap"),
    ).toHaveLength(2);
    expect(peyrna.jobs[1].unlockCost?.coins).toBe(14000);
    expect(peyrna.jobs[2].unlockCost?.coins).toBe(28000);
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
    expect(getCharacter("bahamut")?.rarity).toBe("S");
    expect(getCharacter("bahamut")?.gender).toBe("Unisex");
  });

  it("corrects mismatched roster fields and includes missing Adventurers", () => {
    expect(getCharacter("amerpact")).toMatchObject({ rarity: "A", verified: "Y" });
    expect(getCharacter("amerpact")?.jobs[0]?.weapon).toBe("Staff");
    expect(getCharacter("eileen")).toMatchObject({ rarity: "A", verified: "Y" });
    expect(getCharacter("eileen")?.jobs[0]?.weapon).toBe("Staff");
    expect(getCharacter("zerro")).toMatchObject({ rarity: "SS", gender: "Female", verified: "Y" });
    expect(getCharacter("bahamut")?.jobs[0]?.weapon).toBe("Staff");
    expect(getCharacter("djugan")).toMatchObject({ name: "Djugan", verified: "Y" });
    expect(getCharacter("bahl_lambda")).toMatchObject({ name: "Bahl Λ", verified: "Y" });
    expect(getCharacter("djugan")?.jobs).toHaveLength(3);
  });

  it("starters include Bahl, Grace, and Kuscah", () => {
    for (const id of ["bahl", "grace", "kuscah"]) {
      expect(CHARACTERS[id]).toBeDefined();
    }
  });
});
