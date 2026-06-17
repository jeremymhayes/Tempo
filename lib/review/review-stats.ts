import type { GameMove } from "@/types/chess";
import type { EngineEvaluation, MoveClassification } from "@/types/review";
import { winChanceLoss } from "@/lib/engine/classify";

export type ReviewListMove = GameMove & {
  classification?: MoveClassification;
  centipawnLoss?: number;
  bestMove?: string;
  bestMoveUci?: string;
  bestLine?: string[];
  playedBestMove?: boolean;
  onlyMove?: boolean;
  isSacrifice?: boolean;
  evalBefore?: EngineEvaluation;
  evalAfter?: EngineEvaluation;
};

export type MovePair = {
  moveNumber: number;
  white?: ReviewListMove;
  black?: ReviewListMove;
};

export type ReviewStats = {
  counts: {
    white: Partial<Record<MoveClassification, number>>;
    black: Partial<Record<MoveClassification, number>>;
  };
  accuracy: {
    white?: number;
    black?: number;
  };
  rating: {
    white?: number;
    black?: number;
  };
};

const CLASSIFICATION_SCORE: Record<MoveClassification, number> = {
  brilliant: 100,
  great: 98,
  book: 100,
  best: 100,
  excellent: 96,
  good: 88,
  inaccuracy: 72,
  mistake: 55,
  miss: 45,
  blunder: 18,
};

const MOVE_ICON_CLASSES = new Set<MoveClassification>([
  "brilliant",
  "great",
  "mistake",
  "miss",
  "blunder",
]);

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return roundOne(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function shouldUseCentipawnAccuracy(classification: MoveClassification): boolean {
  return !["brilliant", "great", "book"].includes(classification);
}

function ratingPenalty(
  counts: Partial<Record<MoveClassification, number>> = {},
): number {
  const blunders = counts.blunder ?? 0;
  const mistakes = counts.mistake ?? 0;
  const misses = counts.miss ?? 0;

  return (
    (counts.inaccuracy ?? 0) * 20 +
    mistakes * 55 +
    misses * 80 +
    blunders * 105 +
    Math.max(0, blunders - 1) * 130 +
    Math.max(0, mistakes - 1) * 20 +
    Math.max(0, misses - 1) * 40
  );
}

export function estimateGameRating(
  accuracy?: number,
  counts?: Partial<Record<MoveClassification, number>>,
): number | undefined {
  if (typeof accuracy !== "number") return undefined;
  const base = Math.round(250 + accuracy * 15);
  return Math.max(100, Math.round(base - ratingPenalty(counts)));
}

export function moveAccuracyFromLoss(loss: number): number {
  const boundedLoss = Math.max(0, loss);
  const accuracy =
    100 * Math.exp(-0.00216 * boundedLoss - 0.00000101 * boundedLoss ** 2);
  return roundOne(Math.max(0, Math.min(100, accuracy)));
}

function moveAccuracyFromWinChanceLoss(loss: number): number {
  const boundedLoss = Math.max(0, loss);
  const accuracy = 103.1668 * Math.exp(-0.04354 * boundedLoss) - 3.1669;
  return roundOne(Math.max(0, Math.min(100, accuracy)));
}

function moveAccuracy(move: ReviewListMove): number {
  if (
    move.classification &&
    shouldUseCentipawnAccuracy(move.classification) &&
    move.evalBefore &&
    move.evalAfter
  ) {
    return moveAccuracyFromWinChanceLoss(
      winChanceLoss(move.evalBefore, move.evalAfter, move.color),
    );
  }

  if (
    move.classification &&
    typeof move.centipawnLoss === "number" &&
    shouldUseCentipawnAccuracy(move.classification)
  ) {
    return moveAccuracyFromLoss(move.centipawnLoss);
  }

  return CLASSIFICATION_SCORE[move.classification ?? "good"];
}

export function shouldShowMoveIcon(
  classification?: MoveClassification,
): boolean {
  return classification ? MOVE_ICON_CLASSES.has(classification) : false;
}

export function toMovePairs(moves: ReviewListMove[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (const move of moves) {
    const last = pairs[pairs.length - 1];
    if (move.color === "w" || !last || last.black) {
      pairs.push({ moveNumber: move.moveNumber });
    }
    const target = pairs[pairs.length - 1];
    if (move.color === "w") target.white = move;
    else target.black = move;
  }
  return pairs;
}

export function buildReviewStats(moves: ReviewListMove[]): ReviewStats {
  const scores = { white: [] as number[], black: [] as number[] };
  const counts: ReviewStats["counts"] = { white: {}, black: {} };

  for (const move of moves) {
    if (!move.classification) continue;
    const side = move.color === "w" ? "white" : "black";
    counts[side][move.classification] =
      (counts[side][move.classification] ?? 0) + 1;
    scores[side].push(moveAccuracy(move));
  }

  const whiteAccuracy = average(scores.white);
  const blackAccuracy = average(scores.black);

  return {
    counts,
    accuracy: {
      white: whiteAccuracy,
      black: blackAccuracy,
    },
    rating: {
      white: estimateGameRating(whiteAccuracy, counts.white),
      black: estimateGameRating(blackAccuracy, counts.black),
    },
  };
}
