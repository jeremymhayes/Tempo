import type { MoveClassification } from "@/types/review";
import type { WhiteScore } from "./eval-format";

/**
 * Lightweight, live move classification from the eval swing around a move.
 *
 * This grades the move that was just played by comparing the best eval of the
 * position *before* it with the eval *after* it (both White-POV), measuring how
 * many centipawns the mover gave up.
 *
 * TODO: a full Chess.com-style pass (brilliant/great/book detection, accuracy %,
 * forced-line awareness) needs analysis of every position in the game. The data
 * plumbing exists — feed per-ply evals into this module from a background sweep.
 */

const MATE_CP = 100_000;

function toCp(score: WhiteScore): number {
  if (score.type === "mate") {
    return score.value > 0 ? MATE_CP - score.value : -MATE_CP - score.value;
  }
  return score.value;
}

/** Centipawns the mover lost versus the prior best eval (>= 0). */
export function centipawnLoss(
  before: WhiteScore,
  after: WhiteScore,
  mover: "w" | "b",
): number {
  const b = toCp(before);
  const a = toCp(after);
  const loss = mover === "w" ? b - a : a - b;
  return Math.max(0, loss);
}

export function classifyLoss(loss: number): MoveClassification {
  if (loss < 20) return "best";
  if (loss < 50) return "good";
  if (loss < 100) return "inaccuracy";
  if (loss < 250) return "mistake";
  return "blunder";
}
