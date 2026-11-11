import { runEnemyMoves, type EnemyMove } from "./ai";
import { Board } from "./board";
import {
  applyBuff,
  inferSkillAttributes,
  resolveAdjacentAttacks,
  resolveAttacks,
  type Resolution,
} from "./combat";
import { DragSession } from "./drag";
import { createRng, type Rng } from "./rng";
import { RULES } from "./rules";
import { buildStageBoard, spawnWave, type StageData } from "./stage";
import type { Skill, TapReport } from "./types";

export type Phase = "player" | "enemy" | "victory" | "defeat";

export interface TurnReport {
  actor: "player" | "enemy";
  enemyMoves: EnemyMove[];
  resolution: Resolution;
  spawned: string[];
  phase: Phase;
}

/**
 * Facade over one stage. Presentation reads `board`/`phase` and plays back reports;
 * it never decides an outcome. All randomness is seeded, so a (stage, seed, drags) triple replays exactly.
 */
export class Battle {
  board: Board;
  phase: Phase = "player";
  waveIndex = 0;
  readonly log: TurnReport[] = [];
  private rng: Rng;

  constructor(
    readonly stage: StageData,
    readonly seed: number = 1,
  ) {
    this.rng = createRng(seed);
    this.board = buildStageBoard(stage);
    spawnWave(this.board, stage, 0);
    this.initUnits();
  }

  get waveCount(): number {
    return this.stage.waves.length;
  }

  private initUnits(): void {
    for (const unit of this.board.allUnits()) {
      if (!unit.tapCharges) {
        unit.tapCharges = {};
        for (const skill of unit.skills ?? []) {
          if (skill.trigger === "tap") {
            unit.tapCharges[skill.id] = skill.tapCharges ?? 3;
          }
        }
      }
      if ((unit.skills ?? []).some(
        (skill) => skill.trigger === "equip" && inferSkillAttributes(skill).effect === "levitation",
      )) {
        unit.levitationTurns = -1;
      }
    }
  }

  startDrag(unitId: string): DragSession | null {
    if (this.phase !== "player") return null;
    const u = this.board.hasUnit(unitId) ? this.board.getUnit(unitId) : null;
    if (!u || u.side !== "ally") return null;
    return new DragSession(this.board, unitId);
  }

  /**
   * Activate a manual tap skill on an allied unit.
   * Double clicking burns one tap charge.
   * If both debuff and buff taps are present and active, debuff taps burn first until exhausted, then buffs.
   */
  activateTap(unitId: string): TapReport | null {
    if (this.phase !== "player") return null;
    const unit = this.board.hasUnit(unitId) ? this.board.getUnit(unitId) : null;
    if (!unit || unit.side !== "ally") return null;

    const tapSkills = (unit.skills ?? []).filter((s) => s.trigger === "tap");
    if (tapSkills.length === 0) return null;

    if (!unit.tapCharges) unit.tapCharges = {};
    for (const skill of tapSkills) {
      if (unit.tapCharges[skill.id] === undefined) {
        unit.tapCharges[skill.id] = skill.tapCharges ?? 3;
      }
    }

    const isDebuff = (s: Skill) => {
      const text = `${s.name ?? ""} ${s.description ?? ""}`.toLowerCase();
      return (
        s.effect === "debuff" ||
        text.includes("impair") ||
        text.includes("debuff") ||
        text.includes("enemies") ||
        text.includes("-") ||
        s.target === "enemy"
      );
    };

    const debuffTaps = tapSkills.filter(isDebuff);
    const buffTaps = tapSkills.filter((s) => !isDebuff(s));

    let chosenSkill: Skill | null = null;
    let category: "debuff" | "buff" = "debuff";

    // Double clicking burns one tap charge.
    // If both debuff and buff present and active, starts with debuff taps till exhausted, then moves to buffs.
    const activeDebuff = debuffTaps.find(
      (s) => (unit.tapCharges![s.id] ?? 0) > 0,
    );
    if (activeDebuff) {
      chosenSkill = activeDebuff;
      category = "debuff";
    } else {
      const activeBuff = buffTaps.find(
        (s) => (unit.tapCharges![s.id] ?? 0) > 0,
      );
      if (activeBuff) {
        chosenSkill = activeBuff;
        category = "buff";
      }
    }

    if (!chosenSkill) return null;

    unit.tapCharges[chosenSkill.id] -= 1;
    const attr = inferSkillAttributes(chosenSkill);
    const stat = attr.stat ?? (category === "debuff" ? "def" : "atk");
    const percent = attr.statPercent ?? (category === "debuff" ? -30 : 30);
    const duration = attr.duration ?? 1;

    const targetIds: string[] = [];
    if (category === "debuff") {
      for (const enemy of this.board.unitsOf("enemy")) {
        applyBuff(enemy, {
          id: chosenSkill.id,
          stat,
          percent,
          duration,
          isTap: true,
        });
        targetIds.push(enemy.id);
      }
    } else {
      for (const ally of this.board.unitsOf("ally")) {
        applyBuff(ally, {
          id: chosenSkill.id,
          stat,
          percent,
          duration,
          isTap: true,
        });
        targetIds.push(ally.id);
      }
    }

    return {
      unitId: unit.id,
      unitName: unit.name,
      skill: chosenSkill,
      category,
      remainingCharges: unit.tapCharges[chosenSkill.id],
      stat,
      percent,
      duration,
      targets: targetIds,
    };
  }

  /**
   * Finish the player's turn with a drag session (released or timed out).
   * A drag that never moved is not a turn and returns null.
   */
  commitDrag(session: DragSession): TurnReport | null {
    if (this.phase !== "player") throw new Error("Not the player turn");
    if (session.path.length === 0) return null;

    this.board = session.board;
    const resolution = resolveAttacks(this.board, "ally", {
      moverId: session.moverId,
    });
    const spawned: string[] = [];

    this.tickTurnEnd("player");

    if (this.board.unitsOf("enemy").length === 0) {
      if (this.waveIndex + 1 < this.waveCount) {
        this.waveIndex++;
        const newSpawned = spawnWave(this.board, this.stage, this.waveIndex);
        spawned.push(...newSpawned);
        this.initUnits();
        this.phase = "player"; // a fresh wave arrives; the player keeps the initiative
      } else {
        this.phase = "victory";
      }
    } else {
      this.phase = "enemy";
    }
    this.checkDefeat();
    return this.record({
      actor: "player",
      enemyMoves: [],
      resolution,
      spawned,
    });
  }

  runEnemyTurn(): TurnReport {
    if (this.phase !== "enemy") throw new Error("Not the enemy turn");
    const enemyMoves = runEnemyMoves(this.board, this.rng);
    const resolution = resolveAttacks(this.board, "enemy");
    const direct = resolveAdjacentAttacks(this.board, "enemy", resolution.scan.pincering);
    resolution.directAttacks = direct.attacks;
    resolution.directFallen = direct.fallen;
    resolution.attacks.push(...direct.attacks);
    resolution.defeated.push(...direct.defeated);
    this.tickTurnEnd("enemy");
    this.phase = "player";
    this.checkDefeat();
    return this.record({ actor: "enemy", enemyMoves, resolution, spawned: [] });
  }

  private tickTurnEnd(actor: "player" | "enemy"): void {
    for (const unit of this.board.allUnits()) {
      if (unit.buffs) {
        unit.buffs.forEach((b) => (b.duration -= 1));
        unit.buffs = unit.buffs.filter((b) => b.duration > 0);
      }
      if (unit.statuses) {
        for (const s of unit.statuses) {
          if (s.type === "poison") {
            const poisonDmg = Math.max(
              1,
              Math.round(unit.stats.maxHp * (s.power ? s.power * 0.05 : 0.1)),
            );
            unit.hp = Math.max(0, unit.hp - poisonDmg);
          }
          s.duration -= 1;
        }
        unit.statuses = unit.statuses.filter((s) => s.duration > 0);
      }
      if (unit.levitationTurns !== undefined && unit.levitationTurns > 0) {
        unit.levitationTurns -= 1;
        if (unit.levitationTurns === 0) delete unit.levitationTurns;
      }
    }
    // Remove any units killed by poison or turn effects
    for (const unit of this.board.allUnits()) {
      if (unit.hp <= 0) {
        this.board.remove(unit.id);
      }
    }
  }

  private checkDefeat(): void {
    if (this.board.unitsOf("ally").length < RULES.minAlliesToFight)
      this.phase = "defeat";
  }

  private record(r: Omit<TurnReport, "phase">): TurnReport {
    const report: TurnReport = { ...r, phase: this.phase };
    this.log.push(report);
    return report;
  }
}
