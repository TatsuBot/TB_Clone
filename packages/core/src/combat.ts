import { Board } from './board';
import { chainUnits, type ChainOptions } from './chain';
import { detectPincers, type PincerScan } from './pincer';
import type { Side, Unit } from './types';

export interface Attack {
  pincerIndex: number;
  attacker: string;
  target: string;
  role: 'flanker' | 'chain';
  damage: number;
  targetHp: number;
}

export interface Resolution {
  scan: PincerScan;
  attacks: Attack[];
  defeated: string[];
}

/** Flat damage for now (Phase 3 adds skills, weapon triangle and elements). */
export function computeDamage(attacker: Unit, target: Unit): number {
  return Math.max(1, attacker.stats.atk - target.stats.def);
}

/**
 * Resolve one side's attacks in the fixed order:
 *  1. detect pincers and chains and FREEZE the attacker list,
 *  2. apply damage in a documented order (flankers first, then chain nearest to farthest),
 *  3. remove defeated units.
 * Each unit attacks once per pincer it belongs to. Mutates `board`.
 */
export function resolveAttacks(board: Board, attackers: Side, opts: ChainOptions = {}): Resolution {
  const scan = detectPincers(board, attackers);

  const plan = scan.pincers.map((pincer, pincerIndex) => ({
    pincerIndex,
    pincer,
    roster: [
      ...pincer.flankers.map((id) => ({ id, role: 'flanker' as const })),
      ...chainUnits(board, pincer, attackers, opts).map((id) => ({ id, role: 'chain' as const })),
    ],
  }));

  const attacks: Attack[] = [];
  for (const { pincerIndex, pincer, roster } of plan) {
    for (const { id, role } of roster) {
      const attacker = board.getUnit(id);
      for (const targetId of pincer.targets) {
        const target = board.getUnit(targetId);
        const damage = computeDamage(attacker, target);
        target.hp -= damage;
        attacks.push({ pincerIndex, attacker: id, target: targetId, role, damage, targetHp: target.hp });
      }
    }
  }

  const defeated = [...scan.pincered].filter((id) => board.getUnit(id).hp <= 0);
  defeated.forEach((id) => board.remove(id));
  return { scan, attacks, defeated };
}
