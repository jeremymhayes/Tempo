import type { EngineScore } from "./types";

/** A score already normalized to White's perspective. */
export interface WhiteScore {
  type: "cp" | "mate";
  value: number;
}

/** Side to move for a FEN, used to flip side-to-move scores to White POV. */
export function fenSideToMove(fen: string): "w" | "b" {
  return fen.split(/\s+/)[1] === "b" ? "b" : "w";
}

/** Convert a side-to-move engine score into White's perspective. */
export function toWhitePov(score: EngineScore, sideToMove: "w" | "b"): WhiteScore {
  const factor = sideToMove === "b" ? -1 : 1;
  return { type: score.type, value: score.value * factor };
}

/**
 * Display string for a White-POV score.
 *  - cp:   "+1.34" / "-0.50" / "0.00"
 *  - mate: "M3" (White mates) / "-M2" (Black mates)
 */
export function formatScore(score: WhiteScore): string {
  if (score.type === "mate") {
    if (score.value === 0) return "M0";
    return score.value > 0 ? `M${score.value}` : `-M${Math.abs(score.value)}`;
  }
  const pawns = score.value / 100;
  const fixed = Math.abs(pawns).toFixed(2);
  if (pawns > 0) return `+${fixed}`;
  if (pawns < 0) return `-${fixed}`;
  return "0.00";
}

export type Advantage = "white" | "black" | "equal";

export function advantage(score: WhiteScore): Advantage {
  if (score.type === "mate") return score.value >= 0 ? "white" : "black";
  if (score.value > 50) return "white";
  if (score.value < -50) return "black";
  return "equal";
}

export function advantageLabel(score: WhiteScore): string {
  switch (advantage(score)) {
    case "white":
      return "White is better";
    case "black":
      return "Black is better";
    default:
      return "Equal";
  }
}

/**
 * White's share of the eval bar, 0–100. Centipawns are mapped through a
 * logistic curve (the same shape engines use for win%) so the bar moves
 * smoothly and never jumps wildly. Mate is pinned near the edge. Clamped to
 * [3, 97] so a sliver of the losing side always stays visible.
 */
export function whiteWinPercent(score: WhiteScore): number {
  if (score.type === "mate") {
    return score.value >= 0 ? 99 : 1;
  }
  const k = 0.0044;
  const pct = 100 / (1 + Math.exp(-k * score.value));
  return Math.max(3, Math.min(97, pct));
}
