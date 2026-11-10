import { Board } from './board';
import { chainUnits, type ChainOptions } from './chain';
import { orderPincers } from './order';
import { detectPincers, type Pincer, type PincerScan } from './pincer';
import type { Pos, Side, Unit } from './types';

export interface Attack {
  /** Position in resolution order (0 = first pincer to resolve). */
  step: number;
  /** Index of the pincer in `scan.pincers` (detection order). */
  pincerIndex: number;
  attacker: string;
  target: string;
  role: 'flanker' | 'chain';
  damage: number;
  targetHp: number;
}

/** Snapshot of a unit at the moment it fell, so the UI can still show it. */
export interface Fallen {
  unit: Unit;
  origin: Pos;
}

/** One pincer, fully resolved before the next one starts. */
export interface ResolutionStep {
  step: number;
  pincerIndex: number;
  pincer: Pincer;
  attacks: Attack[];
  defeated: string[];
  fallen: Fallen[];
}

export interface Resolution {
  scan: PincerScan;
  /** Pincers in the order they resolved. Pincers whose targets were all already defeated are skipped. */
  steps: ResolutionStep[];
  /** Flat views of `steps`, in resolution order. */
  attacks: Attack[];
  defeated: string[];
}

export interface ResolveOptions extends ChainOptions {
  /** The unit the player just moved. Pincers it flanks resolve first. */
  moverId?: string;
}

/** Flat damage for now (Phase 3 adds skills, weapon triangle and elements). */
export function computeDamage(attacker: Unit, target: Unit): number {
  return Math.max(1, attacker.stats.atk - target.stats.def);
}

/**
 * Resolve one side's attacks:
 *  1. detect every pincer and chain and FREEZE each pincer's attacker roster,
 *  2. put the pincers in order (mover's pincer first, then top-left to bottom-right; see order.ts),
 *  3. resolve them ONE AT A TIME: apply that pincer's damage (flankers first, then chain
 *     nearest-first), then remove whatever it defeated before the next pincer starts.
 * Targets already defeated by an earlier pincer are not hit again. Each unit attacks once per
 * pincer it belongs to. Mutates `board`.
 */
export function resolveAttacks(board: Board, attackers: Side, opts: ResolveOptions = {}): Resolution {
  const scan = detectPincers(board, attackers);

  const rosters = scan.pincers.map((pincer) => [
    ...pincer.flankers.map((id) => ({ id, role: 'flanker' as const })),
    ...chainUnits(board, pincer, attackers, opts).map((id) => ({ id, role: 'chain' as const })),
  ]);
  const ordered = orderPincers(board, scan.pincers, opts.moverId);

  const steps: ResolutionStep[] = [];
  for (const { pincer, index } of ordered) {
    const targets = pincer.targets.filter((id) => board.hasUnit(id));
    if (targets.length === 0) continue;

    const step = steps.length;
    const attacks: Attack[] = [];
    for (const { id, role } of rosters[index] ?? []) {
      const attacker = board.getUnit(id);
      for (const targetId of targets) {
        const target = board.getUnit(targetId);
        const damage = computeDamage(attacker, target);
        target.hp -= damage;
        attacks.push({ step, pincerIndex: index, attacker: id, target: targetId, role, damage, targetHp: target.hp });
      }
    }

    const defeated: string[] = [];
    const fallen: Fallen[] = [];
    for (const id of targets) {
      const unit = board.getUnit(id);
      if (unit.hp > 0) continue;
      fallen.push({ unit: { ...unit, stats: { ...unit.stats } }, origin: board.originOf(id) });
      defeated.push(id);
    }
    defeated.forEach((id) => board.remove(id));
    steps.push({ step, pincerIndex: index, pincer, attacks, defeated, fallen });
  }

  return {
    scan,
    steps,
    attacks: steps.flatMap((s) => s.attacks),
    defeated: steps.flatMap((s) => s.defeated),
  };
}
