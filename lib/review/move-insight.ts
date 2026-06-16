import type { EngineEvaluation, MoveClassification } from "@/types/review";
import { CLASS_META } from "@/lib/review/classification-meta";
import type { ReviewListMove } from "@/lib/review/review-stats";
import { winChanceLoss } from "@/lib/engine/classify";

export type MoveInsight = {
  moveLabel: string;
  classificationLabel: string;
  headline: string;
  details: string[];
};

const ACTIONABLE_CLASSES = new Set<MoveClassification>([
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
]);

function formatMoveLabel(move: ReviewListMove): string {
  return `${move.moveNumber}${move.color === "w" ? "." : "..."} ${move.san}`;
}

function formatEval(score?: EngineEvaluation): string | null {
  if (!score) return null;
  if (score.type === "mate") {
    if (score.value === 0) return "M0";
    return score.value > 0 ? `M${score.value}` : `-M${Math.abs(score.value)}`;
  }

  const pawns = score.value / 100;
  if (pawns === 0) return "0.00";
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

function formatWinChanceLoss(move: ReviewListMove): string | null {
  if (
    typeof move.centipawnLoss !== "number" ||
    move.centipawnLoss < 300 ||
    !move.evalBefore ||
    !move.evalAfter
  ) {
    return null;
  }

  const loss = winChanceLoss(move.evalBefore, move.evalAfter, move.color);
  return `${loss.toFixed(1)}%`;
}

function hasForcedMateForMover(
  score: EngineEvaluation | undefined,
  mover: "w" | "b",
): boolean {
  return (
    score?.type === "mate" &&
    ((mover === "w" && score.value > 0) ||
      (mover === "b" && score.value < 0))
  );
}

function missedForcedMate(move: ReviewListMove): boolean {
  return (
    hasForcedMateForMover(move.evalBefore, move.color) &&
    !hasForcedMateForMover(move.evalAfter, move.color)
  );
}

function buildHeadline(move: ReviewListMove): string {
  switch (move.classification) {
    case "brilliant":
      return move.isSacrifice
        ? "Engine-best tactical sacrifice."
        : "Brilliant engine-approved tactic.";
    case "great":
      return move.onlyMove
        ? "Only clean engine move."
        : "Strong move that changed the position.";
    case "book":
      return "Opening book move.";
    case "best":
      return "Matched Stockfish's preferred line.";
    case "excellent":
      return move.bestMove && move.bestMove !== move.san
        ? `Nearly best; Stockfish preferred ${move.bestMove}.`
        : "Near-perfect move.";
    case "good":
      return "Playable move with a small concession.";
    case "miss":
      return missedForcedMate(move)
        ? "Missed a forced mate."
        : move.bestMove && move.bestMove !== move.san
          ? `Stockfish preferred ${move.bestMove}.`
          : "The engine found a stronger continuation.";
    case "inaccuracy":
    case "mistake":
    case "blunder":
      return move.bestMove && move.bestMove !== move.san
        ? `Stockfish preferred ${move.bestMove}.`
        : "The engine found a stronger continuation.";
    default:
      return "Engine review detail.";
  }
}

function buildDetails(move: ReviewListMove): string[] {
  const details: string[] = [];
  const before = formatEval(move.evalBefore);
  const after = formatEval(move.evalAfter);
  const practicalLoss = formatWinChanceLoss(move);
  if (before && after) details.push(`Eval ${before} -> ${after}`);
  if (practicalLoss) details.push(`Win chance loss ${practicalLoss}`);
  if (typeof move.centipawnLoss === "number") {
    details.push(`Centipawn loss ${move.centipawnLoss}`);
  }
  if (move.bestLine?.length) {
    details.push(`Line ${move.bestLine.join(" ")}`);
  }
  return details;
}

export function buildMoveInsight(move: ReviewListMove | null): MoveInsight | null {
  if (!move?.classification) return null;

  const details = buildDetails(move);
  if (!details.length && !ACTIONABLE_CLASSES.has(move.classification)) {
    details.push(CLASS_META[move.classification].label);
  }

  return {
    moveLabel: formatMoveLabel(move),
    classificationLabel: CLASS_META[move.classification].label,
    headline: buildHeadline(move),
    details,
  };
}
