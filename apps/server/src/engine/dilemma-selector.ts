import type { Dilemma } from "@openclaw/shared";
import { getDilemmasByTier } from "../data/dilemma-pool.js";

function getTierForRound(round: number): 1 | 2 | 3 {
  if (round <= 3) return 1;
  if (round <= 7) return 2;
  return 3;
}

export function selectDilemma(round: number, usedIds: Set<string>): Dilemma {
  const tier = getTierForRound(round);
  const candidates = getDilemmasByTier(tier).filter((d) => !usedIds.has(d.id));

  if (candidates.length === 0) {
    // Fallback: allow repeats from same tier
    const fallback = getDilemmasByTier(tier);
    const pick = fallback[Math.floor(Math.random() * fallback.length)];
    return { ...pick, round };
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...pick, round };
}
